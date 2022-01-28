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

export function scan(code) {
    let tokens = [];

    for (let offset = 0, line = 1; offset < code.length; offset++) {
        let c = code[offset];

        if (c == ' ' || c == '\t' || c == '\r') {
            // Skip it
        } else if (c == '\n') {
            tokens.push(token(line, 'EOL'));
            line++;
        } else if (c == '#') {
            while (offset < code.length && code[offset] != '\n')
                offset++;
            offset--;
        } else if ((c >= '0' && c <= '9') || (c == '.' && code[offset + 1] >= '0'
                                                       && code[offset + 1] <= '9')) {
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

            tokens.push(token(line, 'number', n));

            offset = end - 1;
        } else if (c == '"' || c == '\'') {
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

            tokens.push(token(line, 'string', str));
        } else if (c == '<' && code[offset + 1] == '=') {
            tokens.push(token(line, '<='));
            offset++;
        } else if (c == '>' && code[offset + 1] == '=') {
            tokens.push(token(line, '>='));
            offset++;
        } else if (c == '!' && code[offset + 1] == '=') {
            tokens.push(token(line, '!='));
            offset++;
        } else if (c == '=' ||
                   c == '+' ||
                   c == '-' ||
                   c == '*' ||
                   c == '/' ||
                   c == '<' ||
                   c == '>' ||
                   c == '[' ||
                   c == ']' ||
                   c == '(' ||
                   c == ')' ||
                   c == '{' ||
                   c == '}' ||
                   c == '.' ||
                   c == ',') {
            tokens.push(token(line, c));
        } else if ((c >= 'a' && c <= 'z') ||
                   (c >= 'A' && c <= 'Z') ||
                   c == '_') {
            let end = offset + 1;
            while ((code[end] >= 'a' && code[end] <= 'z') ||
                   (code[end] >= 'A' && code[end] <= 'Z') ||
                   (code[end] >= '0' && code[end] <= '9') ||
                   code[end] == '_')
                end++;

            let frag = code.substring(offset, end);

            if (frag == 'if' ||
                    frag == 'then' ||
                    frag == 'else' ||
                    frag == 'elif' ||
                    frag == 'end' ||
                    frag == 'or' ||
                    frag == 'and' ||
                    frag == 'not' ||
                    frag == 'while' ||
                    frag == 'for' ||
                    frag == 'in' ||
                    frag == 'func' ||
                    frag == 'return' ||
                    frag == 'null') {
                tokens.push(token(line, frag));
            } else if (frag == 'true') {
                tokens.push(token(line, 'boolean', true));
            } else if (frag == 'false') {
                tokens.push(token(line, 'boolean', false));
            } else {
                if (frag.startsWith('__'))
                    error(line, 'Identifiers starting with "__" are not allowed');

                tokens.push(token(line, 'identifier', frag));
            }

            offset = end - 1;
        } else {
            error(line, `Unsupported character "${c}"`);
        }
    }

    return tokens;
}

// Utility

function token(line, type, value) {
    if (value != null) {
        return { line: line, type: type, value: value };
    } else {
        return { line: line, type: type };
    }
}

function error(line, message) {
    let str = `Line ${line}: ${message}`;
    throw new Error(str);
}
