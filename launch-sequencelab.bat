@echo off
setlocal
cd /d "%~dp0"

echo Starting SequenceLab Application...
echo.

if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo Failed to install dependencies.
    pause
    exit /b 1
  )
  echo.
)

call npm run dev

if errorlevel 1 (
  echo.
  echo The dev server exited with an error.
  pause
  exit /b 1
)

endlocal

