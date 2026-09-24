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
| Higher or Lower | Card calling | Call the next card higher or lower. A miss ends the round. | The Slaughtered Ox |
| Pig | Roll and bank | Roll to build a total, but a one wipes it. Bank before you bust. | Viking Tavern |
| Pairs | Memory | Turn up two cards at a time and remember what you saw. | The Hearth Inn |
| Crown & Anchor | Symbol dice | Call a symbol, roll three dice, score every die that matches. | Tavern Celebration |
| Blastfire | Bog crossing | Probe patches of bog to find a way across; numbers count nearby gas pockets. | Blastfire Bog |
| Assassin's Bazaar | Visual deduction | Read the broker's clue, then find the matching hood and carried item in the crowd. A quick read pays double; a miss breaks your streak. | Assassin's Bazaar |
| The Last Watcher | Signal memory | Watch four beacons flash a sequence, then repeat it. | The Last Watcher |
| Escape the Hold | Maze | Navigate safe cargo passages to the open hatch; backtracking is allowed. | Slave Ship Hold |
| Ship Graveyard | Salvage | Load cargo from the wrecks and get it back to the skiff before the storm. | Ship Graveyard |
| Danse de Vampyr | Rhythm | Step on the beat, and hold perfectly still when the measure resolves. | Danse de Vampyr |
| All Hallows' Eve | Judgement | Read the six signs at the door; the dead break exactly one of them. | All Hallows' Eve |

Tables are grouped on the hub by category, defined in `CATEGORIES` in the same file. There are
five so far — **The Tavern**, **The Wilds**, **The Markets**, **The Night Watch**, and **At Sea** —
and adding another is a single entry.

## Layout

```
index.html              the tavern hub: every category, every table
games/play.html         shared game runner; select a table with ?game=<id>
css/tokens.css          design tokens and base styles
css/hub.css             hub chrome
css/game.css            shared in-game chrome and reusable dice/cards
css/games/<id>.css      styles for one game; only that game's page loads it
js/games.config.js      THE registry: themes, accents, rules, sound URLs
js/run.js               the 10:00 clock and score
js/shell.js             the contract every table implements
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

## Notes

- Each table has its own best score, stored under `ttagames.best.<id>`. There is no
  currency and no shared purse — nothing to manage and no way to get stuck.
- The 10:00 clock pauses whenever the tab loses visibility, so switching to the
  Tabletop Audio tab does not burn your run.
- Everything is keyboard-operable. Space or Enter is the primary action; Higher or
  Lower uses the left and right arrows.
