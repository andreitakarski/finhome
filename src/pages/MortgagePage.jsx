import { useMemo, useState } from 'react'
import { ArrowDownLeft, Building2, CalendarDays, Landmark } from 'lucide-react'
import { formatDate, formatMoney } from '../utils/formatters'
import { buildMortgageForecast, buildOriginalMortgageSchedule, mortgageMetrics, nextMortgagePayment, normalizeMortgage } from '../utils/mortgage'

function Metric({ label, value, usd, accent }) {
  return <div className={accent ? 'accent' : ''}><span>{label}</span><b>{value}</b>{usd !== undefined && <small>{formatMoney(usd, 'USD')}</small>}</div>
}

function usdPart(row, usdField, bynField, currentRate) {
  if (row.isPaid) return Number(row[usdField]) || Number(row[bynField] || 0) / Number(row.exchangeRateUSD || currentRate)
  return Number(row[bynField] || 0) / currentRate
}

function MoneyPair({ byn, usd }) {
  return <>{formatMoney(byn, 'BYN')}<small>{formatMoney(usd, 'USD')}</small></>
}

function ScheduleTable({ rows, actual, currentRate }) {
  return <div className="schedule-scroll"><table className="mortgage-schedule">
    <thead><tr><th>Дата</th><th>Платёж</th><th>Проценты</th><th>Основной долг</th><th>Досрочно</th><th>Остаток</th></tr></thead>
    <tbody>{rows.map((row) => <tr key={`${row.dueDate || row.scheduledFor}-${row.id || row.index}`} className={row.isPaid ? 'paid' : ''}>
      <td>{formatDate(actual && row.isPaid ? row.date : row.dueDate || row.scheduledFor)}{row.isPaid && <small>оплачен</small>}</td>
      <td><MoneyPair byn={row.amountBYN} usd={usdPart(row, 'amountUSD', 'amountBYN', currentRate)}/></td>
      <td><MoneyPair byn={row.interestBYN} usd={usdPart(row, 'interestUSD', 'interestBYN', currentRate)}/></td>
      <td><MoneyPair byn={row.principalBYN} usd={usdPart(row, 'principalUSD', 'principalBYN', currentRate)}/></td>
      <td>{row.extraPrincipalBYN ? <MoneyPair byn={row.extraPrincipalBYN} usd={usdPart(row, 'extraPrincipalUSD', 'extraPrincipalBYN', currentRate)}/> : '—'}</td>
      <td><MoneyPair byn={row.balanceAfterBYN} usd={Number(row.balanceAfterBYN || 0) / currentRate}/></td>
    </tr>)}</tbody>
  </table></div>
}

