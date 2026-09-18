export function calculateTotals(transactions) {
  const totals = {
    cash: { USD: 0, EUR: 0, BYN: 0 },
    card: { USD: 0, EUR: 0, BYN: 0 },
  }

  transactions.forEach((transaction) => {
    const sign = transaction.direction === 'in' ? 1 : -1
    totals[transaction.source][transaction.currency] += sign * transaction.amount
  })

  return totals
}

export function calculateCashDenominations(transactions) {
  const denominations = { USD: {}, EUR: {} }

  transactions.forEach((transaction) => {
    if (transaction.source !== 'cash' || !denominations[transaction.currency]) return

    // Older saved operations only contain a note like "3 × $20.00".
    const legacyQuantity = Number(transaction.note?.match(/^(\d+)\s*×/)?.[1])
    const quantity = Number(transaction.quantity) || legacyQuantity
    const denomination = Number(transaction.denomination) || (quantity ? transaction.amount / quantity : 0)
    if (!(quantity > 0) || !(denomination > 0)) return

    const sign = transaction.direction === 'in' ? 1 : -1
    denominations[transaction.currency][denomination] = (denominations[transaction.currency][denomination] || 0) + sign * quantity
  })

  return denominations
}
