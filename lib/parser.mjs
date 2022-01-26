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

import * as std from './std.mjs';

let functions;
let default_func;
let current_func;

let tokens;
let offset;

export function parse(_tokens) {
    functions = {};

    let natives = import_natives(std);
    Object.assign(functions, natives);

    default_func = {
        name: '.',
        params: [],
        instructions: [],
        variables: {}
    };
    current_func = default_func;
    functions['.'] = default_func;

    tokens = _tokens;
    offset = 0;

    parse_code([]);

    return functions;
}

function import_natives(natives) {
    let functions = {};

    for (let name in natives) {
        let native = natives[name];

        let code = native.toString();
        let signature = code.match(/\((.*)\)/)[1].trim();
        let params = signature.length ? signature.split(',').map(param => param.trim()) : [];

        let func = {
            name: name,
            params: params,
            native: native
        };

        functions[name] = func;
    }

    return functions;
}

function parse_code(enders) {
    while (offset < tokens.length) {
        let tok = tokens[offset];

        if (enders.includes(tok.type))
            break;

        if (tok.type == 'identifier' && tokens[offset + 1].type == '=') {
            parse_declaration();
        } else if (tok.type == 'if') {
            parse_if();
        } else if (tok.type == 'while') {
            parse_while();
        } else if (tok.type == 'func') {
            parse_func();
        } else if (tok.type == 'return') {
            parse_return();
        } else if (tok.type == 'eol') {
            offset++; // Do nothing
        } else {
            parse_expression();
        }
    }
}

function parse_declaration() {
    let name = consume('identifier');

    let variable = find_variable(name);
    if (variable == null) {
        variable = { name: name };
        current_func.variables[name] = variable;
    }

    consume('=');

    parse_expression();
    instruction('store', name);

    consume('eol');
}

function parse_if() {
    offset++;

    let jumps = [];
    let branch;

    parse_expression();
    branch = instruction('branch');
    consume('eol');
    parse_code(['end', 'elif', 'else']);
    jumps.push(instruction('jump'));
    branch.value = current_func.instructions.length;

    while (match('elif')) {
        parse_expression();
        branch = instruction('branch');
        consume('eol');
        parse_code(['end', 'elif', 'else']);
        jumps.push(instruction('jump'));
        branch.value = current_func.instructions.length;
    }

    if (match('else')) {
        consume('eol');
        parse_code(['end']);
    }

    for (let jump of jumps)
        jump.value = current_func.instructions.length;

    consume('end');
    consume('eol');
}

function parse_while() {
    offset++;

    let addr;
    let branch;

    addr = current_func.instructions.length;
    parse_expression();
    consume('eol');
    branch = instruction('branch');

    parse_code(['end']);
    instruction('jump', addr);
    branch.value = current_func.instructions.length;

    consume('end');
    consume('eol');
}

function parse_func() {
    let start = offset++;

    let func = {
        name: consume('identifier'),
        params: [],
        instructions: [],
        variables: {}
    };

    if (current_func != default_func)
        error(start, "Nested functions are not allowed");
    if (functions[func.name] != null)
        error(start + 1, `Function "${func.name}" already defined`);

    consume('(');
    while (offset < tokens.length) {
        let param = match('identifier');
        if (param == null)
            break;

        if (func.variables[param] != null)
            error(offset - 1, `Parameter name "${param}" is already used`);

        func.params.push(param);
        func.variables[param] = { name: param };

        if (!match(','))
            break;
        match('eol');
    }
    consume(')');
    consume('eol');

    functions[func.name] = func;

    current_func = func;
    parse_code(['end']);
    instruction('value', null);
    instruction('return');
    consume('end');
    current_func = default_func;

    consume('eol');
}

function parse_return() {
    offset++;

    if (match('eol')) {
        instruction('value', null);
    } else {
        parse_expression();
        consume('eol');
    }

    instruction('return');
}

function parse_end() {
    if (current_func == default_func)
        error(offset, "Unexpected token 'end'");

    offset++;
    current_func = default_func;
}

// Expressions

const priorities = {
    'and': 1,
    'or': 2,
    '<': 3,
    '<=': 3,
    '>': 3,
    '>=': 3,
    '=': 3,
    '+': 4,
    '-': 4,
    '*': 5,
    '/': 5
};

