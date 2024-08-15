@echo off
:loop
echo Starting Bot
node .
echo Restarting Bot in 3 Seconds...
timeout /t 3 /nobreak >nul
goto loop