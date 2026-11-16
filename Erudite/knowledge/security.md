# SECURITY - stop exploits. Read before any remote, reward, shop, purchase, damage or save code.
Need code? Read knowledge/security-code.md (helpers). /exploit reads knowledge/security-tests.md.

## The one rule
The client belongs to the player. An exploiter controls their own client completely: they can read any LocalScript and any replicated ModuleScript, fire any remote with any arguments at any speed, trigger Touched and ProximityPrompt from any distance, and move their own character. The SERVER decides money, prices, multipliers, items, damage, cooldowns and positions. The client only ASKS.

## Ask before building any new feature
What could a cheater send? What would be the worst result? What is the biggest value a normal player could reach? Build the server check around that.

## Remote checklist (every OnServerEvent / OnServerInvoke)
1. Check argument TYPES and count. Reject NaN (x ~= x), math.huge, negatives where they make no sense, and out-of-range values.
2. Prices, amounts, rewards: look them up on the server by id. Never accept them from the client.
3. Rate limit per player (cooldown).
4. Check the player may do it: owns the item, has enough Money, is close enough, has not already done it, the object really exists.
5. Never let the client choose WHO gets something, or which script runs. Never loadstring client text.
6. Only the server writes leaderstats and saved data.
7. Check strings by length and allowed characters. Filter text other players will see (TextService:FilterStringAsync in pcall).
8. If a check fails: do nothing and return. No error message that teaches the exploiter.

## Touch, click and prompts
- Touched, ClickDetector and ProximityPrompt can be triggered from ANY distance by an exploiter. In the server handler, check isNear (security-code.md) before paying anything.
- Do the reward on the server. A LocalScript may only show effects.

## Money and rewards
- Compute the payout on the server only, from server state. Cap it per event and per minute.
- World rewards (coin, pad, height, landing, finish): server checks the player is really there, and marks it collected so it cannot repeat.
- Fall or jump rewards: raycast down on the server to confirm a real landing; reject drops a normal jump cannot make.
- Impossible result = cheat: if a result beats the best possible (finish faster than the fastest route, gain more than the cap), reject it.
- Multipliers come only from server state (see money.md). Developer products: grant only inside ProcessReceipt and store the PurchaseId. Gamepasses: UserOwnsGamePassAsync on the server in pcall.

## When you catch a cheat
- Weak signal (rate, range, speed): quietly block the effect (drop it, clamp it, set the player back). Do not kick on one flag.
- Strong signal (a decoy remote fired, a server-only remote fired from a client): log it and kick.
- Never reveal the check in a message.

## Players can fly, noclip and walk through walls on their own client
You cannot stop that. Never trust position alone for rewards: combine isNear, a collected-once mark, caps and the speed check.

## Network ownership
A player's client simulates parts it touches, so loose parts can be faked. Never pay from a loose part's position. Anchor important parts, or part:SetNetworkOwner(nil) to keep the server in control.

## Code and secrets
- Everything in LocalScripts, StarterGui, StarterPlayerScripts and ReplicatedStorage (including ModuleScripts) can be read by exploiters. Put server logic, price tables and secrets only in ServerScriptService or ServerStorage.
- No API keys, tokens or webhooks in anything a client can read. Use Roblox Secrets, server only (check the docs with web.md).
- HttpService only on the server, only when the user asks.

## Remote design
- One remote per action. Create remotes on the server in ReplicatedStorage.
- Never RemoteFunction:InvokeClient from the server (a client can stall it forever). Use RemoteEvent for server -> client.
- No "do anything" remote that takes a command name.
- Add a decoy remote and wrong-direction detection (security-code.md).

## Safe saving
- Never save before the load finished; a failed load must never save defaults over real data.
- Save with UpdateAsync in pcall with retries, on PlayerRemoving and BindToClose. Save only server-held values. See data.md.

## Rules
- Do not build anything against Roblox Terms of Service. If asked, refuse in one line and offer a compliant alternative.
- No anti-cheat is perfect. Say so honestly if asked.
