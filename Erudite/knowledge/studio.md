# STUDIO - working with the roblox-studio MCP tools fast. Read at the start of every Studio task.

## Golden rule: FEW trips
Each tool call is a round trip to the model and costs seconds. Do a whole job in ONE Execute Luau call when you can: create all the instances, set all properties, set scripts' Source, parent last.

## Start of every task
1. list_roblox_studios ONCE, remember the id. If "Studio is not connected", call it again.
2. Do not scan or summarize the whole place. Look only at what you will edit.
3. Before creating anything, check if it exists (same name + parent). If yes, edit it.

## Reading
- Read a script's Source before editing it. Never guess its contents.
- To list children, print only names and ClassNames of the one container you need.

## Creating in Execute Luau (pattern)
```lua
local SSS = game:GetService("ServerScriptService")
local existing = SSS:FindFirstChild("MyHandler")
if existing then existing:Destroy() end        -- or edit it instead
local s = Instance.new("Script")
s.Name = "MyHandler"
s.Source = [[
-- code here
]]
s.Parent = SSS                                  -- parent LAST
print("created", s:GetFullName(), #s.Source)   -- confirm Source is not empty
```
- Script classes: Script (server), LocalScript (client), ModuleScript. Wrong class = silent failure.
- Multi-line code goes in [[ ]]. If the code itself has ]], use [=[ ]=].
- Do not put the user's secrets in code.

## Editing
Smallest change that works. Prefer replacing one line/block over rewriting a script. After editing, read the Source back (or check #Source) to confirm.

## Disabling things
"Make it not function / turn it off" = script.Disabled = true, or destroy only its ClickDetector. Never write new code for that.

## Playtest (after EVERY change, then LOOK)
1. start_stop_play to start. 2. Wait a few seconds. 3. Call get_console_output and read all of it for red errors and "Infinite yield" warnings (call it again after you interact with the game). 4. Prove the behavior with real values through Execute Luau while it runs (Money before/after, the object exists, a GUI is Visible with AbsoluteSize not 0). 5. screen_capture and describe what you really see; for UI changes the screenshot must show it. Use character_navigation / user_keyboard_input / user_mouse_input to try it like a player. 6. If wrong: stop the playtest, fix the real cause, test again (max 3 rounds, then report the exact problem). 7. STOP the playtest before any edit (edits made during a playtest are lost).
End with: "Tested: <what you did> -> <what you saw>". Never claim it works unless you saw it work.

## Do not
- Click BUY or trigger real purchase prompts.
- Teleport-test while the user is moving their character.
- Touch the skybox, existing GUIs, or the game's existing money, reward and save scripts unless asked.
- Invent tool parameters or asset ids. Re-read the tool's real parameter names.
- Repeat a failing call more than twice.

## Reporting
Change log first (🟢 Created, 🟡 Updated, 🟠 Renamed, 🔴 Removed, one line each, full path). Then code of changed scripts. Then 1-3 short friendly sentences. Remind the user to publish the place when changes should reach the live game.
