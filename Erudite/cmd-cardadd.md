---
description: Show all your cards, then type a note after // saying what to do
argument-hint: leave empty to see the list, or: card names // your note
---
Cards asked for: $ARGUMENTS

STEP 1. Find the cards with ONE Grep on CARDS/*.json for the lines that start with two spaces and then "name" or "description" (pattern: ^  "(name|description)"). Do not Read every file for the list. If Grep shows nothing useful, Read the files instead.

IF THE ARGUMENTS ARE EMPTY:
- Show a numbered list of ALL the cards: number, name - description in one short line.
- If the CARDS folder has no cards, say "No cards yet. Use /cards to open the folder." and stop.
- End your reply with a last line that contains only: //
- Then STOP and wait. The user's next message is a note about what to do (for example "1", "add spinner and make it faster"). Treat that note as the /cardadd request: card names plus the note.

IF THE ARGUMENTS HAVE TEXT: everything before // is the card names (a number means the number in the list); everything after // is the note on how to adapt it.

THEN: Read knowledge/cards.md (one Read) and follow its "/cardadd" section exactly. Use the note as the answer to "how do they want it adapted". If the note asks to delete or rename a card file, say this command only adds cards and that /cards opens the folder for that.

Do NOT write any card code into the game until the user says yes after your summary and warnings.
