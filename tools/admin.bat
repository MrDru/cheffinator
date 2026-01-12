@echo off
title Cheffinator Admin Tool

REM ============================================
REM PASTE YOUR RENDER DATABASE URL BELOW
REM Get it from: Render Dashboard > PostgreSQL > External Database URL
REM ============================================
set DATABASE_URL=postgresql://cheffinatoe_db_user:vNvSGG1sp2i7WSt3yUnW3MH9IUHaVZsj@dpg-d57ibu3uibrs73a6kvvg-a.oregon-postgres.render.com/cheffinatoe_db

cd /d "%~dp0..\backend"
node admin.js

pause
