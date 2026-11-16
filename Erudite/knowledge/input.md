# INPUT - controls for PC, phone/tablet, gamepad. Read for keybinds, buttons, mobile support, or "it doesn't work on mobile".

Most Roblox sessions are on MOBILE. Every feature the player triggers must work with touch, not only with a keyboard key.

## Rules
- Input is CLIENT-side only (UserInputService, ContextActionService work in LocalScripts). The client then asks the server through a remote, and the server validates (see security.md).
- Detect the device with UserInputService.PreferredInput (Enum.PreferredInput.Touch / KeyboardAndMouse / Gamepad). Do NOT use TouchEnabled as "is mobile" (laptops with touch screens return true).
- Do not override Roblox's default move, jump, camera and menu controls unless the game really needs it. Some inputs are reserved and cannot be overridden (Esc menu, F9 console).
- Check `gameProcessedEvent`: if true, the player was typing in chat or clicking UI - ignore it.

## Best way: ContextActionService (gives an on-screen button on phones)
```lua
local CAS = game:GetService("ContextActionService")
local function onAttack(name, state, input)
    if state ~= Enum.UserInputState.Begin then return Enum.ContextActionResult.Pass end
    attackRemote:FireServer()          -- server validates, see combat.md
    return Enum.ContextActionResult.Sink
end
CAS:BindAction("Attack", onAttack, true, Enum.KeyCode.F, Enum.KeyCode.ButtonX)
CAS:SetTitle("Attack", "Hit")                      -- label on the touch button
CAS:SetPosition("Attack", UDim2.new(1, -90, 1, -160))
-- CAS:UnbindAction("Attack") when the tool is unequipped or the feature ends
```
The `true` creates the mobile button. One action can list keyboard and gamepad keys together.

## Plain UserInputService
```lua
local UIS = game:GetService("UserInputService")
UIS.InputBegan:Connect(function(input, processed)
    if processed then return end
    if input.KeyCode == Enum.KeyCode.E then end
end)
UIS:GetPropertyChangedSignal("PreferredInput"):Connect(function() end) -- input type changed: update button layout
```
Roblox also has a newer Input Action System (define actions like "jump", "shoot" and bind many devices). Look it up with WebFetch (web.md) before using it.

## Mobile UI
- Buttons big enough for a thumb, away from the screen edges and from the default jump button (bottom right) and thumbstick (bottom left).
- Use Scale (not fixed pixels) and UIAspectRatioConstraint / UISizeConstraint. Default orientation is landscape.
- No hover effects as the only feedback (phones have no hover). No "press F" text on phones: show the button instead.
- See ui.md for layout.

## Test (see testing.md)
Device Emulator: pick a phone, check buttons are visible, not covered, and tappable. Controller Emulator: check the gamepad works. Tell the user to try the real game on a real phone once.
