const LOG_SHEET = 'SyncLog'
const HEADERS = ['seq', 'mutationId', 'entity', 'entityId', 'action', 'payload', 'createdAt', 'deviceId']
const MAX_MUTATIONS_PER_REQUEST = 100

function doGet() {
  ensureLogSheet_()
  return jsonResponse_({ ok: true, service: 'finhome-sync', timestamp: new Date().toISOString() })
}

function doPost(event) {
  try {
    const request = JSON.parse(event && event.postData ? event.postData.contents : '{}')
    if (request.action !== 'sync') throw new Error('Неизвестное действие')
    authenticate_(request.idToken)
    return jsonResponse_(sync_(request))
  } catch (error) {
    return jsonResponse_({ ok: false, error: error.message || String(error) })
  }
}

function authenticate_(idToken) {
  const properties = PropertiesService.getScriptProperties()
  const clientId = properties.getProperty('GOOGLE_CLIENT_ID')
  const allowedEmail = properties.getProperty('ALLOWED_EMAIL')
  if (!clientId || !allowedEmail) throw new Error('Не настроены GOOGLE_CLIENT_ID и ALLOWED_EMAIL')
  if (typeof idToken !== 'string' || !idToken) throw new Error('Требуется вход через Google')

  const response = UrlFetchApp.fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
    muteHttpExceptions: true,
  })
  if (response.getResponseCode() !== 200) throw new Error('Недействительный или просроченный Google-токен')

  const identity = JSON.parse(response.getContentText())
  if (identity.aud !== clientId) throw new Error('Токен выпущен для другого приложения')
  if (identity.email_verified !== 'true' && identity.email_verified !== true) throw new Error('Email Google не подтверждён')
  if (String(identity.email).toLowerCase() !== allowedEmail.toLowerCase()) throw new Error('У пользователя нет доступа')
  return identity
}

function sync_(request) {
  const deviceId = requiredString_(request.deviceId, 'deviceId')
  const lastSeq = Math.max(0, Number(request.lastSeq) || 0)
  const mutations = Array.isArray(request.mutations) ? request.mutations : []
  if (mutations.length > MAX_MUTATIONS_PER_REQUEST) throw new Error(`За один запрос разрешено не более ${MAX_MUTATIONS_PER_REQUEST} изменений`)

  const lock = LockService.getScriptLock()
  lock.waitLock(10000)

  try {
    const sheet = ensureLogSheet_()
    const existingIds = getExistingMutationIds_(sheet)
    const acceptedMutationIds = []
    const rows = []
    let nextSeq = Math.max(0, sheet.getLastRow() - 1) + 1

    mutations.forEach((mutation) => {
      validateMutation_(mutation)
      if (existingIds.has(mutation.mutationId)) {
        acceptedMutationIds.push(mutation.mutationId)
        return
      }

      rows.push([
        nextSeq++,
        mutation.mutationId,
        mutation.entity,
        mutation.entityId,
        mutation.action,
        JSON.stringify(mutation.payload ?? null),
        mutation.createdAt,
        deviceId,
      ])
      existingIds.add(mutation.mutationId)
      acceptedMutationIds.push(mutation.mutationId)
    })

    if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows)

    const latestSeq = Math.max(0, sheet.getLastRow() - 1)
    return {
      ok: true,
      lastSeq: latestSeq,
      acceptedMutationIds,
      changes: getChangesAfter_(sheet, lastSeq),
    }
  } finally {
    lock.releaseLock()
  }
}

function ensureLogSheet_() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')
  if (!spreadsheetId) throw new Error('Не задано свойство SPREADSHEET_ID')
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId)
  let sheet = spreadsheet.getSheetByName(LOG_SHEET)
  if (!sheet) sheet = spreadsheet.insertSheet(LOG_SHEET)

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    sheet.setFrozenRows(1)
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold')
  }
  return sheet
}

function getExistingMutationIds_(sheet) {
  if (sheet.getLastRow() < 2) return new Set()
  return new Set(sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getDisplayValues().flat().filter(Boolean))
}

function getChangesAfter_(sheet, lastSeq) {
  if (sheet.getLastRow() < 2) return []
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues()
    .filter((row) => Number(row[0]) > lastSeq)
    .map((row) => ({
      seq: Number(row[0]),
      mutationId: String(row[1]),
      entity: String(row[2]),
      entityId: String(row[3]),
      action: String(row[4]),
      payload: JSON.parse(row[5]),
      createdAt: row[6] instanceof Date ? row[6].toISOString() : String(row[6]),
      deviceId: String(row[7]),
    }))
}

function validateMutation_(mutation) {
  if (!mutation || typeof mutation !== 'object') throw new Error('Некорректное изменение')
  requiredString_(mutation.mutationId, 'mutationId')
  requiredString_(mutation.entity, 'entity')
  requiredString_(mutation.entityId, 'entityId')
  if (!['upsert', 'delete'].includes(mutation.action)) throw new Error('action должен быть upsert или delete')
  requiredString_(mutation.createdAt, 'createdAt')
  if (JSON.stringify(mutation.payload ?? null).length > 50000) throw new Error('Слишком большой payload')
}

function requiredString_(value, field) {
  if (typeof value !== 'string' || !value.trim() || value.length > 200) throw new Error(`Некорректное поле ${field}`)
  return value.trim()
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON)
}
