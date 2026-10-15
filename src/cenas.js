/* =========================================================================
   MÓDULO CUTSCENES — cenas animadas em pixel art 16 bits a 12 quadros/s
   abertura (céu → loja) · menu (fundo animado) · vitória (bar) · derrota (diretoria)
   ========================================================================= */
const Cenas16 = (() => {
  const A = Arte, FPS = 12, D = '#1a1a2e';
  const rampa = c => [A.shade(c, -0.62), A.shade(c, -0.38), A.shade(c, -0.12), A.shade(c, 0.2), A.shade(c, 0.48)];
  const novoCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
  const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const BY = A.BY;
  function grad(g, x, y, w, h, cores) { const n = cores.length - 1; for (let j = 0; j < h; j++) { const v = j / h * n; for (let i = 0; i < w; i++) { let k = Math.floor(v); if (v - k > BY[(y + j) & 1][(x + i) & 1]) k++; g.fillStyle = cores[Math.min(n, k)]; g.fillRect(x + i, y + j, 1, 1); } } }
  function suave(g, cx, cy, r, cor, a = 0.3) { g.save(); g.fillStyle = cor; for (let i = 0; i < 6; i++) { g.globalAlpha = a / 6; g.beginPath(); g.arc(cx, cy, r * (1 - i / 6), 0, 6.283); g.fill(); } g.restore(); }
  function brilho(g, cx, cy, r, cor, forca = 0.5) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.sqrt(x * x + y * y) / r; if (d > 1) continue; if ((1 - d) * forca > BY[(cy + y) & 1][(cx + x) & 1]) { g.fillStyle = cor; g.fillRect(cx + x, cy + y, 1, 1); } } }

  /* ---------- PESSOA 16 bits (40x56), de frente ---------- */
  // p: { bE:[x,y], bD:[x,y] mãos; boca:'riso'|'sorriso'|'triste'|'reta'; olhos:'abertos'|'feliz'|'baixo'|'fechados'; pernas:null|0|1|2; caixa:bool }
  const cacheP = {};
  function pessoa(id, p = {}) {
    const k = id + JSON.stringify(p); if (cacheP[k]) return cacheP[k];
    const l = A.LOOKS[id], b = A.Bf(40, 56), pele = rampa(A.PELES[l.pele][0]), roupa = rampa(l.roupa), cab = rampa(l.cc);
    const calca = rampa(l.roupa === '#f0f0f0' || l.roupa === '#fafafa' ? '#3a3a50' : A.shade(l.roupa, -0.45));
    const e = l.cab;
    // cabelo de trás
    if (e === 'afro') A.ell(b, 20, 7, 12, 10, cab);
    if (e === 'volume') A.ell(b, 20, 6, 11, 8, cab);
    if (e === 'cacheado') for (const [x, y] of [[12, 6], [28, 6], [11, 12], [29, 12], [20, 2], [14, 2], [26, 2]]) A.ell(b, x, y, 4, 4, cab);
    if (['longo', 'franja'].includes(e)) { A.cyl(b, 11, 6, 5, 20, cab, -1); A.cyl(b, 24, 6, 5, 20, cab, -1); }
    if (e === 'chanel') { A.cyl(b, 11, 6, 5, 12, cab, -1); A.cyl(b, 24, 6, 5, 12, cab, -1); }
    if (e === 'rabo') A.ell(b, 29, 11, 2.5, 6, cab, -1);
    // pernas
    if (p.pernas != null) {
      const o = p.pernas === 1 ? 2 : p.pernas === 2 ? -2 : 0;
      A.cyl(b, 14 + o, 34, 5, 17, calca); A.cyl(b, 21 - o, 34, 5, 17, calca, -1);
      A.ell(b, 16 + o, 52, 4, 2.2, rampa('#2a2028')); A.ell(b, 24 - o, 52, 4, 2.2, rampa('#2a2028'), -1);
    }
    // tronco
    A.cyl(b, 11, 21, 18, 16, roupa); A.ell(b, 20, 23, 10, 4, roupa);
    A.poly(b, [[17, 19], [23, 19], [20, 25]], rampa('#f4f4f4'));
    if (l.gravata) A.poly(b, [[19, 21], [21, 21], [22, 31], [20, 33], [18, 31]], rampa(l.gravata));
    if (l.acc === 'colar') for (let x = 16; x <= 24; x++) A.st(b, x, 22 + Math.round(Math.abs(20 - x) * 0.3), '#ffd23a');
    // braços (ombro → mão)
    const braco = (sx, sy, [ex, ey], lado) => {
      const n = Math.max(1, Math.round(Math.hypot(ex - sx, ey - sy)));
      for (let i = 0; i <= n; i++) A.ell(b, sx + (ex - sx) * i / n, sy + (ey - sy) * i / n, 2.6, 2.6, roupa, lado);
      A.ell(b, ex, ey, 2.4, 2.4, pele, lado);
    };
    if (p.caixa) {
      A.box(b, 9, 27, 22, 12, rampa('#c89a5a'), 0, 0); A.rect(b, 9, 30, 22, 1, A.shade('#c89a5a', -0.4));
      A.ell(b, 13, 25, 2.5, 3, rampa('#2fbf71')); A.ell(b, 16, 23, 2, 3, rampa('#2fbf71')); A.box(b, 22, 23, 5, 5, rampa('#ffffff'), 0, 0);
      A.ell(b, 9, 33, 2.4, 2.4, pele); A.ell(b, 31, 33, 2.4, 2.4, pele, -1);
    } else {
      braco(12, 23, p.bE || [10, 34], 0); braco(28, 23, p.bD || [30, 34], -1);
    }
    // pescoço e cabeça
    A.cyl(b, 17, 15, 6, 6, pele, -1);
    A.ell(b, 13, 11, 1.6, 2.2, pele); A.ell(b, 27, 11, 1.6, 2.2, pele, -1);
    A.ell(b, 20, 10, 7, 8, pele);
    // cabelo da frente
    const H = (cx, cy, rx, ry, bias) => A.ell(b, cx, cy, rx, ry, cab, bias);
    switch (e) {
      case 'curto': case 'penteado': case 'espetado': case 'baguncado': case 'rabo': H(20, 4, 7.5, 4); H(13.5, 7, 1.5, 3); H(26.5, 7, 1.5, 3, -1); break;
      case 'topete': H(20, 4, 7.5, 4); H(19, 1, 5, 2.5); break;
      case 'coque': H(20, 4, 7.5, 3.5); H(20, -0.5, 3.5, 3); break;
      case 'longo': H(20, 4, 8, 4.5); break;
      case 'franja': case 'chanel': H(20, 4, 8.5, 4.5); A.rect(b, 13, 6, 14, 2, cab[2]); break;
      case 'cacheado': case 'volume': H(20, 3, 8, 4); break;
      case 'afro': H(20, 2, 9, 4); break;
      case 'raspado': A.ell(b, 20, 4, 7, 3, rampa(A.shade(l.cc, 0.2))); break;
      case 'careca': H(13, 9, 1.6, 3); H(27, 9, 1.6, 3, -1); break;
      case 'ralo': H(13, 9, 1.6, 3); H(27, 9, 1.6, 3, -1); break;
    }
    A.outl(b);
    if (e === 'espetado' || e === 'baguncado') A.px(b, [[15, 0], [18, -0], [21, 0], [24, 1]], cab[2]);
    if (e === 'penteado') A.rect(b, 17, 1, 1, 4, cab[0]);
    if (e === 'careca') { A.st(b, 18, 3, '#ffffff'); A.st(b, 19, 3, '#ffffff'); }
    if (e === 'ralo') A.px(b, [[16, 3], [19, 2], [22, 3]], cab[2]);
    // rosto
    const olhos = p.olhos || 'abertos';
    if (olhos === 'feliz') { A.px(b, [[16, 10], [17, 9], [18, 10], [22, 10], [23, 9], [24, 10]], D); }
    else if (olhos === 'fechados') { A.rect(b, 16, 10, 3, 1, D); A.rect(b, 22, 10, 3, 1, D); }
    else if (olhos === 'baixo') { A.rect(b, 16, 11, 2, 1, D); A.rect(b, 23, 11, 2, 1, D); A.rect(b, 15, 8, 3, 1, A.shade(l.cc, -0.2)); A.rect(b, 23, 8, 3, 1, A.shade(l.cc, -0.2)); }
    else { A.rect(b, 16, 9, 2, 2, D); A.rect(b, 23, 9, 2, 2, D); A.st(b, 16, 9, '#ffffff'); A.st(b, 23, 9, '#ffffff'); }
    if (l.oculos) { A.rect(b, 15, 8, 4, 1, '#2a2a3a'); A.rect(b, 22, 8, 4, 1, '#2a2a3a'); A.rect(b, 15, 11, 4, 1, '#2a2a3a'); A.rect(b, 22, 11, 4, 1, '#2a2a3a'); A.rect(b, 19, 9, 3, 1, '#2a2a3a'); }
    const boca = p.boca || 'sorriso', M = '#6a1a1a';
    if (boca === 'riso') { A.ell(b, 20, 14.5, 2.6, 1.8, rampa('#3a0a10')); A.rect(b, 18, 13, 5, 1, '#ffffff'); }
    else if (boca === 'triste') { A.rect(b, 18, 14, 5, 1, M); A.st(b, 17, 15, M); A.st(b, 23, 15, M); }
    else if (boca === 'reta') A.rect(b, 18, 14, 5, 1, M);
    else { A.st(b, 17, 13, M); A.rect(b, 18, 14, 5, 1, M); A.st(b, 23, 13, M); }
    if (l.barba === 'bigode') A.rect(b, 17, 12, 7, 1, l.cc);
    if (l.barba === 'curta') { A.rect(b, 14, 13, 2, 3, l.cc); A.rect(b, 25, 13, 2, 3, l.cc); A.rect(b, 16, 16, 9, 1, l.cc); }
    if (l.acc === 'fone') { A.rect(b, 12, 8, 2, 6, '#e63946'); A.rect(b, 27, 8, 2, 6, '#e63946'); A.rect(b, 14, 1, 13, 1, '#30303a'); }
    if (l.acc === 'brinco') { A.st(b, 12, 14, '#ffd23a'); A.st(b, 28, 14, '#ffd23a'); }
    if (p.boca !== 'triste' && (p.olhos === 'feliz')) { A.rect(b, 15, 12, 2, 1, '#ff9a9a'); A.rect(b, 24, 12, 2, 1, '#ff9a9a'); }
    return (cacheP[k] = A.toCanvas(b));
  }

  /* ---------- objetos 16 bits ---------- */
  const cacheO = {};
  function obj(nome, fn, w, h) { if (cacheO[nome]) return cacheO[nome]; const b = A.Bf(w, h); fn(b); return (cacheO[nome] = A.toCanvas(b)); }
  const chope = () => obj('chope', b => { A.box(b, 1, 3, 7, 10, rampa('#f0b030'), 0, 0); A.ell(b, 4.5, 3, 4, 2.5, rampa('#ffffff')); A.rect(b, 8, 5, 2, 1, '#e0e8f0'); A.rect(b, 9, 5, 1, 5, '#e0e8f0'); A.rect(b, 8, 9, 2, 1, '#e0e8f0'); A.outl(b, D); A.rect(b, 2, 6, 1, 5, '#fff0a0'); }, 11, 14);
  const pacote = () => obj('pacote', b => { for (let i = 0; i < 4; i++) A.box(b, 1 + (i % 2), 9 - i * 3, 16, 4, rampa('#3aa860'), 0, 0); A.rect(b, 7, 0, 4, 13, '#e8f0d0'); A.outl(b, D); A.px(b, [[3, 4], [13, 7]], '#a8f0b0'); }, 19, 14);
  const cinzeiro = () => obj('cinzeiro', b => { A.ell(b, 7, 4, 7, 3, rampa('#8090a0')); A.ell(b, 7, 3.5, 4.5, 1.6, rampa('#40404a')); A.rect(b, 9, 1, 6, 1, '#f0f0f0'); A.st(b, 15, 1, '#ff6a20'); A.outl(b, D); }, 16, 8);
  const moedas = () => obj('moedas', b => { for (let i = 0; i < 5; i++) A.ell(b, 3 + i * 2.6, 3 + (i % 2), 2.6, 1.6, rampa('#f8c030')); A.outl(b, D); }, 18, 7);
  const nota = (f) => obj('nota' + f, b => { A.rect(b, 0, 0, f ? 7 : 4, 4, '#3aa860'); A.rect(b, 1, 1, f ? 5 : 2, 2, '#7ad890'); A.st(b, f ? 3 : 1, 1, '#1a6a30'); }, 7, 4);

  /* ---------- fundo da loja (menu e fim da abertura) 320x180 ---------- */
  let lojaFundo = null, lojaCeu = null, lojaFrente = null, caminhao = null, nuvens = null;
  function prepararLoja() {
    if (lojaFundo) return;
    const [cc, gc] = novoCanvas(320, 180); lojaCeu = cc;
    let g = gc;
    grad(g, 0, 0, 320, 120, ['#3a2470', '#6a3a8a', '#b04a7a', '#e0707a', '#ffa060', '#ffd080']);
    for (const [cor, base, alt] of [['#5a3a7a', 116, 44], ['#3e2a60', 122, 30]]) {
      for (let x = 0; x < 320;) { const w = 14 + ((x * 7) % 18), h = alt + ((x * 13) % 26); R(g, x, base - h, w, h, cor); for (let y = base - h + 3; y < base - 2; y += 5) for (let xx = x + 2; xx < x + w - 2; xx += 4) if (((xx * 3 + y) % 7) < 2) R(g, xx, y, 2, 2, '#ffd070'); x += w + 1; }
    }
    // prédio da loja (camada da frente, com transparência)
    const [cf, gf] = novoCanvas(320, 180); lojaFrente = cf; g = gf;
    for (let y = 46; y < 150; y++) for (let x = 36; x < 284; x++) {
      const linha = Math.floor((y - 46) / 5), off = (linha % 2) * 6, mx = (x - 36 + off) % 12, my = (y - 46) % 5;
      let cor = (mx === 0 || my === 0) ? '#e0a880' : ((x * 7 + linha * 13) % 9 === 0 ? '#9a4a2a' : '#b8603a');
      if (my === 1 && mx > 0 && cor === '#b8603a') cor = '#c87048';
      if (x > 268 || (x > 260 && BY[y & 1][x & 1] > 0.4)) cor = A.shade(cor, -0.25);
      g.fillStyle = cor; g.fillRect(x, y, 1, 1);
    }
    const b = A.Bf(320, 180);
    A.box(b, 30, 40, 260, 8, rampa('#a05a3a'), 0, 0); A.box(b, 32, 147, 256, 4, rampa('#8a8aa0'), 0, 0);
    A.box(b, 70, 14, 180, 30, rampa('#c82030'), 0, 2);
    // toldo listrado
    for (let x = 40; x < 280; x++) { const fx = Math.floor((x - 40) / 10) % 2, cor = fx ? '#f4f4f4' : '#e63946'; for (let y = 84; y < 96; y++) { const sombra = (y - 84) / 12; A.st(b, x, y, sombra > 0.75 ? A.shade(cor, -0.35) : sombra > 0.4 && BY[y & 1][x & 1] > 0.5 ? A.shade(cor, -0.15) : cor); } if ((x - 40) % 10 < 5) A.st(b, x, 96, fx ? '#d0d0d0' : '#a01828'); }
    // vitrines
    for (const x0 of [48, 200]) {
      A.box(b, x0, 100, 72, 44, rampa('#3a5a8a'), 0, 0);
      for (let i = 0; i < 6; i++) A.box(b, x0 + 6 + i * 11, 124 - (i % 3) * 4, 8, 16 + (i % 3) * 4, rampa(['#e63946', '#2a78c0', '#ffd23a', '#2fbf71', '#a070d8', '#ff8c32'][i]), 0, 0);
      A.box(b, x0 + 4, 138, 64, 4, rampa('#a86028'), 0, 0);
    }
    // porta
    A.box(b, 140, 98, 40, 50, rampa('#7a4018'), 0, 0); A.box(b, 145, 104, 30, 22, rampa('#5a9ad0'), 0, 0); A.box(b, 150, 128, 20, 6, rampa('#ffd166'), 0, 0);
    // poste
    A.cyl(b, 298, 70, 4, 82, rampa('#4a5260')); A.box(b, 292, 64, 16, 7, rampa('#4a5260'), 0, 1);
    A.outl(b);
    g.drawImage(A.toCanvas(b), 0, 0);
    A.texto(g, 'BOA FOLHA', 92, 20, '#1a1a2e', 4); A.texto(g, 'BOA FOLHA', 91, 19, '#ffd166', 4);
    A.texto(g, 'ABERTO', 149, 129, '#a01828');
    for (let i = 0; i < 2; i++) { const x0 = [48, 200][i]; for (let k = 0; k < 6; k++) R(g, x0 + 8 + k * 12, 101 + k, 6, 1, 'rgba(255,255,255,0.45)'); }
    // calçada e rua
    for (let x = 0; x < 320; x += 16) { R(g, x, 151, 16, 8, (x / 16) % 2 ? '#a8a8b8' : '#b8b8c8'); R(g, x, 151, 16, 1, '#d0d0dc'); }
    grad(g, 0, 159, 320, 21, ['#4a4a5a', '#3a3a48', '#2e2e3a']);
    for (let x = 4; x < 320; x += 28) R(g, x, 169, 14, 2, '#ffe080');
    const [c, gt] = novoCanvas(320, 180); lojaFundo = c; gt.drawImage(cc, 0, 0); gt.drawImage(cf, 0, 0);
    // caminhão
    const t = A.Bf(96, 44);
    A.box(t, 2, 2, 62, 30, rampa('#f4f4f4'), 0, 2); A.box(t, 2, 6, 62, 5, rampa('#2a78c0'), 0, 0);
    A.box(t, 64, 12, 28, 20, rampa('#e63946'), 0, 3); A.box(t, 72, 15, 16, 9, rampa('#a8dcff'), 0, 1); A.rect(t, 90, 26, 4, 3, '#ffe060');
    A.box(t, 0, 31, 94, 4, rampa('#3a3a48'), 0, 0);
    for (const x of [16, 46, 78]) { A.ell(t, x, 36, 6.5, 6.5, rampa('#202028')); A.ell(t, x, 36, 2.6, 2.6, rampa('#a0a8b8')); }
    A.outl(t); caminhao = A.toCanvas(t);
    A.texto(caminhao.getContext('2d'), 'PAPEL', 14, 15, '#2a78c0', 2);
    // nuvens
    nuvens = [0, 1, 2].map(i => { const n = A.Bf(60, 22), r = ['#a07ab0', '#d0a0c8', '#f4c8d8', '#ffe4ec', '#fff4f8']; [[14, 14, 12, 7], [28, 10, 14, 9], [44, 14, 12, 7], [30, 16, 22, 6]].forEach(([x, y, rx, ry]) => A.ell(n, x + i * 2, y, rx - i, ry - i * 0.5, r)); return A.toCanvas(n); });
  }
  function desenharLoja(g, f, semFundo) {
    prepararLoja();
    g.drawImage(lojaCeu, 0, 0);
    // sol pulsando + nuvens (atrás do prédio)
    const pulso = 0.35 + 0.15 * Math.sin(f / 5);
    brilho(g, 300, 30, 18, '#ffe8a0', pulso); brilho(g, 300, 30, 8, '#fff6d0', 1);
    nuvens.forEach((n, i) => { const x = ((f * (0.6 + i * 0.35) + i * 130) % 420) - 70; g.drawImage(n, Math.round(x), 4 + i * 20); });
    g.drawImage(lojaFrente, 0, 0);
    // lâmpadas do letreiro em sequência
    for (let i = 0; i < 22; i++) { const on = (i + f) % 4 === 0; const x = 72 + i * 8; R(g, x, 13, 3, 2, on ? '#fff6a0' : '#a06020'); R(g, x, 44, 3, 2, (i + f + 2) % 4 === 0 ? '#fff6a0' : '#a06020'); }
    // luz do poste
    if ((f >> 3) % 9 !== 0) brilho(g, 300, 72, 12, '#fff0a0', 0.45);
    // janelas da cidade piscando
    for (let i = 0; i < 6; i++) { const x = (i * 53 + 11) % 320, y = 84 + (i * 7) % 20; if (x > 30 && x < 290) continue; R(g, x, y, 2, 2, (f + i * 5) % 30 < 15 ? '#ffd070' : '#5a3a7a'); }
    // pedestre passando na calçada
    const px = ((f * 2) % 420) - 40, ids = Object.keys(A.LOOKS), pid = ids[Math.floor(f / 210) % ids.length];
    let ped = A.corpoCanvas(pid, Math.floor(f / 3) % 2); g.drawImage(ped, Math.round(px), 128, 16, 24);
    // caminhão ligado
    const vib = f % 2; g.drawImage(caminhao, 4, 116 + vib);
    for (let i = 0; i < 3; i++) { const k = (f + i * 4) % 12; g.globalAlpha = 1 - k / 12; R(g, 0 - k, 145 - k * 0.6, 2 + (k >> 2), 2 + (k >> 2), '#c0c0d0'); g.globalAlpha = 1; }
  }

  /* ---------- ABERTURA: do céu até a loja (6 s) ---------- */
  let ceu = null;
  function prepararCeu() {
    if (ceu) return; prepararLoja();
    const [c, g] = novoCanvas(320, 720); ceu = c;
    grad(g, 0, 0, 320, 600, ['#06041a', '#0e0a30', '#1a1450', '#2a1c64', '#3a2470', '#5a2e80', '#8a3e86', '#c05a80', '#e0707a', '#ffa060', '#ffd080']);
    for (let i = 0; i < 90; i++) { const x = (i * 97) % 320, y = (i * 53) % 260; R(g, x, y, 1, 1, i % 7 ? '#c8c8ff' : '#ffffff'); }
    g.drawImage(lojaFundo, 0, 540);
  }
  function abertura(g, f) {
    prepararCeu();
    const p = Math.min(1, f / 54), ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2, cam = Math.round(ease * 540);
    g.drawImage(ceu, 0, -cam);
    // estrelas piscando
    for (let i = 0; i < 12; i++) { const x = (i * 71) % 320, y = (i * 37) % 240 - cam; if (y > -2 && (f + i) % 6 < 3) R(g, x, y, 2, 1, '#ffffff'); }
    // nuvens em camadas (paralaxe)
    for (let i = 0; i < 9; i++) { const wy = 120 + i * 45, y = wy - cam * (0.75 + (i % 3) * 0.15), x = ((i * 113 + f * (1 + i % 3)) % 440) - 80; if (y > -30 && y < 190) g.drawImage(nuvens[i % 3], Math.round(x), Math.round(y)); }
    // avião de papel
    const ax = -20 + f * 7, ay = 330 - cam - Math.sin(f / 4) * 6;
    if (ay > -10 && ay < 190) { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + 14, ay + 4); g.lineTo(ax, ay + 7); g.lineTo(ax + 4, ay + 4); g.fill(); R(g, ax + 4, ay + 4, 9, 1, '#b0b8d0'); }
    // pássaros
    for (let i = 0; i < 4; i++) { const bx = 340 - f * 3 - i * 14, by = 450 - cam + (i % 2) * 6, asa = (f + i) % 4 < 2; if (by > 0 && by < 180) { R(g, bx, by, 2, 1, D); R(g, bx + 2, by + (asa ? -1 : 1), 2, 1, D); R(g, bx - 2, by + (asa ? -1 : 1), 2, 1, D); } }
    if (cam >= 540) desenharLoja(g, f);
    // letreiro acendendo
    if (f >= 56 && f < 64 && f % 2) { g.fillStyle = 'rgba(10,6,24,0.55)'; g.fillRect(70, 14 + 540 - cam, 180, 30); }
    if (f >= 66) { g.fillStyle = `rgba(255,255,255,${Math.max(0, 1 - (f - 66) / 6)})`; g.fillRect(0, 0, 320, 180); }
  }

  const cacheV = {};
  function vinheta(cx, cy, ini, forca, cor) {
    const k = [cx, cy, ini, forca, cor].join(); if (cacheV[k]) return cacheV[k];
    const [c, g] = novoCanvas(320, 180); g.fillStyle = cor;
    for (let y = 0; y < 180; y++) for (let x = 0; x < 320; x++) { const dx = (x - cx) / cx, dy = (y - cy) / cy, d = dx * dx + dy * dy; if (d > ini && (d - ini) * forca > BY[y & 1][x & 1]) g.fillRect(x, y, 1, 1); }
    return (cacheV[k] = c);
  }
  /* ---------- PESSOA REALISTA 16 bits (28x68), tons escuros + luz de contorno ---------- */
  const escura = c => [A.shade(c, -0.8), A.shade(c, -0.62), A.shade(c, -0.42), A.shade(c, -0.18), A.shade(c, 0.1)];
  const img2 = (g, im, x, y) => g.drawImage(im, Math.round(x), Math.round(y), im.width * 2, im.height * 2);
  function luzContorno(b, cor, lado) {
    const o = b.c.slice(), [dx, dy] = { dir: [1, 0], esq: [-1, 0], cima: [0, -1] }[lado];
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const i = y * b.w + x; if (!b.c[i]) continue;
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= b.w || Y >= b.h || !b.c[Y * b.w + X]) o[i] = cor;
    }
    b.c = o;
  }
  const cacheA = {};
  // p: { bE, bD: mãos [x,y]; pernas: 0|1|2; caixa; olhos: 'abertos'|'baixo'|'feliz'; boca: 'riso'|'sorriso'|'triste'; luzes: [[cor, lado]]; sombra: cliente anônimo }
  function pessoaAlta(id, p = {}) {
    const k = id + JSON.stringify(p); if (cacheA[k]) return cacheA[k];
    const l = id ? A.LOOKS[id] : { pele: 1, cab: p.cab || 'curto', cc: '#20202a', roupa: '#30304a' };
    const b = A.Bf(28, 68);
    const tom = c => p.sombra ? escura(A.shade('#3a3050', 0.1)) : escura(c);
    const pele = tom(A.PELES[l.pele][0]), roupa = tom(l.roupa), cab = tom(l.cc);
    const calca = tom(l.roupa === '#f0f0f0' || l.roupa === '#fafafa' ? '#3a3a50' : A.shade(l.roupa, -0.4)), sapato = escura('#2a2028');
    const e = l.cab, H = (cx, cy, rx, ry, bi) => A.ell(b, cx, cy, rx, ry, cab, bi);
    if (['longo', 'franja'].includes(e)) { A.cyl(b, 8, 4, 3, 15, cab); A.cyl(b, 17, 4, 3, 15, cab, -1); }
    if (e === 'chanel') { A.cyl(b, 8, 4, 3, 9, cab); A.cyl(b, 17, 4, 3, 9, cab, -1); }
    if (e === 'afro') H(14, 6, 8, 7);
    if (e === 'volume') H(14, 5, 7, 6);
    if (e === 'cacheado') for (const [x, y] of [[9, 4], [19, 4], [8, 8], [20, 8], [14, 1]]) H(x, y, 3, 3);
    if (e === 'rabo') H(20, 9, 1.6, 4, -1);
    // pernas
    if (p.pernas != null) {
      const o = p.pernas === 1 ? 2 : p.pernas === 2 ? -2 : 0;
      A.cyl(b, 9 + o, 38, 5, 26, calca); A.cyl(b, 15 - o, 38, 5, 26, calca, -1);
      A.ell(b, 11 + o, 65, 3.4, 1.8, sapato); A.ell(b, 17 - o, 65, 3.4, 1.8, sapato, -1);
    }
    // tronco
    A.cyl(b, 8, 35, 12, 5, calca);
    A.cyl(b, 7, 17, 14, 21, roupa); A.ell(b, 14, 18, 8, 2.6, roupa);
    if (!p.sombra) { A.poly(b, [[12, 16], [16, 16], [14, 20]], escura('#f0f0f0')); if (l.gravata) A.rect(b, 13, 18, 2, 10, A.shade(l.gravata, -0.3)); }
    // braços
    const braco = ([sx, sy], [ex, ey], bi) => { const n = Math.max(1, Math.round(Math.hypot(ex - sx, ey - sy))); for (let i = 0; i <= n; i++) A.ell(b, sx + (ex - sx) * i / n, sy + (ey - sy) * i / n, 1.8, 1.8, roupa, bi); A.ell(b, ex, ey, 1.6, 1.6, pele, bi); };
    if (p.caixa) { A.box(b, 4, 28, 20, 11, escura('#c89a5a'), 0, 0); A.ell(b, 8, 26, 2, 3, escura('#2fbf71')); A.ell(b, 4, 33, 1.6, 1.6, pele); A.ell(b, 24, 33, 1.6, 1.6, pele, -1); }
    else { braco([8, 19], p.bE || [6, 37]); braco([20, 19], p.bD || [22, 37], -1); }
    // cabeça
    A.cyl(b, 12, 12, 4, 5, pele, -1);
    A.ell(b, 14, 8, 4.6, 5.4, pele);
    switch (e) {
      case 'curto': case 'penteado': case 'espetado': case 'baguncado': case 'rabo': case 'longo': H(14, 4, 5, 3); H(9.6, 6, 1, 2.4); H(18.4, 6, 1, 2.4, -1); break;
      case 'topete': H(14, 4, 5, 2.8); H(13, 1.8, 3.6, 2); break;
      case 'coque': H(14, 3.6, 5, 2.6); H(14, 0.8, 2.4, 2); break;
      case 'franja': case 'chanel': H(14, 4, 5.6, 3); A.rect(b, 9, 5, 10, 2, cab[2]); break;
      case 'cacheado': case 'volume': H(14, 3, 5.6, 2.6); break;
      case 'afro': H(14, 3, 6, 3); break;
      case 'raspado': A.ell(b, 14, 4, 4.6, 2.2, tom(A.shade(l.cc, 0.25))); break;
      case 'careca': case 'ralo': H(9.6, 7, 1, 2.4); H(18.4, 7, 1, 2.4, -1); break;
    }
    A.outl(b);
    if (!p.sombra) {
      const ol = p.olhos || 'abertos', bo = p.boca || 'sorriso', M = '#3a0a10';
      if (ol === 'feliz') { A.px(b, [[11, 8], [12, 7], [16, 7], [17, 8]], D); }
      else if (ol === 'baixo') { A.rect(b, 11, 9, 2, 1, D); A.rect(b, 16, 9, 2, 1, D); }
      else { A.st(b, 12, 8, D); A.st(b, 16, 8, D); }
      if (l.oculos) A.rect(b, 11, 8, 7, 1, '#1a1a24');
      if (bo === 'riso') { A.rect(b, 13, 11, 3, 2, M); A.rect(b, 13, 11, 3, 1, '#d8d0c8'); }
      else if (bo === 'triste') A.px(b, [[12, 12], [13, 11], [14, 11], [15, 11], [16, 12]], M);
      else A.px(b, [[12, 11], [13, 12], [14, 12], [15, 12], [16, 11]], M);
      if (l.barba) A.rect(b, 12, 10, 5, 1, cab[1]);
    }
    for (const [cor, lado] of (p.luzes || [])) luzContorno(b, cor, lado);
    return (cacheA[k] = A.toCanvas(b));
  }

  /* ---------- VITÓRIA: o time no bar, estilo noturno com neon (5 s) ---------- */
  let barFundo = null, mesaBar = null;
  function prepararBar() {
    if (barFundo) return;
    const [c, g] = novoCanvas(320, 180); barFundo = c;
    // parede de tijolos escura
    for (let y = 0; y < 104; y++) for (let x = 0; x < 320; x++) {
      const li = Math.floor(y / 4), mx = (x + (li % 2) * 5) % 10, my = y % 4;
      g.fillStyle = (mx === 0 || my === 0) ? '#140a18' : ['#26142a', '#2c182e', '#221226', '#301a32'][(Math.floor((x + (li % 2) * 5) / 10) * 7 + li * 3) % 4];
      g.fillRect(x, y, 1, 1);
    }
    R(g, 0, 0, 320, 7, '#0c0610'); for (let x = 0; x < 320; x += 40) R(g, x, 4, 30, 2, '#241a2c');
    // pôster e quadros
    R(g, 10, 26, 28, 30, '#0c080c'); R(g, 12, 28, 24, 26, '#5a2a3a'); R(g, 16, 32, 10, 14, '#c86a4a'); R(g, 18, 44, 14, 4, '#e0b060');
    R(g, 44, 14, 26, 18, '#0c080c'); R(g, 46, 16, 22, 14, '#3a4a6a'); R(g, 50, 20, 6, 6, '#d0d8f0');
    // TV com o gráfico da meta
    R(g, 262, 22, 46, 32, '#08080c'); R(g, 264, 24, 42, 28, '#1a5a3a');
    for (let y = 24; y < 52; y += 2) R(g, 264, y, 42, 1, '#18503a');
    [[268, 46], [274, 42], [280, 44], [286, 36], [292, 32], [298, 27]].forEach(([x, y], i, a) => { if (i) { const [px2, py2] = a[i - 1]; for (let t = 0; t <= 1; t += 0.1) R(g, px2 + (x - px2) * t, py2 + (y - py2) * t, 2, 2, '#90ff90'); } });
    // prateleiras de garrafas
    for (const y of [36, 54, 72]) {
      for (let x = 40; x < 252; x += 4 + ((x * 3) % 3)) {
        const h = 7 + ((x * 7 + y) % 5), cor = ['#5a1a1a', '#1a4a2a', '#6a4a14', '#2a2a5a', '#5a3a1a', '#4a1a3a', '#6a6a6a'][(x * 11 + y) % 7];
        R(g, x, y - h, 3, h, cor); R(g, x + 1, y - h - 2, 1, 2, A.shade(cor, -0.3)); R(g, x, y - h + 1, 1, h - 2, A.shade(cor, 0.35));
      }
      R(g, 36, y, 220, 2, '#3a2010'); R(g, 36, y, 220, 1, '#7a4824');
    }
    // balcão com faixa de neon
    R(g, 0, 82, 320, 4, '#2a160c'); R(g, 0, 82, 320, 1, '#ffb040'); R(g, 0, 83, 320, 1, '#c87020');
    R(g, 0, 86, 320, 18, '#1c0e16'); for (let x = 0; x < 320; x += 26) R(g, x, 86, 1, 18, '#120810');
    R(g, 0, 102, 320, 2, '#ff8a30');
    // piso estampado
    for (let y = 104; y < 180; y += 3) for (let x = (y % 2) * 3; x < 320; x += 6) {
      const k = (x * 13 + y * 7) % 11;
      R(g, x, y, 6, 3, ['#24142e', '#2c163a', '#341a42', '#20183a', '#3a1a3a', '#1c1430', '#2a1a48', '#3a1e30', '#24183e', '#30183a', '#1e1028'][k]);
    }
    for (let y = 104; y < 118; y++) for (let x = 0; x < 320; x++) if ((118 - y) / 14 * 0.6 > BY[y & 1][x & 1]) R(g, x, y, 1, 1, '#6a2a20');
    // banquetas no balcão
    for (const x of [22, 58, 252, 290]) { R(g, x - 7, 104, 14, 3, '#4a1c20'); R(g, x - 7, 104, 14, 1, '#8a3a30'); R(g, x - 1, 107, 2, 22, '#2a1a20'); R(g, x - 5, 128, 10, 1, '#2a1a20'); }
    // mesa alta (bistrô) em primeiro plano
    const m = A.Bf(320, 180);
    A.cyl(m, 156, 136, 8, 34, escura('#5a3018')); A.ell(m, 160, 171, 18, 4, escura('#3a2018'));
    A.ell(m, 160, 135, 46, 10, escura('#7a4220')); A.ell(m, 160, 133, 44, 8, escura('#a86028'), 1);
    A.outl(m); mesaBar = A.toCanvas(m);
    const mg = mesaBar.getContext('2d'); R(mg, 122, 126, 76, 1, '#ffb060');
  }
  function vitoriaIniciar(ids) {
    prepararBar();
    const time = ids.slice(0, 4); while (time.length < 2) time.push(time[0]);
    return { time, notas: [], fumaca: [], congelado: null };
  }
  const POSES = ['brinde', 'fumando', 'dinheiro', 'riso'];
  const LUGAR = [[118, 162, 'atras'], [168, 162, 'atras'], [84, 176, 'frente'], [212, 176, 'frente']];
  function luzes(x) { return [['#ffb060', 'cima'], x < 160 ? ['#b070ff', 'esq'] : ['#ff70b0', 'dir']]; }
  function vitoria(g, f, s) {
    if (s.congelado) { g.drawImage(s.congelado, 0, 0); carimbo(g, f - 44); return; }
    g.drawImage(barFundo, 0, 0);
    // luminárias pendentes (piscam de leve) e cones de luz
    for (const [i, x] of [64, 128, 192, 256].entries()) {
      R(g, x, 7, 1, 12, '#120a10'); R(g, x - 5, 19, 11, 4, '#3a2416'); R(g, x - 4, 23, 9, 1, (f + i * 5) % 29 === 0 ? '#a06030' : '#ffd070');
      suave(g, x, 24, 18, '#ffb050', 0.45);
      for (let y = 24; y < 104; y++) { const w = (y - 24) * 0.45 + 4; for (let k = -w; k < w; k++) if (BY[y & 1][(x + k | 0) & 1] > 0.86) R(g, x + k, y, 1, 1, 'rgba(255,180,90,0.22)'); }
    }
    // neon do bar
    const neonOn = !(f % 19 === 4 || f % 23 === 9);
    if (neonOn) suave(g, 160, 13, 40, '#ff40a0', 0.35);
    A.texto(g, 'BAR DO PAPEL', 113, 9, neonOn ? '#ff7ac8' : '#3a1028', 2);
    // brilho da TV
    suave(g, 285, 38, 30, f % 6 < 3 ? '#40ff90' : '#30d070', 0.25);
    // clientes ao fundo (silhuetas com luz de contorno)
    const cli1 = pessoaAlta(null, { sombra: true, pernas: 0, bD: [20, 26], luzes: [['#ffb060', 'cima'], ['#b070ff', 'esq']] });
    const cli2 = pessoaAlta(null, { sombra: true, cab: 'longo', pernas: 0, bE: [8, 24], luzes: [['#ffb060', 'cima'], ['#ff70b0', 'dir']] });
    g.drawImage(cli1, 8, 100 + (f % 24 < 12 ? 0 : 1)); g.drawImage(cli2, 284, 98); g.drawImage(cli1, 300, 100);
    // o time
    const desenhar = (i) => {
      const id = s.time[i]; if (!id) return;
      const [x, pe] = LUGAR[i], pose = POSES[i], fase = (f + i * 3) % 12, cima = fase < 6, y = pe - 68;
      let p = { pernas: 0, olhos: 'feliz', boca: (f + i) % 8 < 4 ? 'riso' : 'sorriso', luzes: luzes(x) };
      if (pose === 'brinde') p.bD = cima ? [24, 3] : [22, 26];
      if (pose === 'fumando') { p.bE = fase < 4 ? [14, 11] : [6, 30]; p.boca = fase < 4 ? 'sorriso' : 'riso'; }
      if (pose === 'dinheiro') { p.bE = cima ? [3, 1] : [6, 26]; p.bD = cima ? [25, 1] : [22, 26]; }
      if (pose === 'riso') { p.bE = [8, 24]; p.bD = [22, 20]; p.olhos = 'feliz'; p.boca = 'riso'; }
      const bob = pose === 'riso' && f % 4 < 2 ? 1 : 0;
      g.drawImage(pessoaAlta(id, p), x - 14, y + bob);
      if (pose === 'brinde') { const hx = x - 14 + (cima ? 24 : 22), hy = y + (cima ? 3 : 26); R(g, hx - 2, hy - 8, 5, 7, '#e8a020'); R(g, hx - 2, hy - 9, 5, 2, '#fff4e0'); R(g, hx + 3, hy - 6, 1, 4, '#c0c8d0'); R(g, hx - 2, hy - 7, 1, 5, '#ffd870'); }
      if (pose === 'fumando') {
        const hx = x - 14 + (fase < 4 ? 14 : 6), hy = y + (fase < 4 ? 11 : 30);
        R(g, hx, hy - 1, 4, 1, '#e8e8e8'); R(g, hx + 4, hy - 1, 1, 1, f % 2 ? '#ff5a10' : '#ffc030');
        if (f % 3 === 0) s.fumaca.push({ x: hx + 4, y: hy - 2, v: 0 });
        if (fase === 5) for (let k = 0; k < 4; k++) s.fumaca.push({ x: x, y: y + 11, v: k * 0.15 });
      }
      if (pose === 'riso') { const hx = x - 14 + 22, hy = y + 20; for (let k = 0; k < 4; k++) { R(g, hx - 2 + k * 2, hy - 6 - k, 5, 3, '#2a8a40'); R(g, hx - 1 + k * 2, hy - 5 - k, 3, 1, '#7ad890'); } }
      if (pose === 'dinheiro' && fase === 0) for (let k = 0; k < 12; k++) s.notas.push({ x: x + (k - 6) * 2, y: y - 2, vx: (k - 6) * 0.6, vy: -3.5 - (k % 3), r: k % 2 });
    };
    desenhar(0); desenhar(1);
    g.drawImage(mesaBar, 0, 0);
    // dinheiro, chopes e cinzeiro na mesa
    for (const [x, y] of [[134, 124], [142, 128], [150, 122], [166, 126], [176, 122], [184, 128]]) for (let k = 0; k < 3; k++) { R(g, x, y - k * 2, 9, 3, '#1e6a34'); R(g, x, y - k * 2, 9, 1, '#5ac878'); R(g, x + 3, y - k * 2, 3, 3, '#d8f0c8'); }
    for (const [x, y] of [[128, 132], [190, 133], [160, 136]]) { R(g, x, y, 3, 1, '#ffd23a'); R(g, x + 2, y + 1, 3, 1, '#f0b020'); }
    for (const [x, y] of [[124, 120], [196, 121]]) { R(g, x, y, 5, 7, '#e8a020'); R(g, x, y - 1, 5, 2, '#fff4e0'); R(g, x + 5, y + 1, 1, 4, '#c0c8d0'); }
    R(g, 156, 130, 8, 2, '#6a6a78'); R(g, 158, 129, 5, 1, '#e8e8e8'); R(g, 163, 129, 1, 1, f % 2 ? '#ff5a10' : '#ffc030');
    if (f % 4 === 0) s.fumaca.push({ x: 163, y: 128, v: 0 });
    desenhar(2); desenhar(3);
    // fumaça e chuva de dinheiro
    s.fumaca = s.fumaca.filter(p => p.v < 1);
    for (const p of s.fumaca) { p.v += 0.05; p.y -= 1.6; p.x += Math.sin(p.v * 9) * 1.1; const r = 1 + p.v * 3; g.globalAlpha = 0.35 * (1 - p.v); R(g, p.x - r, p.y, r * 2 + 1, 1, '#b8b0c8'); R(g, p.x, p.y - r, 1, r * 2 + 1, '#b8b0c8'); R(g, p.x - r / 2, p.y - r / 2, r + 1, r + 1, '#b8b0c8'); g.globalAlpha = 1; }
    s.notas = s.notas.filter(n => n.y < 190);
    for (const n of s.notas) { n.vy += 0.5; n.x += n.vx; n.y += n.vy * 0.7; n.vx *= 0.95; const w = (f + n.r) % 2 ? 5 : 3; R(g, n.x, n.y, w, 3, '#2a8a40'); R(g, n.x + 1, n.y + 1, w - 2, 1, '#8ae0a0'); }
    // névoa de fumaça no teto e vinheta
    g.fillStyle = 'rgba(120,80,140,0.08)'; g.fillRect(0, 0, 320, 60);
    g.drawImage(vinheta(160, 95, 0.75, 1.3, 'rgba(6,2,12,0.6)'), 0, 0);
    // sombra do carimbo chegando
    if (f >= 38 && f < 44) { const k = (f - 38) / 6, sc = 1.6 - k * 0.6; g.globalAlpha = 0.15 + k * 0.35; g.fillStyle = '#000'; g.fillRect(160 - 115 * sc, 92 - 40 * sc, 230 * sc, 80 * sc); g.globalAlpha = 1; }
    if (f === 44) { // trava a animação: vira fundo cinza
      const [c, cg] = novoCanvas(320, 180); cg.drawImage(g.canvas, 0, 0);
      const cz = A.cinza(c), [c2, g2] = novoCanvas(320, 180); g2.drawImage(cz, 0, 0); g2.fillStyle = 'rgba(30,30,44,0.45)'; g2.fillRect(0, 0, 320, 180);
      s.congelado = c2; g.drawImage(c2, 0, 0); carimbo(g, 0);
    }
  }
  let carimboImg = null;
  function carimbo(g, k) {
    if (!carimboImg) {
      const [c, cg] = novoCanvas(230, 80), V = '#d42030';
      cg.fillStyle = V; cg.fillRect(0, 0, 230, 80); cg.clearRect(5, 5, 220, 70); cg.fillRect(9, 9, 212, 62); cg.clearRect(12, 12, 206, 56);
      A.texto(cg, 'META CUMPRIDA', 24, 22, V, 3);
      A.texto(cg, 'APROVADO PELA DIRETORIA', 34, 46, V, 2);
      for (let i = 0; i < 260; i++) cg.clearRect((i * 97) % 230, (i * 61) % 80, 1, 1);
      carimboImg = c;
    }
    const s = k < 2 ? 1.25 - k * 0.12 : 1, tre = k < 3 ? (3 - k) * 2 : 0;
    g.save(); g.translate(160 + (Math.random() - 0.5) * tre, 92 + (Math.random() - 0.5) * tre); g.rotate(-0.13); g.scale(s, s); g.drawImage(carimboImg, -115, -40); g.restore();
    if (k < 2) { g.fillStyle = `rgba(255,255,255,${0.5 - k * 0.25})`; g.fillRect(0, 0, 320, 180); }
  }

  /* ---------- DERROTA: a mão do CEO aponta a porta da rua (6 s) ---------- */
  let corredor = null, braco = null;
  function prepararCorredor() {
    if (corredor) return;
    const [c, g] = novoCanvas(320, 180); corredor = c;
    grad(g, 0, 0, 320, 118, ['#0c0e18', '#121624', '#161c2c']);
    for (let x = 0; x < 320; x += 32) { R(g, x, 0, 1, 118, '#0a0c14'); R(g, x + 3, 40, 26, 50, '#141a28'); R(g, x + 3, 40, 26, 1, '#1e2638'); }
    R(g, 0, 96, 320, 22, '#10141e'); R(g, 0, 96, 320, 1, '#283048');
    for (let y = 118; y < 180; y += 4) for (let x = (y % 8 === 2) * 8; x < 320; x += 16) { R(g, x, y, 16, 4, (x + y) % 32 < 16 ? '#141420' : '#181826'); R(g, x, y, 16, 1, '#1e1e2e'); }
    const b = A.Bf(320, 180);
    A.box(b, 192, 30, 76, 114, escura('#6a3a18'), 0, 0);
    A.box(b, 206, 18, 48, 10, escura('#e0b040'), 1, 1);
    A.box(b, 40, 30, 44, 34, escura('#d8d0b8'), 0, 0);
    A.box(b, 120, 74, 14, 16, escura('#8a5030'), 0, 0); for (const [x, y] of [[124, 66], [130, 62], [120, 60]]) A.ell(b, x, y, 5, 6, escura('#2a8a48'));
    A.outl(b); g.drawImage(A.toCanvas(b), 0, 0);
    A.texto(g, 'DIRETORIA', 212, 21, '#2a1600'); A.texto(g, 'MISSAO', 50, 36, '#3a3428'); A.texto(g, 'VISAO', 52, 44, '#3a3428'); A.texto(g, 'VALORES', 48, 52, '#3a3428');
    // braço do CEO apontando (manga azul-marinho, punho e abotoadura, dedo indicador)
    const a = A.Bf(80, 26), pele = rampa('#f0b890'), terno = rampa('#2a4488');
    for (let x = 36; x < 80; x++) for (let y = 4; y < 22; y++) { const ny = (y - 4) / 18 * 2 - 1; A.st(a, x, y, terno[Math.max(1, Math.min(4, Math.round((1 - Math.abs(ny + 0.35)) * 3.4)))]); }
    for (let x = 30; x < 37; x++) for (let y = 5; y < 21; y++) A.st(a, x, y, (y < 9) ? '#ffffff' : y > 17 ? '#b0b8cc' : '#e8eef6');
    A.rect(a, 32, 11, 3, 3, '#ffd23a');
    A.ell(a, 22, 13, 9, 7, pele); A.ell(a, 22, 18, 7, 3, pele, -1);
    for (let i = 0; i < 3; i++) A.ell(a, 15 + i * 4, 18.5, 2.4, 2.2, pele, -1);
    for (let x = 1; x < 16; x++) for (let y = 9; y < 13; y++) A.st(a, x, y, y === 9 ? pele[4] : y === 12 ? pele[1] : pele[3]);
    A.ell(a, 1.5, 11, 1.6, 2, pele);
    A.ell(a, 20, 7, 6, 2.6, pele);
    A.outl(a);
    luzContorno(a, '#ffe0a0', 'cima');
    braco = A.toCanvas(a);
  }
  function derrotaIniciar(ids) { prepararCorredor(); return { time: ids.slice(0, 4) }; }
  function derrota(g, f, s) {
    g.drawImage(corredor, 0, 0);
    const abre = Math.max(0, Math.min(1, (f - 10) / 10)), gap = Math.round(abre * 50);
    // vão da porta: fresta de luz por baixo antes de abrir, depois a luz da sala
    R(g, 196, 34, 68, 108, '#0a060c');
    if (gap > 0) grad(g, 196, 34, gap, 108, ['#fff2c0', '#ffd070', '#e08a30']);
    const beam = abre * 0.5 + 0.08;
    g.globalAlpha = beam; g.fillStyle = '#ffc060'; g.beginPath(); g.moveTo(196, 142); g.lineTo(196 + Math.max(4, gap), 142); g.lineTo(170 + gap * 0.4, 180); g.lineTo(20, 180); g.fill(); g.globalAlpha = 1;
    const px = 196 + gap, larg = 68 - gap;
    if (larg > 1) { g.fillStyle = '#3a1e0c'; g.beginPath(); g.moveTo(px, 34 + abre * 6); g.lineTo(264, 34); g.lineTo(264, 142); g.lineTo(px, 142 - abre * 6); g.fill(); g.fillStyle = '#4e2a12'; g.fillRect(px + 2, 44 + abre * 4, Math.max(0, larg - 6), 30); g.fillStyle = '#c8a040'; g.fillRect(px + 3, 92, 2, 4); }
    if (gap === 0) R(g, 196, 141, 68, 1, '#ffc060');
    // o time: de frente para a porta, depois sai com a caixa de papelão
    const luz = abre > 0 ? [['#ffc070', 'dir'], ['#ffe0a0', 'cima']] : [['#5060a0', 'cima']];
    s.time.forEach((id, i) => {
      const x0 = 70 + i * 28, inicio = 36 + i * 4, pe = 152;
      if (f < inicio) {
        const p = { olhos: f >= 24 ? 'baixo' : 'abertos', boca: f >= 24 ? 'triste' : 'sorriso', pernas: 0, luzes: luz };
        g.drawImage(pessoaAlta(id, p), x0 - 14, pe - 68 + (f >= 26 && i % 2 ? 1 : 0));
        if (f > 26 && (f + i) % 10 < 6) R(g, x0 + 4, pe - 64 + ((f + i) % 10), 1, 2, '#80c8ff');
        return;
      }
      const t = f - inicio, x = x0 - t * 6;
      if (x < -20) return;
      const im = A.flipCanvas(pessoaAlta(id, { olhos: 'baixo', boca: 'triste', pernas: [1, 0, 2, 0][Math.floor(t / 2) % 4], caixa: true, luzes: [['#ffc070', 'esq'], ['#ffe0a0', 'cima']] }));
      g.drawImage(im, Math.round(x - 14), pe - 68 + (Math.floor(t / 2) % 2));
    });
    // mão do CEO (por cima do time)
    if (f >= 22) {
      const ext = Math.min(1, (f - 22) / 8), cut = f >= 32 && (f - 32) % 6 < 2 ? -3 : 0;
      const bx = 196 + gap - 66 * ext + cut;
      g.save(); g.beginPath(); g.rect(0, 0, 196 + gap, 180); g.clip(); g.drawImage(braco, Math.round(bx), 74); g.restore();
    }
    // escuridão fora do facho de luz + vinheta
    g.fillStyle = `rgba(4,4,12,${0.35 + 0.2 * (1 - abre)})`; g.fillRect(0, 0, 196, 120); g.fillRect(264, 0, 56, 180);
    g.drawImage(vinheta(200, 100, 0.7, 1.4, 'rgba(0,0,6,0.7)'), 0, 0);
    if (f >= 66) { g.fillStyle = `rgba(0,0,0,${(f - 66) / 6})`; g.fillRect(0, 0, 320, 180); }
  }

  /* ---------- player a 12 fps ---------- */
  const DEF = {
    abertura: { total: 72, ini: () => ({}), quadro: (g, f) => abertura(g, f), sons: { 0: 'vento', 56: 'neon', 60: 'buzinaCaminhao', 64: 'arpejoAbertura' } },
    vitoria: { total: 62, pula: 44, ini: d => vitoriaIniciar(d.time), quadro: vitoria, sons: { 2: 'risadas', 6: 'brinde', 12: 'notas', 18: 'brinde', 30: 'brinde', 36: 'notas', 41: 'carimboTela' } },
    derrota: { total: 72, ini: d => derrotaIniciar(d.time), quadro: derrota, sons: { 10: 'portaRange', 30: 'dedo', 38: 'passo', 41: 'passo', 44: 'passo', 47: 'passo', 50: 'passo', 53: 'passo', 56: 'passo', 59: 'passo' } },
  };
  function tocar(nome, dados = {}) {
    return new Promise(res => {
      const d = DEF[nome], el = document.createElement('div'); el.className = 'cutscene';
      const [c, g] = novoCanvas(320, 180); c.className = 'px'; el.appendChild(c);
      el.insertAdjacentHTML('beforeend', '<div class="pular">clique para pular</div>');
      document.getElementById('stage').appendChild(el);
      const s = d.ini(dados); let f = 0, acabou = false;
      const fim = () => { if (acabou) return; acabou = true; clearInterval(tm); el.classList.add('sai'); setTimeout(() => { el.remove(); res(); }, 300); };
      const passo = () => {
        if (d.sons[f]) Som.sfx(d.sons[f]);
        try { d.quadro(g, f, s); } catch (e) { console.error(e); fim(); return; }
        f++; if (f >= d.total) fim();
      };
      const vel = /[?&]rapido/.test(location.search) ? 10 : 1; // modo de teste acelerado
      const tm = setInterval(passo, 1000 / FPS / vel); passo();
      el.addEventListener('click', () => {
        if (d.pula && f < d.pula) { while (f < d.pula) { try { d.quadro(g, f, s); } catch (e) { } f++; } Som.sfx('carimboTela'); return; }
        fim();
      });
    });
  }
  // prévia de um quadro (para testes): roda a cena do quadro 0 até f e devolve o canvas
  function previa(nome, f, dados = {}) { const d = DEF[nome], [c, g] = novoCanvas(320, 180), s = d.ini(dados); for (let i = 0; i <= f; i++) d.quadro(g, i, s); return c; }
  return { tocar, previa, menu: (g, f) => desenharLoja(g, f), pessoa };
})();
