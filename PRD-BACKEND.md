# PRD Backend — Projeto Obra

> **Mudança de 24/10/2026 (decisão do engenheiro), vale sobre o que estiver escrito abaixo:**
> - O menu **Serviços passou a se chamar Orçamento**. É nele que entra o orçamento da obra em Excel (Fonte, Código, Item, Descrição, Unidade, Quantidade, C. Unitário, BDI por linha, P. Unitário, P. Total), com **aditivo de quantidade** e **item novo** incluídos pelo app. A EAP do Planejamento é montada a partir do Orçamento e enxerga toda mudança feita nele.
> - O cadastro de **Responsáveis (e de funções) saiu de Serviços**. Desde 26/10/2026 ele mora só no módulo **Cadastro** (abas Responsáveis — onde também entram os empreiteiros —, Funções e Equipamentos); o Diário, o Kanban e a medição de empreiteiros só escolhem da lista. Só o engenheiro cadastra; a diretoria vê.
> - **O MS Project fica de fora por enquanto.** Crítico é só marcado à mão; as datas de início e fim são lançadas na EAP, nos itens; as de etapa e subetapa saem sozinhas dos itens (início mais cedo, fim mais tarde).

> Especificação dos dados e das permissões. Lido na etapa de criar o banco no Supabase.
> O SQL não está aqui: ele é escrito na hora de construir, a partir desta descrição.
> Fonte das decisões: `PLANO-DO-PROJETO.md`.
> Marcação: **(F1)** entra na Fase 1, a dos 2 dias; **(F2)** entra na Fase 2, na semana seguinte.

## Convenções

- Tabelas no plural, em minúsculo, sem acento, com underline: `medicao_itens`.
- Colunas em minúsculo com underline: `data_inicio`, `responsavel_id`.
- Toda tabela tem `id` (uuid gerado pelo banco) e `created_at` (timestamptz automático).
- Chave estrangeira termina em `_id`.
- Campo de lista fechada vira CHECK, e o texto tem que ser **idêntico** ao usado na interface (com acento e maiúscula, como está aqui).
- Datas como `date` ou `timestamptz`. Dinheiro como `numeric(14,2)`. Quantidade como `numeric(14,3)`.
- Foto vai para o Storage; o banco guarda só o caminho.
- Nada é apagado de verdade em obras, serviços, responsáveis, medições fechadas, lançamentos e fotos: eles são desativados ou encerrados. São registros de obra pública.

---

## Unidade principal

**Obra.** Vai existir mais de uma: **sim**, várias ao mesmo tempo.

- Tabela `obras`.
- `obra_id` em **toda** tabela que pertence a uma obra, inclusive nas tabelas filhas (`medicao_itens`, `lancamentos`, `fotos`), para que toda regra de acesso filtre direto pela obra.
- Tabela `membros` dizendo quem pode ver qual obra.
- Só o Engenheiro trabalha em mais de uma obra. A Equipe da obra e a Fiscalização ficam em uma obra por vez, mas o acesso fica em `membros` (e não num campo fixo da pessoa) para permitir troca de obra sem perder histórico.
- A Diretoria vê todas as obras pelo `role` e não precisa de linha em `membros`.

---

## Tabela `profiles` (F1)

Liga o login à pessoa e guarda o perfil dela. É ela que manda nas permissões.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave; é o próprio código do login (a mesma pessoa) |
| nome | text | sim | |
| email | text | sim | único |
| cargo | text | não | texto livre para exibir: Estagiário, Encarregado, Auxiliar administrativo, Almoxarife… |
| role | text | sim | CHECK: `Engenheiro`, `Diretoria`, `Equipe da obra`, `Fiscalização`, `Aguardando liberação` |
| ativo | boolean | sim | padrão verdadeiro |
| created_at | timestamptz | sim | automático |

Criado automaticamente por um gatilho quando alguém se cadastra, já com `role = 'Aguardando liberação'`.

---

## Tabela `obras` (F1)

Para que serve: cada obra, a unidade principal.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| nome | text | sim | |
| codigo | text | sim | código ou apelido curto (ex.: `VN-045`); único |
| endereco | text | não | |
| cliente | text | sim | o órgão contratante |
| numero_contrato | text | não | |
| data_inicio | date | sim | |
| data_entrega | date | sim | data-meta de entrega; é a data do sinal "a entrega está de pé?"; não pode ser antes do início |
| situacao | text | sim | CHECK: `Em andamento`, `Concluída`, `Parada`; padrão `Em andamento` |
| medicoes_inicio | date | não | início das medições do contrato (desde 26/10/2026); com `medicoes_fim_primeira`, define o cronograma de medições |
| medicoes_fim_primeira | date | não | fim da 1ª medição (pode juntar meses, ex.: out + nov); depois, uma medição por mês-calendário até o mês da entrega. Os dois juntos ou nenhum; não passa da entrega |
| criada_por | uuid | sim | → profiles |
| created_at | timestamptz | sim | automático |

**Relações:** tem vários membros, responsáveis, serviços, medições e diários.
**Regra de negócio:** obra `Concluída` não aceita diário novo. Obra nunca é apagada.

