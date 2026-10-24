# PRD Frontend — Projeto Obra

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
├── Engenheiro:      Painel do mês · Diário (aba Fotos) · Serviços (aba Responsáveis) · Medição · Recados (F2) · Ajustes
├── Diretoria:       Painel do mês · Diário (aba Fotos) · Serviços · Medição · Recados (F2) · Meu perfil
├── Equipe da obra:  Lançar o dia · Painel do mês · Serviços · Meu perfil
└── Fiscalização:    Avanço por serviço (F2) · Fotos da semana (F2) · Meu perfil
```

Barra inferior no celular:
- Engenheiro: Painel · Diário · Serviços · Medição · Mais (Recados, Ajustes).
- Diretoria: Painel · Diário · Serviços · Medição · Mais (Recados, Meu perfil).
- Equipe da obra: Lançar o dia · Painel · Serviços · Meu perfil.
- Fiscalização: Avanço · Fotos · Meu perfil.

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
   - **Produção do dia:** primeiro os serviços do planejamento do mês; os outros por uma busca pelo código ou pela descrição. Em cada serviço: o campo de quantidade executada hoje (com a unidade ao lado), quem executou (vem preenchido com o responsável do serviço e pode ser trocado), a caixinha **Concluído** e o botão de foto.
   - **Fotos do dia:** tirar ou escolher fotos, cada uma ligada a um serviço ou ao dia em geral.
4. Botão **Enviar**.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Data | data | sim | um diário por obra por dia |
| Clima manhã | escolha | não | `Bom`, `Nublado`, `Chuva`, `Chuva forte` |
| Clima tarde | escolha | não | mesma lista |
| Ocorrências | texto longo | não | |
| Quantidade executada (por serviço) | número | não | maior ou igual a zero; com a unidade do serviço |
| Quem executou (por serviço) | escolha | sim, se houver quantidade | lista de responsáveis da obra |
| Concluído (por serviço) | caixinha | não | |
| Fotos | imagem | não | comprimidas no celular antes de subir |

**Ações**
- **Lançar o dia:** abre o diário de hoje vazio.
- **Tirar foto:** abre a câmera; a foto aparece em miniatura no serviço.
- **Enviar:** salva o diário, os lançamentos e as fotos. Mostra "Diário de 23/10 enviado" e volta para a lista.
- **Corrigir:** quem lançou corrige até as 23h59 do dia seguinte; depois disso, só o Engenheiro corrige, e a correção fica marcada "corrigido por [nome] em [data]".
- **Diário sem sinal (F2):** sem internet, o diário fica guardado no celular e aparece o aviso "3 lançamentos aguardando envio". O envio acontece sozinho quando a internet volta.

**Regras por perfil**
- **Engenheiro:** lança e corrige qualquer diário.
- **Equipe da obra:** lança e corrige só o que lançou, dentro do prazo. Não vê R$ em lugar nenhum desta tela.
- **Diretoria:** só vê a lista, o diário e as fotos.

**Estado vazio**
"Nenhum diário hoje. Toque em Lançar o dia." · Aba Fotos: "Nenhuma foto nesta obra ainda."

---

## Tela: Serviços (F1)

**Quem acessa:** Engenheiro (edita), Diretoria (vê), Equipe da obra (vê sem R$).
**Chega aqui por:** item de menu Serviços.

**O que aparece**
Abas **Serviços** e **Responsáveis** (a aba Responsáveis só aparece para o Engenheiro e a Diretoria). Na aba Serviços: busca, filtros (responsável, frente, crítico, ativos/inativos) e a lista dos 100+ serviços da obra, pelo código. No celular, cartões; no computador, tabela.

**Campos e informações**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| Código | texto | sim | da planilha contratual |
| Descrição | texto | sim | |
| Frente | texto | não | |
| Unidade | texto | sim | |
| Qtd contratada | número | sim | |
| Preço unitário | R$ | sim | escondido da Equipe da obra |
| Valor total | R$ | — | qtd × preço; escondido da Equipe da obra |
| Responsável | escolha | não | |
| Início planejado | data | não | do MS Project |
| Fim planejado | data | não | do MS Project |
| Crítico | caixinha | sim | com a etiqueta "do MS Project" ou "marcado à mão" |
| Qtd executada acumulada | número | — | soma de todos os lançamentos |
| % acumulado | % | — | sobre o contratado |
| Ativo | sim/não | sim | serviço suprimido por aditivo fica inativo |

**Ações**
- **Importar planilha contratual (Excel):** o Engenheiro escolhe o arquivo, indica qual coluna é código, descrição, unidade, quantidade e preço unitário, vê uma prévia ("124 serviços encontrados, 3 com problema") e confirma. Se a importação for repetida, serviços com o mesmo código são atualizados e os novos são criados; nenhum é apagado.
- **Importar Excel do MS Project:** liga cada linha ao serviço pelo código e preenche início, fim e crítico (coluna "Crítica", Sim/Não). Serviços com crítico "marcado à mão" não mudam. Mostra quantos foram atualizados e quais códigos não foram encontrados.
- **Marcar crítico à mão:** a caixinha muda e ganha a etiqueta "marcado à mão".
- **Seguir o MS Project:** no detalhe do serviço, devolve o controle do crítico para a próxima importação.
- **Editar e trocar responsável:** no detalhe do serviço.
- **Desativar:** o serviço some do painel e dos lançamentos, mas o histórico fica.
- **Tocar num serviço:** abre o detalhe com os dados e o histórico de lançamentos.

**Aba Responsáveis**
Lista com nome, tipo (`Empreiteiro`, `Empresa especializada`, `Mão de obra própria`) e contato. O Engenheiro cria, edita e desativa. **(F2)** Tocar num responsável abre os serviços dele com o avanço do mês: é o que substitui a "aba por empreiteiro".

**Regras por perfil**
- **Engenheiro:** tudo.
- **Diretoria:** só vê, com valores.
- **Equipe da obra:** só a aba Serviços, sem preço unitário nem valor total.

**Estado vazio**
"Nenhum serviço nesta obra. Importe a planilha contratual." · Responsáveis: "Nenhum responsável cadastrado."

---

## Tela: Medição (F1, com partes F2)

**Quem acessa:** Engenheiro (edita), Diretoria (vê).
**Chega aqui por:** item de menu Medição.

**O que aparece**
Lista dos períodos de medição da obra, do mais novo para o mais antigo: número, período, situação, R$ planejado, R$ medido, % e, nas fechadas, a etiqueta **"bateu a meta"** ou **"não bateu"**. No fim da lista, o resumo: "Bateu a meta em 7 de 12 medições".

Ao abrir um período: a lista dos serviços planejados com qtd planejada, preço unitário da medição, R$ planejado e, depois de fechada, qtd medida e R$ medido.

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
- **Nova medição:** pede número e período e cria em `Planejando`.
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
Não mostra quem tirou a foto nem as ocorrências do diário.

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
