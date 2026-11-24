/* =========================================================================
   PLANET OF THE FURIOUS — game.js
   Núcleo: configuração, estado/salvamento, economia, garagem (DOM),
   interação (arrastar + tocar para selecionar), pista (Canvas 2D),
   qualidade adaptativa, ciclo de vida (offline, background, abas).
   Popups, menus, tutorial, missões e prestígio ficam em meta.js.
   ========================================================================= */
'use strict';

/* =========================================================================
   1) CONFIGURAÇÃO DE BALANCEAMENTO — ajuste os números aqui
   ========================================================================= */
const CONFIG = {
  startCoins: 30,
  startCars: [1, 1],          // carros iniciais na garagem

  buy: {
    base: 5,                  // preço do carro nível 1
    levelMult: 2.6,           // cada nível acima custa 2,6x
    growth: 1.05,             // +5% a cada compra do mesmo nível
    levelGap: 4,              // loja vende nível (máximo − gap), mínimo 1
  },
  sell: { rate: 0.4 },        // venda = 40% do preço base do nível

  income: {
    base: 1,                  // moedas por volta do nível 1
    levelMult: 1.8,           // cada nível rende 1,8x mais por volta (+ corre mais rápido)
  },
  track: {
    lapBase: 6,               // segundos por volta no nível 1
    speedPerLevel: 0.045,     // +4,5% de velocidade por nível
  },

  garage: { start: 12, max: 20 },  // vagas na garagem (grade 4x5)
  trackSlots: { start: 3, max: 10 },

  upgrades: {
    garage:   { name: 'Garagem maior',  icon: 'garage', base: 120, growth: 3.1,  max: 8,  desc: 'Mais vagas para guardar carros' },
    track:    { name: 'Pista ampliada', icon: 'road',   base: 80,  growth: 4.2,  max: 7,  desc: 'Mais carros correndo ao mesmo tempo' },
    income:   { name: 'Patrocínio',     icon: 'up',     base: 250, growth: 2.15, max: 40, desc: 'Cada volta rende mais', per: 0.10 },
    discount: { name: 'Desconto VIP',   icon: 'star',   base: 400, growth: 2.5,  max: 16, desc: 'Carros mais baratos na loja', per: 0.025 },
  },

  nitro: { mult: 2, duration: 30, cooldown: 90 },   // segundos
  chest: { interval: 24 * 3600, incomeSeconds: 600, minCoins: 100 },
  offline: { maxSeconds: 2 * 3600, rate: 1.0, minSeconds: 20, popupSeconds: 120 },
  prestige: { minLevel: 30, incomeBonus: 0.5 },     // +50% de renda permanente por prestígio

  saveKey: 'potf_save_v1',    // mesma chave da versão 1 (saves antigos continuam valendo)
  backupKey: 'potf_save_backup',
  saveVersion: 2,
  autosaveMs: 5000,
  backupEveryMs: 60000,
};

/* =========================================================================
   2) UTILIDADES
   ========================================================================= */
const $ = (sel) => document.querySelector(sel);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const now = () => Date.now();
const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const canVibrate = typeof navigator.vibrate === 'function' && !isIOS;

