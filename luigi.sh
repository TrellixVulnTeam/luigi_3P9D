#!/bin/sh -e

root=$(realpath $(dirname $0))

cd "$root/dev"
npm install
node_modules/.bin/cmake-js

cd "$root"
echo "--------------------------------------------------"
node src/luigi/luigi.js $*
