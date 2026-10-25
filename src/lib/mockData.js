// ============================================================
// DADOS DE EXEMPLO (de mentira) para usar o app sem banco.
// Mesmos nomes de campo das tabelas do PRD-BACKEND.md: a troca
// para o Supabase depois é só trocar a fonte em dados.js.
// Na etapa do banco, estes dados viram a carga inicial (seed).
//
// DUAS OBRAS, de propósito, e diferentes entre si: é o que faz
// o filtro esquecido e o cache que não troca aparecerem hoje.
// Toda tabela de lançamento tem obra_id.
//
// As datas são relativas a hoje, para o exemplo nunca envelhecer.
// ============================================================
import { addDias, hojeISO, segundaDaSemana } from './datas.js'
import { congelarMeta } from './medicao.js'
import { FUNCOES_PADRAO } from './diario.js'
import { CRITICO_A_MAO, ORIGENS_ITEM, precoUnitario } from './orcamento.js'
import { CALENDARIO_PADRAO } from './calendario.js'
import { CAUSAS, STATUS_SEMANA, SITUACAO_SUBTAREFA } from './curtoPrazo.js'
import { GRUPOS_ARRECIFES, ITENS_ARRECIFES, ORCAMENTO_ARRECIFES } from './mockOrcamentoArrecifes.js'

// Vire para false quando o banco estiver ligado.
export const USAR_MOCK = true

const H = hojeISO()
const d = (n) => addDias(H, n)

export const obras = [
  {
    id: 'obra-vn', nome: 'INSS', codigo: 'INSS-045',
    endereco: 'Rua das Acácias, 120 (exemplo)', cliente: 'Prefeitura Municipal (exemplo)',
    numero_contrato: '045/2026', data_inicio: d(-120), data_entrega: d(143), situacao: 'Em andamento',
  },
  {
    id: 'obra-ba', nome: 'ARRECIFES JORDÃO ALTO', codigo: 'AJA-112',
    endereco: 'Praça Presidente Kennedy, Jordão Alto, Recife', cliente: 'Secretaria de Educação (exemplo)',
    numero_contrato: '112/2026', data_inicio: d(-40), data_entrega: d(250), situacao: 'Em andamento',
  },
]

export const profiles = [
  { id: 'p-eng', nome: 'Engenheiro Responsável', email: 'engenheiro@exemplo.com', cargo: 'Engenheiro civil', role: 'Engenheiro', ativo: true },
  { id: 'p-dir', nome: 'Helena Prado', email: 'diretoria@exemplo.com', cargo: 'Diretora', role: 'Diretoria', ativo: true },
  { id: 'p-lucas', nome: 'Lucas Andrade', email: 'estagiario@exemplo.com', cargo: 'Estagiário', role: 'Equipe da obra', ativo: true },
  { id: 'p-marcos', nome: 'Marcos Silva', email: 'encarregado@exemplo.com', cargo: 'Encarregado', role: 'Equipe da obra', ativo: true },
  { id: 'p-fiscal', nome: 'Ana Ribeiro', email: 'fiscal@exemplo.com', cargo: 'Fiscal do contrato', role: 'Fiscalização', ativo: true },
  { id: 'p-novo', nome: 'Pedro Novaes', email: 'novo@exemplo.com', cargo: '', role: 'Aguardando liberação', ativo: true },
]

// Quem pode ver qual obra. A Diretoria vê todas pelo papel e não precisa de linha aqui.
export const membros = [
  { id: 'm1', obra_id: 'obra-vn', profile_id: 'p-eng', ativo: true },
  { id: 'm2', obra_id: 'obra-ba', profile_id: 'p-eng', ativo: true },
  { id: 'm3', obra_id: 'obra-vn', profile_id: 'p-lucas', ativo: true },
  { id: 'm4', obra_id: 'obra-ba', profile_id: 'p-marcos', ativo: true },
  { id: 'm5', obra_id: 'obra-vn', profile_id: 'p-fiscal', ativo: true },
]

