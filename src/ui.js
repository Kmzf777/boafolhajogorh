/* =========================================================================
   MÓDULOS ESTADO · CENA · MERCADO · TREINO · EVENTOS · COMBATE · UI
   ========================================================================= */
const $ = (sel, el = document) => el.querySelector(sel);
const VEL = /[?&]rapido/.test(location.search) ? 0.1 : 1; // ?rapido acelera as animações (testes)
const esperar = ms => new Promise(r => setTimeout(r, ms * VEL));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const R$ = v => (v < 0 ? '-' : '') + 'R$ ' + Math.abs(v) + ' mil';
const rnd = a => a[Math.floor(Math.random() * a.length)];

/* ---------- ESTADO: salvamento automático (nunca quebra o jogo) ---------- */
const Estado = {
  st: null, chave: 'boafolha.save.v1', ok: true,
  salvar(som) {
    try { localStorage.setItem(this.chave, JSON.stringify(this.st)); this.ok = true; if (som) Som.sfx('disquete'); }
    catch (e) { this.ok = false; }
  },
  carregar() { try { const s = JSON.parse(localStorage.getItem(this.chave) || 'null'); return s && s.v === 1 ? s : null; } catch (e) { return null; } },
  apagar() { try { localStorage.removeItem(this.chave); } catch (e) { } },
};
const Prefs = {
  load() { try { return JSON.parse(localStorage.getItem('boafolha.audio') || 'null') || {}; } catch (e) { return {}; } },
  save(p) { try { localStorage.setItem('boafolha.audio', JSON.stringify(p)); } catch (e) { } },
};

/* ---------- CENA: laço de desenho no canvas 320x180 ---------- */
const Cena = {
  nome: 'fachada', atores: [], boss: null, fx: [], part: [], shake: 0, t: 0, tweens: [], modo: 'parado',
  ctx: null,
  setar(nome, modo = 'parado') { this.nome = nome; this.modo = modo; this.atores = []; this.boss = null; this.fx = []; this.part = []; this.tweens = []; this.shake = 0; },
  ator(id, x, y, extra = {}) { const a = { id, x, y, pose: 0, flip: false, alvo: null, pausa: Math.random() * 2, cam: 0, flash: 0, out: false, ...extra }; this.atores.push(a); return a; },
  tween(o, k, to, ms) { return new Promise(r => this.tweens.push({ o, k, from: o[k], to, ms, t: 0, r })); },
  projetil(x, y, tx, ty, cor, ms = 280) { return new Promise(r => this.fx.push({ x, y, tx, ty, cor, ms, t: 0, r })); },
  desenhar(dt) {
    const g = this.ctx; this.t += dt;
    for (const tw of this.tweens.slice()) { tw.t += dt; const p = Math.min(1, tw.t / tw.ms), e = 1 - Math.pow(1 - p, 3); tw.o[tw.k] = tw.from + (tw.to - tw.from) * e; if (p >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.r(); } }
    const sx = this.shake ? (Math.random() - 0.5) * this.shake : 0, sy = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    this.shake = Math.max(0, this.shake - dt * 0.04);
    g.save(); g.translate(Math.round(sx), Math.round(sy));
    g.drawImage(Arte.cenaCanvas(this.nome), 0, 0);
    const b = this.boss;
    if (b) {
      const cor = Arte.AURA[b.id];
      if (!b.morto && Math.random() < 0.6) this.part.push({ x: b.x + 10 + Math.random() * 92, y: b.y + 110, vx: (Math.random() - 0.5) * 0.01, vy: -0.02 - Math.random() * 0.03, vida: 1, cor });
      g.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = -44; i <= 44; i++) { const h = Math.round(Math.sqrt(1 - (i / 44) ** 2) * 5); g.fillRect(b.x + 56 + i, b.y + 118 - h, 1, h * 2); }
      g.globalAlpha = 0.35 + 0.15 * Math.sin(this.t / 300); g.fillStyle = cor;
      for (let i = -40; i <= 40; i += 2) { const h = Math.round(Math.sqrt(1 - (i / 40) ** 2) * 3); g.fillRect(b.x + 56 + i, b.y + 118 - h, 2, h * 2); }
      g.globalAlpha = b.alpha;
      const bob = b.morto ? 0 : Math.round(Math.sin(this.t / 400) * 2);
      const quadro = Math.floor(this.t / 650) % 4 === 3 ? 1 : 0;
      const img = b.flash > 0 && Math.floor(b.flash / 50) % 2 === 0 ? Arte.bossBranco(b.id) : Arte.bossCanvas(b.id, quadro);
      b.flash = Math.max(0, b.flash - dt);
      const bx = b.x + (b.tremor ? Math.round((Math.random() - 0.5) * b.tremor) : 0) + b.dx; b.tremor = Math.max(0, (b.tremor || 0) - dt * 0.05);
      g.drawImage(img, Math.round(bx), Math.round(b.y + bob + b.dy));
      g.globalAlpha = 1;
    }
    for (const p of this.part.slice()) { p.x += p.vx * dt; p.y += p.vy * dt; p.vida -= dt / 1400; if (p.vida <= 0) { this.part.splice(this.part.indexOf(p), 1); continue; } g.globalAlpha = Math.min(1, p.vida * 1.5); g.fillStyle = p.cor; g.fillRect(Math.round(p.x), Math.round(p.y), p.tam || 1, p.tam || 1); }
    g.globalAlpha = 1;
    if (this.modo === 'andar') this.andar(dt);
    for (const a of this.atores.slice().sort((p, q) => p.y - q.y)) {
      let pose = a.out ? 3 : a.pose;
      let img = Arte.corpoCanvas(a.id, pose); if (a.flip) img = Arte.flipCanvas(img);
      if (a.flash > 0) { a.flash -= dt; if (Math.floor(a.flash / 60) % 2 === 0) img = Arte.cinza(img); }
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(Math.round(a.x + 4), Math.round(a.y - 2), 24, 3);
      g.drawImage(img, Math.round(a.x), Math.round(a.y - 48), 32, 48);
      if (a.cam > 0) { g.fillStyle = '#fff'; g.fillRect(a.x + 20, a.y - 62, 14, 9); g.fillStyle = '#1a1a2e'; g.fillRect(a.x + 23, a.y - 58, 2, 2); g.fillRect(a.x + 26, a.y - 58, 2, 2); g.fillRect(a.x + 29, a.y - 58, 2, 2); g.fillRect(a.x + 22, a.y - 53, 3, 2); }
    }
    for (const f of this.fx.slice()) {
      f.t += dt; const p = Math.min(1, f.t / f.ms), x = f.x + (f.tx - f.x) * p, y = f.y + (f.ty - f.y) * p - Math.sin(p * Math.PI) * 18;
      g.fillStyle = '#1a1a2e'; g.fillRect(Math.round(x) - 4, Math.round(y) - 4, 9, 9); g.fillStyle = f.cor; g.fillRect(Math.round(x) - 3, Math.round(y) - 3, 7, 7); g.fillStyle = '#fff'; g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 2, 2);
      if (Math.random() < 0.7) this.part.push({ x, y, vx: 0, vy: 0, vida: 0.4, cor: f.cor });
      if (p >= 1) { this.fx.splice(this.fx.indexOf(f), 1); f.r(); }
    }
    g.restore();
  },
  andar(dt) { // funcionários passeando pelo escritório (e olhando para a câmera)
    for (const a of this.atores) {
      if (a.cam > 0) { a.cam -= dt; a.pose = 0; continue; }
      if (a.pausa > 0) { a.pausa -= dt / 1000; a.pose = 0; continue; }
      if (!a.alvo) { a.alvo = { x: 10 + Math.random() * 270, y: 122 + Math.random() * 50 }; }
      const dx = a.alvo.x - a.x, dy = a.alvo.y - a.y, d = Math.hypot(dx, dy);
      if (d < 1.5) { a.alvo = null; a.pausa = 1 + Math.random() * 3; if (Math.random() < 0.18) a.cam = 1800; continue; }
      const v = 0.022 * dt; a.x += dx / d * Math.min(v, d); a.y += dy / d * Math.min(v, d);
      a.flip = dx < 0; a.pose = Math.floor(this.t / 220) % 2;
    }
  },
};
function loopCena() {
  let ult = performance.now();
  const passo = agora => { const dt = Math.min(60, agora - ult); ult = agora; try { Cena.desenhar(dt); } catch (e) { console.error(e); } requestAnimationFrame(passo); };
  requestAnimationFrame(passo);
}

