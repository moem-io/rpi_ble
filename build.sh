#!/bin/bash
NODE_VER="$(node -v)"

echo "Checking Node Version"
echo "${NODE_VER}"

if [ "v7*" != "${NODE_VER}" ]
then
    echo "Installing Node v7.*"
    curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "Node Check Completed"

source ~/.bashrc
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
