@echo off
setlocal
title GitSwipe - one-click setup
cd /d "%~dp0"

echo ============================================================
echo   GitSwipe - one-click setup
echo   (the workstation; the browser does the rest)
echo ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [!] Node.js is required ^(v22+^). Install it from https://nodejs.org
  echo     then double-click this file again.
  pause
  exit /b 1
)
echo [ok] Node found:
node --version

if not exist node_modules (
  echo.
  echo [..] Installing dependencies ^(first run only^)...
  call npm install
  if errorlevel 1 (
    echo [!] npm install failed. Check your internet connection and run this file again.
    pause
    exit /b 1
  )
)
echo [ok] Dependencies ready.

if not exist apps\daemon\public\index.html (
  echo.
  echo [..] Building the web UI ^(first run only^)...
  call npm run build:web
  if errorlevel 1 (
    echo [!] The web build failed.
    pause
    exit /b 1
  )
)
echo [ok] Web UI ready.

echo.
echo [..] Starting the GitSwipe workstation...
start "GitSwipe workstation" cmd /c "npm run daemon -- serve"
timeout /t 10 /nobreak >nul

start http://127.0.0.1:7420
echo [ok] The browser is opening http://127.0.0.1:7420
echo.
echo ============================================================
echo   YOU ARE READY.
echo   1. The browser shows the pairing screen.
echo   2. In a NEW terminal run:   npm run daemon -- pair
echo      (or double-click pair-gitswipe.bat in this folder)
echo   3. Enter the code in the browser, then set your AI key
echo      on the Workstation tab.
echo ============================================================
echo.
choice /c LTN /n /m "Remote access? Press L = local only (desktop+phone on same Wi-Fi/hotspot), T = also open an internet tunnel (works from anywhere, phone on mobile data): "
if errorlevel 2 (
  echo.
  echo [..] Setting up the internet tunnel ^(cloudflared, free, no account^)...
  if not exist "%LOCALAPPDATA%\opencode" mkdir "%LOCALAPPDATA%\opencode"
  if not exist "%LOCALAPPDATA%\opencode\cloudflared.exe" (
    echo [..] Downloading cloudflared ^(one time^)...
    curl -sS -L -o "%LOCALAPPDATA%\opencode\cloudflared.exe" https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
  )
  echo.
  echo [ok] Tunnel starting. The https URL printed below works from ANY network -
  echo      type it into the mobile app's Workstation URL field.
  echo      (Ctrl+C here stops the tunnel; the workstation keeps running.)
  "%LOCALAPPDATA%\opencode\cloudflared.exe" tunnel --url http://127.0.0.1:7420
) else (
  echo.
  echo [ok] Local-only. Pair the browser + your phone on the same network
  echo      ^- the serve banner prints the LAN URL for the mobile app.
  echo.
  pause
)
