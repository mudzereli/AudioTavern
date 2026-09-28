# What we're working on

The working queue, in priority order, one entry per table. This is the single
place to look. Add an entry when something is agreed, and **delete it once it
lands** — nothing already done belongs in here.

Last updated: 2026-09-28

---

## The Gift Cart — track 397, Homecoming (in progress)

A packing game in **The Village**. The crate is a three-row grid that widens a column at a
time (3x2 -> 3x3 -> 3x4), and villagers bring parcels up one at a time — single, domino,
1x3 bar, L corner, 2x2 square — each covering that many squares and paying by size. Pick a
parcel, tap a square to lay it down, tap the parcel again to turn it; a packed parcel stays
packed. A crate filled to its very last square pays the trip twice; `Set off`
delivers, and a live trip settles a second before the bell.

Decisions and dials are written up in `plans/gift-cart.md`. New files:
`js/games/gift-cart.js`, `css/games/gift-cart.css`, and the `GAMES` entry in
`js/games.config.js`. The Village blurb was widened to cover it. **Needs a phone play before
it counts as finished.**