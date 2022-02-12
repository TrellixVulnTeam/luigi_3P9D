#!/bin/sh -e

cd $(dirname $0)

print_usage() {
    echo "Usage: ./build.sh [--reconfigure] [-j jobs]"
}

configure=1
flags=

test -f vendor/node/config.status && configure=0

while [ $# -gt 0 ]; do
    case "$1" in
        -r|--reconfigure) configure=1 ;;
        -j|--cores) flags=JOBS=$2; shift ;;
        --help) print_usage; exit 0 ;;
        *) echo "Unknown option $1"; exit 1 ;;
    esac

    shift
done

if [ "$configure" = 1 ]; then vendor/node/configure --ninja --without-intl; fi
make -C vendor/node $flags
install -m 0755 vendor/node/out/Release/node ./luigi

vendor/esbuild/esbuild_linux_x64 --bundle src/luigi/luigi.js --outfile=luigi.js --platform=node --minify
