# PRD Frontend — Projeto Obra

> **Mudança de 24/10/2026 (decisão do engenheiro), vale sobre o que estiver escrito abaixo:**
> - O menu **Serviços passou a se chamar Orçamento**. É nele que entra o orçamento da obra em Excel (Fonte, Código, Item, Descrição, Unidade, Quantidade, C. Unitário, BDI por linha, P. Unitário, P. Total), com **aditivo de quantidade** e **item novo** incluídos pelo app. A EAP do Planejamento é montada a partir do Orçamento e enxerga toda mudança feita nele.
> - O cadastro de **Responsáveis (e de funções) saiu de Serviços**. Desde 26/10/2026 ele mora só no módulo **Cadastro** (abas Responsáveis — onde também entram os empreiteiros —, Funções e Equipamentos); o Diário, o Kanban e a medição de empreiteiros só escolhem da lista. Só o engenheiro cadastra; a diretoria vê.
> - **O MS Project fica de fora por enquanto.** Crítico é só marcado à mão; as datas de início e fim são lançadas na EAP, nos itens; as de etapa e subetapa saem sozinhas dos itens (início mais cedo, fim mais tarde).

> Especificação da interface. Quem constrói lê este arquivo.
> Nesta fase não existe banco: as telas funcionam com os dados de exemplo do fim deste arquivo.
> Fonte das decisões: `PLANO-DO-PROJETO.md`. Quando uma decisão mudar, ela muda lá primeiro e depois aqui.
> Marcação: **(F1)** entra na Fase 1, a dos 2 dias; **(F2)** entra na Fase 2, na semana seguinte.

## O que o sistema é

Um sistema de acompanhamento de obras públicas que mostra toda manhã, por obra, quais serviços do mês estão andando, quais estão parados, quem é o responsável, até quando dá para decidir e se a data de entrega ainda está de pé. Usado **no celular e no computador**, por todos os perfis.

## Padrão técnico

- React + Vite (versões atuais), sem biblioteca de componente pronta.
- Visual a partir de um `index.css` próprio.
- Navegação por estado, sem endereço no navegador.
- Visual do `preview.html` (opção 3, "Painel"), com a paleta escolhida pelo engenheiro: grafite **`#26333A`** (cabeçalho, menu, texto), **`#4A5A63`** (texto secundário), cinza-claro **`#F2F4F5`** (fundo), turquesa **`#00A3B4`** (destaque) e vermelho **`#E2574C`** (crítico). Tons escuros derivados para texto pequeno: turquesa `#007C89` e vermelho `#B8392F`. Status: verde `#2A7F51` ok, âmbar `#E3A23B` atenção, vermelho atrasado/crítico. Fontes IBM Plex Sans e IBM Plex Mono. Tema **claro**.
- O nome "Projeto Obra" aparece escrito no topo e no login. [PENDENTE: se o logo da HCL entra no app]
- **Multi-obra:** o seletor de obra fica sempre visível no topo, dizendo em qual obra a pessoa está. Trocar de obra recarrega a tela inteira com os dados daquela obra. A obra escolhida fica guardada no aparelho: fechou e abriu, volta na mesma. Nenhuma tela mostra dado de duas obras juntas, a não ser um comparativo explícito entre obras.
- Celular: barra inferior fixa com até 5 itens (o quinto é "Mais", quando o perfil tem mais de 5). Computador: menu lateral à esquerda.
- Instalável pelo navegador, com ícone na tela inicial do celular. Não vai para a Play Store nem para a App Store.
- **Números digitados do jeito brasileiro em todo o app:** ponto de milhar e vírgula decimal ("1.234,56", "12,5", "1.234"); ponto sozinho que não é milhar vale como decimal ("12.5"). O campo guarda o que a pessoa digita e mostra de volta no padrão brasileiro. Regra em `src/lib/numero.js`; campo `CampoNumero`.
- Dinheiro sempre em `R$ 1.234,56`; datas em `dd/mm/aaaa`; quantidades com até 3 casas decimais e a unidade do serviço (m², m³, un…).

## Perfis

- **Engenheiro:** entra no Painel do mês. Vê tudo, inclusive valor contratado, planejado e medido, nas obras dele.
- **Diretoria:** entra no Painel do mês. Vê tudo, inclusive valores, de **todas** as obras da empresa. Só consulta: não lança nem edita.
- **Equipe da obra** (estagiário, encarregado, auxiliar administrativo e almoxarife, todos com a mesma liberdade): entra em Lançar o dia. Lança o diário, as fotos e as quantidades, e marca serviço concluído. **Não vê nenhum valor em R$.** Fica ligada a uma obra por vez.
- **Fiscalização (F2):** entra em Avanço por serviço. Vê, só da obra que fiscaliza, o avanço sobre o **contratado**, pela quantidade e em R$, e as fotos da semana. **Nunca vê** o planejado do mês (meta interna), o responsável, os dias sem avanço, a data limite de decisão, os combinados com o encarregado nem os recados.
- **Aguardando liberação:** quem se cadastrou e ainda não foi liberado. Vê só o aviso.

## Mapa de navegação

O **seletor de obra** fica no alto de todas as telas, menos no Login e no aviso de liberação.

```
Login  →  Conta aguardando liberação
│
├── Engenheiro:      Painel do mês · Diário · Orçamento · Planejamento · Medição cliente · Medição empreiteiros · Cadastro · Ajustes · Recados (F2)
├── Diretoria:       Painel do mês · Diário (aba Fotos ainda não feita) · Orçamento · Planejamento · Medição cliente · Medição empreiteiros · Cadastro · Meu perfil · Recados (F2)
├── Equipe da obra:  Lançar o dia · Painel do mês · Planejamento · Orçamento (sem R$) · Meu perfil
└── Fiscalização:    Avanço por serviço (F2) · Fotos da semana (F2) · Meu perfil
```

Barra inferior no celular:
- Engenheiro: Painel · Diário · Orçamento · Planejar · Mais (Medição, Ajustes, Recados).
- Diretoria: Painel · Diário · Orçamento · Planejar · Mais (Medição, Meu perfil, Recados).
- Equipe da obra: Lançar o dia · Painel · Planejar · Orçamento · Meu perfil.
- Fiscalização: Avanço · Fotos · Meu perfil.

---

## Em todas as telas: botão "Topo"

Em **todo menu** (inclusive os que forem criados depois), quando a página desce mais de 300 px aparece um
botão flutuante **"↑ Topo"** que acompanha a rolagem e volta ao cabeçalho da tela. No celular fica acima da
barra de baixo; no computador, no canto inferior direito. Mora uma vez só, na casca do app (`Shell.jsx`).

---

## Tela: Login (F1)

**Quem acessa:** todos, antes de entrar.

**O que aparece**
Logo da HCL Engenharia (ou o nome escrito), o lema "Soluções que constroem confiança", campo de e-mail, campo de senha, botão Entrar e link Criar conta.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| E-mail | e-mail | sim | |
| Senha | senha | sim | mínimo de 8 caracteres no cadastro |
| Nome (só em Criar conta) | texto | sim | |

**Ações**
- **Entrar:** valida e leva para a tela inicial do perfil. Erro: "E-mail ou senha incorretos."
- **Criar conta:** cadastra e leva para Conta aguardando liberação.

