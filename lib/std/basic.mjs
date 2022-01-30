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

import * as process from 'process';

// General

export function log(value) { console.log(value); }
export function print(value) { process.stdout.write('' + value); }

export function length(value) {
    if (typeof value != 'string' && !Array.isArray(value))
        throw new Error('Cannot take length of non-string and non-list value');

    return value.length;
}

// Strings

export function upper(str) { return str.toUpperCase(); }
export function lower(str) { return str.toLowerCase(); }

// Array

export function append(list, value) {
    if (!Array.isArray(list))
        throw new Error('Cannot append to non-list value');

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

export function min(x, y) { return Math.min(x, y); }
export function max(x, y) { return Math.max(x, y); }
export function clamp(x, min, max) { return Math.min(Math.max(x, min), max); }

export function is_nan(x) { return Number.isNaN(x); }

export function floor(x) { return Math.floor(x); }
export function ceil(x) { return Math.ceil(x); }
export function round(x) { return Math.round(x); }
export function abs(x) { return Math.abs(x); }

export function exp(x) { return Math.exp(x); }
export function ln(x) { return Math.log(x); }
export function log2(x) { return Math.log2(x); }
export function log10(x) { return Math.log10(x); }
export function pow(x, exponent) { return Math.pow(x, exponent); }
export function sqrt(x) { return Math.sqrt(x); }
export function cbrt(x) { return Math.cbrt(x); }

export function cos(x) { return Math.cos(x); }
export function sin(x) { return Math.sin(x); }
export function tan(x) { return Math.tan(x); }
export function acos(x) { return Math.acos(x); }
export function asin(x) { return Math.asin(x); }
export function atan(x) { return Math.atan(x); }
export function atan2(x, y) { return Math.atan2(x, y); }
