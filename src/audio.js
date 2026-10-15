/* =========================================================================
   MÓDULO ÁUDIO — tudo sintetizado em tempo real (Web Audio), sem voz real
   API pública: Som.music(id) Som.stopMusic() Som.setWeek(n) Som.sfx(id)
                Som.say(texto, 'char'|'boss'|'obj:tipo', atraso, opções) → duração
                Som.onSay(fn) (para o balão) Som.ambient(bool) Som.setVol(bus, v) Som.setMuted(bool)
   ========================================================================= */
const Som = (() => {
  let ctx = null, master, comp, noiseBuf, echoIn, ambBus;
  const buses = {};
  const vol = { music: 0.55, sfx: 0.8, voice: 0.9 };
  let muted = false;
  const R = Math.random;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master.connect(comp); comp.connect(ctx.destination);
    for (const k of ['music', 'sfx', 'voice']) { buses[k] = ctx.createGain(); buses[k].connect(master); }
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = R() * 2 - 1;
    // eco para "Na Ferida"
    echoIn = ctx.createGain();
    const dl = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain();
    dl.delayTime.value = 0.26; fb.gain.value = 0.38; wet.gain.value = 0.5;
    echoIn.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(buses.sfx);
    // ambiente: abafado e distante
    ambBus = ctx.createGain(); ambBus.gain.value = 0.5;
    const amLp = ctx.createBiquadFilter(); amLp.type = 'lowpass'; amLp.frequency.value = 2200;
    ambBus.connect(amLp); amLp.connect(buses.sfx);
    applyVol();
    return ctx;
  }
  function applyVol() {
    if (!ctx) return;
    master.gain.value = muted ? 0 : 0.9;
    for (const k in buses) buses[k].gain.value = vol[k];
  }
  const now = () => ctx.currentTime;
  const out = b => buses[b || 'sfx'];

  /* ---------- primitivas ---------- */
  function nf(n) {
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(n);
    if (!m) return 0;
    const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, ((+m[3] + 1) * 12 + base - 69) / 12);
  }
  function gainEnv(t, dur, v, a, hold) {
    const g = ctx.createGain();
    a = Math.min(a, dur * 0.5);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    if (hold) { g.gain.setValueAtTime(v, t + Math.max(a, dur * 0.75)); g.gain.linearRampToValueAtTime(0, t + dur); }
    else g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, a + 0.01));
    return g;
  }
  function bq(type, f, q) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q || 1; return b; }
  const PW = {};
  function pulse(dt) {
    if (PW[dt]) return PW[dt];
    const n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) re[k] = 2 * Math.sin(Math.PI * k * dt) / (Math.PI * k);
    return (PW[dt] = ctx.createPeriodicWave(re, im));
  }
  function tone({ f = 440, type = 'square', t = now(), dur = 0.2, v = 0.3, a = 0.005, to = null, bus, dest, detune = 0, vib = 0, vibRate = 6, filter = null, hold = false }) {
    const o = ctx.createOscillator();
    if (type === 'pulse25') o.setPeriodicWave(pulse(0.25));
    else if (type === 'pulse12') o.setPeriodicWave(pulse(0.125));
    else o.type = type;
    o.frequency.setValueAtTime(Math.max(f, 1), t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + dur);
    o.detune.value = detune;
    if (vib) {
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = vibRate; lg.gain.value = f * vib;
      l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05);
    }
    let node = o;
    if (filter) {
      const fl = bq(filter.type || 'lowpass', filter.f, filter.q);
      fl.frequency.setValueAtTime(filter.f, t);
      if (filter.to) fl.frequency.exponentialRampToValueAtTime(filter.to, t + dur);
      o.connect(fl); node = fl;
    }
    const g = gainEnv(t, dur, v, a, hold);
    node.connect(g); g.connect(dest || out(bus));
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  function noiseSrc(t, dur) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    s.start(t, R() * 1.5); s.stop(t + dur + 0.05); return s;
  }
  function noise({ t = now(), dur = 0.2, v = 0.3, a = 0.002, type = 'bandpass', f = 1000, to = null, q = 1, bus, dest, hold = false }) {
    const s = noiseSrc(t, dur);
    const fl = bq(type, f, q);
    fl.frequency.setValueAtTime(f, t);
    if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = gainEnv(t, dur, v, a, hold);
    s.connect(fl); fl.connect(g); g.connect(dest || out(bus));
  }
  function lp(f, dest) { const b = bq('lowpass', f, 0.7); b.connect(dest || out()); return b; }
  function shaper(k, dest) {
    const w = ctx.createWaveShaper(), n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
    w.curve = c; w.connect(dest || out()); return w;
  }

  /* ---------- blocos de som reutilizáveis ---------- */
  function key(t, v = 0.25, dest) {
    noise({ t, dur: 0.03, v, type: 'bandpass', f: 2200 + R() * 1500, q: 3, dest });
    tone({ f: 120 + R() * 40, type: 'square', t, dur: 0.02, v: v * 0.3, filter: { f: 800 }, dest });
  }
  function typing(t, n, span, v = 0.22, dest) { for (let i = 0; i < n; i++) key(t + i * span / n + R() * span / n * 0.5, v * (0.6 + R() * 0.5), dest); }
  function thump(t, f = 110, v = 0.7, dur = 0.18, dest) {
    tone({ f, to: f * 0.35, type: 'sine', t, dur, v, dest });
    noise({ t, dur: dur * 0.5, v: v * 0.5, type: 'lowpass', f: 600, dest });
  }
  function bell(t, f, dur = 1, v = 0.25, dest) {
    [1, 2.76, 5.4].forEach((m, i) => tone({ f: f * m, type: 'sine', t, dur: dur / (i + 1), v: v / (i * 1.5 + 1), a: 0.002, dest }));
  }
  function phone(t, dur = 0.9, v = 0.16, dest) {
    const g = ctx.createGain(); g.gain.setValueAtTime(0, 0); g.gain.setValueAtTime(0.5, t); g.gain.setValueAtTime(0, t + dur);
    const am = ctx.createOscillator(), amg = ctx.createGain();
    am.type = 'square'; am.frequency.value = 20; amg.gain.value = 0.5;
    am.connect(amg); amg.connect(g.gain); am.start(t); am.stop(t + dur);
    [440, 480].forEach(f => { const o = ctx.createOscillator(); o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + dur); });
    const vg = ctx.createGain(); vg.gain.value = v; g.connect(vg); vg.connect(dest || out());
  }
  function cash(t) {
    noise({ t, dur: 0.08, v: 0.35, type: 'bandpass', f: 1800, q: 2 });
    tone({ f: 300, type: 'square', t, dur: 0.05, v: 0.12, filter: { f: 1200 } });
    bell(t + 0.08, 2093, 0.9, 0.22); bell(t + 0.1, 2637, 0.9, 0.16);
  }
  function applause(t, dur, v = 0.3, n = 120, dest) {
    for (let i = 0; i < n; i++) {
      const tt = t + R() * dur, e = 1 - Math.abs((tt - t) / dur - 0.35);
      noise({ t: tt, dur: 0.025 + R() * 0.02, v: v * Math.max(0.15, e) * (0.4 + R() * 0.6), type: 'bandpass', f: 1200 + R() * 2500, q: 1.2, dest });
    }
  }
  function sigh(t, dur = 1.4, v = 0.3, dest) {
    noise({ t, dur, v, a: dur * 0.3, type: 'bandpass', f: 1300, to: 450, q: 1.5, dest: dest || out('voice') });
  }
  function yawn(t, dest) {
    const d = 1.4, o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(230, t); o.frequency.linearRampToValueAtTime(260, t + 0.4); o.frequency.exponentialRampToValueAtTime(110, t + d);
    const b1 = bq('bandpass', 800, 7), b2 = bq('bandpass', 1200, 9);
    b1.frequency.setValueAtTime(700, t); b1.frequency.linearRampToValueAtTime(480, t + d);
    b2.frequency.setValueAtTime(1150, t); b2.frequency.linearRampToValueAtTime(820, t + d);
    const g = gainEnv(t, d, 0.9, 0.25, true);
    o.connect(b1); o.connect(b2); b1.connect(g); b2.connect(g); g.connect(dest || out('voice'));
    o.start(t); o.stop(t + d + 0.05);
    noise({ t, dur: d, v: 0.08, a: 0.3, type: 'bandpass', f: 1000, q: 1, dest: dest || out('voice'), hold: true });
  }
  function snore(t) {
    tone({ f: 55, type: 'sawtooth', t, dur: 1.1, v: 0.3, a: 0.6, vib: 0.15, vibRate: 28, filter: { f: 350 }, bus: 'voice' });
    noise({ t, dur: 1.1, v: 0.15, a: 0.6, type: 'lowpass', f: 500, bus: 'voice' });
    noise({ t: t + 1.15, dur: 0.7, v: 0.12, a: 0.05, type: 'bandpass', f: 900, to: 400, bus: 'voice' });
  }
  function crumple(t, dur = 0.8) {
    for (let i = 0; i < 45; i++) noise({ t: t + R() * dur, dur: 0.01 + R() * 0.025, v: 0.15 + R() * 0.2, type: 'highpass', f: 1800 + R() * 3000 });
  }
  function door(t) {
    tone({ f: 300, to: 430, type: 'sawtooth', t, dur: 0.55, v: 0.07, a: 0.1, vib: 0.05, vibRate: 13, filter: { type: 'bandpass', f: 900, q: 3 } });
    thump(t + 0.6, 80, 0.8, 0.25);
    noise({ t: t + 0.6, dur: 0.08, v: 0.2, type: 'bandpass', f: 2500, q: 3 });
  }
  function chime(t, notes, step = 0.15, v = 0.2) { notes.forEach((n, i) => bell(t + i * step, nf(n), 0.9, v)); }
  function penScratch(t, dur, v = 0.12) {
    let tt = t; while (tt < t + dur) { const d = 0.04 + R() * 0.07; noise({ t: tt, dur: d, v, type: 'bandpass', f: 3000 + R() * 1500, q: 4 }); tt += d + R() * 0.06; }
  }
  function murmur(t, dur, v = 0.12, dest) {
    const d = dest || lp(900, out('voice'));
    const frases = ['então pessoal alinhando aqui', 'vamos marcar outra reunião', 'quem ficou com a ata', 'acho que caiu a conexão', 'deixa eu compartilhar a tela'];
    for (let i = 0; i < 4; i++) babble(frases[i], { t: t + R() * 0.3 + i * dur / 6, pitch: 0.7 + R() * 0.5, rate: 1.1, v, dest: d, max: 10 });
  }

  /* ---------- BALBUCIO com formantes (murmúrio, cochicho, chefão bravo) ---------- */
  const FORM = { a: [800, 1200], e: [420, 2000], i: [300, 2300], o: [480, 850], u: [330, 750] };
  function vowelsOf(text) { return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^aeiou]/g, '').split(''); }
  function babble(text, o = {}) {
    if (!init()) return 0;
    const t0 = o.t || now() + 0.02, pitch = o.pitch || 1, rate = o.rate || 1;
    let vs = vowelsOf(text); if (!vs.length) vs = ['a', 'o'];
    if (o.max) vs = vs.slice(0, o.max);
    const sd = 0.1 / rate, q = /\?/.test(text), ex = /!/.test(text);
    const dest = o.dest || out(o.bus || 'voice'), v = o.v || 0.5, base = (o.base || 150) * Math.max(0.35, pitch);
    vs.forEach((vw, i) => {
      const t = t0 + i * sd, last = i === vs.length - 1;
      let f = base * (1 + (R() - 0.5) * 0.12);
      if (ex && i === 0) f *= 1.15;
      const d = sd * (last ? 1.8 : 0.95);
      let src;
      if (o.whisper) src = noiseSrc(t, d);
      else {
        src = ctx.createOscillator(); src.type = 'sawtooth';
        src.frequency.setValueAtTime(f, t);
        src.frequency.linearRampToValueAtTime(q && last ? f * 1.4 : f * (ex ? 0.85 : 0.93), t + d);
        if (o.trem) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.tremRate || 8; lg.gain.value = f * (o.tremDepth || 0.06); l.connect(lg); lg.connect(src.frequency); l.start(t); l.stop(t + d + 0.03); }
        src.start(t); src.stop(t + d + 0.03);
      }
      const [f1, f2] = FORM[vw];
      const b1 = bq('bandpass', f1, o.whisper ? 4 : 8), b2 = bq('bandpass', f2, o.whisper ? 5 : 10), mix = ctx.createGain();
      mix.gain.value = o.whisper ? 2 : 3;
      src.connect(b1); src.connect(b2); b1.connect(mix); b2.connect(mix);
      const g = gainEnv(t, d, v, 0.012, true);
      if (o.ring) {
        const rg = ctx.createGain(); rg.gain.value = 0;
        const ro = ctx.createOscillator(); ro.type = 'square'; ro.frequency.value = o.ring;
        ro.connect(rg.gain); mix.connect(rg); rg.connect(g); ro.start(t); ro.stop(t + d + 0.05);
      } else mix.connect(g);
      g.connect(dest);
      if (i % 2 === 0) noise({ t, dur: 0.02, v: v * 0.35, type: 'highpass', f: 3000, dest });
    });
    return vs.length * sd + sd;
  }
  /* ---------- FALAS: balão de texto + "bla bla bla" sintetizado (sem voz real) ----------
     who: 'char' (personagem: blip fininho) | 'boss' (chefão humano: grave e bravo)
          'obj:<tipo>' (chefe objeto: fala com o próprio barulho) */
  const VF = { a: 1, e: 1.12, i: 1.25, o: 0.9, u: 0.82 };
  function sylls(text, max) { let vs = vowelsOf(text); if (!vs.length) vs = ['a', 'o']; return vs.slice(0, max || 28); }
  function blaFino(text, o) {
    const t0 = o.t, vs = sylls(text), sd = 0.075 / (o.rate || 1), base = 520 * (o.pitch || 1), v = 0.32 * (o.v ?? 1);
    const q = /\?/.test(text), ex = /!/.test(text) || text === text.toUpperCase();
    vs.forEach((vw, i) => {
      const t = t0 + i * sd, last = i === vs.length - 1;
      let f = base * VF[vw] * (1 + (R() - 0.5) * 0.1);
      if (ex && i === 0) f *= 1.15;
      if (q && last) f *= 1.2;
      tone({ f, to: f * (q && last ? 1.3 : ex ? 0.8 : 0.9), type: 'pulse25', t, dur: sd * (last ? 1.6 : 0.85), v, a: 0.004, hold: true, vib: o.trem ? 0.06 : 0, vibRate: 9, filter: { f: 3800 }, bus: 'voice' });
      tone({ f: f * 2, type: 'sine', t, dur: sd * 0.5, v: v * 0.25, bus: 'voice' });
    });
    return vs.length * sd + 0.1;
  }
  function blaBravo(text, o) {
    const p = o.pitch || 1, r = o.rate || 1;
    const dist = shaper(5, lp(2400, out('voice')));
    const dur = babble(text, { t: o.t, base: 95 * p, rate: 1.05 * r, v: 0.55 * (o.v ?? 1), trem: true, tremRate: 24, tremDepth: 0.05, dest: dist });
    sylls(text).forEach((vw, i) => { if (i % 3 === 0) tone({ f: 48 * p, type: 'square', t: o.t + i * 0.1 / (1.05 * r), dur: 0.09, v: 0.12, filter: { f: 300 }, bus: 'voice' }); });
    return dur;
  }
  const OBJ = {
    ponto: (t, f, d, v, dst) => tone({ f: f * 4, type: 'square', t, dur: d * 0.75, v: v * 0.5, filter: { f: 3000 }, dest: dst }),
    excel: (t, f, d, v, dst) => { tone({ f: f * 3, type: 'square', t, dur: d * 0.7, v: v * 0.4, filter: { type: 'bandpass', f: 1500, q: 3 }, dest: dst }); if (R() < 0.35) key(t, 0.15, dst); },
    pendrive: (t, f, d, v, dst) => tone({ f: f * 6, to: f * 9, type: 'sine', t, dur: d * 0.6, v: v * 0.6, dest: dst }),
    impressora: (t, f, d, v, dst) => { tone({ f: f * 0.6, type: 'sawtooth', t, dur: d * 0.9, v: v * 0.6, filter: { f: 500 }, dest: dst }); noise({ t, dur: d * 0.8, v: v * 0.3, type: 'bandpass', f: 900, q: 5, dest: dst }); },
    leao: (t, f, d, v, dst) => { tone({ f: f * 0.5, to: f * 0.4, type: 'sawtooth', t, dur: d, v: v * 0.7, vib: 0.08, vibRate: 25, filter: { type: 'bandpass', f: 600, q: 1.5 }, dest: dst }); noise({ t, dur: d, v: v * 0.3, type: 'lowpass', f: 800, dest: dst }); },
  };
  function objFala(kind, text, o) {
    const fn = OBJ[kind] || OBJ.excel, vs = sylls(text), sd = 0.12 / (o.rate || 1), v = 0.5 * (o.v ?? 1);
    vs.forEach((vw, i) => fn(o.t + i * sd, 200 * VF[vw] * (1 + (R() - 0.5) * 0.08), sd, v, out('voice')));
    return vs.length * sd + 0.15;
  }
  let onSay = null;
  // say(texto, quem='char', atraso=0, opções={pitch, rate, trem, v}) → duração estimada em segundos
  function say(text, who = 'char', delay = 0, opts = {}) {
    if (typeof who === 'object') { opts = who; who = opts.who || 'char'; }
    if (!init()) return 0;
    const o = { ...opts, t: now() + 0.03 + delay };
    let dur;
    if (who === 'boss') dur = blaBravo(text, o);
    else if (who.startsWith('obj:')) dur = objFala(who.slice(4), text, o);
    else dur = blaFino(text, o);
    if (onSay) setTimeout(() => onSay(text, who, dur), delay * 1000);
    return dur;
  }

  /* ---------- INSTRUMENTOS da trilha ---------- */
  const INST = {
    organ: (t, f, d, v, dst) => { tone({ f, type: 'square', t, dur: d, v: v * 0.3, a: 0.01, hold: true, vib: 0.004, vibRate: 5.5, dest: dst, filter: { f: 1800 } }); tone({ f: f * 2, type: 'sine', t, dur: d, v: v * 0.25, a: 0.01, hold: true, dest: dst }); },
    pad: (t, f, d, v, dst) => { tone({ f, type: 'triangle', t, dur: d, v: v * 0.6, a: 0.08, hold: true, dest: dst }); tone({ f: f * 1.003, type: 'sine', t, dur: d, v: v * 0.4, a: 0.1, hold: true, dest: dst }); },
    lead: (t, f, d, v, dst) => tone({ f, type: 'pulse25', t, dur: d, v: v * 0.5, a: 0.005, hold: true, dest: dst, filter: { f: 4000 } }),
    tri: (t, f, d, v, dst) => tone({ f, type: 'triangle', t, dur: d, v, a: 0.01, hold: true, dest: dst }),
    bass: (t, f, d, v, dst) => tone({ f, type: 'triangle', t, dur: Math.min(d, 0.4), v: v * 1.1, a: 0.005, dest: dst }),
    sbass: (t, f, d, v, dst) => tone({ f, type: 'sawtooth', t, dur: d, v: v * 0.6, a: 0.005, hold: true, dest: dst, filter: { f: 900, to: 300 } }),
    brass: (t, f, d, v, dst) => { tone({ f, type: 'sawtooth', t, dur: d, v: v * 0.45, a: 0.03, hold: true, dest: dst, filter: { f: 700, to: 2600, q: 2 } }); tone({ f, type: 'square', t, dur: d, v: v * 0.12, a: 0.03, hold: true, dest: dst }); },
    pluck: (t, f, d, v, dst) => tone({ f, type: 'square', t, dur: Math.min(d, 0.25) + 0.05, v: v * 0.5, a: 0.003, dest: dst, filter: { f: 2500, to: 600 } }),
    cavaco: (t, f, d, v, dst) => tone({ f, type: 'pulse12', t, dur: 0.14, v: v * 0.6, a: 0.002, dest: dst, filter: { f: 5000, to: 1500 } }),
    choir: (t, f, d, v, dst) => {
      const b1 = bq('bandpass', 800, 6), b2 = bq('bandpass', 1150, 8), g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 1.6, t + 0.25);
      g.gain.setValueAtTime(v * 1.6, t + Math.max(0.26, d - 0.2)); g.gain.linearRampToValueAtTime(0, t + d + 0.1);
      b1.connect(g); b2.connect(g); g.connect(dst);
      [-9, 0, 9].forEach(c => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = c; o.connect(b1); o.connect(b2); o.start(t); o.stop(t + d + 0.15); });
    },
    trombone: (t, f, d, v, dst) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 0.97, t + d);
      const fl = bq('lowpass', 600, 4), l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = 4.5; lg.gain.value = 450; l.connect(lg); lg.connect(fl.frequency);
      const g = gainEnv(t, d, v * 0.7, 0.06, true);
      o.connect(fl); fl.connect(g); g.connect(dst); o.start(t); o.stop(t + d + 0.05); l.start(t); l.stop(t + d + 0.05);
    },
    kick: (t, f, d, v, dst) => tone({ f: 150, to: 45, type: 'sine', t, dur: 0.2, v: v * 1.2, dest: dst }),
    snare: (t, f, d, v, dst) => { noise({ t, dur: 0.12, v: v * 0.8, type: 'highpass', f: 1500, dest: dst }); tone({ f: 190, type: 'triangle', t, dur: 0.06, v: v * 0.5, dest: dst }); },
    hat: (t, f, d, v, dst) => noise({ t, dur: 0.035, v, type: 'highpass', f: 7000, dest: dst }),
    rim: (t, f, d, v, dst) => { tone({ f: 1700, type: 'square', t, dur: 0.02, v: v * 0.6, dest: dst, filter: { f: 3000 } }); noise({ t, dur: 0.015, v: v * 0.5, type: 'bandpass', f: 2500, q: 3, dest: dst }); },
    shaker: (t, f, d, v, dst) => noise({ t, dur: 0.05, v, a: 0.01, type: 'highpass', f: 5000, dest: dst }),
    tick: (t, f, d, v, dst) => tone({ f: 1800, type: 'sine', t, dur: 0.04, v, dest: dst }),
    tock: (t, f, d, v, dst) => tone({ f: 1250, type: 'sine', t, dur: 0.04, v, dest: dst }),
    surdo: (t, f, d, v, dst) => tone({ f: 85, to: 55, type: 'sine', t, dur: 0.4, v: v * 1.2, dest: dst }),
    pandeiro: (t, f, d, v, dst) => noise({ t, dur: 0.06, v, type: 'bandpass', f: 5000, q: 1.5, dest: dst }),
    crash: (t, f, d, v, dst) => noise({ t, dur: 1.4, v, type: 'highpass', f: 3500, dest: dst }),
  };

  /* ---------- TRILHAS (16 passos = 1 compasso; "-" segura, "." pausa) ---------- */
  const rep = (s, n) => Array(n).fill(s).join(' ');
  const hold = (c, n) => c + ' ' + rep('-', n - 1);
  const MENU_LEAD = 'E5 - - - G5 - E5 - D5 - - - C5 - - - A4 - - - C5 - E5 - D5 - - - . . . . F5 - - - E5 - D5 - C5 - - - A4 - - - B4 - - - D5 - G5 - F5 - E5 - D5 - . .';
  const MENU_CH = [hold('C4+E4+G4+B4', 16), hold('A3+C4+E4+G4', 16), hold('D4+F4+A4+C5', 16), hold('G3+B3+D4+F4', 16)].join(' ');
  const MENU_BASS = 'C3 . . . G2 . . . C3 . . . G2 . E2 . A2 . . . E2 . . . A2 . . . E2 . G2 . D3 . . . A2 . . . D3 . . . A2 . C3 . G2 . . . D3 . . . G2 . . . B2 . D3 .';
  const CMB_BASS = 'E2 E2 E3 E2 E2 E3 E2 D3 E2 E2 E3 E2 G2 A2 B2 D3 C2 C2 C3 C2 C2 C3 C2 B2 D2 D2 D3 D2 B1 B1 B2 D3';
  const CMB_DRUMS = [
    { inst: 'kick', v: 0.55, seq: 'x . . . x . . . x . . . x . . .' },
    { inst: 'snare', v: 0.32, seq: '. . . . x . . . . . . . x . . x' },
    { inst: 'hat', v: 0.08, seq: 'x . x . x . x . x . x . x . x .' },
    { inst: 'hat', v: 0.06, seq: '. x . x . x . x . x . x . x . x', minWeek: 3 },
    { inst: 'crash', v: 0.12, seq: 'x ' + rep('.', 63), minWeek: 4 },
  ];
  const bossaBar = ch => `. . ${ch} . . . . ${ch} . . ${ch} . . . . .`;
  const pagBar = ch => `${ch} . ${ch} ${ch} . ${ch} . ${ch} ${ch} . ${ch} . ${ch} ${ch} . ${ch}`;
  const SONGS = {
    menu: { name: 'Bom Dia, Boa Folha', bpm: 92, loop: true, parts: [
      { inst: 'organ', v: 0.45, seq: MENU_LEAD }, { inst: 'pad', v: 0.16, seq: MENU_CH }, { inst: 'bass', v: 0.5, seq: MENU_BASS },
      { inst: 'rim', v: 0.15, seq: 'x . . . . . x . . . x . . . . .' }, { inst: 'shaker', v: 0.05, seq: 'x . x . x . x . x . x . x . x .' }] },
    mercado: { name: 'Bossa do Currículo', bpm: 126, loop: true, parts: [
      { inst: 'tri', v: 0.4, seq: 'A4 - - - G4 F4 - - E4 - D4 - - - . . B4 - - - A4 G4 - - F4 - - - . . . . E4 - G4 - B4 - - - A4 - G4 - E4 - - - C#5 - - - B4 - A4 - G4 - - - . . . .' },
      { inst: 'pluck', v: 0.22, seq: [bossaBar('F4+A4+C5'), bossaBar('F4+B4+D5'), bossaBar('E4+G4+B4'), bossaBar('E4+G4+C#5')].join(' ') },
      { inst: 'bass', v: 0.5, seq: 'D3 . . . A2 . . A2 D3 . . . A2 . . . G2 . . . D3 . . D3 G2 . . . D3 . . . C3 . . . G2 . . G2 C3 . . . G2 . . . A2 . . . E3 . . E3 A2 . . . E3 . . .' },
      { inst: 'rim', v: 0.18, seq: 'x . . x . . x . . . x . . x . .' }, { inst: 'shaker', v: 0.05, seq: 'x . x x x . x x x . x x x . x x' }] },
    treino: { name: 'Hora do Quiz', bpm: 132, loop: true, parts: [
      { inst: 'lead', v: 0.35, seq: 'G5 . E5 . C5 . E5 . G5 - - - . . . . A5 . G5 . F5 . D5 . C5 - - - . . . .' },
      { inst: 'brass', v: 0.3, seq: 'C4+E4+G4 . . C4+E4+G4 . . . . Bb3+D4+F4 . . . F3+A3+C4 . . . C4+E4+G4 . . C4+E4+G4 . . . . G3+B3+D4 - - - . . . .' },
      { inst: 'bass', v: 0.5, seq: 'C3 . . . C3 . . . Bb2 . . . F2 . . . C3 . . . C3 . . . G2 . . . G2 . . .' },
      { inst: 'tick', v: 0.3, seq: 'x . . . . . . . x . . . . . . .' }, { inst: 'tock', v: 0.3, seq: '. . . . x . . . . . . . x . . .' },
      { inst: 'kick', v: 0.45, seq: 'x . . . x . . . x . . . x . . .' }, { inst: 'snare', v: 0.28, seq: '. . . . x . . . . . . . x . . .' }] },
    escalacao: { name: 'Reunião das 8h', bpm: 98, loop: true, parts: [
      { inst: 'sbass', v: 0.45, seq: 'A1 . A1 . A1 . A1 . A1 . A1 . A1 . A1 . F1 . F1 . F1 . F1 . G1 . G1 . E1 . E1 .' },
      { inst: 'pad', v: 0.15, seq: hold('A3+C4+E4', 16) + ' ' + hold('F3+A3+C4', 8) + ' ' + hold('G3+B3+D4', 4) + ' ' + hold('E3+G#3+B3', 4) },
      { inst: 'kick', v: 0.55, seq: 'x . x . . . . . x . x . . . . .' }, { inst: 'hat', v: 0.1, seq: '. . . . . . . . . . . . . . x .' },
      { inst: 'tri', v: 0.2, seq: 'E5 - - - . . . . . . . . . . . . F5 - - - E5 - - - D#5 - - - . . . .' }] },
    combate: { name: 'Prazo Estourando', bpm: 150, loop: true, accel: true, parts: [
      { inst: 'sbass', v: 0.45, seq: CMB_BASS },
      { inst: 'lead', v: 0.3, seq: 'E5 . . E5 . . G5 . A5 . G5 . E5 . D5 . E5 . . E5 . . B5 . A5 . G5 . A5 - - - C6 . . B5 . . A5 . G5 . A5 . B5 . . . D6 . . C6 . . B5 . A5 - - - B5 - - -' },
      ...CMB_DRUMS] },
    chefe: { name: 'Pane Geral', bpm: 150, loop: true, accel: true, glitch: true, parts: [
      { inst: 'sbass', v: 0.45, seq: CMB_BASS },
      { inst: 'lead', v: 0.3, seq: 'E5 . . F5 . . E5 . Bb5 . A5 . E5 . D#5 . E5 . . E5 . . B5 . Bb5 . G5 . A5 - - -' },
      ...CMB_DRUMS] },
    final: { name: 'Board Meeting', bpm: 168, loop: true, accel: true, parts: [
      { inst: 'choir', v: 0.3, seq: [hold('E3+B3+E4', 16), hold('C3+G3+C4', 16), hold('D3+A3+D4', 16), hold('B2+F#3+B3', 16)].join(' ') },
      { inst: 'sbass', v: 0.5, seq: 'E2 . E2 E2 E3 . E2 . E2 . E2 E2 E3 . D3 . C2 . C2 C2 C3 . C2 . C2 . C2 C2 C3 . B2 . D2 . D2 D2 D3 . D2 . D2 . D2 D2 D3 . C3 . B1 . B1 B1 B2 . B1 . B1 . B1 B1 B2 . D#3 .' },
      { inst: 'brass', v: 0.3, seq: 'E5 - - - B4 - E5 - F#5 - G5 - F#5 - E5 - G5 - - - F#5 - E5 - D5 - - - B4 - - - A5 - - - G5 - F#5 - E5 - - - D5 - C5 - B4 - - - - - - - F#5 - - - D#5 - - -' },
      { inst: 'kick', v: 0.6, seq: 'x . . . x . . x x . . . x . . .' }, { inst: 'snare', v: 0.35, seq: '. . . . x . . . . . . . x . x x' },
      { inst: 'hat', v: 0.06, seq: rep('x', 16) }, { inst: 'crash', v: 0.14, seq: 'x ' + rep('.', 63) }] },
    vitoria: { name: 'Meta Batida', bpm: 140, loop: false, parts: [
      { inst: 'brass', v: 0.4, seq: 'C5 . C5 . C5 . G4 . C5 - - - E5 - - - G5 - - - - - - - C6 - - - - - - -' },
      { inst: 'pad', v: 0.2, seq: hold('C4+E4+G4', 16) + ' ' + hold('C4+E4+G4+C5', 16) },
      { inst: 'snare', v: 0.2, seq: 'x x x x x x x x ' + rep('.', 16) + ' x . . . . . . .' },
      { inst: 'kick', v: 0.5, seq: 'x . . . . . . . x . . . . . . . x . . . . . . . x . . . . . . .' },
      { inst: 'crash', v: 0.15, seq: rep('.', 24) + ' x . . . . . . .' }] },
    derrota: { name: 'Vai Pro Feedback', bpm: 72, loop: false, parts: [
      { inst: 'trombone', v: 0.45, seq: 'G3 - - - F#3 - - - F3 - - - E3 - - - - - - - - - - - . . . . . . . .' }] },
    fimVitoria: { name: 'Funcionário do Ano', bpm: 116, loop: true, parts: [
      { inst: 'brass', v: 0.35, seq: MENU_LEAD }, { inst: 'choir', v: 0.22, seq: MENU_CH }, { inst: 'bass', v: 0.5, seq: MENU_BASS },
      { inst: 'kick', v: 0.5, seq: 'x . . . x . . . x . . . x . . .' }, { inst: 'snare', v: 0.28, seq: '. . . . x . . . . . . . x . . .' },
      { inst: 'hat', v: 0.07, seq: 'x . x . x . x . x . x . x . x .' }, { inst: 'crash', v: 0.12, seq: 'x ' + rep('.', 63) }] },
    fimDerrota: { name: 'Bilhete Azul', bpm: 56, loop: true, sour: true, parts: [
      { inst: 'organ', v: 0.35, seq: MENU_LEAD }, { inst: 'bass', v: 0.4, seq: MENU_BASS }] },
    pagode: { name: 'Pagode 8 bits', bpm: 98, loop: false, parts: [
      { inst: 'cavaco', v: 0.25, seq: [pagBar('E4+G4+C5'), pagBar('E4+G4+C#5'), pagBar('F4+A4+D5'), pagBar('F4+B4+D5')].join(' ') },
      { inst: 'surdo', v: 0.5, seq: 'x . . . . . . . x . . . . . . .' }, { inst: 'pandeiro', v: 0.1, seq: 'x . x x x . x x x . x x x . x x' },
      { inst: 'rim', v: 0.15, seq: 'x . . x . . x . . . x . x . . .' }] },
  };
  function parse(str) {
    const tk = str.trim().split(/\s+/), res = [];
    tk.forEach((x, i) => {
      if (x === '.' || x === '-') { res.push(null); return; }
      let h = 0; for (let j = i + 1; j < tk.length && tk[j] === '-'; j++) h++;
      res.push({ fs: x === 'x' ? [0] : x.split('+').map(nf), len: h + 1 });
    });
    return res;
  }
  const M = { cur: null, name: null, step: 0, next: 0, timer: null, week: 1 };
  let onMusic = null;
  function music(name) {
    if (!init()) return;
    stopMusic();
    const s = SONGS[name]; if (!s) return;
    if (!s._p) { s._p = s.parts.map(p => ({ ...p, seq: parse(p.seq) })); s._len = Math.max(...s._p.map(p => p.seq.length)); }
    M.cur = s; M.name = name; M.step = 0; M.next = ctx.currentTime + 0.06;
    M.timer = setInterval(sched, 25); sched();
    onMusic && onMusic(name);
  }
  function stopMusic() { if (M.timer) clearInterval(M.timer); M.timer = null; M.cur = null; M.name = null; onMusic && onMusic(null); }
  function sched() {
    const s = M.cur; if (!s) return;
    while (M.next < ctx.currentTime + 0.15) {
      const mul = s.accel ? 1 + (M.week - 1) * 0.07 : 1, sd = 60 / (s.bpm * mul) / 4;
      for (const p of s._p) {
        if (p.minWeek && M.week < p.minWeek) continue;
        const ev = p.seq[M.step % p.seq.length]; if (ev) playEv(s, p, ev, M.next, sd);
      }
      M.next += sd; M.step++;
      if (M.step >= s._len) { if (s.loop) M.step = 0; else { stopMusic(); break; } }
    }
  }
  function playEv(s, p, ev, t, sd) {
    const d = ev.len * sd * 0.95, v = p.v || 0.5;
    let fs = ev.fs;
    if (s.glitch) {
      const r = R();
      if (r < 0.06) return;
      if (r < 0.16 && fs[0]) fs = fs.map(f => f * (R() < 0.5 ? 1.06 : 0.95));
      if (r > 0.97) noise({ t, dur: sd * 2, v: 0.14, type: 'bandpass', f: 3000 + R() * 3000, q: 8, dest: buses.music });
      if (r > 0.985 && fs[0]) { for (let k = 1; k < 4; k++) INST[p.inst](t + k * 0.03, fs[0], 0.03, v * 0.6, buses.music); }
    }
    if (s.sour && fs[0]) fs = fs.map(f => f * Math.pow(2, ((R() - 0.5) * 50) / 1200));
    fs.forEach(f => INST[p.inst](t, f, d, v / Math.sqrt(fs.length), buses.music));
  }
  function setWeek(w) { M.week = Math.max(1, Math.min(4, w | 0)); }

  /* ---------- EFEITOS ---------- */
  const S = {
    // Interface
    grampo: t => { noise({ t, dur: 0.025, v: 0.35, type: 'highpass', f: 2500 }); tone({ f: 900, to: 300, type: 'square', t, dur: 0.03, v: 0.12, filter: { f: 2000 } }); thump(t, 140, 0.25, 0.05); },
    folha: t => noise({ t, dur: 0.12, v: 0.12, a: 0.02, type: 'bandpass', f: 1800, to: 4500, q: 0.8 }),
    carimbo: t => { thump(t, 75, 0.9, 0.22); noise({ t, dur: 0.1, v: 0.5, type: 'lowpass', f: 900 }); bell(t + 0.18, 1568, 0.9, 0.2); bell(t + 0.22, 2093, 1, 0.18); },
    recusado: t => { tone({ f: 196, type: 'square', t, dur: 0.14, v: 0.2, filter: { f: 1200 } }); tone({ f: 185, type: 'square', t: t + 0.2, dur: 0.18, v: 0.2, filter: { f: 1200 } }); },
    debito: t => { for (let i = 0; i < 8; i++) { const tt = t + i * 0.07; tone({ f: 2500 + R() * 1500, type: 'sine', t: tt, dur: 0.12, v: 0.12 }); noise({ t: tt, dur: 0.02, v: 0.1, type: 'highpass', f: 5000 }); } tone({ f: 880, to: 220, type: 'triangle', t: t + 0.55, dur: 0.5, v: 0.15 }); },
    demissao: t => { thump(t, 60, 1, 0.3); noise({ t, dur: 0.2, v: 0.6, type: 'lowpass', f: 1200 }); noise({ t: t + 0.05, dur: 0.12, v: 0.12, type: 'bandpass', f: 3000, q: 3 }); say('TÔ FORA!', 'char', 0.35); },
    sino: t => { bell(t, 1760, 1.4, 0.22); bell(t + 0.18, 1318, 1.6, 0.2); },
    disquete: t => { tone({ f: 55, type: 'square', t, dur: 0.5, v: 0.08, hold: true, filter: { f: 600 } }); noise({ t, dur: 0.5, v: 0.08, hold: true, type: 'bandpass', f: 900, q: 6 }); for (let i = 0; i < 4; i++) key(t + 0.1 + i * 0.09, 0.1); },
    // Treinamento
    tique: t => { for (let i = 0; i < 4; i++) { tone({ f: i % 2 ? 1300 : 1800, type: 'sine', t: t + i * 0.5, dur: 0.04, v: 0.3 }); noise({ t: t + i * 0.5, dur: 0.01, v: 0.15, type: 'highpass', f: 4000 }); } },
    acertou: t => { ['C4', 'E4', 'G4', 'C5'].forEach((n, i) => INST.brass(t + i * 0.08, nf(n), 0.12, 0.4, out())); ['C5', 'E5', 'G5'].forEach(n => INST.brass(t + 0.34, nf(n), 0.6, 0.25, out())); },
    buzina: t => { tone({ f: 98, type: 'sawtooth', t, dur: 0.55, v: 0.3, hold: true, filter: { f: 1200 } }); tone({ f: 104, type: 'square', t, dur: 0.55, v: 0.15, hold: true, filter: { f: 900 } }); },
    plateia: t => { applause(t, 2.4, 0.3, 150); tone({ f: 1800, to: 2600, type: 'sine', t: t + 0.6, dur: 0.3, v: 0.08 }); say('ARRASOU!', 'char', 0.3); },
    grilo: t => { for (let g = 0; g < 4; g++) for (let i = 0; i < 3; i++) tone({ f: 4400, type: 'sine', t: t + 0.8 + g * 0.6 + i * 0.05, dur: 0.03, v: 0.08 }); },
    diploma: t => { ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'].forEach((n, i) => { tone({ f: nf(n), type: 'triangle', t: t + i * 0.06, dur: 0.3, v: 0.2 }); tone({ f: nf(n), type: 'pulse25', t: t + i * 0.06, dur: 0.12, v: 0.06 }); }); bell(t + 0.4, nf('C7'), 1.2, 0.12); },
    // Combate
    agenda: t => { typing(t, 22, 0.9); say('VAMO TRABALHAR!', 'char', 0.9); },
    segunda: t => { for (let g = 0; g < 2; g++) for (let i = 0; i < 8; i++) tone({ f: 2093, type: 'square', t: t + g * 0.5 + i * 0.05, dur: 0.03, v: 0.12, filter: { f: 4000 } }); },
    hardFIN: t => { for (let i = 0; i < 6; i++) tone({ f: 1500 + R() * 800, type: 'square', t: t + i * 0.09, dur: 0.04, v: 0.1, filter: { f: 3000 } }); for (let i = 0; i < 10; i++) noise({ t: t + 0.6 + i * 0.03, dur: 0.015, v: 0.18, type: 'bandpass', f: 2000, q: 3 }); },
    hardDAD: t => typing(t, 10, 0.7, 0.3),
    hardJUR: t => { [0, 0.35].forEach((d, i) => { tone({ f: 260, to: 90, type: 'sine', t: t + d, dur: 0.12, v: 0.6 + i * 0.2 }); noise({ t: t + d, dur: 0.03, v: 0.5, type: 'bandpass', f: 1800, q: 2 }); }); },
    hardTEC: t => { for (let i = 0; i < 3; i++) { key(t + i * 0.12, 0.4); thump(t + i * 0.12, 90, 0.2, 0.05); } thump(t + 0.45, 70, 0.9, 0.15); key(t + 0.45, 0.6); },
    hardVEN: t => { phone(t, 0.8); say('FECHADO!', 'char', 0.95); },
    hardOPE: t => { noise({ t, dur: 0.35, v: 0.3, type: 'bandpass', f: 400, to: 1600, q: 2 }); thump(t + 0.38, 120, 0.4, 0.08); noise({ t: t + 0.6, dur: 0.3, v: 0.3, type: 'bandpass', f: 1600, to: 400, q: 2 }); thump(t + 0.92, 90, 0.7, 0.15); },
    soft: t => say('papo reto, fechado.', 'char', 0, { rate: 1.2, pitch: 0.9 }),
    fraqueza: t => { thump(t, 55, 1, 0.45); thump(t, 55, 0.6, 0.45, echoIn); noise({ t, dur: 0.2, v: 0.5, type: 'lowpass', f: 400 }); },
    resistencia: t => { noise({ t, dur: 0.08, v: 0.25, type: 'lowpass', f: 350 }); tone({ f: 200, type: 'sine', t, dur: 0.05, v: 0.15 }); },
    critico: t => { thump(t, 60, 0.9, 0.3); ['C5', 'E5', 'G5', 'B5', 'D6'].forEach((n, i) => { tone({ f: nf(n), type: 'pulse25', t: t + i * 0.04, dur: 0.6, v: 0.1 }); tone({ f: nf(n), type: 'triangle', t: t + i * 0.04, dur: 0.8, v: 0.12 }); }); for (let i = 0; i < 6; i++) bell(t + 0.2 + i * 0.05, 3000 + R() * 2000, 0.4, 0.05); say('EU TIVE UMA IDEIA!', 'char', 0.35); },
    diaRuim: t => yawn(t),
    sinergia: t => { ['C5', 'E5', 'G5'].forEach((n, i) => tone({ f: nf(n), type: 'square', t: t + i * 0.12, dur: i === 2 ? 0.4 : 0.12, v: 0.15, filter: { f: 3000 } })); say('TIME!', 'char', 0.45); },
    mentoria: t => { tone({ f: 1300, to: 1900, type: 'sine', t, dur: 0.25, v: 0.18, vib: 0.01 }); tone({ f: 1900, to: 1450, type: 'sine', t: t + 0.27, dur: 0.32, v: 0.18, vib: 0.02 }); },
    retrabalho: t => { tone({ f: 200, to: 1800, type: 'sawtooth', t, dur: 0.9, v: 0.15, vib: 0.15, vibRate: 18, filter: { type: 'bandpass', f: 1500, q: 2 } }); for (let i = 0; i < 12; i++) noise({ t: t + i * 0.07, dur: 0.02, v: 0.08, type: 'highpass', f: 4000 }); },
    sobrecarga: t => { sigh(t, 2, 0.35); tone({ f: 110, to: 70, type: 'sine', t, dur: 2, v: 0.08, a: 0.4, hold: true, bus: 'voice' }); },
    pontoCedo: t => { const f = { type: 'lowpass', f: 1800 }; tone({ f: 350, to: 900, type: 'sawtooth', t, dur: 1.1, v: 0.18, a: 0.2, hold: true, filter: f }); tone({ f: 900, to: 350, type: 'sawtooth', t: t + 1.1, dur: 1.2, v: 0.18, a: 0.01, hold: true, filter: f }); },
    // Desvantagens
    dCarlinhos: t => say('e se der errado?', { pitch: 1.5, rate: 0.75, trem: true }),
    dLuciano: t => { say('ENTREGO AMANHÃ!', { pitch: 1.4, rate: 1.25 }); for (let i = 0; i < 4; i++) tone({ f: i % 2 ? 750 : 1000, type: 'square', t: t + 1.1 + i * 0.12, dur: 0.11, v: 0.12, filter: { f: 3000 } }); },
    dFelipe: t => { const d = lp(450); ['E4', 'G4', 'A4', 'G4', 'E4', 'D4', 'E4', 'G4', 'A4', 'B4', 'A4', 'G4', 'E4', 'D4', 'E4', 'E4'].forEach((n, i) => { tone({ f: nf(n), type: 'square', t: t + i * 0.13, dur: 0.11, v: 0.2, dest: d }); if (i % 2 === 0) tone({ f: 120, to: 45, type: 'sine', t: t + i * 0.13, dur: 0.12, v: 0.4, dest: d }); }); },
    dAnaMaria: t => { tone({ f: 110, to: 60, type: 'sine', t, dur: 0.9, v: 0.6, a: 0.08 }); noise({ t, dur: 0.6, v: 0.3, a: 0.08, type: 'lowpass', f: 300 }); bell(t + 0.5, 520, 1.5, 0.12); },
    dSandy: t => { for (let i = 0; i < 30; i++) { tone({ f: 1800 + R() * 800, type: 'square', t: t + i * 0.045, dur: 0.025, v: 0.08, filter: { f: 3500 } }); noise({ t: t + i * 0.045, dur: 0.03, v: 0.1, type: 'bandpass', f: 3000, q: 4 }); } noise({ t: t + 1.4, dur: 0.35, v: 0.15, type: 'bandpass', f: 600, to: 1500, q: 3 }); },
    dTata: t => { for (let i = 0; i < 14; i++) { noise({ t: t + i * 0.09, dur: 0.012, v: 0.25, type: 'highpass', f: 3000 }); tone({ f: 2000, type: 'square', t: t + i * 0.09, dur: 0.008, v: 0.05 }); } tone({ f: 150, type: 'sawtooth', t: t + 0.6, dur: 1.3, v: 0.25, a: 0.1, hold: true, vib: 0.03, vibRate: 4, filter: { f: 500 }, bus: 'voice' }); },
    dHebe: t => { babble('psiu olha só fofoca do cafezinho', { t, whisper: true, v: 0.35, rate: 1.4 }); say('SABIA QUE...?', { pitch: 1.3, rate: 1.05 }, 1.0); },
    dGil: t => { for (let i = 0; i < 4; i++) { tone({ f: 1046, type: 'sine', t: t + i * 0.35, dur: 0.12, v: 0.2 }); tone({ f: 1568, type: 'sine', t: t + i * 0.35 + 0.08, dur: 0.2, v: 0.2 }); } },
    dJunior: t => { chime(t, ['G5', 'B5', 'D6'], 0.15, 0.18); say('ERA HOJE?!', { pitch: 1.35, rate: 1.2 }, 0.6); },
    dFatima: t => { for (let r = 0; r < 2; r++) ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => tone({ f: nf(n), type: 'triangle', t: t + r * 0.6 + i * 0.1, dur: 0.12, v: 0.2 })); murmur(t + 1.3, 2.2); },
    dFausto: t => say('DEIXA QUE EU FAÇO.', { pitch: 0.85, rate: 1.05 }),
    dIvete: t => { applause(t, 0.9, 0.25, 40); say('foi ideia minha!', { pitch: 1.4, rate: 1.15 }, 0.5); },
    dLuan: t => { [1200, 900, 700, 500, 300, 200].forEach((f, i) => tone({ f, type: 'square', t: t + i * 0.07, dur: 0.06, v: 0.1, filter: { f: 2500 } })); noise({ t: t + 0.4, dur: 0.25, v: 0.15, type: 'bandpass', f: 2000, q: 1 }); say('TÁ ME OUVINDO?', { pitch: 1.1, rate: 1.1 }, 0.8); },
    dGloria: t => { cash(t); cash(t + 0.45); },
    dCaetano: t => say('a ontologia do paradigma sinérgico implica um feedback holístico transversal', 'char', 0, { pitch: 1.1, rate: 2.2 }),
    dAngelica: t => say('Me copia nesse e-mail.', { pitch: 1.25, rate: 1.1 }),
    dPedro: t => { thump(t, 90, 0.7, 0.1); noise({ t, dur: 0.02, v: 0.3, type: 'highpass', f: 2500 }); say('regra é regra.', { pitch: 0.7, rate: 0.9 }, 0.25); },
    dRoberto: t => { snore(t); snore(t + 2); say('TÔ DE FOLGA.', { pitch: 0.9, rate: 1 }, 4); },
    dMarilia: t => { crumple(t); say('vou refazer.', { pitch: 1.15, rate: 0.95 }, 0.9); },
    dGugu: t => { say('só um minutinho...', { pitch: 1, rate: 0.85 }); door(t + 1.4); },
    // Eventos do mês
    eFeriado: t => { music('pagode'); say('SEXTOU!', 'char', 1.2); },
    eCafe: t => { for (let i = 0; i < 26; i++) { const f = 200 + R() * 300; tone({ f, to: f * 1.6, type: 'sine', t: t + R() * 1.6, dur: 0.05, v: 0.15 }); } noise({ t, dur: 1.8, v: 0.05, type: 'highpass', f: 3000, a: 0.3, hold: true }); say('OLHA O CAFÉ!', 'char', 1.4); },
    eGripe: t => { for (let i = 0; i < 4; i++) { const tt = t + i * 0.22 + R() * 0.1; babble('aaa', { t: tt, pitch: 0.9 + i * 0.25, rate: 0.6, v: 0.3 }); noise({ t: tt + 0.45, dur: 0.15, v: 0.45, type: 'highpass', f: 2500 }); } },
    eCorte: t => { [0, 0.25].forEach(d => { noise({ t: t + d, dur: 0.04, v: 0.4, type: 'highpass', f: 4000 }); tone({ f: 3000, type: 'square', t: t + d, dur: 0.02, v: 0.08 }); }); for (let i = 0; i < 4; i++) sigh(t + 0.6 + i * 0.1, 1.3, 0.12); },
    eElogio: t => { tone({ f: 880, type: 'sine', t, dur: 0.15, v: 0.2 }); tone({ f: 1320, type: 'sine', t: t + 0.12, dur: 0.3, v: 0.2 }); say('UHUUU!', 'char', 0.5); },
    eVerba: t => { ['G4', 'C5', 'E5', 'G5'].forEach((n, i) => INST.brass(t + i * 0.1, nf(n), i === 3 ? 0.6 : 0.12, 0.35, out())); for (let i = 0; i < 6; i++) INST.snare(t + i * 0.05, 0, 0, 0.12, out()); },
    ePromocao: t => { const mega = shaper(8, lp(3000)); const bp = bq('bandpass', 1500, 2); bp.connect(mega); bp.connect(echoIn); babble('atenção atenção promoção imperdível no mercado de talentos só hoje', { t, pitch: 1.1, rate: 1.7, v: 0.6, dest: bp }); },
    eTranquilo: t => { noise({ t, dur: 3, v: 0.12, a: 0.4, hold: true, type: 'lowpass', f: 250 }); tone({ f: 60, type: 'sine', t, dur: 3, v: 0.05, a: 0.4, hold: true }); for (let g = 0; g < 3; g++) for (let i = 0; i < 3; i++) tone({ f: 3000, to: 4200, type: 'sine', t: t + 0.6 + g * 0.8 + i * 0.1, dur: 0.07, v: 0.08 }); },
    // Entrada dos chefes
    bOsvaldo: t => { for (let i = 0; i < 4; i++) { noise({ t: t + i * 0.6, dur: 0.06, v: 0.4, type: 'lowpass', f: 900 }); tone({ f: 90, type: 'sine', t: t + i * 0.6, dur: 0.08, v: 0.4 }); } say('Quero 40% a mais. Com o mesmo time.', 'boss', 2.6, { rate: 0.85 }); },
    bPonto: t => { for (let i = 0; i < 4; i++) { tone({ f: 880, type: 'square', t: t + i * 0.5, dur: 0.08, v: 0.13, filter: { f: 3000 } }); tone({ f: 440, type: 'square', t: t + i * 0.5 + 0.1, dur: 0.18, v: 0.13, filter: { f: 2000 } }); } },
    bClotilde: t => { penScratch(t, 1.5); sigh(t + 1.6, 1.8, 0.3); },
    bLeao: t => { tone({ f: 90, to: 70, type: 'sawtooth', t, dur: 1.3, v: 0.35, a: 0.15, vib: 0.08, vibRate: 25, filter: { type: 'bandpass', f: 600, q: 1.5 } }); noise({ t, dur: 1.3, v: 0.3, a: 0.3, type: 'lowpass', f: 900 }); S.carimbo(t + 1.3); },
    bCliente: t => say('QUERO FALAR COM O GERENTE!', 'boss', 0, { pitch: 1.7, rate: 1.2 }),
    bConselho: t => { [['nós precisamos de sinergia agora', 110], ['isso nunca foi aprovado no comitê', 165], ['mas o orçamento do trimestre diz outra coisa', 230]].forEach(([tx, b], i) => { say(tx, 'boss', i * 0.25, { pitch: b / 95, rate: 1.15, v: 0.7 }); say(tx, 'boss', 1.4 + i * 0.2, { pitch: b * 1.1 / 95, rate: 1.35, v: 0.8 }); }); },
    bExcel: t => { ['C4', 'E4', 'G4', 'C5'].forEach((n, i) => INST.organ(t + i * 0.18, nf(n), 0.5, 0.4, out())); tone({ f: 2800, to: 3400, type: 'sine', t: t + 0.9, dur: 2, v: 0.04, a: 0.5, hold: true }); noise({ t: t + 0.9, dur: 2, v: 0.08, a: 0.5, hold: true, type: 'lowpass', f: 300 }); for (let i = 0; i < 7; i++) INST.organ(t + 2.9 + i * 0.07, nf('C5'), 0.06, 0.4, out()); },
    bValdemar: t => { thump(t, 70, 1, 0.35); noise({ t, dur: 0.12, v: 0.5, type: 'bandpass', f: 1500, q: 1 }); for (let i = 0; i < 4; i++) noise({ t: t + 0.12 + i * 0.05, dur: 0.03, v: 0.1, type: 'bandpass', f: 2500, q: 3 }); },
    bAuditor: t => penScratch(t + 0.5, 3, 0.05),
    bPendrive: t => { tone({ f: 600, type: 'triangle', t, dur: 0.12, v: 0.25 }); tone({ f: 900, type: 'triangle', t: t + 0.13, dur: 0.2, v: 0.25 }); say('HA HA HA HA HA!', 'obj:pendrive', 0.5); },
    bImpressora: t => { for (let i = 0; i < 6; i++) { tone({ f: 90, type: 'sawtooth', t: t + i * 0.22, dur: 0.15, v: 0.25, filter: { f: 400 } }); noise({ t: t + i * 0.22, dur: 0.12, v: 0.15, type: 'bandpass', f: 800, q: 5 }); } noise({ t: t + 1.4, dur: 0.4, v: 0.3, type: 'bandpass', f: 500, q: 8 }); say('CIANO VAZIO.', 'obj:impressora', 1.9); },
    bCEO: t => { bell(t, 1318, 1.5, 0.22); bell(t + 0.45, 1046, 1.8, 0.2); noise({ t: t + 0.9, dur: 1.2, v: 0.12, a: 0.3, type: 'lowpass', f: 300, to: 1200 }); [3.4, 3.65].forEach(d => { noise({ t: t + d, dur: 0.12, v: 0.4, type: 'bandpass', f: 600, q: 1, bus: 'voice' }); tone({ f: 150, type: 'sawtooth', t: t + d, dur: 0.08, v: 0.08, filter: { f: 600 }, bus: 'voice' }); }); },
  };
  function sfx(id) { if (!init() || !S[id]) return; try { S[id](now() + 0.03); } catch (e) { console.warn('sfx', id, e); } }

  /* ---------- AMBIENTE do escritório ---------- */
  let ambOn = false, ambTimer = null, bed = null;
  function ambient(on) {
    if (!init() || on === ambOn) return;
    ambOn = on;
    if (on) {
      bed = noiseSrc(now(), 3600);
      const f = bq('lowpass', 420, 0.7), g = ctx.createGain(); g.gain.value = 0.05;
      bed.connect(f); f.connect(g); g.connect(ambBus);
      const loop = () => { ambEvent(); ambTimer = setTimeout(loop, 1500 + R() * 2500); };
      loop();
    } else { clearTimeout(ambTimer); try { bed.stop(); } catch (e) { } bed = null; }
  }
  function ambEvent(force) {
    const t = now() + 0.05, r = force ? 1 : R();
    if (r < 0.4) typing(t, 8 + (R() * 14 | 0), 1 + R(), 0.12, ambBus);
    else if (r < 0.55) { phone(t, 0.8, 0.07, ambBus); phone(t + 1.4, 0.8, 0.07, ambBus); }
    else if (r < 0.7) { for (let i = 0; i < 3; i++) { noise({ t: t + i * 0.9, dur: 0.7, v: 0.1, type: 'bandpass', f: 500, to: 1400, q: 2, dest: ambBus }); thump(t + i * 0.9 + 0.7, 100, 0.1, 0.06, ambBus); } }
    else if (r < 0.97) murmur(t, 2, 0.08, ambBus);
    else say('QUEM PEGOU MEU GRAMPEADOR?', 'char', 0, { pitch: 0.9, v: 0.6 });
  }

  return {
    init, music, stopMusic, setWeek, sfx, say, babble, ambient, ambEvent: () => { init() && ambEvent(true); },
    setVol(b, v) { vol[b] = v; applyVol(); },
    getVol: () => ({ ...vol }),
    setMuted(m) { muted = m; applyVol(); },
    isMuted: () => muted,
    onSay(fn) { onSay = fn; }, onMusic(fn) { onMusic = fn; },
    songs: SONGS, hasSfx: id => !!S[id],
  };
})();