**Estado vazio**
Não se aplica.

---

## Tela: Conta aguardando liberação (F1)

**Quem acessa:** perfil Aguardando liberação, e qualquer pessoa liberada que ainda não esteja em nenhuma obra.

**O que aparece**
Logo, o texto "Conta aguardando liberação do engenheiro responsável. Assim que ele liberar, você verá suas obras aqui." e o botão Sair. Nenhum dado de obra aparece.

**Ações**
- **Sair:** encerra a sessão e volta ao Login.

**Estado vazio**
Não se aplica.

---

## Componente: Seletor de obra (F1)

**Quem acessa:** todos os perfis liberados.
**Chega aqui por:** fica fixo no alto de todas as telas.

**O que aparece**
O nome da obra aberta e, ao lado, o sinal da entrega em cor (verde, amarelo ou vermelho; a Fiscalização não vê o sinal). Ao tocar, abre uma lista com as obras da pessoa: nome, órgão contratante, data de entrega contratual e o sinal.

**Ações**
- **Trocar de obra:** fecha a lista e **todas** as informações da tela passam a ser da obra escolhida. Nada da obra anterior pode sobrar na tela (lista, filtro, número, foto ou gaveta aberta).

**Regras por perfil**
- **Engenheiro:** vê as obras dele.
- **Diretoria:** vê todas as obras da empresa.
- **Equipe da obra e Fiscalização:** veem só a obra em que estão; o seletor mostra o nome e não abre a lista.

**Ordem**
A última obra aberta fica primeiro. Obras encerradas não aparecem, a não ser que o Engenheiro marque "mostrar encerradas".

**Estado vazio**
"Você ainda não foi incluído em nenhuma obra. Peça ao engenheiro responsável."

---

## Tela: Painel do mês (F1)

No menu, esta tela se chama **Início** (desde 25/10/2026).


**Quem acessa:** Engenheiro, Diretoria, Equipe da obra (sem R$).
**Chega aqui por:** item de menu Painel; é a tela inicial do Engenheiro e da Diretoria.

**O que aparece**
1. **Sinal da entrega**, no alto, em faixa colorida:
   - Verde: "Entrega em 15/03/2027 — **de pé**".
   - Amarelo: "Entrega em 15/03/2027 — **em risco**": algum serviço crítico passou da data limite de decisão.
   - Vermelho: "Entrega em 15/03/2027 — **comprometida**": algum serviço crítico, no ritmo atual, termina depois da data de entrega.
2. **Contadores da medição atual:** período (ex.: "Medição 3 · 21/10 a 20/11"), R$ planejado no mês, R$ executado, % executado e quantos serviços estão em cada situação (parado, atrasado, atenção, em dia, concluído). Cada contador funciona como filtro ao ser tocado.
3. **Filtros:** responsável, frente, situação e "só críticos".
4. **A lista de serviços planejados no mês:**
   - **No computador:** uma tabela com as colunas na ordem abaixo, com cabeçalho fixo e rolagem só dentro da tabela.
   - **No celular:** um cartão por serviço, com descrição, R$ planejado, R$ executado, falta executar e a etiqueta de situação em cor. Ao tocar no cartão, ele abre e mostra o resto das colunas.

**Campos e informações** (na ordem das colunas)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Descrição do serviço | texto | — | coluna E da planilha atual |
| Valor planejado no mês | R$ | — | coluna M; qtd planejada × preço unitário da medição |
| Valor executado no período | R$ | — | coluna P; qtd executada no período × preço unitário da medição |
| Falta executar | R$ | — | planejado − executado; nunca negativo (mostra R$ 0,00 se passou da meta) |
| % executado | % | — | executado ÷ planejado do mês |
| Situação | etiqueta colorida | — | `Parado`, `Atrasado`, `Atenção`, `Em dia`, `Concluído` |
| Dias sem avanço | número | — | dias corridos desde o último lançamento com quantidade > 0 |
| Responsável | texto | — | nome do empreiteiro, da empresa especializada ou "Mão de obra própria" |
| Data limite de decisão | data | — | em vermelho quando já passou |
| Último acionamento (F2) | texto | — | "23/10 — encarregado" ou vazio |
| Código | texto | — | |
| Frente | texto | — | |
| Unidade | texto | — | |
| Qtd planejada no mês | número | — | |
| Qtd executada no período | número | — | |
| Ritmo dos últimos 7 dias | número/dia | — | média dos dias com lançamento |
| Término previsto | data | — | no ritmo atual; "sem previsão" se o ritmo for zero |
| Crítico | ícone | — | aparece só nos críticos |

**Regras de cálculo**
- **Término previsto** = hoje + (quantidade que falta para o contratado ÷ ritmo médio dos últimos 7 dias com trabalho).
- **Data limite de decisão** = data de fim planejada − (quantidade que falta ÷ o melhor ritmo semanal já registrado no serviço, convertido para dias). Sem fim planejado ou sem nenhum lançamento: "—".
- **Situação**, a primeira regra que bater nesta ordem: `Concluído` (marcado concluído) → `Parado` (5 dias ou mais sem avanço) → `Atrasado` (término previsto depois do fim planejado) → `Atenção` (hoje passou da data limite de decisão) → `Em dia`.
- **Sinal da entrega:** vermelho se algum serviço crítico estiver `Atrasado` com término previsto depois da data de entrega da obra; amarelo se algum crítico estiver em `Atenção` ou `Parado`; verde nos outros casos.

**Ordem**
Primeiro `Parado`, depois `Atrasado`, `Atenção`, `Em dia` e `Concluído`. Dentro de cada grupo, o maior **falta executar (R$)** em cima. Para a Equipe da obra, que não vê R$, a ordem dentro do grupo é pelos dias sem avanço, do maior para o menor.

**Ações**
- **Tocar num serviço:** abre a **gaveta do serviço**, com o histórico de lançamentos (dia, quantidade, quem executou, quem lançou, fotos) e um gráfico "planejado × executado no mês", acumulado dia a dia. O gráfico responde: "este serviço vai bater a meta do mês?".
- **Acionar o encarregado (F2):** botão na gaveta e na linha. Abre um quadro com "o que foi combinado" (texto) e "conferir em" (data, já preenchida com o **dia seguinte**). Ao salvar, a linha mostra "acionado em 23/10". Se na data de conferência o serviço não tiver avançado, ele volta para o topo com a etiqueta **"combinado não cumprido"**.
- **Exportar para Excel:** baixa a lista que está na tela, com os filtros aplicados.

**Regras por perfil**
- **Engenheiro:** tudo, incluindo Acionar o encarregado (F2).
- **Diretoria:** tudo, menos Acionar o encarregado. Vê os combinados.
- **Equipe da obra:** sem nenhuma coluna em R$ (planejado, executado e falta executar somem; o % é pela quantidade). Vê os combinados (F2). Não exporta.

**Estado vazio**
"Nenhum serviço planejado para esta medição. Monte o planejamento do mês em Medição." (para a Equipe da obra: "O planejamento deste mês ainda não foi montado pelo engenheiro.")

---

## Tela: Lançar o dia / Diário (F1)

