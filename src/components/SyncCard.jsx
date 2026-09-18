import { useEffect, useRef, useState } from 'react'
import { GOOGLE_CLIENT_ID, GOOGLE_TOKEN_KEY } from '../constants/sync'

function tokenIdentity(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const identity = JSON.parse(atob(payload))
    return identity.exp * 1000 > Date.now() ? identity : null
  } catch {
    return null
  }
}

export function SyncCard({ auth, onAuthChange }) {
  const buttonRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (auth?.token || !buttonRef.current) return
    let timer
    let attempts = 0

    const renderGoogleButton = () => {
      if (!window.google?.accounts?.id) {
        if (attempts++ < 50) timer = window.setTimeout(renderGoogleButton, 100)
        else setError('Не удалось загрузить Google Identity')
        return
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: ({ credential }) => {
          const identity = tokenIdentity(credential)
          if (!identity) return setError('Google вернул недействительный токен')
          sessionStorage.setItem(GOOGLE_TOKEN_KEY, credential)
          onAuthChange({ token: credential, email: identity.email, name: identity.name })
          setError('')
        },
      })
      buttonRef.current.replaceChildren()
      window.google.accounts.id.renderButton(buttonRef.current, { theme: 'outline', size: 'large', text: 'signin_with', width: 260 })
    }

    renderGoogleButton()
    return () => window.clearTimeout(timer)
  }, [auth?.token, onAuthChange])

  function signOut() {
    window.google?.accounts?.id?.disableAutoSelect()
    sessionStorage.removeItem(GOOGLE_TOKEN_KEY)
    onAuthChange(null)
  }

  return <div className="settings-card sync-card">
    <h3>Синхронизация</h3>
    {auth ? <>
      <p>Выполнен вход как <b>{auth.email}</b>. Аккаунт готов к защищённой синхронизации.</p>
      <span className="status-pill connected">Google подключён</span>
      <button type="button" className="sync-signout" onClick={signOut}>Выйти</button>
    </> : <>
      <p>Войдите через разрешённый Google-аккаунт, чтобы подключить облачное хранение.</p>
      <div className="google-signin" ref={buttonRef}/>
      {error && <p className="sync-error">{error}</p>}
    </>}
  </div>
}

export function restoreGoogleAuth() {
  const token = sessionStorage.getItem(GOOGLE_TOKEN_KEY)
  const identity = token && tokenIdentity(token)
  if (!identity) {
    sessionStorage.removeItem(GOOGLE_TOKEN_KEY)
    return null
  }
  return { token, email: identity.email, name: identity.name }
}

