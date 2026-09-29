/* ---------------------------------------------------------------------------
   Ship Graveyard - plot a salvage run across a chart of drowned ships.

   Choose sea lanes, search wrecks, and manage rising storm strain before
   returning cargo to the skiff. No two expeditions have the same route costs,
   and the storm bears a different total each time.
   --------------------------------------------------------------------------- */

import { el } from '../dom.js';
const STORM_MIN = 20;
const STORM_MAX = 30;
const BEAT_MS = 1050;
const SVG_NS = 'http://www.w3.org/2000/svg';
const REFITS = [
  { id: 'sounding-glass', name: 'Sounding Glass', effect: 'Shows exact salvage at every wreck.' },
  { id: 'tide-reader', name: 'Tide Reader', effect: 'Shows strain costs on every route.' },
  { id: 'chartwright-cut', name: "Chartwright's Cut", effect: 'Adds a low-risk lane from the skiff.' },
  { id: 'salvage-winch', name: 'Salvage Winch', effect: 'Quick takes 3, but costs 2 base strain.' },
  { id: 'divers-saw', name: "Diver's Saw", effect: 'Stripping a faint wreck costs 2 base strain.' },
  { id: 'deepwater-hooks', name: 'Deepwater Hooks', effect: 'First strong-wreck Strip each trip gains 1 cargo.' },
  { id: 'sealed-hold', name: 'Sealed Hold', effect: 'Cargo strain rises at 7 and 11 cargo, not 5 and 9.' },
  { id: 'storm-jib', name: 'Storm Jib', effect: 'First loaded crossing each trip costs 2 less strain.' },
  { id: 'keel-spurs', name: 'Keel Spurs', effect: 'First empty crossing each trip costs 1 less strain.' },
  { id: 'undertow-charm', name: 'Undertow Charm', effect: 'A capsize threat triggers an automatic cargo dump and -3 strain.' },
];

const LOCATIONS = [
  { id: 'drifter', name: 'Drifter', x: 50, y: 88 },
  { id: 'lantern', name: 'Lantern', x: 18, y: 68 },
  { id: 'chapel', name: 'Chapel', x: 78, y: 69 },
  { id: 'iron-choir', name: 'Iron Choir', x: 12, y: 43 },
  { id: 'bride', name: 'The Bride', x: 46, y: 48 },
  { id: 'bell', name: 'Bell', x: 88, y: 41 },
  { id: 'crown', name: 'Crown', x: 27, y: 21 },
  { id: 'hollow', name: 'Hollow', x: 73, y: 18 },
];

const ROUTE_PAIRS = LOCATIONS.flatMap((_, from) => LOCATIONS
  .slice(from + 1)
  .map((__, offset) => ({ from, to: from + offset + 1 })));

function routeKey(from, to) {
  return `${Math.min(from, to)}:${Math.max(from, to)}`;
}

function distanceBetween(first, second) {
  const dx = LOCATIONS[first].x - LOCATIONS[second].x;
  const dy = LOCATIONS[first].y - LOCATIONS[second].y;
  return Math.hypot(dx, dy);
}

/** Each expedition draws its own storm budget, so a run can be a short squall
    or a long one. The readout and the meter both scale to whatever it drew. */
function stormLimitFor(rng) {
  return STORM_MIN + Math.floor(rng() * (STORM_MAX - STORM_MIN + 1));
}

