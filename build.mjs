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

import * as util from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
import * as url from 'url';
import { exec, execSync } from 'child_process';
import * as esbuild from 'esbuild';

let script = url.fileURLToPath(import.meta.url);
process.chdir(path.dirname(script));

await check_compilers();
await build_raylib_native();
await build_raylib_web();
await build_luigi_web();
console.log('>>> Done!');

async function check_compilers() {
    console.log('>>> Check compilers');

    if (process.platform == 'win32') {
        try {
            execSync('cl /?', { stdio: 'ignore' });
        } catch (err) {
            throw new Error('Cannot run Visual Studio compiler (cl)');
        }
    } else if (process.platform == 'linux') {
        try {
            execSync('gcc --version', { stdio: 'ignore' });
        } catch (err) {
            throw new Error('Cannot run GCC compiler (gcc)');
        }
    } else {
        try {
            execSync('clang --version', { stdio: 'ignore' });
        } catch (err) {
            throw new Error('Cannot run Clang compiler (clang)');
        }
    }

    try {
        execSync('emcc --version', { stdio: 'ignore' });
    } catch (err) {
        throw new Error('Cannot run Emscripten compiler (emcc), did you run emsdk_env?\n' +
                        'https://emscripten.org/docs/getting_started/downloads.html');
    }
}

async function build_raylib_native() {
    console.log('>>> Build Raylib (native)');

    fs.mkdirSync('dist/node/tmp', { recursive: true });

    const execAsync = util.promisify(exec);

    // raylib definitions common to all compilers
    let defines = ['SUPPORT_FILEFORMAT_PNG', 'SUPPORT_FILEFORMAT_JPG', 'SUPPORT_FILEFORMAT_GIF']

    if (process.platform == 'win32' && process.arch == 'x64') {
        let cmd = 'cl /nologo /EHsc /O2 /Ob2 /Gm- /Gd /MD /GS /fp:precise /Zc:wchar_t /Zc:forScope /Zc:inline /GR ' +
                  '   /DNDEBUG /D_WINDLL /D_MBCS /DWIN32 /D_WINDOWS /D_CRT_SECURE_NO_WARNINGS /D_CRT_NONSTDC_NO_DEPRECATE ' +
                  '   /DBUILD_LIBTYPE_SHARED /DPLATFORM_DESKTOP /DPLATFORM=PLATFORM_DESKTOP /DGRAPHICS_API_OPENGL_33 /DGRAPHICS=GRAPHICS_API_OPENGL_33 ' +
                  '   /Ivendor/raylib/src/external/glfw/include ' + defines.map(def => '/D' + def).join(' ');

        await Promise.all([
            execAsync(cmd + ' vendor/raylib/src/rcore.c /c /Fodist/node/tmp/rcore.obj'),
            execAsync(cmd + ' vendor/raylib/src/rshapes.c /c /Fodist/node/tmp/rshapes.obj'),
            execAsync(cmd + ' vendor/raylib/src/rtextures.c /c /Fodist/node/tmp/rtextures.obj'),
            execAsync(cmd + ' vendor/raylib/src/rtext.c /c /Fodist/node/tmp/rtext.obj'),
            execAsync(cmd + ' vendor/raylib/src/rmodels.c /c /Fodist/node/tmp/rmodels.obj'),
            execAsync(cmd + ' vendor/raylib/src/utils.c /c /Fodist/node/tmp/utils.obj'),
            execAsync(cmd + ' vendor/raylib/src/rglfw.c /c /Fodist/node/tmp/rglfw.obj'),
            execAsync(cmd + ' vendor/raylib/src/raudio.c /c /Fodist/node/tmp/raudio.obj')
        ]);

        await execAsync('link /DLL /INCREMENTAL:NO /TLBID:1 /DYNAMICBASE /NXCOMPAT /OUT:dist/node/raylib_win32_x64.dll' +
                        '     kernel32.lib user32.lib gdi32.lib winspool.lib shell32.lib ole32.lib oleaut32.lib' +
                        '     uuid.lib comdlg32.lib advapi32.lib winmm.lib delayimp.lib' +
                        '     dist/node/tmp/rcore.obj dist/node/tmp/rshapes.obj dist/node/tmp/rtextures.obj dist/node/tmp/rtext.obj' +
                        '     dist/node/tmp/rmodels.obj dist/node/tmp/utils.obj dist/node/tmp/rglfw.obj dist/node/tmp/raudio.obj');
    } else if (process.arch == 'x64') {
        let compiler = (process.platform == 'linux') ? 'gcc' : 'clang';

        let cmd = compiler + ' -O2 -w -fPIC -DNDEBUG' +
                             ' -DPLATFORM_DESKTOP -DPLATFORM=PLATFORM_DESKTOP -DDGRAPHICS_API_OPENGL_33 -DGRAPHICS=GRAPHICS_API_OPENGL_33 ' +
                             ' -Ivendor/raylib/src/external/glfw/include ' + defines.map(def => '-D' + def).join(' ');

        await Promise.all([
            execAsync(cmd + ' vendor/raylib/src/rcore.c -c -o dist/node/tmp/rcore.obj'),
            execAsync(cmd + ' vendor/raylib/src/rshapes.c -c -o dist/node/tmp/rshapes.obj'),
            execAsync(cmd + ' vendor/raylib/src/rtextures.c -c -o dist/node/tmp/rtextures.obj'),
            execAsync(cmd + ' vendor/raylib/src/rtext.c -c -o dist/node/tmp/rtext.obj'),
            execAsync(cmd + ' vendor/raylib/src/rmodels.c -c -o dist/node/tmp/rmodels.obj'),
            execAsync(cmd + ' vendor/raylib/src/utils.c -c -o dist/node/tmp/utils.obj'),
            execAsync(cmd + ' vendor/raylib/src/rglfw.c -c -o dist/node/tmp/rglfw.obj'),
            execAsync(cmd + ' vendor/raylib/src/raudio.c -c -o dist/node/tmp/raudio.obj')
        ]);

        await execAsync(compiler + ` -shared -o dist/node/raylib_${process.platform}_x64.so` +
                                   ' dist/node/tmp/rcore.obj dist/node/tmp/rshapes.obj dist/node/tmp/rtextures.obj dist/node/tmp/rtext.obj' +
                                   ' dist/node/tmp/rmodels.obj dist/node/tmp/utils.obj dist/node/tmp/rglfw.obj dist/node/tmp/raudio.obj' +
                                   ' -lrt -ldl -lm -lX11 -pthread');
    } else {
        throw new Error(`Unsupported platform: ${process.platform} (${process.arch}`);
    }
}

