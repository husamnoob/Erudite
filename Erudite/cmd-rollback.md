---
description: Undo the last change Erudite made to your game (scripts and parts)
argument-hint: list, or leave empty
---
Roll back using the files in the undo folder. Do NOT use the shell's own /undo or /rewind: they only undo files on disk, not your Studio game.

Request: $ARGUMENTS

1. Glob undo/*.txt. If none, reply "Nothing to undo yet." and stop.
2. If the request is "list": Read the last 5 batch files and show one line each: number, task, undone or not. Stop.
3. Otherwise take the highest-numbered batch whose first line does NOT start with UNDONE. If none, reply "Everything is already undone." Read it.
4. SHOW what you will reverse as a short list, then ask "Undo this? (yes)". WAIT for yes.
5. After yes: stop any playtest first (edits made during a playtest are lost). Reverse the entries from last to first:
   - NEW <path>: delete that instance (check it exists).
   - EDIT <path> | backup=<file>: Read the backup file and set the script's Source back to that exact text. Then close and reopen the script in the editor.
   - DEL <path> | class=<Class> | parent=<path> | backup=<file>: recreate it with that class, name and parent, and (for scripts) the Source from the backup. Set properties first, Parent last.
   - PROP <path>.<Property> | old=<value>: set the property back.
   If an entry cannot be reversed (no backup, parent is gone), say so in one line and keep going.
6. Check with a real read that each reversed item looks right (exists, or is gone, or Source matches). Then Write the batch file again with its first line replaced by "UNDONE" and the rest unchanged.
7. Reply: one line per reversed item with the change log emojis (a created item that was deleted is 🔴, an edit that was restored is 🟡, a removed item that came back is 🟢), then the "Tested:" line.
