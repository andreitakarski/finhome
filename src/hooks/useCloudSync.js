import { useCallback, useEffect, useRef, useState } from 'react'
import { SYNC_API_URL } from '../constants/sync'
import { getDeviceId, getLastSeq, getOutbox, queueFinanceMutations, removeFromOutbox, saveFinanceData, setLastSeq } from '../utils/storage'
import { applyChanges, createMutations } from '../utils/syncEntities'

const SYNC_INTERVAL_MS = 5000

export function useCloudSync({ auth, data, isLoaded, changeSignal, onRemoteData }) {
  const [status, setStatus] = useState(auth ? 'idle' : 'local')
  const syncing = useRef(false)
  const resyncRequested = useRef(false)
  const dataRef = useRef(data)
  const remoteDataRef = useRef(onRemoteData)
  dataRef.current = data
  remoteDataRef.current = onRemoteData

  const synchronize = useCallback(async () => {
    if (!auth?.token || !isLoaded) return
    if (syncing.current) {
      resyncRequested.current = true
      return
    }
    if (!navigator.onLine) return setStatus('offline')
    syncing.current = true
    setStatus('syncing')

    try {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const [deviceId, lastSeq, outbox] = await Promise.all([getDeviceId(), getLastSeq(), getOutbox()])
        const mutations = outbox.slice(0, 100)
        const dataAtRequestStart = dataRef.current
        const response = await fetch(SYNC_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'sync', idToken: auth.token, deviceId, lastSeq, mutations }),
        })
        const result = await response.json()
        if (!result.ok) throw new Error(result.error || 'Ошибка синхронизации')

        const remoteChanges = result.changes || []
        await removeFromOutbox(result.acceptedMutationIds || [])
        const remainingMutations = await getOutbox()

        // Не применяем ответ, если пользователь успел изменить данные во время запроса.
        if (dataRef.current !== dataAtRequestStart || remainingMutations.length > 0) {
          if (attempt < 4 && remainingMutations.length > 0) continue
          resyncRequested.current = true
          break
        }

        if (remoteChanges.length) {
          const mergedData = applyChanges(dataRef.current, remoteChanges)
          dataRef.current = mergedData
          await saveFinanceData(mergedData)
          remoteDataRef.current(mergedData)
        }
        // Продвигаем курсор только после того, как удалённое состояние применено.
        await setLastSeq(result.lastSeq)

        if (attempt === 0 && lastSeq === 0 && mutations.length === 0 && remoteChanges.length === 0) {
          await queueFinanceMutations(dataRef.current, createMutations(dataRef.current, dataRef.current, true))
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
      if (resyncRequested.current) {
        resyncRequested.current = false
        window.setTimeout(synchronize, 0)
      }
    }
  }, [auth?.token, isLoaded])

  useEffect(() => { synchronize() }, [synchronize, changeSignal])
  useEffect(() => {
    const online = () => synchronize()
    const visible = () => document.visibilityState === 'visible' && synchronize()
    window.addEventListener('online', online)
    document.addEventListener('visibilitychange', visible)
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') synchronize()
    }, SYNC_INTERVAL_MS)
    return () => {
      window.removeEventListener('online', online)
      document.removeEventListener('visibilitychange', visible)
      window.clearInterval(interval)
    }
  }, [synchronize])

  return { status, synchronize }
}
