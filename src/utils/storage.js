import { INITIAL_DATA } from '../constants/finance'

const STORAGE_KEY = 'finhome-data'

export function loadFinanceData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!saved) return INITIAL_DATA
    // Миграция данных ранней версии, где хранились только названия банков.
    const cards = saved.cards || (saved.banks || []).map((bank, index) => ({
      id: `legacy-card-${index}`,
      name: 'Основная карта',
      bank,
      currency: 'BYN',
    }))
    return { ...INITIAL_DATA, ...saved, cards, debts: saved.debts || [] }
  } catch {
    return INITIAL_DATA
  }
}

export function saveFinanceData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
