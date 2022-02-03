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

let script = url.fileURLToPath(import.meta.url);
process.chdir(path.dirname(script));

await check_compilers();
await build_raylib_native();
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
}

async function build_raylib_native() {
    console.log('>>> Build Raylib (native)');

    fs.mkdirSync('dist/node/tmp', { recursive: true });

    const execAsync = util.promisify(exec);

    // raylib definitions common to all compilers
    let defines = ['SUPPORT_FILEFORMAT_PNG', 'SUPPORT_FILEFORMAT_JPG', 'SUPPORT_FILEFORMAT_GIF']

    if (process.platform == 'win32') {
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

        await execAsync('link /DLL /INCREMENTAL:NO /TLBID:1 /DYNAMICBASE /NXCOMPAT /OUT:dist/node/raylib_win32.dll' +
                        '     kernel32.lib user32.lib gdi32.lib winspool.lib shell32.lib ole32.lib oleaut32.lib' +
                        '     uuid.lib comdlg32.lib advapi32.lib winmm.lib delayimp.lib' +
                        '     dist/node/tmp/rcore.obj dist/node/tmp/rshapes.obj dist/node/tmp/rtextures.obj dist/node/tmp/rtext.obj' +
                        '     dist/node/tmp/rmodels.obj dist/node/tmp/utils.obj dist/node/tmp/rglfw.obj dist/node/tmp/raudio.obj');
    } else {
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

        await execAsync(compiler + ' -shared -o dist/node/raylib_' + process.platform + '.so' +
                                   ' dist/node/tmp/rcore.obj dist/node/tmp/rshapes.obj dist/node/tmp/rtextures.obj dist/node/tmp/rtext.obj' +
                                   ' dist/node/tmp/rmodels.obj dist/node/tmp/utils.obj dist/node/tmp/rglfw.obj dist/node/tmp/raudio.obj' +
                                   ' -lrt -ldl -lm -lX11 -pthread');
    }
}
