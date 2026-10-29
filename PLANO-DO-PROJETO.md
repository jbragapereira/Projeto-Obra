# Plano do Projeto — Projeto Obra

> **Mudança de 24/10/2026 (decisão do engenheiro), vale sobre o que estiver escrito abaixo:**
> - O menu **Serviços passou a se chamar Orçamento**. É nele que entra o orçamento da obra em Excel (Fonte, Código, Item, Descrição, Unidade, Quantidade, C. Unitário, BDI por linha, P. Unitário, P. Total), com **aditivo de quantidade** e **item novo** incluídos pelo app. A EAP do Planejamento é montada a partir do Orçamento e enxerga toda mudança feita nele.
> - O cadastro de **Responsáveis (e de funções) saiu de Serviços**. Desde 26/10/2026 ele mora só no módulo **Cadastro** (abas Responsáveis — onde também entram os empreiteiros —, Funções e Equipamentos); o Diário, o Kanban e a medição de empreiteiros só escolhem da lista. Só o engenheiro cadastra; a diretoria vê.
> - **O MS Project fica de fora por enquanto.** Crítico é só marcado à mão; as datas de início e fim são lançadas na EAP, nos itens; as de etapa e subetapa saem sozinhas dos itens (início mais cedo, fim mais tarde).

> Fonte da verdade deste projeto. Quando mudar de ideia, mude aqui primeiro.
> Última atualização: 23/10/2026 — Etapas 1, 2 e 3 fechadas com o engenheiro. PRD-FRONTEND.md e PRD-BACKEND.md escritos a partir deste plano.

## Em uma frase

Um sistema de **acompanhamento de obra** que resolve **a tarde inteira gasta juntando informação para saber se a entrega ainda está de pé** para **o engenheiro que toca várias obras públicas ao mesmo tempo**, fazendo **o canteiro lançar a produção do dia no próprio sistema e o sistema calcular sozinho, por serviço, quem é o responsável, há quantos dias não anda e até quando dá para decidir antes de empurrar a obra**.

---

# 1. Visão Estratégica

## Os problemas

### Problema 1 — A tarde inteira para juntar o dia
- **Como acontece hoje:** à tarde o engenheiro junta o que a equipe de sala contou, o que o encarregado contou no canteiro, o que cada empreiteiro, empresa especializada e a mão de obra própria fez, as mensagens de WhatsApp (encarregado, empreiteiros, diretoria, fiscais), os e-mails (diretoria, fiscais) e a planilha de medição.
- **Frequência:** todo dia.
- **Custo:** a tarde inteira, todo dia. Umas 4 h por dia, cerca de 20 h por semana (estimativa a partir de "a tarde inteira").
- **Último caso:** no fim do dia ele não consegue juntar tudo, nem responder se a data de entrega continua de pé.

### Problema 2 — Atraso descoberto duas semanas depois
- **Como acontece hoje:** a planilha do mês mostra o planejado, o executado e o %, mas não mostra o responsável, há quantos dias o serviço está parado nem a data limite para decidir. O cronograma no MS Project só é aberto quando o cliente ou a diretoria cobram.
- **Frequência:** em toda frente que atrasa.
- **Custo:** duas semanas de atraso já consumidas quando ele percebe. Nessa hora não dá mais para reforçar a equipe, só para empurrar a data.
- **Último caso:** [AINDA NÃO RESPONDIDO: um serviço concreto que atrasou assim]

### Problema 3 — Informação espalhada e que ninguém relê
- **Como acontece hoje:** medição numa planilha com uma aba por empreiteiro, sempre desatualizada; outra planilha com a quantidade executada por responsável; diário de obra num caderno; fotos soltas em 5 grupos de WhatsApp.
- **Frequência:** contínua.
- **Custo:** retrabalho para fechar a medição e para responder à fiscalização; fotos difíceis de achar quando alguém pede.
- **Último caso:** [AINDA NÃO RESPONDIDO]

## A solução

Um só lugar por obra. O estagiário (e quem mais for de campo) lança no celular, no próprio dia, o diário com fotos e a quantidade executada de cada serviço. O sistema junta esses lançamentos com o escopo contratado (mais de 100 serviços por obra) e com o planejamento da medição do mês. A tela de cada manhã é a mesma planilha do mês que o engenheiro já usa, com três colunas novas: **responsável**, **dias sem avanço** e **data limite de decisão**. No alto da tela, um sinal responde à pergunta principal: **a entrega da obra ainda está de pé?**

