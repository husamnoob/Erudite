# DATA - saving, loading, leaderstats. Read before touching anything that saves.

## Rules
- Server only. Every DataStore call in pcall. Retry 3 times with task.wait(2^attempt) between tries.
- Use UpdateAsync (not SetAsync) so two saves cannot overwrite each other.
- NEVER let a failed load turn into a save of default data. Track DataLoaded; only save when it is true. If load fails in the live game, kick the player with a message.
- Save on: PlayerRemoving, game:BindToClose, and an autosave every 60-120 seconds. Not every second.
- Studio needs: Game Settings > Security > Enable Studio Access to API Services, and a published place.
- Limits: roughly 4 MB per key. One key per player, store ONE table: {Money=0, JumpPower=50, ...}. Add a Version field.
- Attributes/IntValues are not saved on their own. Copy them into the saved table.

## leaderstats pattern
```lua
local Players = game:GetService("Players")
local function setup(player)
    local ls = Instance.new("Folder")
    ls.Name = "leaderstats"
    local money = Instance.new("IntValue")
    money.Name = "Money"
    money.Value = 0
    money.Parent = ls
    ls.Parent = player -- parent LAST
end
Players.PlayerAdded:Connect(setup)
for _, p in ipairs(Players:GetPlayers()) do task.spawn(setup, p) end -- players already in game
```
IntValue = whole numbers only. NumberValue = decimals.

## Load / save with retry
```lua
local DataStoreService = game:GetService("DataStoreService")
local store = DataStoreService:GetDataStore("MyGame_v1")
local DEFAULT = {Version = 1, Money = 0}

local function load(userId)
    for attempt = 1, 3 do
        local ok, data = pcall(function() return store:GetAsync("p_" .. userId) end)
        if ok then
            if type(data) ~= "table" then data = {} end
            for k, v in pairs(DEFAULT) do if data[k] == nil then data[k] = v end end -- fill missing fields
            return true, data
        end
        task.wait(2 ^ attempt)
    end
    return false, nil
end

local function save(userId, data)
    for attempt = 1, 3 do
        local ok = pcall(function()
            store:UpdateAsync("p_" .. userId, function() return data end)
        end)
        if ok then return true end
        task.wait(2 ^ attempt)
    end
    return false
end
```

## Wiring
```lua
local loaded = {}   -- [player] = true once load succeeded
Players.PlayerAdded:Connect(function(player)
    local ok, data = load(player.UserId)
    if not ok then player:Kick("Could not load your data. Please rejoin.") return end
    -- create leaderstats, copy data into it
    loaded[player] = true
end)
Players.PlayerRemoving:Connect(function(player)
    if loaded[player] then save(player.UserId, collect(player)) end
    loaded[player] = nil
end)
game:BindToClose(function()
    for _, p in ipairs(Players:GetPlayers()) do
        if loaded[p] then task.spawn(save, p.UserId, collect(p)) end
    end
    task.wait(3)
end)
```
collect(player) builds the table from leaderstats and attributes.

## Schema versioning
Keep data.Version. When you add a field: bump DEFAULT, and fill missing fields on load (as above) so old saves keep working. Never rename a saved field without migrating (data.NewName = data.OldName; data.OldName = nil).

## Resetting test data (Studio store)
Set DataLoaded to false first so the player is not re-saved, then store:RemoveAsync("p_" .. userId) on the _Studio store only. Never touch the live store when testing.

## Other save targets
- OrderedDataStore for leaderboards (integers only): GetSortedAsync(false, 10).
- Per-session data (cooldowns): player attributes, not DataStore.
- Use MemoryStore only for short-lived cross-server data.
