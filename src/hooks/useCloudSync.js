import { useCallback, useEffect, useRef, useState } from 'react'
import { SYNC_API_URL } from '../constants/sync'
import { getDeviceId, getLastSeq, getOutbox, queueFinanceData, removeFromOutbox, saveFinanceData, setLastSeq } from '../utils/storage'

export function useCloudSync({ auth, data, isLoaded, changeSignal, onRemoteData }) {
  const [status, setStatus] = useState(auth ? 'idle' : 'local')
  const syncing = useRef(false)
  const dataRef = useRef(data)
  const remoteDataRef = useRef(onRemoteData)
  dataRef.current = data
  remoteDataRef.current = onRemoteData

  const synchronize = useCallback(async () => {
    if (!auth?.token || !isLoaded || syncing.current) return
    if (!navigator.onLine) return setStatus('offline')
    syncing.current = true
    setStatus('syncing')

    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const [deviceId, lastSeq, mutations] = await Promise.all([getDeviceId(), getLastSeq(), getOutbox()])
        const response = await fetch(SYNC_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'sync', idToken: auth.token, deviceId, lastSeq, mutations }),
        })
        const result = await response.json()
        if (!result.ok) throw new Error(result.error || 'Ошибка синхронизации')

        const remoteStates = result.changes.filter((change) => change.entity === 'appState' && change.action === 'upsert')
        const latestRemote = remoteStates.at(-1)
        if (latestRemote?.payload) {
          dataRef.current = latestRemote.payload
          await saveFinanceData(latestRemote.payload)
          remoteDataRef.current(latestRemote.payload)
        }
        await Promise.all([removeFromOutbox(result.acceptedMutationIds || []), setLastSeq(result.lastSeq)])

        if (attempt === 0 && lastSeq === 0 && mutations.length === 0 && remoteStates.length === 0) {
          await queueFinanceData(dataRef.current)
          continue
        }
        break
      }
      setStatus('synced')
    } catch (error) {
      console.warn('Ошибка синхронизации:', error)
      setStatus(error.message === 'Failed to fetch' ? 'offline' : 'error')
    } finally {
      syncing.current = false
    }
  }, [auth?.token, isLoaded])

  useEffect(() => { synchronize() }, [synchronize, changeSignal])
  useEffect(() => {
    const online = () => synchronize()
    const visible = () => document.visibilityState === 'visible' && synchronize()
    window.addEventListener('online', online)
    document.addEventListener('visibilitychange', visible)
    const interval = window.setInterval(synchronize, 60000)
    return () => {
      window.removeEventListener('online', online)
      document.removeEventListener('visibilitychange', visible)
      window.clearInterval(interval)
    }
  }, [synchronize])

  return { status, synchronize }
}
