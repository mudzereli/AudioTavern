/* ---------------------------------------------------------------------------
   Ship Graveyard - plot a salvage run across a chart of drowned ships.

   Choose sea lanes, search wrecks, and manage rising storm strain before
   returning cargo to the skiff. No two expeditions have the same route costs.
   --------------------------------------------------------------------------- */

const MAX_STORM = 18;
const BEAT_MS = 1050;
const SVG_NS = 'http://www.w3.org/2000/svg';

const LOCATIONS = [
  { id: 'skiff', name: 'Skiff', x: 50, y: 88 },
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

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text != null) element.textContent = text;
  return element;
}

const game = {
  id: 'ship-graveyard',

  mount(ctx) {
    this.ctx = ctx;
    const wrap = el('section', 'graveyard');

    const status = el('div', 'graveyard__status');
    const cargo = el('div', 'graveyard__cargo');
    cargo.append(el('span', 'graveyard__label', 'Cargo aboard'));
    this.cargoValue = el('strong', 'graveyard__value', '0');
    cargo.append(this.cargoValue);

    const expedition = el('div', 'graveyard__expedition');
    expedition.append(el('span', 'graveyard__label', 'Expedition'));
    this.expeditionValue = el('strong', 'graveyard__expedition-value', '1 · OUTBOUND');
    expedition.append(this.expeditionValue);
    this.expeditionStatus = expedition;

    const storm = el('div', 'graveyard__storm');
    const stormHead = el('div', 'graveyard__storm-head');
    stormHead.append(el('span', 'graveyard__label', 'Storm strain'));
    this.stormValue = el('span', 'graveyard__storm-value', `0 / ${MAX_STORM}`);
    stormHead.append(this.stormValue);
    this.stormBar = el('div', 'graveyard__meter');
    this.stormBar.setAttribute('role', 'progressbar');
    this.stormBar.setAttribute('aria-label', 'Storm strain');
    this.stormBar.setAttribute('aria-valuemin', '0');
    this.stormBar.setAttribute('aria-valuemax', String(MAX_STORM));
    this.stormFill = el('span', 'graveyard__meter-fill');
    this.stormBar.append(this.stormFill);
    storm.append(stormHead, this.stormBar);
    status.append(expedition, cargo, storm);

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
    this.quickButton = el('button', 'btn btn--ghost', 'Quick · up to 2 (+1 strain)');
    this.quickButton.classList.add('graveyard__quick');
    this.quickButton.type = 'button';
    this.quickButton.disabled = true;
    this.quickButton.addEventListener('click', () => this.search('quick'));
    this.stripButton = el('button', 'btn btn--ghost', 'Strip · full cache (+3 strain)');
    this.stripButton.classList.add('graveyard__strip');
    this.stripButton.type = 'button';
    this.stripButton.disabled = true;
    this.stripButton.addEventListener('click', () => this.search('strip'));
    this.returnButton = el('button', 'btn btn--primary', 'Return to skiff');
    this.returnButton.type = 'button';
    this.returnButton.disabled = true;
    this.returnButton.addEventListener('click', () => this.extract());
    this.actions.append(this.quickButton, this.stripButton, this.returnButton);

    this.hint = el('p', 'graveyard__hint', 'Choose a route. Numbered routes: 1–4. S: quick salvage. D: strip wreck. R: return.');
    wrap.append(status, this.chart, this.actions, this.hint);
    ctx.stage.append(wrap);

    document.addEventListener('keydown', (event) => {
      if (!this.alive || this.locked) return;
      if (/^[1-4]$/.test(event.key)) {
        const option = this.availableLanes()[Number(event.key) - 1];
        if (option) {
          event.preventDefault();
          this.travel(option.destination);
        }
      } else if (event.key === 's' || event.key === 'S') {
        event.preventDefault();
        this.search('quick');
      } else if (event.key === 'd' || event.key === 'D') {
        event.preventDefault();
        this.search('strip');
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        this.extract();
      }
    });
  },

  start(ctx) {
    this.alive = true;
    this.totalExtracted = 0;
    this.expeditionNumber = 0;
    this.previousStartLocation = null;
    this.newExpedition(ctx);
  },

  stop() {
    this.alive = false;
    this.locked = true;
    clearTimeout(this.beat);
    this.paint();
  },

  newExpedition(ctx) {
    clearTimeout(this.beat);
    this.locked = false;
    this.expeditionNumber += 1;
    this.phase = 'outbound';
    const startChoices = LOCATIONS.map((_, index) => index)
      .filter((index) => index !== this.previousStartLocation);
    this.startLocation = startChoices[Math.floor(ctx.rng() * startChoices.length)];
    this.previousStartLocation = this.startLocation;
    this.position = this.startLocation;
    this.cargo = 0;
    this.storm = 0;
    this.searched = new Set();
    this.currentLanes = this.createRoutes(ctx.rng);
    this.caches = LOCATIONS.map((_, index) => index === this.startLocation
      ? 0
      : (ctx.rng() < 0.3 ? 5 : 2) + Math.floor(ctx.rng() * 3));

    this.paint();
    ctx.message(`Expedition ${this.expeditionNumber}: skiff position shifted. Choose a route and bring the cargo home.`);
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

  cargoStrain() {
    if (this.cargo >= 9) return 2;
    if (this.cargo >= 5) return 1;
    return 0;
  },

  paint() {
    if (!this.nodeButtons) return;
    const options = this.availableLanes();
    const reachable = new Map(options.map(({ lane, destination }) => [destination, lane]));
    const routeNumbers = new Map(options.slice(0, 4).map(({ destination }, index) => [destination, index + 1]));

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
      const extra = lane ? `, route adds ${lane.risk + this.cargoStrain()} storm strain` : '';
      const signal = !isSkiff && !this.searched?.has(index)
        ? `, ${this.caches[index] >= 5 ? 'strong' : 'faint'} salvage signal`
        : '';
      button.setAttribute('aria-label', `${location.name}${isSkiff ? ' skiff' : ' wreck'}${signal}${this.searched?.has(index) ? ', already searched' : ''}${isCurrent ? ', current location' : extra}`);
      const marker = button.querySelector('.graveyard__node-marker');
      if (isSkiff) {
        marker.textContent = 'SKIFF';
      } else {
        marker.textContent = this.searched.has(index)
          ? 'Searched'
          : `${routeNumbers.has(index) ? `${routeNumbers.get(index)} · ` : ''}${this.caches[index] >= 5 ? 'Strong' : 'Faint'}`;
      }
    });

    const currentRoutes = new Map(this.currentLanes.map((lane) => [routeKey(lane.from, lane.to), lane]));
    this.routeLines.forEach(({ line, riskTag, pair }) => {
      const route = currentRoutes.get(routeKey(pair.from, pair.to));
      const isOpen = route && (route.from === this.position || route.to === this.position);
      line.hidden = !route;
      riskTag.hidden = !isOpen;
      if (!route) return;
      line.classList.toggle('graveyard__route--open', isOpen);
      const currentCost = route.risk + this.cargoStrain();
      line.classList.toggle('graveyard__route--rough', currentCost >= 3);
      riskTag.textContent = String(currentCost);
      riskTag.classList.toggle('graveyard__route-risk--rough', currentCost >= 3);
    });

    this.cargoValue.textContent = String(this.cargo);
    this.stormValue.textContent = `${this.storm} / ${MAX_STORM}`;
    this.stormBar.setAttribute('aria-valuenow', String(this.storm));
    this.stormFill.style.transform = `scaleX(${this.storm / MAX_STORM})`;
    this.stormBar.classList.toggle('graveyard__meter--high', this.storm >= MAX_STORM * 0.66);
    const atSkiff = this.position === this.startLocation;
    const canSearch = !this.locked;
    this.quickButton.disabled = !canSearch || atSkiff || this.searched.has(this.position);
    this.stripButton.disabled = !canSearch || atSkiff || this.searched.has(this.position);
    this.returnButton.disabled = this.locked || !atSkiff || this.cargo === 0;
    this.expeditionValue.textContent = `${this.expeditionNumber} · ${this.phase.toUpperCase()}`;
    this.expeditionStatus.classList.toggle('graveyard__expedition--delivered', this.phase === 'delivered');
    this.expeditionStatus.classList.toggle('graveyard__expedition--lost', this.phase === 'lost');

    if (this.phase === 'delivered') {
      this.hint.textContent = `Cargo delivered · ${this.lastDelivery} salvage banked. Expedition ${this.expeditionNumber + 1} begins shortly.`;
    } else if (this.phase === 'lost') {
      this.hint.textContent = `Expedition lost · ${this.lastLoss} cargo gone. Expedition ${this.expeditionNumber + 1} begins shortly.`;
    } else if (atSkiff && this.cargo > 0) {
      this.hint.textContent = 'Back at the skiff: deliver your cargo now, or sail out for one more wreck.';
    } else if (!atSkiff && !this.searched.has(this.position)) {
      this.hint.textContent = `Wreck signal: ${this.caches[this.position] >= 5 ? 'strong' : 'faint'}, cache ${this.caches[this.position]}. Quick takes up to 2 (+1 strain); strip takes all (+3). Cargo adds strain.`;
    } else {
      this.hint.textContent = 'Choose a numbered sea lane. S: quick haul. D: strip wreck. R: deliver at skiff. Cargo increases storm strain.';
    }
  },

  travel(destination) {
    if (!this.alive || this.locked || destination === this.position) return;
    const option = this.availableLanes().find((entry) => entry.destination === destination);
    if (!option) return;

    this.position = destination;
    const strain = option.lane.risk + this.cargoStrain();
    this.advanceStorm(strain, `Sailed to ${LOCATIONS[destination].name}. This crossing cost ${strain} strain.`);
  },

  search(method) {
    if (!this.alive || this.locked || this.position === this.startLocation || this.searched.has(this.position)) return;
    const cache = this.caches[this.position];
    const found = method === 'quick' ? Math.min(2, cache) : cache;
    this.searched.add(this.position);
    this.cargo += found;
    const baseStrain = method === 'quick' ? 1 : 3;
    const strain = baseStrain + this.cargoStrain();
    const choice = method === 'quick' ? 'Quick salvage' : 'You stripped the wreck';
    this.advanceStorm(strain, `${choice}: ${found} salvage. Cargo aboard: ${this.cargo}; search cost ${strain} strain.`);
  },

  advanceStorm(strain, message) {
    this.storm += strain;
    if (this.storm >= MAX_STORM) {
      this.capsize();
      return;
    }
    this.paint();
    this.ctx.message(`${message} Storm strain: ${this.storm} / ${MAX_STORM}.`);
  },

  extract() {
    if (!this.alive || this.locked || this.position !== this.startLocation || this.cargo === 0) return;
    const extracted = this.cargo;
    this.totalExtracted += extracted;
    this.ctx.addPoints(extracted);
    this.locked = true;
    this.phase = 'delivered';
    this.lastDelivery = extracted;
    this.cargo = 0;
    this.paint();
    this.ctx.message(`Cargo delivered: ${extracted} salvage banked. Expedition ${this.expeditionNumber} complete; ${this.totalExtracted} scored this run.`);
    this.settle();
  },

  capsize() {
    const lost = this.cargo;
    this.cargo = 0;
    this.locked = true;
    this.phase = 'lost';
    this.lastLoss = lost;
    this.paint();
    this.ctx.message(`Expedition ${this.expeditionNumber} lost. The storm takes ${lost} cargo; extracted salvage remains safe.`);
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
