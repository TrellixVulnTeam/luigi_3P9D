@echo off

setlocal enableDelayedExpansion
cd %~dp0

set node=1
set configure=1
set flags=without-intl no-cctest noetw
set run=0
set run_args=

if exist vendor\node\config.status set configure=0

:opt_loop
    if "%~1"=="" goto opt_end

    if "%~1"=="--help" goto help
    if "%~1"=="--skip_node" set node=0 && goto opt_next
    if "%~1"=="-r" set configure=1 && goto opt_next
    if "%~1"=="--reconfigure" set configure=1 && goto opt_next
    if "%~1"=="--no_nasm" set flags=%flags% openssl-no-asm && goto opt_next;
    if "%~1"=="--run" (
        set run=1
        set run_args=%2 %3 %4 %5 %6 %7 %8 %9
        goto opt_end
    )

    echo Unknown option %~1
    exit /B 1
:opt_next
    shift
    goto opt_loop
:opt_end

if %node%==1 (
    if %configure%==0 set flags=noprojgen

    setlocal
    call vendor\node\vcbuild.bat !flags!
    endlocal

    copy vendor\node\out\Release\node.exe luigi.exe
)

vendor\esbuild\esbuild_win_x64.exe --bundle src/luigi/luigi.js --outfile=dev/luigi.js --platform=node --minify

if %run%==1 .\luigi.exe dev/luigi.js %run_args%

exit /B %ERRORLEVEL%

:help
echo Usage: build.cmd [--skip_node] [--reconfigure] [--no_nasm] [--run ^<arguments...^>]
