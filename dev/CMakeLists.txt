cmake_minimum_required(VERSION 3.11)
project(LuigiDev C CXX ASM)

set(CMAKE_CXX_STANDARD 17)

if(MSVC)
    enable_language(ASM_MASM)
    add_compile_definitions(_CRT_SECURE_NO_WARNINGS _CRT_NONSTDC_NO_DEPRECATE)
endif()

# FFI

file(GLOB FFI_SRC ../src/ffi/*.cc)
if(CMAKE_SIZEOF_VOID_P EQUAL 8)
    if(WIN32)
        list(APPEND FFI_SRC ../src/ffi/call_x64_win_fwd.asm)
    elseif(CMAKE_SYSTEM_PROCESSOR STREQUAL aarch64)
        list(APPEND FFI_SRC ../src/ffi/call_arm64_fwd.S)
    else()
        list(APPEND FFI_SRC ../src/ffi/call_x64_sysv_fwd.S)
    endif()
endif()

add_library(FFI SHARED ${FFI_SRC} ${CMAKE_JS_SRC})
set_target_properties(FFI PROPERTIES PREFIX "" SUFFIX ".node")
target_include_directories(FFI PRIVATE ${CMAKE_JS_INC} ../vendor/node-addon-api)
target_link_libraries(FFI PRIVATE ${CMAKE_JS_LIB})
if(WIN32)
    target_link_libraries(FFI PRIVATE ws2_32)
endif()

# Raylib

add_library(Raylib SHARED
    ../../vendor/raylib/src/rcore.c
    ../../vendor/raylib/src/rshapes.c
    ../../vendor/raylib/src/rtextures.c
    ../../vendor/raylib/src/rtext.c
    ../../vendor/raylib/src/rmodels.c
    ../../vendor/raylib/src/utils.c
    ../../vendor/raylib/src/rglfw.c
    ../../vendor/raylib/src/raudio.c
)
set_target_properties(Raylib PROPERTIES PREFIX "")
target_include_directories(Raylib PRIVATE ${CMAKE_JS_INC} ../vendor/raylib/src/external/glfw/include)
target_compile_definitions(Raylib PRIVATE PLATFORM_DESKTOP PLATFORM=PLATFORM_DESKTOP
                                          GRAPHICS_API_OPENGL_21 GRAPHICS=GRAPHICS_API_OPENGL_21 BUILD_LIBTYPE_SHARED NDEBUG)
if(WIN32)
    target_link_libraries(Raylib PRIVATE winmm)
endif()
