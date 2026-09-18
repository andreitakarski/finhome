import { useState } from 'react'
import { CreditCard, Trash2, X } from 'lucide-react'
import { Field } from '../components/Field'
import { CURRENCIES } from '../constants/finance'
import { formatDate, formatMoney } from '../utils/formatters'
import { SyncCard } from '../components/SyncCard'
import { DEFAULT_MORTGAGE } from '../utils/mortgage'

export function SettingsPage({ data, setData, notify, googleAuth, onGoogleAuthChange }) {
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

  function clearSection(section) {
    const labels = {
      savings: 'все операции накоплений',
      debts: 'все долги и погашения',
      mortgage: 'всю историю ипотеки и восстановить первоначальный график',
      all: 'ВСЕ финансовые данные приложения',
    }
    if (!window.confirm(`Удалить ${labels[section]}? Изменение будет синхронизировано со всеми устройствами.`)) return
    if (section === 'all' && !window.confirm('Это действие очистит накопления, карты, долги и платежи по ипотеке. Продолжить?')) return
    setData((current) => {
      if (section === 'savings') return { ...current, transactions: [] }
      if (section === 'debts') return { ...current, debts: [] }
      if (section === 'mortgage') return { ...current, mortgage: structuredClone(DEFAULT_MORTGAGE) }
      return { ...current, transactions: [], debts: [], cards: [], mortgage: structuredClone(DEFAULT_MORTGAGE) }
    })
    notify('Удаление поставлено в очередь синхронизации')
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

    <SyncCard auth={googleAuth} onAuthChange={onGoogleAuthChange}/>

    <div className="settings-card danger-zone">
      <span className="danger-icon"><Trash2 size={20}/></span>
      <div><h3>Очистка данных</h3><p>Удаления попадут в облачную базу и применятся на других устройствах при следующей синхронизации.</p></div>
      <div className="danger-actions">
        <button type="button" onClick={() => clearSection('savings')}>Очистить накопления</button>
        <button type="button" onClick={() => clearSection('debts')}>Очистить долги</button>
        <button type="button" onClick={() => clearSection('mortgage')}>Сбросить ипотеку</button>
        <button type="button" className="danger-all" onClick={() => clearSection('all')}>Очистить всё</button>
      </div>
    </div>
  </section>
}
