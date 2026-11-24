/* =========================================================================
   PLANET OF THE FURIOUS — cars.js
   Dados dos carros + gerador procedural de arte (SVG desenhado por código).
   Nenhuma imagem externa, logo ou arte oficial: apenas silhuetas originais
   e estilizadas inspiradas em modelos reais de carros.
   ========================================================================= */

/** Nomes dos 3 estágios de evolução de cada modelo. */
const TIERS = ['Stock', 'Tuned', 'Furious'];

/**
 * Os 10 modelos (1 por capítulo). Cada um tem 3 evoluções → 30 níveis.
 *
 * shape: perfil lateral do carro num viewBox 160x80 (carro virado p/ direita)
 *   x0/x1  = traseira/dianteira        belly = linha inferior da carroceria
 *   tail   = altura da traseira         deck  = [x,y] fim do porta-malas
 *   roof   = [x1,x2,y] teto             wind  = [x,y] base do para-brisa
 *   nose   = altura do capô na frente   wheels= [xTraseira,xDianteira,raio]
 *   round  = arredondamento geral dos cantos
 * paint: cores por estágio (body = carroceria, acc = neon/acento, vinyl = adesivo)
 * rims:  cor das rodas por estágio
 * special: detalhes exclusivos do modelo
 */
const MODELS = [
  {
    id: 'supra', name: 'Supra MK4', chapter: 1,
    shape: { x0: 12, x1: 150, belly: 61, tail: 42, deck: [38, 39], roof: [62, 90, 25], wind: [108, 41], nose: 47, wheels: [37, 124, 11.5], round: 1.25 },
    paint: [
      { body: '#d9771f', acc: '#ffd27a', vinyl: '#2a2a2a' },
      { body: '#ff8a1a', acc: '#ff3d00', vinyl: '#141414' },
      { body: '#ff6a00', acc: '#00e5ff', vinyl: '#00e5ff' },
    ],
    rims: ['#c4cad1', '#f2f2f2', '#00e5ff'],
    special: 'hoopWing',
  },
  {
    id: 'skyline', name: 'Skyline R34 GT-R', chapter: 2,
    shape: { x0: 12, x1: 149, belly: 61, tail: 39, deck: [33, 37], roof: [60, 93, 23], wind: [109, 39], nose: 44, wheels: [37, 124, 11.5], round: 0.7 },
    paint: [
      { body: '#9aa7b4', acc: '#cfe3ff', vinyl: '#1d3f8f' },
      { body: '#c9d3dc', acc: '#2f7bff', vinyl: '#1f5bff' },
      { body: '#2b6cff', acc: '#a6ffef', vinyl: '#ffffff' },
    ],
    rims: ['#9aa0a6', '#d9a62e', '#a6ffef'],
    special: 'gtrStripes',
  },
  {
    id: 'rx7', name: 'RX-7 Drift', chapter: 3,
    shape: { x0: 16, x1: 148, belly: 61, tail: 45, deck: [46, 41], roof: [70, 86, 29], wind: [104, 46], nose: 52, wheels: [40, 123, 11], round: 1.4 },
    paint: [
      { body: '#c74a1c', acc: '#ffb08a', vinyl: '#1a1a1a' },
      { body: '#ff5a1f', acc: '#ffcc00', vinyl: '#111111' },
      { body: '#ff4d14', acc: '#ff2bd6', vinyl: '#111111' },
    ],
    rims: ['#b8bec4', '#1d1d1d', '#ff2bd6'],
    special: 'driftVinyl',
  },
  {
    id: 'impreza', name: 'Impreza WRX STI', chapter: 4,
    shape: { x0: 14, x1: 146, belly: 60, tail: 39, deck: [30, 37], roof: [52, 92, 20], wind: [108, 39], nose: 44, wheels: [36, 122, 11.5], round: 0.8 },
    paint: [
      { body: '#1c3f9c', acc: '#ffd400', vinyl: '#ffffff' },
      { body: '#1f4fd1', acc: '#ffd400', vinyl: '#ffd400' },
      { body: '#163ad8', acc: '#ffe14a', vinyl: '#ff7a00' },
    ],
    rims: ['#d6a52a', '#e8b52b', '#ffe14a'],
    special: 'rally',
  },
  {
    id: 'gt40', name: 'GT40', chapter: 5,
    shape: { x0: 12, x1: 150, belly: 62, tail: 42, deck: [40, 40], roof: [66, 84, 33], wind: [102, 48], nose: 54, wheels: [38, 126, 11.5], round: 1.6 },
    paint: [
      { body: '#2c5fae', acc: '#ffffff', vinyl: '#ffffff' },
      { body: '#7fc4ff', acc: '#ff7a00', vinyl: '#ff7a00' },
      { body: '#0b1b3f', acc: '#ff8a00', vinyl: '#ff8a00' },
    ],
    rims: ['#c9ced3', '#ff7a00', '#ff8a00'],
    special: 'twinStripes',
  },
  {
    id: 'daytona', name: 'Charger Daytona', chapter: 6,
    shape: { x0: 8, x1: 156, belly: 61, tail: 42, deck: [27, 41], roof: [66, 92, 26], wind: [111, 42], nose: 50, wheels: [35, 126, 11.5], round: 0.9 },
    paint: [
      { body: '#e0a41d', acc: '#111111', vinyl: '#111111' },
      { body: '#ffb300', acc: '#ff2e2e', vinyl: '#141414' },
      { body: '#ff9e00', acc: '#00ffa3', vinyl: '#00ffa3' },
    ],
    rims: ['#b0b6bc', '#e8e8e8', '#00ffa3'],
    special: 'tallWing',
  },
  {
    id: 'lykan', name: 'Lykan HyperSport', chapter: 7,
    shape: { x0: 12, x1: 154, belly: 62, tail: 41, deck: [40, 40], roof: [68, 86, 30], wind: [106, 47], nose: 55, wheels: [38, 128, 11.5], round: 0.35 },
    paint: [
      { body: '#9b1020', acc: '#ff6b7d', vinyl: '#111111' },
      { body: '#d0102a', acc: '#ffffff', vinyl: '#111111' },
      { body: '#e0002a', acc: '#ffd400', vinyl: '#ffd400' },
    ],
    rims: ['#2a2a2e', '#c0c6cc', '#ffd400'],
    special: 'hyperLeds',
  },
  {
    id: 'ice', name: 'Charger Ice', chapter: 8,
    shape: { x0: 10, x1: 151, belly: 60, tail: 38, deck: [30, 37], roof: [60, 93, 24], wind: [111, 39], nose: 42, wheels: [36, 126, 12.5], round: 0.6 },
    paint: [
      { body: '#7d8894', acc: '#bfefff', vinyl: '#3a4652' },
      { body: '#cfe6f2', acc: '#5fd4ff', vinyl: '#2a3a4a' },
      { body: '#e9f8ff', acc: '#38c8ff', vinyl: '#38c8ff' },
    ],
    rims: ['#3b4148', '#5fd4ff', '#bff4ff'],
    special: 'iceArmor',
  },
  {
    id: 'fiero', name: 'Fiero Rocket', chapter: 9,
    shape: { x0: 22, x1: 140, belly: 61, tail: 41, deck: [40, 39], roof: [62, 82, 28], wind: [100, 44], nose: 52, wheels: [42, 118, 10.5], round: 0.5 },
    paint: [
      { body: '#b3262b', acc: '#ffb3a8', vinyl: '#1e1e1e' },
      { body: '#e23b2e', acc: '#ffffff', vinyl: '#ffffff' },
      { body: '#ff2d2d', acc: '#ffae00', vinyl: '#ffae00' },
    ],
    rims: ['#9aa0a6', '#ffffff', '#ffae00'],
    special: 'rocket',
  },
  {
    id: 'charger', name: 'Charger Clássico', chapter: 10,
    shape: { x0: 7, x1: 154, belly: 60, tail: 38, deck: [28, 37], roof: [64, 92, 24], wind: [112, 38], nose: 39, wheels: [35, 128, 12.5], round: 0.4 },
    paint: [
      { body: '#1b1d22', acc: '#8a8f99', vinyl: '#2c2f36' },
      { body: '#121318', acc: '#ff3b30', vinyl: '#ff3b30' },
      { body: '#08090c', acc: '#ff6a00', vinyl: '#ff6a00' },
    ],
    rims: ['#c0c6cc', '#e6e6e6', '#ff6a00'],
    special: 'blower',
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
    // Cor do rastro de luz na pista: lanterna vermelha → acento → neon
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

/* ------------------------------ Rodas ------------------------------------- */

function wheelSVG(cx, cy, r, rim, tier, acc) {
  const rr = r * (tier === 0 ? 0.58 : tier === 1 ? 0.68 : 0.74);
  let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#0b0b0e"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${r - 1.2}" fill="none" stroke="#26262c" stroke-width="1.2"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${rim}"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${rr * 0.82}" fill="${shade(rim, -0.35)}"/>`;
  if (tier >= 1) s += `<rect x="${(cx + rr * 0.12).toFixed(1)}" y="${(cy - rr * 0.72).toFixed(1)}" width="${(rr * 0.42).toFixed(1)}" height="${(rr * 0.85).toFixed(1)}" rx="1.4" fill="${tier === 2 ? acc : '#e0262f'}"/>`;
  // Raios (5 no stock, 6 tuned, 10 furious)
  const spokes = tier === 0 ? 5 : tier === 1 ? 6 : 10;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const x2 = cx + Math.cos(a) * rr * 0.82, y2 = cy + Math.sin(a) * rr * 0.82;
    s += `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${rim}" stroke-width="${tier === 2 ? 1.1 : 1.8}" stroke-linecap="round"/>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="${rr * 0.22}" fill="${shade(rim, 0.3)}"/>`;
  if (tier === 2) s += `<circle cx="${cx}" cy="${cy}" r="${rr + 0.4}" fill="none" stroke="${acc}" stroke-width="1" opacity=".95" filter="url(#glow${_U})"/>`;
  return s;
}

/* ------------------------- Gerador do SVG do carro ------------------------- */

/**
 * Gera o SVG de um nível. O mesmo SVG é usado na garagem (img), na pista
 * (canvas) e nos popups/coleção.
 */
let _U = '';
function carSVG(level) {
  _U = 'L' + level;
  const info = carInfo(level);
  const m = info.model, t = info.tier, sh = m.shape, p = m.paint[t];
  const ground = 70;
  const drop = t * 1.6;                       // rebaixamento
  const wr = sh.wheels[2] * (1 + 0.07 * t);   // rodas maiores
  const wy = ground - wr;
  const R = sh.round;
  const B = sh.belly + drop;
  const y = (v) => v + drop;

  // Perfil da carroceria
  const pts = [
    [sh.x0 + 1, B, 4],
    [sh.x0, y(sh.tail), 6 * R],
    [sh.deck[0], y(sh.deck[1]), 7 * R],
    [sh.roof[0], y(sh.roof[2]), 9 * R],
    [sh.roof[1], y(sh.roof[2]), 7 * R],
    [sh.wind[0], y(sh.wind[1]), 6 * R],
    [sh.x1 - 5, y(sh.nose), 6 * R],
    [sh.x1, y(sh.nose) + 6, 4 * R],
    [sh.x1 - 2, B, 3],
  ];
  const body = roundedPath(pts);

  // Vidros (estufa)
  const gl = roundedPath([
    [sh.deck[0] + 5, y(sh.deck[1]) - 0.5, 3],
    [sh.roof[0] + 2.5, y(sh.roof[2]) + 3, 5 * R],
    [sh.roof[1] - 1, y(sh.roof[2]) + 3, 4 * R],
    [sh.wind[0] - 5, y(sh.wind[1]) - 0.5, 2],
  ]);
  const pillarX = (sh.roof[0] + sh.roof[1]) / 2 + 4;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80" width="160" height="80">`;
  s += `<defs>
    <filter id="glow${_U}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter>
    <filter id="blur${_U}" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="3.2"/></filter>
    <linearGradient id="paint${_U}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(p.body, 0.28)}"/>
      <stop offset=".45" stop-color="${p.body}"/>
      <stop offset="1" stop-color="${shade(p.body, -0.45)}"/>
    </linearGradient>
    <linearGradient id="glass${_U}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3a6fa8"/><stop offset=".5" stop-color="#0d2140"/><stop offset="1" stop-color="#1b4a7a"/>
    </linearGradient>
    <linearGradient id="flame${_U}" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".25" stop-color="#7ff6ff"/><stop offset=".6" stop-color="${p.acc}"/><stop offset="1" stop-color="${p.acc}" stop-opacity="0"/>
    </linearGradient>
  </defs>`;

  // Sombra no chão
  s += `<ellipse cx="${(sh.x0 + sh.x1) / 2}" cy="${ground + 1}" rx="${(sh.x1 - sh.x0) / 2}" ry="3.2" fill="#000" opacity=".55"/>`;

  // Furious: neon embaixo do carro
  if (t === 2) {
    s += `<ellipse cx="${(sh.x0 + sh.x1) / 2}" cy="${ground - 1}" rx="${(sh.x1 - sh.x0) / 2 - 6}" ry="4" fill="${p.acc}" opacity=".9" filter="url(#blur${_U})"/>`;
  }

  // Foguete do Fiero (atrás da carroceria)
  if (m.special === 'rocket' && t >= 1) {
    const ry = y(sh.roof[2]) - (t === 2 ? 9 : 6), rl = t === 2 ? 58 : 40, rx = sh.roof[0] - (t === 2 ? 24 : 12);
    if (t === 2) s += `<path d="M${rx} ${ry} l-20 -3 l0 9 Z" fill="url(#flame${_U})" filter="url(#glow${_U})"/>`;
    s += `<rect x="${rx}" y="${ry - 3.5}" width="${rl}" height="7" rx="3.5" fill="#d9dde2" stroke="#555" stroke-width=".6"/>`;
    s += `<path d="M${rx + rl} ${ry - 3.5} q8 3.5 0 7 Z" fill="${p.acc}"/>`;
    s += `<rect x="${rx + 6}" y="${ry - 1}" width="${rl - 16}" height="2" fill="${p.body}"/>`;
    s += `<path d="M${rx + 2} ${ry + 3.5} l4 6 l4 -6 Z" fill="#888"/>`;
  }

  // Chamas de nitro (Furious) saindo do escapamento
  if (t === 2) {
    s += `<path d="M${sh.x0 + 2} ${B - 4} l-14 -3 l4 3 l-6 2 l16 1 Z" fill="url(#flame${_U})" filter="url(#glow${_U})"/>`;
    s += `<path d="M${sh.x0 + 2} ${B - 4} l-9 -1.5 l9 3 Z" fill="#fff"/>`;
  }

  // Carroceria
  s += `<path d="${body}" fill="url(#paint${_U})" stroke="${shade(p.body, -0.6)}" stroke-width=".8"/>`;

  // Reflexo no ombro da lataria
  s += `<path d="M${sh.x0 + 6} ${y(sh.tail) + 5} L${sh.deck[0]} ${y(sh.deck[1]) + 4} L${sh.wind[0] + 4} ${y(sh.wind[1]) + 4} L${sh.x1 - 8} ${y(sh.nose) + 4}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="1.6" stroke-linecap="round"/>`;

  // Luz refletida do asfalto na parte de baixo da lataria
  s += `<path d="M${sh.x0 + 4} ${B - 2.5} L${sh.x1 - 4} ${B - 2.5}" stroke="${t === 2 ? p.acc : '#8fc8ff'}" stroke-opacity="${t === 2 ? 0.55 : 0.22}" stroke-width="1.2" stroke-linecap="round"/>`;
  if (t === 0) s += `<rect x="${sh.x0 + 1}" y="${y(sh.tail) + 8}" width="2.5" height="5" rx=".6" fill="#e8eef6" stroke="#333" stroke-width=".4"/>`;

  // Adesivos / faixas por estágio
  s += vinylSVG(m, t, p, sh, y, B);

  // Vidros
  s += `<path d="${gl}" fill="url(#glass${_U})" stroke="${shade(p.body, -0.6)}" stroke-width=".7"/>`;
  s += `<path d="M${sh.roof[0] + 6} ${y(sh.roof[2]) + 4.5} L${sh.roof[0] + 14} ${y(sh.roof[2]) + 4.5} L${sh.roof[0] + 4} ${y(sh.deck[1]) - 2} Z" fill="#fff" opacity=".18"/>`;
  s += `<line x1="${pillarX}" y1="${y(sh.roof[2]) + 2.5}" x2="${pillarX + 2}" y2="${y(sh.deck[1]) + 0.5}" stroke="${shade(p.body, -0.5)}" stroke-width="2.2"/>`;

  // Linhas de porta, maçaneta, saia
  const doorX = pillarX + 3;
  s += `<path d="M${doorX} ${y(sh.deck[1]) + 1} L${doorX + 1} ${B - 3}" stroke="${shade(p.body, -0.55)}" stroke-width=".7" fill="none"/>`;
  s += `<path d="M${sh.wind[0] - 6} ${y(sh.wind[1]) + 1} L${sh.wind[0] - 4} ${B - 3}" stroke="${shade(p.body, -0.55)}" stroke-width=".7" fill="none"/>`;
  s += `<rect x="${doorX + 5}" y="${y(sh.deck[1]) + 5}" width="5" height="1.4" rx=".7" fill="${shade(p.body, -0.5)}"/>`;
  if (t >= 1) s += `<path d="M${sh.wheels[0] + wr + 2} ${B - 1} L${sh.wheels[1] - wr - 2} ${B - 1}" stroke="${t === 2 ? p.acc : '#111'}" stroke-width="2.4" stroke-linecap="round"/>`;

  // Farol e lanterna
  s += `<path d="M${sh.x1 - 7} ${y(sh.nose) + 2} l6 1.5 l-.5 3 l-6 -1 Z" fill="#fff8d0"/>`;
  s += `<rect x="${sh.x0 - 0.5}" y="${y(sh.tail) + 2}" width="4" height="4" rx="1" fill="#ff2a3d"/>`;
  if (t >= 1) s += `<rect x="${sh.x0 - 1}" y="${y(sh.tail) + 2}" width="5" height="4" rx="1" fill="#ff2a3d" filter="url(#glow${_U})"/>`;
  if (t === 2) s += `<path d="M${sh.x1 - 2} ${y(sh.nose) + 4} l14 -2 l0 6 Z" fill="#fffbe0" opacity=".35" filter="url(#glow${_U})"/>`;

  // Detalhes exclusivos do modelo
  s += specialSVG(m, t, p, sh, y, B);

  // Aerofólio genérico do Tuned/Furious (quando o modelo não tem um próprio)
  if (!['hoopWing', 'tallWing'].includes(m.special)) {
    if (t === 1) s += `<path d="M${sh.x0 + 2} ${y(sh.tail) - 0.5} l12 -1 l-1 2.5 l-11 .5 Z" fill="${shade(p.body, -0.4)}"/>`;
    if (t === 2) s += gtWing(sh.x0 + 3, y(sh.tail), 22, 10, p);
  }

  // Furious: contorno neon da lataria
  if (t === 2) {
    s += `<path d="${body}" fill="none" stroke="${p.acc}" stroke-width="1.3" opacity=".9" filter="url(#glow${_U})"/>`;
    s += `<path d="${body}" fill="none" stroke="${p.acc}" stroke-width=".5" opacity=".9"/>`;
  }

  // Caixas de roda + rodas
  for (const wx of [sh.wheels[0], sh.wheels[1]]) {
    s += `<circle cx="${wx}" cy="${wy}" r="${wr + 2.2}" fill="#07070a"/>`;
    s += wheelSVG(wx, wy, wr, m.rims[t], t, p.acc);
  }
  // Pneus com cravos de gelo (Charger Ice Furious)
  if (m.special === 'iceArmor' && t === 2) {
    for (const wx of [sh.wheels[0], sh.wheels[1]]) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        s += `<circle cx="${(wx + Math.cos(a) * (wr - 0.6)).toFixed(1)}" cy="${(wy + Math.sin(a) * (wr - 0.6)).toFixed(1)}" r=".9" fill="#dff8ff"/>`;
      }
    }
  }

  s += `</svg>`;
  return s;
}

