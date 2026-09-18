import { useState } from 'react'
import { Field } from '../components/Field'
import { Modal } from '../components/Modal'
import { formatMoney } from '../utils/formatters'

export function RepaymentModal({ debt, onClose, onSave }) {
  const [amount, setAmount] = useState(debt.remainingAmount)
  function submit(event) {
    event.preventDefault()
    if (+amount <= 0) return
    onSave(Math.min(+amount, debt.remainingAmount))
  }
  return <Modal title="Погасить долг" onClose={onClose}><form onSubmit={submit}>
    <div className="repayment-person"><span>{debt.direction === 'i_owe' ? 'Я должен' : 'Мне должен'}</span><strong>{debt.person}</strong><small>Остаток: {formatMoney(debt.remainingAmount, debt.currency)}</small></div>
    <Field label={`Сумма погашения, ${debt.currency}`}><input autoFocus type="number" min="0.01" max={debt.remainingAmount} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}/></Field>
    <button className="wide-primary">Подтвердить погашение</button>
  </form></Modal>
}
