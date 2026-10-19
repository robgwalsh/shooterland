# Disassembly notes (Ghidra 12.1.4, `legacy/Shooterland Windowed.exe`)

Headless analysis of the 77 KB MSVC6 exe (242 functions, 2026-10-19). Addresses are
virtual addresses; the Ghidra project lives in `C:\Tools\ghidra-proj`. The decompile was
exported with a script and read in full; everything in `RULES.md` marked
*verified-disasm* traces to a function listed here.

## Function map

| Address | Role |
|---|---|
| `FUN_00402dc6` | `main`: SDL init, 800x600, event loop, screen switch on `DAT_00419fa0`, `SDL_Delay` to about 15 ms per frame |
| `FUN_004025a3` | Startup: button rectangles for every screen, star thresholds, asset and sound loading |
| `FUN_0040211a` | Loads `map.dat` (25 nodes per world, 60x40 hit rects) and `times.dat` (26 ints per world, index 1..25) |
| `FUN_004036cd` / `FUN_00403951` | Load / save the three `.sav` files (185 ints) |
| `FUN_00404ef4` | New game: zeroes a file, sets the new-game flag |
| `FUN_004023dd` | Logo: fade in 3.3 s, hold to 6 s, fade out 3.3 s, click skips |
| `FUN_00404aa0` / `FUN_00404aee` | Title input / hover |
| `FUN_00405037` / `FUN_0040521c` | File select input / draw (including "Complete: %d%%") |
| `FUN_00403d9b` / `FUN_00404660` | World map input (nodes, tabs, buttons, marker walk) / draw (checks, stars, "Next: %d stars", preview overlay) |
| `FUN_00403d44` / `FUN_00404208` | World-tab slide transition |
| `FUN_004097a3` | Level loader plus per-level reset: ammo queues, store prices, money = 0, timers |
| `FUN_004095cb` | Level loader without reset (used for the preview) |
| `FUN_00409367` | Message decoder: `_` = space, `*` = newline, `END`, word-wrap to 170 px in font slot 6 |
| `FUN_00406cc2` | Level intro screen (board + message + Play button) |
| `FUN_004065a3` | Gameplay frame: blocked-volley undo, defeat check, aim, draw, combos, store toggle, pause/retry/quit buttons |
| `FUN_004056b7` / `FUN_0040570d` | Click to fire / volley: snapshot board, spawn six lane projectiles, pop queues |
| `FUN_00405a76` | Undo a volley whose shooter had every lane blocked |
| `FUN_00405c3c` | Dead code: an older fire routine (never called) |
| `FUN_004084ac` | Aim: bar position = (pointer - 40 - (size - 1) * 20) / 40, clamped |
| `FUN_0040a1d3` | Projectile tick: mine detection, one cell per frame |
| `FUN_0040b6d7` | Projectile step: move, weight push/crush, landing, bomb blast, thingyhit sound |
| `FUN_0040a38b` / `FUN_0040a9ab` | Next cell with ramp deflection / free-cell test (destroyed cells and mines count as free) |
| `FUN_0040bceb` | Back a shot up to the last free cell when its cell is taken |
| `FUN_0040ac8a` / `FUN_0040b3e8` | Weight path walk / shift the run forward one cell (mines explode instead) |
| `FUN_0040c396` | Place a landed item; off-board = blocked lane (a bomb still blasts the first cell) |
| `FUN_0040be49` / `FUN_0040c85e` / `FUN_0040cbac` | Combo scan (3+, 4+ in world 7) / group count / clear and mark 4-neighbours |
| `FUN_0040bf59` / `FUN_0040ca3d` | Kill flagged enemies: Crony on any combo, Fatty/Fangie if a neighbouring group is 4+ |
| `FUN_00404be5` / `FUN_00404b24` | HUD counters, win check, enemy-block removal when a type is extinct |
| `FUN_00409e61` | Rosco: trips, theft, speed-ups, countdown |
| `FUN_00408561` | Store: open/close, +/- bomb quantity, drag to lane bubbles, buy |
| `FUN_0040c640` / `FUN_0040c6d3` / `FUN_0040c730` | Queue unshift blank (all lanes) / one lane / unshift the in-flight item back |
| `FUN_00407371` | Board draw, grid lines, enemy aura, shooters, Time/TTB, pause chart |
| `FUN_00407b35` | Cell animation state machine (frames every 100 ms, destroy animations every 56 ms, tile removed after frame 10) |
| `FUN_0040609e` / `FUN_004063c3` | Win / defeat bookkeeping (best time, level advance, world advance, stats) |
| `FUN_00406ea9` / `FUN_00406e3b` | Result screen draw / buttons |
| `FUN_0040ad69` | Stats screen including SL Rating |
| `FUN_004083ff` | Star count from best times |
| `FUN_0040d4b7` / `FUN_004019f2` | Font slots / LMNOpc font loader (colour applied per slot) |
| `FUN_0040d862` | Image loading and colour keys (black for most, magenta for bonus/bonusbaddies/suffle) |
| `FUN_0040cf7b` / `FUN_0040ed69` | Per-screen backdrop: map.png on the map, background.png on the intro, backgrounddark.png (which carries the HUD art) during play and on the result screen |
| `FUN_0040e785` | Blits supplement.gif (the store panel) at (600,366), only while the store is open |
| `FUN_0040f68c` | Tile draw: id < 12 from the world sheet (row = id, column = frame); 12..19 from items.png row id - 12; 20/21/22 and 23..27 from the sheet's last two columns |