export const responsaveis = [
  { id: 'r-pedra', obra_id: 'obra-vn', nome: 'Construtora Pedra Firme', tipo: 'Empreiteiro', contato: '(81) 99999-0001', ativo: true },
  { id: 'r-ponto', obra_id: 'obra-vn', nome: 'Elétrica Ponto Certo', tipo: 'Empresa especializada', contato: '(81) 99999-0002', ativo: true },
  { id: 'r-vn-prop', obra_id: 'obra-vn', nome: 'Mão de obra própria', tipo: 'Mão de obra própria', contato: '', ativo: true },
  { id: 'r-silva', obra_id: 'obra-ba', nome: 'Empreiteira Silva & Filhos', tipo: 'Empreiteiro', contato: '(81) 99999-0003', ativo: true },
  { id: 'r-ba-prop', obra_id: 'obra-ba', nome: 'Mão de obra própria', tipo: 'Mão de obra própria', contato: '', ativo: true },
]

// INSS: orçamento de exemplo, um item por linha, com os lançamentos que ele recebeu e o planejado do mês.
// item = [fonte, código, unidade, quantidade orçada, custo unitário]; o BDI é o de serviço (24,20%).
// anterior = quanto foi feito antes da medição atual (espalhado em 4 lançamentos).
// periodo = [[dias a partir de hoje, quantidade], ...] dentro da medição atual.
const VN = [
  { codigo: '1.2.1', descricao: 'Tapume com telha metálica', item: ['SINAPI', '98459', 'M', 180, 117], resp: 'r-pedra', ini: -40, fim: 13, critico: true,
    plan: 120, anterior: 60, periodo: [[-17, 12], [-14, 10], [-8, 8]] },
  { codigo: '5.1.1', descricao: 'Contrapiso e = 5 cm', item: ['SINAPI', '87630', 'M2', 980, 33], resp: 'r-pedra', ini: -5, fim: 38, critico: false,
    plan: 300, anterior: 0, periodo: [] },
  { codigo: '6.1.3', descricao: 'Eletroduto PVC 25 mm embutido', item: ['SINAPI', '91852', 'M', 1500, 15.22], resp: 'r-ponto', ini: -20, fim: 18, critico: true,
    plan: 400, anterior: 0, periodo: [[-15, 60], [-9, 55], [-3, 45]] },
  { codigo: '3.1.4', descricao: 'Alvenaria de vedação com bloco cerâmico', item: ['SINAPI', '103324', 'M2', 1850, 55.15], resp: 'r-pedra', ini: -70, fim: 28, critico: true,
    plan: 600, anterior: 650, periodo: [[-21, 60], [-17, 70], [-14, 80], [-9, 60], [-6, 50], [-3, 50], [-1, 40]] },
  { codigo: '4.2.1', descricao: 'Chapisco e reboco interno', item: ['COMPOSIÇÃO', 'C-41', 'M2', 2400, 25.77], resp: 'r-vn-prop', ini: -60, fim: 38, critico: false,
    plan: 900, anterior: 1000, periodo: [[-20, 90], [-16, 100], [-13, 110], [-8, 120], [-3, 140], [-1, 140]] },
  { codigo: '3.2.2', descricao: 'Verga e contraverga de concreto', item: ['SINAPI', '93184', 'M', 260, 30.6], resp: 'r-vn-prop', ini: -60, fim: 11, critico: false,
    plan: 140, anterior: 120, periodo: [[-10, 40], [-7, 45], [-2, 35]] },
  { codigo: '2.3.2', descricao: 'Demolição de piso cerâmico', item: ['SINAPI', '97633', 'M2', 350, 17.71], resp: 'r-vn-prop', ini: -25, fim: 2, critico: false,
    plan: 350, anterior: 0, periodo: [[-22, 120], [-20, 130], [-17, 100]], concluidoNo: -17 },
  { codigo: '1.1.1', descricao: 'Placa da obra em chapa galvanizada', item: ['SINAPI', '103689', 'M2', 6, 201.29], resp: 'r-pedra', ini: -100, fim: -90, critico: false,
    plan: 0, anterior: 0, periodo: [], antigo: [[-95, 6]], concluidoNo: -95 },
  { codigo: '8.1.1', descricao: 'Instalação de louças sanitárias', item: ['COTAÇÃO', 'COT-03', 'UN', 24, 305.95], resp: 'r-vn-prop', ini: 80, fim: 110, critico: false,
    plan: 0, anterior: 0, periodo: [] },
  { codigo: '9.1.2', descricao: 'Limpeza final de obra', item: ['COMPOSIÇÃO', 'C-77', 'M2', 1450, 5.23], resp: 'r-vn-prop', ini: 130, fim: 140, critico: true,
    plan: 0, anterior: 0, periodo: [] },
]