**Multi-obra (vale para toda tabela, agora e nos próximos módulos):** toda tabela de lançamento tem `obra_id` obrigatório (`not null references obras(id)`), com índice começando por `obra_id`. Nenhuma tela mostra duas obras juntas, a não ser um comparativo explícito entre obras.

---

## Tabela `membros` (F1)

Para que serve: quem pode ver qual obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| profile_id | uuid | sim | → profiles |
| ativo | boolean | sim | padrão verdadeiro; quem sai da obra fica inativo |
| created_at | timestamptz | sim | automático |

**Índices úteis:** (`profile_id`, `ativo`), (`obra_id`).
**Regra de negócio:** um par obra + pessoa aparece uma vez só. Para `Equipe da obra` e `Fiscalização`, no máximo uma linha ativa por pessoa.

---

## Tabela `responsaveis` (F1)

Para que serve: os empreiteiros, as empresas especializadas e a mão de obra própria de cada obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| nome | text | sim | |
| tipo | text | sim | CHECK: `Empreiteiro`, `Empresa especializada`, `Mão de obra própria` |
| contato | text | não | telefone ou e-mail |
| ativo | boolean | sim | padrão verdadeiro |
| created_at | timestamptz | sim | automático |

---

## Tabela `servicos` (F1) — os itens do orçamento

Para que serve: cada linha de item do orçamento da obra (a ARRECIFES tem 418). As linhas de etapa e
subgrupo ficam em `grupos`. O Painel, o Diário, a Medição e a EAP usam estes mesmos itens.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| codigo | text | sim | o **Item** da planilha sem o ponto final ("2.1.1."→"2.1.1"); único por obra |
| fonte | text | sim | CHECK: `SINAPI`, `SICRO`, `COMPOSIÇÃO`, `COTAÇÃO` |
| codigo_ref | text | não | o **Código** da composição (ex.: 98459, C-12) |
| descricao | text | sim | |
| frente | text | não | |
| unidade | text | sim | como na planilha (M2, M3, UN, UNXMES…) |
| qtd_orcada | numeric(14,3) | sim | a quantidade da planilha (ou a incluída, no item novo); não muda depois |
| custo_unitario | numeric(14,2) | não | C. Unit.; **nunca chega à Equipe da obra** |
| bdi | numeric(7,4) | não | por linha (0,2420 = 24,20%); **nunca chega à Equipe da obra** |
| preco_unitario | numeric(14,2) | sim | P. Unit. = TRUNCAR(custo × (1 + BDI), 2); **nunca chega à Equipe da obra** |
| origem | text | sim | CHECK: `Planilha`, `Item novo` |
| aditivo_numero | text | não | no item novo: o aditivo que o incluiu |
| responsavel_id | uuid | não | → responsaveis da mesma obra |
| data_inicio_planejada | date | não | lançada na EAP |
| data_fim_planejada | date | não | lançada na EAP; não pode ser antes do início |
| critico | boolean | sim | padrão falso; marcado à mão |
| critico_origem | text | sim | CHECK: `MS Project`, `À mão`; hoje sempre `À mão` (MS Project fora por enquanto) |
| ativo | boolean | sim | padrão verdadeiro; item novo pode ser arquivado |
| alterado_por | uuid | não | → profiles; quem corrigiu o item novo por último |
| alterado_em | timestamptz | não | quando |
| created_at | timestamptz | sim | automático |

**Quantidade vigente** (a que o app inteiro usa como "contratada"): `qtd_orcada` + soma dos `aditivos` do item.
No banco, uma view `servicos_vigentes` entrega `qtd_contratada` já somada; a camada de dados lê dela.
**P. Total** = TRUNCAR(quantidade × P. Unit., 2). As contas truncam, como a planilha (`src/lib/orcamento.js`).
**Relações:** pertence a uma obra e a um responsável; tem aditivos, lançamentos, fotos e itens de medição.
**Índices úteis:** (`obra_id`, `codigo`) único, (`obra_id`, `responsavel_id`).

---

## Tabela `grupos` (F1, desde 24/10/2026)

Para que serve: as linhas de etapa (1, 2…) e subgrupo (2.1, 2.2…) do orçamento. A EAP usa os mesmos.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| codigo | text | sim | único por obra, e não pode repetir o código de um item |
| nome | text | sim | |

**Grupo não tem data gravada.** Na EAP, o início da etapa ou subetapa é o início mais cedo dos itens de
dentro, e o fim é o fim mais tarde (em todos os níveis), calculado na hora (`montarEap`).
**Datas da EAP:** o engenheiro grava as datas dos itens de uma vez (`salvarDatasEap`), tudo ou nada: uma
linha com fim antes do início (ou só uma das datas) recusa o lote inteiro.

---

## Tabela `aditivos` (F1, desde 24/10/2026)

Para que serve: cada aditivo de quantidade (acréscimo ou supressão) de um item.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| servico_id | uuid | sim | → servicos da mesma obra |
| numero | text | sim | ex.: "1º aditivo" |
| data | date | sim | |
| quantidade | numeric(14,3) | sim | positiva = acréscimo; negativa = supressão; diferente de zero |
| motivo | text | sim | |
| criado_por | uuid | sim | → profiles |
| alterado_por | uuid | não | → profiles; quem corrigiu por último |
| alterado_em | timestamptz | não | quando |
| created_at | timestamptz | sim | automático |

