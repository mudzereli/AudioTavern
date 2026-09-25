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

One action a turn, and then the world moves: the fire burns down, and the beast
closes if the light no longer reaches it.

- **Dance** — the rite advances, and the dancers stoke the fire as they go.
- **Feed** — a log for three levels of fire. The only way up.
- **Gather** — out to the woodpile: one to three logs, and the fire burns the
  whole time you are away.

The trade in one sentence: **every log you burn is a turn you did not spend
dancing, and the closer you let it come, the cheaper the light is.** The beast's
distance is the record of your greed, and the last ring is where it gets you.

## Decisions

- **The Pyre**, chosen over *The Rite* (leap and bank the fire against an
  approaching beast) and *The Ring* (a choreography of dancers on stones). The
  Pyre is the one that makes the light a fence rather than a meter, and it was the
  user's pick knowing it was the most systems of the three.
- **The Wilds, not a new wing.** The Grove's blurb promises "nothing here is in a
  hurry, and nothing here bites", and this has a monster in it.
- **The beast is an abstract pressure track**, not a drawn creature: a pip on a
  ray, a distance, and the word held or coming. Cheaper and colder, and it reads
  at a glance on a phone.
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
  also the verse that teaches that dancing holds the fire, because at verse two
  the dancers' stoke equals the burn.
- **A take costs the dancer only** (user's call). The steps already danced into
  the verse are kept, so a mistake costs a life and the tempo, never the work in
  hand. There is no second punishment stacked on the first.
- **Dancers stoke the fire when they dance** (user's call), which is why the
  stoke has to stay below the burn once the night deepens — see the invariant
  below.
- **The ladder deepens the night one dial per verse**, never two at once, so each
  verse teaches exactly one new thing: it closes, then the burn rises, then it
  closes two, then the verses lengthen.
- **The woodpile is flat**: one to three logs, every trip, at every depth. One
  rule, one gamble, nothing to track.
- **Turtling is left alone** (user's call). A player who hides and never dances
  scores nothing, which is its own punishment — and the stoke-under-burn
  invariant is what stops hiding from becoming the winning line instead.
- **The score is the body count's cousin**: one point per completed verse, so
  `scoreLabel` reads `rites completed`. Awarded live as the verse turns, never
  from `stop()`.
- **Three dancers are three mistakes**, and the third calls `ctx.run.stop()` so
  the night ends when the dancers do rather than at the bell.

## Load-bearing numbers

| constant | value | meaning |
| --- | --- | --- |
| `FIRE_MAX` / `FIRE_START` | 6 / 4 | the light radius is the fire level |
| `BURN` | 1, then 2 from verse 3 | fire lost every turn, whatever you did |
| `STOKE` | `floor(dancers / 2)` | fire gained by dancing |
| `FEED_GAIN` | 3 | fire per log |
| `WOOD_START` / `WOOD_CAP` | 4 / 8 | logs |
| `GATHER_MIN` / `GATHER_MAX` | 1 / 3 | a trip's yield, flat at every depth |
| `BEAST_FAR` | 5 | rings out, and the treeline |
| `BEAST_TELL` | 1, then 1-2 from verse 4, then 2 from verse 6 | the ladder, shown before you act |
| `FREE_VERSE` | 1 | the verse it cannot close during |
| `DANCERS` | 3 | lives |
| `VERSE_BASE` / `VERSE_MAX` | 3 / 8 | verse one's length, and the ceiling |
| `FLARE_GAIN` | 1 | fire a completed verse gives back |

With the burn at 2 and three dancers, the three net effects are the economy:
**Dance -1 fire, Feed +1 fire, Gather -2 fire.** At verse two only, the stoke
equals the burn and a dance nets nothing, which is deliberate: that is the verse
that teaches that dancing holds the fire.

**The invariant: `STOKE` must stay below `BURN` while dancers remain.** If a
dance ever nets the fire zero or better, a player can reach full blaze and dance
to the bell with the beast frozen at the edge of the light, and the table is
solved. Every rebalance checks that inequality first.

## The ladder

| verse | what changes |
| --- | --- |
| 1 | the free page: it prowls and cannot close (3 steps) |
| 2 | it closes one ring, and the fence is live |
| 3 | the fire burns two a turn, so a dance starts costing fuel |
| 4 | it closes one ring or two, and the tell starts to matter |
| 5 | verses gain a step, then another every other verse to `VERSE_MAX` |
| 6 | it closes two rings every time |

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
- The efficient line is to let it come close, because a close beast needs very
  little light to hold — and the last ring is where that stops being clever.
- Dancing is not free: past verse three it costs a fire level a turn, which is
  exactly the log you are not spending.
- Going out for wood is a whole turn with the fire burning and nothing fed, so it
  is the move that lets it closer.
- The three button nets are live. When the burn rises at verse three, every one
  of them changes, and that is the escalation being felt rather than announced.

## Risks and what to do about them

- **The solved game.** Any change to `BURN`, `STOKE`, `FEED_GAIN` or the ladder
  has to preserve stoke < burn.
- **A take is cheap now** (a dancer, no progress lost). If mistakes read as free,
  the dial is `DANCERS` three to two — not a new punishment bolted onto the take.
- **Every duty given to the dancers is a spiral risk**, since losing one also
  thins the fire. If a death makes the next verse hopeless, floor `STOKE` at one
  while any dancer lives.
- **Ship Graveyard overlap** is the gather trip: fetch, get back, clock running.
  It is kept apart by making the trip a single action and putting the score on the
  rite rather than the haul.
- **Maintenance instead of play.** If dancing gets squeezed out, the dials are
  `FEED_GAIN` three to four or `WOOD_CAP` eight to ten. Target: about half the
  turns should be a Dance.
