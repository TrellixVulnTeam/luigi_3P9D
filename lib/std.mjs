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

// General

export function length(list) {
    if (!Array.isArray(list))
        throw new Error('Cannot take length of non-list');

    return list.length;
}

export function log(value) {
    console.log(value);
}

// Window

raylib.SetTraceLogLevel(raylib.LOG_WARNING);

export function open_window(title) {
    let width = 800;
    let height = 450;

    raylib.SetConfigFlags(raylib.FLAG_WINDOW_RESIZABLE);
    raylib.InitWindow(width, height, title);
    raylib.SetTargetFPS(60);
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

export function get_window_size() {
    let width = raylib.GetScreenWidth();
    let height = raylib.GetScreenHeight();

    return [width, height];
}

export function draw_text(x, y, align, color, text) {
    color = raylib[color.toUpperCase()];

    if (align < 1 || align > 9)
        throw new Error('align value must be between 1 and 9');

    let size = 40;
    let width = raylib.MeasureText(text, size);

    if (align == 1 || align == 4 || align == 7) {
        // x is ok
    } else if (align == 2 || align == 5 || align == 8) {
        x -= width / 2;
    } else if (align == 3 || align == 6 || align == 9) {
        x -= width;
    }
    if (align >= 7 && align <= 9) {
        // y is ok
    } else if (align >= 4 && align <= 6) {
        y -= size / 2;
    } else if (align >= 1 && align <= 3) {
        y -= size;
    }

    raylib.DrawText(text, x, y, size, color);

    return [width, size];
}