/* ---------- efeitos de tela (camada HTML) ---------- */
const FX = {
  el: null,
  num(cx, cy, html, cls = '') { const d = document.createElement('div'); d.className = 'num ' + cls; d.style.left = cx * 3 + 'px'; d.style.top = cy * 3 + 'px'; d.innerHTML = html; this.el.appendChild(d); setTimeout(() => d.remove(), 1150); },
  balao(cx, cy, texto, tipo = 'char', ms = 1500) {
    const d = document.createElement('div'); d.className = 'balao ' + (tipo === 'boss' ? 'boss' : tipo.startsWith('obj') ? 'obj boss' : '');
    d.textContent = texto; d.style.left = Math.min(cx * 3, 700) + 'px'; d.style.top = cy * 3 + 'px'; this.el.appendChild(d);
    setTimeout(() => d.remove(), ms); return d;
  },
  banner(txt, sub = '') { const d = document.createElement('div'); d.className = 'banner'; d.innerHTML = esc(txt) + (sub ? '<small>' + esc(sub) + '</small>' : ''); this.el.appendChild(d); setTimeout(() => d.remove(), 1050); },
  flash(cor = '#fff', forca = 0.8) { const f = $('#flash'); f.style.background = cor; f.style.transition = 'none'; f.style.opacity = forca; requestAnimationFrame(() => { f.style.transition = 'opacity .35s'; f.style.opacity = 0; }); },
  limpar() { this.el.innerHTML = ''; },
};

/* ---------- textos de humor ---------- */
const FALAS = {
  vitoria: ['Eu não diria que fui eu que derrotei {chefe}. Mas também não diria que não fui.', 'A gente bateu a meta. Eu chorei no banheiro, mas de alegria. Acho.', 'Teve uma hora que eu olhei pro {chefe} e pensei: hoje não.', 'Meu segredo? Planilha, café e não responder e-mail depois das seis.', 'Vou colocar isso no LinkedIn. Com foto.', 'Se alguém perguntar, foi trabalho em equipe. Mas foi mais eu.', 'Eu nem sabia que dava pra ganhar de {chefe}. Ninguém me avisou que era difícil.', 'A diretoria vai mandar um e-mail de parabéns. Com cópia oculta pra mim, espero.'],
  derrota: ['Foi um aprendizado. Um aprendizado caro, mas um aprendizado.', '{chefe} não ganhou. A gente que perdeu. É diferente.', 'Eu tinha um plano. O plano tinha outro plano.', 'Vai pro feedback. Eu já sei o que vão falar. Eu sempre sei.', '(olha para a câmera por cinco segundos)', 'Não tô chateado. Tô processando. Tipo um computador lento.', 'Mês que vem a gente vira. Ou o outro. Ou o ano que vem.'],
  porChar: {
    carlinhos: ['Conferi três vezes se a gente ganhou mesmo. Ganhou.', 'Eu sabia que ia dar errado. Pelo menos nisso eu acertei.'],
    luciano: ['Eu prometi que ia dar certo! Tá, eu prometo muita coisa. Mas essa deu.', 'Entrego a vitória amanhã. Prometo.'],
    felipe: ['Ah, ganhamos? Tava de fone.', 'Desculpa, o que aconteceu? Tava numa playlist muito boa.'],
    anamaria: ['Eu cheguei um pouco depois, mas cheguei com tudo.', 'Quando eu terminei de ligar o computador, já tinha acabado.'],
    sandy: ['Quero essa vitória por escrito, com assinatura e carimbo.', 'Ninguém me mandou o e-mail avisando que era pra ganhar.'],
    tata: ['Analisei 47 cenários. Em todos a gente ganhava. Em um, quase.', 'Ainda tô analisando o que deu errado. Me dá mais uma semana.'],
    hebe: ['Ninguém tá sabendo, mas o chefe saiu chorando. Você não ouviu de mim.', 'Olha, ouvi dizer que a culpa foi do TI. Mas não espalha.'],
    gil: ['Foi uma gambiarra, mas foi uma gambiarra vencedora.', 'Desculpa, o que a gente tava fazendo mesmo?'],
    junior: ['Ganhamos no prazo! Que prazo era mesmo?', 'ERA HOJE?! Ninguém me falou que era hoje.'],
    fatima: ['Isso podia ter sido um e-mail. Mas uma reunião comemorando é melhor.', 'Vamos marcar uma reunião pra alinhar o que deu errado. Terça, 8h?'],
    fausto: ['Eu fiz quase tudo sozinho. O time ajudou a não atrapalhar.', 'Se tivessem deixado comigo desde o começo...'],
    ivete: ['Essa estratégia foi ideia minha. Todas foram, na verdade.', 'Eu tinha avisado. Tá no meu e-mail. Que eu não mandei.'],
    luan: ['Ganhamos? Caiu a conexão bem na hora. Alguém gravou?', 'Tá me ouvindo? Acho que perdemos. Tá me ouvindo?'],
    gloria: ['Vitória excelente. Minha fatura chega segunda.', 'Derrota também se cobra, querido. Mesmo valor.'],
    caetano: ['Foi uma convergência sinérgica de vetores estratégicos. Ou seja: ganhamos.', 'Houve uma disrupção na matriz de expectativas. Ou seja: perdemos.'],
    angelica: ['Ótimo trabalho, gente. Me copiem no e-mail de comemoração.', 'Eu disse que precisava de mais checklist. Ninguém me copiou.'],
    pedro: ['A regra era ganhar. A gente seguiu a regra.', 'Perdemos dentro das normas. Isso conta alguma coisa.'],
    roberto: ['Agora eu posso dormir? Três dias acordado. Valeu a pena. Acho.', 'TÔ DE FOLGA. A partir de agora. Por favor.'],
    marilia: ['Ficou bom. Mas eu refaria.', 'Eu ia entregar perfeito. Faltou só refazer mais umas seis vezes.'],
    gugu: ['Desculpa, tava em outra reunião. Ganhamos? Ótimo, vou contar na próxima.', 'Só um minutinho que eu já resolvo isso. Só um minutinho.'],
  },
  provoca: {
    osvaldo: ['Isso é tudo? Meu sobrinho faz melhor.', 'Quero relatório até amanhã. Cedo.', 'No meu tempo a gente trabalhava de verdade.'],
    ponto: ['Atraso de 1 minuto registrado.', 'Hora extra não autorizada.', 'Biiip. Biiip. BIIIP.'],
    clotilde: ['Esse centavo aqui não bate.', 'Refaz. De novo.', 'Quem fez esse lançamento?'],
    leao: ['Malha fina para todos!', 'Cadê o recibo?', 'GRRR... imposto atrasado!'],
    cliente: ['Eu pago o salário de vocês!', 'Na outra loja é mais barato!', 'Quero o caderno do unicórnio AGORA!'],
    conselho: ['Precisamos de mais sinergia.', 'Isso não foi aprovado em ata.', 'Vamos formar um comitê sobre isso.'],
    excel: ['Não está respondendo...', '#REF! #REF! #REF!', 'Atualização obrigatória em andamento.'],
    valdemar: ['Protesto!', 'Meu cliente nega tudo.', 'Isso vai custar caro, doutor.'],
    auditor: ['...', '(anota)', '(anota mais)'],
    pendrive: ['Copiando seus arquivos... HA HA!', 'Vírus detectado: você.', 'Formatar? Sim.'],
    impressora: ['Papel atolado na bandeja 2.', 'Ciano vazio. Esperança vazia.', 'Imprimindo... 0%.'],
    ceo: ['Vamos pensar fora da caixa. Vocês, dentro.', 'Reestruturação é uma palavra bonita.', '(olha o relógio)'],
  },
};
const CARGO = { FIN: 'Financeiro', DAD: 'Dados', JUR: 'Jurídico', TEC: 'TI', VEN: 'Vendas', OPE: 'Operações' };
const SOM_DESV = { anamaria: 'dAnaMaria' };
const somDesv = id => SOM_DESV[id] || ('d' + id[0].toUpperCase() + id.slice(1));
const SOM_EVENTO = { feriado: 'eFeriado', cafe: 'eCafe', gripe: 'eGripe', corte: 'eCorte', elogio: 'eElogio', verba: 'eVerba', promocao: 'ePromocao', tranquilo: 'eTranquilo' };
const SOM_CHEFE = id => 'b' + ({ ponto: 'Ponto', clotilde: 'Clotilde', leao: 'Leao', cliente: 'Cliente', conselho: 'Conselho', excel: 'Excel', valdemar: 'Valdemar', auditor: 'Auditor', pendrive: 'Pendrive', impressora: 'Impressora', ceo: 'CEO', osvaldo: 'Osvaldo' }[id]);

/* ---------- componentes visuais ---------- */
function badgeArea(a) { return `<span class="badge" style="background:${Arte.CORES_AREA[a]}">${a}</span>`; }
function barra(v, max, cls) { let s = `<span class="stat ${cls}">${cls.toUpperCase() || 'H'} `; for (let i = 0; i < max; i++) s += `<i class="${i < v ? 'on' : ''}"></i>`; return s + ` ${v}</span>`; }
function statsHTML(m) { return barra(m.H, 10, '') + barra(m.S, 8, 's') + barra(m.R, 8, 'r'); }
function retratoEl(id, expr = 'neutro', esc = 2) { const cv = Arte.retratoCanvas(id, expr, esc); const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; c.className = 'px'; c.getContext('2d').drawImage(cv, 0, 0); return c; }
function bossEl(id, escala = 1) { const cv = Arte.bossCanvas(id, 0); const c = document.createElement('canvas'); c.width = 112; c.height = 120; c.className = 'px'; c.style.width = 112 * escala + 'px'; c.style.height = 120 * escala + 'px'; c.getContext('2d').drawImage(cv, 0, 0); return c; }
function clique(el, fn) { el.addEventListener('click', e => { Som.sfx('grampo'); fn(e); }); return el; }
function dicaStats() { return '<span class="sub">H = Hard skill · S = Soft skill · R = Resiliência (aguenta estresse)</span>'; }

