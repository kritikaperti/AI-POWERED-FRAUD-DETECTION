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
    echo   https://github.com/kritikaperti/AI-POWERED-FRAUD-DETECTION-SYSTEM
    echo ========================================================
) else (
    echo ========================================================
    echo   If you see "Repository not found":
    echo   1. Go to https://github.com/new in your browser
    echo   2. Repository name: AI-POWERED-FRAUD-DETECTION-SYSTEM
    echo   3. Leave README and .gitignore UNCHECKED
    echo   4. Click "Create repository"
    echo   5. Re-run this script!
    echo ========================================================
)
pause
