import { argv } from 'process';
import { readFileSync } from 'fs';
import { scan } from './src/scanner.mjs';
import { parse } from './src/parser.mjs';

console.log(argv)

// Test de notre scanneur
let code = readFileSync(argv[2]).toString('utf-8');
let tokens = scan(code);
console.log(tokens);

// Test de notre parseur
let functions = parse(tokens);
console.log(functions);
