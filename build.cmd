@echo off

setlocal
call %~dp0\vendor\node\vcbuild.bat
endlocal

setlocal
cd %~dp0

copy vendor\node\out\Release\node.exe node.exe