const game = {
  id: 'ship-graveyard',

  mount(ctx) {
    this.ctx = ctx;
    const wrap = el('section', 'graveyard');
    const status = el('div', 'graveyard__status');
    const cargo = el('div', 'graveyard__metric graveyard__cargo');
    cargo.append(el('span', 'graveyard__label', 'Cargo'));
    this.cargoValue = el('strong', 'graveyard__metric-value', '0');
    cargo.append(this.cargoValue);
    const expedition = el('div', 'graveyard__metric graveyard__expedition');
    expedition.append(el('span', 'graveyard__label', 'Expedition'));
    this.expeditionValue = el('strong', 'graveyard__metric-value', '1');
    expedition.append(this.expeditionValue);
    const hearts = el('div', 'graveyard__metric');
    hearts.append(el('span', 'graveyard__label', 'Hearts'));
    this.heartValue = el('strong', 'graveyard__metric-value', '0');
    hearts.append(this.heartValue);
    const charts = el('div', 'graveyard__metric');
    charts.append(el('span', 'graveyard__label', 'Charts'));
    this.chartValue = el('strong', 'graveyard__metric-value', '0/3');
    charts.append(this.chartValue);
    const storm = el('div', 'graveyard__storm');
    const stormHead = el('div', 'graveyard__storm-head');
    stormHead.append(el('span', 'graveyard__label', 'Storm strain'));
    this.stormValue = el('span', 'graveyard__storm-value', `0 / ${STORM_MIN}\u2013${STORM_MAX}`);
    stormHead.append(this.stormValue);
    this.stormBar = el('div', 'graveyard__meter');
    this.stormBar.setAttribute('role', 'progressbar');
    this.stormBar.setAttribute('aria-label', 'Storm strain');
    this.stormBar.setAttribute('aria-valuemin', '0');
    this.stormBar.setAttribute('aria-valuemax', String(STORM_MAX));
    this.stormFill = el('span', 'graveyard__meter-fill');
    this.stormBar.append(this.stormFill);
    storm.append(stormHead, this.stormBar);
    status.append(expedition, cargo, hearts, charts);
    this.refitPanel = el('details', 'graveyard__refits');
    this.refitSummary = el('summary', 'graveyard__refits-summary');
    this.refitList = el('ul', 'graveyard__refit-list');
    this.refitPanel.append(this.refitSummary, this.refitList);
    this.chart = el('div', 'graveyard__chart');
    this.chart.setAttribute('role', 'group');
    this.chart.setAttribute('aria-label', 'Sea chart of the Ship Graveyard');
    this.routeSvg = document.createElementNS(SVG_NS, 'svg');
    this.routeSvg.classList.add('graveyard__routes');
    this.routeSvg.setAttribute('viewBox', '0 0 100 100');
    this.routeSvg.setAttribute('preserveAspectRatio', 'none');
    this.routeSvg.setAttribute('aria-hidden', 'true');
    this.routeLines = ROUTE_PAIRS.map((pair) => {
      const start = LOCATIONS[pair.from];
      const end = LOCATIONS[pair.to];
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', String(start.x));
      line.setAttribute('y1', String(start.y));
      line.setAttribute('x2', String(end.x));
      line.setAttribute('y2', String(end.y));
      line.classList.add('graveyard__route');
      this.routeSvg.append(line);

      const riskTag = el('span', 'graveyard__route-risk');
      riskTag.style.left = `${(start.x + end.x) / 2}%`;
      riskTag.style.top = `${(start.y + end.y) / 2}%`;
      this.chart.append(riskTag);
      return { line, riskTag, pair };
    });
    this.chart.append(this.routeSvg);
    this.nodeButtons = LOCATIONS.map((location, index) => {
      const button = el('button', 'graveyard__node');
      button.type = 'button';
      button.style.left = `${location.x}%`;
      button.style.top = `${location.y}%`;
      button.setAttribute('aria-label', `${location.name} wreck location`);
      button.addEventListener('click', () => this.travel(index));

      const name = el('span', 'graveyard__node-name', location.name);
      const marker = el('span', 'graveyard__node-marker', index === 0 ? 'SKIFF' : 'WRECK');
      button.append(name, marker);
      this.chart.append(button);
      return button;
    });
    this.actions = el('div', 'graveyard__actions');
    this.quickButton = el('button', 'btn btn--ghost');
    this.quickButton.classList.add('graveyard__quick');
    this.quickButton.type = 'button';
    this.quickButton.disabled = true;
    this.quickButton.append(
      el('span', 'graveyard__action-label', 'Take some'),
      this.quickDetail = el('span', 'graveyard__action-detail'),
    );
    this.quickButton.addEventListener('click', () => this.search('quick'));
    this.stripButton = el('button', 'btn btn--ghost');
    this.stripButton.classList.add('graveyard__strip');
    this.stripButton.type = 'button';
    this.stripButton.disabled = true;
    this.stripButton.append(
      el('span', 'graveyard__action-label', 'Take all'),
      this.stripDetail = el('span', 'graveyard__action-detail'),
    );
    this.stripButton.addEventListener('click', () => this.search('strip'));
    this.returnButton = el('button', 'btn btn--primary', 'Return to skiff');
    this.returnButton.type = 'button';
    this.returnButton.disabled = true;
    this.returnButton.addEventListener('click', () => this.extract());
    this.actions.append(this.quickButton, this.stripButton, this.returnButton);

    this.hint = el('p', 'graveyard__hint', 'Click a route on the chart to travel. At a wreck, take a quick haul or strip the whole thing, then get back to the skiff to bank it.');
    this.returnNotice = el('div', 'graveyard__return-notice');
    this.returnNotice.setAttribute('role', 'status');
    this.returnNotice.setAttribute('aria-live', 'polite');
    this.returnNotice.setAttribute('aria-atomic', 'true');
    this.returnNotice.hidden = true;
    this.returnCard = el('div', 'graveyard__return-card');
    this.returnNoticeLabel = el('span', 'graveyard__return-label', 'Cargo returned');
    this.returnNoticeValue = el('strong', 'graveyard__return-value');
    this.returnNoticeLabel.setAttribute('aria-hidden', 'true');
    this.returnNoticeValue.setAttribute('aria-hidden', 'true');
    this.returnCard.append(this.returnNoticeLabel, this.returnNoticeValue);
    this.returnNotice.append(this.returnCard);
    wrap.append(status, this.refitPanel, storm, this.chart, this.actions, this.hint, this.returnNotice);
    ctx.stage.append(wrap);
  },

  start(ctx) {
    this.alive = true;
    this.totalExtracted = 0;
    this.expeditionNumber = 0;
    this.previousStartLocation = null;
    this.chartFragments = 0;
    this.heartReturns = 0;
    this.refits = new Set();
    this.newExpedition(ctx);
  },

  stop() {
    this.alive = false;
    this.locked = true;
    clearTimeout(this.beat);
    this.returnNotice.hidden = true;
    this.paint();
  },

  newExpedition(ctx) {
    clearTimeout(this.beat);
    this.locked = false;
    this.expeditionNumber += 1;
    this.phase = 'outbound';
    this.stormBar.classList.remove('graveyard__meter--event-delivered', 'graveyard__meter--event-lost');
    this.returnNotice.hidden = true;
    this.returnNotice.classList.remove('graveyard__return-notice--show');
    this.refitUses = new Set();
    const startChoices = LOCATIONS.map((_, index) => index)
      .filter((index) => index !== this.previousStartLocation);
    this.startLocation = startChoices[Math.floor(ctx.rng() * startChoices.length)];
    this.previousStartLocation = this.startLocation;
    this.position = this.startLocation;
    this.cargo = 0;
    this.storm = 0;
    this.stormLimit = stormLimitFor(ctx.rng);
    this.searched = new Set();
    this.fragmentOnboard = false;
    this.heartOnboard = false;
    this.caches = LOCATIONS.map((_, index) => index === this.startLocation
      ? 0
      : (ctx.rng() < 0.3 ? 5 : 2) + Math.floor(ctx.rng() * 3));
    this.targetType = this.chartFragments >= 3 ? 'heart' : 'fragment';
    const targets = LOCATIONS.map((_, index) => index).filter((index) => index !== this.startLocation);
    this.targetLocation = this.targetType ? targets[Math.floor(ctx.rng() * targets.length)] : null;
    if (this.targetType === 'heart') this.caches[this.targetLocation] += 2;
    this.currentLanes = this.createRoutes(ctx.rng);
    this.paint();
    ctx.message(`Expedition ${this.expeditionNumber}: the skiff has shifted position, and the storm will bear ${this.stormLimit} strain. Find salvage and bring it home.`);
  },

  createRoutes(rng) {
    const connected = new Set([this.startLocation]);
    const remaining = new Set(LOCATIONS.map((_, index) => index).filter((index) => index !== this.startLocation));
    const routes = [];
    while (remaining.size) {
      let best = null;
      for (const from of connected) {
        for (const to of remaining) {
          const span = distanceBetween(from, to);
          const score = span + rng() * 26;
          if (!best || score < best.score) best = { from, to, score };
        }
      }
      routes.push({ from: best.from, to: best.to, risk: 1 + Math.floor(rng() * 3) });
      connected.add(best.to);
      remaining.delete(best.to);
    }
    const used = new Set(routes.map((lane) => routeKey(lane.from, lane.to)));
    for (const pair of ROUTE_PAIRS) {
      const key = routeKey(pair.from, pair.to);
      if (used.has(key) || distanceBetween(pair.from, pair.to) > 58 || rng() >= 0.28) continue;
      routes.push({ ...pair, risk: 1 + Math.floor(rng() * 3) });
    }
    if (this.refits.has('chartwright-cut')) {
      const connected = new Set(routes.map((lane) => routeKey(lane.from, lane.to)));
      const target = LOCATIONS.map((_, index) => index)
        .filter((index) => index !== this.startLocation && !connected.has(routeKey(this.startLocation, index)))
        .sort((first, second) => distanceBetween(this.startLocation, first) - distanceBetween(this.startLocation, second))[0];
      if (target !== undefined) routes.push({ from: this.startLocation, to: target, risk: 1 });
    }
    return routes;
  },

  availableLanes() {
    return this.currentLanes
      .filter((lane) => lane.from === this.position || lane.to === this.position)
      .map((lane) => ({
        lane,
        destination: lane.from === this.position ? lane.to : lane.from,
      }));
  },

  cargoStrain(cargo = this.cargo) {
    const first = this.refits.has('sealed-hold') ? 7 : 5;
    const second = this.refits.has('sealed-hold') ? 11 : 9;
    if (cargo >= second) return 2;
    if (cargo >= first) return 1;
    return 0;
  },

  routeStrain(lane, includeRefits = true) {
    let strain = lane.risk + this.cargoStrain();
    if (includeRefits && this.cargo && this.refits.has('storm-jib') && !this.refitUses.has('storm-jib')) strain -= 2;
    if (includeRefits && !this.cargo && this.refits.has('keel-spurs') && !this.refitUses.has('keel-spurs')) strain -= 1;
    return Math.max(1, strain);
  },

  awardRefit(ctx) {
    const available = REFITS.filter((refit) => !this.refits.has(refit.id));
    if (!available.length) return null;
    const refit = available[Math.floor(ctx.rng() * available.length)];
    this.refits.add(refit.id);
    return refit;
  },

  paint() {
    if (!this.nodeButtons) return;
    const options = this.availableLanes();
    const reachable = new Map(options.map(({ lane, destination }) => [destination, lane]));

    this.nodeButtons.forEach((button, index) => {
      const isSkiff = index === this.startLocation;
      const isCurrent = index === this.position;
      const lane = reachable.get(index);
      button.classList.toggle('graveyard__node--skiff', isSkiff);
      button.classList.toggle('graveyard__node--current', isCurrent);
      button.classList.toggle('graveyard__node--searched', this.searched?.has(index));
      button.classList.toggle('graveyard__node--available', Boolean(lane));
      button.classList.toggle('graveyard__node--rough', Boolean(lane && lane.risk + this.cargoStrain() >= 3));
      button.classList.toggle('graveyard__node--strong', !isSkiff && !this.searched?.has(index) && this.caches[index] >= 5);
      button.disabled = this.locked || isCurrent || !lane;
      const location = LOCATIONS[index];
      const extra = lane ? `, route adds ${this.routeStrain(lane)} storm strain` : '';
      const signal = !isSkiff && !this.searched?.has(index)
        ? `, ${this.refits.has('sounding-glass') ? `${this.caches[index]} salvage` : `${this.caches[index] >= 5 ? 'strong' : 'faint'} salvage signal`}`
        : '';
      const isTarget = index === this.targetLocation;
      button.classList.toggle('graveyard__node--objective', isTarget);
      button.classList.toggle('graveyard__node--heart', isTarget && this.targetType === 'heart');
      const targetLabel = isTarget ? `, ${this.targetType === 'heart' ? 'final salvage' : 'chart fragment'} objective` : '';
      button.setAttribute('aria-label', `${location.name}${isSkiff ? ' skiff' : ' wreck'}${signal}${targetLabel}${this.searched?.has(index) ? ', already searched' : ''}${isCurrent ? ', current location' : extra}`);
      const marker = button.querySelector('.graveyard__node-marker');
      if (isSkiff) {
        marker.textContent = 'SKIFF';
      } else if (isTarget) {
        marker.textContent = this.targetType === 'heart' ? 'HEART' : 'CHART';
      } else if (this.searched.has(index)) {
        marker.textContent = 'Searched';
      } else if (this.refits.has('sounding-glass')) {
        marker.textContent = String(this.caches[index]);
      } else {
        marker.textContent = this.caches[index] >= 5 ? 'Strong' : 'Faint';
      }
    });
    const currentRoutes = new Map(this.currentLanes.map((lane) => [routeKey(lane.from, lane.to), lane]));
    this.routeLines.forEach(({ line, riskTag, pair }) => {
      const route = currentRoutes.get(routeKey(pair.from, pair.to));
      const isOpen = route && (route.from === this.position || route.to === this.position);
      // SVG elements ignore the `hidden` IDL property, so lanes that do not exist
      // in this chart are hidden with a class instead. Otherwise every possible
      // pair of locations draws a line.
      line.classList.toggle('graveyard__route--hidden', !route);
      riskTag.hidden = !route || (!isOpen && !this.refits.has('tide-reader'));
      if (!route) return;
      line.classList.toggle('graveyard__route--open', isOpen);
      const currentCost = this.routeStrain(route, Boolean(isOpen));
      line.classList.toggle('graveyard__route--rough', currentCost >= 3);
      riskTag.textContent = String(currentCost);
      riskTag.classList.toggle('graveyard__route-risk--rough', currentCost >= 3);
    });
    const limit = this.stormLimit ?? STORM_MIN;
    this.cargoValue.textContent = String(this.cargo);
    this.stormValue.textContent = `${this.storm} / ${limit}`;
    this.stormBar.setAttribute('aria-valuemax', String(limit));
    this.stormBar.setAttribute('aria-valuenow', String(this.storm));
    this.stormFill.style.transform = `scaleX(${this.storm / limit})`;
    this.stormBar.classList.toggle('graveyard__meter--high', this.storm >= limit * 0.66);
    const atSkiff = this.position === this.startLocation;
    const canSearch = !this.locked;
    this.quickButton.disabled = !canSearch || atSkiff || this.searched.has(this.position);
    this.stripButton.disabled = !canSearch || atSkiff || this.searched.has(this.position);
    this.returnButton.disabled = this.locked || !atSkiff || this.cargo === 0;
    this.expeditionValue.textContent = String(this.expeditionNumber);
    const cache = this.position === this.startLocation ? 0 : this.caches[this.position];
    const quickAmount = Math.min(this.refits.has('salvage-winch') ? 3 : 2, cache);
    const quickStrain = (this.refits.has('salvage-winch') ? 2 : 1) + this.cargoStrain(this.cargo + quickAmount);
    const hasHookBonus = cache >= 5 && this.refits.has('deepwater-hooks') && !this.refitUses.has('deepwater-hooks');
    const stripAmount = cache + Number(hasHookBonus);
    const stripBaseStrain = cache < 5 && this.refits.has('divers-saw') ? 2 : 3;
    const stripStrain = stripBaseStrain + this.cargoStrain(this.cargo + stripAmount);
    this.quickDetail.textContent = `${quickStrain} strain`;
    this.stripDetail.textContent = `${stripStrain} strain`;
    this.heartValue.textContent = String(this.heartReturns);
    this.chartValue.textContent = `${this.chartFragments}/3`;
    this.refitSummary.textContent = `Refits ${this.refits.size}/${REFITS.length} · View effects`;
    this.refitList.replaceChildren(...[...this.refits].reverse().map((id) => {
      const refit = REFITS.find((entry) => entry.id === id);
      return el('li', '', `${refit.name}: ${refit.effect}`);
    }));
    if (!this.refits.size) this.refitList.append(el('li', '', "Earn a passive refit by returning the Graveyard's Heart."));
    if (this.phase === 'delivered') {
      this.hint.textContent = `Cargo delivered · ${this.lastDelivery} salvage banked.${this.refitAward ? ` Refit earned: ${this.refitAward.name}.` : ''}${this.lastFragment ? ' Chart fragment secured.' : ''}${this.lastHeart ? ' The Graveyard\'s Heart is recovered.' : ''} Expedition ${this.expeditionNumber + 1} begins shortly.`;
    } else if (this.phase === 'lost') {
      this.hint.textContent = `Expedition lost · ${this.lastLoss} cargo gone${this.lastObjectiveLost ? '; the chart objective is lost' : ''}. Expedition ${this.expeditionNumber + 1} begins shortly.`;
    } else if (atSkiff && this.cargo > 0) {
      this.hint.textContent = 'Back at the skiff: deliver your cargo now, or sail out for one more wreck.';
    } else if (!atSkiff && !this.searched.has(this.position)) {
      this.hint.textContent = `Wreck signal: ${this.caches[this.position] >= 5 ? 'strong' : 'faint'}${this.refits.has('sounding-glass') ? `, cache ${this.caches[this.position]}` : ''}.${this.position === this.targetLocation ? ` Objective: recover the ${this.targetType === 'heart' ? 'Graveyard\'s Heart' : 'chart fragment'}.` : ''} Quick takes up to ${this.refits.has('salvage-winch') ? 3 : 2}; Strip takes all. Cargo adds strain.`;
    } else {
      this.hint.textContent = 'Choose a sea lane to travel. At a wreck, use Quick or Strip to search it; back at the skiff, use Return to bank the cargo. Cargo adds strain.';
    }
  },

  travel(destination) {
    if (!this.alive || this.locked || destination === this.position) return;
    const option = this.availableLanes().find((entry) => entry.destination === destination);
    if (!option) return;

    const strain = this.routeStrain(option.lane);
    if (this.cargo && this.refits.has('storm-jib') && !this.refitUses.has('storm-jib')) this.refitUses.add('storm-jib');
    if (!this.cargo && this.refits.has('keel-spurs') && !this.refitUses.has('keel-spurs')) this.refitUses.add('keel-spurs');
    this.position = destination;
    this.advanceStorm(strain, `Sailed to ${LOCATIONS[destination].name}. This crossing cost ${strain} strain.`);
  },

  search(method) {
    if (!this.alive || this.locked || this.position === this.startLocation || this.searched.has(this.position)) return;
    const cache = this.caches[this.position];
    let found = method === 'quick' ? Math.min(this.refits.has('salvage-winch') ? 3 : 2, cache) : cache;
    const strong = cache >= 5;
    if (method === 'strip' && strong && this.refits.has('deepwater-hooks') && !this.refitUses.has('deepwater-hooks')) {
      found += 1;
      this.refitUses.add('deepwater-hooks');
    }
    this.searched.add(this.position);
    this.cargo += found;
    let baseStrain = method === 'quick' ? (this.refits.has('salvage-winch') ? 2 : 1) : (method === 'strip' && !strong && this.refits.has('divers-saw') ? 2 : 3);
    const strain = baseStrain + this.cargoStrain();
    const choice = method === 'quick' ? 'Quick salvage' : 'You stripped the wreck';
    if (this.position === this.targetLocation) {
      if (this.targetType === 'fragment') this.fragmentOnboard = true;
      else this.heartOnboard = true;
    }
    this.advanceStorm(strain, `${choice}: ${found} salvage. Cargo aboard: ${this.cargo}; search cost ${strain} strain.`);
  },

  advanceStorm(strain, message) {
    this.storm += strain;
    let charmMessage = '';
    if (this.storm >= this.stormLimit && this.refits.has('undertow-charm') && !this.refitUses.has('undertow-charm')) {
      this.refitUses.add('undertow-charm');
      const jettisoned = Math.min(2, this.cargo);
      this.cargo -= jettisoned;
      this.storm -= 3;
      charmMessage = `Undertow Charm jettisoned ${jettisoned} cargo and shed 3 strain.`;
    }
    if (this.storm >= this.stormLimit) {
      this.capsize(charmMessage);
      return;
    }
    this.paint();
    this.ctx.message(`${message}${charmMessage ? ` ${charmMessage}` : ''} Storm strain: ${this.storm} / ${this.stormLimit}.`);
  },

  extract() {
    if (!this.alive || this.locked || this.position !== this.startLocation || this.cargo === 0) return;
    const extracted = this.cargo;
    this.lastFragment = this.fragmentOnboard;
    this.lastHeart = this.heartOnboard;
    this.lastObjectiveLost = false;
    if (this.fragmentOnboard) this.chartFragments = Math.min(3, this.chartFragments + 1);
    const heartBonus = this.heartOnboard ? 25 : 0;
    if (this.heartOnboard) {
      this.heartReturns += 1;
      this.chartFragments = 0;
    }
    this.refitAward = this.heartOnboard ? this.awardRefit(this.ctx) : null;
    const scored = extracted + heartBonus;
    this.totalExtracted += scored;
    this.ctx.addPoints(scored);
    this.locked = true;
    this.phase = 'delivered';
    this.returnNotice.setAttribute('aria-label', `Cargo returned: ${extracted} salvage banked.`);
    this.returnNoticeValue.textContent = `+${extracted}`;
    this.returnNotice.hidden = false;
    this.returnNotice.classList.add('graveyard__return-notice--show');
    this.stormBar.classList.add('graveyard__meter--event-delivered');
    this.lastDelivery = scored;
    this.cargo = 0;
    this.paint();
    this.ctx.message(`Cargo delivered: ${extracted} salvage${heartBonus ? ` and ${heartBonus} for the Graveyard's Heart` : ''} banked.${this.lastFragment ? ' Chart fragment secured.' : ''}${this.refitAward ? ` Heart refit: ${this.refitAward.name} — ${this.refitAward.effect}` : ''} Expedition ${this.expeditionNumber} complete; ${this.totalExtracted} scored this run.`);
    this.settle();
  },

  capsize(charmMessage = '') {
    const lost = this.cargo;
    this.lastObjectiveLost = this.fragmentOnboard || this.heartOnboard;
    this.lastFragment = false;
    this.lastHeart = false;
    this.cargo = 0;
    this.locked = true;
    this.phase = 'lost';
    this.stormBar.classList.add('graveyard__meter--event-lost');
    this.lastLoss = lost;
    this.paint();
    this.ctx.message(`Expedition ${this.expeditionNumber} lost. ${charmMessage ? `${charmMessage} ` : ''}The storm takes ${lost} cargo; extracted salvage remains safe.`);
    this.settle();
  },

  settle() {
    clearTimeout(this.beat);
    this.beat = setTimeout(() => {
      if (this.alive) this.newExpedition(this.ctx);
    }, BEAT_MS);
  },
};

export default game;
