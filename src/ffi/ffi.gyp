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
          'AdditionalOptions': ['/std:c++17'],
        }
      },
      'include_dirs': [
        '../../vendor/node-addon-api',
        '../../vendor/node/src',
        '../../vendor/node/tools/msvs/genfiles',
        '../../vendor/node/deps/v8/include',
        '../../vendor/node/deps/cares/include',
        '../../vendor/node/deps/uv/include',
        '../../vendor/node/deps/uvwasi/include',
        '../../vendor/node/deps/googletest/include',
      ],
      'direct_dependent_settings': {
        'include_dirs': [ 'src' ]
      },
      'sources': [
        'call.cc',
        'call_x64.cc',
        'call_x64_fwd.asm',
        'ffi.cc',
        'libcc.cc',
      ],
      'conditions': [
        [ 'target_arch=="x64" and OS=="win"', {
          'rules': [
            {
              'rule_name': 'Assemble_FFI',
              'message': 'Assembling <(RULE_INPUT_NAME)',
              'extension': 'asm',
              'inputs': [],
              'outputs': [
                '<(INTERMEDIATE_DIR)/<(RULE_INPUT_ROOT).obj',
              ],
              'action': [
                'nasm.exe',
                '-fwin64',
                '-o', '<(INTERMEDIATE_DIR)/<(RULE_INPUT_ROOT).obj',
                '<(RULE_INPUT_PATH)',
              ],
            }
          ],
        }],
        [ 'target_arch=="x64" and OS!="win"', {
          'rules': [
            {
              'rule_name': 'Assemble_FFI',
              'message': 'Assembling <(RULE_INPUT_NAME)',
              'extension': 'asm',
              'inputs': [],
              'outputs': [
                '<(INTERMEDIATE_DIR)/<(RULE_INPUT_ROOT).o',
              ],
              'action': [
                'nasm',
                '-felf64',
                '-o', '<(INTERMEDIATE_DIR)/<(RULE_INPUT_ROOT).o',
                '<(RULE_INPUT_PATH)',
              ],
            }
          ],
        }]
      ]
    }
  ]
}
