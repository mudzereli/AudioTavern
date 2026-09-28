# Magical Flora — the grove that grows across planes

A new table for the Tabletop Audio track `423_Magical_Flora.mp3`
(ambience + music; fantasy, scifi, nature, planar, forest, peaceful).

## The pitch

The planes keep sending seed through a 7×7 bed of plots. Plant a seed beside
something already growing: a neighbour of the same plane pays 1, a neighbour of
another plane pays 3, because the grove pays for difference. A straight horizontal
or vertical run of distinct kinds blooms its middle plant or plants. The run
must match the number of planes sending seed that season: three, four, or five.
A bloom keeps the plane it grew from; only Mistflower is wild. A new seed can
complete a run through older plants; no ring or enclosure is needed.

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
- **The border is thin soil** (2026-09-24, after a first play). The outer ring
  pays `EDGE_BONUS` of 2 for any seed planted on it, giving the border a job:
  reliable points, weighed against the extra points at central crossings.
- **Blooms change state, not plane** (2026-09-27). A flower takes the gold face
  and round silhouette, but its original plane continues to govern scoring and
  bloom checks. Mistflower alone is wild; the letter and gold flower
  distinguish a bloomed plant from a Mistflower.
- **Blooms reward crossword runs, not enclosures** (2026-09-27). A bloom requires
  a straight horizontal or vertical run of distinct kinds. Its middle plot
  (or both middle plots for an even-length run) flowers. A placement checks only
  runs containing the new seed, so it can bloom an older middle plot without
  scanning unrelated parts of the board. No closed loop is needed.
- **Run length follows the season's plane mix.** Three planes require a run of
  three distinct kinds; four require four; five require five. Mistflower is one
  distinct wild kind and can fill one place in a run.
- **No special all-bloom ring rule.** Flowers keep their original planes, so they
  count as those kinds in future runs. Bloom status changes the flower's face,
  not its kind.
- **Heritage keeps plane identity.** Up to three blooms from the previous season
  return at random inner plots, apart from one another, and keep the planes they
  grew from. This preserves the bloom rule across seasons without turning every
  carried flower into a wildcard.
- **One Mistflower, one compost** (user's calls). Tiny allowances, spent
  deliberately: the wild supplies a distinct kind in a line or rescues a
  frontier, the compost answers a hand with a surplus of a plane.
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
| Mistflower | \* | `#e3cf8a` | the only wild kind |

A bloom is still its original plane for scoring and matching. Its gold flower face
and round silhouette mark its state; its letter preserves the plane identity.
Mistflower uses the same gold but remains the only wild kind. Gold is distinct
from the table accent (`#7cc36a`), which would vanish into Verdant's `#6fbf6a` fill.

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
| bloom run | 3 / 4 / 5 | distinct kinds in a straight run, matching the season's plane count |
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
  the flowered-state face.
- `README.md` — the table row, the category list, and the keyboard note.

No shared file changes: the table fits the existing contract with
`actionLabel: null`, drawing its own rail and reading its own clock.

## Notes for a first play

- Season length grows with the hand (14, 16, 18 … capped at 24), so a night that
  starts brisk slows down as the bed thickens. If late seasons drag, the cap or
  `HAND_STEP` is the knob.
- Watch whether season-length runs feel like a satisfying spatial plan, and
  whether Mistflower makes early three-kind blooms too easy. If the bloom
  chain is still too lucrative, tune `BLOOM_BASE` / `BLOOM_STEP` before changing
  the run rule again.
- Heritage blooms are placed by the generator, never chosen, but keep the planes
  they grew from; this preserves identity without handing the player a designed
  opening.
