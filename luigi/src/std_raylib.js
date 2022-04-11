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

const process = require('process');
const path = require('path');
const koffi = (() => {
    try {
        return process.binding('koffi');
    } catch (err) {
        // Prevent esbuild from trying to pick this up
        let name = 'koffi';
        return require(name);
    }
})();
const { run_function } = require('./lu_vm.js');

const Image = koffi.struct('Image', {
    data: koffi.pointer('void'),
    width: 'int',
    height: 'int',
    mipmaps: 'int',
    format: 'int'
});

const GlyphInfo = koffi.struct('GlyphInfo', {
    value: 'int',
    offsetX: 'int',
    offsetY: 'int',
    advanceX: 'int',
    image: Image
});

const Color = koffi.struct('Color', {
    r: 'uchar',
    g: 'uchar',
    b: 'uchar',
    a: 'uchar'
});

const Vector2 = koffi.struct('Vector2', {
    x: 'float',
    y: 'float'
});

const Vector3 = koffi.struct('Vector3', {
    x: 'float',
    y: 'float',
    z: 'float'
});

const Vector4 = koffi.struct('Vector4', {
    x: 'float',
    y: 'float',
    z: 'float',
    w: 'float'
});

const Rectangle = koffi.struct('Rectangle', {
    x: 'float',
    y: 'float',
    width: 'float',
    height: 'float'
});

const Texture = koffi.struct('Texture', {
    id: 'uint',
    width: 'int',
    height: 'int',
    mipmaps: 'int',
    format: 'int'
});

const Font = koffi.struct('Font', {
    baseSize: 'int',
    glyphCount: 'int',
    glyphPadding: 'int',
    texture: Texture,
    recs: koffi.pointer(Rectangle),
    glyphs: koffi.pointer(GlyphInfo)
});

let lib = (() => {
    let filename;
    if (koffi.internal) {
        filename = null;
    } else {
        filename = require.resolve('koffi');
        filename = path.join(path.dirname(filename), '../../luigi/build/raylib' + (process.platform == 'win32' ? '.dll' : '.so'));
    }

    let lib = koffi.load(filename);
    return lib;
})();

const SetTraceLogLevel = lib.func('SetTraceLogLevel', 'void', ['int']);
const InitWindow = lib.func('InitWindow', 'void', ['int', 'int', 'string']);
const SetWindowState = lib.func('SetWindowState', 'void', ['uint']);
const ClearWindowState = lib.func('ClearWindowState', 'void', ['uint']);
const IsWindowState = lib.func('IsWindowState', 'bool', ['uint']);
const SetTargetFPS = lib.func('SetTargetFPS', 'void', ['int']);
const SetWindowTitle = lib.func('SetWindowTitle', 'void', ['string']);
const SetWindowSize = lib.func('SetWindowSize', 'void', ['int', 'int']);
const ClearBackground = lib.func('ClearBackground', 'void', [Color]);
const BeginDrawing = lib.func('BeginDrawing', 'void', []);
const EndDrawing = lib.func('EndDrawing', 'void', []);
const WindowShouldClose = lib.func('WindowShouldClose', 'bool', []);
const GetScreenWidth = lib.func('GetScreenWidth', 'int', []);
const GetScreenHeight = lib.func('GetScreenHeight', 'int', []);

const LoadFont = lib.func('LoadFont', Font, ['string']);
const MeasureText = lib.func('MeasureText', 'int', ['string', 'int']);
const MeasureTextEx = lib.func('MeasureTextEx', Vector2, [Font, 'string', 'float', 'float']);
const DrawText = lib.func('DrawText', 'void', ['string', 'int', 'int', 'int', Color]);
const DrawTextEx = lib.func('DrawTextEx', 'void', [Font, 'string', Vector2, 'float', 'float', Color]);

const DrawRectangleRounded = lib.func('DrawRectangleRounded', 'void', [Rectangle, 'float', 'int', Color]);
const DrawTexture = lib.func('DrawTexture', 'void', [Texture, 'int', 'int', Color]);
const LoadImage = lib.func('LoadImage', Image, ['string']);
const LoadTexture = lib.func('LoadTexture', Texture, ['string']);
const LoadTextureFromImage = lib.func('LoadTextureFromImage', Texture, [Image]);
const DrawLine = lib.func('DrawLine', 'void', ['int', 'int', 'int', 'int', Color]);

