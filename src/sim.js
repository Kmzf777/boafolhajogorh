// Simulador: N partidas com uma IA simples. Uso: node src/sim.js [N] [taxaAcertoQuiz]
const R = require('./regras.js');
const N = +process.argv[2] || 1000, ACERTO = +process.argv[3] || 0.6;
let seed = 12345; const rng = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

function valor(m, b, st) {
  const c = R.CHAR[m.id]; const mult = b.fraco.includes(c.area) ? 2 : b.resiste.includes(c.area) ? 0.5 : 1;
  return Math.max(m.H * 3 * mult, m.S * 2 + 2) * (c.nivel === 'S' && c.id === 'gugu' ? 0.7 : 1) + m.R;
}
function jogar() {
  const st = R.novoJogo(); const log = [];
  while (!st.fim) {
    R.iniciarMes(st, rng);
    const b = R.boss(st);
    // mercado: contrata enquanto mantém reserva para a folha
    let mudou = true;
    while (mudou) {
      mudou = false;
      const ops = st.mercado.map(id => ({ id, m: { id, ...R.CHAR[id] } })).filter(o => !R.podeContratar(st, o.id))
        .filter(o => st.caixa - R.custoContratar(st, o.id) >= R.folha(st) + R.CHAR[o.id].salario + 2)
        .sort((a, z) => valor(z.m, b, st) / R.custoContratar(st, z.id) - valor(a.m, b, st) / R.custoContratar(st, a.id));
      if (ops.length) { R.contratar(st, ops[0].id); mudou = true; }
    }
    // troca o pior por um candidato bem melhor
    if (st.time.length >= 6) {
      const pior = st.time.slice().sort((a, z) => valor(a, b, st) - valor(z, b, st))[0];
      const melhor = st.mercado.map(id => ({ id, m: { id, ...R.CHAR[id] } })).filter(o => st.caixa - R.custoContratar(st, o.id) >= R.folha(st) + R.CHAR[o.id].salario + 8)
        .sort((a, z) => valor(z.m, b, st) - valor(a.m, b, st))[0];
      if (melhor && valor(melhor.m, b, st) > valor(pior, b, st) * 1.4) { R.demitir(st, pior.id); R.contratar(st, melhor.id); }
    }
    while (st.caixa - R.CFG.precoCurso >= R.folha(st) + 10 && !R.comprarCurso(st));
    // treino
    let ac = 0; for (let i = 0; i < 5; i++) if (rng() < ACERTO) ac++;
    R.resultadoTreino(st, ac);
    const sen = st.time.filter(m => R.CHAR[m.id].nivel === 'S'); if (st.mentoria && sen.length) st.mentor = sen[0].id;
    // escalação: melhores contra o chefe
    const ord = st.time.filter(m => !R.ausencia(st, m.id)).sort((a, z) => valor(z, b, st) - valor(a, b, st));
    R.escalar(st, ord.slice(0, 4).map(m => m.id));
    // gasta PT no H do melhor escalado
    let guard = 20; while (st.pt >= 2 && guard--) { const alvo = st.escalacao.map(id => st.time.find(m => m.id === id)).sort((a, z) => z.H - a.H).find(m => m.H < 10); if (!alvo || R.treinar(st, alvo.id, 'H')) break; }
    const cb = R.iniciarCombate(st, rng);
    while (!cb.fim) {
      const ordens = {};
      for (const u of cb.time) {
        const area = R.CHAR[u.id].area, mult = R.multArea(cb, area);
        const aperto = cb.time.some(x => !x.out && x.estresse >= x.R - 1);
        ordens[u.id] = (mult === 'resiste' || (aperto && u.S >= 3 && mult !== 'fraco')) ? 'soft' : 'hard';
      }
      R.semana(cb, ordens, rng);
    }
    const rel = R.fimMes(st, cb, rng);
    log.push({ mes: rel.mes, vit: rel.vitoria, caixa: st.caixa, time: st.time.length, sem: cb.fim.semana, hpRest: cb.hp / cb.hpMax });
  }
  return { st, log };
}
const porMes = Array.from({ length: 12 }, () => ({ jog: 0, vit: 0, caixa: 0, time: 0, hpRest: 0 }));
const fins = {}; let contr = 0, mesesTot = 0;
for (let i = 0; i < N; i++) {
  const { st, log } = jogar();
  fins[st.fim] = (fins[st.fim] || 0) + 1;
  for (const l of log) { const p = porMes[l.mes]; p.jog++; p.vit += l.vit; p.caixa += l.caixa; p.time += l.time; if (!l.vit) p.hpRest += l.hpRest; }
  contr += st.time.length; mesesTot += log.length;
}
console.log(`Partidas: ${N}  acerto no quiz: ${ACERTO}`);
console.log('Mês         Jogadas  Vitória  Caixa médio  Time médio  Vida restante do chefe nas derrotas');
porMes.forEach((p, i) => p.jog && console.log(
  `${R.MESES[i].padEnd(11)} ${String(p.jog).padStart(7)}  ${(p.vit / p.jog * 100).toFixed(0).padStart(6)}%  ${(p.caixa / p.jog).toFixed(1).padStart(10)}  ${(p.time / p.jog).toFixed(1).padStart(10)}  ${p.jog - p.vit ? (p.hpRest / (p.jog - p.vit) * 100).toFixed(0) + '%' : '-'}`));
console.log('Finais:', fins, ' tamanho médio do time no fim:', (contr / N).toFixed(1), ' meses jogados em média:', (mesesTot / N).toFixed(1));