**Correção e exclusão (só o Engenheiro):** o aditivo pode ser corrigido (tipo, quantidade, número, data, motivo)
ou excluído, desde que a quantidade vigente não DIMINUA para baixo do executado. Item novo pode ser corrigido
(todos os campos; o grupo só enquanto não houver lançamento, e a quantidade não desce abaixo do executado) e
excluído só sem lançamento, foto ou medição planejada — senão, arquiva. Item da planilha nunca é corrigido nem
excluído: muda por aditivo.

**Regra de negócio:** a supressão não deixa a quantidade vigente abaixo do já executado (soma dos
lançamentos do item), nem abaixo de zero. Conferido em `validarAditivo` e, no banco, por gatilho.

---

## Tabela `restricoes` (F1, desde 24/10/2026)

Para que serve: as restrições (impedimentos) das atividades no médio prazo (lookahead).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| servico_id | uuid | sim | → servicos da mesma obra (a atividade travada) |
| tipo | text | sim | CHECK: `Material`, `Mão de obra`, `Método`, `Equipamento`, `Projeto`, `Segurança`, `Logística` |
| descricao | text | sim | |
| semana | date | sim | a segunda-feira da semana (CHECK: extract(isodow) = 1) |
| prazo | date | sim | prazo para resolver |
| responsavel | text | sim | quem vai resolver (texto livre) |
| resolvida | boolean | sim | padrão falso |
| resolvida_em | timestamptz | não | |
| resolvida_por | uuid | não | → profiles |
| criado_por | uuid | sim | → profiles |
| created_at | timestamptz | sim | automático |

**Permissões:** quem é da obra lê. Engenheiro e Equipe da obra inserem e resolvem (só as colunas
resolvida, resolvida_em, resolvida_por); editar, mover (semana) e excluir é do Engenheiro.

---

## Tabela `semana_atividades` (F1, desde 24/10/2026)

Para que serve: a situação de cada atividade no kanban de uma semana (curto prazo). Uma linha por
atividade e semana, criada na primeira vez que a atividade é mexida; sem linha = "A fazer".

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| semana | date | sim | a segunda-feira |
| servico_id | uuid | sim | → servicos da mesma obra; único por (obra, semana, servico) |
| status | text | sim | CHECK: `A fazer`, `Em andamento`, `Concluído`, `Não realizado` |
| causa | text | não | obrigatória quando `Não realizado`. CHECK: `Material`, `Mão de obra`, `Projeto`, `Método`, `Equipamento`, `Segurança`, `Logística`, `Clima`, `Outra` |
| causa_texto | text | não | obrigatória quando a causa é `Outra` |
| fora | boolean | sim | tirada da semana pelo engenheiro (não conta no PPC); padrão falso |
| responsavel_id | uuid | não | → responsaveis da mesma obra. Quem resolve e executa na semana: escolhido no cartão do Kanban; o Diário grava aqui quem executou (vale a última ação). Vazio: quem executou no Diário na semana, senão o responsável do item (desde 25/10/2026) |
| atualizado_por | uuid | não | → profiles |
| atualizado_em | timestamptz | não | |

**PPC da semana** = linhas `Concluído` ÷ atividades planejadas na semana (as da regra mais as com linha, menos as `fora`).

---

## Tabela `subtarefas` (F1, desde 24/10/2026)

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| semana | date | sim | a segunda-feira |
| servico_id | uuid | sim | → servicos da mesma obra |
| texto | text | sim | |
| situacao | text | sim | CHECK: `Pendente`, `Feita`, `Não realizada` |
| causa, causa_texto | text | não | como em semana_atividades, obrigatória quando `Não realizada` |
| criado_por | uuid | sim | → profiles |

**Permissões (semana_atividades e subtarefas):** quem é da obra lê; Engenheiro e Equipe da obra
gravam; marcar `fora` é só do Engenheiro.

---

## Tabela `calendarios` (F1, desde 24/10/2026)

Para que serve: o calendário de trabalho de cada obra (uma linha por obra).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras; único |
| dias_semana | smallint[] | sim | 0 = domingo … 6 = sábado; ao menos um; padrão {1,2,3,4,5} |
| feriados | jsonb | sim | [{ data: 'AAAA-MM-DD', nome }], sem data repetida; nasce com os nacionais |

Só o Engenheiro grava. Quem é da obra lê (o cronograma usa).

---

## Tabela `orcamentos` (F1, desde 24/10/2026)

Para que serve: o cabeçalho do orçamento de cada obra (uma linha por obra).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras; único |
| base_referencia | text | não | ex.: SINAPI-PE março/2026, SICRO… |
| mes_referencia | text | não | |
| encargos | text | não | regime de encargos sociais |
| periodo | text | não | ex.: 10 meses |
| bdi_servico | numeric(7,4) | não | sugerido no item novo |
| bdi_material | numeric(7,4) | não | sugerido no item novo |

Equipe da obra e Fiscalização não leem esta tabela.

---

## Tabela `medicoes` (F1)

