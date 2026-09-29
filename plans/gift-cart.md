# The Gift Cart

A packing game for Tabletop Audio track 397, *Homecoming*. Villagers bring gifts to the
cart one at a time before the journey home; each gift covers one or more squares of the
crate, and the line is always longer than the crate. Ten minutes, no timers inside a trip,
and no way to lose anything.

## Loop

1. A trip deals a line of parcels as long as the crate has squares, then shows the first
   three. `cols(trip) = min(COLS_MAX, 1 + ceil(trip / 2))` with `COLS_MAX` 6, so the crate
   gains a column every second trip: 3x2 (6 squares) on trips 1-2, 3x3 (9) on 3-4, 3x4 (12)
   on 5-6, 3x5 (15) on 7-8, and 3x6 (18) from trip 9 on. Six columns is the widest that
   still leaves every square a comfortable tap on a phone.
2. Pick a parcel in the line, then a square. The tap names a square of the parcel — the
   square with the shape on the most sides of it, so a bar is taken by its middle and an L
   by its elbow, and rotating never moves which square is under the finger — and the rest
   of the parcel is laid around it. A parcel that would hang off the crate or overlap
   another one is simply refused.
3. Clicking the selected parcel again turns it one step, skipping orientations a shape
   cannot tell apart — a square does not appear to turn.
4. A placed parcel cannot be taken back: there is no undo and no discard. A tap on a packed
   square is refused, which is the only thing the board ever says no to.
5. The line refills from behind whenever it has room, so it always shows three ahead until
   the line runs dry. A parcel you never place simply waits; there is no discard control.
6. `Set off` delivers — or the trip delivers itself once the line and the line's parcels are
   both exhausted, which can only happen on a crate filled to its last square.

## Parcels

| Squares | Shapes | Value |
| --- | --- | --- |
| 1 | single | 1-2 |
| 2 | domino | 3-5 |
| 3 | 1x3 bar, L corner | 6-8 |
| 4 | 2x2 square, T, 4-long L, S | 9-12 |

Bigger parcels pay more per square but fit in fewer ways; small ones are cheap but flexible.
Three crate rows is what makes the shape set worth turning — a bar stands upright in one
column, and the corner, the square and the tetrominoes get real placement choices.

Since a size brings every shape of that size in at once, size 4's shapes are gated one at a
time instead: the 2x2 square from trip 6 (the first trip size 4 is dealt at all), the T from
7, the 4-long L from 9, the S from 11. `SHAPES` carries `from`, `shapePool()` filters on it,
and an empty pool falls back to the whole size — `pick()` on an empty list returns
`undefined` and the next paint throws reaching into it.

Size mix, by trip: trips 1-2 draw singles and dominoes only (`{1: 4, 2: 6}`); trips 3-5 add
bars and corners (`{1: 2, 2: 4, 3: 3}`); from trip 6 all four sizes are in (`{1: 1, 2: 3,
3: 3, 4: 3}`). Difficulty is packing, never a deadline.

The `1:` weight is the difficulty dial. A single is the only parcel that fits any hole —
including the last one — so thinning singles out is what leaves a player holding three
parcels that do not fit and setting off early. It is not monotonic: a line of nothing but
singles fills any crate, and the value per square barely moves either way (bigger parcels pay
more per square but also cover more squares, and the two roughly cancel). What it changes is
how much slack the rolling hand has.

## Scoring

- Every placed parcel pays its value when the trip is delivered.
- A crate filled to its last square pays the trip **twice**. At 18 squares a strong crate is
  roughly 35-45 raw and 70-90 doubled, which keeps the bonus within an order of magnitude of
  the gift total rather than swamping it.
- Deals are random, so plenty of trips cannot fill exactly; there is deliberately no hint
  and no deal repair. Working out that a crate can still be filled is part of the read.
- `scoreLabel` is `points`.

## Boundaries

- No timers inside a trip and no penalties of any kind. A crate that goes out half empty
  simply pays less; the ten-minute clock is the only clock.
- The last trip in progress must be delivered before the bell. The shell captures the final
  score as the run ends, so a live trip is settled on a clock poll a second before it, the
  `settleAtBell()` pattern from `js/games/higher-lower.js`. `settled` also stops any
  deferred beat from dealing a trip that could never be scored.
- The crate is a CSS grid. Empty squares are buttons with explicit `grid-column` /
  `grid-row`; a placed parcel is drawn as the squares it took, appended after the empty
  squares so DOM order paints it on top and nothing ever needs measuring. Two things it
  must never be: a single block over its footprint (a block cannot show its own shape, so
  the three-square corner reads as a two-by-two), or a tray of separate squares (a parcel
  is one piece, so only its outside is inked and each tile reaches half a crate gap into
  the sides it shares, `BLEED`, which both closes the join and keeps every tile standing on
  its own crate square).
- A parcel holds only the squares it actually took, so the empty corner of an L is still
  floor and another parcel can be laid in it. `fits()` tests a parcel's real cells, never
  its bounding box.
- The crate is a **wooden box, not an accent-tinted panel** (user, 2026-09-28: "can we make
  the crate less pink and more crate-like"). Frame, grain, rim, hollow squares and the four
  corner nails all come from a local wood palette (`--wood`, `--wood-dark`, `--wood-edge`),
  and the accent is left doing chrome only — the chips, the aim targets, the count and the
  button. A full crate signals with **brass banding** (`--brass`) rather than a coloured
  glow. The nails are a `::after` at `pointer-events: none`, which is load-bearing because it
  covers the squares. Do not re-derive any of it from `--accent`.
- A packed parcel shows one gift icon per square it took and no points at all. The icon
  repeating is what says how many squares it covers, and the points stay where they can
  still be acted on: on the chip in the line, and the crate's worth on the button. This is
  also why there is no longer a "where does the label go" rule — the L's elbow answered it,
  and one icon per square made the question go away. The icon is a share of the square
  (`min(52%, 22px)`) rather than a fixed size, so the smaller squares of a six-column crate
  shrink their icons with them instead of crowding the tile.
- `Set off` is the shell's primary action, and the table takes it: `ctx.actionBar` is moved
  into the table's own column between the line and the hint, the way `bones`, `pig`,
  `danse-de-vampyr` and `assassins-bazaar` do it. Nothing about the button's behaviour
  changes — `act()` is still the shell calling in.
- Keep `js/games/gift-cart.js` at or below 500 lines (compacted 639 -> 492 on 2026-09-28, the
  same pass as `assassins-bazaar`'s 654 -> 491). The module carries the invariants only; the
  reasoning behind the rendering rules lives here. Parcel art is drawn inline with `svgEl` /
  `svgPath`; there are no asset files.
