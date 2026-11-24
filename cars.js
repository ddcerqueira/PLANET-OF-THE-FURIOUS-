/* =========================================================================
   PLANET OF THE FURIOUS — cars.js
   Dados dos carros + gerador procedural de arte (SVG desenhado por código).
   Cada carro lembra a versão vista nos filmes (silhueta do modelo real,
   pintura, grafismos e modificações marcantes), mas tudo é desenhado do
   zero: sem logos, textos, decalques ou arte oficial.
   Estágios: Stock (de fábrica) → Tuned (preparado) → Furious (versão do filme).
   ========================================================================= */

/** Nomes dos 3 estágios de evolução de cada modelo. */
const TIERS = ['Stock', 'Tuned', 'Furious'];

/**
 * Os 10 modelos (1 por capítulo). Cada um tem 3 evoluções → 30 níveis.
 *
 * shape: perfil lateral num viewBox 160x80 (carro virado para a direita)
 *   x0/x1 = traseira/dianteira   belly = linha inferior   tail = altura da traseira
 *   deck  = [x,y] fim do porta-malas/vidro traseiro   roof = [x1,x2,y] teto
 *   wind  = [x,y] base do para-brisa   nose = altura do capô na frente
 *   wheels= [xTraseira, xDianteira, raio]   round = arredondamento
 * paint[t]: body (carroceria), livery (grafismo), acc (neon/luz), rim (rodas)
 * spokes: desenho da roda   wing: aerofólio   widebody: alargadores
 */
const MODELS = [
  {
    // Cap. 1 — laranja vivo, grafismo tribal escuro, asa em arco, rodas cromadas
    id: 'supra', name: 'Supra MK4', chapter: 1,
    shape: { x0: 12, x1: 150, belly: 61, tail: 41, deck: [36, 38], roof: [62, 90, 25], wind: [108, 41], nose: 47, wheels: [37, 124, 11.5], round: 1.35 },
    paint: [
      { body: '#ec7a1e', livery: '#2b2b2f', acc: '#9fe7ff', rim: '#c7ccd2' },
      { body: '#f5801d', livery: '#242428', acc: '#9fe7ff', rim: '#dfe3e8' },
      { body: '#ff7f11', livery: '#1f1f23', acc: '#5fd0ff', rim: '#eef1f4' },
    ],
    spokes: 10, wing: 'hoop',
  },
  {
    // Cap. 2 — prata com "ondas" azuis na lateral e neon azul
    id: 'skyline', name: 'Skyline R34 GT-R', chapter: 2,
    shape: { x0: 13, x1: 149, belly: 61, tail: 38, deck: [32, 36], roof: [59, 94, 22], wind: [110, 38], nose: 43, wheels: [37, 124, 11.5], round: 0.65 },
    paint: [
      { body: '#aeb6bf', livery: '#1d5fe0', acc: '#3f8cff', rim: '#a8afb7' },
      { body: '#c4cbd3', livery: '#1a5cf0', acc: '#3f8cff', rim: '#d3d8de' },
      { body: '#cfd5dc', livery: '#1356ff', acc: '#2f7dff', rim: '#e4e8ec' },
    ],
    spokes: 5, wing: 'gt',
  },
  {
    // Cap. 3 — kit widebody arredondado, laranja e preto em diagonal
    id: 'rx7', name: 'RX-7 Veilside', chapter: 3,
    shape: { x0: 12, x1: 150, belly: 62, tail: 44, deck: [42, 41], roof: [68, 86, 30], wind: [103, 46], nose: 53, wheels: [39, 125, 11], round: 1.7 },
    paint: [
      { body: '#d9561e', livery: '#141414', acc: '#ff9a4a', rim: '#9aa0a6' },
      { body: '#f2631c', livery: '#111111', acc: '#ff9a4a', rim: '#6e5638' },
      { body: '#ff6a16', livery: '#0d0d0f', acc: '#ffb25a', rim: '#8c6a3c' },
    ],
    spokes: 6, wing: 'veilside', widebody: 1,
  },
  {
    // Cap. 4 — hatch prata e preto, tomada de ar no capô, rodas escuras
    id: 'impreza', name: 'Impreza WRX STI', chapter: 4,
    shape: { x0: 16, x1: 146, belly: 60, tail: 37, deck: [22, 33], roof: [44, 92, 21], wind: [108, 39], nose: 44, wheels: [38, 122, 11.5], round: 0.8 },
    paint: [
      { body: '#9ea6b0', livery: '#17181c', acc: '#5aa8ff', rim: '#3a3d44' },
      { body: '#b9c0c8', livery: '#141519', acc: '#5aa8ff', rim: '#26282d' },
      { body: '#c9cfd6', livery: '#101114', acc: '#4f9dff', rim: '#1d1f23' },
    ],
    spokes: 6, wing: 'sti', scoop: true,
  },
  {
    // Cap. 5 — azul clássico com faixas brancas, baixinho de motor central
    id: 'gt40', name: 'GT40', chapter: 5,
    shape: { x0: 12, x1: 150, belly: 62, tail: 42, deck: [40, 40], roof: [66, 84, 34], wind: [101, 48], nose: 54, wheels: [38, 126, 11.5], round: 1.7 },
    paint: [
      { body: '#24479a', livery: '#f2f4f7', acc: '#8fb8ff', rim: '#c4c9cf' },
      { body: '#2252b8', livery: '#f6f7f9', acc: '#8fb8ff', rim: '#d7dbe0' },
      { body: '#1f55c9', livery: '#ffffff', acc: '#7fb2ff', rim: '#e6e9ed' },
    ],
    spokes: 5, wing: null,
  },
  {
    // Cap. 6 — bordô "sangue de boi", bico pontudo e asa altíssima
    id: 'daytona', name: 'Charger Daytona', chapter: 6,
    shape: { x0: 8, x1: 157, belly: 61, tail: 41, deck: [27, 40], roof: [66, 92, 25], wind: [111, 41], nose: 50, wheels: [35, 126, 12], round: 0.8 },
    paint: [
      { body: '#6a1520', livery: '#0e0e10', acc: '#ff5a48', rim: '#b9bfc6' },
      { body: '#61121c', livery: '#0e0e10', acc: '#ff5a48', rim: '#cfd4da' },
      { body: '#580f19', livery: '#0b0b0d', acc: '#ff4a3d', rim: '#e3e7eb' },
    ],
    spokes: 5, wing: 'daytona',
  },
  {
    // Cap. 7 — hipercarro vermelho em cunha, faróis de LED
    id: 'lykan', name: 'Lykan HyperSport', chapter: 7,
    shape: { x0: 12, x1: 154, belly: 62, tail: 40, deck: [40, 39], roof: [68, 86, 30], wind: [106, 47], nose: 55, wheels: [38, 128, 11.5], round: 0.35 },
    paint: [
      { body: '#b40f26', livery: '#141416', acc: '#ffffff', rim: '#2a2b30' },
      { body: '#c8102e', livery: '#121214', acc: '#ffffff', rim: '#bfc5cc' },
      { body: '#d4112f', livery: '#0f0f11', acc: '#e8f6ff', rim: '#d5dae0' },
    ],
    spokes: 10, wing: null,
  },
  {
    // Cap. 8 — cinza fosco, alargado, blindado e com turbina para o gelo
    id: 'ice', name: 'Charger Ice', chapter: 8,
    shape: { x0: 10, x1: 151, belly: 56, tail: 35, deck: [30, 34], roof: [60, 93, 21], wind: [111, 36], nose: 39, wheels: [36, 126, 14], round: 0.55 },
    paint: [
      { body: '#5b6168', livery: '#30343a', acc: '#a8ecff', rim: '#2e3238' },
      { body: '#50565d', livery: '#2a2e33', acc: '#a8ecff', rim: '#2a2e33' },
      { body: '#454a50', livery: '#24272b', acc: '#9fe8ff', rim: '#24272b' },
    ],
    spokes: 6, wing: null, widebody: 2,
  },
  {
    // Cap. 9 — pequeno esportivo em cunha com um foguete preso no teto
    id: 'fiero', name: 'Fiero Rocket', chapter: 9,
    shape: { x0: 22, x1: 140, belly: 61, tail: 41, deck: [40, 39], roof: [62, 82, 28], wind: [100, 44], nose: 52, wheels: [42, 118, 10.5], round: 0.5 },
    paint: [
      { body: '#b3222a', livery: '#e9ecef', acc: '#ffae00', rim: '#9aa0a6' },
      { body: '#c4232c', livery: '#f1f3f5', acc: '#ffae00', rim: '#c3c8ce' },
      { body: '#d0242d', livery: '#ffffff', acc: '#ffb000', rim: '#dfe3e8' },
    ],
    spokes: 5, wing: null,
  },
  {
    // Cap. 10 — muscle preto, cromado e com o compressor saindo do capô
    id: 'charger', name: 'Charger Clássico', chapter: 10,
    shape: { x0: 7, x1: 154, belly: 60, tail: 38, deck: [28, 37], roof: [64, 92, 24], wind: [112, 38], nose: 39, wheels: [35, 128, 12.5], round: 0.45 },
    paint: [
      { body: '#16171b', livery: '#2a2c32', acc: '#cfd6de', rim: '#c3c9cf' },
      { body: '#0f1013', livery: '#26282d', acc: '#cfd6de', rim: '#dde1e6' },
      { body: '#08090b', livery: '#1f2125', acc: '#ff6a00', rim: '#eef1f4' },
    ],
    spokes: 10, wing: null,
  },
];

