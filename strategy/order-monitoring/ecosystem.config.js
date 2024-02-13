module.exports = {
  apps : [
    // life8063722@gmail.com 
    {
      name: "${BINANCE_API_KEY}",
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_API_KEY}.log`,
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
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_ACCOUNT1_API_KEY}.log`,
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
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_ACCOUNT2_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT2_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT11_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },

    // jackson5_virtual@9xx7lynnnoemail.com
    {
      name: "${BINANCE_ACCOUNT3_API_KEY}",
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_ACCOUNT3_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT3_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT12_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },
        // jackson5atr_virtual@i74kcfzlnoemail.com
    {
      name: "${BINANCE_ACCOUNT4_API_KEY}",
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_ACCOUNT4_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT4_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT13_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },
    // bollingerbreakout_virtual@nurv4rjtnoemail.com
    {
      name: "${BINANCE_ACCOUNT5_API_KEY}",
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_ACCOUNT5_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT5_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT14_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },
        // doubleema_virtual@02w4zdu1noemail.com
    {
      name: "${BINANCE_ACCOUNT6_API_KEY}",
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_ACCOUNT6_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT6_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT15_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },
    // doubleemabolinger_virtual@ul8fh2monoemail.com
    {
      name: "${BINANCE_ACCOUNT7_API_KEY}",
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_ACCOUNT7_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT7_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT16_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },
        // malgosmadeg_virtual@5q62pwctnoemail.com
    {
      name: "${BINANCE_ACCOUNT8_API_KEY}",
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_ACCOUNT8_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT8_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT17_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },
    // malgosidev3fxs30_virtual@bgot7orcnoemail.com
    {
      name: "${BINANCE_ACCOUNT9_API_KEY}",
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_ACCOUNT9_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT9_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT18_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },
        // malgosidejellyfxs30_virtual@ksr26se9noemail.com
    {
      name: "${BINANCE_ACCOUNT10_API_KEY}",
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_ACCOUNT10_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT10_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT19_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },
    // malgosidejellyrune15_virtual@5pvb9i9tnoemail.com
    {
      name: "${BINANCE_ACCOUNT11_API_KEY}",
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_ACCOUNT11_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT11_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },
    // malgosidejellyrune5_virtual@8w7s1ykjnoemail.com
    {
      name: "${BINANCE_ACCOUNT12_API_KEY}",
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_ACCOUNT12_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT12_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT1_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },
        // malgosidewoo15_virtual@yk54hj4enoemail.com
    {
      name: "${BINANCE_ACCOUNT13_API_KEY}",
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_ACCOUNT13_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT13_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT2_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },
    // malgosidearb30_virtual@0cjk3rwwnoemail.com
    {
      name: "${BINANCE_ACCOUNT14_API_KEY}",
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_ACCOUNT14_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT14_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT3_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },
        // malgosidearb15_virtual@iuthyo7vnoemail.com
    {
      name: "${BINANCE_ACCOUNT15_API_KEY}",
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_ACCOUNT15_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT15_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT4_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },
    // malgohardcoderune5_virtual@g4ictt8fnoemail.com
    {
      name: "${BINANCE_ACCOUNT16_API_KEY}",
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_ACCOUNT16_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT16_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT5_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },
        // malgohardcodedwoo5_virtual@q9os06aonoemail.com
    {
      name: "${BINANCE_ACCOUNT17_API_KEY}",
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_ACCOUNT17_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT17_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT6_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },
    // malgosmadegarb15_virtual@3ni81h35noemail.com
    {
      name: "${BINANCE_ACCOUNT18_API_KEY}",
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_ACCOUNT18_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT18_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT7_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },
        // malgohardcodedrune30_virtual@7u9rawggnoemail.com
    {
      name: "${BINANCE_ACCOUNT19_API_KEY}",
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_ACCOUNT19_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT19_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT8_API_SECRET}",
        DIFFERENCE_THRESHOLD_TICKS: 0,
      },
    },
    // atremastrategybtc1_virtual@12jqf55rnoemail.com
    {
      name: "${BINANCE_ACCOUNT20_API_KEY}",
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      log_file: `../../../logs/${BINANCE_ACCOUNT20_API_KEY}.log`,
      // log_date_format: 'YYYY-MM-DD HH:mm Z',
      env: {
        BINANCE_API_KEY: "${BINANCE_ACCOUNT20_API_KEY}",
        BINANCE_API_SECRET: "${BINANCE_ACCOUNT9_API_SECRET}",
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
      path : '/home/ec2-user/current/strategy/order-monitoring',
      'pre-deploy-local': '',
      'post-deploy' : 
        `cd /home/ec2-user/current/strategy/order-monitoring/current/strategy/order-monitoring &&
        npm install && 
        npm run pm2`,
      'pre-setup': ''
    }
  }
};
