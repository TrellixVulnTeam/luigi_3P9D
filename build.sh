#!/bin/sh -e

cd $(dirname $0)

vendor/node/configure
make -C vendor/node $*
install -m 0755 vendor/node/out/Release/node ./node
