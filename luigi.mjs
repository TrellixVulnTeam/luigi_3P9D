import { inspect } from 'util';
import { argv } from 'process';
import { readFileSync } from 'fs';

import { scan } from './src/scanner.mjs';
import { parse } from './src/parser.mjs';
import { run } from './src/runner.mjs';

let code = readFileSync(argv[2]).toString('utf-8');

let tokens = scan(code);
let functions = parse(tokens);
run(functions);

// console.log(tokens);
// console.log(inspect(functions, false, null, true));
