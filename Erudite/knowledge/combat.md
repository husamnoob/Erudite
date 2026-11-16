# COMBAT - weapons, damage, hits, cooldowns. Read for swords, guns, abilities, bosses, PvP. Also read security.md.

Rule: the SERVER decides every hit and every number. The client may only say "I attacked" and where it aimed. Never accept damage amounts, "I hit player X", or hit positions as truth.

## Pick a hit method
- Instant (guns, lasers, beams): Workspace:Raycast from the player's character toward the aim direction.
- Melee / area (sword swing, slam): Workspace:GetPartBoundsInBox / GetPartBoundsInRadius with OverlapParams, once per swing. Do NOT rely on Touched alone (misses fast swings, fires many times).
- Slow projectile (fireball, ball): a server part with velocity and a hit check each step, or a ray each step.

## Server attack template
```lua
-- server: remote.OnServerEvent
local COOLDOWN, RANGE, DAMAGE = 0.5, 12, 20
local last = {}
remote.OnServerEvent:Connect(function(player, aimDir)
    if typeof(aimDir) ~= "Vector3" or aimDir.Magnitude < 0.1 then return end
    if os.clock() - (last[player] or 0) < COOLDOWN then return end   -- cooldown on server
    last[player] = os.clock()
    local char = player.Character
    local hrp = char and char:FindFirstChild("HumanoidRootPart")
    local hum = char and char:FindFirstChildOfClass("Humanoid")
    if not hrp or not hum or hum.Health <= 0 then return end         -- must be alive
    -- (check the player really holds the weapon: Tool in the character)
    local params = RaycastParams.new()
    params.FilterType = Enum.RaycastFilterType.Exclude
    params.FilterDescendantsInstances = {char}
    local result = workspace:Raycast(hrp.Position, aimDir.Unit * RANGE, params)
    if not result then return end
    local targetHum = result.Instance:FindFirstAncestorOfClass("Model")
        and result.Instance:FindFirstAncestorOfClass("Model"):FindFirstChildOfClass("Humanoid")
    if targetHum and targetHum.Health > 0 then
        targetHum:TakeDamage(DAMAGE)       -- number comes from the SERVER, never the client
    end
end)
game:GetService("Players").PlayerRemoving:Connect(function(p) last[p] = nil end)  -- no leaks
```

## Always check on the server
Cooldown, alive, holds the weapon, range, aim direction is a real Vector3, damage from a server table, target is not on the same team (if teams), target is alive. Ray starts at the SERVER position of the character, not a position the client sends.

## Notes
- Humanoid:TakeDamage is blocked by a ForceField; setting Health directly is not. Use TakeDamage for normal hits.
- BasePart.CanQuery = false makes a part invisible to raycasts (use for effects and invisible zones).
- Rays and overlap checks on far parts can fail on the CLIENT when StreamingEnabled is on. Do the real check on the server.
- Kill credit: set an attribute or tag (creator = player) on the humanoid before damage, read it in Humanoid.Died.
- Visual effects (muzzle flash, hit spark) are client-side, fired by a remote AFTER the server confirms.
- Lag: let the player's own screen show the swing at once, but the server still decides the hit.