const MAX_LEVEL = MODELS.length * TIERS.length; // 30

/** Informações de um nível (1..30). */
function carInfo(level) {
  const m = MODELS[Math.floor((level - 1) / 3)];
  const tier = (level - 1) % 3;
  const p = m.paint[tier];
  return {
    level, tier, model: m, chapter: m.chapter,
    tierName: TIERS[tier],
    name: `${m.name} · ${TIERS[tier]}`,
    body: p.body, acc: p.acc,
    // rastro de luz na pista: lanterna vermelha → neon do carro
    trail: tier === 0 ? '#ff3355' : p.acc,
  };
}

/* ---------------------- Utilidades de cor / geometria ---------------------- */

function shade(hex, amt) {
  // amt > 0 clareia, amt < 0 escurece (−1..1)
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, f = Math.abs(amt);
  r = Math.round(r + (t - r) * f); g = Math.round(g + (t - g) * f); b = Math.round(b + (t - b) * f);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/** Polígono com cantos arredondados (cada ponto: [x, y, raio]). */
function roundedPath(pts) {
  const n = pts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const p = pts[i], prev = pts[(i - 1 + n) % n], next = pts[(i + 1) % n];
    const r = p[2] || 0;
    const v1x = prev[0] - p[0], v1y = prev[1] - p[1];
    const v2x = next[0] - p[0], v2y = next[1] - p[1];
    const l1 = Math.hypot(v1x, v1y) || 1, l2 = Math.hypot(v2x, v2y) || 1;
    const r1 = Math.min(r, l1 / 2), r2 = Math.min(r, l2 / 2);
    const ax = p[0] + v1x / l1 * r1, ay = p[1] + v1y / l1 * r1;
    const bx = p[0] + v2x / l2 * r2, by = p[1] + v2y / l2 * r2;
    d += (i === 0 ? 'M' : 'L') + ax.toFixed(1) + ' ' + ay.toFixed(1);
    d += 'Q' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' ' + bx.toFixed(1) + ' ' + by.toFixed(1);
  }
  return d + 'Z';
}
const f1 = (v) => v.toFixed(1);

