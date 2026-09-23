/* ---------------------------------------------------------------------------
   games.config.js — the registry. This is the file to edit.

  Everything else reads from here: the hub builds its cards from it, the game
  runner looks each table up by id, and the shell takes its accent, rules and
  sound links and hosted audio sources from these entries.

  To add a table: add an entry with its track title and audioUrl, then add
  js/games/<id>.js and css/games/<id>.css. To retheme one: change its track
  or accent here.

   On sound: Tabletop Audio publishes no API, no embed and no per-track URLs, so
   a link can only ever take you to their homepage. That is what track.soundUrl
   does by default, and track.title carries the exact track name to play once
   you are there — the UI shows it so you know what to look for. If a real
   per-track URL ever turns up, paste it into that one field and nothing else
   needs to change.
   --------------------------------------------------------------------------- */

/** Length of a run, in ms. Matches the length of a Tabletop Audio track. */
export const RUN_MS = 10 * 60 * 1000;

/**
 * Where a table's sound lives. Always their homepage, because there is nothing
 * more specific to link to. The track name does the identifying instead.
 */
export const SOUND_HOME = 'https://tabletopaudio.com/';

export const CATEGORIES = [
  {
    id: 'tavern',
    title: 'The Tavern',
    blurb: 'A fire, a table, ten minutes. Sit down and the track starts running.',
  },
  {
    id: 'wilds',
    title: 'The Wilds',
    blurb:
      'Out past the last lamp post, where the ground has opinions. Same ten minutes, worse weather.',
  },
  {
    id: 'markets',
    title: 'The Markets',
    blurb: 'A thousand faces, a whispered description, one mark to find.',
  },
  {
    id: 'watch',
    title: 'The Night Watch',
    blurb: 'Four beacons. One keeper. Keep the signal alive.',
  },
  {
    id: 'at-sea',
    title: 'At Sea',
    blurb: 'Close passages, low light, and a way out somewhere ahead.',
  },
];

export const GAMES = [
  {
    id: 'bones',
    title: 'Bones',
    tagline: 'Shut the box',
    category: 'tavern',
    accent: '#e0a24a',
    scoreLabel: 'tiles shut',
    rules:
      'Roll two dice, then shut tiles that add up to the roll. Leave yourself no move and the round is over.',
    actionLabel: 'Roll',
    track: {
      title: 'Tavern Music',
      audioUrl: 'https://sounds.tabletopaudio.com/177_Tavern_Music.mp3',
      soundUrl: SOUND_HOME,
    },
  },
  {
    id: 'higher-lower',
    title: 'Higher or Lower',
    tagline: 'Call the card',
    category: 'tavern',
    accent: '#b8443f',
    scoreLabel: 'cards called',
    rules:
      'Call the next card higher or lower. A right call is a point, a wrong one ends the round, a tie costs nothing.',
    // Two actions, so the table draws its own buttons and the shell shows none.
    actionLabel: null,
    track: {
      title: 'The Slaughtered Ox',
      audioUrl: 'https://sounds.tabletopaudio.com/23_The_Slaughtered_Ox.mp3',
      soundUrl: SOUND_HOME,
    },
  },
  {
    id: 'pig',
    title: 'Pig',
    tagline: 'Roll and bank',
    category: 'tavern',
    accent: '#55935f',
    scoreLabel: 'points banked',
    rules:
      'Roll to build a total, but a one wipes the whole round. Bank before your nerve fails you.',
    actionLabel: 'Roll',
    track: {
      title: 'Viking Tavern',
      audioUrl: 'https://sounds.tabletopaudio.com/407_Viking_Tavern.mp3',
      soundUrl: SOUND_HOME,
    },
  },
  {
    id: 'pairs',
    title: 'Pairs',
    tagline: 'Turn up two',
    category: 'tavern',
    accent: '#7092c4',
    scoreLabel: 'pairs found',
    rules:
      'Turn up two cards at a time and remember what you saw. Every matching pair scores, and a cleared board is dealt again.',
    // Clicking cards is the whole game, so no primary button is needed.
    actionLabel: null,
    track: {
      title: 'The Hearth Inn',
      audioUrl: 'https://sounds.tabletopaudio.com/255_The_Hearth_Inn.mp3',
      soundUrl: SOUND_HOME,
    },
  },
  {
    id: 'crown-anchor',
    title: 'Crown & Anchor',
    tagline: 'Call your symbol',
    category: 'tavern',
    accent: '#9a6fc4',
    scoreLabel: 'points',
    rules:
      'Call one of the six symbols, then roll three dice. Every die that lands on your symbol pays, and all three pay properly.',
    // The six symbol buttons are the action.
    actionLabel: null,
    track: {
      title: 'Tavern Celebration',
      audioUrl: 'https://sounds.tabletopaudio.com/342_Tavern_Celebration.mp3',
      soundUrl: SOUND_HOME,
    },
  },
  {
    id: 'blastfire',
    title: 'Blastfire',
    tagline: 'Cross the bog',
    category: 'wilds',
    accent: '#a8b83c',
    scoreLabel: 'patches probed',
    rules:
      'Probe patches of bog to find a way across. A number counts the gas pockets alongside it, and one wrong step ends the round.',
    // Clicking patches is the action; there is no button to press.
    actionLabel: null,
    track: {
      title: 'Blastfire Bog',
      audioUrl: 'https://sounds.tabletopaudio.com/286_Blastfire_Bog.mp3',
      soundUrl: SOUND_HOME,
    },
  },
  {
    id: 'assassins-bazaar',
    title: "Assassin's Bazaar",
    tagline: 'Find the mark',
    category: 'markets',
    accent: '#c47743',
    scoreLabel: 'marks found',
    rules:
      'Read the broker’s description, then pick the matching figure from the crowd. One clean choice, a new mark.',
    // The crowd itself is the control; the shell action bar stays hidden.
    actionLabel: null,
    track: {
      title: "Assassin's Bazaar",
      audioUrl: 'https://sounds.tabletopaudio.com/519_Assassins_Bazaar.mp3',
      soundUrl: SOUND_HOME,
    },
  },
  {
    id: 'last-watcher',
    title: 'The Last Watcher',
    tagline: 'Keep the signal',
    category: 'watch',
    accent: '#80a9a2',
    scoreLabel: 'signals held',
    rules:
      'Watch four beacons flash a signal, then repeat it. Each clear adds a signal; one mistake sends you back to the opening pattern.',
    // The four beacon buttons are the action; no shell button is needed.
    actionLabel: null,
    track: {
      title: 'The Last Watcher',
      audioUrl: 'https://sounds.tabletopaudio.com/521_The_Last_Watcher.mp3',
      soundUrl: SOUND_HOME,
    },
  },
  {
    id: 'escape-hold',
    title: 'Escape the Hold',
    tagline: 'Find the open hatch',
    category: 'at-sea',
    accent: '#bd8c5b',
    scoreLabel: 'spaces explored',
    rules:
      'Find the open hatch. A pursuer starts after your first move and gets 10% faster after each escape.',
    // The adjacent passage tiles are the controls.
    actionLabel: null,
    track: {
      title: 'Slave Ship Hold',
      audioUrl: 'https://sounds.tabletopaudio.com/520_Slave_Ship_Hold.mp3',
      soundUrl: SOUND_HOME,
    },
  },
];

export function gameById(id) {
  return GAMES.find((game) => game.id === id) || null;
}

export function gamesInCategory(categoryId) {
  return GAMES.filter((game) => game.category === categoryId);
}
