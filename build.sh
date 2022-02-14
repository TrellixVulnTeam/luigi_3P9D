#!/bin/sh -e

cd $(dirname $0)

print_usage() {
    echo "Usage: ./build.sh [--reconfigure] [-j jobs] [--debug] [--run <arguments...>]"
}

configure=1
type=Release
jobs=
run=0
run_args=

if test -f vendor/node/config.status; then configure=0; fi

while [ $# -gt 0 ]; do
    case "$1" in
        -r|--reconfigure) configure=1 ;;
        -j|--jobs) jobs=$2; shift ;;
        --debug) type=Debug ;;
        --run) run=1; shift; run_args=$*; shift $(expr $# - 1) ;;
        --help) print_usage; exit 0 ;;
        *) echo "Unknown option $1"; exit 1 ;;
    esac

    shift
done

make_flags="BUILDTYPE=$type"
config_flags="--without-intl --without-dtrace  --without-etw --without-npm --without-corepack"
if [ "$jobs" != "" ]; then make_flags="$make_flags JOBS=$jobs"; fi
if [ "$configure" = 1 ]; then vendor/node/configure --ninja $config_flags; fi

make -C vendor/node $make_flags
install -m 0755 vendor/node/out/$type/node ./luigi

esbuild_flags=
if [ "$type" == "Release" ] then esbuild_flags="$esbuild_flags --minify"; fi
vendor/esbuild/esbuild_linux_x64 --bundle src/luigi/luigi.js --outfile=luigi.js --platform=node $esbuild_flags

[ "$run" = 1 ] && ./luigi luigi.js $run_args
exit 0