/* ------------------------------ Rodas ------------------------------------- */

function wheelSVG(cx, cy, r, m, t, p) {
  const rim = p.rim;
  const rr = r * (t === 0 ? 0.6 : t === 1 ? 0.7 : 0.76);
  let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#0b0b0e"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${f1(r - 1.3)}" fill="none" stroke="#24242a" stroke-width="1.3"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${f1(rr)}" fill="${rim}"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${f1(rr * 0.84)}" fill="${shade(rim, -0.45)}"/>`;
  // pinça de freio aparecendo entre os raios (Tuned vermelha, Furious na cor do neon)
  if (t >= 1) s += `<rect x="${f1(cx + rr * 0.12)}" y="${f1(cy - rr * 0.72)}" width="${f1(rr * 0.42)}" height="${f1(rr * 0.85)}" rx="1.4" fill="${t === 2 ? (m.id === 'charger' ? '#ff6a00' : '#e0262f') : '#c8202a'}"/>`;
  const n = m.spokes;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3;
    s += `<line x1="${cx}" y1="${cy}" x2="${f1(cx + Math.cos(a) * rr * 0.84)}" y2="${f1(cy + Math.sin(a) * rr * 0.84)}" stroke="${rim}" stroke-width="${n >= 10 ? 1.1 : 2}" stroke-linecap="round"/>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="${f1(rr * 0.22)}" fill="${shade(rim, 0.3)}"/>`;
  // brilho do aro cromado
  s += `<path d="M${f1(cx - rr * 0.7)} ${f1(cy - rr * 0.3)} A${f1(rr)} ${f1(rr)} 0 0 1 ${f1(cx + rr * 0.3)} ${f1(cy - rr * 0.95)}" stroke="#fff" stroke-opacity=".45" stroke-width=".9" fill="none"/>`;
  return s;
}

/* ------------------------- Gerador do SVG do carro ------------------------- */

let _U = '';
/**
 * Gera o SVG de um nível. O mesmo SVG é usado na garagem (img), na pista
 * (canvas, via bitmap) e nos popups/coleção.
 * Importante: a roda fica em y = 70 − raio×(1 + 0,07×estágio) — a pista
 * desenha os raios girando nessa mesma posição.
 */
