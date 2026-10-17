@echo off
cd /d "%~dp0"
powershell -NoProfile -Command "Start-Process -FilePath 'python' -ArgumentList 'server.py' -WorkingDirectory '%~dp0' -WindowStyle Hidden"
timeout /t 2 >nul
start "" "http://localhost:8765/"
