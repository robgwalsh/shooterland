# Shooterland: legacy file formats

## Legacy level format `legacy/levels/level{w}-{l}.sll` (text, CRLF, 177 lines, read with fscanf so padding varies)

| Line | Meaning | Confidence |
|---|---|---|
| 1 | Bottom shooter size 1..3 | high (1-24/1-25 are the first `2`) |
| 2 | Right shooter size 1..3 | high |
| 3 | Rosco lair delay ms (30000 early W1, 10000, 18500 W5, 15000 7-1) | medium |
| 4 | Rosco speed-up interval ms (20000..45000) | medium |
| 5 | 1 or 2 (2 for all W5 and W6-1..13) | unknown (G11) |
| 6-174 | 13x13 grid, row-major, top row first; -1 empty | high (1-18 "block by the broccoli up top" = row 0 `3 20`) |
| 175 | 70..98, mostly 80: likely % chance a shot is a thingy vs bomb | unknown (G12) |
| 176 | 10000..70000 ms | unknown (G12) |
| 177 | Message: `_`=space, `*`=newline, ends `END`; `Instructions` placeholder | high |

Tile ids: 1-6 thingies, 7 Crony, 8 Crazy, 9 Fatty, 10 Fangie, 11 Skully, 16-19 ramps, 20 grey block, 21 brown block, 22 unknown (mine?), 23-27 enemy blocks Crony..Skully. Never in files: 0, 12-15 (likely weights 1-3 + bomb as runtime-only ids, matching `items.PNG` order).

Levels: W1-W5 complete (25 each). W6: 1-13 real, 14-25 are identical placeholder copies (message line = `80`), plus unused `Level6-something.sll`. W7: only 7-1, map blank. `times.dat`: 175 TTB seconds, W6/W7 all 30 (placeholders). `map.dat`: 25 x,y node coords, identical for all worlds. Mixed-case filenames; loader must be case-insensitive.

## Save format `legacy/Save/File{n}.sav` (text, 185 lines)

1: `0` (unknown) | 2: stars | 3-4: current world, level | 5-179: best time per level (175, 0 = uncleared; star if <= TTB) | 180 wins | 181 losses | 182 shots | 183 combos | 184 thingies in combos | 185 seconds played. Stats screen derives: win % = wins/(wins+losses), avg combo size = pieces/combos, shots per combo, "SL Rating" (formula unknown, G13).

## Assets

- PNG sheets are 24-bit, colour-keyed (magenta or black). `image.gif` per world: 440x480 = 11 cols x 12 rows of 40px: row 0 bomb + explosion frames; rows 1-6 thingies (11 anim frames each); rows 7-11 enemies (9 frames) with green ring, mine, grey block, brown block, enemy blocks in the last 2 columns. `items.PNG` 40x360: weight 1,2,3, blank weight, 4 ramps, green ring. `shooters.png` 120x160 bars. `bubbles.png` 2x2 of 62px. `mini.png` 120x560 = 6 columns (one per world set) x 28 rows of 20px preview tiles. `raccoon.png` 8x40px. `explosion.png` 2 rows x 11. `checkandstar.png` 2 rows x 36 of 64x40. `complete.png`/`defeat.png`/`Pause.png` letter strips. `menusupplement.png`, `wood.png`, `buttonz.png` 4x27x31, `plusminus.png`, `mouse.png`, `beta.png`, `logo.png`, `shooterlandsign.png`, `bonus.png`, `bonusbaddies.png`, `suffle.png`.
- Fonts: LMNOpc Bitmap Font Builder: `font.ini` = texture size (512 / 256 / 512), `font.raw` = 8-bit grey alpha, 16x16 glyph cells indexed by ASCII, `font.dat` = 256 advance widths. font1 used most (6 loads), font2 small (3), font3 (2).
- Audio: `shoot.wav`, `thingyhit.wav`, `combo.wav`, `bomb.wav`, `pop.wav`; MIDI `titlescreen.mid` (= `maptheme.mid`), `world1..7.mid` (6 = 7). `music.mp3` (Chopin) unused.

---