**O que ele NÃO faz (v1):**
- Orçamento e composição de preço. Isso o engenheiro já resolve; o sistema só **recebe** a planilha de serviços com quantidades e preços.
- Ler o WhatsApp ou o e-mail sozinho. O que chega por lá e importa vira um registro, lançado à mão (ver módulo Recados e pendências).
- Editar o cronograma. O MS Project continua sendo a ferramenta do cronograma; o sistema só usa as datas de início e fim de cada serviço.
- *(Entrou em 29/10/2026, por decisão do engenheiro, o módulo **Qualidade**: pendências de vistoria, FVS com não conformidades e Gemba Walk, com relatório para imprimir. Não é o "Recados e pendências" da Fase 2, que continua à parte.)*
- Controle de estoque do almoxarifado. *(O **fluxo dos pedidos de material** — Kanban do pedido até a entrega na frente — entrou em 26/10/2026, por decisão do engenheiro; estoque item a item continua fora.)*
- Pagamento de empreiteiros e financeiro da obra. *(A **medição** de empreiteiros (contrato, valor e boletins) entrou em 26/10/2026, por decisão do engenheiro; o pagamento continua fora.)*
- Publicar na Play Store ou na App Store. Mesmo assim, no celular ele **funciona como app**: instala pelo navegador e ganha ícone na tela inicial, e o diário pode ser preenchido **sem sinal no canteiro**, com envio automático quando a internet voltar. *(Corrigido pelo engenheiro em 23/10/2026: o item "app de loja" estava errado.)*

## Funcionalidades

### Seletor de obra (no alto de todas as telas)
- **Abre em:** lista suspensa com as obras a que a pessoa tem acesso.
- **Mostra:** nome da obra, órgão contratante, data de entrega contratual e o sinal da entrega (verde / amarelo / vermelho).
- **Ordem e filtro:** a última obra aberta fica primeiro; obras encerradas ficam escondidas.
- **Ações:** trocar de obra. Ao trocar, **tudo** na tela passa a ser da obra escolhida.
- **Vazio:** "Você ainda não foi incluído em nenhuma obra. Peça ao engenheiro responsável."
- **Nasce e morre:** o engenheiro cria a obra; no fim, a obra é **encerrada**, nunca apagada.

### Painel do mês (a tela de toda manhã)
- **Abre em:** tabela, igual à planilha atual.
- **No alto:** "Entrega em 15/03/2027 — **de pé**" (verde), "**em risco**" (amarelo: algum serviço crítico passou da data limite de decisão) ou "**comprometida**" (vermelho: um serviço crítico, no ritmo atual, termina depois da entrega). Abaixo, quantos serviços estão em cada situação.
- **Mostra, por serviço, nesta ordem de colunas** (as três primeiras são as que o engenheiro olha primeiro hoje, colunas E, M e P da planilha): **descrição do serviço**, **valor total planejado no mês (R$)**, **valor total executado no período (R$)**, **falta executar (R$)** = planejado − executado, % executado, **situação**, **dias sem avanço**, **responsável** (empreiteiro, empresa especializada ou mão de obra própria), **data limite de decisão**, **último acionamento** (data e com quem). Depois, as colunas de quantidade: código, frente, unidade, quantidade planejada no mês, quantidade executada no período, ritmo dos últimos 7 dias e término previsto no ritmo atual.
- **Ordem e filtro:** primeiro os serviços sem evolução e os atrasados; dentro de cada grupo, o maior **R$ que falta executar** em cima. Assim o que pesa mais no dinheiro do mês e não anda fica no topo. Filtros: responsável, frente, situação, só serviços críticos.
- **Ações:** abrir o serviço; **acionar o encarregado** (ver abaixo); exportar para Excel.
- **Acionar o encarregado:** é o que o engenheiro faz hoje quando vê um serviço sem evolução. Pelo botão na linha do serviço, ele registra o que foi combinado com o encarregado e a data de retorno, que já vem preenchida com **o dia seguinte** (é quando o engenheiro confere hoje) e pode ser mudada. Exemplo: "Tapume com telha metálica — combinado com o encarregado retomar a montagem — conferir em 24/10". A conversa continua sendo por telefone ou pessoalmente; o sistema só guarda o combinado. A linha passa a mostrar "acionado em 23/10" e, se na data de retorno o serviço ainda não andou, volta para o topo com o aviso **"combinado não cumprido"**.
- **Ao clicar num item:** abre uma gaveta com o histórico de lançamentos do serviço (dia, quantidade, quem lançou, fotos) e o gráfico planejado × executado.
- **Vazio:** "Nenhum serviço planejado para esta medição. Monte o planejamento do mês em Medição."
- **Nasce e morre:** é calculado; ninguém digita nada aqui.

**Como os números são calculados (proposta):**
- **Dias sem avanço:** dias corridos desde o último lançamento com quantidade maior que zero.
- **Término previsto:** hoje + (quantidade que falta ÷ ritmo médio dos últimos 7 dias com trabalho).
- **Data limite de decisão:** data de fim planejada do serviço − (quantidade que falta ÷ **o melhor ritmo semanal já registrado nesse serviço**). Ou seja, é o último dia em que ainda dá para cumprir o prazo se a equipe voltar a trabalhar no melhor ritmo que já teve. Passou dessa data, só reforço de equipe ou mudança de método salva o prazo.
- **Situação:** em dia / atenção (passou da data limite de decisão) / atrasado (término previsto depois do fim planejado) / parado (5 dias ou mais sem avanço) / concluído.

