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

import raylib from 'raylib';

raylib.SetTraceLogLevel(raylib.LOG_WARNING);

let default_font;

export function open_window(title) {
    let width = 1280;
    let height = 720;

    raylib.SetConfigFlags(raylib.FLAG_WINDOW_RESIZABLE);
    raylib.InitWindow(width, height, title);
    raylib.SetTargetFPS(60);

    default_font = raylib.LoadFont('lib/std/opensans.ttf');
}

export function run_window(background) {
    background = raylib[background.toUpperCase()];

    raylib.EndDrawing();

    if (raylib.WindowShouldClose()) {
        raylib.CloseWindow();
        return false;
    }

    raylib.BeginDrawing();
    raylib.ClearBackground(background);

    return true;
}

export function is_fullscreen() {
    return raylib.IsWindowFullscreen();
}

export function set_fullscreen(fullscreen) {
    if (fullscreen != raylib.IsWindowFullscreen())
        raylib.ToggleFullscreen();
}

export function get_window_size() {
    let dimensions = {
        width: raylib.GetScreenWidth(),
        height: raylib.GetScreenHeight()
    }

    return dimensions;
}

export function draw_text(x, y, params, text) {
    let size = (params.size != null) ? params.size : 32;
    let color = find_color(params.color);

    let vec = raylib.MeasureTextEx(default_font, text, size, 1);
    let [dx, dy] = align(vec.x, size, params.align);

    raylib.rlPushMatrix();
    transform(x, y, params);
    raylib.DrawTextEx(default_font, text, raylib.Vector2(dx, dy), size, 1, color);
    raylib.rlPopMatrix();

    let dimensions = {
        width: vec.x,
        height: vec.y
    };

    return dimensions;
}

export function measure_text(text, size) {
    size = (size != null) ? size : 40;

    let vec = raylib.MeasureTextEx(default_font, text, size, 1);
    let dimensions = {
        width: vec.x,
        height: vec.y
    };

    return dimensions;
}

export function draw_rectangle(x, y, width, height, params) {
    let [dx, dy] = align(width, height, params.align);
    let roundness = (params.roundness != null) ? params.roundness : 0;
    let color = find_color(params.color);

    let rect = raylib.Rectangle(dx, dy, width, height);

    raylib.rlPushMatrix();
    transform(x, y, params);
    raylib.DrawRectangleRounded(rect, roundness, 100, color);
    raylib.rlPopMatrix();
}

export function load_sprite(path) {
    let img = raylib.LoadImage(path);
    let tex = raylib.LoadTextureFromImage(img);

    let sprite = {
        width: tex.width,
        height: tex.height,
        tex: tex
    };

    return sprite;
}

export function draw_image(x, y, params, img) {
    let [dx, dy] = align(img.width, img.height, params.align);

    raylib.rlPushMatrix();
    transform(x, y, params);
    raylib.DrawTexture(img.tex, dx, dy, raylib.WHITE);
    raylib.rlPopMatrix();
}

export function draw_line(x1, y1, x2, y2, params) {
    let color = find_color(params.color);
    raylib.DrawLine(x1, y1, x2, y2, color);
}

function transform(x, y, params) {
    raylib.rlTranslatef(x, y, 0.0);
    if (params.rotate != null)
        raylib.rlRotatef(params.rotate + 90.0, 0, 0, 1);
    if (params.scale != null)
        raylib.rlScalef(params.scale, params.scale, 0);
}

// Input

const key_names = {
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

// XXX: What about keyboard layouts (such as AZERTY)?
export function get_key(name) {
    let keys = find_key(name);

    let state = {
        pressed: keys.some(key => raylib.IsKeyPressed(key)),
        released: keys.some(key => raylib.IsKeyReleased(key)),
        down: keys.some(key => raylib.IsKeyDown(key))
    };

    return state;
}

export function is_key_down(name) {
    let keys = find_key(name);
    return keys.some(key => raylib.IsKeyDown(key));
}

export function is_key_pressed(name) {
    let keys = find_key(name);
    return keys.some(key => raylib.IsKeyPressed(key));
}

export function get_mouse() {
    let buttons = [0, 1, 2];

    let state = {
        x: raylib.GetMouseX(),
        y: raylib.GetMouseY(),

        pressed: buttons.map(btn => raylib.IsMouseButtonPressed(btn)),
        released: buttons.map(btn => raylib.IsMouseButtonReleased(btn)),
        down: buttons.map(btn => raylib.IsMouseButtonDown(btn)),

        wheel: raylib.GetMouseWheelMove()
    };

    return state;
}

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
        return raylib.BLACK;

    let color = raylib[name.toUpperCase()];
    if (color == null)
        throw new Error(`Invalid color "${name}"`);

    return color;
}

function find_key(name) {
    let key = key_names[name.toLowerCase()];
    if (key == null)
        throw new Error(`Unknown key "${name}"`);
    return key;
}
