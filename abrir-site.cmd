@echo off
cd /d "%~dp0"
echo Iniciando Alucinacoes Semanticas em http://localhost:3000
echo.
"C:\Program Files\nodejs\node.exe" scripts\start-production.cjs
pause
