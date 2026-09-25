# Magical Flora — the grove that grows across planes

A new table for the Tabletop Audio track `423_Magical_Flora.mp3`
(ambience + music; fantasy, scifi, nature, planar, forest, peaceful).

## The pitch

The planes keep sending seed through a 7×7 bed of plots. Plant a seed beside
something already growing: a neighbour of the same plane pays 1, a neighbour of
another plane pays 3, because the grove pays for difference. Ring a plot with
four plants of at least three different planes and it blooms — a **wildcard that
is a stranger to every plane**, so it feeds every crossing after it.

Nothing here fails. The pressure is scarcity: forty-nine plots against a hand of
fourteen to twenty-four seeds, so the grove can never be filled and every seed is
a decision about which frontier to extend. When the hand runs out the grove
matures — harvest, a wider plane mix, a heritage bloom or three — and the next
season pays the season number on everything.

## Decisions

- **No fail state** (user's call, 2026-09-24: "make it strategic so it's not
  boring"). Strategy is carried by four things rather than by punishment:
  scarcity of seeds against plots, the joined-grove rule that makes shape a
  choice, blooms as irreversible investments, and the season ramp. This is the
  first table on the site where a bad turn costs only potential.
- **A new wing, The Grove**, rather than folding into The Wilds, whose blurb
  reads "worse weather" — the wrong frame for a peaceful track.
- **The hand is fully visible and spent in any order.** No queue, no reveal, no
  per-season timer. A visible hand makes the season a calm planning puzzle, which
  is what a peaceful track asks for.
- **Same-plane pays 1, another plane pays 3** (user's call). Difference-only was
  the first draft; paying a little for kin softens the rule to one line and keeps
  crossing play clearly ahead of blobbing a bed.
- **The grove must stay joined.** A seed needs an orthogonal neighbour, so the
  frontier is a decision and the bed's silhouette is the player's drawing.
- **The border is thin soil** (2026-09-24, after a first play). A bloom needs four
  sides, so all 24 border plots can never be ringed — the outer ring was dead
  ground that could silently eat a perfect ring. It now pays `EDGE_BONUS` of 2 for
  any seed planted on it, which gives the border a job: reliable points, weighed
  against the bloom potential inside. The alternatives were letting an edge bloom
  on three strictly-different planes (which inverts the economics, since
  enclosing would cost three seeds instead of four) and making a border
  Mistflower bloom on planting (which touches one seed a season). The hint line
  says only the inner 5x5 can be ringed, so nobody builds a ring that cannot
  fire.
- **A bloom keeps the face it grew with** (fix, 2026-09-24, after a first play).
  `paintBoard()` was reading `readingOf(plant)` — the scoring value — so a bloomed
  Verdant turned into a gold `*`, pixel-identical to a Mistflower seed but for the
  ring. The plane map died the moment a few blooms landed, and a plot's identity
  was gone while its effect on its neighbours was not: the one thing on the board
  that changed the arithmetic had stopped saying what it was. The face now comes
  from `plant.plane` and the gold ring carries the wild reading, so both facts are
  on screen. `readingOf()` is untouched and still governs scoring and rings.
- **Four blooms ring a plot too** (user, 2026-09-24). Every bloom reads as the
  same wild, so four of them around a plot made a set of one and could never
  satisfy `BLOOM_MIN_PLANES`: the shape that looks most obviously like a crossing
  was the one shape that could not bloom. `resolveBlooms()` now blooms a plot
  whose four neighbours are all blooms, on top of the three-distinct-planes rule.
  This is deliberately the narrow form — one wild does not substitute for a
  missing plane, so the distinct rule keeps its teeth everywhere else.
- **Blooms read as wild, permanently.** A bloomed plot is a stranger to every
  plane, which is what makes ring-building worth the adjacency it costs. Blooms
  are evaluated against the bed as it stood before the pass, so two plots can
  bloom off the same placement.
- **One Mistflower, one compost** (user's calls). Tiny allowances, spent
  deliberately: the wild completes a ring or rescues a frontier, the compost
  answers a hand with a surplus of a plane.
- **Heritage is capped at three blooms** (user's call), placed on the inner bed
  and kept apart from each other so one anchor never counts twice. They are the
  literal reading of "the grove matures", and they guarantee the first seed of a
  season has a neighbour. Watch for snowball: a three-bloom season starts the
  next one warm.
- **The bell harvests an unfinished season** (user's call), for the share of the
  hand that went in: `floor(seasonHarvest × season × spentRatio)`. This is the
  one place the table touches the clock.
- **Mouse only** (site-wide rule since 2026-09-25). The rail chips, the compost
  and the plots are all real buttons, so the game works with a finger as well as a
  mouse.
- **Letters, colours and silhouettes.** Each plot carries its plane's letter as
  well as its colour and shape, so the bed is readable without relying on colour.

## The planes

| plane | letter | colour | arrives |
| --- | --- | --- | --- |
| Verdant | V | `#6fbf6a` | season 1 |
| Ember | E | `#e07a45` | season 1 |
| Tide | T | `#5aa7d6` | season 1 |
| Gloam | G | `#9a7ad0` | season 3 |
| Aether | A | `#6fd0c0` | season 5 |
| Mistflower | \* | `#e3cf8a` | wild, always a stranger |

A bloom is not a plane of its own. It keeps the face it grew with — colour,
silhouette and letter — takes a gold ring, and reads as wild to everything around
it. The ring is gold rather than the table accent because the accent here is
`#7cc36a`, which would vanish into a verdant plot's `#6fbf6a` fill.

`PLANES(season) = min(3 + floor((season - 1) / 2), 5)`. More planes make
crossings easier and blooms harder at the same time, which is why the ramp is
gentle.

## Timing and numbers

| constant | value | meaning |
| --- | --- | --- |
| `COLS` / `ROWS` | 7 / 7 | 49 plots; a hand of 24 can never fill it |
| `HAND_BASE` / `STEP` / `MAX` | 14 / +2 / 24 | seeds dealt per season |
| `WILDS` / `COMPOST` | 1 / 1 | allowances per season |
| `PLANT_BASE` | 1 | a legal placement always pays something |
| `SAME_POINT` / `CROSS_POINT` | 1 / 3 | orthogonal neighbours, same plane and another |
| `EDGE_BONUS` | 2 | a seed planted on the border, where the soil runs thin |
| `BLOOM_MIN_PLANES` | 3 | distinct planes among the four neighbours |
| `BLOOM_BASE` / `STEP` | 12 / +4 | each bloom in a season pays a little more |
| `HARVEST_BASE` / `STEP` | 40 / +20 | the harvest when a hand runs out |
| `HERITAGE_MAX` | 3 | blooms carried into the next season |
| `MATURE_MS` | 2000 | pause while a matured grove is cleared |
| `CLOCK_MS` / `SETTLE_MS` | 250 / 1200 | the bell check, and how early it harvests |
| `LAST_SEASON_MS` | 30_000 | from here the foot reads "harvest at the bell" |

Everything awarded in a season is multiplied by the season number, so the foot
reads `Season 4 · ×4`.

## Phases

`planting` → (hand exhausted) `maturing` [locked, harvest paid, then a new
season] → `planting` …, plus `settling` at `SETTLE_MS` before the bell and
`stopped`. Only `planting` accepts a seed, a selection or a compost, which is
what `canPlay()` enforces. Every timer re-checks `alive`.

## The bell, and why it fires early

The shell captures the final score in `onEnd({ score })` and calls
`game.stop(ctx)` after that, so points added from `stop()` never reach the
summary. An unfinished season therefore has to be harvested just before the
clock stops, which is what `startClock()` and `settleAtBell()` do at
`SETTLE_MS`, guarded by `harvestedThisSeason` so a season that already matured is
never paid twice.

## Files

- `js/games.config.js` — the `grove` category and the `magical-flora` entry.
- `js/games/magical-flora.js` — the table.
- `css/games/magical-flora.css` — the rail, the bed, the plane silhouettes and
  the bloom ring.
- `README.md` — the table row, the category list, and the keyboard note.

No shared file changes: the table fits the existing contract with
`actionLabel: null`, drawing its own rail and reading its own clock.

## Notes for a first play

- Season length grows with the hand (14, 16, 18 … capped at 24), so a night that
  starts brisk slows down as the bed thickens. If late seasons drag, the cap or
  `HAND_STEP` is the knob.
- Watch whether a dense single-plane bed (4–5 points a seed, no thinking) ever
  competes with crossing play. The levers are `SAME_POINT` at 0, or requiring
  four distinct planes to bloom.
- Heritage blooms are placed by the generator, never chosen, which keeps a hot
  season from handing the player a designed opening.
