# Bug Hunt — read it, then act

A new table for the Tabletop Audio track `427_Bug_Hunt.mp3`
(scifi, horror, transit, planar, tension, epic, sneak, monster, skirmish, boss),
and a new wing to hold it: **The Derelict**.

## The pitch

The station is dead and something is aboard. Every turn shows you two facts: the
compartment it means to be standing in when the turn resolves, and whether it is
plated. You answer with one action — fire, seal the door it needs, or move — and
then it moves. Sealing the door it was going to use wastes its whole turn, and
that read is the entire game.

Nothing is hidden, so nothing is unfair, and every sector lost is a decision made
badly. Kills only come from engaging, and engaging is when it can reach you.

## Decisions

- **The telegraph is a destination, not a hint.** Intent is expressed as the
  compartment the creature will occupy at the end of the turn, which makes both
  reads the same read: where it will be, and whether it is plated. A lunge is
  simply a destination of *your* compartment, so one mechanism covers approach,
  lunge and enraged two-step moves.
- **The player acts first, then the creature resolves.** That ordering is what
  makes an action able to invalidate the promise — a seal bought after the
  telegraph still blocks the step, because resolution re-checks the doors it
  walks through.
- **A creature coming for you is never plated** (user's call, refined). Plating is
  rolled only on turns when it is not closing on your compartment, so a lunge turn
  is always a firing window and what happens next is the player's own fault. The
  matriarch is no exception now, and she used to be: plating on the turn she
  arrived made every boss sector a coin toss. It is the one fairness rule the
  telegraph needs.
- **Firing at plating does nothing** (user's call). Armour is armour, the read
  matters, and ammo stays precious — but the button stays enabled on a plated
  target, because being able to waste the round is the punishment for not reading.
- **The gun fires down a line** (revised, 2026-09-24, after being asked how anyone
  was supposed to kill the boss). Adjacent-only fire meant the only way to damage
  anything was to stand inside its reach on a turn it was committed to entering
  you, so every plate but the last was bought with a wound and the fight had no
  decision in it beyond when to pay. Firing along your row or column turns it into
  a positioning puzzle: find a lane, keep an exit behind you, and take the shot
  the lane gives you.
- **The station is 4x4** (user's call, same revision). On a 3x3 a lane from the
  centre is identical to adjacency, so lanes would only exist on the edges;
  sixteen compartments give the creature room to route around your line, which is
  what makes holding a corridor the actual game.
- **You can slip diagonally, it cannot** (user's call, 2026-09-25). With both of
  you moving one compartment a turn, distance was invariant: once it was a room
  behind you it stayed a room behind you, and the only ways out were shooting it or
  barring a door. Diagonals break the chase without giving you extra speed — you
  cross a corner, it walks the two corridors around, and a compartment of daylight
  appears. It also gives the board's edges a cost, since a corner has the fewest
  ways out of anywhere on the grid.
- **Seals went out and came back** (cut, then restored, 2026-09-24). At 3x3 a
  barred door rarely changed the outcome: an open nine-cell grid always offered
  another route, so the read it existed to serve was a one-turn stall and it cost
  a verb, a resource and a mode to say so. Two changes brought it back. Lanes gave
  it a *reason*, because without a seal the only answers to being reached are
  giving up the firing lane or giving up the ground you need — and a 4x4 station
  gave it *teeth*, since routing around a barred door now costs two or three turns
  and puts the creature back in your lane on the way. It is also the other answer to
  being cornered: a slip uses a hatch and gives up your lane, a seal keeps the lane
  and gives up the door.
- **It kills, rather than wounds** (user's call, 2026-09-25). The first design gave
  three wounds, a medkit and a floor state, which made a bad read survivable and
  turned the hunt into an attrition budget; it also asked four systems — a wound
  meter, a down, a restock and an enrage threshold — to express one idea. Now
  contact ends the sector: the kills you have already confirmed are kept and the
  next sector opens with both of you in new compartments. The cost of a mistake is
  the sector and the time, which is the punishment the repo's other tables already
  use, and it needs one flag instead of four systems.
- **The score is the body count** (user's call, 2026-09-25; it replaces the whole
  points economy). Every creature is worth exactly one and nothing else counts —
  not hits, not a clean fight, not a cleared sector, not the matriarch. The history
  is worth keeping: the first meter rose on *clean turns*, which paid a player for
  walking away and made engaging strictly unprofitable; the fix made a multiplier
  rise on landed rounds. Both were ladders between the player and the only thing
  that matters here, which is whether the thing in front of you dies before it
  reaches you. A body count says that once, and cannot be farmed.
- **The last plate is free.** If it is standing on you with one plate left, the
  shot kills it before it can act, so the most legible read in the table is "one
  plate left, let it come". Every other shot wants a lane with an exit behind it.
- **Three plates is the ceiling for a strain.** Plating is a wall you wait out, not
  a bullet sponge: past three, a sector becomes a turn tax rather than a fight.
  The matriarch goes higher only because she is the boss, and only because the
  death rule means a long fight costs time and nothing else.
- **A lost sector ends the fight.** Nothing carries over but the kills already
  confirmed: the creature you were wearing down is gone and the next sector brings
  a fresh one. That is the real price of the death rule, and it is why the plating
  read matters more now than it did — a plated turn spent badly is a turn you never
  get back.
- **A death costs the attempt, not the work** — the one piece of the old scoring
  worth keeping. The repo's "a miss costs momentum, not points" rule, applied to a
  firefight: you keep every kill, and what you lose is the sector and the time it
  takes for another creature to find you.
- **A death ends the sector, and the hunt moves on** (judgement call,
  2026-09-25). The alternative was replaying the same sector with the creature
  still wounded, which reads as a resurrection rather than a death. If the sector
  should replay instead, delete the `sector += 1` in `taken()`.
- **The brood is gone too** (cut, 2026-09-24). Hatchlings charged the mother's
  price — a full wound each — so the phase meant to be a target-priority puzzle
  was where the wound budget actually died, and several creatures on the board
  made "one monster hunting you" untrue. The boss is now a single creature with
  two phases: plated while she is above half her armour, then open and relentless
  — one compartment a turn like everything else, because the creature's speed is
  what the diagonal is measured against.
- **She is called the matriarch**, because a brood mother with no brood is a lie.
- **Ammo carries over and is topped up between sectors** (user's call), with two
  rounds scavenged from a body. There is no restock from a mistake any more; ammo
  is full at the start of every sector and that is the only refill. The cap is 8
  rather than 6, because with no brood to farm, six rounds against six plates was
  a soft-lock waiting to happen.
- **The prowl is gone** (cut, 2026-09-24). It was the only timer in the table and
  the only thing needing a hidden-tab guard, and what it bought — pressure to act
  — is now bought by the score itself, which pays for nothing but bodies rather
  than for turns survived. The table has no internal clock at all.
- **The bell pays nothing.** Kills are scored live, so this table needs no
  pre-bell settlement — the one shape the repo's other tables had to solve.
- **The creatures are drawn, not named** (user's call, 2026-09-25). Each is an
  inline SVG: a shell arc per plate of armour left, six legs — eight on the
  matriarch — antennae, mandibles, and a small caption with the exact number. How
  much armour is left is the read the whole table turns on, so it belongs on the
  creature's back rather than in a number you have to find, and it is drawn from
  the same shapes the hooded figures in Assassin's Bazaar use. It is rotated from
  JavaScript to face the compartment you are standing in.
- **Mouse only** (site-wide rule since 2026-09-25). No table binds a key, so the
  site stays usable on a touch screen. Every control is a button.

## The station

| | | | |
| --- | --- | --- | --- |
| Cab | Mess | Galley | Stores |
| Hold | **Spine** | Berth | Vault |
| Cargo | Conduit | Junction | Engine |
| Cradle | Sumps | Bilge | Nest |

Both of you are placed at random, and never close: the opening compartments are
redrawn until they are at least `MIN_START_GAP` (4) apart, so an approach always
takes a few turns and the board differs from one hunt to the next. Before this,
you always began in the Spine and it always began in the Nest, which made the
first move of every run identical.

Every internal edge is a door, and a seal belongs to the pair of compartments it
joins, so one seal blocks both directions.

## Strains and ramps

| sector | hunter | armour | notes |
| --- | --- | --- | --- |
| 1 | Skitter | 1 | the read, with no plating to worry about |
| 2 | Skitter | 1 | plating unlocked (`PLATE_CHANCE` 0.35) |
| 3 | **Matriarch** | 4 | plated above half her armour, open below it |
| 4-5 | Crawler / Carapace | 2-3 | strains gain plates as the sectors pass |
| 6 | **Matriarch** | 6 | |
| 7-8 | Carapace | 3 | at `ARMOUR_CAP` |
| 9 | **Matriarch** | 6 | her plates stop at `BOSS_ARMOUR_MAX` |

The matriarch's phase is read off remaining armour as a share of her maximum:
above `BOSS_PHASE_SPLIT` (0.5) she is **plated** on turns when she is not closing
on you, and below it every shot lands. She never carries more than six plates,
because a boss sector holds no ammo to find and a fight longer than a belt is a
fight that cannot be finished.

## Timing and numbers

| constant | value | meaning |
| --- | --- | --- |
| `COLS` / `ROWS` | 4 / 4 | sixteen compartments |
| `MIN_START_GAP` | 4 | of a possible six: how far apart a hunt opens |
| `DIRECTIONS` / `SLIPS` | 4 / 8 | it walks the corridors, you walk the hatches too |
| `DEATH_MS` | 1800 | the pause on a lost sector |
| `AMMO_START` / `AMMO_CAP` | 4 / 8 | rounds, full at the start of every sector |
| `AMMO_PER_KILL` | 2 | scavenged from a body |
| `SEALS_PER_SECTOR` / `SEAL_TURNS` | 2 / 2 | your own doors, and they bar you |
| `PLATE_CHANCE` / `PLATE_FROM_SECTOR` | 0.35 / 2 | the telegraph's dice |
| `ARMOUR_CAP` | 3 | the most plates a strain can carry |
| `BOSS_EVERY` / `BOSS_ARMOUR_BASE` / `STEP` / `MAX` | 3 / 4 / 2 / 6 | the matriarch |
| `BOSS_PHASE_SPLIT` | 0.5 | above it she plates, below it she comes |
| `KILL_SCORE` | 1 | one creature, one confirmed kill — the entire score |
| `SECTOR_MS` | 2200 | the pause while a kill is banked |

## Phases

`hunting` -> (killed) `clearing` [pause, next sector] -> `hunting` …, plus
`taken` (contact: sector lost, kills kept, a new creature) and `stopped`. Only
`hunting` accepts an action, which is what `canAct()` guards. Every timeout
re-checks `alive`. The table has no internal timers at all, so nothing needs a
hidden-tab guard.

## Files

- `js/games.config.js` — the `derelict` category and the `bug-hunt` entry.
- `js/games/bug-hunt.js` — the table.
- `css/games/bug-hunt.css` — the readout, the station, sealed doors, the drawing.
- `README.md` — the table row, the category list, and the mouse-only note.

No shared file changes: the table fits the contract with `actionLabel: null`,
drawing its own three actions and reading no clock at all.

## Notes for a first play

- The lane is the whole game: anything crossing your row or column can be hit
  without being in its reach, so where you stand matters more than when you fire.
  A corner gives the longest lane and the fewest exits.
- The diagonal slip is the escape. One step across a corner puts a room between
  you for a whole turn, which is the only way to break off a chase that has got
  inside one room.
- Seals are the defence that keeps the lane: bar the door it means to come
  through and its turn is thrown away. Two a sector, and a new sector restocks
  them.
- Plating is the counter-pressure, and it only rolls on turns when the creature is
  not closing on you — so a long shot can be eaten. If the table feels too easy,
  raise `PLATE_CHANCE` or the armour ramp rather than touching the lane rule.
- Nothing absorbs a bite any more. A wasted round is always available to you; the
  question is whether the shot is worth the turn, and the answer at one plate with
  it standing on you is always yes.