function carSVG(level) {
  _U = 'L' + level;
  const info = carInfo(level);
  const m = info.model, t = info.tier, sh = m.shape, p = m.paint[t];
  const ground = 70;
  const drop = m.id === 'ice' ? 0 : t * 1.6;        // rebaixamento (o Ice é alto de propósito)
  const wr = sh.wheels[2] * (1 + 0.07 * t);         // rodas maiores a cada estágio
  const wy = ground - wr;
  const R = sh.round;
  const B = sh.belly + drop;
  const y = (v) => v + drop;
  const mid = (y(sh.deck[1]) + B) / 2;              // meia altura da lateral
  const pillarX = (sh.roof[0] + sh.roof[1]) / 2 + 4;
  const ctx = { m, t, p, sh, y, B, mid, wr, wy, pillarX };

  const body = roundedPath([
    [sh.x0 + 1, B, 4],
    [sh.x0, y(sh.tail), 6 * R],
    [sh.deck[0], y(sh.deck[1]), 7 * R],
    [sh.roof[0], y(sh.roof[2]), 9 * R],
    [sh.roof[1], y(sh.roof[2]), 7 * R],
    [sh.wind[0], y(sh.wind[1]), 6 * R],
    [sh.x1 - 5, y(sh.nose), 6 * R],
    [sh.x1, y(sh.nose) + 6, 4 * R],
    [sh.x1 - 2, B, 3],
  ]);
  const glass = roundedPath([
    [sh.deck[0] + 5, y(sh.deck[1]) - 0.5, 3],
    [sh.roof[0] + 2.5, y(sh.roof[2]) + 3, 5 * R],
    [sh.roof[1] - 1, y(sh.roof[2]) + 3, 4 * R],
    [sh.wind[0] - 5, y(sh.wind[1]) - 0.5, 2],
  ]);

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80" width="160" height="80">`;
  s += `<defs>
    <filter id="glow${_U}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.5"/></filter>
    <filter id="blur${_U}" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="3.2"/></filter>
    <linearGradient id="paint${_U}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(p.body, m.id === 'ice' ? 0.12 : 0.3)}"/>
      <stop offset=".42" stop-color="${p.body}"/>
      <stop offset="1" stop-color="${shade(p.body, -0.5)}"/>
    </linearGradient>
    <linearGradient id="glass${_U}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${t ? '#2a4c78' : '#3a6fa8'}"/><stop offset=".5" stop-color="${t ? '#081428' : '#0d2140'}"/><stop offset="1" stop-color="${t ? '#163a62' : '#1b4a7a'}"/>
    </linearGradient>
    <linearGradient id="chrome${_U}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#b7bec7"/><stop offset=".55" stop-color="#6d747d"/><stop offset="1" stop-color="#d7dce2"/>
    </linearGradient>
    <linearGradient id="flame${_U}" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".25" stop-color="#bff6ff"/><stop offset=".6" stop-color="#3fa9ff"/><stop offset="1" stop-color="#3fa9ff" stop-opacity="0"/>
    </linearGradient>
  </defs>`;

  // Sombra e neon embaixo do carro (Tuned discreto, Furious forte)
  s += `<ellipse cx="${(sh.x0 + sh.x1) / 2}" cy="${ground + 1}" rx="${(sh.x1 - sh.x0) / 2}" ry="3.2" fill="#000" opacity=".55"/>`;
  if (t >= 1) s += `<ellipse cx="${(sh.x0 + sh.x1) / 2}" cy="${ground - 1}" rx="${(sh.x1 - sh.x0) / 2 - 8}" ry="${t === 2 ? 4.2 : 3}" fill="${p.acc}" opacity="${t === 2 ? 0.85 : 0.35}" filter="url(#blur${_U})"/>`;

  s += behindSVG(ctx);              // foguete, turbina e asas (atrás da lataria)

  // Chama de nitro saindo do escapamento (Furious)
  if (t === 2) {
    s += `<path d="M${sh.x0 + 2} ${B - 4} l-15 -3 l4 3 l-6 2 l17 1 Z" fill="url(#flame${_U})" filter="url(#glow${_U})"/>`;
    s += `<path d="M${sh.x0 + 2} ${B - 4} l-9 -1.5 l9 3 Z" fill="#fff"/>`;
  }

  // Lataria
  s += `<path d="${body}" fill="url(#paint${_U})" stroke="${shade(p.body, -0.65)}" stroke-width=".8"/>`;
  // Alargadores de para-lama (widebody)
  if (m.widebody && t >= 1) s += flaresSVG(ctx);
  // Reflexos: ombro da lataria e luz do asfalto molhado embaixo
  s += `<path d="M${sh.x0 + 6} ${y(sh.tail) + 5} L${sh.deck[0]} ${y(sh.deck[1]) + 4} L${sh.wind[0] + 4} ${y(sh.wind[1]) + 4} L${sh.x1 - 8} ${y(sh.nose) + 4}" fill="none" stroke="#fff" stroke-opacity="${m.id === 'ice' ? 0.1 : 0.24}" stroke-width="1.6" stroke-linecap="round"/>`;
  s += `<path d="M${sh.x0 + 4} ${B - 2.5} L${sh.x1 - 4} ${B - 2.5}" stroke="${t === 2 ? p.acc : '#8fc8ff'}" stroke-opacity="${t === 2 ? 0.5 : 0.2}" stroke-width="1.2" stroke-linecap="round"/>`;

  s += liverySVG(ctx);              // pintura e grafismo de cada filme

  // Vidros (escurecidos no Tuned/Furious)
  s += `<path d="${glass}" fill="url(#glass${_U})" stroke="${shade(p.body, -0.6)}" stroke-width=".7"/>`;
  s += `<path d="M${sh.roof[0] + 6} ${y(sh.roof[2]) + 4.5} L${sh.roof[0] + 14} ${y(sh.roof[2]) + 4.5} L${sh.roof[0] + 4} ${y(sh.deck[1]) - 2} Z" fill="#fff" opacity=".16"/>`;
  s += `<line x1="${pillarX}" y1="${y(sh.roof[2]) + 2.5}" x2="${pillarX + 2}" y2="${y(sh.deck[1]) + 0.5}" stroke="${shade(p.body, -0.5)}" stroke-width="2.2"/>`;

  // Portas, maçaneta, saia lateral
  const doorX = pillarX + 3;
  const lineC = shade(p.body, -0.6);
  s += `<path d="M${doorX} ${y(sh.deck[1]) + 1} L${doorX + 1} ${B - 3}" stroke="${lineC}" stroke-width=".7" fill="none"/>`;
  s += `<path d="M${sh.wind[0] - 6} ${y(sh.wind[1]) + 1} L${sh.wind[0] - 4} ${B - 3}" stroke="${lineC}" stroke-width=".7" fill="none"/>`;
  s += `<rect x="${doorX + 5}" y="${y(sh.deck[1]) + 5}" width="5" height="1.4" rx=".7" fill="${lineC}"/>`;
  if (t >= 1) s += `<path d="M${sh.wheels[0] + wr + 3} ${B - 1} L${sh.wheels[1] - wr - 3} ${B - 1}" stroke="${shade(p.body, -0.7)}" stroke-width="2.4" stroke-linecap="round"/>`;

  // Faróis e lanternas
  s += `<path d="M${sh.x1 - 7} ${y(sh.nose) + 2} l6 1.5 l-.5 3 l-6 -1 Z" fill="#fff8d0"/>`;
  s += `<rect x="${sh.x0 - 0.5}" y="${y(sh.tail) + 2}" width="4" height="4" rx="1" fill="#ff2a3d"/>`;
  if (t >= 1) s += `<rect x="${sh.x0 - 1}" y="${y(sh.tail) + 2}" width="5" height="4" rx="1" fill="#ff2a3d" filter="url(#glow${_U})"/>`;
  if (t === 2) s += `<path d="M${sh.x1 - 2} ${y(sh.nose) + 4} l16 -2.5 l0 7 Z" fill="#fffbe0" opacity=".35" filter="url(#glow${_U})"/>`;

  s += frontSVG(ctx);               // capô, compressor, LEDs, blindagem...

  // Caixas de roda + rodas
  for (const wx of [sh.wheels[0], sh.wheels[1]]) {
    s += `<circle cx="${wx}" cy="${f1(wy)}" r="${f1(wr + 2.2)}" fill="#07070a"/>`;
    s += wheelSVG(wx, +f1(wy), +f1(wr), m, t, p);
  }
  // Pneus com cravos para o gelo
  if (m.id === 'ice' && t >= 1) {
    for (const wx of [sh.wheels[0], sh.wheels[1]]) for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      s += `<circle cx="${f1(wx + Math.cos(a) * (wr - 0.6))}" cy="${f1(wy + Math.sin(a) * (wr - 0.6))}" r="${t === 2 ? 1 : 0.7}" fill="#e6f6ff"/>`;
    }
  }
  return s + `</svg>`;
}

