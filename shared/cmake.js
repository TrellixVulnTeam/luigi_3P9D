#!/usr/bin/env node

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
const { spawnSync } = require('child_process');

let args = process.argv.slice(2);

if (process.platform === 'win32') {
    if (process.arch === 'ia32') {
        args.push('-A');
        args.push('Win32');
    }

    let ret = spawnSync('node_modules\\.bin\\cmake-js.cmd', args, { stdio: 'inherit' });
    process.exit(ret.status);
} else {
    let ret = spawnSync('node_modules/.bin/cmake-js', args, { stdio: 'inherit' });
    process.exit(ret.status);
}
