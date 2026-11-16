---
description: Open the CARDS folder
allowed-tools: Bash(explorer.exe *)
---
Open the CARDS folder in Windows Explorer. Use the Bash tool to run exactly this one command, once:

explorer.exe CARDS

Explorer often reports exit code 1 even when it worked. That is normal: do not retry and do not run anything else.

Then reply with one short line: "Opened the CARDS folder. Drop card .json files in there, then use /cardadd."

If the Bash tool is not allowed or fails to start, reply with one line telling the user to open the CARDS folder next to the launcher by hand.
