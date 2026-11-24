/* =========================================================================
   PLANET OF THE FURIOUS — meta.js
   Tudo que fica "em volta" da partida: painéis e popups, upgrades,
   prestígio, missões, conquistas, coleção, baú, configurações,
   backup (exportar/importar), tutorial, instalação e atualização do app.
   ========================================================================= */
'use strict';

/* =========================================================================
   1) CAMADAS: painel inferior (sheet) e popup (modal)
   O botão "voltar" do Android/navegador fecha a camada do topo.
   ========================================================================= */
const ui = {
  sheetLayer: $('#sheetLayer'), sheet: $('#sheet'), sheetTitle: $('#sheetTitle'), sheetBody: $('#sheetBody'), sheetHead: $('#sheetHead'),
  modal: $('#modal'), modalCard: $('#modalCard'),
  tut: $('#tut'), tutRing: $('#tutRing'), tutHand: $('#tutHand'), tutCard: $('#tutCard'), tutText: $('#tutText'), tutStep: $('#tutStep'),
};

const Layers = {
  stack: [], ignorePop: 0,
  push(kind) {
    this.stack.push(kind);
    try { history.pushState({ potf: this.stack.length }, ''); } catch (e) { /* iframe sem histórico */ }
  },
  pendingBack: 0,
  /** Remove a camada; se veio da interface, desfaz a entrada no histórico
   *  (vários fechamentos seguidos viram um único history.go(-n)). */
  pop(kind, fromHistory) {
    const i = this.stack.lastIndexOf(kind);
    if (i < 0) return;
    this.stack.splice(i, 1);
    if (fromHistory) return;
    if (this.pendingBack++ === 0) {
      Promise.resolve().then(() => {
        const n = this.pendingBack; this.pendingBack = 0;
        this.ignorePop++;
        try { history.go(-n); } catch (e) { this.ignorePop--; }
      });
    }
  },
};
window.addEventListener('popstate', () => {
  if (Layers.ignorePop > 0) { Layers.ignorePop--; return; }
  const top = Layers.stack[Layers.stack.length - 1];
  if (top === 'modal') Modal.close(true);
  else if (top === 'sheet') Sheet.close(true);
});
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const top = Layers.stack[Layers.stack.length - 1];
  if (top === 'modal') Modal.close(); else if (top === 'sheet') Sheet.close();
});

const Sheet = {
  id: null, timer: null, render: null, last: '', onClick: null,
  open(id, title, render, onClick, tickMs) {
    Input.clearSelection(); Input.cancel();
    const was = this.id;
    this.id = id; this.render = render; this.onClick = onClick;
    ui.sheetTitle.textContent = title;
    this.last = '';
    this.refresh(true);
    ui.sheetBody.scrollTop = 0;
    clearInterval(this.timer);
    this.timer = tickMs ? setInterval(() => this.refresh(), tickMs) : null;
    if (!was) {
      ui.sheet.classList.remove('closing');
      ui.sheetLayer.hidden = false;
      Layers.push('sheet');
    }
    el.tabbar.querySelectorAll('[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === id));
    Bus.emit('sheet', id);
  },
  refresh(force) {
    if (!this.id) return;
    const html = this.render();
    if (force || html !== this.last) {
      this.last = html;
      const st = ui.sheetBody.scrollTop;
      ui.sheetBody.innerHTML = html;
      ui.sheetBody.scrollTop = st;
    }
  },
  close(fromHistory) {
    if (!this.id) return;
    clearInterval(this.timer); this.timer = null;
    const closing = this.id;
    this.id = null;
    Layers.pop('sheet', fromHistory);
    el.tabbar.querySelectorAll('[data-nav]').forEach((b) => b.classList.remove('active'));
    ui.sheet.classList.add('closing');
    setTimeout(() => { if (!this.id) { ui.sheetLayer.hidden = true; ui.sheetBody.innerHTML = ''; ui.sheet.style.transform = ''; } }, 170);
    Bus.emit('sheetClose', closing);
    Modal.next();
  },
};
ui.sheetBody.addEventListener('click', (e) => { if (Sheet.onClick) Sheet.onClick(e); });
ui.sheetBody.addEventListener('input', (e) => { if (Sheet.onClick) Sheet.onClick(e); });
$('#sheetClose').addEventListener('click', () => { Sfx.click(); Sheet.close(); });
ui.sheetLayer.addEventListener('pointerdown', (e) => { if (e.target === ui.sheetLayer) Sheet.close(); });
// arrastar o cabeçalho para baixo fecha o painel
(() => {
  let y0 = null, dy = 0, pid = null;
  ui.sheetHead.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    y0 = e.clientY; dy = 0; pid = e.pointerId;
    try { ui.sheetHead.setPointerCapture(pid); } catch (err) { /* ignora */ }
  });
  ui.sheetHead.addEventListener('pointermove', (e) => {
    if (y0 == null || e.pointerId !== pid) return;
    dy = Math.max(0, e.clientY - y0);
    ui.sheet.style.transform = `translateY(${dy}px)`;
  });
  const end = () => {
    if (y0 == null) return;
    y0 = null;
    if (dy > 90) Sheet.close(); else ui.sheet.style.transform = '';
  };
  ui.sheetHead.addEventListener('pointerup', end);
  ui.sheetHead.addEventListener('pointercancel', end);
})();

const Modal = {
  open: null, queue: [], timer: null,
  /** Popups de recompensa entram em fila; prioridade maior aparece antes. */
  enqueue(fn, prio = 1) {
    this.queue.push({ fn, prio });
    this.queue.sort((a, b) => b.prio - a.prio);
    this.next();
  },
  next() {
    if (this.open || !gameStarted || !el.splash.hidden || !this.queue.length) return;
    setTimeout(() => { if (!this.open && this.queue.length) this.queue.shift().fn(); }, 120);
  },
  /** opts: {title, body, actions:[{label, cls, onClick, hold}], closeX, onClose, onOpen, tick} */
  show(opts) {
    const replacing = !!this.open;
    if (replacing) {            // troca o conteúdo sem mexer no histórico
      const cb = this.open.onClose;
      clearInterval(this.timer); this.timer = null; this.open = null;
      if (cb) cb();
    }
    Input.cancel(); Input.clearSelection();
    this.open = opts;
    ui.modalCard.innerHTML =
      (opts.closeX !== false ? `<button class="close-btn" aria-label="Fechar">${icon('close')}</button>` : '') +
      (opts.title ? `<h2>${opts.title}</h2>` : '') +
      `<div class="modal-body">${opts.body || ''}</div>` +
      (opts.actions ? '<div class="modal-actions"></div>' : '');
    if (opts.actions) {
      const box = ui.modalCard.querySelector('.modal-actions');
      opts.actions.forEach((a) => {
        const b = document.createElement('button');
        b.className = 'btn ' + (a.cls || 'btn-orange') + (a.hold ? ' hold-btn' : '');
        b.innerHTML = (a.hold ? '<span class="hold-fill"></span>' : '') + `<span style="position:relative">${a.label}</span>`;
        if (a.hold) holdToConfirm(b, a.hold, () => a.onClick());
        else b.onclick = () => { Sfx.click(); if (a.onClick) a.onClick(); else this.close(); };
        box.appendChild(b);
      });
    }
    const x = ui.modalCard.querySelector('.close-btn');
    if (x) x.onclick = () => { Sfx.click(); this.close(); };
    ui.modal.hidden = false;
    if (!replacing) Layers.push('modal');
    clearInterval(this.timer);
    if (opts.tick) this.timer = setInterval(opts.tick, 250);
    if (opts.onOpen) opts.onOpen(ui.modalCard);
    const focus = ui.modalCard.querySelector('.modal-actions .btn');
    if (focus) try { focus.focus({ preventScroll: true }); } catch (e) { /* ignora */ }
  },
  close(fromHistory) {
    if (!this.open) return;
    const cb = this.open.onClose;
    clearInterval(this.timer); this.timer = null;
    this.open = null;
    Layers.pop('modal', fromHistory);
    ui.modal.hidden = true;
    ui.modalCard.innerHTML = '';
    if (cb) cb();
    this.next();
  },
};
ui.modal.addEventListener('pointerdown', (e) => { if (e.target === ui.modal && Modal.open && Modal.open.closeX !== false) Modal.close(); });

