# TELEPORT - moving players between places, lobbies, private/reserved servers. Read for multiple places, lobbies, matchmaking, VIP servers.

Teleports run on the SERVER with TeleportService:TeleportAsync. They usually do NOT work inside Studio playtests: test in the PUBLISHED game and tell the user so.

## Basic teleport (with retry)
```lua
local Players = game:GetService("Players")
local TS = game:GetService("TeleportService")
local TARGET = 0 -- the destination PlaceId, from the user. Never invent one.

local function safeTeleport(placeId, players, options)
    for attempt = 1, 3 do
        local ok, result = pcall(function() return TS:TeleportAsync(placeId, players, options) end)
        if ok then return result end
        task.wait(2 * attempt)
    end
    return nil
end
safeTeleport(TARGET, { somePlayer })
```
- Always pcall: teleports can fail (flooded, place down). Handle `TeleportService.TeleportInitFailed` (player, teleportResult, errorMessage, placeId, options) and tell the player.
- Save the player's data BEFORE teleporting (see data.md). Never teleport a player whose data failed to load.
- Teleport a party together by passing several players in one call.
- Custom loading screen: TeleportService:SetTeleportGui(gui) on the client.

## TeleportOptions
```lua
local opt = Instance.new("TeleportOptions")
opt:SetTeleportData({ mode = "duo" })        -- travels with the player
opt.ShouldReserveServer = true               -- a new private (reserved) server
```
- ServerInstanceId = join one specific public server. ShouldReserveServer = create a new reserved server. ReservedServerId = join an existing reserved server (current way; make the id with HttpService:GenerateGUID()). ReservedServerAccessCode and TeleportService:ReserveServerAsync are the older way and not recommended for new work.
- Some combinations error: ShouldReserveServer + ServerInstanceId, ShouldReserveServer + ReservedServerAccessCode, ReservedServerAccessCode + ServerInstanceId.
- Teleport data is NOT secure: the client can see and change it. Never put currency, items or admin flags in it. Use it only for harmless hints (mode, party id) and re-check on the server.
- Read it on the new server: `player:GetJoinData().TeleportData`.

## Lobby / match pattern
Lobby place -> queue players -> when enough, ShouldReserveServer teleport the group to the match place -> after the match, teleport everyone back. Store which players belong to which reserved server on the server, not from client messages.

## Security
- Creator Dashboard > Game > Access Settings: set "Access Control for Places" to Secure when every teleport is done by a server script, so exploiters cannot teleport themselves into your places.
- Old `Teleport()` called from a client script is a risk. Use server TeleportAsync only.
- Never let a remote say "teleport me to place X". The server picks the place.

## Test (give the user this)
1. Publish the game (all places involved).
2. Join the real game, trigger the teleport.
3. You should arrive in the other place. Check your data (money, items) is the same there.
4. If it fails, tell me the message shown (or the Output line).