### Diário de obra (o lançamento do dia)
- **Abre em:** formulário do dia, pensado para o celular no canteiro. Funciona sem sinal: guarda no celular e envia quando a internet voltar, mostrando "3 lançamentos aguardando envio".
- **Mostra:** data, clima de manhã e de tarde, ocorrências (texto livre), fotos e a **produção do dia**: lista de serviços com o campo de quantidade executada e a marcação "concluído".
- **Ordem e filtro:** na produção do dia aparecem primeiro os serviços do planejamento do mês; os outros ficam numa busca.
- **Ações:** criar o diário do dia, anexar fotos (cada foto ligada a um serviço ou ao dia), lançar quantidade, marcar serviço concluído, enviar.
- **Ao clicar num item:** abre o diário daquele dia.
- **Vazio:** "Nenhum diário hoje. Toque em Lançar o dia."
- **Nasce e morre:** alguém da equipe da obra cria no dia. Depois de enviado, quem lançou só corrige até as 23h59 do dia seguinte; depois disso, só o engenheiro corrige, e a correção fica registrada.

### Serviços (o escopo contratado)
- **Abre em:** lista dos 100+ serviços da obra.
- **Mostra:** código, descrição, unidade, quantidade contratada, preço unitário, valor total, responsável, início e fim planejados (do MS Project), crítico (sim/não), quantidade executada acumulada e % acumulado.
- **Ordem e filtro:** pelo código da planilha. Filtros: responsável, frente, crítico.
- **Ações:** importar da planilha (Excel), editar, trocar o responsável, importar as datas de início e fim do MS Project (exportado para Excel), **marcar quais serviços são críticos de dois jeitos** (confirmado): (1) **pelo MS Project**, na mesma importação das datas, lendo a coluna "Crítica" (Sim/Não) do Excel exportado; (2) **à mão**, numa caixinha "crítico" em cada linha. Se você mudar a caixinha à mão, ela fica com a etiqueta "marcado à mão" e **uma nova importação do MS Project não desfaz** essa marcação. Para voltar a seguir o MS Project, há a opção "seguir o MS Project" no serviço.
- **Ao clicar num item:** abre o detalhe com o histórico.
- **Vazio:** "Nenhum serviço nesta obra. Importe a planilha contratual."
- **Nasce e morre:** o engenheiro importa no início da obra. Um serviço suprimido por aditivo fica **inativo** e não é apagado.

### Responsáveis
- **Abre em:** lista.
- **Mostra:** nome, tipo (empreiteiro / empresa especializada / mão de obra própria), contato, serviços sob responsabilidade e % médio executado no mês.
- **Ordem e filtro:** por nome. Filtro: tipo.
- **Ações:** criar, editar, desativar.
- **Ao clicar num item:** abre os serviços desse responsável com o avanço do mês. É o que substitui a "aba por empreiteiro".
- **Vazio:** "Nenhum responsável cadastrado."
- **Nasce e morre:** o engenheiro cria; quem sai da obra é desativado, e o histórico fica.

### Medição
- **Abre em:** lista de períodos de medição da obra (ex.: 21/10 a 20/11).
- **Mostra:** período, situação (planejando / em andamento / fechada), valor planejado, valor executado e % executado.
- **Ações:** abrir um período, montar o planejamento do mês (quais serviços e quanto de cada um), fechar a medição, exportar para Excel no formato da planilha atual.
- **Ao clicar num item:** abre o período com os serviços planejados.
- **Vazio:** "Nenhuma medição aberta. Crie a primeira e informe o período."
- **Nasce e morre:** o engenheiro abre e fecha. Depois de fechada, a medição não muda mais.

### Fotos
- **Abre em:** galeria por semana.
- **Mostra:** foto, data, serviço, quem tirou.
- **Ordem e filtro:** da mais nova para a mais antiga. Filtros: semana, serviço, responsável.
- **Ações:** ver, baixar.
- **Ao clicar num item:** abre a foto grande com os dados.
- **Vazio:** "Nenhuma foto nesta semana."
- **Nasce e morre:** nascem no diário. Não são apagadas, porque são prova de execução de obra pública.

### Recados e pendências
- **Abre em:** lista.
- **Mostra:** de quem veio (diretoria / fiscalização / empreiteiro / encarregado), por onde chegou (WhatsApp / e-mail / pessoalmente), o que pede, serviço ligado, prazo e situação (aberta / respondida).
- **Ordem e filtro:** abertas primeiro, pelo prazo. Filtro: de quem veio.
- **Ações:** criar, responder/fechar.
- **Vazio:** "Nenhuma pendência aberta."
- **Nasce e morre:** o engenheiro (ou a diretoria) registra o que chegou e importa; quando resolvida, é fechada e fica no histórico.

