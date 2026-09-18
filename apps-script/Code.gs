const CHANGE_LOG = 'ChangeLog'
const MAX_MUTATIONS = 100
const SCHEMAS = {
  transaction: { sheet: 'Transactions', fields: ['id','date','direction','source','currency','amount','denomination','quantity','cardId','cardName','note','updatedAt','deletedAt'] },
  card: { sheet: 'Cards', fields: ['id','bank','name','currency','updatedAt','deletedAt'] },
  debt: { sheet: 'Debts', fields: ['id','direction','person','currency','originalAmount','remainingAmount','note','createdAt','updatedAt','deletedAt'] },
  repayment: { sheet: 'Repayments', fields: ['id','debtId','amount','date','updatedAt','deletedAt'] },
  mortgagePayment: { sheet: 'MortgagePayments', fields: ['id','date','scheduledFor','amountBYN','plannedAmountBYN','interestBYN','principalBYN','extraPrincipalBYN','exchangeRateUSD','exchangeRateDate','amountUSD','interestUSD','principalUSD','extraPrincipalUSD','balanceAfterBYN','earlyRepaymentStrategy','updatedAt','deletedAt'] },
  mortgage: { sheet: 'Mortgage', fields: ['id','principalBYN','balanceBYN','issuedAt','maturityDate','firstPaymentDate','principalStartDate','standardRateStartDate','preferentialRate','standardRate','earlyRepaymentStrategy','firstPaymentBYN','interestOnlyPaymentBYN','preferentialAnnuityBYN','transitionPaymentBYN','standardAnnuityBYN','updatedAt','deletedAt'] },
}
const LOG_FIELDS = ['seq','mutationId','entity','entityId','action','createdAt','deviceId']

function doGet() {
  const spreadsheet = spreadsheet_()
  ensureSheets_(spreadsheet)
  return json_({ ok: true, service: 'finhome-sync-v2', timestamp: new Date().toISOString() })
}

function doPost(event) {
  try {
    const request = JSON.parse(event && event.postData ? event.postData.contents : '{}')
    if (request.action !== 'sync') throw new Error('Неизвестное действие')
    authenticate_(request.idToken)
    return json_(sync_(request))
  } catch (error) {
    return json_({ ok: false, error: error.message || String(error) })
  }
}

function resetStorage() {
  const spreadsheet = spreadsheet_()
  const temporary = spreadsheet.insertSheet('_ResetTemp')
  ;[CHANGE_LOG, 'SyncLog'].concat(Object.values(SCHEMAS).map((schema) => schema.sheet)).forEach((name) => {
    const sheet = spreadsheet.getSheetByName(name)
    if (sheet) spreadsheet.deleteSheet(sheet)
  })
  ensureSheets_()
  spreadsheet.deleteSheet(temporary)
}

function sync_(request) {
  const deviceId = required_(request.deviceId, 'deviceId')
  const lastSeq = Math.max(0, Number(request.lastSeq) || 0)
  const mutations = Array.isArray(request.mutations) ? request.mutations : []
  if (mutations.length > MAX_MUTATIONS) throw new Error(`Не более ${MAX_MUTATIONS} изменений за запрос`)
  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    const spreadsheet = spreadsheet_()
    ensureSheets_(spreadsheet)
    const log = spreadsheet.getSheetByName(CHANGE_LOG)
    const known = mutations.length ? existingMutationIds_(log) : new Set()
    const accepted = []
    let seq = lastSequence_(log)
    const logRows = []
    mutations.forEach((mutation) => {
      validateMutation_(mutation)
      if (!known.has(mutation.mutationId)) {
        upsertEntity_(spreadsheet, mutation)
        seq += 1
        logRows.push([seq, mutation.mutationId, mutation.entity, mutation.entityId, mutation.action, mutation.createdAt, deviceId])
        known.add(mutation.mutationId)
      }
      accepted.push(mutation.mutationId)
    })
    if (logRows.length) log.getRange(log.getLastRow() + 1, 1, logRows.length, LOG_FIELDS.length).setValues(logRows)
    return { ok: true, lastSeq: seq, acceptedMutationIds: accepted, changes: changesAfter_(log, lastSeq) }
  } finally {
    lock.releaseLock()
  }
}

function upsertEntity_(spreadsheet, mutation) {
  const schema = SCHEMAS[mutation.entity]
  const sheet = spreadsheet.getSheetByName(schema.sheet)
  const values = sheet.getDataRange().getValues()
  const index = values.slice(1).findIndex((row) => String(row[0]) === mutation.entityId)
  const current = index >= 0 ? rowToObject_(schema.fields, values[index + 1]) : {}
  const now = mutation.createdAt
  // Старое офлайн-устройство не должно восстановить запись, удалённую позднее.
  if (current.updatedAt && new Date(current.updatedAt).getTime() > new Date(now).getTime()) return
  const record = mutation.action === 'delete'
    ? { ...current, id: mutation.entityId, updatedAt: now, deletedAt: now }
    : { ...mutation.data, id: mutation.entityId, updatedAt: now, deletedAt: '' }
  const row = schema.fields.map((field) => record[field] ?? '')
  if (index >= 0) sheet.getRange(index + 2, 1, 1, row.length).setValues([row])
  else sheet.appendRow(row)
}