/** Botão "segure para confirmar": evita ações destrutivas acidentais. */
function holdToConfirm(btn, ms, onDone) {
  const fill = btn.querySelector('.hold-fill');
  let anim = null, timer = null;
  const start = (e) => {
    e.preventDefault();
    if (timer) return;
    anim = fill.animate([{ width: '0%' }, { width: '100%' }], { duration: ms, fill: 'forwards' });
    timer = setTimeout(() => { timer = null; vibrate(30); onDone(); }, ms);
  };
  const stop = () => { if (timer) { clearTimeout(timer); timer = null; if (anim) anim.cancel(); } };
  btn.addEventListener('pointerdown', start);
  btn.addEventListener('pointerup', stop);
  btn.addEventListener('pointerleave', stop);
  btn.addEventListener('pointercancel', stop);
  btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) onDone(); } });
}

/* =========================================================================
   2) POPUPS DE RECOMPENSA
   ========================================================================= */
function popupUnlock(L) {
  const info = carInfo(L), newChapter = info.tier === 0;
  Sfx.unlock(); vibrate([30, 50, 30]);
  Modal.show({
    title: newChapter ? `Capítulo ${info.chapter}!` : 'Novo carro!',
    body: `
      <div class="unlock-stage"><div class="unlock-rays"></div><img src="${carAsset(L).url}" alt=""><span class="unlock-stamp">${newChapter ? 'NOVO MODELO' : info.tierName.toUpperCase()}</span></div>
      <div class="unlock-name">${chapBadge(info.chapter, 'big')}
        <div><div>${info.name}</div><small>Capítulo ${info.chapter} · Nível ${L} · estágio ${info.tierName}</small></div>
      </div>
      <div class="stat-row">
        <div><small>POR VOLTA</small><b>${fmt(incomePerLap(L))}</b></div>
        <div><small>VOLTA</small><b>${lapTime(L).toFixed(1).replace('.', ',')}s</b></div>
        <div><small>COLEÇÃO</small><b>${state.unlocked.length}/${MAX_LEVEL}</b></div>
      </div>`,
    actions: [{ label: 'SHOW!', cls: 'btn-cyan' }],
    onOpen: () => { const c = centerOf(ui.modalCard); setTimeout(() => burst(c.x, c.y - 60, [info.acc, '#fff', '#ff7a00', '#00e5ff'], 28), 500); },
  });
}
Bus.on('unlock', (L) => { if (L > 1) Modal.enqueue(() => popupUnlock(L), 2); });

/* Ganho offline: credita na hora; o popup só informa (não duplica). */
let offlinePending = null;
function offlineReward(earned, secs, secsRaw, ips) {
  if (secsRaw < CONFIG.offline.popupSeconds) {
    toast(`+${fmt(earned)} moedas enquanto você esteve fora (${fmtLong(secsRaw)})`, 'good');
    bumpCoins();
    return;
  }
  if (offlinePending) {        // ainda não exibido: soma em vez de abrir dois
    offlinePending.earned += earned; offlinePending.secs += secs; offlinePending.raw += secsRaw;
    return;
  }
  offlinePending = { earned, secs, raw: secsRaw, ips };
  Modal.enqueue(() => {
    const p = offlinePending; offlinePending = null;
    if (!p) return;
    const capped = p.raw > CONFIG.offline.maxSeconds + 1;
    Modal.show({
      title: 'Enquanto você estava fora…',
      body: `<p class="center muted">Você ficou fora por <b style="color:#fff">${fmtLong(p.raw)}</b> e sua equipe continuou correndo.</p>
        <div class="big-num"><span class="coin-ico"></span>+${fmt(p.earned)}</div>
        <div class="calc">
          <div><span>Renda da pista</span><b>${fmt(p.ips)}/s</b></div>
          <div><span>Tempo contado</span><b>${fmtLong(p.secs)}${capped ? ' (máx. 2h)' : ''}</b></div>
        </div>`,
      actions: [{ label: 'COLETAR', cls: 'btn-orange', onClick: () => { const c = centerOf(ui.modalCard); Modal.close(); flyCoins(c.x, c.y, 10); } }],
      closeX: false,
    });
  }, 1);
}

/* =========================================================================
   3) BAÚ DIÁRIO — com reserva quando a garagem está cheia
   ========================================================================= */
/** Baú desenhado em SVG (tampa abre, raio de luz sai de dentro). */
function chestArt(open) {
  return `<svg class="chest-art ${open ? 'shake open' : ''}" viewBox="0 0 120 110" aria-hidden="true">
    <defs>
      <linearGradient id="cw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a4b1c"/><stop offset="1" stop-color="#4a2209"/></linearGradient>
      <linearGradient id="cm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a0"/><stop offset=".5" stop-color="#ffbf2e"/><stop offset="1" stop-color="#b06d00"/></linearGradient>
      <radialGradient id="cb" cx=".5" cy="1" r="1"><stop offset="0" stop-color="#fff7c0"/><stop offset=".4" stop-color="#ffd23f" stop-opacity=".7"/><stop offset="1" stop-color="#ffd23f" stop-opacity="0"/></radialGradient>
    </defs>
    <ellipse cx="60" cy="102" rx="46" ry="6" fill="#000" opacity=".5"/>
    <path class="beam" d="M30 50 L8 0 L112 0 L90 50 Z" fill="url(#cb)"/>
    <rect x="14" y="50" width="92" height="50" rx="6" fill="url(#cw)" stroke="#2a1204" stroke-width="2"/>
    <rect x="14" y="62" width="92" height="7" fill="url(#cm)"/>
    <rect x="24" y="50" width="9" height="50" fill="url(#cm)"/><rect x="87" y="50" width="9" height="50" fill="url(#cm)"/>
    <g class="lid">
      <path d="M14 50 V36 Q14 18 36 18 H84 Q106 18 106 36 V50 Z" fill="url(#cw)" stroke="#2a1204" stroke-width="2"/>
      <rect x="24" y="19" width="9" height="31" fill="url(#cm)"/><rect x="87" y="19" width="9" height="31" fill="url(#cm)"/>
      <path d="M18 30 Q60 22 102 30" stroke="#ffcf6a" stroke-opacity=".35" stroke-width="2" fill="none"/>
    </g>
    <rect x="51" y="44" width="18" height="20" rx="3" fill="url(#cm)" stroke="#6a3c00" stroke-width="1.5"/>
    <circle cx="60" cy="53" r="3" fill="#3a1d00"/><rect x="58.8" y="54" width="2.4" height="6" fill="#3a1d00"/>
    <path d="M18 58 H102" stroke="#00e5ff" stroke-opacity=".45" stroke-width="1"/>
  </svg>`;
}
function openChest() {
  Sfx.init();
  const t = now();
  if (t < state.chestAt) {
    Modal.show({
      title: 'Baú diário',
      body: `<div class="chest-stage">${chestArt(false)}</div>
        <p class="center muted">O próximo baú abre em</p>
        <div class="chest-timer" id="chestTimer">${fmtTime((state.chestAt - t) / 1000)}</div>
        <p class="center muted">Cada baú traz ~10 min de renda e um carro bônus.</p>`,
      actions: [{ label: 'OK', cls: 'btn-dark' }],
      tick: () => {
        const n = $('#chestTimer'); if (!n) return;
        const left = (state.chestAt - now()) / 1000;
        if (left <= 0) { Modal.close(); openChest(); return; }
        n.textContent = fmtTime(left);
      },
    });
    return;
  }
  const coins = Math.max(CONFIG.chest.minCoins, Math.floor(incomePerSec(false) * CONFIG.chest.incomeSeconds));
  const carL = Math.min(MAX_LEVEL, buyLevel() + 1);
  const slot = freeGarageIndex();
  state.chestAt = t + CONFIG.chest.interval * 1000;
  state.stats.chests++;
  addCoins(coins);
  if (slot >= 0) state.garage[slot] = carL; else state.reserve.push(carL);
  saveState();
  Sfx.chest(); vibrate([20, 30, 60]);
  Modal.show({
    title: 'Baú aberto!',
    body: `<div class="chest-stage">${chestArt(true)}</div>
      <div class="reward"><div class="big-num"><span class="coin-ico"></span>+${fmt(coins)}</div>
        <img src="${carAsset(carL).url}" alt=""><div class="muted">${carInfo(carL).name} (Lv ${carL})</div>
        ${slot < 0 ? '<p class="muted center" style="color:#ffcf3a">Garagem cheia: o carro ficou na <b>reserva</b> e chega sozinho assim que uma vaga liberar.</p>' : ''}
      </div>
      <p class="muted center">Volte amanhã para outro baú.</p>`,
    actions: [{ label: 'PEGAR', cls: 'btn-orange' }],
    onClose: () => {
      reachLevel(carL);
      if (slot >= 0) renderCell(slot, 'new');
      deliverReserve(); renderGarage();
      const c = centerOf(el.tabbar.querySelector('[data-nav="chest"]'));
      flyCoins(c.x, c.y - 20, 8);
      renderHUD();
      Bus.emit('chest');
    },
  });
}

