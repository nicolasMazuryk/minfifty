export const logger = {
  // eslint-disable-next-line no-console
  info: (...args: any) => console.log(`[${new Date().toLocaleString('pl-PL')}]`, ...args),
  // eslint-disable-next-line no-console
  error: (...args: any) => console.error(`[${new Date().toLocaleString('pl-PL')}]`, ...args),
  // eslint-disable-next-line no-console
  time: (...args: any) => console.time(...args),
  // eslint-disable-next-line no-console
  timeEnd: (...args: any) => console.timeEnd(...args),
}

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const roundToPrecision = (precision: number) => (value: number) =>
  Number(value.toFixed(precision))

export const max = (arr: any[]) => Math.max(...arr, 0)

export const min = (arr: any[]) => Math.min(...arr)

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

export const getHourlyTime = (time: Date) => {
  const date = new Date(time)
  date.setMinutes(0)
  date.setSeconds(0)
  date.setMilliseconds(0)
  return date
}

export const chunkArray = (array: any, chunkSize: number): [][] => {
  const results: [][] = []

  while (array.length) {
    results.push(array.splice(0, chunkSize))
  }

  return results
}

export const waitUntilArrayIsEmpty = (array: any) =>
  new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      if (array.length === 0) {
        clearInterval(interval)
        resolve()
      }
    }, 10)
  })

export const decodeBinanceUrl = (url: string, targetParam: string) => {
  const urlParts = url.split('?')
  const queryString = urlParts[1]

  const params = new URLSearchParams(queryString)

  const param = params.get(targetParam) as string
  const decodedParams = decodeURIComponent(param)

  return JSON.parse(decodedParams)
}

export const parseBinanceErrorString = (str: string) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const json = str.split('{').pop().split('}').shift() as string

  const codeMatch = json.match(/code:\s*(-?\d+)/)
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const code = Number(codeMatch[1])

  const urlMatch = json.match(/url:\s*'([^']+)'/)
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const url = urlMatch[1]

  return { code, url }
}
