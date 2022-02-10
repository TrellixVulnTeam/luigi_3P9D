{
  'targets': [
    {
      'target_name': 'raylib',
      'type': 'static_library',
      'defines': [
        'PLATFORM_DESKTOP',
        'PLATFORM=PLATFORM_DESKTOP',
        'GRAPHICS_API_OPENGL_33',
        'GRAPHICS=GRAPHICS_API_OPENGL_33',
        'BUILD_LIBTYPE_SHARED',
        'NDEBUG', # Force disable assertions in GLFW
      ],
      'include_dirs': [
        'src/external/glfw/include',
      ],
      'direct_dependent_settings': {
        'include_dirs': [ 'src' ],
      },
      'sources': [
        'src/rcore.c',
        'src/rshapes.c',
        'src/rtextures.c',
        'src/rtext.c',
        'src/rmodels.c',
        'src/utils.c',
        'src/rglfw.c',
        'src/raudio.c',
      ]
    }
  ]
}
