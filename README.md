# Boa Folha: Um Ano no RH

Jogo de gestão com combate por turnos, em pixel art, num único arquivo HTML 100% offline, em português brasileiro.
Você é o RH da Distribuidora Boa Folha e precisa vencer um chefe por mês, de janeiro (Seu Osvaldo) a dezembro (o CEO).

## Jogar
Abra `boa-folha.html` no navegador (dois cliques). Não precisa de internet nem de instalação.

## Estrutura
- `boa-folha.html`: o jogo completo, gerado a partir de `src/`
- `deploy/index.html`: cópia para publicar na Vercel (`npx vercel deploy ./deploy --prod`)
- `boa-folha-audio-teste.html`: tela para ouvir todos os sons
- `src/`: código-fonte em módulos (áudio, regras, perguntas, arte, interface)

## Desenvolvimento
```bash
node src/inline.js src/jogo.html boa-folha.html   # gera o arquivo único
cp boa-folha.html deploy/index.html                 # atualiza a versão para deploy
node src/sim.js 1000                                # simula 1000 partidas para balanceamento
```
