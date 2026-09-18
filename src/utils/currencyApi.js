const RATES_URL = 'https://api.nbrb.by/exrates/rates?periodicity=0'

export async function fetchNBRBRates(signal) {
  const response = await fetch(RATES_URL, { signal })
  if (!response.ok) throw new Error(`НБРБ вернул ошибку ${response.status}`)

  const currencies = await response.json()
  const findRate = (code) => {
    const currency = currencies.find((item) => item.Cur_Abbreviation === code)
    if (!currency) throw new Error(`Курс ${code} не найден`)
    return currency.Cur_OfficialRate / currency.Cur_Scale
  }

  return {
    rates: { USD: findRate('USD'), EUR: findRate('EUR') },
    updatedAt: currencies[0]?.Date || new Date().toISOString(),
  }
}

export async function fetchUSD_BYNRateOnDate(date, signal) {
  const day = String(date).slice(0, 10)
  const response = await fetch(`https://api.nbrb.by/exrates/rates/USD?parammode=2&ondate=${day}`, { signal })
  if (!response.ok) throw new Error(`НБРБ не вернул курс USD за ${day}`)
  const currency = await response.json()
  if (!currency?.Cur_OfficialRate || !currency?.Cur_Scale) throw new Error('Курс USD на выбранную дату не найден')
  return {
    rate: currency.Cur_OfficialRate / currency.Cur_Scale,
    date: String(currency.Date || day).slice(0, 10),
  }
}
