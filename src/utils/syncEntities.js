const without = (object, keys) => Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key)))

export function stateEntities(data) {
  const mortgage = data.mortgage
  return {
    transaction: data.transactions.map((item) => ({ ...item })),
    card: data.cards.map((item) => ({ ...item })),
    debt: data.debts.map((item) => without(item, ['repayments'])),
    repayment: data.debts.flatMap((debt) => debt.repayments.map((item) => ({ ...item, debtId: debt.id }))),
    mortgagePayment: mortgage.payments.map((item) => ({ ...item })),
    mortgage: [{
      ...without(mortgage, ['payments', 'contractPayments']),
      firstPaymentBYN: mortgage.contractPayments.first,
      interestOnlyPaymentBYN: mortgage.contractPayments.interestOnly,
      preferentialAnnuityBYN: mortgage.contractPayments.preferentialAnnuity,
      transitionPaymentBYN: mortgage.contractPayments.transition,
      standardAnnuityBYN: mortgage.contractPayments.standardAnnuity,
      id: 'main',
    }],
  }
}

export function createMutations(previous, next, full = false) {
  const before = full ? {} : stateEntities(previous)
  const after = stateEntities(next)
  const createdAt = new Date().toISOString()
  const mutations = []

  Object.entries(after).forEach(([entity, records]) => {
    const oldRecords = new Map((before[entity] || []).map((item) => [item.id, item]))
    const newRecords = new Map(records.map((item) => [item.id, item]))
    records.forEach((record) => {
      if (JSON.stringify(oldRecords.get(record.id)) !== JSON.stringify(record)) mutations.push(makeMutation(entity, record.id, 'upsert', record, createdAt))
    })
    oldRecords.forEach((_, id) => {
      if (!newRecords.has(id)) mutations.push(makeMutation(entity, id, 'delete', null, createdAt))
    })
  })
  return mutations
}

function makeMutation(entity, entityId, action, data, createdAt) {
  return { mutationId: crypto.randomUUID(), entity, entityId, action, data, createdAt }
}

export function applyChanges(data, changes) {
  const next = structuredClone(data)
  changes.forEach((change) => {
    const record = change.data
    if (change.entity === 'transaction') next.transactions = updateList(next.transactions, change, record)
    if (change.entity === 'card') next.cards = updateList(next.cards, change, record)
    if (change.entity === 'debt') {
      const repayments = next.debts.find((item) => item.id === change.entityId)?.repayments || []
      next.debts = updateList(next.debts, change, record && { ...record, repayments })
    }
    if (change.entity === 'repayment') {
      next.debts = next.debts.map((debt) => debt.id === record?.debtId
        ? { ...debt, repayments: updateList(debt.repayments, change, record && without(record, ['debtId'])) }
        : debt)
    }
    if (change.entity === 'mortgagePayment' && (change.action === 'delete' || (Number(record?.amountBYN) > 0 && Number(record?.exchangeRateUSD) > 0))) next.mortgage.payments = updateList(next.mortgage.payments, change, record)
    if (change.entity === 'mortgage' && change.action !== 'delete' && Number(record?.principalBYN) > 0) next.mortgage = {
      ...next.mortgage,
      principalBYN: Number(record.principalBYN),
      balanceBYN: Number(record.balanceBYN),
      issuedAt: record.issuedAt,
      maturityDate: record.maturityDate,
      firstPaymentDate: record.firstPaymentDate,
      principalStartDate: record.principalStartDate,
      standardRateStartDate: record.standardRateStartDate,
      preferentialRate: Number(record.preferentialRate),
      standardRate: Number(record.standardRate),
      earlyRepaymentStrategy: record.earlyRepaymentStrategy,
      contractPayments: {
        first: Number(record.firstPaymentBYN),
        interestOnly: Number(record.interestOnlyPaymentBYN),
        preferentialAnnuity: Number(record.preferentialAnnuityBYN),
        transition: Number(record.transitionPaymentBYN),
        standardAnnuity: Number(record.standardAnnuityBYN),
      },
    }
  })
  return next
}

function updateList(list, change, record) {
  const remaining = list.filter((item) => item.id !== change.entityId)
  if (change.action === 'delete' || !record || record.deletedAt) return remaining
  return [{ ...record, id: change.entityId }, ...remaining]
}
