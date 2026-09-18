import { useEffect, useMemo, useState } from 'react'
import { Field } from '../components/Field'
import { Modal } from '../components/Modal'
import { fetchUSD_BYNRateOnDate } from '../utils/currencyApi'
import { formatDate, formatMoney } from '../utils/formatters'
import { nextMortgagePayment } from '../utils/mortgage'

const today = () => new Date().toISOString().slice(0, 10)

export function PaymentModal({ mortgage, onClose, onSave }) {
  const planned = useMemo(() => nextMortgagePayment(mortgage), [mortgage])
  const [date, setDate] = useState(today)
  const [amountBYN, setAmountBYN] = useState(() => String(planned?.amountBYN || ''))
  const [strategy, setStrategy] = useState(mortgage.earlyRepaymentStrategy || 'reduceTerm')
  const [rate, setRate] = useState(null)
  const [rateDate, setRateDate] = useState(null)
  const [rateStatus, setRateStatus] = useState('loading')

  useEffect(() => {
    const controller = new AbortController()
    setRateStatus('loading')
    fetchUSD_BYNRateOnDate(date, controller.signal)
      .then((result) => {
        setRate(result.rate)
        setRateDate(result.date)
        setRateStatus('ready')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setRateStatus(error.message)
      })
    return () => controller.abort()
  }, [date])

  const breakdown = useMemo(() => {
    const amount = Number(amountBYN) || 0
    const interest = Math.min(amount, planned?.interestBYN || 0)
    const regularPrincipal = Math.min(Math.max(0, amount - interest), planned?.principalBYN || 0, mortgage.balanceBYN)
    const extra = Math.min(Math.max(0, amount - interest - regularPrincipal), mortgage.balanceBYN - regularPrincipal)
    return { interest, regularPrincipal, extra }
  }, [amountBYN, mortgage.balanceBYN, planned])

  function submit(event) {
    event.preventDefault()
    if (Number(amountBYN) < planned.amountBYN || !(rate > 0) || date > today()) return
    onSave({ amountBYN: Number(amountBYN), date, exchangeRateUSD: rate, exchangeRateDate: rateDate, earlyRepaymentStrategy: strategy })
  }

  if (!planned) return <Modal onClose={onClose} title="Платёж по ипотеке"><p>Кредит уже полностью погашен.</p></Modal>

  return <Modal onClose={onClose} title="Платёж по ипотеке"><form onSubmit={submit}>
    <p className="form-hint">Плановый платёж за {formatDate(planned.dueDate)} — <b>{formatMoney(planned.amountBYN, 'BYN')}</b>.</p>
    <Field label="Дата фактического платежа"><input type="date" max={today()} value={date} onChange={(event) => setDate(event.target.value)}/></Field>
    <Field label="Сумма платежа, BYN"><input autoFocus type="number" min={planned.amountBYN} step="0.01" value={amountBYN} onChange={(event) => setAmountBYN(event.target.value)}/></Field>
    <Field label="Как учесть досрочное погашение"><select value={strategy} onChange={(event) => setStrategy(event.target.value)}>
      <option value="reduceTerm">Сократить срок кредита</option>
      <option value="reducePayment">Уменьшить будущий платёж</option>
    </select></Field>
    <div className="payment-breakdown">
      <span>Проценты <b>{formatMoney(breakdown.interest, 'BYN')}</b></span>
      <span>Основной долг <b>{formatMoney(breakdown.regularPrincipal, 'BYN')}</b></span>
      <span>Досрочно <b>{formatMoney(breakdown.extra, 'BYN')}</b></span>
    </div>
    <p className="form-hint">{rateStatus === 'loading' ? 'Получаем официальный курс НБРБ…' : rateStatus === 'ready'
      ? `Курс на дату платежа: 1 USD = ${rate.toFixed(4)} BYN · эквивалент ${formatMoney(Number(amountBYN) / rate, 'USD')}`
      : rateStatus}</p>
    <button className="wide-primary" disabled={rateStatus !== 'ready'}>Учесть платёж</button>
  </form></Modal>
}
