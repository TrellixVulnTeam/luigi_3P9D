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

const opcodes = require('./en_opcodes.js');
const { is_object, Func } = require('./lu_types.js');

let functions;
let globals;
let depth;

exports.execute = function(_functions, _globals = {}) {
    let default_func = _functions['.'];

    functions = _functions;
    globals = Object.assign({}, default_func.memory, _globals);
    depth = -1;

    return run_luigi(default_func, globals);
};

exports.run_function = function(func, args) {
    try {
        depth++;

        if (args.length != func.params.length)
            throw new Error(`Function "${func.name}" expects ${func.params.length} arguments, not ${args.length}`);

        if (func.instructions != null) {
            let locals = {};

            for (let i = args.length - 1; i >= 0; i--) {
                let param = func.params[i];
                let value = args[i];

                locals[param] = value;
            }

            return run_luigi(func, locals);
        } else {
            try {
                let ret = func.native(...args);
                if (ret == null)
                    ret = null;
                return ret;
            } catch (err) {
                if (!err.message.includes('\n'))
                    err.message += '\n\nStack trace:';
                err.message += `\n    ${(func.name + '()').padEnd(24, ' ')} <native> ${JSON.stringify(args)}`;

                throw err;
            }
        }
    } finally {
        depth--;
    }
}

function run_luigi(func, locals) {
    let values = [];
    let addr = 0;

    let args0 = Object.assign({}, locals);

    if (depth > 1024)
        throw new Error("Excessive call stack depth");

    try {
        while (addr < func.instructions.length) {
            let inst = func.instructions[addr];

            // dump(depth, addr, inst);

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
                case opcodes.FREEZE: {
                    let value = values[values.length - 1]
                    Object.freeze(value);
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
                    let result = test(value2) || test(value1);
                    values.push(result);
                } break;
                case opcodes.AND: {
                    let value1 = values.pop();
                    let value2 = values.pop();
                    let result = test(value2) && test(value1);
                    values.push(result);
                } break;
                case opcodes.NOT: {
                    let value = values.pop();
                    let result = !test(value);
                    values.push(result);
                } break;

                case opcodes.JUMP: { addr = inst.value - 1; } break;
                case opcodes.BRANCH: {
                    let value = values.pop();
                    if (!test(value))
                        addr = inst.value - 1;
                } break;
                case opcodes.SKIP_OR: {
                    let value = values[values.length - 1];
                    if (test(value))
                        addr = inst.value - 1;
                } break;
                case opcodes.SKIP_AND: {
                    let value = values[values.length - 1];
                    if (!test(value))
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
                    let args = values.slice(values.length - func.params.length);

                    values.length -= func.params.length;

                    let ret = exports.run_function(func, args);
                    values.push(ret);
                } break;
                case opcodes.CALL_INDIRECT: {
                    let func = values[values.length - inst.value - 1];
                    let args = values.slice(values.length - inst.value);

                    if (!(func instanceof Func))
                        throw new Error('Cannot call non-function value');

                    values.length -= func.params.length + 1;

                    let ret = exports.run_function(func, args);
                    values.push(ret);
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
        if (!err.message.includes('\n'))
            err.message += '\n\nStack trace:';

        if (func.name != '.') {
            let line = func.instructions[addr].line;
            err.message += `\n    ${(func.name + '()').padEnd(24, ' ')} Line ${String(line).padEnd(' ', 6)} ${JSON.stringify(Object.values(args0))}`;
        } else {
            let line = func.instructions[addr].line;
            err.message += `\n    <script>                 Line ${line}`;
        }

        throw err;
    }

    // Implicit return
    return null;
};

function test(value) {
    let test = (value !== false && value !== 0 && value != null);
    return test;
}

function dump(depth, addr, inst) {
    if (inst.value !== undefined) {
        console.error(addr.toString().padEnd(6 + depth * 3, ' '), opcodes.get_name(inst.code), inst.value);
    } else {
        console.error(addr.toString().padEnd(6 + depth * 3, ' '), opcodes.get_name(inst.code));
    }
}
