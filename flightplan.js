var plan = require('flightplan');

var cfg = {
  host: process.env.HOST,
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
  agent: process.env.SSH_AUTH_SOCK,
  webRoot: '/usr/local/www',
};

plan.target('rpi', cfg);

plan.remote(function (remote) {
  remote.log('Moving to repo');
  remote.with('cd ~/git/rpi_ble', () => {

    remote.log('Stashing all Files and pull New');
    remote.with('git stash && git pull origin master', () => {

      remote.log('Npm install & run');
      remote.exec('npm run build && npm install');
    });
  });
});