async function build_raylib_web() {
    console.log('>>> Build Raylib (web)');

    fs.mkdirSync('dist/web/tmp', { recursive: true });

    const execAsync = util.promisify(exec);

    await Promise.all([
        execAsync('emcc -c vendor/raylib/src/rcore.c -o dist/web/tmp/rcore.o -Os -Wall -DPLATFORM_WEB -DGRAPHICS_API_OPENGL_ES2 -Wno-everything'),
        execAsync('emcc -c vendor/raylib/src/rshapes.c -o dist/web/tmp/rshapes.o -Os -Wall -DPLATFORM_WEB -DGRAPHICS_API_OPENGL_ES2 -Wno-everything'),
        execAsync('emcc -c vendor/raylib/src/rtextures.c -o dist/web/tmp/rtextures.o -Os -Wall -DPLATFORM_WEB -DGRAPHICS_API_OPENGL_ES2 -Wno-everything'),
        execAsync('emcc -c vendor/raylib/src/rtext.c -o dist/web/tmp/rtext.o -Os -Wall -DPLATFORM_WEB -DGRAPHICS_API_OPENGL_ES2 -Wno-everything'),
        execAsync('emcc -c vendor/raylib/src/rmodels.c -o dist/web/tmp/rmodels.o -Os -Wall -DPLATFORM_WEB -DGRAPHICS_API_OPENGL_ES2 -Wno-everything'),
        execAsync('emcc -c vendor/raylib/src/utils.c -o dist/web/tmp/utils.o -Os -Wall -DPLATFORM_WEB -Wno-everything'),
        execAsync('emcc -c vendor/raylib/src/raudio.c -o dist/web/tmp/raudio.o -Os -Wall -DPLATFORM_WEB -Wno-everything')
    ]);

    await execAsync('emcc -o dist/web/raylib.js dist/web/tmp/rcore.o dist/web/tmp/rshapes.o dist/web/tmp/rtextures.o' +
                    '     dist/web/tmp/rtext.o dist/web/tmp/rmodels.o dist/web/tmp/utils.o dist/web/tmp/raudio.o' +
                    '     -s WASM=1 -s LINKABLE=1 -s USE_GLFW=3 -s ENVIRONMENT=web -s MODULARIZE=1 -s EXPORT_NAME=_load_raylib');
}

async function build_luigi_web() {
    console.log('>>> Build Luigi (web)');

    let externals = [
        [/raylib/, 'raylib.js']
    ];

    let plugin = {
        name: 'ignore',
        setup: build => {
            for (let external of externals) {
                build.onResolve({ filter: external[0] }, args => ({
                    path: external[1],
                    external: true
                }));
            }
        }
    };

    await esbuild.build({
        entryPoints: ['lib/index.js'],
        bundle: true,
        format: 'iife',
        globalName: 'luigi',
        outfile: 'dist/web/luigi.js',
        plugins: [plugin],
    });

    fs.copyFileSync('lib/web/luigi.html', 'dist/web/luigi.html');
}

