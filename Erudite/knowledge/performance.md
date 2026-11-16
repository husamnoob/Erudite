# PERFORMANCE - lag, memory, load time. Read when the game is slow, laggy, crashes, or before adding many parts/loops.

Target: 60 FPS = one frame every 16.7 ms. Low server heartbeat lags EVERY player. Studio runs on a strong PC; phones are weaker (about 65% of players are on Android), so a game that is fine in Studio can still lag on a phone. Test with Device Emulator (see testing.md).

## Where to look (Developer Console F9 in a live server, or MicroProfiler Ctrl+F6)
- LuaHeap growing = memory leak in scripts. InstanceCount growing forever = instances never destroyed. PlaceScriptMemory = memory per script.
- Memory leaks hurt the SERVER most (it runs for days).

## Top causes and fixes
1. Heavy work every frame. RunService.Heartbeat / PreSimulation / PostSimulation / PreRender run 60+ times a second. Use them only when needed (camera, smooth movement). Everything else: a `while task.wait(0.5) do` loop or an event.
2. Big loops freeze the frame. Spread the work: `task.wait()` every N iterations. Heavy math that does not touch the game world can run in parallel (Actors) - only if needed.
3. Event connections never disconnected. Player and character objects stay in memory if a connection still points at them. Save the connection and `:Disconnect()` it, or `:Destroy()` the object.
4. Tables that only grow. Anything stored per player must be cleared on leave:
```lua
local data = {}
game:GetService("Players").PlayerRemoving:Connect(function(plr) data[plr] = nil end)
```
5. Instances never destroyed (bullets, effects, NPCs, pickups). Destroy them, or `game:GetService("Debris"):AddItem(obj, 3)`.
6. Mesh parts with precise collision. CollisionFidelity Box (or Hull) for small or anchored parts that need no exact shape. Precise/Default use the most memory and physics time.
7. Too many parts or unanchored parts. Anchor everything that does not move. Merge or reduce decorative parts.
8. Expensive table work (deep copy, serialize) in loops. Do it once, not every tick.
9. StreamingEnabled: parts far from the player may not exist on the client yet. Use WaitForChild, and do hit checks that need far parts on the server.
10. Server-only scripts that are very heavy may get `--!native` at the top (native code generation). Only if profiling shows the script is the problem.

## How Erudite should work
- Do not guess. Find the cause first: read the scripts for loops/connections/tables, count instances, check CollisionFidelity with the Studio tools.
- Fix ONE cause, then tell the user how to check: "Play, open F9 > Memory, wait 2 minutes, LuaHeap and InstanceCount should stop growing."
- Never claim a speed-up you did not measure. Say what should improve and how the user can see it.
