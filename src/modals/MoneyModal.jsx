import { useState } from 'react'
import { Banknote, CreditCard } from 'lucide-react'
import { Field } from '../components/Field'
import { Modal } from '../components/Modal'
import { CASH_CURRENCIES, CURRENCY_SYMBOLS, DENOMINATIONS } from '../constants/finance'
import { formatMoney } from '../utils/formatters'

export function MoneyModal({ data, initial, onClose, onSave }) {
  const [form, setForm] = useState({
    direction: initial.direction,
    source: initial.source,
    currency: initial.source === 'cash' ? 'USD' : (data.cards[0]?.currency || 'BYN'),
    denomination: 100,
    quantity: 1,
    amount: '',
    cardId: data.cards[0]?.id || '',
    note: '',
  })
  const isCash = form.source === 'cash'
  const selectedCard = data.cards.find((card) => card.id === form.cardId)
  const total = isCash ? Number(form.denomination) * Number(form.quantity) : Number(form.amount)
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  function selectSource(source) {
    setForm((current) => ({ ...current, source, currency: source === 'cash' ? 'USD' : (data.cards[0]?.currency || 'BYN'), cardId: data.cards[0]?.id || '' }))
  }
  function submit(event) {
    event.preventDefault()
    if (!(total > 0)) return
    if (!isCash && !selectedCard) return
    onSave({
      direction: form.direction,
      source: form.source,
      currency: form.currency,
      amount: total,
      denomination: isCash ? Number(form.denomination) : null,
      quantity: isCash ? Number(form.quantity) : null,
      cardId: isCash ? null : selectedCard.id,
      cardName: isCash ? null : selectedCard.bank,
      note: isCash ? `${form.quantity} × ${formatMoney(form.denomination, form.currency)}` : form.note,
    })
  }

  return <Modal onClose={onClose} title={form.direction === 'in' ? 'Пополнить копилку' : 'Снять средства'}><form onSubmit={submit}>
    <div className="segmented"><button type="button" className={isCash ? 'active' : ''} onClick={() => selectSource('cash')}><Banknote size={18}/> Наличные</button><button type="button" className={!isCash ? 'active' : ''} onClick={() => selectSource('card')}><CreditCard size={18}/> Карта</button></div>
    {isCash && <Field label="Валюта"><select value={form.currency} onChange={(e) => update('currency', e.target.value)}>{CASH_CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</select></Field>}
    {isCash ? <div className="form-row"><Field label="Номинал купюры"><select value={form.denomination} onChange={(e) => update('denomination', e.target.value)}>{DENOMINATIONS[form.currency].map((value) => <option key={value} value={value}>{value} {CURRENCY_SYMBOLS[form.currency]}</option>)}</select></Field><Field label="Количество"><input type="number" min="1" value={form.quantity} onChange={(e) => update('quantity', e.target.value)}/></Field></div> : data.cards.length ? <><Field label="Карта"><select value={form.cardId} onChange={(e) => { const card = data.cards.find((item) => item.id === e.target.value); setForm((current) => ({ ...current, cardId: e.target.value, currency: card.currency })) }}>{data.cards.map((card) => <option key={card.id} value={card.id}>{card.bank} ({card.currency})</option>)}</select></Field><Field label={`Сумма, ${form.currency}`}><input type="number" min="0.01" step="0.01" autoFocus value={form.amount} onChange={(e) => update('amount', e.target.value)} placeholder="0.00"/></Field></> : <div className="empty-inline">Сначала добавьте карту в настройках</div>}
    <div className="modal-total"><span>Итого</span><strong>{formatMoney(total, form.currency)}</strong></div><button className="wide-primary" type="submit">{form.direction === 'in' ? 'Добавить средства' : 'Подтвердить снятие'}</button>
  </form></Modal>
}
