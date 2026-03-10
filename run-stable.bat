@echo off
cd /d "C:\Users\PC\Documents\Code\Personal\ed-live-salary"
powershell -NoExit -ExecutionPolicy Bypass -Command "Start-Job { Start-Sleep 8; Start-Process 'http://localhost:3000' } | Out-Null; npm run build; if ($LASTEXITCODE -eq 0) { npm start }"