/* =========================================================================
   4) UPGRADES + PRESTÍGIO
   ========================================================================= */
function upgradeEffect(k, lv) {
  const u = CONFIG.upgrades[k];
  if (k === 'garage') return `${CONFIG.garage.start + lv} vagas`;
  if (k === 'track') return `${CONFIG.trackSlots.start + lv} vagas`;
  if (k === 'income') return `+${Math.round(lv * u.per * 100)}%`;
  return `−${(lv * u.per * 100).toFixed(1).replace('.', ',').replace(',0', '')}%`;
}
function renderUpgrades() {
  let html = prestigeCard();
  for (const [k, u] of Object.entries(CONFIG.upgrades)) {
    const lv = state.upg[k], maxed = lv >= u.max, cost = upgradeCost(k), can = state.coins >= cost;
    html += `<div class="upg">
      <div class="upg-ico">${icon(u.icon)}</div>
      <div class="upg-info"><b>${u.name}</b>
        <div class="upg-eff">${maxed ? upgradeEffect(k, lv) + ' · máximo' : `${upgradeEffect(k, lv)} <span class="arrow">→ ${upgradeEffect(k, lv + 1)}</span>`}</div>
        <div class="upg-bar" title="Nível ${lv}/${u.max}"><i style="width:${(lv / u.max) * 100}%"></i></div>
      </div>
      <div>
        <button class="btn ${maxed ? 'btn-dark' : can ? 'btn-cyan' : 'btn-dark is-off'}" data-upg="${k}" aria-label="${u.name}: ${maxed ? 'nível máximo' : 'comprar por ' + fmt(cost)}">
          ${maxed ? 'MÁX' : `Nv ${lv + 1}<small><span class="coin-ico sm"></span>${fmt(cost)}</small>`}
        </button>
        ${!maxed && !can ? `<span class="need">faltam ${fmt(cost - state.coins)}</span>` : ''}
      </div></div>`;
  }
  return html + `<p class="muted center">Suas moedas: <b style="color:var(--gold)">${fmt(state.coins)}</b> · renda ${fmt(incomePerSec(false))}/s</p>`;
}
function openUpgrades() {
  Sfx.init(); Sfx.click();
  Sheet.open('upgrades', 'Upgrades', renderUpgrades, (e) => {
    const b = e.target.closest('[data-upg]');
    if (b && e.type === 'click') {
      const k = b.dataset.upg;
      if (state.upg[k] >= CONFIG.upgrades[k].max) return;
      if (buyUpgrade(k)) { const c = centerOf(b); burst(c.x, c.y, ['#00e5ff', '#fff'], 10); }
      else { toast(`Faltam ${fmt(upgradeCost(k) - state.coins)} moedas`, 'warn'); shake(b); }
      Sheet.refresh(true);
    }
    if (e.target.closest('[data-prestige]') && e.type === 'click') openPrestige();
  }, 300);
}

function prestigeCard() {
  const p = state.prestige, mult = prestigeMult();
  if (state.maxLevel < CONFIG.prestige.minLevel) {
    return `<div class="prestige-card locked"><h3>${icon('star')}Prestígio ${p ? `· nível ${p}` : ''}</h3>
      <p>Chegue ao Lv ${CONFIG.prestige.minLevel} para recomeçar com <b>+${CONFIG.prestige.incomeBonus * 100}% de renda permanente</b>. Seu melhor: Lv ${state.maxLevel}.${p ? ` Bônus atual: x${mult.toFixed(1).replace('.', ',')}.` : ''}</p>
      <div class="upg-bar"><i style="width:${(state.maxLevel / CONFIG.prestige.minLevel) * 100}%"></i></div></div>`;
  }
  return `<div class="prestige-card"><h3>${icon('star')}Prestígio disponível!</h3>
    <p>Recomece a corrida com renda x${(1 + (p + 1) * CONFIG.prestige.incomeBonus).toFixed(1).replace('.', ',')} para sempre. Coleção e conquistas ficam.</p>
    <button class="btn btn-orange btn-sm" data-prestige="1">${icon('star')}VER PRESTÍGIO</button></div>`;
}

function openPrestige() {
  const next = state.prestige + 1, newMult = 1 + next * CONFIG.prestige.incomeBonus;
  Modal.show({
    title: 'Prestígio',
    body: `<p class="center muted">Você dominou as 30 máquinas. Recomece mais forte:</p>
      <div class="big-num">${icon('star')} x${newMult.toFixed(1).replace('.', ',')} renda</div>
      <div class="calc">
        <div><span><b>Recomeça</b></span><span></span></div>
        <div><span>Moedas, carros, pista</span><span>zerados</span></div>
        <div><span>Upgrades e preços</span><span>zerados</span></div>
        <div><span><b>Fica com você</b></span><span></span></div>
        <div><span>Coleção, conquistas, missões</span><span>mantidos</span></div>
        <div><span>Estatísticas e ajustes</span><span>mantidos</span></div>
      </div>
      <p class="center muted">Um backup do save atual é guardado antes. Segure o botão para confirmar.</p>`,
    actions: [{ label: 'Cancelar', cls: 'btn-dark' }, { label: `SEGURE PARA RENASCER`, cls: 'btn-orange', hold: 1600, onClick: doPrestige }],
  });
}

