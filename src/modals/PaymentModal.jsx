import { useState } from 'react'
import { Field } from '../components/Field'
import { Modal } from '../components/Modal'

export function PaymentModal({ mortgage, usdRate, onClose, onSave }) {
  const [amountBYN, setAmountBYN] = useState('')
  const [principalUSD, setPrincipalUSD] = useState('')
  function submit(event) {
    event.preventDefault()
    if (+amountBYN <= 0 || +principalUSD <= 0) return
    onSave({ amountBYN: +amountBYN, principalUSD: Math.min(+principalUSD, mortgage.balanceUSD) })
  }
  return <Modal onClose={onClose} title="Платёж по ипотеке"><form onSubmit={submit}>
    <Field label="Сумма платежа, BYN"><input autoFocus type="number" min="0.01" step="0.01" value={amountBYN} onChange={(e) => setAmountBYN(e.target.value)} placeholder="0.00"/></Field>
    <Field label="В основной долг, USD"><input type="number" min="0.01" max={mortgage.balanceUSD} step="0.01" value={principalUSD} onChange={(e) => setPrincipalUSD(e.target.value)} placeholder="0.00"/></Field>
    <p className="form-hint">Укажите часть платежа, которая уменьшает основной долг. Текущий курс: 1 USD = {usdRate} BYN.</p><button className="wide-primary">Учесть платёж</button>
  </form></Modal>
}
