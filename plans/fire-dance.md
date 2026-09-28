# Fire Dance — the fire is the fence

A table for the Tabletop Audio track `430_Fire_Dance.mp3` (fantasy, horror,
nature, forest, epic, dramatic, ritual, skirmish, monster), in the existing
**The Wilds** wing. Planned 2026-09-25: the concept was chosen over two
alternatives, then the gameplay was settled over ten questions the same day.

## The pitch

A clearing at night, one bonfire, dancers circling it, and something pacing
outside the light. The fire's level *is* its light radius, and the beast takes
ground only while it stands in the dark — while the light reaches it, it holds at
the edge and takes nothing.

A turn is one action, and then the beast takes ground if the light no longer
reaches it. Nothing drains the fire on its own: the dance is what the fire pays
for, so the light shortens exactly as fast as the rite advances.

- **Dance** — the rite advances, and the fire pays for the step: a level or two,
  rolled each turn. This is the score.
- **Feed** — a log, for three to six levels of fire, rolled each turn. The only
  thing that lengthens the light once it has been spent, and a wasted log at full
  blaze.
- **Gather** — out to the woodpile: one to three logs, and a level of light for the
  trip, because you are away from the fire while you make it.

The trade in one sentence: **the rite burns the light that holds the beast out,
the wood is out in the dark, and the closer you let it come, the less light it
takes to hold it there.** The beast's distance is the record of your greed, and
the last ring is where it gets you.

## Decisions

- **The Pyre**, chosen over *The Rite* (leap and bank the fire against an
  approaching beast) and *The Ring* (a choreography of dancers on stones). The
  Pyre is the one that makes the light a fence rather than a meter, and it was the
  user's pick knowing it was the most systems of the three.
- **The Wilds, not a new wing.** The Grove's blurb promises "nothing here is in a
  hurry, and nothing here bites", and this has a monster in it.
- **The beast is a pressure track, not a character**: one mark on a ray, a
  distance, and the word held or coming — no turn of its own, no second
  behaviour, nothing to read but where it is. The mark is drawn as a demon face
  (horns, lit eyes, fangs) — added 2026-09-25, after the first two versions read
  as a dot and then as an indistinct animal. The drawing is decoration: the
  information is its position on the ray and the one scale it shares with the
  light ring.
- **Turn-based, one action a turn.** Nothing punishes a slow reader, and the
  ten-minute run is the only clock.
- **No timing test.** Danse de Vampyr owns the beat-press; nothing here is a
  reflex. Every choice is a read.
- **The light is geometric, not a meter.** The ring is drawn at the fire's radius
  and the pip at the beast's distance on one shared scale, so "held" is literally
  the pip sitting on the ring, and the player can see the fence rather than
  compute it.
- **Equality holds.** `beast <= fire` freezes it, so a fire exactly equal to the
  distance is a real fence — the cheapest, most fragile position in the game, and
  the one the whole design tempts the player into.
- **The tell is visible before you act.** How far it will come this turn is
  rolled when the turn opens and shown on the chip, so holding the fence is
  arithmetic you can plan rather than a guess. This is Bug Hunt's telegraph.
- **The lane's other half: the forecast.** The fire chip carries the burn and
  every button carries its net effect on the fire, so the consequences of a turn
  are visible before it is taken. Those nets are the economy, and they move when
  the night deepens.
- **Verse one is a free page.** It prowls and cannot close, so feeding,
  gathering, dancing and the tell are all learned with nothing at stake. It is
  also the verse that teaches what a step costs, because the fire is already
  falling as the dancers work.