## Unidade principal

**Obra** — vai existir mais de uma? **sim** (várias ao mesmo tempo, com seletor, sem nunca misturar dados). Alguém trabalha em mais de uma ao mesmo tempo? **só o engenheiro** (confirmado). A diretoria **vê** todas as obras da empresa, mas não trabalha nelas. A Equipe da obra e a Fiscalização ficam ligadas a **uma obra por vez**. Mesmo assim, o acesso é guardado numa lista "pessoa × obra", e não num campo fixo: quando alguém muda de obra, o engenheiro troca a liberação e o histórico do que essa pessoa lançou fica na obra antiga.

## Perfis de usuário

- **Engenheiro (administrador):** toca as obras e decide · primeira tela: Painel do mês.
- **Diretoria:** acompanha as obras da empresa · primeira tela: Painel do mês.
- **Equipe da obra** (estagiário, encarregado, auxiliar administrativo e almoxarife — todos com a mesma liberdade, confirmado): registra o canteiro · primeira tela: Diário de obra (o lançamento do dia).
- **Fiscalização (órgão público):** acompanha o avanço da obra que fiscaliza, pela quantidade e em R$ · primeira tela: Avanço por serviço + Fotos da semana. **Não vê nenhuma** informação de gestão interna: responsável, dias sem avanço, data limite de decisão, acionamentos do encarregado, recados e pendências, planejado do mês (confirmado).
### Matriz de permissões

| Ação | Engenheiro | Diretoria | Equipe da obra | Fiscalização |
|---|---|---|---|---|
| Ver as obras | as dele | todas da empresa | as obras em que foi incluído | só a obra que fiscaliza |
| Ver valores (R$ contratado, planejado, medido) | sim | sim, de **todas** as obras da empresa (confirmado) | **não** | **sim**, só da obra que fiscaliza: contratado e medido (confirmado). **Nunca o planejado do mês** (confirmado: é meta interna) |
| Ver avanço (% pela quantidade e em R$) | sim | sim | só pela quantidade | sim, pela quantidade e em R$, **sempre sobre o contratado** (acumulado da obra e medido no período), nunca sobre a meta do mês (confirmado) |
| Ver fotos | todas | todas | todas da obra | só as da semana |
| Lançar diário, fotos e quantidades | sim | não | sim | não |
| Marcar serviço concluído | sim | não | sim | não |
| Ver os combinados com o encarregado (sem R$) | sim | sim | sim | não |
| Registrar combinado com o encarregado | sim | não | não | não |
| Ver e registrar recados e pendências (diretoria, fiscais) | sim | sim | não | não |
| Corrigir lançamento de outro | sim | não | não | não |
| Importar serviços e montar a medição | sim | não | não | não |
| Fechar a medição | sim | não | não | não |
| Apagar ou desativar | sim | não | não | não |
| Gerenciar usuários e obras | sim | não | não | não |
| **Quem não fez login** | **não vê nada** | | | |

## Fluxo de cadastro

1. A pessoa se cadastra com e-mail e senha.
2. Entra sem perfil e sem obra, e não vê dado nenhum.
3. Vê o aviso "Conta aguardando liberação do engenheiro responsável".
4. O engenheiro libera, escolhe o perfil **e as obras** que a pessoa pode ver.

Para a fiscalização, o engenheiro manda o link e libera só a obra daquele órgão.

## Ferramentas e custo

| Peça | Para que serve | Custo |
|---|---|---|
| Claude | construir o sistema | a assinatura que você já tem |
| React + Vite | a interface | grátis |
| Supabase | banco, login e fotos | grátis até 1 GB de arquivos; depois, US$ 25/mês |
| Vercel | colocar no ar | grátis |
| GitHub | guardar o código | grátis |

**Total por mês:** R$ 0 no começo. Toda foto é comprimida para no máximo 5 MB (decisão de 24/10/2026); na prática fica entre 1 e 3 MB, então o 1 GB grátis guarda umas 350 a 1.000 fotos e acaba em semanas com várias obras. Daí em diante, cerca de US$ 25/mês.
**O que custaria a alternativa pronta:** Sienge, R$ 2.600 por mês na empresa anterior, ou seja, **R$ 31.200 por ano** (confirmado). É a economia que o sistema próprio representa.

## Prazo

- **Disponibilidade:** no ar todos os dias, 24 horas por dia (confirmado). A Vercel e o Supabase já funcionam assim, sem custo extra.
- **Quer usar de verdade a partir de:** o quanto antes; meta de ficar pronto em **2 dias** (confirmado).
- **Horas para construir:** 4 horas por dia (confirmado), ou seja, cerca de 8 horas nos 2 dias.

