# The Gift Cart

A packing game for Tabletop Audio track 397, *Homecoming*. Villagers bring gifts to the
cart one at a time before the journey home; each gift covers one or more squares of the
crate, and the line is always longer than the crate. Ten minutes, no timers inside a trip,
and no way to lose anything.

## Loop

1. A trip deals a line of parcels as long as the crate has squares, then shows the first
   three. `cols(trip) = min(4, 1 + ceil(trip / 2))`, so the crate is 3x2 (6 squares) on
   trips 1-2, 3x3 (9) on trips 3-4, and 3x4 (12) from trip 5 on.
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
| 4 | 2x2 square | 9-12 |

Bigger parcels pay more per square but fit in fewer ways; small ones are cheap but flexible.
Three crate rows is what makes the shape set worth turning — a bar stands upright in one
column, and the corner and the square get real placement choices.

Size mix, by trip: trips 1-2 draw singles and dominoes only; trips 3-5 add bars and corners;
from trip 6 the 2x2 square is in the draw. Difficulty is packing, never a deadline.

## Scoring

- Every placed parcel pays its value when the trip is delivered.
- A crate filled to its last square pays the trip **twice**. At 12 squares a strong crate is
  roughly 25-30 raw and 50-60 doubled, which keeps the bonus within an order of magnitude of
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
- Art and value land on the middle of the shape, never the middle of the box the shape sits
  in. A full rectangle's middle is the middle of its box (a domino is labelled on its seam,
  a two-by-two on the point all four meet); a shape with a bite out of it takes the square
  with the shape on the most sides of it, an L's elbow.
- `Set off` is the shell's primary action, and the table takes it: `ctx.actionBar` is moved
  into the table's own column between the line and the hint, the way `bones`, `pig`,
  `danse-de-vampyr` and `assassins-bazaar` do it. Nothing about the button's behaviour
  changes — `act()` is still the shell calling in.
- Keep `js/games/gift-cart.js` at or below 500 lines (compacted 639 -> 492 on 2026-09-28, the
  same pass as `assassins-bazaar`'s 654 -> 491). The module carries the invariants only; the
  reasoning behind the rendering rules lives here. Parcel art is drawn inline with `svgEl` /
  `svgPath`; there are no asset files.
