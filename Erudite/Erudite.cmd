@echo off
if defined ERUDITE_IN_WT goto start
rem Make an Erudite shortcut (with the Erudite icon) next to this file, once.
if not exist "%~dp0Erudite.lnk" if exist "%~dp0Erudite.ico" powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%~dp0Erudite.lnk'); $s.TargetPath='%~dp0Erudite.cmd'; $s.WorkingDirectory='%~dp0'; $s.IconLocation='%~dp0Erudite.ico'; $s.Description='Erudite'; $s.Save()" >nul 2>&1
where wt >nul 2>&1 || goto start
rem Glass look: adds the "Erudite Glass" Windows Terminal profile once (makes a backup first, does nothing if already there).
if exist "%~dp0install-look.js" node "%~dp0install-look.js" --auto >nul 2>&1
set ERUDITE_IN_WT=1
start "" wt -w new -p "Erudite Glass" -d "%~dp0." cmd /c ""%~f0" %*"
exit /b
:start
title Erudite v1.0
cd /d "%~dp0"
echo.
echo   ERUDITE v1.0
echo.
if "%GEMINI_API_KEY%"=="" (
    echo No Gemini key is saved yet. A second window opens to show you how.
    echo This window does NOT save anything by itself.>"%TEMP%\erudite-key-help.txt"
    echo.>>"%TEMP%\erudite-key-help.txt"
    echo 1. Get a free key at https://aistudio.google.com/apikey>>"%TEMP%\erudite-key-help.txt"
    echo 2. Copy the line at the bottom, replace PASTE_YOUR_KEY_HERE with your key,>>"%TEMP%\erudite-key-help.txt"
    echo    keep the quotes, paste it here and press Enter.>>"%TEMP%\erudite-key-help.txt"
    echo 3. Close every Erudite window and start Erudite again.>>"%TEMP%\erudite-key-help.txt"
    echo.>>"%TEMP%\erudite-key-help.txt"
    echo setx GEMINI_API_KEY "PASTE_YOUR_KEY_HERE">>"%TEMP%\erudite-key-help.txt"
    start "Erudite - save your key" cmd /k type "%TEMP%\erudite-key-help.txt"
    echo When you have saved the key, close all windows and start Erudite again.
    pause
    exit /b
)

where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed. Gemini mode needs it. Get it from https://nodejs.org
    pause
    exit /b
)
start "" /b node "%~dp0gemini-proxy.js"
set ANTHROPIC_BASE_URL=http://127.0.0.1:8788
timeout /t 1 /nobreak >nul
set ANTHROPIC_AUTH_TOKEN=local-proxy
set ANTHROPIC_API_KEY=

set ANTHROPIC_DEFAULT_SONNET_MODEL=gemini-3.5-flash-lite
set ANTHROPIC_DEFAULT_HAIKU_MODEL=gemini-3.5-flash-lite
set ANTHROPIC_DEFAULT_OPUS_MODEL=gemini-3.5-flash-lite
set CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
set API_TIMEOUT_MS=400000
set CLAUDE_CODE_MAX_RETRIES=2
set MAX_THINKING_TOKENS=0
set CLAUDE_CODE_MAX_OUTPUT_TOKENS=16000
rem Tells the shell the context size, so the "model not recognized" warning goes away.
rem Also the point where it shrinks the chat (compacts). Smaller = smaller requests = less free quota used.
set CLAUDE_CODE_MAX_CONTEXT_TOKENS=128000

rem Lessons: lessons.json is a list of rules Erudite saves with lessons.js. Make an empty one the first time.
if not exist lessons.json echo []> lessons.json
rem LEAN mode (default): short core rules + Erudite prompt replace the shell's long default prompt, and fewer tools are sent.
rem To go back to the old way, create an empty file named classic.txt in this folder.
set LEAN=1
if exist classic.txt set LEAN=0
if not exist erudite_core.txt set LEAN=0
set SYSFLAG=--append-system-prompt-file combined_prompt.txt
set TOOLFLAG=
if "%LEAN%"=="1" (
    node lessons.js build lean
    set SYSFLAG=--system-prompt-file combined_prompt.txt
    set TOOLFLAG=--tools Read,Write,Edit,Glob,Grep,Bash,WebFetch
) else (
    node lessons.js build classic
)

rem Cards: make the CARDS folder and install the /cards and /cardadd commands.
if not exist CARDS mkdir CARDS
if not exist ".claude\commands" mkdir ".claude\commands"
if exist cmd-cards.md copy /y cmd-cards.md ".claude\commands\cards.md" >nul
if exist cmd-cardadd.md copy /y cmd-cardadd.md ".claude\commands\cardadd.md" >nul
if exist cmd-exploit.md copy /y cmd-exploit.md ".claude\commands\exploit.md" >nul
if exist cmd-rollback.md copy /y cmd-rollback.md ".claude\commands\rollback.md" >nul
if exist cmd-huhgame.md copy /y cmd-huhgame.md ".claude\commands\huhgame.md" >nul
if not exist undo mkdir undo
if exist erudite-settings.json copy /y erudite-settings.json ".claude\settings.json" >nul

rem We allow ONLY the tools needed to read and write to your live game.
claude --model gemini-3.5-flash-lite %SYSFLAG% %TOOLFLAG% --mcp-config mcp.json --allowedTools "mcp__roblox-studio,Read,Write,Edit,Glob,Grep,Bash(explorer.exe *),Bash(node lessons.js *),WebFetch(domain:create.roblox.com),WebFetch(domain:devforum.roblox.com)" --disallowedTools "mcp__roblox-studio__upload_image,mcp__roblox-studio__file_search,mcp__roblox-studio__skill,mcp__roblox-studio__subagent,mcp__roblox-studio__multi_edit,mcp__roblox-studio__auto_setup_avatar,mcp__roblox-studio__store_image,mcp__roblox-studio__http_get,mcp__roblox-studio__read_file,mcp__roblox-studio__generate_layout,mcp__roblox-studio__grep_search,mcp__roblox-studio__wait_job_finished,mcp__roblox-studio__generate_procedural_model,mcp__roblox-studio__primitive_generation,mcp__roblox-studio__generate_texture,mcp__roblox-studio__texture_generation,mcp__roblox-studio__list_skills,mcp__roblox-studio__mesh_segmentation,mcp__roblox-studio__segment_mesh,mcp__roblox-studio__create_skill,mcp__roblox-studio__generate_mesh,mcp__roblox-studio__mesh_generation,mcp__roblox-studio__generate_material,mcp__roblox-studio__material_generation,mcp__roblox-studio__search_asset,mcp__roblox-studio__edit_skill,mcp__roblox-studio__insert_asset" %*
if exist gemini-proxy.pid for /f %%p in (gemini-proxy.pid) do taskkill /f /pid %%p >nul 2>&1
del gemini-proxy.pid >nul 2>&1
