@echo off
title SSH 连接监控面板
echo ========================================
echo   SSH 连接监控面板 - 启动脚本
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] 检查依赖...
call npm install --silent

echo.
echo [2/2] 启动服务...
echo.
echo   访问地址: http://localhost:4521
echo   按 Ctrl+C 停止服务
echo.

node server.js

pause

