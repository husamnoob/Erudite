# SECURITY CODE - copy-paste helpers. Put them at the top of the SERVER script that needs them.

## Basic helpers
```lua
local Players = game:GetService('Players')

local function isNum(x)
	return type(x) == 'number' and x == x and x ~= math.huge and x ~= -math.huge
end

local function cleanInt(x, min, max)
	if not isNum(x) then return nil end
	x = math.floor(x)
	if x < min or x > max then return nil end
	return x
end

local last = {}
local function allow(player, key, gap)
	local t = last[player]
	if not t then t = {} last[player] = t end
	local now = os.clock()
	if t[key] and now - t[key] < gap then return false end
	t[key] = now
	return true
end
Players.PlayerRemoving:Connect(function(p) last[p] = nil end)

local function isNear(player, part, maxDist)
	local root = player.Character and player.Character:FindFirstChild('HumanoidRootPart')
	return root ~= nil and part ~= nil and part.Parent ~= nil and (root.Position - part.Position).Magnitude <= maxDist
end
```
Use: `if not allow(player, 'Collect', 0.3) then return end` and `local n = cleanInt(amount, 1, 10) if not n then return end`.

## ProximityPrompt or ClickDetector (server)
```lua
prompt.Triggered:Connect(function(player)
	if not allow(player, 'Prompt', 0.5) then return end
	if not isNear(player, prompt.Parent, prompt.MaxActivationDistance + 8) then return end
	-- pay or give here, once
end)
```

## Decoy remote and wrong-direction detection (server)
```lua
local RS = game:GetService('ReplicatedStorage')

local function flag(player, why)
	warn('[SECURITY] ' .. player.Name .. ' (' .. player.UserId .. '): ' .. why)
	player:Kick('Unexpected behavior.')
end

-- Decoy: no real script or player ever fires this. Anything that does is a cheater.
local decoy = Instance.new('RemoteEvent')
decoy.Name = 'AdminGiveMoney' -- tempting name
decoy.Parent = RS
decoy.OnServerEvent:Connect(function(player) flag(player, 'fired decoy') end)

-- Wrong direction: a server -> client remote should never be fired BY a client.
local function guardServerToClient(remote)
	remote.OnServerEvent:Connect(function(player) flag(player, 'fired server-only remote ' .. remote.Name) end)
end
-- Call guardServerToClient(remote) for each RemoteEvent the server only fires to clients.
```
- Never reference the decoy in any LocalScript.
- Kick only for these two high-confidence cases. Everything else: quietly block.

## Impossible-time check (obby, race, tower finish)
```lua
local MIN_TIME = 30 -- seconds: the fastest legal run, plus a small margin. Set from the real map.
local startedAt = {}
-- when the run really starts (server): startedAt[player] = os.clock()
-- when the finish is claimed (server):
local t0 = startedAt[player]
if not t0 or os.clock() - t0 < MIN_TIME then return end -- too fast: reject, no payout
startedAt[player] = nil
Players.PlayerRemoving:Connect(function(p) startedAt[p] = nil end)
```

## Speed and teleport check (server, once per second)
```lua
local lastPos = {}
task.spawn(function()
	while true do
		task.wait(1)
		for _, p in Players:GetPlayers() do
			local root = p.Character and p.Character:FindFirstChild('HumanoidRootPart')
			local hum = p.Character and p.Character:FindFirstChildOfClass('Humanoid')
			if root and hum and hum.Health > 0 then
				local prev = lastPos[p]
				if prev and not p:GetAttribute('ServerMoved') then
					local flat = Vector3.new(root.Position.X - prev.X, 0, root.Position.Z - prev.Z).Magnitude
					if flat > hum.WalkSpeed * 3 + 30 then
						root.CFrame = CFrame.new(prev) -- set back quietly; do not kick on one flag
					end
				end
				lastPos[p] = root.Position
			end
		end
	end
end)
Players.PlayerRemoving:Connect(function(p) lastPos[p] = nil end)
```
- When the SERVER moves a player (teleporter, checkpoint, respawn): `player:SetAttribute('ServerMoved', true)`, move them, then `task.delay(1.5, function() player:SetAttribute('ServerMoved', nil) end)`.
- Set WalkSpeed only on the server (speed pads raise the limit automatically).