## Globals worth knowing

| Address | Meaning |
|---|---|
| `DAT_00421544` | `int grid[14][14]`, indexed `[col][row]` |
| `DAT_0041d738` + row*20 + col*260 | Cell animation: state, counter, frame, next-frame time, end time. States: 0 idle, 1/2 landed wobble (horizontal/vertical), 3 bomb blast, 4 destroyed, 5/6 enemy idle, 8 cleared ("pop") |
| `DAT_0042186c` | `int queue[6][300]`: ammo per lane (0-2 Mary, 3-5 Poindexter); index 0 is loaded, 1 is "next" |
| `DAT_00413b30` + lane*24 | Projectile per lane: item, x, y, direction (0 up, 1 left, 2 down, 3 right), pixel progress, lane |
| `DAT_00421860` / `DAT_00416b60` | Bar position (first lane) of Mary / Poindexter |
| `DAT_00421864` / `DAT_00416b64` | Bar sizes (level header lines 1-2, never changed in play) |
| `DAT_00420968` / `DAT_0042096c` / `DAT_00420970` / `DAT_00420978` / `DAT_0042097c` | Level lines 3, 4, 5, 175, 176 |
| `DAT_00416b88` | Money |
| `DAT_004161bc`[0..8] | Prices: weights 2, 3, 4; bomb 3; ramps 2, 2, 2, 2; thingy 3 |
| `DAT_0041471c`[1..6] | Star thresholds 10, 30, 50, 75, 100, 150 (indexed by the current world) |
| `DAT_0041478c` + l*4 + w*104 | Time to beat (times.dat) |
| `DAT_0041ce88` + file*740 | Save record: new-game flag, level (+4), world (+8), unused (+12), best times (+16, 175), wins, losses, shots, combos, pieces, seconds |
| `DAT_00414738` / `DAT_0041473c` | Board origin (40, 40) |
| `DAT_00419fa0` | Screen: 0 title, 1 files, 2 map, 3 intro, 4 play, 5 map slide, 6 result, 7 logo, 8 stats |

## Layout (virtual pixels)

Gameplay: board at (40,40), 13 cells of 40 px; grid lines every 40 px (14 each way) in
RGB(1,0,11), and the lines bounding the bars cycle through sine colours; enemy aura is a
3 px red outline with intensity |sin(t/1000)| * 128. Mary's bar sits at (40 + 40*pos, 559),
Poindexter's at (559, 40 + 40*pos); loaded items are drawn under the bar, one per lane
(x + 0/40/80 or y + 0/40/80). Stump top-right (560,0), piggy bank bottom-left (0,560);
Rosco walks along y = 0 then x = 0 and back (560 px per quarter period). "Time: %ds" at
(700,150) and "TTB: %ds" at (700,165) in font slot 6; "Level %d-%d" centred in
(632,30,138,28) slot 9; money "%d" centred in (641,374,63,23) slot 1; enemy counts slot 10
at (675, 80/115/149) and (742, 80/115); next items at (639/679/719, 526) for Mary's lanes
(right-aligned, so size 1 uses 719 only) and (722, 379/419/459) for Poindexter's
(bottom-aligned); countdown "%d" at (550,17) slot 7; music button (672,480) 27x31 from
buttonz.png (frames 0/1 off, 2/3 on, odd = hovered); Store button (630,397,66,19);
pause-menu buttons at x = 626, w = 150, h = 39: y = 210 Retry, 261 Pause, 311 Quit.

