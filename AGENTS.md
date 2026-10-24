# Projeto Obra

Acompanhamento de obras públicas: o engenheiro abre o Painel do mês e sabe, sem perguntar
a ninguém, o que anda, o que parou e se a data de entrega ainda está de pé. A equipe da obra
lança o diário no celular.
React + Vite, só `@supabase/supabase-js` de biblioteca, estilo à mão em `src/index.css`.
Perfis: Engenheiro, Diretoria, Equipe da obra, Fiscalização (Fase 2), Aguardando liberação.
Uma casca só para todos (`src/pages/Shell.jsx`); o menu de cada perfil vem de `src/lib/perfis.js`.
Decisões de produto: `PLANO-DO-PROJETO.md`, `PRD-FRONTEND.md`, `PRD-BACKEND.md`. Visual: `preview.html`.

## Este app é MULTI-OBRA (vale para todo módulo, agora e depois)

- **Toda tabela de lançamento tem `obra_id`, obrigatório**, apontando para `obras`. Módulo novo
  nasce com a coluna — sem exceção.
- **A obra atual mora em `src/lib/dados.js`** (`definirObraAtual`). Toda busca filtra por ela e
  todo salvamento grava `obra_id` sozinho. **As telas nunca passam `obra_id`.** Função nova em
  `dados.js` usa `daObra(...)` na leitura e `obra_id: obraAtual` na gravação.
- **Nenhuma tela mostra dado de duas obras juntas**, a não ser um comparativo explícito entre
  obras — e esse é uma consulta agregada na camada de dados (uma linha por obra), nunca um
  laço no front.
- **Trocar de obra remonta a tela** (`key={obraId}` no Shell). Estado guardado fora do React
  (`useRef`, variável de arquivo, `localStorage`) leva o `obra_id` na chave.
- A obra escolhida fica no `localStorage` por pessoa (`projeto-obra:obra:<profile.id>`).
- Abrir obra é tela (Ajustes), não SQL.
- `tests/multiobra.mjs` reprova se algum dado vazar de uma obra para a outra. Módulo novo
  acrescenta a sua tabela lá.

## Onde o código novo vai

Uma pergunta decide: **"isto continuaria verdade se a tela fosse outra?"**

- **Sim → `src/lib/*.js`.** Regra pura: cálculo, recorte, decisão. Sem React, sem banco, sem
  `window`. Import com `.js` explícito (o Node exige). É a única camada com teste.
  As contas do painel (dias sem avanço, situação, data limite, sinal da entrega) moram em
  `src/lib/painel.js`; telas pedem a decisão a ela.
- **Não → `src/screens/*.jsx`.** Estado de interface, layout, o que se toca.
- `src/lib/dados.js` — **única porta dos dados.** Nenhuma tela lê mock nem chama o Supabase direto.
- `src/lib/supabase.js` — a conexão (fica `null` até o `.env.local` existir).

1. `if` de negócio dentro de tela vai para `lib`, mesmo com três linhas.
2. Constante compartilhada tem um dono só: papéis e menus em `perfis.js`; situações de obra em
   `obras.js`; de medição em `medicao.js`; clima em `diario.js`; situação de serviço em `painel.js`;
   fontes e origem do item do orçamento em `orcamento.js`.
   O texto é idêntico ao CHECK do banco — se divergir, o salvamento falha calado.
3. Quem não vê valores (Equipe da obra, Fiscalização) **não recebe** valores: `dados.js` tira
   `preco_unitario` e os totais em R$ antes de devolver. Não esconda R$ só na tela.

## Dados de exemplo

`src/lib/mockData.js`, com `USAR_MOCK = true`: duas obras diferentes (INSS com o sinal em
risco, ARRECIFES JORDÃO ALTO de pé), datas relativas a hoje. As mudanças feitas no app valem até
recarregar a página. O login é de exemplo (escolhe-se a pessoa) até o banco existir.

## Régua de verificação

```bash
npm run check
```

Build + lint + testes. **Fecha em zero** — não há linha de base herdada aqui. Aviso novo é seu
e é de agora; conserte no mesmo lote.

