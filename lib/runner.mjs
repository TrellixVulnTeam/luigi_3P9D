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

let functions;
let globals;

export function execute(_functions, _globals = {}) {
    functions = _functions;
    globals = _globals;

    run_function(functions['.'], globals);
}

function run_function(func, locals) {
    let values = [];

    for (let addr = 0; addr < func.instructions.length; addr++) {
        let inst = func.instructions[addr];

        switch (inst.code) {
            case 'value': { values.push(inst.value); } break;
            case 'pop': { values.pop(); } break;

            case 'load_global': {
                let value = globals[inst.value];
                values.push(value);
            } break;
            case 'store_global': {
                let value = values.pop();
                globals[inst.value] = value;
            } break;
            case 'load_local': {
                let value = locals[inst.value];
                values.push(value);
            } break;
            case 'store_local': {
                let value = values.pop();
                locals[inst.value] = value;
            } break;

            case 'list': {
                let value = [];
                values.push(value);
            } break;
            case 'append': {
                let value = values.pop();
                let list = values[values.length - 1];
                if (!Array.isArray(list))
                    throw new Error('Cannot append to non-array value');
                list.push(value);
            } break;
            case 'index': {
                let idx = values.pop();
                let list = values.pop();
                if (!Array.isArray(list))
                    throw new Error('Cannot index into non-array value');
                if (idx < 0 || idx >= list.length)
                    throw new Error('Index is out of bounds');
                let value = list[idx];
                values.push(value);
            } break;
            case 'put': {
                let value = values.pop();
                let idx = values.pop();
                let list = values.pop();
                if (!Array.isArray(list))
                    throw new Error('Cannot put into non-array value');
                if (idx < 0 || idx >= list.length)
                    throw new Error('Index is out of bounds');
                list[idx] = value;
            } break;

            case 'object': {
                let value = {};
                values.push(value);
            } break;
            case 'get': {
                let obj = values.pop();
                if (!is_object(obj))
                    throw new Error('Cannot get member of non-object value');
                if (!obj.hasOwnProperty(inst.value))
                    throw new Error(`Object does not have a member called "${inst.value}"`);
                let value = obj[inst.value];
                values.push(value);
            } break;
            case 'set': {
                let value = values.pop();
                let obj = values[values.length - 1];
                if (!is_object(obj))
                    throw new Error('Cannot set member of non-object value');
                obj[inst.value] = value;
            } break;

            case 'add': {
                let value1 = values.pop();
                let value2 = values.pop();
                let result = value2 + value1;
                values.push(result);
            } break;
            case 'substract': {
                let value1 = values.pop();
                let value2 = values.pop();
                let result = value2 - value1;
                values.push(result);
            } break;
            case 'negate': {
                let value = values.pop();
                values.push(-value);
            } break;
            case 'multiply': {
                let value1 = values.pop();
                let value2 = values.pop();
                let result = value2 * value1;
                values.push(result);
            } break;
            case 'divide': {
                let value1 = values.pop();
                let value2 = values.pop();
                let result = value2 / value1;
                values.push(result);
            } break;
            case 'equal': {
                let value1 = values.pop();
                let value2 = values.pop();
                let result = (value2 == value1);
                values.push(result);
            } break;
            case 'not_equal': {
                let value1 = values.pop();
                let value2 = values.pop();
                let result = (value2 != value1);
                values.push(result);
            } break;
            case 'less': {
                let value1 = values.pop();
                let value2 = values.pop();
                let result = (value2 < value1);
                values.push(result);
            } break;
            case 'less_or_equal': {
                let value1 = values.pop();
                let value2 = values.pop();
                let result = (value2 <= value1);
                values.push(result);
            } break;
            case 'greater': {
                let value1 = values.pop();
                let value2 = values.pop();
                let result = (value2 > value1);
                values.push(result);
            } break;
            case 'greater_or_equal': {
                let value1 = values.pop();
                let value2 = values.pop();
                let result = (value2 >= value1);
                values.push(result);
            } break;
            case 'or': {
                let value1 = values.pop();
                let value2 = values.pop();
                let result = (value2 || value1);
                values.push(result);
            } break;
            case 'and': {
                let value1 = values.pop();
                let value2 = values.pop();
                let result = (value2 && value1);
                values.push(result);
            } break;
            case 'not': {
                let value = values.pop();
                let result = !value;
                values.push(result);
            } break;

            case 'jump': { addr = inst.value - 1; } break;
            case 'branch': {
                let value = values.pop();
                if (!value)
                    addr = inst.value - 1;
            } break;
            case 'skip_and': {
                let value = values[values.length - 1];
                if (!value)
                    addr = inst.value - 1;
            } break;
            case 'skip_or': {
                let value = values[values.length - 1];
                if (value)
                    addr = inst.value - 1;
            } break;

            case 'call': {
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
            case 'return': {
                let value = values.pop();
                return value;
            } break;

            default: {
                throw new Error(`Illegal instruction "${inst.code}"`);
            } break;
        }
    }
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
