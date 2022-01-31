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

export function is_object(obj) {
    if (typeof obj !== 'object')
        return false;
    if (Array.isArray(obj))
        return false;
    if (obj == null)
        return false;

    return true;
}

export function Func(name, params = [], native = null) {
    this.name = name;
    this.params = params;

    if (native != null) {
        this.native = native;
    } else {
        this.instructions = [];
        this.variables = {};
    }
}
Func.prototype.toString = function() {
    let str = `func ${this.name}(${this.params.join(',')})`;
    return str;
};
