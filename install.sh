#!/bin/bash

sudo pip install nodeenv
nodeenv nd_venv
sudo setcap cap_net_raw+eip $(eval readlink -f nd_venv/bin/node)
npm install
