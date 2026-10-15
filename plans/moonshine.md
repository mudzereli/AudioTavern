# Moonshine — track 323, Distilled: Backwoods

A ten-minute upgrade economy in **The Wilds**. One static board: a still, a shed, four
rate readouts, and the upgrade rows available that night. At the start of each run, seeded
random draws select one production route, one selling route, and one bottle-value route.
Unselected route chains are hidden; Shed is always available. **The score is what the still makes** — one point a
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
- **The opening is the hand.** Current code starts at one bottle per 5s cycle, `$1` a bottle,
  and one hand sale every 4s. Customer visits begin every 10s, but their order size starts at
  zero. The first purchase varies: Better Fire costs `$2` on the Still route and Double Batch
  `$4` on the Batch Size route. Ten bottles take about 50s to produce at the base rate.
- **Routes change the plan, not just the numbers.** Still accelerates smaller cycles; Batch
  Size makes larger batches. The hand-sale route combines faster cooldowns from Runners with
  larger loads from Hand Load; Customers plus Order Size automate sales. Mash raises bottle value outright;
  Casks multiplies it only while the shed is over 75% full. Shed is always available.

## The nine chains

Each available chain is bought **in order**. `newNight()` uses the live seeded RNG to choose
one of `still`/`batch-size`, one selling route (`runners` plus `hand-load`, or `buyers` plus
`order-size`), and one of `mash`/`casks`. Shed is always available. Unselected route rows are
hidden for the whole run, giving 8 route combinations. The first customer order unlocks
automated sales, and Customers cannot be upgraded before that unlock. A step's `value` is
what the chain is worth once bought, not an increment.

| Chain | Lever | Base | Steps (cost → effect) |
| --- | --- | --- | --- |
| The Still | seconds per production cycle | 5s | Better Fire 2 → 4 · Copper Coil 5 → 3 · Large Still 12 → 2 · Double Still 30 → 1 |
| Batch Size | bottles per batch | 1 | Double Batch 4 → 2 · Three-Bottle Batch 15 → 3 · Four-Bottle Batch 40 → 4 · Five-Bottle Batch 100 → 5 |
| Customers | seconds per customer order | 10s | Regular Customers 4 → 8 · Bar Connection 10 → 6 · Delivery Wagon 24 → 5 · Delivery Truck 70 → 4 |
| Order Size | bottles per customer order | 0 | First Customer Order 3 → 1 · Two-Bottle Order 20 → 2 · Three-Bottle Order 40 → 3 · Four-Bottle Order 70 → 4 |
| The Mash | $ a bottle | $1 | Better Mash 27 → 2 · Quality Ingredients 90 → 4 · Secret Recipe 270 → 8 · Premium Moonshine 675 → 15 · Black Label 1350 → 25 |
| The Shed | bottles that can wait | 10 | Extra Crate 3 → 20 · Storage Shed 10 → 50 · Barn 35 → 150 · Warehouse 100 → 400 |
| Runners | seconds per hand sale | 4s | Quick Step 3 → 3 · Night Route 9 → 2 · Handcart 25 → 1 |
| Hand Load | bottles per hand press | 1 | Double Hand Load 4 → 2 · Three-Bottle Hand Load 15 → 3 · Four-Bottle Hand Load 40 → 4 · Five-Bottle Hand Load 100 → 5 |
| Aging Casks | multiplier when shed is over 75% full | 1× | Charred Oak 2 → 2× · Cool Cellar 6 → 3× · Deep Cellar 18 → 4× · Hidden Stock 50 → 5× · Master Cooper 120 → 6× |

The prices target broad progression over ten minutes: production, sales and storage steps are
about one fifth of their former costs. Mash stays near its previous prices because it boosts
every sale; Casks is much cheaper because its bonus only applies above the shed-fill threshold.
A simulated active run bought 16–19 of the 20–21 available steps across the eight route sets,
leaving at least one top-end step for another night.

**The Work chain is deleted** — it was the still's own lever sold twice, and its first step
was beaten outright by a cheaper one. Upgrade values are generated from the current bases and
rounded to whole units; only strict improvements become purchasable steps. Consequently, the
Still has four active steps (the configured `$400` Industrial Still is not generated after the
cycle reaches 1s), and Runners has three (4s to 3s to 2s to 1s; the fourth configured step
does not improve the rounded interval).

At the ceiling, either production build makes 1 bottle/s: a one-bottle cycle every second, or
five bottles every five seconds. Customers can sell four bottles every 4s (1/s). On the hand
route, Runners reduce the cooldown to 1s and Hand Load raises each press to five bottles, so
active clicking can sell up to 5/s. The hand-sale action remains available on every route, but
only the selected route's upgrades are shown. The shed remains a meaningful buffer.

