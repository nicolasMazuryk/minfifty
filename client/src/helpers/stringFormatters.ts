export const createRangeString = (target: { max: number; min: number }) => {
  const separator = target.max ? ' - ' : '+'
  return `${target.min}${separator}${target.max || ''}`
}

export const prepateDate = (dateString: string | number | Date) => {
  const date = new Date(dateString)
  const year = date.getFullYear()

  let month: number | string = date.getMonth() + 1
  let dt: number | string = date.getDate()

  if (dt < 10) {
    dt = '0' + dt
  }
  if (month < 10) {
    month = '0' + month
  }

  return `${dt}/${month}/${year}`
}

export const CURRENCY_OPTIONS = {
  minimumFractionDigits: 2,
  style: 'currency',
}
const locale = 'en-US'

export const currencyString = (
  num: number,
  currency = 'USD',
  options = CURRENCY_OPTIONS,
) =>
  `${num.toLocaleString(locale, {
    ...options,
    currency,
  })}`