### O corte para caber em 2 dias (proposta)

O plano inteiro não cabe em 8 horas: só criar as contas, subir o banco, testar as permissões e pôr no ar já consome boa parte delas. Por isso a construção vai em duas fases.

**Fase 1 — em 2 dias (o que resolve a tarde perdida):**
- Obras e seletor de obra.
- Serviços: importar a planilha contratual (com a quantidade planejada do mês) e o Excel do MS Project (datas + coluna "Crítica"); ajustar críticos à mão; responsável em cada serviço.
- Diário de obra no celular, **com internet**: produção do dia por serviço, fotos e serviço concluído.
- Painel do mês completo: colunas E/M/P, falta executar, dias sem avanço, data limite de decisão e o sinal "a entrega está de pé?".
- Perfis Engenheiro, Diretoria e Equipe da obra, com as permissões de valores já valendo.

**Fase 2 — na semana seguinte, já com o sistema em uso:**
- Botão "acionar o encarregado" e o aviso "combinado não cumprido".
- Perfil Fiscalização e a galeria de fotos da semana.
- Diário sem sinal (guardar no celular e enviar depois).
- Medição: fechar o período e exportar para Excel no formato atual.
- Tela própria de Responsáveis (a "aba por empreiteiro").
- Recados e pendências.

Corte confirmado pelo engenheiro em 23/10/2026: fica como está.

---

# 2. Insights do Mercado

## Já tentou algum programa?

**Sienge, numa empresa anterior**, onde se pagava **R$ 2.600 por mês** (confirmado). Deixado de lado porque **é caro** (confirmado). **Na empresa atual nunca se usou sistema de gestão e acompanhamento de obras**: hoje é tudo planilha, caderno e WhatsApp. É por isso que o sistema próprio está sendo criado. Diferencial que sai daqui: **custo perto de zero** (só o espaço para fotos quando passar de 1 GB).

## Benchmark (pesquisado na web em 23/10/2026)

### Diário de Obras (proposta comercial à Câmara Municipal de Porto Alegre, 2024)
- Fonte: camarapoa.rs.gov.br/documentos/1049 · Preço na proposta: R$ 60/mês (2 obras), R$ 100/mês (4 obras), R$ 150/mês (obras ilimitadas) ou R$ 1.400/ano. Valores de 2024, podem ter mudado.
- Faz bem: diário de obra para várias obras, barato.
- Falta (pelo que a busca mostrou): não aparece painel do mês com meta da medição nem data limite de decisão por serviço.

### Prevision (Sienge)
- Site: sienge.com.br/prevision · Preço: sob consulta (depende do tipo de obra, número de projetos e funcionalidades); teste grátis de 15 dias.
- Faz bem: planejamento em Gantt e linha de balanço na nuvem, app de celular, acesso por WhatsApp, integra com Excel.
- Falta: foco declarado em obras repetitivas (prédios, Minha Casa Minha Vida, loteamentos), não em reforma de obra pública com 100+ serviços diferentes; é um sistema de planejamento grande para substituir só a sua tarde.

### OrçaFascio (módulo Diário de Obras)
- Site: orcafascio.com · Preço: sob consulta; teste grátis de 7 dias. Órgãos públicos (TRE-GO, TRE-BA, Polícia Federal-AM) contratam licenças de 24 a 36 meses.
- Faz bem: junta orçamento, planejamento, medição e diário de obras; conhecido no setor público.
- Falta: vem amarrado ao orçamento e à composição de preço, que você já resolve e não quer no sistema.

## Por que ainda vale construir o meu

O engenheiro já usou o Sienge numa empresa anterior (R$ 2.600 por mês, R$ 31.200 por ano) e considera caro; a empresa atual nunca teve sistema. Nenhum dos três mostra, na mesma tela, a meta da medição do mês, o responsável, há quantos dias o serviço não anda e a data limite para decidir. Os mais completos cobram sob consulta e trazem orçamento, que você não quer. E nenhum separa o que a fiscalização vê (avanço sobre o contratado) da sua meta interna do mês. O seu é pequeno e faz só isso: responde toda manhã se a entrega está de pé.

**Régua:** a alternativa paga mais barata encontrada custa cerca de R$ 1.400 por ano (Diário de Obras, 2024), mas resolve só o diário.

## Referências de interface

