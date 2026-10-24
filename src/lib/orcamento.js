// Orçamento da obra: as contas da planilha, os aditivos e o item novo.
// Regra pura, com teste em tests/orcamento.mjs.
//
// As contas seguem a planilha contratual: TRUNCAR, nunca arredondar.
//   P. Unit.  = TRUNCAR(C. Unit. × (1 + BDI), 2)
//   P. Total  = TRUNCAR(Quantidade × P. Unit., 2)
import { codigoValido, paiDoCodigo } from './planejamento.js'

// Fontes de preço aceitas (texto idêntico ao CHECK de servicos.fonte no banco).
export const FONTES = ['SINAPI', 'SICRO', 'COMPOSIÇÃO', 'COTAÇÃO']
// De onde veio a linha do orçamento (texto idêntico ao CHECK de servicos.origem).
export const ORIGENS_ITEM = { planilha: 'Planilha', novo: 'Item novo' }
// Crítico é marcado à mão (o MS Project está fora por enquanto). Texto idêntico ao CHECK de servicos.critico_origem.
export const CRITICO_A_MAO = 'À mão'
// Tipo do aditivo de quantidade (só na tela e na regra; no banco vira o sinal da quantidade).
export const TIPOS_ADITIVO = { acrescimo: 'acrescimo', supressao: 'supressao' }

// Trunca em 2 casas sem cair no erro do ponto flutuante (490 × 1,242 = 608,579999… → 608,58).
export const truncar2 = (x) => Math.trunc(Math.round(x * 1e6) / 1e4) / 100

// Soma de valores já truncados: só tira o resíduo do ponto flutuante.
const centavos = (x) => Math.round(x * 100) / 100

export const precoUnitario = (custo, bdi) => truncar2(custo * (1 + bdi))
export const precoTotal = (quantidade, preco) => truncar2(quantidade * preco)

// "2.1.1." → "2.1.1"; "2.0." (etapa) → "2". Como a planilha escreve o Item, e como o app guarda.
export const normalizarItem = (texto) => String(texto ?? '').trim().replace(/\.$/, '').replace(/\.0$/, '')

// Quantidade vigente = a do orçamento + a soma dos aditivos daquele item.
export function qtdVigente(qtdOrcada, aditivos = []) {
  return Math.round((qtdOrcada + aditivos.reduce((s, a) => s + a.quantidade, 0)) * 1000) / 1000
}

// Valor de uma linha: original (como orçado) e vigente (com aditivos). Item novo não tem valor original.
export function valoresDoItem(s) {
  if (typeof s.preco_unitario !== 'number') return null
  const vigente = s.ativo === false ? 0 : precoTotal(s.qtd_contratada, s.preco_unitario)
  const original = s.origem === ORIGENS_ITEM.novo ? 0 : precoTotal(s.qtd_orcada, s.preco_unitario)
  return { original, vigente }
}

// Totais do orçamento. Sem preço (equipe da obra), devolve null.
export function totaisDoOrcamento(servicos) {
  const v = servicos.map(valoresDoItem)
  if (!v.length || v.some((x) => x === null)) return null
  const original = centavos(v.reduce((s, x) => s + x.original, 0))
  const vigente = centavos(v.reduce((s, x) => s + x.vigente, 0))
  return { original, vigente, aditivos: centavos(vigente - original) }
}

// Subtotal (vigente) de cada grupo: { '2': 370686.17, '2.1': 92803.54, ... }
export function subtotaisPorGrupo(servicos) {
  const sub = {}
  for (const s of servicos) {
    const v = valoresDoItem(s)
    if (!v) return {}
    for (let g = paiDoCodigo(s.codigo); g; g = paiDoCodigo(g)) sub[g] = (sub[g] ?? 0) + v.vigente
  }
  for (const g of Object.keys(sub)) sub[g] = centavos(sub[g])
  return sub
}

// Peso de um item ou grupo no orçamento: o seu valor ÷ o total VIGENTE (original + aditivos), de 0 a 1.
export const pesoNoOrcamento = (valor, totalVigente) => (totalVigente > 0 ? (valor ?? 0) / totalVigente : 0)

/* ── Filtros da tela do Orçamento ── */

// comAditivo: Set dos ids de item que receberam aditivo. Arquivado só aparece no filtro "Arquivados".
export const FILTROS_ORCAMENTO = {
  todos: (s) => s.ativo !== false,
  aditivo: (s, comAditivo) => s.ativo !== false && comAditivo.has(s.id),
  novos: (s) => s.ativo !== false && s.origem === ORIGENS_ITEM.novo,
  criticos: (s) => s.ativo !== false && !!s.critico,
  arquivados: (s) => s.ativo === false,
}

// Só os grupos que contêm algum dos itens (para a lista filtrada não mostrar grupo vazio).
export function gruposDosItens(itens, grupos) {
  const usados = new Set()
  for (const s of itens) for (let g = paiDoCodigo(s.codigo); g; g = paiDoCodigo(g)) usados.add(g)
  return grupos.filter((g) => usados.has(g.codigo))
}