/** Arcos alargados sobre as rodas (kits widebody). */
function flaresSVG({ m, t, p, sh, B, wr }) {
  const k = m.widebody === 2 ? 5.5 : 4.5;
  let s = '';
  for (const wx of [sh.wheels[0], sh.wheels[1]]) {
    const r = wr + k;
    s += `<path d="M${f1(wx - r)} ${B} L${f1(wx - r)} ${f1(B - 2)} A${f1(r)} ${f1(r)} 0 0 1 ${f1(wx + r)} ${f1(B - 2)} L${f1(wx + r)} ${B} Z" fill="url(#paint${_U})" stroke="${shade(p.body, -0.65)}" stroke-width=".8"/>`;
    if (m.id === 'ice') s += `<path d="M${f1(wx - r)} ${f1(B - 2)} A${f1(r)} ${f1(r)} 0 0 1 ${f1(wx + r)} ${f1(B - 2)}" fill="none" stroke="#1c1f23" stroke-width="2"/>`;
    if (t === 2 && m.id === 'rx7') s += `<path d="M${f1(wx - r + 2)} ${f1(B - 3)} A${f1(r - 2)} ${f1(r - 2)} 0 0 1 ${f1(wx + r - 2)} ${f1(B - 3)}" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1"/>`;
  }
  return s;
}

/** Peças que ficam atrás da lataria: asas, foguete, turbina. */
function behindSVG({ m, t, p, sh, y }) {
  let s = '';
  const tailY = y(sh.tail), deckY = y(sh.deck[1]);
  if (m.wing === 'hoop' && t >= 1) {
    // asa em arco que começa e termina na tampa traseira
    const x = sh.x0 + 3, w = 28, h = t === 2 ? 12 : 8, col = '#151518';
    s += `<path d="M${x + 1} ${tailY + 1} Q${x - 1} ${tailY - h} ${x + 8} ${tailY - h} L${x + w - 6} ${tailY - h - 1} Q${x + w} ${tailY - h} ${x + w - 1} ${deckY + 1}" fill="none" stroke="${col}" stroke-width="${t === 2 ? 3.6 : 3}" stroke-linecap="round"/>`;
  }
  if (m.wing === 'gt') {
    const x = sh.x0 + 3, h = [3, 7, 10][t], w = [16, 20, 23][t];
    s += `<path d="M${x + 5} ${tailY + 1} L${x + 6} ${tailY - h + 1} M${x + w - 5} ${deckY + 1} L${x + w - 4} ${tailY - h + 1}" stroke="#16161b" stroke-width="2"/>`;
    s += `<path d="M${x - 1} ${tailY - h} L${x + w + 1} ${tailY - h - 1.5} L${x + w} ${tailY - h + 2.5} L${x - 1} ${tailY - h + 3} Z" fill="${t === 2 ? '#141418' : shade(p.body, -0.2)}"/>`;
  }
  if (m.wing === 'veilside' && t >= 1) {
    // asa larga e baixa, apoiada em dois pilares
    const x = sh.x0 + 2, h = t === 2 ? 9 : 6;
    s += `<path d="M${x + 6} ${tailY + 1} L${x + 5} ${tailY - h + 1} M${x + 20} ${deckY + 1} L${x + 21} ${tailY - h + 1}" stroke="#101012" stroke-width="2.4"/>`;
    s += `<path d="M${x - 3} ${tailY - h - 1} Q${x + 12} ${tailY - h - 4} ${x + 29} ${tailY - h - 1} L${x + 28} ${tailY - h + 2} Q${x + 12} ${tailY - h} ${x - 3} ${tailY - h + 2} Z" fill="${p.livery}"/>`;
  }
  if (m.wing === 'sti') {
    // aerofólio alto de fábrica, maior a cada estágio
    const x = sh.x0 + 1, h = [4, 6, 8][t];
    s += `<path d="M${x + 3} ${tailY + 1} L${x + 3} ${tailY - h + 1} M${x + 11} ${tailY + 2} L${x + 12} ${tailY - h + 1}" stroke="${shade(p.body, -0.3)}" stroke-width="2"/>`;
    s += `<path d="M${x - 2} ${tailY - h} L${x + 16} ${tailY - h - 1} L${x + 16} ${tailY - h + 2} L${x - 2} ${tailY - h + 2.5} Z" fill="${t === 2 ? p.livery : shade(p.body, -0.15)}"/>`;
  }
  if (m.wing === 'daytona') {
    // asa altíssima característica, cresce a cada estágio
    const h = 14 + t * 2.5, x = sh.x0 + 5;
    s += `<path d="M${x + 3} ${tailY + 1} L${x + 1} ${tailY - h} M${x + 18} ${deckY + 1} L${x + 17} ${tailY - h}" stroke="url(#paint${_U})" stroke-width="3"/>`;
    s += `<path d="M${x - 3} ${tailY - h - 2} L${x + 22} ${tailY - h - 3} L${x + 22} ${tailY - h + 1} L${x - 3} ${tailY - h + 2} Z" fill="${t === 2 ? p.livery : p.body}" stroke="${shade(p.body, -0.6)}" stroke-width=".6"/>`;
  }
  if (m.id === 'fiero' && t >= 1) {
    // foguete preso no teto
    const ry = y(sh.roof[2]) - (t === 2 ? 9 : 6), rl = t === 2 ? 62 : 42, rx = sh.roof[0] - (t === 2 ? 26 : 12);
    if (t === 2) s += `<path d="M${rx} ${ry} l-24 -3.5 l5 3.5 l-5 3.5 Z" fill="url(#flame${_U})" filter="url(#glow${_U})"/>`;
    s += `<rect x="${rx}" y="${ry - 4}" width="${rl}" height="8" rx="4" fill="url(#chrome${_U})" stroke="#4a4f56" stroke-width=".6"/>`;
    s += `<path d="M${rx + rl} ${ry - 4} q9 4 0 8 Z" fill="#e9ecef" stroke="#4a4f56" stroke-width=".5"/>`;
    s += `<rect x="${rx + 8}" y="${ry - 1}" width="${rl - 18}" height="2" fill="${p.body}"/>`;
    s += `<path d="M${rx + 2} ${ry - 4} l-3 -4 l7 0 Z M${rx + 2} ${ry + 4} l-3 4 l7 0 Z" fill="#6a7078"/>`;
    s += `<path d="M${rx + rl * 0.35} ${ry + 4} l2 ${y(sh.roof[2]) - ry - 3} M${rx + rl * 0.7} ${ry + 4} l-2 ${y(sh.roof[2]) - ry - 3}" stroke="#30343a" stroke-width="1.6"/>`;
  }
  if (m.id === 'ice' && t === 2) {
    // turbina saindo da traseira
    const tx = sh.x0 - 6, ty = y(sh.tail) + 4;
    s += `<rect x="${tx}" y="${ty - 5}" width="16" height="10" rx="5" fill="url(#chrome${_U})" stroke="#2a2e33" stroke-width=".7"/>`;
    s += `<ellipse cx="${tx + 1}" cy="${ty}" rx="2.4" ry="4.6" fill="#111"/><ellipse cx="${tx + 1}" cy="${ty}" rx="1.4" ry="3" fill="${p.acc}" filter="url(#glow${_U})"/>`;
  }
  return s;
}