**Quem acessa:** Engenheiro e Equipe da obra lançam; Diretoria só vê.
**Chega aqui por:** item de menu Lançar o dia (Equipe da obra, tela inicial) ou Diário (Engenheiro e Diretoria).

**O que aparece**
1. Lista dos diários da obra, do mais novo para o mais antigo: data, clima, quem lançou, quantos serviços tiveram produção, quantas fotos. Aba **Fotos** ao lado, com as fotos do diário em grade, das mais novas para as mais antigas.
2. Botão grande **Lançar o dia** quando ainda não existe diário hoje.
3. **O diário do dia**, pensado para o dedo no canteiro (botões grandes, pouca digitação):
   - Data (hoje, pode voltar para ontem), clima da manhã e clima da tarde (4 botões cada), ocorrências (texto livre).
   - **Produção do dia:** primeiro os serviços do planejamento do mês; os outros por uma busca pelo código ou pela descrição. Em cada serviço: o campo de quantidade executada hoje (com a unidade ao lado), quem executou (vem preenchido com o responsável do cartão do Kanban na semana e pode ser trocado) e o botão de foto. Sem caixa de Concluído (desde 25/10/2026).
   - **Fotos do dia:** tirar ou escolher fotos, cada uma ligada a um serviço ou ao dia em geral.
4. Botão **Enviar**.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Dia do diário | data | sim | já vem com hoje; não aceita futuro; a Equipe escolhe hoje ou ontem, o Engenheiro qualquer dia desde o início da obra. Se o dia já tem diário, abre o resumo (com "Corrigir" quando permitido) |
| Clima manhã | escolha | não | `Bom`, `Nublado`, `Chuva`, `Chuva forte` |
| Clima tarde | escolha | não | mesma lista |
| Efetivo do dia | linhas | não | cada linha: **responsável + função + pessoas** (só número inteiro, teclado numérico). Total do dia no alto. Linha incompleta ou repetida fica marcada em vermelho na hora. Responsável ou função que falta se cadastra no módulo **Cadastro** (o Engenheiro vê o atalho logo abaixo das linhas); o diário só escolhe da lista |
| Memória de cálculo (por serviço) | texto longo | não | **dentro de cada cartão de serviço**, logo abaixo da quantidade: as contas daquela quantidade (ex.: "12,40 m × 2,80 m = 34,72 m²"). Fica só no formulário: **não vai para o resumo do dia nem para o histórico**. Um serviço só com memória de cálculo também é gravado |
| Ocorrências | texto longo | não | |
| Quantidade executada (por serviço) | número | não | maior ou igual a zero; com a unidade do serviço |
| Quem executou (por serviço) | escolha | sim, se houver quantidade | lista de responsáveis da obra |
| Concluído (por serviço) | caixinha | não | |
| Fotos | imagem | não | dois botões por serviço: **"Tirar foto"** (abre a câmera) e **"Da galeria"**; **sempre comprimidas no aparelho para no máximo 5 MB** antes de entrar no diário (decisão do engenheiro, 24/10/2026). A tela mostra "Comprimindo…" e depois o tamanho final; dá para tirar uma foto antes de enviar. Cada foto mostra **data e hora em que foi tirada, GPS (com link para o mapa), endereço e tamanho**; sem GPS, aparece em vermelho "Sem GPS. Ligue a localização do celular e tire a foto de novo." |

**Ações**
- **Lançar o dia:** abre o diário de hoje vazio.
- **Tirar foto:** abre a câmera; a foto aparece em miniatura no serviço.
- **Enviar:** salva o diário, os lançamentos e as fotos. Mostra "Diário de 23/10 enviado" e volta para a lista.
- **Histórico:** os dias anteriores aparecem em cartões, do mais novo para o mais antigo: data por extenso, etiqueta do clima, total do efetivo, quantos serviços e fotos, as **atividades do dia — o nome de cada serviço que teve produção (os cartões), com a quantidade**, ocorrências em vermelho e miniaturas das fotos (até 4, com "+N"). Tocar no cartão abre aquele dia.
- **Cartões de produção (desde 24/10/2026):** o dia novo já abre com **um cartão para cada atividade planejada na EAP para aquele dia** (o período do item inclui o dia) **e as atrasadas** (deveriam ter terminado e não terminaram); item terminado no Diário ou concluído em outro dia fica de fora. É a mesma regra do Kanban do Curto prazo, para um dia só. **Não há cartão vazio** (desde 25/10/2026): o diário tem só os cartões do planejado na EAP; atividade fora do planejado entra lançando as datas dela na EAP. Dia sem nada planejado mostra o aviso "Nenhuma atividade planejada na EAP para este dia". Os cartões vêm da EAP: **não há seleção de atividade no cartão** (desde 26/10/2026), e o código aparece uma vez só. O cartão traz código, descrição, unidade, a **situação no Kanban da semana** (A fazer, Em andamento, Concluído, Não realizado; a mesma do Curto prazo), "Atrasada" quando já devia ter terminado, o **período na EAP** ("Período na EAP: dd/mm/aaaa a dd/mm/aaaa", ou "Sem datas na EAP"), feito no mês, saldo do item, quantidade, memória de cálculo, quem executou (sugere o responsável do cartão do Kanban na semana) e fotos. Não há marcação de Concluído à mão (desde 25/10/2026): o item conclui sozinho quando a quantidade cobre o saldo. O ✕, ao lado da situação, tira do dia um cartão que não vai ser usado; com lançamento, pergunta antes, porque apaga o lançamento. **Kanban e Diário andam juntos, e vale a última ação** (desde 26/10/2026). Mover o cartão no Kanban muda a situação que o cartão do Diário mostra. Mudar a quantidade de um item no Diário muda o cartão dele no Kanban: quantidade que cobre o saldo do item → "Concluído"; produção na semana → "Em andamento"; corrigido ou desfeito até não ter produção na semana → "A fazer". Enquanto a quantidade é digitada, o cartão do Diário já mostra a situação que vai ficar. Só o item que mudou no envio mexe no Kanban (salvar outro item não desfaz o que foi movido no Kanban). Não mexe em "Não realizado" nem em atividade tirada da semana. Na correção, os cartões abrem com os itens já lançados naquele dia e, junto, as atividades planejadas na EAP para o dia que ainda não estavam lá (sem repetir). O ✕ tira um cartão que não vai ser usado; trocar de dia e voltar recria os cartões. Cartões compactos: 1 por linha no celular, 3 no notebook e 4 em tela larga.
- **Meta do cartão = medição do período** (desde 26/10/2026): cada cartão mostra "Meta na Medição N (meses): Y", com Y = a quantidade prevista do mesmo item na **medição cujo período tem o dia do diário** (em planejamento, em andamento ou fechada), e "Feito na medição X de Y" (o executado no período dessa medição, com o que se digita agora). Item que não está nessa medição mostra "Sem meta na Medição N"; dia fora de toda medição, "Sem medição neste período". A meta é a congelada quando a medição já foi iniciada.
- **Quantidade do serviço:** cada cartão mostra a meta e o feito na medição do período (item acima) e o **saldo do item** (contratado − acumulado), os dois **em tempo real** enquanto a quantidade é digitada, com o valor de antes entre parênteses ("Feito 42,5 m de 120 m no mês (era 30 m)"). A quantidade de um dia fora do período da medição não entra no feito do mês. No planejamento da Medição, o R$ de cada linha e a meta em montagem também mudam enquanto se digita. Não há botão de Concluído (desde 25/10/2026): o item conclui sozinho quando a quantidade do dia cobre o saldo. Quantidade acima do saldo mostra o aviso "Acima do saldo do item", sem bloquear.
- **Efetivo de um dia novo** já começa com o efetivo do último diário anterior, para só ajustar. Linha deixada em branco é ignorada no envio.
- **Trocar de dia** com um lançamento ainda não enviado pede confirmação antes de descartar; durante o preparo de uma foto, o dia não pode ser trocado.
- **Efetivo compacto:** no celular, responsável numa linha e função, pessoas e ✕ na de baixo; em tela larga, tudo numa linha. Nada passa da largura da tela.
- **Enviar:** precisa de alguma coisa do dia: produção, efetivo, memória de cálculo ou ocorrências (dia de chuva sem produção também é diário).
- **Corrigir:** quem lançou corrige até as 23h59 do dia seguinte; depois disso, só o Engenheiro corrige, e a correção fica marcada "corrigido por [nome] em [data]".
- **Diário sem sinal (F2):** sem internet, o diário fica guardado no celular e aparece o aviso "3 lançamentos aguardando envio". O envio acontece sozinho quando a internet volta.

