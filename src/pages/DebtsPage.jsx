import { ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { CURRENCIES } from '../constants/finance'
import { formatDate, formatMoney } from '../utils/formatters'

function DebtColumn({ title, subtitle, direction, debts, onRepay }) {
  const items = debts.filter((debt) => debt.direction === direction)
  return <section className="debt-column">
    <div className="debt-column-head"><span className={`debt-type-icon ${direction}`}>{direction === 'i_owe' ? <ArrowUpRight/> : <ArrowDownLeft/>}</span><div><h2>{title}</h2><p>{subtitle}</p></div></div>
    <div className="debt-list">{items.length === 0 ? <div className="debt-empty"><CheckCircle2/><span>Активных долгов нет</span></div> : items.map((debt) => {
      const paid = debt.originalAmount - debt.remainingAmount
      const percent = debt.originalAmount ? paid / debt.originalAmount * 100 : 0
      return <article className={`debt-card ${debt.remainingAmount === 0 ? 'settled' : ''}`} key={debt.id}>
        <div className="debt-card-top"><div><h3>{debt.person}</h3><span>{formatDate(debt.createdAt)}{debt.note ? ` · ${debt.note}` : ''}</span></div><strong>{formatMoney(debt.remainingAmount, debt.currency)}</strong></div>
        <div className="debt-progress"><span style={{ width: `${percent}%` }}/></div>
        <div className="debt-card-bottom"><small>{debt.remainingAmount === 0 ? 'Погашено полностью' : `из ${formatMoney(debt.originalAmount, debt.currency)}`}</small>{debt.remainingAmount > 0 && <button onClick={() => onRepay(debt)}>Погасить</button>}</div>
        {debt.repayments.length > 0 && <details className="repayment-history"><summary>История погашений ({debt.repayments.length})</summary>{debt.repayments.map((payment) => <div key={payment.id}><span>{formatDate(payment.date)}</span><b>{formatMoney(payment.amount, debt.currency)}</b></div>)}</details>}
      </article>
    })}</div>
  </section>
}

export function DebtsPage({ debts, rates, savingsTotals, onRepay }) {
  const active = debts.filter((debt) => debt.remainingAmount > 0)
  const debtsInBYN = (direction) => active.filter((debt) => debt.direction === direction).reduce((sum, debt) => sum + debt.remainingAmount * (debt.currency === 'BYN' ? 1 : rates[debt.currency]), 0)
  const total = (direction, currency) => debtsInBYN(direction) / (currency === 'BYN' ? 1 : rates[currency])
  const savingsBYN = (savingsTotals.cash.USD + savingsTotals.card.USD) * rates.USD
    + (savingsTotals.cash.EUR + savingsTotals.card.EUR) * rates.EUR
    + savingsTotals.cash.BYN + savingsTotals.card.BYN
  const netCapitalBYN = savingsBYN + debtsInBYN('owed_to_me') - debtsInBYN('i_owe')
  const netCapital = (currency) => netCapitalBYN / (currency === 'BYN' ? 1 : rates[currency])
  return <section className="page debts-page">
    <div className="debts-title"><div><p className="eyebrow dark">ЛИЧНЫЕ РАСЧЁТЫ</p><h1 className="page-title">Долги</h1></div></div>
    <div className="debt-totals"><div className="owe"><span>Я должен всего</span><strong>{formatMoney(total('i_owe', 'USD'), 'USD')}</strong><small>{CURRENCIES.filter((c) => c !== 'USD').map((c) => `≈ ${formatMoney(total('i_owe', c), c)}`).join(' · ')}</small></div><div className="owed"><span>Мне должны всего</span><strong>{formatMoney(total('owed_to_me', 'USD'), 'USD')}</strong><small>{CURRENCIES.filter((c) => c !== 'USD').map((c) => `≈ ${formatMoney(total('owed_to_me', c), c)}`).join(' · ')}</small></div></div>
    <div className="net-capital">
      <div><span>КАПИТАЛ С УЧЁТОМ ДОЛГОВ</span><strong>{formatMoney(netCapital('USD'), 'USD')}</strong><small>Копилка + мне должны − я должен</small></div>
      <div className="net-capital-values"><span>{formatMoney(netCapital('EUR'), 'EUR')}</span><span>{formatMoney(netCapital('BYN'), 'BYN')}</span></div>
    </div>
    <div className="debt-columns"><DebtColumn title="Я должен" subtitle="Ваши обязательства" direction="i_owe" debts={debts} onRepay={onRepay}/><DebtColumn title="Мне должны" subtitle="Ожидаемые возвраты" direction="owed_to_me" debts={debts} onRepay={onRepay}/></div>
  </section>
}
