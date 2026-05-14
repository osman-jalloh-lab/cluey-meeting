@echo off
title PARAWI Morning Brief
cd /d "C:\Users\osman\OneDrive\Desktop\my dashboard\parawi"
echo.
echo  PARAWI Morning Brief starting...
echo.
node scripts\morning-brief.mjs
if %errorlevel% neq 0 (
  echo.
  echo  ERROR: Morning brief failed. Check the output above.
  pause
)