**Regras por perfil**
- **Engenheiro:** lança e corrige qualquer diário.
- **Equipe da obra:** lança e corrige só o que lançou, dentro do prazo. Não vê R$ em lugar nenhum desta tela.
- **Diretoria:** só vê a lista, o diário e as fotos.

**Estado vazio**
"Nenhum diário hoje. Toque em Lançar o dia." · Aba Fotos: "Nenhuma foto nesta obra ainda."

---

## Tela: Orçamento (F1, era "Serviços" até 24/10/2026)

**Quem acessa:** Engenheiro (edita), Diretoria (vê), Equipe da obra (vê sem R$).
**Chega aqui por:** item de menu Orçamento.

**O que mostra**
- **Totais** (só quem vê valores): orçamento original, aditivos (+/−) e orçamento vigente. Abaixo, recolhido,
  "Base de referência, encargos e BDI" (base, mês de referência, encargos, período, BDI de serviço e de material).
- **A planilha**, em árvore: etapa (1), subgrupo (1.1) e item (1.1.1). De início só as etapas aparecem;
  "Abrir tudo" e "Fechar tudo". Cada grupo mostra o subtotal vigente e o seu % do orçamento.
- **Colunas no computador:** Item, Fonte, Código, Descrição, Und, Quant., C. Unit., BDI, P. Unit., P. Total, % do orçamento.
  Quantidade com aditivo aparece "orçada riscada → vigente". Marcas: "Item novo", "Aditivo", "Crítico".
  **% do orçamento** = valor do item (ou subtotal do grupo) ÷ orçamento **vigente** (original + aditivos); o total dá 100,00%.
  A Equipe vê só Item, Descrição, Und e Quant.
- **No celular:** a mesma árvore em linhas (grupo com subtotal e % do orçamento; item com quantidade, P. Total e % do orçamento).
- **Busca** (item, código ou descrição) e filtros **Todos, Com aditivo, Itens novos, Críticos, Arquivados**.
- O avanço físico (executado no Diário) fica no detalhe do item e na EAP; a Equipe não vê a coluna de %, que vem dos valores.

**Detalhe do item (gaveta):** fonte e código, unidade, quantidade orçada, aditivos, vigente, executado,
saldo, responsável e, para quem vê valores, C. Unit., BDI, P. Unit. e P. Total vigente; a lista de aditivos do item.

**Ações (só o Engenheiro)**
- **Aditivo de quantidade:** acréscimo ou supressão, quantidade, número do aditivo, data e motivo. Mostra
  a vigente atual → nova e a diferença em R$. Supressão abaixo do executado é recusada com o motivo.
- **Item novo:** grupo (o Item sai sozinho, o próximo do grupo), fonte, código, descrição, unidade, quantidade,
  C. Unitário, BDI (o de serviço, o de material/equipamento ou outro), aditivo que o incluiu e responsável.
  P. Unit. e P. Total aparecem na hora, truncados como na planilha. Item novo pode ser arquivado.
- **Corrigir e excluir aditivo:** cada aditivo da lista do item tem "Corrigir" (mesmo formulário, preenchido,
  com a vigente antes → depois) e "Excluir" (pede confirmação e diz para quanto a vigente volta). Recusa o que
  deixaria a vigente abaixo do executado.
- **Corrigir e excluir item novo:** "Corrigir item novo" abre o formulário preenchido (P. Unit. recalculado,
  truncado); o grupo fica travado se o item já tem lançamento. "Excluir item novo" só aparece sem execução;
  com execução, fica "Arquivar". Item da planilha não tem esses botões.
- **Quem corrigiu:** o item e o aditivo corrigidos mostram "corrigido por <nome> em <data e hora>".
- **Grupo:** etapa nova ou subgrupo dentro de um grupo; o código sai sozinho.
- **Marcar como crítico.**
- **Importar orçamento (Excel):** Etapa 4 (lê todas as linhas e colunas do modelo da HCL).

**A EAP do Planejamento lê estes mesmos itens e grupos:** tudo o que muda aqui aparece lá.

**Estado vazio:** "Nenhum item nesta obra ainda. Comece importando o orçamento da obra em Excel."

---

## Tela: Planejamento — aba EAP (F1, desde 24/10/2026)

**Quem acessa:** Engenheiro (lança as datas), Diretoria e Equipe da obra (veem). Fiscalização não vê.
**Chega aqui por:** menu Planejamento, primeira aba. Ciclo de uso: EAP → Longo prazo → Médio prazo → Curto prazo.

**O que mostra:** a árvore do Orçamento (etapa › subgrupo › item), sem lista paralela: itens e grupos
vêm do Orçamento e **não são criados nem editados aqui** (botão "Ir para o Orçamento"). Cada linha tem
o período planejado (início a fim, dias corridos) e a **barra de avanço** do Diário (item: executado ÷
quantidade vigente; grupo: média ponderada pelo valor, ou simples para quem não vê valores). Busca,
"Abrir tudo", "Fechar tudo", filtros **Sem datas** e **Arquivados**, e o contador "N itens sem datas".
Tocar numa linha abre o detalhe (datas, dias, avanço, quantidade, valor para quem vê valores, responsável).

**Datas de etapa e subetapa são automáticas:** o grupo nunca recebe data. O início dele é o **início mais
cedo** entre os itens de dentro, e o fim é o **fim mais tarde** — em todos os níveis (o item puxa a
subetapa, que puxa a etapa). Grupo só com itens sem data fica "Sem datas".

