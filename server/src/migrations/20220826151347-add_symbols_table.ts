import Sequelize, { QueryInterface } from 'sequelize'

const { DataTypes } = Sequelize

export const up = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(
      'symbols',
      {
        name: { type: DataTypes.STRING, primaryKey: true },
        market: { type: DataTypes.STRING },
        exchangeTraded: { type: DataTypes.STRING },
        exchangeListed: { type: DataTypes.STRING },
        timezone: { type: DataTypes.STRING },
        minmov: { type: DataTypes.INTEGER },
        minmov2: { type: DataTypes.INTEGER },
        pointvalue: { type: DataTypes.INTEGER },
        session: { type: DataTypes.STRING },
        hasIntraday: { type: DataTypes.BOOLEAN },
        hasNoVolume: { type: DataTypes.BOOLEAN },
        description: { type: DataTypes.STRING },
        type: { type: DataTypes.STRING },
        supportedResolutions: { type: DataTypes.ARRAY(DataTypes.STRING) },
        pricescale: { type: DataTypes.INTEGER },
        ticker: { type: DataTypes.STRING },
      },
      { transaction },
    )

    await queryInterface.sequelize.query(
      `INSERT INTO public.symbols (name, market, "exchangeTraded", "exchangeListed", timezone, minmov, minmov2, pointvalue, session, "hasIntraday", "hasNoVolume", description, type, "supportedResolutions", pricescale, ticker) VALUES
        ('BTCUSDT', 'FUTURES', 'Binance', 'Binance', 'Etc/UTC', 1, 0, 1, '24x7', true, false, 'BTC/USDT PERP', 'crypto', '{"1", "5", "15", "30", "60", "1D", "1W", "1M"}', 10, 'BTCUSDT'),
        ('ETHUSDT', 'FUTURES', 'Binance', 'Binance', 'Etc/UTC', 1, 0, 1, '24x7', true, false, 'ETH/USDT PERP', 'crypto', '{"1", "5", "15", "30", "60", "1D", "1W", "1M"}', 100, 'ETHUSDT');`,
      { transaction },
    )
  })

export const down = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable('symbols', { transaction })
  })
