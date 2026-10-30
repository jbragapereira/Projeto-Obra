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
import { congelarMeta, cronogramaDeMedicoes } from './medicao.js'
import { FUNCOES_PADRAO } from './diario.js'
import { CATALOGO_PADRAO, CATEGORIAS_PADRAO } from './materiais.js'
import { MODELOS_FVS_PADRAO, montarModeloPadrao } from './qualidade.js'
import { CRITICO_A_MAO, ORIGENS_ITEM, precoUnitario } from './orcamento.js'
import { CALENDARIO_PADRAO } from './calendario.js'
import { STATUS_SEMANA, SITUACAO_SUBTAREFA } from './curtoPrazo.js'
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
    id: 'obra-ba', nome: 'ARRECIFES JORDÃO ALTO', codigo: 'CT01',
    endereco: 'Praça Presidente Kennedy, Jordão Alto, Recife', cliente: 'Secretaria de Educação (exemplo)',
    numero_contrato: 'CT01', data_inicio: d(-40), data_entrega: '2027-08-14', situacao: 'Em andamento',
    medicoes_inicio: '2026-10-01', medicoes_fim_primeira: '2026-11-30',
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
// A ARRECIFES começa zerada: EAP sem datas e nada executado no Diário (o engenheiro lança os dados
// reais). Por isso ela não tem Kanban, diário nem medição de exemplo (plan fica 0).
const BA = [
  { codigo: '2.1.7', resp: 'r-silva', critico: false, plan: 0, anterior: 0, periodo: [] },
  { codigo: '3.3.1', resp: 'r-ba-prop', critico: false, plan: 0, anterior: 0, periodo: [] },
  { codigo: '3.4.1', resp: 'r-silva', critico: true, plan: 0, anterior: 0, periodo: [] },
  { codigo: '3.1.4', resp: 'r-silva', critico: true, plan: 0, anterior: 0, periodo: [] },
  { codigo: '3.5.3', resp: 'r-ba-prop', critico: false, plan: 0, anterior: 0, periodo: [] },
  { codigo: '2.4.1', resp: 'r-ba-prop', critico: false, plan: 0, anterior: 0, periodo: [] },
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
// Equipamentos de cada obra (cadastro).
export const equipamentos = [
  { id: 'eq-vn-1', obra_id: 'obra-vn', nome: 'Betoneira 400 L', propriedade: 'Próprio', fornecedor: '', identificacao: 'BT-02', ativo: true },
  { id: 'eq-vn-2', obra_id: 'obra-vn', nome: 'Andaime fachadeiro (60 m²)', propriedade: 'Locado', fornecedor: 'Locaforte Andaimes', identificacao: '', ativo: true },
  { id: 'eq-vn-3', obra_id: 'obra-vn', nome: 'Martelete rompedor 10 kg', propriedade: 'Próprio', fornecedor: '', identificacao: 'MR-11', ativo: true },
  { id: 'eq-ba-1', obra_id: 'obra-ba', nome: 'Trator de esteiras 170 HP', propriedade: 'Locado', fornecedor: 'Terraplena Nordeste', identificacao: 'D6-0458', ativo: true },
]
// Materiais: as categorias e o catálogo de cada obra (aba Materiais do Cadastro) e os pedidos do Kanban.
export const categoriasMaterial = ['vn', 'ba'].flatMap((o) => CATEGORIAS_PADRAO.map(([nome, cor], i) => ({
  id: `cat-${o}-${i + 1}`, obra_id: `obra-${o}`, nome, cor, ativo: true,
})))
export const materiais = ['vn', 'ba'].flatMap((o) => CATALOGO_PADRAO.map(([nome, unidade, categoria], i) => ({
  id: `mat-${o}-${i + 1}`, obra_id: `obra-${o}`, nome, unidade,
  categoria_id: `cat-${o}-${CATEGORIAS_PADRAO.findIndex(([c]) => c === categoria) + 1}`, ativo: true,
})))
// Histórico de um pedido: [status, dias a partir de hoje], na ordem em que aconteceu.
const hist = (...passos) => passos.map(([status, n]) => ({ status, data: d(n) }))
const pedido = (id, obra, material, quantidade, frente, prioridade, historico, extra = {}) => ({
  id, obra_id: `obra-${obra}`, material_id: `mat-${obra}-${material}`, quantidade, frente, prioridade,
  status: historico[historico.length - 1].status, fornecedor: '', previsao_entrega: '', historico,
  recebimento: null, frente_aplicada: '', criado_por: 'p-eng', ...extra,
})
export const pedidosMaterial = [
  pedido('pm-vn-1', 'vn', 7, 120, 'Banheiros acessíveis', 'Crítico', hist(['Solicitar', -1])),
  pedido('pm-vn-2', 'vn', 8, 14, 'Sala de atendimento', 'Normal', hist(['Solicitar', -3])),
  pedido('pm-vn-3', 'vn', 1, 50, 'Rampa de acesso', 'Normal', hist(['Solicitar', -6], ['Em cotação', -4])),
  pedido('pm-vn-4', 'vn', 11, 6, 'Quadro elétrico do térreo', 'Crítico', hist(['Solicitar', -5], ['Em cotação', -2])),
  pedido('pm-vn-5', 'vn', 6, 40, 'Banheiros acessíveis', 'Normal', hist(['Solicitar', -15], ['Em cotação', -12], ['Comprado / a caminho', -9]),
    { fornecedor: 'Casa do Construtor Recife', previsao_entrega: d(-2) }),
  pedido('pm-vn-6', 'vn', 10, 12, 'Banheiros acessíveis', 'Normal', hist(['Solicitar', -8], ['Em cotação', -6], ['Comprado / a caminho', -3]),
    { fornecedor: 'Hidráulica Boa Vista', previsao_entrega: d(2) }),
  pedido('pm-vn-7', 'vn', 2, 6, 'Rampa de acesso', 'Normal', hist(['Solicitar', -12], ['Em cotação', -10], ['Comprado / a caminho', -8], ['No almoxarifado', -5]),
    { fornecedor: 'Areial Capibaribe', previsao_entrega: d(-6), recebimento: { qtd_bate_nf: true, estado_ok: true, avarias: '', foto_nf: null } }),
  pedido('pm-vn-8', 'vn', 9, 30, 'Forro da sala de atendimento', 'Normal', hist(['Solicitar', -14], ['Em cotação', -12], ['Comprado / a caminho', -9], ['No almoxarifado', -4]),
    { fornecedor: 'Gesso Nordeste', previsao_entrega: d(-5), recebimento: { qtd_bate_nf: true, estado_ok: false, avarias: '3 sacos rasgados na descarga', foto_nf: null } }),
  pedido('pm-vn-9', 'vn', 4, 2, 'Fachada', 'Normal', hist(['Solicitar', -25], ['Em cotação', -22], ['Comprado / a caminho', -18], ['No almoxarifado', -14], ['Entregue na frente', -10]),
    { fornecedor: 'Cerâmica Paudalho', previsao_entrega: d(-15), recebimento: { qtd_bate_nf: true, estado_ok: true, avarias: '', foto_nf: null }, frente_aplicada: 'Fachada' }),
  pedido('pm-vn-10', 'vn', 3, 8, 'Contrapiso do térreo', 'Normal', hist(['Solicitar', -30], ['Em cotação', -28], ['Comprado / a caminho', -26], ['No almoxarifado', -22], ['Entregue na frente', -21]),
    { fornecedor: 'Pedreira Jordão', previsao_entrega: d(-23), recebimento: { qtd_bate_nf: true, estado_ok: true, avarias: '', foto_nf: null }, frente_aplicada: 'Contrapiso do térreo' }),
  pedido('pm-ba-1', 'ba', 1, 80, 'Canteiro de obras', 'Normal', hist(['Solicitar', -2])),
  pedido('pm-ba-2', 'ba', 3, 12, 'Base do reservatório', 'Crítico', hist(['Solicitar', -7], ['Em cotação', -5], ['Comprado / a caminho', -2]),
    { fornecedor: 'Pedreira Jordão', previsao_entrega: d(3) }),
]
// Qualidade, aba Pendências: o que a vistoria achou, quem corrige (empresa), quem acompanha e o prazo.
// Fotos de exemplo não existem (url_previa null): o card mostra o espaço da foto vazio.
const pendencia = (id, obra, numero, descricao, local, pavimento, empresa_id, responsavel_id, vistoria, prazo, status, extra = {}) => ({
  id, obra_id: `obra-${obra}`, numero, descricao, local, pavimento, empresa_id, responsavel_id,
  data_vistoria: d(vistoria), prazo: d(prazo), status, vistoriado_por: 'p-eng', foto: null, foto_evidencia: null,
  observacoes: '', em_andamento_em: null, resolvido_em: null, cancelada: false, cancelada_em: null, motivo_cancelamento: '', ...extra,
})
export const pendencias = [
  pendencia('pq-vn-1', 'vn', 1, 'Fissura diagonal na alvenaria ao lado da janela', 'Fachada norte', '1º pavimento', 'r-pedra', 'r-pedra', -12, -3, 'Pendente',
    { observacoes: `[${d(-5).split('-').reverse().join('/')} 10:20] Empresa avisada por telefone; vem na próxima semana.` }),
  pendencia('pq-vn-2', 'vn', 2, 'Tomada sem espelho e com fiação exposta', 'Sala de atendimento', 'Térreo', 'r-ponto', 'r-ponto', -6, 2, 'Em andamento',
    { em_andamento_em: d(-2) }),
  pendencia('pq-vn-3', 'vn', 3, 'Rejunte falhado no piso do box', 'Banheiro acessível masculino', 'Térreo', 'r-vn-prop', 'r-pedra', -4, 0, 'Pendente'),
  pendencia('pq-vn-4', 'vn', 4, 'Porta corta-fogo arrastando no piso', 'Escada de emergência', '2º pavimento', 'r-pedra', 'r-pedra', -3, 6, 'Pendente'),
  pendencia('pq-vn-5', 'vn', 5, 'Mancha de umidade no forro de gesso', 'Copa', 'Térreo', 'r-vn-prop', 'r-vn-prop', -15, -6, 'Resolvido',
    { em_andamento_em: d(-12), resolvido_em: d(-8), foto_evidencia: { url_previa: null, tamanho_bytes: 1 },
      observacoes: `[${d(-8).split('-').reverse().join('/')} 16:40] Calha desentupida e forro trocado.` }),
  pendencia('pq-vn-6', 'vn', 6, 'Disjuntor sem identificação no quadro', 'Quadro elétrico do térreo', 'Térreo', 'r-ponto', 'r-vn-prop', -1, 4, 'Pendente'),
  pendencia('pq-vn-7', 'vn', 7, 'Barra de apoio do vaso solta', 'Banheiro acessível masculino', 'Térreo', 'r-pedra', 'r-pedra', -4, 2, 'Em andamento',
    { em_andamento_em: d(-2) }),
  pendencia('pq-vn-8', 'vn', 8, 'Espelho inclinado fora da altura de norma', 'Banheiro acessível masculino', 'Térreo', 'r-pedra', 'r-vn-prop', -4, 5, 'Pendente'),
  pendencia('pq-ba-1', 'ba', 1, 'Tapume do canteiro solto na esquina', 'Canteiro de obras', '', 'r-silva', 'r-ba-prop', -2, 1, 'Pendente'),
]
// Qualidade, aba FVS: as fichas (modelos) de cada obra, as vistorias (com a cópia da ficha do dia em que
// abriram) e as não conformidades, com a linha do tempo. A ARRECIFES só tem as fichas.
export const modelosFvs = ['vn', 'ba'].flatMap((o) => MODELOS_FVS_PADRAO.map((m, i) => ({
  id: `mf-${o}-${i + 1}`, obra_id: `obra-${o}`, codigo: `FVS-0${i + 1}`, ...montarModeloPadrao(m), ativo: true,
})))
const fichaVn = (i) => modelosFvs.find((m) => m.id === `mf-vn-${i}`)
const vistoria = (id, ficha, ambiente, status, respostas, iniciada, concluida = null) => ({
  id, obra_id: 'obra-vn', modelo_id: ficha.id, codigo_modelo: ficha.codigo, nome_modelo: ficha.nome, versao: ficha.versao,
  grupos: structuredClone(ficha.grupos), ambiente, status, respostas, iniciada_em: d(iniciada), iniciada_por: 'p-eng', concluida_em: concluida === null ? null : d(concluida),
})
export const vistoriasFvs = [
  vistoria('vf-vn-1', fichaVn(1), 'Banheiro acessível masculino · Térreo', 'Concluída', {
    'g1-1': 'OK', 'g1-2': 'NC', 'g1-3': 'OK', 'g2-1': 'OK', 'g2-2': 'OK', 'g2-3': 'NC', 'g2-4': 'OK', 'g3-1': 'OK', 'g3-2': 'N.A.',
  }, -14, -9),
  vistoria('vf-vn-2', fichaVn(2), 'Copa · Térreo', 'Em andamento', { 'g1-1': 'OK', 'g1-2': 'OK', 'g1-4': 'NC', 'g1-5': 'NC' }, -2),
]
const passo = (dia, hora, texto) => ({ quando: `${d(dia)}T${hora}:00`, texto })
const nc = (id, codigo, vist, itemId, numero, descricao, solucao, severidade, responsavel_id, status, aberta, timeline, fechada = null) => {
  const v = vistoriasFvs.find((x) => x.id === vist)
  return {
    id, obra_id: 'obra-vn', codigo, vistoria_id: vist, item_id: itemId, item_numero: numero,
    titulo: v.grupos.flatMap((g) => g.itens).find((it) => it.id === itemId).titulo, servico: v.nome_modelo, ambiente: v.ambiente,
    descricao, solucao, severidade, responsavel_id, fotos: [], status, aberta_em: d(aberta), fechada_em: fechada === null ? null : d(fechada), timeline,
  }
}
export const naoConformidades = [
  nc('nc-vn-1', 'NC-001', 'vf-vn-1', 'g1-2', '1.2', 'Canto vivo entre piso e parede, sem meia-cana', 'Executar meia-cana com argamassa antes da manta', 'Média', 'r-pedra', 'Fechada', -12, [
    passo(-12, '09:40', 'Aberta por Engenheiro Responsável'), passo(-12, '10:05', 'Encaminhada para correção a Construtora Pedra Firme'),
    passo(-10, '16:20', 'Marcada como corrigida'), passo(-9, '08:30', 'Aprovada e fechada'),
  ], -9),
  nc('nc-vn-2', 'NC-002', 'vf-vn-1', 'g2-3', '2.3', 'Manta subiu só 15 cm na parede do box', 'Complementar a subida até 30 cm com sobreposição', 'Alta', 'r-pedra', 'Corrigida', -11, [
    passo(-11, '11:10', 'Aberta por Engenheiro Responsável'), passo(-11, '11:30', 'Encaminhada para correção a Construtora Pedra Firme'),
    passo(-3, '17:45', 'Marcada como corrigida'),
  ]),
  nc('nc-vn-3', 'NC-003', 'vf-vn-2', 'g1-4', '1.4', 'Juntas desalinhadas na parede da pia', 'Remover as peças e reassentar com espaçador', 'Média', 'r-vn-prop', 'Encaminhada', -2, [
    passo(-2, '14:18', 'Aberta por Lucas Andrade'), passo(-1, '08:05', 'Encaminhada para correção a Mão de obra própria'),
  ]),
  nc('nc-vn-4', 'NC-004', 'vf-vn-2', 'g1-5', '1.5', 'Água empoça perto do ralo', 'Refazer o caimento do contrapiso', 'Alta', 'r-pedra', 'Aberta', -1, [
    passo(-1, '15:50', 'Aberta por Lucas Andrade'),
  ]),
]
// Qualidade, aba Gemba Walk: o que se viu andando pela obra, a causa, o que será feito e os desperdícios.
// prazo null = sem prazo. A ARRECIFES tem uma observação só.
const gemba = (id, obra, numero, local, descricao, causa_raiz, acao, desperdicios, responsavel_id, registrada, prazo, status, extra = {}) => ({
  id, obra_id: `obra-${obra}`, numero, local, descricao, causa_raiz, acao, desperdicios, responsavel_id,
  registrado_em: d(registrada), registrado_por: 'p-eng', prazo: prazo === null ? null : d(prazo), status, foto: null,
  resolvido_em: null, cancelada: false, cancelada_em: null, motivo_cancelamento: '', ...extra,
})
export const observacoesGemba = [
  gemba('gw-vn-1', 'vn', 1, 'Fachada norte', 'Reboco da fachada refeito pela segunda vez: o primeiro saiu sem chapisco', 'Chapisco não conferido antes de liberar o reboco',
    'Conferir o chapisco na FVS antes de liberar a frente', ['Retrabalho'], 'r-pedra', -9, -2, 'Pendente'),
  gemba('gw-vn-2', 'vn', 2, 'Pátio de descarga', 'Pedreiros parados 40 min esperando o caminhão de argamassa', 'Pedido feito no dia, sem janela de entrega',
    'Programar a argamassa com 2 dias de antecedência', ['Espera'], 'r-vn-prop', -6, 3, 'Em andamento'),
  gemba('gw-vn-3', 'vn', 3, 'Almoxarifado', 'Blocos levados no carrinho do portão até o 2º pavimento, ida e volta pela escada', 'Guincho desmontado desde a semana passada',
    'Remontar o guincho e descarregar os blocos ao lado dele', ['Transporte', 'Movimentação'], 'r-pedra', -5, 1, 'Pendente'),
  gemba('gw-vn-4', 'vn', 4, 'Térreo, depósito', '300 sacos de cimento estocados, 2 semanas de consumo; alguns empedrando', 'Compra do mês inteiro de uma vez',
    'Comprar a cada semana pelo Kanban de Materiais', ['Estoque'], 'r-vn-prop', -12, null, 'Pendente'),
  gemba('gw-vn-5', 'vn', 5, 'Banheiro acessível masculino', 'Cortaram cerâmica para o banheiro inteiro antes de conferir o prumo da parede', 'Equipe adiantou o corte para ganhar tempo',
    'Cortar só depois da FVS de base liberada', ['Superprodução', 'Retrabalho'], 'r-pedra', -8, -1, 'Em andamento'),
  gemba('gw-vn-6', 'vn', 6, 'Escritório da obra', 'Requisição de material assinada por três pessoas antes de chegar ao comprador', 'Fluxo antigo de aprovação',
    'Só o engenheiro assina; o resto acompanha pelo app', ['Processo desnecessário', 'Espera'], 'r-vn-prop', -15, -10, 'Resolvido', { resolvido_em: d(-10) }),
  gemba('gw-vn-7', 'vn', 7, 'Sala de atendimento', 'Eletricista volta ao almoxarifado a cada caixa de passagem que precisa', 'Material não separado por frente de trabalho',
    'Montar o kit da frente no início do dia', ['Movimentação'], 'r-ponto', -3, 4, 'Pendente'),
  gemba('gw-ba-1', 'ba', 1, 'Canteiro de obras', 'Areia descarregada longe da betoneira, levada no carrinho', 'Baia de areia montada no lugar errado',
    'Mudar a baia para junto da betoneira', ['Transporte'], 'r-silva', -1, 5, 'Pendente'),
]
// Medição de empreiteiros: contratos (Kanban), itens do escopo (do Orçamento), boletins e linhas dos boletins.
export const contratosEmpreiteiro = []
export const contratoItens = []
export const boletinsEmpreiteiro = []
export const boletimLinhas = []

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
    Object.assign(servico, {
      responsavel_id: s.resp, critico: s.critico,
      data_inicio_planejada: s.ini != null ? d(s.ini) : null, data_fim_planejada: s.fim != null ? d(s.fim) : null,
    })
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
// A ARRECIFES tem o cronograma de medições do contrato (1ª = out + nov/26; depois, uma por mês até ago/27):
// as medições nascem em planejamento, vazias, e cada uma se enche pela EAP do seu período.
montarObra('obra-ba', ITENS_ARRECIFES, BA)
const ba = obras.find((o) => o.id === 'obra-ba')
for (const p of cronogramaDeMedicoes({ inicio: ba.medicoes_inicio, fimPrimeira: ba.medicoes_fim_primeira, entrega: ba.data_entrega })) {
  medicoes.push({
    id: `med-obra-ba-${p.numero}`, obra_id: 'obra-ba', numero: p.numero, data_inicio: p.inicio, data_fim: p.fim, status: 'Planejando',
    valor_planejado: null, valor_medido: null, meta_batida: null, fechada_em: null,
  })
}

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
)
const subtarefa = (id, obraId, servico, texto, situacao, causa = null) => ({
  id, obra_id: obraId, semana: semana(0), servico_id: servico, texto, situacao, causa, causa_texto: '', criado_por: 'p-eng',
})
subtarefas.push(
  subtarefa('st-vn-1', 'obra-vn', 's-vn-4.2.1', 'Chapisco das paredes do 2º pavimento', SITUACAO_SUBTAREFA.feita),
  subtarefa('st-vn-2', 'obra-vn', 's-vn-4.2.1', 'Reboco da circulação', SITUACAO_SUBTAREFA.pendente),
  subtarefa('st-vn-3', 'obra-vn', 's-vn-4.2.1', 'Reboco das salas 201 a 204', SITUACAO_SUBTAREFA.pendente),
)

