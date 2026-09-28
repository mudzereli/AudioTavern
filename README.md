# TTAGames

Small tabletop games, one per Tabletop Audio track.

Each table is a **ten-minute run** — exactly as long as the track it is themed after.
The music is the timer.

Each game has an in-page player that streams the original, unmodified ambience from
[Tabletop Audio](https://tabletopaudio.com/). Tracks remain hosted by Tabletop Audio;
the game pages provide attribution and link to the audio's
[CC BY-NC-ND 4.0 license](https://creativecommons.org/licenses/by-nc-nd/4.0/).
SoundPad effects are not used.

## Running it

**Double-click `start.cmd`.** It serves the folder, waits for the server to answer, then
opens the hub in your default browser.

There is no build step, but the site uses ES modules, and browsers fetch modules under
CORS rules that treat `file://` as origin `null`. Opening `index.html` directly will
always fail with a CORS / `ERR_FAILED` error — that is a browser rule, not a fault in
the site. It has to be served over HTTP, which is all `start.cmd` does.

If you would rather run it yourself:

```
python dev_server.py 8000
```

Then open <http://localhost:8000>.

Any static server works (`npx serve`, Live Server, etc.). Deploying is just copying the
folder to any static host — no compilation, no dependencies.

## The tables

| Table | Game | Rule | Theme track |
| --- | --- | --- | --- |
| Bones | Shut the Box | Roll two dice, then shut tiles that add up to the roll. | Tavern Music |
| Higher or Lower | Card calling | Call the next card higher or lower and bank the pot before a miss takes it. | The Slaughtered Ox |
| Pig | Race the house | Roll one die and bank before a one takes the round, racing a house to 100 that always moves first. Only the margin you win a leg by scores as points — the pot itself pays nothing. | Viking Tavern |
| Pairs | Memory | Turn up two cards at a time and remember what you saw. | The Hearth Inn |
| Crown & Anchor | Symbol dice | Call a symbol, roll three dice, score every die that matches. | Tavern Celebration |
| Blastfire | Bog crossing | Probe patches of bog to find a way across; numbers count nearby gas pockets. Every patch opened pays a point and a full crossing pays 100. | Blastfire Bog |
| Assassin's Bazaar | Deduction | Read the broker's whisper — two or three clauses, each of which fits several people — and pick whoever fits all of them, or say "Not here" if it fits nobody. | Assassin's Bazaar |
| The Last Watcher | Signal memory | Watch four beacons flash a sequence, then repeat it. | The Last Watcher |
| Escape the Hold | Maze | Navigate safe cargo passages to the open hatch; backtracking is allowed. | Slave Ship Hold |
| Ship Graveyard | Salvage | Load cargo from the wrecks and get it back to the skiff before the storm. | Ship Graveyard |
| Danse de Vampyr | Rhythm | Step on the beat, and hold perfectly still when the measure resolves. | Danse de Vampyr |
| All Hallows' Eve | Judgement | Read the six signs at the door; the dead break exactly one of them. | All Hallows' Eve |
| Magical Flora | Planar gardening | Build a straight run of distinct kinds to bloom its middle; longer runs are needed as more planes arrive. | Magical Flora |
| Bug Hunt | Telegraph tactics | Hold a line of fire on it and slip the corners it cannot; bar the door it needs. One bite and the sector is over. | Bug Hunt |
| Fire Dance | Pyre management | Keep the light reaching it: dancing turns the rite and stokes the fire, feeding raises the fence, and the wood is out in the dark. | Fire Dance |
| Wizard's Tower | Starlight routing | Rotate runes to connect the tower to the altar; each completed rite brings a longer route. | Wizard's Tower |
| Fishing Village | Catchbook fishing | Cast through shifting day, night, and weather; fill 18 fish slots for first-catch rewards. | Fishing Village |
| The Gift Cart | Crate packing | Villagers bring parcels one at a time; pack the ones that fit, turning a parcel to make it fit. A crate filled to its last square pays the trip twice. | Homecoming |

The hub shows one flat list — a compact row per table — because eighteen tables across nine
wings is too many wings to spend a section heading and a blurb on each. A wing is a **label on
the row** instead of a section, so the whole catalogue fits in about two screens on a phone.
Wings are defined in `CATEGORIES` in the same file. There are nine so far — **The Tavern**,
**The Wilds**, **The Markets**, **The Night Watch**, **At Sea**, **The Grove**, and **The
Derelict** — and adding another is a single entry. Rows stay in `GAMES` registry order, which
keeps each wing's tables together. The Arcane and The Village are the newest wings.

## Layout

```
index.html              the tavern hub: one compact row per table
games/play.html         shared game runner; select a table with ?game=<id>
css/tokens.css          design tokens and base styles
css/hub.css             hub chrome
css/game.css            shared in-game chrome and reusable dice/cards
css/games/<id>.css      styles for one game; only that game's page loads it
js/games.config.js      THE registry: themes, accents, rules, sound URLs
js/run.js               the 10:00 clock and score
js/shell.js             the contract every table implements
js/dom.js               shared helpers: el(), plural(), svgEl(), svgPath()
js/hub.js               hub rendering
js/store.js             localStorage: best scores and preferences
js/rng.js               seeded RNG
js/dice.js              dice rolling, pips, subset search
js/deck.js              52-card deck, shuffle, card rendering
js/games/<id>.js        one file per table
```

## Changing the sound

Every table names a track in `js/games.config.js`, in its `track` field:

```js
track: {
  title: 'Tavern Music',
  audioUrl: 'https://sounds.tabletopaudio.com/177_Tavern_Music.mp3',
  soundUrl: SOUND_HOME,
}
```

The native player streams each track from Tabletop Audio's audio host. Each registry entry
stores its `audioUrl` alongside the track title; `soundUrl` remains a link to the official
site. Keep audio hosted there and unmodified, and retain the visible attribution.

Because the link is generic, the **track name** is what identifies the sound. It appears
on the hub card, in the table header and on the start panel. The "Start run & play track"
button starts the in-page audio and game clock from the same click. Both pause when the
game tab is hidden and resume when it returns.

Run length lines up with theirs by design: a run is ten minutes, which is exactly how long
one of their tracks lasts.

To retheme a table, update `track.title` and `track.audioUrl` to another ambience hosted
by Tabletop Audio. `soundUrl` can remain pointed at their homepage.

## Adding a table

1. Add an entry to `GAMES` in `js/games.config.js`, including the Tabletop Audio
  title, hosted `audioUrl`, and official-site `soundUrl` in its `track` object.
2. Create `js/games/<id>.js` exporting the contract `js/shell.js` expects:
   `mount(ctx)`, `start(ctx)`, `stop(ctx)`, and optionally `act(ctx)`.
3. Create `css/games/<id>.css` for game-specific styles, using game-specific
  class names. The shared runner loads this file automatically.

Nothing else. The hub picks it up from the registry automatically.

## Rules the code does not enforce

There is no build, no linter and no test runner here, so the conventions below
are kept by hand. They are the traps — read them before changing a table or the
shell.

- **Score added from `stop()` never reaches the summary.** The shell captures the
  score in its `onEnd`, then calls `game.stop(ctx)`. Anything awarded after that
  moment is silently lost. End-of-run scoring has to land while
  `ctx.run.remainingMs` is still above zero, which is why Higher or Lower and
  Magical Flora settle on a clock poll a second before the bell.
- **A game must never depend on the sound.** The player can decline the track,
  `ctx` carries no audio handle, and no cue may assume music is playing. Danse de
  Vampyr drives its own beat from a `performance.now()` clock instead.
- **Read `ctx.rng` live.** It is reassigned at the start of every run, so caching
  it gives you the previous run's generator.
- **Nothing binds a key.** The site is mouse-only on purpose, so it stays usable
  on a touch screen: neither the shell nor any table adds a keydown handler, and a
  new table must not add one either. Give every control a click handler and a
  visible button. Buttons remain focusable and activatable by the browser itself —
  that is the browser's affordance, not a shortcut we wrote.
- **A table has to fit a phone.** Touch is the second target of every layout
  decision, not a fallback, so a table is not finished until it has been played on
  one. Boards are `width: min(<px>, 100%)`, cells keep an `aspect-ratio` rather
  than a height in rem, and text-bearing grid children take `min-width: 0` so one
  long word cannot push a board past the viewport. Nothing may need a hover to
  read — the `:hover` rules here are decoration — and a table may add a
  `@media (max-width: 440px)` step for the smallest screens. Nothing scrolls
  sideways.
- **The hub is a menu, not a manual.** A hub row carries the wing label, the
  title, one combined tagline-and-track line, and the score column. It does not
  carry the rules: `config.rules` is read on the play page's start panel, and a
  paragraph on every one of eighteen rows is what made the hub a long
  unnavigable scroll. Rows are one per row on a phone, then two and three
  columns at 620px and 960px — the column steps are explicit, not `auto-fill`,
  so a phone is always a single column.
- **Cues may not move.** `css/tokens.css` neutralises CSS animation and
  transition under `prefers-reduced-motion`, so a beat, pulse or flash has to be
  driven in JavaScript and needs a static fallback that still reads.
- **`.stage` centres with `align-items`, never `place-items`.** A centred grid
  item is sized to its max-content width, so percentage widths inside a table
  resolve against a shrink-to-fit box and a board can collapse to nothing. See
  the comment in `css/game.css`.
- **One table, one module, one stylesheet.** A table builds only inside
  `ctx.stage`, and no two tables import each other. That independence is what
  keeps a broken table to a single page.

## Notes

- Each table has its own best score, stored under `ttagames.best.<id>`. There is no
  currency and no shared purse — nothing to manage and no way to get stuck.
- The 10:00 clock pauses whenever the tab loses visibility, so switching to the
  Tabletop Audio tab does not burn your run.
- Everything is played with a mouse or a finger. No table binds a shortcut key:
  every control is a button, so the whole site works on a touch screen. Buttons
  stay focusable, so Tab and Space still work for anyone who wants them — that is
  the browser, not a shortcut we wrote.
- Every table is played on a phone as part of finishing it. The boards, the
  readouts and the controls are sized from the phone outwards, and the whole set was
  checked on one on 2026-09-25.