const IsKeyPressed = lib.func('IsKeyPressed', 'bool', ['int']);
const IsKeyReleased = lib.func('IsKeyReleased', 'bool', ['int']);
const IsKeyDown = lib.func('IsKeyDown', 'bool', ['int']);
const GetMousePosition = lib.func('GetMousePosition', Vector2, []);
const IsMouseButtonPressed = lib.func('IsMouseButtonPressed', 'bool', ['int']);
const IsMouseButtonReleased = lib.func('IsMouseButtonReleased', 'bool', ['int']);
const IsMouseButtonDown = lib.func('IsMouseButtonDown', 'bool', ['int']);
const GetMouseWheelMove = lib.func('GetMouseWheelMove', 'float', []);

const rlPushMatrix = lib.func('rlPushMatrix', 'void', []);
const rlPopMatrix = lib.func('rlPopMatrix', 'void', []);
const rlTranslatef = lib.func('rlTranslatef', 'void', ['float', 'float', 'float']);
const rlRotatef = lib.func('rlRotatef', 'void', ['float', 'float', 'float', 'float']);
const rlScalef = lib.func('rlScalef', 'void', ['float', 'float', 'float']);

// Enumerations

const Colors = {
    WHITE: {r: 255, g: 255, b: 255, a: 255},
    BLACK: {r: 0, g: 0, b: 0, a: 255},
    BLANK: {r: 0, g: 0, b: 0, a: 0},
    MAGENTA: {r: 255, g: 0, b: 255, a: 255},
    RAYWHITE: {r: 245, g: 245, b: 245, a: 255},
    LIGHTGRAY: {r: 200, g: 200, b: 200, a: 255},
    GRAY: {r: 130, g: 130, b: 130, a: 255},
    DARKGRAY: {r: 80, g: 80, b: 80, a: 255},
    YELLOW: {r: 253, g: 249, b: 0, a: 255},
    GOLD: {r: 255, g: 203, b: 0, a: 255},
    ORANGE: {r: 255, g: 161, b: 0, a: 255},
    PINK: {r: 255, g: 109, b: 194, a: 255},
    RED: {r: 230, g: 41, b: 55, a: 255},
    MAROON: {r: 190, g: 33, b: 55, a: 255},
    GREEN: {r: 0, g: 228, b: 48, a: 255},
    LIME: {r: 0, g: 158, b: 47, a: 255},
    DARKGREEN: {r: 0, g: 117, b: 44, a: 255},
    SKYBLUE: {r: 102, g: 191, b: 255, a: 255},
    BLUE: {r: 0, g: 121, b: 241, a: 255},
    DARKBLUE: {r: 0, g: 82, b: 172, a: 255},
    PURPLE: {r: 200, g: 122, b: 255, a: 255},
    VIOLET: {r: 135, g: 60, b: 190, a: 255},
    DARKPURPLE: {r: 112, g: 31, b: 126, a: 255},
    BEIGE: {r: 211, g: 176, b: 131, a: 255},
    BROWN: {r: 127, g: 106, b: 79, a: 255},
    DARKBROWN: {r: 76, g: 63, b: 47, a: 255}
};

