module.exports = {
  apps : [
    {
      name: "myapp",
      script: 'ws.ts',
      interpreter: 'node',
      interpreter_args: '--import tsx',
      cwd: '/home/ec2-user/current/strategy/order-monitoring',
      env: {
        NODE_ENV: "development"
      },
    }
  ],

  deploy : {
    production : {
      key: '~/.ssh/timescale-ec2-minfifty.pem',
      user : 'ec2-user',
      host : 'ec2-3-124-193-68.eu-central-1.compute.amazonaws.com',
      ref  : 'origin/master',
      repo : 'git@github.com:nicolasMazuryk/minfifty.git',
      path : '/home/ec2-user',
      'pre-deploy-local': '',
      'post-deploy' : 'cd /home/ec2-user/current/strategy/order-monitoring && npm install && pm2 reload ecosystem.config.js',
      'pre-setup': ''
    }
  }
};
