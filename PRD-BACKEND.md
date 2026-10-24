# PRD Backend — Projeto Obra

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

## Tabela `servicos` (F1)

Para que serve: os 100+ itens do escopo contratado de cada obra.

| Campo | Tipo | Obrigatório | Observação |
|---|---|---|---|
| id | uuid | sim | chave |
| obra_id | uuid | sim | → obras |
| codigo | text | sim | o código da planilha contratual; único por obra |
| descricao | text | sim | |
| frente | text | não | |
| unidade | text | sim | m², m³, m, un, kg… |
| qtd_contratada | numeric(14,3) | sim | maior que zero |
| preco_unitario | numeric(14,2) | sim | maior ou igual a zero; **nunca chega à Equipe da obra** |
| responsavel_id | uuid | não | → responsaveis da mesma obra |
| data_inicio_planejada | date | não | do MS Project |
| data_fim_planejada | date | não | do MS Project; não pode ser antes do início |
| critico | boolean | sim | padrão falso |
| critico_origem | text | sim | CHECK: `MS Project`, `À mão`; padrão `MS Project` |
| ativo | boolean | sim | padrão verdadeiro; serviço suprimido por aditivo fica inativo |
| created_at | timestamptz | sim | automático |

**Relações:** pertence a uma obra e a um responsável; tem vários lançamentos, fotos e itens de medição.
**Índices úteis:** (`obra_id`, `codigo`) único, (`obra_id`, `responsavel_id`).
**Regra de negócio:** a importação do MS Project só muda `critico` quando `critico_origem = 'MS Project'`.

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
| preco_unitario | numeric(14,2) | sim | cópia do preço do serviço quando a medição passa para `Em andamento` |
| qtd_medida | numeric(14,3) | não | preenchida ao fechar (F2) |
| created_at | timestamptz | sim | automático |

**Índices úteis:** (`medicao_id`, `servico_id`) único.
**Regra de negócio:** mudar `qtd_planejada` com a medição `Em andamento` é permitido só ao Engenheiro, mas `qtd_planejada_inicial` não muda mais.

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

**Regra de negócio:** toda obra nova nasce com as funções padrão (Pedreiro, Servente, Carpinteiro, Armador, Eletricista, Encanador, Pintor, Encarregado, Mestre de obras — `FUNCOES_PADRAO` em `src/lib/diario.js`). O engenheiro cadastra outras pelo próprio diário.

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

### `servicos`
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
- **Criar / desativar:** só o Engenheiro (também pelo diário, no botão "+ Nova função").
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
