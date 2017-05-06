var plan = require('flightplan');

var cfg = {
  host: process.env.HOST,
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
  agent: process.env.SSH_AUTH_SOCK,
};

plan.target('rpi', cfg);

var temp = new Date().getTime();

plan.local('test', function (local) {
  local.log('Pushing to test branch');
  local.verbose();
  local.exec('git commit -am "' + temp + '" && git push origin test');
});

plan.remote('test', function (remote) {
  remote.log('Moving to repo');
  remote.with('cd /home/pi/git/rpi_ble', () => {
    remote.log('Stashing all Files and pull New');
    remote.exec('git stash && git pull && git checkout test');
  });
});


plan.remote('deploy', function (remote) {
  remote.log('Moving to repo');
  remote.with('cd /home/pi/git/rpi_ble', () => {
    remote.log('Stashing all Files and pull New');
    remote.exec('git stash && git pull && git checkout master');
  });

  remote.with('cd /home/pi/git/rpi_ble', () => remote.sudo('npm run build'));
  remote.with('cd /home/pi/git/rpi_ble', () => remote.exec('npm install'));

});
