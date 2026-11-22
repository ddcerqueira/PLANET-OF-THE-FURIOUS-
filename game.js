/* =========================================================================
   PLANET OF THE FURIOUS — game.js
   Motor do jogo: estado, economia, garagem (DOM), pista (Canvas 2D),
   arrastar e soltar, popups, áudio sintetizado e ganho offline.
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
    garage:   { name: 'Garagem maior',  icon: '🅿️', base: 120,  growth: 3.1, max: 8,  desc: '+1 vaga na garagem' },
    track:    { name: 'Pista ampliada', icon: '🏁', base: 80,   growth: 4.2, max: 7,  desc: '+1 vaga na pista' },
    income:   { name: 'Patrocínio',     icon: '💰', base: 250,  growth: 2.15, max: 40, desc: '+10% de renda', per: 0.10 },
    discount: { name: 'Desconto VIP',   icon: '🏷️', base: 400,  growth: 2.5, max: 16, desc: '−2,5% no preço dos carros', per: 0.025 },
  },

  nitro: { mult: 2, duration: 30, cooldown: 90 },   // segundos
  chest: { interval: 24 * 3600, incomeSeconds: 600, minCoins: 100 },
  offline: { maxSeconds: 2 * 3600, rate: 1.0, minSeconds: 20 },

  saveKey: 'potf_save_v1',
  autosaveMs: 5000,
};

/* =========================================================================
   2) UTILIDADES
   ========================================================================= */
const $ = (sel) => document.querySelector(sel);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const now = () => Date.now();
const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

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
function chapBadge(chapter, big) {
  // Cor própria por capítulo (gira o matiz entre laranja e ciano)
  const hue = (20 + (chapter - 1) * 33) % 360;
  return `<span class="chap${big ? ' big' : ''}" style="--c1:hsl(${hue} 95% 58%);--c2:hsl(${hue} 90% 30%)">${chapter}</span>`;
}
/** Gerador pseudoaleatório com semente (cenário sempre igual). */
function rng(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

/* =========================================================================
   3) ÁUDIO — efeitos sintetizados com Web Audio API
   ========================================================================= */
const Sfx = {
  ctx: null, master: null, lastCoin: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
  },
  get on() { return this.ctx && !state.muted; },
  tone(freq, dur, type = 'square', vol = 0.3, slideTo = null, delay = 0) {
    if (!this.on) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol = 0.2, freq = 1200, delay = 0) {
    if (!this.on) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  },
  buy()     { this.tone(440, 0.08, 'square', 0.2); this.tone(880, 0.12, 'square', 0.2, null, 0.07); },
  merge()   { this.tone(220, 0.25, 'sawtooth', 0.18, 880); this.tone(660, 0.15, 'triangle', 0.25, null, 0.18); this.tone(990, 0.25, 'triangle', 0.22, null, 0.26); this.noise(0.25, 0.12, 3000); },
  coin()    { const t = performance.now(); if (t - this.lastCoin < 110) return; this.lastCoin = t; this.tone(1320, 0.06, 'square', 0.08); this.tone(1980, 0.1, 'square', 0.07, null, 0.05); },
  unlock()  { [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.25, null, i * 0.09)); this.noise(0.6, 0.08, 6000, 0.3); },
  sell()    { this.tone(600, 0.15, 'square', 0.18, 200); },
  error()   { this.tone(140, 0.18, 'sawtooth', 0.2); },
  click()   { this.tone(700, 0.04, 'square', 0.12); },
  place()   { this.tone(180, 0.2, 'sawtooth', 0.15, 520); this.noise(0.2, 0.08, 800); },
  nitro()   { this.noise(0.8, 0.25, 900); this.tone(120, 0.8, 'sawtooth', 0.2, 900); },
  chest()   { this.noise(0.3, 0.15, 400); [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.18, 'square', 0.15, null, 0.25 + i * 0.08)); },
  upgrade() { this.tone(330, 0.1, 'square', 0.18, 660); this.tone(660, 0.18, 'triangle', 0.2, 1320, 0.1); },
};

function vibrate(ms) { if (state.vibrate && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { /* ignora */ } }

/* =========================================================================
   4) ESTADO + SALVAMENTO
   ========================================================================= */
function defaultState() {
  const garage = new Array(CONFIG.garage.max).fill(0);
  CONFIG.startCars.forEach((lv, i) => { garage[i] = lv; });
  return {
    v: 1,
    coins: CONFIG.startCoins,
    garage,
    track: new Array(CONFIG.trackSlots.max).fill(0),
    upg: { garage: 0, track: 0, income: 0, discount: 0 },
    buys: {},                 // compras por nível (para o preço crescente)
    maxLevel: 1,
    unlocked: [1],            // níveis já vistos (coleção)
    nitroUntil: 0, nitroReadyAt: 0,
    chestAt: 0,               // próximo baú disponível (timestamp)
    muted: false, vibrate: true,
    lastSeen: now(),
    totalEarned: 0, merges: 0,
  };
}

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    if (!raw) return defaultState();
    const s = Object.assign(defaultState(), JSON.parse(raw));
    // Normaliza arrays caso a configuração tenha mudado
    s.garage = Array.from({ length: CONFIG.garage.max }, (_, i) => clamp(s.garage[i] | 0, 0, MAX_LEVEL));
    s.track = Array.from({ length: CONFIG.trackSlots.max }, (_, i) => clamp(s.track[i] | 0, 0, MAX_LEVEL));
    s.upg = Object.assign({ garage: 0, track: 0, income: 0, discount: 0 }, s.upg);
    if (!Array.isArray(s.unlocked)) s.unlocked = [1];
    if (!isFinite(s.coins)) s.coins = 0;
    return s;
  } catch (e) {
    console.warn('Save inválido, começando do zero', e);
    return defaultState();
  }
}
function saveState() {
  state.lastSeen = now();
  try { localStorage.setItem(CONFIG.saveKey, JSON.stringify(state)); } catch (e) { /* armazenamento cheio/privado */ }
}

/* =========================================================================
   5) ECONOMIA
   ========================================================================= */
const garageSlots = () => CONFIG.garage.start + state.upg.garage;
const trackSlots = () => CONFIG.trackSlots.start + state.upg.track;
const incomeMult = () => 1 + state.upg.income * CONFIG.upgrades.income.per;
const discount = () => state.upg.discount * CONFIG.upgrades.discount.per;
const nitroOn = () => now() < state.nitroUntil;

const buyLevel = () => Math.max(1, state.maxLevel - CONFIG.buy.levelGap);
const baseCost = (L) => CONFIG.buy.base * Math.pow(CONFIG.buy.levelMult, L - 1);
const buyPrice = (L) => Math.ceil(baseCost(L) * Math.pow(CONFIG.buy.growth, state.buys[L] || 0) * (1 - discount()));
const sellPrice = (L) => Math.max(1, Math.floor(baseCost(L) * CONFIG.sell.rate));
const lapTime = (L) => CONFIG.track.lapBase / (1 + CONFIG.track.speedPerLevel * (L - 1));
const incomePerLap = (L) => CONFIG.income.base * Math.pow(CONFIG.income.levelMult, L - 1) * incomeMult();

