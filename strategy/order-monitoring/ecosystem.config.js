// One pm2 app per Binance account. List the env-var prefixes in ORDER_MONITOR_ACCOUNTS,
// e.g. ORDER_MONITOR_ACCOUNTS=BINANCE,BINANCE_ACCOUNT1 reads BINANCE_API_KEY / BINANCE_API_SECRET
// and BINANCE_ACCOUNT1_API_KEY / BINANCE_ACCOUNT1_API_SECRET from the environment.
const prefixes = (process.env.ORDER_MONITOR_ACCOUNTS || 'BINANCE').split(',')

module.exports = {
  apps: prefixes.map((prefix) => ({
    name: `order-monitoring-${prefix.toLowerCase()}`,
    script: 'npm',
    args: 'start',
    cwd: __dirname,
    log_file: `../../logs/order-monitoring-${prefix.toLowerCase()}.log`,
    env: {
      BINANCE_API_KEY: process.env[`${prefix}_API_KEY`],
      BINANCE_API_SECRET: process.env[`${prefix}_API_SECRET`],
      DIFFERENCE_THRESHOLD_TICKS: 0.05,
    },
  })),
}
