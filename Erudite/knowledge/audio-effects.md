# AUDIO + EFFECTS - sounds, music, tweens, particles, game feel. Read for sound, animation of UI/parts, hit sparks, juice.

## Sound
- A Sound inside SoundService or Workspace (not in a part) plays for everyone at the same volume = music, UI clicks. A Sound inside a Part/Attachment is 3D: gets quieter with distance.
- Play: `sound:Play()`. For many fast copies of one effect, `SoundService:PlayLocalSound(sound)` on the client or clone the sound and Destroy it when `Ended` fires.
- SoundGroup = a mixer (Music, SFX). A Sound joins a group ONLY by setting `sound.SoundGroup = group` (parenting it is not enough). Group Volume multiplies the sound's volume (0.5 x 0.5 = 0.25). Effects (ReverbSoundEffect, EqualizerSoundEffect, CompressorSoundEffect) go as children of the group or the sound.
- Roblox also has newer Audio objects (AudioPlayer, wires). Sound objects still work. Look up the docs (web.md) before using the new ones.
- Asset ids: only use ids the user gave or that are verified. Unknown audio ids may not load or may not be allowed in this game. List every id you use (see cards.md "ids").
- Cosmetic sound and effects run on the CLIENT. The server only decides what happened and fires a remote to the client.

## Tweens (smooth movement, fades, UI)
```lua
local TS = game:GetService("TweenService")
local info = TweenInfo.new(0.4, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
local tween = TS:Create(frame, info, { Position = UDim2.new(0.5, 0, 0.5, 0), BackgroundTransparency = 0 })
tween:Play()
tween.Completed:Wait()
```
- Tween properties of a GUI or a part. For a Model, tween a CFrameValue and apply it with PivotTo, or move the PrimaryPart.
- Tween a part that is Anchored. Do not tween an unanchored part and expect physics to behave.
- Many tweens at once on many parts is costly: only tween what the player can see.

## Particles
- ParticleEmitter inside a part or Attachment. For one-shot bursts: Enabled = false, then `emitter:Emit(20)`. For constant effects: Enabled = true and a low Rate (5-20).
- Keep Lifetime short and Rate low. Hundreds of emitters = lag on phones (see performance.md).
- Destroy one-shot effect parts: `game:GetService("Debris"):AddItem(part, 2)`.

## Game feel (cheap and strong)
Hit: short sound + small spark + number popup that tweens up and fades. Collect: pop sound + coin flies to the counter. Button press: scale tween 1 -> 0.9 -> 1. UI open: fade + slide, 0.2-0.4 s. Keep it short; effects must never block gameplay.

## Test
Play, trigger the effect, listen/watch. Tell the user: "Check the volume is not too loud, and the effect disappears afterwards." Screenshots can miss short effects - say so honestly.