**Lançar datas (só o Engenheiro), desde 25/10/2026:** não há mais o botão "Editar datas". **Tocar num item** abre
os campos **Início e Fim no próprio item** (ao lado, no computador; logo abaixo, no celular), com o botão
**Salvar** do item e ✕ para fechar. Dá para abrir vários itens em sequência (2.1.1, 2.1.2, 2.1.3…). Enquanto
houver data digitada e não salva, aparece um **botão flutuante** "N datas não salvas · Salvar · Descartar"
que grava todas de uma vez; a linha fechada com data não salva mostra "não salva". O período de etapa e
subetapa muda na hora. **Fim antes do início** (ou só uma data) mostra o erro no item e impede salvar. O
botão "i" do item abre o detalhe.

---

## Tela: Planejamento — aba Longo prazo (F1, desde 24/10/2026)

**Quem acessa:** Engenheiro, Diretoria e Equipe da obra (só leitura; nada aqui mostra R$).

**O que mostra:** o cronograma em barras da EAP (sem biblioteca de Gantt), com as mesmas linhas
(etapa › subetapa › item) e as datas lançadas na EAP. Cada barra vai do início ao fim planejado; a
parte cheia é o **avanço real** (Diário ÷ quantidade vigente) e a marca fina é o **previsto para hoje**,
contado em **dias úteis** pelo calendário da obra. Linha vertical de **hoje**. No grupo, previsto e
real são médias dos itens com datas, ponderadas pelo valor (simples para quem não vê valores).
- **Situação (cor da barra):** Em dia (verde: até 2 pontos atrás), Atenção (âmbar: até 10 pontos
  atrás), Atrasado (vermelho: mais de 10 pontos, ou passou do fim sem concluir), Concluído (cinza),
  A iniciar (azul, antes do início).
- **Escala Semana ou Mês** (botão). Coluna fixa à esquerda com código, nome e "Prev. / Real".
- Grupos abrem e fecham (de início só as etapas); busca; filtro **Atrasados (N)**; Abrir/Fechar tudo.
- Itens sem datas não entram; aviso "N itens sem datas" com o botão **Lançar datas na EAP**.
- **No celular:** lista com código, nome, datas, "Previsto X%, real Y%", a situação e a barra.
- Para depois: linha de base (salvar o planejado e comparar com o atual).

---

**Previsão de faturamento pela EAP (desde 25/10/2026; só Engenheiro e Diretoria):** na tela **Início** (depois do
avanço da medição, antes da lista de serviços), em toda obra. Desde 25/10/2026 ele não aparece mais no Longo prazo.
O valor vigente de cada item (P. Total do Orçamento) é espalhado pelos **dias úteis** do período dele na EAP
(calendário da obra) e somado por mês. Mostra: o total previsto com datas e quanto isso é do orçamento vigente;
o previsto e o realizado deste mês; o mês de maior previsão; o valor e a quantidade de itens ainda sem datas
(com "lançar datas"). Gráfico de barras por mês: **Previsto (EAP)** em turquesa ao lado do **Realizado
(Diário)** em roxo (quantidade lançada × P. Unit.), com o mês atual destacado e o valor escrito só no mês
atual e no de maior previsão; passar o mouse mostra os números do mês. "Ver a tabela mês a mês": previsto,
previsto acumulado, % acumulado e realizado. A Equipe da obra não vê (não recebe preços).
Na obra que mede por meses inteiros (cronograma de medições), **os meses de uma mesma medição viram uma barra e uma linha só** (desde 26/10/2026): na ARRECIFES, a Medição 1 aparece como "out/26 + nov/26", com a soma dos dois, e o quadro do período atual diz "Esta medição (Medição 1, out/26 + nov/26)".

---

## Tela: Planejamento — aba Médio prazo (F1, desde 24/10/2026)

**Quem acessa:** Engenheiro e Equipe da obra **criam e resolvem** restrições; **editar, mover de semana
e excluir é só do Engenheiro**; a Diretoria só vê.

**O que mostra:** um quadro com **uma coluna por semana** (segunda a domingo), começando na semana de
hoje; **3 (padrão, desde 25/10/2026), 4, 5 ou 6 semanas**. Cada coluna: datas, "N atividades", "N liberadas" e "N restrições
abertas". **Toda atividade prevista na semana é um cartão** (desde 25/10/2026), como num Kanban, em ordem de
código: código e nome, **Liberada** (borda verde, sem restrição aberta) ou **Com restrição** (borda âmbar),
o período na EAP, a barra do real no Diário, **as restrições dela dentro do cartão** e "＋ Restrição".
Atividade com restrição na semana mas fora do período na EAP também aparece, marcada "Fora do período na EAP"; item sem datas na EAP nunca vira cartão.
- **Cartão da restrição:** tipo com cor e ícone (**Material, Mão de obra, Método, Equipamento,
  Projeto, Segurança, Logística**), descrição, atividade (código e nome), responsável e prazo (vermelho
  e "vencido" quando passou sem resolver). Botões: **Resolver** / Reabrir (guarda quem e quando),
  **◀ ▶** para mover de semana (sem arrastar) e **Editar**.
- Restrição aberta de semana que já passou aparece em "Esta semana" com "Veio da semana de dd/mm";
  resolvida nesta semana também continua lá.
- **Nova restrição:** atividade (campo com setinha e busca, só itens com datas), tipo, o que está
  travando, semana, prazo para resolver e responsável (texto com sugestões dos responsáveis da obra).
- **Filtros:** número de semanas, responsável e **Mostrar resolvidas** (de início escondidas).
- **No celular:** uma semana por vez, com as abas "Sem. 1…N" (e o número de restrições abertas).

---

## Tela: Planejamento — aba Curto prazo (F1, desde 24/10/2026)

**Quem acessa:** Engenheiro e Equipe da obra **movem as atividades e cuidam das subtarefas**; **tirar
atividade da semana é só do Engenheiro**; a Diretoria só vê.

**O que mostra:** a semana (segunda a domingo) com **◀ ▶** para navegar e "Hoje" para voltar.
- **PPC da semana** = atividades concluídas ÷ planejadas × 100, em número grande, barra e "X de Y
  concluídas". Ao lado, o **PPC das últimas 8 semanas** (barras; tocar leva à semana) e as
  **principais causas** de não realizado nessas semanas.
- **Kanban** com 4 colunas: **A fazer, Em andamento, Concluído, Não realizado**. Mover é por botões
  (Iniciar, Concluir, Não realizado, Voltar, Reabrir), sem arrastar. **Não realizado exige a causa
  raiz**: Material, Mão de obra, Projeto, Método, Equipamento, Segurança, Logística, Clima ou Outra
  (com texto).
- **Cartão:** código e nome, "Atrasada" (deveria ter terminado), "Com restrição" (restrição aberta
  no Médio prazo), **responsável** (engenheiro e equipe escolhem numa lista quem resolve e executa na semana; o Diário atualiza com quem executou, vale a última ação; desde 25/10/2026), datas e a barra do real no Diário. **Subtarefas** (checklist): incluir,
  marcar feita, marcar não realizada (com causa) e excluir; o cartão mostra "X de Y".
- **Quem entra na semana (automático):** o item da EAP cujo período cruza a semana, ou que já
  deveria ter terminado e não terminou (atrasada); item terminado no Diário sai. O que já foi mexido
  na semana continua lá. O engenheiro pode **tirar da semana** (vai para "Fora da semana", não conta
  no PPC) e devolver.
- **No celular:** as 4 colunas viram abas com o número de atividades de cada uma.

