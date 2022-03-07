{
  'targets': [
    {
      'target_name': 'koffi',
      'type': 'static_library',
      'defines': [
        'NODE_WANT_INTERNALS=1',
        'NAPI_DISABLE_CPP_EXCEPTIONS',
        'FELIX_TARGET=koffi',
      ],
      'cflags_cc!': [ '-std=gnu++0x' ],
      'cflags_cc': [ '-std=c++17 -fno-exceptions -Wno-missing-field-initializers', ],
      'xcode_settings': {
        'CLANG_CXX_LANGUAGE_STANDARD': 'gnu++17',
      },
      'msvs_settings': {
        'VCCLCompilerTool': {
          'AdditionalOptions': ['/std:c++17 /wd4200'],
        }
      },
      'include_dirs': [
        '../../../../koffi',
        '../../../../koffi/vendor/node-addon-api',
        '../src',
        '../tools/msvs/genfiles',
        'v8/include',
        'cares/include',
        'uv/include',
        'uvwasi/include',
        'googletest/include',
      ],
      'direct_dependent_settings': {
        'include_dirs': [ 'src' ]
      },
      'sources': [
        '../../../../koffi/src/call_x64_sysv.cc',
        '../../../../koffi/src/call_x64_win.cc',
        '../../../../koffi/src/ffi.cc',
        '../../../../koffi/src/util.cc',
        '../../../../koffi/vendor/libcc/libcc.cc',
      ],
      'conditions': [
        [ 'v8_enable_handle_zapping==0', { # Hacky way to detect release builds, gyp sucks
          'defines': [ 'NDEBUG', ],
        }],
        [ 'target_arch=="x64" and OS=="win"', {
          'sources': [
            '../../../../koffi/src/call_x64_win_fwd.asm',
          ],
          'rules': [
            {
              'rule_name': 'Assemble',
              'message': 'Assembling <(RULE_INPUT_NAME)',
              'extension': 'asm',
              'inputs': [
                '<(RULE_INPUT_PATH)',
              ],
              'outputs': [
                '<(INTERMEDIATE_DIR)/<(RULE_INPUT_ROOT).obj',
              ],
              'action': [
                'ml64.exe',
                '/nologo', '/c',
                '/Fo<(INTERMEDIATE_DIR)/<(RULE_INPUT_ROOT).obj',
                '<(RULE_INPUT_PATH)',
              ],
            }
          ],
        }],
        [ 'target_arch=="x64" and OS!="win"', {
          'sources': [
            '../../../../koffi/src/call_x64_sysv_fwd.S',
          ],
        }],
        [ 'target_arch=="arm64" or target_arch=="aarch64"', {
          'sources': [
            '../../../../koffi/src/call_arm64_fwd.S',
          ],
        }],
        [ 'target_arch=="ia32" and OS=="win"', {
          'sources': [
            '../../../../koffi/src/call_x86_fwd.asm',
          ],
          'rules': [
            {
              'rule_name': 'Assemble',
              'message': 'Assembling <(RULE_INPUT_NAME)',
              'extension': 'asm',
              'inputs': [
                '<(RULE_INPUT_PATH)',
              ],
              'outputs': [
                '<(INTERMEDIATE_DIR)/<(RULE_INPUT_ROOT).obj',
              ],
              'action': [
                'ml.exe',
                '/nologo', '/c',
                '/Fo<(INTERMEDIATE_DIR)/<(RULE_INPUT_ROOT).obj',
                '<(RULE_INPUT_PATH)',
              ],
            }
          ],
        }],
        [ 'target_arch=="ia32" and OS!="win"', {
          'sources': [
            '../../../../koffi/src/call_x86_fwd.S',
          ],
        }],
        [ 'target_arch=="arm" or target_arch=="armv7"', {
          'sources': [
            '../../../../koffi/src/call_arm32_fwd.S',
          ],
        }],
      ]
    }
  ]
}