/** Aerofólio estilo GT (dois suportes + lâmina). */
function gtWing(x, baseY, w, h, p) {
  const top = baseY - h;
  return `<path d="M${x + 5} ${baseY + 1} L${x + 7} ${top + 2} M${x + w - 6} ${baseY + 1} L${x + w - 4} ${top + 2}" stroke="#16161b" stroke-width="2"/>` +
    `<path d="M${x - 2} ${top} L${x + w + 2} ${top - 1.5} L${x + w + 1} ${top + 3} L${x - 2} ${top + 3.5} Z" fill="#111" stroke="${p.acc}" stroke-width=".8"/>` +
    `<path d="M${x - 3} ${top - 2} l0 7 l2 0 l0 -7 Z" fill="${p.acc}"/>`;
}

/** Faixas, adesivos e grafismos de cada estágio. */
function vinylSVG(m, t, p, sh, y, B) {
  let s = '';
  const midY = (y(sh.deck[1]) + B) / 2;
  if (m.special === 'gtrStripes' && t >= 1) {
    s += `<path d="M${sh.x0 + 4} ${midY + 3} L${sh.x1 - 6} ${midY - 1} L${sh.x1 - 6} ${midY + 1.5} L${sh.x0 + 4} ${midY + 5.5} Z" fill="${p.vinyl}" opacity=".95"/>`;
    s += `<path d="M${sh.x0 + 4} ${midY + 7} L${sh.x1 - 10} ${midY + 3} L${sh.x1 - 10} ${midY + 4.2} L${sh.x0 + 4} ${midY + 8.2} Z" fill="${p.vinyl}" opacity=".75"/>`;
  } else if (m.special === 'twinStripes') {
    // Faixas duplas laterais clássicas (todas as evoluções)
    s += `<rect x="${sh.x0 + 6}" y="${midY - 1}" width="${sh.x1 - sh.x0 - 14}" height="2.4" fill="${p.vinyl}"/>`;
    s += `<rect x="${sh.x0 + 6}" y="${midY + 3}" width="${sh.x1 - sh.x0 - 14}" height="2.4" fill="${p.vinyl}"/>`;
    s += `<circle cx="${(sh.roof[0] + sh.roof[1]) / 2 + 12}" cy="${midY + 2.2}" r="${t === 0 ? 4.2 : 4.8}" fill="#fff" stroke="${p.vinyl}" stroke-width="1"/>`;
    s += `<text x="${(sh.roof[0] + sh.roof[1]) / 2 + 12}" y="${midY + 4}" font-family="Arial" font-weight="bold" font-size="5" text-anchor="middle" fill="#111">${t + 1}</text>`;
  } else if (m.special === 'driftVinyl' && t >= 1) {
    // Pintura dividida laranja/preto
    s += `<path d="M${sh.x0 + 3} ${B - 1} L${sh.x0 + 18} ${midY - 2} L${sh.x1 - 30} ${midY + 2} L${sh.x1 - 12} ${B - 1} Z" fill="${p.vinyl}" opacity=".92"/>`;
    if (t === 2) s += `<path d="M${sh.x0 + 24} ${midY + 1} q12 -8 24 0 t24 0 t24 0" fill="none" stroke="${p.acc}" stroke-width="1.4" filter="url(#glow${_U})"/>`;
  } else if (t === 1) {
    s += `<path d="M${sh.x0 + 4} ${midY + 2} L${sh.x1 - 6} ${midY - 2} L${sh.x1 - 6} ${midY + 1.6} L${sh.x0 + 4} ${midY + 5.6} Z" fill="${p.vinyl}" opacity=".9"/>`;
  }
  if (t === 2 && m.special !== 'twinStripes' && m.special !== 'driftVinyl') {
    // Grafismo em zigue-zague (tipo "tribal" / raio)
    const x0 = sh.x0 + 8, x1 = sh.x1 - 18, n = 6, w = (x1 - x0) / n;
    let d = `M${x0} ${midY + 4}`;
    for (let i = 0; i < n; i++) d += ` L${x0 + w * (i + 0.5)} ${midY - 2 + (i % 2) * 2} L${x0 + w * (i + 1)} ${midY + 4}`;
    d += ` L${x1 + 6} ${midY + 1} L${x1} ${midY + 7} L${x0} ${midY + 7} Z`;
    s += `<path d="${d}" fill="${p.vinyl}" opacity=".9"/>`;
    s += `<path d="${d}" fill="none" stroke="${p.vinyl}" stroke-width="1" filter="url(#glow${_U})" opacity=".8"/>`;
  }
  return s;
}

