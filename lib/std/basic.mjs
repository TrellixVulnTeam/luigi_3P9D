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

export function log(value) { console.log(value); }

// Strings

export function upper(str) { return str.toUpperCase(); }
export function lower(str) { return str.toLowerCase(); }

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

// Random

export function random() {
    let rnd = Math.random();
    return rnd;
}

export function random_float(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);

    let rnd = Math.random() * (max - min) + min;
    return rnd;
}

export function random_int(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);

    let rnd = Math.floor(Math.random() * (max - min)) + min;
    return rnd;
}

// Math

export function min(value1, value2) { return Math.min(value1, value2); }
export function max(value1, value2) { return Math.max(value1, value2); }
export function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
export function sqrt(value) { return Math.sqrt(value); }
export function abs(value) { return Math.abs(value); }