---

## Tela: Ajustes — calendário de trabalho (F1, desde 24/10/2026)

Para a obra escolhida no topo: os **dias de trabalho** (Dom a Sáb; padrão seg a sex) e os **feriados**.
Toda obra nasce com os feriados nacionais de 2026 e 2027 (com Carnaval e Corpus Christi); o engenheiro
tira o que a obra trabalha e inclui os municipais e estaduais (data e nome). "Salvar calendário".
O previsto do Longo prazo e os "dias úteis" da EAP contam por ele.

---

## Tela: Medição cliente (F1, com partes F2)

No menu: **Medição cliente** (desde 26/10/2026; antes "Medição"), a medição que vai para o contratante.

**Quem acessa:** Engenheiro (edita), Diretoria (vê).
**Chega aqui por:** item de menu Medição.

**O que aparece**
Lista dos períodos de medição da obra, do mais novo para o mais antigo: número, período, situação, R$ planejado, R$ medido, % e, nas fechadas, a etiqueta **"bateu a meta"** ou **"não bateu"**. No fim da lista, o resumo: "Bateu a meta em 7 de 12 medições".

Ao abrir um período: a **medição fatiada, na estrutura do Orçamento** (desde 25/10/2026): só os grupos e subgrupos que têm item na medição. Colunas do Orçamento: Item, Fonte, Referência, Descrição, Und, Quant. (vigente), P. Unit. e P. Total (truncado, como a planilha); colunas da medição: Qtd do mês e R$ do mês (e, depois de fechada, Qtd medida). Cada grupo soma o P. Total e o R$ do mês; no pé, o total da medição. Cada item mostra também o período na EAP.

**A medição segue a EAP sozinha** (desde 25/10/2026): a **Medição 1 é criada sozinha** quando o primeiro item ganha início e fim na EAP dentro do mês vigente, e o período dela é esse mês (do dia 1 ao último dia). Enquanto está em `Planejando`, todo item que ganha datas no período entra sozinho, o que perde as datas (ou sai do período) sai, e a Qtd do mês = qtd vigente × dias úteis do item dentro do período ÷ dias úteis do item, truncada em 2 casas e limitada ao saldo (item já executado todo fica de fora). O engenheiro pode ajustar a Qtd do mês; ajustada à mão, ela não muda mais com a EAP. Ao iniciar, a lista acompanha a EAP uma última vez e a meta congela. Medição sem item não inicia.

**Cronograma de medições do contrato** (desde 26/10/2026): na ficha da obra (Ajustes), "Início das medições" e "Fim da 1ª medição". Com os dois, **todas as medições do contrato nascem de uma vez**, em `Planejando`: a 1ª vai do início ao fim informado (pode juntar meses; na ARRECIFES, 01/10 a 30/11/2026, out + nov) e, depois, uma por mês-calendário até o mês da entrega (na ARRECIFES, até ago/2027: 10 medições). Cada uma segue a EAP do seu período, com as mesmas regras acima; item que cruza dois períodos entra nos dois, dividido pelos dias úteis. A tela mostra **um botão por medição** (número, meses, datas, situação e, em planejamento, nº de itens e R$ em montagem); no fim da grade fica o botão **"＋ Nova medição"**, que já diz qual vem (ex.: "Medição 11, set/27"): ele cria a que passa do contrato só quando o engenheiro pede (pergunta antes), continuando mês a mês (12 = out/27…), e ela também segue a EAP do seu período. Obra sem cronograma segue a regra da Medição 1 no mês vigente, uma em planejamento por vez.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Número | número | sim | 1, 2, 3… |
| Data de início | data | sim | |
| Data de fim | data | sim | |
| Situação | etiqueta | sim | `Planejando`, `Em andamento`, `Fechada` |
| Qtd planejada (por serviço) | número | sim | a meta interna |
| Qtd medida (por serviço, F2) | número | sim ao fechar | vem preenchida com a qtd executada no período |

**Ações**
- **Nova medição:** cria a próxima (número e período automáticos, continuando do fim da anterior; mês inteiro quando começa no dia 1) em `Planejando`, já seguindo a EAP do período. Na obra com cronograma, serve para passar do contrato (Medição 11 em diante).
- **Ordem de iniciar** (desde 26/10/2026): só a medição de número mais baixo ainda em planejamento pode ser iniciada, e sem outra em andamento (a 5 não passa na frente da 1).
- **Descongelar para replanejar** (desde 26/10/2026): na medição `Em andamento`, o engenheiro pode descongelar (pergunta antes). Ela volta para `Planejando`: a meta congelada deixa de valer e os itens voltam a acompanhar a EAP (a quantidade ajustada à mão fica). Para valer de novo, inicia outra vez, o que congela a meta replanejada. Fechada não descongela.
- **Planejar o mês:** escolhe os serviços e a quantidade de cada um; também dá para importar do Excel (código + quantidade).
- **Iniciar medição:** passa para `Em andamento`. Nesse momento **a meta fica congelada** (quantidade e preço unitário de cada serviço). Mudanças depois disso ficam registradas, mas a comparação usa a meta do início.
- **Fechar medição (F2):** confere as quantidades medidas, grava os totais e se bateu a meta. Depois de fechada, não muda mais.
- **Exportar para Excel (F2):** no formato da planilha atual de medição.

**Regras por perfil**
- **Engenheiro:** tudo.
- **Diretoria:** só vê.

**Estado vazio**
"Nenhuma medição aberta. Crie a primeira e informe o período."

---

## Tela: Medição empreiteiros (desde 26/10/2026)

**Quem acessa:** Engenheiro (mexe e lança boletim), Diretoria (vê). Equipe da obra e Fiscalização não veem (tem R$).
**Chega aqui por:** menu **Medição empreiteiros** (depois de Medição cliente).
**Decidido pelo engenheiro em 26/10/2026:** entra agora, mesmo com "pagamento de empreiteiros" fora da v1 no plano; itens do escopo vêm do **Orçamento da obra**; só o Engenheiro lança boletim; contrato concluído **pode ser reaberto** (aditivo).

**Tela 1, fluxo do contrato (Kanban):** colunas Em elaboração → Enviado p/ aprovação → Aprovado / Ativo → Concluído; no celular, uma coluna por vez (abas). Card: empreiteiro, descrição, tipo, valor total (quando cadastrado) e, ativo ou concluído, a barra do % medido. Move por **setas** (sem arrastar): "Avançar ▶", "◀ Voltar". **Ativar** abre o cadastro do valor; **Concluir** só com 100% medido (senão avisa e bloqueia); contrato com boletim não volta para antes de ativo; concluído tem **"◀ Reabrir"**; ativo tem **"Aditivo"** (o mesmo cadastro do valor). **"＋ Novo contrato"**: empreiteiro (responsáveis da obra que não são mão de obra própria) + descrição; nasce em Em elaboração.

**Cadastro do valor:** escolha entre **Global** (só o valor total) e **Por escopo** (uma linha por item do Orçamento, escolhido pelo campo com setinha e busca; quantidade e preço unitário do empreiteiro; "＋ Adicionar item"; o ✕ remove, perguntando antes se a linha tem dado). O app soma o **valor total** (P. Total truncado, como o Orçamento). No aditivo, nada fica abaixo do já medido.

