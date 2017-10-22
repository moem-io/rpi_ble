source .env
cd app
mysql -u root -p blockbee -e 'drop database blockbee;create database blockbee;'
rm -rf config/config.json
touch config/config.json
node start.js
