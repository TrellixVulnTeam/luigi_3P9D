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

let names = {};
let counter = 0;

export const EOL = token("EOL");

export const NULL = token("null");
export const BOOLEAN = token("boolean");
export const NUMBER = token("number");
export const STRING = token("string");

export const EQUAL = token("=");
export const NOT_EQUAL = token("!=");
export const LESS = token("<");
export const LESS_OR_EQUAL = token("<=");
export const GREATER = token(">");
export const GREATER_OR_EQUAL = token(">=");
export const OR = token("or");
export const AND = token("and");
export const NOT = token("not");
export const PLUS = token("+");
export const MINUS = token("-");
export const MULTIPLY = token("*");
export const DIVIDE = token("/");
export const LEFT_PARENTHESIS = token("(");
export const RIGHT_PARENTHESIS = token(")");

export const DOT = token(".");
export const DOTDOT = token("..");
export const COMMA = token(",");
export const LEFT_BRACKET = token("[");
export const RIGHT_BRACKET = token("]");
export const LEFT_BRACE = token("{");
export const RIGHT_BRACE = token("}");

export const FUNC = token("func");
export const IF = token("if");
export const THEN = token("then");
export const ELIF = token("elif");
export const ELSE = token("else");
export const WHILE = token("while");
export const FOR = token("for");
export const IN = token("in");
export const RETURN = token("return");
export const END = token("end");

export const IDENTIFIER = token("identifier");

function token(name) {
    let type = counter++;
    names[type] = name;
    return type;
}

export function get_name(type) {
    return names[type];
}
