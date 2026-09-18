import { useState } from 'react'
import { CreditCard, X } from 'lucide-react'
import { Field } from '../components/Field'
import { CURRENCIES } from '../constants/finance'
import { formatDate, formatMoney } from '../utils/formatters'

export function SettingsPage({ data, setData, notify }) {
  const [card, setCard] = useState({ bank: '', currency: 'BYN' })

  function addCard(event) {
    event.preventDefault()
    if (!card.bank.trim()) return
    setData((current) => ({
      ...current,
      cards: [...current.cards, { id: crypto.randomUUID(), bank: card.bank.trim(), currency: card.currency }],
    }))
    setCard({ bank: '', currency: 'BYN' })
    notify('Карта добавлена')
  }

  function removeCard(cardId) {
    setData((current) => ({ ...current, cards: current.cards.filter((item) => item.id !== cardId) }))
    notify('Карта удалена')
  }

  return <section className="page narrow-page">
    <p className="eyebrow dark">ПАРАМЕТРЫ</p><h1 className="page-title">Настройки</h1>

    <div className="settings-card">
      <h3>Курсы НБРБ</h3>
      <p>Официальные курсы обновляются автоматически при открытии приложения.</p>
      <div className="rates-list">
        <div><span>1 USD</span><b>{formatMoney(data.rates.USD, 'BYN')}</b></div>
        <div><span>1 EUR</span><b>{formatMoney(data.rates.EUR, 'BYN')}</b></div>
      </div>
      <p className="rate-date">Обновлено: {data.ratesUpdatedAt ? formatDate(data.ratesUpdatedAt) : 'используются сохранённые значения'}</p>
    </div>

    <div className="settings-card">
      <h3>Банковские карты</h3><p>Добавьте карты, чтобы вести баланс каждой отдельно.</p>
      <div className="saved-cards">{data.cards.map((item) => <div className="saved-card" key={item.id}>
        <span className="mini-card-icon"><CreditCard size={19}/></span>
        <div><b>{item.bank}</b><span>{item.currency}</span></div>
        <button onClick={() => removeCard(item.id)} aria-label="Удалить карту"><X size={17}/></button>
      </div>)}</div>
      <form className="card-form" onSubmit={addCard}>
        <Field label="Название банка"><input value={card.bank} onChange={(e) => setCard({ ...card, bank: e.target.value })} placeholder="Например, Беларусбанк"/></Field>
        <Field label="Валюта карты"><select value={card.currency} onChange={(e) => setCard({ ...card, currency: e.target.value })}>{CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</select></Field>
        <button className="wide-primary">Добавить карту</button>
      </form>
    </div>

    <div className="settings-card sync-card"><h3>Синхронизация</h3><p>Сейчас данные сохраняются на этом устройстве и доступны офлайн. Облачная синхронизация Supabase подключается через переменные окружения.</p><span className="status-pill">Локальный режим</span></div>
  </section>
}
