// Materiais: o fluxo dos pedidos de material (Kanban). Cada card é um pedido/lote ("50 sacos de cimento"),
// não um item de estoque — controle de estoque do almoxarifado continua fora (PLANO, decisão de 26/10/2026).
// Regra pura, com teste em tests/materiais.mjs. Os textos são idênticos ao CHECK do banco.
import { addDias, diasEntre, segundaDaSemana } from './datas.js'

export const STATUS_PEDIDO = ['Solicitar', 'Em cotação', 'Comprado / a caminho', 'No almoxarifado', 'Entregue na frente']
export const [SOLICITAR, COTACAO, COMPRADO, ALMOXARIFADO, ENTREGUE] = STATUS_PEDIDO
export const PRIORIDADES_PEDIDO = ['Normal', 'Crítico']
export const [NORMAL, CRITICO] = PRIORIDADES_PEDIDO
// Categorias de material: cada obra cadastra as suas (Cadastro › Materiais), com a cor da etiqueta.
// Vermelho e âmbar ficam de fora: são de crítico, atrasado e alerta.
export const CORES_CATEGORIA = ['Azul', 'Verde', 'Roxo', 'Cinza']
// Toda obra nova nasce com estas categorias e este catálogo (salvarObra em dados.js; e os dados de exemplo).
export const CATEGORIAS_PADRAO = [['Material grosso', 'Azul'], ['Acabamento', 'Verde'], ['Instalações', 'Verde']]
export const CATALOGO_PADRAO = [
  ['Cimento CP-II 50 kg', 'saco', 'Material grosso'], ['Areia média', 'm³', 'Material grosso'], ['Brita 1', 'm³', 'Material grosso'],
  ['Bloco cerâmico 9×19×19', 'milheiro', 'Material grosso'], ['Vergalhão CA-50 10 mm', 'barra', 'Material grosso'],
  ['Argamassa AC-III 20 kg', 'saco', 'Acabamento'], ['Porcelanato 60×60', 'm²', 'Acabamento'], ['Tinta acrílica 18 L', 'lata', 'Acabamento'],
  ['Gesso em pó 40 kg', 'saco', 'Acabamento'], ['Tubo PVC esgoto 100 mm', 'barra', 'Instalações'],
  ['Cabo flexível 2,5 mm²', 'rolo', 'Instalações'], ['Eletroduto corrugado 25 mm', 'rolo', 'Instalações'],
]
// Classe da etiqueta (.pill) de cada cor.
export const classeDaCor = (cor) => `mat-cor-${(CORES_CATEGORIA.includes(cor) ? cor : 'Cinza').toLowerCase()}`

// A coluna ao lado (passo +1 avança, −1 volta), ou null se não há.
export const statusAoLado = (status, passo) => STATUS_PEDIDO[STATUS_PEDIDO.indexOf(status) + passo] ?? null
const posicao = (status) => STATUS_PEDIDO.indexOf(status)
// O movimento é para a frente?
export const avanca = (p, para) => posicao(para) > posicao(p.status)
// Avançar para Comprado, No almoxarifado ou Entregue abre formulário; voltar e cotar vão direto.
export const pedeFormulario = (p, para) => avanca(p, para) && [COMPRADO, ALMOXARIFADO, ENTREGUE].includes(para)
// Já chegou ao almoxarifado (está nele ou já foi entregue)?
const jaChegou = (p) => posicao(p.status) >= posicao(ALMOXARIFADO)

// Comprado com a previsão de entrega vencida e ainda não recebido.
export const atrasado = (p, hoje) => p.status === COMPRADO && !!p.previsao_entrega && p.previsao_entrega < hoje

// Chega esta semana (segunda a domingo de hoje), sem estar atrasado.
export function chegaEstaSemana(p, hoje) {
  if (p.status !== COMPRADO || !p.previsao_entrega || atrasado(p, hoje)) return false
  return p.previsao_entrega <= addDias(segundaDaSemana(hoje), 6)
}

// Data em que o pedido entrou na coluna atual (a última vez, se ele voltou e avançou de novo).
const entrouNaColuna = (p) => [...(p.historico ?? [])].reverse().find((h) => h.status === p.status)?.data ?? null

// Há quantos dias o pedido está na coluna em que está.
export function diasNaColuna(p, hoje) {
  const desde = entrouNaColuna(p)
  return desde ? Math.max(0, diasEntre(desde, hoje)) : 0
}

// Lead time: dias entre o pedido (Solicitar) e a chegada no almoxarifado, ou null se ainda não chegou.
// Voltou para Comprado e chegou de novo: vale a última chegada.
export function leadTime(p) {
  if (!jaChegou(p)) return null
  const h = p.historico ?? []
  const pedido = h.find((x) => x.status === SOLICITAR)?.data
  const chegou = [...h].reverse().find((x) => x.status === ALMOXARIFADO)?.data
  return pedido && chegou ? Math.max(0, diasEntre(pedido, chegou)) : null
}

// Contadores do topo do quadro.
export function contadores(pedidos, hoje) {
  return {
    cotacao: pedidos.filter((p) => p.status === COTACAO).length,
    semana: pedidos.filter((p) => chegaEstaSemana(p, hoje)).length,
    atrasados: pedidos.filter((p) => atrasado(p, hoje)).length,
  }
}

