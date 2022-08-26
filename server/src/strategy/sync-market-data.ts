// Binance Source: https://data.binance.vision/?prefix=data/futures/um/monthly/klines/ETHUSDT/1m/
// eslint-disable-next-line import/order
import '../alias-runtime'

import fs from 'fs'
import path from 'path'

import axios from 'axios'
import { parse } from 'csv-parse'
import unzip from 'extract-zip'

import { MarketData } from '@/models'

const writeFileAsync = fs.promises.writeFile

const destFolder = path.join(__dirname, './market-data')

// const START_DATE = '2020-01'
// const END_DATE = '2022-08'

const START_DATE = '2020-01'
const END_DATE = '2022-08'

const IGNORE_DOWNLOAD_MARKET_DATA = true

const TICKER = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
}

const MARKET = {
  SPOT: 'SPOT',
  FUTURES: 'FUTURES',
}

// error logging function
const logger = {
  // eslint-disable-next-line no-console
  info: (message: string) => console.log(message),
  // eslint-disable-next-line no-console
  error: (message: any) => console.error(message),
}

const getBinanceDataProviderUrl = (market: string, ticker: string, year: number, month: string) =>
  `https://data.binance.vision/data/${market.toLowerCase()}/um/monthly/klines/${ticker}/1m/${ticker}-1m-${year}-${month}.zip`

// axios asynchronously download binary file and write to filesystem by path
async function download(url: string, dest: string) {
  logger.info(`Downloading ${url} to ${dest}`)
  const response = await axios.get(url, { responseType: 'arraybuffer' })
  return writeFileAsync(dest, response.data)
}

// function unzip downloaded binary file and remove it from filesystem
async function unzipBinanceDataBinaryFile(dest: string) {
  logger.info(`Unzipping ${dest}`)
  await unzip(dest, { dir: destFolder })
  await fs.promises.unlink(dest)
}

// add leading zero to month if it is less than 10
const addLeadingZero = (month: number): string => (month < 10 ? `0${month}` : `${month}`)

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// parse csv file and save marketData to database using sequelize bulkCreate method
async function seedDatabaseFromCsv(dest: string, market: string, ticker: string) {
  logger.info(`Parsing ${dest}`)
  const csvFileStream = fs.createReadStream(dest)
  const parser = parse({ delimiter: ',' })
  const marketData: any = []

  csvFileStream
    .pipe(parser)
    .on('data', async (data: any) => {
      const [
        time,
        open,
        high,
        low,
        close,
        volume,
        timeClose,
        quoteAssetVolume,
        trades,
        takerBuyBaseAssetVolume,
        takerBuyQuoteAssetVolume,
      ] = data

      marketData.push({
        market,
        ticker,
        time: new Date(parseInt(time)),
        timestamp: parseInt(time),
        open: parseFloat(open),
        high: parseFloat(high),
        low: parseFloat(low),
        close: parseFloat(close),
        volume: parseFloat(volume),
        timeClose: new Date(parseInt(timeClose)),
        timestampClose: parseInt(timeClose),
        quoteAssetVolume: parseFloat(quoteAssetVolume),
        trades: parseInt(trades),
        takerBuyBaseAssetVolume: parseFloat(takerBuyBaseAssetVolume),
        takerBuyQuoteAssetVolume: parseFloat(takerBuyQuoteAssetVolume),
      })
    })
    .on('end', async () => {
      try {
        logger.info(`MarketData length ${marketData.length}`)
        await MarketData.bulkCreate(marketData)
      } catch (error) {
        logger.error(error)
      }
    })
    .on('error', (error: any) => {
      logger.error(error)
    })
}

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
      const zipFileName = `${ticker}-1m-${year}-${addLeadingZero(month)}.zip`
      const zipDest = path.join(destFolder, zipFileName)
      const csvFileName = `${ticker}-1m-${year}-${addLeadingZero(month)}.csv`
      const csvDest = path.join(destFolder, csvFileName)

      try {
        if (!fs.existsSync(csvDest)) {
          await download(url, zipDest)
          await unzipBinanceDataBinaryFile(zipDest)
          await seedDatabaseFromCsv(csvDest, market, ticker)
        }

        if (IGNORE_DOWNLOAD_MARKET_DATA) {
          await seedDatabaseFromCsv(csvDest, market, ticker)
        }

        await wait(6000)
      } catch (error) {
        logger.error(error)
      }
    }
  }
}

;(async () => {
  await downloadBinanceData(MARKET.FUTURES, TICKER.ETH, START_DATE, END_DATE)
})().catch(logger.error)