Para que serve: cada período de medição mensal da obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| numero | integer | sim | único por obra |
| data_inicio | date | sim | |
| data_fim | date | sim | depois do início |
| status | text | sim | CHECK: `Planejando`, `Em andamento`, `Fechada`; padrão `Planejando` |
| valor_planejado | numeric(14,2) | não | meta do mês em R$, gravada quando passa para `Em andamento`; **nunca chega à Fiscalização** |
| valor_medido | numeric(14,2) | não | gravado ao fechar (F2) |
| meta_batida | boolean | não | gravado ao fechar: `valor_medido >= valor_planejado` (F2) |
| fechada_em | timestamptz | não | (F2) |
| created_at | timestamptz | sim | automático |

**Regras de negócio:**
- Só uma medição `Em andamento` por obra de cada vez.
- Medição `Fechada` não aceita mais nenhuma mudança, nem nela nem nos itens.
- A pergunta de um ano, "em quais meses e em quantos a gente bateu a meta?", é respondida só com esta tabela: medições fechadas da obra com `meta_batida`.

---

## Tabela `medicao_itens` (F1)

Para que serve: o planejado do mês por serviço (a meta interna) e o medido no fechamento.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras; o mesmo da medição |
| medicao_id | uuid | sim | → medicoes |
| servico_id | uuid | sim | → servicos da mesma obra |
| qtd_planejada | numeric(14,3) | sim | **nunca chega à Fiscalização** |
| qtd_planejada_inicial | numeric(14,3) | não | cópia congelada quando a medição passa para `Em andamento` |
| ajustada | boolean | sim | padrão falso; verdadeiro quando o engenheiro mudou a qtd do mês à mão (aí a EAP não reescreve mais a quantidade; desde 25/10/2026) |
| preco_unitario | numeric(14,2) | sim | cópia do preço do serviço quando a medição passa para `Em andamento` |
| qtd_medida | numeric(14,3) | não | preenchida ao fechar (F2) |
| created_at | timestamptz | sim | automático |

**Índices úteis:** (`medicao_id`, `servico_id`) único.
**Regra de negócio:** mudar `qtd_planejada` com a medição `Em andamento` é permitido só ao Engenheiro, mas `qtd_planejada_inicial` não muda mais.

---

## Tabelas da medição de empreiteiros (desde 26/10/2026)

Para que servem: o contrato de cada empreiteiro (Kanban), o escopo dele (itens do Orçamento, com quantidade e preço do
empreiteiro) e os boletins de medição. Só Engenheiro e Diretoria leem (têm R$); só o Engenheiro grava. Todas com `obra_id`.

**`contratos_empreiteiro`**

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| responsavel_id | uuid | sim | → responsaveis da mesma obra (empreiteiro ou empresa especializada) |
| descricao | text | sim | o serviço contratado |
| status | text | sim | CHECK: `Em elaboração`, `Enviado p/ aprovação`, `Aprovado / Ativo`, `Concluído` |
| tipo | text | não | CHECK: `Global`, `Por escopo`; vazio até ativar |
| valor_global | numeric(14,2) | não | só no `Global` |
| criado_em | timestamptz | sim | |

**`contrato_itens`** (só no `Por escopo`): `id`, `obra_id`, `contrato_id` (→ contratos_empreiteiro), `servico_id` (→ servicos da mesma obra; único por contrato), `quantidade` numeric(14,3) > 0, `preco_unitario` numeric(14,2) > 0 (o preço do empreiteiro, não o do Orçamento). Valor do contrato = soma de TRUNCAR(quantidade × preço, 2).

**`boletins_empreiteiro`**: `id`, `obra_id`, `contrato_id`, `numero` (1, 2, 3… por contrato; único por contrato), `data` (date), `valor` numeric(14,2) (total do boletim), `criado_por` (→ profiles).

**`boletim_linhas`** (só no `Por escopo`): `id`, `obra_id`, `boletim_id`, `contrato_item_id` (→ contrato_itens), `quantidade` numeric(14,3) (a fonte da verdade), `valor` numeric(14,2) = TRUNCAR(quantidade × preço, 2).

**Regras:** ativar exige o valor; concluir exige 100% medido; contrato com boletim não volta para antes de `Aprovado / Ativo` nem muda de tipo; concluído pode ser reaberto (aditivo); no aditivo, nem o valor global nem a quantidade de um item ficam abaixo do já medido, e item medido não sai; nenhum item passa de 100% acumulado.

---

## Tabela `diarios` (F1)

Para que serve: o diário de cada dia de cada obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| data | date | sim | único por obra |
| clima_manha | text | não | CHECK: `Bom`, `Nublado`, `Chuva`, `Chuva forte` |
| clima_tarde | text | não | mesma lista |
| ocorrencias | text | não | |
| criado_por | uuid | sim | → profiles |
| enviado_em | timestamptz | não | |
| created_at | timestamptz | sim | automático |

---

## Tabela `funcoes` (F1, desde 24/10/2026)

Para que serve: as funções de quem trabalha na obra (pedreiro, servente, eletricista…), para o efetivo do diário.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| nome | text | sim | único por obra (sem diferenciar maiúscula) |
| ativo | boolean | sim | padrão verdadeiro |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** toda obra nova nasce com as funções padrão (Pedreiro, Servente, Carpinteiro, Armador, Eletricista, Encanador, Pintor, Encarregado, Mestre de obras — `FUNCOES_PADRAO` em `src/lib/diario.js`). O engenheiro cadastra outras no módulo Cadastro.

