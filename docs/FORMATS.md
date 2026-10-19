# Shooterland: legacy file formats

Field meanings were confirmed in the exe's loader functions (`FUN_004097a3` for levels,
`FUN_004036cd` / `FUN_00403951` for saves; see [DISASSEMBLY.md](DISASSEMBLY.md)).

## Level files `legacy/levels/level{w}-{l}.sll`

Text, read with `istream >>`, so any whitespace separates the 177 values.

| Value | Meaning |
|---|---|
| 1 | Mary's (bottom) bar size, 1..3 |
| 2 | Poindexter's (right) bar size, 1..3 |
| 3 | Rosco's lair delay, ms |
| 4 | Rosco's round-trip period, ms |
| 5 | Dollars Rosco steals per visit (1 or 2) |
| 6-174 | 13x13 grid, row-major, top row first; -1 = empty |
| 175 | Speed-up factor in percent: the period becomes period * value / 100 (min 1000 ms) |
| 176 | Speed-up interval, ms (the on-screen countdown) |
| 177 | Message: `_` = space, `*` = newline, ends with `END`; `Instructions` / `80` are placeholders |

Tile ids: 1-6 thingies, 7 Crony, 8 Crazy, 9 Fatty, 10 Fangie, 11 Skully, 16-19 ramps
(open edges top+left, top+right, bottom+left, bottom+right), 20 grey block, 21 brown block,
22 land mine, 23-27 enemy blocks Crony..Skully. Runtime-only ids: 0 bomb, 12-14 weights 1-3,
15 an unsold strength-998 weight.

Levels: W1-W5 complete (25 each). W6: 1-13 real, 14-25 are identical placeholder copies
(message `80`), plus the unused `Level6-something.sll`. W7: only 7-1, map blank. `times.dat`:
175 times to beat in seconds, 25 per world (W6/W7 all 30). `map.dat`: 25 x,y node positions,
identical for all worlds. Filenames are mixed case; load them case-insensitively.

## Save files `legacy/Save/File{n}.sav`

Text, 185 integers, one per line.

| Line | Meaning |
|---|---|
| 1 | New-game flag: 1 after Delete or on a fresh file, 0 once loaded |
| 2 | Current level |
| 3 | Current (furthest) world |
| 4-178 | Best time in seconds per level, world-major, 25 per world; 0 = never cleared; star when <= time to beat |
| 179 | Unused slot (always 0) |
| 180-185 | Wins, losses, shots, combos, thingies in combos, seconds played |

The star count is not stored; the game recounts it from the best times.

## Fonts `legacy/fonts/fontN/`

LMNOpc Bitmap Font Builder output: `font.ini` holds the texture size (512, 256, 512),
`font.raw` is 8-bit grey used as alpha, 16x16 glyph cells indexed by ASCII, `font.dat` has
256 advance widths. The exe loads font1 six times, font2 three times and font3 twice, each
with a colour (see the font-slot table in DISASSEMBLY.md).

## Sprite sheets

- Colour keys: black for every sheet except `bonus.png`, `bonusbaddies.png` and
  `suffle.png` (magenta); `menusupplement.png`, `shooterlandsign.png`, `plusminus.png`
  and the backgrounds are opaque. `bubbles.png` is drawn at alpha 128.
- `worldN/background.png` is the level intro's backdrop (bare side panel);
  `worldN/backgrounddark.png` is the gameplay and result backdrop, darkened and carrying the
  finished HUD art; `worldN/supplement.gif` is the store panel drawn at (600,366) while the
  store is open.
- `worldN/image.gif` 440x480: row = tile id for ids 0-11 (bomb + blast frames, six thingies
  with 11 frames, five enemies with 9 frames); the last two columns of rows 7-11 hold the
  ring (9,7), mine (10,7), grey block (9,8), brown block (10,8) and the enemy blocks.
- `items.PNG` 40x360: weights 1-3, the strength-998 weight, ramps 16-19, a ring copy.
- `shooters.png` 120x160: Mary's bars at (80,80) 40x40, (40,40) 80x40, (0,0) 120x40;
  Poindexter's at (80,120) 40x40, (40,80) 40x80, (0,40) 40x120.
- `stumpandmoney.png` 40x80: stump on top, piggy bank below. `raccoon.png` 8 frames of 40 px:
  two per direction (left, down, up, right). `explosion.png` 2 rows of 11: blast and pop.
- `bubbles.png` 124x124: four 62 px bubbles. `mini.png` 120x560: 20 px tiles, row = tile id,
  column = world - 1. `checkandstar.png` 36 frames of 64x40 per row (check, star).
- Letter strips: `complete.png` 8x60, `defeat.png` 6x60 (drawn 80 apart), `Pause.png` 5x80.

## Audio

`shoot.wav`, `thingyhit.wav`, `combo.wav`, `bomb.wav`, `pop.wav`; MIDI `titlescreen.mid`,
`maptheme.mid`, `world1..7.mid` (`music.mp3` is unused).
