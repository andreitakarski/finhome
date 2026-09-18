import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateTotals } from '../utils/calculations'
import { loadFinanceData, queueFinanceData, saveFinanceData } from '../utils/storage'
import { fetchNBRBRates } from '../utils/currencyApi'
import { INITIAL_DATA } from '../constants/finance'

export function useFinanceData() {
  const [data, setData] = useState(() => structuredClone(INITIAL_DATA))
  const [isLoaded, setIsLoaded] = useState(false)
  const [syncRevision, setSyncRevision] = useState(0)
  const persistenceStarted = useRef(false)
  const applyingRemoteData = useRef(false)
  const totals = useMemo(() => calculateTotals(data.transactions), [data.transactions])

  useEffect(() => {
    let active = true
    loadFinanceData().then((savedData) => {
      if (!active) return
      setData(savedData)
      setIsLoaded(true)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    if (!persistenceStarted.current) {
      persistenceStarted.current = true
      saveFinanceData(data).catch((error) => console.warn('Не удалось сохранить данные в IndexedDB:', error))
      return
    }
    if (applyingRemoteData.current) {
      applyingRemoteData.current = false
      return
    }
    queueFinanceData(data)
      .then(() => setSyncRevision((revision) => revision + 1))
      .catch((error) => console.warn('Не удалось добавить изменение в очередь:', error))
  }, [data, isLoaded])

  useEffect(() => {
    if (!isLoaded) return undefined
    const controller = new AbortController()
    fetchNBRBRates(controller.signal)
      .then(({ rates, updatedAt }) => {
        // Курсы являются внешними справочными данными и не должны создавать
        // облачную версию пустого состояния на новом устройстве.
        applyingRemoteData.current = true
        setData((current) => ({ ...current, rates, ratesUpdatedAt: updatedAt }))
      })
      .catch((error) => {
        if (error.name !== 'AbortError') console.warn('Не удалось обновить курсы НБРБ:', error)
      })
    return () => controller.abort()
  }, [isLoaded])

  function addTransaction(transaction) {
    setData((current) => ({
      ...current,
      transactions: [{ id: crypto.randomUUID(), date: new Date().toISOString(), ...transaction }, ...current.transactions],
    }))
  }

  function addMortgagePayment(payment) {
    setData((current) => ({
      ...current,
      mortgage: {
        ...current.mortgage,
        balanceUSD: Math.max(0, current.mortgage.balanceUSD - payment.principalUSD),
        payments: [{ id: crypto.randomUUID(), date: new Date().toISOString(), ...payment }, ...current.mortgage.payments],
      },
    }))
  }

  function addDebt(debt) {
    setData((current) => ({
      ...current,
      debts: [{
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        originalAmount: debt.amount,
        remainingAmount: debt.amount,
        repayments: [],
        ...debt,
      }, ...current.debts],
    }))
  }

  function repayDebt(debtId, amount) {
    setData((current) => ({
      ...current,
      debts: current.debts.map((debt) => {
        if (debt.id !== debtId) return debt
        const paidAmount = Math.min(amount, debt.remainingAmount)
        return {
          ...debt,
          remainingAmount: Math.max(0, debt.remainingAmount - paidAmount),
          repayments: [{ id: crypto.randomUUID(), amount: paidAmount, date: new Date().toISOString() }, ...debt.repayments],
        }
      }),
    }))
  }

  function applyRemoteData(remoteData) {
    applyingRemoteData.current = true
    setData(remoteData)
  }

  return { data, setData, totals, isLoaded, syncRevision, applyRemoteData, addTransaction, addMortgagePayment, addDebt, repayDebt }
}
