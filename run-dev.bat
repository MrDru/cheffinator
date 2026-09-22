@echo off
cd /d "%~dp0"
set PORT=3001
set GOOGLE_CLIENT_ID=459817743174-801lveid8ss813rfjfa8rukq52u2c5at.apps.googleusercontent.com
rem Local-only admin secret so tools/admin.html and the export script work in dev
set ADMIN_SECRET=localdev
call npm run dev
