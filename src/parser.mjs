import { library } from './library.mjs';

let functions;
let default_func;
let current_func;

let tokens;
let offset;

export function parse(_tokens) {
    functions = {};
    Object.assign(functions, library);

    default_func = {
        name: '!default',
        params: [],
        instructions: [],
        variables: {}
    };
    current_func = default_func;
    functions['!default'] = default_func;

    tokens = _tokens;
    offset = 0;

    parse_code([]);

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
        } else if (tok.type == 'func') {
            parse_func();
        } else if (tok.type == 'return') {
            parse_return();
        } else if (tok.type == 'end_of_line') {
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

    consume('end_of_line');
}

function parse_if() {
    offset++;

    let jumps = [];
    let branch;

    parse_expression();
    branch = instruction('branch');
    consume('end_of_line');
    parse_code(['end', 'elif', 'else']);
    jumps.push(instruction('jump'));
    branch.value = current_func.instructions.length;

    while (match('elif')) {
        parse_expression();
        branch = instruction('branch');
        consume('end_of_line');
        parse_code(['end', 'elif', 'else']);
        jumps.push(instruction('jump'));
        branch.value = current_func.instructions.length;
    }

    if (match('else')) {
        consume('end_of_line');
        parse_code(['end']);
    }

    for (let jump of jumps)
        jump.value = current_func.instructions.length;

    consume('end');
    consume('end_of_line');
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
    }
    consume(')');
    consume('end_of_line');

    functions[func.name] = func;

    current_func = func;
    parse_code(['end']);
    instruction('value', null);
    instruction('return');
    consume('end');
    current_func = default_func;

    consume('end_of_line');
}

function parse_return() {
    offset++;

    if (match('end_of_line')) {
        instruction('value', null);
    } else {
        parse_expression();
        consume('end_of_line');
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
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
    '<': 3,
    '<=': 3,
    '>': 3,
    '>=': 3,
    '=': 3,
    'or': 4,
    'and': 5
};

function parse_expression() {
    let start = offset;
    let operators = [];

    while (offset < tokens.length) {
        let tok = tokens[offset];

        if (tok.type == 'boolean' ||
                tok.type == 'number' ||
                tok.type == 'string') {
            instruction('value', tok.value);
        } else if (tok.type == 'null') {
            instruction('value', null);
        } else if (tok.type == 'identifier') {
            if (tokens[offset + 1].type == '(') {
                let start = offset++;

                let func = functions[tok.value];
                if (func == null)
                    error(start, `Function "${tok.value}" does not exist`);

                let arity = 0;

                consume('(');
                if (tokens[offset].type != ')') {
                    parse_expression();
                    arity++;
                    while (match(',')) {
                        parse_expression();
                        arity++;
                    }
                }
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
            operators.push('(');
        } else if (tok.type == ')') {
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
        } else {
            let priority = priorities[tok.type];

            if (priority != null) { // Operator
                while (operators.length) {
                    let op = operators[operators.length - 1];
                    if (priorities[op] <= priority)
                        break;
                    if (op == '(')
                        break;
                    operators.length--;
                }

                operators.push(tok.type);
            } else {
                break;
            }
        }

        offset++;
    }

    if (offset == start)
        error(offset, `Unexpected token "${tokens[offset].type}", expected expression`);

    for (let i = operators.length - 1; i >= 0; i--) {
        let op = operators[i];
        if (op != '(')
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
