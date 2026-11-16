# PHYSICS - moving platforms, hinges, springs, vehicles, conveyors, obby parts. Read for anything that moves or connects.

## Basics
- A group of connected unanchored parts is an "assembly". Anchored parts never move from physics and cost the least. Anchor everything that does not need to move. But do NOT anchor every part inside one moving assembly (it splits it).
- Join parts with WeldConstraint (rigid) or mechanical constraints: HingeConstraint (doors, wheels), SpringConstraint (suspension), PrismaticConstraint (slider), RopeConstraint, BallSocketConstraint. Constraints need Attachments on both parts.
- Move parts with mover constraints (AlignPosition, AlignOrientation, LinearVelocity, VectorForce), not by setting CFrame every frame on unanchored parts.
- Different collision rules per kind of part: CollisionGroups (PhysicsService, set a part's CollisionGroup). NoCollisionConstraint stops two specific parts colliding.

## Moving platforms (very common in tower/obby games)
Option A - simplest: an ANCHORED part moved with TweenService (back and forth, loop). Players standing on it are carried. If a player slides off, use option B.
```lua
local TS = game:GetService("TweenService")
local info = TweenInfo.new(3, Enum.EasingStyle.Linear, Enum.EasingDirection.InOut, -1, true)
TS:Create(platform, info, { Position = platform.Position + Vector3.new(20, 0, 0) }):Play()
```
Option B - physics: unanchored platform + AlignPosition/AlignOrientation (or PrismaticConstraint) toward a target, and ALWAYS `platform:SetNetworkOwner(nil)` on the server so the server owns it (otherwise it can jitter or freeze after a few seconds when a nearby player takes ownership).

## Network ownership (who simulates a part)
- Server owns anchored parts. Unanchored parts near a player are simulated by that player's client automatically.
- `part:SetNetworkOwner(player)` / `SetNetworkOwner(nil)` / `SetNetworkOwnershipAuto()` are SERVER-only.
- Server-moved objects (platforms, NPCs, traps): SetNetworkOwner(nil). Vehicles: give the driver ownership.
- Security: a player-owned part's position can be faked by a cheater. Never give rewards, damage or checkpoints based on where a client-owned part says it is. Check on the server (see security.md).

## Common objects
- Conveyor: anchored part with `AssemblyLinearVelocity` set (it pushes things on top).
- Kill brick: Touched with the humanoid check + debounce (gameplay.md), damage on the server.
- Spinner: anchored part + TweenService rotation loop, or HingeConstraint motor.
- Trampoline/launch pad: on Touched set the character's AssemblyLinearVelocity on the server (or let the client do it for its own character, it feels smoother).

## Performance and problems
- Large physics steps cost time: avoid hundreds of unanchored parts, avoid precise mesh collision (CollisionFidelity Box/Hull for small things, see performance.md).
- Things sleep or jitter: check Anchored, network ownership, and that constraints have both attachments.
- Debug with Studio's visualizations (Show Network Ownership, Collision Fidelity) via the Studio tools or tell the user where to click.

## Test
Play, stand on the platform for at least 30 seconds (problems often start after ~15 s), then jump on and off. With Server & Clients, watch it from the second client too. Say so in the TEST list (testing.md).
