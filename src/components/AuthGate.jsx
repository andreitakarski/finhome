import { ShieldCheck } from 'lucide-react'
import { GoogleSignInButton } from './SyncCard'

export function AuthGate({ onAuthChange }) {
  return <main className="auth-gate">
    <div className="auth-card">
      <span className="auth-icon"><ShieldCheck size={30}/></span>
      <p className="eyebrow dark">FINHOME</p>
      <h1>Вход в приложение</h1>
      <p>Авторизуйтесь через разрешённый Google-аккаунт, чтобы открыть личные финансовые данные.</p>
      <GoogleSignInButton onAuthChange={onAuthChange}/>
    </div>
  </main>
}
