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

const { is_object, Func, get_type } = require('./lu_types.js');

// General

exports.log = function(value) {
    if (value instanceof Func) {
        console.log(value.toString());
    } else {
        console.log(value);
    }
};

exports.length = function(value) {
    if (typeof value != 'string' && !Array.isArray(value))
        throw new Error(`Unexpected type ${get_type(value)} for value, expected string or list`);

    return value.length;
};

// Strings

exports.upper = function(str) {
    if (typeof str != 'string')
        throw new Error(`Unexpected type ${get_type(value)}, expected string`);

    return str.toUpperCase();
};

exports.lower = function(str) {
    if (typeof str != 'string')
        throw new Error(`Unexpected type ${get_type(value)}, expected string`);

    return str.toLowerCase();
};

// Lists

exports.append = function(list, value) {
    if (!Array.isArray(list))
        throw new Error(`Unexpected type ${get_type(list)}, expected list`);

    list.push(value);
};

exports.truncate = function(list, count) {
    if (!Array.isArray(list))
        throw new Error(`Unexpected type ${get_type(list)}, expected list`);
    if (!Number.isInteger(count))
        throw new Error(`Unexpected type ${get_type(count)}, expected integer`);
    if (count < 0)
        throw new Error('Cannot truncate negative number of elements');
    if (count >= list.length)
        throw new Error('Cannot truncate more elements than list length');

    list.length -= count;
};

// Objects

exports.members = function(obj) {
    if (!is_object(obj))
        throw new Error('Cannot list members of non-object value');

    return Object.keys(obj);
};

exports.get = function(obj, member) {
    if (!is_object(obj))
        throw new Error(`Unexpected type ${get_type(obj)}, expected object`);
    if (typeof member != 'string' || member.startsWith('__'))
        throw new Error(`Invalid member name "${member}"`);
    if (!obj.hasOwnProperty(member))
        throw new Error(`Object does not have a member called "${member}"`);

    let value = obj[member];
    return value;
};

exports.set = function(obj, member, value) {
    if (!is_object(obj))
        throw new Error(`Unexpected type ${get_type(obj)}, expected object`);
    if (typeof member != 'string' || member.startsWith('__'))
        throw new Error(`Invalid member name "${member}"`);
    if (!obj.hasOwnProperty(member))
        throw new Error(`Object does not have a member called "${member}"`);

    obj[member] = value;
};

// Math

exports.min = function(x, y) { return run_math2(Math.min, x, y); };
exports.max = function(x, y) { return run_math2(Math.max, x, y); };
exports.clamp = function(x, min, max) {
    if (typeof x != 'number')
        throw new Error(`Unexpected type ${get_type(x)}, expected number`);
    if (typeof min != 'number')
        throw new Error(`Unexpected type ${get_type(min)}, expected number`);
    if (typeof max != 'number')
        throw new Error(`Unexpected type ${get_type(max)}, expected number`);

    return Math.min(Math.max(x, min), max);
};

exports.is_nan = function(x) { return run_math1(Number.isNaN, x); };

exports.floor = function(x) { return run_math1(Math.floor, x); };
exports.ceil = function(x) { return run_math1(Math.ceil, x); };
exports.round = function(x) { return run_math1(Math.round, x); };
exports.abs = function(x) { return run_math1(Math.abs, x); }

exports.exp = function(x) { return run_math1(Math.exp, x); };
exports.ln = function(x) { return run_math1(Math.log, x); };
exports.log2 = function(x) { return run_math1(Math.log2, x); };
exports.log10 = function(x) { return run_math1(Math.log10, x); };
exports.pow = function(x, exponent) { return run_math2(Math.pow, x, exponent); };
exports.sqrt = function(x) { return run_math1(Math.sqrt, x); };
exports.cbrt = function(x) { return run_math1(Math.cbrt, x); };

exports.cos = function(x) { return run_math1(Math.cos, x); };
exports.sin = function(x) { return run_math1(Math.sin, x); };
exports.tan = function(x) { return run_math1(Math.tan, x); };
exports.acos = function(x) { return run_math1(Math.acos, x); };
exports.asin = function(x) { return run_math1(Math.asin, x); };
exports.atan = function(x) { return run_math1(Math.atan, x); };
exports.atan2 = function(x, y) { return run_math2(Math.atan2, x, y); };

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

exports.params = function(func) {
    if (!(func instanceof Func))
        throw new Error(`Unexpected type ${get_type(func)}, expected function`);

    return Object.freeze(func.params);
};

// Random

exports.random = function() {
    let rnd = Math.random();
    return rnd;
};

exports.random_float = function(min, max) {
    if (typeof min != 'number')
        throw new Error(`Unexpected type ${get_type(min)}, expected number`);
    if (typeof max != 'number')
        throw new Error(`Unexpected type ${get_type(max)}, expected number`);
    if (min >= max)
        throw new Error('min must be smaller than max');

    let rnd = Math.random() * (max - min) + min;
    return rnd;
};

exports.random_int = function(min, max) {
    if (!Number.isInteger(min))
        throw new Error(`Unexpected type ${get_type(min)}, expected integer`);
    if (!Number.isInteger(max))
        throw new Error(`Unexpected type ${get_type(max)}, expected integer`);
    if (min >= max)
        throw new Error('min must be smaller than max');

    let rnd = Math.floor(Math.random() * (max - min)) + min;
    return rnd;
};
