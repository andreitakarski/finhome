import { INITIAL_DATA } from '../constants/finance'
import { normalizeMortgage } from './mortgage'

const DB_NAME = 'finhome'
const DB_VERSION = 2
const DATA_STORE = 'appData'
const OUTBOX_STORE = 'outbox'
const METADATA_STORE = 'metadata'
const DATA_KEY = 'finance-data'
const LEGACY_STORAGE_KEY = 'finhome-data'

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      Array.from(database.objectStoreNames).forEach((name) => database.deleteObjectStore(name))
      if (!database.objectStoreNames.contains(DATA_STORE)) database.createObjectStore(DATA_STORE)
      if (!database.objectStoreNames.contains(OUTBOX_STORE)) database.createObjectStore(OUTBOX_STORE, { keyPath: 'mutationId' })
      if (!database.objectStoreNames.contains(METADATA_STORE)) database.createObjectStore(METADATA_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Открытие IndexedDB заблокировано другой вкладкой'))
  })
}

async function readFromStore(storeName, key) {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly')
    const request = transaction.objectStore(storeName).get(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => database.close()
  })
}

async function writeToStore(storeName, key, value) {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    transaction.objectStore(storeName).put(value, key)
    transaction.oncomplete = () => { database.close(); resolve() }
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

async function getAllFromStore(storeName) {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly')
    const request = transaction.objectStore(storeName).getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => database.close()
  })
}

function normalizeData(saved) {
  if (!saved) return structuredClone(INITIAL_DATA)

  // Миграция данных ранней версии, где хранились только названия банков.
  const cards = saved.cards || (saved.banks || []).map((bank, index) => ({
    id: `legacy-card-${index}`,
    name: 'Основная карта',
    bank,
    currency: 'BYN',
  }))
  return { ...structuredClone(INITIAL_DATA), ...saved, cards, debts: saved.debts || [], mortgage: normalizeMortgage(saved.mortgage) }
}

export async function loadFinanceData() {
  try {
    const saved = await readFromStore(DATA_STORE, DATA_KEY)
    if (saved) return normalizeData(saved)

    const legacyData = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY))
    const migratedData = normalizeData(legacyData)
    await writeToStore(DATA_STORE, DATA_KEY, migratedData)
    if (legacyData) localStorage.removeItem(LEGACY_STORAGE_KEY)
    return migratedData
  } catch (error) {
    console.warn('Не удалось загрузить данные из IndexedDB:', error)
    try {
      return normalizeData(JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY)))
    } catch {
      return normalizeData(null)
    }
  }
}

export async function saveFinanceData(data) {
  await writeToStore(DATA_STORE, DATA_KEY, data)
}

export async function queueFinanceMutations(data, mutations) {
  if (!mutations.length) return []
  const deviceId = await getDeviceId()
  const prepared = mutations.map((mutation) => ({ ...mutation, deviceId }))
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([DATA_STORE, OUTBOX_STORE], 'readwrite')
    transaction.objectStore(DATA_STORE).put(data, DATA_KEY)
    prepared.forEach((mutation) => transaction.objectStore(OUTBOX_STORE).put(mutation))
    transaction.oncomplete = () => { database.close(); resolve(prepared) }
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function getOutbox() {
  return getAllFromStore(OUTBOX_STORE)
}

export async function removeFromOutbox(mutationIds) {
  if (!mutationIds.length) return
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(OUTBOX_STORE, 'readwrite')
    mutationIds.forEach((id) => transaction.objectStore(OUTBOX_STORE).delete(id))
    transaction.oncomplete = () => { database.close(); resolve() }
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function getDeviceId() {
  let deviceId = await readFromStore(METADATA_STORE, 'deviceId')
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    await writeToStore(METADATA_STORE, 'deviceId', deviceId)
  }
  return deviceId
}

export async function getLastSeq() {
  return Number(await readFromStore(METADATA_STORE, 'lastSeq')) || 0
}

export async function setLastSeq(lastSeq) {
  await writeToStore(METADATA_STORE, 'lastSeq', Number(lastSeq) || 0)
}