function changesAfter_(log, lastSeq) {
  const lastRow = log.getLastRow()
  const firstRow = Math.max(2, lastSeq + 2)
  if (firstRow > lastRow) return []
  return log.getRange(firstRow, 1, lastRow - firstRow + 1, LOG_FIELDS.length).getValues()
    .map((row) => {
      const entity = String(row[2])
      const entityId = String(row[3])
      return { seq: Number(row[0]), mutationId: String(row[1]), entity, entityId, action: String(row[4]), createdAt: iso_(row[5]), deviceId: String(row[6]), data: readEntity_(entity, entityId) }
    })
}

function readEntity_(entity, entityId) {
  const schema = SCHEMAS[entity]
  const sheet = spreadsheet_().getSheetByName(schema.sheet)
  if (sheet.getLastRow() < 2) return null
  const row = sheet.getRange(2, 1, sheet.getLastRow() - 1, schema.fields.length).getValues().find((item) => String(item[0]) === entityId)
  return row ? rowToObject_(schema.fields, row) : null
}

function rowToObject_(fields, row) {
  return fields.reduce((result, field, index) => { result[field] = row[index] instanceof Date ? row[index].toISOString() : row[index]; return result }, {})
}

function ensureSheets_(spreadsheet) {
  spreadsheet = spreadsheet || spreadsheet_()
  ensureSheet_(spreadsheet, CHANGE_LOG, LOG_FIELDS)
  Object.values(SCHEMAS).forEach((schema) => ensureSheet_(spreadsheet, schema.sheet, schema.fields))
}

function ensureSheet_(spreadsheet, name, fields) {
  let sheet = spreadsheet.getSheetByName(name)
  if (!sheet) sheet = spreadsheet.insertSheet(name)
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, fields.length).setValues([fields]).setFontWeight('bold')
    sheet.setFrozenRows(1)
    return
  }
  const currentFields = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].filter(Boolean)
  if (currentFields.join('|') === fields.join('|')) return
  const oldRows = sheet.getLastRow() < 2 ? [] : sheet.getRange(2, 1, sheet.getLastRow() - 1, currentFields.length).getValues()
  const migratedRows = oldRows.map((row) => fields.map((field) => row[currentFields.indexOf(field)] ?? ''))
  sheet.clearContents()
  sheet.getRange(1, 1, 1, fields.length).setValues([fields]).setFontWeight('bold')
  if (migratedRows.length) sheet.getRange(2, 1, migratedRows.length, fields.length).setValues(migratedRows)
  sheet.setFrozenRows(1)
}

function spreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  if (!id) throw new Error('Не задано свойство SPREADSHEET_ID')
  return SpreadsheetApp.openById(id)
}

function existingMutationIds_(log) {
  return log.getLastRow() < 2 ? new Set() : new Set(log.getRange(2, 2, log.getLastRow() - 1, 1).getDisplayValues().flat().filter(Boolean))
}

function lastSequence_(log) {
  if (log.getLastRow() < 2) return 0
  return Math.max.apply(null, log.getRange(2, 1, log.getLastRow() - 1, 1).getValues().flat().map(Number))
}

function validateMutation_(mutation) {
  if (!mutation || !SCHEMAS[mutation.entity]) throw new Error('Неизвестный тип данных')
  required_(mutation.mutationId, 'mutationId'); required_(mutation.entityId, 'entityId'); required_(mutation.createdAt, 'createdAt')
  if (!['upsert','delete'].includes(mutation.action)) throw new Error('Некорректное действие')
  if (mutation.action === 'upsert' && (!mutation.data || typeof mutation.data !== 'object')) throw new Error('Отсутствуют данные')
}

function authenticate_(idToken) {
  const properties = PropertiesService.getScriptProperties()
  const clientId = properties.getProperty('GOOGLE_CLIENT_ID')
  const allowedEmail = properties.getProperty('ALLOWED_EMAIL')
  if (!clientId || !allowedEmail || !idToken) throw new Error('Требуется вход через Google')
  const cache = CacheService.getScriptCache()
  const tokenKey = `token:${Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, idToken))}`
  if (cache.get(tokenKey) === allowedEmail.toLowerCase()) return
  const response = UrlFetchApp.fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, { muteHttpExceptions: true })
  if (response.getResponseCode() !== 200) throw new Error('Недействительный Google-токен')
  const identity = JSON.parse(response.getContentText())
  if (identity.aud !== clientId || (identity.email_verified !== 'true' && identity.email_verified !== true) || String(identity.email).toLowerCase() !== allowedEmail.toLowerCase()) throw new Error('У пользователя нет доступа')
  cache.put(tokenKey, allowedEmail.toLowerCase(), Math.min(300, Math.max(1, Number(identity.expires_in) || 300)))
}

function required_(value, field) {
  if (typeof value !== 'string' || !value.trim() || value.length > 200) throw new Error(`Некорректное поле ${field}`)
  return value.trim()
}
function iso_(value) { return value instanceof Date ? value.toISOString() : String(value) }
function json_(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON) }
