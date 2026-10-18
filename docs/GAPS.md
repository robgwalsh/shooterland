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
| G6 | Weight push/crush algorithm (what stops a push, chain pushes, crush ordering, what happens to the weight itself) | 1-11/1-12 text | exe + disasm | open | |
| G7 | Shooter size change rule ("flu": random timing, range 1..header size?) and lane geometry for size 2/3 | header lines 1-2 = max size | exe | open | |
| G8 | Ramp ids 16/18 orientation, flat-side blocking, ramp shot deflected by ramp, bomb-on-flat-side | derived 17 = "\", 19 = "/" | level geometry + exe | open | |
| G9 | Star thresholds for W3-W6 ("Next: %d stars"), final survival level duration | 10, 25, ... | disasm (likely a table in .data) | open | |
| G10 | Tile 22 identity (land mine?) and mine mechanics | mine; stepping/landing on it explodes? | exe on level 3-16 | open | |
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

Decided so far: ship worlds 1 through 6-13 and lock the rest (G20); music via in-browser MIDI synthesis; reconciliation by running the exe plus a Ghidra pass.
