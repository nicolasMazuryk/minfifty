module.exports = {
  apps : [{
    name   : "strategy",
    script : "strategy/build/strategy/src/scripts/backtest.js",
    error_file: "./logs/error.log",
    out_file: "./logs/output.log",
    env: {
      SQL_HOST: "localhost",
      SQL_PORT: 5432,
      SQL_DB: "minfifty_dev",
      SQL_USER: "postgres",
      SQL_PASS: "Testing123!",
      BINANCE_API_KEY: "${BINANCE_ACCOUNT22_API_KEY}",
      BINANCE_API_SECRET: "${BINANCE_ACCOUNT22_API_SECRET}",
      BINANCE_SPOT_API_URL: "https://api.binance.com",
      BINANCE_SPOT_WS_URL: "wss://stream.binance.com",
      BINANCE_FUTURES_API_URL: "https://fapi.binance.com",
      BINANCE_FUTURES_WS_URL: "wss://fstream.binance.com",
    }
  }]
}
