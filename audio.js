/* =========================================================================
   PLANET OF THE FURIOUS — audio.js
   Um único AudioContext com três canais: master → (música, efeitos).
   - Efeitos sintetizados (sem arquivos).
   - Música original gerada em tempo real: synthwave noturno com seções
     que variam (progressões, bateria, arpejo) para não cansar.
   Respeita a política de autoplay: só liga após um toque do jogador.
   ========================================================================= */
'use strict';

const AudioSys = {
  ctx: null, master: null, sfxBus: null, musicBus: null, noiseBuf: null,
  settings: { muted: false, music: 0.45, sfx: 0.8 },
  lastCoin: 0,

  /** Cria (uma vez) ou retoma o contexto. Chamar sempre dentro de um gesto. */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { return; }
      this.master = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      // compressor leve evita estouro quando vários sons tocam juntos
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      this.master.connect(comp); comp.connect(this.ctx.destination);
      // ruído branco reutilizável (chimbal, caixa, whoosh)
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
      // a música liga/desliga sozinha quando o contexto muda de estado
      this.ctx.onstatechange = () => Music.sync();
    }
    // iOS pode deixar o contexto "interrupted" após trocar de app
    if (this.ctx.state !== 'running') this.ctx.resume().then(() => Music.sync()).catch(() => {});
    Music.sync();
  },

  apply(settings) { Object.assign(this.settings, settings); this.applyVolumes(); Music.sync(); },
  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, s = this.settings;
    this.master.gain.setTargetAtTime(s.muted ? 0 : 1, t, 0.03);
    this.sfxBus.gain.setTargetAtTime(0.42 * s.sfx, t, 0.03);
    this.musicBus.gain.setTargetAtTime(0.32 * s.music, t, 0.08);
  },
  /** Pausa tudo quando o app vai para o background. */
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {}); Music.stop(); },
  resume() { if (this.ctx) { this.ctx.resume().catch(() => {}); Music.sync(); } },

  get sfxOn() { return this.ctx && this.ctx.state === 'running' && !this.settings.muted && this.settings.sfx > 0; },

  /* ------------------------- blocos de síntese ------------------------- */
  tone(freq, dur, type = 'square', vol = 0.3, slideTo = null, delay = 0, bus = this.sfxBus) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.03);
  },
  noise(dur, vol = 0.2, freq = 1200, delay = 0, type = 'bandpass', bus = this.sfxBus, sweepTo = null) {
    const c = this.ctx, t = c.currentTime + delay;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  },
};

/** Efeitos sonoros do jogo (mesmos nomes da versão anterior). */
const Sfx = {
  init() { AudioSys.unlock(); },
  play(fn) { if (AudioSys.sfxOn) try { fn(Audio); } catch (e) { /* contexto fechado */ } },
  buy()     { this.play((a) => { a.tone(440, 0.07, 'square', 0.18); a.tone(880, 0.12, 'square', 0.18, null, 0.06); }); },
  merge()   { this.play((a) => { a.tone(220, 0.22, 'sawtooth', 0.16, 880); a.tone(660, 0.15, 'triangle', 0.24, null, 0.16); a.tone(990, 0.3, 'triangle', 0.22, null, 0.24); a.noise(0.25, 0.14, 3000); a.tone(60, 0.25, 'sine', 0.5, 40, 0.15); }); },
  coin()    { const t = performance.now(); if (t - AudioSys.lastCoin < 120) return; AudioSys.lastCoin = t; this.play((a) => { a.tone(1320, 0.05, 'square', 0.06); a.tone(1980, 0.09, 'square', 0.05, null, 0.045); }); },
  unlock()  { this.play((a) => { [523, 659, 784, 1046, 1318].forEach((f, i) => a.tone(f, 0.24, 'triangle', 0.22, null, i * 0.08)); a.noise(0.7, 0.08, 6000, 0.3, 'highpass'); a.tone(55, 0.6, 'sine', 0.5, 35); }); },
  sell()    { this.play((a) => { a.tone(600, 0.14, 'square', 0.15, 200); a.tone(1500, 0.06, 'square', 0.06, null, 0.12); }); },
  error()   { this.play((a) => { a.tone(150, 0.12, 'sawtooth', 0.14); a.tone(120, 0.14, 'sawtooth', 0.12, null, 0.09); }); },
  click()   { this.play((a) => a.tone(720, 0.035, 'square', 0.09)); },
  select()  { this.play((a) => { a.tone(520, 0.05, 'triangle', 0.16); a.tone(780, 0.06, 'triangle', 0.12, null, 0.04); }); },
  place()   { this.play((a) => { a.tone(160, 0.22, 'sawtooth', 0.13, 560); a.noise(0.25, 0.1, 700, 0, 'bandpass', a.sfxBus, 2400); }); },
  nitro()   { this.play((a) => { a.noise(0.9, 0.3, 500, 0, 'bandpass', a.sfxBus, 4000); a.tone(110, 0.9, 'sawtooth', 0.18, 880); a.tone(55, 0.5, 'sine', 0.45, 30); }); },
  chest()   { this.play((a) => { a.noise(0.3, 0.15, 400); [392, 523, 659, 784, 1046].forEach((f, i) => a.tone(f, 0.18, 'square', 0.12, null, 0.25 + i * 0.07)); }); },
  upgrade() { this.play((a) => { a.tone(330, 0.1, 'square', 0.16, 660); a.tone(660, 0.2, 'triangle', 0.2, 1320, 0.09); }); },
  mission() { this.play((a) => { [784, 988, 1175].forEach((f, i) => a.tone(f, 0.14, 'triangle', 0.18, null, i * 0.07)); }); },
  whoosh()  { this.play((a) => a.noise(0.25, 0.12, 900, 0, 'bandpass', a.sfxBus, 2600)); },
};

