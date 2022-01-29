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

import * as token_types from './enums/tokens.mjs';
import * as opcodes from './enums/opcodes.mjs';
import * as std_basic from './std/basic.mjs';
import * as std_graphics from './std/graphics.mjs';

let functions;
let default_func;
let current_func;
let calls;

let tokens;
let offset;

export function parse(_tokens) {
    functions = {};

    import_natives(functions, std_basic);
    import_natives(functions, std_graphics);

    default_func = {
        name: '.',
        params: [],
        instructions: [],
        variables: {}
    };
    current_func = default_func;
    functions['.'] = default_func;
    calls = [];

    tokens = _tokens;
    offset = 0;

    parse_code([]);

    // Check function calls at the end to support forward calls
    for (let call of calls) {
        let func = functions[call.name];

        if (func == null)
            error(call.offset, `Function "${call.name}" does not exist`);
        if (call.arity != func.params.length)
            error(call.offset + 2, `Function "${func.name}" expects ${func.params.length} arguments, not ${call.arity}`);
    }

    return functions;
}

function import_natives(functions, natives) {
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
}

function parse_code(enders) {
    while (offset < tokens.length) {
        let tok = tokens[offset];

        if (enders.includes(tok.type))
            break;

        switch (tok.type) {
            case token_types.EOL: { offset++; } break;
            case token_types.IDENTIFIER: { parse_assign(); } break;
            case token_types.FUNC: { parse_func(); } break;
            case token_types.IF: { parse_if(); } break;
            case token_types.WHILE: { parse_while(); } break;
            case token_types.RETURN: { parse_return(); } break;

            default: {
                parse_expression();
                emit(opcodes.POP);

                consume(token_types.EOL);
            } break;
        }
    }
}

function parse_assign() {
    let start = offset;

    if (tokens[offset + 1].type != token_types.EQUAL &&
            tokens[offset + 1].type != token_types.LEFT_BRACKET &&
            tokens[offset + 1].type != token_types.DOT) {
        parse_expression();
        emit(opcodes.POP);

        consume(token_types.EOL);
        return;
    }

    let name = consume(token_types.IDENTIFIER);
    let variable = find_variable(name);

    if (match(token_types.EQUAL)) {
        if (variable == null) {
            variable = {
                name: name,
                global: current_func == default_func
            };
            current_func.variables[name] = variable;
        }

        parse_expression();

        let opcode = variable.global ? opcodes.STORE_GLOBAL : opcodes.STORE_LOCAL;
        emit(opcode, name);
    } else if (match(token_types.LEFT_BRACKET)) {
        if (variable == null)
            error(start, `Variable "${name}" does not exist`);

        emit_load(variable);

        parse_expression();
        consume(token_types.RIGHT_BRACKET);

        consume(token_types.EQUAL);
        parse_expression();

        emit(opcodes.LIST_SET);
    } else if (match(token_types.DOT)) {
        if (variable == null)
            error(start, `Variable "${name}" does not exist`);

        emit_load(variable);

        let member = consume(token_types.IDENTIFIER);

        consume(token_types.EQUAL);
        parse_expression();

        emit(opcodes.OBJ_SET, member);
    } else

    consume(token_types.EOL);
}

function parse_if() {
    offset++;

    let jumps = [];
    let branch;

    parse_expression();
    branch = emit(opcodes.BRANCH);

    if (match(token_types.THEN)) {
        switch (tokens[offset].type) {
            case token_types.IDENTIFIER: { parse_assign(); } break;
            case token_types.RETURN: { parse_return(); } break;

            default: {
                parse_expression();
                emit(opcodes.POP);

                consume(token_types.EOL);
            } break;
        }

        branch.value = current_func.instructions.length;
    } else {
        consume(token_types.EOL);

        parse_code([token_types.END, token_types.ELIF, token_types.ELSE]);
        jumps.push(emit(opcodes.JUMP));
        branch.value = current_func.instructions.length;

        while (match(token_types.ELIF)) {
            parse_expression();
            branch = emit(opcodes.BRANCH);
            consume(token_types.EOL);
            parse_code([token_types.END, token_types.ELIF, token_types.ELSE]);
            jumps.push(emit(opcodes.JUMP));
            branch.value = current_func.instructions.length;
        }

        if (match(token_types.ELSE)) {
            consume(token_types.EOL);
            parse_code([token_types.END]);
        }

        consume(token_types.END);
    }

    for (let jump of jumps)
        jump.value = current_func.instructions.length;
}

function parse_while() {
    offset++;

    let addr;
    let branch;

    addr = current_func.instructions.length;
    parse_expression();
    consume(token_types.EOL);
    branch = emit(opcodes.BRANCH);

    parse_code([token_types.END]);
    emit(opcodes.JUMP, addr);
    branch.value = current_func.instructions.length;

    consume(token_types.END);
    consume(token_types.EOL);
}

