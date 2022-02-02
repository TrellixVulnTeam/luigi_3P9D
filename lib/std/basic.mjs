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

import { is_object, Func, get_type } from '../types.mjs';

// General

export function log(value) {
    if (value instanceof Func) {
        console.log(value.toString());
    } else {
        console.log(value);
    }
}

export function length(value) {
    if (typeof value != 'string' && !Array.isArray(value))
        throw new Error(`Unexpected type ${get_type(value)} for value, expected string or list`);

    return value.length;
}

// Strings

export function upper(str) {
    if (typeof str != 'string')
        throw new Error(`Unexpected type ${get_type(value)}, expected string`);

    return str.toUpperCase();
}

export function lower(str) {
    if (typeof str != 'string')
        throw new Error(`Unexpected type ${get_type(value)}, expected string`);

    return str.toLowerCase();
}

// Lists

export function append(list, value) {
    if (!Array.isArray(list))
        throw new Error(`Unexpected type ${get_type(list)}, expected list`);

    list.push(value);
}

export function truncate(list, count) {
    if (!Array.isArray(list))
        throw new Error(`Unexpected type ${get_type(list)}, expected list`);
    if (!Number.isInteger(count))
        throw new Error(`Unexpected type ${get_type(count)}, expected integer`);
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
        throw new Error(`Unexpected type ${get_type(obj)}, expected object`);
    if (typeof member != 'string' || member.startsWith('__'))
        throw new Error(`Invalid member name "${member}"`);
    if (!obj.hasOwnProperty(member))
        throw new Error(`Object does not have a member called "${member}"`);

    let value = obj[member];
    return value;
}

export function set(obj, member, value) {
    if (!is_object(obj))
        throw new Error(`Unexpected type ${get_type(obj)}, expected object`);
    if (typeof member != 'string' || member.startsWith('__'))
        throw new Error(`Invalid member name "${member}"`);
    if (!obj.hasOwnProperty(member))
        throw new Error(`Object does not have a member called "${member}"`);

    obj[member] = value;
}

// Math

export function min(x, y) { return run_math2(Math.min, x, y); }
export function max(x, y) { return run_math2(Math.max, x, y); }
export function clamp(x, min, max) {
    if (typeof x != 'number')
        throw new Error(`Unexpected type ${get_type(x)}, expected number`);
    if (typeof min != 'number')
        throw new Error(`Unexpected type ${get_type(min)}, expected number`);
    if (typeof max != 'number')
        throw new Error(`Unexpected type ${get_type(max)}, expected number`);

    return Math.min(Math.max(x, min), max);
}

export function is_nan(x) { return run_math1(Number.isNaN, x); }

export function floor(x) { return run_math1(Math.floor, x); }
export function ceil(x) { return run_math1(Math.ceil, x); }
export function round(x) { return run_math1(Math.round, x); }
export function abs(x) { return run_math1(Math.abs, x); }

export function exp(x) { return run_math1(Math.exp, x); }
export function ln(x) { return run_math1(Math.log, x); }
export function log2(x) { return run_math1(Math.log2, x); }
export function log10(x) { return run_math1(Math.log10, x); }
export function pow(x, exponent) { return run_math2(Math.pow, x, exponent); }
export function sqrt(x) { return run_math1(Math.sqrt, x); }
export function cbrt(x) { return run_math1(Math.cbrt, x); }

export function cos(x) { return run_math1(Math.cos, x); }
export function sin(x) { return run_math1(Math.sin, x); }
export function tan(x) { return run_math1(Math.tan, x); }
export function acos(x) { return run_math1(Math.acos, x); }
export function asin(x) { return run_math1(Math.asin, x); }
export function atan(x) { return run_math1(Math.atan, x); }
export function atan2(x, y) { return run_math2(Math.atan2, x, y); }

function run_math1(func, x) {
    if (typeof x != 'number')
        throw new Error(`Unexpected type ${get_type(x)}, expected number`);

    return func(x);
}

function run_math2(func, x, y) {
    if (typeof x != 'number')
        throw new Error(`Unexpected type ${get_type(x)}, expected number`);
    if (typeof y != 'number')
        throw new Error(`Unexpected type ${get_type(y)}, expected number`);

    return func(x, y);
}

// Functions

export function params(func) {
    if (!(func instanceof Func))
        throw new Error(`Unexpected type ${get_type(func)}, expected function`);

    return Object.freeze(func.params);
}

// Random

export function random() {
    let rnd = Math.random();
    return rnd;
}

export function random_float(min, max) {
    if (typeof min != 'number')
        throw new Error(`Unexpected type ${get_type(min)}, expected number`);
    if (typeof max != 'number')
        throw new Error(`Unexpected type ${get_type(max)}, expected number`);
    if (min >= max)
        throw new Error('min must be smaller than max');

    let rnd = Math.random() * (max - min) + min;
    return rnd;
}

export function random_int(min, max) {
    if (!Number.isInteger(min))
        throw new Error(`Unexpected type ${get_type(min)}, expected integer`);
    if (!Number.isInteger(max))
        throw new Error(`Unexpected type ${get_type(max)}, expected integer`);
    if (min >= max)
        throw new Error('min must be smaller than max');

    let rnd = Math.floor(Math.random() * (max - min)) + min;
    return rnd;
}
