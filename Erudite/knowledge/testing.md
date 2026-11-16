# TESTING - how Erudite tests, and what to tell the user to test. Read before finishing any feature, or for /testplan.

Erudite cannot see a real phone, other players, or a published game. So: test what the Studio tools can test, then give the user a SHORT numbered test list for the rest. Never say "it works" for something nobody ran.

## Studio test modes (Test tab)
- Play (F5): you spawn as a player. Play Here: spawn at the camera. Run (F8): no player, server only.
- Stop (Shift+F5) RESETS everything to how it was before Play. Changes made by hand during Play are lost. Tell the user this.
- Client/Server toggle while playing: Client view = what the player sees, Server view = what the server really has. If a change shows on the client but not on the server, it will not work for real (classic remote/security bug).
- Server & Clients: pick 2 clients (up to 8), press Play. Needed for anything with 2+ players: trading, PvP, teams, leaderboards, shared objects.
- Device Emulator: phone/tablet sizes and orientation, for UI and touch. Controller Emulator: gamepad. Player Emulator: region/content rules.
- Studio is much stronger than a phone, so lag may not show. See performance.md.

## What Erudite does itself
1. Read the code back for mistakes (self-review).
2. Run a playtest with the Studio tools and read the Output for red errors and warnings.
3. For a quick "did it run" proof, use only print("EXAMPLE"), then remove it.
4. Say exactly what was tested: "Tested: ..." and what was NOT tested.

## What the user must test (give this list at the end, plain words, max 5 steps)
Format:
```
TEST (about 2 minutes):
1. Click Play.
2. <do one thing>.
3. You should see <one clear result>.
4. If it does not, tell me what you saw (or paste the red Output line).
```
Rules for the list:
- One action and one expected result per step. No jargon. Say where to look (Output, screen, leaderboard).
- Include the failure case when it matters: spam the button, die while it runs, rejoin, leave and come back.
- Things Erudite cannot test: real phone, gamepad hardware, teleports to other places (usually only work in the published game), DataStore saving across sessions in a live game, purchases with real Robux, performance on weak devices. Say so and give the user the steps.
- Saving data: Play, change the value, Stop, Play again - the value should be back. (Studio needs "Enable Studio Access to API Services" for DataStores.)
- Two-player features: use Server & Clients with 2 clients and say which client does what.

## After a failed test
Read the exact error text and line first (errors.md). Fix ONE cause, retest ONCE. Never loop on more than two fix attempts without telling the user what is blocking.