/** Detalhes que deixam cada modelo único. */
function specialSVG(m, t, p, sh, y, B) {
  let s = '';
  const deckY = y(sh.deck[1]);
  switch (m.special) {
    case 'hoopWing': { // aerofólio em arco
      if (t === 0) { s += `<path d="M${sh.x0 + 2} ${y(sh.tail) - 1} l14 -1.5 l0 2.5 l-14 1 Z" fill="${shade(p.body, -0.35)}"/>`; break; }
      const x = sh.x0 + 3, w = 26, h = t === 2 ? 11 : 8;
      s += `<path d="M${x + 1} ${y(sh.tail) + 1} Q${x - 1} ${y(sh.tail) - h} ${x + 8} ${y(sh.tail) - h} L${x + w - 6} ${y(sh.tail) - h - 1} Q${x + w} ${y(sh.tail) - h} ${x + w - 1} ${deckY + 1}" fill="none" stroke="${t === 2 ? '#111' : shade(p.body, -0.25)}" stroke-width="3.2" stroke-linecap="round"/>`;
      if (t === 2) s += `<path d="M${x + 8} ${y(sh.tail) - h - 0.2} L${x + w - 6} ${y(sh.tail) - h - 1.2}" stroke="${p.acc}" stroke-width="1.2" filter="url(#glow${_U})"/>`;
      break;
    }
    case 'tallWing': { // asa altíssima + bico pontudo
      const h = 14 + t * 3, x = sh.x0 + 5;
      s += `<path d="M${x + 3} ${y(sh.tail) + 1} L${x + 1} ${y(sh.tail) - h} M${x + 18} ${deckY + 1} L${x + 17} ${y(sh.tail) - h}" stroke="${shade(p.body, -0.15)}" stroke-width="3"/>`;
      s += `<path d="M${x - 3} ${y(sh.tail) - h - 2} L${x + 22} ${y(sh.tail) - h - 3} L${x + 22} ${y(sh.tail) - h + 1} L${x - 3} ${y(sh.tail) - h + 2} Z" fill="${t === 2 ? '#111' : p.body}" stroke="${p.acc}" stroke-width=".9"/>`;
      s += `<path d="M${sh.x1 - 14} ${y(sh.nose) + 1} L${sh.x1 + 1} ${y(sh.nose) + 5} L${sh.x1 - 14} ${y(sh.nose) + 8} Z" fill="${shade(p.body, -0.2)}"/>`;
      if (t >= 1) s += `<rect x="${sh.x0 + 10}" y="${(deckY + B) / 2 - 1}" width="40" height="3" fill="${p.vinyl}"/>`;
      break;
    }
    case 'rally': { // tomada de ar no capô, luzes de rali, para-barro
      s += `<path d="M${sh.wind[0] + 4} ${y(sh.wind[1]) + 0.5} l3 -3 l10 0.6 l1 3 Z" fill="${shade(p.body, -0.3)}"/>`;
      s += `<path d="M${sh.wheels[0] - 6} ${B - 1} l-1 7 l4 0 l0 -7 Z" fill="#c42a2a"/>`;
      if (t >= 1) {
        s += `<circle cx="${sh.x1 - 12}" cy="${y(sh.nose) + 9}" r="2.6" fill="#fff5b0" stroke="#222" stroke-width=".7"/>`;
        s += `<circle cx="${sh.x1 - 18}" cy="${y(sh.nose) + 9}" r="2.6" fill="#fff5b0" stroke="#222" stroke-width=".7"/>`;
      }
      if (t === 2) s += `<rect x="${sh.roof[0] + 6}" y="${y(sh.roof[2]) - 3.5}" width="24" height="3" rx="1.5" fill="#222" stroke="${p.acc}" stroke-width=".7"/>` +
        `<circle cx="${sh.roof[0] + 11}" cy="${y(sh.roof[2]) - 2}" r="1.3" fill="#fff8c0" filter="url(#glow${_U})"/><circle cx="${sh.roof[0] + 18}" cy="${y(sh.roof[2]) - 2}" r="1.3" fill="#fff8c0" filter="url(#glow${_U})"/><circle cx="${sh.roof[0] + 25}" cy="${y(sh.roof[2]) - 2}" r="1.3" fill="#fff8c0" filter="url(#glow${_U})"/>`;
      break;
    }
    case 'twinStripes': { // tampa traseira com grade (motor central)
      for (let i = 0; i < 4; i++) s += `<line x1="${sh.x0 + 8 + i * 5}" y1="${deckY + 1}" x2="${sh.x0 + 10 + i * 5}" y2="${deckY - 1.2}" stroke="#111" stroke-width="1"/>`;
      break;
    }
    case 'hyperLeds': { // faróis em LED, entradas de ar laterais
      s += `<path d="M${sh.x1 - 22} ${y(sh.nose) + 1} L${sh.x1 - 3} ${y(sh.nose) + 3.5}" stroke="${t === 0 ? '#e8f4ff' : p.acc}" stroke-width="1.2" ${t >= 1 ? 'filter="url(#glow${_U})"' : ''}/>`;
      s += `<path d="M${sh.x0 + 22} ${B - 4} L${sh.x0 + 40} ${deckY + 5} L${sh.x0 + 44} ${B - 4} Z" fill="#0d0d10"/>`;
      if (t >= 1) s += `<path d="M${sh.wind[0] + 4} ${y(sh.wind[1]) + 0.6} l18 2" stroke="#111" stroke-width="1.6"/>`;
      break;
    }
    case 'iceArmor': { // placas de blindagem e gelo
      if (t >= 1) s += `<path d="M${sh.x1 - 3} ${B} l6 -2 l0 -8 l-6 -1 Z" fill="#3b4148" stroke="${p.acc}" stroke-width=".6"/>`;
      if (t >= 1) for (let i = 0; i < 5; i++) s += `<path d="M${sh.x0 + 20 + i * 18} ${B - 1} l3 5 l3 -5 Z" fill="#bff4ff" opacity=".9"/>`;
      if (t === 2) s += `<path d="M${sh.wind[0] + 2} ${y(sh.wind[1])} l8 -4 l2 4 l6 -3 l1 4" fill="none" stroke="#e9fbff" stroke-width="1.2" filter="url(#glow${_U})"/>` +
        `<rect x="${sh.roof[0] + 4}" y="${y(sh.roof[2]) - 4}" width="22" height="4" rx="1" fill="#3b4148"/>`;
      break;
    }
    case 'rocket': { // escapamento grande
      if (t >= 1) s += `<rect x="${sh.x0 - 3}" y="${B - 6}" width="7" height="3" rx="1.5" fill="#999"/>`;
      break;
    }
    case 'blower': { // compressor saindo do capô
      if (t === 0) break;
      const bx = sh.wind[0] + 8, by = y(sh.wind[1]) + 0.5, bh = t === 2 ? 11 : 7;
      s += `<rect x="${bx}" y="${by - bh}" width="13" height="${bh}" rx="1.5" fill="#bfc5cc" stroke="#555" stroke-width=".6"/>`;
      for (let i = 1; i < 4; i++) s += `<line x1="${bx + 1}" y1="${by - bh + i * bh / 4}" x2="${bx + 12}" y2="${by - bh + i * bh / 4}" stroke="#7a8088" stroke-width=".8"/>`;
      s += `<rect x="${bx - 1.5}" y="${by - bh - 4}" width="16" height="4" rx="1.5" fill="${t === 2 ? p.acc : '#2a2a2a'}"/>`;
      if (t === 2) s += `<path d="M${bx + 3} ${by - bh - 4} q-2 -6 3 -9 q-1 5 3 6 q2 -4 1 -7 q5 4 2 10 Z" fill="${p.acc}" opacity=".9" filter="url(#glow${_U})"/>`;
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
