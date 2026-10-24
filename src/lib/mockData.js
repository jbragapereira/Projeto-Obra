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
import { addDias, hojeISO } from './datas.js'
import { congelarMeta } from './medicao.js'
import { FUNCOES_PADRAO } from './diario.js'

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
    endereco: 'Av. Central, 2.300 — Jordão Alto (exemplo)', cliente: 'Secretaria de Educação (exemplo)',
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

// Um serviço por linha, com os lançamentos que ele recebeu e o planejado do mês.
// anterior = quanto foi feito antes da medição atual (espalhado em 4 lançamentos).
// periodo = [[dias a partir de hoje, quantidade], ...] dentro da medição atual.
const VN = [
  { id: 's-vn-121', codigo: '1.2.1', descricao: 'Tapume com telha metálica', frente: 'Canteiro', unidade: 'm', qtd: 180, preco: 145, resp: 'r-pedra', ini: -40, fim: 13, critico: true, origem: 'MS Project',
    plan: 120, anterior: 60, periodo: [[-17, 12], [-14, 10], [-8, 8]] },
  { id: 's-vn-511', codigo: '5.1.1', descricao: 'Contrapiso e = 5 cm', frente: 'Pisos', unidade: 'm²', qtd: 980, preco: 41, resp: 'r-pedra', ini: -5, fim: 38, critico: false, origem: 'MS Project',
    plan: 300, anterior: 0, periodo: [] },
  { id: 's-vn-613', codigo: '6.1.3', descricao: 'Eletroduto PVC 25 mm embutido', frente: 'Instalações', unidade: 'm', qtd: 1500, preco: 18.9, resp: 'r-ponto', ini: -20, fim: 18, critico: true, origem: 'À mão',
    plan: 400, anterior: 0, periodo: [[-15, 60], [-9, 55], [-3, 45]] },
  { id: 's-vn-314', codigo: '3.1.4', descricao: 'Alvenaria de vedação com bloco cerâmico', frente: 'Alvenaria', unidade: 'm²', qtd: 1850, preco: 68.5, resp: 'r-pedra', ini: -70, fim: 28, critico: true, origem: 'MS Project',
    plan: 600, anterior: 650, periodo: [[-21, 60], [-17, 70], [-14, 80], [-9, 60], [-6, 50], [-3, 50], [-1, 40]] },
  { id: 's-vn-421', codigo: '4.2.1', descricao: 'Chapisco e reboco interno', frente: 'Revestimento', unidade: 'm²', qtd: 2400, preco: 32, resp: 'r-vn-prop', ini: -60, fim: 38, critico: false, origem: 'MS Project',
    plan: 900, anterior: 1000, periodo: [[-20, 90], [-16, 100], [-13, 110], [-8, 120], [-3, 140], [-1, 140]] },
  { id: 's-vn-322', codigo: '3.2.2', descricao: 'Verga e contraverga de concreto', frente: 'Alvenaria', unidade: 'm', qtd: 260, preco: 38, resp: 'r-vn-prop', ini: -60, fim: 11, critico: false, origem: 'MS Project',
    plan: 140, anterior: 120, periodo: [[-10, 40], [-7, 45], [-2, 35]] },
  { id: 's-vn-232', codigo: '2.3.2', descricao: 'Demolição de piso cerâmico', frente: 'Demolições', unidade: 'm²', qtd: 350, preco: 22, resp: 'r-vn-prop', ini: -25, fim: 2, critico: false, origem: 'MS Project',
    plan: 350, anterior: 0, periodo: [[-22, 120], [-20, 130], [-17, 100]], concluidoNo: -17 },
  { id: 's-vn-111', codigo: '1.1.1', descricao: 'Placa da obra em chapa galvanizada', frente: 'Canteiro', unidade: 'm²', qtd: 6, preco: 250, resp: 'r-pedra', ini: -100, fim: -90, critico: false, origem: 'MS Project',
    plan: 0, anterior: 0, periodo: [], antigo: [[-95, 6]], concluidoNo: -95 },
  { id: 's-vn-811', codigo: '8.1.1', descricao: 'Instalação de louças sanitárias', frente: 'Instalações', unidade: 'un', qtd: 24, preco: 380, resp: 'r-vn-prop', ini: 80, fim: 110, critico: false, origem: 'MS Project',
    plan: 0, anterior: 0, periodo: [] },
  { id: 's-vn-912', codigo: '9.1.2', descricao: 'Limpeza final de obra', frente: 'Entrega', unidade: 'm²', qtd: 1450, preco: 6.5, resp: 'r-vn-prop', ini: 130, fim: 140, critico: true, origem: 'MS Project',
    plan: 0, anterior: 0, periodo: [] },
]

