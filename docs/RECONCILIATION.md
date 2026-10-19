# Reconciliation checklist (phase 4)

Run `legacy/Shooterland Windowed.exe` (a console window opens next to it; that is normal) and work through the scenarios below. For each one, note what you saw in the "Result" column of the matching row in [GAPS.md](GAPS.md), set its status to `verified-exe`, and drop any screenshots into `docs/evidence/` named by gap id (for example `G5-store-prices.png`). Screenshots are the most useful thing you can bring back: print-screen works on the windowed build.

Levels are selected on the world map; the save files in `legacy/Save/` already have progress (File 3 has worlds 1 and 2 cleared), so load File 3 to reach later levels quickly. The rebuild's playground (`pnpm run dev`, then `http://localhost:5199/?level=1-11&seed=1`) shows the current guess for each rule so you can compare side by side.

## Session 1: basics (world 1)

| Gap | What to do | What to record |
|---|---|---|
| G23 | Start level 1-1. Move the mouse over the board without clicking, then click a cell. | Do the shooters follow the mouse? Does a click fire, and does it aim first? Any keyboard keys (space, arrows, escape, P)? |
| G25 | Screenshot level 1-1 before firing. | Board position, where Mary and Poindexter sit, HUD text positions, which font each text uses, where the piggy bank, stump and countdown are. |
| G2 | Fire, then click again immediately while the shots are flying. | Can you fire while shots are in flight? Rough projectile speed (cells per second: count how long a shot takes to cross the empty board). |
| G1, G21 | Aim so both shots would land in the same cell (an empty column and an empty row crossing at an empty cell). Fire. | Which shot wins the cell and where the other goes. |
| G15 | Fire ~20 volleys on 1-1 and count bombs among the loaded shots; note whether all six foods appear from the start. | Approximate bomb frequency; number of distinct foods seen. |
| G3 | Set up a 3-combo diagonally adjacent to a Crony (corner touching only). | Does a diagonal-only contact kill it? |
| G14 | On 1-3, watch Rosco: time his first appearance, one full trip, and what the countdown by the stump does when it hits zero. Let the piggy bank hit $0 and let him arrive. | Seconds for first emergence, trip length, speed-up behaviour, what the defeat screen shows and offers. |
| G5 | On 1-11, open the store with $0 and then with money. | Price of each weight and ramp; whether you can buy without enough money; whether money carries over to the next level. |
| G6 | On 1-11, 1-12 and 1-13, buy weights and fire them at the block rows. | How many objects move and how far, what stops a push, whether the weight stays on the board afterwards and what it looks like, whether enemies beyond the pushed objects are crushed. |
| G8 | On 1-16 and 1-18, buy ramps and shoot them into the board; shoot thingies and bombs at a ramp's flat side and curved side. | Confirm the deflection table in GAPS.md G8; what a bomb does on each side; whether a shot ramp deflects off an existing ramp. |
| G7 | On 1-24, play several volleys. | When and how the shooter size changes; whether a size-2 shooter fires two copies of the same food or two different items; what happens when only one lane is open. |
| G26 | On any level, look for the green ring sprite. | Where it appears (aim marker, store cursor, elsewhere). |

## Session 2: enemies and worlds 2-4

| Gap | What to do | What to record |
|---|---|---|
| G4 | Open the pause screen on any level and screenshot the enemy/kill-method chart. Then on 2-18 (Fatty) and 3-1 (Fangie), 4-16 (Skully) try bombs, combos of 3 and 4, and weights on each enemy. | The chart (rows = enemies, columns = bomb/combo/weight/mine) and what actually kills each one. |
| G19 | On 2-6, kill the last Crony while Crony enemy blocks are on the board. | When the blocks vanish (immediately, after an animation, at the next volley). |
| G10 | Load 3-16 and screenshot the board. | What tile 22 looks like (mine?), and what happens when a shot, bomb or weight touches it, and when an enemy is next to it. |
| G9 | On the world map, read "Next: %d stars" with File 2 and File 3 loaded, and try opening worlds 3-6. | Star thresholds for each world. |
| G16 | Press Preview on the world map. | Layout of the preview screen; which mini-tile set is shown for each world. |
| G11, G12 | Compare 4-25 (header flag 1) with 5-1 (flag 2); compare 3-4 (footer 80/35000) with 3-5 (70/10000). | Any visible difference: background darkness, bomb frequency, Rosco speed, a timer. |
| G17 | Finish a world; lose a level; sit on the title screen for a minute. | Where bonus.png, bonusbaddies.png, suffle.png, shooterlandsign.png, wood.png and plusminus.png appear. |
| G18 | Screenshot the title, save-file menu, world map, stats and pause screens. | Fonts and colours per screen. |
| G13, G22 | Open Stats with File 3 loaded; screenshot. Then win a level without the star and check `legacy/Save/File3.sav` line 5+ for that level. | The SL Rating and Complete % numbers next to the raw counters (so the formula can be fitted); whether a non-star time is stored. |

## Ghidra pass (done by Claude once you say go)

Install Ghidra (`winget install --id NationalSecurityAgency.Ghidra`, plus a JDK), import `legacy/Shooterland Windowed.exe` (unpacked MSVC 6, 77 KB), and anchor on these strings: `"levels/level%d-%d.sll"` (level loader: header field meanings, G11, G12), `"SL Rating: %.1f"` (G13), `"Next: %d stars"` (G9), `"TTB: %ds"` (HUD layout, G25), the store price table (G5), and the tile-id switch in the board draw routine (G24, G10).
