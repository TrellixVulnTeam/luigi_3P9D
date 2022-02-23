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
const fs = require('fs');
const luigi = require('./index.js');

function main() {
    if (process.argv.length < 3) {
        print_usage();
        return;
    }

    try {
        let code = fs.readFileSync(process.argv[2]).toString('utf-8');
        luigi.run(code);
    } catch (err) {
        console.error(err.message);
    }
}
main();

function print_usage() {
    let usage = `Usage: luigi <script>`;
    console.log(usage);
}