function doPrestige() {
  if (state.maxLevel < CONFIG.prestige.minLevel) return;
  backupNow();
  const keep = {
    unlocked: state.unlocked, achievements: state.achievements, missions: state.missions, stats: state.stats,
    settings: state.settings, tutorial: state.tutorial, chestAt: state.chestAt, prestige: state.prestige + 1,
  };
  state = Object.assign(defaultState(), keep);
  state.stats.prestiges++;
  Track.prog.fill(0); Track.positions = [];
  resetViews();
  saveState();
  Modal.close(); Sheet.close();
  Sfx.unlock(); vibrate([40, 60, 40]);
  const c = centerOf(el.garage);
  burst(c.x, c.y, ['#a68bff', '#ffcf3a', '#fff', '#00e5ff'], 30);
  toast(`Prestígio ${state.prestige}! Renda x${prestigeMult().toFixed(1).replace('.', ',')} para sempre.`, 'good', 3200);
  Bus.emit('prestige');
}

/** Força o redesenho completo da garagem/HUD após trocar o save inteiro. */
function resetViews() {
  hudCache = {};
  cellEls.forEach((c) => { c.dataset.k = ''; }); chipEls.forEach((c) => { c.dataset.k = ''; });
  Input.clearSelection();
  AudioSys.apply({ muted: state.settings.muted, music: state.settings.music, sfx: state.settings.sfx });
  applyQuality();
  renderGarage(); renderPit(); deliverReserve(); renderHUD();
}

/* =========================================================================
   5) MISSÕES (cadeias progressivas) + CONQUISTAS
   ========================================================================= */