/** Pintura/grafismos inspirados em cada filme (sem textos nem logos). */
function liverySVG({ m, t, p, sh, y, B, mid, pillarX }) {
  const L = p.livery, x0 = sh.x0, x1 = sh.x1;
  let s = '';
  switch (m.id) {
    case 'supra': {
      // grafismo tribal escuro: lâminas pontudas da traseira até a porta
      if (t === 0) break;
      const blades = t === 1
        ? [[x0 + 10, mid + 5, x0 + 52, mid - 4, 4]]
        : [[x0 + 8, mid + 6, x0 + 70, mid - 8, 5.5], [x0 + 22, mid + 9, x0 + 84, mid + 1, 3.5], [x0 + 6, mid - 1, x0 + 40, mid - 7, 3]];
      for (const [ax, ay, bx, by, w] of blades) {
        s += `<path d="M${ax} ${ay} Q${(ax + bx) / 2} ${by - w * 0.4} ${bx} ${by} Q${(ax + bx) / 2 - 4} ${by + w * 1.4} ${ax + 3} ${ay + w} Z" fill="${L}"/>`;
      }
      if (t === 2) s += `<path d="M${x1 - 30} ${mid + 6} Q${x1 - 18} ${mid + 1} ${x1 - 6} ${mid + 2} Q${x1 - 18} ${mid + 5} ${x1 - 28} ${mid + 9} Z" fill="${L}"/>`;
      break;
    }
    case 'skyline': {
      // ondas azuis atravessando a lateral
      if (t === 0) { s += `<rect x="${x0 + 6}" y="${mid + 3}" width="${x1 - x0 - 14}" height="1.2" fill="${shade(p.body, -0.35)}"/>`; break; }
      s += `<path d="M${x0 + 5} ${mid + 7} C${x0 + 40} ${mid - 6} ${x0 + 82} ${mid + 4} ${x1 - 10} ${mid - 5} L${x1 - 11} ${mid - 2} C${x0 + 84} ${mid + 7} ${x0 + 42} ${mid - 2} ${x0 + 6} ${mid + 10} Z" fill="${L}"/>`;
      if (t === 2) {
        s += `<path d="M${x0 + 18} ${mid + 11} C${x0 + 50} ${mid + 2} ${x0 + 86} ${mid + 10} ${x1 - 18} ${mid + 3} L${x1 - 19} ${mid + 4.6} C${x0 + 88} ${mid + 12} ${x0 + 52} ${mid + 4.5} ${x0 + 19} ${mid + 13} Z" fill="${shade(L, 0.3)}"/>`;
        s += `<path d="M${x0 + 8} ${y(sh.tail) + 3} q14 -2 22 2 q-12 0 -22 3 Z" fill="${L}"/>`;
      }
      break;
    }
    case 'rx7': {
      // pintura dividida: frente laranja, traseira e parte de baixo pretas
      if (t === 0) break;
      if (t === 1) { s += `<path d="M${x0 + 2} ${B - 1} L${x0 + 2} ${mid + 4} L${x1 - 6} ${mid + 6} L${x1 - 4} ${B - 1} Z" fill="${L}" opacity=".92"/>`; break; }
      s += `<path d="M${x0 + 1} ${B - 1} L${x0} ${y(sh.tail) + 1} L${sh.deck[0] - 2} ${y(sh.deck[1]) + 1} L${sh.roof[0] + 8} ${y(sh.roof[2]) + 1} L${pillarX + 6} ${B - 1} Z" fill="${L}"/>`;
      s += `<path d="M${pillarX + 6} ${B - 1} L${x1 - 4} ${B - 1} L${x1 - 6} ${mid + 7} L${pillarX + 4} ${mid + 7} Z" fill="${L}" opacity=".95"/>`;
      break;
    }
    case 'impreza': {
      // prata em cima, preto embaixo; capô escuro no Furious
      if (t === 0) break;
      s += `<path d="M${x0 + 2} ${B - 1} L${x0 + 1} ${mid + (t === 2 ? 1 : 6)} L${x1 - 4} ${mid + (t === 2 ? 1 : 6)} L${x1 - 2} ${B - 1} Z" fill="${L}" opacity=".95"/>`;
      if (t === 2) s += `<path d="M${sh.wind[0] + 1} ${y(sh.wind[1]) + 0.4} L${x1 - 6} ${y(sh.nose) + 0.4} L${x1 - 5} ${y(sh.nose) + 2.5} L${sh.wind[0] + 1} ${y(sh.wind[1]) + 2.5} Z" fill="#1b1c20"/>`;
      break;
    }
    case 'gt40': {
      // faixas duplas brancas (todas as evoluções) e círculo de corrida
      const th = [1.6, 2.2, 2.8][t];
      s += `<rect x="${x0 + 6}" y="${mid - 2}" width="${x1 - x0 - 14}" height="${th}" fill="${L}"/>`;
      s += `<rect x="${x0 + 6}" y="${mid + 2.2}" width="${x1 - x0 - 14}" height="${th}" fill="${L}"/>`;
      s += `<path d="M${sh.roof[0] + 4} ${y(sh.roof[2]) + 0.6} L${sh.roof[1] - 2} ${y(sh.roof[2]) + 0.6}" stroke="${L}" stroke-width="1.4"/>`;
      if (t >= 1) s += `<circle cx="${pillarX + 14}" cy="${mid + 1}" r="${t === 2 ? 5.6 : 4.6}" fill="${L}" stroke="${shade(p.body, -0.3)}" stroke-width=".6"/>`;
      break;
    }
    case 'daytona': {
      // faixa preta envolvendo a traseira
      if (t === 0) break;
      s += `<path d="M${x0 + 14} ${y(sh.tail) + 1} L${x0 + 22} ${y(sh.tail)} L${x0 + 22} ${B - 1} L${x0 + 14} ${B - 1} Z" fill="${L}"/>`;
      if (t === 2) s += `<path d="M${x0 + 25} ${y(sh.tail)} L${x0 + 28} ${y(sh.tail)} L${x0 + 28} ${B - 1} L${x0 + 25} ${B - 1} Z" fill="${L}"/>`;
      break;
    }
    case 'lykan': {
      // saias e entradas de ar pretas, recorte agressivo
      s += `<path d="M${x0 + 24} ${B - 3} L${x0 + 42} ${mid - 1} L${x0 + 47} ${B - 3} Z" fill="${L}"/>`;
      if (t >= 1) s += `<path d="M${x0 + 4} ${B - 1} L${x0 + 4} ${B - 5} L${x1 - 8} ${B - 6} L${x1 - 4} ${B - 1} Z" fill="${L}" opacity=".9"/>`;
      if (t === 2) s += `<path d="M${x0 + 30} ${mid + 1} L${x0 + 46} ${mid - 3}" stroke="${shade(p.body, 0.35)}" stroke-width=".8"/>`;
      break;
    }
    case 'ice': {
      // placas de blindagem com rebites
      if (t === 0) break;
      const plates = t === 1 ? [[x0 + 22, mid, 26, 7]] : [[x0 + 16, mid - 2, 30, 9], [x0 + 52, mid - 1, 34, 8], [x1 - 40, mid, 24, 7]];
      for (const [px, py, pw, ph] of plates) {
        s += `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="1" fill="${L}" stroke="#16191c" stroke-width=".6"/>`;
        for (const rx of [px + 2, px + pw - 2]) for (const ry of [py + 1.6, py + ph - 1.6]) s += `<circle cx="${rx}" cy="${ry}" r=".6" fill="#8c949c"/>`;
      }
      break;
    }
    case 'fiero': {
      if (t === 0) break;
      s += `<rect x="${x0 + 4}" y="${mid + 2}" width="${x1 - x0 - 10}" height="${t === 2 ? 2.4 : 1.6}" fill="${L}"/>`;
      break;
    }
    case 'charger': {
      // teto de vinil preto fosco e frisos cromados
      s += `<path d="M${sh.deck[0] + 4} ${y(sh.deck[1]) - 0.5} L${sh.roof[0] + 1} ${y(sh.roof[2]) - 0.4} L${sh.roof[1] - 1} ${y(sh.roof[2]) - 0.4} L${sh.roof[1] + 2} ${y(sh.roof[2]) + 1.4} L${sh.roof[0] + 1} ${y(sh.roof[2]) + 1.4} Z" fill="${L}"/>`;
      s += `<path d="M${x0 + 4} ${mid + 3} L${x1 - 6} ${mid + 3}" stroke="url(#chrome${_U})" stroke-width="${t === 2 ? 1.2 : 0.8}"/>`;
      s += `<rect x="${x1 - 6}" y="${B - 5}" width="5" height="3" rx="1" fill="url(#chrome${_U})"/><rect x="${x0 - 1}" y="${B - 5}" width="5" height="3" rx="1" fill="url(#chrome${_U})"/>`;
      break;
    }
  }
  return s;
}

