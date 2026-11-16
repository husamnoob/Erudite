# NPC - enemies, guards, pets, followers. Read for pathfinding and simple AI. Basic NPC spawning is also in gameplay.md.

Run NPC logic on the SERVER. Give the NPC to the server so it moves smoothly:
```lua
npc.HumanoidRootPart:SetNetworkOwner(nil)   -- server owns the NPC's physics
```

## Pathfinding (PathfindingService)
```lua
local PFS = game:GetService("PathfindingService")
local path = PFS:CreatePath({ AgentRadius = 2, AgentHeight = 5, AgentCanJump = true })

local function walkTo(npc, target)
    local hum = npc:FindFirstChildOfClass("Humanoid")
    local root = npc.PrimaryPart
    local ok = pcall(function() path:ComputeAsync(root.Position, target) end)
    if not ok or path.Status ~= Enum.PathStatus.Success then return false end
    for _, wp in ipairs(path:GetWaypoints()) do
        if wp.Action == Enum.PathWaypointAction.Jump then hum.Jump = true end
        hum:MoveTo(wp.Position)
        if not hum.MoveToFinished:Wait() then return false end   -- timed out / blocked
    end
    return true
end
```
- CreatePath options: AgentRadius, AgentHeight, AgentCanJump, AgentCanClimb, WaypointSpacing, Costs (e.g. Water = 20, or math.huge to forbid a material).
- ComputeAsync can fail: ALWAYS wrap in pcall and check path.Status == Success. NoPath = no route.
- path.Blocked fires when a part blocks the route. Recompute then.
- Waypoint.Action Jump means set Humanoid.Jump = true.
- Do not recompute every frame. Recompute every 0.5-1 s, and only when the target moved a lot.
- Far or unreachable target: do not path, just stand or patrol.

## Simple AI = a small state machine
States: Idle -> Patrol -> Chase -> Attack -> Return. Change state by distance:
- Player within AGGRO range and line of sight -> Chase. Within ATTACK range -> Attack. Too far (LEASH) -> Return to spawn.
- One loop per NPC at `task.wait(0.25-0.5)`, not Heartbeat. Many NPCs: one shared loop that updates all of them.
- Find the nearest player with Players:GetPlayers() and their HumanoidRootPart distance; skip dead ones.

## Rules
- Damage from NPCs: server only (see combat.md).
- Spawn from a template in ServerStorage with :Clone(). Cap how many NPCs exist at once.
- On death: Humanoid.Died -> disconnect connections, stop its loop, Destroy after a few seconds. Leftover NPCs and loops are a classic memory leak (see performance.md).
- NPC that must look like a player's avatar: see avatar.md.
- Test: Play, stand still, then run away; the NPC should chase, give up at LEASH distance, and walk back. Tell the user to also check it does not get stuck on stairs or walls.
