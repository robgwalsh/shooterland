# Shooterland: gap register

Rules and constants that could not be recovered with confidence from the surviving data. Every uncertain constant in the engine lives in `packages/shooterland/src/core/rules.ts` tagged `// GAP:Gn`.

Status values: `open`, `verified-exe` (observed in the legacy exe), `verified-disasm` (read from the disassembly), `decided` (we chose a rule). Record evidence (screenshot path, function address, or reasoning) in the Evidence column.

Reconciliation tools, in order of cost: (a) **run `legacy/Shooterland Windowed.exe`** on Windows 11 and observe (SDL 1.2 build, should run; a console window opens alongside); (b) **disassemble** the 77 KB unpacked MSVC6 exe in Ghidra (level loader `fscanf` call sites, store prices, weight logic, Rosco timing, star thresholds, SL Rating formula are all small functions with string anchors like `"levels/level%d-%d.sll"`, `"TTB: %ds"`, `"SL Rating: %.1f"`); (c) decide a rule ourselves and mark it `decided`.


| id | Gap | Best current guess | How to resolve | Status | Evidence |
|---|---|---|---|---|---|
| G1 | Landing rule when both shots target the same cell, and ordering of bomb-vs-thingy within one volley | Java: bump col/row by one; 2-8 says bomb resolves first if it arrives first (distance-based) | exe | open | |
| G2 | Projectile animation speed, shot cadence (can you fire while shots are in flight?) | Java 35 cells/s; fire blocked while flying | exe | open | |
| G3 | Enemy kill adjacency (4- or 8-neighbour of cleared cells; "adjoin"), multiple enemies per combo | Java: 8-neighbour | exe | open | |
| G4 | Fangie and Skully kill rules; Fatty vs bombs | Pause chart grid in exe; guess Fangie = bomb+weight+mine, Skully = mine only? | exe pause screen | open | |
| G5 | Store prices, starting money, whether money persists between levels | Java placeholders; money starts 0 | exe | open | |
| G6 | Weight push/crush algorithm (what stops a push, chain pushes, crush ordering, what happens to the weight itself) | Implemented: the weight shoves the contiguous run of movable objects ahead of it one cell at a time while the run has at most N objects and the cell beyond is empty; then crushes up to N consecutive enemies just beyond the run, nearest first; the weight stays on the board as a spent weight; pushed thingies can form combos. Fits 1-11 (one block then Crony), 1-12 (two blocks then Crony) and 1-13 ("you need a 3-weight": three blocks then Crony) | exe + disasm | modelled | levels 1-11/1-12/1-13 layouts; see sim/weight.ts |
| G7 | Shooter size change rule ("flu") and lane geometry for size 2/3 | Implemented: after each volley a shooter's size is drawn uniformly from 1..(level header size); size N covers N adjacent lanes starting at the aimed lane, each open lane fires a copy of the loaded item; firing needs at least one open lane per shooter (1-24) | exe on 1-24 | modelled | |
| G8 | Ramp orientations, flat-side blocking, ramp shot deflected by ramp, bomb-on-flat-side | 16 = open top+left, 17 = top+right, 18 = bottom+left, 19 = bottom+right; entering an open edge exits via the other; flat edges block | sprites + level geometry; confirm in exe | derived | items.png frames 4-7 match the Android ramp_ul/ur/bl/br drawables; levels 1-16 (id 19 at (6,0) and (0,6)) and 1-18 (id 17 at (5,5)) only work with this table |
| G9 | Star thresholds for W3-W6 ("Next: %d stars"), final survival level duration | 10, 25, ... | disasm (likely a table in .data) | open | |
| G10 | Tile 22 identity (land mine?) and mine mechanics | Implemented as a mine: any shot touching it sets it off; the blast clears the 3x3 around it (thingies, brown blocks, spent weights) and kills adjacent enemies whose rule lists mines (all five by default) | exe on level 3-16 | modelled | tile sheet cell (10,7) is a spiked mine; 2-10 says mines are the fourth kill method |
| G11 | Header line 5 (1/2) | dark background? difficulty? bomb frequency tier? | exe W5-1 vs W4-25 | open | |
| G12 | Header lines 175/176 | thingy % / some ms timer | exe + disasm | open | |
| G13 | SL Rating formula; "Complete: %d%%" definition | | disasm | open | |
| G14 | Rosco exact speeds, speed-up factor, steal-on-arrival vs on-touch, defeat timing | Java 2s wait / 5s travel | exe | open | |
| G15 | Thingy/bomb random distribution; are all 6 thingies in rotation from level 1 | 80% thingy? | exe | open | |
| G16 | Level preview screen layout and which `mini.png` column maps to which world | 6 columns = 6 thingy sets | exe | open | |
| G17 | What `bonus.png`, `bonusbaddies.png`, `suffle.png`, `shooterlandsign.png`, `wood.png`, `plusminus.png` are used for (bonus round? credits?) | | exe | open | |
| G18 | Which font (1/2/3) is used where; text colours | | exe screenshots | open | |
| G19 | Enemy-block removal timing (immediately when last enemy of type dies?) | immediate | exe | open | |
| G20 | World 6 levels 14-25 and world 7 content do not exist | ship W1-W6-13 and mark the rest "coming soon" or author new levels | user decision | open | |
| G21 | Pass-through: can a shot cross a cell the other shot will occupy this volley; does a size-2 shooter's second lane use its own landing search | | exe | open | |
| G22 | Save line 1 meaning; whether best time is stored only when star earned | | exe | open | |
| G23 | Input model: does the player click a grid cell to aim and fire, move to aim and click to fire, or press a button? Any keyboard control? | pointer move aims both shooters (bottom follows x, right follows y), click fires | exe | open | |
| G24 | Runtime-only tile ids: are weights 1-3 ids 12-14, the spent weight 15 and the bomb 0 in the original? Does a weight stay on the board after use? | yes to all; items.png shows a blank weight and the Android port has a plain Weight tile | disasm (tile id switch in the draw routine) | open | |
| G25 | Board and HUD layout: board origin inside the 600x600 play area, shooter positions, HUD text positions and fonts, Rosco's path between stump and piggy bank | board at (20,20), shooters just below/right of it, HUD per supplement.gif, Rosco walks vertically in the HUD panel | exe screenshots | open | |
| G26 | Green ring sprite (items.png frame 8, tile sheet cell (9,7)): aim or landing indicator, store drag cursor, or something else? | landing-cell indicator | exe | open | |

Decided so far: ship worlds 1 through 6-13 and lock the rest (G20); music via in-browser MIDI synthesis; reconciliation by running the exe plus a Ghidra pass.
