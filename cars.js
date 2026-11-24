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
    shape: { x0: 11, x1: 150, sill: 62, tail: 47.5, deck: [34, 42.5], roof: [60, 84, 32], wind: [104, 42.2], nose: 47.4, wheels: [37.5, 124, 9.6] },
    // contorno real: capô longo, teto em bolha, traseira alta e arredondada
    top: [[12, 63, 1], [10.5, 55], [11.5, 47.5], [16, 44.5], [34, 42.5], [47, 37], [60, 32.6], [73, 31.8], [84, 32.4], [96, 37.5], [104, 42.2], [122, 44.6], [139, 47.4], [147, 50.5], [150.5, 55.5], [149, 63, 1]],
    glass: [[41, 43, 2], [60, 35, 5], [83, 35, 4], [99, 42.6, 2]], pillars: [71.5], doors: [69, 100],
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
    shape: { x0: 11, x1: 150, sill: 62, tail: 45, deck: [31, 42.4], roof: [53, 88, 29.6], wind: [108, 41.4], nose: 44, wheels: [37, 124, 10] },
    // quadrado e alto, porta-malas curto, frente rombuda
    top: [[12, 63, 1], [11, 52, 1], [11.5, 45], [13, 43.5, 1], [31, 42.4, 1], [42, 36], [53, 30.2, 1], [70, 29.6], [88, 30.2, 1], [99, 36], [108, 41.4, 1], [127, 42.6], [144, 44, 1], [149.5, 46.5], [150, 57], [148, 63, 1]],
    glass: [[37, 42.3, 2], [54, 32.4, 3], [87, 32.6, 3], [104.5, 41.6, 2]], pillars: [71], doors: [68, 104],
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
    shape: { x0: 12, x1: 151, sill: 62.5, tail: 48.5, deck: [31, 46], roof: [61, 81, 35], wind: [101, 46], nose: 51.8, wheels: [38, 124, 9.6] },
    // baixíssimo e curvo, cabine em bolha, bico longo e afilado
    top: [[12, 62, 1], [11.5, 54], [13, 48.5], [19, 46.6], [31, 46], [46, 40], [61, 35.6], [72, 35], [81, 35.6], [92, 40.5], [101, 46], [120, 48.8], [139, 51.8], [149, 55.5], [151, 59], [148, 63, 1]],
    glass: [[40, 46.4, 2], [61, 37.8, 5], [80, 37.8, 4], [96, 46, 2]], pillars: [72], doors: [70, 98],
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
    shape: { x0: 13, x1: 149, sill: 62, tail: 41, deck: [20, 33], roof: [27, 82, 24.5], wind: [108, 39.2], nose: 43.2, wheels: [36, 122, 10.4] },
    // hatch de 5 portas: teto longo até a traseira, vidro traseiro inclinado
    top: [[14, 63, 1], [13, 55], [13.5, 47], [15, 41], [20, 33], [27, 26.5, 1], [40, 25], [60, 24.3], [82, 24.6, 1], [95, 31.5], [108, 39.2, 1], [126, 41], [142, 43.2], [148, 47], [149, 57], [146, 63, 1]],
    glass: [[22, 38.5, 2], [29, 28.2, 3], [81, 27.2, 3], [104, 39, 2]], pillars: [47, 66], doors: [44, 68, 104],
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
    shape: { x0: 10, x1: 151, sill: 62.5, tail: 44.5, deck: [58, 40.2], roof: [66, 84, 35.6], wind: [104, 47.4], nose: 50, wheels: [37, 125, 10] },
    // baixinho (1 m de altura), traseira longa cortada reta, para-lamas em lombada
    top: [[11, 62, 1], [10, 52], [10.5, 44.5, 1], [18, 42.5], [30, 40.2], [38, 39.4], [48, 40.6], [58, 40.2], [66, 36.4], [75, 35.6], [84, 36.4], [95, 42], [104, 47.4], [115, 46.8], [125, 45.2], [135, 46.6], [145, 50], [151, 55], [151, 60], [148, 63, 1]],
    glass: [[68, 45, 2], [70, 38.2, 3], [83, 38.2, 3], [97, 45.5, 2]], pillars: [], doors: [64, 99],
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
    shape: { x0: 8, x1: 158, sill: 62, tail: 46.5, deck: [36, 43.6], roof: [62, 86, 32], wind: [104, 43], nose: 45.2, wheels: [34, 122, 10.4] },
    // longo, vidro traseiro rente, bico em cunha
    top: [[8, 62, 1], [7.5, 53], [8, 46.5, 1], [20, 45], [36, 43.6, 1], [50, 37.5], [62, 32.6, 1], [75, 32], [86, 32.6, 1], [96, 38], [104, 43, 1], [120, 44.2], [136, 45.2], [148, 49.5], [158, 55.5, 1], [151, 63, 1]],
    glass: [[43, 43.2, 2], [62, 35, 4], [85, 35, 3], [100, 43, 2]], pillars: [73], doors: [70, 101],
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
    shape: { x0: 12, x1: 154, sill: 62, tail: 46.5, deck: [44, 40.2], roof: [67, 82, 33], wind: [105, 46.2], nose: 51.5, wheels: [38, 127, 10] },
    // cunha de motor central, linhas retas e afiadas
    top: [[12, 62, 1], [11.5, 52], [12, 46.5, 1], [30, 43.2], [44, 40.2, 1], [56, 36], [67, 33.2, 1], [76, 32.8], [82, 33.4, 1], [94, 40], [105, 46.2, 1], [117, 45.6], [127, 44.6], [137, 46.6], [147, 51.5], [154, 56.5], [154, 59.5], [150, 63, 1]],
    glass: [[61, 44.8, 1], [68, 35.6, 2], [81, 35.6, 2], [100, 46.6, 1]], pillars: [75], doors: [62, 102],
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
    shape: { x0: 10, x1: 151.5, sill: 57.5, tail: 42, deck: [34, 39.4], roof: [60, 88, 27], wind: [108, 38.2], nose: 40.2, wheels: [36, 126, 13] },
    // Charger 68 elevado para o gelo: rodas enormes, corpo alto
    top: [[10, 58, 1], [9.5, 50], [10, 42, 1], [22, 40.6], [34, 39.4, 1], [48, 33], [60, 27.6, 1], [75, 27], [88, 27.6, 1], [98, 33], [108, 38.2, 1], [126, 39.2], [146, 40.2, 1], [151, 42.5], [151.5, 54], [148, 58, 1]],
    glass: [[41, 39.2, 2], [61, 30, 4], [87, 30, 3], [104, 38.2, 2]], pillars: [74], doors: [70, 104],
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
    shape: { x0: 21, x1: 142, sill: 62, tail: 46, deck: [46, 43.6], roof: [62, 79, 33.2], wind: [98, 44.2], nose: 49.2, wheels: [42, 119, 9.4] },
    // pequeno, motor central, traseira reta e frente em cunha
    top: [[22, 62, 1], [21, 53], [21.5, 46, 1], [34, 44.6], [46, 43.6, 1], [54, 38], [62, 33.6, 1], [71, 33.2], [79, 33.6, 1], [89, 38.6], [98, 44.2, 1], [116, 46.6], [134, 49.2], [140, 51.8], [142, 56], [140, 62.5, 1]],
    glass: [[50, 43.2, 2], [63, 36, 3], [78, 36, 3], [94, 44, 2]], pillars: [70], doors: [66, 95],
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
    shape: { x0: 7, x1: 154.5, sill: 62, tail: 46, deck: [36, 42.8], roof: [62, 90, 31.8], wind: [110, 42.2], nose: 43.6, wheels: [35, 128, 10.8] },
    // muscle longo: capô enorme, teto com colunas "voadoras", frente reta
    top: [[7, 62, 1], [6.5, 53], [7, 46, 1], [22, 44.4], [36, 42.8, 1], [48, 37.6], [62, 32.4, 1], [76, 31.8], [90, 32.4, 1], [100, 37.4], [110, 42.2, 1], [130, 42.8], [150, 43.6, 1], [154, 46], [154.5, 58], [151, 63, 1]],
    glass: [[44, 42.4, 2], [63, 34.6, 4], [89, 34.6, 3], [106, 42.2, 2]], pillars: [76], doors: [72, 107],
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

