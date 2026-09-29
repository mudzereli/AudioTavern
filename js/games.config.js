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
    blurb: 'Night work. Keep the signal, hold the measure, judge the knock.',
  },
  {
    id: 'at-sea',
    title: 'At Sea',
    blurb: 'Close passages, low light, and a way out somewhere ahead.',
  },
  {
    id: 'grove',
    title: 'The Grove',
    blurb:
      'The far beds of the garden, where the soil runs thin between worlds. Nothing here is in a hurry, and nothing here bites.',
  },
  {
    id: 'derelict',
    title: 'The Derelict',
    blurb:
      'A stopped station, a dead crew, and something aboard that can hear you. One bite and the hunt is over, and there is no help coming.',
  },
  {
    id: 'arcane',
    title: 'The Arcane',
    blurb: 'A welcoming tower, bright rituals, and runes waiting to be turned.',
  },
  {
    id: 'village',
    title: 'The Village',
    blurb: 'A quiet shoreline, a familiar face, and time enough for one more trip.',
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
    scoreLabel: 'banked',
    rules:
      'Call the next card higher or lower. Every correct call grows the pot by your streak squared, but the pot is only yours once you bank it — and a wrong call takes everything on the table. A tie costs nothing, and the house settles any pot still on the table when the clock runs out.',
    // Three actions — lower, higher, bank — so the table draws its own buttons.
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
    tagline: 'Beat the house',
    category: 'tavern',
    accent: '#55935f',
    scoreLabel: 'points',
    rules:
      'Roll one die to build a round; a one takes the lot, so banking is the only way to keep it. A house races you from 0 to 100 and always moves first, taking a random step of 3 to 9 at the top of every round. Reach 100 before it does and you score whatever it still had left to travel — the pot itself is worth nothing, it only carries you there. Lose the leg and nothing is taken from you — you have simply spent the minutes.',
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
      'Roll five symbol dice, then choose one of the symbols that landed to collect its pot. You may reroll one die before collecting, but the dice are final afterward. Unclaimed pots grow each round; five matching dice earn a full-table bonus.',
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
    scoreLabel: 'points',
    rules:
      'Probe patches of bog to find a way across. A number counts the gas pockets alongside it, and one wrong step ends the round. Every patch opened pays a point, and crossing the whole bog pays 100 more — so the crossing is the prize, and how far you got still counts for something.',
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
    scoreLabel: 'marks read',
    rules:
      'The broker never gives you a name. Each whisper is two or three clauses, and every clause on its own fits several people — so work out who fits all of them, or say "Not here" if the description fits nobody at all. One point a job; a wrong answer costs you only that job.',
    // The crowd is the pick and the shell's one button is "Not here".
    actionLabel: 'Not here',
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
      'Watch four beacons flash a signal, then repeat it. Every clear adds a signal and quickens the relay, so the climb gets shorter and sharper as it goes. A missed beacon drops you halfway back, and a held watch pays its own length in points.',
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
    scoreLabel: 'points',
    rules:
      'Find the open hatch. Escapes pay more the longer you last: 1 point for the first, then 2, then 3, and so on. Being caught starts the count again, and the pursuer gets 10% faster after every escape.',
    // The adjacent passage tiles are the controls.
    actionLabel: null,
    track: {
      title: 'Slave Ship Hold',
      audioUrl: 'https://sounds.tabletopaudio.com/520_Slave_Ship_Hold.mp3',
      soundUrl: SOUND_HOME,
    },
  },
  {
    id: 'ship-graveyard',
    title: 'Ship Graveyard',
    tagline: 'Salvage and escape',
    category: 'at-sea',
    accent: '#71b9b2',
    scoreLabel: 'salvage extracted',
    rules:
      'Each expedition starts from a different skiff on a shifting sea chart, and the storm bears a different total of strain every time. Strong salvage signals mean bigger caches. At each wreck, choose a quick haul of up to 2 cargo for 1 base strain, or strip the whole wreck for 3 base strain. Cargo adds strain to every action. Deliver to the skiff before the storm breaks; only delivered salvage scores.',
    // The chart, Search, and Return controls are the actions; no shell button is needed.
    actionLabel: null,
    track: {
      title: 'Ship Graveyard',
      audioUrl: 'https://sounds.tabletopaudio.com/523_Ship_Graveyard.mp3',
      soundUrl: SOUND_HOME,
    },
  },
  {
    id: 'danse-de-vampyr',
    title: 'Danse de Vampyr',
    tagline: 'Dance, then freeze',
    category: 'watch',
    accent: '#a83b47',
    scoreLabel: 'grace earned',
    rules:
      'Step in time while the orchestra plays: every step on the beat is worth your multiplier in grace, and a beat you miss \u2014 clumsy or never taken \u2014 earns nothing. When the measure resolves the hall holds perfectly still, and a single step then is noticed by the host. Survive the hold to bank the danse\u2019s grace, and hit two beats in three to raise your multiplier by one; being caught costs one level. The orchestra quickens as your multiplier rises, and eases when it falls. When the music stops, so will your heart.',
    actionLabel: 'Step',
    track: {
      title: 'Danse de Vampyr',
      audioUrl: 'https://sounds.tabletopaudio.com/508_Danse_de_Vampyr.mp3',
      soundUrl: SOUND_HOME,
    },
  },
  {
    id: 'all-hallows-eve',
    title: "All Hallows' Eve",
    tagline: 'Judge the knock',
    category: 'watch',
    accent: '#c9bda3',
    scoreLabel: 'souls judged',
    rules:
      'Someone is at the door. Read the six signs through the glass — shadow, breath, knocks, hounds, lantern, gate. The living break none of them; the dead break exactly one. Offer the living a soul cake, bar the door on the dead, and judge before the knocking stops. A wrong judgement, or none at all, ends the night — what you have earned is kept.',
    // The two judgements are the actions; the shell bar stays hidden.
    actionLabel: null,
    track: {
      title: "All Hallows' Eve",
      audioUrl: 'https://sounds.tabletopaudio.com/230_All_Hallows_Eve.mp3',
      soundUrl: SOUND_HOME,
    },
  },
  {
    id: 'magical-flora',
    title: 'Magical Flora',
    tagline: 'Grow across planes',
    category: 'grove',
    accent: '#7cc36a',
    scoreLabel: 'flora grown',
    rules:
      'Plant beside the grove. Same-plane neighbours score 1; other planes score 3. Border plots add 2. Complete a straight horizontal or vertical run of distinct kinds to bloom its center: 3 kinds at first, then 4 and 5 as planes arrive. A planting can finish a line through older plants. Mistflower is wild; blooms keep their plane. Spend or compost your hand to harvest. The bell harvests an unfinished season.',
    // The seed rail and the grove are the controls; the shell bar stays hidden.
    actionLabel: null,
    track: {
      title: 'Magical Flora',
      audioUrl: 'https://sounds.tabletopaudio.com/423_Magical_Flora.mp3',
      soundUrl: SOUND_HOME,
    },
  },
  {
    id: 'bug-hunt',
    title: 'Bug Hunt',
    tagline: 'Hunt it back',
    category: 'derelict',
    accent: '#6b93a8',
    scoreLabel: 'confirmed kills',
    rules:
      'Fire along your row or column; move through doors or diagonally through hatches. The creature uses doors only. Seals bar doors for two turns. Plating wastes shots, but a plate-breaking shot kills before it attacks. A bite costs the sector, not your confirmed kills. Every third sector brings a matriarch. Only kills score.',
    // Fire, seal and hold are the controls; the shell bar stays hidden.
    actionLabel: null,
    track: {
      title: 'Bug Hunt',
      audioUrl: 'https://sounds.tabletopaudio.com/427_Bug_Hunt.mp3',
      soundUrl: SOUND_HOME,
    },
  },
  {
    id: 'fire-dance',
    title: 'Fire Dance',
    tagline: 'Hold the light',
    category: 'wilds',
    accent: '#d9603c',
    scoreLabel: 'rites completed',
    rules:
      'One bonfire in a clearing at night, and something pacing outside its light. The fire level is how far the light reaches, and the beast takes ground only while it stands in the dark — so keeping the light on it is what holds it, and the closer you let it come, the less light that takes. Nothing drains the fire on its own, but every action but the log is paid for out of it: a step of the rite burns a level of light or two, the walk to the woodpile burns one, and a log gives back three to six — both rolled each turn and shown before you choose. The beast takes ground whenever the light no longer reaches it. Feed a log back in, walk out to the woodpile for more of them, or spend the light on the rite. Verses deepen the night one dial at a time, and the tell on the board says how far it means to come. Three dancers are three mistakes; lose them all and the dance simply starts again from the first verse, with everything you have scored kept.',
    // Dance, feed and gather are the controls; the shell bar stays hidden.
    actionLabel: null,
    track: {
      title: 'Fire Dance',
      audioUrl: 'https://sounds.tabletopaudio.com/430_Fire_Dance.mp3',
      soundUrl: SOUND_HOME,
    },
  },
  {
    id: 'wizards-tower',
    title: "Wizard's Tower",
    tagline: 'Route the starlight',
    category: 'arcane',
    accent: '#4db99c',
    scoreLabel: 'circuits',
    rules: 'Rotate rune tiles to carry starlight from the tower to the altar. Complete circuits to score; routes grow longer as you progress.',
    // Rotate runes to route the light; the shell bar stays hidden.
    actionLabel: null,
    track: {
      title: "Wizard's Tower",
      audioUrl: 'https://sounds.tabletopaudio.com/174_Wizards_Tower.mp3',
      soundUrl: SOUND_HOME,
    },
  },
  {
    id: 'fishing-village',
    title: 'Fishing Village',
    tagline: 'Cast along the shore',
    category: 'village',
    accent: '#438f88',
    scoreLabel: 'points',
    rules: 'Each collection set randomly makes four of six fish available at each spot. Collect all 12 for 30 bonus points and a fresh set. A blocked-fish roll is an empty bite. First catches pay ten times their value across the run; repeats pay normal value.',
    // The spots are the controls; the shell bar stays hidden.
    actionLabel: null,
    track: {
      title: 'Fishing Village',
      audioUrl: 'https://sounds.tabletopaudio.com/167_Fishing_Village.mp3',
      soundUrl: SOUND_HOME,
    },
  },
  {
    id: 'gift-cart',
    title: 'The Gift Cart',
    tagline: 'Pack the crate for the road home',
    category: 'village',
    accent: '#c2708a',
    scoreLabel: 'points',
    rules:
      'Villagers bring gifts to the cart one at a time. Each parcel takes one to four squares of the crate, and a bigger parcel pays more — but the line is always longer than the crate, so choose what goes and click a parcel again to turn it until it fits. Set off whenever you like, and a crate filled to its very last square pays the whole trip a second time.',
    actionLabel: 'Set off',
    track: {
      title: 'Homecoming',
      audioUrl: 'https://sounds.tabletopaudio.com/397_Homecoming.mp3',
      soundUrl: SOUND_HOME,
    },
  },
  {
    id: 'moonshine',
    title: 'Moonshine',
    tagline: "Spend the night's takings",
    category: 'wilds',
    accent: '#b8863b',
    scoreLabel: 'bottles',
    rules:
      'Four chains of upgrades, one lever each: the still, the buyers, the mash and the shed. A bottle scores the moment it comes off the kettle, sold or not, and the money to buy with comes from selling them — by hand, one bottle at a time, or through the customers you pay for. A full shed stalls the still.',
    actionLabel: 'Sell a bottle',
    track: {
      title: 'Distilled: Backwoods',
      audioUrl: 'https://sounds.tabletopaudio.com/323_Distilled_Backwoods.mp3',
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
