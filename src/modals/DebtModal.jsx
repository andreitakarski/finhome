import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { Field } from '../components/Field'
import { Modal } from '../components/Modal'
import { CURRENCIES } from '../constants/finance'

export function DebtModal({ onClose, onSave }) {
  const [form, setForm] = useState({ direction: 'i_owe', person: '', amount: '', currency: 'BYN', note: '' })
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  function submit(event) {
    event.preventDefault()
    if (!form.person.trim() || +form.amount <= 0) return
    onSave({ ...form, person: form.person.trim(), amount: +form.amount, note: form.note.trim() })
  }

  return <Modal title="Добавить долг" onClose={onClose}><form onSubmit={submit}>
    <div className="segmented debt-direction">
      <button type="button" className={form.direction === 'i_owe' ? 'active' : ''} onClick={() => update('direction', 'i_owe')}><ArrowUpRight size={18}/> Я должен</button>
      <button type="button" className={form.direction === 'owed_to_me' ? 'active' : ''} onClick={() => update('direction', 'owed_to_me')}><ArrowDownLeft size={18}/> Мне должны</button>
    </div>
    <Field label="Кому / кто"><input autoFocus value={form.person} onChange={(e) => update('person', e.target.value)} placeholder="Имя человека"/></Field>
    <div className="form-row"><Field label="Сумма"><input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => update('amount', e.target.value)} placeholder="0.00"/></Field><Field label="Валюта"><select value={form.currency} onChange={(e) => update('currency', e.target.value)}>{CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</select></Field></div>
    <Field label="Комментарий"><input value={form.note} onChange={(e) => update('note', e.target.value)} placeholder="Необязательно"/></Field>
    <button className="wide-primary">Сохранить долг</button>
  </form></Modal>
}
