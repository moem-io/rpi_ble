var plan = require('flightplan');

var cfg = {
  host: process.env.HOST,
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
  agent: process.env.SSH_AUTH_SOCK
};

plan.target('rpi', cfg);

plan.remote(function (remote) {
  remote.log('Moving to repo');
  remote.exec('cd ~/git/rpi_ble');

  remote.log('Stashing all Files and pull New');
  remote.exec('git stash');
  remote.exec('git pull origin master');

  remote.log('Npm install & run');
  remote.exec('npm run build');
  remote.exec('npm install');
});
