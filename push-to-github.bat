@echo off
title Push to GitHub - FraudGuard AI
echo ========================================================
echo   Pushing AI-Powered Fraud Detection System to GitHub...
echo ========================================================
echo.
git push -u origin main
echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo   SUCCESS! Code and documentation are live on GitHub:
    echo   https://github.com/kritikaperti/AI-POWERED-FRAUD-DETECTION
    echo ========================================================
)
pause