Store: weights at (655, 420/460/500), bomb at (655,540) with "X%d" quantity at (665,569)
and 9x9 +/- buttons at (655,578) / (689,578); ramps at (705, 420/460/500/540); prices "$%d"
at x = 625 / x = 750, y + 5, slot 5. Bars park at lane 11 - size. Drop bubbles (62 px,
bubbles.png, alpha 128) per lane: size 1 at (40*pos + 30, 540); size 2 at (40*pos + 15, 540)
and (40*(pos+1) + 42, 540); size 3 at (40*pos + 6, 540), (40*(pos+1) + 30, 540),
(40*pos + 134, 540); Poindexter's mirrored at x = 540. Clicking any thingy on the board while
the store is open drags a copy of it (price $3).

Pause chart: headers at y = 280: bomb (280), combo pop (320), weight (360), mine (400);
enemy rows at y = 320 + 40i with sprites at x = 240 and names at x = 120 (slot 4);
ring marks at (x,y) for Crony: 280, 320, 360, 400 (with "3" at 332,323); Crazy: 280, 360, 400;
Fatty: 320 (with "4"), 360, 400; Fangie: 320 (with "4"), 400; Skully: 400.
Pause letters: five 80 px frames at x = 60 + 100i bobbing with sin(t/500).

World map: nodes 60x40 at map.dat; check at (x+2, y-4), star at (x-8, y-10) (36 frames,
36 ms each); "%d" at (x+36, y+19) slot 7; marker = Mary's size-1 bar at (x+10, y);
star icon at (-12,5) with "X %d" at (35,10) slot 4; "Next: %d stars" at (0,40) slot 7;
tabs (116 + 82i, 465, 80, 15); Menu (89,488,44,44), Stats (141,488), Preview (617,488),
Play (669,488). Preview hover: wood.png at (200,100), mini tiles at (265 + 21c, 165 + 21r);
"Level %d-%d" at (210,491) slot 9, "Best time: %d" at (360,500) slot 6, "Time to beat: %d"
at (488,500) slot 7.

Intro: message lines centred in (600, 80 + 20i, 200, 20) slot 6; Play (626,530,150,39).
Result: letters (complete 8x60 at x = 51 + 60i, defeat 6x80 at x = 70 + 80i) bobbing; texts at
x = 100: y = 180 time, 213 TTB, 246 star line (slot 7), 300 shots, 333 combos, 366 average,
430 record (slot 4); buttons (210,530,80,60) OK and (310,530,80,60) Retry.
Title: Start (43,459,97,111), Quit (204,459,97,111); beta.png at (450,110).
Files: menusupplement at (0,435); File 1/2/3 (25, 442/493/544, 47x45); Back (79,563,77,28),
Load (161,563), Delete (244,563); heading centred in (85,450,228,20) slot 9; lines at x = 90:
Stars 477, Record 492, Complete 507, Time played 522 (slot 7); delete prompt slot 8 at
(120,478) / (130,498), Yes (120,520,60,35) / No (220,520,60,35).
Stats: suffle.png at (25,50); lines centred in (200, y, 400, 50): 100 heading (slot 9),
then 150, 190, ..., 430 (slot 7); "Click to return..." at (5,580).

## Font slots

| Slot | File | Colour |
|---|---|---|
| 0 | font1 | red |
| 1 | font1 | yellow |
| 2 | font1 | green |
| 3 | font1 | blue |
| 4 | font1 | white |
| 5 | font1 | black (0.1 truncates to 0) |
| 6 | font2 | black |
| 7 | font2 | white |
| 8 | font2 | green |
| 9 | font3 | white |
| 10 | font3 | black |