// ARRECIFES: o orçamento real (mockOrcamentoArrecifes.js) e, para alguns itens, o que a obra já fez.
const BA = [
  { codigo: '2.1.7', resp: 'r-silva', ini: -38, fim: -30, critico: false, plan: 0, anterior: 0, periodo: [], antigo: [[-35, 130], [-32, 130]], concluidoNo: -32 },
  { codigo: '3.3.1', resp: 'r-ba-prop', ini: -22, fim: -18, critico: false, plan: 805.52, anterior: 0, periodo: [[-21, 805.52]], concluidoNo: -21 },
  { codigo: '3.4.1', resp: 'r-silva', ini: -20, fim: 12, critico: true, plan: 900, anterior: 0, periodo: [[-18, 150], [-14, 200], [-10, 180], [-7, 160], [-3, 120], [0, 90]] },
  { codigo: '3.1.4', resp: 'r-silva', ini: -17, fim: 5, critico: true, plan: 79.75, anterior: 0, periodo: [[-16, 20], [-12, 18]] },
  { codigo: '3.5.3', resp: 'r-ba-prop', ini: -8, fim: 40, critico: false, plan: 250, anterior: 0, periodo: [[-6, 40], [-2, 35]] },
  { codigo: '2.4.1', resp: 'r-ba-prop', ini: -25, fim: 200, critico: false, plan: 20, anterior: 0, periodo: [[-21, 1], [-20, 1], [-14, 1], [-7, 1], [-1, 1]] },
]

const AUTOR = { 'obra-vn': 'p-lucas', 'obra-ba': 'p-marcos' }

// Funções de cada obra (as padrão + as que o engenheiro cadastrar).
export const funcoes = ['obra-vn', 'obra-ba'].flatMap((obraId) =>
  FUNCOES_PADRAO.map((nome, i) => ({ id: `fn-${obraId}-${i}`, obra_id: obraId, nome, ativo: true })))
const funcao = (obraId, nome) => funcoes.find((x) => x.obra_id === obraId && x.nome === nome).id

// Quem costuma estar na obra quando cada responsável trabalha: [função, pessoas].
const EQUIPE_TIPICA = {
  'r-pedra': [['Pedreiro', 3], ['Servente', 3]],
  'r-ponto': [['Eletricista', 2]],
  'r-vn-prop': [['Pedreiro', 2], ['Servente', 4], ['Encarregado', 1]],
  'r-silva': [['Pedreiro', 3], ['Servente', 2]],
  'r-ba-prop': [['Armador', 3], ['Servente', 2], ['Encarregado', 1]],
}

// Grupos do orçamento (as linhas que não são item: etapa 1, subgrupo 1.2...). A EAP usa os mesmos.
export const grupos = [
  ...[['1', 'Serviços preliminares'], ['1.1', 'Placas e sinalização'], ['1.2', 'Tapumes e proteções'], ['2', 'Demolições e retiradas'],
    ['2.3', 'Pisos existentes'], ['3', 'Alvenaria'], ['3.1', 'Vedação'], ['3.2', 'Vergas e contravergas'], ['4', 'Revestimentos'],
    ['4.2', 'Revestimento interno'], ['5', 'Pisos'], ['5.1', 'Contrapisos'], ['6', 'Instalações elétricas'], ['6.1', 'Infraestrutura elétrica'],
    ['8', 'Louças e metais'], ['8.1', 'Louças sanitárias'], ['9', 'Serviços finais'], ['9.1', 'Limpeza']]
    .map(([codigo, nome]) => ({ id: `gr-vn-${codigo}`, obra_id: 'obra-vn', codigo, nome })),
  ...GRUPOS_ARRECIFES.map(([codigo, nome]) => ({ id: `gr-ba-${codigo}`, obra_id: 'obra-ba', codigo, nome })),
]

// Dados de cabeçalho do orçamento de cada obra (uma linha por obra).
export const orcamentos = [
  { id: 'orc-vn', obra_id: 'obra-vn', base_referencia: 'SINAPI-PE (exemplo)', mes_referencia: 'MARÇO DE 2026', encargos: 'NÃO DESONERADA (exemplo)',
    periodo: '10 MESES', bdi_servico: 0.242, bdi_material: 0.1528 },
  { id: 'orc-ba', obra_id: 'obra-ba', ...ORCAMENTO_ARRECIFES },
]