/** Detalhes da frente/cima: tomadas de ar, compressor, LEDs, faróis escamoteáveis. */
function frontSVG({ m, t, p, sh, y, B }) {
  let s = '';
  const wx = sh.wind[0], wyY = y(sh.wind[1]), nose = y(sh.nose);
  switch (m.id) {
    case 'impreza': // tomada de ar no capô e para-barro
      s += `<path d="M${wx + 4} ${wyY + 0.5} l3 -3.4 l11 0.6 l1 3.4 Z" fill="${shade(p.body, -0.35)}"/>`;
      if (t >= 1) s += `<path d="M${sh.wheels[0] - 6} ${B - 1} l-1 7 l4 0 l0 -7 Z" fill="#1a1b1f"/>`;
      break;
    case 'skyline':
      if (t >= 1) s += `<path d="M${sh.x1 - 10} ${B - 2} l9 -1 l0 3 l-9 0 Z" fill="#16161a"/>`;   // lábio dianteiro
      break;
    case 'rx7':
      s += `<path d="M${sh.x1 - 16} ${nose + 1} l11 1.4" stroke="#fff6c8" stroke-width="1.2"/>`;   // faróis estreitos
      break;
    case 'lykan': // faróis de LED finos
      s += `<path d="M${sh.x1 - 22} ${nose + 1} L${sh.x1 - 3} ${nose + 3.5}" stroke="${p.acc}" stroke-width="1.3" ${t >= 1 ? `filter="url(#glow${_U})"` : ''}/>`;
      s += `<path d="M${sh.x1 - 22} ${nose + 1} L${sh.x1 - 3} ${nose + 3.5}" stroke="#fff" stroke-width=".6"/>`;
      if (t >= 1) s += `<path d="M${wx + 4} ${wyY + 0.6} l18 2" stroke="#111" stroke-width="1.6"/>`;
      break;
    case 'ice':
      if (t >= 1) s += `<path d="M${sh.x1 - 3} ${B} l6 -2 l0 -9 l-6 -1 Z" fill="#2a2e33" stroke="${p.acc}" stroke-width=".5"/>`;   // para-choque de impacto
      if (t === 2) s += `<rect x="${sh.roof[0] + 4}" y="${y(sh.roof[2]) - 4}" width="24" height="4" rx="1" fill="#2a2e33"/><circle cx="${sh.roof[0] + 10}" cy="${y(sh.roof[2]) - 2}" r="1.2" fill="${p.acc}" filter="url(#glow${_U})"/><circle cx="${sh.roof[0] + 22}" cy="${y(sh.roof[2]) - 2}" r="1.2" fill="${p.acc}" filter="url(#glow${_U})"/>`;
      break;
    case 'gt40': // grade do motor central atrás da cabine
      for (let i = 0; i < 4; i++) s += `<line x1="${sh.x0 + 9 + i * 5}" y1="${y(sh.deck[1]) + 1}" x2="${sh.x0 + 11 + i * 5}" y2="${y(sh.deck[1]) - 1.2}" stroke="#0d0f14" stroke-width="1"/>`;
      break;
    case 'daytona': // bico pontudo
      s += `<path d="M${sh.x1 - 14} ${nose + 1} L${sh.x1 + 1} ${nose + 5} L${sh.x1 - 14} ${nose + 8} Z" fill="url(#paint${_U})" stroke="${shade(p.body, -0.6)}" stroke-width=".5"/>`;
      break;
    case 'fiero': // faróis escamoteáveis
      if (t >= 1) s += `<path d="M${sh.x1 - 16} ${nose - 0.5} l7 -2.5 l1 2.5 Z" fill="${shade(p.body, -0.3)}"/>`;
      if (t >= 1) s += `<rect x="${sh.x0 - 3}" y="${B - 6}" width="7" height="3" rx="1.5" fill="url(#chrome${_U})"/>`;
      break;
    case 'charger': { // compressor saindo do capô (cresce a cada estágio)
      const bx = wx + 8, by = wyY + 0.5, bh = [4, 8, 12][t], bw = [10, 13, 15][t];
      s += `<rect x="${bx}" y="${by - bh}" width="${bw}" height="${bh}" rx="1.5" fill="url(#chrome${_U})" stroke="#4a4f56" stroke-width=".6"/>`;
      for (let i = 1; i < 4; i++) s += `<line x1="${bx + 1}" y1="${by - bh + i * bh / 4}" x2="${bx + bw - 1}" y2="${by - bh + i * bh / 4}" stroke="#7a8088" stroke-width=".7"/>`;
      if (t >= 1) s += `<rect x="${bx - 1.5}" y="${by - bh - 4}" width="${bw + 3}" height="4" rx="1.5" fill="${t === 2 ? '#1a1b1f' : '#2a2a2a'}" stroke="url(#chrome${_U})" stroke-width=".6"/>`;
      if (t === 2) s += `<path d="M${bx + 4} ${by - bh - 4} q-2 -6 3 -9 q-1 5 3 6 q2 -4 1 -7 q5 4 2 10 Z" fill="${p.acc}" opacity=".85" filter="url(#glow${_U})"/>`;
      break;
    }
  }
  return s;
}

/* -------------------- Cache de imagens (data URL do SVG) ------------------- */

const _carCache = {};
const _bmpCache = {};
/**
 * Versão rasterizada (canvas) do carro para desenhar na pista.
 * Desenhar o SVG direto no canvas a cada quadro força o navegador a
 * re-rasterizar o vetor (caro no Safari); o bitmap é feito uma vez só.
 */
function carBitmap(level) {
  const b = _bmpCache[level];
  if (b) return b.ready ? b.canvas : null;
  const entry = _bmpCache[level] = { ready: false, canvas: document.createElement('canvas') };
  const a = carAsset(level);
  const paint = () => {
    entry.canvas.width = 320; entry.canvas.height = 160;
    entry.canvas.getContext('2d').drawImage(a.img, 0, 0, 320, 160);
    entry.ready = true;
  };
  if (a.img.complete && a.img.naturalWidth) paint();
  else a.img.addEventListener('load', paint, { once: true });
  return null;
}
/** Retorna { url, img } do nível — o SVG é gerado só uma vez. */
function carAsset(level) {
  if (!_carCache[level]) {
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(carSVG(level));
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    _carCache[level] = { url, img };
  }
  return _carCache[level];
}