const KeyNames = {
    '\'': [39],
    ',': [44],
    '-': [45, 333],
    '.': [46, 330],
    '/': [47, 331],
    '*': [332],
    '+': [334],
    '0': [48, 320],
    '1': [49, 321],
    '2': [50, 322],
    '3': [51, 323],
    '4': [52, 324],
    '5': [53, 325],
    '6': [54, 326],
    '7': [55, 327],
    '8': [56, 328],
    '9': [57, 329],
    ';': [59],
    '=': [61, 336],
    'a': [65],
    'b': [66],
    'c': [67],
    'd': [68],
    'e': [69],
    'f': [70],
    'g': [71],
    'h': [72],
    'i': [73],
    'j': [74],
    'k': [75],
    'l': [76],
    'm': [77],
    'n': [78],
    'o': [79],
    'p': [80],
    'q': [81],
    'r': [82],
    's': [83],
    't': [84],
    'u': [85],
    'v': [86],
    'w': [87],
    'x': [88],
    'y': [89],
    'z': [90],
    '[': [91],
    '\\': [92],
    ']': [93],
    '`': [96],

    ' ': [32],
    'space': [32],
    'escape': [256],
    'enter': [257, 335],
    'tab': [258],
    'backspace': [259],
    'insert': [260],
    'delete': [261],
    'right': [262],
    'left': [263],
    'down': [264],
    'up': [265],
    'pageup': [266],
    'pagedown': [267],
    'home': [268],
    'end': [269],
    'capslock': [280],
    'scrolllock': [281],
    'numlock': [282],
    'printscr': [283],
    'pause': [284],
    'f1': [290],
    'f2': [291],
    'f3': [292],
    'f4': [293],
    'f5': [294],
    'f6': [295],
    'f7': [296],
    'f8': [297],
    'f9': [298],
    'f10': [299],
    'f11': [300],
    'f12': [301],
    'lshift': [340],
    'lctrl': [341],
    'lalt': [342],
    'lwin': [343],
    'rshift': [344],
    'rctrl': [345],
    'ralt': [346],
    'rwin': [347],
    'menu': [348, 82],

    'back': [4],
    'volup': [24],
    'voldown': [25]
};

const StateFlags = {
    VSYNC_HINT: 0x40,
    FULLSCREEN_MODE: 0x2,
    WINDOW_RESIZABLE: 0x4,
    WINDOW_UNDECORATED: 0x8,
    WINDOW_HIDDEN: 0x80,
    WINDOW_MINIMIZED: 0x200,
    WINDOW_MAXIMIZED: 0x400,
    WINDOW_UNFOCUSED: 0x800,
    WINDOW_TOPMOST: 0x1000,
    WINDOW_ALWAYS_RUN: 0x100,
    WINDOW_TRANSPARENT: 0x10,
    WINDOW_HIGHDPI: 0x2000,
    MSAA_4X_HINT: 0x20,
    INTERLACED_HINT: 0x10000
};

const LogLevel = {
    ALL: 0,
    TRACE: 1,
    DEBUG: 2,
    INFO: 3,
    WARNING: 4,
    ERROR: 5,
    FATAL: 6,
    NONE: 7
};

let default_font;

function init() {
    let width = 1280;
    let height = 720;

    SetTraceLogLevel(LogLevel.WARNING);
    SetWindowState(StateFlags.WINDOW_HIDDEN);
    InitWindow(width, height, 'Luigi');

    let filename = path.join(path.dirname(__filename), 'std_opensans.ttf');
    default_font = LoadFont(filename);
}
init();

exports.run_window = function(title, params, func) {
    let background = find_color(params.background);
    let fps = (params.fps != null) ? params.fps : 60;

    if (fps != null)
        SetTargetFPS(fps);
    SetWindowTitle(title);
    ClearWindowState(StateFlags.WINDOW_HIDDEN);

    let web = (typeof window !== 'undefined' && typeof window.document !== 'undefined');

    if (web) {
        let run_frame = () => {
            try {
                func();
            } finally {
                window.requestAnimationFrame(run_frame);
            }
        };

        window.requestAnimationFrame(run_frame);
    } else {
        do {
            BeginDrawing();
            ClearBackground(background);

            run_function(func, []);

            EndDrawing();
        } while (!WindowShouldClose());
    }
};

exports.is_fullscreen = function() {
    return IsWindowState(StateFlags.WINDOW_UNDECORATED);
};

exports.set_fullscreen = function(fullscreen) {
    let full = StateFlags.WINDOW_UNDECORATED |
               StateFlags.WINDOW_MAXIMIZED |
               StateFlags.WINDOW_TOPMOST;
    let windowed = StateFlags.WINDOW_RESIZABLE;

    if (fullscreen) {
        SetWindowState(full);
        ClearWindowState(windowed);
    } else {
        SetWindowState(windowed);
        ClearWindowState(full);
    }
};

exports.get_window_size = function() {
    let dimensions = {
        width: GetScreenWidth(),
        height: GetScreenHeight()
    }

    return dimensions;
};

