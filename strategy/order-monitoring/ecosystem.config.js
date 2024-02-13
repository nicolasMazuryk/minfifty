module.exports = {
  apps : [
    // life8063722@gmail.com 
    {
      name: "${BINANCE_API_KEY}",
      script: 'current/strategy/order-monitoring/ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user',
      log_file: `./logs/${this.BINANCE_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT20_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },
    // codegrade.test@gmail.com
    {
      name: "${BINANCE_ACCOUNT1_API_KEY}",
      script: 'current/strategy/order-monitoring/ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user',
      log_file: `./logs/${this.BINANCE_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT1_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT10_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },
    // malgotm30m_virtual@f7l7hysqnoemail.com
    {
      name: "${BINANCE_ACCOUNT2_API_KEY}",
      script: 'current/strategy/order-monitoring/ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user',
      log_file: `./logs/${this.BINANCE_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT2_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT11_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },
  ],

  deploy : {
    production : {
      key  : '~/.ssh/timescale-ec2-minfifty.pem',
      user : 'ec2-user',
      host : 'ec2-3-124-193-68.eu-central-1.compute.amazonaws.com',
      ref  : 'origin/master',
      repo : 'git@github.com:nicolasMazuryk/minfifty.git',
      path : '/home/ec2-user',
      'pre-deploy-local': '',
      'post-deploy' : 
        `cd /home/ec2-user/current/strategy/order-monitoring &&
        npm install && 
        pm2 reload ecosystem.config.js &&
        sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json`,
      'pre-setup': ''
    }
  }
};