/** Contorno suave (Catmull-Rom → Bézier). Nó com 3º valor = 1 vira quina. */
function smoothPath(nodes) {
  let d = `M${nodes[0][0]} ${nodes[0][1]}`;
  const k = 1 / 6;
  for (let i = 0; i < nodes.length - 1; i++) {
    const p0 = nodes[i - 1] || nodes[i], p1 = nodes[i], p2 = nodes[i + 1], p3 = nodes[i + 2] || p2;
    const c1 = p1[2] ? [p1[0], p1[1]] : [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = p2[2] ? [p2[0], p2[1]] : [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += ` C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/** Geometria das caixas de roda (recorte na lataria). */
function archOf(sh, wx) {
  const r = sh.wheels[2], cy = 70 - r, ar = r * 1.12 + 1.8;
  const dy = sh.sill - cy, dx = Math.sqrt(Math.max(1, ar * ar - dy * dy));
  return { cx: wx, cy, ar, l: wx - dx, r: wx + dx, large: dy > 0 ? 1 : 0 };
}

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
  const B = sh.sill;
  const y = (v) => v;                                // a carroceria inteira desce via transform
  const mid = (sh.deck[1] + B) / 2;
  const pillarX = m.pillars[0] || (sh.roof[0] + sh.roof[1]) / 2;
  const ctx = { m, t, p, sh, y, B, mid, wr, wy, pillarX };
  const aR = archOf(sh, sh.wheels[0]), aF = archOf(sh, sh.wheels[1]);

  // Lataria: contorno de cima + parte de baixo com os arcos das rodas
  const body = smoothPath(m.top) +
    ` L${f1(aF.r)} ${B} A${f1(aF.ar)} ${f1(aF.ar)} 0 ${aF.large} 0 ${f1(aF.l)} ${B}` +
    ` L${f1(aR.r)} ${B} A${f1(aR.ar)} ${f1(aR.ar)} 0 ${aR.large} 0 ${f1(aR.l)} ${B} Z`;
  const glass = roundedPath(m.glass);
  const gTop = Math.min(m.glass[1][1], m.glass[2][1]), gBot = Math.max(m.glass[0][1], m.glass[3][1]);

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80" width="160" height="80">`;
  s += `<defs>
    <filter id="glow${_U}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.5"/></filter>
    <filter id="blur${_U}" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="3.2"/></filter>
    <linearGradient id="paint${_U}" x1="0" x2="0" gradientUnits="userSpaceOnUse" y1="${sh.roof[2]}" y2="${B}">
      <stop offset="0" stop-color="${shade(p.body, m.id === 'ice' ? 0.1 : 0.32)}"/>
      <stop offset=".38" stop-color="${p.body}"/>
      <stop offset=".62" stop-color="${shade(p.body, -0.08)}"/>
      <stop offset="1" stop-color="${shade(p.body, -0.55)}"/>
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

  s += `<g transform="translate(0 ${drop})">`;
  // fundo escuro das caixas de roda
  for (const a of [aR, aF]) s += `<circle cx="${a.cx}" cy="${f1(a.cy)}" r="${f1(a.ar)}" fill="#060608"/>`;
  s += behindSVG(ctx);
  if (t === 2) {   // chama de nitro saindo do escapamento
    s += `<path d="M${sh.x0 + 2} ${B - 4} l-15 -3 l4 3 l-6 2 l17 1 Z" fill="url(#flame${_U})" filter="url(#glow${_U})"/>`;
    s += `<path d="M${sh.x0 + 2} ${B - 4} l-9 -1.5 l9 3 Z" fill="#fff"/>`;
  }
  s += `<path d="${body}" fill="url(#paint${_U})" stroke="${shade(p.body, -0.7)}" stroke-width=".8" stroke-linejoin="round"/>`;
  if (m.widebody && t >= 1) s += flaresSVG(ctx, [aR, aF]);
  // vinco lateral (linha de cintura) e luz do asfalto molhado embaixo
  s += `<path d="M${sh.x0 + 5} ${f1(gBot + 2)} L${sh.x1 - 10} ${f1(gBot + 3.5)}" stroke="#fff" stroke-opacity="${m.id === 'ice' ? 0.08 : 0.22}" stroke-width="1.1" stroke-linecap="round"/>`;
  s += `<path d="M${sh.x0 + 5} ${f1(gBot + 3.3)} L${sh.x1 - 10} ${f1(gBot + 4.8)}" stroke="#000" stroke-opacity=".18" stroke-width=".8"/>`;
  s += `<path d="M${f1(aR.r + 2)} ${B - 2} L${f1(aF.l - 2)} ${B - 2}" stroke="${t === 2 ? p.acc : '#8fc8ff'}" stroke-opacity="${t === 2 ? 0.5 : 0.2}" stroke-width="1.2" stroke-linecap="round"/>`;

  s += liverySVG(ctx);

  // Vidros, colunas e reflexo
  s += `<path d="${glass}" fill="url(#glass${_U})" stroke="${shade(p.body, -0.65)}" stroke-width=".7"/>`;
  s += `<path d="M${m.glass[1][0] + 4} ${f1(gTop + 1.5)} L${m.glass[1][0] + 12} ${f1(gTop + 1.5)} L${m.glass[0][0] + 6} ${f1(gBot - 1)} L${m.glass[0][0] + 2} ${f1(gBot - 1)} Z" fill="#fff" opacity=".14"/>`;
  for (const px of m.pillars) s += `<path d="M${px} ${f1(gTop)} L${px + 1.8} ${f1(gBot)}" stroke="${shade(p.body, -0.55)}" stroke-width="2.3"/>`;
  // portas e maçaneta
  const lineC = shade(p.body, -0.62);
  m.doors.forEach((dx, i) => { s += `<path d="M${dx} ${f1(gBot + 0.5)} L${dx + 1.2} ${B - 2.5}" stroke="${lineC}" stroke-width=".7" fill="none"/>`; if (i === 0) s += `<rect x="${dx + 4}" y="${f1(gBot + 4)}" width="5" height="1.4" rx=".7" fill="${lineC}"/>`; });
  // saia lateral (Tuned/Furious)
  if (t >= 1) s += `<path d="M${f1(aR.r + 1)} ${B - 0.8} L${f1(aF.l - 1)} ${B - 0.8}" stroke="${shade(p.body, -0.75)}" stroke-width="2.2" stroke-linecap="round"/>`;
  // lanterna e farol
  s += `<rect x="${sh.x0 - 0.2}" y="${sh.tail + 1.5}" width="3.2" height="4" rx="1" fill="#ff2a3d"/>`;
  if (t >= 1) s += `<rect x="${sh.x0 - 0.8}" y="${sh.tail + 1.5}" width="4" height="4" rx="1" fill="#ff2a3d" filter="url(#glow${_U})"/>`;
  s += `<path d="M${sh.x1 - 9} ${sh.nose + 1.6} l7.5 1.8 l-.6 2.8 l-7 -1.2 Z" fill="#fff8d0" stroke="${lineC}" stroke-width=".4"/>`;
  if (t === 2) s += `<path d="M${sh.x1 - 2} ${sh.nose + 4} l16 -2.5 l0 7 Z" fill="#fffbe0" opacity=".35" filter="url(#glow${_U})"/>`;
  s += frontSVG(ctx);
  s += `</g>`;

  // Rodas (não descem: a lataria é que fica mais baixa em volta delas)
  for (const wx of [sh.wheels[0], sh.wheels[1]]) s += wheelSVG(wx, +f1(wy), +f1(wr), m, t, p);
  if (m.id === 'ice' && t >= 1) {   // cravos para o gelo
    for (const wx of [sh.wheels[0], sh.wheels[1]]) for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      s += `<circle cx="${f1(wx + Math.cos(a) * (wr - 0.6))}" cy="${f1(wy + Math.sin(a) * (wr - 0.6))}" r="${t === 2 ? 1 : 0.7}" fill="#e6f6ff"/>`;
    }
  }
  return s + `</svg>`;
}

/** Alargadores (widebody): faixa em arco por cima de cada roda. */
function flaresSVG({ m, t, p, sh, B }, arches) {
  const k = m.widebody === 2 ? 4.5 : 3.8;
  let s = '';
  for (const a of arches) {
    const R = a.ar + k, dyR = B - a.cy, dxR = Math.sqrt(Math.max(1, R * R - dyR * dyR));
    s += `<path d="M${f1(a.cx - dxR)} ${B} A${f1(R)} ${f1(R)} 0 ${a.large} 1 ${f1(a.cx + dxR)} ${B} L${f1(a.r)} ${B} A${f1(a.ar)} ${f1(a.ar)} 0 ${a.large} 0 ${f1(a.l)} ${B} Z" fill="url(#paint${_U})" stroke="${shade(p.body, -0.7)}" stroke-width=".8"/>`;
    s += `<path d="M${f1(a.cx - dxR + 1.5)} ${B - 1} A${f1(R - 1.5)} ${f1(R - 1.5)} 0 ${a.large} 1 ${f1(a.cx + dxR - 1.5)} ${B - 1}" fill="none" stroke="#fff" stroke-opacity="${m.id === 'ice' ? 0.08 : 0.25}" stroke-width=".9"/>`;
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
    // aerofólio de teto do hatch, maior a cada estágio
    const x = sh.deck[0] - 3, yy = sh.roof[2] + 1.5, w = [12, 15, 18][t], h = [1.6, 2.4, 3.2][t];
    s += `<path d="M${x} ${yy - h} L${x + w} ${yy - 1} L${x + w} ${yy + 1} L${x + 1} ${yy + 1.5} Z" fill="${t === 2 ? p.livery : shade(p.body, -0.25)}"/>`;
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
    case 'gt40': // tomada de ar atrás da porta
      s += `<path d="M${sh.deck[0] - 4} ${B - 10} l7 -5 l1 6 Z" fill="#0d0f14" opacity=".8"/>`;
      break;
    case 'daytona': // grade escondida sob o bico
      s += `<path d="M${sh.x1 - 22} ${B - 3} L${sh.x1 - 6} ${B - 4} L${sh.x1 - 8} ${B - 1} L${sh.x1 - 22} ${B - 1} Z" fill="#0c0c0e"/>`;
      break;
    case 'fiero': // faróis escamoteáveis
      if (t >= 1) s += `<path d="M${sh.x1 - 16} ${nose - 0.5} l7 -2.5 l1 2.5 Z" fill="${shade(p.body, -0.3)}"/>`;
      if (t >= 1) s += `<rect x="${sh.x0 - 3}" y="${B - 6}" width="7" height="3" rx="1.5" fill="url(#chrome${_U})"/>`;
      break;
    case 'charger': { // grade cheia na frente + compressor saindo do capô
      s += `<rect x="${sh.x1 - 3}" y="${sh.nose + 3}" width="3.6" height="8" rx=".8" fill="#0b0b0d" stroke="url(#chrome${_U})" stroke-width=".6"/>`;
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
