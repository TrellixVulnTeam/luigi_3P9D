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

// General

export function log(value) {
    console.log(value);
}

// Strings

export function upper(str) {
    return str.toUpperCase();
}

export function lower(str) {
    return str.toLowerCase();
}

// Array

export function length(list) {
    if (!Array.isArray(list))
        throw new Error('Cannot take length of non-list');

    return list.length;
}

export function append(list, value) {
    if (!Array.isArray(list))
        throw new Error('Cannot append to non-list');

    list.push(value);
    return list;
}
