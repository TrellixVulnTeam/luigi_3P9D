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

exports.is_object = function(obj) {
    if (typeof obj !== 'object')
        return false;
    if (Array.isArray(obj))
        return false;
    if (obj == null)
        return false;

    return true;
};

exports.Func = function(name, params = [], native = null) {
    this.name = name;
    this.params = params;

    if (native != null) {
        this.native = native;
    } else {
        this.instructions = [];
        this.variables = {};
    }
}
exports.Func.prototype.toString = function() {
    let str = `func ${this.name}(${this.params.join(',')})`;
    return str;
};

exports.get_type = function(value) {
    if (value == null) {
        return 'null';
    } else if (Number.isInteger(value)) {
        return 'integer';
    } else if (typeof value == 'number') {
        return 'number';
    } else if (typeof value == 'string') {
        return 'string';
    } else if (Array.isArray(value)) {
        return 'list';
    } else if (typeof value == 'object') {
        return 'object';
    } else {
        throw new Error('Unknown value type');
    }
};
