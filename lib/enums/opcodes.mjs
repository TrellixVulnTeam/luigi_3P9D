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

export const PUSH = opcode('PUSH');
export const POP = opcode('POP');

export const LOAD_GLOBAL = opcode('LOAD_GLOBAL');
export const LOAD_LOCAL = opcode('LOAD_LOCAL');
export const STORE_GLOBAL = opcode('STORE_GLOBAL');
export const STORE_LOCAL = opcode('STORE_LOCAL');

export const LIST_NEW = opcode('LIST_NEW');
export const LIST_APPEND = opcode('LIST_APPEND');
export const LIST_SET = opcode('LIST_SET');
export const LIST_GET = opcode('LIST_GET');

export const OBJ_NEW = opcode('OBJ_NEW');
export const OBJ_APPEND = opcode('OBJ_APPEND');
export const OBJ_SET = opcode('OBJ_SET');
export const OBJ_GET = opcode('OBJ_GET');

export const ADD = opcode('ADD');
export const SUBSTRACT = opcode('SUBSTRACT');
export const MULTIPLY = opcode('MULTIPLY');
export const DIVIDE = opcode('DIVIDE');
export const NEGATE = opcode('NEGATE');
export const EQUAL = opcode('EQUAL');
export const NOT_EQUAL = opcode('NOT_EQUAL');
export const LESS = opcode('LESS');
export const LESS_OR_EQUAL = opcode('LESS_OR_EQUAL');
export const GREATER = opcode('GREATER');
export const GREATER_OR_EQUAL = opcode('GREATER_OR_EQUAL');
export const OR = opcode('OR');
export const AND = opcode('AND');
export const NOT = opcode('NOT');

export const JUMP = opcode('JUMP');
export const BRANCH = opcode('BRANCH');
export const SKIP_OR = opcode('SKIP_OR');
export const SKIP_AND = opcode('SKIP_AND');

export const STEP_RANGE = opcode('STEP_RANGE');
export const STEP_LIST = opcode('STEP_LIST');

export const CALL = opcode('CALL');
export const RETURN = opcode('RETURN');

function opcode(name) {
    let code = counter++;
    names[code] = name;
    return code;
}

export function get_name(code) {
    return names[code];
}