const maxChapter = () => Math.max(...state.unlocked.map((L) => carInfo(L).chapter));
const CHAINS = [
  { id: 'merge', name: (n) => `Faça ${fmt(n)} fusões`, stat: () => state.stats.merges, targets: [5, 25, 100, 300, 1000, 3000, 10000, 30000] },
  { id: 'chapter', name: (n) => `Desbloqueie o Capítulo ${n}`, stat: () => maxChapter(), targets: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
  { id: 'track', name: (n) => `Tenha ${n} carros na pista ao mesmo tempo`, stat: () => state.stats.bestTrack, targets: [2, 3, 5, 7, 10] },
  { id: 'buy', name: (n) => `Compre ${fmt(n)} carros`, stat: () => state.stats.buys, targets: [10, 50, 150, 400, 1000, 3000, 8000] },
  { id: 'earn', name: (n) => `Fature ${fmt(n)} moedas no total`, stat: () => state.stats.earned, targets: [1e3, 1e5, 1e7, 1e9, 1e11, 1e13, 1e15, 1e17] },
  { id: 'laps', name: (n) => `Complete ${fmt(n)} voltas`, stat: () => state.stats.laps, targets: [50, 500, 2500, 10000, 50000, 200000] },
  { id: 'nitro', name: (n) => n === 1 ? 'Use o Nitro pela primeira vez' : `Use o Nitro ${n} vezes`, stat: () => state.stats.nitros, targets: [1, 10, 30, 100, 300] },
];
const Missions = {
  notified: new Set(), ready: false,
  tier(c) { return state.missions[c.id] || 0; },
  target(c) { return c.targets[this.tier(c)]; },
  /** Recompensa cresce com a renda atual, com piso por nível da missão. */
  reward(c) {
    const t = this.tier(c);
    return Math.max(Math.round(50 * Math.pow(3, t)), Math.round(incomePerSec(false) * Math.min(90 + 60 * t, 900)));
  },
  claimable(c) { const tg = this.target(c); return tg != null && c.stat() >= tg; },
  count() { return CHAINS.filter((c) => this.claimable(c)).length; },
  claim(id, node) {
    const c = CHAINS.find((x) => x.id === id);
    if (!c || !this.claimable(c)) return;
    const r = this.reward(c);
    addCoins(r);
    state.missions[c.id] = this.tier(c) + 1;
    Sfx.mission(); vibrate(15);
    if (node) { const p = centerOf(node); flyCoins(p.x, p.y, 8); }
    saveState(); renderHUD();
    Achievements.check();
  },
  /** Avisa (uma vez) quando uma missão fica pronta para resgatar. */
  watch() {
    if (!this.ready) return;
    for (const c of CHAINS) {
      const key = c.id + ':' + this.tier(c);
      if (this.claimable(c) && !this.notified.has(key)) {
        this.notified.add(key);
        if (state.tutorial.done && !Sheet.id) toast(`Missão concluída: ${c.name(this.target(c))} — resgate em Missões`, 'good', 2600);
        Sfx.mission();
      }
    }
  },
};

const ACH = [
  { id: 'first_merge', name: 'Primeira fusão', desc: 'Junte dois carros iguais', test: () => state.stats.merges >= 1 },
  { id: 'on_track', name: 'Pé na pista', desc: 'Coloque um carro para correr', test: () => state.stats.bestTrack >= 1 },
  { id: 'furious', name: 'Modo Furious', desc: 'Desbloqueie um carro Furious', test: () => state.unlocked.includes(3) },
  { id: 'nitro1', name: 'Botão vermelho', desc: 'Use o Nitro', test: () => state.stats.nitros >= 1 },
  { id: 'chapter5', name: 'Metade da saga', desc: 'Chegue ao Capítulo 5', test: () => maxChapter() >= 5 },
  { id: 'col15', name: 'Colecionador', desc: '15 carros na coleção', test: () => state.unlocked.length >= 15 },
  { id: 'full_grid', name: 'Grid lotado', desc: '10 carros na pista juntos', test: () => state.stats.bestTrack >= 10 },
  { id: 'big_garage', name: 'Garagem dos sonhos', desc: 'Libere as 20 vagas', test: () => state.upg.garage >= CONFIG.upgrades.garage.max },
  { id: 'sponsor', name: 'Patrocinado', desc: 'Patrocínio nível 10', test: () => state.upg.income >= 10 },
  { id: 'million', name: 'Milionário', desc: 'Fature 1M de moedas', test: () => state.stats.earned >= 1e6 },
  { id: 'billion', name: 'Bilionário', desc: 'Fature 1B de moedas', test: () => state.stats.earned >= 1e9 },
  { id: 'laps1000', name: 'Maratonista', desc: 'Complete 1.000 voltas', test: () => state.stats.laps >= 1000 },
  { id: 'nitro50', name: 'Viciado em nitro', desc: 'Use o Nitro 50 vezes', test: () => state.stats.nitros >= 50 },
  { id: 'chest7', name: 'Fiel à garagem', desc: 'Abra 7 baús diários', test: () => state.stats.chests >= 7 },
  { id: 'legend', name: 'Lenda', desc: 'Desbloqueie o nível 30', test: () => state.unlocked.includes(30) },
  { id: 'col30', name: 'Coleção completa', desc: 'Todos os 30 carros', test: () => state.unlocked.length >= MAX_LEVEL },
  { id: 'prestige', name: 'Renascido', desc: 'Faça o primeiro prestígio', test: () => state.prestige >= 1 },
];
const Achievements = {
  check(silent) {
    const fresh = ACH.filter((a) => !state.achievements.includes(a.id) && a.test());
    if (!fresh.length) return;
    fresh.forEach((a) => state.achievements.push(a.id));
    if (!silent) {
      toast(fresh.length > 1 ? `${fresh.length} conquistas desbloqueadas!` : `Conquista: ${fresh[0].name}`, 'good', 2400);
      Sfx.mission();
    }
    saveState();
  },
};
['merge', 'track', 'nitro', 'chest', 'upgrade', 'unlock', 'prestige'].forEach((ev) => Bus.on(ev, () => setTimeout(() => Achievements.check(), 600)));

let missionTab = 'missions';
function renderMissions() {
  const seg = `<div class="seg" role="tablist"><button data-tab="missions" class="${missionTab === 'missions' ? 'on' : ''}">Missões</button><button data-tab="ach" class="${missionTab === 'ach' ? 'on' : ''}">Conquistas ${state.achievements.length}/${ACH.length}</button></div>`;
  if (missionTab === 'ach') {
    return seg + `<div class="ach-grid">${ACH.map((a) => {
      const on = state.achievements.includes(a.id);
      return `<div class="ach${on ? ' on' : ''}">${icon(on ? 'trophy' : 'lock')}<div><b>${a.name}</b><small>${a.desc}</small></div></div>`;
    }).join('')}</div>`;
  }
  const rows = CHAINS.map((c) => {
    const tg = Missions.target(c);
    if (tg == null) return `<div class="mission done"><div><b>${c.name(c.targets[c.targets.length - 1])}</b><span class="muted">Cadeia completa</span></div><span class="reward-chip">${icon('check')}</span><div class="m-bar"><i style="width:100%"></i></div></div>`;
    const v = c.stat(), pct = clamp(v / tg, 0, 1), ready = v >= tg;
    return `<div class="mission${ready ? ' done' : ''}">
      <div><b>${c.name(tg)}</b><span class="muted">${fmt(Math.min(v, tg))}/${fmt(tg)} · etapa ${Missions.tier(c) + 1}/${c.targets.length}</span></div>
      ${ready ? `<button class="btn btn-orange btn-sm" data-claim="${c.id}"><span class="coin-ico sm"></span>${fmt(Missions.reward(c))}</button>`
        : `<span class="reward-chip"><span class="coin-ico sm"></span>${fmt(Missions.reward(c))}</span>`}
      <div class="m-bar"><i style="width:${(pct * 100).toFixed(1)}%"></i></div></div>`;
  }).join('');
  return seg + rows;
}
function openMissions() {
  Sfx.init(); Sfx.click();
  Sheet.open('missions', 'Missões', renderMissions, (e) => {
    if (e.type !== 'click') return;
    const tab = e.target.closest('[data-tab]');
    if (tab) { missionTab = tab.dataset.tab; Sfx.click(); Sheet.refresh(true); return; }
    const b = e.target.closest('[data-claim]');
    if (b) { Missions.claim(b.dataset.claim, b); Sheet.refresh(true); }
  }, 500);
}

/* =========================================================================
   6) COLEÇÃO + FICHA DO CARRO
   ========================================================================= */
function renderCollection() {
  const got = state.unlocked.length;
  let rows = '';
  for (const m of MODELS) {
    let cards = '', have = 0;
    for (let t = 0; t < 3; t++) {
      const L = (m.chapter - 1) * 3 + t + 1, has = state.unlocked.includes(L);
      if (has) have++;
      cards += `<button class="col-card t${t}${has ? '' : ' locked'}" data-car="${L}" aria-label="${has ? carInfo(L).name : 'Carro bloqueado, nível ' + L}">
        <span class="lvb">${L}</span><img src="${carAsset(L).url}" alt="" loading="lazy">
        <div class="nm">${has ? carInfo(L).name : '??? · ' + TIERS[t]}</div></button>`;
    }
    rows += `<div class="col-row"><div class="chap-col">${chapBadge(m.chapter)}<span>${have}/3</span></div><div class="col-cards">${cards}</div></div>`;
  }
  return `<div class="col-progress"><span>${got}/${MAX_LEVEL}</span><div class="col-bar"><i style="width:${(got / MAX_LEVEL) * 100}%"></i></div><span>${Math.round((got / MAX_LEVEL) * 100)}%</span></div>${rows}`;
}
function renderCarSheet(L) {
  const info = carInfo(L), has = state.unlocked.includes(L);
  const speed = 1 / lapTime(L), maxSpeed = 1 / lapTime(MAX_LEVEL);
  const how = L <= buyLevel() ? 'Disponível na loja (botão Comprar) ou juntando dois Lv ' + (L - 1)
    : L === 1 ? 'Disponível na loja' : `Junte dois carros Lv ${L - 1}`;
  const next = L < MAX_LEVEL ? carInfo(L + 1) : null, nextHas = next && state.unlocked.includes(L + 1);
  return `<div class="car-sheet">
    <button class="btn btn-dark btn-sm" data-back="1">← Coleção</button>
    <div class="hero${has ? '' : ' locked'}" style="margin-top:10px"><img src="${carAsset(L).url}" alt=""></div>
    <h3>${chapBadge(info.chapter)} ${has ? info.name : '??? · ' + info.tierName}</h3>
    <div style="--tc:var(--t${info.tier})"><span class="tier-pill">${info.tierName}</span> <span class="muted">Capítulo ${info.chapter} · Nível ${L}</span></div>
    <div class="stat-row">
      <div><small>POR VOLTA</small><b>${fmt(incomePerLap(L))}</b></div>
      <div><small>VOLTA</small><b>${lapTime(L).toFixed(1).replace('.', ',')}s</b></div>
      <div><small>RENDA</small><b>${fmt(incomePerLap(L) / lapTime(L))}/s</b></div>
    </div>
    <div class="muted" style="margin-top:10px">Velocidade</div>
    <div class="speed-bar"><i style="width:${((speed / maxSpeed) * 100).toFixed(0)}%"></i></div>
    <p class="muted">${has ? (countLevel(L) ? `Você tem ${countLevel(L)} na garagem/pista.` : 'Nenhum na garagem agora.') : 'Ainda não descoberto.'} ${how}.</p>
    ${next ? `<div class="next-evo${nextHas ? '' : ' locked'}"><img src="${carAsset(L + 1).url}" alt=""><div><b style="color:#fff">Próxima evolução</b><br>${nextHas ? next.name : '??? · ' + next.tierName} — junte dois Lv ${L}.</div></div>` : '<div class="next-evo">Evolução máxima: o topo da cadeia alimentar.</div>'}
  </div>`;
}
let carView = 0;
function openCollection() {
  Sfx.init(); Sfx.click();
  carView = 0;
  Sheet.open('collection', 'Coleção', () => (carView ? renderCarSheet(carView) : renderCollection()), (e) => {
    if (e.type !== 'click') return;
    const card = e.target.closest('[data-car]');
    if (card) { carView = +card.dataset.car; Sfx.select(); Sheet.refresh(true); ui.sheetBody.scrollTop = 0; ui.sheetTitle.textContent = 'Ficha do carro'; return; }
    if (e.target.closest('[data-back]')) { carView = 0; Sfx.click(); ui.sheetTitle.textContent = 'Coleção'; Sheet.refresh(true); }
  });
}

/* =========================================================================
   7) CONFIGURAÇÕES, INSTALAÇÃO E BACKUP
   ========================================================================= */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });
window.addEventListener('appinstalled', () => { deferredInstall = null; toast('App instalado! Abra pela tela inicial.', 'good'); });