/** Renda por segundo dos carros na pista. */
function incomePerSec(withNitro = nitroOn()) {
  let s = 0;
  for (let i = 0; i < trackSlots(); i++) {
    const L = state.track[i];
    if (L) s += incomePerLap(L) / lapTime(L);
  }
  return s * (withNitro ? CONFIG.nitro.mult : 1);
}
function upgradeCost(key) {
  const u = CONFIG.upgrades[key];
  return Math.ceil(u.base * Math.pow(u.growth, state.upg[key]));
}
const totalCars = () => state.garage.filter(Boolean).length + state.track.filter(Boolean).length;
const freeGarageIndex = () => { for (let i = 0; i < garageSlots(); i++) if (!state.garage[i]) return i; return -1; };
const freeTrackIndex = () => { for (let i = 0; i < trackSlots(); i++) if (!state.track[i]) return i; return -1; };

function addCoins(n) {
  state.coins += n;
  state.totalEarned += n;
}

/* =========================================================================
   6) REFERÊNCIAS DO DOM
   ========================================================================= */
const el = {
  splash: $('#splash'), game: $('#game'),
  coins: $('#coins'), coinsBox: $('.hud-coins'), income: $('#income'), maxLevel: $('#maxLevel'),
  garage: $('#garage'), pit: $('#pit'), trackWrap: $('#trackWrap'), canvas: $('#track'),
  trackHint: $('#trackHint'), trash: $('#trash'),
  btnBuy: $('#btnBuy'), buyCar: $('#buyCar'), buyPrice: $('#buyPrice'),
  btnUpgrades: $('#btnUpgrades'), upgDot: $('#upgDot'), btnCollection: $('#btnCollection'),
  btnNitro: $('#btnNitro'), nitroLabel: $('#nitroLabel'), nitroBanner: $('#nitroBanner'), nitroTime: $('#nitroTime'),
  btnChest: $('#btnChest'), chestLabel: $('#chestLabel'),
  btnMute: $('#btnMute'), btnSettings: $('#btnSettings'),
  modal: $('#modal'), modalCard: $('#modalCard'), toast: $('#toast'), fx: $('#fx'),
};

/* =========================================================================
   7) GARAGEM E PIT (render DOM)
   ========================================================================= */
const cellEls = [], chipEls = [];

function buildGrid() {
  for (let i = 0; i < CONFIG.garage.max; i++) {
    const c = document.createElement('div');
    c.className = 'cell';
    c.dataset.i = i;
    el.garage.appendChild(c);
    cellEls.push(c);
  }
  for (let i = 0; i < CONFIG.trackSlots.max; i++) {
    const c = document.createElement('div');
    c.className = 'chip';
    c.dataset.t = i;
    el.pit.appendChild(c);
    chipEls.push(c);
  }
}

/** Atualiza uma célula da garagem. anim: 'pop' (merge) | 'new' (chegou) */
function renderCell(i, anim) {
  const c = cellEls[i], L = state.garage[i], locked = i >= garageSlots();
  const key = locked ? 'x' : String(L);
  if (c.dataset.k !== key) {
    c.dataset.k = key;
    c.classList.toggle('locked', locked);
    if (!L || locked) c.innerHTML = '';
    else {
      const info = carInfo(L);
      // atraso aleatório para o "respirar" não ficar sincronizado
      c.innerHTML = `<span class="lv">${L}</span>${chapBadge(info.chapter)}<div class="car" style="--d:-${(Math.random() * 2).toFixed(2)}s"><img src="${carAsset(L).url}" alt="${info.name}"></div>`;
    }
  }
  if (anim && L) {
    c.classList.remove('pop', 'new');
    void c.offsetWidth; // reinicia a animação
    c.classList.add(anim);
  }
}
function renderGarage() { for (let i = 0; i < cellEls.length; i++) renderCell(i); }

function renderPit() {
  const n = trackSlots();
  for (let i = 0; i < chipEls.length; i++) {
    const c = chipEls[i], L = state.track[i];
    // mostra as vagas liberadas + 1 bloqueada (dica de upgrade)
    const visible = i < Math.min(n + 1, CONFIG.trackSlots.max);
    const locked = i >= n;
    const key = `${visible}|${locked}|${L}`;
    if (c.dataset.k === key) continue;
    c.dataset.k = key;
    c.style.visibility = visible ? '' : 'hidden';
    c.classList.toggle('locked', locked);
    c.classList.toggle('filled', !!L && !locked);
    c.innerHTML = L && !locked ? `<span class="lv">${L}</span><img src="${carAsset(L).url}" alt="">` : '';
  }
  el.trackHint.classList.toggle('hidden', state.track.some(Boolean));
}

/* =========================================================================
   8) HUD E BOTÕES
   ========================================================================= */
let hudCache = {};
function setText(node, key, txt) { if (hudCache[key] !== txt) { hudCache[key] = txt; node.innerHTML = txt; } }

function renderHUD() {
  setText(el.coins, 'coins', fmt(state.coins));
  setText(el.income, 'income', fmt(incomePerSec()) + '/s');
  setText(el.maxLevel, 'max', `${chapBadge(carInfo(state.maxLevel).chapter)} ${state.maxLevel}`);

  // Botão comprar
  const L = buyLevel(), price = buyPrice(L), free = freeGarageIndex() >= 0;
  if (hudCache.buyL !== L) { hudCache.buyL = L; el.buyCar.src = carAsset(L).url; }
  setText(el.buyPrice, 'price', free ? fmt(price) : 'Cheia!');
  el.btnBuy.disabled = !free || state.coins < price;

  // Ponto de aviso no botão de upgrades se algum é comprável
  const canUpg = Object.keys(CONFIG.upgrades).some((k) => state.upg[k] < CONFIG.upgrades[k].max && state.coins >= upgradeCost(k));
  el.upgDot.classList.toggle('hidden', !canUpg);

  // Nitro
  const t = now();
  const nOn = t < state.nitroUntil, ready = t >= state.nitroReadyAt;
  el.btnNitro.classList.toggle('ready', ready && !nOn);
  el.btnNitro.classList.toggle('cooling', !ready && !nOn);
  el.nitroBanner.classList.toggle('hidden', !nOn);
  if (nOn) setText(el.nitroTime, 'nt', String(Math.ceil((state.nitroUntil - t) / 1000)));
  setText(el.nitroLabel, 'nl', nOn ? 'ATIVO' : ready ? 'NITRO' : fmtTime((state.nitroReadyAt - t) / 1000));
  const ring = el.btnNitro.querySelector('.ring circle');
  const frac = nOn ? (state.nitroUntil - t) / (CONFIG.nitro.duration * 1000)
    : ready ? 0 : 1 - (state.nitroReadyAt - t) / (CONFIG.nitro.cooldown * 1000);
  ring.style.strokeDashoffset = (113.1 * (1 - clamp(frac, 0, 1))).toFixed(1);

  // Baú
  const chestReady = t >= state.chestAt;
  el.btnChest.classList.toggle('ready', chestReady);
  el.btnChest.classList.toggle('cooling', !chestReady);
  setText(el.chestLabel, 'cl', chestReady ? 'BAÚ' : fmtTime((state.chestAt - t) / 1000));
}

function renderMute() {
  el.btnMute.innerHTML = state.muted
    ? '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 9h4l5-4v14l-5-4H3zm13.6 3 2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z"/></svg>'
    : '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 9h4l5-4v14l-5-4H3zm13 3a4 4 0 0 0-2-3.5v7a4 4 0 0 0 2-3.5zm-2-8v2a6 6 0 0 1 0 12v2a8 8 0 0 0 0-16z"/></svg>';
}