**Tela 2, ficha de medição** (botão **"Ficha de medição ▸"** no card ativo ou concluído): resumo (valor total, medido acumulado em R$ e %, saldo a medir e barra); no escopo, os itens com contratado, medido, saldo e %; e o **histórico de boletins** (nº, data, valor), do mais recente para o mais antigo. **"＋ Nova medição"** (só Engenheiro, só contrato ativo) abre o **boletim numerado** (Medição nº 1, 2…) com a data de hoje (não aceita data futura). **Global:** digita-se o % ou o R$ e o outro sai na hora (o R$, em centavos, é a verdade). **Por escopo:** uma linha por item; em cada linha digita-se a **quantidade, o % ou o R$** e os outros dois saem na hora; a **quantidade é a fonte da verdade** (o % e o R$ = TRUNCAR(quantidade × preço, 2) saem dela, 3 casas na quantidade). Cada linha mostra o acumulado novo. **Bloqueio:** nenhum item (nem o global) passa de 100% acumulado: a linha fica vermelha, aparece o saldo do item e o botão de salvar trava. Rodapé: total do boletim, novo acumulado (R$ e %) e saldo. Ao salvar, o resumo e o histórico atualizam na hora, o formulário fecha e a barra do card no Kanban sobe. **No celular**, cada linha do boletim vira um **cartão empilhado**; a partir de 900 px, linha de tabela.

---

## Tela: Cadastro (desde 26/10/2026)

**Quem acessa:** Engenheiro (cadastra), Diretoria (vê). Equipe da obra e Fiscalização não têm o menu.
**Chega aqui por:** menu **Cadastro** (depois de Medição empreiteiros) ou pelo atalho do Diário.
**Decidido pelo engenheiro em 26/10/2026:** todo cadastro da obra fica aqui, e só aqui. Os outros módulos (Diário, Curto prazo, Medição empreiteiros) só escolhem da lista.

Abas no alto, todas da obra atual:
- **Responsáveis:** nome (obrigatório), tipo (Empreiteiro, Empresa especializada ou Mão de obra própria) e contato. **Empreiteiro não tem aba própria** (decisão de 26/10/2026, para não duplicar): é cadastrado aqui como responsável e aparece no efetivo do Diário, no responsável do Curto prazo e no "＋ Novo contrato" da medição de empreiteiros.
- **Funções:** nome; não aceita repetida na obra.
- **Equipamentos:** nome (obrigatório, não repete na obra), próprio ou locado, **"Locado de"** (obrigatório quando é locado) e identificação (placa, série ou patrimônio, opcional).

Cada aba mostra o formulário (só o Engenheiro) e, abaixo, a lista do que já existe. Erro aparece embaixo do campo, na hora de salvar.

---

## Tela: Recados e pendências (F2)

**Quem acessa:** Engenheiro e Diretoria.
**Chega aqui por:** item de menu Recados (no celular, dentro de "Mais").

**O que aparece**
Abertas primeiro, pelo prazo; depois as respondidas. Filtro: de quem veio.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| De quem veio | escolha | sim | `Diretoria`, `Fiscalização`, `Empreiteiro`, `Encarregado` |
| Por onde chegou | escolha | sim | `WhatsApp`, `E-mail`, `Pessoalmente` |
| O que pede | texto | sim | |
| Serviço ligado | escolha | não | |
| Prazo | data | não | |
| Situação | etiqueta | sim | `Aberta`, `Respondida` |

**Ações**
- **Novo recado:** cria aberto.
- **Marcar como respondida:** muda a situação; fica no histórico.

**Estado vazio**
"Nenhuma pendência aberta."

---

## Tela: Avanço por serviço — Fiscalização (F2)

**Quem acessa:** Fiscalização.
**Chega aqui por:** tela inicial da Fiscalização.

**O que aparece**
Nome da obra, data de entrega contratual, % físico acumulado da obra (sobre o contratado) e a lista de serviços com código, descrição, unidade, qtd contratada, valor contratado, qtd executada acumulada, % acumulado, valor executado acumulado e, das medições fechadas, o medido no período.

**Regras**
Nada de planejado do mês, responsável, dias sem avanço, data limite de decisão, situação colorida, combinados ou recados. Todos os % são sobre o **contratado**.

**Estado vazio**
"Ainda não há serviços cadastrados nesta obra."

---

## Tela: Fotos da semana — Fiscalização (F2)

**Quem acessa:** Fiscalização.
**Chega aqui por:** item de menu Fotos.

**O que aparece**
Grade com as fotos da semana atual (segunda a domingo), mais novas primeiro, com data e serviço. Setas para a semana anterior e a seguinte. Ao tocar, abre a foto grande com data e serviço, e o botão Baixar.

**Regras**
Cada foto mostra **data e hora em que foi tirada, GPS (com link para o mapa) e endereço**; a foto baixada mantém data, hora e GPS dentro do arquivo. Não mostra quem tirou a foto nem as ocorrências do diário.

**Estado vazio**
"Nenhuma foto nesta semana."

---

## Tela: Ajustes (F1)

**Quem acessa:** Engenheiro.
**Chega aqui por:** item de menu Ajustes.

**O que aparece**
Três blocos:
1. **Obras:** lista com nome, código, cliente, datas de início e de entrega, endereço e situação (`Em andamento`, `Concluída`, `Parada`). Criar e editar. Obra nunca é apagada.
2. **Pessoas e liberações:** primeiro as contas **aguardando liberação**; depois as pessoas liberadas, com perfil e obra. Para liberar: escolher o perfil (`Engenheiro`, `Diretoria`, `Equipe da obra`, `Fiscalização`), o cargo (texto livre: Estagiário, Encarregado…) e as obras. Trocar obra, trocar perfil, desativar.
3. **Meu perfil.**

**Campos de Obra**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Nome | texto | sim | |
| Código / apelido | texto | sim | curto, ex.: `INSS-045`; aparece no seletor |
| Cliente | texto | sim | o órgão contratante |
| Endereço | texto | não | |
| Nº do contrato | texto | não | |
| Data de início | data | sim | |
| Data-meta de entrega | data | sim | não pode ser antes do início |
| Situação | escolha | sim | `Em andamento`, `Concluída`, `Parada` |

**Estado vazio**
Obras: "Nenhuma obra cadastrada. Crie a primeira." · Liberações: "Ninguém aguardando liberação."

---

## Tela: Meu perfil (F1)

**Quem acessa:** todos os perfis liberados.

**O que aparece**
Nome (editável), e-mail, perfil e obra(s), botão Trocar senha e botão Sair.

---

## Textos do sistema

- Botões: Salvar, Cancelar, Enviar, Lançar o dia, Importar, Exportar para Excel, Liberar, Desativar, Encerrar obra, Iniciar medição, Fechar medição.
- Confirmação de desativar: "Desativar [nome]? O histórico continua guardado."
- Confirmação de encerrar obra: "Encerrar a obra [nome]? Ela sai do seletor, mas nada é apagado."
- Confirmação de fechar medição: "Fechar a Medição [n]? Depois de fechada, ela não pode mais ser alterada."
- Aviso de conta pendente: "Conta aguardando liberação do engenheiro responsável."
- Lançamento salvo: "Diário de [data] enviado."
- Fora do prazo de correção: "O prazo para corrigir este lançamento acabou. Peça ao engenheiro."
- Erro genérico: "Não deu para salvar agora. Confira a internet e tente de novo."

