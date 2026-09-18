import { ArrowDownLeft, Building2, Landmark } from 'lucide-react'
import { formatDate, formatMoney } from '../utils/formatters'

export function MortgagePage({ mortgage, usdRate, onAddPayment }) {
  const paid = mortgage.originalUSD - mortgage.balanceUSD
  const paidPercent = mortgage.originalUSD ? paid / mortgage.originalUSD * 100 : 0

  return <section className="page narrow-page">
    <p className="eyebrow dark">ИПОТЕЧНЫЙ КРЕДИТ</p><h1 className="page-title">Ваш дом становится ближе</h1>
    <article className="mortgage-card">
      <div className="mortgage-title"><span className="account-icon gold"><Building2/></span><div><span>Остаток кредита</span><h2>{formatMoney(mortgage.balanceUSD, 'USD')}</h2><p>≈ {formatMoney(mortgage.balanceUSD * usdRate, 'BYN')}</p></div></div>
      <div className="progress"><span style={{ width: `${Math.min(100, paidPercent)}%` }}/></div>
      <div className="progress-caption"><span>Выплачено {paidPercent.toFixed(1)}%</span><b>{formatMoney(paid, 'USD')}</b></div>
      <button className="wide-primary" onClick={onAddPayment}>Внести ежемесячный платёж</button>
    </article>
    <div className="stats-grid"><div><span>Первоначальная сумма</span><b>{formatMoney(mortgage.originalUSD, 'USD')}</b></div><div><span>Процентная ставка</span><b>{mortgage.rate}%</b></div></div>
    <div className="section-heading mortgage-history"><div><p className="eyebrow dark">ПЛАТЕЖИ</p><h2>История выплат</h2></div></div>
    <div className="history-card">{mortgage.payments.length === 0
      ? <div className="empty"><Landmark/><b>Платежей пока нет</b><span>Добавьте первый ежемесячный платёж</span></div>
      : mortgage.payments.map((payment) => <div className="transaction" key={payment.id}><span className="transaction-icon in"><ArrowDownLeft/></span><div className="transaction-info"><b>Платёж по кредиту</b><span>{formatDate(payment.date)} · в основной долг {formatMoney(payment.principalUSD, 'USD')}</span></div><strong>−{formatMoney(payment.amountBYN, 'BYN')}</strong></div>)}</div>
  </section>
}
