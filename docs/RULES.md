# Shooterland: rules

Every rule below was read from the disassembly of the shipped exe (see
[DISASSEMBLY.md](DISASSEMBLY.md) for the function map) unless it is marked otherwise.
[FORMATS.md](FORMATS.md) has the file layouts, [GAPS.md](GAPS.md) the audit trail per gap.
Tutorial level ids (e.g. 1-12) point at the message that first teaches a rule.

## Screens

Logo (fade in 3.3 s, hold until 6 s, fade out; a click skips) -> Title (Start, Quit) ->
File select (three files; Load, Back, Delete with a Yes/No prompt) -> World map (25 nodes,
world tabs, Menu / Stats / Preview / Play) -> Level intro (board, tutorial text in the side
panel, Play) -> Gameplay -> Result (OK / Retry) -> World map. Escape leaves any screen for
the previous one; from gameplay it goes to the map and counts a loss when more than 5 s
were played. Pause is the second of the three HUD buttons (Retry, Pause, Quit); the pause
screen shows the enemy/kill-method chart. Hovering Preview on the map shows the level's
mini-tile layout on a wood panel.

## Board and shooters

- 13x13 cells of 40 px at (40,40). Mary's red bar sits under the board, Poindexter's blue
  bar to its right. Both bars follow the pointer (centred on it) and both fire on one left
  click (1-10, 1-17). Right click or the Store button opens the store.
- Bar sizes are fixed per level (header lines 1-2). A size-N bar covers N adjacent lanes
  and every lane has its own ammo queue: loaded item, next item, and so on. The HUD shows
  each lane's next item. The "randomly change size" line in 1-24 was never implemented.
- Ammo per lane is a bowling bomb with probability 1/20, otherwise one of the six thingies
  with equal probability, from level 1-1 on.
- A volley fires every lane that has an item. Nothing can be fired while any shot is in
  flight. If every lane of either shooter is blocked (its first cell holds something a shot
  cannot enter), the whole volley is cancelled and no shot counts (1-24: one open lane is
  enough).

## Shots

- Shots advance one cell per frame (about 60 cells per second), all lanes together, Mary's
  lanes first. A shot moves until the next cell is not free. Cells whose contents are being
  destroyed count as free, so a bomb that lands first lets the other shot through (2-8).
- Ramps (ids 16-19, open edges top+left, top+right, bottom+left, bottom+right): a shot
  entering through an open edge leaves through the other in the same frame; flat edges
  block. If the exit path is blocked the shot stops before the ramp. Ramps chain (2-5).
- When a shot stops it lands in its current cell. If another shot filled that cell first,
  it backs up along its path to the last free cell; with no free cell it returns to its
  lane's queue.
- A thingy lands as a tile. A bomb lands in the last free cell, then destroys the next
  cell in its direction unless that cell holds a Fatty, Fangie, Skully, grey block or enemy
  block; the bomb itself disappears after its blast animation. A bomb fired into a fully
  blocked lane still blasts the lane's first cell.
- Land mines (id 22) are entered like free cells: the shot and the mine are destroyed
  together. Anything pushed into a mine is destroyed with the mine. Mines have no area
  effect.

## Combos and kills

- Whenever no shot is in flight, every group of 3 or more orthogonally connected identical
  thingies clears (4 or more in world 7). Money: group size minus 2 (1-2). Shots, combos and
  pieces are tallied for the stats.
- Each cleared cell flags its four orthogonal neighbours (1-9). A flagged Crony dies. A
  flagged Fatty or Fangie dies if a thingy next to it belongs to a group of 4 or more (2-18),
  in practice when the combo had 4+. Crazies and Skullies ignore combos (2-1).
- Bombs kill Cronies and Crazies (and destroy thingies, brown blocks, ramps, mines and
  weights). Weights crush Cronies, Crazies and Fatties. Mines kill anything pushed into
  them, which is the only way to kill a Skully.
- Destroyed tiles stay on the board for 11 animation frames (about 0.6 s): they are
  passable but still count as present, so the win, enemy-block removal and HUD counters
  follow about 0.6 s after the last kill.
- Enemy blocks (23-27) vanish as soon as no enemy of their type remains (2-6, 2-9).

## Weights (1-11, 1-12, 1-13)

A weight of strength N (ids 12-14; id 15 is an unsold strength-998 weight) travels like a
shot. When it cannot move it looks along its direction: the run of occupied cells ahead
ends at the first free cell, a mine, the board edge or an enemy block.

1. If the run holds at most N objects, the run has not reached the edge or an enemy block,
   and the weight has not crushed anything yet, the whole run shifts one cell forward
   (enemies included; an object entering a mine is destroyed with it) and the weight
   follows next frame. This repeats until the run can no longer move.
2. Otherwise, if a Crony, Crazy or Fatty is among the first N+1 cells ahead and the cell
   beyond it is not empty, the objects before it shift forward and crush it. The weight
   keeps going and may crush again, up to N enemies in total.
3. Otherwise the weight lands and disappears with the "pop" animation. Nothing remains.

## Store (1-11, 1-16, 2-4)

Weights 1/2/3 cost $2/$3/$4, a bomb $3 (buy several with the +/- buttons), each ramp $2,
and a copy of any thingy on the board $3 (click the thingy while the store is open).
Opening the store parks the bars at the far end, shows a bubble per lane and inserts a
blank slot in front of every lane. Dropping an item on a bubble loads it into that lane and
closes the store; the other lanes keep their blank slot and fire nothing on the next volley
(an original quirk, kept behind `storeBlanksOtherLanes`). Closing without buying removes the
blanks. Money starts at $0 on every level and never carries over.

## Rosco (1-3, 1-7)

Rosco waits for the lair delay (header line 3), then repeats a trip whose period is header
line 4: a quarter of it walking left along the top edge from his stump (top-right corner),
a quarter down the left edge to the piggy bank (bottom-left corner), where he takes header
line 5 dollars, then the same way back. Every line-176 ms (shown as a countdown at the top of
the HUD) the period is multiplied by line 175 percent, never below 1 s, and the trip restarts
from the stump. The level is lost the moment the bank goes below $0.

## Winning, stars, worlds

- The level is won as soon as no enemy tile remains. The time is whole seconds since Play
  was pressed (pauses excluded); a time at or under `times.dat` earns the star (1-5). The
  best time is stored on every win.
- Clearing level 25 of your furthest world advances you to the next world when your stars
  reach 10, 30, 50, 75, 100 or 150 for worlds 1 to 6 (1-25 says 10; 2-25 says 25 but the
  code says 30). The code never advances past world 6, so world 7 was unreachable in the
  beta. "Next: %d stars" shows the threshold of your furthest world.
- Stats: win % = wins / (wins + losses); average combo = pieces / combos; shots per combo;
  SL Rating = 100/6 * (a + b + c + d) with each term clamped to 0..2.375:
  a = (win% - 30) * 0.04, b = (combos/shots - 0.3) * 5.9375, c = (average combo - 3) * 11.875,
  d = stars / min(150, levels reached) * 2.375. Complete % on the file screen =
  ((stars + 2 * (levels reached - 1)) * 100 + 6) / 456.