- **A take costs the dancer only** (user's call). The steps already danced into
  the verse are kept, so a mistake costs a life and the tempo, never the work in
  hand. There is no second punishment stacked on the first.
- **The dance burns the fire, and nothing else drains it** (user's call,
  2026-09-25). The first draft had a passive burn, and had the dancers stoke the
  fire as they danced; the two cancelled out, so the opening verses had nothing to
  manage at all and the game was free until verse five. Both are gone: a step
  costs fire, a log gives it back, and the other two actions cost none.
- **The ladder deepens one dial at a time**: the fence goes live at verse two,
  dance cost rises at five and nine, and the beast reaches further at seven, with
  the verses lengthening in between.
- **The woodpile is flat**: one to three logs, every trip, at every depth, for the
  same single level of light. One rule, one gamble, nothing to track.
- **Turtling is left alone** (user's call). A player who hides and never dances
  scores nothing, which is its own punishment — and the invariant below is what
  stops hiding from becoming the winning line instead.
- **The score is the body count's cousin**: one point per completed verse, so
  `scoreLabel` reads `rites completed`. Awarded live as the verse turns, never
  from `stop()`.
- **A completed rite is the one thing worth seeing** (user's call, 2026-09-25). For
  `FLARE_MS` the clearing throws an echo of its own light, the fire burns brighter
  and the dancers straighten up, and the Verse chip lights with them. It is a state
  that comes and goes rather than an animation, because `tokens.css` neutralises
  motion and the moment has to read with that switched off.
- **Three dancers are three mistakes, and the third only restarts the dance**
  (user's call). A lost rite relights the fire, restacks the wood, brings the
  three dancers back and returns to verse one, with the score untouched. The run
  always plays out its ten minutes: what a wipe costs is the tempo and the depth
  it had reached — the Bug Hunt shape, where losing a sector costs time and never
  the work.

## Load-bearing numbers

| constant | value | meaning |
| --- | --- | --- |
| `FIRE_MAX` / `FIRE_START` | 8 / 4 | the light radius is the fire level |
| `DANCE_COST` / `DANCE_SWING` | 1 (+ 1) / 1 | a step costs 1-2, 2-3 from verse 5, and 3-4 from verse 9 |
| `FEED_GAIN` / `FEED_SWING` | 3 (+ 3) / 3 | a log gives back 3-6, rolled per turn |
| `WOOD_START` / `WOOD_CAP` | 4 / 8 | logs |
| `GATHER_MIN` / `GATHER_MAX` / `GATHER_COST` | 1 / 3 / 1 | a trip's yield, and what it costs the light |
| `BEAST_FAR` | 5 | rings out, and the treeline |
| `BEAST_TELL` | 1, then 1-2 from verse 7 | the ladder, shown before you act |
| `FREE_VERSE` | 1 | the verse it cannot close during |
| `DANCERS` | 3 | lives |
| `VERSE_BASE` / `VERSE_MAX` | 3 / 8 | verse one's length, and the ceiling |
| `FLARE_GAIN` | 1 | fire a completed verse gives back |

The three effects are the economy: **Dance -1 or -2, Gather -1, Feed +3 to +6.**
Nothing is free except a log: every other action is paid for out of the light, so
the fire is the one budget the table spends, and the woodpile is a purchase rather
than a safe errand. On the averages — a step at 1.5, a log at 4.5 — one trip and
the two logs it feeds buys about five steps of the rite.

**The invariant: nothing may give the fire back on a turn that also scores.** If a
step could ever net the fire zero or better, a player would reach full blaze and
dance to the bell with the beast frozen at the edge of the light. The flare on a
completed verse is the one exception, and deliberately small: one level, once per
verse, against three to eight paid steps. Every rebalance checks this first.

## The ladder

It deepens slowly on purpose. A night that scales fast is a night where fuelling
the fence stops being worth the turn it costs, which is exactly the failure this
ladder was retuned to fix.

| verse | what changes |
| --- | --- |
| 1 | the free page: it prowls and cannot close (3 steps) |
| 2 | it closes one ring, and the fence is live |
| 5 | a step costs two, so a log buys two steps instead of four |
| 7 | it closes one ring or two, and the tell starts to matter |
| 9 | a step costs three or four fire, so the growing verses demand more fuel |

Verse length is a separate, steadier clock: three steps through verse four, then
a step longer every other verse, capped at `VERSE_MAX`.

## Files

- `js/games/fire-dance.js` — the table.
- `css/games/fire-dance.css` — the clearing, the light, the pip, the dancers.
- `js/games.config.js` — the `fire-dance` entry (accent `#d9603c`,
  `scoreLabel: 'rites completed'`, `actionLabel: null`).
- `README.md` — a row in the tables list.

No shared file changes: the table fits the contract with `actionLabel: null`,
drawing its own three actions and reading no clock at all.

## Notes for a first play

- Watch the two numbers, not the board: `fire` against `beast`. While `fire` is
  at or above `beast`, nothing can happen to you.
- Losing all three dancers is a setback rather than an ending: the dance starts
  again from verse one, the ladder goes back to gentle, and the score keeps
  climbing.
- The efficient line is to let it come close, because a close beast needs very
  little light to hold — and the last ring is where that stops being clever.
- Dancing is never free: each step costs fire, rising from one or two to two or
  three at verse five and three or four at verse nine. A log gives back three to
  six — feeding is meant to feel like a rescue, not a chore.
- **The rolls are shown before you commit** (user's call, 2026-09-25: the fire
  should not be so predictable). The price of this step, the gift of this log and
  the beast's step are all rolled when the turn opens and printed on the buttons
  and the beast chip, so the turn's arithmetic is the same for the player and for
  the code. A hidden roll would have made a two-level step able to take a bite out
  of a position that was safe when the player chose it, which is exactly the
  unfairness this table does not have anywhere else.
- When the fire is already short of the beast, every turn spent on anything but a
  log costs you a ring, because it takes ground on each of them.
- Going out for wood is a whole turn with the fire burning and nothing fed, so it
  is the move that lets it closer.
- The three button nets are live. When a step's price doubles at verse five, the
  Dance button changes under your hand, and that is the escalation being felt
  rather than announced.

## Risks and what to do about them

- **The solved game.** Any change to `BURN`, `STOKE`, `FEED_GAIN` or the ladder
  has to preserve stoke < burn.
- **A take is cheap now** (a dancer, no progress lost). If mistakes read as free,
  the dial is `DANCERS` three to two — not a new punishment bolted onto the take.
- **Every duty given to the dancers is a spiral risk**, since losing one also
  thins the fire. If a death makes the next verse hopeless, floor `STOKE` at one
  while any dancer lives.
- **A lost rite returns to verse one**, where the verses are shortest and the
  score comes fastest, so a min-maxer could get caught on purpose to farm quick
  verses. If that ever matters, the dials are to keep the verse number across a
  wipe, or to score the steps danced rather than the verses completed.
- **The pace of the ladder is the difficulty dial** (user's note, 2026-09-25: the
  night scaled too fast, and feeding stopped being worth it). The burn rises at
  verses five and nine; if feeding becomes a treadmill, move a cost rung later or
  make a log bigger — never let a dance net zero, which solves the table.
- **Ship Graveyard overlap** is the gather trip: fetch, get back, clock running.
  It is kept apart by making the trip a single action and putting the score on the
  rite rather than the haul.
- **Maintenance instead of play.** If dancing gets squeezed out, the dials are
  `FEED_GAIN` three to four or `WOOD_CAP` eight to ten. Target: about half the
  turns should be a Dance.