exports.draw_text = function(x, y, params, text) {
    let size = (params.size != null) ? params.size : 32;
    let color = find_color(params.color);

    let vec = MeasureTextEx(default_font, text, size, 1);
    let [dx, dy] = align(vec.x, size, params.align);

    rlPushMatrix();
    transform(x, y, params);
    DrawTextEx(default_font, text, {x: dx, y: dy}, size, 1, color);
    rlPopMatrix();

    let dimensions = {
        width: vec.x,
        height: vec.y
    };

    return dimensions;
};

exports.measure_text = function(text, size) {
    size = (size != null) ? size : 40;

    let vec = MeasureTextEx(default_font, text, size, 1);
    let dimensions = {
        width: vec.x,
        height: vec.y
    };

    return dimensions;
};

exports.draw_rectangle = function(x, y, width, height, params) {
    let [dx, dy] = align(width, height, params.align);
    let roundness = (params.roundness != null) ? params.roundness : 0;
    let color = find_color(params.color);

    let rect = {x: dx, y: dy, width: width, height: height};

    rlPushMatrix();
    transform(x, y, params);
    DrawRectangleRounded(rect, roundness, 100, color);
    rlPopMatrix();
};

exports.load_image = function(path) {
    // let img = LoadImage(path);
    let tex = LoadTexture(path);

    let sprite = {
        width: tex.width,
        height: tex.height,
        tex: tex
    };

    return sprite;
};

exports.draw_image = function(x, y, params, img) {
    let [dx, dy] = align(img.width, img.height, params.align);

    rlPushMatrix();
    transform(x, y, params);
    DrawTexture(img.tex, dx, dy, Colors.WHITE);
    rlPopMatrix();
};

exports.draw_line = function(x1, y1, x2, y2, params) {
    let color = find_color(params.color);
    DrawLine(x1, y1, x2, y2, color);
};

function transform(x, y, params) {
    rlTranslatef(x, y, 0.0);
    if (params.rotate != null)
        rlRotatef(params.rotate + 90.0, 0, 0, 1);
    if (params.scale != null)
        rlScalef(params.scale, params.scale, 0);
};

// Input

// XXX: What about keyboard layouts (such as AZERTY)?
exports.get_key = function(name) {
    let keys = find_key(name);

    let state = {
        pressed: keys.some(key => IsKeyPressed(key)),
        released: keys.some(key => IsKeyReleased(key)),
        down: keys.some(key => IsKeyDown(key))
    };

    return state;
};

exports.is_key_down = function(name) {
    let keys = find_key(name);
    return keys.some(key => IsKeyDown(key));
};

exports.is_key_pressed = function(name) {
    let keys = find_key(name);
    return keys.some(key => IsKeyPressed(key));
};

exports.get_mouse = function() {
    let buttons = [0, 1, 2];

    let pos = GetMousePosition();

    let state = {
        x: pos.x,
        y: pos.y,

        pressed: buttons.map(btn => IsMouseButtonPressed(btn)),
        released: buttons.map(btn => IsMouseButtonReleased(btn)),
        down: buttons.map(btn => IsMouseButtonDown(btn)),

        wheel: GetMouseWheelMove()
    };

    return state;
};

exports.is_mouse_down = function(btn) { return IsMouseButtonDown(btn); };
exports.is_mouse_pressed = function(btn) { return IsMouseButtonPressed(btn); };
exports.get_mouse_pos = function() { return GetMousePosition(); };

// Utility

function align(width, height, align) {
    align = (align != null) ? align : 7;

    if (align < 1 || align > 9)
        throw new Error('align value must be between 1 and 9');

    let dx;
    if (align == 1 || align == 4 || align == 7) {
        dx = 0;
    } else if (align == 2 || align == 5 || align == 8) {
        dx = -width / 2;
    } else if (align == 3 || align == 6 || align == 9) {
        dx = -width;
    }

    let dy;
    if (align >= 7 && align <= 9) {
        dy = 0;
    } else if (align >= 4 && align <= 6) {
        dy = -height / 2;
    } else if (align >= 1 && align <= 3) {
        dy = -height;
    }

    return [dx, dy];
}

function find_color(name) {
    if (name == null)
        return Colors.BLACK;

    let color = Colors[name.toUpperCase()];
    if (color == null)
        throw new Error(`Invalid color "${name}"`);

    return color;
}

function find_key(name) {
    let key = KeyNames[name.toLowerCase()];
    if (key == null)
        throw new Error(`Unknown key "${name}"`);
    return key;
}
