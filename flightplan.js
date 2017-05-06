var plan = require('flightplan');

var cfg = {
  host: process.env.HOST,
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
  agent: process.env.SSH_AUTH_SOCK,
};

plan.target('rpi', cfg);

var home = '/home/pi';
var repo = '/home/pi/rpi_ble';
var repoAddr = 'https://github.com/moem-io/rpi_ble.git';
var temp = new Date().getTime();

plan.local('test', function (local) {
  local.log('Pushing to test branch');
  local.exec('git commit -am "' + temp + '" && git push origin test');
});

plan.remote('test', function (remote) {
  remote.log('Moving to repo');
  checkout(remote, 'test');
});

plan.remote('install', function (remote) {
  remote.log('Re-Initializing Repo');
  remote.sudo('rm -rf ' + repo);
  remote.with('git clone ' + repoAddr + ' ' + repo, () => checkout(remote, 'master'));

  npm_init(remote);
});

plan.remote('deploy', function (remote) {
  remote.log('Moving to repo');
  checkout(remote, 'master');

  npm_init(remote);
});

function checkout(remote, branch) {
  remote.with('cd ' + repo, () => {
    remote.log('Stashing all Files and pull New');
    remote.exec('git stash && git pull && git checkout ' + branch);
  });
};

function npm_init(remote) {
  remote.with('cd ' + repo, () => remote.sudo('npm run build'));
  remote.with('cd ' + repo, () => remote.exec('npm install'));
}
