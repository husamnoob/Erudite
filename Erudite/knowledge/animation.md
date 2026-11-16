# ANIMATION - make attacks and motion look good. Read before any animation, punch, swing, emote or character movement effect.

## 1. Pick the method FIRST
A) The user gave an animation id -> play it with the Animator (section 2).
B) No id -> move the character's joints with code (section 3). It needs no asset id and works online.
Never invent an animation id. You cannot upload animations. Animations are made in Roblox's Animation Editor and usually must be owned by the game's owner or group. If the user wants a real animation, tell them to make one and paste the id.
Temporary ids from AnimationClipProvider:RegisterAnimationClip only work inside Studio. Do not ship them.

## 2. Playing an animation asset (client, in the player's own character)
- Animator, never Humanoid:LoadAnimation: local animator = humanoid:WaitForChild('Animator')
- Load ONCE when the character spawns and keep the track. Do not load a new track on every click.
- ContentProvider:PreloadAsync({animation}) first. track.Length is 0 until the animation has loaded.
- Priority: attacks Action (or Action2/3/4 to beat other actions), idle Idle, walking Movement. A low priority gets overridden by the default animations and looks like "nothing happens".
- One-shot moves: track.Looped = false. Use track:Play(0.1) for a short fade-in.
- Fit the cooldown: track:AdjustSpeed(track.Length / wantedSeconds).
- Sync effects to the animation with markers or keyframes: track:GetMarkerReachedSignal('Hit'):Connect(...). Marker names can only be set in the Animation Editor, not by script.
- Stop the old track before starting a new move.
- A rig mismatch plays nothing: R15 animations do not work on R6 and the other way round. Check humanoid.RigType.

## 3. Moving joints with code (no asset id)
NEVER tween a limb Part's CFrame. Motor6D joints and welds snap it back, so it does nothing or looks broken. Tween the JOINT's C0 instead.
- R6: Torso has 'Right Shoulder', 'Left Shoulder', 'Right Hip', 'Left Hip', 'Neck'; HumanoidRootPart has 'RootJoint'.
- R15: 'RightShoulder' (in RightUpperArm), 'RightElbow' (in RightLowerArm), 'Neck' (in Head), 'Waist' (in UpperTorso), 'RootJoint' (in LowerTorso).
- Save the original once and always return to it:
```lua
local TweenService = game:GetService('TweenService')
local function swing(joint, offset, tIn, tOut)
	if not joint or not joint:IsA('Motor6D') then return end
	local base = joint:GetAttribute('BaseC0')
	if not base then base = joint.C0 joint:SetAttribute('BaseC0', base) end
	local out = TweenService:Create(joint, TweenInfo.new(tIn, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {C0 = base * offset})
	local back = TweenService:Create(joint, TweenInfo.new(tOut, Enum.EasingStyle.Quad, Enum.EasingDirection.InOut), {C0 = base})
	out.Completed:Once(function() back:Play() end)
	out:Play()
end
```
- The swing axis differs between R6 and R15. Try an offset like CFrame.Angles(math.rad(90), 0, 0), LOOK at it, and adjust. Say plainly if you could not check how it looks.

## 4. Who sees it
- A client-only change (a joint tween in a LocalScript) is seen only by that player.
- An animation track played on the player's OWN character Animator is shown to everyone.
- Code-driven joint motion: run it on the server so it replicates, or play it locally for instant feel and let the server show it to the others.

## 5. Game feel (cheap, big difference)
- Three beats: wind-up (0.08-0.15s, small pull back), strike (0.05-0.1s, fast), recover (0.15-0.3s, slower).
- Apply damage at the strike moment (marker or short task.delay), not at the click.
- Add one sound and one small particle or flash on hit. Placeholder ids only, and say so.
- Keep the cooldown longer than the whole animation so moves never overlap.

## 6. If the animation does nothing, check
1. Is the Animator there and the character loaded? 2. Is the id right and owned by the game's owner? 3. Right rig type? 4. Priority too low? 5. Track loaded (Length > 0)? 6. Did the script run (print("EXAMPLE"), then remove it)? 7. Console errors?
Test: right after Play, read track.IsPlaying and animator:GetPlayingAnimationTracks() with the Studio tools. If you must add a print, use only print("EXAMPLE") and remove it after the test. A screenshot may miss a short animation, so say so honestly.