## Dados de exemplo

O mock nasce com **duas obras**, para que trocar de obra no seletor mostre o defeito na hora, se houver. Todos os dados são fictícios. Hoje = 23/10/2026.

**Obras**
- **Obra A — INSS** · Prefeitura (exemplo) · código INSS-045 · contrato 045/2026 · Em andamento · sinal **amarelo**.
- **Obra B — ARRECIFES JORDÃO ALTO** · Secretaria de Educação (exemplo) · código AJA-112 · contrato 112/2026 · Em andamento · sinal **verde**.

**Responsáveis (Obra A)**: Construtora Pedra Firme (Empreiteiro), Elétrica Ponto Certo (Empresa especializada), Mão de obra própria (Mão de obra própria).
**Responsáveis (Obra B)**: Empreiteira Silva & Filhos (Empreiteiro), Mão de obra própria (Mão de obra própria).

**Medição atual**: Obra A, Medição 3, 21/10 a 20/11, Em andamento. Obra B, Medição 2, 21/10 a 20/11, Em andamento.

**Serviços planejados no mês — Obra A**

| Código | Descrição | Un | Preço un. | Qtd plan. mês | Qtd exec. período | Responsável | Fim planejado | Crítico | Último avanço | Situação esperada |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.2.1 | Tapume com telha metálica | m | 145,00 | 120 | 30 | Pedra Firme | 05/11/2026 | sim (MS Project) | 15/10 | Parado |
| 3.1.4 | Alvenaria de vedação bloco cerâmico | m² | 68,50 | 600 | 210 | Pedra Firme | 20/11/2026 | sim (MS Project) | 22/10 | Atenção |
| 4.2.1 | Chapisco e reboco interno | m² | 32,00 | 900 | 520 | Mão de obra própria | 30/11/2026 | não | 23/10 | Em dia |
| 6.1.3 | Eletroduto PVC 25 mm embutido | m | 18,90 | 400 | 60 | Ponto Certo | 10/11/2026 | sim (à mão) | 20/10 | Atrasado |
| 2.3.2 | Demolição de piso cerâmico | m² | 22,00 | 350 | 350 | Mão de obra própria | 25/10/2026 | não | 21/10 | Concluído |
| 5.1.1 | Contrapiso e = 5 cm | m² | 41,00 | 300 | 0 | Pedra Firme | 30/11/2026 | não | — | Parado |

**Serviços planejados no mês — Obra B**

| Código | Descrição | Un | Preço un. | Qtd plan. mês | Qtd exec. período | Responsável | Fim planejado | Crítico | Último avanço | Situação esperada |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.1.2 | Escavação manual de sapatas | m³ | 85,00 | 60 | 48 | Silva & Filhos | 31/10/2026 | sim (MS Project) | 23/10 | Em dia |
| 2.1.1 | Concreto fck 25 MPa em fundações | m³ | 620,00 | 40 | 22 | Silva & Filhos | 15/11/2026 | sim (MS Project) | 22/10 | Em dia |
| 2.2.4 | Armação aço CA-50 | kg | 9,80 | 2.500 | 1.900 | Mão de obra própria | 10/11/2026 | não | 23/10 | Em dia |

**Lançamentos**: espalhados entre 01/10 e 23/10, com o tapume (1.2.1) sem lançamento desde 15/10 e o contrapiso (5.1.1) sem nenhum lançamento.

**Diários**: Obra A com diários de 16/10 a 23/10, menos 19/10 (domingo); um com clima `Chuva forte` e a ocorrência "Paralisação parcial por chuva às 14h". Obra B com diários de 20/10 a 23/10.

**Medições fechadas (para o resumo de meta)**: Obra A — Medição 1: planejado R$ 180.000,00, medido R$ 184.500,00, bateu; Medição 2: planejado R$ 210.000,00, medido R$ 193.200,00, não bateu.

**Usuários de exemplo**: um de cada perfil — engenheiro@exemplo.com (Engenheiro, Obras A e B), diretoria@exemplo.com (Diretoria), estagiario@exemplo.com (Equipe da obra, Obra A), encarregado@exemplo.com (Equipe da obra, Obra B), fiscal@exemplo.com (Fiscalização, Obra A), novo@exemplo.com (Aguardando liberação).

## Critérios de aceite

- [ ] O Engenheiro entra e cai no Painel do mês da última obra aberta, com o sinal da entrega no alto.
- [ ] Na Obra A do exemplo, o painel mostra o sinal **amarelo** e o tapume (1.2.1) como `Parado`, no topo.
- [ ] Dentro de cada situação, o serviço com maior "falta executar (R$)" vem primeiro.
- [ ] Trocar da Obra A para a Obra B troca **tudo** o que está na tela: sinal, contadores, lista, filtros e gaveta. Nada da Obra A continua visível.
- [ ] Logado como Equipe da obra, nenhum valor em R$ aparece em nenhuma tela, nem no celular nem no computador.
- [ ] Logado como Equipe da obra, o seletor mostra só a obra dela.
- [ ] Lançar o dia no celular, com quantidade em 2 serviços e 1 foto, faz os números do painel mudarem sem recarregar a página.
- [ ] Depois do prazo de correção, a Equipe da obra não consegue editar o próprio lançamento e vê o aviso.
- [ ] Importar uma planilha de exemplo com 124 linhas cria 124 serviços; importar de novo não duplica.
- [ ] Importar o Excel do MS Project não muda o crítico de um serviço "marcado à mão".
- [ ] Iniciar a medição congela a meta: mudar o preço do serviço depois não muda o R$ planejado da medição.
- [ ] A lista de medições mostra "bateu a meta" / "não bateu" nas fechadas e o resumo "Bateu a meta em X de Y medições".
- [ ] Todas as telas funcionam no celular sem rolagem horizontal da página (a tabela do painel vira cartões).
- [ ] Cada lista tem estado vazio com texto próprio.
- [ ] (F2) Logado como Fiscalização, não aparece em lugar nenhum: planejado do mês, responsável, dias sem avanço, data limite, situação, combinados nem recados.
- [ ] (F2) Um acionamento com conferência em 24/10, sem avanço até 24/10, faz o serviço voltar ao topo com "combinado não cumprido".

## A conta que vai chegar depois

- `[PENDENTE: arquivo do logo HCL]` — sem ele, o app nasce só com o nome "Projeto Obra" escrito no topo e no login.
- `[PENDENTE: modelo da planilha contratual e do Excel do MS Project]` — sem um arquivo real, a tela de importação é construída com nomes de coluna supostos e precisa de ajuste quando o arquivo chegar.

## Decidir depois de usar

- `[DESCOBRIR NO USO: quantos dias sem avanço contam como "parado"]` — por enquanto ficou: 5 dias.
- `[DESCOBRIR NO USO: se precisa estar nas lojas (Play Store / App Store)]` — por enquanto ficou: instalado pelo navegador.
