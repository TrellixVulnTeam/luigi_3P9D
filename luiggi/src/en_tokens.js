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

let names = {};
let counter = 0;

Object.assign(exports, {
    EOL: token('EOL'),

    NULL: token('null'),
    BOOLEAN: token('boolean'),
    NUMBER: token('number'),
    STRING: token('string'),

    EQUAL: token('='),
    NOT_EQUAL: token('!='),
    LESS: token('<'),
    LESS_OR_EQUAL: token('<='),
    GREATER: token('>'),
    GREATER_OR_EQUAL: token('>='),
    OR: token('or'),
    AND: token('and'),
    NOT: token('not'),
    PLUS: token('+'),
    MINUS: token('-'),
    MULTIPLY: token('*'),
    DIVIDE: token('/'),
    PERCENT: token('%'),
    LEFT_PARENTHESIS: token('('),
    RIGHT_PARENTHESIS: token(')'),

    DOT: token('.'),
    COMMA: token(','),
    LEFT_BRACKET: token('['),
    RIGHT_BRACKET: token(']'),
    LEFT_BRACE: token('{'),
    RIGHT_BRACE: token('}'),

    FUNC: token('func'),
    IF: token('if'),
    THEN: token('then'),
    ELSE: token('else'),
    WHILE: token('while'),
    FOR: token('for'),
    IN: token('in'),
    TO: token('to'),
    BREAK: token('break'),
    CONTINUE: token('continue'),
    RETURN: token('return'),
    END: token('end'),

    IDENTIFIER: token('identifier')
});

function token(name) {
    let type = counter++;
    names[type] = name;
    return type;
}

exports.get_name = function(type) {
    return names[type];
};
