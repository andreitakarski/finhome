import { ArrowDownLeft, ArrowUpRight, CircleDollarSign } from 'lucide-react'
import { formatDate, formatMoney } from '../utils/formatters'

export function TransactionList({ transactions }) {
  return <div className="history-card">
    {transactions.length === 0
      ? <div className="empty"><CircleDollarSign size={33}/><b>Операций пока нет</b><span>Добавьте первую сумму в копилку</span></div>
      : transactions.slice(0, 7).map((transaction) => <div className="transaction" key={transaction.id}>
        <span className={`transaction-icon ${transaction.direction}`}>{transaction.direction === 'in' ? <ArrowDownLeft/> : <ArrowUpRight/>}</span>
        <div className="transaction-info">
          <b>{transaction.direction === 'in' ? 'Пополнение' : 'Снятие'} · {transaction.source === 'cash' ? 'Наличные' : transaction.cardName || transaction.bank || 'Карта'}</b>
          <span>{formatDate(transaction.date)}{transaction.note ? ` · ${transaction.note}` : ''}</span>
        </div>
        <strong className={transaction.direction}>{transaction.direction === 'in' ? '+' : '−'}{formatMoney(transaction.amount, transaction.currency)}</strong>
      </div>)}
  </div>
}
