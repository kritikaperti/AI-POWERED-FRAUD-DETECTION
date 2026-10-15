@echo off
title AI-Powered Fraud Detection System
echo ========================================================
echo   Starting AI-Powered Fraud Detection System Server...
echo ========================================================
echo.
echo Website will be available at: http://localhost:8080
echo Press Ctrl+C in this window to stop the server.
echo.
cd /d "%~dp0fraud-detection"
java -jar target\fraud-detection-0.0.1-SNAPSHOT.jar
pause
