export const logger = {
  // eslint-disable-next-line no-console
  info: (...args: any) => console.log(...args),
  // eslint-disable-next-line no-console
  error: (...args: any) => console.error(...args),
  // eslint-disable-next-line no-console
  time: (...args: any) => console.time(...args),
  // eslint-disable-next-line no-console
  timeEnd: (...args: any) => console.timeEnd(...args),
}

export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const roundToPrecision = (precision: number) => (value: number) =>
  Number(value.toFixed(precision))

export const max = (arr: any[]) => Math.max(...arr, 0)

export const median = (arr: any[]) => {
  const mid = Math.floor(arr.length / 2),
    nums = [...arr].sort((a, b) => a - b)
  // eslint-disable-next-line no-negated-condition
  return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2 || 0
}

export const average = (arr: any[]) => arr.reduce((a, b) => a + b, 0) / arr.length || 0

export const roundEpochToFullMinute = (epoch: number) => {
  const date = new Date(epoch)
  date.setSeconds(0)
  date.setMilliseconds(0)
  return date.getTime()
}

export const countMinutes = (start: Date, end: Date) => {
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  return Math.ceil((endTime - startTime) / (1000 * 60))
}
