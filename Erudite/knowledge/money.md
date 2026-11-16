# MONEY - gamepasses, developer products, multipliers, daily rewards, codes. Read before any monetization or reward work.

Never click BUY while testing (real Robux prompt). Use a second account, or test the grant function directly from Execute Luau.
Gamepasses and developer products need the game published. Items must be created in Creator Hub > Monetization.
Always the SERVER computes the payout. Never apply a multiplier on the client.

## Gamepasses (one-time purchase)
```lua
-- SERVER: ownership check, cached, pcall
local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local owns = {} -- [userId] = {[passId]=true}
local function hasPass(player, passId)
    owns[player.UserId] = owns[player.UserId] or {}
    if owns[player.UserId][passId] ~= nil then return owns[player.UserId][passId] end
    local ok, result = pcall(MarketplaceService.UserOwnsGamePassAsync, MarketplaceService, player.UserId, passId)
    if ok then owns[player.UserId][passId] = result; return result end
    return false
end
-- Bought during the session:
MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(player, passId, purchased)
    if purchased then
        owns[player.UserId] = owns[player.UserId] or {}
        owns[player.UserId][passId] = true
        -- apply the perk here (server)
    end
end)
Players.PlayerRemoving:Connect(function(p) owns[p.UserId] = nil end)
```
Client prompts only: MarketplaceService:PromptGamePassPurchase(player, passId).
Apply perks on join (CharacterAdded / PlayerAdded) AND when purchased. Example perks: x2 Money (multiplier), +speed, VIP door, a tool.

## Developer products (repeatable purchases)
Set ProcessReceipt EXACTLY ONCE, in ONE server script. Roblox also offers an alternative bound-handler API (MarketplaceService:BindReceiptHandler); a bound handler takes precedence, otherwise ProcessReceipt is used. Keep to ProcessReceipt unless told otherwise.
```lua
local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local DataStoreService = game:GetService("DataStoreService")
local receiptStore = DataStoreService:GetDataStore("Receipts_v1")

local grants = {
    [0000000] = function(player) -- replace with the real product id
        local ls = player:FindFirstChild("leaderstats")
        if ls and ls:FindFirstChild("Money") then ls.Money.Value += 5000 end
        return true
    end,
}

MarketplaceService.ProcessReceipt = function(receipt)
    local player = Players:GetPlayerByUserId(receipt.PlayerId)
    if not player then return Enum.ProductPurchaseDecision.NotProcessedYet end
    local key = receipt.PlayerId .. "_" .. receipt.PurchaseId
    local okRead, done = pcall(function() return receiptStore:GetAsync(key) end)
    if not okRead then return Enum.ProductPurchaseDecision.NotProcessedYet end
    if done then return Enum.ProductPurchaseDecision.PurchaseGranted end -- already granted
    local handler = grants[receipt.ProductId]
    if not handler then return Enum.ProductPurchaseDecision.NotProcessedYet end
    local okGrant, granted = pcall(handler, player)
    if not (okGrant and granted) then return Enum.ProductPurchaseDecision.NotProcessedYet end
    local okSave = pcall(function() receiptStore:SetAsync(key, true) end)
    if not okSave then return Enum.ProductPurchaseDecision.NotProcessedYet end
    return Enum.ProductPurchaseDecision.PurchaseGranted
end
```
Client prompts: MarketplaceService:PromptProductPurchase(player, productId). Idea: money packs (5k, 25k, 100k), 15-min x2 boost, instant jump boost.

## Multiplier on the fall payout (pay-to-win)
Where the game pays out (for example a fall or reward script): payout = studs * 2 * MoneyMultiplier. Keep ONE final multiplier value that is the product of: base MoneyMultiplier (saved) x pass multipliers x active boosts.
```lua
local function totalMultiplier(player)
    local m = player:GetAttribute("MoneyMultiplier") or 1   -- or the saved leaderstat, read the real script first
    if hasPass(player, X2_MONEY_PASS_ID) then m *= 2 end
    local boostUntil = player:GetAttribute("BoostUntil") or 0
    if os.time() < boostUntil then m *= 2 end
    return m
end
-- in the fall payout: money.Value += math.floor(studs * 2 * totalMultiplier(player))
```
Time boost from a product: player:SetAttribute("BoostUntil", math.max(os.time(), player:GetAttribute("BoostUntil") or 0) + 900). Save BoostUntil so it survives rejoin.
Edit the existing reward script with the smallest change: one line using totalMultiplier. Do not rewrite it.

## Daily reward streak (server)
Saved fields: LastClaim (os.time), Streak.
```lua
local DAY = 24 * 60 * 60
local rewards = {500, 1000, 2000, 4000, 8000, 16000, 50000} -- day 1..7, then repeats
local function claim(player, data)
    local now = os.time()
    local since = now - (data.LastClaim or 0)
    if since < DAY then return false, DAY - since end            -- too early, seconds left
    if since > 2 * DAY then data.Streak = 0 end                   -- missed a day, reset
    data.Streak = (data.Streak or 0) + 1
    data.LastClaim = now
    local reward = rewards[((data.Streak - 1) % #rewards) + 1]
    player.leaderstats.Money.Value += reward
    return true, reward
end
```
Client shows a button and countdown; it asks via RemoteEvent; the server does the check. Use os.time() (UTC), never client time.

## Redeem codes (server)
```lua
local CODES = { WELCOME = {Money = 1000}, RELEASE = {Money = 5000} } -- keep uppercase
-- RemoteFunction OnServerInvoke (set once):
redeem.OnServerInvoke = function(player, text)
    if type(text) ~= "string" or #text > 30 then return "Invalid" end
    local code = string.upper((string.gsub(text, "%s", "")))
    local reward = CODES[code]
    if not reward then return "Invalid code" end
    local used = getUsedCodes(player) -- saved table in player data
    if used[code] then return "Already used" end
    used[code] = true
    player.leaderstats.Money.Value += reward.Money
    return "Redeemed!"
end
```
Add a 2-second per-player cooldown against guessing. Codes live in a server script, never in a LocalScript.

## Pricing sanity (Robux)
Common slop pricing: small pack 25-49 R$, medium 99-199, big 499-999, x2 Money pass 199-399, VIP 299-499.