/* ---------- UI: navegação ---------- */
const UI = {
  ui: null,
  limpar() { this.ui.innerHTML = ''; FX.limpar(); },
  html(h) { this.ui.insertAdjacentHTML('beforeend', h); return this.ui.lastElementChild; },
  barra() {
    const st = Estado.st, b = Regras.boss(st);
    const el = this.html(`<div id="barra"><span>📅 <b>${Regras.MESES[st.mes]}</b> ${st.mes + 1}/12</span><span>Caixa <b class="${st.caixa < 0 ? 'dinheiro-neg' : ''}">${R$(st.caixa)}</b></span><span>Folha <b>${R$(Regras.folha(st))}</b>/mês</span><span>Treino <b>${st.pt} PT</b></span><span>Derrotas <b>${st.derrotas}/${Regras.CFG.maxDerrotas}</b></span><span class="esp"></span><span>vs <b>${esc(b.nome)}</b></span></div>`);
    return el;
  },
  engrenagem() { Opcoes.sincronizar(); },  // os botões de som ficam fixos no palco, em todas as telas
};

/* ---------- opções de áudio ---------- */
const Opcoes = {
  criarBotoes() {
    const box = document.createElement('div'); box.className = 'engr row'; box.style.gap = '6px';
    box.innerHTML = `<button class="btn peq azul" id="btnSom" title="Volume de música, efeitos e falas">♪ SOM</button><button class="btn peq" id="btnMudo" title="Liga/desliga todo o som (tecla M)">🔊</button>`;
    document.getElementById('stage').appendChild(box);
    clique($('#btnSom'), () => Opcoes.abrir());
    $('#btnMudo').addEventListener('click', () => Opcoes.alternarMudo());
    window.addEventListener('keydown', e => { if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey) Opcoes.alternarMudo(); });
  },
  alternarMudo() { Som.init(); Som.setMuted(!Som.isMuted()); Prefs.save({ ...Som.getVol(), muted: Som.isMuted() }); this.sincronizar(); },
  sincronizar() { const b = $('#btnMudo'); if (b) { b.textContent = Som.isMuted() ? '🔇' : '🔊'; b.classList.toggle('verm', Som.isMuted()); } },
  aplicar() { const p = Prefs.load(); ['music', 'sfx', 'voice'].forEach(k => { if (typeof p[k] === 'number') Som.setVol(k, p[k]); }); Som.setMuted(!!p.muted); },
  abrir() {
    const p = { ...Som.getVol(), muted: Som.isMuted() };
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="painel" style="position:relative;width:420px"><div class="tit">Som</div>
      ${[['music', 'Música'], ['sfx', 'Efeitos'], ['voice', 'Falas (bla bla bla)']].map(([k, n]) => `<div class="row" style="margin:12px 0"><span style="width:170px">${n}</span><input type="range" min="0" max="1" step="0.05" value="${p[k]}" data-k="${k}" style="flex:1"></div>`).join('')}
      <div class="row" style="justify-content:space-between;margin-top:14px"><button class="btn ${p.muted ? 'verm' : ''}" id="mudo">Mudo: ${p.muted ? 'sim' : 'não'}</button><button class="btn verde" id="fechar">Fechar</button></div>
      <div class="sub" style="margin-top:10px">${Estado.ok ? 'Salvamento automático ativo.' : 'Aviso: o navegador bloqueou o salvamento. O jogo funciona, mas o progresso não fica guardado.'}</div></div>`;
    document.getElementById('stage').appendChild(m);
    const salvar = () => Prefs.save({ ...Som.getVol(), muted: Som.isMuted() });
    m.querySelectorAll('input[type=range]').forEach(r => r.oninput = () => { Som.setVol(r.dataset.k, +r.value); salvar(); if (r.dataset.k === 'sfx') Som.sfx('grampo'); if (r.dataset.k === 'voice') Som.say('oi, tudo bem?', 'char'); });
    clique($('#mudo', m), e => { Som.setMuted(!Som.isMuted()); e.target.textContent = 'Mudo: ' + (Som.isMuted() ? 'sim' : 'não'); e.target.classList.toggle('verm', Som.isMuted()); salvar(); });
    clique($('#fechar', m), () => { m.remove(); Opcoes.sincronizar(); });
  },
};

/* ---------- MENU ---------- */
const Menu = {
  abrir() {
    UI.limpar(); Cena.setar('fachada'); Som.ambient(false); Som.music('menu');
    const save = Estado.carregar();
    const p = UI.html(`<div class="painel" style="left:330px;top:290px;width:300px;display:flex;flex-direction:column;gap:9px;padding:14px"><div class="tit" style="text-align:center;font-size:18px">Um Ano no RH</div></div>`);
    const add = (t, cls, fn) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = t; p.appendChild(clique(b, fn)); };
    if (save) add('Continuar · ' + Regras.MESES[save.mes], 'verde', () => { Estado.st = save; Jogo.retomar(); });
    add('Novo jogo', save ? '' : 'verde', () => { if (save && !confirm('Começar um novo jogo apaga o progresso salvo. Continuar?')) return; Jogo.novo(); });
    add('Como jogar', 'azul', () => Ajuda.abrir());
    add('Som', 'azul', () => Opcoes.abrir());
    UI.html(`<div style="position:absolute;right:10px;bottom:8px;color:#fff;font-size:11px;text-shadow:1px 1px 0 #000">Distribuidora Boa Folha · papel, caderno e constrangimento desde 1998</div>`);
  },
};
const Ajuda = {
  abrir() {
    const m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = `<div class="painel" style="position:relative;width:760px;max-height:500px;overflow:auto;font-size:13px;line-height:1.45">
    <div class="tit">Como jogar</div>
    <p>Você é o RH da <b>Distribuidora Boa Folha</b>. São 12 meses, e cada mês tem um <b>chefe</b> para vencer. Em dezembro vem o CEO.</p>
    <p><b>1. Mercado:</b> contrate talentos (custo na hora + salário todo mês). Júnior é barato, Sênior é forte e caro. Cada um tem uma <b>desvantagem</b> engraçada que dispara no combate. Time de até 6 pessoas.</p>
    <p><b>2. Treino:</b> responda 5 perguntas. Cada acerto vale 1 Ponto de Treino (5 de 5 vale +2 de bônus). Com 4 ou mais acertos, um Sênior vira <b>mentor</b> e salva um júnior ou pleno de um dado 1 por semana. Gaste os pontos em H (2 PT), S (1 PT) ou R (2 PT). Cursos pagos: R$ 4 mil = 1 PT.</p>
    <p><b>3. Escalação:</b> leve até 4 pessoas para o combate. Veja as <b>fraquezas</b> (dano ×2) e <b>resistências</b> (dano ×½) do chefe.</p>
    <p><b>4. Combate:</b> você tem 4 semanas (o prazo) para zerar a vida do chefe. Toda semana cada um age uma vez:<br>
    • <b>Hard</b>: dano = H × 3 × dado × fraqueza/resistência da área.<br>
    • <b>Soft</b>: dano = (S × 2 + 2) × dado. Ignora resistência e tira 1 de estresse do colega mais estressado.<br>
    • <b>Dado:</b> 1 = dia ruim (0), 2 = ×0,7, 3 = ×0,9, 4 = ×1,1, 5 = ×1,3, 6 = <b>Insight</b> (×2).<br>
    • <b>Sinergia:</b> 3 ou mais acertos de fraqueza na mesma semana dão dano bônus (soma do S do time × 2).<br>
    • No fim da semana o chefe cobra resultados: dá estresse. Quem chega ao limite (R) fica <b>fora</b> do combate.</p>
    <p><b>5. Fechamento:</b> vencer dá receita (mais R$ 3 mil por semana que sobrou no prazo). Depois vêm os salários. Ao perder, cada Sênior tem 25% de chance de pedir demissão.</p>
    <p><b>Fim de jogo:</b> caixa negativo depois da folha (falência) ou 4 derrotas = <b>bilhete azul</b>. Vencer o CEO em dezembro = <b>Funcionário do Ano</b>.</p>
    <div style="text-align:right"><button class="btn verde" id="ok">Entendi</button></div></div>`;
    document.getElementById('stage').appendChild(m); clique($('#ok', m), () => m.remove());
  },
};

/* ---------- JOGO: fluxo do mês ---------- */
const Jogo = {
  novo() { Estado.st = Regras.novoJogo(); Estado.st.usadas = { rh: [], neg: [], esc: [] }; Jogo.inicioMes(); },
  retomar() { const st = Estado.st; st.usadas = st.usadas || { rh: [], neg: [], esc: [] }; if (st.fase === 'inicioMes') Jogo.inicioMes(); else Hub.abrir(); },
  async inicioMes() {
    const st = Estado.st, ev = Regras.iniciarMes(st); Estado.salvar();
    UI.limpar(); Cena.setar('escritorio', 'andar'); Som.music(null); Som.stopMusic(); Som.ambient(true);
    st.time.forEach(m => Cena.ator(m.id, 20 + Math.random() * 260, 125 + Math.random() * 45));
    const b = Regras.boss(st);
    const card = UI.html(`<div class="painel escuro" style="left:230px;top:120px;width:500px;text-align:center"><div class="sub">MÊS ${st.mes + 1} DE 12</div><div class="tit" style="font-size:34px">${Regras.MESES[st.mes]}</div><div style="margin-top:6px">Chefe do mês: <b style="color:var(--ouro)">${esc(b.nome)}</b></div></div>`);
    await esperar(1700); card.remove();
    if (ev) await Eventos.mostrar(ev);
    Hub.abrir();
  },
};
const Eventos = {
  mostrar(ev) {
    return new Promise(res => {
      Som.sfx(SOM_EVENTO[ev.id]);
      const st = Estado.st, extra = ev.id === 'gripe' && st.atestado ? `<p><b>${esc(Regras.CHAR[st.atestado].nome)}</b> está de atestado.</p>` : '';
      const p = UI.html(`<div class="painel" style="left:250px;top:130px;width:460px"><div class="sub">EVENTO DO MÊS</div><div class="tit">${esc(ev.nome)}</div><p style="font-size:15px">${esc(ev.desc)}</p>${extra}<div style="text-align:right"><button class="btn verde">Ok</button></div></div>`);
      clique($('button', p), () => { p.remove(); if (ev.id === 'feriado') Som.stopMusic(); res(); });
    });
  },
};

/* ---------- HUB do escritório ---------- */
const Hub = {
  abrir() {
    const st = Estado.st; st.fase = 'hub'; Estado.salvar();
    UI.limpar();
    if (Cena.nome !== 'escritorio') { Cena.setar('escritorio', 'andar'); st.time.forEach(m => Cena.ator(m.id, 20 + Math.random() * 260, 125 + Math.random() * 45)); }
    Som.stopMusic(); Som.ambient(true);
    UI.barra(); UI.engrenagem();
    const b = Regras.boss(st);
    const c = UI.html(`<div class="painel escuro" style="right:12px;top:58px;width:250px;text-align:center"><div class="sub">CHEFE DO MÊS</div><div class="tit" style="font-size:16px">${esc(b.nome)}</div><div class="sub">${esc(b.titulo)}</div><div class="bx" style="display:flex;justify-content:center;margin:4px 0"></div>
      <div style="font-size:11px">Fraco: ${b.fraco.length ? b.fraco.map(badgeArea).join('') : '<i>muda toda semana</i>'}</div><div style="font-size:11px;margin-top:3px">Resiste: ${b.resiste.length ? b.resiste.map(badgeArea).join('') : '<i>—</i>'}</div></div>`);
    $('.bx', c).appendChild(bossEl(b.id, 1));
    if (st.evento) UI.html(`<div class="painel" style="left:12px;top:58px;width:260px;font-size:12px;padding:8px"><b>Evento:</b> ${esc(Regras.EVENTO[st.evento].nome)}<br><span class="sub">${esc(Regras.EVENTO[st.evento].desc)}</span></div>`);
    const menu = UI.html(`<div style="position:absolute;left:12px;bottom:14px;display:flex;gap:12px"></div>`);
    const add = (t, sub, cls, fn) => { const bt = document.createElement('button'); bt.className = 'btn grande ' + cls; bt.innerHTML = t + `<div style="font-size:11px;font-weight:normal;text-transform:none">${sub}</div>`; menu.appendChild(clique(bt, fn)); };
    add('🛒 Mercado', `${st.mercado.length} candidatos · time ${st.time.length}/6`, '', () => Mercado.abrir());
    add('📚 Treino', st.treinoFeito ? `feito · ${st.pt} PT para gastar` : 'quiz de 5 perguntas', st.treinoFeito ? 'azul' : '', () => Treino.abrir());
    add('⚔ Escalação e combate', 'reunião das 8h', 'verde', () => Escalacao.abrir());
    if (!st.treinoFeito) UI.html(`<div class="painel" style="left:12px;bottom:96px;font-size:12px;padding:6px 10px">Dica: faça o treino antes do combate. Os pontos melhoram o time.</div>`);
  },
};

/* ---------- MERCADO ---------- */
const Mercado = {
  abrir() {
    const st = Estado.st; UI.limpar(); Cena.setar('mercado'); Som.ambient(false); Som.music('mercado'); Som.sfx('sino');
    st.mercado.forEach((id, i) => Cena.ator(id, 22 + i * 32, 124));
    this.render();
  },
  render() {
    const st = Estado.st; UI.limpar(); UI.barra(); UI.engrenagem();
    const b = Regras.boss(st);
    const topo = UI.html(`<div class="painel escuro" style="left:10px;top:52px;width:940px;padding:6px 10px;display:flex;justify-content:space-between;align-items:center"><span class="tit" style="font-size:16px">Mercado de talentos</span><span style="font-size:12px">Chefe do mês fraco contra: ${b.fraco.map(badgeArea).join('') || 'muda toda semana'} ${st.evento === 'promocao' ? '<b style="color:var(--ouro)">· PROMOÇÃO: metade do preço!</b>' : ''}</span></div>`);
    const lin = UI.html(`<div style="position:absolute;left:10px;top:98px;width:940px;display:flex;gap:8px"></div>`);
    if (!st.mercado.length) lin.innerHTML = '<div class="painel" style="position:relative">Ninguém mais disponível este mês.</div>';
    st.mercado.forEach(id => {
      const c = Regras.CHAR[id], custo = Regras.custoContratar(st, id), erro = Regras.podeContratar(st, id);
      const fr = b.fraco.includes(c.area) ? '<b style="color:#c05000">★ fraqueza do chefe</b>' : b.resiste.includes(c.area) ? '<span style="color:#7a7a90">▼ chefe resiste</span>' : '&nbsp;';
      const el = document.createElement('div'); el.className = 'carta'; el.style.width = '182px';
      el.innerHTML = `<div class="row"><span class="rt"></span><div><div class="nome">${esc(c.nome)}</div><div>${Regras.NIVEIS[c.nivel]}</div>${badgeArea(c.area)}</div></div>
        <div style="margin:4px 0">${statsHTML(c)}</div><div style="font-size:10px">${fr}</div>
        <div class="desv" title="${esc(c.desvDesc)}"><b>${esc(c.desv)}:</b> ${esc(c.desvDesc)}</div>
        <div style="margin-top:4px">Contratar: <span class="preco">${R$(custo)}</span><br>Salário: <b>${R$(Regras.salarioDe({ id }))}</b>/mês</div>
        <button class="btn peq verde" style="width:100%;margin-top:5px" ${erro ? 'title="' + esc(erro) + '"' : ''}>${erro === 'Dinheiro insuficiente.' ? 'Sem grana' : erro ? 'Time cheio' : 'Contratar'}</button>`;
      $('.rt', el).appendChild(retratoEl(id, 'neutro', 2));
      el.addEventListener('mouseenter', () => Som.sfx('folha'));
      $('button', el).addEventListener('click', () => {
        const e = Regras.contratar(st, id);
        if (e) { Som.sfx('recusado'); FX.num(160, 70, esc(e), 'info'); return; }
        if (c.nivel === 'S') Som.sfx('carimbo'); else Som.sfx('grampo');
        Estado.salvar(); Cena.atores = Cena.atores.filter(a => a.id !== id); this.render();
      });
      lin.appendChild(el);
    });
    const tm = UI.html(`<div class="painel escuro" style="left:10px;top:398px;width:940px;padding:5px 8px"><div class="row" style="justify-content:space-between"><b>Seu time (${st.time.length}/6) · folha ${R$(Regras.folha(st))}/mês</b>${dicaStats()}</div><div class="tl row" style="margin-top:5px;align-items:stretch"></div></div>`);
    st.time.forEach(m => {
      const c = Regras.CHAR[m.id], el = document.createElement('div'); el.className = 'carta'; el.style.width = '150px'; el.style.padding = '4px';
      el.innerHTML = `<div class="row"><span class="rt"></span><div><b>${esc(c.nome)}</b><br>${badgeArea(c.area)}<span style="font-size:10px">${c.nivel}</span></div></div><div style="font-size:10px">H${m.H} S${m.S} R${m.R} · ${R$(Regras.salarioDe(m))}</div><button class="btn peq verm" style="width:100%;margin-top:2px;padding:2px">Demitir</button>`;
      $('.rt', el).appendChild(retratoEl(m.id, 'neutro', 1));
      const bt = $('button', el); let conf = false;
      bt.addEventListener('click', () => {
        if (!conf) { conf = true; bt.textContent = 'Confirmar?'; Som.sfx('grampo'); return; }
        const e = Regras.demitir(st, m.id); if (e) { Som.sfx('recusado'); FX.num(160, 120, esc(e), 'info'); return; }
        Som.sfx('demissao'); Estado.salvar(); this.render();
      });
      $('.tl', tm).appendChild(el);
    });
    const voltar = document.createElement('button'); voltar.className = 'btn peq'; voltar.textContent = '← Voltar ao escritório';
    topo.appendChild(clique(voltar, () => Hub.abrir()));
  },
};

/* ---------- TREINO (quiz) ---------- */
const TEMAS = { rh: 'RH técnico', neg: 'Negócios', esc: 'Situações de escritório' };
const Treino = {
  abrir() {
    const st = Estado.st; UI.limpar(); Cena.setar('treino'); Som.ambient(false); Som.music('treino');
    if (st.treinoFeito) return this.distribuir();
    UI.barra(); UI.engrenagem();
    const p = UI.html(`<div class="painel" style="left:200px;top:90px;width:560px;text-align:center"><div class="tit">Hora do Quiz</div><p>Escolha o tema da capacitação do mês. São 5 perguntas, com 25 segundos cada.</p><div class="tm" style="display:flex;flex-direction:column;gap:10px"></div><div style="margin-top:12px"><button class="btn peq" id="volta">← Voltar</button></div></div>`);
    Object.entries(TEMAS).forEach(([k, n]) => { const b = document.createElement('button'); b.className = 'btn grande'; b.textContent = n; $('.tm', p).appendChild(clique(b, () => this.quiz(k))); });
    clique($('#volta', p), () => Hub.abrir());
  },
  sortear(tema) {
    const st = Estado.st, banco = PERGUNTAS[tema];
    let livres = banco.map((_, i) => i).filter(i => !st.usadas[tema].includes(i));
    if (livres.length < 5) { st.usadas[tema] = []; livres = banco.map((_, i) => i); }
    const esc5 = Regras.shuffle(livres, Math.random).slice(0, 5); st.usadas[tema].push(...esc5); return esc5.map(i => banco[i]);
  },
  async quiz(tema) {
    const qs = this.sortear(tema); let acertos = 0;
    for (let n = 0; n < 5; n++) {
      const r = await this.pergunta(qs[n], n, acertos, tema); if (r) acertos++;
    }
    this.resultado(acertos);
  },
  pergunta(q, n, acertos, tema) {
    return new Promise(res => {
      UI.limpar(); UI.engrenagem();
      const ordem = Regras.shuffle([0, 1, 2, 3], Math.random);
      const p = UI.html(`<div class="painel" style="left:120px;top:40px;width:720px"><div class="row" style="justify-content:space-between"><span class="sub">${TEMAS[tema]} · pergunta ${n + 1} de 5</span><span>${'●'.repeat(acertos)}${'○'.repeat(n - acertos)}</span></div>
        <div class="timer" style="margin:6px 0"><i style="width:100%"></i></div><div style="font-size:17px;font-weight:bold;margin:10px 0;line-height:1.35">${esc(q.q)}</div><div class="alts"></div><div class="exp" style="min-height:50px"></div></div>`);
      Som.sfx('tique');
      let fim = false, t0 = performance.now(); const DUR = 25000;
      const tick = setInterval(() => { const f = 1 - (performance.now() - t0) / DUR; $('.timer i', p).style.width = Math.max(0, f * 100) + '%'; if (f <= 0) responder(-1); else if (Math.floor((performance.now() - t0) / 1000) % 6 === 5 && Math.random() < 0.05) Som.sfx('tique'); }, 200);
      const botoes = ordem.map(i => { const b = document.createElement('button'); b.className = 'alt'; b.textContent = q.a[i]; b.onclick = () => responder(i); $('.alts', p).appendChild(b); return [i, b]; });
      function responder(i) {
        if (fim) return; fim = true; clearInterval(tick);
        const certo = i === q.c;
        botoes.forEach(([k, b]) => { b.disabled = true; if (k === q.c) b.classList.add('certa'); else if (k === i) b.classList.add('errada'); });
        Som.sfx(certo ? 'acertou' : 'buzina');
        $('.exp', p).innerHTML = `<div style="margin-top:8px;font-size:14px"><b style="color:${certo ? 'var(--verde)' : 'var(--verm)'}">${certo ? 'ACERTOU!' : i === -1 ? 'TEMPO ESGOTADO!' : 'ERROU!'}</b> ${esc(q.e)}</div><div style="text-align:right;margin-top:6px"><button class="btn verde">${n < 4 ? 'Próxima →' : 'Ver resultado'}</button></div>`;
        clique($('.exp button', p), () => res(certo));
      }
    });
  },
  resultado(ac) {
    const st = Estado.st, r = Regras.resultadoTreino(st, ac); Estado.salvar();
    UI.limpar(); UI.engrenagem();
    Som.sfx(ac === 5 ? 'plateia' : ac === 0 ? 'grilo' : 'acertou');
    if (r.mentoria) setTimeout(() => Som.sfx('diploma'), 1200);
    const msg = ac === 5 ? 'ARRASOU! Gabaritou o treinamento.' : ac === 0 ? '...cri, cri. Ninguém prestou atenção.' : ac >= 3 ? 'Bom treinamento!' : 'Dava pra ter sido melhor.';
    const p = UI.html(`<div class="painel" style="left:230px;top:110px;width:500px;text-align:center"><div class="tit">${ac} de 5</div><p style="font-size:16px">${msg}</p><p>Você ganhou <b>${r.pt} Pontos de Treino</b>${ac === 5 ? ' (com bônus de gabarito)' : ''}.</p>${r.mentoria ? '<p><b style="color:var(--verde)">MENTORIA LIBERADA!</b> Escolha um Sênior para ser o mentor deste mês.</p><div class="mt row" style="justify-content:center;flex-wrap:wrap"></div>' : (ac >= 4 ? '<p class="sub">Mentoria exige um Sênior no time.</p>' : '')}<button class="btn verde" id="seg" style="margin-top:10px">Distribuir pontos →</button></div>`);
    if (r.mentoria) {
      const sen = st.time.filter(m => Regras.CHAR[m.id].nivel === 'S'); st.mentor = sen[0].id;
      const desenhar = () => { $('.mt', p).innerHTML = ''; sen.forEach(m => { const b = document.createElement('button'); b.className = 'btn peq ' + (st.mentor === m.id ? 'verde' : ''); b.textContent = Regras.CHAR[m.id].nome; $('.mt', p).appendChild(clique(b, () => { st.mentor = m.id; Estado.salvar(); desenhar(); })); }); };
      desenhar();
    }
    clique($('#seg', p), () => this.distribuir());
  },
  distribuir() {
    const st = Estado.st; UI.limpar(); UI.barra(); UI.engrenagem();
    const p = UI.html(`<div class="painel" style="left:90px;top:56px;width:780px"><div class="row" style="justify-content:space-between"><div class="tit">Plano de desenvolvimento</div><div style="font-size:16px">Pontos: <b>${st.pt} PT</b></div></div>
      <div class="sub" style="margin:4px 0 8px">+1 H custa 2 PT · +1 S custa 1 PT · +1 R custa 2 PT. ${st.mentoria && st.mentor ? 'Mentor do mês: <b>' + esc(Regras.CHAR[st.mentor].nome) + '</b>.' : ''}</div><div class="lista-time"></div>
      <div class="row" style="justify-content:space-between;margin-top:10px"><button class="btn azul" id="curso">Curso pago: R$ ${Regras.CFG.precoCurso} mil = 1 PT (${st.cursos}/${Regras.CFG.maxCursosMes})</button><button class="btn verde" id="ok">Pronto ✓</button></div></div>`);
    st.time.forEach(m => {
      const c = Regras.CHAR[m.id], l = document.createElement('div'); l.className = 'linha';
      l.innerHTML = `<span class="rt"></span><b style="width:90px">${esc(c.nome)}</b>${badgeArea(c.area)}<span style="flex:1">${statsHTML(m)}</span>`;
      $('.rt', l).appendChild(retratoEl(m.id, 'neutro', 1));
      ['H', 'S', 'R'].forEach(k => { const b = document.createElement('button'); b.className = 'btn peq'; b.textContent = '+' + k; b.disabled = st.pt < Regras.CFG.custoTreino[k] || m[k] >= Regras.CFG.tetos[k]; l.appendChild(b); b.onclick = () => { if (!Regras.treinar(st, m.id, k)) { Som.sfx('diploma'); Estado.salvar(); this.distribuir(); } else Som.sfx('recusado'); }; });
      $('.lista-time', p).appendChild(l);
    });
    clique($('#curso', p), () => { const e = Regras.comprarCurso(st); if (e) { Som.sfx('recusado'); FX.num(160, 160, esc(e), 'info'); return; } Som.sfx('debito'); Estado.salvar(); this.distribuir(); });
    clique($('#ok', p), () => Hub.abrir());
  },
};

/* ---------- ESCALAÇÃO ---------- */
const Escalacao = {
  abrir() {
    const st = Estado.st; UI.limpar(); Cena.setar('reuniao'); Som.ambient(false); Som.music('escalacao');
    st.escalacao = st.escalacao.filter(id => st.time.some(m => m.id === id) && id !== st.atestado);
    this.render();
  },
  render() {
    const st = Estado.st, b = Regras.boss(st); UI.limpar(); UI.barra(); UI.engrenagem();
    const hp = Math.round(b.hp * Regras.CFG.hpEscala * (st.evento === 'feriado' ? 0.8 : 1));
    const bc = UI.html(`<div class="painel escuro" style="left:10px;top:54px;width:330px"><div class="sub">PAUTA: VENCER</div><div class="tit">${esc(b.nome)}</div><div class="sub">${esc(b.titulo)}</div>
      <div class="row" style="align-items:flex-start;margin-top:6px"><span class="bx"></span><div style="font-size:12px;line-height:1.5">Vida: <b>${hp}</b><br>Prazo: <b>${st.evento === 'feriado' ? 3 : 4} semanas</b><br>Fraco (×2):<br>${b.fraco.map(badgeArea).join('') || '<i>muda toda semana</i>'}<br>Resiste (×½):<br>${b.resiste.map(badgeArea).join('') || '<i>—</i>'}<br>Cobra: ${b.pressao[0]} alvo(s), +${b.pressao[1]} estresse</div></div>
      <div style="font-size:12px;margin-top:6px;background:rgba(0,0,0,.25);padding:6px"><b>Especial:</b> ${esc(b.espDesc)}</div></div>`);
    $('.bx', bc).appendChild(bossEl(b.id, 1));
    const tp = UI.html(`<div class="painel" style="left:352px;top:54px;width:598px"><div class="row" style="justify-content:space-between"><div class="tit">Escalação</div><span class="sub">Clique para escalar até 4. A ordem de clique é a ordem de ação.</span></div><div class="lista-time" style="margin-top:6px"></div></div>`);
    st.time.forEach(m => {
      const c = Regras.CHAR[m.id], idx = st.escalacao.indexOf(m.id), atest = st.atestado === m.id;
      const fr = b.fraco.includes(c.area) ? '<b style="color:#c05000">★ FRACO</b>' : b.resiste.includes(c.area) ? '<span style="color:#7a7a90">▼ RESISTE</span>' : '';
      const l = document.createElement('div'); l.className = 'linha' + (idx >= 0 ? ' sel' : '') + (atest ? ' bloq' : '');
      l.innerHTML = `<span class="num-ord">${idx >= 0 ? idx + 1 : ''}</span><span class="rt"></span><div style="width:110px"><b>${esc(c.nome)}</b><br>${badgeArea(c.area)}<span style="font-size:10px">${Regras.NIVEIS[c.nivel]}</span></div><div style="width:70px">${fr}</div><div style="flex:1">${statsHTML(m)}</div><div style="width:150px;font-size:10px;color:#7a2a3a">${atest ? '<b>DE ATESTADO</b>' : esc(c.desv)}${st.mentor === m.id && st.mentoria ? '<br><b style="color:var(--verde)">MENTOR</b>' : ''}</div>`;
      $('.rt', l).appendChild(retratoEl(m.id, 'neutro', 1));
      l.style.cursor = atest ? 'not-allowed' : 'pointer';
      l.addEventListener('click', () => {
        if (atest) { Som.sfx('recusado'); return; }
        Som.sfx('grampo');
        if (idx >= 0) st.escalacao.splice(idx, 1); else if (st.escalacao.length < 4) st.escalacao.push(m.id); else { Som.sfx('recusado'); return; }
        Estado.salvar(); this.render();
      });
      $('.lista-time', tp).appendChild(l);
    });
    const rod = UI.html(`<div style="position:absolute;right:10px;bottom:10px" class="row"></div>`);
    const v = document.createElement('button'); v.className = 'btn'; v.textContent = '← Voltar'; rod.appendChild(clique(v, () => Hub.abrir()));
    const go = document.createElement('button'); go.className = 'btn grande verde'; go.textContent = '⚔ Começar combate'; go.disabled = !st.escalacao.length;
    rod.appendChild(clique(go, () => { Regras.escalar(st, st.escalacao); Combate.iniciar(); }));
  },
};

/* ---------- COMBATE (apresentação; regras em Regras.semana) ---------- */
const SLOTS = [[22, 118], [58, 128], [94, 118], [130, 128]];
const Combate = {
  cb: null, ordens: {}, ocupado: false, rel: null,
  atorDe(id) { return Cena.atores.find(a => a.id === id); },
  async iniciar() {
    const st = Estado.st, b = Regras.boss(st);
    this.cb = Regras.iniciarCombate(st); this.ordens = {}; this.ocupado = true;
    st.fase = 'hub'; Estado.salvar();
    UI.limpar(); Cena.setar(Arte.ARENA_DO_CHEFE[b.id]); Som.ambient(false);
    Som.music(b.id === 'ceo' ? 'final' : b.tipo.startsWith('obj') ? 'chefe' : 'combate'); Som.setWeek(1);
    this.cb.time.forEach((u, i) => { const [x, y] = SLOTS[i]; Cena.ator(u.id, x, y, { baseX: x, baseY: y }); });
    Cena.boss = { id: b.id, x: 200, y: 12, alpha: 0, flash: 0, dx: 40, dy: 0, tremor: 0 };
    this.render(true);
    Cena.tween(Cena.boss, 'alpha', 1, 700); await Cena.tween(Cena.boss, 'dx', 0, 900);
    Som.sfx(SOM_CHEFE(b.id)); Cena.boss.tremor = 6;
    await esperar(b.id === 'ceo' ? 3200 : b.id === 'osvaldo' ? 2400 : 900);
    this.falaChefe(b.entrada, 2200); Som.say(b.entrada, b.tipo);
    await esperar(2300);
    Som.sfx('agenda'); FX.banner('VAMO TRABALHAR!', 'prazo: ' + this.cb.prazo + ' semanas');
    await esperar(1200);
    this.ocupado = false; this.render();
  },
  falaChefe(t, ms = 1600) { const b = Regras.boss(Estado.st); FX.balao(200, 20, t, b.tipo, ms); },
  ordemPadrao(u) {
    const c = Regras.CHAR[u.id], m = Regras.multArea(this.cb, c.area);
    if (u.id === 'pedro') return 'hard';
    if (u.id === 'caetano') return 'hard';
    return m === 'resiste' && u.S >= 2 ? 'soft' : 'hard';
  },
  render(semPainel) {
    const cb = this.cb, b = Regras.boss(Estado.st);
    UI.limpar(); UI.engrenagem();
    UI.html(`<div id="semanaBox">SEMANA ${Math.min(cb.semana + 1, cb.prazo)}/${cb.prazo}</div>`);
    UI.html(`<div id="hpBox"><div class="nm">${esc(b.nome.toUpperCase())} <span class="tt">· ${esc(b.titulo)}</span></div><div class="hp"><div class="back" style="width:${cb.hp / cb.hpMax * 100}%"></div><div class="front" style="width:${cb.hp / cb.hpMax * 100}%"></div><div class="seg"></div><div class="txt">${cb.hp}/${cb.hpMax}</div></div>
      <div style="font-size:11px;margin-top:3px">Fraco: ${cb.fraco.map(badgeArea).join('') || '?'} Resiste: ${cb.resiste.map(badgeArea).join('') || '—'}</div></div>`);
    if (semPainel) return;
    const pn = UI.html(`<div id="unidades"></div>`);
    cb.time.forEach(u => {
      const c = Regras.CHAR[u.id]; if (!this.ordens[u.id]) this.ordens[u.id] = this.ordemPadrao(u);
      const m = Regras.multArea(cb, c.area);
      const el = document.createElement('div'); el.className = 'uni' + (u.out ? ' out' : ''); el.dataset.id = u.id;
      el.innerHTML = `<div class="topo"><span class="rt"></span><div><div class="nome">${esc(c.nome)}</div>${badgeArea(c.area)}<div style="font-size:10px">H${u.H} S${u.S}</div></div></div>
        <div class="pips" title="Estresse ${u.estresse}/${u.R}">${Array.from({ length: u.R }, (_, i) => `<i class="${i < u.estresse ? 'on' : ''}"></i>`).join('')}</div>
        ${u.out ? '<b style="color:var(--verm)">FORA (sobrecarga)</b>' : `<div class="ord"><button data-o="hard" class="${this.ordens[u.id] === 'hard' ? 'sel' : ''}">HARD ${c.area}</button><button data-o="soft" class="${this.ordens[u.id] === 'soft' ? 'sel' : ''}" ${u.id === 'pedro' ? 'disabled title="Inflexível: nunca usa Soft"' : ''}>SOFT</button></div>
        <div class="dica ${m === 'fraco' ? 'f' : m === 'resiste' ? 'r' : ''}">${m === 'fraco' ? '★ Hard na fraqueza: ×2' : m === 'resiste' ? '▼ Chefe resiste ao Hard: ×½' : u.id === 'caetano' ? 'Soft dele ninguém entende' : 'Hard neutro'}</div>`}`;
      $('.rt', el).appendChild(retratoEl(u.id, u.out ? 'out' : u.estresse >= u.R - 1 ? 'nervoso' : 'neutro', 1));
      el.querySelectorAll('.ord button').forEach(bt => bt.onclick = () => { if (this.ocupado) return; Som.sfx('grampo'); this.ordens[u.id] = bt.dataset.o; this.render(); });
      pn.appendChild(el);
    });
    const go = document.createElement('button'); go.className = 'btn grande verde'; go.style.marginLeft = 'auto'; go.style.alignSelf = 'center';
    go.innerHTML = 'Executar<br>semana ▶'; go.disabled = this.ocupado;
    pn.appendChild(clique(go, () => this.executar()));
  },
  atualizarHP(hp) {
    const cb = this.cb, w = hp / cb.hpMax * 100 + '%';
    const f = $('.hp .front'), bk = $('.hp .back'), t = $('.hp .txt');
    if (f) { f.style.width = w; bk.style.width = w; t.textContent = hp + '/' + cb.hpMax; }
  },
  atualizarUni() {
    for (const u of this.cb.time) {
      const el = document.querySelector(`.uni[data-id="${u.id}"] .pips`); if (!el) continue;
      el.innerHTML = Array.from({ length: u.R }, (_, i) => `<i class="${i < u.estresse ? 'on' : ''}"></i>`).join('');
    }
  },
  async executar() {
    if (this.ocupado || this.cb.fim) return;
    this.ocupado = true; document.querySelectorAll('#unidades button').forEach(b => b.disabled = true);
    const ev = Regras.semana(this.cb, this.ordens);
    await this.animar(ev);
    if (this.cb.fim) return this.encerrar();
    this.ocupado = false; this.render();
  },
  async animar(evs) {
    const b = Regras.boss(Estado.st), B = Cena.boss, centroBoss = () => [B.x + 56, B.y + 50];
    for (const e of evs) {
      const a = e.who ? this.atorDe(e.who) : null, ax = a ? a.x + 16 : 0, ay = a ? a.y - 52 : 0;
      switch (e.t) {
        case 'semana':
          Som.setWeek(e.n); Som.sfx('segunda'); FX.banner('SEMANA ' + e.n, e.n === e.prazo ? 'ÚLTIMA SEMANA DO PRAZO!' : 'de ' + e.prazo);
          $('#semanaBox') && ($('#semanaBox').textContent = `SEMANA ${e.n}/${e.prazo}`); await esperar(1100); break;
        case 'especial':
          this.falaChefe(e.texto, 1900); Som.say(e.texto.split('!')[0] + '!', b.tipo, 0, { v: 0.6 }); B.tremor = 4; await esperar(1700); break;
        case 'desv':
          FX.balao(ax - 6, ay, e.texto, 'char', 1500); Som.sfx(somDesv(e.who)); a && (a.flash = 300); await esperar(1250); break;
        case 'perde': {
          const mot = { reuniao: 'em reunião', lento: 'ligando o PC...', esqueceu: 'esqueceu o prazo', folga: 'de folga', analise: 'analisando...', escrito: 'esperando e-mail', refaz: 'refazendo...', digital: 'barrado na catraca', centralizador: 'o Fausto tomou a vez' }[e.motivo] || 'perdeu a vez';
          FX.num(ax, ay + 10, mot, 'info'); if (e.junto) { const a2 = this.atorDe(e.junto); a2 && FX.num(a2.x + 16, a2.y - 42, 'na reunião', 'info'); }
          await esperar(700); break;
        }
        case 'mentoria': {
          const m = this.atorDe(e.mentor); Som.sfx('mentoria'); m && FX.balao(m.x + 10, m.y - 52, 'Dica do sênior!', 'char', 1100); await esperar(900); break;
        }
        case 'acao': await this.animarAcao(e, a, b); break;
        case 'sinergia': {
          Som.sfx('sinergia'); FX.banner('SINERGIA!', 'TIME!'); await esperar(500);
          const [cx, cy] = centroBoss(); FX.num(cx, cy, e.dano + '<small>bônus do time</small>', 'fraco'); B.flash = 400; Cena.shake = 8; this.atualizarHP(e.hp); await esperar(900); break;
        }
        case 'cura': { Som.sfx('retrabalho'); const [cx, cy] = centroBoss(); FX.num(cx, cy - 10, '+' + e.q + '<small>retrabalho</small>', 'cura'); this.atualizarHP(e.hp); await esperar(1000); break; }
        case 'chefe': {
          const fala = rnd(FALAS.provoca[b.id]); this.falaChefe(fala, 1500); Som.say(fala, b.tipo);
          await Cena.tween(B, 'dx', -18, 160); Cena.shake = 5;
          for (const g of e.golpes) { const t = this.atorDe(g.who); if (!t) continue; t.flash = 500; FX.num(t.x + 16, t.y - 40, '+' + g.q + ' estresse', 'est'); Som.sfx('resistencia'); }
          this.atualizarUni(); await Cena.tween(B, 'dx', 0, 300); await esperar(900); break;
        }
        case 'estresse': { FX.num(ax, ay + 8, '+' + e.q + ' estresse', 'est'); this.atualizarUni(); await esperar(500); break; }
        case 'out': {
          Som.sfx('sobrecarga'); if (a) { a.out = true; FX.balao(ax - 6, ay + 6, rnd(['preciso de um café...', 'vou ali e já volto', 'não dá mais...', 'alguém tem dipirona?']), 'char', 1500); }
          const el = document.querySelector(`.uni[data-id="${e.who}"]`); el && el.classList.add('out'); await esperar(1300); break;
        }
        case 'fim': break;
      }
    }
  },
  async animarAcao(e, a, b) {
    const B = Cena.boss, c = Regras.CHAR[e.who];
    if (!a) return;
    a.pose = 2; Cena.tween(a, 'y', a.baseY + 5, 160); await Cena.tween(a, 'x', a.baseX + 12, 160);
    Som.sfx(e.tipo === 'hard' ? 'hard' + e.area : 'soft');
    FX.balao(a.x + 6, a.y - 52, e.tipo === 'hard' ? c.golpe + '!' : 'Papo reto!', 'char', 900);
    const cor = e.tipo === 'hard' ? Arte.CORES_AREA[e.area] : '#ffffff';
    await Cena.projetil(a.x + 28, a.y - 30, B.x + 40 + Math.random() * 30, B.y + 40 + Math.random() * 30, cor, 300);
    const cx = B.x + 56, cy = B.y + 36;
    if (e.ruim) { Som.sfx('diaRuim'); FX.num(cx, cy, 'DIA RUIM<small>dado 1</small>', 'resiste'); }
    else if (e.dano <= 0) { FX.num(cx, cy, e.mult === 'travada' ? 'TRAVOU' : 'ERROU', 'resiste'); }
    else {
      B.flash = 350; B.tremor = Math.min(10, 2 + e.dano / 6);
      Cena.shake = Math.min(14, 2 + e.dano / 5);
      if (e.crit) { Som.sfx('critico'); FX.flash('#fff', 0.85); Cena.shake = 18; FX.num(cx, cy - 6, e.dano + '<small>INSIGHT! dado 6</small>', 'crit'); }
      else if (e.mult === 'fraco') { Som.sfx('fraqueza'); FX.num(cx, cy, e.dano + '<small>NA FERIDA!</small>', 'fraco'); }
      else if (e.mult === 'resiste') { Som.sfx('resistencia'); FX.num(cx, cy, e.dano + '<small>nem fez cosquinha</small>', 'resiste'); }
      else { Som.sfx('fraqueza'); FX.num(cx, cy, String(e.dano)); }
      for (let i = 0; i < Math.min(30, e.dano); i++) Cena.part.push({ x: cx + (Math.random() - 0.5) * 30, y: cy + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.8) * 0.1, vida: 0.7, cor: e.crit ? '#fff04a' : Arte.AURA[B.id], tam: 2 });
    }
    this.atualizarHP(e.hp);
    if (e.cura) { const t = this.atorDe(e.cura.who); t && FX.num(t.x + 16, t.y - 44, '-' + e.cura.q + ' estresse', 'cura'); this.atualizarUni(); }
    await esperar(e.crit ? 700 : 450);
    Cena.tween(a, 'y', a.baseY, 200); await Cena.tween(a, 'x', a.baseX, 200); a.pose = 0;
    await esperar(200);
  },
  async encerrar() {
    const st = Estado.st, cb = this.cb, b = Regras.boss(st), B = Cena.boss, vit = cb.fim.vitoria;
    if (vit) {
      const cedo = cb.prazo - cb.fim.semana;
      if (cedo > 0) { Som.sfx('pontoCedo'); FX.banner('BATEU O PONTO CEDO!', '+' + cedo * Regras.CFG.bonusSemanaCedo + ' mil de bônus'); await esperar(1500); }
      this.falaChefe(b.perde, 2000); Som.say(b.perde, b.tipo); await esperar(1600);
      B.morto = true; for (let i = 0; i < 12; i++) { B.flash = 200; Cena.shake = 10; for (let k = 0; k < 10; k++) Cena.part.push({ x: B.x + Math.random() * 112, y: B.y + Math.random() * 120, vx: (Math.random() - 0.5) * 0.15, vy: -Math.random() * 0.12, vida: 1, cor: rnd([Arte.AURA[B.id], '#fff', '#ffd166']), tam: 2 }); await esperar(110); }
      Cena.tween(B, 'alpha', 0, 600); await Cena.tween(B, 'dy', 20, 600);
      Som.music('vitoria'); FX.banner('META BATIDA!'); Cena.atores.forEach(a => a.pose = 2);
    } else {
      this.falaChefe(b.vence, 2200); Som.say(b.vence, b.tipo); await esperar(2000);
      Som.music('derrota'); FX.banner('VAI PRO FEEDBACK...'); Cena.atores.forEach(a => a.out = true);
    }
    await esperar(2600);
    this.rel = Regras.fimMes(st, cb);
    Entrevista.abrir(vit, cb);
  },
};

/* ---------- ENTREVISTA PARA A CÂMERA + FECHAMENTO ---------- */
const Entrevista = {
  abrir(vit, cb) {
    UI.limpar(); Cena.setar('entrevista'); Som.ambient(false);
    const st = Estado.st, b = Regras.BOSSES[this.mesDe(cb)];
    let quem;
    if (vit) quem = cb.time.slice().sort((p, q) => q.H - p.H)[0].id;
    else quem = rnd(cb.time).id;
    const fala = (Math.random() < 0.5 ? FALAS.porChar[quem][vit ? 0 : 1] : rnd(FALAS[vit ? 'vitoria' : 'derrota'])).replace('{chefe}', b.nome);
    const c = Regras.CHAR[quem];
    UI.html(`<div class="rec">REC</div>`);
    const rt = UI.html(`<div style="position:absolute;left:40px;top:80px;border:4px solid var(--tinta);box-shadow:6px 6px 0 rgba(0,0,0,.5)"></div>`);
    rt.appendChild(retratoEl(quem, vit ? 'feliz' : 'triste', 8));
    UI.html(`<div class="lower">${esc(c.nome.toUpperCase())}<small>${Regras.NIVEIS[c.nivel]} de ${CARGO[c.area]} · Distribuidora Boa Folha</small></div>`);
    const f = UI.html(`<div class="fala"></div>`);
    let i = 0; const tx = '“' + fala + '”';
    Som.say(fala, 'char', 0.2);
    const tm = setInterval(() => { i++; f.textContent = tx.slice(0, i); if (i >= tx.length) clearInterval(tm); }, 28);
    // olhar constrangido para a câmera
    setTimeout(() => { const img = rt.querySelector('canvas'); if (img) { img.getContext('2d').drawImage(Arte.retratoCanvas(quem, 'nervoso', 8), 0, 0); } }, 3800);
    const bt = UI.html(`<button class="btn verde" style="position:absolute;right:20px;bottom:20px">Fechamento do mês →</button>`);
    clique(bt, () => { clearInterval(tm); this.fechamento(); });
  },
  mesDe(cb) { return Regras.BOSSES.findIndex(x => x.id === cb.bossId); },
  async fechamento() {
    const st = Estado.st, r = Combate.rel; UI.limpar(); Cena.setar('escritorio');
    const p = UI.html(`<div class="painel" style="left:250px;top:60px;width:460px;font-size:15px;line-height:1.7"><div class="tit">Fechamento · ${Regras.MESES[r.mes]}</div><div class="lin"></div></div>`);
    const L = $('.lin', p), add = async (h, som, ms = 700) => { L.insertAdjacentHTML('beforeend', '<div>' + h + '</div>'); if (som) Som.sfx(som); await esperar(ms); };
    await add(r.vitoria ? `✔ Chefe vencido${r.cedo ? ` (${r.cedo} semana(s) antes do prazo)` : ''}` : '✘ Chefe não foi vencido', null, 500);
    await add(`Receita: <b style="color:var(--verde)">+${R$(r.receita)}</b>`, 'debito');
    if (r.demissoes.length) for (const id of r.demissoes) await add(`<b style="color:var(--verm)">${esc(Regras.CHAR[id].nome)} pediu demissão!</b> “TÔ FORA!”`, 'demissao', 1300);
    await add(`Salários: <b style="color:var(--verm)">-${R$(r.salarios)}</b>${r.gloria ? ' <span class="sub">(com os honorários da Glória)</span>' : ''}`, r.gloria ? 'dGloria' : 'debito');
    await add(`Caixa: <b class="${st.caixa < 0 ? 'dinheiro-neg' : ''}">${R$(st.caixa)}</b> · Derrotas: ${st.derrotas}/${Regras.CFG.maxDerrotas}`, null, 400);
    if (st.fim) { Estado.apagar(); const bt = document.createElement('button'); bt.className = 'btn grande verde'; bt.textContent = 'Continuar'; p.appendChild(clique(bt, () => Fim.abrir(st.fim))); return; }
    Estado.salvar(true);
    await add('<span class="sub">💾 Progresso salvo.</span>', null, 200);
    const bt = document.createElement('button'); bt.className = 'btn grande verde'; bt.textContent = 'Próximo mês →'; bt.style.marginTop = '8px';
    p.appendChild(clique(bt, () => Jogo.inicioMes()));
  },
};

/* ---------- FIM DE JOGO ---------- */
const Fim = {
  abrir(tipo) {
    const st = Estado.st; UI.limpar(); Som.ambient(false);
    if (tipo === 'vitoria') {
      Cena.setar('escritorio', 'andar'); st.time.forEach(m => { const a = Cena.ator(m.id, 30 + Math.random() * 240, 130 + Math.random() * 40); a.cam = 4000; });
      Som.music('fimVitoria'); Som.sfx('plateia');
      const mvp = st.time.slice().sort((a, b) => b.H + b.S - a.H - a.S)[0];
      const p = UI.html(`<div class="painel" style="left:220px;top:40px;width:520px;text-align:center"><div class="tit" style="font-size:28px">Funcionário do Ano!</div><p style="font-size:15px">Você venceu o CEO e sobreviveu a um ano inteiro no RH da Distribuidora Boa Folha.</p><div class="rt" style="display:flex;justify-content:center"></div><p><b>${esc(Regras.CHAR[mvp.id].nome)}</b> foi eleito o destaque do time.</p><p>Vitórias: <b>${st.vitorias}/12</b> · Caixa final: <b>${R$(st.caixa)}</b> · Time: <b>${st.time.length}</b></p><button class="btn grande verde">Jogar de novo</button></div>`);
      $('.rt', p).appendChild(retratoEl(mvp.id, 'feliz', 3));
      clique($('button', p), () => Menu.abrir());
    } else {
      Cena.setar('escritorio'); Som.music('fimDerrota');
      const motivo = { falencia: 'O caixa ficou no vermelho depois da folha de pagamento. A diretoria fechou as contas e o RH junto.', demitido: 'Quatro metas perdidas no ano. A diretoria resolveu “reestruturar” o RH. Você é a reestruturação.', derrotaFinal: 'O CEO não ficou impressionado na reunião de dezembro. Reestruturação, você entende.' }[tipo];
      const p = UI.html(`<div class="bilhete"><div style="font-size:26px;font-weight:bold;letter-spacing:2px">BILHETE AZUL</div><p>Prezado(a) gestor(a) de RH,</p><p>${esc(motivo)}</p><p>Você chegou até <b>${Regras.MESES[st.mes]}</b> com <b>${st.vitorias}</b> vitória(s).</p><p style="text-align:right">Atenciosamente,<br>A Diretoria</p><button class="btn grande">Tentar de novo</button></div>`);
      clique($('button', p), () => Menu.abrir());
    }
  },
};

/* ---------- inicialização ---------- */
function ajustarEscala() { const s = Math.min(innerWidth / 960, innerHeight / 540); document.getElementById('stage').style.transform = `scale(${s})`; }
window.addEventListener('resize', ajustarEscala);
window.addEventListener('DOMContentLoaded', () => {
  UI.ui = $('#ui'); FX.el = $('#fx');
  const tela = $('#tela'); Cena.ctx = tela.getContext('2d'); Cena.ctx.imageSmoothingEnabled = false;
  ajustarEscala(); loopCena(); Opcoes.criarBotoes();
  Cena.setar('fachada');
  const splash = UI.html(`<div class="modal" style="cursor:pointer"><div class="painel" style="position:relative;text-align:center;width:460px"><div class="tit" style="font-size:32px">BOA FOLHA</div><div class="sub" style="font-size:14px;margin:6px 0 14px">Um Ano no RH</div><button class="btn grande verde">Clique para bater o ponto</button><div class="sub" style="margin-top:10px">Jogo com som. Use fones ou ajuste o volume em ♪ SOM.</div></div></div>`);
  splash.addEventListener('click', () => { Som.init(); Opcoes.aplicar(); Opcoes.sincronizar(); Som.sfx('grampo'); splash.remove(); Menu.abrir(); }, { once: true });
});
