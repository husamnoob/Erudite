# SECURITY TESTS - used by /exploit. Each attack is a LocalScript firing in a playtest; compare real values before and after (wait 1.5 s for the server).

Severity: HIGH = gains Money, items or rewards. MEDIUM = spam, range, double-claim. LOW = tidy-ups. Every attack starts after a BASELINE: one legitimate call that must work.

## Attack recipes (PASS = what must happen)
HIGH
- Bad numbers: send -1, 0, 1e308, math.huge, 0/0 (NaN), 2^53, 1e-9. PASS: money and items unchanged, no crash.
- Fake price or amount: send price 0, amount 999999, negative amount. PASS: server uses its own number.
- Wrong target: send another player's name or UserId, or the LocalPlayer's name for a victim. PASS: ignored.
- Skipped steps: fire the reward remote without doing the action. PASS: rejected.
- Too fast: fire the finish remote right after joining. PASS: rejected.
- Client-set values: change a Value or Attribute from a LocalScript. PASS: no server script pays based on it (read the code).
- Teleport to reward: set the character CFrame onto each reward from 500 studs away, wait, ask for it. PASS: set back or rejected (no payout for a teleport).
MEDIUM
- Wrong types: send nil, a string, a table, true, a 5000-character string, extra arguments, missing arguments. PASS: ignored.
- Spam: fire 50 times within 1 second. PASS: at most ONE reward per cooldown.
- Burst/race: fire the same claim 20 times in the SAME frame (a loop with no wait). PASS: exactly ONE reward (double-claim must not happen).
- Replay: do one legit claim, then send the same request again at once and again 5 seconds later. PASS: second claim rejected unless it is truly allowed again.
- Out of range: fire a collect, click or prompt remote far away. PASS: rejected.
- Fuzz: for each remote send 20 random mixes of numbers, strings, tables, Instances and nil, in random counts of arguments. PASS: no server error in the console, no change in values.
- Teleport or speed: set WalkSpeed 200 or JumpPower 500 on the client, move, then ask for a reward. PASS: set back or rejected.
LOW
- Scan: list every RemoteEvent and RemoteFunction under ReplicatedStorage and game (use GetDescendants) and fire each one with nil. PASS: no remote exists that the report has not listed; unknown remotes are written in the report.

## Never fire (read the code instead)
- Purchases: never fire real prompts. Confirm ProcessReceipt stores the PurchaseId and grants once.
- Decoy remote: do NOT fire it (it kicks the tester). Confirm in the code that a decoy exists, no LocalScript uses it, and it kicks only on that.
- Anything that calls Kick, Ban or Teleport, or deletes data.

## Code-reading checks (no firing)
- Every server -> client RemoteEvent has wrong-direction detection; every client -> server remote has type, range, cooldown and ownership checks.
- Every ProximityPrompt, ClickDetector and Touched reward handler checks distance on the server and marks the reward collected.
- Two requests in the same moment: the check and the payout happen with no wait between them (no task.wait or yielding call between "is it allowed?" and "set it as used").
- Secrets and server logic: search LocalScripts, StarterGui and ReplicatedStorage for key, token, webhook, http, price tables and server-only modules. PASS: nothing found.
- No InvokeClient on the server.

## Report honestly
Say what could not be tested (real exploit tools, two players at once, flying and noclip) and that no test replaces a careful review.