- **Gosta de:** a sua planilha atual (as colunas E, M e P são as primeiras que você olha).
- **Odeia:** nada citado.
- **Usa mais em:** **celular e computador**, e a equipe toda usa nos dois (confirmado). Todas as telas funcionam nos dois tamanhos. O Painel do mês muda de forma: **no computador**, a tabela completa, como a planilha; **no celular**, um cartão por serviço com descrição, R$ planejado, R$ executado, falta executar e a situação em cor; ao tocar no cartão, aparecem as outras colunas.
- **Cores (tiradas do logo da HCL Engenharia, confirmado):**
  - **Azul-marinho `#001A54`** — o "HCL ENGENHARIA": cor principal, usada no cabeçalho, no menu e nos títulos.
  - **Azul royal `#1352D9`** — os prédios do logo: cor de destaque, usada nos botões e links.
  - As cores de situação continuam verde, amarelo e vermelho, separadas dos azuis.
- **Tema:** claro (proposta: funciona melhor no sol do canteiro)
- **Logo:** HCL Engenharia — "Soluções que constroem confiança" (confirmado). Vai no topo do app e na tela de login. [PENDENTE: salvar o arquivo do logo na pasta do projeto, de preferência PNG com fundo transparente ou SVG]

---

# 3. Arquitetura

> Etapa 3 proposta por inteiro; automações e pergunta de um ano respondidas pelo engenheiro.

## Mapa de telas

Em todas as telas, o **seletor de obra** fica no alto. `(F2)` marca o que é da Fase 2.

```
Login  →  "Conta aguardando liberação" (quem ainda não foi liberado)
│
├── Engenheiro
│   ├── Painel do mês  (início)  →  gaveta do serviço  →  Acionar encarregado (F2)
│   ├── Diário  →  dia  ·  aba Fotos
│   ├── Orçamento  →  detalhe  ·  Importar orçamento (Excel)  ·  aditivo  ·  item novo
│   ├── Medição  →  período  ·  Planejar o mês  ·  Fechar e exportar (F2)
│   ├── Recados e pendências (F2)
│   └── Ajustes  →  Obras  ·  Pessoas e liberações  ·  Meu perfil
│
├── Diretoria  (só vê, nas obras da empresa toda)
│   ├── Painel do mês  (início)
│   ├── Diário  ·  aba Fotos
│   ├── Serviços
│   ├── Medição
│   ├── Recados e pendências (F2)
│   └── Meu perfil
│
├── Equipe da obra  (estagiário, encarregado, auxiliar, almoxarife; sem R$)
│   ├── Lançar o dia  (início)  →  produção, fotos, concluído
│   ├── Painel do mês  (só quantidades e situação)
│   ├── Serviços  (só quantidades)
│   └── Meu perfil
│
└── Fiscalização (F2)  (só a obra dela)
    ├── Avanço por serviço  (início; sobre o contratado, quantidade e R$)
    └── Fotos da semana
```

**Navegação:** no celular, uma barra inferior com até 5 itens (Painel, Diário, Serviços, Medição e "Mais", que abre o resto). No computador, um menu lateral à esquerda.
**Menu:** no máximo 6 itens por perfil (o engenheiro tem 6). Responsáveis e Fotos viraram abas dentro de Serviços e de Diário, para caber nesse limite.

## Processos automáticos

**Nenhum na v1** (confirmado pelo engenheiro). Ideias que ficaram para depois, se fizerem falta: um e-mail às 7h com os serviços que viraram vermelho, um aviso quando o diário não foi lançado até as 18h, um resumo semanal para a diretoria.

O que **não** conta como processo, porque o sistema calcula na hora em que a tela abre: dias sem avanço, término previsto, data limite de decisão, situação de cada serviço e o sinal "a entrega está de pé?".

## Modelagem de dados

Toda tabela tem `id` (uuid) e `created_at`. Toda tabela que pertence a uma obra tem `obra_id`. Dinheiro é `numeric(14,2)` e quantidade é `numeric(14,3)`. Fotos ficam no Storage, e o banco guarda só o caminho.

### Tabela `profiles`
Para que serve: a pessoa que faz login (o `id` é o mesmo do login).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | o mesmo código do login |
| nome | text | sim | |
| cargo | text | não | Estagiário, Encarregado, Auxiliar administrativo, Almoxarife… (só para exibir) |
| role | text | sim | CHECK: `Engenheiro`, `Diretoria`, `Equipe da obra`, `Fiscalização`, `Aguardando liberação` |
| ativo | boolean | sim | padrão verdadeiro |
| created_at | timestamptz | sim | automático |

### Tabela `obras`
Para que serve: cada obra (a unidade principal).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| nome | text | sim | |
| codigo | text | sim | código ou apelido curto |
| endereco | text | não | |
| cliente | text | sim | o órgão contratante |
| numero_contrato | text | não | |
| data_inicio | date | sim | |
| data_entrega | date | sim | data-meta de entrega; é a data do sinal "a entrega está de pé?" |
| situacao | text | sim | CHECK: `Em andamento`, `Concluída`, `Parada` (atualizado em 24/10/2026) |