// Calendário de trabalho de cada obra (seg a sex e os feriados nacionais; o engenheiro ajusta em Ajustes).
export const calendarios = ['obra-vn', 'obra-ba'].map((obraId) => ({ id: `cal-${obraId}`, obra_id: obraId, ...structuredClone(CALENDARIO_PADRAO) }))

export const servicos = []
export const restricoes = []
export const semanaAtividades = []
export const subtarefas = []
export const aditivos = []
export const diarios = []
export const efetivo = []
export const lancamentos = []
export const fotos = []
export const medicoes = []
export const medicaoItens = []

const itemDoOrcamento = (obraId, [codigo, fonte, codigoRef, descricao, unidade, qtd, custo, bdi, preco]) => ({
  id: `s-${obraId.slice(5)}-${codigo}`, obra_id: obraId, codigo, fonte, codigo_ref: codigoRef, descricao, unidade,
  qtd_orcada: qtd, custo_unitario: custo, bdi, preco_unitario: preco ?? precoUnitario(custo, bdi),
  origem: ORIGENS_ITEM.planilha, aditivo_numero: null, responsavel_id: null, frente: '',
  data_inicio_planejada: null, data_fim_planejada: null, critico: false, critico_origem: CRITICO_A_MAO, ativo: true,
  alterado_por: null, alterado_em: null,
})

// specs: o que a obra já fez em alguns itens (pelo Item); os demais itens do orçamento ficam sem lançamento.
function montarObra(obraId, itens, specs) {
  servicos.push(...itens.map((i) => itemDoOrcamento(obraId, i)))
  const brutos = []
  for (const s of specs) {
    const servico = servicos.find((x) => x.obra_id === obraId && x.codigo === s.codigo)
    Object.assign(servico, { responsavel_id: s.resp, data_inicio_planejada: d(s.ini), data_fim_planejada: d(s.fim), critico: s.critico })
    Object.assign(s, { id: servico.id, unidade: servico.unidade, preco: servico.preco_unitario })
    const anteriores = s.anterior ? [-60, -50, -40, -30].map((n) => [n, s.anterior / 4]) : []
    for (const [n, q] of [...anteriores, ...(s.antigo ?? []), ...s.periodo]) {
      brutos.push({ servico: s, data: d(n), quantidade: q, concluido: s.concluidoNo === n })
    }
  }
  // Um diário por dia com lançamento.
  const datas = [...new Set(brutos.map((b) => b.data))].sort()
  datas.forEach((data, i) => {
    const diarioId = `dia-${obraId}-${data}`
    const clima = ['Bom', 'Bom', 'Nublado', 'Bom', 'Chuva'][i % 5]
    diarios.push({
      id: diarioId, obra_id: obraId, data, clima_manha: clima, clima_tarde: clima,
      ocorrencias: '', criado_por: AUTOR[obraId], enviado_em: `${data}T17:10:00`,
    })
    const responsaveisDoDia = [...new Set(brutos.filter((b) => b.data === data).map((b) => b.servico.resp))]
    responsaveisDoDia.forEach((resp) => (EQUIPE_TIPICA[resp] ?? []).forEach(([nome, pessoas], k) => {
      efetivo.push({
        id: `ef-${diarioId}-${resp}-${k}`, obra_id: obraId, diario_id: diarioId,
        responsavel_id: resp, funcao_id: funcao(obraId, nome), quantidade: pessoas + ((i + k) % 2),
      })
    }))
    brutos.filter((b) => b.data === data).forEach((b, j) => {
      lancamentos.push({
        id: `lan-${obraId}-${data}-${j}`, obra_id: obraId, diario_id: diarioId, servico_id: b.servico.id,
        responsavel_id: b.servico.resp, quantidade: b.quantidade, concluido: b.concluido,
        memoria_calculo: `Medido no local: ${b.quantidade.toLocaleString('pt-BR')} ${b.servico.unidade}`,
        lancado_por: AUTOR[obraId], corrigido_por: null, corrigido_em: null,
      })
      for (let k = 0; k <= (i + j) % 2; k++) {
        fotos.push({
          id: `foto-${obraId}-${data}-${j}-${k}`, obra_id: obraId, diario_id: diarioId,
          servico_id: b.servico.id, caminho: `fotos/${obraId}/${diarioId}/${j}-${k}.jpg`, tirada_por: AUTOR[obraId],
        })
      }
    })
  })
  return specs
}

