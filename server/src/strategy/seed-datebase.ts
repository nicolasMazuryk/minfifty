import fs from 'fs'
import path from 'path'

import axios from 'axios'
import unzip from 'extract-zip'

const writeFileAsync = fs.promises.writeFile

const destFolder = path.join(__dirname, './market-data')

const START_DATE = '2020-01'
const END_DATE = '2022-08'

const TICKER = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
}

const MARKET = {
  SPOT: 'spot',
  FUTURES: 'futures',
}

// error logging function
function logger(message: any) {
  // eslint-disable-next-line no-console
  console.error(message)
}

const getBinanceDataProviderUrl = (market: string, ticker: string, year: number, month: string) =>
  `https://data.binance.vision/data/${market}/um/monthly/klines/${ticker}/1m/${ticker}-1m-${year}-${month}.zip`

// axios asynchronously download binary file and write to filesystem by path
async function download(url: string, dest: string) {
  logger(`Downloading ${url} to ${dest}`)
  const response = await axios.get(url, { responseType: 'arraybuffer' })
  return writeFileAsync(dest, response.data)
}

// function unzip downloaded binary file and remove it from filesystem
async function unzipBinanceDataBinaryFile(fileName: string) {
  logger(`Unzipping ${fileName}`)
  await unzip(path.join(destFolder, fileName), { dir: destFolder })
  await fs.promises.unlink(path.join(destFolder, fileName))
}

// add leading zero to month if it is less than 10
const addLeadingZero = (month: number): string => (month < 10 ? `0${month}` : `${month}`)

// function takes as parameter market, ticker, START_DATE, END_DATE and download binance data and save it to 'futures-data' folder
async function downloadBinanceData(
  market: string,
  ticker: string,
  startDate: string,
  endDate: string,
) {
  const startYear = parseInt(startDate.split('-')[0])
  const startMonth = parseInt(startDate.split('-')[1])
  const endYear = parseInt(endDate.split('-')[0])
  const endMonth = parseInt(endDate.split('-')[1])

  if (!fs.existsSync(destFolder)) {
    fs.mkdirSync(destFolder)
  }

  for (let year = startYear; year <= endYear; year++) {
    const monthStart = year === startYear ? startMonth : 1
    const monthEnd = year === endYear ? endMonth : 12

    for (let month = monthStart; month <= monthEnd; month++) {
      const url = getBinanceDataProviderUrl(market, ticker, year, addLeadingZero(month))
      const fileName = `${market}-${ticker}-${year}-${addLeadingZero(month)}.zip`
      const dest = path.join(destFolder, fileName)
      await download(url, dest)
      await unzipBinanceDataBinaryFile(fileName)
    }
  }
}

;(async () => {
  await downloadBinanceData(MARKET.FUTURES, TICKER.ETH, START_DATE, END_DATE)
})().catch(logger)
