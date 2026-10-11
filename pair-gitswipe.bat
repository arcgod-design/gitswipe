@echo off
setlocal
title GitSwipe - pairing code
cd /d "%~dp0"
call npm run daemon -- pair
echo.
pause