function montarMedicoes(obraId, specs, anteriores) {
  // Medições já fechadas: só os totais, para a pergunta "em quantos meses bateu a meta?".
  anteriores.forEach((m, i) => {
    medicoes.push({
      id: `med-${obraId}-${i + 1}`, obra_id: obraId, numero: i + 1, data_inicio: d(m.ini), data_fim: d(m.fim),
      status: 'Fechada', valor_planejado: m.plan, valor_medido: m.medido, meta_batida: m.medido >= m.plan,
      fechada_em: `${d(m.fim + 1)}T10:00:00`,
    })
  })
  const numero = anteriores.length + 1
  const id = `med-${obraId}-${numero}`
  const itens = specs.filter((s) => s.plan > 0).map((s) => ({
    id: `item-${id}-${s.id}`, obra_id: obraId, medicao_id: id, servico_id: s.id,
    qtd_planejada: s.plan, qtd_medida: null,
  }))
  const preco = Object.fromEntries(specs.map((s) => [s.id, s.preco]))
  const { itens: congelados, valor_planejado } = congelarMeta(itens, preco)
  medicaoItens.push(...congelados)
  medicoes.push({
    id, obra_id: obraId, numero, data_inicio: d(-22), data_fim: d(8), status: 'Em andamento',
    valor_planejado, valor_medido: null, meta_batida: null, fechada_em: null,
  })
}

const ITENS_VN = VN.map((s) => [s.codigo, s.item[0], s.item[1], s.descricao, s.item[2], s.item[3], s.item[4], 0.242])
montarMedicoes('obra-vn', montarObra('obra-vn', ITENS_VN, VN), [
  { ini: -84, fim: -54, plan: 182000, medido: 186400 },
  { ini: -53, fim: -23, plan: 210000, medido: 193200 },
])
montarMedicoes('obra-ba', montarObra('obra-ba', ITENS_ARRECIFES, BA), [
  { ini: -53, fim: -23, plan: 38000, medido: 39500 },
])

// Uma ocorrência de exemplo no INSS.
const diaChuva = diarios.find((x) => x.obra_id === 'obra-vn' && x.data === d(-9))
if (diaChuva) {
  diaChuva.clima_tarde = 'Chuva forte'
  diaChuva.ocorrencias = 'Paralisação parcial por chuva às 14h.'
}

// INSS: um aditivo (acréscimo no tapume, supressão nas louças) e um item novo, para o exemplo mostrar os dois.
aditivos.push(
  { id: 'ad-vn-1', obra_id: 'obra-vn', servico_id: 's-vn-1.2.1', numero: '1º aditivo', data: d(-30), quantidade: 40, motivo: 'Ampliação do canteiro para o acesso lateral.', criado_por: 'p-eng', alterado_por: null, alterado_em: null },
  { id: 'ad-vn-2', obra_id: 'obra-vn', servico_id: 's-vn-8.1.1', numero: '1º aditivo', data: d(-30), quantidade: -4, motivo: 'Dois sanitários retirados do projeto.', criado_por: 'p-eng', alterado_por: null, alterado_em: null },
)
servicos.push({
  ...itemDoOrcamento('obra-vn', ['1.2.2', 'COTAÇÃO', 'COT-11', 'Proteção de fachada com tela de nylon', 'M2', 320, 14.5, 0.242]),
  origem: ORIGENS_ITEM.novo, aditivo_numero: '1º aditivo', responsavel_id: 'r-pedra', data_inicio_planejada: d(5), data_fim_planejada: d(25),
})

// Restrições de exemplo (médio prazo): abertas, uma vencida de semana passada e uma já resolvida.
const semana = (n) => addDias(segundaDaSemana(H), 7 * n)
const restricao = (id, obraId, servico, tipo, descricao, sem, prazo, responsavel, extra = {}) => ({
  id, obra_id: obraId, servico_id: servico, tipo, descricao, semana: semana(sem), prazo: d(prazo), responsavel,
  resolvida: false, resolvida_em: null, resolvida_por: null, criado_por: 'p-eng', ...extra,
})
restricoes.push(
  restricao('rs-vn-1', 'obra-vn', 's-vn-1.2.1', 'Material', 'Telha metálica do tapume em falta no fornecedor', -1, -2, 'Compras (escritório)'),
  restricao('rs-vn-2', 'obra-vn', 's-vn-5.1.1', 'Mão de obra', 'Equipe de contrapiso só chega depois da alvenaria', 1, 6, 'Construtora Pedra Firme'),
  restricao('rs-vn-3', 'obra-vn', 's-vn-6.1.3', 'Projeto', 'Revisão do projeto elétrico do 2º pavimento', 2, 10, 'Elétrica Ponto Certo'),
  restricao('rs-vn-4', 'obra-vn', 's-vn-3.1.4', 'Equipamento', 'Andaime para a fachada norte', 0, -1, 'Construtora Pedra Firme',
    { resolvida: true, resolvida_em: `${d(-1)}T16:20:00`, resolvida_por: 'p-lucas' }),
  restricao('rs-ba-1', 'obra-ba', 's-ba-3.4.1', 'Equipamento', 'Trator de esteiras em manutenção', 0, 2, 'Empreiteira Silva & Filhos'),
  restricao('rs-ba-2', 'obra-ba', 's-ba-3.5.3', 'Projeto', 'Paginação do piso intertravado não aprovada pela fiscalização', 1, 5, 'Engenheiro'),
)