function toast(msg, ms = 1600) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.toast.classList.remove('show'), ms);
}

/* =========================================================================
   9) EFEITOS VISUAIS (DOM) — partículas, flash, números flutuantes
   ========================================================================= */
function centerOf(node) {
  const r = node.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
function burst(x, y, colors, count = 16) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const c = colors[i % colors.length];
    p.style.cssText = `left:${x - 4}px;top:${y - 4}px;background:${c};box-shadow:0 0 8px ${c}`;
    const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 50;
    p.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) scale(.2)`, opacity: 0 },
    ], { duration: 500 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => p.remove();
    frag.appendChild(p);
  }
  const f = document.createElement('div');
  f.className = 'flash';
  f.style.cssText = `left:${x - 10}px;top:${y - 10}px;border-color:${colors[0]}`;
  f.animate([{ transform: 'scale(.5)', opacity: 1 }, { transform: 'scale(5)', opacity: 0 }], { duration: 450, easing: 'ease-out' }).onfinish = () => f.remove();
  frag.appendChild(f);
  el.fx.appendChild(frag);
}
function floatText(x, y, txt, color) {
  const t = document.createElement('div');
  t.className = 'float-txt';
  t.textContent = txt;
  if (color) t.style.color = color;
  t.style.left = x + 'px'; t.style.top = y + 'px';
  t.animate([
    { transform: 'translate(-50%,0) scale(.8)', opacity: 0 },
    { transform: 'translate(-50%,-14px) scale(1.1)', opacity: 1, offset: 0.2 },
    { transform: 'translate(-50%,-50px) scale(1)', opacity: 0 },
  ], { duration: 1000, easing: 'ease-out' }).onfinish = () => t.remove();
  el.fx.appendChild(t);
}
function bumpCoins() {
  el.coinsBox.classList.remove('bump'); void el.coinsBox.offsetWidth; el.coinsBox.classList.add('bump');
}

/* =========================================================================
   10) AÇÕES DO JOGO
   ========================================================================= */
/** Registra um novo nível alcançado (popup de desbloqueio na 1ª vez). */
function reachLevel(L) {
  if (L > state.maxLevel) state.maxLevel = L;
  if (!state.unlocked.includes(L)) {
    state.unlocked.push(L);
    queuePopup(() => popupUnlock(L));
  }
}

function buyCar() {
  Sfx.init();
  const L = buyLevel(), price = buyPrice(L), i = freeGarageIndex();
  if (i < 0) { toast('Garagem cheia! Junte ou venda carros.'); Sfx.error(); return; }
  if (state.coins < price) { toast('Moedas insuficientes'); Sfx.error(); return; }
  state.coins -= price;
  state.buys[L] = (state.buys[L] || 0) + 1;
  state.garage[i] = L;
  reachLevel(L);
  renderCell(i, 'new');
  Sfx.buy(); vibrate(8);
  renderHUD();
}

/** Funde dois carros de nível L e retorna o novo nível. */
function doMerge(L, node) {
  const nl = L + 1;
  state.merges++;
  const { x, y } = centerOf(node);
  const info = carInfo(nl);
  burst(x, y, [info.acc, '#ffffff', '#00e5ff', '#ff7a00'], 18);
  Sfx.merge(); vibrate(20);
  reachLevel(nl);
  return nl;
}

function canMerge(a, b) { return a && a === b && a < MAX_LEVEL; }

/** Resolve a soltura de um carro arrastado. src = {from:'garage'|'track', i} */
function handleDrop(src, target) {
  const getL = (s) => (s.from === 'garage' ? state.garage[s.i] : state.track[s.i]);
  const setL = (s, v) => { if (s.from === 'garage') state.garage[s.i] = v; else state.track[s.i] = v; };
  const nodeOf = (s) => (s.from === 'garage' ? cellEls[s.i] : chipEls[s.i]);
  const L = getL(src);
  if (!L || !target) return;

  // Vender
  if (target.type === 'trash') {
    if (totalCars() <= 1) { toast('Você precisa de pelo menos 1 carro!'); Sfx.error(); return; }
    const v = sellPrice(L);
    setL(src, 0);
    addCoins(v);
    const c = centerOf(el.trash);
    floatText(c.x, c.y - 20, '+' + fmt(v));
    Sfx.sell(); bumpCoins();
    return afterChange();
  }

  // Soltou na pista (área geral): ocupa a primeira vaga livre
  if (target.type === 'track') {
    if (src.from === 'track') return; // já está na pista
    const t = freeTrackIndex();
    if (t < 0) { toast('Pista lotada! Faça upgrade de vagas.'); Sfx.error(); return; }
    target = { from: 'track', i: t };
  }

  // Alvo é uma vaga (garagem ou pista)
  if (target.from === 'garage' && target.i >= garageSlots()) { toast('Vaga bloqueada — veja Upgrades'); Sfx.error(); return; }
  if (target.from === 'track' && target.i >= trackSlots()) { toast('Vaga da pista bloqueada — veja Upgrades'); Sfx.error(); return; }
  if (target.from === src.from && target.i === src.i) return;

  const T = getL(target);
  if (!T) { // mover
    setL(target, L); setL(src, 0);
    if (target.from === 'track') { Track.resetCar(target.i); Sfx.place(); } else Sfx.click();
    afterChange(target, 'new');
  } else if (canMerge(L, T)) { // fundir
    setL(src, 0);
    setL(target, doMerge(L, nodeOf(target)));
    afterChange(target, 'pop');
  } else { // trocar de lugar
    if (L === MAX_LEVEL && T === MAX_LEVEL) toast('Nível máximo!');
    setL(target, L); setL(src, T);
    if (target.from === 'track') Track.resetCar(target.i);
    if (src.from === 'track') Track.resetCar(src.i);
    Sfx.click();
    afterChange(target, 'new');
  }
}

function afterChange(target, anim) {
  renderGarage(); renderPit();
  if (target && target.from === 'garage') renderCell(target.i, anim);
  if (target && target.from === 'track' && anim === 'pop') {
    const c = chipEls[target.i];
    c.animate([{ transform: 'scale(1.6)' }, { transform: 'scale(1)' }], { duration: 400, easing: 'cubic-bezier(.2,1.6,.4,1)' });
  }
  renderHUD();
  saveState();
}

function activateNitro() {
  Sfx.init();
  const t = now();
  if (t < state.nitroUntil) return;
  if (t < state.nitroReadyAt) { toast(`Nitro recarregando: ${fmtTime((state.nitroReadyAt - t) / 1000)}`); Sfx.error(); return; }
  if (!state.track.some(Boolean)) { toast('Coloque um carro na pista primeiro!'); Sfx.error(); return; }
  state.nitroUntil = t + CONFIG.nitro.duration * 1000;
  state.nitroReadyAt = state.nitroUntil + CONFIG.nitro.cooldown * 1000;
  Sfx.nitro(); vibrate([20, 40, 20]);
  const c = centerOf(el.btnNitro);
  burst(c.x, c.y, ['#00e5ff', '#ffffff', '#0077ff'], 20);
  saveState(); renderHUD();
}

function buyUpgrade(key) {
  const u = CONFIG.upgrades[key];
  if (state.upg[key] >= u.max) return;
  const cost = upgradeCost(key);
  if (state.coins < cost) { Sfx.error(); return; }
  state.coins -= cost;
  state.upg[key]++;
  Sfx.upgrade(); vibrate(10);
  renderGarage(); renderPit(); renderHUD(); saveState();
}

/* =========================================================================
   11) ARRASTAR E SOLTAR (Pointer Events: toque + mouse)
   ========================================================================= */
const Drag = {
  src: null, startX: 0, startY: 0, active: false, ghost: null, hot: null, pid: null,

  start(src, e) {
    if (this.src) return;
    this.src = src; this.pid = e.pointerId;
    this.startX = e.clientX; this.startY = e.clientY;
    this.active = false;
    window.addEventListener('pointermove', this.onMove, { passive: false });
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onCancel);
  },
  level() { return this.src.from === 'garage' ? state.garage[this.src.i] : state.track[this.src.i]; },
  srcNode() { return this.src.from === 'garage' ? cellEls[this.src.i] : chipEls[this.src.i]; },

  begin() {
    this.active = true;
    Sfx.init();
    const L = this.level();
    this.ghost = document.createElement('div');
    this.ghost.className = 'ghost';
    this.ghost.innerHTML = `<img src="${carAsset(L).url}" alt="">`;
    el.fx.appendChild(this.ghost);
    this.srcNode().classList.add('dragging');
    if (this.src.from === 'track') Track.hidden = this.src.i;
    // destaca carros iguais (possível merge)
    if (L < MAX_LEVEL) {
      state.garage.forEach((v, i) => { if (v === L && i < garageSlots() && !(this.src.from === 'garage' && this.src.i === i)) cellEls[i].classList.add('match'); });
      state.track.forEach((v, i) => { if (v === L && i < trackSlots() && !(this.src.from === 'track' && this.src.i === i)) chipEls[i].classList.add('match'); });
    }
  },

  onMove: (e) => {
    const d = Drag;
    if (e.pointerId !== d.pid) return;
    if (!d.active) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 6) return;
      d.begin();
    }
    e.preventDefault();
    d.ghost.style.transform = `translate(${e.clientX - 55}px, ${e.clientY - 40}px) rotate(-4deg)`;
    const tgt = d.targetAt(e.clientX, e.clientY);
    const node = tgt ? tgt.node : null;
    if (node !== d.hot) {
      if (d.hot) d.hot.classList.remove('hot', 'drop-hot');
      d.hot = node;
      if (node) node.classList.add(node === el.trackWrap || node === el.pit ? 'drop-hot' : 'hot');
    }
  },

  onUp: (e) => {
    const d = Drag;
    if (e.pointerId !== d.pid) return;
    const src = d.src, wasActive = d.active;
    const tgt = wasActive ? d.targetAt(e.clientX, e.clientY) : null;
    d.end();
    if (wasActive) handleDrop(src, tgt);
    else d.tap(src);
  },
  onCancel: () => Drag.end(),

  /** Toque rápido: mostra o nome do carro. */
  tap(src) {
    const L = src.from === 'garage' ? state.garage[src.i] : state.track[src.i];
    if (!L) return;
    Sfx.init(); Sfx.click();
    const info = carInfo(L);
    toast(`${info.name} · Cap. ${info.chapter} — ${fmt(incomePerLap(L))}/volta`);
  },

  /** Descobre o alvo embaixo do dedo/mouse. */
  targetAt(x, y) {
    const n = document.elementFromPoint(x, y);
    if (!n) return null;
    const cell = n.closest('.cell');
    if (cell) return { from: 'garage', i: +cell.dataset.i, node: cell };
    const chip = n.closest('.chip');
    if (chip && chip.style.visibility !== 'hidden') return { from: 'track', i: +chip.dataset.t, node: chip };
    if (n.closest('#trash')) return { type: 'trash', node: el.trash };
    if (n.closest('#trackWrap') || n.closest('#pit')) return { type: 'track', node: el.trackWrap };
    return null;
  },

  end() {
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onCancel);
    if (this.ghost) this.ghost.remove();
    if (this.hot) this.hot.classList.remove('hot', 'drop-hot');
    if (this.src) this.srcNode().classList.remove('dragging');
    document.querySelectorAll('.match').forEach((n) => n.classList.remove('match'));
    Track.hidden = -1;
    this.ghost = null; this.hot = null; this.src = null; this.active = false;
  },
};

function bindDrag() {
  el.garage.addEventListener('pointerdown', (e) => {
    const c = e.target.closest('.cell');
    if (!c) return;
    const i = +c.dataset.i;
    if (i < garageSlots() && state.garage[i]) { e.preventDefault(); Drag.start({ from: 'garage', i }, e); }
  });
  el.pit.addEventListener('pointerdown', (e) => {
    const c = e.target.closest('.chip');
    if (!c) return;
    const i = +c.dataset.t;
    if (i < trackSlots() && state.track[i]) { e.preventDefault(); Drag.start({ from: 'track', i }, e); }
  });
  // Pegar um carro diretamente na pista (canvas)
  el.canvas.addEventListener('pointerdown', (e) => {
    const i = Track.hitTest(e.clientX, e.clientY);
    if (i >= 0) { e.preventDefault(); Drag.start({ from: 'track', i }, e); }
  });
}

/* =========================================================================
   12) PISTA — Canvas 2D (cidade noturna, asfalto molhado, carros correndo)
   ========================================================================= */
const Track = {
  ctx: null, w: 0, h: 0, dpr: 1,
  bg: null,                 // canvas offscreen com o cenário pré-renderizado
  pts: [],                  // amostras do traçado {x,y,a(ângulo),s(persp)}
  prog: new Array(CONFIG.trackSlots.max).fill(0),
  sparks: [], floats: [], rain: [],
  hidden: -1,               // carro escondido enquanto é arrastado
  positions: [],            // posição atual na tela (hit test)

  init() {
    this.ctx = el.canvas.getContext('2d');
    for (let i = 0; i < this.prog.length; i++) this.prog[i] = i / this.prog.length;
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(el.trackWrap);
    this.resize();
  },

  /** Coloca o carro no meio do maior espaço livre entre os outros carros. */
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

  resize() {
    const r = el.trackWrap.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width; this.h = r.height;
    el.canvas.width = Math.round(this.w * this.dpr);
    el.canvas.height = Math.round(this.h * this.dpr);
    this.buildPath();
    this.buildBackground();
    this.rain = Array.from({ length: 36 }, () => ({ x: Math.random() * this.w, y: Math.random() * this.h, v: 380 + Math.random() * 220, l: 6 + Math.random() * 8 }));
  },

  /** Traçado do circuito: spline Catmull-Rom fechada, com perspectiva. */
  buildPath() {
    const W = this.w, H = this.h;
    const ctrl = [
      [0.10, 0.70], [0.13, 0.52], [0.28, 0.44], [0.46, 0.47], [0.60, 0.42], [0.76, 0.43],
      [0.86, 0.55], [0.84, 0.74], [0.70, 0.86], [0.50, 0.88], [0.30, 0.89], [0.15, 0.84],
    ].map(([x, y]) => [x * W, y * H]);
    const raw = [];
    const n = ctrl.length, steps = 40;
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
    // Reamostra com espaçamento uniforme (velocidade constante)
    const len = [0];
    for (let i = 1; i <= raw.length; i++) {
      const a = raw[i - 1], b = raw[i % raw.length];
      len.push(len[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    const total = len[len.length - 1], N = 360;
    this.pts = [];
    let j = 0;
    for (let k = 0; k < N; k++) {
      const d = (k / N) * total;
      while (len[j + 1] < d) j++;
      const a = raw[j], b = raw[(j + 1) % raw.length];
      const f = (d - len[j]) / (len[j + 1] - len[j] || 1);
      this.pts.push({ x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f });
    }
    for (let k = 0; k < N; k++) {
      const p = this.pts[k], q = this.pts[(k + 1) % N], o = this.pts[(k - 1 + N) % N];
      p.a = Math.atan2(q.y - o.y, q.x - o.x);
      p.s = 0.62 + 0.55 * (p.y / H);   // perspectiva: mais perto = maior
    }
  },

  roadWidth(p) { return Math.min(this.w, this.h * 1.6) * 0.085 * p.s; },

  /** Pré-renderiza o cenário (céu, prédios, asfalto, postes) uma única vez. */
  buildBackground() {
    const W = this.w, H = this.h, d = this.dpr;
    const c = this.bg || (this.bg = document.createElement('canvas'));
    c.width = Math.round(W * d); c.height = Math.round(H * d);
    const g = c.getContext('2d');
    g.setTransform(d, 0, 0, d, 0, 0);
    const R = rng(1337);

    // Céu
    let gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#02030b'); gr.addColorStop(0.35, '#071443'); gr.addColorStop(0.5, '#0d2a6e'); gr.addColorStop(0.62, '#04081c'); gr.addColorStop(1, '#02040c');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // Estrelas
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 40; i++) { g.globalAlpha = 0.2 + R() * 0.6; g.fillRect(R() * W, R() * H * 0.3, 1, 1); }
    g.globalAlpha = 1;
    // Lua
    g.fillStyle = '#d9ecff'; g.shadowColor = '#9fd4ff'; g.shadowBlur = 20;
    g.beginPath(); g.arc(W * 0.18, H * 0.12, Math.max(6, H * 0.04), 0, Math.PI * 2); g.fill();
    g.shadowBlur = 0;
    // Brilho do horizonte (cidade)
    gr = g.createRadialGradient(W * 0.5, H * 0.42, 10, W * 0.5, H * 0.42, W * 0.7);
    gr.addColorStop(0, 'rgba(0,180,255,.35)'); gr.addColorStop(0.5, 'rgba(255,90,0,.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H * 0.6);

    // Prédios: 2 camadas (fundo e frente)
    const horizon = H * 0.44;
    const layer = (hMin, hMax, wMin, wMax, col, winA) => {
      let x = -10;
      while (x < W + 10) {
        const bw = wMin + R() * (wMax - wMin), bh = hMin + R() * (hMax - hMin);
        g.fillStyle = col; g.fillRect(x, horizon - bh, bw, bh + 4);
        if (R() < 0.3) { g.fillRect(x + bw * 0.4, horizon - bh - 8, 2, 8); } // antena
        // janelas
        for (let wy = horizon - bh + 4; wy < horizon - 3; wy += 5) {
          for (let wx = x + 3; wx < x + bw - 3; wx += 4) {
            if (R() < winA) {
              g.fillStyle = R() < 0.8 ? 'rgba(255,214,120,.85)' : 'rgba(120,230,255,.9)';
              g.fillRect(wx, wy, 2, 2);
            }
          }
        }
        // letreiro neon (sem texto)
        if (R() < 0.18 && bh > hMin + 6) {
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

    // Chão (asfalto molhado geral)
    gr = g.createLinearGradient(0, horizon, 0, H);
    gr.addColorStop(0, '#060b1d'); gr.addColorStop(1, '#0a0f22');
    g.fillStyle = gr; g.fillRect(0, horizon, W, H - horizon);
    // Reflexo da cidade no chão molhado
    gr = g.createLinearGradient(0, horizon, 0, horizon + H * 0.15);
    gr.addColorStop(0, 'rgba(0,160,255,.22)'); gr.addColorStop(1, 'rgba(0,160,255,0)');
    g.fillStyle = gr; g.fillRect(0, horizon, W, H * 0.15);

    // Pista: bordas externa e interna calculadas pelas normais
    const P = this.pts, N = P.length;
    const edge = (off) => P.map((p) => {
      const w = this.roadWidth(p) * off;
      return [p.x + Math.cos(p.a + Math.PI / 2) * w, p.y + Math.sin(p.a + Math.PI / 2) * w];
    });
    const outer = edge(1), inner = edge(-1), outer2 = edge(1.25), inner2 = edge(-1.25);
    const poly = (arr) => { g.moveTo(arr[0][0], arr[0][1]); for (let i = 1; i < arr.length; i++) g.lineTo(arr[i][0], arr[i][1]); g.closePath(); };

    // Calçada / guia
    g.beginPath(); poly(outer2); poly(inner2);
    g.fillStyle = '#1a2246'; g.fill('evenodd');
    // Asfalto
    g.beginPath(); poly(outer); poly(inner);
    gr = g.createLinearGradient(0, H * 0.4, 0, H);
    gr.addColorStop(0, '#141a30'); gr.addColorStop(1, '#1d2440');
    g.fillStyle = gr; g.fill('evenodd');
    // Zebras (vermelho/branco) nas curvas: alterna ao longo da borda
    for (let i = 0; i < N; i += 6) {
      const k = (i + 3) % N;
      const curv = Math.abs(Math.sin(P[k].a - P[i].a));
      if (curv < 0.06) continue;
      g.fillStyle = (i / 6) % 2 ? '#e8e8f0' : '#e0193c';
      for (const [a, b] of [[outer, outer2], [inner, inner2]]) {
        g.beginPath();
        g.moveTo(a[i][0], a[i][1]); g.lineTo(a[k][0], a[k][1]);
        g.lineTo(a[k][0] + (b[k][0] - a[k][0]) * 0.5, a[k][1] + (b[k][1] - a[k][1]) * 0.5);
        g.lineTo(a[i][0] + (b[i][0] - a[i][0]) * 0.5, a[i][1] + (b[i][1] - a[i][1]) * 0.5);
        g.fill();
      }
    }
    // Linhas de borda
    g.strokeStyle = 'rgba(230,240,255,.75)'; g.lineWidth = 1.2;
    g.beginPath(); poly(outer); g.stroke();
    g.beginPath(); poly(inner); g.stroke();
    // Faixa central tracejada
    g.setLineDash([8, 10]); g.strokeStyle = 'rgba(255,207,58,.7)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(P[0].x, P[0].y); for (let i = 1; i < N; i++) g.lineTo(P[i].x, P[i].y); g.closePath(); g.stroke();
    g.setLineDash([]);

    // Linha de largada quadriculada (ponto 0)
    {
      const p = P[0], w = this.roadWidth(p), nx = Math.cos(p.a + Math.PI / 2), ny = Math.sin(p.a + Math.PI / 2);
      const tx = Math.cos(p.a), ty = Math.sin(p.a), sq = (2 * w) / 6;
      for (let r = 0; r < 2; r++) for (let q = 0; q < 6; q++) {
        g.fillStyle = (r + q) % 2 ? '#fff' : '#111';
        const ox = p.x + nx * (-w + q * sq) + tx * r * sq, oy = p.y + ny * (-w + q * sq) + ty * r * sq;
        g.beginPath();
        g.moveTo(ox, oy); g.lineTo(ox + nx * sq, oy + ny * sq);
        g.lineTo(ox + nx * sq + tx * sq, oy + ny * sq + ty * sq); g.lineTo(ox + tx * sq, oy + ty * sq);
        g.fill();
      }
    }

    // Postes de luz com reflexo no asfalto molhado
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i += 30) {
      const p = P[i], [ox, oy] = inner2[i];
      const hgt = 26 * p.s, colr = i % 60 ? '255,190,90' : '120,220,255';
      // reflexo alongado
      const rg = g.createRadialGradient(ox, oy + 4, 1, ox, oy + 4, 28 * p.s);
      rg.addColorStop(0, `rgba(${colr},.35)`); rg.addColorStop(1, `rgba(${colr},0)`);
      g.save(); g.translate(ox, oy + 4); g.scale(0.6, 1.6); g.translate(-ox, -(oy + 4));
      g.fillStyle = rg; g.beginPath(); g.arc(ox, oy + 4, 28 * p.s, 0, Math.PI * 2); g.fill();
      g.restore();
      // halo da lâmpada
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

  /** Ponto do traçado para um progresso 0..1 (interpolado). */
  at(prog) {
    const N = this.pts.length, f = ((prog % 1) + 1) % 1 * N, i = Math.floor(f), k = f - i;
    const a = this.pts[i % N], b = this.pts[(i + 1) % N];
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, a: a.a, s: a.s + (b.s - a.s) * k };
  },

  carWidth() { return clamp(this.w * 0.15, 40, 74); },

  /** Avança a simulação: carros correm e completam voltas. */
  update(dt) {
    if (!this.pts.length) return;
    const nitro = nitroOn(), mult = nitro ? CONFIG.nitro.mult : 1;
    const n = trackSlots();
    for (let i = 0; i < n; i++) {
      const L = state.track[i];
      if (!L) continue;
      this.prog[i] += (dt / lapTime(L)) * mult;
      if (this.prog[i] >= 1) {
        this.prog[i] -= 1;
        const gain = incomePerLap(L);
        addCoins(gain);
        const p = this.at(this.prog[i]);
        this.floats.push({ x: p.x, y: p.y - 22 * p.s, t: 0, txt: '+' + fmt(gain) });
        if (this.floats.length > 24) this.floats.shift();
        Sfx.coin();
        bumpCoins();
      }
      // Faíscas de nitro
      if (nitro && this.sparks.length < 160 && Math.random() < 0.7) {
        const p = this.at(this.prog[i]), back = p.a + Math.PI;
        const cw = this.carWidth() * p.s * 0.5;
        this.sparks.push({
          x: p.x + Math.cos(back) * cw, y: p.y - 5 * p.s + Math.sin(back) * cw,
          vx: Math.cos(back + (Math.random() - 0.5)) * (60 + Math.random() * 80),
          vy: Math.sin(back + (Math.random() - 0.5)) * 60 - 20,
          t: 0, life: 0.25 + Math.random() * 0.3, c: Math.random() < 0.5 ? '#00e5ff' : '#ffb300',
        });
      }
    }
    // partículas
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 200 * dt;
      if (s.t >= s.life) { this.sparks[i] = this.sparks[this.sparks.length - 1]; this.sparks.pop(); }
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      this.floats[i].t += dt;
      if (this.floats[i].t > 1.1) this.floats.splice(i, 1);
    }
    for (const r of this.rain) { r.y += r.v * dt; r.x -= r.v * 0.15 * dt; if (r.y > this.h) { r.y = -10; r.x = Math.random() * (this.w + 40); } }
  },

  draw() {
    const g = this.ctx;
    if (!g || !this.bg) return;
    const d = this.dpr;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(this.bg, 0, 0);
    g.setTransform(d, 0, 0, d, 0, 0);

    const n = trackSlots(), cw = this.carWidth(), nitro = nitroOn();
    // ordena por profundidade (y)
    const list = [];
    for (let i = 0; i < n; i++) {
      if (!state.track[i] || i === this.hidden) { this.positions[i] = null; continue; }
      const p = this.at(this.prog[i]);
      list.push({ i, p, L: state.track[i] });
    }
    list.sort((a, b) => a.p.y - b.p.y);

    // rastros de luz (modo aditivo)
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    for (const c of list) {
      const info = carInfo(c.L);
      const trail = nitro ? 0.12 : 0.05 + c.L * 0.0012;
      const segs = 7;
      for (let k = 0; k < segs; k++) {
        const p0 = this.at(this.prog[c.i] - (trail * k) / segs - 0.004);
        const p1 = this.at(this.prog[c.i] - (trail * (k + 1)) / segs - 0.004);
        g.strokeStyle = nitro ? '#00e5ff' : info.trail;
        g.globalAlpha = (1 - k / segs) * 0.55;
        g.lineWidth = (nitro ? 5 : 3) * p0.s;
        g.beginPath(); g.moveTo(p0.x, p0.y - 5 * p0.s); g.lineTo(p1.x, p1.y - 5 * p1.s); g.stroke();
      }
    }
    g.globalAlpha = 1;
    // faíscas
    for (const s of this.sparks) {
      g.fillStyle = s.c; g.globalAlpha = 1 - s.t / s.life;
      g.fillRect(s.x - 1, s.y - 1, 2.4, 2.4);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';

    // carros
    for (const c of list) {
      const { p } = c, img = carAsset(c.L).img;
      const w = cw * p.s, h = w / 2;
      const left = Math.cos(p.a) < 0;   // indo para a esquerda: espelha
      let ang = left ? p.a - Math.PI : p.a;
      ang = Math.atan2(Math.sin(ang), Math.cos(ang));
      ang = clamp(ang, -0.6, 0.6);
      g.save();
      g.translate(p.x, p.y + 2 * p.s);
      g.rotate(ang);
      if (left) g.scale(-1, 1);
      if (img.complete && img.naturalWidth) g.drawImage(img, -w / 2, -h * 0.9, w, h);
      g.restore();
      this.positions[c.i] = { x: p.x, y: p.y - h * 0.4, r: w * 0.5 };
    }

    // chuva fina
    g.strokeStyle = 'rgba(160,200,255,.18)'; g.lineWidth = 1;
    g.beginPath();
    for (const r of this.rain) { g.moveTo(r.x, r.y); g.lineTo(r.x - r.l * 0.15, r.y + r.l); }
    g.stroke();

    // moedas flutuantes
    g.font = '14px "Russo One", Impact, sans-serif';
    g.textAlign = 'center';
    g.lineWidth = 3; g.strokeStyle = '#000';
    for (const f of this.floats) {
      const a = 1 - f.t / 1.1;
      g.globalAlpha = a;
      const y = f.y - f.t * 26;
      g.strokeText(f.txt, f.x, y);
      g.fillStyle = '#ffcf3a'; g.fillText(f.txt, f.x, y);
    }
    g.globalAlpha = 1;
  },

  /** Índice do carro sob o ponto (coordenadas de tela) ou −1. */
  hitTest(cx, cy) {
    const r = el.canvas.getBoundingClientRect();
    const x = cx - r.left, y = cy - r.top;
    let best = -1, bd = Infinity;
    this.positions.forEach((p, i) => {
      if (!p) return;
      const dd = Math.hypot(p.x - x, p.y - y);
      if (dd < p.r * 1.1 && dd < bd) { bd = dd; best = i; }
    });
    return best;
  },
};

/* =========================================================================
   13) POPUPS (fila para não sobrepor)
   ========================================================================= */
const popupQueue = [];
let popupOpen = false, popupOnClose = null, popupTick = null;

function queuePopup(fn) {
  popupQueue.push(fn);
  if (!popupOpen && el.splash.classList.contains('hidden')) nextPopup();
}
function nextPopup() {
  const fn = popupQueue.shift();
  if (fn) fn();
}
/** Abre um popup. opts: {title, body, actions:[{label, cls, onClick}], onClose, tick, closeX} */
function openPopup(opts) {
  popupOpen = true;
  popupOnClose = opts.onClose || null;
  el.modalCard.innerHTML =
    (opts.closeX !== false ? '<button class="modal-close" aria-label="Fechar">✕</button>' : '') +
    (opts.title ? `<h2>${opts.title}</h2>` : '') +
    `<div class="modal-body">${opts.body || ''}</div>` +
    (opts.actions ? '<div class="modal-actions"></div>' : '');
  if (opts.actions) {
    const box = el.modalCard.querySelector('.modal-actions');
    opts.actions.forEach((a) => {
      const b = document.createElement('button');
      b.className = 'btn ' + (a.cls || 'btn-orange');
      b.innerHTML = a.label;
      b.onclick = () => { Sfx.click(); a.onClick ? a.onClick() : closePopup(); };
      box.appendChild(b);
    });
  }
  const x = el.modalCard.querySelector('.modal-close');
  if (x) x.onclick = () => { Sfx.click(); closePopup(); };
  el.modal.classList.remove('hidden');
  clearInterval(popupTick);
  if (opts.tick) popupTick = setInterval(opts.tick, 250);
  if (opts.onOpen) opts.onOpen(el.modalCard);
}
function closePopup() {
  clearInterval(popupTick); popupTick = null;
  el.modal.classList.add('hidden');
  el.modalCard.innerHTML = '';
  popupOpen = false;
  const cb = popupOnClose; popupOnClose = null;
  if (cb) cb();
  setTimeout(nextPopup, 150);
}
el.modal.addEventListener('pointerdown', (e) => { if (e.target === el.modal) closePopup(); });

function popupUnlock(L) {
  const info = carInfo(L);
  Sfx.unlock(); vibrate([30, 50, 30]);
  openPopup({
    title: 'Novo carro desbloqueado!',
    body: `
      <div class="unlock-stage"><div class="unlock-rays"></div><img src="${carAsset(L).url}" alt=""></div>
      <div class="unlock-name">${chapBadge(info.chapter, true)}
        <div><div>${info.name}</div><small>Capítulo ${info.chapter} · Nível ${L} · ${fmt(incomePerLap(L))}/volta</small></div>
      </div>
      <p class="muted center">Registrado na sua Coleção (${state.unlocked.length}/${MAX_LEVEL})</p>`,
    actions: [{ label: 'SHOW!', cls: 'btn-cyan' }],
    onOpen: () => { const c = centerOf(el.modalCard); burst(c.x, c.y - 60, [info.acc, '#fff', '#ff7a00', '#00e5ff'], 28); },
  });
}

function popupOffline(earned, secs) {
  openPopup({
    title: 'Enquanto você estava fora…',
    body: `<p class="center muted">Sua equipe correu por ${fmtTime(secs)}${secs >= CONFIG.offline.maxSeconds ? ' (máximo de 2h)' : ''} e faturou:</p>
           <div class="big-num"><span class="coin-ico"></span>${fmt(earned)}</div>`,
    actions: [{ label: 'COLETAR', cls: 'btn-orange', onClick: () => { Sfx.coin(); bumpCoins(); closePopup(); } }],
    closeX: false,
  });
}

function popupUpgrades() {
  const render = () => {
    const rows = Object.entries(CONFIG.upgrades).map(([k, u]) => {
      const lv = state.upg[k], maxed = lv >= u.max, cost = upgradeCost(k);
      let cur = '';
      if (k === 'garage') cur = `${garageSlots()} vagas`;
      if (k === 'track') cur = `${trackSlots()} vagas`;
      if (k === 'income') cur = `+${Math.round(lv * u.per * 100)}%`;
      if (k === 'discount') cur = `−${(lv * u.per * 100).toFixed(1).replace('.', ',')}%`;
      const pips = u.max <= 16 ? `<div class="upg-lv">${Array.from({ length: u.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div>` : `<small>Nível ${lv}/${u.max}</small>`;
      return `<div class="upg">
        <div class="upg-ico">${u.icon}</div>
        <div class="upg-info"><b>${u.name}</b><small>${u.desc} · atual: ${cur}</small>${pips}</div>
        <button class="btn ${maxed ? 'btn-dark' : 'btn-cyan'}" data-upg="${k}" ${maxed || state.coins < cost ? 'disabled' : ''}>
          ${maxed ? 'MÁX' : `COMPRAR<small><span class="coin-ico sm"></span>${fmt(cost)}</small>`}
        </button></div>`;
    }).join('');
    return `${rows}<p class="muted center">Suas moedas: <b style="color:var(--gold)">${fmt(state.coins)}</b></p>`;
  };
  let last = '';
  const refresh = () => {
    const body = el.modalCard.querySelector('.modal-body');
    if (!body) return;
    const html = render();
    if (html !== last) { last = html; body.innerHTML = html; }
  };
  openPopup({ title: 'Upgrades', body: '', tick: refresh });
  refresh();
  el.modalCard.querySelector('.modal-body').addEventListener('click', (e) => {
    const b = e.target.closest('[data-upg]');
    if (b && !b.disabled) { buyUpgrade(b.dataset.upg); refresh(); }
  });
}

function popupCollection() {
  const got = state.unlocked.length;
  let rows = '';
  for (const m of MODELS) {
    let cards = '';
    for (let t = 0; t < 3; t++) {
      const L = (m.chapter - 1) * 3 + t + 1, has = state.unlocked.includes(L);
      cards += `<div class="col-card t${t}${has ? '' : ' locked'}">
        <span class="lvb">${L}</span>
        <img src="${carAsset(L).url}" alt="" loading="lazy">
        <div class="nm">${has ? carInfo(L).name : '??? · ' + TIERS[t]}</div></div>`;
    }
    rows += `<div class="col-row">${chapBadge(m.chapter)}<div class="col-cards">${cards}</div></div>`;
  }
  openPopup({
    title: 'Coleção',
    body: `<div class="col-progress">${got}/${MAX_LEVEL} carros desbloqueados</div>
           <div class="col-bar"><i style="width:${(got / MAX_LEVEL) * 100}%"></i></div>${rows}`,
  });
}

let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });

function popupSettings() {
  const render = () => `
    <div class="set-row"><span>Som</span><button class="switch ${state.muted ? '' : 'on'}" data-set="sound"></button></div>
    <div class="set-row"><span>Vibração</span><button class="switch ${state.vibrate ? 'on' : ''}" data-set="vib"></button></div>
    ${deferredInstall ? '<div class="set-row"><span>Instalar no celular</span><button class="btn btn-cyan" data-set="install" style="padding:8px 14px;font-size:14px">INSTALAR</button></div>' : ''}
    <div class="set-row"><span>Estatísticas</span><span class="muted">${state.merges} merges · ${fmt(state.totalEarned)} ganhos</span></div>
    <div class="set-row"><span>Apagar progresso</span><button class="btn btn-danger" data-set="reset" style="padding:8px 14px;font-size:14px">RESETAR</button></div>
    <p class="legal">PLANET OF THE FURIOUS é um jogo de fã, não oficial e sem fins lucrativos. Todos os carros são desenhos originais feitos por código; nenhuma marca, logo ou arte oficial é utilizada.</p>`;
  openPopup({ title: 'Configurações', body: render() });
  const body = el.modalCard.querySelector('.modal-body');
  body.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-set]');
    if (!b) return;
    const k = b.dataset.set;
    if (k === 'sound') { state.muted = !state.muted; renderMute(); Sfx.init(); Sfx.click(); }
    if (k === 'vib') { state.vibrate = !state.vibrate; vibrate(20); }
    if (k === 'install' && deferredInstall) { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; }
    if (k === 'reset') {
      if (b.dataset.confirm) {
        localStorage.removeItem(CONFIG.saveKey);
        state = defaultState();
        Track.prog.fill(0);
        hudCache = {};
        cellEls.forEach((c) => { c.dataset.k = ''; }); chipEls.forEach((c) => { c.dataset.k = ''; });
        renderGarage(); renderPit(); renderHUD(); renderMute(); saveState();
        closePopup(); toast('Progresso apagado. Bora de novo!');
        return;
      }
      b.dataset.confirm = '1'; b.textContent = 'CONFIRMAR?';
      return;
    }
    saveState();
    body.innerHTML = render();
  });
}

function openChest() {
  Sfx.init();
  const t = now();
  if (t < state.chestAt) { toast(`Próximo baú em ${fmtTime((state.chestAt - t) / 1000)}`); Sfx.error(); return; }
  const coins = Math.max(CONFIG.chest.minCoins, Math.floor(incomePerSec(false) * CONFIG.chest.incomeSeconds));
  const carL = Math.min(MAX_LEVEL, buyLevel() + 1);
  const slot = freeGarageIndex();
  state.chestAt = t + CONFIG.chest.interval * 1000;
  addCoins(coins);
  if (slot >= 0) state.garage[slot] = carL;
  Sfx.chest(); vibrate([20, 30, 60]);
  saveState();
  openPopup({
    title: 'Baú diário',
    body: `<div class="chest-big">🎁</div>
      <div class="reward"><div class="big-num"><span class="coin-ico"></span>+${fmt(coins)}</div>
      ${slot >= 0 ? `<img src="${carAsset(carL).url}" alt=""><div class="muted">${carInfo(carL).name}</div>` : '<p class="muted">Garagem cheia: o carro bônus ficou de fora.</p>'}</div>
      <p class="muted center">Volte amanhã para outro baú!</p>`,
    actions: [{ label: 'PEGAR', cls: 'btn-orange' }],
    onClose: () => {
      if (slot >= 0) { reachLevel(carL); renderCell(slot, 'new'); }
      bumpCoins(); renderHUD();
    },
  });
}

/* =========================================================================
   14) GANHO OFFLINE
   ========================================================================= */
function applyOffline(fromTs) {
  const secs = clamp((now() - fromTs) / 1000, 0, CONFIG.offline.maxSeconds);
  if (secs < CONFIG.offline.minSeconds) return;
  const earned = incomePerSec(false) * secs * CONFIG.offline.rate;
  if (earned < 1) return;
  addCoins(earned);       // credita na hora (não perde se fechar o popup)
  saveState();
  queuePopup(() => popupOffline(earned, secs));
}

/* =========================================================================
   15) LOOP PRINCIPAL
   ========================================================================= */
let lastFrame = 0, hudAcc = 0, saveAcc = 0, running = false;

function frame(ts) {
  if (!running) return;
  const dt = Math.min((ts - (lastFrame || ts)) / 1000, 0.1);
  lastFrame = ts;
  Track.update(dt);
  Track.draw();
  hudAcc += dt; saveAcc += dt * 1000;
  if (hudAcc > 0.15) { hudAcc = 0; renderHUD(); }
  if (saveAcc > CONFIG.autosaveMs) { saveAcc = 0; saveState(); }
  requestAnimationFrame(frame);
}
function startLoop() {
  if (running) return;
  running = true; lastFrame = 0;
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    running = false;
    saveState();
  } else {
    applyOffline(state.lastSeen);
    if (!el.game.classList.contains('hidden')) startLoop();
  }
});
window.addEventListener('pagehide', saveState);

/* =========================================================================
   16) GRAFFITI (respingos e escorridos gerados por código)
   ========================================================================= */
function paintTag(tagEl, seed, intensity) {
  const R = rng(seed);
  const box = tagEl.getBoundingClientRect();
  const W = box.width || 300, H = box.height || 100;
  const drips = tagEl.querySelector('.drips'), spl = tagEl.querySelector('.splatter');
  drips.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let d = '';
  const n = Math.round(6 * intensity);
  for (let i = 0; i < n; i++) {
    const x = W * (0.15 + R() * 0.75), y0 = H * (0.55 + R() * 0.25), len = H * (0.2 + R() * 0.6) * intensity;
    const w = 2 + R() * 3, col = R() < 0.6 ? '#00e5ff' : '#ff7a00';
    d += `<path d="M${x - w} ${y0} L${x - w * 0.6} ${y0 + len} Q${x} ${y0 + len + w * 2.2} ${x + w * 0.6} ${y0 + len} L${x + w} ${y0} Z" fill="${col}" opacity=".85"/>`;
    d += `<circle cx="${x}" cy="${y0 + len + w * 0.9}" r="${w * 0.9}" fill="${col}" opacity=".85"/>`;
  }
  drips.innerHTML = d;
  // respingos de spray ao redor
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
   17) INICIALIZAÇÃO
   ========================================================================= */
function init() {
  buildGrid();
  bindDrag();
  renderMute();
  el.btnBuy.addEventListener('click', buyCar);
  el.btnNitro.addEventListener('click', activateNitro);
  el.btnChest.addEventListener('click', openChest);
  el.btnUpgrades.addEventListener('click', () => { Sfx.init(); Sfx.click(); popupUpgrades(); });
  el.btnCollection.addEventListener('click', () => { Sfx.init(); Sfx.click(); popupCollection(); });
  el.btnSettings.addEventListener('click', () => { Sfx.init(); Sfx.click(); popupSettings(); });
  el.btnMute.addEventListener('click', () => { state.muted = !state.muted; Sfx.init(); renderMute(); Sfx.click(); saveState(); });

  // Splash: carro aleatório já desbloqueado
  const showL = state.unlocked[Math.floor(Math.random() * state.unlocked.length)] || 1;
  $('#splashCar').src = carAsset(Math.max(showL, 3)).url;

  const paint = () => { paintTag($('#splashTag'), 7, 1); paintTag($('#miniTag'), 11, 0.5); };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(paint);
  paint();

  // Ganho offline calculado já no carregamento (popup após o splash)
  applyOffline(state.lastSeen);

  $('#btnStart').addEventListener('click', () => {
    Sfx.init(); Sfx.nitro();
    el.splash.classList.add('leaving');
    el.game.classList.remove('hidden');
    Track.init();
    renderGarage(); renderPit(); renderHUD();
    paintTag($('#miniTag'), 11, 0.5);
    startLoop();
    setTimeout(() => {
      el.splash.classList.add('hidden');
      if (!popupOpen) nextPopup();
    }, 450);
  });

  // Service worker (PWA offline)
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW falhou', e));
  }
}

init();

// Ganchos para depuração/testes no console
window.PF = { state: () => state, CONFIG, incomePerSec, buyPrice, buyLevel, handleDrop, Track };