export function MortgagePage({ mortgage: source, usdRate, onAddPayment }) {
  const mortgage = useMemo(() => normalizeMortgage(source), [source])
  const [schedule, setSchedule] = useState('actual')
  const metrics = useMemo(() => mortgageMetrics(mortgage, usdRate), [mortgage, usdRate])
  const originalSchedule = useMemo(() => buildOriginalMortgageSchedule(mortgage), [mortgage])
  const forecast = useMemo(() => buildMortgageForecast(mortgage), [mortgage])
  const nextPayment = forecast[0] || nextMortgagePayment(mortgage)
  const paidPercent = mortgage.principalBYN ? metrics.paidPrincipalBYN / mortgage.principalBYN * 100 : 0
  const actualRows = useMemo(() => [
    ...[...mortgage.payments].reverse().map((payment) => ({ ...payment, dueDate: payment.scheduledFor, isPaid: true })),
    ...forecast,
  ], [forecast, mortgage.payments])

  return <section className="page mortgage-page">
    <p className="eyebrow dark">ИПОТЕЧНЫЙ КРЕДИТ</p><h1 className="page-title">Ваш дом становится ближе</h1>
    <article className="mortgage-card">
      <div className="mortgage-summary">
        <div className="mortgage-title"><span className="account-icon gold"><Building2/></span><div><span>Остаток кредита</span><h2>{formatMoney(mortgage.balanceBYN, 'BYN')}</h2><p>{formatMoney(metrics.balanceUSD, 'USD')} по текущему курсу · погашено {paidPercent.toFixed(1)}%</p></div></div>
        {nextPayment && <div className="next-payment"><CalendarDays/><span>Следующий плановый платёж<small>{formatDate(nextPayment.dueDate)}</small></span><b>{formatMoney(nextPayment.amountBYN, 'BYN')}<small>{formatMoney(nextPayment.amountBYN / usdRate, 'USD')}</small></b></div>}
      </div>
      <div className="progress"><span style={{ width: `${Math.min(100, paidPercent)}%` }}/></div>
      <div className="progress-caption"><span>Погашено тела</span><b>{formatMoney(metrics.paidPrincipalBYN, 'BYN')}</b></div>
      <button className="wide-primary" onClick={onAddPayment} disabled={!nextPayment}>Внести платёж</button>
    </article>

    <div className="mortgage-metrics">
      <Metric label="Выплачено всего" value={formatMoney(metrics.paidTotalBYN, 'BYN')} usd={metrics.paidTotalUSD}/>
      <Metric label="Погашено тела" value={formatMoney(metrics.paidPrincipalBYN, 'BYN')} usd={metrics.paidPrincipalUSD}/>
      <Metric label="Уплачено процентов" value={formatMoney(metrics.paidInterestBYN, 'BYN')} usd={metrics.paidInterestUSD}/>
      <Metric label="Остаток долга" value={formatMoney(metrics.balanceBYN, 'BYN')} usd={metrics.balanceUSD}/>
      <Metric label="Прогноз переплаты" value={formatMoney(metrics.projectedOverpaymentBYN, 'BYN')} usd={metrics.projectedOverpaymentUSD}/>
      <Metric label="Досрочно погашено" value={formatMoney(metrics.extraPrincipalBYN, 'BYN')} usd={metrics.extraPrincipalUSD} accent/>
      <Metric label="Экономия процентов" value={formatMoney(metrics.interestSavingsBYN, 'BYN')} usd={metrics.interestSavingsUSD} accent/>
      <Metric label="Прогноз погашения" value={metrics.payoffDate ? formatDate(metrics.payoffDate) : 'Погашен'} accent/>
    </div>

    <details className="loan-terms">
      <summary>Параметры кредита</summary>
      <div><span>Сумма</span><b>{formatMoney(mortgage.principalBYN, 'BYN')}</b></div>
      <div><span>Выдан</span><b>{formatDate(mortgage.issuedAt)}</b></div>
      <div><span>Срок</span><b>20 лет · до {formatDate(mortgage.maturityDate)}</b></div>
      <div><span>Льготная ставка</span><b>{mortgage.preferentialRate}% первые 24 месяца</b></div>
      <div><span>Основная ставка</span><b>{mortgage.standardRate}%</b></div>
      <div><span>Погашение тела</span><b>с {formatDate(mortgage.principalStartDate)}</b></div>
      <div><span>Режим переплаты</span><b>{mortgage.earlyRepaymentStrategy === 'reduceTerm' ? 'сокращение срока' : 'уменьшение платежа'}</b></div>
    </details>

    <div className="section-heading mortgage-history"><div><p className="eyebrow dark">ГРАФИК</p><h2>Платежи по кредиту</h2></div></div>
    <div className="schedule-tabs"><button className={schedule === 'actual' ? 'active' : ''} onClick={() => setSchedule('actual')}>Фактический</button><button className={schedule === 'plan' ? 'active' : ''} onClick={() => setSchedule('plan')}>Первоначальный план</button></div>
    <div className="history-card schedule-card">{schedule === 'plan'
      ? <ScheduleTable rows={originalSchedule} currentRate={usdRate}/>
      : actualRows.length === 0
        ? <div className="empty"><Landmark/><b>Платежей пока нет</b></div>
        : <ScheduleTable rows={actualRows} actual currentRate={usdRate}/>}</div>

    <div className="section-heading mortgage-history"><div><p className="eyebrow dark">ИСТОРИЯ</p><h2>Фактические оплаты</h2></div></div>
    <div className="history-card">{mortgage.payments.length === 0
      ? <div className="empty"><Landmark/><b>Платежей пока нет</b><span>Первый платёж запланирован на {formatDate(mortgage.firstPaymentDate)}</span></div>
      : mortgage.payments.map((payment) => {
        const rate = Number(payment.exchangeRateUSD)
        const interestUSD = Number(payment.interestUSD) || Number(payment.interestBYN) / rate
        const principalUSD = Number(payment.principalUSD) + Number(payment.extraPrincipalUSD || 0) || (Number(payment.principalBYN) + Number(payment.extraPrincipalBYN || 0)) / rate
        return <div className="transaction mortgage-transaction" key={payment.id}><span className="transaction-icon in"><ArrowDownLeft/></span><div className="transaction-info"><b>Платёж по кредиту</b><span>{formatDate(payment.date)} · проценты {formatMoney(payment.interestBYN, 'BYN')} / {formatMoney(interestUSD, 'USD')} · тело {formatMoney(Number(payment.principalBYN) + Number(payment.extraPrincipalBYN || 0), 'BYN')} / {formatMoney(principalUSD, 'USD')}</span><small>Курс {rate.toFixed(4)} · всего {formatMoney(payment.amountUSD, 'USD')}</small></div><strong>−{formatMoney(payment.amountBYN, 'BYN')}</strong></div>
      })}</div>
  </section>
}
