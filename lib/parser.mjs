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
import { Func } from './types.mjs';
import * as std_basic from './std/basic.mjs';
import * as std_graphics from './std/graphics.mjs';

let functions;
let default_func;
let current_func;
let calls;

let tokens;
let offset;
let line;

let loops;

export function parse(_tokens) {
    functions = {};

    import_natives(functions, std_basic);
    import_natives(functions, std_graphics);

    default_func = new Func('.');
    current_func = default_func;
    functions['.'] = default_func;
    calls = [];

    default_func.memory = {};
    for (let name in functions) {
        if (name == '.')
            continue;

        let func = functions[name];

        default_func.variables[name] = {
            name: name,
            global: true,
            constant: true
        };
        default_func.memory[name] = func;
    }

    tokens = _tokens;
    offset = 0;
    line = tokens.length ? tokens[0].line : 0;

    loops = [];

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
        let signature = code.match(/\(([a-zA-Z0-9_ ,]*)\)/)[1].trim();
        let params = signature.length ? signature.split(',').map(param => param.trim()) : [];

        let func = new Func(name, params, native);
        functions[name] = func;
    }
}

function parse_code(enders) {
    while (offset < tokens.length) {
        let tok = tokens[offset];
        line = tok.line;

        if (enders.includes(tok.type))
            break;

        switch (tok.type) {
            case token_types.EOL: { offset++; } break;

            case token_types.IDENTIFIER: { parse_assign(); } break;
            case token_types.FUNC: { parse_func(); } break;
            case token_types.IF: { parse_if(); } break;
            case token_types.WHILE: { parse_while(); } break;
            case token_types.FOR: { parse_for(); } break;
            case token_types.BREAK: { parse_break(); } break;
            case token_types.CONTINUE: { parse_continue(); } break;
            case token_types.RETURN: { parse_return(); } break;

            default: {
                parse_expression();
                emit(opcodes.POP, 1);

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
        emit(opcodes.POP, 1);

        consume(token_types.EOL);
        return;
    }

    let name = consume(token_types.IDENTIFIER);
    let variable = find_variable(name);

    if (match(token_types.EQUAL)) {
        if (variable != null) {
            if (variable.constant)
                error(start, `Cannot assign to constant variable "${variable.name}"`);
        } else {
            variable = {
                name: name,
                global: current_func == default_func,
                constant: name[0] >= 'A' && name[0] <= 'Z'
            };
            current_func.variables[name] = variable;
        }

        parse_expression();

        if (variable.constant)
            emit(opcodes.FREEZE);

        let opcode = variable.global ? opcodes.STORE_GLOBAL : opcodes.STORE_LOCAL;
        emit(opcode, name);
    } else if (match(token_types.LEFT_BRACKET)) {
        if (variable == null)
            error(start, `Variable "${name}" does not exist`);
        if (variable.constant)
            error(start, `Cannot modify constant variable "${variable.name}"`);

        emit_load(variable);

        parse_expression();
        consume(token_types.RIGHT_BRACKET);

        consume(token_types.EQUAL);
        parse_expression();

        emit(opcodes.LIST_SET);
    } else if (match(token_types.DOT)) {
        if (variable == null)
            error(start, `Variable "${name}" does not exist`);
        if (variable.constant)
            error(start, `Cannot modify constant variable "${variable.name}"`);

        emit_load(variable);

        let member = consume(token_types.IDENTIFIER);

        consume(token_types.EQUAL);
        parse_expression();

        emit(opcodes.OBJ_SET, member);
    } else

    consume(token_types.EOL);
}

function parse_func() {
    let start = offset++;

    let name = consume(token_types.IDENTIFIER);
    let func = new Func(name);

    if (current_func != default_func)
        error(start, "Nested functions are not allowed");
    if (default_func.variables[func.name] != null) {
        if (functions[func.name] != null) {
            error(start + 1, `Function "${func.name}" already exists`);
        } else {
            error(start + 1, `Identifier "${func.name}" is already used`);
        }
    }

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
            global: false,
            constant: false
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

    default_func.variables[func.name] = {
        name: func.name,
        global: true,
        constant: true
    };
    default_func.memory[func.name] = func;

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
            case token_types.BREAK: { parse_break(); } break;
            case token_types.CONTINUE: { parse_continue(); } break;
            case token_types.RETURN: { parse_return(); } break;

            default: {
                parse_expression();
                emit(opcodes.POP, 1);

                consume(token_types.EOL);
            } break;
        }

        branch.value = current_func.instructions.length;
    } else {
        consume(token_types.EOL);

        parse_code([token_types.END, token_types.ELSE]);

        if (match(token_types.ELSE)) {
            jumps.push(emit(opcodes.JUMP));
            branch.value = current_func.instructions.length;

            do {
                if (match(token_types.IF)) {
                    parse_expression();
                    branch = emit(opcodes.BRANCH);
                    consume(token_types.EOL);
                    parse_code([token_types.END, token_types.ELSE]);
                    jumps.push(emit(opcodes.JUMP));
                    branch.value = current_func.instructions.length;
                } else {
                    consume(token_types.EOL);
                    parse_code([token_types.END]);

                    break;
                }
            } while (match(token_types.ELSE));
        } else {
            branch.value = current_func.instructions.length;
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

    start_loop(0);

    addr = current_func.instructions.length;
    parse_expression();
    consume(token_types.EOL);
    branch = emit(opcodes.BRANCH);

    parse_code([token_types.END]);
    emit(opcodes.JUMP, addr);
    branch.value = current_func.instructions.length;

    end_loop();

    consume(token_types.END);
    consume(token_types.EOL);
}

function parse_for() {
    let start = offset++;

    let opcode;
    let addr;
    let begin;

    let name = consume(token_types.IDENTIFIER);

    if (current_func.variables[name] == null) {
        let variable = {
            name: name,
            global: current_func == default_func,
            constant: false
        };
        current_func.variables[name] = variable;
    }

    start_loop(3);

    consume(token_types.IN);
    parse_expression();
    if (match(token_types.TO)) {
        parse_expression();
        opcode = opcodes.STEP_RANGE;

        begin = emit(opcodes.PUSH);
    } else {
        opcode = opcodes.STEP_LIST;

        begin = emit(opcodes.PUSH);
        emit(opcodes.PUSH, -1);
    }
    consume(token_types.EOL);

    addr = current_func.instructions.length;
    emit(opcode, name);
    parse_code([token_types.END]);
    emit(opcodes.JUMP, addr);
    begin.value = current_func.instructions.length;

    end_loop();

    consume(token_types.END);
    consume(token_types.EOL);
}

function start_loop(pop) {
    let loop = {
        breaks: [],
        pop: pop,
        continue: current_func.instructions.length
    };

    loops.push(loop);
}

function end_loop() {
    let loop = loops.pop();

    for (let jump of loop.breaks)
        jump.value = current_func.instructions.length;
}

function parse_break() {
    let start = offset++;

    let loop = loops[loops.length - 1];
    if (loop == null)
        error(start, 'Use of break is invalid outside of loop');

    if (loop.pop > 0)
        emit(opcodes.POP, loop.pop);

    let jump = emit(opcodes.JUMP);
    loop.breaks.push(jump);

    consume(token_types.EOL);
}

function parse_continue() {
    let start = offset++;

    let loop = loops[loops.length - 1];
    if (loop == null)
        error(start, 'Use of continue is invalid outside of loop');

    emit(opcodes.JUMP, loop.continue);

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

            let variable = find_variable(tok.value);
            let call = (tokens[offset + 1].type == token_types.LEFT_PARENTHESIS);

            if (variable != null) {
                if (call && variable.constant && functions[tok.value] != null) {
                    parse_call(tok.value);
                } else {
                    emit_load(variable);
                }
            } else {
                if (call) {
                    parse_call(tok.value);
                } else {
                    error(offset, `Variable "${tok.value}" does not exist`);
                }
            }
        } else if (tok.type == token_types.LEFT_PARENTHESIS) {
            if (want_op) {
                offset--;
                parse_call(null);
            } else {
                pending_operators.push(token_types.LEFT_PARENTHESIS);
                parentheses++;
            }
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

function parse_call(name) {
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

    if (name != null) {
        let call = {
            offset: start,
            name: name,
            arity: arity
        };
        calls.push(call);

        emit(opcodes.CALL, name);
    } else {
        emit(opcodes.CALL_INDIRECT, arity);
    }

    offset--;
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
            case token_types.PERCENT:          return { priority: 5, code: opcodes.MODULO, right: false };
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
        let inst = { code: code, value: value, line: line };
        current_func.instructions.push(inst);
        return inst;
    } else {
        let inst = { code: code, line: line };
        current_func.instructions.push(inst);
        return inst;
    }
}

function consume(type) {
    if (tokens[offset].type != type)
        error(offset, `Unexpected token "${token_types.get_name(tokens[offset].type)}", expected "${token_types.get_name(type)}"`);

    let value = tokens[offset].value;

    if (++offset < tokens.length)
        line = tokens[offset].line;

    return value;
}

function match(type) {
    if (tokens[offset].type != type)
        return null;

    let value = tokens[offset].value;

    if (++offset < tokens.length)
        line = tokens[offset].line;

    return (value != null) ? value : true;
}

function skip_eol() {
    if (match(token_types.EOL)) {
        while (offset < tokens.length && match(token_types.EOL));
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
