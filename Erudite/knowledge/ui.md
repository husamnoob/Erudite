# UI - read this before building or fixing any GUI

## Rules
- ScreenGui lives in StarterGui. HUDs: ResetOnSpawn = false. Set IgnoreGuiInset = true for fullscreen backgrounds.
- Use SCALE (UDim2.fromScale) not pixel offsets, so it works on phones. Add UIAspectRatioConstraint to keep buttons square/round.
- Add UICorner for rounded corners, UIStroke for outlines, UIListLayout / UIGridLayout for lists. Never place list items by hand.
- Always set AnchorPoint (0.5,0.5) + Position (0.5,0.5) to center something.
- Mobile: keep buttons at least 0.08 scale tall, text TextScaled = true with a UITextSizeConstraint (MaxTextSize).
- Text must contrast with its background. Check TextTransparency, TextColor3, ZIndex.
- A LocalScript that shows a number must update on change: value:GetPropertyChangedSignal("Value"):Connect(function() ... end).
- Client waits: local ls = player:WaitForChild("leaderstats"); local money = ls:WaitForChild("Money").
- UI never decides rewards or prices. Button -> RemoteEvent -> server checks and applies.
- Do not add effects, colors, or animations the user did not ask for.

## Number formatting (1.2K, 3.4M)
```lua
local suffixes = {"", "K", "M", "B", "T", "Qa"}
local function short(n)
    local i = 1
    while n >= 1000 and i < #suffixes do n = n / 1000; i += 1 end
    return (i == 1) and tostring(math.floor(n)) or string.format("%.1f%s", n, suffixes[i])
end
```

## HUD label that follows Money
```lua
local Players = game:GetService("Players")
local player = Players.LocalPlayer
local gui = script.Parent -- ScreenGui
local label = gui:WaitForChild("MoneyLabel")
local money = player:WaitForChild("leaderstats"):WaitForChild("Money")
local function refresh() label.Text = "$" .. short(money.Value) end
money:GetPropertyChangedSignal("Value"):Connect(refresh)
refresh()
```

## Button with hover + click
```lua
local TweenService = game:GetService("TweenService")
local info = TweenInfo.new(0.12, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
local base = button.Size
button.MouseEnter:Connect(function() TweenService:Create(button, info, {Size = UDim2.fromScale(base.X.Scale*1.05, base.Y.Scale*1.05)}):Play() end)
button.MouseLeave:Connect(function() TweenService:Create(button, info, {Size = base}):Play() end)
button.Activated:Connect(function() remote:FireServer("buy", itemId) end) -- Activated works on mouse AND touch
```

## Open/close a panel
```lua
local TweenService = game:GetService("TweenService")
local function toggle(frame, open)
    frame.Visible = true
    local goal = open and UDim2.fromScale(0.5,0.5) or UDim2.fromScale(0.5,1.2)
    local tw = TweenService:Create(frame, TweenInfo.new(0.25, Enum.EasingStyle.Back), {Position = goal})
    tw:Play()
    if not open then tw.Completed:Once(function() frame.Visible = false end) end
end
```

## Building UI from Execute Luau (one call)
Create ScreenGui, Frame, children, set properties first and Parent last, parent the ScreenGui into game.StarterGui. Name everything clearly. Put the controlling LocalScript inside the ScreenGui, set its Source, and verify Source is not empty.

## Popups and timers
- Temporary popup: show, task.delay(2, function() popup:Destroy() end).
- Countdown text: loop with task.wait(1), compute remaining = endTime - os.time().

## Pitfalls
- Frame in a ScrollingFrame: set CanvasSize (or AutomaticCanvasSize = Enum.AutomaticSize.Y) and a UIListLayout.
- TextButton vs ImageButton: both have .Activated. Use Activated, not MouseButton1Click, for touch support.
- Blur effects belong in Lighting (BlurEffect), not on the GUI. Enable only during the shop; disable after.
- GUI hidden by default: Enabled = false. Turn on from a LocalScript when needed.
- UiScaleConverter-style scripts: skip any ScreenGui that already has its own UIScale.
- Viewport/animations: do not touch what was not asked.
