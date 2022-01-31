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
import { is_object, Func } from '../types.mjs';

// General

export function log(value) {
    if (value instanceof Func) {
        console.log(value.toString());
    } else {
        console.log(value);
    }
}
export function print(value) {
    if (value instanceof Func) {
        console.log(value.toString());
    } else {
        process.stdout.write('' + value);
    }
}

export function length(value) {
    if (typeof value != 'string' && !Array.isArray(value))
        throw new Error('Cannot take length of non-string and non-list value');

    return value.length;
}

// Strings

export function upper(str) { return str.toUpperCase(); }
export function lower(str) { return str.toLowerCase(); }

// Lists

export function append(list, value) {
    if (!Array.isArray(list))
        throw new Error('Cannot append to non-list value');

    list.push(value);
}

export function truncate(list, count) {
    if (!Array.isArray(list))
        throw new Error('Cannot truncate from non-list value');
    if (count < 0)
        throw new Error('Cannot truncate negative number of elements');
    if (count >= list.length)
        throw new Error('Cannot truncate more elements than list length');

    list.length -= count;
}

// Objects

export function members(obj) {
    if (!is_object(obj))
        throw new Error('Cannot list members of non-object value');

    return Object.keys(obj);
}

export function get(obj, member) {
    if (!is_object(obj))
        throw new Error('Cannot get member of non-object value');
    if (!obj.hasOwnProperty(member))
        throw new Error(`Object does not have a member called "${member}"`);

    let value = obj[member];
    return value;
}

export function set(obj, member, value) {
    if (!is_object(obj))
        throw new Error('Cannot set member of non-object value');
    if (!obj.hasOwnProperty(member))
        throw new Error(`Object does not have a member called "${member}"`);

    obj[member] = value;
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

// Functions

export function params(func) {
    if (!(func instanceof Func))
        throw new Error("Not a function");

    return Object.freeze(func.params);
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
