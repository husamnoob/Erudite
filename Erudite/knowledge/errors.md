# ERRORS - read this when Output shows an error or something silently does nothing

## Output errors (text -> cause -> fix)
- "attempt to index nil with 'X'" -> the thing before .X is nil (missing child, not loaded, no character yet) -> WaitForChild, or FindFirstChild + nil check.
- "X is not a valid member of Y" -> wrong name/parent or not loaded -> list Y's real children, copy the exact name.
- "Infinite yield possible on Y:WaitForChild("X")" -> X never appears: wrong name, wrong parent, or server-only place (ServerStorage/ServerScriptService are invisible to clients) -> fix name, or move to ReplicatedStorage.
- "attempt to call a nil value" -> typo, missing function, or dot instead of colon (part.Destroy() must be part:Destroy()).
- "attempt to perform arithmetic on nil" / "compare number with nil" -> value nil -> default it: (x:GetAttribute("A") or 0).
- "arithmetic on string" / "concatenate nil" -> wrong type -> tonumber() / tostring().
- "Expected 'end' (to close...)", "Expected ')'", "Unexpected symbol" -> unbalanced end/parens -> rewrite the whole broken block, do not patch one character.
- "Argument 1 missing or nil" / "Instance expected, got nil" -> a nil was passed -> check the variable above the call (read the code; to prove the line runs, add print("EXAMPLE") there, then remove it).
- "Unable to assign property X. ... expected, got ..." -> wrong type -> Color3.fromRGB, Vector3.new, UDim2.fromScale, Enum.X.Y.
- "X is not a valid property name" -> property not on that class (Part has no Text).
- "The Parent property of X is locked" -> used an instance after :Destroy() -> make a new one.
- "Script timeout: exhausted allowed execution time" -> loop without task.wait.
- "Module code did not return exactly one value" -> ModuleScript must end with one return.
- "Requested module experienced an error while loading" -> error is inside the module; read the lines above it.
- "FireServer can only be called from the client" / "FireClient ... from the server" -> wrong side. Client: :FireServer(args). Server: :FireClient(player, args) or :FireAllClients(args).
- OnServerInvoke / OnClientEvent never runs -> handler set after the call, set twice, or on the wrong side. Set OnServerInvoke once at the top of a server Script.
- "HTTP 403" / "Studio access to API Services is not enabled" / DataStore errors in Studio -> Game Settings > Security > Enable Studio Access to API Services, publish the place, pcall every call.
- PlayerGui/StarterGui object missing at runtime -> StarterGui is copied into PlayerGui on spawn; on the client use player:WaitForChild("PlayerGui"). Edits to StarterGui during a playtest do not reach the running player.
- "LoadAnimation is deprecated" -> use Humanoid:WaitForChild("Animator"):LoadAnimation(anim).
- "SetPrimaryPartCFrame is deprecated" -> model:PivotTo(cframe).
- Clone() returns nil -> the object has Archivable = false; set Archivable = true first.
- "Attempted to call require(...) with invalid argument" -> pass the ModuleScript instance (or a valid asset id), not a string path.
- "ServerScriptService.X.Y is not a valid member" inside a LocalScript -> client cannot see ServerScriptService; use ReplicatedStorage.
- "DataStore request was added to queue" -> too many DataStore calls; batch saves, use UpdateAsync, save every 60-120s not every second.

## Silent failures (nothing happens, no error). Check in order
1. Wrong script type or place. Script runs in Workspace/ServerScriptService. LocalScript only runs in StarterGui, StarterPlayerScripts, StarterCharacterScripts, or inside the player's character/PlayerGui.
2. Script.Disabled = true, or a duplicate copy exists (events firing twice = duplicate script or connected twice).
3. Event connected to the wrong object (name mismatch) or before the object existed. Put print("EXAMPLE") inside the handler to prove it fires, then remove it.
4. ClickDetector dead: not a child of the part, MaxActivationDistance too small, another part blocks it, CanQuery false.
5. Touched never fires: CanTouch false, other part is not a character part. Check hit.Parent for a Humanoid.
6. Part falls/drifts: not Anchored.
7. UI invisible: ScreenGui.Enabled false, Frame.Visible false, size 0, off-screen, text color = background, wrong ZIndex/DisplayOrder, GUI not in PlayerGui. Read AbsoluteSize with the Studio tools instead of printing it.
8. UI never updates: it read the value once. Use value:GetPropertyChangedSignal("Value") or .Changed.
9. leaderstats missing: folder must be named exactly "leaderstats", created on the server, hold IntValue/NumberValue/StringValue, parented to the player LAST.
10. Values reset every join: nothing saves them (see data.md).
11. JumpPower does nothing: Humanoid.UseJumpPower must be true (StarterPlayer.CharacterUseJumpPower), else JumpHeight is used.
12. WalkSpeed/JumpPower resets: respawn resets it, or another script writes it. Set it in player.CharacterAdded. Search for other writers.
13. Character code too early: player.Character can be nil -> player.Character or player.CharacterAdded:Wait(), then character:WaitForChild("Humanoid").
14. Works only sometimes = race condition: WaitForChild with timeout; create shared objects in Studio, not at runtime.
15. Edit did not take effect: read Source back to confirm; changes made during a playtest vanish when it stops.
16. IntValue holding decimals: IntValue is whole numbers only; use NumberValue.
17. Remote fires but nothing happens: server handler never connected (script disabled/errored earlier), or client fired before the remote existed.
18. Tween does nothing: wrong property name in the goal table, or the property is already at that value.

## Studio MCP tool errors
- "Studio is not connected" -> call list_roblox_studios again, use the new id.
- Tool rejects arguments -> re-read the tool's parameter names, retry once with exact names. Never invent parameters.
- Same failing call max twice. Then change something or stop and tell the user the exact error in one line.
- Execute Luau error -> read the full message, fix, run once more.
- Fix failed twice -> stop and report. Never loop forever.

## Debug method (cheap and fast)
1. Read the exact error text and line number. 2. Find it above. 3. Fix only that cause. 4. If unsure, add print("EXAMPLE") to prove the code runs, then remove it. 5. Retest once.
