import { useState } from 'react'
import { Banknote, ChevronRight, CreditCard } from 'lucide-react'
import { CASH_CURRENCIES, CURRENCIES } from '../constants/finance'
import { AccountCard } from '../components/AccountCard'
import { TransactionList } from '../components/TransactionList'
import { formatMoney } from '../utils/formatters'
import { calculateCashDenominations } from '../utils/calculations'
import { Modal } from '../components/Modal'

export function SavingsPage({ data, totals, onMoneyAction }) {
  const [denominationCurrency, setDenominationCurrency] = useState(null)
  const cashDenominations = calculateCashDenominations(data.transactions)
  const all = (currency) => totals.cash[currency] + totals.card[currency]
  const totalUSD = all('USD') + all('EUR') * data.rates.EUR / data.rates.USD + all('BYN') / data.rates.USD
  const totalBYN = all('USD') * data.rates.USD + all('EUR') * data.rates.EUR + all('BYN')
  const totalEUR = totalBYN / data.rates.EUR

  return <>
    <section className="hero">
      <div><p className="eyebrow">ОБЩИЙ КАПИТАЛ</p><h1>{formatMoney(totalUSD, 'USD')}</h1><div className="hero-equivalents"><span>≈ {formatMoney(totalEUR, 'EUR')}</span><span>≈ {formatMoney(totalBYN, 'BYN')}</span></div></div>
      <div className="currency-row">
        <div className="currency-total featured"><span>Доллары</span><strong>{formatMoney(all('USD'), 'USD')}</strong></div>
        <div className="currency-total"><span>Евро</span><strong>{formatMoney(all('EUR'), 'EUR')}</strong></div>
        <div className="currency-total"><span>Бел. рубли</span><strong>{formatMoney(all('BYN'), 'BYN')}</strong></div>
      </div>
    </section>
    <section className="content-section">
      <div className="section-heading"><div><p className="eyebrow dark">ВАШИ СРЕДСТВА</p><h2>Где лежат деньги</h2></div></div>
      <div className="account-grid">
        <AccountCard icon={Banknote} title="Наличные" subtitle="Нажмите на валюту для детализации" totals={totals.cash} currencies={CASH_CURRENCIES} rates={data.rates} onAction={(direction) => onMoneyAction(direction, 'cash')} onCurrencyClick={setDenominationCurrency}/>
        <AccountCard icon={CreditCard} title="Банковские карты" subtitle={`${data.cards.length} карт`} totals={totals.card} currencies={CURRENCIES} rates={data.rates} onAction={(direction) => onMoneyAction(direction, 'card')}>
          <div className="card-breakdown">{data.cards.map((card) => {
            const cardBalance = data.transactions.filter((item) => item.cardId === card.id).reduce((sum, item) => sum + (item.direction === 'in' ? item.amount : -item.amount), 0)
            return <div key={card.id}><span><b>{card.bank}</b><small>{card.currency}</small></span><strong>{formatMoney(cardBalance, card.currency)}</strong></div>
          })}</div>
        </AccountCard>
      </div>
    </section>
    <section className="content-section history-section">
      <div className="section-heading"><div><p className="eyebrow dark">ИСТОРИЯ</p><h2>Последние операции</h2></div><button className="text-btn">Все операции <ChevronRight size={17}/></button></div>
      <TransactionList transactions={data.transactions}/>
    </section>
    {denominationCurrency && <Modal eyebrow="НАЛИЧНЫЕ" title={`Купюры · ${denominationCurrency}`} onClose={() => setDenominationCurrency(null)}>
      <div className="denomination-popup">
        {Object.entries(cashDenominations[denominationCurrency]).filter(([, quantity]) => quantity !== 0).sort(([a], [b]) => Number(b) - Number(a)).map(([denomination, quantity]) => <div key={denomination}><span>{formatMoney(Number(denomination), denominationCurrency)}</span><strong>{quantity} шт.</strong></div>)}
        {!Object.values(cashDenominations[denominationCurrency]).some((quantity) => quantity !== 0) && <div className="empty-inline">Купюр этой валюты пока нет</div>}
      </div>
    </Modal>}
  </>
}