// Curto prazo de exemplo: 7 semanas passadas (para o gráfico do PPC) e a semana atual com movimento.
// Nas semanas passadas, de cada 5 atividades 1 não foi realizada (causas variando) e as outras concluídas.
const CAUSAS_EXEMPLO = ['Material', 'Clima', 'Mão de obra', 'Projeto', 'Material', 'Equipamento']
let causaDaVez = 0
for (const obraId of ['obra-vn', 'obra-ba']) {
  const comDatas = servicos.filter((s) => s.obra_id === obraId && s.data_inicio_planejada && s.data_fim_planejada)
  for (let k = 7; k >= 1; k--) {
    const ini = semana(-k)
    const fim = addDias(ini, 6)
    comDatas.filter((s) => s.data_inicio_planejada <= fim && s.data_fim_planejada >= ini).forEach((s, i) => {
      const naoFez = (i + k) % 5 === 0 || (k === 2 && i === 1)
      semanaAtividades.push({
        id: `sa-${s.id}-${ini}`, obra_id: obraId, semana: ini, servico_id: s.id,
        status: naoFez ? STATUS_SEMANA.naoRealizado : STATUS_SEMANA.concluido,
        causa: naoFez ? CAUSAS_EXEMPLO[causaDaVez++ % CAUSAS_EXEMPLO.length] : null, causa_texto: '', fora: false,
        atualizado_por: AUTOR[obraId], atualizado_em: `${addDias(ini, 5)}T17:00:00`,
      })
    })
  }
}
semanaAtividades.push(
  { id: 'sa-vn-agora-1', obra_id: 'obra-vn', semana: semana(0), servico_id: 's-vn-4.2.1', status: STATUS_SEMANA.andamento, causa: null, causa_texto: '', fora: false, atualizado_por: 'p-lucas', atualizado_em: `${d(-1)}T09:00:00` },
  { id: 'sa-vn-agora-2', obra_id: 'obra-vn', semana: semana(0), servico_id: 's-vn-3.2.2', status: STATUS_SEMANA.concluido, causa: null, causa_texto: '', fora: false, atualizado_por: 'p-lucas', atualizado_em: `${d(-1)}T16:30:00` },
  { id: 'sa-ba-agora-1', obra_id: 'obra-ba', semana: semana(0), servico_id: 's-ba-3.4.1', status: STATUS_SEMANA.andamento, causa: null, causa_texto: '', fora: false, atualizado_por: 'p-marcos', atualizado_em: `${d(-1)}T10:00:00` },
)
const subtarefa = (id, obraId, servico, texto, situacao, causa = null) => ({
  id, obra_id: obraId, semana: semana(0), servico_id: servico, texto, situacao, causa, causa_texto: '', criado_por: 'p-eng',
})
subtarefas.push(
  subtarefa('st-vn-1', 'obra-vn', 's-vn-4.2.1', 'Chapisco das paredes do 2º pavimento', SITUACAO_SUBTAREFA.feita),
  subtarefa('st-vn-2', 'obra-vn', 's-vn-4.2.1', 'Reboco da circulação', SITUACAO_SUBTAREFA.pendente),
  subtarefa('st-vn-3', 'obra-vn', 's-vn-4.2.1', 'Reboco das salas 201 a 204', SITUACAO_SUBTAREFA.pendente),
  subtarefa('st-ba-1', 'obra-ba', 's-ba-3.4.1', 'Corte do platô da quadra', SITUACAO_SUBTAREFA.naoRealizada, CAUSAS[4]),
)

