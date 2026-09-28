@echo off
setlocal
cd /d "%~dp0"

rem ---------------------------------------------------------------------------
rem  TTAGames launcher.
rem
rem  The site uses ES modules. Browsers fetch modules with CORS rules and treat
rem  file:// as origin "null", so opening index.html by double-clicking always
rem  fails with a CORS/ERR_FAILED error. That is a browser rule, not a bug in
rem  the site — the fix is to serve the folder over HTTP, which is all this is.
rem
rem  Leave this window open while you play. Close it (or Ctrl+C) to stop.
rem ---------------------------------------------------------------------------

set "PORT=8000"
set "SERVER_SCRIPT=%~dp0dev_server.py"

rem Prefer the py launcher, fall back to python on PATH.
set "PYCMD=python"
where py >nul 2>nul && set "PYCMD=py"

%PYCMD% -c "import sys" >nul 2>nul
if errorlevel 1 (
    echo.
    echo   Python was not found on this machine.
    echo.
    echo   Install it from https://www.python.org/downloads/ and run this again,
    echo   or serve this folder with any other static server you already have.
    echo.
    pause
    exit /b 1
)

rem Close a previous launcher for this repo, but leave unrelated port owners alone.
powershell -NoProfile -Command "$script = [IO.Path]::GetFullPath($env:SERVER_SCRIPT); $owners = Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; if (-not $owners) { exit 0 }; $matches = @($owners | ForEach-Object { $process = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $_); if ($process.CommandLine -and $process.CommandLine.IndexOf($script, [StringComparison]::OrdinalIgnoreCase) -ge 0) { $_ } }); if (-not $matches) { exit 1 }; $matches | ForEach-Object { Stop-Process -Id $_ -Force }; exit 2"
if errorlevel 2 (
    echo   Previous TTAGames server stopped. Starting a fresh one...
    echo.
) else if errorlevel 1 (
    echo.
    echo   Port %PORT% is being used by another server.
    echo   Stop it manually, then run this launcher again.
    echo.
    pause
    exit /b 1
)

echo.
echo   Serving    %CD%
echo   Address    http://localhost:%PORT%/
echo.
echo   Leave this window open while you play. Close it to stop the server.
echo.

rem Bound to localhost and disables browser caching while developing.
%PYCMD% "%SERVER_SCRIPT%" %PORT%

echo.
echo   Server stopped.