---

## Tabela `equipamentos` (desde 26/10/2026)

Para que serve: os equipamentos da obra, próprios ou locados (cadastrados no módulo Cadastro).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| nome | text | sim | único por obra (sem diferenciar maiúscula) |
| propriedade | text | sim | CHECK: `Próprio`, `Locado` (`PROPRIEDADES_EQUIPAMENTO` em `src/lib/obras.js`) |
| fornecedor | text | não | obrigatório quando `propriedade = 'Locado'` (CHECK) |
| identificacao | text | não | placa, série ou patrimônio |
| ativo | boolean | sim | padrão verdadeiro |
| created_at | timestamptz | sim | automático |

**Permissões:** ver, Engenheiro e Diretoria, nas obras delas (`minhas_obras()`); criar e desativar, só o Engenheiro; apagar, ninguém. `grant select, insert, update` só para `authenticated`.

---

## Tabela `materiais` (desde 26/10/2026)

Para que serve: o catálogo de materiais de cada obra, para os pedidos (cadastrado no módulo Cadastro).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| nome | text | sim | único por obra (sem diferenciar maiúscula) |
| unidade | text | sim | saco, m³, barra… |
| categoria_id | uuid | sim | → categorias_material (da mesma obra) |
| ativo | boolean | sim | padrão verdadeiro |
| created_at | timestamptz | sim | automático |

**Permissões:** ver, Engenheiro, Diretoria e Equipe da obra, nas obras delas; criar e desativar, só o Engenheiro; apagar, ninguém. Toda obra nova nasce com os 12 materiais comuns.

---

## Tabela `categorias_material` (desde 26/10/2026)

Para que serve: as categorias de material de cada obra, cadastradas pelo engenheiro (Cadastro › Materiais).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| nome | text | sim | único por obra (sem diferenciar maiúscula) |
| cor | text | sim | CHECK: `Azul`, `Verde`, `Roxo`, `Cinza` (`CORES_CATEGORIA` em `src/lib/materiais.js`) |
| ativo | boolean | sim | padrão verdadeiro |
| created_at | timestamptz | sim | automático |

**Permissões:** iguais às de `materiais`. Toda obra nova nasce com Material grosso (Azul), Acabamento (Verde) e Instalações (Verde).

---

## Tabela `pedidos_material` (desde 26/10/2026)

Para que serve: cada pedido/lote de material e por onde ele anda no Kanban (não é estoque).

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| material_id | uuid | sim | → materiais (da mesma obra) |
| quantidade | numeric(14,3) | sim | > 0 |
| frente | text | sim | frente de serviço que pediu |
| prioridade | text | sim | CHECK: `Normal`, `Crítico` |
| status | text | sim | CHECK: `Solicitar`, `Em cotação`, `Comprado / a caminho`, `No almoxarifado`, `Entregue na frente` (`STATUS_PEDIDO`) |
| fornecedor | text | não | obrigatório ao comprar |
| previsao_entrega | date | não | obrigatória ao comprar |
| historico | jsonb | sim | [{ status, data }] — cada mudança de coluna; dele saem os dias na coluna e o lead time |
| recebimento | jsonb | não | { qtd_bate_nf, estado_ok, avarias, foto_nf } ao receber; a foto vai para o Storage (até 5 MB) |
| frente_aplicada | text | não | confirmada ao entregar |
| criado_por | uuid | sim | → profiles |
| created_at | timestamptz | sim | automático |

**Permissões:** ver, Engenheiro, Diretoria e Equipe da obra, nas obras delas (`minhas_obras()`); criar e mover, Engenheiro e Equipe da obra; apagar, ninguém. `grant select, insert, update` só para `authenticated`.

---

## Tabela `efetivo` (F1, desde 24/10/2026)

Para que serve: quantas pessoas de cada função, de cada responsável, trabalharam no dia.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras; o mesmo do diário |
| diario_id | uuid | sim | → diarios |
| responsavel_id | uuid | sim | → responsaveis da mesma obra |
| funcao_id | uuid | sim | → funcoes da mesma obra |
| quantidade | integer | sim | CHECK: entre 1 e 999 |
| created_at | timestamptz | sim | automático |

**Índices úteis:** (`diario_id`, `responsavel_id`, `funcao_id`) único — a mesma função do mesmo responsável aparece uma vez por dia.
**Regra de negócio:** ao salvar o diário, o efetivo do dia é substituído pelo que veio.

---

## Tabela `lancamentos` (F1)

Para que serve: a quantidade executada de cada serviço em cada dia. Daqui saem todos os números do painel.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras; o mesmo do diário |
| diario_id | uuid | sim | → diarios |
| servico_id | uuid | sim | → servicos da mesma obra |
| responsavel_id | uuid | não | → responsaveis; **quem executou naquele dia**, guardado aqui porque o responsável do serviço pode mudar depois |
| quantidade | numeric(14,3) | sim | maior ou igual a zero |
| concluido | boolean | sim | padrão falso |
| memoria_calculo | text | não | memória de cálculo da quantidade deste serviço no dia (texto livre, no cartão do serviço). Não aparece no resumo do dia nem no histórico, só no formulário do diário (24/10/2026) |
| lancado_por | uuid | sim | → profiles |
| corrigido_por | uuid | não | → profiles |
| corrigido_em | timestamptz | não | |
| created_at | timestamptz | sim | automático |

