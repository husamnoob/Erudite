---
description: Scramble your game's client-visible code and structure so it is harder to read and hack (backs up first)
argument-hint: light (default), medium, strong, or "map" to show the name map
---
HUHGAME: make the game's code and structure hard to read, without changing how it behaves or how fast it runs. This is a speed bump for cheaters, not real security: the server checks (knowledge/security.md) are the real protection. Use it LAST, on a finished and working game.

Level: $ARGUMENTS (empty = light). If it is "map": Read huhgame-map.txt, show it (or "Nothing scrambled yet."), and stop.

HARD RULES (all levels)
- Behavior and speed must stay the same: add NO dead code, NO extra loops, NO RenderStepped or Heartbeat work. Anything computed from pieces (names, tables) is computed ONCE at start and cached, never per frame or per call.
- Never rename or change: Roblox-required names (Animate, PlayerModule, Humanoid parts, leaderstats and its children, Chat), anything players can read (text, leaderboard names), DataStore keys, asset ids, the decoy remote (it must keep a tempting name), and the "Tested:"-style output of this tool.
- Server-only code (ServerScriptService, ServerStorage) is never restructured; it only gets the cleanup in "light" because cheaters cannot read it.
- Cards: if a file in CARDS mentions a name you rename, update that card too (Read, Write, then Read again to confirm it is valid JSON).

1. CHECK. Stop any playtest. Read huhgame-map.txt if it exists. If it exists, say "Already scrambled (level X). Run /rollback first to change the level." and stop. Glob undo/*.txt for the next batch number n.
2. SCAN. List every script (path, class, size) and every remote. Mark each CLIENT-VISIBLE (LocalScript, anything in ReplicatedStorage, ReplicatedFirst, StarterGui, StarterPlayer, StarterPack) or SERVER-ONLY.
3. BASELINE. Run a playtest, play the main actions, note any console errors and the key values (leaderstats), then stop. This is what the game must still do afterwards.
4. PLAN + WARNING. Show: level, how many scripts and names will change, what will be skipped, and the risks (a missed reference breaks something; I will playtest and revert anything that breaks). Ask "Scramble now? (yes)". WAIT.
5. BACKUP (ROLLBACK LOG). Write every script's Source to undo/<n>-<name>.lua before you touch it, and a batch file undo/<n>.txt ("## <n> HUHGAME <level>"; EDIT lines for scripts; PROP <path>.Name | old=<name> for every rename).
6. SCRAMBLE by level (each level includes the one before):
   - light: remove debug print and warn lines that show readable text. Where a script must tell the user something (loading, cutscene), use one short code instead of a sentence. Rename local variables and local functions in client-visible scripts to short odd names that cannot clash.
   - medium: also rename client-visible scripts, folders and the real remotes to odd names that look unrelated to what they do, and update EVERY reference (WaitForChild, FindFirstChild, dotted paths, require paths, string paths, attribute names that are set and read together). Search all scripts for each old name before and after.
   - strong: also gather string constants into one table per script, built once at start from pieces; split large client scripts into several ModuleScripts with a layered, odd structure, each required once at start (never per frame); give the folders and modules an odd nesting. Keep the same total work per frame.
7. MAP. Write huhgame-map.txt: first line the level, then one line per change: "<old name> -> <new name> | <path>". It is the only way to find things later, so keep it exact.
8. TEST. Playtest again, play the same actions as the BASELINE, read the console. Any new error or different value: find the cause, fix it or revert that one item from undo/, and test again. Then Grep the changed scripts for new loops, RenderStepped, Heartbeat or task.wait that were not there before (there must be none).
9. REPORT: counts (scripts changed, names changed, skipped and why), then the "Review:" and "Tested:" lines. Remind in one line: "Edits later: I read huhgame-map.txt first. /rollback undoes this. Check speed yourself in Studio: View > Script Performance, before and after, if you want proof." Say honestly that determined cheaters can still read scrambled code, and that this only slows lazy ones.
