let functions;
let default_func;
let current_func;

let tokens;
let offset;

export function parse(tokens2) {
    functions = [];
    default_func = {
        name: '!default',
        params: [],
        instructions: []
    };
    current_func = default_func;
    functions.push(default_func);

    tokens = tokens2;
    offset = 0;

    parse_code();

    return functions;
}

function parse_code() {
    while (offset < tokens.length) {
        let tok = tokens[offset++];

        if (tok.type == 'identifier') {
            parse_declaration();
        } else if (tok.type == 'if') {
            parse_if();
        } else if (tok.type == 'func') {
            parse_func();
        } else if (tok.type == 'end') {
            if (current_func == default_func)
                error(tok.line, "Unexpected token 'end'");

            current_func = default_func;
        } else {
            parse_expression();
        }
    }
}

function parse_declaration() {
    let variable = {};

    variable.name = consume('identifier');
    consume('=');
    parse_expression();
}

function parse_if() {
    parse_expression();
    consume('end_of_line');
    parse_code();

    while (match('elif')) {
        parse_expression();
        consume('end_of_line');
        parse_code();
    }

    if (match('else')) {
        consume('end_of_line');
        parse_code();
    }

    consume('end');
    consume('end_of_line');
}

function parse_func() {
    let func = {};

    if (current_func != default_func)
        error(tok.line, "Nested functions are not allowed");

    func.name = consume('identifier');
    func.params = [];
    func.instructions = [];

    consume('(');
    while (offset < tokens.length) {
        let param = match('identifier');
        if (param == null)
            break;
        func.params.push(param);

        if (!match(','))
            break;
    }
    consume(')');
    consume('end_of_line');

    functions.push(func);
    current_func = func;
}

// Expressions

function parse_expression() {
    
}

// Utility

function consume(type) {
    if (tokens[offset].type != type)
        error(tokens[offset].line, `Unexpected token "${tokens[offset].type}", expected "${type}"`);

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

function error(line, message) {
    let str = `Line ${line}: ${message}`;
    throw new Error(str);
}