const BA = [
  { id: 's-ba-112', codigo: '1.1.2', descricao: 'Escavação manual de sapatas', frente: 'Fundações', unidade: 'm³', qtd: 60, preco: 85, resp: 'r-silva', ini: -12, fim: 7, critico: true, origem: 'MS Project',
    plan: 60, anterior: 0, periodo: [[-10, 16], [-7, 14], [-3, 10], [0, 8]] },
  { id: 's-ba-211', codigo: '2.1.1', descricao: 'Concreto fck 25 MPa em fundações', frente: 'Fundações', unidade: 'm³', qtd: 60, preco: 620, resp: 'r-silva', ini: -9, fim: 22, critico: true, origem: 'MS Project',
    plan: 40, anterior: 0, periodo: [[-8, 8], [-4, 7], [-1, 7]] },
  { id: 's-ba-224', codigo: '2.2.4', descricao: 'Armação em aço CA-50', frente: 'Fundações', unidade: 'kg', qtd: 7800, preco: 9.8, resp: 'r-ba-prop', ini: -20, fim: 17, critico: false, origem: 'MS Project',
    plan: 2500, anterior: 0, periodo: [[-18, 300], [-14, 350], [-9, 400], [-4, 450], [0, 400]] },
  { id: 's-ba-131', codigo: '1.3.1', descricao: 'Locação da obra', frente: 'Serviços iniciais', unidade: 'm²', qtd: 850, preco: 4.2, resp: 'r-ba-prop', ini: -22, fim: -18, critico: false, origem: 'MS Project',
    plan: 850, anterior: 0, periodo: [[-21, 850]], concluidoNo: -21 },
  { id: 's-ba-231', codigo: '2.3.1', descricao: 'Impermeabilização de viga baldrame', frente: 'Fundações', unidade: 'm²', qtd: 420, preco: 36, resp: 'r-silva', ini: -8, fim: 32, critico: false, origem: 'MS Project',
    plan: 180, anterior: 0, periodo: [[-6, 40]] },
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

export const servicos = []
export const diarios = []
export const efetivo = []
export const lancamentos = []
export const fotos = []
export const medicoes = []
export const medicaoItens = []

function montarObra(obraId, specs) {
  const brutos = []
  for (const s of specs) {
    servicos.push({
      id: s.id, obra_id: obraId, codigo: s.codigo, descricao: s.descricao, frente: s.frente,
      unidade: s.unidade, qtd_contratada: s.qtd, preco_unitario: s.preco, responsavel_id: s.resp,
      data_inicio_planejada: d(s.ini), data_fim_planejada: d(s.fim),
      critico: s.critico, critico_origem: s.origem, ativo: true,
    })
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

montarMedicoes('obra-vn', montarObra('obra-vn', VN), [
  { ini: -84, fim: -54, plan: 182000, medido: 186400 },
  { ini: -53, fim: -23, plan: 210000, medido: 193200 },
])
montarMedicoes('obra-ba', montarObra('obra-ba', BA), [
  { ini: -53, fim: -23, plan: 38000, medido: 39500 },
])

// Uma ocorrência de exemplo no INSS.
const diaChuva = diarios.find((x) => x.obra_id === 'obra-vn' && x.data === d(-9))
if (diaChuva) {
  diaChuva.clima_tarde = 'Chuva forte'
  diaChuva.ocorrencias = 'Paralisação parcial por chuva às 14h.'
}