function parse_func() {
    let start = offset++;

    let func = {
        name: consume(token_types.IDENTIFIER),
        params: [],
        instructions: [],
        variables: {}
    };

    if (current_func != default_func)
        error(start, "Nested functions are not allowed");
    if (functions[func.name] != null)
        error(start + 1, `Function "${func.name}" already exists`);

    consume(token_types.LEFT_PARENTHESIS);
    while (offset < tokens.length) {
        let param = match(token_types.IDENTIFIER);
        if (param == null)
            break;

        if (func.variables[param] != null)
            error(offset - 1, `Parameter name "${param}" is already used`);

        func.params.push(param);
        func.variables[param] = {
            name: param,
            global: false
        };

        if (!match(token_types.COMMA))
            break;
        skip_eol();
    }
    consume(token_types.RIGHT_PARENTHESIS);
    consume(token_types.EOL);

    functions[func.name] = func;

    current_func = func;
    parse_code([token_types.END]);
    consume(token_types.END);
    current_func = default_func;

    consume(token_types.EOL);
}

function parse_return() {
    offset++;

    if (match(token_types.EOL)) {
        emit(opcodes.PUSH, null);
    } else {
        parse_expression();
        consume(token_types.EOL);
    }

    emit(opcodes.RETURN);
}

// Expressions

function parse_expression() {
    let first = offset;
    let pending_operators = [];
    let want_op = false;
    let parentheses = 0;

    while (offset < tokens.length) {
        let tok = tokens[offset];

        if (tok.type == token_types.BOOLEAN ||
                tok.type == token_types.NUMBER ||
                tok.type == token_types.STRING ||
                tok.type == token_types.NULL) {
            if (want_op)
                error(offset, 'Expected operator, not value');
            want_op = true;

            emit(opcodes.PUSH, tok.value);
        } else if (tok.type == token_types.IDENTIFIER) {
            if (want_op)
                error(offset, 'Expected operator, not value');
            want_op = true;

            if (tokens[offset + 1].type == token_types.LEFT_PARENTHESIS) {
                let start = offset++;

                let arity = 0;

                consume(token_types.LEFT_PARENTHESIS);
                skip_eol();
                if (tokens[offset].type != token_types.RIGHT_PARENTHESIS) {
                    parse_expression();
                    arity++;
                    while (match(token_types.COMMA)) {
                        skip_eol();
                        parse_expression();
                        arity++;
                    }
                }
                skip_eol();
                consume(token_types.RIGHT_PARENTHESIS);

                let call = {
                    offset: start,
                    name: tok.value,
                    arity: arity
                };
                calls.push(call);

                emit(opcodes.CALL, tok.value);
                offset--;
            } else {
                let variable = find_variable(tok.value);
                if (variable == null)
                    error(offset, `Variable "${tok.value}" does not exist`);

                emit_load(variable);
            }
        } else if (tok.type == token_types.LEFT_PARENTHESIS) {
            if (want_op)
                error(offset, 'Expected operator, not value');

            pending_operators.push(token_types.LEFT_PARENTHESIS);
            parentheses++;
        } else if (tok.type == token_types.RIGHT_PARENTHESIS) {
            if (!want_op)
                error(offset, 'Expected value, not ")"');

            if (!parentheses) {
                if (offset == first) {
                    error(offset, "Unexpected token ')', expected value or expression");
                } else {
                    break;
                }
            }

            while (pending_operators.length) {
                let pending = pending_operators.pop();
                if (pending == token_types.LEFT_PARENTHESIS) {
                    parentheses--;
                    break;
                }
                emit_operator(pending);
            }
        } else if (tok.type == token_types.LEFT_BRACKET) {
            let start = offset++;
            skip_eol();

            if (want_op) {
                parse_expression();
                emit(opcodes.LIST_GET);
                skip_eol();
                consume(token_types.RIGHT_BRACKET);
            } else {
                want_op = true;

                if (start > first)
                    error(start, 'Unexpected list definition');

                emit(opcodes.LIST_NEW);
                while (tokens[offset].type != token_types.RIGHT_BRACKET) {
                    parse_expression();
                    emit(opcodes.LIST_APPEND);

                    if (!match(token_types.COMMA) && !match(token_types.EOL))
                        break;
                    skip_eol();
                }
                skip_eol();
                consume(token_types.RIGHT_BRACKET);
            }

            offset--;
        } else if (tok.type == token_types.LEFT_BRACE) {
            let start = offset++;
            skip_eol();

            if (want_op)
                error(start, 'Unexpected token "{", expected operator');
            want_op = true;

            emit(opcodes.OBJ_NEW);
            while (tokens[offset].type != token_types.RIGHT_BRACE) {
                let member = consume(token_types.IDENTIFIER);
                consume(token_types.EQUAL);
                skip_eol();
                parse_expression();
                emit(opcodes.OBJ_APPEND, member);

                if (!match(token_types.COMMA) && !match(token_types.EOL))
                    break;
                skip_eol();
            }
            skip_eol();
            consume(token_types.RIGHT_BRACE);

            offset--;
        } else if (tok.type == token_types.DOT) {
            let start = offset++;

            if (!want_op)
                error(start, 'Unexpected token ".", expected value');

            let member = consume(token_types.IDENTIFIER);
            emit(opcodes.OBJ_GET, member);

            offset--;
        } else {
            let op = find_operator(tok.type, want_op);

            if (op == null) {
                if (offset == first) {
                    error(offset, `Unexpected token "${token_types.get_name(tokens[offset].type)}", expected expression`);
                } else if (!want_op || parentheses) {
                    if (skip_eol()) {
                        continue;
                    } else {
                        error(offset, `Unexpected token "${token_types.get_name(tokens[offset].type)}", expected ${want_op ? 'operator' : 'value'}`);
                    }
                } else {
                    break;
                }
            }
            want_op = false;

            while (pending_operators.length) {
                let pending = pending_operators[pending_operators.length - 1];

                if (pending == token_types.LEFT_PARENTHESIS)
                    break;
                if (pending.priority - pending.right < op.priority)
                    break;

                emit_operator(pending);
                pending_operators.length--;
            }

            if (op.code == 'and') {
                op = Object.assign({}, op);
                op.skip = emit(opcodes.SKIP_AND);
            } else if (op.code == 'or') {
                op = Object.assign({}, op);
                op.skip = emit(opcodes.SKIP_OR);
            }

            pending_operators.push(op);
        }

        offset++;
    }

    if (offset == first)
        error(offset, `Unexpected token "${token_types.get_name(tokens[offset].type)}", expected expression`);

    for (let i = pending_operators.length - 1; i >= 0; i--) {
        let pending = pending_operators[i];
        emit_operator(pending);
    }
}

