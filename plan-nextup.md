# What we're working on

The working queue, in priority order, one entry per table. This is the single
place to look. Add an entry when something is agreed, and **delete it once it
lands** — nothing already done belongs in here.

Last updated: 2026-09-28

---

## The Gift Cart — track 397, Homecoming (in progress)

A packing game in **The Village**. The crate is a three-row grid that widens a column every
second trip (3x2 -> 3x3 -> 3x4 -> 3x5 -> 3x6), and villagers bring parcels up one at a time —
single, domino, 1x3 bar, L corner, 2x2 square, then a T, a 4-long L and an S as the run goes
on — each covering that many squares and paying by size. Pick a
parcel, tap a square to lay it down, tap the parcel again to turn it; a packed parcel stays
packed. A crate filled to its very last square pays the trip twice; `Set off`
delivers, and a live trip settles a second before the bell.

Decisions and dials are written up in `plans/gift-cart.md`. New files:
`js/games/gift-cart.js`, `css/games/gift-cart.css`, and the `GAMES` entry in
`js/games.config.js`. The Village blurb was widened to cover it. **Needs a phone play before
it counts as finished.**

---

## Moonshine — track 323, Distilled: Backwoods (in progress)

An upgrade economy in **The Wilds**. The score is what the still makes — a bottle scores the
moment it comes off the kettle, sold or not — and money is only the budget the shop is bought
with. Four chains, one lever each: the still (rate), customers (rate out), the mash (price)
and the shed (capacity), each bought in order and each row printing what its next step does and
nothing more: a change in the chain's own unit, no projection, no payback time, no verdict.
`Sell a bottle` is the shell's button, moved into the table at one bottle per 2.5s: it carries
the opening, and later it is
what clears a shed the customers cannot keep up with. The Customers ladder tops at 1.4 b/s on
purpose — `sale top + hand ceiling < still top` is the invariant that keeps the shed alive.

Decisions, the pace model and the dials are written up in `plans/moonshine.md`. New files:
`js/games/moonshine.js`, `css/games/moonshine.css`, and the `GAMES` entry in
`js/games.config.js`. **Needs a phone play before it counts as finished** — the shop is four
two-line rows above the shell button and the whole board should still be one screen.