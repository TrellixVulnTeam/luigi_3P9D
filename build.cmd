@echo off

setlocal
cd %~dp0

set options=without-intl no-cctest
where /q nasm
if ERRORLEVEL 1 (
    echo WARNING: Could not find NASM assembly compiler in PATH, OpenSSL will be slow
    set options=%options% openssl-no-asm
)

setlocal
call vendor\node\vcbuild.bat %options%
endlocal

copy vendor\node\out\Release\node.exe luigi.exe