## What a row says

Every row prints **what the step does**, in that chain's own unit, and nothing else:

> `5 → 4 seconds per cycle · 1 every 4s`
> `1 → 2 bottles per batch · 2 every 5s`
> `0 → 1 bottle per order · every 10s`
> `$1 → $2 a bottle`
> `10 → 20 bottles`
> `1 → 2 bottles per press · 2 every 2s`

**The local change plus its route context.** The board shows combined batch/cycle,
order/visit, and hand-load/cooldown quantities, plus the Casks trigger count as Shed capacity
changes. Mash and Casks are alternative price routes, not a combined bonus. No hidden combo
bonuses, payback times, projected bottles, or break-even calculations are added.

**No model on the board at all.** There was a projection in here once: `bottlesOver()` and
`moneyOver()` counted the rest of the night from the current shed, and a row printed what the
step was worth — or named the chain that was supposedly holding it back when it was worth
nothing. It is gone, for three reasons. It answered the player's own question for them. It was
never quite right: with a full shed, a still row said *the buyers set the pace*, which is
backwards, because the shelf was the limit. And it put a second thing on a row that already
says what it does. The board shows cycle interval, customer interval, bottle value, hand-sale
interval, shed occupancy, and each next upgrade's local effect; it does not forecast whole-run
production, cash, or payback.

What survives from that model is the shape of the night, which is why the chains are priced
where they are:

- **Capacity protects production, not stored score.** Bottles score when produced. The shed
  limits how many can wait to be sold; once full, the still stalls and future scoring stops.
  Customer sales move up to Order Size bottles per order; hand sales move up to the selected
  Hand Load size per press.
- **A stalled still loses future production.** With the shed full, one completed cycle waits
  (`brewAcc = 1`) until a sale opens room; then the next batch can start immediately.
- **Before the first customer order, only hand sales earn cash.** Customer frequency upgrades
  are disabled until the first order unlocks the automated-selling route. At base Mash value,
  each sold bottle earns `$1`.
- **The sale routes work differently.** Runners improve hand-sale interval from 2s to 1s;
  Hand Load increases bottles per press while retaining the 2s cooldown. Customer Order Size
  affects automated sales only. At Order Size 4, a customer visit can sell four bottles.
- **Aging Casks currently reward a full shed, not elapsed age.** A sale earns the multiplied
  value only when the shed is over 75% full at that moment. Stock is FIFO but has no age
  timestamp; the 30-second maturation described in an earlier design is not implemented.

## The clock, and what happens at the bell

- `TICK_MS` 200 settles production and sales, on a `dt` measured from `performance.now()`
  rather than counted in ticks: a background tab throttles the interval to about a second, and
  the still makes exactly what it would have made in the foreground. The night is wall-clock
  either way, so hiding the tab neither pauses the run nor hands out free bottles — the shed
  caps what walking away can bank.
- The kettle stalls with one completed production cycle pending when the shed is full
  (`brewAcc = 1`), so the next batch starts immediately after room opens. A batch is capped to the room left,
  never overfilling the shed.
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

- **Routes are set for the whole run.** One production chain, one of the two selling routes,
  and one price chain are drawn at start. Alternative rows are hidden. Shed remains available
  on every route; the first customer order unlocks automation on the customer route.
- **The score is bottles made.** Do not move it to bottles sold or to cash: sold caps at
  `sell × T` and makes the shed dead weight, and cash makes every purchase look like losing.
- **Throughput depends on the route.** Either production build reaches 1 bottle/s. Customer
  orders reach 1 bottle/s without input; the combined hand route can reach 5/s with clicks
  and stock, so the shed and hand action become important.
- **Session variation is randomized, not purchased.** There are 2 production × 2 selling × 2
  price combinations. Mash and Casks are mutually exclusive; Casks can combine with the
  always-available Shed. All route draws use the seeded run RNG.
- **Rows expose local effects, not forecasts.** They show combined production, customer and
  hand-sale throughput plus the Casks trigger as shed capacity changes. No projections,
  payback times, or extra combo bonuses are added.
- The nine upgrade chains are data-driven, so a new step remains one array entry rather than
  custom purchase logic.
- The board is `width: min(440px, 100%)`, the rows are real buttons (tap targets the whole
  width of the row), nothing binds a key, and the still is drawn with `svgEl`/`svgPath`.

## Left open

- **The first purchase depends on the drawn route.** Better Fire costs `$2` on the Still
  route; Double Batch costs `$4` on the Batch Size route. Ten base-value bottles take about
  50s to produce, while hand sales require active clicks. On the customer route, the first
  order costs `$3` and unlocks automation. Whether this opening is too repetitive needs a
  playtest; changing the starting rate or earliest price also changes every purchase path.
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
