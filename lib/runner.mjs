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

export function run(functions) {
    let default_func = functions['.'];
    let memory = {};

    run_function(default_func, functions, memory);
}

function run_function(func, functions, memory) {
    let values = [];

    for (let addr = 0; addr < func.instructions.length; addr++) {
        let instr = func.instructions[addr];

        switch (instr.code) {
            case 'value': { values.push(instr.value); } break;

            case 'load': {
                let value = memory[instr.value];
                values.push(value);
            } break;
            case 'store': {
                let value = values.pop();
                memory[instr.value] = value;
            } break;

            case '+': {
                let value1 = values.pop();
                let value2 = values.pop();
                let result = value2 + value1;
                values.push(result);
            } break;
            case '-': {
                let value1 = values.pop();
                let value2 = values.pop();
                let result = value2 - value1;
                values.push(result);
            } break;
            case '*': {
                let value1 = values.pop();
                let value2 = values.pop();
                let result = value2 * value1;
                values.push(result);
            } break;
            case '/': {
                let value1 = values.pop();
                let value2 = values.pop();
                let result = value2 / value1;
                values.push(result);
            } break;
            case '=': {
                let value1 = values.pop();
                let value2 = values.pop();
                let result = (value2 == value1);
                values.push(result);
            } break;

            case 'jump': { addr = instr.value - 1; } break;
            case 'branch': {
                let value = values.pop();
                if (!value)
                    addr = instr.value - 1;
            } break;

            case 'call': {
                let func = functions[instr.value];

                if (func.instructions != null) {
                    for (let i = func.params.length - 1; i >= 0; i--) {
                        let param = func.params[i];
                        let value = values.pop();
                        memory[param] = value;
                    }

                    let value = run_function(func, functions, memory);
                    values.push(value);
                } else {
                    let args = values.slice(values.length - func.params.length);

                    let value = func.native(...args);
                    if (value == null)
                        value = null;
                    values.push(value);
                }
            } break;
            case 'return': {
                let value = values.pop();
                return value;
            } break;

            default: {
                throw new Error(`Illegal instruction "${instr.code}"`);
            } break;
        }
    }
}