// O recebimento teve problema (quantidade não bate com a NF ou material avariado).
export const recebidoComProblema = (r) => !!r && (r.qtd_bate_nf === false || r.estado_ok === false)
// O que o card mostra do recebimento: só depois de chegar (voltou para Comprado, o checklist fica guardado mas
// não aparece). { problema, avarias }.
export const recebimentoNoCard = (p) => (jaChegou(p) && p.recebimento
  ? { problema: recebidoComProblema(p.recebimento), avarias: p.recebimento.avarias ?? '' }
  : { problema: false, avarias: '' })
// A frente que o card mostra: a de aplicação, depois de entregue; senão a que pediu.
export const frenteDoCard = (p) => (p.status === ENTREGUE && p.frente_aplicada ? p.frente_aplicada : p.frente)
// Ordem dentro da coluna: crítico primeiro, depois o que está há mais tempo nela.
export const ordenarColuna = (pedidos, hoje) => [...pedidos]
  .sort((a, b) => (b.prioridade === CRITICO) - (a.prioridade === CRITICO) || diasNaColuna(b, hoje) - diasNaColuna(a, hoje))

// Erros do pedido novo ({} = pode salvar). idsMateriais: o catálogo ativo desta obra.
export function validarPedido({ material_id, quantidade, frente, prioridade }, idsMateriais = []) {
  const e = {}
  if (!material_id || !idsMateriais.includes(material_id)) e.material_id = 'Escolha o material.'
  if (!(Number(quantidade) > 0)) e.quantidade = 'Informe a quantidade.'
  if (!frente?.trim()) e.frente = 'Informe a frente de serviço.'
  if (!PRIORIDADES_PEDIDO.includes(prioridade)) e.prioridade = 'Escolha a prioridade.'
  return e
}

// O que cada movimento pede: comprar pede fornecedor e previsão; receber, o checklist; entregar, a frente.
// Devolve os erros ({} = pode mover). dados: { fornecedor, previsao_entrega, recebimento, frente_aplicada }.
export function validarMovimento(p, para, dados = {}) {
  const e = {}
  if (!STATUS_PEDIDO.includes(para)) { e.status = 'Situação inválida.'; return e }
  if (Math.abs(STATUS_PEDIDO.indexOf(para) - STATUS_PEDIDO.indexOf(p.status)) !== 1) { e.status = 'Mova uma coluna por vez.'; return e }
  if (!avanca(p, para)) return e
  if (para === COMPRADO) {
    if (!dados.fornecedor?.trim()) e.fornecedor = 'Informe o fornecedor.'
    if (!dados.previsao_entrega) e.previsao_entrega = 'Informe a previsão de entrega.'
  }
  if (para === ALMOXARIFADO) {
    const r = dados.recebimento ?? {}
    if (typeof r.qtd_bate_nf !== 'boolean') e.qtd_bate_nf = 'Responda se a quantidade bate com a nota fiscal.'
    if (typeof r.estado_ok !== 'boolean') e.estado_ok = 'Responda se o material chegou em perfeito estado.'
  }
  if (para === ENTREGUE && !dados.frente_aplicada?.trim()) e.frente_aplicada = 'Confirme a frente de aplicação.'
  return e
}

// O pedido depois do movimento (sem mexer no original): grava {status, data} no histórico e o que o
// movimento pediu. Voltar uma coluna não apaga fornecedor nem recebimento.
export function aplicarMovimento(p, para, dados, hoje) {
  const novo = { ...p, status: para, historico: [...(p.historico ?? []), { status: para, data: hoje }] }
  if (!avanca(p, para)) return novo
  if (para === COMPRADO) Object.assign(novo, { fornecedor: dados.fornecedor.trim(), previsao_entrega: dados.previsao_entrega })
  if (para === ALMOXARIFADO) {
    const r = dados.recebimento
    novo.recebimento = { qtd_bate_nf: r.qtd_bate_nf, estado_ok: r.estado_ok, avarias: r.avarias?.trim() ?? '', foto_nf: r.foto_nf ?? null }
  }
  if (para === ENTREGUE) novo.frente_aplicada = dados.frente_aplicada.trim()
  return novo
}

// Nome sem repetir na obra (ignora maiúsculas e espaços nas pontas).
const repetido = (nome, existentes) => existentes.some((n) => n.trim().toLowerCase() === nome.toLowerCase())

// Erros da categoria nova ({} = pode salvar). nomesExistentes: as desta obra.
export function validarCategoria({ nome, cor }, nomesExistentes = []) {
  const e = {}
  const limpo = nome?.trim() ?? ''
  if (!limpo) e.nome = 'Informe o nome da categoria.'
  else if (repetido(limpo, nomesExistentes)) e.nome = 'Esta categoria já existe nesta obra.'
  if (!CORES_CATEGORIA.includes(cor)) e.cor = 'Escolha a cor da etiqueta.'
  return e
}

// Erros do material do catálogo ({} = pode salvar). nomesExistentes: os desta obra (não repete);
// idsCategorias: as categorias ativas desta obra.
export function validarMaterial({ nome, unidade, categoria_id }, nomesExistentes = [], idsCategorias = []) {
  const e = {}
  const limpo = nome?.trim() ?? ''
  if (!limpo) e.nome = 'Informe o nome do material.'
  else if (repetido(limpo, nomesExistentes)) e.nome = 'Este material já está cadastrado nesta obra.'
  if (!unidade?.trim()) e.unidade = 'Informe a unidade (saco, m³, barra…).'
  if (!categoria_id || !idsCategorias.includes(categoria_id)) e.categoria_id = 'Escolha a categoria.'
  return e
}
