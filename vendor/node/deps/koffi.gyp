{
  'targets': [
    {
      'target_name': 'koffi',
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
        '../../..',
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
        '../../../src/koffi/call.cc',
        '../../../src/koffi/call_x64_sysv.cc',
        '../../../src/koffi/call_x64_win.cc',
        '../../../src/koffi/ffi.cc',
        '../../libcc/libcc.cc',
      ],
      'conditions': [
        [ 'v8_enable_handle_zapping==0', { # Hacky way to detect release builds, gyp sucks
          'defines': [ 'NDEBUG', ],
        }],
        [ 'target_arch=="x64" and OS=="win"', {
          'sources': [
            '../../../src/koffi/call_x64_win_fwd.asm',
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
            '../../../src/koffi/call_x64_sysv_fwd.S',
          ],
        }],
        [ 'target_arch=="arm64" or target_arch=="aarch64"', {
          'sources': [
            '../../../src/koffi/call_arm64_fwd.S',
          ],
        }],
        [ 'target_arch=="ia32" and OS=="win"', {
          'sources': [
            '../../../src/koffi/call_x86_fwd.asm',
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
            '../../../src/koffi/call_x86_fwd.S',
          ],
        }],
      ]
    }
  ]
}
