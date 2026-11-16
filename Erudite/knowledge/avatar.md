# AVATAR - R6 vs R15, rigs, and avatar-looking NPCs. Read before any rig, avatar, dummy or NPC task.

## Rule 1: the game's rig is a STUDIO SETTING, not a model
- "Make everyone R6" means set the game's Avatar Type. Inserting an R6 dummy or rig does NOT change what players spawn as.
- Where: Studio, File > Avatar Settings, the three-dots menu at the top right of that window: R6 only / R15 only / R15 & R6. (Older Studio: Game Settings > Avatar > Avatar Type: R6, R15, PlayerChoice.)
- The tools you have may not reach this setting. If you cannot set it, do NOT fake it with a dummy. Say in one line: "Avatar Type is a Studio setting I can't change: open File > Avatar Settings, click the three dots, choose R6." Then wait for the user to confirm and check it.
- Check it for real: playtest, then in Execute Luau read game.Players:GetPlayers()[1].Character.Humanoid.RigType. Only Enum.HumanoidRigType.R6 means done. Also check that no script already forces a rig (search for RigType, StarterCharacter, LoadCharacter, CharacterAppearance).
- A StarterCharacter model named StarterCharacter in StarterPlayer can override the look; tell the user if one exists.
- After changing the setting, stop and restart the playtest. Old character models can be cached.

## Rule 2: after switching rigs, check everything that touches the body
- R6 parts: Head, Torso, Left Arm, Right Arm, Left Leg, Right Leg. R15 has UpperTorso, LowerTorso, RightUpperArm and more.
- R6 and R15 animations do not work on the other rig (see animation.md). Scripts that use UpperTorso, RightHand, LeftFoot and so on break on R6. Search the place for those names and list them.
- Tools, hitboxes, accessories, and "hold the item" animations often need changes.

## Rule 3: dummies and NPCs that look like a real avatar
- By username: Players:GetUserIdFromNameAsync(name), then Players:GetHumanoidDescriptionFromUserId(userId), then Players:CreateHumanoidModelFromDescription(description, Enum.HumanoidRigType.R6) (or R15). All inside pcall (these call the internet and can fail).
- The model is not in the game until you set model.Parent = workspace and model:PivotTo(CFrame). Name it. Anchor the root part or set it standing on a part.
- The blocky default dummy is NOT the user's avatar. Never say it is.
- The user's own avatar: ask for their username or UserId. Never guess it.

## Rule 4: what to tell the user
- Say exactly what you changed and what you could not change. Never say "everyone is R6" unless you read RigType in a playtest and saw R6.
