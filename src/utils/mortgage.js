const ROUND = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

export const DEFAULT_MORTGAGE = {
  principalBYN: 300000,
  balanceBYN: 300000,
  issuedAt: '2026-09-15',
  maturityDate: '2046-09-15',
  firstPaymentDate: '2026-10-31',
  principalStartDate: '2027-10-31',
  standardRateStartDate: '2028-09-15',
  preferentialRate: 1,
  standardRate: 15.4,
  earlyRepaymentStrategy: 'reduceTerm',
  contractPayments: {
    first: 133.33,
    interestOnly: 250,
    preferentialAnnuity: 1451.07,
    transition: 2766.06,
    standardAnnuity: 3916.68,
  },
  payments: [],
}

function utcDate(value) {
  return new Date(`${String(value).slice(0, 10)}T12:00:00Z`)
}

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

function endOfMonth(year, month) {
  return new Date(Date.UTC(year, month + 1, 0, 12))
}

function addPaymentMonth(date, offset) {
  return endOfMonth(date.getUTCFullYear(), date.getUTCMonth() + offset)
}

export function normalizeMortgage(saved = {}) {
  const legacyPrincipal = Number(saved.originalUSD) || 0
  const legacyBalance = Number(saved.balanceUSD) || 0
  const isLegacy = !saved.principalBYN
  return {
    ...structuredClone(DEFAULT_MORTGAGE),
    ...saved,
    principalBYN: isLegacy ? DEFAULT_MORTGAGE.principalBYN : Number(saved.principalBYN),
    balanceBYN: isLegacy ? DEFAULT_MORTGAGE.balanceBYN : Number(saved.balanceBYN),
    contractPayments: { ...DEFAULT_MORTGAGE.contractPayments, ...saved.contractPayments },
    payments: isLegacy && (legacyPrincipal || legacyBalance) ? [] : (saved.payments || []),
  }
}

export function annuityPayment(balance, annualRate, months) {
  if (!(balance > 0) || !(months > 0)) return 0
  const rate = annualRate / 1200
  if (!rate) return ROUND(balance / months)
  const factor = (1 + rate) ** months
  return ROUND(balance * rate * factor / (factor - 1))
}

export function mortgagePaymentDates(mortgage) {
  const first = utcDate(mortgage.firstPaymentDate)
  const maturity = utcDate(mortgage.maturityDate)
  const dates = []
  for (let offset = 0; offset < 300; offset += 1) {
    const date = addPaymentMonth(first, offset)
    if (date.getUTCFullYear() > maturity.getUTCFullYear() || (date.getUTCFullYear() === maturity.getUTCFullYear() && date.getUTCMonth() > maturity.getUTCMonth())) break
    dates.push(isoDate(date))
  }
  return dates
}

function contractAmount(mortgage, index) {
  const amounts = mortgage.contractPayments
  if (index === 0) return amounts.first
  if (index < 12) return amounts.interestOnly
  if (index < 24) return amounts.preferentialAnnuity
  if (index === 24) return amounts.transition
  return amounts.standardAnnuity
}

function rateForIndex(mortgage, index) {
  return index < 24 ? mortgage.preferentialRate : mortgage.standardRate
}

function baselineBalanceAt(mortgage, targetIndex) {
  let balance = mortgage.principalBYN
  for (let index = 0; index < targetIndex && balance > 0; index += 1) {
    const row = scheduleRow(mortgage, index, balance, 'reduceTerm', true)
    balance = ROUND(Math.max(0, balance - row.principalBYN))
  }
  return balance
}

function scheduleRow(mortgage, index, balance, strategy, baseline = false) {
  const dates = mortgagePaymentDates(mortgage)
  const remainingMonths = dates.length - index
  const annualRate = rateForIndex(mortgage, index)
  let amountBYN = contractAmount(mortgage, index)

  if (!baseline && strategy === 'reducePayment' && index >= 12) {
    if (index === 24) {
      const referenceBalance = baselineBalanceAt(mortgage, index)
      amountBYN = ROUND(mortgage.contractPayments.transition * balance / referenceBalance)
    } else {
      amountBYN = annuityPayment(balance, annualRate, remainingMonths)
    }
  }

  let interestBYN
  if (index === 0) interestBYN = Math.min(balance, mortgage.contractPayments.first)
  else if (index < 12) interestBYN = ROUND(balance * mortgage.preferentialRate / 1200)
  else if (index === 24) interestBYN = amountBYN
  else interestBYN = ROUND(balance * annualRate / 1200)

  interestBYN = ROUND(Math.min(amountBYN, interestBYN))
  const principalBYN = ROUND(Math.min(balance, Math.max(0, amountBYN - interestBYN)))
  return {
    index,
    dueDate: dates[index],
    annualRate,
    amountBYN: ROUND(interestBYN + principalBYN),
    interestBYN,
    principalBYN,
    balanceAfterBYN: ROUND(balance - principalBYN),
  }
}

export function buildOriginalMortgageSchedule(source) {
  const mortgage = normalizeMortgage(source)
  const dates = mortgagePaymentDates(mortgage)
  const rows = []
  let balance = mortgage.principalBYN
  for (let index = 0; index < dates.length && balance > 0; index += 1) {
    const row = scheduleRow(mortgage, index, balance, 'reduceTerm', true)
    rows.push(row)
    balance = row.balanceAfterBYN
  }
  return rows
}