### Tabela `membros`
Para que serve: quem pode ver qual obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | uuid | sim | |
| profile_id | uuid | sim | |
| ativo | boolean | sim | quem sai da obra fica inativo, e o histórico permanece |

Relações: uma pessoa tem vários membros, e uma obra também. A diretoria vê todas as obras pelo `role` e não precisa de linha aqui.

### Tabela `responsaveis`
Para que serve: os empreiteiros, as empresas especializadas e a mão de obra própria de cada obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | uuid | sim | |
| nome | text | sim | |
| tipo | text | sim | CHECK: `Empreiteiro`, `Empresa especializada`, `Mão de obra própria` |
| contato | text | não | telefone ou e-mail |
| ativo | boolean | sim | |

### Tabela `servicos`
Para que serve: os 100+ itens do escopo contratado de cada obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | uuid | sim | |
| codigo | text | sim | o código da planilha contratual |
| descricao | text | sim | |
| frente | text | não | |
| unidade | text | sim | m², m³, un… |
| qtd_contratada | numeric(14,3) | sim | |
| preco_unitario | numeric(14,2) | sim | escondido de Equipe da obra |
| responsavel_id | uuid | não | |
| data_inicio_planejada | date | não | do MS Project |
| data_fim_planejada | date | não | do MS Project |
| critico | boolean | sim | |
| critico_origem | text | sim | CHECK: `MS Project`, `À mão` |
| ativo | boolean | sim | serviço suprimido por aditivo fica inativo |

### Tabela `medicoes`
Para que serve: cada período de medição mensal da obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | uuid | sim | |
| numero | integer | sim | 1, 2, 3… |
| data_inicio | date | sim | |
| data_fim | date | sim | |
| status | text | sim | CHECK: `Planejando`, `Em andamento`, `Fechada` |
| valor_planejado | numeric(14,2) | não | meta do mês em R$, gravada quando a medição passa para `Em andamento`; nunca aparece para a Fiscalização |
| valor_medido | numeric(14,2) | não | gravado ao fechar |
| meta_batida | boolean | não | gravado ao fechar: `valor_medido >= valor_planejado` |
| fechada_em | timestamptz | não | |

### Tabela `medicao_itens`
Para que serve: o planejado do mês por serviço (a meta interna) e o medido no fechamento.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | uuid | sim | |
| medicao_id | uuid | sim | |
| servico_id | uuid | sim | |
| qtd_planejada | numeric(14,3) | sim | **nunca aparece para a Fiscalização** |
| qtd_planejada_inicial | numeric(14,3) | não | cópia congelada quando a medição passa para `Em andamento` |
| preco_unitario | numeric(14,2) | sim | cópia do preço do serviço quando a medição abre (um aditivo depois não muda o passado) |
| qtd_medida | numeric(14,3) | não | preenchida ao fechar |

### Tabela `diarios`
Para que serve: o diário de cada dia de cada obra (um por dia).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | uuid | sim | |
| data | date | sim | único por obra |
| clima_manha | text | não | CHECK: `Bom`, `Nublado`, `Chuva`, `Chuva forte` |
| clima_tarde | text | não | mesma lista |
| ocorrencias | text | não | |
| criado_por | uuid | sim | |
| enviado_em | timestamptz | não | |

### Tabela `lancamentos`
Para que serve: a quantidade executada de cada serviço em cada dia. Daqui saem todos os números do painel.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | uuid | sim | |
| diario_id | uuid | sim | |
| servico_id | uuid | sim | |
| responsavel_id | uuid | não | **quem executou naquele dia**, guardado no lançamento, porque o responsável do serviço pode mudar depois |
| quantidade | numeric(14,3) | sim | maior ou igual a zero |
| concluido | boolean | sim | |
| lancado_por | uuid | sim | |
| corrigido_por | uuid | não | |
| corrigido_em | timestamptz | não | |

### Tabela `fotos`
Para que serve: as fotos do diário, ligadas ao dia e, quando der, ao serviço.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| obra_id | uuid | sim | |
| diario_id | uuid | sim | |
| servico_id | uuid | não | |
| caminho | text | sim | endereço do arquivo no Storage |
| tirada_por | uuid | sim | |

### Tabelas da Fase 2

**`acionamentos`** — os combinados com o encarregado: `obra_id`, `servico_id`, `combinado` (texto), `data_retorno` (date), `criado_por`, `status` (CHECK: `Aberto`, `Cumprido`, `Não cumprido`).

**`recados`** — o que chega da diretoria e dos fiscais: `obra_id`, `origem` (CHECK: `Diretoria`, `Fiscalização`, `Empreiteiro`, `Encarregado`), `canal` (CHECK: `WhatsApp`, `E-mail`, `Pessoalmente`), `pedido` (texto), `servico_id` (opcional), `prazo` (date), `status` (CHECK: `Aberta`, `Respondida`).

