# Moonshine — track 323, Distilled: Backwoods

A ten-minute upgrade economy in **The Wilds**. One static board: a still, a shed, three
rate readouts, and four rows you can buy. **The score is what the still makes** — one point a
bottle, counted as it leaves the kettle, sold or not — and money is only the budget the shop
is bought with, which is what makes the night a race between the still and the till.

Files: `js/games/moonshine.js`, `css/games/moonshine.css`, the `GAMES` entry in
`js/games.config.js`.

---

## The loop

```
still makes bottles (score) → the shed holds them → customers take them → cash (budget)
```

- **The score is bottles made, credited in `tick()`.** One `ctx.addPoints(1)` per bottle,
  batched into a single call a tick, because every `addPoints` is a `localStorage` write in
  the shell. Sales and purchases never touch the score, and nothing is awarded at `stop()`, so
  nothing can be lost to the end-of-run capture (see README, "Rules the code does not
  enforce"). **Money lives in `this.cash`** — the shell's score is bottles now, so it can never
  be read as a purse.
- **The opening is the hand.** Base still: one bottle every 5s at `$2` a bottle, one neighbour
  taking the odd one (`sell` 0.1), and the hand capped at one bottle per `SELL_COOLDOWN_MS`
  (2.5s, so 0.4 b/s). Every bottle the still makes can be walked out, so the first two minutes
  are clicking, and the money ladder is the still and the mash — **Customers does nothing at
  all until production passes the hand**.
- **The hand never goes away, it just stops mattering.** It stays a real channel all night and
  is the only thing that clears a shed the customers cannot keep up with. A dirty click answers
  with *Still walking the last one out* rather than hitting a dead button.

## The four chains

Each chain is bought **in order** and the chains are independent, so the board shows one
buyable step per chain at all times — four rows, no tree, no scrolling menu. Each chain owns
exactly one lever: **rate, capacity, sale rate, price**. A step's `value` is what the chain is
worth once bought, not an increment.

| Chain | Lever | Base | Steps (cost → effect) |
| --- | --- | --- | --- |
| The Still | bottles made a second | 0.2 b/s | Better Fire 10 → 0.25 · Copper Coil 25 → 1/3 · Large Still 60 → 0.5 · Double Still 150 → 1 · Industrial Still 400 → 2 |
| Customers | bottles out a second | 0.1 b/s | Regular Customers 20 → 0.25 · Bar Connection 50 → 0.6 · Delivery Wagon 120 → 1 · Delivery Truck 350 → 1.4 |
| The Mash | $ a bottle | $2 | Better Mash 30 → 4 · Quality Ingredients 100 → 8 · Secret Recipe 300 → 16 · Premium Moonshine 750 → 30 · Black Label 1500 → 50 |
| The Shed | bottles that can wait | 5 | Extra Crate 15 → 10 · Storage Shed 50 → 25 · Barn 175 → 75 · Warehouse 500 → 200 |

**The Work chain is deleted** — it was the still's own lever sold twice, and its first step
was beaten outright by a cheaper one. **The Mash ladder is doubled with its base**: the money
curve is the pace of the night, and at `$2` a bottle and up the whole shop is affordable
inside ten minutes. Halving the ladder halves the pace. **The Customers ladder tops at
1.4 b/s** to hold the invariant below — never let it reach the still's 2 b/s, or the shelf
stops filling and the shed chain dies.

## What a row says

Every row prints **what the step does**, in that chain's own unit, and nothing else:

> `0.2 → 0.25 a second`
> `$2 → $4 a bottle`
> `5 → 10 bottles`

**Only the change.** Whether a step is worth its price before the bell is the question the
player came to answer, so the board never does the sum for them — no payback times, no
projected bottles, no break-even. Every rate on the board is one number in one unit (`0.25`,
not `0.25 a second`, under a readout that already says *Bottles a second*), so the panel and
the shop print the same kind of number and `compact()` trims it.

**No model on the board at all.** There was a projection in here once: `bottlesOver()` and
`moneyOver()` counted the rest of the night from the current shed, and a row printed what the
step was worth — or named the chain that was supposedly holding it back when it was worth
nothing. It is gone, for three reasons. It answered the player's own question for them. It was
never quite right: with a full shed, a still row said *the buyers set the pace*, which is
backwards, because the shelf was the limit. And it put a second thing on a row that already
says what it does. Everything needed to work it out is on the board — bottles a second, buyers
a second, dollars a bottle, bottles waiting, and the clock.

What survives from that model is the shape of the night, which is why the chains are priced
where they are:

- **Capacity is score.** `made = capacity + (sell + hand) × seconds`: whatever the shelf can
  hold is bottles banked, and past that production is capped at what actually leaves. That is
  the whole reason the shed is worth buying, and the reason the score is bottles made rather
  than bottles sold.
- **A stalled still is a bottle a second lost.** With the shed full the kettle holds one
  bottle's worth and waits, so the bar and the *Shed full* line are the only warning needed.
- **Every chain has a real purpose.** Without the still nothing is made, without the mash a
  bottle is worth `$2`, without the buyers the hand caps out at 0.4 b/s, and without the shed
  every stall is thrown away.
- **The hand is a fixed 0.4 b/s**, part of the shape above rather than an upgrade of its own —
  which is why a customers step is cheap and near-useless early, and why nothing on the board
  has to say so.

## The clock, and what happens at the bell

- `TICK_MS` 200 settles production and sales, on a `dt` measured from `performance.now()`
  rather than counted in ticks: a background tab throttles the interval to about a second, and
  the still makes exactly what it would have made in the foreground. The night is wall-clock
  either way, so hiding the tab neither pauses the run nor hands out free bottles — the shed
  caps what walking away can bank.
- The kettle stalls with one bottle's worth pending when the shed is full (`brewAcc = 1`),
  so the first bottle after a sale drops in immediately.
- An empty shed drops the buyers' back-order (`sellAcc = 0`) — nobody waits at an empty
  shed.
- **Bottles are scored in one `addPoints` call per tick**, not one per bottle: the shell's
  `addPoints` forces a `localStorage` write, and at the top of the board that would be five
  writes a second. Money (`this.cash`) is credited per tick the same way, and never scored.
- The last bottle is up to `TICK_MS` early, which at the very top rate is at most one bottle
  of a few hundred — invisible, and the alternative is an end-of-run settle that the shell's
  capture order cannot support.
- The final minute needs no work of its own: the shell already turns the clock red at
  `LOW_TIME_MS` 60s.

## Boundaries (do not change these without asking)

- **Nothing unlocks anything else.** Sequential within a chain, independent across chains.
- **The score is bottles made.** Do not move it to bottles sold or to cash: sold caps at
  `sell × T` and makes the shed dead weight, and cash makes every purchase look like losing.
- **Never let `sale top + hand ceiling` reach the still's top rate.** The Customers ladder
  stops at 1.4 b/s against a still top of 2 for exactly this reason — the other way round the
  shelf never fills again and the shed chain is unsellable.
- **The hand-sale stays, as a bonus rather than a channel.** It is what clears a shed the
  buyers are not keeping up with, and it is worth real money — but no upgrade is ever
  justified by it, and no row ever says one is. A run with no clicking at all still works
  from the first second.
- **The rows state the change and nothing else.** No projections, no payback times, no pace
  lines, no verdicts on an upgrade. `hand-sold only` was the wrong string because it blamed the
  upgrade for a hole in the economy; the hole was closed instead, with the base customer rate —
  and the pace lines went the same way as the projection that fed them.
- One module, one stylesheet, under the 500-line budget; the five chains are data, so a new
  upgrade is one array entry and no code.
- The board is `width: min(440px, 100%)`, the rows are real buttons (tap targets the whole
  width of the row), nothing binds a key, and the still is drawn with `svgEl`/`svgPath`.

## Left open

- **The opening is a 100–200 second climb to the first purchase** ($20 of customers at $0.10
  a second, sooner with hand-selling on top). If that reads slow, the dials are the Still's
  `base` 0.2 and the Customers `base` 0.1 — every listed cost keeps working.
- **The plan's end-of-run breakdown cannot live on the summary panel** — the shell's
  `showSummary` takes no content from a table. Sales, spend and bottles-out are on a live
  ledger line at the foot of the board instead, and the final cash is the HUD score and the
  summary's own title.
- **Resume gives back cash but not upgrades** (the shell restores score and time; every
  table starts a fresh round). Here that reads as "money in hand, plain still", which is
  coherent — but it does mean a resumed run can post a better best than the same run played
  through. Pre-existing shell behaviour, not a Moonshine choice.
- **The shed is the one chain with no payback number.** The plan listed storage as a
  strategic purchase, and it is — a full shed stalls the kettle, and a big shed is a wallet
  to hand-sell out of — but it cannot be expressed as `$/sec` without assuming a click rate.
  So it shows headroom and the stall warning instead. If the user wants a dollar figure on
  it, the honest route is to state the assumed hand-sale rate on the board.
