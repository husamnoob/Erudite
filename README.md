# Erudite v1.0

A free, open-source AI helper for **Roblox Studio** on **Windows 11**. It reads and edits your open game (scripts, parts, GUIs), tests ideas, and can attack your own game to find exploit holes. It works with any game.

Made by **Eggmaster** (@husamnoob).

Erudite runs on Google's free Gemini model (`gemini-3.5-flash-lite`), so it is fast and costs nothing, but a free model is not as strong as the paid ones. Check what it did before you publish your game.

## What you need

- Windows 11, or Windows 10 (not tested on Windows 10 yet)
- Roblox Studio (latest version)
- [Node.js](https://nodejs.org)
- Claude Code (install it from its official website)
- A free Gemini key from https://aistudio.google.com/apikey
- Windows Terminal (optional, gives Erudite its glass look)

## Set up

1. Download the zip. Right-click it, choose **Properties**, tick **Unblock**, press OK, then unzip it.
2. In Roblox Studio, open **Assistant**, click the **...** menu, then **Manage MCP Servers**, and turn on **Enable Studio as MCP server**.
3. Open your game in Studio.
4. Double-click `Erudite.cmd`.
5. The first time, Erudite shows you how to save your Gemini key. Follow the steps in the second window, close every Erudite window, then start Erudite again.

Never share your key with anyone or paste it into a chat.

## Commands

| Command | What it does |
|---|---|
| `/cards` | Opens the CARDS folder and lists your cards |
| `/cardadd` | Adds a card to your game. Type a note after `//` |
| `/exploit` | Attacks your own game, ranks the holes, then fixes them |
| `/huhgame` | change your game's client code so it is harder to read and looks like it was written by a monkey (backs up first) |
| `/rollback` | Undoes the last change Erudite made |

## Lessons

When you tell Erudite it was wrong, or it uses a tool that does not exist, it must save a lesson in `lessons.json` before it can finish. It reads all lessons every time it starts. You can read or edit that file.

## Good to know

- Studio must be open with a game loaded, or Erudite says it cannot find Studio.
- Erudite can read and change your open game. Only use it on games you own, and keep a backup.
- If Windows blocks a file, unblock the zip first (step 1).

## License

Use, change and share Erudite freely, but credit **Eggmaster** as the original creator. Other people's work included here keeps its own license: see `THIRD-PARTY-LICENSES.md`.
