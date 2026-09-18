import { DEFAULT_MORTGAGE } from '../utils/mortgage'

export const CURRENCIES = ['USD', 'EUR', 'BYN']
export const CASH_CURRENCIES = ['USD', 'EUR']

export const DENOMINATIONS = {
  USD: [1, 2, 5, 10, 20, 50, 100],
  EUR: [5, 10, 20, 50, 100, 200, 500],
}

export const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', BYN: 'Br' }

export const INITIAL_DATA = {
  transactions: [],
  debts: [],
  cards: [],
  rates: { USD: 3.28, EUR: 3.57 },
  ratesUpdatedAt: null,
  mortgage: structuredClone(DEFAULT_MORTGAGE),
}
