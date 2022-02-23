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

const token_types = require('./en_tokens.js');

let tokens;

exports.scan = function(code) {
    let file = {
        tokens: [],
        funcs: new Set
    };

    tokens = file.tokens;

    let line = 1;
    let funcs = [];

    for (let offset = 0; offset < code.length; offset++) {
        let c = code[offset];

        switch (c) {
            case ' ':
            case '\t':
            case '\r': {
                // Skip it
            } break;

            case '\n': {
                append(line, token_types.EOL);
                line++;
            } break;

            case '#': {
                while (offset < code.length && code[offset] != '\n')
                    offset++;
                offset--;
            } break;

            case '.': {
                if (code[offset + 1] < '0' || code[offset + 1] >= '9') {
                    append(line, token_types.DOT);
                    break;
                }
            } // fallthrough
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9': {
                let end = offset + 1;
                while (code[end] >= '0' && code[end] <= '9')
                    end++;
                if (code[end] == '.') {
                    end++;
                    while (code[end] >= '0' && code[end] <= '9')
                        end++;
                }

                let frag = code.substring(offset, end);
                let n = parseFloat(frag);

                append(line, token_types.NUMBER, n);

                offset = end - 1;
            } break;

            case '"':
            case '\'': {
                let str = '';

                while (code[++offset] != c) {
                    if (code[offset] == '\n') {
                        error(line, 'Unfinished string literal');
                        line++;
                    }
                    if (offset >= code.length)
                        error(line, 'Unfinished string literal');

                    if (code[offset] == '\\') {
                        switch (code[++offset]) {
                            case 'r': { str += '\r'; } break;
                            case 'n': { str += '\n'; } break;
                            case 't': { str += '\t'; } break;
                            case '"': { str += '"'; } break;
                            case '\'': { str += '\''; } break;
                            case '\\': { str += '\\'; } break;
                            default: { error(line, 'Invalid escape sequence'); } break;
                        }
                    } else {
                        str += code[offset];
                    }
                }

                append(line, token_types.STRING, str);
            } break;

            case '<': {
                if (code[offset + 1] == '=') {
                    append(line, token_types.LESS_OR_EQUAL);
                    offset++;
                } else {
                    append(line, token_types.LESS);
                }
            } break;
            case '>': {
                if (code[offset + 1] == '=') {
                    append(line, token_types.GREATER_OR_EQUAL);
                    offset++;
                } else {
                    append(line, token_types.GREATER);
                }
            } break;
            case '!': {
                if (code[offset + 1] == '=') {
                    append(line, token_types.NOT_EQUAL);
                    offset++;
                } else {
                    error(line, `Unsupported character "${c}" (did you mean "!="?)`);
                }
            } break;

            case '=': { append(line, token_types.EQUAL); } break;
            case '+': { append(line, token_types.PLUS); } break;
            case '-': { append(line, token_types.MINUS); } break;
            case '*': { append(line, token_types.MULTIPLY); } break;
            case '/': { append(line, token_types.DIVIDE); } break;
            case '%': { append(line, token_types.PERCENT); } break;
            case '[': { append(line, token_types.LEFT_BRACKET); } break;
            case ']': { append(line, token_types.RIGHT_BRACKET); } break;
            case '(': { append(line, token_types.LEFT_PARENTHESIS); } break;
            case ')': { append(line, token_types.RIGHT_PARENTHESIS); } break;
            case '{': { append(line, token_types.LEFT_BRACE); } break;
            case '}': { append(line, token_types.RIGHT_BRACE); } break;
            case ',': { append(line, token_types.COMMA); } break;

            default: {
                if ((c < 'a' || c > 'z') && (c < 'A' || c > 'Z') && c != '_')
                    error(line, `Unsupported character "${c}"`);

                let end = offset + 1;
                while ((code[end] >= 'a' && code[end] <= 'z') ||
                       (code[end] >= 'A' && code[end] <= 'Z') ||
                       (code[end] >= '0' && code[end] <= '9') ||
                       code[end] == '_')
                    end++;

                let frag = code.substring(offset, end);

                switch (frag) {
                    case 'null': { append(line, token_types.NULL, null); } break;
                    case 'false': { append(line, token_types.BOOLEAN, false); } break;
                    case 'true': { append(line, token_types.BOOLEAN, true); } break;

                    case 'func': {
                        append(line, token_types.FUNC);
                        funcs.push(tokens.length);
                    } break;
                    case 'if': { append(line, token_types.IF); } break;
                    case 'then': { append(line, token_types.THEN); } break;
                    case 'else': { append(line, token_types.ELSE); } break;
                    case 'end': { append(line, token_types.END); } break;
                    case 'or': { append(line, token_types.OR); } break;
                    case 'and': { append(line, token_types.AND); } break;
                    case 'not': { append(line, token_types.NOT); } break;
                    case 'while': { append(line, token_types.WHILE); } break;
                    case 'for': { append(line, token_types.FOR); } break;
                    case 'in': { append(line, token_types.IN); } break;
                    case 'to': { append(line, token_types.TO); } break;
                    case 'break': { append(line, token_types.BREAK); } break;
                    case 'continue': { append(line, token_types.CONTINUE); } break;
                    case 'return': { append(line, token_types.RETURN); } break;

                    default: {
                        if (frag.startsWith('__'))
                            error(line, 'Identifiers starting with "__" are not allowed');

                        append(line, token_types.IDENTIFIER, frag);
                    } break;
                }

                offset = end - 1;
            } break;
        }
    }

    // Always end with at least one EOL for parser simplicity
    append(line, token_types.EOL);

    for (let idx of funcs) {
        if (idx < tokens.length && tokens[idx].type == token_types.IDENTIFIER)
            file.funcs.add(tokens[idx].value);
    }

    return file;
};

// Utility

function append(line, type, value) {
    if (value != null) {
        let tok = { line: line, type: type, value: value };
        tokens.push(tok);
    } else {
        let tok = { line: line, type: type };
        tokens.push(tok);
    }
}

function error(line, message) {
    let str = `Line ${line}: ${message}`;
    throw new Error(str);
}