**Índices úteis:** (`obra_id`, `servico_id`, `diario_id`), (`diario_id`).
**Regra de negócio:** um lançamento por serviço por diário. Quem lançou corrige até as 23h59 do dia seguinte à data do diário; depois disso, só o Engenheiro, e toda correção grava `corrigido_por` e `corrigido_em`.

**Cálculos que saem daqui** (feitos na leitura, sem processo automático):
- **Executado no período:** soma de `quantidade` dos lançamentos cujo diário está entre `data_inicio` e `data_fim` da medição.
- **Dias sem avanço:** hoje − data do último diário com `quantidade > 0` para o serviço.
- **Ritmo dos últimos 7 dias:** soma das quantidades dos últimos 7 dias ÷ número de dias com lançamento > 0 nesses 7 dias.
- **Melhor ritmo semanal:** a maior soma de quantidade em qualquer janela de 7 dias seguidos do serviço.
- **Data limite de decisão:** `data_fim_planejada` − (quantidade que falta ÷ (melhor ritmo semanal ÷ 7)).
- **Término previsto:** hoje + (quantidade que falta ÷ ritmo dos últimos 7 dias).

Esses cálculos podem virar uma *view* do banco ou funções em `lib/dados.js`, mas a view **não pode** expor `preco_unitario` nem valores em R$ para quem não pode vê-los.

---

## Tabela `fotos` (F1)

Para que serve: as fotos do diário, ligadas ao dia e, quando der, ao serviço.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| diario_id | uuid | sim | → diarios |
| servico_id | uuid | não | → servicos |
| caminho | text | sim | caminho do arquivo no Storage |
| tamanho_bytes | integer | sim | CHECK: maior que 0 e no máximo 5000000 (5 MB) |
| largura | integer | não | em pixels, depois da compressão |
| altura | integer | não | em pixels, depois da compressão |
| tirada_em | timestamp (sem fuso) | não | data e hora em que a foto foi tirada, no relógio da câmera |
| tirada_em_origem | text | não | CHECK: `Data da foto`, `Data do arquivo` |
| gps_lat | numeric(9,6) | não | entre -90 e 90; nunca 0,0 |
| gps_lon | numeric(9,6) | não | entre -180 e 180; nunca 0,0 |
| gps_origem | text | não | CHECK: `GPS da foto`, `GPS do aparelho`; obrigatório quando há GPS |
| endereco | text | não | endereço pelas coordenadas (OpenStreetMap); vazio se não foi encontrado na hora |
| tirada_por | uuid | sim | → profiles |
| created_at | timestamptz | sim | automático |

**Índices úteis:** (`obra_id`, `created_at`).

---

## Tabela `acionamentos` (F2)

Para que serve: os combinados com o encarregado quando um serviço não anda.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| servico_id | uuid | sim | → servicos |
| combinado | text | sim | |
| data_retorno | date | sim | padrão: o dia seguinte |
| status | text | sim | CHECK: `Aberto`, `Cumprido`, `Não cumprido`; padrão `Aberto` |
| criado_por | uuid | sim | → profiles |
| created_at | timestamptz | sim | automático |

**Regra de negócio:** o status é calculado na leitura. Se existir lançamento com `quantidade > 0` para o serviço entre a criação e a `data_retorno`, vira `Cumprido`; se a `data_retorno` passou sem isso, `Não cumprido`.

---

## Tabela `recados` (F2)

Para que serve: o que chega da diretoria, dos fiscais e do canteiro por WhatsApp, e-mail ou pessoalmente.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| origem | text | sim | CHECK: `Diretoria`, `Fiscalização`, `Empreiteiro`, `Encarregado` |
| canal | text | sim | CHECK: `WhatsApp`, `E-mail`, `Pessoalmente` |
| pedido | text | sim | |
| servico_id | uuid | não | → servicos |
| prazo | date | não | |
| status | text | sim | CHECK: `Aberta`, `Respondida`; padrão `Aberta` |
| criado_por | uuid | sim | → profiles |
| created_at | timestamptz | sim | automático |

---

## Permissões

Escrito em português. Vira RLS na hora de construir. "Obras dela" quer dizer as obras em que a pessoa tem linha **ativa** em `membros`. Toda tabela tem RLS ligada e liberação escrita só para quem fez login.

Uma função só decide "obras dela", e toda política usa a mesma frase: `obra_id in (select public.minhas_obras())`. A função devolve as obras da pessoa em `membros` e, para a Diretoria, todas.

**Ninguém sem login vê nada, em nenhuma tabela.** Quem está `Aguardando liberação` também não vê nada além do próprio `profiles`.

### `profiles`
- **Ver:** cada pessoa vê a própria linha. O Engenheiro vê todas. A Diretoria vê as pessoas das obras.
- **Criar:** só o gatilho do cadastro.
- **Editar:** cada pessoa edita o próprio `nome`. Só o Engenheiro muda `role`, `cargo` e `ativo` de qualquer pessoa.
- **Apagar:** ninguém (desativar em vez de apagar).