// Medição de empreiteiros de exemplo: as duas obras com contratos em todas as colunas, cada uma com um
// GLOBAL e um POR ESCOPO ativos, já com boletins. Na ARRECIFES: Gesso (global, R$ 30.000) e Drywall (por
// escopo, com os itens de forro do Orçamento dela). Acumulado e saldo batem com os boletins.
responsaveis.push({ id: 'r-ba-gesso', obra_id: 'obra-ba', nome: 'Gesso & Forros Recife', tipo: 'Empresa especializada', contato: '(81) 99999-0004', ativo: true })
const contrato = (id, obraId, resp, descricao, status, tipo = null, valorGlobal = null) => ({
  id, obra_id: obraId, responsavel_id: resp, descricao, status, tipo, valor_global: valorGlobal, criado_em: `${d(-30)}T10:00:00`,
})
contratosEmpreiteiro.push(
  contrato('ce-vn-1', 'obra-vn', 'r-pedra', 'Revestimento cerâmico das áreas molhadas', 'Em elaboração'),
  contrato('ce-vn-2', 'obra-vn', 'r-ponto', 'SPDA e aterramento', 'Enviado p/ aprovação'),
  contrato('ce-vn-3', 'obra-vn', 'r-ponto', 'Instalações elétricas: mão de obra', 'Aprovado / Ativo', 'Global', 30000),
  contrato('ce-vn-4', 'obra-vn', 'r-pedra', 'Alvenaria, contrapiso e tapume', 'Aprovado / Ativo', 'Por escopo'),
  contrato('ce-vn-5', 'obra-vn', 'r-pedra', 'Demolições internas', 'Concluído', 'Global', 6000),
  contrato('ce-ba-1', 'obra-ba', 'r-silva', 'Terraplenagem e escavação', 'Em elaboração'),
  contrato('ce-ba-2', 'obra-ba', 'r-silva', 'Pintura interna e externa', 'Enviado p/ aprovação'),
  contrato('ce-ba-3', 'obra-ba', 'r-ba-gesso', 'Gesso: revestimento de paredes e sancas', 'Aprovado / Ativo', 'Global', 30000),
  contrato('ce-ba-4', 'obra-ba', 'r-ba-gesso', 'Drywall: forros e sancas', 'Aprovado / Ativo', 'Por escopo'),
  contrato('ce-ba-5', 'obra-ba', 'r-silva', 'Locação e montagem do canteiro', 'Concluído', 'Global', 8500),
)
contratoItens.push(
  { id: 'ci-vn-4-1', obra_id: 'obra-vn', contrato_id: 'ce-vn-4', servico_id: 's-vn-3.1.4', quantidade: 1850, preco_unitario: 38 },
  { id: 'ci-vn-4-2', obra_id: 'obra-vn', contrato_id: 'ce-vn-4', servico_id: 's-vn-5.1.1', quantidade: 980, preco_unitario: 21 },
  { id: 'ci-vn-4-3', obra_id: 'obra-vn', contrato_id: 'ce-vn-4', servico_id: 's-vn-1.2.1', quantidade: 180, preco_unitario: 70 },
  // Drywall da ARRECIFES: placas (forro em drywall) 200 m² × R$ 80, forro resistente à umidade 200 m² × R$ 40
  // e sanca de gesso 50 m² × R$ 120 = R$ 30.000 (16.000 + 8.000 + 6.000).
  { id: 'ci-ba-4-1', obra_id: 'obra-ba', contrato_id: 'ce-ba-4', servico_id: 's-ba-15.10.1', quantidade: 200, preco_unitario: 80 },
  { id: 'ci-ba-4-2', obra_id: 'obra-ba', contrato_id: 'ce-ba-4', servico_id: 's-ba-15.10.3', quantidade: 200, preco_unitario: 40 },
  { id: 'ci-ba-4-3', obra_id: 'obra-ba', contrato_id: 'ce-ba-4', servico_id: 's-ba-15.10.2', quantidade: 50, preco_unitario: 120 },
)
boletinsEmpreiteiro.push(
  { id: 'be-vn-3-1', obra_id: 'obra-vn', contrato_id: 'ce-vn-3', numero: 1, data: d(-12), valor: 7500, criado_por: 'p-eng' },
  { id: 'be-vn-4-1', obra_id: 'obra-vn', contrato_id: 'ce-vn-4', numero: 1, data: d(-20), valor: 29100, criado_por: 'p-eng' },
  { id: 'be-vn-4-2', obra_id: 'obra-vn', contrato_id: 'ce-vn-4', numero: 2, data: d(-6), valor: 17300, criado_por: 'p-eng' },
  { id: 'be-vn-5-1', obra_id: 'obra-vn', contrato_id: 'ce-vn-5', numero: 1, data: d(-40), valor: 6000, criado_por: 'p-eng' },
  // ARRECIFES: Gesso com 1 boletim (30% = R$ 9.000); Drywall com 2 boletins; canteiro concluído (100%).
  { id: 'be-ba-3-1', obra_id: 'obra-ba', contrato_id: 'ce-ba-3', numero: 1, data: d(-8), valor: 9000, criado_por: 'p-eng' },
  { id: 'be-ba-4-1', obra_id: 'obra-ba', contrato_id: 'ce-ba-4', numero: 1, data: d(-15), valor: 8800, criado_por: 'p-eng' },
  { id: 'be-ba-4-2', obra_id: 'obra-ba', contrato_id: 'ce-ba-4', numero: 2, data: d(-4), valor: 7600, criado_por: 'p-eng' },
  { id: 'be-ba-5-1', obra_id: 'obra-ba', contrato_id: 'ce-ba-5', numero: 1, data: d(-35), valor: 8500, criado_por: 'p-eng' },
)
// Boletim 1: 600 m² de alvenaria (22.800) + 90 m de tapume (6.300). Boletim 2: 400 m² de alvenaria (15.200) + 100 m² de contrapiso (2.100).
boletimLinhas.push(
  { id: 'bl-vn-4-1-a', obra_id: 'obra-vn', boletim_id: 'be-vn-4-1', contrato_item_id: 'ci-vn-4-1', quantidade: 600, valor: 22800 },
  { id: 'bl-vn-4-1-b', obra_id: 'obra-vn', boletim_id: 'be-vn-4-1', contrato_item_id: 'ci-vn-4-3', quantidade: 90, valor: 6300 },
  { id: 'bl-vn-4-2-a', obra_id: 'obra-vn', boletim_id: 'be-vn-4-2', contrato_item_id: 'ci-vn-4-1', quantidade: 400, valor: 15200 },
  { id: 'bl-vn-4-2-b', obra_id: 'obra-vn', boletim_id: 'be-vn-4-2', contrato_item_id: 'ci-vn-4-2', quantidade: 100, valor: 2100 },
  // Drywall, boletim 1: 80 m² de placas (6.400) + 60 m² de forro RU (2.400) = 8.800.
  // Boletim 2: 50 m² de placas (4.000) + 30 m² de sanca (3.600) = 7.600. Acumulado 16.400 de 30.000; saldo 13.600.
  { id: 'bl-ba-4-1-a', obra_id: 'obra-ba', boletim_id: 'be-ba-4-1', contrato_item_id: 'ci-ba-4-1', quantidade: 80, valor: 6400 },
  { id: 'bl-ba-4-1-b', obra_id: 'obra-ba', boletim_id: 'be-ba-4-1', contrato_item_id: 'ci-ba-4-2', quantidade: 60, valor: 2400 },
  { id: 'bl-ba-4-2-a', obra_id: 'obra-ba', boletim_id: 'be-ba-4-2', contrato_item_id: 'ci-ba-4-1', quantidade: 50, valor: 4000 },
  { id: 'bl-ba-4-2-b', obra_id: 'obra-ba', boletim_id: 'be-ba-4-2', contrato_item_id: 'ci-ba-4-3', quantidade: 30, valor: 3600 },
)