function parse_expression() {
    let first = offset;
    let operators = [];
    let want_op = false;

    while (offset < tokens.length) {
        let tok = tokens[offset];

        if (tok.type == 'boolean' ||
                tok.type == 'number' ||
                tok.type == 'string') {
            if (want_op)
                error(offset, 'Expected operator, not value');
            want_op = true;

            instruction('value', tok.value);
        } else if (tok.type == 'null') {
            if (want_op)
                error(offset, 'Expected operator, not value');
            want_op = true;

            instruction('value', null);
        } else if (tok.type == 'identifier') {
            if (want_op)
                error(offset, 'Expected operator, not value');
            want_op = true;

            if (tokens[offset + 1].type == '(') {
                let start = offset++;

                let func = functions[tok.value];
                if (func == null)
                    error(start, `Function "${tok.value}" does not exist`);

                let arity = 0;

                consume('(');
                match('eol');
                if (tokens[offset].type != ')') {
                    parse_expression();
                    arity++;
                    while (match(',')) {
                        match('eol');
                        parse_expression();
                        arity++;
                    }
                }
                match('eol');
                consume(')');

                if (arity != func.params.length)
                    error(start + 2, `Expected ${func.params.length} arguments, not ${arity}`);

                instruction('call', func.name);
                offset--;
            } else {
                let variable = find_variable(tok.value);
                if (variable == null)
                    error(offset, `Variable "${tok.value}" is not declared`);

                instruction('load', tok.value);
            }
        } else if (tok.type == '(') {
            if (want_op)
                error(offset, 'Expected operator, not value');

            operators.push('(');
        } else if (tok.type == ')') {
            if (!want_op)
                error(offset, 'Expected value, not ")"');

            let ok = false;

            while (operators.length) {
                let op = operators.pop();
                if (op == '(') {
                    ok = true;
                    break;
                }
                instruction(op);
            }

            if (!ok)
                break;
        } else if (tok.type == '[') {
            let start = offset++;
            match('eol');

            if (want_op) {
                parse_expression();
                instruction('index');
                match('eol');
                consume(']');
            } else {
                if (start > first)
                    error(start, 'Unexpected list definition');

                instruction('list');
                while (tokens[offset].type != ']') {
                    parse_expression();
                    instruction('append');

                    if (!match(','))
                        break;
                    match('eol');
                }
                match('eol');
                consume(']');
            }

            offset--;
        } else {
            let priority = priorities[tok.type];

            if (priority != null) { // Operator
                if (want_op) {
                    want_op = false;

                    while (operators.length) {
                        let op = operators[operators.length - 1];
                        if (priorities[op] <= priority)
                            break;
                        if (op == '(')
                            break;
                        instruction(op);
                        operators.length--;
                    }

                    operators.push(tok.type);
                } else {
                    if (tok.type == '+') {
                        // Nothing to do
                    } else if (tok.type == '-') {
                        operators.push('neg');
                    } else {
                        error(offset, 'Expected value, not operator');
                    }
                }
            } else {
                break;
            }
        }

        offset++;
    }

    if (offset == first)
        error(offset, `Unexpected token "${tokens[offset].type}", expected expression`);

    for (let i = operators.length - 1; i >= 0; i--) {
        let op = operators[i];
        if (op == '(')
            continue;
        instruction(op);
    }
}

// Utility

function find_variable(name) {
    let variable = current_func.variables[name];

    if (variable == null && current_func != default_func)
        variable = default_func.variables[name];

    return variable;
}

function instruction(code, value) {
    if (value !== undefined) {
        let instr = { code: code, value: value };
        current_func.instructions.push(instr);
        return instr;
    } else {
        let instr = { code: code };
        current_func.instructions.push(instr);
        return instr;
    }
}

function consume(type) {
    if (tokens[offset].type != type)
        error(offset, `Unexpected token "${tokens[offset].type}", expected "${type}"`);

    return tokens[offset++].value;
}

function match(type) {
    if (tokens[offset].type != type)
        return null;

    let value = tokens[offset++].value;

    if (value != null) {
        return value;
    } else {
        return true;
    }
}

function error(offset, message) {
    let line = tokens[offset].line;
    let str = `Line ${line}: ${message}`;
    throw new Error(str);
}
