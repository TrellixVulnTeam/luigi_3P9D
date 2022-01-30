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

import * as opcodes from './enums/opcodes.mjs';

let functions;
let globals;

export function execute(_functions, _globals = {}) {
    functions = _functions;
    globals = _globals;

    run_function(functions['.'], globals);
}

function run_function(func, locals) {
    let values = [];
    let addr = 0;

    try {
        while (addr < func.instructions.length) {
            let inst = func.instructions[addr];

            // dump(addr, inst);

            switch (inst.code) {
                case opcodes.PUSH: { values.push(inst.value); } break;
                case opcodes.POP: { values.length -= inst.value; } break;

                case opcodes.LOAD_GLOBAL: {
                    let value = globals[inst.value];
                    values.push(value);
                } break;
                case opcodes.LOAD_LOCAL: {
                    let value = locals[inst.value];
                    values.push(value);
                } break;
                case opcodes.STORE_GLOBAL: {
                    let value = values.pop();
                    globals[inst.value] = value;
                } break;
                case opcodes.STORE_LOCAL: {
                    let value = values.pop();
                    locals[inst.value] = value;
                } break;

                case opcodes.LIST_NEW: {
                    let value = [];
                    values.push(value);
                } break;
                case opcodes.LIST_APPEND: {
                    let value = values.pop();
                    let list = values[values.length - 1];
                    if (!Array.isArray(list))
                        throw new Error('Cannot append to non-list value');
                    list.push(value);
                } break;
                case opcodes.LIST_SET: {
                    let value = values.pop();
                    let idx = values.pop();
                    let list = values.pop();
                    if (!Array.isArray(list))
                        throw new Error('Cannot put into non-list value');
                    if (idx < 0 || idx >= list.length)
                        throw new Error('Index is out of bounds');
                    list[idx] = value;
                } break;
                case opcodes.LIST_GET: {
                    let idx = values.pop();
                    let list = values.pop();
                    if (!Array.isArray(list))
                        throw new Error('Cannot index into non-list value');
                    if (idx < 0 || idx >= list.length)
                        throw new Error('Index is out of bounds');
                    let value = list[idx];
                    values.push(value);
                } break;

                case opcodes.OBJ_NEW: {
                    let value = {};
                    values.push(value);
                } break;
                case opcodes.OBJ_APPEND: {
                    let value = values.pop();
                    let obj = values[values.length - 1];
                    if (!is_object(obj))
                        throw new Error('Cannot set member of non-object value');
                    obj[inst.value] = value;
                } break;
                case opcodes.OBJ_SET: {
                    let value = values.pop();
                    let obj = values.pop();
                    if (!is_object(obj))
                        throw new Error('Cannot set member of non-object value');
                    if (!obj.hasOwnProperty(inst.value))
                        throw new Error(`Object does not have a member called "${inst.value}"`);
                    obj[inst.value] = value;
                } break;
                case opcodes.OBJ_GET: {
                    let obj = values.pop();
                    if (!is_object(obj))
                        throw new Error('Cannot get member of non-object value');
                    if (!obj.hasOwnProperty(inst.value))
                        throw new Error(`Object does not have a member called "${inst.value}"`);
                    let value = obj[inst.value];
                    values.push(value);
                } break;

                case opcodes.ADD: {
                    let value1 = values.pop();
                    let value2 = values.pop();
                    let result = value2 + value1;
                    values.push(result);
                } break;
                case opcodes.SUBSTRACT: {
                    let value1 = values.pop();
                    let value2 = values.pop();
                    let result = value2 - value1;
                    values.push(result);
                } break;
                case opcodes.NEGATE: {
                    let value = values.pop();
                    values.push(-value);
                } break;
                case opcodes.MULTIPLY: {
                    let value1 = values.pop();
                    let value2 = values.pop();
                    let result = value2 * value1;
                    values.push(result);
                } break;
                case opcodes.DIVIDE: {
                    let value1 = values.pop();
                    let value2 = values.pop();
                    let result = value2 / value1;
                    values.push(result);
                } break;
                case opcodes.MODULO: {
                    let value1 = values.pop();
                    let value2 = values.pop();
                    let result = value2 % value1;
                    values.push(result);
                } break;
                case opcodes.EQUAL: {
                    let value1 = values.pop();
                    let value2 = values.pop();
                    let result = (value2 === value1);
                    values.push(result);
                } break;
                case opcodes.NOT_EQUAL: {
                    let value1 = values.pop();
                    let value2 = values.pop();
                    let result = (value2 !== value1);
                    values.push(result);
                } break;
                case opcodes.LESS: {
                    let value1 = values.pop();
                    let value2 = values.pop();
                    let result = (value2 < value1);
                    values.push(result);
                } break;
                case opcodes.LESS_OR_EQUAL: {
                    let value1 = values.pop();
                    let value2 = values.pop();
                    let result = (value2 <= value1);
                    values.push(result);
                } break;
                case opcodes.GREATER: {
                    let value1 = values.pop();
                    let value2 = values.pop();
                    let result = (value2 > value1);
                    values.push(result);
                } break;
                case opcodes.GREATER_OR_EQUAL: {
                    let value1 = values.pop();
                    let value2 = values.pop();
                    let result = (value2 >= value1);
                    values.push(result);
                } break;
                case opcodes.OR: {
                    let value1 = values.pop();
                    let value2 = values.pop();
                    let result = (value2 || value1);
                    values.push(result);
                } break;
                case opcodes.AND: {
                    let value1 = values.pop();
                    let value2 = values.pop();
                    let result = (value2 && value1);
                    values.push(result);
                } break;
                case opcodes.NOT: {
                    let value = values.pop();
                    let result = !value;
                    values.push(result);
                } break;

                case opcodes.JUMP: { addr = inst.value - 1; } break;
                case opcodes.BRANCH: {
                    let value = values.pop();
                    if (!value)
                        addr = inst.value - 1;
                } break;
                case opcodes.SKIP_OR: {
                    let value = values[values.length - 1];
                    if (value)
                        addr = inst.value - 1;
                } break;
                case opcodes.SKIP_AND: {
                    let value = values[values.length - 1];
                    if (!value)
                        addr = inst.value - 1;
                } break;

                case opcodes.STEP_RANGE: {
                    let max = values[values.length - 2];
                    let value = values[values.length - 3]++;

                    if (value < max) {
                        locals[inst.value] = value;
                    } else {
                        addr = values[values.length - 1] - 1;
                        values.length -= 3;
                    }
                } break;
                case opcodes.STEP_LIST: {
                    let list = values[values.length - 3];
                    if (!Array.isArray(list))
                        throw new Error("Cannot iterate non-list value");
                    let idx = ++values[values.length - 1];

                    if (idx < list.length) {
                        locals[inst.value] = list[idx];
                    } else {
                        addr = values[values.length - 2] - 1;
                        values.length -= 3;
                    }
                } break;

                case opcodes.CALL: {
                    let func = functions[inst.value];

                    if (func.instructions != null) {
                        let params = {};

                        for (let i = func.params.length - 1; i >= 0; i--) {
                            let param = func.params[i];
                            let value = values.pop();

                            params[param] = value;
                        }

                        let value = run_function(func, params);
                        values.push(value);
                    } else {
                        let args = values.slice(values.length - func.params.length);
                        values.length -= func.params.length;

                        let value = func.native(...args);
                        if (value == null)
                            value = null;
                        values.push(value);
                    }
                } break;
                case opcodes.RETURN: {
                    let value = values.pop();
                    return value;
                } break;

                default: {
                    console.log(inst);
                    throw new Error(`Illegal instruction "${opcodes.get_name(inst.code)}"`);
                } break;
            }

            addr++;
        }
    } catch(err) {
        if (!err.message.startsWith('Line '))
            err.message = `Line ${func.instructions[addr].line}: ${err.message}`;
        throw err;
    }

    // Implicit return
    return null;
}

function is_object(obj) {
    if (typeof obj !== 'object')
        return false;
    if (Array.isArray(obj))
        return false;
    if (obj == null)
        return false;

    return true;
}

function dump(addr, inst) {
    if (inst.value !== undefined) {
        console.log(addr, opcodes.get_name(inst.code), inst.value);
    } else {
        console.log(addr, opcodes.get_name(inst.code));
    }
}
