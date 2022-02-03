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

module.exports = {
    PUSH: opcode('PUSH'),
    POP: opcode('POP'),

    FREEZE: opcode('FREEZE'),
    LOAD_GLOBAL: opcode('LOAD_GLOBAL'),
    LOAD_LOCAL: opcode('LOAD_LOCAL'),
    STORE_GLOBAL: opcode('STORE_GLOBAL'),
    STORE_LOCAL: opcode('STORE_LOCAL'),

    LIST_NEW: opcode('LIST_NEW'),
    LIST_APPEND: opcode('LIST_APPEND'),
    LIST_SET: opcode('LIST_SET'),
    LIST_GET: opcode('LIST_GET'),

    OBJ_NEW: opcode('OBJ_NEW'),
    OBJ_APPEND: opcode('OBJ_APPEND'),
    OBJ_SET: opcode('OBJ_SET'),
    OBJ_GET: opcode('OBJ_GET'),

    ADD: opcode('ADD'),
    SUBSTRACT: opcode('SUBSTRACT'),
    MULTIPLY: opcode('MULTIPLY'),
    DIVIDE: opcode('DIVIDE'),
    MODULO: opcode('MODULO'),
    NEGATE: opcode('NEGATE'),
    EQUAL: opcode('EQUAL'),
    NOT_EQUAL: opcode('NOT_EQUAL'),
    LESS: opcode('LESS'),
    LESS_OR_EQUAL: opcode('LESS_OR_EQUAL'),
    GREATER: opcode('GREATER'),
    GREATER_OR_EQUAL: opcode('GREATER_OR_EQUAL'),
    OR: opcode('OR'),
    AND: opcode('AND'),
    NOT: opcode('NOT'),

    JUMP: opcode('JUMP'),
    BRANCH: opcode('BRANCH'),
    SKIP_OR: opcode('SKIP_OR'),
    SKIP_AND: opcode('SKIP_AND'),

    STEP_RANGE: opcode('STEP_RANGE'),
    STEP_LIST: opcode('STEP_LIST'),

    CALL: opcode('CALL'),
    CALL_INDIRECT: opcode('CALL_INDIRECT'),
    RETURN: opcode('RETURN')
};

function opcode(name) {
    let code = counter++;
    names[code] = name;
    return code;
}

exports.get_name = function(code) {
    return names[code];
};
