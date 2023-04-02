module.exports = {
  apps : [{
    name   : "strategy",
    script : "./src/strategy/backtest.js",
    error_file: "./logs/error.log",
    out_file: "./logs/error.log",
    env: {
      HASH_SECRET: "secret",
      API_PORT: 9000,
      BASE_URL: "/",
      NODE_LOGGER_TYPE: "default",
      SQL_HOST: "localhost",
      SQL_PORT: 5432,
      SQL_DB: "minfifty_dev",
      SQL_USER: "postgres",
      SQL_PASS: "Testing123!",
      ADMIN_EMAIL: "",
      USER_EMAIL: "",
      EMAIL_HOST: "",
      EMAIL_PORT: "",
      EMAIL_USER: "",
      EMAIL_PASSWORD: "",
      SESSION_SECRET: "session_secret",
      EMAIL_TRANSPORT_TYPE: "SMTP",
      BINANCE_API_KEY: "${BINANCE_ACCOUNT22_API_KEY}",
      BINANCE_API_SECRET: "${BINANCE_ACCOUNT22_API_SECRET}",
      BINANCE_FUTURES_API_URL: "https://fapi.binance.com",
      BINANCE_FUTURES_WS_URL: "wss://fstream.binance.com",
    }
  }]
}