### Permissões por tabela

Ninguém sem login vê nada, em nenhuma tabela. "As obras dela" quer dizer as obras em que a pessoa está em `membros`.

- **obras, membros:** o Engenheiro vê e mexe nas obras dele. A Diretoria vê todas. Equipe da obra e Fiscalização veem só a obra delas.
- **responsaveis, servicos:** o Engenheiro cria, edita e desativa. A Diretoria vê. A Equipe da obra vê **sem** preço unitário nem valores. A Fiscalização vê o serviço com o valor contratado, mas não vê o responsável.
- **medicoes, medicao_itens:** o Engenheiro cria, edita e fecha. A Diretoria vê. A Equipe da obra não vê. A Fiscalização vê só o **medido**, nunca a `qtd_planejada`.
- **diarios, lancamentos, fotos:** o Engenheiro e a Equipe da obra criam. Quem lançou corrige até as 23h59 do dia seguinte; depois disso, só o Engenheiro. A Diretoria vê. A Fiscalização vê as fotos da semana e o avanço somado, não o diário.
- **acionamentos (F2):** o Engenheiro cria. A Diretoria e a Equipe da obra veem. A Fiscalização não vê.
- **recados (F2):** o Engenheiro e a Diretoria criam e veem. Ninguém mais vê.
- **Apagar:** só o Engenheiro. Obras, serviços, responsáveis e medições fechadas nunca são apagados, só desativados ou encerrados.

## A pergunta de um ano

**"Em quais meses, e em quantos, a gente bateu a meta da medição?"** (confirmado pelo engenheiro).

O que isso obriga a guardar desde já:
- **Bater a meta** = valor medido no período **maior ou igual** ao valor planejado do mês, em R$, por obra (proposta: 100% da meta).
- **A meta fica congelada** quando a medição passa para "Em andamento". Se o planejado mudar no meio do mês, a mudança fica registrada, mas a comparação usa a meta do início.
- **O preço unitário é copiado para a medição** no momento em que ela abre. Assim, um aditivo que mude o preço depois não reescreve a meta dos meses passados.
- **Ao fechar a medição**, o sistema grava os totais (R$ planejado, R$ medido e se bateu ou não). A resposta vira uma lista simples: "Medição 3 (out/2026): 92% — não bateu", e no fim "bateu a meta em 7 de 12 meses".

Já guardado desde o primeiro dia, por precaução: **quem executou cada lançamento** (`lancamentos.responsavel_id`). Com isso dá para perguntar, por exemplo, "qual empreiteiro mais deixou serviço parado este ano", mesmo que o responsável do serviço tenha mudado no meio da obra.

## Melhorias para a v2

- Publicar na Play Store / App Store — cortado porque instalar pelo navegador resolve sem custo.
- ~~Efetivo diário por responsável~~ — **voltou para a v1 em 24/10/2026**, a pedido do engenheiro: efetivo por função e por responsável, com cadastro de função e de responsável pelo próprio diário (tabelas `funcoes` e `efetivo`, ver PRD-BACKEND). Junto entraram: memória de cálculo em texto livre dentro de cada cartão de serviço (fica no lançamento; não vai para o resumo) (as atividades do resumo são os nomes dos serviços com produção), Concluído automático pelo saldo do item, números com ponto de milhar e vírgula decimal em todo o app, lançar dia que já passou (equipe: hoje ou ontem; engenheiro: qualquer dia desde o início da obra) e histórico em cartões com miniaturas.
- Ler WhatsApp e e-mail automaticamente — cortado porque é caro e frágil; na Fase 2 entra o registro manual em Recados.
- Diário sem sinal, acionar o encarregado, Fiscalização, fechar e exportar a medição, Recados — Fase 2 (ver Prazo).

---

# A conta que vai chegar depois

- `[PENDENTE: espaço para fotos]` — custo: passar para o plano pago do Supabase (cerca de US$ 25/mês) quando as fotos passarem de 1 GB.
- `[PENDENTE: arquivo do logo HCL]` — custo: sem ele, o app nasce só com o nome "Projeto Obra" escrito no topo até o arquivo chegar.
- `[PENDENTE: modelo da planilha contratual e do Excel do MS Project]` — custo: sem um arquivo real na pasta, a importação é construída com nomes de coluna supostos e precisa de ajuste quando o arquivo chegar.

# Decidir depois de usar

- `[DESCOBRIR NO USO: se precisa estar nas lojas (Play Store / App Store)]` — por enquanto ficou: app instalado pelo navegador, com ícone e diário sem sinal. Ir para a loja depois custa uma conta de desenvolvedor (US$ 25 uma vez no Google, US$ 99 por ano na Apple) e mais tempo de construção.

- `[DESCOBRIR NO USO: quantos dias sem avanço contam como "parado"]` — por enquanto ficou: 5 dias.