### `obras`, `membros`
- **Ver:** o Engenheiro vê as obras dele; a Diretoria vê todas; a Equipe da obra e a Fiscalização veem só a obra delas.
- **Criar / editar / encerrar:** só o Engenheiro.
- **Apagar:** ninguém.

### `responsaveis`
- **Ver:** Engenheiro e Diretoria. A Equipe da obra vê o nome e o tipo (para escolher quem executou). A Fiscalização não vê.
- **Criar / editar / desativar:** só o Engenheiro.
- **Apagar:** ninguém.

### `servicos`, `grupos`, `aditivos`, `orcamentos`

Leem quem é da obra (Equipe sem as colunas de valor e sem `orcamentos`). Só o Engenheiro inclui item novo, grupo e aditivo.

### `servicos` (o que já valia)
- **Ver:** Engenheiro e Diretoria veem tudo. A Equipe da obra vê **sem** `preco_unitario`. A Fiscalização vê com `preco_unitario`, mas **sem** `responsavel_id`, datas planejadas e crítico.
- **Criar / editar / desativar:** só o Engenheiro.
- **Apagar:** ninguém.
- Como a RLS do Supabase filtra linhas e não colunas, a separação de colunas é feita com *views* por perfil (ou funções que devolvem só as colunas permitidas). A tabela em si fica fechada para a Equipe da obra e a Fiscalização.

### `medicoes`, `medicao_itens`
- **Ver:** Engenheiro e Diretoria. A Equipe da obra **não vê**. A Fiscalização (F2) vê só medições `Fechada` e só `qtd_medida`, `preco_unitario`, `valor_medido`; **nunca** `qtd_planejada`, `qtd_planejada_inicial`, `valor_planejado` ou `meta_batida`.
- **Criar / editar / iniciar / fechar:** só o Engenheiro.
- **Apagar:** só o Engenheiro, e só medição em `Planejando`.

### `diarios`, `lancamentos`, `fotos`, `efetivo`
- **Ver:** Engenheiro, Diretoria e Equipe da obra, nas obras delas. A Fiscalização (F2) vê só as fotos da semana (sem `tirada_por`) e o avanço somado por serviço; não vê diários nem lançamentos.
- **Criar:** Engenheiro e Equipe da obra, só nas obras delas, e só em obra que não esteja `Concluída`.
- **Editar:** quem lançou, até as 23h59 do dia seguinte à data do diário; o Engenheiro, sempre.
- **Dia do diário:** nunca no futuro. A Equipe da obra cria o diário de hoje ou de ontem; o Engenheiro, de qualquer dia desde o início da obra (decisão de 24/10/2026). Regra em `podeLancarData`, `src/lib/diario.js`.
- **Concluído automático:** o lançamento fica `concluido` sozinho quando a quantidade do dia cobre o **saldo do item** (contratado − acumulado; na correção, o lançado no próprio dia volta para o saldo). Quem lança pode desmarcar. Regras `saldoDoItem` e `concluiPeloSaldo` em `src/lib/diario.js`.
- **Dia parado também é diário:** o diário é aceito com produção, efetivo, memória de cálculo **ou** ocorrências — um dia de chuva sem produção se registra.

### `funcoes`
- **Ver:** Engenheiro, Diretoria e Equipe da obra, nas obras delas.
- **Criar / desativar:** só o Engenheiro, no módulo Cadastro.
- **Apagar:** ninguém.
- **Apagar:** ninguém. Um lançamento errado é corrigido para zero.

### `acionamentos` (F2)
- **Ver:** Engenheiro, Diretoria e Equipe da obra. A Fiscalização não vê.
- **Criar / editar:** só o Engenheiro.
- **Apagar:** só o Engenheiro.

### `recados` (F2)
- **Ver / criar / editar:** Engenheiro e Diretoria.
- **Apagar:** só o Engenheiro.
- Equipe da obra e Fiscalização: nada.

### Storage (fotos)
- Pasta `fotos/<obra_id>/<diario_id>/`.
- **Subir:** Engenheiro e Equipe da obra, só nas obras delas.
- **Ver:** Engenheiro, Diretoria e Equipe da obra, nas obras delas; a Fiscalização (F2), só da obra dela.
- **Apagar:** ninguém.

---

## Fluxo de cadastro e liberação

1. A pessoa se cadastra com nome, e-mail e senha.
2. O gatilho cria o `profiles` com `role = 'Aguardando liberação'`, sem nenhuma linha em `membros`.
3. Ela entra e vê só o aviso "Conta aguardando liberação do engenheiro responsável".
4. O Engenheiro libera em Ajustes: escolhe o `role`, o `cargo` e as obras (cria as linhas em `membros`).
5. Para a Fiscalização (F2), o Engenheiro manda o link do sistema e libera só a obra daquele órgão.
6. O cadastro público fica **ligado** (é assim que a equipe e os fiscais entram), mas quem se cadastra não vê nada até ser liberado. Nenhuma tabela tem regra "todo logado vê tudo".

## Processos automáticos

**Nenhum na v1** (decisão do engenheiro). Tudo o que parece automático (dias sem avanço, data limite de decisão, situação, sinal da entrega, combinado não cumprido) é calculado na hora da leitura.