export function buildMortgageForecast(source) {
  const mortgage = normalizeMortgage(source)
  const dates = mortgagePaymentDates(mortgage)
  const rows = []
  let balance = mortgage.balanceBYN
  for (let index = mortgage.payments.length; index < dates.length && balance > 0; index += 1) {
    const row = scheduleRow(mortgage, index, balance, mortgage.earlyRepaymentStrategy)
    rows.push(row)
    balance = row.balanceAfterBYN
  }
  return rows
}

export function nextMortgagePayment(source) {
  return buildMortgageForecast(source)[0] || null
}

export function recordMortgagePayment(source, input) {
  const mortgage = normalizeMortgage(source)
  const planned = nextMortgagePayment(mortgage)
  if (!planned) return mortgage
  const amountBYN = ROUND(input.amountBYN)
  const interestBYN = ROUND(Math.min(amountBYN, planned.interestBYN))
  const availableForPrincipal = Math.max(0, amountBYN - interestBYN)
  const principalBYN = ROUND(Math.min(mortgage.balanceBYN, availableForPrincipal, planned.principalBYN))
  const extraPrincipalBYN = ROUND(Math.min(mortgage.balanceBYN - principalBYN, Math.max(0, availableForPrincipal - principalBYN)))
  const balanceAfterBYN = ROUND(Math.max(0, mortgage.balanceBYN - principalBYN - extraPrincipalBYN))
  const exchangeRateUSD = Number(input.exchangeRateUSD)
  const payment = {
    id: crypto.randomUUID(),
    date: input.date,
    scheduledFor: planned.dueDate,
    amountBYN,
    plannedAmountBYN: planned.amountBYN,
    interestBYN,
    principalBYN,
    extraPrincipalBYN,
    exchangeRateUSD,
    exchangeRateDate: input.exchangeRateDate,
    amountUSD: ROUND(amountBYN / exchangeRateUSD),
    interestUSD: ROUND(interestBYN / exchangeRateUSD),
    principalUSD: ROUND(principalBYN / exchangeRateUSD),
    extraPrincipalUSD: ROUND(extraPrincipalBYN / exchangeRateUSD),
    balanceAfterBYN,
    earlyRepaymentStrategy: input.earlyRepaymentStrategy,
  }
  return {
    ...mortgage,
    balanceBYN: balanceAfterBYN,
    earlyRepaymentStrategy: input.earlyRepaymentStrategy,
    payments: [payment, ...mortgage.payments],
  }
}

export function mortgageMetrics(source, currentUSD_BYN = 1) {
  const mortgage = normalizeMortgage(source)
  const payments = mortgage.payments
  const forecast = buildMortgageForecast(mortgage)
  const original = buildOriginalMortgageSchedule(mortgage)
  const paidTotalBYN = ROUND(payments.reduce((sum, item) => sum + Number(item.amountBYN || 0), 0))
  const paidPrincipalBYN = ROUND(payments.reduce((sum, item) => sum + Number(item.principalBYN || 0) + Number(item.extraPrincipalBYN || 0), 0))
  const paidInterestBYN = ROUND(payments.reduce((sum, item) => sum + Number(item.interestBYN || 0), 0))
  const extraPrincipalBYN = ROUND(payments.reduce((sum, item) => sum + Number(item.extraPrincipalBYN || 0), 0))
  const storedUSD = (item, fieldUSD, fieldBYN) => Number(item[fieldUSD]) || ROUND(Number(item[fieldBYN] || 0) / Number(item.exchangeRateUSD || currentUSD_BYN))
  const paidTotalUSD = ROUND(payments.reduce((sum, item) => sum + storedUSD(item, 'amountUSD', 'amountBYN'), 0))
  const paidPrincipalUSD = ROUND(payments.reduce((sum, item) => sum + storedUSD(item, 'principalUSD', 'principalBYN') + storedUSD(item, 'extraPrincipalUSD', 'extraPrincipalBYN'), 0))
  const paidInterestUSD = ROUND(payments.reduce((sum, item) => sum + storedUSD(item, 'interestUSD', 'interestBYN'), 0))
  const extraPrincipalUSD = ROUND(payments.reduce((sum, item) => sum + storedUSD(item, 'extraPrincipalUSD', 'extraPrincipalBYN'), 0))
  const originalInterest = original.reduce((sum, item) => sum + item.interestBYN, 0)
  const projectedInterest = paidInterestBYN + forecast.reduce((sum, item) => sum + item.interestBYN, 0)
  return {
    paidTotalBYN,
    paidTotalUSD,
    paidPrincipalBYN,
    paidPrincipalUSD,
    paidInterestBYN,
    paidInterestUSD,
    extraPrincipalBYN,
    extraPrincipalUSD,
    balanceBYN: mortgage.balanceBYN,
    balanceUSD: ROUND(mortgage.balanceBYN / currentUSD_BYN),
    projectedOverpaymentBYN: ROUND(projectedInterest),
    projectedOverpaymentUSD: ROUND(projectedInterest / currentUSD_BYN),
    interestSavingsBYN: ROUND(Math.max(0, originalInterest - projectedInterest)),
    interestSavingsUSD: ROUND(Math.max(0, originalInterest - projectedInterest) / currentUSD_BYN),
    payoffDate: forecast.at(-1)?.dueDate || payments[0]?.date || null,
  }
}