const sw = (key, on, label) => `<button class="switch" role="switch" aria-checked="${on}" aria-label="${label}" data-set="${key}"></button>`;
function installRow() {
  if (isStandalone()) return `<div class="set-row"><span class="col">App instalado<small>Você está jogando pelo app</small></span>${icon('check')}</div>`;
  if (deferredInstall) return `<div class="set-row"><span>${icon('share')}Instalar o jogo</span><button class="btn btn-cyan btn-sm" data-set="install">INSTALAR</button></div>`;
  if (isIOS) return `<div class="set-row" style="display:block"><span>${icon('share')}Instalar no iPhone</span>
    <ol class="ios-steps"><li>Abra este jogo no <b>Safari</b></li><li>Toque em <b>Compartilhar</b> (quadrado com seta)</li><li>Escolha <b>Adicionar à Tela de Início</b></li></ol></div>`;
  return `<div class="set-row" style="display:block"><span>${icon('share')}Instalar</span><small>No Chrome: menu ⋮ → "Instalar app" ou "Adicionar à tela inicial".</small></div>`;
}
let settingsView = 'main';
function renderSettings() {
  const s = state.settings, q = s.quality;
  if (settingsView === 'export') {
    return `<button class="btn btn-dark btn-sm" data-set="back">← Configurações</button>
      <p class="muted">Guarde este código (anotações, e-mail para você mesmo…). No outro celular, use <b>Importar</b>.</p>
      <textarea class="code-box" id="exportCode" readonly>${Backup.encode()}</textarea>
      <div class="modal-actions"><button class="btn btn-cyan btn-sm" data-set="copy">${icon('copy')}COPIAR</button>${navigator.share ? `<button class="btn btn-dark btn-sm" data-set="share">${icon('share')}ENVIAR</button>` : ''}</div>`;
  }
  if (settingsView === 'import') {
    return `<button class="btn btn-dark btn-sm" data-set="back">← Configurações</button>
      <p class="muted">Cole o código de backup. Antes de trocar, você vê um resumo e confirma.</p>
      <textarea class="code-box" id="importCode" placeholder="POTF2-..." autocomplete="off" autocapitalize="off" spellcheck="false"></textarea>
      <div class="modal-actions"><button class="btn btn-orange btn-sm" data-set="doImport">VERIFICAR CÓDIGO</button></div>`;
  }
  const autoTxt = q === 'auto' ? ` (agora: ${{ high: 'alta', medium: 'média', low: 'baixa' }[autoQuality]})` : '';
  return `
  <div class="set-group"><h4>ÁUDIO</h4>
    <div class="set-row"><span>${icon(s.muted ? 'mute' : 'sound')}Som</span>${sw('muted', !s.muted, 'Som')}</div>
    <div class="set-row"><span>${icon('music')}Música</span><input class="range" type="range" min="0" max="100" value="${Math.round(s.music * 100)}" data-set="music" aria-label="Volume da música" style="--p:${Math.round(s.music * 100)}%"></div>
    <div class="set-row"><span>${icon('bolt')}Efeitos</span><input class="range" type="range" min="0" max="100" value="${Math.round(s.sfx * 100)}" data-set="sfx" aria-label="Volume dos efeitos" style="--p:${Math.round(s.sfx * 100)}%"></div>
  </div>
  <div class="set-group"><h4>JOGO</h4>
    ${canVibrate ? `<div class="set-row"><span>Vibração</span>${sw('vibrate', s.vibrate, 'Vibração')}</div>` : ''}
    <div class="set-row"><span class="col">Gráficos${autoTxt ? `<small>${autoTxt.trim()}</small>` : ''}</span>
      <div class="seg small">${['auto', 'high', 'medium', 'low'].map((k) => `<button data-q="${k}" class="${q === k ? 'on' : ''}">${{ auto: 'Auto', high: 'Alta', medium: 'Média', low: 'Baixa' }[k]}</button>`).join('')}</div></div>
    <div class="set-row"><span class="col">Menos movimento<small>Reduz animações e efeitos</small></span>${sw('rm', reducedMotion(), 'Menos movimento')}</div>
    <div class="set-row"><span>${icon('hand')}Tutorial</span><button class="btn btn-dark btn-sm" data-set="tutorial">RECOMEÇAR</button></div>
  </div>
  <div class="set-group"><h4>APP</h4>${installRow()}</div>
  <div class="set-group"><h4>PROGRESSO</h4>
    <div class="set-row"><span>${icon('copy')}Backup</span><span><button class="btn btn-dark btn-sm" data-set="export">EXPORTAR</button> <button class="btn btn-dark btn-sm" data-set="import">IMPORTAR</button></span></div>
    <div class="set-row"><span>Estatísticas</span><small style="text-align:right">${fmt(state.stats.merges)} fusões · ${fmt(state.stats.laps)} voltas<br>${fmt(state.stats.earned)} faturados${state.prestige ? ` · prestígio ${state.prestige}` : ''}</small></div>
    <div class="set-row"><span style="color:#ff8aa0">Apagar progresso</span><button class="btn btn-danger btn-sm" data-set="reset">APAGAR</button></div>
  </div>
  <p class="legal">PLANET OF THE FURIOUS · versão ${APP_VERSION}<br>Jogo de fã, não oficial e sem fins lucrativos. Carros desenhados por código e música original gerada em tempo real; nenhuma marca, logo ou arte oficial é usada.</p>`;
}
function openSettings() {
  Sfx.click();
  settingsView = 'main';
  Sheet.open('settings', 'Configurações', renderSettings, async (e) => {
    const s = state.settings;
    if (e.type === 'input') {
      const r = e.target.closest('.range');
      if (!r) return;
      const v = +r.value / 100;
      r.style.setProperty('--p', r.value + '%');
      s[r.dataset.set] = v;
      AudioSys.apply({ [r.dataset.set]: v });
      if (r.dataset.set === 'sfx') Sfx.click();
      saveState();
      return;
    }
    const qb = e.target.closest('[data-q]');
    if (qb) { s.quality = qb.dataset.q; if (s.quality === 'auto') autoQuality = 'high'; applyQuality(); saveState(); Sfx.click(); Sheet.refresh(true); return; }
    const b = e.target.closest('[data-set]');
    if (!b || b.classList.contains('range')) return;
    const k = b.dataset.set;
    if (k === 'muted') { s.muted = !s.muted; AudioSys.apply({ muted: s.muted }); AudioSys.unlock(); Sfx.click(); }
    else if (k === 'vibrate') { s.vibrate = !s.vibrate; vibrate(20); }
    else if (k === 'rm') { s.reduceMotion = !reducedMotion(); applyQuality(); }
    else if (k === 'tutorial') { state.tutorial = { step: 0, done: false }; saveState(); Sheet.close(); setTimeout(() => Tutorial.start(), 250); return; }
    else if (k === 'install' && deferredInstall) { deferredInstall.prompt(); try { await deferredInstall.userChoice; } catch (err) { /* ignora */ } deferredInstall = null; }
    else if (k === 'export') { settingsView = 'export'; }
    else if (k === 'import') { settingsView = 'import'; }
    else if (k === 'back') { settingsView = 'main'; }
    else if (k === 'copy') { Backup.copy($('#exportCode')); return; }
    else if (k === 'share') { try { await navigator.share({ title: 'Backup PLANET OF THE FURIOUS', text: $('#exportCode').value }); } catch (err) { /* cancelado */ } return; }
    else if (k === 'doImport') { Backup.tryImport($('#importCode').value); return; }
    else if (k === 'reset') { confirmReset(); return; }
    saveState();
    Sheet.refresh(true);
  });
}

function confirmReset() {
  Modal.show({
    title: 'Apagar tudo?',
    body: `<p class="center muted">Isso apaga moedas, carros, upgrades, coleção, conquistas e prestígio. Não dá para desfazer (exporte um backup antes, se quiser).</p>`,
    actions: [{ label: 'Cancelar', cls: 'btn-dark' }, { label: 'SEGURE PARA APAGAR', cls: 'btn-danger', hold: 2000, onClick: () => {
      backupNow();
      const keepSettings = state.settings;
      state = defaultState();
      state.settings = keepSettings;
      try { localStorage.removeItem(CONFIG.saveKey); } catch (e) { /* ignora */ }
      Track.prog.fill(0);
      resetViews(); saveState();
      Modal.close(); Sheet.close();
      toast('Progresso apagado. Bora de novo!');
      setTimeout(() => Tutorial.start(), 400);
    } }],
  });
}