Nada disso prova que a tela funciona. Verde com a tela em branco é rotina: abra e clique.

**Todo bug corrigido em `src/lib/` nasce com teste junto**, no mesmo lote.

No Windows, se `npm` reclamar de `npm.ps1` e política de execução, use `npm.cmd`. Nunca mexa na
política de execução do Windows.

## Antes de subir pro GitHub

Diff que toca em `src/lib/supabase.js`, `src/lib/dados.js`, políticas RLS, migrations ou valores
de medição → rodar a revisão de código (`/code-review` no Claude Code, `/review` no Codex) antes
de subir. É por caminho, não por julgamento: nesses arquivos o erro não aparece na tela.

## Deploy

Ainda não está no ar. Quando estiver: a pessoa diz "sobe pro GitHub", o agente roda `git add`,
`git commit`, `git push`, e a Vercel publica sozinha. A pessoa não digita comando.

## Armadilhas desta base

- **Tabela nova nasce fechada para o app.** Toda tabela precisa de `grant` escrito na migration,
  só para `authenticated`. Erro "permission denied for table (42501)" é GRANT faltando, não RLS.
  Nunca `grant all`, nunca `to anon`.
- **RLS por obra desde a primeira migration.** `to authenticated using (true)` aqui é uma obra
  lendo a outra. A política usa a função `minhas_obras()` (ver `PRD-BACKEND.md`, Permissões).
- **Foto do diário nunca passa de 5 MB.** A tela comprime antes (`src/components/comprimirFoto.js`), `dados.js` recusa o que passar, e o banco tem CHECK em `fotos.tamanho_bytes`. O limite mora só em `src/lib/fotos.js`.
- **Foto do diário guarda data, hora, GPS e endereço** (a fiscalização exige). A compressão por canvas apaga o EXIF: o bloco original é devolvido ao arquivo por `src/lib/exif.js`. Mudou a compressão, rode `tests/exif.mjs`. GPS do aparelho só para foto tirada agora pelo botão "Tirar foto" (e arquivo dos últimos 15 min) — nunca em foto escolhida da galeria, mesmo baixada agora. O endereço vem de `buscarEndereco` em `dados.js` (Nominatim, fila de 1 pedido/s).
- **Orçamento trunca, não arredonda.** P. Unit. = TRUNCAR(C. Unit. × (1 + BDI), 2) e P. Total = TRUNCAR(Qtd ×
  P. Unit., 2), como a planilha da HCL. Conta de orçamento passa por `src/lib/orcamento.js` (o teste confere as 418
  linhas reais da ARRECIFES). `qtd_contratada` que a camada de dados devolve é a **vigente** (orçada + aditivos);
  quantidade e preço de item só mudam por aditivo.
- **Datas são texto `AAAA-MM-DD` no fuso local** (`src/lib/datas.js`). Nunca `toISOString()`
  para data: vira UTC e pula um dia no Brasil.

## Higiene de código (vale para toda mudança)

Cada função morta é uma mentira que o próximo leitor precisa desmascarar.

- **Ao remover um recurso, cace a cadeia inteira no mesmo lote:** a função em `lib/dados.js` → os
  chamadores nas telas → a query. Função exposta que nenhuma tela chama é lixo.
- **Zero avisos novos de lint.**
- **Código comentado não é backup, o git é.** Comentário explica *por quê*.
- **Antes de apagar, prove que está morto:** grep pelo símbolo no projeto inteiro.
- **Estado que nunca muda ou nunca é lido é lixo.**
- **Limpeza NUNCA toca no banco nem em arquivo de dado.** Tabela ou coluna órfã continua
  existindo até decisão de quem é dono. Na dúvida, pergunte.

## O que entra neste arquivo

Só o que o código não conta sozinho: armadilha, o porquê de uma decisão, convenção que difere do
padrão, proibição, o que a verificação exige. Árvore de pastas, lista de dependências e histórico
não entram — `ls`, o `package.json` e o git já respondem.
