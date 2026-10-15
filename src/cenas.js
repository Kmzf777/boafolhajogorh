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

  /* ---------- VITÓRIA: o time no bar (5 s) ---------- */
  let barFundo = null, mesa = null;
  const img2 = (g, im, x, y) => g.drawImage(im, Math.round(x), Math.round(y), im.width * 2, im.height * 2);
  function prepararBar() {
    if (barFundo) return;
    const [c, g] = novoCanvas(320, 180); barFundo = c;
    grad(g, 0, 0, 320, 110, ['#2a1408', '#3e2010', '#4e2a14', '#3a1c0c']);
    for (let x = 0; x < 320; x += 24) { R(g, x, 0, 2, 110, '#22100a'); R(g, x + 2, 0, 1, 110, '#5e3418'); }
    const b = A.Bf(320, 180);
    for (const y of [26, 52]) { A.box(b, 20, y, 280, 4, rampa('#7a4018'), 0, 0); for (let x = 26; x < 296; x += 9) { const cor = ['#2a8a40', '#a02028', '#c88a30', '#3a6ac0', '#e0e0e0', '#7a3a90'][(x * 7 + y) % 6]; A.cyl(b, x, y - 13, 5, 13, rampa(cor)); A.rect(b, x + 1, y - 17, 3, 4, A.shade(cor, -0.3)); } }
    A.box(b, 0, 96, 320, 14, rampa('#5a2e14'), 0, 0);
    A.outl(b); g.drawImage(A.toCanvas(b), 0, 0);
    grad(g, 0, 110, 320, 70, ['#2a160c', '#3a1e10', '#24120a']);
    // mesa redonda vista de cima
    const m = A.Bf(320, 180);
    A.ell(m, 160, 148, 140, 40, rampa('#6a3416'), -1); A.ell(m, 160, 142, 136, 36, rampa('#a86028'));
    A.outl(m); mesa = A.toCanvas(m); g.drawImage(mesa, 0, 0);
    const mg = mesa.getContext('2d'); for (let i = 0; i < 6; i++) R(mg, 60 + i * 38, 126 + (i % 2) * 6, 22, 1, 'rgba(255,220,160,0.25)');
    R(g, 96, 0, 128, 13, '#14080a'); R(g, 97, 1, 126, 11, '#24101a');
  }
  function vitoriaIniciar(ids) {
    prepararBar();
    const time = ids.slice(0, 4); while (time.length < 2) time.push(time[0]);
    return { time, notas: [], fumaca: [], congelado: null };
  }
  const POSES = ['brinde', 'fumando', 'dinheiro', 'riso'];
  function vitoria(g, f, s) {
    if (s.congelado) { g.drawImage(s.congelado, 0, 0); carimbo(g, f - 44); return; }
    g.drawImage(barFundo, 0, 0);
    // neon piscando
    const neonOn = !(f % 17 === 3 || f % 23 === 7);
    if (neonOn) { brilho(g, 160, 7, 30, '#ff40a0', 0.22); }
    A.texto(g, 'BAR DO PAPEL', 113, 2, neonOn ? '#ff6ac0' : '#5a2040', 2);
    // luminárias com cone de luz
    for (const x of [80, 240]) { R(g, x - 1, 0, 2, 8, '#20100a'); R(g, x - 6, 8, 12, 4, '#ffd166'); for (let y = 12; y < 100; y++) for (let k = -((y - 12) * 0.5 + 6); k < (y - 12) * 0.5 + 6; k++) if (BY[y & 1][(x + k | 0) & 1] > 0.82) R(g, x + k, y, 1, 1, 'rgba(255,220,140,0.35)'); }
    const pos = [[-2, 30], [78, 22], [158, 22], [238, 30]];
    s.time.forEach((id, i) => {
      const pose = POSES[i % 4], fase = (f + i * 3) % 12, cima = fase < 6;
      let p = { olhos: 'feliz', boca: (f + i) % 8 < 4 ? 'riso' : 'sorriso' };
      if (pose === 'brinde') p.bD = cima ? [33, 3] : [31, 20];
      if (pose === 'fumando') { p.bE = fase < 4 ? [17, 13] : [8, 28]; p.boca = fase < 4 ? 'reta' : 'sorriso'; }
      if (pose === 'dinheiro') { p.bE = cima ? [6, 0] : [10, 28]; p.bD = cima ? [34, 0] : [30, 28]; }
      if (pose === 'riso') { p.bE = [10, 32]; p.bD = [30, 32]; p.olhos = 'fechados'; p.boca = 'riso'; }
      const [x, y0] = pos[i], y = y0 + (pose === 'riso' && f % 4 < 2 ? 1 : 0);
      img2(g, pessoa(id, p), x, y);
      if (pose === 'brinde') img2(g, chope(), x + (cima ? 56 : 52), y + (cima ? -16 : 20));
      if (pose === 'fumando') {
        const hx = x + (fase < 4 ? 34 : 16), hy = y + (fase < 4 ? 26 : 56);
        R(g, hx + 2, hy - 2, 10, 2, '#f4f4f4'); R(g, hx + 12, hy - 2, 2, 2, f % 2 ? '#ff6a20' : '#ffd040');
        if (f % 3 === 0) s.fumaca.push({ x: hx + 12, y: hy - 4, v: 0 });
        if (fase === 5) for (let k = 0; k < 3; k++) s.fumaca.push({ x: x + 42, y: y + 28, v: k * 0.2 });
      }
      if (pose === 'dinheiro' && fase === 0) for (let k = 0; k < 10; k++) s.notas.push({ x: x + 40 + (k - 5) * 5, y: y - 4, vx: (k - 5) * 1.2, vy: -4 - (k % 3), r: k % 2 });
    });
    // mesa (por cima das pernas) + objetos
    g.drawImage(mesa, 0, 0);
    for (const [x, y] of [[72, 116], [98, 128], [184, 118], [212, 132], [150, 112]]) img2(g, pacote(), x, y);
    img2(g, moedas(), 128, 150); img2(g, moedas(), 222, 150); img2(g, cinzeiro(), 160, 136);
    for (const [x, y] of [[50, 118], [246, 120], [126, 146]]) img2(g, chope(), x, y);
    for (let i = 0; i < 9; i++) img2(g, nota(i % 2), 56 + (i * 37) % 200, 132 + (i * 11) % 30);
    // fumaça
    s.fumaca = s.fumaca.filter(p => p.v < 1);
    for (const p of s.fumaca) { p.v += 0.06; p.y -= 2.2; p.x += Math.sin(p.v * 9) * 1.4; g.globalAlpha = 0.55 * (1 - p.v); R(g, p.x, p.y, 3 + p.v * 8, 3 + p.v * 8, '#d8d8e0'); g.globalAlpha = 1; }
    // chuva de dinheiro
    s.notas = s.notas.filter(n => n.y < 190);
    for (const n of s.notas) { n.vy += 0.7; n.x += n.vx; n.y += n.vy * 0.8; n.vx *= 0.96; img2(g, nota((f + n.r) % 2), n.x, n.y); }
    // sombra do carimbo chegando
    if (f >= 38 && f < 44) { const k = (f - 38) / 6; g.globalAlpha = 0.15 + k * 0.35; g.fillStyle = '#000'; g.fillRect(160 - 110 * (1.6 - k * 0.6), 90 - 34 * (1.6 - k * 0.6), 220 * (1.6 - k * 0.6), 68 * (1.6 - k * 0.6)); g.globalAlpha = 1; }
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
    grad(g, 0, 0, 320, 120, ['#20263a', '#2a3048', '#323a54']);
    for (let x = 0; x < 320; x += 30) R(g, x, 0, 1, 120, '#1a2030');
    R(g, 0, 96, 320, 24, '#262c40'); R(g, 0, 96, 320, 2, '#3a4260');
    grad(g, 0, 120, 320, 60, ['#3a3242', '#2e2836', '#221e2a']);
    for (let x = 0; x < 320; x += 20) R(g, x, 120, 1, 60, '#2a2432');
    const b = A.Bf(320, 180);
    A.box(b, 192, 30, 76, 114, rampa('#4a2a14'), 0, 0);
    A.box(b, 206, 18, 48, 10, rampa('#c89a30'), 0, 1);
    A.box(b, 40, 30, 44, 34, rampa('#e8e0c8'), 0, 0);
    A.box(b, 120, 66, 14, 16, rampa('#8a5030'), 0, 0); for (const [x, y] of [[124, 58], [130, 54], [120, 52]]) A.ell(b, x, y, 5, 6, rampa('#2a7a40'));
    A.outl(b); g.drawImage(A.toCanvas(b), 0, 0);
    A.texto(g, 'DIRETORIA', 212, 21, '#3a2000'); A.texto(g, 'MISSAO', 50, 36, '#5a5040'); A.texto(g, 'VISAO', 52, 44, '#5a5040'); A.texto(g, 'VALORES', 48, 52, '#5a5040');
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
    A.rect(a, 2, 10, 2, 1, '#ffe8e0');
    braco = A.toCanvas(a);
  }
  function derrotaIniciar(ids) { prepararCorredor(); return { time: ids.slice(0, 4) }; }
  function derrota(g, f, s) {
    g.drawImage(corredor, 0, 0);
    const abre = Math.max(0, Math.min(1, (f - 10) / 10)), gap = Math.round(abre * 50);
    // porta: vão escuro + luz de dentro
    R(g, 196, 34, 68, 108, '#120a14');
    if (gap > 0) {
      grad(g, 196, 34, gap, 108, ['#fff0b0', '#ffd070', '#e09030']);
      g.globalAlpha = 0.35 * abre; g.fillStyle = '#ffd070'; g.beginPath(); g.moveTo(196, 142); g.lineTo(196 + gap, 142); g.lineTo(150 + gap * 0.3, 180); g.lineTo(40, 180); g.fill(); g.globalAlpha = 1;
    }
    // folha da porta girando (dobradiça à direita)
    const px = 196 + gap, larg = 68 - gap;
    if (larg > 1) { g.fillStyle = '#5a3218'; g.beginPath(); g.moveTo(px, 34 + abre * 6); g.lineTo(264, 34); g.lineTo(264, 142); g.lineTo(px, 142 - abre * 6); g.fill(); g.fillStyle = '#7a4420'; g.fillRect(px + 2, 44 + abre * 4, Math.max(0, larg - 6), 30); g.fillStyle = '#ffd166'; g.fillRect(px + 3, 92, 2, 4); }
    // mão do CEO
    if (f >= 22) {
      const ext = Math.min(1, (f - 22) / 8), cut = f >= 32 && (f - 32) % 6 < 2 ? -4 : 0;
      const bx = 196 + gap - 118 * ext + cut;
      g.save(); g.beginPath(); g.rect(0, 0, 196 + gap, 180); g.clip(); g.drawImage(braco, Math.round(bx), 52, 160, 52); g.restore();
    }
    // time: cabisbaixo, depois sai com a caixa
    s.time.forEach((id, i) => {
      const x0 = -8 + i * 42, inicio = 36 + i * 4;
      if (f < inicio) { const p = { olhos: f >= 22 ? 'baixo' : 'abertos', boca: f >= 22 ? 'triste' : 'reta', pernas: 0 }; img2(g, pessoa(id, p), x0, 40 + (f >= 24 && i % 2 ? 2 : 0)); if (f > 24 && (f + i) % 10 < 6) R(g, x0 + 58, 46 + ((f + i) % 10) * 2, 3, 5, '#80c8ff'); return; }
      const t = f - inicio, x = x0 - t * 9;
      if (x < -85) return;
      let img = pessoa(id, { olhos: 'baixo', boca: 'triste', pernas: [1, 0, 2, 0][Math.floor(t / 2) % 4], caixa: true });
      img = A.flipCanvas(img); img2(g, img, x, 40 + (Math.floor(t / 2) % 2) * 2);
    });
    // escurece tudo fora do facho de luz
    g.fillStyle = `rgba(8,6,20,${0.25 + 0.2 * (1 - abre)})`; g.fillRect(0, 0, 196, 180); g.fillRect(264, 0, 56, 180);
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
