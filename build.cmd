@echo off

setlocal
call %~dp0\vendor\node\vcbuild.bat without-intl no-cctest
endlocal

setlocal
cd %~dp0

copy vendor\node\out\Release\node.exe luigi.exe