/** Formata números grandes: 1234 → 1,23K */
function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1).replace('.', ',') : String(Math.floor(n));
  let i = 0;
  while (n >= 1000 && i < SUFFIX.length - 1) { n /= 1000; i++; }
  const s = n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2);
  return s.replace('.', ',') + SUFFIX[i];
}
function fmtTime(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h}h${String(m).padStart(2, '0')}`;
  if (m) return `${m}m${String(s).padStart(2, '0')}`;
  return `${s}s`;
}
function fmtLong(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (h && m) return `${h}h ${m}min`;
  if (h) return `${h}h`;
  if (m) return `${m} min`;
  return `${sec}s`;
}
function chapBadge(chapter, size) {
  const hue = (20 + (chapter - 1) * 33) % 360;
  return `<span class="chap${size ? ' ' + size : ''}" style="--c1:hsl(${hue} 95% 58%);--c2:hsl(${hue} 90% 30%)">${chapter}</span>`;
}
const icon = (name, cls) => `<svg${cls ? ` class="${cls}"` : ''} aria-hidden="true"><use href="#i-${name}"/></svg>`;
function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
function vibrate(p) { if (canVibrate && state.settings.vibrate) try { navigator.vibrate(p); } catch (e) { /* ignora */ } }

/* Mini barramento de eventos (game.js → meta.js: tutorial, missões...) */
const Bus = {
  map: {},
  on(ev, fn) { (this.map[ev] || (this.map[ev] = [])).push(fn); },
  emit(ev, data) { (this.map[ev] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); },
};

/* =========================================================================
   3) ESTADO + SALVAMENTO (versionado, com migração e backup)
   ========================================================================= */
function defaultState() {
  const garage = new Array(CONFIG.garage.max).fill(0);
  CONFIG.startCars.forEach((lv, i) => { garage[i] = lv; });
  return {
    v: CONFIG.saveVersion,
    coins: CONFIG.startCoins,
    garage,
    track: new Array(CONFIG.trackSlots.max).fill(0),
    upg: { garage: 0, track: 0, income: 0, discount: 0 },
    buys: {},                 // compras por nível (preço crescente)
    maxLevel: 1,
    unlocked: [1],            // níveis já vistos (coleção — nunca reseta)
    reserve: [],              // carros bônus esperando vaga na garagem
    nitroUntil: 0, nitroReadyAt: 0,
    chestAt: 0,               // próximo baú disponível (timestamp)
    prestige: 0,
    settings: { muted: false, music: 0.45, sfx: 0.8, vibrate: true, quality: 'auto', reduceMotion: null },
    tutorial: { step: 0, done: false },
    stats: { merges: 0, buys: 0, sells: 0, nitros: 0, chests: 0, earned: 0, laps: 0, bestTrack: 0, prestiges: 0 },
    missions: {},             // nível já resgatado de cada cadeia de missões
    achievements: [],
    lastSeen: now(),
    saveSeq: 0,
  };
}

const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
const lvl = (v) => clamp(Math.floor(num(v)), 0, MAX_LEVEL);

/** Migra saves antigos e corrige qualquer campo inválido. Nunca lança erro. */
function migrateState(raw) {
  const d = defaultState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return d;
  const s = Object.assign(d, raw);
  // v1 → v2: configurações e estatísticas viraram objetos
  if (!raw.v || raw.v < 2) {
    s.settings = Object.assign(defaultState().settings, { muted: !!raw.muted, vibrate: raw.vibrate !== false });
    s.stats = Object.assign(defaultState().stats, { merges: num(raw.merges), earned: num(raw.totalEarned) });
    // quem já jogou não precisa do tutorial
    s.tutorial = { step: 0, done: num(raw.maxLevel, 1) > 1 || num(raw.merges) > 0 };
    delete s.muted; delete s.vibrate; delete s.merges; delete s.totalEarned;
  }
  s.v = CONFIG.saveVersion;
  s.coins = Math.max(0, num(s.coins));
  s.garage = Array.from({ length: CONFIG.garage.max }, (_, i) => lvl((raw.garage || [])[i]));
  s.track = Array.from({ length: CONFIG.trackSlots.max }, (_, i) => lvl((raw.track || [])[i]));
  const u = raw.upg && typeof raw.upg === 'object' ? raw.upg : {};
  s.upg = {};
  for (const k of Object.keys(CONFIG.upgrades)) s.upg[k] = clamp(Math.floor(num(u[k])), 0, CONFIG.upgrades[k].max);
  s.buys = {};
  if (raw.buys && typeof raw.buys === 'object') for (const k of Object.keys(raw.buys)) if (+k >= 1 && +k <= MAX_LEVEL) s.buys[k] = Math.max(0, Math.floor(num(raw.buys[k])));
  s.unlocked = Array.isArray(raw.unlocked) ? [...new Set(raw.unlocked.map(lvl).filter(Boolean))] : [1];
  if (!s.unlocked.includes(1)) s.unlocked.unshift(1);
  s.reserve = Array.isArray(raw.reserve) ? raw.reserve.map(lvl).filter(Boolean).slice(0, 20) : [];
  // nível máximo coerente com os carros que existem
  const owned = [...s.garage, ...s.track, ...s.reserve];
  s.maxLevel = clamp(Math.max(1, Math.floor(num(s.maxLevel, 1)), ...owned), 1, MAX_LEVEL);
  for (const L of owned) if (L && !s.unlocked.includes(L)) s.unlocked.push(L);
  s.nitroUntil = num(s.nitroUntil); s.nitroReadyAt = num(s.nitroReadyAt); s.chestAt = num(s.chestAt);
  s.prestige = Math.max(0, Math.floor(num(s.prestige)));
  s.settings = Object.assign(defaultState().settings, s.settings && typeof s.settings === 'object' ? s.settings : {});
  s.settings.music = clamp(num(s.settings.music, 0.45), 0, 1);
  s.settings.sfx = clamp(num(s.settings.sfx, 0.8), 0, 1);
  s.settings.muted = !!s.settings.muted;
  if (!['auto', 'high', 'medium', 'low'].includes(s.settings.quality)) s.settings.quality = 'auto';
  if (s.settings.reduceMotion !== null && typeof s.settings.reduceMotion !== 'boolean') s.settings.reduceMotion = null;
  s.tutorial = Object.assign({ step: 0, done: false }, s.tutorial && typeof s.tutorial === 'object' ? s.tutorial : {});
  s.tutorial.step = clamp(Math.floor(num(s.tutorial.step)), 0, 99);
  s.stats = Object.assign(defaultState().stats, s.stats && typeof s.stats === 'object' ? s.stats : {});
  for (const k of Object.keys(s.stats)) s.stats[k] = Math.max(0, num(s.stats[k]));
  s.missions = s.missions && typeof s.missions === 'object' && !Array.isArray(s.missions) ? s.missions : {};
  for (const k of Object.keys(s.missions)) s.missions[k] = Math.max(0, Math.floor(num(s.missions[k])));
  s.achievements = Array.isArray(s.achievements) ? s.achievements.filter((x) => typeof x === 'string') : [];
  s.lastSeen = num(s.lastSeen, now());
  s.saveSeq = num(s.saveSeq);
  // jogo sem nenhum carro e sem dinheiro ficaria travado: devolve um carro
  if (!owned.some(Boolean) && s.coins < CONFIG.buy.base) s.garage[0] = 1;
  return s;
}

function readSave(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : null;
  } catch (e) { return null; }
}

let storageOk = true;
let lastBackupAt = 0;
let frozen = false;          // outra aba assumiu o jogo: esta para de salvar

function loadState() {
  const main = readSave(CONFIG.saveKey);
  if (main) return migrateState(main);
  const bak = readSave(CONFIG.backupKey);   // save principal corrompido → backup
  if (bak) { console.warn('Save principal inválido; usando backup.'); return migrateState(bak); }
  return defaultState();
}

let state = loadState();

function saveState(force) {
  if (frozen && !force) return;
  state.lastSeen = now();
  state.saveSeq++;
  try {
    if (now() - lastBackupAt > CONFIG.backupEveryMs) {
      // o backup guarda o retrato anterior, útil se algo der errado
      const prev = localStorage.getItem(CONFIG.saveKey);
      if (prev) localStorage.setItem(CONFIG.backupKey, prev);
      lastBackupAt = now();
    }
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(state));
    storageOk = true;
  } catch (e) {
    if (storageOk) { storageOk = false; toast('Não foi possível salvar (armazenamento cheio ou modo privado).', 'warn', 3000); }
  }
}
/** Guarda o save atual como backup antes de operações destrutivas. */
function backupNow() { try { localStorage.setItem(CONFIG.backupKey, JSON.stringify(state)); lastBackupAt = now(); } catch (e) { /* ignora */ } }

/* =========================================================================
   4) ECONOMIA
   ========================================================================= */
const garageSlots = () => CONFIG.garage.start + state.upg.garage;
const trackSlots = () => CONFIG.trackSlots.start + state.upg.track;
const prestigeMult = () => 1 + state.prestige * CONFIG.prestige.incomeBonus;
const incomeMult = () => (1 + state.upg.income * CONFIG.upgrades.income.per) * prestigeMult();
const discount = () => state.upg.discount * CONFIG.upgrades.discount.per;
const nitroOn = () => now() < state.nitroUntil;

const buyLevel = () => Math.max(1, state.maxLevel - CONFIG.buy.levelGap);
const baseCost = (L) => CONFIG.buy.base * Math.pow(CONFIG.buy.levelMult, L - 1);
const buyPrice = (L) => Math.ceil(baseCost(L) * Math.pow(CONFIG.buy.growth, state.buys[L] || 0) * (1 - discount()));
const sellPrice = (L) => Math.max(1, Math.floor(baseCost(L) * CONFIG.sell.rate));
const lapTime = (L) => CONFIG.track.lapBase / (1 + CONFIG.track.speedPerLevel * (L - 1));
const incomePerLap = (L) => CONFIG.income.base * Math.pow(CONFIG.income.levelMult, L - 1) * incomeMult();

function incomePerSec(withNitro = nitroOn()) {
  let s = 0;
  for (let i = 0; i < trackSlots(); i++) { const L = state.track[i]; if (L) s += incomePerLap(L) / lapTime(L); }
  return s * (withNitro ? CONFIG.nitro.mult : 1);
}
function upgradeCost(key) { const u = CONFIG.upgrades[key]; return Math.ceil(u.base * Math.pow(u.growth, state.upg[key])); }
const carsOnTrack = () => state.track.slice(0, trackSlots()).filter(Boolean).length;
const totalCars = () => state.garage.filter(Boolean).length + state.track.filter(Boolean).length;
const countLevel = (L) => state.garage.filter((v) => v === L).length + state.track.filter((v) => v === L).length;
const freeGarageIndex = () => { for (let i = 0; i < garageSlots(); i++) if (!state.garage[i]) return i; return -1; };
const freeTrackIndex = () => { for (let i = 0; i < trackSlots(); i++) if (!state.track[i]) return i; return -1; };
function addCoins(n) { state.coins += n; state.stats.earned += n; }

/* =========================================================================
   5) REFERÊNCIAS DO DOM
   ========================================================================= */
const el = {
  app: $('#app'), splash: $('#splash'), game: $('#game'),
  coins: $('#coins'), hudMoney: $('#hudMoney'), coinIco: $('#coinIco'), income: $('#income'), x2Tag: $('#x2Tag'),
  maxLevel: $('#maxLevel'), hudChap: $('#hudChap'), hudLevel: $('#hudLevel'),
  garage: $('#garage'), garageWrap: $('#garageWrap'), pit: $('#pit'), trackWrap: $('#trackWrap'), canvas: $('#track'),
  trackHint: $('#trackHint'), trackCount: $('#trackCount'), trash: $('#trash'), reservePill: $('#reservePill'),
  btnBuy: $('#btnBuy'), buyCar: $('#buyCar'), buyPrice: $('#buyPrice'), buyTitle: $('#buyTitle'), buyFill: $('#buyFill'), buyLv: $('#buyLv'),
  btnNitro: $('#btnNitro'), nitroLabel: $('#nitroLabel'), nitroBanner: $('#nitroBanner'), nitroTime: $('#nitroTime'), ring: $('#btnNitro .ring-fg'),
  tabbar: $('#tabbar'), chestLabel: $('#chestLabel'),
  btnSettings: $('#btnSettings'),
  toast: $('#toast'), fx: $('#fx'), banner: $('#banner'),
};

/* =========================================================================
   6) QUALIDADE GRÁFICA (Auto / Alta / Média / Baixa) + menos movimento
   ========================================================================= */
const QUALITY = {
  high:   { dpr: 2,   rain: 40, reflect: true,  sparks: 160, lights: true,  wheels: true,  burst: 18 },
  medium: { dpr: 1.5, rain: 18, reflect: true,  sparks: 70,  lights: false, wheels: true,  burst: 12 },
  low:    { dpr: 1,   rain: 0,  reflect: false, sparks: 24,  lights: false, wheels: false, burst: 7 },
};
let autoQuality = 'high';
const qualityName = () => (state.settings.quality === 'auto' ? autoQuality : state.settings.quality);
const Q = () => QUALITY[qualityName()];
const reducedMotion = () => (state.settings.reduceMotion == null ? matchMedia('(prefers-reduced-motion: reduce)').matches : state.settings.reduceMotion);

function applyQuality() {
  document.body.classList.toggle('q-low', qualityName() === 'low');
  document.body.classList.toggle('rm', reducedMotion());
  if (Track.ready) Track.resize(true);
}

/** Mede o FPS e, no modo Auto, reduz a qualidade se o aparelho sofrer. */
const Perf = {
  acc: 0, frames: 0, bad: 0, fps: 60,
  tick(dt) {
    this.acc += dt; this.frames++;
    if (this.acc < 2) return;
    this.fps = this.frames / this.acc;
    this.acc = 0; this.frames = 0;
    if (state.settings.quality !== 'auto' || document.hidden) return;
    if (this.fps < 45) this.bad++; else this.bad = 0;
    if (this.bad >= 2 && autoQuality !== 'low') {
      autoQuality = autoQuality === 'high' ? 'medium' : 'low';
      this.bad = 0;
      applyQuality();
      console.info('Qualidade automática →', autoQuality, `(${this.fps.toFixed(0)} fps)`);
    }
  },
};

/* =========================================================================
   7) GARAGEM E PIT (render DOM)
   ========================================================================= */
const cellEls = [], chipEls = [];

function buildGrid() {
  for (let i = 0; i < CONFIG.garage.max; i++) {
    const c = document.createElement('div');
    c.className = 'cell'; c.dataset.i = i;
    el.garage.appendChild(c); cellEls.push(c);
  }
  for (let i = 0; i < CONFIG.trackSlots.max; i++) {
    const c = document.createElement('div');
    c.className = 'chip'; c.dataset.t = i;
    el.pit.appendChild(c); chipEls.push(c);
  }
}

/** Quantas células mostrar: as liberadas + a linha da próxima vaga bloqueada. */
function visibleCells() {
  const s = garageSlots();
  return Math.min(CONFIG.garage.max, Math.ceil(Math.min(s + 1, CONFIG.garage.max) / 4) * 4);
}

function hasPartner(i) {
  const L = state.garage[i];
  if (!L || L >= MAX_LEVEL) return false;
  for (let k = 0; k < garageSlots(); k++) if (k !== i && state.garage[k] === L) return true;
  for (let k = 0; k < trackSlots(); k++) if (state.track[k] === L) return true;
  return false;
}

/** Atualiza uma célula. anim: 'pop' (merge) | 'new' (chegou) */
function renderCell(i, anim) {
  const c = cellEls[i], L = state.garage[i], slots = garageSlots(), vis = i < visibleCells();
  const locked = i >= slots, cta = i === slots;
  const key = !vis ? 'h' : locked ? (cta ? 'cta' : 'x') : String(L);
  if (c.dataset.k !== key) {
    c.dataset.k = key;
    c.hidden = !vis;
    c.className = 'cell' + (locked ? ' locked' + (cta ? ' cta' : '') : '');
    if (locked) {
      c.innerHTML = cta ? `<div class="center">${icon('lock')}<span class="cta-txt">UPGRADE</span></div>` : icon('lock');
      c.setAttribute('aria-label', 'Vaga bloqueada');
      delete c.dataset.tier;
    } else if (!L) {
      c.innerHTML = '';
      c.setAttribute('aria-label', 'Vaga livre');
      delete c.dataset.tier;
    } else {
      const info = carInfo(L);
      c.dataset.tier = info.tier;
      c.setAttribute('aria-label', `${info.name}, nível ${L}`);
      c.innerHTML = `<span class="tag-lv">Lv ${L}${icon('up', 'up')}</span>${chapBadge(info.chapter, 'sm')}<div class="car" style="--d:-${(Math.random() * 2).toFixed(2)}s"><img src="${carAsset(L).url}" alt=""></div>`;
    }
  }
  if (!locked && L) c.classList.toggle('can-merge', hasPartner(i));
  if (anim && L) { c.classList.remove('pop', 'new', 'squash'); void c.offsetWidth; c.classList.add(anim); }
}
function renderGarage() {
  el.garage.style.setProperty('--rows', visibleCells() / 4);
  for (let i = 0; i < cellEls.length; i++) renderCell(i);
  Input.refreshSelection();
}

function renderPit() {
  const n = trackSlots();
  for (let i = 0; i < chipEls.length; i++) {
    const c = chipEls[i], L = state.track[i];
    const visible = i < Math.min(n + 1, CONFIG.trackSlots.max), locked = i >= n;
    const key = `${visible}|${locked}|${L}`;
    if (c.dataset.k === key) continue;
    c.dataset.k = key;
    c.style.visibility = visible ? '' : 'hidden';
    c.className = 'chip' + (locked ? ' locked' : '') + (L && !locked ? ' filled' : '');
    c.innerHTML = locked ? icon('lock') : L ? `<span class="lv">${L}</span><img src="${carAsset(L).url}" alt="">` : '';
    c.setAttribute('aria-label', locked ? 'Vaga da pista bloqueada' : L ? `Na pista: ${carInfo(L).name}` : 'Vaga da pista livre');
  }
  const on = carsOnTrack();
  el.trackHint.hidden = on > 0;
  el.trackCount.querySelector('span').textContent = `${on}/${n}`;
  el.trackCount.classList.toggle('full', on >= n);
}

/* =========================================================================
   8) HUD E BOTÕES
   ========================================================================= */
let hudCache = {};
function setText(node, key, txt) { if (hudCache[key] !== txt) { hudCache[key] = txt; node.textContent = txt; } }
function setHTML(node, key, html) { if (hudCache[key] !== html) { hudCache[key] = html; node.innerHTML = html; } }
function setClass(node, cls, on) { if (node.classList.contains(cls) !== on) node.classList.toggle(cls, on); }

function buyState() {
  const L = buyLevel(), price = buyPrice(L), free = freeGarageIndex() >= 0;
  return { L, price, free, afford: state.coins >= price };
}

function renderHUD() {
  const t = now(), nOn = t < state.nitroUntil;
  setText(el.coins, 'coins', fmt(state.coins));
  setText(el.income, 'income', fmt(incomePerSec()) + '/s');
  if (el.x2Tag.hidden === nOn) el.x2Tag.hidden = !nOn;
  setHTML(el.hudChap, 'chap', chapBadge(carInfo(state.maxLevel).chapter));
  setText(el.maxLevel, 'max', 'Lv ' + state.maxLevel);

  // Comprar: explica visualmente por que não dá
  const b = buyState();
  if (hudCache.buyL !== b.L) { hudCache.buyL = b.L; el.buyCar.src = carAsset(b.L).url; }
  setText(el.buyLv, 'buyLv', 'Lv ' + b.L);
  setClass(el.btnBuy, 'full', !b.free);
  setClass(el.btnBuy, 'cant', b.free && !b.afford);
  const dis = String(!b.free || !b.afford);
  if (hudCache.buyDis !== dis) { hudCache.buyDis = dis; el.btnBuy.setAttribute('aria-disabled', dis); }
  let fill = '0%';
  if (!b.free) { setText(el.buyTitle, 'bt', 'GARAGEM CHEIA'); setText(el.buyPrice, 'price', 'Junte ou venda'); }
  else if (!b.afford) { setText(el.buyTitle, 'bt', 'COMPRAR'); setText(el.buyPrice, 'price', 'Faltam ' + fmt(b.price - state.coins)); fill = Math.floor((state.coins / b.price) * 100) + '%'; }
  else { setText(el.buyTitle, 'bt', 'COMPRAR'); setText(el.buyPrice, 'price', fmt(b.price)); }
  if (hudCache.fill !== fill) { hudCache.fill = fill; el.buyFill.style.width = fill; }

  // Nitro: anel mostra duração (ativo) ou recarga
  const ready = t >= state.nitroReadyAt;
  setClass(el.btnNitro, 'ready', ready && !nOn);
  setClass(el.btnNitro, 'active', nOn);
  setClass(el.btnNitro, 'cooling', !ready && !nOn);
  setClass(el.trackWrap, 'nitro', nOn);
  if (el.nitroBanner.hidden === nOn) el.nitroBanner.hidden = !nOn;
  if (nOn) setText(el.nitroTime, 'nt', String(Math.ceil((state.nitroUntil - t) / 1000)));
  setText(el.nitroLabel, 'nl', nOn ? Math.ceil((state.nitroUntil - t) / 1000) + 's' : ready ? 'NITRO' : fmtTime((state.nitroReadyAt - t) / 1000));
  const frac = nOn ? (state.nitroUntil - t) / (CONFIG.nitro.duration * 1000)
    : ready ? 1 : 1 - (state.nitroReadyAt - t) / (CONFIG.nitro.cooldown * 1000);
  const off = (182.2 * (1 - clamp(frac, 0, 1))).toFixed(1);
  if (hudCache.ring !== off) { hudCache.ring = off; el.ring.style.strokeDashoffset = off; }

  Meta.renderBadges(t);
}

function toast(msg, kind, ms = 1900) {
  el.toast.textContent = msg;
  el.toast.className = 'toast show' + (kind ? ' ' + kind : '');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.toast.className = 'toast' + (kind ? ' ' + kind : ''); }, ms);
}

/* =========================================================================
   9) EFEITOS VISUAIS (DOM) — partículas, flash, números, moedas voando
   ========================================================================= */
function centerOf(node) { const r = node.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
function animateEl(node, frames, opts) {
  el.fx.appendChild(node);
  const a = node.animate(frames, opts);
  a.onfinish = () => node.remove();
  a.oncancel = () => node.remove();
  return a;
}
function burst(x, y, colors, count) {
  count = Math.round((count || Q().burst) * (reducedMotion() ? 0.5 : 1));
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const c = colors[i % colors.length];
    p.style.background = c; p.style.boxShadow = `0 0 8px ${c}`;
    const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 55;
    animateEl(p, [
      { transform: `translate(${x - 4}px,${y - 4}px) scale(1)`, opacity: 1 },
      { transform: `translate(${x - 4 + Math.cos(a) * d}px,${y - 4 + Math.sin(a) * d}px) scale(.2)`, opacity: 0 },
    ], { duration: 450 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.3,1)' });
  }
  const f = document.createElement('div');
  f.className = 'flash'; f.style.borderColor = colors[0];
  animateEl(f, [{ transform: `translate(${x - 10}px,${y - 10}px) scale(.5)`, opacity: 1 }, { transform: `translate(${x - 10}px,${y - 10}px) scale(5)`, opacity: 0 }], { duration: 420, easing: 'ease-out' });
}
function floatText(x, y, txt, color) {
  const t = document.createElement('div');
  t.className = 'float-txt'; t.textContent = txt;
  if (color) t.style.color = color;
  animateEl(t, [
    { transform: `translate(${x}px,${y}px) translate(-50%,0) scale(.8)`, opacity: 0 },
    { transform: `translate(${x}px,${y - 14}px) translate(-50%,0) scale(1.1)`, opacity: 1, offset: 0.2 },
    { transform: `translate(${x}px,${y - 50}px) translate(-50%,0) scale(1)`, opacity: 0 },
  ], { duration: 950, easing: 'ease-out' });
}
/** Moedas voando até o contador do HUD. */
function flyCoins(x, y, n = 8) {
  const target = centerOf(el.coinIco);
  n = reducedMotion() ? 3 : n;
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'coin-ico fly-coin';
    const sx = x + (Math.random() - 0.5) * 60, sy = y + (Math.random() - 0.5) * 40;
    const a = animateEl(c, [
      { transform: `translate(${sx - 9}px,${sy - 9}px) scale(.6)`, opacity: 0 },
      { transform: `translate(${sx - 9}px,${sy - 30}px) scale(1)`, opacity: 1, offset: 0.25 },
      { transform: `translate(${target.x - 9}px,${target.y - 9}px) scale(.7)`, opacity: 1 },
    ], { duration: 650 + i * 45, easing: 'cubic-bezier(.5,0,.6,1)' });
    a.addEventListener('finish', () => { bumpCoins(); if (i % 3 === 0) Sfx.coin(); });
  }
}
let bumpAt = 0;
function bumpCoins() {
  const t = performance.now();
  if (t - bumpAt < 160) return;
  bumpAt = t;
  el.hudMoney.classList.remove('bump'); void el.hudMoney.offsetWidth; el.hudMoney.classList.add('bump');
}

/* =========================================================================
   10) AÇÕES DO JOGO
   ========================================================================= */
/** Registra um nível alcançado (popup de desbloqueio na 1ª vez). */
function reachLevel(L) {
  if (L > state.maxLevel) state.maxLevel = L;
  if (!state.unlocked.includes(L)) {
    state.unlocked.push(L);
    Bus.emit('unlock', L);
  }
}

function buyCar() {
  Sfx.init();
  const b = buyState();
  if (!b.free) {
    toast('Garagem cheia — junte carros iguais ou venda um.', 'warn');
    Sfx.error(); shake(el.btnBuy); Input.flashPairs(); return;
  }
  if (!b.afford) {
    const ips = incomePerSec(), missing = b.price - state.coins;
    toast(`Faltam ${fmt(missing)} moedas` + (ips > 0 ? ` (~${fmtLong(missing / ips)})` : ' — coloque carros na pista'), 'warn');
    Sfx.error(); shake(el.btnBuy); return;
  }
  const i = freeGarageIndex();
  state.coins -= b.price;
  state.buys[b.L] = (state.buys[b.L] || 0) + 1;
  state.stats.buys++;
  state.garage[i] = b.L;
  reachLevel(b.L);
  Input.clearSelection();
  renderGarage(); renderCell(i, 'new');
  Sfx.buy(); vibrate(8);
  renderHUD();
  Bus.emit('buy', b.L);
  saveState();
}
function shake(node) { node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake'); }

/** Entrega carros reservados (baú com garagem cheia) assim que houver vaga. */
function deliverReserve() {
  let delivered = 0;
  while (state.reserve.length) {
    const i = freeGarageIndex();
    if (i < 0) break;
    const L = state.reserve.shift();
    state.garage[i] = L;
    reachLevel(L);
    renderCell(i, 'new');
    delivered++;
  }
  if (delivered) toast(delivered > 1 ? `${delivered} carros da reserva chegaram!` : 'Carro da reserva chegou na garagem!', 'good');
  const n = state.reserve.length;
  el.reservePill.hidden = !n;
  if (n) el.reservePill.querySelector('span').textContent = `${n} na reserva`;
}

function canMerge(a, b) { return a && a === b && a < MAX_LEVEL; }

/** Lê/escreve um "endereço" de carro: {from:'garage'|'track', i} */
const getL = (s) => (s.from === 'garage' ? state.garage[s.i] : state.track[s.i]);
const setL = (s, v) => { if (s.from === 'garage') state.garage[s.i] = v; else state.track[s.i] = v; };
const nodeOf = (s) => (s.from === 'garage' ? cellEls[s.i] : chipEls[s.i]);
const sameSlot = (a, b) => !!(a && b && a.from && a.from === b.from && a.i === b.i);

/**
 * O que aconteceria soltando `src` em `tgt` (sem alterar nada).
 * Usado no rótulo durante o arraste e para executar a ação.
 */
function describeDrop(src, tgt) {
  const L = getL(src);
  if (!tgt || !L) return { kind: 'none' };
  if (tgt.type === 'trash') {
    if (totalCars() <= 1) return { kind: 'bad', text: 'ÚLTIMO CARRO' };
    return { kind: 'sell', text: 'VENDER +' + fmt(sellPrice(L)) };
  }
  if (tgt.type === 'track') {
    if (src.from === 'track') return { kind: 'none' };
    return freeTrackIndex() < 0 ? { kind: 'bad', text: 'PISTA LOTADA' } : { kind: 'track', text: 'PISTA' };
  }
  if (sameSlot(src, tgt)) return { kind: 'none' };
  if (tgt.from === 'garage' && tgt.i >= garageSlots()) return { kind: 'bad', text: 'BLOQUEADA' };
  if (tgt.from === 'track' && tgt.i >= trackSlots()) return { kind: 'bad', text: 'BLOQUEADA' };
  const T = getL(tgt);
  if (!T) return tgt.from === 'track' && src.from === 'garage' ? { kind: 'track', text: 'PISTA' } : { kind: 'move', text: 'MOVER' };
  if (canMerge(L, T)) return { kind: 'merge', text: `FUNDIR → Lv ${L + 1}` };
  return { kind: 'swap', text: L === T ? 'NÍVEL MÁXIMO' : 'TROCAR' };
}

/**
 * Executa a soltura. Retorna { ok, node } — node é onde o carro terminou
 * (para a animação do fantasma).
 */
function performDrop(src, tgt) {
  const L = getL(src);
  const d = describeDrop(src, tgt);
  if (!L || d.kind === 'none') return { ok: false };
  if (d.kind === 'bad') {
    Sfx.error();
    if (d.text === 'PISTA LOTADA') toast('Pista lotada! Amplie a pista em Upgrades.', 'warn');
    else if (d.text === 'ÚLTIMO CARRO') toast('Você precisa de pelo menos 1 carro.', 'warn');
    else toast('Vaga bloqueada — libere em Upgrades.', 'warn');
    return { ok: false };
  }

  if (d.kind === 'sell') {
    const isBest = L === state.maxLevel && countLevel(L) === 1 && L >= 4;
    const doSell = () => {
      if (getL(src) !== L) return;
      const v = sellPrice(L);
      setL(src, 0); addCoins(v); state.stats.sells++;
      if (src.from === 'track') Track.removeCar(src.i);
      const c = centerOf(el.trash);
      floatText(c.x, c.y - 30, '+' + fmt(v));
      flyCoins(c.x, c.y, 5);
      Sfx.sell(); vibrate(10);
      Bus.emit('sell', L);
      afterChange();
    };
    if (isBest) {
      Meta.confirm('Vender seu melhor carro?', `${carInfo(L).name} é o único Lv ${L} que você tem. A venda rende ${fmt(sellPrice(L))} moedas.`, 'VENDER', doSell);
      return { ok: false };
    }
    doSell();
    return { ok: true, node: el.trash };
  }

  let target = tgt;
  if (tgt.type === 'track') target = { from: 'track', i: freeTrackIndex() };
  const T = getL(target);

  if (d.kind === 'merge') {
    setL(src, 0);
    if (src.from === 'track') Track.removeCar(src.i);
    const nl = L + 1;
    setL(target, nl);
    state.stats.merges++;
    const node = nodeOf(target);
    reachLevel(nl);
    afterChange(target, 'pop');
    const { x, y } = centerOf(node);
    const info = carInfo(nl);
    burst(x, y, [info.acc, '#ffffff', '#00e5ff', '#ff7a00']);
    floatText(x, y - 20, 'Lv ' + nl + '!', info.tier === 2 ? '#7ff6ff' : '#ffcf3a');
    Sfx.merge(); vibrate([12, 30, 18]);
    Bus.emit('merge', nl);
    return { ok: true, node, merged: true };
  }
  // mover ou trocar
  setL(target, L); setL(src, T || 0);
  if (target.from === 'track') { Track.resetCar(target.i); Sfx.place(); Bus.emit('track', L); }
  else Sfx.click();
  if (src.from === 'track') { if (T) Track.resetCar(src.i); else Track.removeCar(src.i); }
  state.stats.bestTrack = Math.max(state.stats.bestTrack, carsOnTrack());
  afterChange(target, 'new');
  return { ok: true, node: nodeOf(target) };
}

function afterChange(target, anim) {
  deliverReserve();
  renderGarage(); renderPit();
  if (target && target.from === 'garage') renderCell(target.i, anim);
  if (target && target.from === 'track') chipEls[target.i].animate([{ transform: 'scale(1.5)' }, { transform: 'scale(1)' }], { duration: 350, easing: 'cubic-bezier(.2,1.6,.4,1)' });
  renderHUD();
  saveState();
}

function activateNitro() {
  Sfx.init();
  const t = now();
  if (t < state.nitroUntil) { toast(`Nitro ativo: ${Math.ceil((state.nitroUntil - t) / 1000)}s restantes`); return; }
  if (t < state.nitroReadyAt) { toast(`Nitro recarregando — pronto em ${fmtTime((state.nitroReadyAt - t) / 1000)}`); Sfx.error(); return; }
  if (!carsOnTrack()) { toast('Coloque um carro na pista primeiro!', 'warn'); Sfx.error(); return; }
  state.nitroUntil = t + CONFIG.nitro.duration * 1000;
  state.nitroReadyAt = state.nitroUntil + CONFIG.nitro.cooldown * 1000;
  state.stats.nitros++;
  Sfx.nitro(); vibrate([20, 40, 20]);
  const c = centerOf(el.btnNitro);
  burst(c.x, c.y, ['#00e5ff', '#ffffff', '#0077ff'], 20);
  Track.nitroKick();
  Bus.emit('nitro');
  saveState(); renderHUD();
}

function buyUpgrade(key) {
  const u = CONFIG.upgrades[key];
  if (state.upg[key] >= u.max) return false;
  const cost = upgradeCost(key);
  if (state.coins < cost) { Sfx.error(); return false; }
  state.coins -= cost;
  state.upg[key]++;
  Sfx.upgrade(); vibrate(10);
  deliverReserve();
  renderGarage(); renderPit(); renderHUD(); saveState();
  Bus.emit('upgrade', key);
  return true;
}

/* =========================================================================
   11) INTERAÇÃO — arrastar (toque/mouse) + tocar para selecionar
   ========================================================================= */
const Input = {
  sel: null,               // carro selecionado por toque {from, i}
  d: null,                 // arraste em andamento
  raf: 0,

  /** Converte o elemento tocado em um alvo do jogo. */
  resolve(node, x, y) {
    if (!node || !node.closest) return null;
    const cell = node.closest('.cell');
    if (cell && !cell.hidden) return { from: 'garage', i: +cell.dataset.i };
    const chip = node.closest('.chip');
    if (chip && chip.style.visibility !== 'hidden') return { from: 'track', i: +chip.dataset.t };
    if (node.closest('#trash')) return { type: 'trash' };
    if (node.closest('#trackWrap')) {
      const i = Track.hitTest(x, y);
      if (i >= 0) return { from: 'track', i };
      return { type: 'track' };
    }
    if (node.closest('#pit')) return { type: 'track' };
    return null;
  },

  bind() {
    el.game.addEventListener('pointerdown', (e) => this.down(e));
    // iOS: impede rolagem/zoom do navegador fora das listas roláveis
    document.addEventListener('touchmove', (e) => {
      if (this.d || !e.target.closest || !e.target.closest('.sheet-body, .modal-body, .range')) e.preventDefault();
    }, { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => { if (!e.target.closest || !e.target.closest('textarea, input')) e.preventDefault(); });
    window.addEventListener('blur', () => this.cancel());
  },

  down(e) {
    if (this.d || Meta.layerOpen() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const t = this.resolve(e.target, e.clientX, e.clientY);
    if (!t) return;
    Sfx.init();
    const lockedCell = t.from === 'garage' && t.i >= garageSlots();
    const lockedChip = t.from === 'track' && t.i >= trackSlots();
    if (t.type || lockedCell || lockedChip || !getL(t)) {
      // vaga vazia/bloqueada, lixeira ou pista: só interessa como toque
      const p = { t, x: e.clientX, y: e.clientY, pid: e.pointerId };
      const up = (ev) => {
        if (ev.pointerId !== p.pid) return;
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        if (ev.type === 'pointerup' && Math.hypot(ev.clientX - p.x, ev.clientY - p.y) < 14) this.tapEmpty(p.t, lockedCell || lockedChip);
      };
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      return;
    }
    e.preventDefault();
    this.d = {
      src: { from: t.from, i: t.i }, pid: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
      active: false, touch: e.pointerType !== 'mouse', ghost: null, tag: null, hot: null, targets: null,
    };
    window.addEventListener('pointermove', this.onMove, { passive: false });
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onCancel);
  },

  onMove: (e) => {
    const d = Input.d;
    if (!d || e.pointerId !== d.pid) return;
    if (e.cancelable) e.preventDefault();
    d.x = e.clientX; d.y = e.clientY;
    if (!d.active) {
      if (Math.hypot(d.x - d.x0, d.y - d.y0) < (d.touch ? 9 : 5)) return;
      Input.begin();
    }
    if (!Input.raf) Input.raf = requestAnimationFrame(() => { Input.raf = 0; Input.update(); });
  },

  onUp: (e) => {
    const d = Input.d;
    if (!d || e.pointerId !== d.pid) return;
    if (!d.active) { const src = d.src; Input.end(); Input.tapCar(src); return; }
    d.x = e.clientX; d.y = e.clientY;
    Input.update();
    const tgt = d.hot ? d.hot.t : null, src = d.src, ghost = d.ghost;
    d.ghost = null;                       // a animação final cuida do fantasma
    Input.end();
    const r = tgt ? performDrop(src, tgt) : { ok: false };
    Input.finishGhost(ghost, r.ok ? r.node : nodeOf(src), r.ok, r.ok ? null : src);
  },
  onCancel: (e) => { if (Input.d && (!e || e.pointerId === Input.d.pid)) Input.cancel(); },

  cancel() {
    const d = this.d;
    if (!d) return;
    const ghost = d.ghost, src = d.src;
    d.ghost = null;
    this.end();
    if (ghost) this.finishGhost(ghost, nodeOf(src), false, src);
  },

  begin() {
    const d = this.d, L = getL(d.src);
    d.active = true;
    this.clearSelection();
    // fantasma do tamanho da vaga, levantado acima do dedo no toque
    const ref = cellEls[0].getBoundingClientRect();
    const w = clamp(ref.width * 1.15, 96, 170), h = w / 2;
    d.gw = w; d.gh = h;
    d.lift = d.touch ? h * 0.75 + 16 : 0;
    const g = document.createElement('div');
    g.className = 'ghost';
    g.style.width = w + 'px'; g.style.height = h + 'px';
    g.innerHTML = `<img src="${carAsset(L).url}" alt=""><div class="ghost-tag" hidden></div>`;
    el.fx.appendChild(g);
    d.ghost = g; d.tag = g.querySelector('.ghost-tag');
    nodeOf(d.src).classList.add('dragging');
    if (d.src.from === 'track') Track.hidden = d.src.i;
    this.markMatches(L, d.src);
    this.collectTargets();
    Sfx.select(); vibrate(6);
  },

  /** Retângulos dos alvos calculados uma vez por arraste (sem reflow no movimento). */
  collectTargets() {
    const list = [];
    for (let i = 0; i < visibleCells(); i++) list.push({ t: { from: 'garage', i }, node: cellEls[i], r: cellEls[i].getBoundingClientRect() });
    for (let i = 0; i < chipEls.length; i++) if (chipEls[i].style.visibility !== 'hidden') list.push({ t: { from: 'track', i }, node: chipEls[i], r: chipEls[i].getBoundingClientRect() });
    list.push({ t: { type: 'trash' }, node: el.trash, r: el.trash.getBoundingClientRect() });
    this.d.targets = list;
    this.d.trackR = el.trackWrap.getBoundingClientRect();
    this.d.pitR = el.pit.getBoundingClientRect();
  },

  /** Alvo tolerante: dentro do retângulo (com folga) ou o centro mais próximo. */
  targetAt(x, y) {
    const d = this.d;
    let best = null, bd = Infinity;
    for (const o of d.targets) {
      const r = o.r, pad = 8;
      if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) {
        const dd = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
        if (dd < bd) { bd = dd; best = o; }
      }
    }
    if (best) return best;
    const inR = (r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    if (inR(d.trackR) || inR(d.pitR)) return { t: { type: 'track' }, node: el.trackWrap };
    // perto de uma vaga (um pouco fora): aceita a mais próxima
    for (const o of d.targets) {
      const r = o.r, dd = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (dd < Math.max(r.width, r.height) * 0.7 && dd < bd) { bd = dd; best = o; }
    }
    return best;
  },

  update() {
    const d = this.d;
    if (!d || !d.active || !d.ghost) return;
    const cx = d.x, cy = d.y - d.lift;
    d.ghost.style.transform = `translate(${cx - d.gw / 2}px, ${cy - d.gh / 2}px) rotate(-3deg)`;
    const hot = this.targetAt(cx, cy);
    const key = hot ? (hot.t.type || hot.t.from + hot.t.i) : '';
    if (key === d.hotKey) return;
    d.hotKey = key;
    if (d.hot) d.hot.node.classList.remove('hot', 'hot-bad', 'drop-ok', 'drop-bad');
    d.hot = hot;
    const desc = hot ? describeDrop(d.src, hot.t) : { kind: 'none' };
    if (hot) {
      if (hot.node === el.trackWrap) hot.node.classList.add(desc.kind === 'bad' ? 'drop-bad' : 'drop-ok');
      else if (desc.kind !== 'none') hot.node.classList.add(desc.kind === 'bad' ? 'hot-bad' : 'hot');
    }
    const tag = d.tag;
    if (desc.kind === 'none') { tag.hidden = true; return; }
    tag.hidden = false;
    tag.className = 'ghost-tag ' + ({ merge: 'merge', track: 'track', sell: 'sell', bad: 'bad' }[desc.kind] || '');
    const ic = { merge: 'up', track: 'road', sell: 'trash', bad: 'close', swap: 'swap', move: 'garage' }[desc.kind];
    tag.innerHTML = icon(ic) + desc.text;
    if (desc.kind === 'merge') vibrate(4);
  },

  /** Anima o fantasma até o destino (ok) ou de volta à origem (cancelado). */
  finishGhost(ghost, node, ok, srcBack) {
    if (!ghost) return;
    const tag = ghost.querySelector('.ghost-tag'); if (tag) tag.hidden = true;
    const r = node.getBoundingClientRect();
    const w = parseFloat(ghost.style.width), h = parseFloat(ghost.style.height);
    const to = `translate(${r.left + r.width / 2 - w / 2}px, ${r.top + r.height / 2 - h / 2}px)`;
    const from = ghost.style.transform || to;
    const backNode = srcBack ? nodeOf(srcBack) : null;
    if (backNode) backNode.classList.add('dragging');
    if (srcBack && srcBack.from === 'track') Track.hidden = srcBack.i;
    const a = ghost.animate(
      ok ? [{ transform: from, opacity: 1 }, { transform: to + ' scale(.55)', opacity: 0 }]
        : [{ transform: from, opacity: 1 }, { transform: to + ' scale(.85)', opacity: 0.9 }],
      { duration: ok ? 150 : 210, easing: ok ? 'ease-in' : 'cubic-bezier(.3,.8,.4,1)' });
    let finished = false;
    const done = () => {
      if (finished) return; finished = true;
      ghost.remove();
      if (backNode && !this.d) backNode.classList.remove('dragging');
      if (srcBack && !this.d) Track.hidden = -1;
    };
    a.onfinish = done; a.oncancel = done;
    setTimeout(done, 400);   // garantia: nunca deixa carro "preso" invisível
  },

  end() {
    const d = this.d;
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onCancel);
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    if (d) {
      if (d.ghost) d.ghost.remove();
      if (d.hot) d.hot.node.classList.remove('hot', 'hot-bad', 'drop-ok', 'drop-bad');
      nodeOf(d.src).classList.remove('dragging');
    }
    el.trackWrap.classList.remove('drop-ok', 'drop-bad');
    this.unmarkMatches();
    Track.hidden = -1;
    this.d = null;
  },

  markMatches(L, src) {
    if (L >= MAX_LEVEL) return;
    state.garage.forEach((v, i) => { if (v === L && i < garageSlots() && !(src.from === 'garage' && src.i === i)) cellEls[i].classList.add('match'); });
    state.track.forEach((v, i) => { if (v === L && i < trackSlots() && !(src.from === 'track' && src.i === i)) chipEls[i].classList.add('match'); });
  },
  unmarkMatches() { document.querySelectorAll('.match').forEach((n) => n.classList.remove('match')); },

  /** Pisca os pares possíveis (ex.: garagem cheia). */
  flashPairs() {
    const seen = {};
    state.garage.forEach((v, i) => { if (v && i < garageSlots()) (seen[v] = seen[v] || []).push(cellEls[i]); });
    Object.entries(seen).filter(([L, a]) => a.length > 1 && +L < MAX_LEVEL).forEach(([, a]) => a.forEach((n) => n.classList.add('match')));
    setTimeout(() => { if (!this.d && !this.sel) this.unmarkMatches(); }, 1400);
  },

  /* ---- modo "tocar para selecionar" (uma mão, sem arrastar) ---- */
  tapCar(src) {
    const L = getL(src);
    if (!L) return;
    if (this.sel && sameSlot(this.sel, src)) { this.clearSelection(); Sfx.click(); return; }
    if (this.sel) { this.applyTo(src); return; }
    this.sel = { from: src.from, i: src.i };
    this.refreshSelection();
    Sfx.select(); vibrate(5);
    const info = carInfo(L);
    toast(`${info.name} · ${fmt(incomePerLap(L))}/volta — toque no destino`);
    Bus.emit('select', src);
  },
  tapEmpty(t, locked) {
    if (this.sel) { this.applyTo(t); return; }
    if (locked) { Meta.openUpgrades(); return; }
    if (t.type === 'trash') { toast('Arraste um carro até aqui para vender.'); Sfx.click(); }
  },
  applyTo(tgt) {
    const src = this.sel;
    this.clearSelection();
    if (!src || !getL(src)) return;
    if (describeDrop(src, tgt).kind === 'none') return;
    // fantasma voando da origem ao destino (mesmo feedback do arraste)
    const L = getL(src), from = nodeOf(src).getBoundingClientRect();
    const r = performDrop(src, tgt);
    if (!r.ok) return;
    const w = clamp(from.width, 80, 150), h = w / 2;
    const g = document.createElement('div');
    g.className = 'ghost'; g.style.width = w + 'px'; g.style.height = h + 'px';
    g.style.transform = `translate(${from.left + from.width / 2 - w / 2}px, ${from.top + from.height / 2 - h / 2}px)`;
    g.innerHTML = `<img src="${carAsset(L).url}" alt="">`;
    el.fx.appendChild(g);
    this.finishGhost(g, r.node, true);
  },
  clearSelection() {
    if (!this.sel) return;
    this.sel = null;
    this.refreshSelection();
  },
  refreshSelection() {
    document.querySelectorAll('.selected').forEach((n) => n.classList.remove('selected'));
    if (this.d) return;
    this.unmarkMatches();
    if (!this.sel) return;
    const L = getL(this.sel);
    if (!L) { this.sel = null; return; }
    nodeOf(this.sel).classList.add('selected');
    this.markMatches(L, this.sel);
  },
};

/* =========================================================================
   12) PISTA — Canvas 2D (cidade noturna, asfalto molhado, carros correndo)
   ========================================================================= */
const Track = {
  ctx: null, w: 0, h: 0, dpr: 1,
  bg: null, glow: null,
  pts: [],
  prog: new Array(CONFIG.trackSlots.max).fill(0),
  sparks: [], floats: [], rain: [], lines: [], ripples: [],
  hidden: -1, positions: [], time: 0, ready: false,

  init() {
    this.ctx = el.canvas.getContext('2d', { alpha: false });
    for (let i = 0; i < this.prog.length; i++) this.prog[i] = i / this.prog.length;
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(el.trackWrap);
    this.resize(true);
    this.ready = true;
  },

  /** Coloca o carro no meio do maior espaço livre entre os outros. */
  resetCar(i) {
    const others = [];
    for (let k = 0; k < trackSlots(); k++) if (k !== i && state.track[k]) others.push(((this.prog[k] % 1) + 1) % 1);
    if (!others.length) { this.prog[i] = 0; return; }
    others.sort((a, b) => a - b);
    let best = 0, gap = -1;
    for (let k = 0; k < others.length; k++) {
      const a = others[k], b = k + 1 < others.length ? others[k + 1] : others[0] + 1;
      if (b - a > gap) { gap = b - a; best = a + gap / 2; }
    }
    this.prog[i] = best % 1;
  },
  removeCar(i) { this.positions[i] = null; },
  nitroKick() { if (!reducedMotion()) for (let i = 0; i < 18; i++) this.spawnLine(true); },

  resize(force) {
    const r = el.trackWrap.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, Q().dpr);
    if (!force && Math.abs(r.width - this.w) < 1 && Math.abs(r.height - this.h) < 1 && dpr === this.dpr) return;
    this.dpr = dpr;
    this.w = r.width; this.h = r.height;
    el.canvas.width = Math.round(this.w * dpr);
    el.canvas.height = Math.round(this.h * dpr);
    this.buildPath();
    this.buildBackground();
    this.rain = Array.from({ length: Q().rain }, () => ({ x: Math.random() * this.w, y: Math.random() * this.h, v: 380 + Math.random() * 220, l: 6 + Math.random() * 8 }));
    if (!this.glow) this.glow = this.makeGlow();
    if (this.ready) this.draw();
  },

  /** Sprite de farol (cone de luz) criado uma vez. */
  makeGlow() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(0, 32, 2, 0, 32, 120);
    gr.addColorStop(0, 'rgba(255,245,200,.55)'); gr.addColorStop(0.4, 'rgba(255,240,190,.18)'); gr.addColorStop(1, 'rgba(255,240,190,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, 26); g.lineTo(128, 0); g.lineTo(128, 64); g.lineTo(0, 38); g.closePath(); g.fill();
    return c;
  },

  /** Traçado: spline Catmull-Rom fechada com perspectiva. */
  buildPath() {
    const W = this.w, H = this.h;
    const wide = W / H > 1.9;   // pista mais larga quando há espaço (celular deitado / desktop)
    const base = wide
      ? [[0.08, 0.66], [0.11, 0.46], [0.27, 0.38], [0.46, 0.42], [0.60, 0.35], [0.78, 0.37], [0.90, 0.52], [0.87, 0.75], [0.70, 0.88], [0.50, 0.90], [0.30, 0.91], [0.13, 0.85]]
      : [[0.10, 0.70], [0.13, 0.52], [0.28, 0.44], [0.46, 0.47], [0.60, 0.42], [0.76, 0.43], [0.86, 0.55], [0.84, 0.74], [0.70, 0.86], [0.50, 0.88], [0.30, 0.89], [0.15, 0.84]];
    const ctrl = base.map(([x, y]) => [x * W, y * H]);
    const raw = [], n = ctrl.length, steps = 40;
    for (let i = 0; i < n; i++) {
      const p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
      for (let k = 0; k < steps; k++) {
        const t = k / steps, t2 = t * t, t3 = t2 * t;
        raw.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
        ]);
      }
    }
    const len = [0];
    for (let i = 1; i <= raw.length; i++) {
      const a = raw[i - 1], b = raw[i % raw.length];
      len.push(len[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    const total = len[len.length - 1], N = 360;
    this.pts = [];
    let j = 0;
    for (let k = 0; k < N; k++) {
      const dd = (k / N) * total;
      while (len[j + 1] < dd) j++;
      const a = raw[j], b = raw[(j + 1) % raw.length];
      const f = (dd - len[j]) / (len[j + 1] - len[j] || 1);
      this.pts.push({ x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f });
    }
    for (let k = 0; k < N; k++) {
      const p = this.pts[k], q = this.pts[(k + 1) % N], o = this.pts[(k - 1 + N) % N];
      p.a = Math.atan2(q.y - o.y, q.x - o.x);
      p.s = 0.62 + 0.55 * (p.y / H);
    }
  },

  roadWidth(p) { return Math.min(this.w, this.h * 1.6) * 0.085 * p.s; },

  /** Cenário pré-renderizado (céu, prédios, asfalto, postes) — só no resize. */
  buildBackground() {
    const W = this.w, H = this.h, d = this.dpr;
    const c = this.bg || (this.bg = document.createElement('canvas'));
    c.width = Math.round(W * d); c.height = Math.round(H * d);
    const g = c.getContext('2d');
    g.setTransform(d, 0, 0, d, 0, 0);
    const R = rng(1337);

    let gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#02030b'); gr.addColorStop(0.35, '#071443'); gr.addColorStop(0.5, '#0d2a6e'); gr.addColorStop(0.62, '#04081c'); gr.addColorStop(1, '#02040c');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff';
    for (let i = 0; i < 50; i++) { g.globalAlpha = 0.2 + R() * 0.6; g.fillRect(R() * W, R() * H * 0.3, 1, 1); }
    g.globalAlpha = 1;
    g.fillStyle = '#d9ecff'; g.shadowColor = '#9fd4ff'; g.shadowBlur = 20;
    g.beginPath(); g.arc(W * 0.18, H * 0.12, Math.max(6, H * 0.04), 0, Math.PI * 2); g.fill();
    g.shadowBlur = 0;
    gr = g.createRadialGradient(W * 0.5, H * 0.42, 10, W * 0.5, H * 0.42, W * 0.7);
    gr.addColorStop(0, 'rgba(0,180,255,.35)'); gr.addColorStop(0.5, 'rgba(255,90,0,.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H * 0.6);

    let minY = Infinity;
    for (const p of this.pts) minY = Math.min(minY, p.y);
    const horizon = minY - this.roadWidth(this.pts[0]) * 0.6;
    const layer = (hMin, hMax, wMin, wMax, col, winA) => {
      let x = -10;
      while (x < W + 10) {
        const bw = wMin + R() * (wMax - wMin), bh = hMin + R() * (hMax - hMin);
        g.fillStyle = col; g.fillRect(x, horizon - bh, bw, bh + 4);
        if (R() < 0.3) g.fillRect(x + bw * 0.4, horizon - bh - 8, 2, 8);
        for (let wy = horizon - bh + 4; wy < horizon - 3; wy += 5) {
          for (let wx = x + 3; wx < x + bw - 3; wx += 4) {
            if (R() < winA) { g.fillStyle = R() < 0.8 ? 'rgba(255,214,120,.85)' : 'rgba(120,230,255,.9)'; g.fillRect(wx, wy, 2, 2); }
          }
        }
        if (R() < 0.2 && bh > hMin + 6) {
          const nc = ['#ff2bd6', '#00e5ff', '#ff7a00', '#7cff4f'][Math.floor(R() * 4)];
          g.shadowColor = nc; g.shadowBlur = 10; g.fillStyle = nc;
          g.fillRect(x + 2, horizon - bh + 6, Math.max(4, bw - 6), 3);
          g.shadowBlur = 0;
        }
        x += bw + 1 + R() * 3;
      }
    };
    layer(H * 0.12, H * 0.30, 14, 30, '#0a1538', 0.12);
    layer(H * 0.06, H * 0.20, 18, 40, '#050b22', 0.22);

    gr = g.createLinearGradient(0, horizon, 0, H);
    gr.addColorStop(0, '#060b1d'); gr.addColorStop(1, '#0a0f22');
    g.fillStyle = gr; g.fillRect(0, horizon, W, H - horizon);
    gr = g.createLinearGradient(0, horizon, 0, horizon + H * 0.15);
    gr.addColorStop(0, 'rgba(0,160,255,.22)'); gr.addColorStop(1, 'rgba(0,160,255,0)');
    g.fillStyle = gr; g.fillRect(0, horizon, W, H * 0.15);

    const P = this.pts, N = P.length;
    const edge = (off) => P.map((p) => { const w = this.roadWidth(p) * off; return [p.x + Math.cos(p.a + Math.PI / 2) * w, p.y + Math.sin(p.a + Math.PI / 2) * w]; });
    const outer = edge(1), inner = edge(-1), outer2 = edge(1.25), inner2 = edge(-1.25);
    const poly = (arr) => { g.moveTo(arr[0][0], arr[0][1]); for (let i = 1; i < arr.length; i++) g.lineTo(arr[i][0], arr[i][1]); g.closePath(); };

    g.beginPath(); poly(outer2); poly(inner2); g.fillStyle = '#1a2246'; g.fill('evenodd');
    g.beginPath(); poly(outer); poly(inner);
    gr = g.createLinearGradient(0, H * 0.4, 0, H);
    gr.addColorStop(0, '#141a30'); gr.addColorStop(1, '#1d2440');
    g.fillStyle = gr; g.fill('evenodd');
    // poças refletindo neon no asfalto molhado
    g.save(); g.beginPath(); poly(outer); poly(inner); g.clip('evenodd');
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const p = P[Math.floor(R() * N)], rr = (14 + R() * 26) * p.s;
      const col = ['0,229,255', '255,43,214', '255,122,0'][i % 3];
      g.save(); g.translate(p.x, p.y); g.scale(1.8, 0.6);
      const pg = g.createRadialGradient(0, 0, 1, 0, 0, rr);
      pg.addColorStop(0, `rgba(${col},.2)`); pg.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = pg; g.beginPath(); g.arc(0, 0, rr, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    g.restore();
    for (let i = 0; i < N; i += 6) {
      const k = (i + 3) % N;
      if (Math.abs(Math.sin(P[k].a - P[i].a)) < 0.06) continue;
      g.fillStyle = (i / 6) % 2 ? '#e8e8f0' : '#e0193c';
      for (const [a, b] of [[outer, outer2], [inner, inner2]]) {
        g.beginPath();
        g.moveTo(a[i][0], a[i][1]); g.lineTo(a[k][0], a[k][1]);
        g.lineTo(a[k][0] + (b[k][0] - a[k][0]) * 0.5, a[k][1] + (b[k][1] - a[k][1]) * 0.5);
        g.lineTo(a[i][0] + (b[i][0] - a[i][0]) * 0.5, a[i][1] + (b[i][1] - a[i][1]) * 0.5);
        g.fill();
      }
    }
    g.strokeStyle = 'rgba(230,240,255,.75)'; g.lineWidth = 1.2;
    g.beginPath(); poly(outer); g.stroke();
    g.beginPath(); poly(inner); g.stroke();
    g.setLineDash([8, 10]); g.strokeStyle = 'rgba(255,207,58,.7)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(P[0].x, P[0].y); for (let i = 1; i < N; i++) g.lineTo(P[i].x, P[i].y); g.closePath(); g.stroke();
    g.setLineDash([]);
    {
      const p = P[0], w = this.roadWidth(p), nx = Math.cos(p.a + Math.PI / 2), ny = Math.sin(p.a + Math.PI / 2);
      const tx = Math.cos(p.a), ty = Math.sin(p.a), sq = (2 * w) / 6;
      for (let r = 0; r < 2; r++) for (let q = 0; q < 6; q++) {
        g.fillStyle = (r + q) % 2 ? '#fff' : '#111';
        const ox = p.x + nx * (-w + q * sq) + tx * r * sq, oy = p.y + ny * (-w + q * sq) + ty * r * sq;
        g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + nx * sq, oy + ny * sq); g.lineTo(ox + nx * sq + tx * sq, oy + ny * sq + ty * sq); g.lineTo(ox + tx * sq, oy + ty * sq); g.fill();
      }
    }
    // postes do lado de fora (a pista roda no sentido horário)
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i += 30) {
      const p = P[i], [ox, oy] = inner2[i], hgt = 26 * p.s, colr = i % 60 ? '255,190,90' : '120,220,255';
      g.save(); g.translate(ox, oy + 4); g.scale(0.6, 1.6);
      const rg = g.createRadialGradient(0, 0, 1, 0, 0, 28 * p.s);
      rg.addColorStop(0, `rgba(${colr},.35)`); rg.addColorStop(1, `rgba(${colr},0)`);
      g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 28 * p.s, 0, Math.PI * 2); g.fill(); g.restore();
      const hg = g.createRadialGradient(ox, oy - hgt, 1, ox, oy - hgt, 18 * p.s);
      hg.addColorStop(0, `rgba(${colr},.9)`); hg.addColorStop(1, `rgba(${colr},0)`);
      g.fillStyle = hg; g.beginPath(); g.arc(ox, oy - hgt, 18 * p.s, 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < N; i += 30) {
      const p = P[i], [ox, oy] = inner2[i], hgt = 26 * p.s;
      g.strokeStyle = '#2a3560'; g.lineWidth = 1.5 * p.s;
      g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox, oy - hgt); g.stroke();
      g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(ox, oy - hgt, 1.8 * p.s, 0, Math.PI * 2); g.fill();
    }
  },

  at(prog) {
    const N = this.pts.length, f = (((prog % 1) + 1) % 1) * N, i = Math.floor(f), k = f - i;
    const a = this.pts[i % N], b = this.pts[(i + 1) % N];
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, a: a.a, s: a.s + (b.s - a.s) * k };
  },

  carWidth() { return clamp(Math.min(this.w * 0.15, this.h * 0.36), 40, 92); },

  spawnLine(burstMode) {
    if (this.lines.length > 40) return;
    this.lines.push({ y: Math.random() * this.h, x: burstMode ? Math.random() * this.w : this.w + 20, v: 900 + Math.random() * 700, l: 30 + Math.random() * 60, a: 0.15 + Math.random() * 0.35 });
  },

  update(dt) {
    if (!this.pts.length) return;
    this.time += dt;
    const nitro = nitroOn(), mult = nitro ? CONFIG.nitro.mult : 1, q = Q();
    const n = trackSlots();
    for (let i = 0; i < n; i++) {
      const L = state.track[i];
      if (!L) continue;
      this.prog[i] += (dt / lapTime(L)) * mult;
      if (this.prog[i] >= 1) {
        this.prog[i] -= 1;
        const gain = incomePerLap(L);
        addCoins(gain);
        state.stats.laps++;
        const p = this.at(this.prog[i]);
        if (this.floats.length < 24) this.floats.push({ x: p.x, y: p.y - 22 * p.s, t: 0, txt: '+' + fmt(gain) });
        Sfx.coin(); bumpCoins();
        Bus.emit('lap', gain);
      }
      if (nitro && this.sparks.length < q.sparks && Math.random() < 0.7) {
        const p = this.at(this.prog[i]), back = p.a + Math.PI, cw = this.carWidth() * p.s * 0.5;
        this.sparks.push({
          x: p.x + Math.cos(back) * cw, y: p.y - 5 * p.s + Math.sin(back) * cw,
          vx: Math.cos(back + (Math.random() - 0.5)) * (60 + Math.random() * 80), vy: Math.sin(back + (Math.random() - 0.5)) * 60 - 20,
          t: 0, life: 0.25 + Math.random() * 0.3, c: Math.random() < 0.5 ? '#00e5ff' : '#ffb300',
        });
      }
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 200 * dt;
      if (s.t >= s.life) { this.sparks[i] = this.sparks[this.sparks.length - 1]; this.sparks.pop(); }
    }
    for (let i = this.floats.length - 1; i >= 0; i--) { this.floats[i].t += dt; if (this.floats[i].t > 1.1) this.floats.splice(i, 1); }
    for (const r of this.rain) { r.y += r.v * dt; r.x -= r.v * 0.15 * dt; if (r.y > this.h) { r.y = -10; r.x = Math.random() * (this.w + 40); } }
    if (nitro && !reducedMotion() && Math.random() < 0.6) this.spawnLine(false);
    for (let i = this.lines.length - 1; i >= 0; i--) { const l = this.lines[i]; l.x -= l.v * dt; if (l.x + l.l < 0) this.lines.splice(i, 1); }
    if (q.rain >= 40 && Math.random() < dt * 6 && this.ripples.length < 8) {
      const p = this.at(Math.random()), rw = this.roadWidth(p);
      this.ripples.push({ x: p.x + (Math.random() - 0.5) * rw, y: p.y + (Math.random() - 0.5) * rw * 0.6, t: 0, s: p.s });
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) { this.ripples[i].t += dt; if (this.ripples[i].t > 0.6) this.ripples.splice(i, 1); }
  },

  draw() {
    const g = this.ctx;
    if (!g || !this.bg || !this.pts.length) return;
    const d = this.dpr, q = Q();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.bg, 0, 0);
    g.setTransform(d, 0, 0, d, 0, 0);

    const n = trackSlots(), cw = this.carWidth(), nitro = nitroOn();
    const list = [];
    for (let i = 0; i < CONFIG.trackSlots.max; i++) {
      if (i >= n || !state.track[i] || i === this.hidden) { this.positions[i] = null; continue; }
      list.push({ i, p: this.at(this.prog[i]), L: state.track[i] });
    }
    list.sort((a, b) => a.p.y - b.p.y);

    g.globalCompositeOperation = 'lighter';
    if (this.ripples.length) {
      g.strokeStyle = 'rgba(160,210,255,.35)'; g.lineWidth = 1;
      for (const r of this.ripples) {
        g.globalAlpha = 1 - r.t / 0.6;
        g.beginPath(); g.ellipse(r.x, r.y, (2 + r.t * 14) * r.s, (1 + r.t * 5) * r.s, 0, 0, Math.PI * 2); g.stroke();
      }
      g.globalAlpha = 1;
    }
    // rastros de luz
    g.lineCap = 'round';
    for (const c of list) {
      const info = carInfo(c.L);
      const trail = nitro ? 0.13 : 0.05 + c.L * 0.0012, segs = 7;
      g.strokeStyle = nitro ? '#00e5ff' : info.trail;
      for (let k = 0; k < segs; k++) {
        const p0 = this.at(this.prog[c.i] - (trail * k) / segs - 0.004);
        const p1 = this.at(this.prog[c.i] - (trail * (k + 1)) / segs - 0.004);
        g.globalAlpha = (1 - k / segs) * 0.55;
        g.lineWidth = (nitro ? 5 : 3) * p0.s;
        g.beginPath(); g.moveTo(p0.x, p0.y - 5 * p0.s); g.lineTo(p1.x, p1.y - 5 * p1.s); g.stroke();
      }
    }
    g.globalAlpha = 1;
    // faróis (cone de luz à frente do carro)
    if (q.lights && this.glow) {
      g.globalAlpha = 0.55;
      for (const c of list) {
        const { p } = c, w = cw * p.s;
        g.save(); g.translate(p.x, p.y - 4 * p.s); g.rotate(p.a);
        g.drawImage(this.glow, w * 0.38, -w * 0.25, w * 1.1, w * 0.5);
        g.restore();
      }
      g.globalAlpha = 1;
    }
    for (const s of this.sparks) { g.fillStyle = s.c; g.globalAlpha = 1 - s.t / s.life; g.fillRect(s.x - 1, s.y - 1, 2.4, 2.4); }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';

    // carros
    const rm = reducedMotion();
    for (const c of list) {
      const { p } = c, bmp = carBitmap(c.L);
      const w = cw * p.s, h = w / 2;
      const left = Math.cos(p.a) < 0;
      let ang = left ? p.a - Math.PI : p.a;
      ang = clamp(Math.atan2(Math.sin(ang), Math.cos(ang)), -0.6, 0.6);
      const bob = rm ? 0 : Math.sin(this.time * 22 + c.i * 1.7) * 0.4 * p.s;
      g.save();
      g.translate(p.x, p.y + 2 * p.s);
      g.rotate(ang);
      if (left) g.scale(-1, 1);
      if (bmp) {
        if (q.reflect) {   // reflexo no asfalto molhado
          g.save(); g.scale(1, -0.55); g.globalAlpha = 0.16;
          g.drawImage(bmp, -w / 2, -h * 0.25, w, h);
          g.restore();
        }
        g.drawImage(bmp, -w / 2, -h * 0.9 + bob, w, h);
        if (q.wheels) this.drawWheels(g, c.L, w, h, bob, nitro);
      }
      g.restore();
      this.positions[c.i] = { x: p.x, y: p.y - h * 0.4, r: Math.max(w * 0.55, 22) };
    }

    if (this.lines.length) {
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#bff8ff'; g.lineWidth = 1.2;
      for (const l of this.lines) { g.globalAlpha = l.a; g.beginPath(); g.moveTo(l.x, l.y); g.lineTo(l.x + l.l, l.y); g.stroke(); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    if (this.rain.length) {
      g.strokeStyle = 'rgba(160,200,255,.18)'; g.lineWidth = 1;
      g.beginPath();
      for (const r of this.rain) { g.moveTo(r.x, r.y); g.lineTo(r.x - r.l * 0.15, r.y + r.l); }
      g.stroke();
    }
    if (this.floats.length) {
      g.font = '14px "Russo One", Impact, sans-serif'; g.textAlign = 'center';
      g.lineWidth = 3; g.strokeStyle = '#000'; g.fillStyle = '#ffcf3a';
      for (const f of this.floats) {
        g.globalAlpha = 1 - f.t / 1.1;
        const y = f.y - f.t * 26;
        g.strokeText(f.txt, f.x, y); g.fillText(f.txt, f.x, y);
      }
      g.globalAlpha = 1;
    }
  },

  /** Raios girando sobre as rodas desenhadas (coordenadas do SVG 160x80). */
  drawWheels(g, L, w, h, bob, nitro) {
    const info = carInfo(L), sh = info.model.shape;
    const wr = sh.wheels[2] * (1 + 0.07 * info.tier);
    const sx = w / 160, sy = h / 80, cy = -h * 0.9 + bob + (70 - wr) * sy;
    const rot = this.time * (nitro ? 36 : 18) * (1 + L * 0.02);
    g.strokeStyle = 'rgba(20,22,30,.7)'; g.lineWidth = Math.max(1, wr * sx * 0.22);
    g.beginPath();
    for (const wx of [sh.wheels[0], sh.wheels[1]]) {
      const cx = -w / 2 + wx * sx, rr = wr * sx * 0.62;
      for (let k = 0; k < 2; k++) {
        const a = rot + k * Math.PI / 2;
        g.moveTo(cx - Math.cos(a) * rr, cy - Math.sin(a) * rr);
        g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
    }
    g.stroke();
  },

  hitTest(cx, cy) {
    const r = el.canvas.getBoundingClientRect();
    const x = cx - r.left, y = cy - r.top;
    let best = -1, bd = Infinity;
    this.positions.forEach((p, i) => {
      if (!p) return;
      const dd = Math.hypot(p.x - x, p.y - y);
      if (dd < p.r * 1.15 && dd < bd) { bd = dd; best = i; }
    });
    return best;
  },
};

/* =========================================================================
   13) CICLO DE VIDA — offline, background, várias abas
   ========================================================================= */
/**
 * Credita o tempo fora (máx. 2h) e grava na hora — fechar o popup,
 * trocar de app ou recarregar não duplica o ganho.
 */
function applyOffline(fromTs) {
  const t = now();
  const secsRaw = (t - fromTs) / 1000;
  if (!(secsRaw > 0)) { state.lastSeen = t; return 0; }      // relógio voltou: ignora
  const secs = Math.min(secsRaw, CONFIG.offline.maxSeconds);
  if (secs < CONFIG.offline.minSeconds) return 0;
  const ips = incomePerSec(false);
  const earned = ips * secs * CONFIG.offline.rate;
  if (earned < 1) { saveState(); return 0; }
  addCoins(earned);
  saveState();
  Meta.offlineReward(earned, secs, secsRaw, ips);
  return earned;
}

let lastFrame = 0, hudAcc = 0, saveAcc = 0, running = false, gameStarted = false;

function frame(ts) {
  if (!running) return;
  const dt = Math.min((ts - (lastFrame || ts)) / 1000, 0.1);
  lastFrame = ts;
  Track.update(dt);
  Track.draw();
  Perf.tick(dt);
  hudAcc += dt; saveAcc += dt * 1000;
  if (hudAcc > 0.15) { hudAcc = 0; renderHUD(); }
  if (saveAcc > CONFIG.autosaveMs) { saveAcc = 0; saveState(); }
  requestAnimationFrame(frame);
}
function startLoop() {
  if (running || frozen || !gameStarted || document.hidden) return;
  running = true; lastFrame = 0;
  requestAnimationFrame(frame);
}
function stopLoop() { running = false; }

function onHide() {
  if (!gameStarted) return;
  Input.cancel();
  stopLoop();
  saveState();
  AudioSys.suspend();
}
function onShow() {
  if (!gameStarted || frozen) return;
  applyOffline(state.lastSeen);
  renderGarage(); renderPit(); renderHUD();
  startLoop();
  AudioSys.resume();
  Meta.checkForUpdate();
}
document.addEventListener('visibilitychange', () => (document.hidden ? onHide() : onShow()));
window.addEventListener('pagehide', () => saveState());
window.addEventListener('pageshow', (e) => { if (e.persisted && !document.hidden) onShow(); });
document.addEventListener('freeze', () => saveState());   // Chrome Android: aba congelada
// iOS: o áudio volta "interrompido" após ligação/troca de app — retoma no próximo toque
window.addEventListener('pointerdown', () => { if (gameStarted && AudioSys.ctx && AudioSys.ctx.state !== 'running' && !document.hidden) AudioSys.unlock(); }, { passive: true });

/* Outra aba salvou por cima: esta para de jogar (um save não sobrescreve o outro). */
window.addEventListener('storage', (e) => {
  if (e.key !== CONFIG.saveKey || !e.newValue || frozen) return;
  frozen = true;
  stopLoop();
  Input.cancel();
  AudioSys.suspend();
  el.banner.innerHTML = `<p>O jogo foi aberto em outra aba ou janela. Esta foi pausada para não perder progresso.</p><button class="btn btn-cyan btn-sm" id="bannerReload">${icon('refresh')}Jogar aqui</button>`;
  el.banner.hidden = false;
  $('#bannerReload').onclick = () => location.reload();
});

/* =========================================================================
   14) GRAFFITI (respingos e escorridos gerados por código)
   ========================================================================= */
function paintTag(tagEl, seed, intensity) {
  const R = rng(seed);
  const box = tagEl.getBoundingClientRect();
  const W = box.width || 300, H = box.height || 100;
  const drips = tagEl.querySelector('.drips'), spl = tagEl.querySelector('.splatter');
  drips.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let d = '';
  for (let i = 0; i < Math.round(6 * intensity); i++) {
    const x = W * (0.15 + R() * 0.75), y0 = H * (0.55 + R() * 0.25), len = H * (0.2 + R() * 0.6) * intensity;
    const w = 2 + R() * 3, col = R() < 0.6 ? '#00e5ff' : '#ff7a00';
    d += `<path d="M${x - w} ${y0} L${x - w * 0.6} ${y0 + len} Q${x} ${y0 + len + w * 2.2} ${x + w * 0.6} ${y0 + len} L${x + w} ${y0} Z" fill="${col}" opacity=".85"/>`;
    d += `<circle cx="${x}" cy="${y0 + len + w * 0.9}" r="${w * 0.9}" fill="${col}" opacity=".85"/>`;
  }
  drips.innerHTML = d;
  spl.setAttribute('viewBox', '0 0 100 100');
  spl.setAttribute('preserveAspectRatio', 'none');
  let s = '';
  for (let i = 0; i < 60 * intensity; i++) {
    const a = R() * Math.PI * 2, r = 30 + R() * 22;
    const col = ['#00e5ff', '#ff7a00', '#ffffff', '#0077ff'][Math.floor(R() * 4)];
    s += `<circle cx="${50 + Math.cos(a) * r}" cy="${50 + Math.sin(a) * r * 0.8}" r="${0.2 + R() * 1.1}" fill="${col}" opacity="${0.3 + R() * 0.5}"/>`;
  }
  spl.innerHTML = s;
}

/* =========================================================================
   15) INICIALIZAÇÃO (chamada no fim de meta.js)
   ========================================================================= */
function preloadImages(levels, timeoutMs) {
  const loads = levels.map((L) => new Promise((res) => {
    const img = carAsset(L).img;
    carBitmap(L);
    if (img.complete && img.naturalWidth) return res();
    img.addEventListener('load', res, { once: true });
    img.addEventListener('error', res, { once: true });
  }));
  const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  return Promise.race([Promise.all([...loads, fonts]), new Promise((r) => setTimeout(r, timeoutMs))]);
}

function init() {
  buildGrid();
  Input.bind();
  AudioSys.settings = { muted: state.settings.muted, music: state.settings.music, sfx: state.settings.sfx };
  document.body.classList.toggle('rm', reducedMotion());
  document.body.classList.toggle('q-low', qualityName() === 'low');

  el.btnBuy.addEventListener('click', buyCar);
  el.btnNitro.addEventListener('click', activateNitro);
  el.hudLevel.addEventListener('click', () => { Sfx.init(); Meta.openCollection(); });
  el.btnSettings.addEventListener('click', () => { Sfx.init(); Meta.openSettings(); });
  el.reservePill.addEventListener('click', () => toast('Carros do baú esperando vaga: junte ou venda um carro para liberar espaço.'));

  const showL = state.unlocked[Math.floor(Math.random() * state.unlocked.length)] || 1;
  $('#splashCar').src = carAsset(Math.max(showL, 3)).url;
  const paint = () => paintTag($('#splashTag'), 7, 1);
  paint();

  // Pré-carrega os carros do jogador (SVGs locais: rápido). Sem espera artificial.
  const owned = [...new Set([...state.garage, ...state.track, buyLevel(), Math.max(showL, 3)].filter(Boolean))];
  preloadImages(owned, 1500).then(() => {
    paint();
    $('#btnStart').disabled = false;
    $('#startLabel').textContent = state.stats.laps > 0 || state.maxLevel > 1 ? 'CONTINUAR' : 'ACELERAR';
    $('#splashHint').textContent = 'Toque para começar';
  });

  const start = () => {
    if (gameStarted || $('#btnStart').disabled) return;
    gameStarted = true;
    AudioSys.unlock(); Sfx.nitro();
    el.splash.classList.add('leaving');
    el.game.hidden = false;
    Track.init();
    renderGarage(); renderPit(); deliverReserve(); renderHUD();
    paintTag($('#miniTag'), 11, 0.5);
    applyOffline(state.lastSeen);
    startLoop();
    setTimeout(() => { el.splash.hidden = true; Meta.afterStart(); }, 360);
  };
  el.splash.addEventListener('click', start);
  window.addEventListener('keydown', (e) => { if (!gameStarted && (e.key === 'Enter' || e.key === ' ')) start(); });
  window.addEventListener('resize', () => { if (gameStarted) { Track.resize(); Meta.reposition(); } });
}

// Ganchos para depuração/testes no console
window.PF = { state: () => state, CONFIG, incomePerSec, buyPrice, buyLevel, performDrop, describeDrop, Track, Input, Perf, applyOffline, migrateState, saveState, getL };