/* ── Aditivo de quantidade ── */

// Quantidades têm 3 casas: soma e subtração passam por aqui para não acumular resíduo do ponto flutuante.
export const arredondarQtd = (x) => Math.round(x * 1000) / 1000
const mil = arredondarQtd
const abaixoDoExecutado = (acumulado) => `Já foram executados ${acumulado.toLocaleString('pt-BR')}: a quantidade não pode ficar abaixo disso.`

// Uma mudança na quantidade vigente (aditivo novo, editado ou excluído) é aceita?
// Só recusa o que DIMINUI a vigente para baixo do executado ou de zero.
function conferirNovaVigente({ nova, vigenteAtual, acumulado }) {
  if (nova < 0) return 'A quantidade vigente ficaria negativa.'
  if (nova < vigenteAtual && nova < acumulado) return abaixoDoExecutado(acumulado)
  return null
}

// a: { numero, data, quantidade (positiva), tipo: 'acrescimo'|'supressao', motivo }
// vigente = a quantidade vigente SEM este aditivo; vigenteAtual = a de agora (na edição, com ele).
// Devolve { erros, quantidade } — a quantidade já com o sinal.
export function validarAditivo(a, { vigente, vigenteAtual = vigente, acumulado }) {
  const erros = {}
  if (!a.numero?.trim()) erros.numero = 'Informe o número do aditivo (ex.: 1º aditivo).'
  if (!a.data) erros.data = 'Informe a data do aditivo.'
  if (!(a.quantidade > 0)) erros.quantidade = 'Informe a quantidade.'
  if (!a.motivo?.trim()) erros.motivo = 'Informe o motivo.'
  const quantidade = a.tipo === TIPOS_ADITIVO.supressao ? -a.quantidade : a.quantidade
  if (!erros.quantidade) {
    const problema = conferirNovaVigente({ nova: mil(vigente + quantidade), vigenteAtual, acumulado })
    if (problema) erros.quantidade = problema
  }
  return { erros, quantidade }
}

// Excluir um aditivo desfaz a quantidade dele. Devolve o motivo da recusa, ou null.
export const podeExcluirAditivo = ({ aditivo, vigenteAtual, acumulado }) =>
  conferirNovaVigente({ nova: mil(vigenteAtual - aditivo.quantidade), vigenteAtual, acumulado })

// Item novo só é excluído se nunca recebeu lançamento nem foto; senão, arquiva.
export const podeExcluirItemNovo = ({ item, temLancamento, temFoto, planejadoNaMedicao = false }) => {
  if (item.origem !== ORIGENS_ITEM.novo) return 'Só item novo pode ser excluído. Item da planilha muda por aditivo.'
  if (temLancamento || temFoto) return 'Este item já tem lançamento no Diário. Use Arquivar.'
  if (planejadoNaMedicao) return 'Este item está planejado numa medição. Tire da medição ou use Arquivar.'
  return null
}

/* ── Item novo ── */

// Na correção do item novo, a quantidade incluída só desce até onde a vigente (incluída + aditivos)
// ainda cobre o executado. Se já está abaixo (executou demais), não deixa descer mais.
export const minimoDoItemNovo = ({ qtdOrcada, vigente, acumulado }) =>
  Math.min(qtdOrcada, mil(acumulado - (vigente - qtdOrcada)))

// i: { grupo, fonte, codigo_ref, descricao, unidade, quantidade, custo_unitario, bdi, aditivo_numero }
// Na edição: minimo = a menor quantidade aceita (executado − aditivos do item).
export function validarItemNovo(i, codigosDeGrupo, { minimo = 0, acumulado = 0 } = {}) {
  const erros = {}
  if (!i.grupo || !codigoValido(i.grupo) || !codigosDeGrupo.includes(i.grupo)) erros.grupo = 'Escolha o grupo onde o item entra.'
  if (!FONTES.includes(i.fonte)) erros.fonte = 'Escolha a fonte.'
  if (!i.descricao?.trim()) erros.descricao = 'Informe a descrição.'
  if (!i.unidade?.trim()) erros.unidade = 'Informe a unidade (M2, M3, UN…).'
  if (!(i.quantidade > 0)) erros.quantidade = 'Informe a quantidade.'
  else if (i.quantidade < minimo) erros.quantidade = abaixoDoExecutado(acumulado)
  if (!(i.custo_unitario > 0)) erros.custo_unitario = 'Informe o custo unitário.'
  if (!(i.bdi >= 0 && i.bdi < 1)) erros.bdi = 'Informe o BDI (entre 0% e 100%).'
  if (!i.aditivo_numero?.trim()) erros.aditivo_numero = 'Informe o aditivo que incluiu o item.'
  return erros
}
