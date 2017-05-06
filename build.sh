#!/bin/bash
NODE_VER="$(node -v)"

if [ "v7*" == "${NODE_VER}" ]
then
    curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

source ~/.bashrc
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
