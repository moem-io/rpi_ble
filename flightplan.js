var plan = require('flightplan');

var cfg = {
  host: process.env.HOST,
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
  agent: process.env.SSH_AUTH_SOCK,
};

plan.target('rpi', cfg);

plan.remote('deploy', function (remote) {
  remote.log('Moving to repo');
  remote.with('cd /home/pi/git/rpi_ble', () => {
    remote.log('Stashing all Files and pull New');
    remote.exec('git stash && git pull origin master');
  });

  remote.with('cd /home/pi/git/rpi_ble', () => remote.sudo('npm run build'));
  remote.with('cd /home/pi/git/rpi_ble', () => remote.exec('npm install'));

});
