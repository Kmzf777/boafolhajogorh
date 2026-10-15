/* =========================================================================
   MÓDULO REGRAS — dados do jogo + lógica pura (sem visual, roda no Node)
   ========================================================================= */
const Regras = (() => {
  const CFG = {
    caixaInicial: 22,          // R$ mil
    timeInicial: ['carlinhos', 'gil', 'junior'],
    maxTime: 6, maxCampo: 4, semanas: 4, ofertasMercado: 5,
    receitaBase: 14, receitaPorMes: 3, bonusSemanaCedo: 3, receitaDerrota: 8,
    maxDerrotas: 4,
    custoTreino: { H: 2, S: 1, R: 2 }, tetos: { H: 10, S: 8, R: 8 },
    dadoMul: [0, 0.7, 0.9, 1.1, 1.3, 2.0],   // índice = dado-1
    hardBase: 3, softBase: 2, softFixo: 2,
    multFraco: 2, multResiste: 0.5,
    sinergiaMin: 3, chanceDemissaoSenior: 0.25,
    hpEscala: 1, precoCurso: 4, maxCursosMes: 3, chanceAusencia: 0.25, minTimeAusencia: 4,
  };
  const AREAS = { FIN: 'Financeiro', DAD: 'Dados', JUR: 'Jurídico', TEC: 'Tecnologia', VEN: 'Vendas', OPE: 'Operações' };
  const NIVEIS = { J: 'Júnior', P: 'Pleno', S: 'Sênior' };

  // id, nome, nível, área, H, S, R, custo, salário, golpe, desvantagem, descrição, fala
  const CHARS = [
    ['carlinhos', 'Carlinhos', 'J', 'FIN', 3, 2, 3, 5, 2, 'Planilha Conferida 3x', 'Medo de Errar', '30%: trava e causa só metade do dano.', 'e se der errado?'],
    ['luciano', 'Luciano', 'P', 'VEN', 4, 4, 4, 10, 4, 'Proposta Irrecusável', 'Promete Demais', '30%: aposta alto. Dado 4+ dá dano ×1,5; senão erra e leva +1 de estresse.', 'ENTREGO AMANHÃ!'],
    ['felipe', 'Felipe', 'J', 'TEC', 4, 1, 3, 6, 2, 'Script Salvador', 'Fone de Ouvido 24h', '30%: não escuta a ordem e troca Hard por Soft (ou o contrário).', '♪ ♫ ♪'],
    ['anamaria', 'Ana Maria', 'S', 'OPE', 6, 4, 6, 18, 7, 'Processo Impecável', 'Lento', 'Sempre age por último. Na 1ª semana ainda está ligando o computador.', '...já vou...'],
    ['sandy', 'Sandy', 'P', 'JUR', 4, 3, 4, 9, 4, 'Parecer Blindado', 'Pede Tudo por Escrito', '30%: perde a ação esperando o e-mail, mas a próxima causa dano dobrado.', 'Me manda por escrito?'],
    ['tata', 'Tatá', 'P', 'DAD', 5, 2, 4, 10, 4, 'Dashboard Definitivo', 'Paralisia por Análise', '30%: fica analisando e não age; ganha +2 no próximo dado.', 'hmmmm...'],
    ['hebe', 'Hebe', 'P', 'VEN', 3, 5, 4, 9, 4, 'Networking de Corredor', 'Fofoca no Cafezinho', '25%: espalha fofoca e dá +1 de estresse a um colega. O Soft dela tira 2 de estresse.', 'SABIA QUE...?'],
    ['gil', 'Gil', 'J', 'TEC', 3, 3, 3, 5, 2, 'Gambiarra Funcional', 'Disperso', '30%: se distrai e ataca com uma área aleatória.', 'ah, oi? o quê?'],
    ['junior', 'Junior', 'J', 'OPE', 3, 2, 4, 4, 2, 'Arquivo Morto Ressuscitado', 'Esquece Prazos', 'Na última semana, 50%: esquece e não age.', 'ERA HOJE?!'],
    ['fatima', 'Fátima', 'S', 'DAD', 5, 5, 5, 16, 6, 'Alinhamento Estratégico', 'Reunião que Podia Ser E-mail', '25%: puxa o próximo colega para uma reunião; os dois perdem a ação, mas tiram 1 de estresse.', 'Bora alinhar rapidinho?'],
    ['fausto', 'Fausto', 'S', 'FIN', 6, 3, 5, 18, 7, 'Auditoria Relâmpago', 'Centralizador', '30%: toma a vez do próximo colega e age de novo, mas ganha +1 de estresse.', 'DEIXA QUE EU FAÇO.'],
    ['ivete', 'Ivete', 'P', 'VEN', 5, 4, 4, 11, 5, 'Pitch Contagiante', 'Rouba os Créditos', '30%: o próximo colega causa só metade do dano.', 'foi ideia minha!'],
    ['luan', 'Luan', 'P', 'TEC', 5, 3, 4, 10, 4, 'Deploy de Sexta', 'Só Trabalha Remoto', '30%: a conexão cai e a ação falha.', 'TÁ ME OUVINDO?'],
    ['gloria', 'Glória', 'S', 'JUR', 7, 3, 5, 20, 7, 'Liminar Instantânea', 'Honorários Caros', 'Recebe 50% a mais de salário todo mês.', 'Meus honorários, querido.'],
    ['caetano', 'Caetano', 'S', 'DAD', 6, 1, 5, 17, 6, 'Modelo Preditivo', 'Fala Grego', 'O Soft dele nunca funciona: ninguém entende o que ele diz.', 'a sinergia ontológica do KPI...'],
    ['angelica', 'Angélica', 'P', 'OPE', 4, 3, 5, 9, 4, 'Checklist Implacável', 'Microgerente', '30%: o próximo colega age com -1 no dado.', 'Me copia nesse e-mail.'],
    ['pedro', 'Pedro', 'P', 'JUR', 5, 2, 5, 10, 4, 'Cláusula Pétrea', 'Inflexível', 'Nunca usa Soft: sempre parte para o Hard.', 'regra é regra.'],
    ['roberto', 'Roberto', 'S', 'FIN', 7, 2, 4, 18, 7, 'Fechamento Madrugador', 'Workaholic Exausto', 'Ganha +1 de estresse a cada ação. 15%: tira folga e não age.', 'TÔ DE FOLGA.'],
    ['marilia', 'Marília', 'S', 'OPE', 6, 3, 5, 17, 6, 'Entrega Perfeita', 'Perfeccionista', '30%: refaz tudo e não entrega nesta semana; a próxima ação tem dado mínimo 4.', 'vou refazer.'],
    ['gugu', 'Gugu', 'S', 'VEN', 6, 5, 5, 19, 7, 'Fechamento do Trimestre', 'Sempre em Reunião', '30%: está em reunião e não age.', 'só um minutinho...'],
  ].map(([id, nome, nivel, area, H, S, R, custo, salario, golpe, desv, desvDesc, fala]) =>
    ({ id, nome, nivel, area, H, S, R, custo, salario, golpe, desv, desvDesc, fala }));
  const CHAR = Object.fromEntries(CHARS.map(c => [c.id, c]));

  // Chefes do ano
  const BOSSES = [
    { id: 'osvaldo', nome: 'Seu Osvaldo', titulo: 'O Dono Que Quer Mais', tipo: 'boss', hp: 85, fraco: ['VEN'], resiste: ['FIN'], pressao: [1, 1], esp: 'meta',
      espDesc: 'Na semana 3 exige mais 40%: recupera 15% da vida.', entrada: 'Quero 40% a mais. Com o mesmo time.', vence: 'Ano que vem a gente conversa sobre aumento.', perde: 'Hmm. Até que vocês dão pro gasto.' },
    { id: 'ponto', nome: 'O Ponto Eletrônico', titulo: 'Guardião da Catraca', tipo: 'obj:ponto', hp: 110, fraco: ['TEC'], resiste: ['VEN'], pressao: [1, 1], esp: 'digital',
      espDesc: 'Toda semana, o primeiro a agir tem 35% de chance de ter a digital recusada.', entrada: 'Digital não reconhecida. Tente novamente.', vence: 'Ponto batido com atraso. Desconto em folha.', perde: 'Registro... aceito...' },
    { id: 'clotilde', nome: 'Dona Clotilde', titulo: 'Contadora Implacável', tipo: 'boss', hp: 120, fraco: ['DAD'], resiste: ['OPE'], pressao: [2, 1], esp: 'caneta',
      espDesc: 'Não se comove com papo: o Soft causa metade do dano.', entrada: 'Isso aqui não fecha. Refaz.', vence: 'Eu avisei que não fechava.', perde: 'Fechou. Mas eu vou conferir de novo.' },
    { id: 'leao', nome: 'O Leão da Receita', titulo: 'Fera da Malha Fina', tipo: 'obj:leao', hp: 150, fraco: ['FIN', 'JUR'], resiste: ['VEN', 'TEC'], pressao: [1, 2], esp: 'malha',
      espDesc: 'No fim da semana 2 cai na malha fina: recupera 20% da vida.', entrada: 'Cadê a nota fiscal?', vence: 'Multa e juros. Grrr.', perde: 'Declaração... retificada...' },
    { id: 'cliente', nome: 'O Cliente da Escola', titulo: 'Pai do Aluno do 5º B', tipo: 'boss', hp: 170, fraco: ['VEN'], resiste: ['JUR'], pressao: [2, 1], esp: 'gerente',
      espDesc: 'Cada semana fica mais bravo: a pressão sobe +1.', entrada: 'QUERO FALAR COM O GERENTE!', vence: 'Vou postar na internet!', perde: 'Tá bom, levo os cadernos. Mas sem desconto não!' },
    { id: 'conselho', nome: 'O Conselho', titulo: 'Três Cadeiras, Zero Consenso', tipo: 'boss', hp: 210, fraco: ['DAD', 'FIN'], resiste: ['OPE'], pressao: [3, 1], esp: 'consenso',
      espDesc: 'Ninguém se acalma diante do Conselho: o Soft não tira estresse.', entrada: 'Precisamos de sinergia. Mas não essa.', vence: 'Vamos marcar outra reunião para decidir.', perde: 'Aprovado... por maioria simples.' },
    { id: 'excel', nome: 'O Computador do Excel', titulo: 'Windows 98 Imortal', tipo: 'obj:excel', hp: 240, fraco: ['TEC'], resiste: ['DAD'], pressao: [2, 1], esp: 'trava',
      espDesc: 'Toda semana trava uma área aleatória: ela não causa dano.', entrada: 'Planilha não está respondendo.', vence: 'Arquivo corrompido. Salvar alterações? Não.', perde: 'Desligando... o... sistema...' },
    { id: 'valdemar', nome: 'Dr. Valdemar', titulo: 'Advogado da Parte Contrária', tipo: 'boss', hp: 250, fraco: ['JUR'], resiste: ['VEN', 'FIN'], pressao: [2, 2], esp: 'recurso',
      espDesc: 'Na última semana entra com recurso: recebe 25% menos dano.', entrada: 'Meu cliente não vai pagar nada.', vence: 'Nos vemos na segunda instância.', perde: 'Vamos... fazer um acordo.' },
    { id: 'auditor', nome: 'O Auditor de Gravata Bege', titulo: 'Silêncio que Anota', tipo: 'boss', hp: 300, fraco: ['DAD', 'OPE'], resiste: ['TEC'], pressao: [2, 1], esp: 'anota',
      espDesc: 'Anota tudo: cada dado 1 da equipe dá +2 de estresse em quem tirou.', entrada: '...', vence: '(anota algo. sai da sala.)', perde: 'Sem ressalvas.' },
    { id: 'pendrive', nome: 'O Pen Drive', titulo: 'Portador do Vírus Ancestral', tipo: 'obj:pendrive', hp: 285, fraco: ['TEC', 'OPE'], resiste: ['JUR'], pressao: [2, 2], esp: 'virus',
      espDesc: 'O vírus se replica: recupera 8% da vida no fim de cada semana.', entrada: 'Dispositivo conectado. HA HA HA!', vence: 'Seus arquivos agora são meus!', perde: 'Remover... com segurança...' },
    { id: 'impressora', nome: 'A Impressora Rosa', titulo: 'Rainha do Atolamento', tipo: 'obj:impressora', hp: 300, fraco: ['OPE'], resiste: ['TEC', 'DAD'], pressao: [3, 1], esp: 'atola',
      espDesc: 'Papel atolado: cada ação tem 20% de chance de falhar.', entrada: 'Ciano vazio. Papel atolado.', vence: 'Imprimindo 400 páginas em branco...', perde: 'Toner... recarregado...' },
    { id: 'ceo', nome: 'O CEO', titulo: 'Chefe Final do Board', tipo: 'boss', hp: 290, fraco: [], resiste: [], pressao: [3, 2], esp: 'board',
      espDesc: 'A fraqueza muda toda semana, e a área da semana anterior vira resistência. Recupera 10% da vida na semana 2.', entrada: '(tosse) Então vocês são o RH.', vence: 'Reestruturação. Vocês entendem.', perde: 'Funcionários do ano. Bom trabalho.' },
  ];
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const EVENTOS = [
    { id: 'feriado', nome: 'Feriado prolongado', desc: 'SEXTOU! O prazo do combate cai para 3 semanas, mas o chefe também emendou e chega com 20% menos vida.' },
    { id: 'cafe', nome: 'Café novo na copa', desc: 'OLHA O CAFÉ! Todo o time ganha +1 de Resiliência neste mês.' },
    { id: 'gripe', nome: 'Surto de gripe', desc: 'Atchim! Um colega aleatório está de atestado e não pode ser escalado neste mês.' },
    { id: 'corte', nome: 'Corte de custos', desc: 'A diretoria passou a tesoura: -R$ 6 mil no caixa.' },
    { id: 'elogio', nome: 'Cliente elogiou', desc: 'UHUUU! Um cliente mandou e-mail elogiando: +R$ 8 mil no caixa.' },
    { id: 'verba', nome: 'Verba de treinamento', desc: 'Sobrou verba no orçamento: +3 Pontos de Treino.' },
    { id: 'promocao', nome: 'Promoção no mercado', desc: 'Liquidação de talentos: contratações pela metade do preço neste mês.' },
    { id: 'tranquilo', nome: 'Mês tranquilo', desc: 'Ar-condicionado zumbindo, passarinho cantando. Nada de especial acontece.' },
  ];
  const EVENTO = Object.fromEntries(EVENTOS.map(e => [e.id, e]));
  // Ausências: quem está ausente não pode ser escalado no mês
  const AUSENCIAS = {
    atestado: { nome: 'De atestado', motivo: 'gripe forte', desc: 'Febre de 39º. Volta no mês que vem.' },
    homeoffice: { nome: 'Home office', motivo: 'a VPN caiu', desc: 'Tá trabalhando... em tese. A internet não colabora.' },
    licenca: { nome: 'De licença', motivo: 'bebê novo na família', desc: 'Licença-maternidade/paternidade. Fraldas > planilhas.' },
    ferias: { nome: 'De férias', motivo: 'férias vencidas', desc: 'Celular desligado. Não adianta mandar áudio.' },
    aniversario: { nome: 'Folga de aniversário', motivo: 'é o dia dele(a)!', desc: 'Day off de aniversário. Parabéns, sem crachá hoje.' },
  };
  const ausencia = (st, id) => { const a = (st.ausencias || []).find(x => x.id === id); return a ? a.tipo : null; };

  /* ---------- utilidades ---------- */
  const d6 = rng => 1 + Math.floor(rng() * 6);
  const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
  function shuffle(a, rng) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function membro(id) { const c = CHAR[id]; return { id, H: c.H, S: c.S, R: c.R, meses: 0 }; }
  function salarioDe(m) { const c = CHAR[m.id]; return c.id === 'gloria' ? Math.round(c.salario * 1.5) : c.salario; }
  function folha(st) { return st.time.reduce((s, m) => s + salarioDe(m), 0); }
  function custoContratar(st, id) { const c = CHAR[id].custo; return st.evento === 'promocao' ? Math.ceil(c / 2) : c; }
  function boss(st) { return BOSSES[st.mes]; }

  /* ---------- ciclo do ano ---------- */
  function novoJogo() {
    return { v: 1, mes: 0, caixa: CFG.caixaInicial, derrotas: 0, vitorias: 0, pt: 0, time: CFG.timeInicial.map(membro),
      evento: null, ausencias: [], mercado: [], cursos: 0, mentoria: false, mentor: null, treinoFeito: false, escalacao: [], fase: 'inicioMes', fim: null, historico: [] };
  }
  // Prepara o mês: evento + mercado. Retorna o evento (ou null).
  function iniciarMes(st, rng = Math.random) {
    st.evento = null; st.ausencias = []; st.cursos = 0; st.mentoria = false; st.mentor = null; st.treinoFeito = false;
    if (st.mes > 0) {
      const ev = pick(EVENTOS, rng); st.evento = ev.id;
      if (ev.id === 'corte') st.caixa -= 6;
      if (ev.id === 'elogio') st.caixa += 8;
      if (ev.id === 'verba') st.pt += 3;
      if (ev.id === 'gripe' && st.time.length > 1) st.ausencias.push({ id: pick(st.time, rng).id, tipo: 'atestado' });
      const livres = st.time.filter(m => !ausencia(st, m.id));
      if (st.time.length >= CFG.minTimeAusencia && livres.length > 3 && rng() < CFG.chanceAusencia)
        st.ausencias.push({ id: pick(livres, rng).id, tipo: pick(['homeoffice', 'licenca', 'ferias', 'aniversario'], rng) });
    }
    const livres = CHARS.filter(c => !st.time.some(m => m.id === c.id)).map(c => c.id);
    st.mercado = shuffle(livres, rng).slice(0, CFG.ofertasMercado);
    st.escalacao = st.time.filter(m => !ausencia(st, m.id)).slice(0, CFG.maxCampo).map(m => m.id);
    st.fase = 'hub';
    return st.evento ? EVENTO[st.evento] : null;
  }
  function podeContratar(st, id) {
    if (st.time.length >= CFG.maxTime) return 'Time cheio (máximo ' + CFG.maxTime + ').';
    if (!st.mercado.includes(id)) return 'Candidato indisponível.';
    if (st.caixa < custoContratar(st, id)) return 'Dinheiro insuficiente.';
    return null;
  }
  function contratar(st, id) {
    const erro = podeContratar(st, id); if (erro) return erro;
    st.caixa -= custoContratar(st, id);
    st.time.push(membro(id));
    st.mercado = st.mercado.filter(x => x !== id);
    if (st.escalacao.length < CFG.maxCampo) st.escalacao.push(id);
    return null;
  }
  function demitir(st, id) {
    if (st.time.length <= 1) return 'Não dá para ficar sem ninguém.';
    st.time = st.time.filter(m => m.id !== id);
    st.escalacao = st.escalacao.filter(x => x !== id);
    if (st.mentor === id) st.mentor = null;
    return null;
  }
  function resultadoTreino(st, acertos) {
    st.treinoFeito = true;
    st.pt += acertos + (acertos === 5 ? 2 : 0);
    st.mentoria = acertos >= 4 && st.time.some(m => CHAR[m.id].nivel === 'S');
    return { pt: acertos + (acertos === 5 ? 2 : 0), mentoria: st.mentoria };
  }
  // Curso pago: troca dinheiro por Pontos de Treino (limite por mês)
  function comprarCurso(st) {
    if (st.cursos >= CFG.maxCursosMes) return 'Limite de cursos do mês atingido.';
    if (st.caixa < CFG.precoCurso) return 'Dinheiro insuficiente.';
    st.caixa -= CFG.precoCurso; st.cursos++; st.pt += 1; return null;
  }
  function treinar(st, id, stat) {
    const m = st.time.find(x => x.id === id); if (!m) return 'Não está no time.';
    const custo = CFG.custoTreino[stat];
    if (st.pt < custo) return 'Pontos de Treino insuficientes.';
    if (m[stat] >= CFG.tetos[stat]) return 'Já está no máximo.';
    st.pt -= custo; m[stat]++; return null;
  }
  function escalar(st, ids) {
    const v = ids.filter((id, i) => ids.indexOf(id) === i && st.time.some(m => m.id === id) && !ausencia(st, id)).slice(0, CFG.maxCampo);
    st.escalacao = v; return v;
  }

  /* ---------- COMBATE ---------- */
  function iniciarCombate(st, rng = Math.random) {
    const b = boss(st);
    let hp = Math.round(b.hp * CFG.hpEscala * (st.evento === 'feriado' ? 0.8 : 1));
    const bonusR = st.evento === 'cafe' ? 1 : 0;
    const time = st.escalacao.map(id => {
      const m = st.time.find(x => x.id === id);
      return { id, H: m.H, S: m.S, R: m.R + bonusR, estresse: 0, out: false, dadoBonus: 0, dadoMin: 0, danoX: 1 };
    });
    const ordenar = arr => arr.filter(u => u.id !== 'anamaria').concat(arr.filter(u => u.id === 'anamaria'));
    return { bossId: b.id, hp, hpMax: hp, semana: 0, prazo: st.evento === 'feriado' ? 3 : CFG.semanas,
      time: ordenar(time), mentor: st.mentoria ? st.mentor : null, fraco: b.fraco.slice(), resiste: b.resiste.slice(),
      pressaoExtra: 0, travada: null, fim: null, totalDano: 0 };
  }
  function multArea(cb, area) { return cb.fraco.includes(area) ? 'fraco' : cb.resiste.includes(area) ? 'resiste' : 'neutro'; }

  // Resolve uma semana. ordens: {id: 'hard'|'soft'}. Retorna lista de eventos para a animação.
  function semana(cb, ordens, rng = Math.random) {
    const ev = [];
    if (cb.fim) return ev;
    cb.semana++;
    const b = BOSSES.find(x => x.id === cb.bossId);
    // efeitos de início de semana
    if (b.esp === 'trava') { cb.travada = pick(Object.keys(AREAS), rng); ev.push({ t: 'especial', texto: 'TRAVOU! A área ' + cb.travada + ' não causa dano nesta semana.' }); }
    if (b.esp === 'board') {
      const areas = Object.keys(AREAS).filter(a => !cb.fraco.includes(a));
      if (cb.fraco.length) cb.resiste = cb.fraco.slice();
      cb.fraco = [pick(areas, rng)];
      ev.push({ t: 'especial', texto: 'Nova pauta do Board: agora o CEO é fraco contra ' + cb.fraco[0] + (cb.resiste.length ? ' e resiste a ' + cb.resiste[0] : '') + '.' });
    }
    ev.push({ t: 'semana', n: cb.semana, prazo: cb.prazo });
    const ativos = cb.time.filter(u => !u.out);
    let fila = ativos.slice();
    let mentoriaUsada = false, acertosFraco = 0, penalProx = null, metadeProx = false, pularProx = false;
    for (let i = 0; i < fila.length; i++) {
      const u = fila[i];
      if (u.out || cb.fim) continue;
      const c = CHAR[u.id];
      let tipo = ordens[u.id] === 'soft' ? 'soft' : 'hard';
      let area = c.area;
      const meu = { metade: false };
      if (pularProx) { pularProx = false; ev.push({ t: 'perde', who: u.id, motivo: 'reuniao' }); continue; }
      if (penalProx === 'dado') { u.dadoBonus -= 1; penalProx = null; }
      if (metadeProx) { meu.metade = true; metadeProx = false; }
      // desvantagens que impedem a ação
      const desv = (texto) => ev.push({ t: 'desv', who: u.id, texto: texto || c.fala });
      if (u.id === 'anamaria' && cb.semana === 1) { desv(); ev.push({ t: 'perde', who: u.id, motivo: 'lento' }); continue; }
      if (u.id === 'junior' && cb.semana === cb.prazo && rng() < 0.5) { desv(); ev.push({ t: 'perde', who: u.id, motivo: 'esqueceu' }); continue; }
      if (u.id === 'gugu' && rng() < 0.3) { desv(); ev.push({ t: 'perde', who: u.id, motivo: 'reuniao' }); continue; }
      if (u.id === 'roberto' && rng() < 0.15) { desv(); ev.push({ t: 'perde', who: u.id, motivo: 'folga' }); continue; }
      if (u.id === 'tata' && rng() < 0.3) { desv(); u.dadoBonus += 2; ev.push({ t: 'perde', who: u.id, motivo: 'analise' }); continue; }
      if (u.id === 'sandy' && rng() < 0.3) { desv(); u.danoX = 2; ev.push({ t: 'perde', who: u.id, motivo: 'escrito' }); continue; }
      if (u.id === 'marilia' && rng() < 0.3) { desv(); u.dadoMin = 4; ev.push({ t: 'perde', who: u.id, motivo: 'refaz' }); continue; }
      if (u.id === 'fatima' && rng() < 0.25 && i + 1 < fila.length) {
        desv(); const prox = fila[i + 1];
        u.estresse = Math.max(0, u.estresse - 1); prox.estresse = Math.max(0, prox.estresse - 1);
        pularProx = true; ev.push({ t: 'perde', who: u.id, motivo: 'reuniao', junto: prox.id }); continue;
      }
      if (b.esp === 'digital' && i === 0 && rng() < 0.35) { ev.push({ t: 'especial', texto: 'Digital recusada! ' + c.nome + ' não conseguiu entrar.', who: u.id }); ev.push({ t: 'perde', who: u.id, motivo: 'digital' }); continue; }
      // desvantagens que alteram a ação
      if (u.id === 'pedro' && tipo === 'soft') { desv(); tipo = 'hard'; }
      if (u.id === 'felipe' && rng() < 0.3) { desv(); tipo = tipo === 'hard' ? 'soft' : 'hard'; }
      if (u.id === 'gil' && tipo === 'hard' && rng() < 0.3) { area = pick(Object.keys(AREAS), rng); desv('ah, oi? ' + area + '?'); }
      let aposta = false;
      if (u.id === 'luciano' && tipo === 'hard' && rng() < 0.3) { desv(); aposta = true; }
      if (u.id === 'carlinhos' && rng() < 0.3) { desv(); meu.metade = true; }
      // dado
      let dado = d6(rng);
      if (u.dadoMin) { dado = Math.max(dado, u.dadoMin); u.dadoMin = 0; }
      if (u.dadoBonus) { dado = Math.max(1, Math.min(6, dado + u.dadoBonus)); u.dadoBonus = 0; }
      let dicaMentor = false;
      if (dado === 1 && cb.mentor && !mentoriaUsada && CHAR[u.id].nivel !== 'S' && cb.time.some(x => x.id === cb.mentor && !x.out)) {
        mentoriaUsada = true; dicaMentor = true; dado = d6(rng);
        ev.push({ t: 'mentoria', mentor: cb.mentor, who: u.id });
      }
      let dano = 0, mult = 'neutro', falha = false;
      if (b.esp === 'atola' && rng() < 0.2) { falha = true; ev.push({ t: 'especial', texto: 'PAPEL ATOLADO! A ação de ' + c.nome + ' falhou.', who: u.id }); }
      if (u.id === 'luan' && !falha && rng() < 0.3) { desv(); falha = true; }
      if (tipo === 'hard') {
        mult = multArea(cb, area);
        const tm = mult === 'fraco' ? CFG.multFraco : mult === 'resiste' ? CFG.multResiste : 1;
        dano = u.H * CFG.hardBase * CFG.dadoMul[dado - 1] * tm * (dicaMentor ? 1.25 : 1);
        if (cb.travada === area) { dano = 0; mult = 'travada'; }
      } else {
        dano = (u.S * CFG.softBase + CFG.softFixo) * CFG.dadoMul[dado - 1];
        if (u.id === 'caetano') { dano = 0; desv(); }
        if (b.esp === 'caneta') dano *= 0.5;
      }
      if (aposta) { if (dado >= 4) dano *= 1.5; else { dano = 0; u.estresse++; } }
      if (meu.metade) dano *= 0.5;
      if (u.danoX !== 1) { dano *= u.danoX; u.danoX = 1; }
      if (b.esp === 'recurso' && cb.semana === cb.prazo) dano *= 0.75;
      if (falha) dano = 0;
      dano = Math.round(dano);
      // cura de estresse do Soft
      let cura = null;
      if (tipo === 'soft' && dado > 1 && !falha && u.id !== 'caetano' && b.esp !== 'consenso') {
        const alvo = cb.time.filter(x => !x.out && x.estresse > 0).sort((a, z) => z.estresse - a.estresse)[0];
        if (alvo) { const q = u.id === 'hebe' ? 2 : 1; alvo.estresse = Math.max(0, alvo.estresse - q); cura = { who: alvo.id, q }; }
      }
      cb.hp = Math.max(0, cb.hp - dano); cb.totalDano += dano;
      if (tipo === 'hard' && mult === 'fraco' && dano > 0) acertosFraco++;
      ev.push({ t: 'acao', who: u.id, tipo, area, dado, dano, mult, crit: dado === 6 && dano > 0, ruim: dado === 1, cura, hp: cb.hp });
      // efeitos pós-ação
      if (b.esp === 'anota' && dado === 1) { u.estresse += 2; ev.push({ t: 'especial', texto: 'O Auditor anotou o deslize de ' + c.nome + '. +2 de estresse.', who: u.id }); }
      if (u.id === 'roberto') u.estresse++;
      if (u.id === 'hebe' && rng() < 0.25) {
        const outros = cb.time.filter(x => !x.out && x.id !== u.id);
        if (outros.length) { const alvo = pick(outros, rng); alvo.estresse++; desv(); ev.push({ t: 'estresse', who: alvo.id, q: 1, de: 'fofoca' }); }
      }
      if (u.id === 'ivete' && rng() < 0.3) { desv(); metadeProx = true; }
      if (u.id === 'angelica' && rng() < 0.3) { desv(); penalProx = 'dado'; }
      if (u.id === 'fausto' && rng() < 0.3 && i + 1 < fila.length) {
        desv(); u.estresse++;
        const prox = fila[i + 1]; ev.push({ t: 'perde', who: prox.id, motivo: 'centralizador' });
        fila[i + 1] = u;   // Fausto age no lugar do próximo
      }
      checaOut(cb, ev);
      if (cb.hp <= 0) { cb.fim = { vitoria: true, semana: cb.semana }; break; }
    }
    if (!cb.fim && acertosFraco >= CFG.sinergiaMin) {
      const bonus = Math.round(cb.time.filter(x => !x.out).reduce((s, x) => s + x.S, 0) * 2);
      cb.hp = Math.max(0, cb.hp - bonus); cb.totalDano += bonus;
      ev.push({ t: 'sinergia', dano: bonus, hp: cb.hp });
      if (cb.hp <= 0) cb.fim = { vitoria: true, semana: cb.semana };
    }
    if (cb.fim) { ev.push({ t: 'fim', vitoria: true, semana: cb.semana, cedo: cb.prazo - cb.semana }); return ev; }
    // turno do chefe
    const cura = b.esp === 'meta' && cb.semana === 3 ? 0.15 : b.esp === 'malha' && cb.semana === 2 ? 0.2 : b.esp === 'virus' ? 0.08 : b.esp === 'board' && cb.semana === 2 ? 0.1 : 0;
    if (cura && cb.semana < cb.prazo) { const q = Math.round(cb.hpMax * cura); cb.hp = Math.min(cb.hpMax, cb.hp + q); ev.push({ t: 'cura', q, hp: cb.hp }); }
    if (b.esp === 'gerente') cb.pressaoExtra++;
    const [alvos, val] = b.pressao;
    const vivos = shuffle(cb.time.filter(x => !x.out), rng).slice(0, alvos + (b.esp === 'gerente' ? Math.floor(cb.pressaoExtra / 2) : 0));
    const golpes = vivos.map(x => { const q = val + (b.esp === 'gerente' && cb.pressaoExtra % 2 === 0 ? 1 : 0); x.estresse += q; return { who: x.id, q }; });
    ev.push({ t: 'chefe', golpes });
    checaOut(cb, ev);
    if (cb.semana >= cb.prazo || cb.time.every(x => x.out)) {
      cb.fim = { vitoria: false, semana: cb.semana };
      ev.push({ t: 'fim', vitoria: false, semana: cb.semana, motivo: cb.time.every(x => x.out) ? 'todos' : 'prazo' });
    }
    return ev;
  }
  function checaOut(cb, ev) {
    for (const x of cb.time) if (!x.out && x.estresse >= x.R) { x.out = true; ev.push({ t: 'out', who: x.id }); }
  }

  /* ---------- fim do mês ---------- */
  function fimMes(st, cb, rng = Math.random) {
    const rel = { mes: st.mes, vitoria: !!(cb && cb.fim && cb.fim.vitoria), receita: 0, salarios: 0, demissoes: [], cedo: 0 };
    if (rel.vitoria) {
      rel.cedo = Math.max(0, cb.prazo - cb.fim.semana);
      rel.receita = CFG.receitaBase + CFG.receitaPorMes * st.mes + CFG.bonusSemanaCedo * rel.cedo;
      st.vitorias++;
    } else {
      rel.receita = CFG.receitaDerrota; st.derrotas++;
      for (const m of st.time.slice()) if (CHAR[m.id].nivel === 'S' && st.time.length > 1 && rng() < CFG.chanceDemissaoSenior) { demitir(st, m.id); rel.demissoes.push(m.id); }
    }
    st.caixa += rel.receita;
    rel.salarios = folha(st);
    rel.gloria = st.time.some(m => m.id === 'gloria');
    st.caixa -= rel.salarios;
    st.time.forEach(m => m.meses++);
    st.historico.push({ mes: st.mes, vitoria: rel.vitoria, caixa: st.caixa });
    if (st.caixa < 0) st.fim = 'falencia';
    else if (st.derrotas >= CFG.maxDerrotas) st.fim = 'demitido';
    else if (st.mes === 11) st.fim = rel.vitoria ? 'vitoria' : 'derrotaFinal';
    else { st.mes++; st.fase = 'inicioMes'; }
    rel.fim = st.fim;
    return rel;
  }

  return { CFG, AREAS, NIVEIS, CHARS, CHAR, BOSSES, MESES, EVENTOS, EVENTO, AUSENCIAS, ausencia, novoJogo, iniciarMes, podeContratar, contratar, demitir,
    custoContratar, folha, salarioDe, boss, resultadoTreino, treinar, comprarCurso, escalar, iniciarCombate, semana, fimMes, multArea, shuffle, d6 };
})();
if (typeof module !== 'undefined') module.exports = Regras;
