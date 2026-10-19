# Reconciliation checklist (phase 4)

The Ghidra pass is done: every rule and constant in [GAPS.md](GAPS.md) is now
`verified-disasm` and the engine implements the decompiled behaviour
([RULES.md](RULES.md), [DISASSEMBLY.md](DISASSEMBLY.md)). What a disassembly cannot show is
how the game *feels*, so one short session with the original is still worth doing:
compare the two side by side and note anything that differs.

Run `legacy/Shooterland Windowed.exe` (a console window opens next to it; that is normal).
The rebuild's playground is `pnpm run dev`, then `http://localhost:5199/?level=1-11&seed=1`
to jump into a level. Drop screenshots into `docs/evidence/` named by what they show.

## Feel and presentation

| Check | What to compare |
|---|---|
| Shot speed | Fire on 1-1 in both; a shot should cross the empty board in roughly a quarter of a second in both. |
| Landing wobble | In the original a landed thingy wobbles (frames 3-6 or 7-10 of its row, 100 ms each) for a random 0.8-8.8 s; enemies idle through frames 0-4 / 5-8 at random. Does the rebuild's idle animation look the same? |
| Destroy animations | Blast (bomb) and pop (combo, kill, weight) run 11 frames at 56 ms. Compare the timing and which sheet row is used. |
| Grid lines and aura | The original draws faint grid lines (dark blue, with the lines around the bars cycling colour) and a pulsing red 3 px outline around enemies. |
| Rosco | Watch one trip on 1-3: along the top edge, down the left edge, theft at the piggy bank, and back; the countdown at the top of the panel; the speed-up restarting him at the stump. |
| Store | Open it with the right mouse button; the bars park at the far end, bubbles appear per lane, +/- changes the bomb quantity, clicking a thingy on the board drags a copy. After buying, the next volley fires only the bought item (G27): confirm the original really does this. |
| Pause chart | Compare the chart on the pause screen with the rebuild's. |
| Map, files, stats, result screens | Compare positions, fonts and colours with the rebuild (DISASSEMBLY.md has the coordinates the exe uses). |
| Audio | The MIDI tracks and five sound effects: does the synthesised music sound like the original's MIDI playback (instrument choice, tempo, loop point)? |

## Known differences kept on purpose

- Thresholds: 2-25's tutorial text says 25 stars; the code uses 30 (G9).
- The world-7 survival level and world 6 levels 14-25 are locked (G20).
- World advancement past world 6 never happens in the original; the rebuild follows it.
