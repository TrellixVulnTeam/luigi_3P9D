{
  'targets': [
    {
      'target_name': 'ffi',
      'type': 'static_library',
      'defines': [
        'NODE_WANT_INTERNALS=1',
        'NAPI_DISABLE_CPP_EXCEPTIONS',
      ],
      'cflags_cc!': [ '-std=gnu++0x' ],
      'cflags_cc': [ '-std=c++17 -Wno-missing-field-initializers', ],
      'xcode_settings': {
        'CLANG_CXX_LANGUAGE_STANDARD': 'gnu++17',
      },
      'msvs_settings': {
        'VCCLCompilerTool': {
          'AdditionalOptions': ['/std:c++17 /wd4200'],
        }
      },
      'include_dirs': [
        '../../node-addon-api',
        '../src',
        '../tools/msvs/genfiles',
        'v8/include',
        'cares/include',
        'uv/include',
        'uvwasi/include',
        'googletest/include',
      ],
      'direct_dependent_settings': {
        'include_dirs': [ '../../../src' ]
      },
      'sources': [
        '../../../src/ffi/call.cc',
        '../../../src/ffi/call_x64.cc',
        '../../../src/ffi/ffi.cc',
        '../../../src/ffi/libcc.cc',
      ],
      'conditions': [
        [ 'v8_enable_handle_zapping==0', { # Hacky way to detect release builds, gyp sucks
          'defines': [ 'NDEBUG', ],
        }],
        [ 'target_arch=="x64" and OS=="win"', {
          'sources': [
            '../../../src/ffi/call_x64_win32.asm',
          ],
          'rules': [
            {
              'rule_name': 'Assemble_FFI',
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
            '../../../src/ffi/call_x64_sysv.S',
          ],
        }]
      ]
    }
  ]
}
