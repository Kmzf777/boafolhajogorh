/* =========================================================================
   MÓDULO RENDER — pixel art desenhada em código
   Personagens 8 bits (retrato 32x32 + corpo 16x24), chefões 16 bits
   detalhados (112x120, rampas + pontilhado), cenários 320x180.
   ========================================================================= */
const Arte = (() => {
  const OUT = '#1a1a2e';
  /* ---------- buffer de pixels ---------- */
  function Bf(w, h) { return { w, h, c: new Array(w * h).fill(null), m: new Array(w * h).fill(null) }; }
  function st(b, x, y, c, m) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= b.w || y >= b.h) return; b.c[y * b.w + x] = c; b.m[y * b.w + x] = m || null; }
  function rect(b, x, y, w, h, c, m) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) st(b, i, j, c, m); }
  function clr(b, x, y) { if (x >= 0 && y >= 0 && x < b.w && y < b.h) { b.c[y * b.w + x] = null; b.m[y * b.w + x] = null; } }
  const BY = [[0, 0.5], [0.75, 0.25]], L = [-0.45, -0.55, 0.7];
  function sh(r, d, x, y, bias) {
    let v = Math.max(0, Math.min(1, (d + 0.1) / 1.05)) * (r.length - 1), i = Math.floor(v);
    if (v - i > BY[y & 1][x & 1]) i++;
    return r[Math.max(1, Math.min(r.length - 1, i + (bias || 0)))];
  }
  function ell(b, cx, cy, rx, ry, r, bias) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, q = nx * nx + ny * ny; if (q > 1) continue;
      st(b, x, y, sh(r, nx * L[0] + ny * L[1] + Math.sqrt(1 - q) * L[2], x, y, bias), r);
    }
  }
  function cyl(b, x0, y0, w, h, r, bias) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const nx = (x + 0.5 - x0) / w * 2 - 1;
      st(b, x, y, sh(r, nx * L[0] + Math.sqrt(Math.max(0, 1 - nx * nx)) * L[2] - (y - y0) / h * 0.15, x, y, bias), r);
    }
  }
  function box(b, x0, y0, w, h, r, bias, round) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      if (round) { const dx = Math.min(x - x0, x0 + w - 1 - x), dy = Math.min(y - y0, y0 + h - 1 - y); if (dx + dy < round) continue; }
      const d = 0.75 - ((x - x0) / w) * 0.45 - ((y - y0) / h) * 0.55;
      st(b, x, y, sh(r, d, x, y, bias), r);
    }
  }
  function poly(b, pts, r, bias) {
    const ys = pts.map(p => p[1]), xs = pts.map(p => p[0]);
    const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys)), x0 = Math.min(...xs), x1 = Math.max(...xs);
    for (let y = y0; y <= y1; y++) {
      const inter = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) inter.push(ax + (y + 0.5 - ay) / (by - ay) * (bx - ax));
      }
      inter.sort((a, z) => a - z);
      for (let k = 0; k + 1 < inter.length; k += 2) for (let x = Math.round(inter[k]); x < Math.round(inter[k + 1]); x++) {
        const d = 0.75 - ((x - x0) / Math.max(1, x1 - x0)) * 0.45 - ((y - y0) / Math.max(1, y1 - y0)) * 0.55;
        st(b, x, y, typeof r === 'string' ? r : sh(r, d, x, y, bias), typeof r === 'string' ? null : r);
      }
    }
  }
  function line(b, x0, y0, x1, y1, c, th) {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx - dy;
    for (; ;) {
      if (th) rect(b, x0 - (th >> 1), y0 - (th >> 1), th, th, c); else st(b, x0, y0, c);
      if (x0 === x1 && y0 === y1) break; const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; } if (e2 < dx) { err += dx; y0 += sy; }
    }
  }
  function px(b, list, c) { list.forEach(([x, y]) => st(b, x, y, c)); }
  function outl(b, col) {
    const o = b.c.slice();
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const i = y * b.w + x; if (!b.c[i]) continue;
      const e = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, c]) => { const X = x + a, Y = y + c; if (X < 0 || Y < 0 || X >= b.w || Y >= b.h) return true; return !b.c[Y * b.w + X]; });
      if (e) o[i] = col || (b.m[i] ? b.m[i][0] : OUT);
    }
    b.c = o;
  }
  function outer(b, col) { // contorno externo (fora da forma), estilo 8 bits
    const o = b.c.slice();
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const i = y * b.w + x; if (b.c[i]) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, c]) => { const X = x + a, Y = y + c; return X >= 0 && Y >= 0 && X < b.w && Y < b.h && b.c[Y * b.w + X]; })) o[i] = col;
    }
    b.c = o;
  }
  function toCanvas(b, scale = 1) {
    const cv = document.createElement('canvas'); cv.width = b.w * scale; cv.height = b.h * scale;
    const g = cv.getContext('2d');
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const c = b.c[y * b.w + x]; if (c) { g.fillStyle = c; g.fillRect(x * scale, y * scale, scale, scale); } }
    return cv;
  }
  function flipCanvas(cv) { const o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height; const g = o.getContext('2d'); g.translate(cv.width, 0); g.scale(-1, 1); g.drawImage(cv, 0, 0); return o; }
  function tint(cv, fn) { const o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height; const g = o.getContext('2d'); g.drawImage(cv, 0, 0); const d = g.getImageData(0, 0, o.width, o.height); for (let i = 0; i < d.data.length; i += 4) if (d.data[i + 3]) fn(d.data, i); g.putImageData(d, 0, 0); return o; }
  const cinza = cv => tint(cv, (a, i) => { const v = (a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11) * 0.8 + 20; a[i] = v; a[i + 1] = v; a[i + 2] = v + 10; });
  const branco = cv => tint(cv, (a, i) => { a[i] = 255; a[i + 1] = 255; a[i + 2] = 255; });
  function shade(hex, k) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k))); return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join(''); }

  /* ---------- fonte pixelada 3x5 para placas e letreiros ---------- */
  const F3 = { A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110', '%': '101001010100101', '!': '010010010000010', '?': '110001010000010', '.': '000000000000010', '-': '000000111000000', ':': '000010000010000', '$': '011110010011110', '/': '001001010100100', ' ': '000000000000000', 'º': '010101010000000' };
  function texto(g, s, x, y, cor, esc = 1) {
    s = s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    g.fillStyle = cor;
    for (const ch of s) { const f = F3[ch] || F3[' ']; for (let i = 0; i < 15; i++) if (f[i] === '1') g.fillRect(x + (i % 3) * esc, y + Math.floor(i / 3) * esc, esc, esc); x += 4 * esc; }
  }
  const larguraTexto = (s, esc = 1) => s.length * 4 * esc - esc;

  /* ---------- PERSONAGENS 8 bits ---------- */
  const PELES = [['#f4c8a0', '#d89c74', '#ffe0c4'], ['#dca474', '#b47a4a', '#f0c094'], ['#a86c40', '#80502a', '#c48a5a'], ['#6e4424', '#4e2e16', '#8a5a36']];
  const LOOKS = {
    carlinhos: { pele: 0, cab: 'curto', cc: '#5b3a22', roupa: '#8ec4f0', gravata: '#e63946', oculos: 'quadrado' },
    luciano: { pele: 1, cab: 'topete', cc: '#1e1410', roupa: '#ff8c32', sorriso: true },
    felipe: { pele: 0, cab: 'baguncado', cc: '#e8c050', roupa: '#3aa860', acc: 'fone' },
    anamaria: { pele: 0, cab: 'coque', cc: '#c8c8d0', roupa: '#a070c8', oculos: 'leitura' },
    sandy: { pele: 0, cab: 'longo', cc: '#a0703a', roupa: '#d8c090', acc: 'caneta' },
    tata: { pele: 3, cab: 'cacheado', cc: '#1a1210', roupa: '#ffd23a', oculos: 'redondo' },
    hebe: { pele: 0, cab: 'volume', cc: '#f4e8b0', roupa: '#ff6aa8', acc: 'brinco' },
    gil: { pele: 3, cab: 'raspado', cc: '#1a1210', roupa: '#7a4ad0', acc: 'celular' },
    junior: { pele: 1, cab: 'espetado', cc: '#2a1a10', roupa: '#e63946', acc: 'cracha' },
    fatima: { pele: 2, cab: 'chanel', cc: '#1a1210', roupa: '#8a2040', acc: 'colar' },
    fausto: { pele: 0, cab: 'careca', cc: '#6a5a50', roupa: '#6a7080', gravata: '#2a5cb8', barba: 'bigode' },
    ivete: { pele: 1, cab: 'longo', cc: '#c89a40', roupa: '#2ac0c0', acc: 'brinco' },
    luan: { pele: 0, cab: 'penteado', cc: '#6a4020', roupa: '#c04040', acc: 'headset', barba: 'curta' },
    gloria: { pele: 3, cab: 'afro', cc: '#2a1a14', roupa: '#f4f4f4', acc: 'colar' },
    caetano: { pele: 0, cab: 'cacheado', cc: '#9a9aa4', roupa: '#d8a020', oculos: 'quadrado' },
    angelica: { pele: 0, cab: 'rabo', cc: '#d0602a', roupa: '#6ad0c0', acc: 'prancheta' },
    pedro: { pele: 2, cab: 'penteado', cc: '#1a1210', roupa: '#1e2a5a', gravata: '#101018' },
    roberto: { pele: 0, cab: 'ralo', cc: '#a0a0a8', roupa: '#f0f0f0', gravata: '#a03030', olheira: true },
    marilia: { pele: 1, cab: 'franja', cc: '#1a1210', roupa: '#fafafa', acc: 'broche' },
    gugu: { pele: 0, cab: 'penteado', cc: '#7a4a24', roupa: '#8a5a30', gravata: '#e0b040', sorriso: true, acc: 'celular' },
  };
  function cabeloRetrato(b, l, atras) {
    const c = l.cc, d = shade(c, -0.3), R = (x, y, w, h, cor) => rect(b, x, y, w, h, cor || c);
    const e = l.cab;
    if (atras) {
      if (e === 'longo') R(7, 9, 18, 18, d);
      if (e === 'volume') R(6, 6, 20, 12, d);
      if (e === 'cacheado') R(5, 5, 22, 15, d);
      if (e === 'afro') R(4, 2, 24, 18, d);
      if (e === 'chanel') R(7, 9, 18, 10, d);
      if (e === 'franja') R(7, 9, 18, 14, d);
      if (e === 'rabo') R(23, 10, 4, 12, d);
      return;
    }
    switch (e) {
      case 'curto': R(9, 6, 14, 4); R(8, 8, 2, 5); R(22, 8, 2, 5); R(10, 10, 4, 1); R(16, 10, 3, 1); break;
      case 'topete': R(9, 6, 14, 4); R(10, 2, 11, 5); R(8, 8, 2, 4); R(22, 8, 2, 4); st(b, 12, 3, shade(c, 0.4)); st(b, 13, 3, shade(c, 0.4)); break;
      case 'baguncado': R(9, 5, 14, 5); R(8, 7, 2, 6); R(22, 7, 2, 6); px(b, [[10, 4], [13, 3], [14, 4], [17, 3], [20, 4], [11, 10], [15, 10], [19, 10], [21, 10]], c); break;
      case 'coque': R(9, 6, 14, 4); R(12, 1, 8, 6); R(8, 8, 2, 5); R(22, 8, 2, 5); R(10, 10, 2, 1); R(20, 10, 2, 1); break;
      case 'longo': R(8, 5, 16, 5); R(7, 8, 3, 16); R(22, 8, 3, 16); R(10, 10, 3, 1); break;
      case 'cacheado': for (let i = 0; i < 9; i++) R(6 + i * 2 + (i % 2), 3 + (i % 2), 3, 6); R(6, 8, 4, 8); R(22, 8, 4, 8); R(9, 9, 14, 2); break;
      case 'volume': R(7, 3, 18, 7); R(6, 6, 4, 8); R(22, 6, 4, 8); R(9, 10, 5, 1); px(b, [[8, 2], [13, 2], [18, 2], [23, 3]], c); break;
      case 'raspado': R(9, 7, 14, 2, shade(c, 0.15)); break;
      case 'espetado': R(9, 6, 14, 4); px(b, [[9, 5], [10, 4], [12, 3], [13, 4], [15, 2], [16, 3], [18, 3], [19, 4], [21, 4], [22, 5]], c); R(8, 8, 2, 4); R(22, 8, 2, 4); break;
      case 'chanel': R(7, 5, 18, 6); R(7, 8, 3, 11); R(22, 8, 3, 11); break;
      case 'careca': R(8, 11, 2, 6); R(22, 11, 2, 6); st(b, 13, 8, '#ffffff'); st(b, 14, 8, '#ffffff'); break;
      case 'afro': R(5, 1, 22, 9); R(4, 5, 5, 12); R(23, 5, 5, 12); break;
      case 'rabo': R(9, 5, 14, 5); R(8, 8, 2, 4); R(22, 8, 2, 4); R(24, 7, 3, 3); break;
      case 'franja': R(8, 5, 16, 7); R(7, 8, 3, 14); R(22, 8, 3, 14); break;
      case 'penteado': R(9, 5, 14, 5); R(8, 8, 2, 4); R(22, 8, 2, 4); R(12, 5, 1, 5, d); break;
      case 'ralo': px(b, [[10, 7], [12, 6], [14, 7], [16, 6], [18, 7], [20, 6], [9, 9], [22, 9]], c); R(8, 10, 2, 6); R(22, 10, 2, 6); break;
    }
  }
  // expr: neutro | feliz | bravo | nervoso | triste | out
  function retrato(id, expr = 'neutro') {
    const l = LOOKS[id], [sk, sd, sl] = PELES[l.pele], b = Bf(32, 32), R = (x, y, w, h, c) => rect(b, x, y, w, h, c);
    cabeloRetrato(b, l, true);
    const r1 = l.roupa, r2 = shade(r1, -0.25);
    R(4, 24, 24, 8, r1); R(20, 24, 8, 8, r2); R(4, 31, 24, 1, r2);
    if (l.gravata) { R(12, 23, 3, 3, '#ffffff'); R(17, 23, 3, 3, '#ffffff'); R(15, 24, 2, 8, l.gravata); st(b, 15, 24, shade(l.gravata, 0.3)); }
    else { R(13, 23, 6, 2, shade(r1, 0.25)); }
    R(13, 20, 6, 4, sd);
    R(9, 8, 14, 13, sk); R(20, 9, 3, 11, sd); R(8, 13, 1, 3, sk); R(23, 13, 1, 3, sd);
    [[9, 8], [22, 8], [9, 20], [22, 20]].forEach(([x, y]) => clr(b, x, y));
    st(b, 11, 9, sl); st(b, 12, 9, sl);
    cabeloRetrato(b, l, false);
    // rosto
    const E = '#1a1a2e', W = '#ffffff', M = '#7a2a2a';
    if (expr === 'out') { R(11, 15, 3, 1, E); R(18, 15, 3, 1, E); }
    else { R(12, 14, 2, 2, E); R(18, 14, 2, 2, E); st(b, 12, 14, W); st(b, 18, 14, W); }
    const bc = shade(l.cc, -0.2);
    if (expr === 'bravo') { px(b, [[11, 12], [12, 12], [13, 13], [20, 12], [19, 12], [18, 13]], bc); }
    else if (expr === 'nervoso' || expr === 'triste') { px(b, [[11, 13], [12, 12], [13, 12], [20, 13], [19, 12], [18, 12]], bc); }
    else { R(11, 12, 3, 1, bc); R(18, 12, 3, 1, bc); }
    if (l.olheira || expr === 'out') { R(12, 16, 2, 1, sd); R(18, 16, 2, 1, sd); }
    if (expr === 'feliz' || (expr === 'neutro' && l.sorriso)) { R(14, 18, 4, 2, M); R(14, 18, 4, 1, W); st(b, 13, 17, M); st(b, 18, 17, M); R(10, 17, 2, 1, '#ff9a9a'); R(20, 17, 2, 1, '#ff9a9a'); }
    else if (expr === 'nervoso') px(b, [[13, 19], [14, 18], [15, 19], [16, 18], [17, 19], [18, 18]], M);
    else if (expr === 'triste') { R(14, 18, 4, 1, M); st(b, 13, 19, M); st(b, 18, 19, M); }
    else if (expr === 'bravo') { R(13, 19, 6, 1, M); st(b, 13, 18, M); st(b, 18, 18, M); }
    else if (expr === 'out') R(14, 19, 3, 1, M);
    else R(14, 18, 4, 1, M);
    st(b, 16, 16, sd);
    if (l.oculos) {
      const G = '#2a2a3a';
      if (l.oculos === 'leitura') { R(11, 15, 4, 1, G); R(17, 15, 4, 1, G); R(15, 15, 2, 1, G); }
      else {
        [[11, 13], [17, 13]].forEach(([x, y]) => { R(x, y, 4, 1, G); R(x, y + 3, 4, 1, G); R(x, y, 1, 4, G); R(x + 3, y, 1, 4, G); });
        R(15, 14, 2, 1, G);
        if (l.oculos === 'redondo') { clr(b, 11, 13); clr(b, 14, 13); clr(b, 17, 13); clr(b, 20, 13); }
      }
    }
    if (l.barba === 'bigode') R(13, 17, 6, 1, l.cc);
    if (l.barba === 'curta') { R(9, 17, 2, 3, l.cc); R(21, 17, 2, 3, l.cc); R(11, 20, 10, 1, l.cc); R(13, 17, 6, 1, l.cc); }
    switch (l.acc) {
      case 'fone': R(9, 3, 14, 2, '#30303a'); R(7, 11, 3, 6, '#e63946'); R(22, 11, 3, 6, '#e63946'); R(8, 5, 1, 6, '#30303a'); R(23, 5, 1, 6, '#30303a'); break;
      case 'headset': R(22, 11, 3, 5, '#30303a'); R(9, 4, 14, 1, '#30303a'); line(b, 23, 16, 18, 19, '#30303a'); st(b, 17, 19, '#e63946'); break;
      case 'brinco': R(8, 17, 1, 2, '#ffd23a'); R(23, 17, 1, 2, '#ffd23a'); break;
      case 'colar': for (let x = 11; x <= 20; x++) st(b, x, x % 2 ? 25 : 26, '#ffd23a'); break;
      case 'cracha': line(b, 13, 24, 19, 28, '#3a6ad0'); R(18, 27, 4, 4, '#ffffff'); R(19, 28, 2, 1, '#3a6ad0'); break;
      case 'celular': R(23, 12, 3, 7, '#22222e'); st(b, 24, 13, '#80d0ff'); break;
      case 'caneta': R(23, 9, 1, 5, '#2a5cb8'); break;
      case 'broche': R(9, 26, 2, 2, '#ffd23a'); break;
      case 'prancheta': R(2, 25, 7, 7, '#a0703a'); R(3, 26, 5, 5, '#ffffff'); R(4, 27, 3, 1, '#888'); R(4, 29, 3, 1, '#888'); break;
    }
    outer(b, OUT);
    return b;
  }
  const CORES_AREA = { FIN: '#2fbf71', DAD: '#5a8ef0', JUR: '#a070d8', TEC: '#20b8c8', VEN: '#ff8c32', OPE: '#e0b030' };
  const cacheRet = {};
  function retratoCanvas(id, expr = 'neutro', escala = 3, comFundo = true) {
    const k = id + expr + escala + comFundo; if (cacheRet[k]) return cacheRet[k];
    const cv = document.createElement('canvas'); cv.width = 32 * escala; cv.height = 32 * escala;
    const g = cv.getContext('2d');
    if (comFundo) {
      const a = (typeof Regras !== 'undefined' && Regras.CHAR[id]) ? Regras.CHAR[id].area : 'FIN';
      const c = CORES_AREA[a]; g.fillStyle = shade(c, -0.45); g.fillRect(0, 0, cv.width, cv.height);
      g.fillStyle = shade(c, -0.3); for (let y = 0; y < 32; y += 2) for (let x = (y / 2) % 2; x < 32; x += 2) g.fillRect(x * escala, y * escala, escala, escala);
    }
    g.drawImage(toCanvas(retrato(id, expr), escala), 0, 0);
    return (cacheRet[k] = cv);
  }
  // corpo 16x24 de frente. pose: 0/1 andando, 2 ação, 3 out
  function corpo(id, pose) {
    const l = LOOKS[id], [sk, sd] = PELES[l.pele], b = Bf(16, 24), R = (x, y, w, h, c) => rect(b, x, y, w, h, c);
    const r1 = l.roupa, r2 = shade(r1, -0.25), calca = l.roupa === '#f0f0f0' || l.roupa === '#fafafa' ? '#3a3a50' : shade(r1, -0.5), c = l.cc;
    const dy = pose === 3 ? 2 : 0;
    // cabelo atrás
    if (['longo', 'franja', 'chanel'].includes(l.cab)) R(3, 2 + dy, 10, 9, shade(c, -0.25));
    if (['afro', 'cacheado', 'volume'].includes(l.cab)) R(2, 0 + dy, 12, 8, shade(c, -0.2));
    // pernas
    const passo = pose === 1 ? 1 : 0;
    if (pose === 3) { R(3, 19, 4, 3, calca); R(9, 19, 4, 3, calca); R(2, 22, 5, 1, '#20202a'); R(9, 22, 5, 1, '#20202a'); }
    else { R(4, 16, 3, 6 - passo, calca); R(9, 16, 3, 6 - (1 - passo) * 0 - (pose === 1 ? 0 : 0), calca); R(4 - passo, 22 - passo, 4, 1, '#20202a'); R(9, 22, 4, 1, '#20202a'); if (pose === 1) R(9, 21, 3, 1, calca); }
    // tronco
    R(3, 8 + dy, 10, 8, r1); R(11, 8 + dy, 2, 8, r2);
    if (l.gravata) { R(7, 8 + dy, 2, 6, l.gravata); st(b, 6, 8 + dy, '#ffffff'); st(b, 9, 8 + dy, '#ffffff'); }
    if (l.acc === 'cracha') R(9, 11 + dy, 2, 2, '#ffffff');
    if (l.acc === 'colar') R(6, 9 + dy, 4, 1, '#ffd23a');
    // braços
    if (pose === 2) { R(1, 9, 2, 5, r1); R(1, 14, 2, 1, sk); R(13, 3, 2, 6, r1); R(13, 2, 2, 2, sk); }
    else if (pose === 3) { R(1, 11, 2, 6, r2); R(1, 17, 2, 1, sk); R(13, 11, 2, 6, r2); R(13, 17, 2, 1, sk); }
    else { const a = pose === 1 ? 1 : 0; R(1, 9 + a, 2, 5, r1); R(1, 14 + a, 2, 1, sk); R(13, 9 - a + 1, 2, 5, r2); R(13, 14 - a + 1, 2, 1, sd); }
    if (l.acc === 'prancheta' && pose !== 2) { R(0, 12, 3, 4, '#a0703a'); }
    if (l.acc === 'celular' && pose !== 2) { R(13, 4 + dy, 2, 3, '#22222e'); }
    // cabeça
    R(4, 1 + dy, 8, 7, sk); R(10, 2 + dy, 2, 6, sd); clr(b, 4, 1 + dy); clr(b, 11, 1 + dy);
    // cabelo frente
    const H = (x, y, w, h) => R(x, y + dy, w, h, c);
    switch (l.cab) {
      case 'careca': H(3, 3, 1, 3); H(12, 3, 1, 3); break;
      case 'raspado': H(4, 1, 8, 1); break;
      case 'ralo': st(b, 6, 1 + dy, c); st(b, 9, 1 + dy, c); H(3, 3, 1, 3); H(12, 3, 1, 3); break;
      case 'coque': H(4, 0, 8, 2); H(6, -1 < 0 ? 0 : 0, 4, 1); H(3, 2, 1, 3); H(12, 2, 1, 3); R(6, 0, 4, 1, shade(c, 0.2)); break;
      case 'topete': H(4, 0, 8, 2); H(5, -1, 5, 1); H(3, 1, 1, 3); H(12, 1, 1, 3); break;
      case 'afro': H(2, 0, 12, 2); H(2, 1, 2, 5); H(12, 1, 2, 5); break;
      case 'cacheado': case 'volume': H(3, 0, 10, 2); H(2, 1, 2, 5); H(12, 1, 2, 5); break;
      case 'rabo': H(4, 0, 8, 2); H(3, 1, 1, 3); H(12, 1, 2, 2); H(13, 3, 2, 5); break;
      case 'longo': case 'franja': case 'chanel': H(4, 0, 8, 3); H(3, 1, 1, 8); H(12, 1, 1, 8); break;
      default: H(4, 0, 8, 2); H(3, 1, 1, 3); H(12, 1, 1, 3); if (l.cab === 'espetado' || l.cab === 'baguncado') { st(b, 5, 0, c); st(b, 8, 0, c); st(b, 11, 0, c); }
    }
    if (l.acc === 'fone' || l.acc === 'headset') { R(3, 3 + dy, 1, 3, '#e63946'); if (l.acc === 'fone') R(12, 3 + dy, 1, 3, '#e63946'); }
    // olhos
    if (pose === 3) { R(5, 4 + dy, 2, 1, '#1a1a2e'); R(9, 4 + dy, 2, 1, '#1a1a2e'); }
    else { st(b, 6, 4 + dy, '#1a1a2e'); st(b, 9, 4 + dy, '#1a1a2e'); }
    if (l.oculos) R(5, 4 + dy, 6, 1, '#2a2a3a'), st(b, 6, 4 + dy, '#9ad0ff'), st(b, 9, 4 + dy, '#9ad0ff');
    if (l.barba) R(6, 6 + dy, 4, 1, c);
    else st(b, 7, 6 + dy, '#7a2a2a'), st(b, 8, 6 + dy, '#7a2a2a');
    outer(b, OUT);
    return b;
  }
  const cacheCorpo = {};
  function corpoCanvas(id, pose) {
    const k = id + pose; if (cacheCorpo[k]) return cacheCorpo[k];
    let cv = toCanvas(corpo(id, pose));
    if (pose === 3) cv = cinza(cv);
    return (cacheCorpo[k] = cv);
  }

  /* ---------- CHEFÕES 16 bits (112x120) ---------- */
  const RP = {
    pele1: ['#5a2e1e', '#a0603e', '#d4906a', '#f0b890', '#ffdcc0'], pele2: ['#3a1e10', '#6e3a1e', '#a0603a', '#c88a5a', '#e8b088'],
    raiva: ['#5a1a1a', '#a03a30', '#d86a50', '#f09070', '#ffc0a0'],
    cinza: ['#1e2030', '#3a3e52', '#5a6078', '#8088a0', '#b0b8cc'], marrom: ['#2a1408', '#4e2a14', '#7a4422', '#a2643a', '#c88c5c'],
    marinho: ['#0a1030', '#1a2a5a', '#2a4488', '#4a6ab8', '#8aa8e0'], preto: ['#08080e', '#18182a', '#2a2a40', '#40405a', '#606080'],
    bege: ['#4a3a22', '#7a6440', '#a89060', '#ccb488', '#ece0bc'], verm: ['#4a0a10', '#901828', '#d02a3a', '#f05a5a', '#ffa0a0'],
    ouro: ['#4a3000', '#8a5a00', '#d09a10', '#f8d040', '#fff0a0'], rosa: ['#5a1a3a', '#a03a6a', '#e06a9a', '#ff9ac0', '#ffd0e4'],
    roxo: ['#20103a', '#402070', '#6a3aa8', '#9a6ad8', '#d0b0ff'], verde: ['#0a2a14', '#145a2a', '#2a9a48', '#5ad070', '#a8f0b0'],
    lcd: ['#0a2a10', '#1a5a20', '#3aa040', '#80e070', '#d0ffc0'], branco: ['#6a7080', '#a0a8b8', '#d0d8e4', '#f0f4f8', '#ffffff'],
    grisalho: ['#3a3a40', '#6a6a72', '#9a9aa4', '#c8c8d0', '#ececf4'], laranja: ['#4a1a00', '#8a3a00', '#d06a10', '#f8a030', '#ffd070'],
    crt: ['#4a4030', '#7a6e54', '#aaa080', '#d0c8a8', '#f0ecd8'], madeira: ['#2a1206', '#4e260e', '#7a4018', '#a86028', '#d08a48'],
    metal: ['#20242c', '#4a5260', '#7a8494', '#aab4c4', '#e0e8f0'], coral: ['#4a1010', '#8a2a20', '#d0503a', '#f07a5a', '#ffb090'],
    azul: ['#0a2040', '#1a4a80', '#2a78c0', '#5aa8f0', '#a8dcff'], cabelo: ['#140a04', '#2a1608', '#4a2a10', '#6e4220', '#946034'],
  };
  const D = '#1a1a2e';
  const BOSS_DRAW = {
    osvaldo(b, f) {
      cyl(b, 40, 94, 13, 20, RP.marrom, -1); cyl(b, 59, 94, 13, 20, RP.marrom, -1);
      ell(b, 46, 115, 8, 3.5, RP.preto); ell(b, 66, 115, 8, 3.5, RP.preto);
      ell(b, 56, 76, 31, 27, RP.marrom);
      poly(b, [[47, 50], [65, 50], [56, 80]], RP.branco);
      poly(b, [[54, 53], [58, 53], [61, 79], [56, 85], [51, 79]], RP.verm);
      rect(b, 27, 92, 58, 3, RP.preto[1]); rect(b, 53, 92, 6, 3, RP.ouro[3]);
      ell(b, 56, 72, 27, 8, RP.marrom, 1); ell(b, 33, 72, 6, 6, RP.pele1); ell(b, 79, 70, 6, 6, RP.pele1);
      box(b, 80, 56, 11, 13, RP.branco, 0, 1); rect(b, 91, 59, 3, 6, RP.branco[2]);
      cyl(b, 47, 43, 18, 9, RP.pele1, -1);
      ell(b, 39, 34, 3, 5, RP.pele1); ell(b, 73, 34, 3, 5, RP.pele1, -1);
      ell(b, 56, 32, 17, 18, RP.pele1); ell(b, 45, 43, 7, 5, RP.pele1); ell(b, 67, 43, 7, 5, RP.pele1, -1);
      ell(b, 41, 28, 4, 8, RP.grisalho); ell(b, 71, 28, 4, 8, RP.grisalho, -1);
      outl(b);
      px(b, [[50, 17], [51, 16], [52, 16], [53, 17]], RP.pele1[4]);
      line(b, 44, 25, 52, 28, D, 2); line(b, 60, 28, 68, 25, D, 2);
      rect(b, 48, 30, 3, 3, '#ffffff'); rect(b, 61, 30, 3, 3, '#ffffff'); rect(b, 49, 31, 2, 2, D); rect(b, 62, 31, 2, 2, D);
      px(b, [[48, 34], [49, 34], [50, 34], [61, 34], [62, 34], [63, 34]], RP.pele1[1]);
      ell(b, 56, 36, 3, 3, RP.pele1, 1);
      ell(b, 56, 41, 10, 3, RP.grisalho);
      line(b, 51, 46, 61, 46, '#5a1a1a'); st(b, 50, 47, '#5a1a1a'); st(b, 62, 47, '#5a1a1a');
      px(b, [[83, 60], [84, 60], [86, 60], [83, 62], [85, 62], [86, 62], [87, 62]], RP.verm[2]);
      rect(b, 29, 75, 6, 2, RP.ouro[3]);
      if (f) { px(b, [[41, 22], [42, 21]], '#7fd0ff'); }
    },
    ponto(b, f) {
      for (let i = 0; i < 18; i++) { const y = 96 + i, x = 56 + Math.round(Math.sin(i / 3) * 6); ell(b, x, y, 3, 2, RP.preto); }
      box(b, 24, 16, 64, 82, RP.metal, 0, 4);
      box(b, 30, 22, 52, 34, RP.preto, -1, 2);
      for (let y = 25; y < 53; y++) for (let x = 33; x < 79; x++) st(b, x, y, (y % 3 === 0) ? RP.lcd[1] : RP.lcd[2]);
      const olho = RP.lcd[4];
      if (f) { rect(b, 38, 34, 12, 3, olho); rect(b, 62, 34, 12, 3, olho); }
      else { poly(b, [[37, 30], [50, 34], [50, 39], [37, 39]], olho); poly(b, [[75, 30], [62, 34], [62, 39], [75, 39]], olho); rect(b, 44, 36, 4, 3, RP.lcd[0]); rect(b, 64, 36, 4, 3, RP.lcd[0]); }
      for (let x = 40; x < 72; x += 4) { rect(b, x, 45, 2, 2, olho); rect(b, x + 2, 47, 2, 2, olho); }
      ell(b, 56, 72, 11, 11, RP.verm);
      for (const r of [3, 6, 9]) for (let a = 0; a < 6.28; a += 0.25) st(b, 56 + Math.cos(a) * r, 72 + Math.sin(a) * r * 1.1, RP.verm[0]);
      for (let i = 0; i < 4; i++) box(b, 34 + i * 12, 86, 9, 6, RP.metal, -1, 1);
      line(b, 24, 48, 10, 62, RP.metal[2], 3); ell(b, 9, 64, 4, 4, RP.metal);
      line(b, 87, 48, 100, 58, RP.metal[2], 3); box(b, 96, 50, 12, 16, RP.branco, 0, 0); for (let y = 53; y < 64; y += 3) rect(b, 98, y, 8, 1, RP.cinza[3]);
      outl(b);
      rect(b, 80, 18, 4, 4, f ? RP.verm[1] : RP.verm[4]);
      px(b, [[27, 19], [28, 19], [27, 20]], RP.metal[4]);
    },
    clotilde(b, f) {
      poly(b, [[36, 80], [76, 80], [84, 112], [28, 112]], RP.roxo, -1);
      ell(b, 42, 115, 6, 3, RP.preto); ell(b, 70, 115, 6, 3, RP.preto);
      cyl(b, 36, 46, 40, 38, RP.roxo);
      poly(b, [[48, 46], [64, 46], [56, 60]], RP.branco);
      for (let x = 46; x <= 66; x += 2) st(b, x, 47 + Math.round(Math.abs(56 - x) * 0.6), RP.branco[4]);
      line(b, 94, 110, 108, 10, RP.verm[2], 4); line(b, 95, 108, 107, 14, RP.verm[3], 1);
      poly(b, [[106, 4], [110, 4], [109, 14], [105, 13]], RP.ouro);
      ell(b, 84, 70, 6, 13, RP.roxo, -1); ell(b, 92, 62, 5, 5, RP.pele1);
      box(b, 12, 60, 20, 26, RP.verde, -1, 1); rect(b, 14, 62, 16, 1, RP.ouro[3]); rect(b, 14, 83, 16, 1, RP.ouro[3]);
      ell(b, 32, 72, 6, 13, RP.roxo); ell(b, 30, 84, 5, 4, RP.pele1);
      cyl(b, 50, 38, 12, 9, RP.pele1, -1);
      ell(b, 56, 28, 14, 16, RP.pele1);
      ell(b, 56, 8, 10, 7, RP.grisalho); ell(b, 56, 17, 17, 8, RP.grisalho); ell(b, 41, 26, 4, 10, RP.grisalho); ell(b, 71, 26, 4, 10, RP.grisalho, -1);
      outl(b);
      const G = RP.rosa[1];
      for (const x0 of [44, 58]) { rect(b, x0, 26, 10, 1, G); rect(b, x0, 31, 10, 1, G); rect(b, x0, 26, 1, 6, G); rect(b, x0 + 9, 26, 1, 6, G); st(b, x0 + (x0 < 56 ? 0 : 9), 25, G); }
      rect(b, 54, 27, 4, 1, G);
      line(b, 44, 31, 40, 44, RP.ouro[3]); line(b, 67, 31, 72, 44, RP.ouro[3]);
      if (f) { rect(b, 47, 29, 4, 1, D); rect(b, 61, 29, 4, 1, D); } else { rect(b, 48, 28, 2, 2, D); rect(b, 62, 28, 2, 2, D); }
      line(b, 45, 23, 52, 24, D); line(b, 60, 22, 67, 21, D);
      rect(b, 52, 38, 8, 1, '#7a2a3a'); st(b, 51, 37, '#7a2a3a');
    },
    leao(b, f) {
      cyl(b, 40, 98, 12, 14, RP.marinho, -1); cyl(b, 60, 98, 12, 14, RP.marinho, -1);
      ell(b, 45, 114, 8, 4, RP.ouro, -1); ell(b, 67, 114, 8, 4, RP.ouro, -1);
      cyl(b, 30, 62, 52, 40, RP.marinho);
      poly(b, [[48, 62], [64, 62], [56, 84]], RP.branco); poly(b, [[54, 64], [58, 64], [60, 84], [56, 88], [52, 84]], RP.ouro);
      for (let a = 0; a < 6.28; a += 0.45) ell(b, 56 + Math.cos(a) * 30, 38 + Math.sin(a) * 27, 9, 9, RP.laranja);
      ell(b, 56, 38, 31, 28, RP.laranja);
      ell(b, 26, 76, 7, 15, RP.marinho); ell(b, 24, 92, 6, 5, RP.ouro);
      ell(b, 88, 74, 7, 15, RP.marinho, -1); cyl(b, 92, 52, 6, 16, RP.madeira); box(b, 86, 66, 18, 8, RP.verm, 0, 1); ell(b, 92, 50, 5, 4, RP.madeira);
      ell(b, 38, 18, 6, 6, RP.ouro); ell(b, 74, 18, 6, 6, RP.ouro, -1);
      ell(b, 56, 38, 21, 19, RP.ouro); ell(b, 56, 48, 13, 9, RP.ouro, 1);
      poly(b, [[34, 23], [78, 23], [82, 30], [30, 30]], RP.verde);
      outl(b);
      poly(b, [[52, 43], [60, 43], [56, 48]], '#3a1a10');
      rect(b, 49, 51, 14, 4, '#3a0a10'); px(b, [[50, 51], [51, 52], [61, 51], [60, 52], [53, 51], [56, 51], [59, 51]], '#ffffff');
      const o = f ? 1 : 2;
      rect(b, 44, 34, 6, o, '#ffd23a'); rect(b, 62, 34, 6, o, '#ffd23a'); if (!f) { st(b, 47, 34, D); st(b, 47, 35, D); st(b, 65, 34, D); st(b, 65, 35, D); }
      line(b, 42, 31, 50, 33, D, 2); line(b, 62, 33, 70, 31, D, 2);
      rect(b, 89, 70, 12, 1, '#ffffff');
    },
    cliente(b, f) {
      cyl(b, 42, 98, 10, 12, RP.pele1, -1); cyl(b, 60, 98, 10, 12, RP.pele1, -1);
      ell(b, 46, 113, 8, 4, RP.branco); ell(b, 66, 113, 8, 4, RP.branco, -1);
      box(b, 36, 86, 40, 14, RP.bege, 0, 1);
      cyl(b, 34, 48, 44, 42, RP.coral);
      rect(b, 46, 48, 20, 4, RP.branco[3]); rect(b, 54, 52, 4, 8, RP.coral[1]);
      box(b, 72, 54, 16, 22, RP.azul, 0, 2); rect(b, 74, 60, 12, 1, RP.ouro[3]);
      ell(b, 26, 54, 9, 6, RP.coral); ell(b, 14, 50, 7, 5, RP.coral); ell(b, 6, 48, 4, 4, RP.pele1);
      ell(b, 86, 52, 6, 12, RP.coral, -1); ell(b, 82, 38, 4, 4, RP.pele1); box(b, 80, 26, 6, 12, RP.preto, 0, 1);
      cyl(b, 50, 40, 12, 9, RP.raiva, -1);
      ell(b, 56, 30, 15, 16, RP.raiva);
      ell(b, 56, 16, 14, 6, RP.cabelo); ell(b, 48, 13, 6, 3, RP.preto); ell(b, 64, 13, 6, 3, RP.preto);
      outl(b);
      line(b, 2, 47, 0, 47, RP.pele1[3], 1); st(b, 1, 48, RP.pele1[3]);
      line(b, 46, 24, 53, 27, D, 2); line(b, 59, 27, 66, 24, D, 2);
      rect(b, 48, 29, 3, 2, D); rect(b, 61, 29, 3, 2, D);
      const boca = f ? 3 : 5;
      ell(b, 56, 40, 6, boca / 2 + 1, RP.preto); rect(b, 51, 38, 10, 1, '#ffffff');
      px(b, [[62, 20], [63, 19], [64, 20], [63, 21]], RP.verm[3]);
    },
    conselho(b, f) {
      box(b, 40, 18, 32, 50, RP.verm, -2, 3);
      const pessoa = (cx, cy, pele, roupa, cab, tipo) => {
        cyl(b, cx - 14, cy + 14, 28, 26, roupa);
        poly(b, [[cx - 5, cy + 14], [cx + 5, cy + 14], [cx, cy + 24]], RP.branco);
        cyl(b, cx - 4, cy + 9, 8, 6, pele, -1);
        ell(b, cx, cy, 10, 11, pele);
        if (tipo === 'velho') { ell(b, cx - 9, cy - 2, 3, 6, cab); ell(b, cx + 9, cy - 2, 3, 6, cab, -1); ell(b, cx, cy - 10, 8, 3, cab); }
        if (tipo === 'mulher') { ell(b, cx, cy - 6, 12, 8, cab); ell(b, cx - 10, cy + 2, 3, 8, cab); ell(b, cx + 10, cy + 2, 3, 8, cab, -1); }
        if (tipo === 'careca') { ell(b, cx - 10, cy + 1, 2, 4, cab); ell(b, cx + 10, cy + 1, 2, 4, cab); }
      };
      pessoa(22, 44, RP.pele1, RP.cinza, RP.grisalho, 'velho');
      pessoa(90, 44, RP.pele2, RP.marinho, RP.cabelo, 'careca');
      pessoa(56, 34, RP.pele1, RP.roxo, RP.preto, 'mulher');
      box(b, 2, 78, 108, 30, RP.madeira, 0, 0); rect(b, 2, 78, 108, 3, RP.madeira[4]);
      for (const x of [12, 46, 80]) box(b, x, 84, 20, 6, RP.ouro, 0, 0);
      box(b, 30, 70, 12, 8, RP.branco, 0, 0); box(b, 70, 72, 14, 6, RP.branco, 0, 0);
      outl(b);
      const olhos = (cx, cy, raiva) => { rect(b, cx - 5, cy, 2, 2, D); rect(b, cx + 3, cy, 2, 2, D); if (raiva) { line(b, cx - 7, cy - 3, cx - 3, cy - 1, D); line(b, cx + 3, cy - 1, cx + 7, cy - 3, D); } };
      olhos(22, 44, true); olhos(90, 44, !f); olhos(56, 34, f);
      for (const x0 of [15, 25]) { rect(b, x0 - 1, 43, 5, 1, '#2a2a3a'); }
      rect(b, 18, 50, 8, 1, '#5a1a1a'); rect(b, 85, 49, 10, 2, RP.grisalho[2]); ell(b, 90, 53, 3, 2, RP.preto);
      for (let x = 48; x <= 64; x += 2) st(b, x, 50 + Math.round(Math.abs(56 - x) * 0.3), '#ffffff');
      rect(b, 53, 40, 6, 1, '#7a2a3a');
      line(b, 52, 72, 60, 64, RP.madeira[1], 2); box(b, 58, 60, 7, 5, RP.madeira, 0, 0);
    },
    excel(b, f) {
      box(b, 82, 56, 26, 56, RP.crt, 0, 2); rect(b, 86, 64, 18, 2, RP.crt[0]); rect(b, 86, 72, 18, 2, RP.crt[0]);
      for (let y = 84; y < 104; y += 3) rect(b, 86, y, 18, 1, RP.crt[1]);
      box(b, 34, 74, 24, 8, RP.crt, -1, 0); box(b, 24, 80, 44, 6, RP.crt, 0, 1);
      box(b, 6, 8, 78, 68, RP.crt, 0, 5);
      for (let y = 15; y < 66; y++) for (let x = 13; x < 77; x++) st(b, x, y, (x - 13) % 8 === 0 || (y - 15) % 6 === 0 ? '#9ab0a0' : '#f4fff4');
      rect(b, 13, 15, 64, 5, '#1a3a9a'); rect(b, 72, 16, 3, 3, RP.verm[2]);
      box(b, 6, 96, 70, 14, RP.crt, 0, 2);
      for (let y = 99; y < 108; y += 3) for (let x = 9; x < 73; x += 4) rect(b, x, y, 3, 2, RP.crt[1]);
      if (f) { for (let i = 0; i < 3; i++) ell(b, 30 + i * 14, 4 - i, 5, 4, RP.grisalho, -1); }
      outl(b);
      const E = D;
      if (f) { rect(b, 25, 30, 14, 4, E); rect(b, 51, 30, 14, 4, E); }
      else { poly(b, [[24, 26], [40, 32], [40, 38], [24, 38]], E); poly(b, [[66, 26], [50, 32], [50, 38], [66, 38]], E); rect(b, 33, 33, 4, 4, RP.verm[3]); rect(b, 53, 33, 4, 4, RP.verm[3]); }
      for (let x = 22; x < 68; x += 6) { line(b, x, 52, x + 3, 48, RP.verm[1], 2); line(b, x + 3, 48, x + 6, 52, RP.verm[1], 2); }
      rect(b, 96, 106, 3, 2, f ? RP.verde[3] : RP.verde[1]);
      line(b, 82, 98, 76, 112, RP.preto[2]); ell(b, 76, 114, 4, 3, RP.crt);
    },
    valdemar(b, f) {
      cyl(b, 42, 96, 12, 18, RP.preto, -1); cyl(b, 58, 96, 12, 18, RP.preto, -1);
      ell(b, 47, 115, 8, 3.5, RP.preto, 1); ell(b, 65, 115, 8, 3.5, RP.preto, 1);
      cyl(b, 34, 46, 44, 52, RP.preto);
      for (let x = 37; x < 77; x += 5) for (let y = 48; y < 96; y += 2) st(b, x, y, RP.preto[3]);
      poly(b, [[48, 46], [64, 46], [56, 66]], RP.branco); poly(b, [[54, 48], [58, 48], [60, 70], [56, 74], [52, 70]], RP.verm);
      box(b, 66, 52, 6, 4, RP.ouro, 0, 0);
      ell(b, 30, 70, 6, 16, RP.preto); box(b, 6, 80, 30, 24, RP.marrom, 0, 2); rect(b, 6, 90, 30, 1, RP.marrom[1]); rect(b, 12, 88, 4, 4, RP.ouro[3]); rect(b, 26, 88, 4, 4, RP.ouro[3]); rect(b, 16, 76, 10, 4, RP.marrom[1]);
      ell(b, 82, 66, 6, 13, RP.preto, -1); box(b, 64, 56, 18, 26, RP.bege, 0, 0); rect(b, 64, 60, 4, 6, RP.verm[2]); rect(b, 68, 62, 12, 1, RP.bege[1]); rect(b, 68, 66, 10, 1, RP.bege[1]);
      cyl(b, 50, 38, 12, 9, RP.pele2, -1);
      ell(b, 56, 28, 13, 15, RP.pele2);
      ell(b, 56, 17, 14, 8, RP.preto); ell(b, 43, 24, 3, 6, RP.preto); ell(b, 69, 24, 3, 6, RP.preto, -1);
      outl(b);
      for (let i = 0; i < 4; i++) line(b, 46 + i * 5, 13, 50 + i * 5, 20, RP.preto[4]);
      line(b, 46, 24, 52, 23, D, 1); line(b, 60, 22, 66, 20, D, 1);
      rect(b, 48, 27, 3, 2, D); rect(b, 61, 26, 3, 2, D);
      line(b, 51, 36, 61, 34, '#5a1a1a'); st(b, 62, 33, '#5a1a1a'); if (!f) st(b, 58, 35, RP.ouro[3]);
    },
    auditor(b, f) {
      cyl(b, 44, 92, 10, 22, RP.bege, -1); cyl(b, 58, 92, 10, 22, RP.bege, -1);
      ell(b, 48, 115, 7, 3, RP.marrom); ell(b, 64, 115, 7, 3, RP.marrom);
      cyl(b, 40, 36, 32, 60, RP.bege);
      poly(b, [[50, 36], [62, 36], [56, 52]], RP.branco); poly(b, [[54, 38], [58, 38], [59, 66], [56, 70], [53, 66]], RP.bege, 1);
      ell(b, 36, 60, 5, 18, RP.bege); box(b, 18, 58, 18, 26, RP.madeira, 0, 0); rect(b, 20, 62, 14, 20, RP.branco[3]);
      for (let y = 65; y < 80; y += 3) rect(b, 22, y, 10, 1, RP.cinza[3]); rect(b, 24, 57, 6, 3, RP.metal[3]);
      ell(b, 76, 54, 5, 14, RP.bege, -1); ell(b, 72, 44, 4, 4, RP.pele1); line(b, 70, 46, 64, 58, RP.preto[2], 2);
      cyl(b, 51, 29, 10, 8, RP.pele1, -1);
      ell(b, 56, 20, 11, 14, RP.pele1);
      ell(b, 56, 8, 11, 5, RP.cabelo); ell(b, 46, 13, 2, 5, RP.cabelo);
      outl(b);
      for (const x0 of [47, 58]) { rect(b, x0, 18, 8, 5, '#e8f4ff'); rect(b, x0, 18, 8, 1, '#2a2a3a'); rect(b, x0, 22, 8, 1, '#2a2a3a'); st(b, x0 + 1, 19, '#ffffff'); st(b, x0 + 2, 19, '#ffffff'); }
      rect(b, 55, 19, 3, 1, '#2a2a3a');
      rect(b, 52, 29, 8, 1, '#7a4a3a');
      if (f) { for (let i = 0; i < 4; i++) st(b, 24 + i * 2, 68, D); }
    },
    pendrive(b, f) {
      box(b, 28, 46, 56, 66, RP.roxo, -1, 6);
      rect(b, 34, 52, 3, 50, RP.roxo[4]);
      ell(b, 56, 78, 10, 10, RP.branco); rect(b, 51, 76, 4, 4, D); rect(b, 58, 76, 4, 4, D); rect(b, 54, 84, 5, 3, D); rect(b, 53, 87, 1, 2, RP.branco[2]); rect(b, 57, 87, 1, 2, RP.branco[2]);
      ell(b, 56, 112, 8, 4, RP.metal); clr(b, 56, 112);
      box(b, 34, 8, 44, 40, RP.metal, 0, 1);
      rect(b, 34, 42, 44, 4, RP.metal[1]);
      outl(b);
      rect(b, 40, 18, 10, 9, D); rect(b, 62, 18, 10, 9, D);
      rect(b, 43, 21, 4, 4, f ? RP.verm[2] : RP.verm[4]); rect(b, 65, 21, 4, 4, f ? RP.verm[2] : RP.verm[4]);
      line(b, 38, 14, 50, 17, RP.metal[0], 2); line(b, 62, 17, 74, 14, RP.metal[0], 2);
      for (let x = 42; x < 70; x += 4) { line(b, x, 34, x + 2, 31, D); line(b, x + 2, 31, x + 4, 34, D); }
      rect(b, 76, 54, 3, 3, f ? RP.verm[4] : RP.verm[1]);
    },
    impressora(b, f) {
      box(b, 14, 96, 84, 14, RP.rosa, -1, 1); rect(b, 46, 101, 20, 2, RP.rosa[0]);
      ell(b, 22, 112, 5, 3, RP.preto); ell(b, 90, 112, 5, 3, RP.preto);
      box(b, 8, 38, 96, 60, RP.rosa, 0, 3);
      box(b, 12, 26, 88, 16, RP.rosa, 1, 2);
      rect(b, 22, 72, 68, 8, D);
      poly(b, [[30, 76], [82, 76], [80, 96], [70, 92], [60, 98], [50, 92], [40, 97], [32, 92]], RP.branco);
      for (let y = 80; y < 92; y += 3) rect(b, 36, y, 38, 1, RP.cinza[3]);
      box(b, 66, 44, 30, 12, RP.preto, 0, 0);
      rect(b, 16, 58, 6, 6, '#20d0e0'); rect(b, 23, 58, 6, 6, '#ff40a0'); rect(b, 30, 58, 6, 6, '#ffe040'); rect(b, 37, 58, 6, 6, '#20202a');
      if (f) { ell(b, 30, 18, 6, 5, RP.grisalho, -1); ell(b, 40, 12, 5, 4, RP.grisalho, -1); }
      outl(b);
      rect(b, 16, 58, 6, 6, RP.cinza[2]);
      const lcd = f ? '#ff9a2a' : '#ffd23a'; for (let i = 0; i < 4; i++) rect(b, 69 + i * 6, 47, 4, 6, lcd);
      ell(b, 32, 48, 7, 6, RP.branco); ell(b, 52, 48, 7, 6, RP.branco);
      rect(b, 32, 47, 3, 3, D); rect(b, 50, 47, 3, 3, D);
      line(b, 24, 39, 36, 43, D, 2); line(b, 48, 43, 60, 39, D, 2);
    },
    ceo(b, f) {
      box(b, 22, 2, 68, 100, RP.preto, 0, 6); rect(b, 22, 2, 68, 3, RP.ouro[3]); rect(b, 24, 6, 2, 92, RP.ouro[2]); rect(b, 86, 6, 2, 92, RP.ouro[2]);
      for (let y = 12; y < 90; y += 10) for (let x = 32; x < 82; x += 10) ell(b, x, y, 1.5, 1.5, RP.preto, 2);
      box(b, 12, 70, 16, 34, RP.preto, 1, 2); box(b, 84, 70, 16, 34, RP.preto, 1, 2);
      box(b, 40, 88, 34, 12, RP.marinho, 0, 2); cyl(b, 42, 98, 10, 14, RP.marinho, -1); cyl(b, 62, 98, 10, 14, RP.marinho, -1);
      ell(b, 46, 114, 8, 3.5, RP.preto, 1); ell(b, 67, 114, 8, 3.5, RP.preto, 1);
      cyl(b, 36, 42, 40, 50, RP.marinho);
      for (let x = 39; x < 74; x += 5) for (let y = 44; y < 90; y += 2) st(b, x, y, RP.marinho[3]);
      poly(b, [[48, 42], [64, 42], [56, 62]], RP.branco); poly(b, [[54, 44], [58, 44], [60, 66], [56, 70], [52, 66]], RP.ouro);
      ell(b, 34, 66, 6, 14, RP.marinho); ell(b, 78, 66, 6, 14, RP.marinho, -1);
      ell(b, 50, 76, 6, 5, RP.pele1); ell(b, 62, 76, 6, 5, RP.pele1, -1); poly(b, [[52, 72], [60, 72], [56, 64]], RP.pele1);
      cyl(b, 50, 34, 12, 9, RP.pele1, -1);
      ell(b, 56, 24, 12, 14, RP.pele1);
      ell(b, 56, 13, 13, 7, RP.grisalho); ell(b, 44, 20, 3, 6, RP.grisalho); ell(b, 68, 20, 3, 6, RP.grisalho, -1);
      outl(b);
      rect(b, 46, 22, 9, 4, D); rect(b, 57, 22, 9, 4, D); rect(b, 55, 23, 2, 1, D);
      st(b, 47, 22, '#ffffff'); if (!f) st(b, 58, 22, '#ffffff');
      line(b, 52, 31, 60, 30, '#5a2a2a'); st(b, 61, 29, '#5a2a2a');
      rect(b, 41, 80, 3, 2, RP.ouro[3]); rect(b, 69, 80, 3, 2, RP.ouro[3]);
    },
  };
  // Enzo, o Filho do Dono: colete puffer, moletom, topete, óculos na cabeça, fone sem fio, selfie e café gelado
  BOSS_DRAW.filho = function (b, f) {
    cyl(b, 42, 92, 11, 18, RP.azul, -1); cyl(b, 59, 92, 11, 18, RP.azul, -1);
    for (let y = 96; y < 108; y += 4) { st(b, 45, y, RP.azul[4]); st(b, 63, y + 2, RP.azul[4]); }
    ell(b, 46, 113, 9, 4.5, RP.branco); ell(b, 66, 113, 9, 4.5, RP.branco, -1); rect(b, 38, 114, 17, 2, RP.verm[2]); rect(b, 58, 114, 17, 2, RP.verm[2]);
    cyl(b, 38, 50, 36, 46, RP.cinza, 1);
    box(b, 30, 50, 16, 44, RP.laranja, 0, 3); box(b, 66, 50, 16, 44, RP.laranja, -1, 3);
    for (let y = 56; y < 92; y += 6) { rect(b, 31, y, 14, 1, RP.laranja[1]); rect(b, 67, y, 14, 1, RP.laranja[1]); }
    rect(b, 46, 52, 2, 40, RP.preto[2]); rect(b, 64, 52, 2, 40, RP.preto[2]);
    poly(b, [[48, 50], [64, 50], [56, 58]], RP.cinza, 2);
    ell(b, 92, 46, 6, 14, RP.laranja, -1); ell(b, 94, 30, 5, 5, RP.pele1);
    box(b, 90, 12, 11, 20, RP.preto, 0, 1);
    ell(b, 22, 76, 6, 14, RP.laranja); ell(b, 22, 90, 5, 5, RP.pele1);
    box(b, 15, 76, 13, 18, RP.bege, 1, 1); rect(b, 16, 74, 11, 2, RP.branco[3]);
    cyl(b, 50, 40, 12, 10, RP.pele1, -1);
    ell(b, 56, 30, 13, 15, RP.pele1);
    ell(b, 43, 31, 3, 5, RP.pele1); ell(b, 69, 31, 3, 5, RP.pele1, -1);
    ell(b, 56, 14, 13, 8, RP.cabelo); ell(b, 60, 8, 10, 6, RP.cabelo, 1); ell(b, 44, 22, 2, 5, RP.cabelo, -2); ell(b, 68, 22, 2, 5, RP.cabelo, -2);
    outl(b);
    rect(b, 45, 15, 9, 4, D); rect(b, 58, 15, 9, 4, D); rect(b, 54, 16, 4, 1, D); st(b, 46, 15, '#ffffff'); st(b, 59, 15, '#ffffff');
    rect(b, 42, 31, 2, 3, '#ffffff'); rect(b, 69, 31, 2, 3, '#ffffff');
    line(b, 47, 24, 53, 23, D); line(b, 59, 22, 65, 24, D);
    rect(b, 48, 27, 3, 2, D); rect(b, 61, 27, 3, 2, D); st(b, 48, 27, '#ffffff'); st(b, 61, 27, '#ffffff');
    line(b, 52, 36, 59, 36, '#7a2a2a'); line(b, 59, 36, 62, 34, '#7a2a2a');
    for (let x = 48; x <= 64; x++) st(b, x, 51 + Math.round(Math.abs(56 - x) * 0.35), RP.ouro[x % 2 ? 3 : 2]);
    rect(b, 92, 14, 7, 15, f ? '#80d0ff' : '#c0e8ff'); rect(b, 94, 17, 3, 3, '#ffd23a'); rect(b, 93, 24, 5, 1, '#ff40a0');
    rect(b, 17, 80, 9, 12, '#6a4020'); rect(b, 17, 80, 9, 3, '#a87040'); rect(b, 22, 64, 1, 12, '#2fbf71'); ell(b, 21, 86, 2.5, 2.5, RP.verde, 1);
    if (f) { rect(b, 103, 8, 2, 2, '#ffffff'); rect(b, 106, 11, 2, 2, '#ffffff'); }
  };
  const cacheBoss = {};
  function bossCanvas(id, f = 0) {
    const k = id + f; if (cacheBoss[k]) return cacheBoss[k];
    const b = Bf(112, 120); BOSS_DRAW[id](b, f);
    return (cacheBoss[k] = toCanvas(b));
  }
  const cacheBossBranco = {};
  function bossBranco(id) { return cacheBossBranco[id] || (cacheBossBranco[id] = branco(bossCanvas(id, 0))); }
  const AURA = { osvaldo: '#ff9a3a', ponto: '#5aff70', clotilde: '#c080ff', leao: '#ffd040', cliente: '#ff5a5a', conselho: '#ff4060', excel: '#40ff90', valdemar: '#a0a0ff', auditor: '#e8dcb0', pendrive: '#b040ff', impressora: '#ff70c0', ceo: '#ffe060', filho: '#40e0ff' };

  /* ---------- CENÁRIOS 320x180 ---------- */
  function cena(w = 320, h = 180) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); return { cv, g }; }
  function painter(g) {
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const Dz = (x0, y0, w, h, c1, c2, fn) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { g.fillStyle = fn(x - x0, y - y0) > BY[y & 1][x & 1] ? c2 : c1; g.fillRect(x, y, 1, 1); } };
    const grad = (x, y, w, h, cores) => { const n = cores.length - 1; for (let j = 0; j < h; j++) { const v = j / h * n; for (let i = 0; i < w; i++) { let k = Math.floor(v); if (v - k > BY[(y + j) & 1][(x + i) & 1]) k++; g.fillStyle = cores[Math.min(n, k)]; g.fillRect(x + i, y + j, 1, 1); } } };
    const piso = (y, c1, c2, c3, t = 16) => { for (let yy = y; yy < 180; yy += t / 2) for (let x = 0; x < 320; x += t) { const o = ((x / t) + Math.floor((yy - y) / (t / 2))) % 2; R(x, yy, t, t / 2, o ? c1 : c2); R(x, yy, t, 1, c3); } };
    const janela = (x, y, w, h, noite) => { R(x - 2, y - 2, w + 4, h + 4, '#2f5f8f'); grad(x, y, w, h, noite ? ['#0a1030', '#1a2a5a', '#2a3a70'] : ['#5ab0e8', '#8ad0f8', '#c8f0ff']); R(x + (w >> 1) - 1, y, 2, h, '#2f5f8f'); R(x, y + (h >> 1), w, 2, '#2f5f8f'); if (!noite) { R(x + 4, y + 4, 8, 3, '#fff'); R(x + 2, y + 5, 12, 2, '#fff'); } else for (let i = 0; i < 8; i++) R(x + ((i * 37) % w), y + ((i * 23) % (h >> 1)), 1, 1, '#ffffa0'); };
    const mesa = (x, y, w) => { R(x, y, w, 4, '#c0703a'); R(x, y, w, 1, '#e8a060'); R(x + 2, y + 4, 2, 12, '#7a4018'); R(x + w - 4, y + 4, 2, 12, '#7a4018'); R(x + 2, y + 4, w - 4, 6, '#a85e2e'); };
    const pc = (x, y) => { R(x, y, 14, 11, '#2a2f45'); R(x + 1, y + 1, 12, 8, '#80ffcb'); for (let i = y + 2; i < y + 9; i += 2) R(x + 1, i, 12, 1, '#5ae0a8'); R(x + 6, y + 11, 2, 2, '#2a2f45'); R(x + 3, y + 13, 8, 1, '#3a3f55'); };
    const planta = (x, y) => { R(x, y + 10, 10, 9, '#e07a3a'); R(x, y + 10, 3, 9, '#ff9a5a'); [[1, 4, 5, 6], [5, 2, 5, 7], [2, -1, 4, 5], [-2, 5, 4, 4], [7, 6, 4, 4]].forEach(([a, b2, w, h]) => { R(x + a, y + b2, w, h, '#1f8f51'); R(x + a, y + b2, w - 1, h - 1, '#2fbf71'); R(x + a, y + b2, 2, 1, '#7fe8a8'); }); };
    const sombra = (x, y, w) => { g.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < w; i++) { const hh = Math.round(Math.sqrt(1 - Math.pow(i / w * 2 - 1, 2)) * 3); g.fillRect(x + i, y - hh, 1, hh * 2 + 1); } };
    const placa = (x, y, s, fundo, cor, esc = 1) => { const w = larguraTexto(s, esc) + 6; R(x, y, w, 5 * esc + 6, '#1a1a2e'); R(x + 1, y + 1, w - 2, 5 * esc + 4, fundo); texto(g, s, x + 3, y + 3, cor, esc); return w; };
    const vinheta = (forca = 0.5) => { for (let y = 0; y < 180; y++) for (let x = 0; x < 320; x++) { const dx = (x - 160) / 160, dy = (y - 90) / 90, d = dx * dx + dy * dy; if (d > 0.7 && (d - 0.7) * forca * 2 > BY[y & 1][x & 1]) { g.fillStyle = 'rgba(10,6,24,0.55)'; g.fillRect(x, y, 1, 1); } } };
    return { R, Dz, grad, piso, janela, mesa, pc, planta, sombra, placa, vinheta };
  }
  const CENAS = {
    fachada(p, g) {
      p.grad(0, 0, 320, 120, ['#3a2a8a', '#6a4ab8', '#e0709a', '#ffb070', '#ffe0a0']);
      g.fillStyle = '#fff0b0'; for (let a = 0; a < 6.28; a += 0.1) for (let r = 0; r < 14; r++) g.fillRect(250 + Math.cos(a) * r, 92 + Math.sin(a) * r, 1, 1);
      for (let i = 0; i < 12; i++) { const x = i * 28, h = 30 + ((i * 37) % 40); p.R(x, 120 - h, 26, h, '#4a3a7a'); for (let y = 124 - h; y < 116; y += 6) for (let xx = x + 3; xx < x + 23; xx += 6) if ((xx + y) % 3) p.R(xx, y, 2, 3, '#ffd070'); }
      p.R(40, 50, 240, 90, '#e8d0a8'); p.R(40, 50, 240, 4, '#c8a878'); p.R(36, 46, 248, 6, '#a05a3a');
      p.R(70, 26, 180, 26, '#1a1a2e'); p.R(72, 28, 176, 22, '#e63946'); texto(g, 'BOA FOLHA', 86, 31, '#ffd166', 3);
      for (const x of [60, 110, 200, 250]) { p.R(x, 66, 30, 26, '#2f5f8f'); p.grad(x + 2, 68, 26, 22, ['#8ad0f8', '#c8f0ff']); p.R(x + 14, 68, 2, 22, '#2f5f8f'); }
      p.R(146, 74, 30, 66, '#7a4018'); p.R(148, 76, 26, 64, '#a86028'); p.R(169, 108, 3, 3, '#ffd166');
      p.placa(130, 58, 'DISTRIBUIDORA', '#ffd166', '#1a1a2e');
      for (let x = 0; x < 320; x += 4) p.R(x, 140, 2, 1, '#8a8aa0');
      p.R(0, 140, 320, 40, '#5a5a70'); for (let x = 0; x < 320; x += 24) p.R(x, 158, 12, 2, '#ffe080');
      p.R(10, 104, 76, 34, '#f4f4f4'); p.R(10, 104, 76, 3, '#2a78c0'); texto(g, 'PAPEL', 22, 116, '#2a78c0', 2); p.R(86, 114, 22, 24, '#e63946'); p.R(90, 118, 12, 8, '#a8dcff');
      for (const x of [24, 74, 96]) { g.fillStyle = '#1a1a2e'; g.fillRect(x - 5, 136, 10, 6); g.fillStyle = '#5a5a70'; g.fillRect(x - 2, 138, 4, 2); }
      p.planta(292, 112); p.planta(8, 150 - 30);
    },
    escritorio(p, g) {
      p.R(0, 0, 320, 104, '#7ec8e3'); p.grad(0, 0, 320, 10, ['#5aa8cc', '#7ec8e3']);
      for (let x = 0; x < 320; x += 20) p.R(x, 10, 1, 90, '#6ab8d6');
      p.R(0, 100, 320, 4, '#2f6f9f'); p.R(0, 100, 320, 1, '#4a9fc0');
      p.piso(104, '#f4c06a', '#e8a84a', '#ffd98a');
      p.janela(14, 18, 50, 36); p.janela(250, 18, 50, 36);
      p.placa(96, 8, 'DISTRIBUIDORA BOA FOLHA', '#ffd166', '#e63946');
      p.R(80, 26, 22, 28, '#e09a2a'); p.R(81, 27, 20, 26, '#ffd166'); p.R(83, 29, 16, 4, '#e63946'); texto(g, 'META', 84, 35, '#1a1a2e'); p.R(84, 46, 3, 4, '#2fbf71'); p.R(89, 42, 3, 8, '#2fbf71'); p.R(94, 38, 3, 12, '#2fbf71');
      p.R(116, 30, 12, 12, '#1a1a2e'); p.R(117, 31, 10, 10, '#ffffff'); p.R(121, 32, 1, 5, '#1a1a2e'); p.R(121, 36, 4, 1, '#e63946');
      p.R(140, 22, 46, 30, '#f4f4f4'); p.R(140, 22, 46, 2, '#8a8a9a'); texto(g, 'REUNIAO', 146, 27, '#2a5cb8'); texto(g, '9H 10H 11H', 144, 36, '#e63946'); p.R(146, 44, 30, 1, '#2fbf71');
      p.R(200, 26, 30, 50, '#7a4018'); p.R(202, 28, 26, 48, '#a86028'); p.R(224, 50, 2, 3, '#ffd166'); p.placa(204, 32, 'RH', '#ffffff', '#e63946', 2);
      [16, 66, 116].forEach(x => { p.mesa(x, 86, 40); p.pc(x + 4, 74); p.R(x + 24, 80, 10, 6, '#f4f4f4'); p.R(x + 22, 82, 10, 4, '#ff6b6b'); });
      p.R(234, 64, 26, 36, '#ff9ac0'); p.R(234, 64, 26, 4, '#e06a9a'); p.R(238, 74, 18, 3, '#1a1a2e'); p.R(240, 76, 14, 8, '#ffffff'); p.R(250, 68, 6, 3, '#ffd23a');
      p.R(272, 60, 14, 40, '#d0e8f8'); p.R(274, 46, 10, 14, '#7ac8f0'); p.R(275, 47, 3, 12, '#b8e8ff'); p.R(276, 70, 6, 2, '#2a78c0');
      p.planta(296, 81); p.planta(4, 81);
    },
    mercado(p, g) {
      p.R(0, 0, 320, 104, '#c8a8e8'); for (let x = 0; x < 320; x += 16) p.R(x, 0, 8, 104, '#bc9ade');
      p.R(0, 100, 320, 4, '#6a3aa8'); p.piso(104, '#e8d8b0', '#d8c498', '#f4ead0');
      p.placa(110, 8, 'MERCADO DE TALENTOS', '#ffd166', '#6a3aa8');
      p.R(20, 24, 70, 50, '#a86028'); p.R(22, 26, 66, 46, '#d8b880'); texto(g, 'VAGAS', 40, 29, '#e63946');
      [['#ffe060', 26, 38], ['#80e0ff', 48, 40], ['#ff9ac0', 66, 37], ['#a0f0a0', 30, 54], ['#ffb070', 56, 55]].forEach(([c, x, y]) => { p.R(x, y, 16, 13, c); p.R(x + 2, y + 3, 10, 1, '#888'); p.R(x + 2, y + 6, 8, 1, '#888'); p.R(x + 7, y - 1, 2, 2, '#e63946'); });
      p.R(220, 64, 90, 36, '#7a4018'); p.R(220, 64, 90, 4, '#c0703a'); p.R(256, 58, 10, 6, '#ffd166'); p.R(259, 55, 4, 3, '#e0a020');
      p.janela(116, 24, 50, 34); p.janela(176, 24, 30, 34);
      for (let i = 0; i < 6; i++) { const x = 18 + i * 32; p.R(x, 112, 22, 4, '#2a78c0'); p.R(x, 100, 22, 12, '#3a8ee0'); p.R(x + 2, 116, 2, 8, '#1a3a7a'); p.R(x + 18, 116, 2, 8, '#1a3a7a'); }
      p.planta(296, 81);
    },
    treino(p, g) {
      p.R(0, 0, 320, 104, '#5b3fa0'); p.grad(0, 0, 320, 104, ['#3a2470', '#5b3fa0', '#6e52b8']);
      for (let x = 6; x < 320; x += 12) { const c = ['#ffd166', '#ff6b6b', '#5ab4ff', '#7fe8a8'][(x / 12 | 0) % 4]; p.R(x, 4, 4, 4, c); p.R(x, 96, 4, 4, c); }
      p.R(60, 16, 200, 74, '#1a1a2e'); p.R(62, 18, 196, 70, '#f4f8f4');
      p.R(0, 100, 320, 4, '#2b1f5c'); p.piso(104, '#3a2470', '#2b1f5c', '#5b3fa0');
      for (let i = 0; i < 5; i++) { const x = 30 + i * 60; p.R(x, 140, 30, 4, '#ffd166'); p.R(x + 2, 144, 4, 20, '#e09a2a'); p.R(x + 24, 144, 4, 20, '#e09a2a'); p.R(x, 126, 30, 14, '#ff6b6b'); }
    },
    reuniao(p, g) {
      p.R(0, 0, 320, 104, '#a8d8b8'); for (let x = 0; x < 320; x += 24) p.R(x, 0, 2, 104, '#90c8a4');
      p.R(0, 100, 320, 4, '#2a6a48'); p.piso(104, '#8a6a4a', '#7a5a3a', '#a08060');
      p.janela(20, 18, 70, 44, false); p.janela(230, 18, 70, 44, false);
      p.R(118, 14, 84, 52, '#1a1a2e'); p.R(121, 17, 78, 46, '#20304a'); texto(g, 'PAUTA DO MES', 128, 21, '#ffd166');
      for (let i = 0; i < 6; i++) p.R(130 + i * 10, 56 - i * 4 - (i % 2) * 3, 6, 4 + i * 4 + (i % 2) * 3, i % 2 ? '#ff6b6b' : '#7fe8a8');
      p.R(40, 118, 240, 30, '#7a4018'); p.R(40, 118, 240, 4, '#c0703a'); p.R(44, 148, 6, 20, '#4e260e'); p.R(270, 148, 6, 20, '#4e260e');
      for (let i = 0; i < 7; i++) p.R(54 + i * 32, 110, 18, 8, '#2a2f45');
      p.R(146, 106, 8, 12, '#c0c8d0'); p.R(148, 103, 4, 3, '#1a1a2e'); p.R(162, 112, 6, 6, '#ffffff');
    },
    entrevista(p, g) { CENAS.escritorio(p, g); },
    arena_diretoria(p, g) {
      p.R(0, 0, 320, 120, '#3a1a10'); for (let x = 0; x < 320; x += 22) { p.R(x, 0, 20, 120, '#4e2610'); p.R(x + 2, 6, 16, 50, '#5e3018'); p.R(x + 2, 64, 16, 50, '#5e3018'); }
      p.janela(110, 12, 100, 60, true);
      for (let i = 0; i < 9; i++) { const x = 112 + i * 11, h = 12 + ((i * 29) % 30); p.R(x, 72 - h, 9, h, '#101828'); for (let y = 74 - h; y < 70; y += 4) p.R(x + 2 + (y % 3), y, 1, 2, '#ffd070'); }
      p.R(0, 120, 320, 60, '#801a2a'); p.Dz(0, 120, 320, 60, '#6a1020', '#801a2a', (x, y) => y / 60);
    },
    arena_entrada(p, g) {
      p.R(0, 0, 320, 118, '#384a6a'); for (let x = 0; x < 320; x += 40) { p.R(x, 0, 2, 118, '#2a3a58'); p.grad(x + 6, 10, 28, 80, ['#5a8ab8', '#8ac0e8', '#5a8ab8']); }
      p.R(0, 116, 320, 64, '#c8c8d0'); for (let y = 116; y < 180; y += 10) for (let x = (y / 10 % 2) * 10; x < 320; x += 20) p.R(x, y, 10, 10, '#b0b0bc');
      for (const x of [30, 70]) { p.R(x, 96, 8, 30, '#7a8494'); p.R(x - 4, 94, 16, 6, '#aab4c4'); p.R(x + 8, 108, 18, 3, '#e0e8f0'); }
    },
    arena_contabil(p, g) {
      p.R(0, 0, 320, 120, '#2a2a3a');
      for (let x = 0; x < 320; x += 34) { p.R(x + 2, 20, 30, 96, '#6a7080'); for (let y = 24; y < 112; y += 22) { p.R(x + 4, y, 26, 18, '#8a90a0'); p.R(x + 13, y + 7, 8, 3, '#d0d8e4'); } }
      p.R(0, 120, 320, 60, '#4a4030'); p.Dz(0, 120, 320, 60, '#3a3020', '#4a4030', (x, y) => y / 60);
      for (let i = 0; i < 5; i++) { const x = 20 + i * 66; for (let k = 0; k < 4 + i % 3; k++) p.R(x + (k % 2), 150 - k * 3, 20, 3, k % 2 ? '#f0f0f0' : '#e0e0d0'); }
    },
    arena_ti(p, g) {
      p.R(0, 0, 320, 120, '#0a1428');
      for (let x = 4; x < 320; x += 38) { p.R(x, 12, 32, 106, '#1a2440'); for (let y = 16; y < 114; y += 7) { p.R(x + 2, y, 28, 5, '#28344f'); p.R(x + 4 + ((x + y) % 18), y + 2, 2, 1, (x + y) % 3 ? '#40ff90' : '#ff4060'); } }
      p.R(0, 118, 320, 62, '#101a30'); for (let y = 118; y < 180; y += 12) p.R(0, y, 320, 1, '#1a2a4a'); for (let x = 0; x < 320; x += 24) p.R(x, 118, 1, 62, '#1a2a4a');
    },
    arena_almox(p, g) {
      p.R(0, 0, 320, 120, '#4a3a2a');
      for (let x = 0; x < 320; x += 64) { p.R(x + 4, 10, 4, 108, '#e0a020'); p.R(x + 58, 10, 4, 108, '#e0a020'); for (let y = 30; y < 118; y += 28) { p.R(x + 4, y, 58, 3, '#e07a20'); for (let k = 0; k < 3; k++) p.R(x + 10 + k * 16, y - 14, 14, 14, k % 2 ? '#c09060' : '#d8a870'); } }
      p.R(0, 118, 320, 62, '#6a6a70'); p.Dz(0, 118, 320, 62, '#5a5a60', '#6a6a70', (x, y) => y / 62); for (let x = 0; x < 320; x += 30) p.R(x, 150, 16, 2, '#ffe080');
    },
    arena_loja(p, g) {
      p.R(0, 0, 320, 120, '#ff9ac0'); for (let x = 0; x < 320; x += 20) p.R(x, 0, 10, 120, '#ffaacc');
      for (let x = 10; x < 320; x += 50) { p.R(x, 30, 40, 4, '#7a4018'); p.R(x, 60, 40, 4, '#7a4018'); p.R(x, 90, 40, 4, '#7a4018'); for (let k = 0; k < 4; k++) { p.R(x + 2 + k * 10, 20, 8, 10, ['#e63946', '#2a78c0', '#ffd23a', '#2fbf71'][k]); p.R(x + 2 + k * 10, 50, 8, 10, ['#ffd23a', '#7a4ad0', '#e63946', '#2a78c0'][k]); } }
      p.placa(116, 100, 'VOLTA AS AULAS', '#ffd166', '#e63946');
      p.R(0, 118, 320, 62, '#e8d8b0'); for (let y = 118; y < 180; y += 8) for (let x = (y / 8 % 2) * 8; x < 320; x += 16) p.R(x, y, 8, 8, '#d8c498');
    },
    arena_board(p, g) {
      p.grad(0, 0, 320, 120, ['#20103a', '#5a2a6a', '#c0506a', '#ffa060']);
      for (let i = 0; i < 16; i++) { const x = i * 20, h = 30 + ((i * 41) % 50); p.R(x, 120 - h, 18, h, '#1a1030'); for (let y = 124 - h; y < 116; y += 5) for (let xx = x + 3; xx < x + 16; xx += 4) if ((xx * y) % 7 < 3) p.R(xx, y, 1, 2, '#ffd070'); }
      p.R(0, 118, 320, 62, '#2a1a10'); p.Dz(0, 118, 320, 62, '#1a0e08', '#3a2414', (x, y) => y / 62);
      for (let x = 0; x < 320; x += 8) p.R(x, 118, 4, 1, '#d09a10');
    },
  };
  const ARENA_DO_CHEFE = { osvaldo: 'arena_diretoria', ponto: 'arena_entrada', clotilde: 'arena_contabil', leao: 'arena_contabil', cliente: 'arena_loja', conselho: 'arena_board', excel: 'arena_ti', valdemar: 'arena_diretoria', auditor: 'arena_contabil', pendrive: 'arena_ti', impressora: 'arena_almox', ceo: 'arena_board' };
  const cacheCena = {};
  function cenaCanvas(nome) {
    if (cacheCena[nome]) return cacheCena[nome];
    const { cv, g } = cena(); const p = painter(g); CENAS[nome](p, g);
    if (nome.startsWith('arena_')) p.vinheta(0.6);
    if (nome === 'entrevista') { // desfoque estilo "câmera de documentário"
      const t = document.createElement('canvas'); t.width = 80; t.height = 45; const tg = t.getContext('2d'); tg.drawImage(cv, 0, 0, 80, 45);
      g.imageSmoothingEnabled = false; g.drawImage(t, 0, 0, 320, 180); g.fillStyle = 'rgba(20,10,40,0.35)'; g.fillRect(0, 0, 320, 180);
    }
    return (cacheCena[nome] = cv);
  }

  /* ---------- "VÍDEO" DE QUEM ESTÁ EM CASA (64x40, animado) ---------- */
  function miniPessoa(g, id, x, y, o = {}) { // cabeça 8x8 + tronco; o: {olhos:'abertos'|'fechados', sem:'tronco', oculos:true}
    const l = LOOKS[id], [sk, sd] = PELES[l.pele], c = l.cc, R = (a, b, w, h, cor) => { g.fillStyle = cor; g.fillRect(x + a, y + b, w, h); };
    if (['longo', 'franja', 'chanel', 'afro', 'cacheado', 'volume'].includes(l.cab)) R(-1, 0, 10, 8, shade(c, -0.2));
    if (!o.semTronco) { R(-1, 8, 10, 6, l.roupa); R(6, 8, 3, 6, shade(l.roupa, -0.25)); if (l.gravata) R(3, 8, 2, 4, l.gravata); }
    R(0, 1, 8, 7, sk); R(6, 2, 2, 6, sd);
    if (l.cab !== 'careca' && l.cab !== 'raspado' && l.cab !== 'ralo') R(0, 0, 8, 2, c);
    if (l.cab === 'afro' || l.cab === 'cacheado' || l.cab === 'volume') R(-1, -1, 10, 3, c);
    if (l.cab === 'coque') R(2, -2, 4, 2, c);
    if (l.cab === 'topete') R(1, -1, 5, 1, c);
    if (o.olhos === 'fechados') { R(1, 4, 2, 1, '#1a1a2e'); R(5, 4, 2, 1, '#1a1a2e'); }
    else { R(2, 4, 1, 1, '#1a1a2e'); R(5, 4, 1, 1, '#1a1a2e'); }
    if (l.oculos || o.oculos) R(1, 4, 6, 1, o.oculos ? '#101018' : '#2a2a3a');
    if (o.oculos) { R(1, 3, 3, 2, '#101018'); R(4, 3, 3, 2, '#101018'); }
  }
  const CASA = {
    atestado(g, t, id) {
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      R(0, 0, 64, 40, '#2a3a6a'); R(0, 28, 64, 12, '#3a2a4a');
      R(44, 4, 14, 11, '#101830'); R(45, 5, 12, 9, '#1a2a5a'); R(52, 6, 3, 3, '#fff6c0'); R(51, 7, 1, 1, '#fff6c0');
      R(4, 20, 40, 10, '#e8e8f0'); R(2, 16, 4, 16, '#7a4018'); R(42, 20, 3, 12, '#7a4018');
      R(6, 17, 10, 5, '#ffffff');
      miniPessoa(g, id, 7, 13, { olhos: 'fechados', semTronco: true });
      R(14, 20, 30, 9, '#e63946'); R(14, 20, 30, 2, '#ff6b6b'); for (let x = 16; x < 44; x += 6) R(x, 24, 3, 1, '#a01828');
      R(7, 13, 8, 2, '#d8f0ff');
      R(10, 19, 1, 1, '#ff7a7a'); R(13, 19, 1, 1, '#ff7a7a');
      R(14, 18, 5, 1, '#ffffff'); R(18, 18, 1, 1, '#e63946');
      R(48, 24, 12, 8, '#a86028'); R(49, 20, 4, 4, '#ffffff'); R(53, 21, 5, 3, '#80c0ff');
      const s = (t / 900) % 1;
      [0, 0.33, 0.66].forEach((o, i) => { const p = (s + o) % 1; g.globalAlpha = 1 - p; R(18 + i * 3 + p * 6, 12 - p * 12, 3, 1, '#fff'); R(18 + i * 3 + p * 6, 12 - p * 12, 1, 3, '#fff'); R(18 + i * 3 + p * 6, 14 - p * 12, 3, 1, '#fff'); g.globalAlpha = 1; });
      if (Math.floor(t / 500) % 2) { R(30, 2, 13, 7, '#1a1a2e'); texto(g, '39º', 31, 3, '#ff4040'); }
      g.globalAlpha = 0.5 + 0.3 * Math.sin(t / 300); R(50, 17, 1, 2, '#fff'); R(52, 16, 1, 3, '#fff'); g.globalAlpha = 1;
    },
    homeoffice(g, t, id) {
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      R(0, 0, 64, 40, '#f0d8a8'); for (let x = 0; x < 64; x += 8) R(x, 0, 1, 26, '#e8c890');
      R(4, 4, 14, 10, '#7ac8f0'); R(4, 4, 14, 1, '#ffffff'); R(10, 4, 1, 10, '#ffffff');
      R(50, 8, 6, 10, '#2fbf71'); R(51, 18, 4, 5, '#e07a3a');
      miniPessoa(g, id, 28, 10);
      const dig = Math.floor(t / 120) % 2; R(26 + dig, 22, 3, 2, PELES[LOOKS[id].pele][0]); R(36 - dig, 22, 3, 2, PELES[LOOKS[id].pele][0]);
      R(0, 24, 64, 16, '#a86028'); R(0, 24, 64, 2, '#c88040');
      R(22, 16, 20, 9, '#30343f'); R(23, 17, 18, 7, '#4a90d0');
      const sp = Math.floor(t / 150) % 4; texto(g, 'VPN', 25, 18, '#ffffff'); R(38, 18 + sp, 2, 2, '#ffd166');
      R(20, 25, 24, 2, '#50545f');
      if (Math.floor(t / 400) % 2) { R(46, 2, 10, 8, '#1a1a2e'); R(48, 7, 2, 1, '#ffffff'); R(47, 5, 4, 1, '#ffffff'); R(46, 3, 6, 1, '#ffffff'); R(52, 3, 4, 4, '#e63946'); R(53, 4, 2, 2, '#ffffff'); }
      const gx = 2 + ((t / 40) % 80) - 10;
      R(gx, 20, 8, 4, '#3a3a40'); R(gx + 7, 18, 3, 3, '#3a3a40'); R(gx + 7, 17, 1, 1, '#3a3a40'); R(gx + 9, 17, 1, 1, '#3a3a40'); R(gx - 2, 18 + (Math.floor(t / 200) % 2), 2, 2, '#3a3a40'); R(gx + 8, 19, 1, 1, '#9aff70');
      R(gx + 1, 24, 1, 1, '#3a3a40'); R(gx + 6, 24, 1, 1, '#3a3a40');
    },
    licenca(g, t, id) {
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      R(0, 0, 64, 40, '#ffd0e4'); for (let y = 0; y < 30; y += 6) R(0, y, 64, 1, '#ffe4f0'); R(0, 30, 64, 10, '#c8a8e8');
      R(42, 18, 18, 12, '#ffffff'); for (let x = 43; x < 60; x += 3) R(x, 18, 1, 12, '#e0d0f0'); R(42, 30, 2, 4, '#c0b0d0'); R(58, 30, 2, 4, '#c0b0d0');
      const a = t / 500; R(50, 2, 1, 6, '#888');
      [[-6, '#ffd166'], [0, '#5ab4ff'], [6, '#7fe8a8']].forEach(([dx, c], i) => { const x = 50 + Math.round(Math.cos(a + i * 2) * 6); R(x, 8 + i % 2, 3, 3, c); });
      const sw = Math.round(Math.sin(t / 400) * 2);
      miniPessoa(g, id, 16 + sw, 12);
      R(18 + sw, 21, 10, 5, '#ffffff'); R(19 + sw, 20, 4, 4, '#ffe0c4'); R(20 + sw, 21, 1, 1, '#1a1a2e'); R(22 + sw, 21, 1, 1, '#1a1a2e');
      R(14 + sw, 26, 12, 4, shade(LOOKS[id].roupa, -0.5));
      const p = (t / 1400) % 1; g.globalAlpha = 1 - p; R(30, 16 - p * 14, 2, 2, '#ff4080'); R(32, 16 - p * 14, 2, 2, '#ff4080'); R(31, 18 - p * 14, 2, 1, '#ff4080'); g.globalAlpha = 1;
      if (Math.floor(t / 600) % 2) { R(10, 4, 1, 5, '#a03a6a'); R(10, 4, 3, 1, '#a03a6a'); R(8, 8, 2, 2, '#a03a6a'); }
    },
    ferias(g, t, id) {
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      R(0, 0, 64, 18, '#7ad0ff'); R(0, 0, 64, 6, '#5ab8f0'); R(48, 3, 7, 7, '#ffe060'); R(47, 5, 9, 3, '#ffe060');
      R(0, 18, 64, 7, '#2a90d0'); const o = Math.floor(t / 250) % 4; for (let x = -4; x < 64; x += 8) R(x + o * 2, 20 + (x / 8) % 2, 4, 1, '#c8f0ff');
      R(0, 25, 64, 15, '#f4d88a'); for (let i = 0; i < 12; i++) R((i * 23) % 64, 28 + (i * 7) % 10, 1, 1, '#d8b860');
      R(10, 4, 1, 22, '#7a4018'); R(1, 2, 20, 4, '#e63946'); R(3, 1, 16, 1, '#e63946'); for (let x = 1; x < 21; x += 6) R(x, 2, 3, 4, '#ffffff');
      R(20, 30, 22, 3, '#ff8c32'); R(36, 24, 3, 7, '#ff8c32'); R(22, 33, 1, 4, '#8a5a30'); R(38, 33, 1, 4, '#8a5a30');
      miniPessoa(g, id, 30, 19, { oculos: true, semTronco: true });
      R(24, 27, 10, 4, LOOKS[id].roupa === '#f0f0f0' ? '#ff6aa8' : '#ffd23a');
      R(44, 26, 5, 5, '#5a3a1a'); R(45, 25, 3, 1, '#2fbf71'); R(48, 22, 1, 4, '#ff6aa8');
      if (Math.floor(t / 900) % 2) { R(52, 30, 10, 7, '#1a1a2e'); R(53, 31, 8, 5, '#3a3a50'); R(54, 32, 6, 1, '#e63946'); R(56, 34, 2, 1, '#e63946'); }
    },
    aniversario(g, t, id) {
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
      R(0, 0, 64, 40, '#3a2470'); for (let x = 0; x < 64; x += 4) R(x, 0, 2, 2, ['#ffd166', '#ff6b6b', '#5ab4ff', '#7fe8a8'][(x / 4) % 4]);
      [[6, '#ff6b6b'], [54, '#5ab4ff'], [14, '#ffd166']].forEach(([x, c], i) => { const y = 6 + Math.round(Math.sin(t / 500 + i) * 2); R(x, y, 6, 7, c); R(x + 1, y + 1, 2, 2, '#ffffff'); R(x + 3, y + 7, 1, 8, '#ffffff'); });
      miniPessoa(g, id, 28, 10);
      R(30, 4, 4, 2, '#ff40a0'); R(31, 2, 2, 2, '#ff40a0'); R(31, 1, 2, 1, '#ffd166'); R(30, 5, 4, 1, '#ffd166');
      R(0, 26, 64, 14, '#a86028'); R(0, 26, 64, 2, '#c88040');
      R(22, 20, 20, 7, '#ffffff'); R(22, 20, 20, 2, '#ff9ac0'); R(22, 24, 20, 1, '#ff6aa8');
      [25, 31, 37].forEach((x, i) => { R(x, 16, 1, 4, '#5ab4ff'); const f = Math.floor(t / 120 + i) % 3; R(x - (f === 1 ? 1 : 0), 14 + (f === 2 ? 1 : 0), 1 + (f === 1 ? 1 : 0), 2, f ? '#ffd166' : '#ff8c32'); });
      for (let i = 0; i < 14; i++) { const y = ((t / 30 + i * 37) % 44) - 4, x = (i * 29 + Math.sin(t / 300 + i) * 3) % 64; R(Math.round(x), Math.round(y), 1, 2, ['#ffd166', '#ff6b6b', '#5ab4ff', '#7fe8a8', '#ffffff'][i % 5]); }
    },
  };
  function desenharCasa(g, tipo, id, t) { g.imageSmoothingEnabled = false; (CASA[tipo] || CASA.atestado)(g, t, id); }

  return { desenharCasa, retrato, retratoCanvas, corpoCanvas, bossCanvas, bossBranco, cenaCanvas, flipCanvas, cinza, texto, larguraTexto, shade, painter,
    ARENA_DO_CHEFE, AURA, CORES_AREA, LOOKS, toCanvas, Bf };
})();