function find_operator(type, want_op) {
    if (want_op) {
        switch (type) {
            case token_types.OR:               return { priority: 0, code: opcodes.OR, right: false };
            case token_types.AND:              return { priority: 1, code: opcodes.AND, right: false };
            case token_types.LESS:             return { priority: 3, code: opcodes.LESS, right: false };
            case token_types.LESS_OR_EQUAL:    return { priority: 3, code: opcodes.LESS_OR_EQUAL, right: false };
            case token_types.GREATER:          return { priority: 3, code: opcodes.GREATER, right: false };
            case token_types.GREATER_OR_EQUAL: return { priority: 3, code: opcodes.GREATER_OR_EQUAL, right: false };
            case token_types.EQUAL:            return { priority: 3, code: opcodes.EQUAL, right: false };
            case token_types.NOT_EQUAL:        return { priority: 3, code: opcodes.NOT_EQUAL, right: false };
            case token_types.PLUS:             return { priority: 4, code: opcodes.ADD, right: false };
            case token_types.MINUS:            return { priority: 4, code: opcodes.SUBSTRACT, right: false };
            case token_types.MULTIPLY:         return { priority: 5, code: opcodes.MULTIPLY, right: false };
            case token_types.DIVIDE:           return { priority: 5, code: opcodes.DIVIDE, right: false };
        }
    } else {
        switch (type) {
            case token_types.PLUS:             return { priority: 6, code: null, right: true };
            case token_types.MINUS:            return { priority: 6, code: opcodes.NEGATE, right: true };
            case token_types.NOT:              return { priority: 2, code: opcodes.NOT, right: true };
        }
    }
}

function emit_load(variable) {
    let opcode = variable.global ? opcodes.LOAD_GLOBAL : opcodes.LOAD_LOCAL;
    emit(opcode, variable.name);
}

function emit_operator(op) {
    if (op.code != null)
        emit(op.code);
    if (op.skip != null)
        op.skip.value = current_func.instructions.length;
}

// Utility

function find_variable(name) {
    let variable = current_func.variables[name];

    if (variable == null && current_func != default_func)
        variable = default_func.variables[name];

    return variable;
}

function emit(code, value) {
    if (value !== undefined) {
        let inst = { code: code, value: value };
        current_func.instructions.push(inst);
        return inst;
    } else {
        let inst = { code: code };
        current_func.instructions.push(inst);
        return inst;
    }
}

function consume(type) {
    if (tokens[offset].type != type)
        error(offset, `Unexpected token "${token_types.get_name(tokens[offset].type)}", expected "${type}"`);

    let value = tokens[offset++].value;
    return value;
}

function match(type) {
    if (tokens[offset].type != type)
        return null;

    let value = tokens[offset++].value;
    return (value != null) ? value : true;
}

function skip_eol() {
    if (match(token_types.EOL)) {
        while (match(token_types.EOL));
        return true;
    } else {
        return false;
    }
}

function error(offset, message) {
    let line = tokens[offset].line;
    let str = `Line ${line}: ${message}`;
    throw new Error(str);
}