/* Backup: código = POTF2-<base64 do JSON>-<checksum> */
const Backup = {
  hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).padStart(8, '0');
  },
  encode() {
    const bytes = new TextEncoder().encode(JSON.stringify(state));
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    const b64 = btoa(bin);
    return `POTF2-${b64}-${this.hash(b64)}`;
  },
  decode(code) {
    const clean = String(code || '').replace(/\s+/g, '');
    const m = /^POTF2-([A-Za-z0-9+/=]+)-([0-9a-f]{8})$/.exec(clean);
    if (!m) throw new Error('O código não está no formato esperado (começa com POTF2-).');
    if (this.hash(m[1]) !== m[2]) throw new Error('O código está incompleto ou foi alterado. Copie de novo, inteiro.');
    let obj;
    try {
      const bin = atob(m[1]);
      const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
      obj = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) { throw new Error('Não foi possível ler o código.'); }
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.garage)) throw new Error('O código não contém um save do jogo.');
    return migrateState(obj);
  },
  copy(ta) {
    const done = () => toast('Código copiado!', 'good');
    const fallback = () => { ta.focus(); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Selecione e copie o código manualmente.'); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, fallback);
    else fallback();
  },
  tryImport(code) {
    let s;
    try { s = this.decode(code); } catch (err) { toast(err.message, 'warn', 3200); Sfx.error(); return; }
    Modal.show({
      title: 'Importar progresso?',
      body: `<div class="calc">
        <div><span>Melhor carro</span><b>Lv ${s.maxLevel}</b></div>
        <div><span>Moedas</span><b>${fmt(s.coins)}</b></div>
        <div><span>Coleção</span><b>${s.unlocked.length}/${MAX_LEVEL}</b></div>
        <div><span>Prestígio</span><b>${s.prestige}</b></div></div>
        <p class="center muted">O progresso atual será substituído (um backup dele fica guardado neste aparelho).</p>`,
      actions: [{ label: 'Cancelar', cls: 'btn-dark' }, { label: 'SUBSTITUIR', cls: 'btn-orange', onClick: () => {
        backupNow();
        s.lastSeen = now();         // sem ganho offline "fantasma" pelo tempo do código
        state = s;
        Track.prog.fill(0);
        resetViews(); saveState();
        Modal.close(); Sheet.close();
        toast('Progresso importado!', 'good');
      } }],
    });
  },
};

/* =========================================================================
   8) TUTORIAL INTERATIVO (não bloqueia; aprende jogando)
   ========================================================================= */
const TUT_STEPS = [
  { text: 'Toque em <b>COMPRAR</b> para trazer mais um carro para a garagem.', target: () => el.btnBuy, hand: 'tap', done: 'buy' },
  { text: 'Arraste um carro até a <b>pista</b>. Dica: também dá para tocar no carro e depois na pista.', target: () => firstCarCell(), hand: 'drag', to: () => el.trackWrap, done: 'track' },
  { text: 'Cada volta completa rende <b>moedas</b>. Veja o carro cruzar a linha quadriculada!', target: () => el.trackWrap, hand: null, done: 'lap' },
  { text: 'Agora <b>junte dois carros iguais</b>: arraste um sobre o outro para evoluir.', target: () => pairCells()[0], hand: 'drag', to: () => pairCells()[1], done: 'merge', fallback: 'Compre outro carro igual e junte os dois.' },
  { text: 'Abra <b>Upgrades</b>: lá você amplia a pista e a garagem.', target: () => el.tabbar.querySelector('[data-nav="upgrades"]'), hand: 'tap', done: 'sheet:upgrades' },
  { text: 'Compre upgrades quando tiver moedas — os cinzas mostram quanto falta.', target: null, hand: null, done: 'upgrade', next: true, top: true },
];
function firstCarCell() { for (let i = 0; i < garageSlots(); i++) if (state.garage[i]) return cellEls[i]; return null; }
function pairCells() {
  const seen = {};
  for (let i = 0; i < garageSlots(); i++) {
    const L = state.garage[i];
    if (!L || L >= MAX_LEVEL) continue;
    if (seen[L] != null) return [cellEls[seen[L]], cellEls[i]];
    seen[L] = i;
  }
  return [null, null];
}
const Tutorial = {
  timer: null, handAnim: null, lastKey: '',
  get step() { return TUT_STEPS[state.tutorial.step]; },
  start() {
    if (state.tutorial.done) return;
    ui.tut.hidden = false;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.position(), 250);
    this.show();
  },
  show() {
    const s = this.step;
    if (!s) { this.finish(); return; }
    ui.tutStep.textContent = `TUTORIAL ${state.tutorial.step + 1}/${TUT_STEPS.length}`;
    ui.tutText.innerHTML = s.text;
    $('#tutNext').hidden = !s.next;
    this.lastKey = '';
    this.position();
  },
  advance(ev) {
    const s = this.step;
    if (state.tutorial.done || !s || s.done !== ev) return;
    state.tutorial.step++;
    saveState();
    if (state.tutorial.step >= TUT_STEPS.length) this.finish();
    else setTimeout(() => this.show(), 350);
  },
  finish(skipped) {
    state.tutorial.done = true;
    saveState();
    clearInterval(this.timer); this.timer = null;
    if (this.handAnim) this.handAnim.cancel();
    ui.tut.hidden = true;
    if (!skipped) toast('Tutorial concluído! Junte, corra e domine o planeta.', 'good', 2600);
  },
  /** Mantém o anel e a mão sobre o alvo (o layout muda com rotação/upgrades). */
  position() {
    if (state.tutorial.done || ui.tut.hidden) return;
    const s = this.step;
    if (!s) return;
    const busy = !!Input.d || !!Modal.open;
    ui.tut.style.opacity = busy ? '0' : '1';
    let tgt = s.target ? s.target() : null;
    let text = s.text;
    if (s.target && !tgt && s.fallback) { tgt = el.btnBuy; text = s.fallback; }
    if (ui.tutText.dataset.t !== text) { ui.tutText.innerHTML = text; ui.tutText.dataset.t = text; }
    ui.tutStep.textContent = `TUTORIAL ${state.tutorial.step + 1}/${TUT_STEPS.length}`;
    if (s.next) $('#tutNext').hidden = false;
    const sheetUp = !!Sheet.id;
    ui.tut.style.zIndex = sheetUp ? 80 : '';
    if (!tgt || (sheetUp && !s.top)) { ui.tutRing.hidden = true; ui.tutHand.hidden = true; }
    else {
      const r = tgt.getBoundingClientRect(), pad = 6;
      ui.tutRing.hidden = false;
      ui.tutRing.style.width = r.width + pad * 2 + 'px';
      ui.tutRing.style.height = r.height + pad * 2 + 'px';
      ui.tutRing.style.transform = `translate(${r.left - pad}px, ${r.top - pad}px)`;
      const to = s.to ? s.to() : null;
      const key = `${s.hand}|${Math.round(r.left)},${Math.round(r.top)}|${to ? Math.round(to.getBoundingClientRect().left) + ',' + Math.round(to.getBoundingClientRect().top) : ''}`;
      if (key !== this.lastKey) { this.lastKey = key; this.animateHand(s.hand, r, to ? to.getBoundingClientRect() : null); }
    }
    // cartão no lado oposto ao alvo (não cobre o que precisa ser tocado)
    const vh = window.innerHeight, r = tgt ? tgt.getBoundingClientRect() : null;
    const hud = $('.hud').getBoundingClientRect();
    const actions = $('#actions').getBoundingClientRect();
    const card = ui.tutCard.getBoundingClientRect();
    let top;
    if (s.top || sheetUp) top = hud.top + 4;
    else if (r && r.top + r.height / 2 > vh * 0.5) top = hud.bottom + 8;
    else top = actions.top - card.height - 10;
    ui.tutCard.style.top = Math.max(8, top) + 'px';
  },
  animateHand(kind, r, to) {
    if (this.handAnim) { this.handAnim.cancel(); this.handAnim = null; }
    if (!kind || reducedMotion()) { ui.tutHand.hidden = !kind; if (kind) ui.tutHand.style.transform = `translate(${r.left + r.width / 2 - 10}px, ${r.top + r.height / 2}px)`; return; }
    ui.tutHand.hidden = false;
    const x0 = r.left + r.width / 2 - 10, y0 = r.top + r.height / 2;
    if (kind === 'tap' || !to) {
      this.handAnim = ui.tutHand.animate([
        { transform: `translate(${x0}px, ${y0 + 14}px) scale(1)` },
        { transform: `translate(${x0}px, ${y0}px) scale(.85)`, offset: 0.4 },
        { transform: `translate(${x0}px, ${y0 + 14}px) scale(1)` },
      ], { duration: 1100, iterations: Infinity });
    } else {
      const x1 = to.left + to.width / 2 - 10, y1 = to.top + to.height / 2;
      this.handAnim = ui.tutHand.animate([
        { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 0 },
        { transform: `translate(${x0}px, ${y0}px) scale(.85)`, opacity: 1, offset: 0.15 },
        { transform: `translate(${x1}px, ${y1}px) scale(.85)`, opacity: 1, offset: 0.75 },
        { transform: `translate(${x1}px, ${y1}px) scale(1)`, opacity: 0 },
      ], { duration: 1800, iterations: Infinity, easing: 'ease-in-out' });
    }
  },
};
['buy', 'track', 'lap', 'merge', 'upgrade'].forEach((ev) => Bus.on(ev, () => Tutorial.advance(ev)));
Bus.on('sheet', (id) => Tutorial.advance('sheet:' + id));
Bus.on('sheetClose', (id) => { if (id === 'upgrades' && Tutorial.step && Tutorial.step.done === 'upgrade') Tutorial.advance('upgrade'); });
$('#tutSkip').addEventListener('click', () => { Sfx.click(); Tutorial.finish(true); toast('Tutorial pulado. Dá para recomeçar em Configurações.'); });
$('#tutNext').addEventListener('click', () => { Sfx.click(); state.tutorial.step = TUT_STEPS.length; Tutorial.finish(); });

