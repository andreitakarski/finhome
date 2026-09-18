import { useEffect, useMemo, useState } from 'react'
import { calculateTotals } from '../utils/calculations'
import { loadFinanceData, saveFinanceData } from '../utils/storage'
import { fetchNBRBRates } from '../utils/currencyApi'

export function useFinanceData() {
  const [data, setData] = useState(loadFinanceData)
  const totals = useMemo(() => calculateTotals(data.transactions), [data.transactions])

  useEffect(() => saveFinanceData(data), [data])

  useEffect(() => {
    const controller = new AbortController()
    fetchNBRBRates(controller.signal)
      .then(({ rates, updatedAt }) => setData((current) => ({ ...current, rates, ratesUpdatedAt: updatedAt })))
      .catch((error) => {
        if (error.name !== 'AbortError') console.warn('Не удалось обновить курсы НБРБ:', error)
      })
    return () => controller.abort()
  }, [])

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

  return { data, setData, totals, addTransaction, addMortgagePayment, addDebt, repayDebt }
}
