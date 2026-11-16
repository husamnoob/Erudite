# GAMEPLAY - remotes, touch/click, and common game pieces. Read when building a mechanic.

## Structure
Server logic -> ServerScriptService. Shared modules/remotes -> ReplicatedStorage. UI/input -> StarterGui / StarterPlayerScripts. World parts -> Workspace. One script per system, named by its job (ClickHandler, SellZoneHandler, EggHandler). Prefer CollectionService tags + attributes over long if-chains.

## Remotes (client -> server), always validated
```lua
-- SERVER
local RS = game:GetService("ReplicatedStorage")
local remote = RS:FindFirstChild("BuyItem") or Instance.new("RemoteEvent")
remote.Name = "BuyItem"; remote.Parent = RS
local last = {}
remote.OnServerEvent:Connect(function(player, itemId)
    if type(itemId) ~= "string" then return end                 -- type check
    if os.clock() - (last[player] or 0) < 0.3 then return end   -- cooldown
    last[player] = os.clock()
    local item = ITEMS[itemId]; if not item then return end     -- exists?
    local money = player.leaderstats.Money
    if money.Value < item.cost then return end                  -- can afford? (server value)
    money.Value -= item.cost
    -- grant
end)
-- CLIENT
local remote = game:GetService("ReplicatedStorage"):WaitForChild("BuyItem")
remote:FireServer("Dumbbell1")
```
Never send prices or amounts from the client. Server looks them up.

## Touched with debounce
```lua
local touching = {}
part.Touched:Connect(function(hit)
    local char = hit.Parent
    local hum = char and char:FindFirstChildOfClass("Humanoid")
    local player = hum and game.Players:GetPlayerFromCharacter(char)
    if not player or touching[player] then return end
    touching[player] = true
    -- do thing
    task.delay(1, function() touching[player] = nil end)
end)
```

## ClickDetector / ProximityPrompt
- ClickDetector: child of the part, MaxActivationDistance set, MouseClick on the SERVER (player is the argument).
- ProximityPrompt: set ActionText, ObjectText, HoldDuration, MaxActivationDistance, RequiresLineOfSight. Server: prompt.Triggered:Connect(function(player) ... end).

## Common pads and bricks
- Kill brick: Touched -> Humanoid -> Health = 0.
- Checkpoint: Touched -> player:SetAttribute("Checkpoint", part.Name); on CharacterAdded, PivotTo the saved checkpoint part (+ Vector3 up 3).
- Speed pad: set WalkSpeed, task.delay(5) to reset (store old value).
- Jump pad: hrp.AssemblyLinearVelocity = Vector3.new(0, 80, 0).
- Teleporter: hrp.CFrame = target.CFrame + Vector3.new(0, 4, 0).
- Spawn: SpawnLocation (set Neutral, Duration = 0 to remove the forcefield).

## Tweening parts (client for visuals, or server for gameplay-relevant parts)
```lua
local TweenService = game:GetService("TweenService")
TweenService:Create(part, TweenInfo.new(1, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), {Position = part.Position + Vector3.new(0, 5, 0)}):Play()
```
Moving platforms must be Anchored; players ride them through physics (use AssemblyLinearVelocity or a tween on an anchored part, it is okay).

## Rainbow/spin tags
CollectionService:GetTagged("Rainbow") + GetInstanceAddedSignal. One loop for all tagged parts, with task.wait(), not one loop per part.

## Raycast (ground check, line of sight)
```lua
local params = RaycastParams.new()
params.FilterDescendantsInstances = {character}
params.FilterType = Enum.RaycastFilterType.Exclude
local r = workspace:Raycast(origin, Vector3.new(0, -50, 0), params)
if r then print(r.Instance, r.Position, r.Distance) end
```

## NPC from a username
Players:GetUserIdFromNameAsync(name) (pcall) -> Players:CreateHumanoidModelFromUserId(id) -> set PrimaryPart (HumanoidRootPart) -> model:PivotTo(spawn.CFrame) -> model.Parent = workspace. Hide the spawn brick: Transparency = 1, CanCollide = false. Anchor the root for a statue NPC.

## Currency zones and loops
- Sell zone: Part + Touched (debounce) -> convert the player's carried amount to Money on the SERVER.
- Click simulators: ClickDetector or remote -> +1 per click x multiplier (server). Cap clicks per second.
- Tycoon: one folder per plot, Claimed BoolValue/attribute, dropper loop (task.wait), conveyor via anchored part + AssemblyLinearVelocity or tween.
- Leaderboard: SurfaceGui with a row per player, refresh with task.wait(5+). Global boards use OrderedDataStore (not every second).

## Pets and eggs
- Egg: cost check on server, weighted roll, add pet to the player's saved table.
- Rarity default: Common 60, Uncommon 25, Rare 10, Epic 4, Legendary 1. Roll: r = math.random() * total; subtract each weight until r <= 0.
- Pet follow: weld/AlignPosition to HumanoidRootPart with an offset, one script, pets Massless and CanCollide = false.

## Tools (like Super Coil)
Tool in ServerStorage; clone into player.Backpack on CharacterAdded (and into StarterGear to persist across death). Server-side changes to WalkSpeed/JumpPower go in Equipped/Unequipped handlers, and reset on Unequipped.

## Player and character
- player.CharacterAdded:Connect(function(char) ... end); also run it for the current character if it exists.
- Humanoid properties: WalkSpeed, JumpPower (needs UseJumpPower true) or JumpHeight, Health, MaxHealth.
- Fall detection: track the highest Y while Humanoid.FloorMaterial == Air; on landing compute drop = peak - landingY (server verifies with a raycast; reject drops bigger than a jump could produce).

## Performance habits
Disconnect connections when an object is destroyed. Do not create instances in per-frame loops. One Heartbeat loop for many items. Use StreamingEnabled only if the map is huge.
