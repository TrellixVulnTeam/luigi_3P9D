import { inspect } from 'util';
import { argv } from 'process';
import { readFileSync } from 'fs';
import { scan, parse, run } from '../lib/luigi.mjs';

let code = readFileSync(argv[2]).toString('utf-8');

let tokens = scan(code);
let functions = parse(tokens);

run(functions);