/* =========================================================================
   9) ATUALIZAÇÃO DO APP (service worker)
   ========================================================================= */
const APP_VERSION = '2.0.0';
let swReg = null, lastUpdateCheck = 0;
function setupServiceWorker() {
  if (!('serviceWorker' in navigator) || !/^https?:/.test(location.protocol)) return;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then((reg) => { swReg = reg; }).catch((e) => console.warn('SW falhou', e));
  // uma versão nova assumiu: pede para recarregar (todos os arquivos vêm da mesma versão)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;     // primeira instalação: nada a fazer
    el.banner.innerHTML = `<p>Nova versão do jogo instalada.</p><button class="btn btn-cyan btn-sm" id="bannerUpdate">${icon('refresh')}Atualizar</button><button class="close-btn" style="position:static;width:40px;height:40px" id="bannerClose" aria-label="Depois">${icon('close')}</button>`;
    el.banner.hidden = false;
    $('#bannerUpdate').onclick = () => { saveState(); location.reload(); };
    $('#bannerClose').onclick = () => { el.banner.hidden = true; };
  });
}

/* =========================================================================
   10) API USADA POR game.js
   ========================================================================= */
let badgeAt = 0;
const tabEls = {};
el.tabbar.querySelectorAll('[data-nav]').forEach((b) => { tabEls[b.dataset.nav] = b; });
el.tabbar.addEventListener('click', (e) => {
  const b = e.target.closest('[data-nav]');
  if (!b) return;
  const nav = b.dataset.nav;
  if (Sheet.id === nav) { Sheet.close(); return; }
  if (nav === 'upgrades') openUpgrades();
  else if (nav === 'missions') openMissions();
  else if (nav === 'collection') openCollection();
  else if (nav === 'chest') { if (Sheet.id) Sheet.close(); openChest(); }
});

const Meta = {
  layerOpen: () => Layers.stack.length > 0 || !!Modal.open,
  openUpgrades, openCollection, openSettings, openMissions, offlineReward,
  confirm(title, text, okLabel, onOk) {
    Modal.show({ title, body: `<p class="center muted">${text}</p>`, actions: [{ label: 'Cancelar', cls: 'btn-dark' }, { label: okLabel, cls: 'btn-danger', onClick: () => { Modal.close(); onOk(); } }] });
  },
  /** Selos das abas (atualizado pelo HUD, no máximo 2x por segundo). */
  renderBadges(t) {
    if (t - badgeAt < 500) return;
    badgeAt = t;
    const canUpg = Object.keys(CONFIG.upgrades).some((k) => state.upg[k] < CONFIG.upgrades[k].max && state.coins >= upgradeCost(k));
    const ub = tabEls.upgrades.querySelector('.badge');
    if (ub.hidden === canUpg) ub.hidden = !canUpg;
    const mc = Missions.count(), mb = tabEls.missions.querySelector('.badge');
    if (mb.hidden === !!mc) mb.hidden = !mc;
    setText(mb, 'mbadge', mc ? String(mc) : '');
    const ready = t >= state.chestAt, cb = tabEls.chest.querySelector('.badge');
    setClass(tabEls.chest, 'ready-tab', ready);
    if (cb.hidden === ready) cb.hidden = !ready;
    setText(el.chestLabel, 'chestL', ready ? 'Baú!' : fmtTime((state.chestAt - t) / 1000));
    Missions.watch();
  },
  afterStart() {
    Achievements.check(true);     // conquistas antigas (saves migrados) sem barulho
    CHAINS.forEach((c) => { if (Missions.claimable(c)) Missions.notified.add(c.id + ':' + Missions.tier(c)); });
    Missions.ready = true;
    Modal.next();
    if (!state.tutorial.done) setTimeout(() => Tutorial.start(), 500);
  },
  reposition() { if (!ui.tut.hidden) Tutorial.position(); },
  checkForUpdate() {
    if (!swReg || now() - lastUpdateCheck < 10 * 60 * 1000) return;
    lastUpdateCheck = now();
    swReg.update().catch(() => {});
  },
};

/* =========================================================================
   11) PARTIDA!
   ========================================================================= */
try {
  init();
  setupServiceWorker();
} catch (err) {
  console.error(err);
  document.body.insertAdjacentHTML('beforeend', `<div class="modal" style="z-index:999"><div class="modal-card"><h2>Ops!</h2>
    <div class="modal-body"><p class="center muted">O jogo não conseguiu iniciar. Seu progresso continua salvo neste aparelho.</p></div>
    <div class="modal-actions"><button class="btn btn-orange" onclick="location.reload()">RECARREGAR</button></div></div></div>`);
}