Ideias para depois, se fizerem falta: e-mail às 7h com os serviços que viraram vermelho; aviso quando o diário não foi lançado até as 18h; resumo semanal para a Diretoria.

## Arquivos

- Guardados no Storage, no bucket `fotos`, na pasta `<obra_id>/<diario_id>/`.
- **Toda foto do diário é comprimida no navegador para no máximo 5 MB** antes de subir (decisão do engenheiro, 24/10/2026). Ela é regravada em JPEG, tentando da melhor qualidade para a menor (maior lado de 4096 px com qualidade 0,85, descendo até 1280 px com 0,55) e usando a primeira que couber. Regras em `src/lib/fotos.js`, testadas em `tests/fotos.mjs`.
- O limite é conferido três vezes: na tela (compressão), na camada de dados (recusa foto acima de 5 MB) e no banco (CHECK de `tamanho_bytes`, e limite de tamanho do bucket `fotos` em 5 MB).
- **A fiscalização precisa de data, hora, GPS e endereço de cada foto** (decisão do engenheiro, 24/10/2026):
  - **Dentro do arquivo:** a compressão apagaria os dados da câmera (EXIF); por isso o bloco EXIF original é lido e devolvido para dentro da foto comprimida, com a orientação acertada. Quem baixar a foto vê data, hora e GPS em qualquer visualizador. `src/lib/exif.js`, testado em `tests/exif.mjs`.
  - **No banco:** os mesmos dados ficam nas colunas `tirada_em`, `gps_lat`, `gps_lon`, `gps_origem` e `endereco`, para a tela da fiscalização mostrar sem abrir o arquivo.
  - **De onde vem o GPS:** primeiro o da própria foto. O GPS do aparelho só entra em foto **tirada agora pelo botão "Tirar foto"** (câmera do app), quando ela não trouxer o dela e o arquivo for dos últimos 15 minutos; o navegador pede permissão. Foto escolhida **"Da galeria"** fica só com o GPS que ela mesma trouxer — uma foto baixada do WhatsApp agora nunca ganha o local de onde a pessoa está. Sem GPS, a tela avisa em vermelho.
  - **Endereço:** buscado no OpenStreetMap (Nominatim) a partir das coordenadas, pela camada de dados (`buscarEndereco`), em fila de 1 pedido por segundo (regra do serviço). Só as coordenadas saem do aparelho. O envio do diário espera o endereço que ainda estiver chegando. Sem internet, a foto fica com o GPS e sem endereço.
  - Quando o GPS vem do aparelho, o app monta um bloco EXIF novo (data, hora e GPS) e grava dentro da foto, para a foto baixada também ter o local.
- O banco guarda o `caminho`. O endereço para exibir é gerado na hora, com validade curta, porque o bucket não é público.

## Critérios de aceite

- [ ] Usuário recém-cadastrado não enxerga nenhum dado até ser liberado.
- [ ] Ninguém sem login consegue ler nenhuma tabela nem nenhuma foto.
- [ ] Logado como Equipe da obra da Obra A, uma consulta direta ao banco **não devolve nenhuma linha** da Obra B, em nenhuma tabela.
- [ ] Logado como Equipe da obra, nenhuma consulta devolve `preco_unitario`, `valor_planejado`, `valor_medido` ou qualquer valor em R$.
- [ ] Logado como Equipe da obra, não consegue apagar nada, nem o próprio lançamento.
- [ ] Logado como Equipe da obra, não consegue editar o próprio lançamento depois das 23h59 do dia seguinte.
- [ ] Logado como Diretoria, vê todas as obras e não consegue criar nem editar nada.
- [ ] O Engenheiro consegue trocar o perfil e a obra de qualquer usuário.
- [ ] Dois serviços com o mesmo código na mesma obra são recusados; na outra obra, aceitos.
- [ ] Um diário com clima `Sol` (fora da lista) é recusado pelo CHECK.
- [ ] Iniciar uma medição grava `valor_planejado`, `qtd_planejada_inicial` e `preco_unitario` de cada item; mudar o preço do serviço depois não altera esses valores.
- [ ] Uma medição `Fechada` recusa qualquer alteração.
- [ ] (F2) Logado como Fiscalização, nenhuma consulta devolve `qtd_planejada`, `valor_planejado`, `responsavel_id`, `acionamentos` ou `recados`.
- [ ] Os valores de status do banco são idênticos aos da interface.
- [ ] Todo campo obrigatório recusa cadastro vazio.

## A conta que vai chegar depois

- `[PENDENTE: espaço para fotos]` — com fotos de até 5 MB (na prática 1 a 3 MB cada), o 1 GB grátis do Supabase guarda umas 350 a 1.000 fotos. Passando disso, plano pago, cerca de US$ 25/mês.
- `[PENDENTE: modelo da planilha contratual e do Excel do MS Project]` — sem um arquivo real, os nomes de coluna da importação são supostos e precisam de ajuste quando o arquivo chegar.

## Decidir depois de usar

- `[DESCOBRIR NO USO: quantos dias sem avanço contam como "parado"]` — por enquanto ficou: 5 dias.
- Efetivo diário: entrou na v1 em 24/10/2026, por função e por responsável (tabelas `funcoes` e `efetivo`).