/* =========================================================================
   MÚSICA — synthwave original gerado por código
   ========================================================================= */
const Music = {
  playing: false, timer: null, nextTime: 0, step: 0, bar: 0,
  bpm: 96, section: null, delay: null, out: null,

  // Lá menor. Cada acorde: [fundamental (MIDI), terça, quinta]
  PROGS: [
    [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],  // Am F C G
    [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]],  // Am F G Em
    [[50, 53, 57], [57, 60, 64], [53, 57, 60], [55, 59, 62]],  // Dm Am F G
    [[53, 57, 60], [55, 59, 62], [57, 60, 64], [57, 60, 64]],  // F G Am Am
  ],

  get wanted() {
    const s = AudioSys.settings;
    return AudioSys.ctx && AudioSys.ctx.state === 'running' && !s.muted && s.music > 0 && !document.hidden;
  },
  sync() { if (this.wanted) this.start(); else this.stop(); },

  start() {
    if (this.playing || !AudioSys.ctx) return;
    const c = AudioSys.ctx;
    if (!this.out) {
      // eco estéreo simples para o arpejo (sensação de cidade/ambiente)
      this.out = c.createGain(); this.out.connect(AudioSys.musicBus);
      this.delay = c.createDelay(1); this.delay.delayTime.value = (60 / this.bpm) * 0.75;
      const fb = c.createGain(); fb.gain.value = 0.32;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
      this.delay.connect(lp); lp.connect(fb); fb.connect(this.delay); lp.connect(this.out);
    }
    this.playing = true;
    this.nextTime = c.currentTime + 0.1;
    this.step = 0; this.bar = 0; this.newSection();
    this.timer = setInterval(() => this.schedule(), 60);
  },
  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer); this.timer = null;
  },

  newSection() {
    const r = Math.random();
    this.section = {
      prog: this.PROGS[Math.floor(Math.random() * this.PROGS.length)],
      drums: r > 0.22,                 // às vezes uma seção calma, só pad + arpejo
      arp: Math.random() > 0.3,
      arpDir: Math.random() > 0.5 ? 1 : -1,
      hats: Math.random() > 0.5 ? 2 : 1, // densidade do chimbal
    };
  },

  freq(m) { return 440 * Math.pow(2, (m - 69) / 12); },

  schedule() {
    const c = AudioSys.ctx;
    if (!this.wanted) { this.stop(); return; }
    const sp = 60 / this.bpm / 4; // duração de 1/16
    while (this.nextTime < c.currentTime + 0.25) {
      this.playStep(this.nextTime, sp);
      this.nextTime += sp;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) {
        this.bar++;
        if (this.bar % 4 === 0) this.newSection();
      }
    }
  },

  playStep(t, sp) {
    const S = this.section, chord = S.prog[this.bar % 4], st = this.step, c = AudioSys.ctx;
    // Pad no início de cada compasso
    if (st === 0) this.pad(t, chord, sp * 16);
    // Baixo em colcheias com oitava
    if (st % 2 === 0) {
      const n = chord[0] - 24 + (st % 8 === 6 ? 12 : 0);
      this.bass(t, this.freq(n), sp * 1.8);
    }
    // Bateria
    if (S.drums) {
      if (st === 0 || st === 8 || (st === 10 && this.bar % 2)) this.kick(t);
      if (st === 4 || st === 12) this.snare(t);
      if (st % (S.hats === 2 ? 2 : 4) === 2 || (S.hats === 2 && st % 2 === 0)) this.hat(t, st % 4 === 2 ? 0.07 : 0.04);
    } else if (st === 0) this.kick(t, 0.35);
    // Arpejo em semicolcheias
    if (S.arp && st % 2 === 0) {
      const notes = [chord[0], chord[1], chord[2], chord[0] + 12];
      const i = (st / 2) % 4;
      const n = notes[S.arpDir > 0 ? i : 3 - i] + 12;
      this.lead(t, this.freq(n), sp * 1.5);
    }
    void c;
  },

  pad(t, chord, dur) {
    const c = AudioSys.ctx, g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(1400, t + dur * 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.6);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.2);
    f.connect(g); g.connect(this.out);
    chord.forEach((m, k) => {
      for (const det of [-7, 7]) {
        const o = c.createOscillator(); o.type = 'sawtooth';
        o.frequency.value = this.freq(m - 12 + (k === 0 ? 0 : 0)); o.detune.value = det;
        o.connect(f); o.start(t); o.stop(t + dur + 0.25);
      }
    });
  },
  bass(t, fr, dur) {
    const c = AudioSys.ctx, o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = fr;
    f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(200, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(this.out);
    o.start(t); o.stop(t + dur + 0.02);
  },
  lead(t, fr, dur) {
    const c = AudioSys.ctx, o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = 'square'; o.frequency.value = fr;
    f.type = 'lowpass'; f.frequency.value = 1800;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.045, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(this.out); g.connect(this.delay);
    o.start(t); o.stop(t + dur + 0.02);
  },
  kick(t, vol = 0.6) {
    const c = AudioSys.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.32);
  },
  snare(t) {
    AudioSys.noise(0.16, 0.16, 1800, t - AudioSys.ctx.currentTime, 'bandpass', this.out);
    const c = AudioSys.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.1);
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.14);
  },
  hat(t, vol) { AudioSys.noise(0.04, vol, 8000, t - AudioSys.ctx.currentTime, 'highpass', this.out); },
};
