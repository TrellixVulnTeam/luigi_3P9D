#!/bin/sh -e

cd $(dirname $0)

vendor/node/configure --without-intl
make -C vendor/node $*
install -m 0755 vendor/node/out/Release/node ./luigi

vendor/esbuild/esbuild_linux_x64 --bundle src/luigi/luigi.js --outfile=luigi.js --platform=node --minify
