module.exports = {
  apps : [{
    name   : "strategy",
    script : "strategy/build/strategy/src/scripts/backtest.js",
    out_file: "/home/ubuntu/app/logs/out.log",
    error_file: "/home/ubuntu/app/logs/error.log",
    env: {
      SQL_HOST: "localhost",
      SQL_PORT: 5432,
      SQL_DB: "minfifty_dev",
      SQL_USER: "postgres",
      SQL_PASS: "Testing123!",
      // NODE_ENV: "production",
      // BINANCE_API_KEY: "${BINANCE_ACCOUNT22_API_KEY}",
      // BINANCE_API_SECRET: "${BINANCE_ACCOUNT22_API_SECRET}",
      // BINANCE_SPOT_API_URL: "https://api.binance.com",
      // BINANCE_SPOT_WS_URL: "wss://stream.binance.com",
      // BINANCE_FUTURES_API_URL: "https://fapi.binance.com",
      // BINANCE_FUTURES_WS_URL: "wss://fstream.binance.com",
      NODE_ENV: "development",
      BINANCE_API_KEY: "${BINANCE_ACCOUNT21_API_KEY}",
      BINANCE_API_SECRET: "${BINANCE_ACCOUNT21_API_SECRET}",
      BINANCE_SPOT_API_URL: "https://testnet.binance.vision",
      BINANCE_SPOT_WS_URL: "wss://stream.binance.vision",
      BINANCE_FUTURES_API_URL: "https://testnet.binancefuture.com",
      BINANCE_FUTURES_WS_URL: "wss://stream.binancefuture.com/ws",
    }
  }]
}
