import { Plus } from 'lucide-react'
import { formatMoney } from '../utils/formatters'

export function AccountCard({ icon: Icon, title, subtitle, totals, currencies, rates, onAction, onCurrencyClick, children }) {
  const totalBYN = totals.USD * rates.USD + totals.EUR * rates.EUR + totals.BYN
  const totalUSD = totalBYN / rates.USD
  const totalEUR = totalBYN / rates.EUR

  return <article className="account-card">
    <div className="account-top"><span className="account-icon"><Icon size={24}/></span><div><h3>{title}</h3><p>{subtitle}</p></div></div>
    <div className="balance-list">{currencies.map((currency) => onCurrencyClick
      ? <button type="button" className="balance-row clickable" key={currency} onClick={() => onCurrencyClick(currency)}><span>{currency}</span><strong>{formatMoney(totals[currency], currency)}</strong></button>
      : <div className="balance-row" key={currency}><span>{currency}</span><strong>{formatMoney(totals[currency], currency)}</strong></div>)}</div>
    <div className="account-summary">
      <span>Общая сумма</span>
      <div>
        <strong>{formatMoney(totalUSD, 'USD')}</strong>
        <small>≈ {formatMoney(totalEUR, 'EUR')}</small>
        <small>≈ {formatMoney(totalBYN, 'BYN')}</small>
      </div>
    </div>
    {children}
    <div className="card-actions">
      <button className="primary-action" onClick={() => onAction('in')}><Plus size={17}/> Пополнить</button>
      <button onClick={() => onAction('out')}>Снять</button>
    </div>
  </article>
}
