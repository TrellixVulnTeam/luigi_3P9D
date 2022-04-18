// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see https://www.gnu.org/licenses/.

'use strict';

const process = require('process');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function main() {
    let script_dir = path.dirname(__filename);
    process.chdir(path.join(script_dir, '..'));

    let openssl_no_asm = false;

    for (let i = 2; i < process.argv.length; i++) {
        let arg = process.argv[i];

        if (arg == '--help') {
            print_usage();
            process.exit(0);
        } else if (arg == '--no_asm') {
            if (process.platform != 'win32')
                throw new Error('Option --no_asm is only valid on Windows');

            openssl_no_asm = true;
        } else {
            if (arg[0] == '-') {
                print_usage();
                process.exit(1);
            } else {
                continue;
            }
        }
    }

    if (process.platform == 'win32') {
        run('vendor\\node\\vcbuild.bat without-intl no-cctest noetw' + (openssl_no_asm ? ' openssl-no-asm' : ''));
        install('vendor/node/out/Release/node.exe', './luiggi.exe');
    } else {
        run('vendor/node/configure --ninja --without-intl --without-dtrace  --without-etw --without-npm --without-corepack');
        run('make -C vendor/node');
        install('vendor/node/out/Release/node', './luiggi', 0o755);
    }
}
main();

function run(cmd) {
    execSync(cmd, { stdio: 'inherit' });
}

function install(src, dest, mode = null) {
    fs.copyFileSync(src, dest);

    if (mode != null && process.platform != 'win32')
        fs.chmodSync(dest, mode);
}

function print_usage() {
    console.log('Usage: npm run build -- [--no_asm]');
}
