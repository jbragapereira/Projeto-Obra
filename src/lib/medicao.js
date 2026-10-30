// Regras da medição mensal. Texto das situações idêntico ao CHECK do banco.
import { diasUteisEntre } from './calendario.js'
import { compararCodigos, paiDoCodigo } from './planejamento.js'
import { precoTotal, truncar2 } from './orcamento.js'
import { addDias, diasEntre, ehDeMesesInteiros, rotuloDoMes } from './datas.js'

export const SITUACOES_MEDICAO = ['Planejando', 'Em andamento', 'Fechada']
export const MEDICAO_FECHADA = SITUACOES_MEDICAO[2]

const centavos = (v) => Math.round(v * 100) / 100

// Ao passar para "Em andamento", a meta congela: quantidade e preço de cada
// item são copiados, para um aditivo depois não reescrever o mês.
export function congelarMeta(itens, precoPorServico) {
  const congelados = itens.map((i) => ({
    ...i,
    qtd_planejada_inicial: i.qtd_planejada,
    preco_unitario: precoPorServico[i.servico_id] ?? 0,
  }))
  const valor_planejado = centavos(congelados.reduce((a, i) => a + i.qtd_planejada * i.preco_unitario, 0))
  return { itens: congelados, valor_planejado }
}

export const bateuMeta = (planejado, medido) => planejado > 0 && medido >= planejado

// A pergunta de um ano: "em quais meses, e em quantos, a gente bateu a meta?"
export function resumoMetas(medicoes) {
  const fechadas = medicoes.filter((m) => m.status === 'Fechada')
  return { batidas: fechadas.filter((m) => m.meta_batida).length, total: fechadas.length }
}

// Descongelar: a medição em andamento volta para "Planejando", para replanejar (a meta deixa de valer até
// iniciar de novo). Fechada não descongela.
export const podeDescongelar = (medicao) => medicao?.status === 'Em andamento'

// Só uma medição em andamento por obra.
// E na ordem: só a medição de número mais baixo ainda em planejamento (a 5 não passa na frente da 1, e
// a 1 descongelada é iniciada de novo antes da 2).
export function podeIniciar(medicoes, medicaoId) {
  const alvo = medicoes.find((m) => m.id === medicaoId)
  if (!alvo || alvo.status !== 'Planejando') return false
  if (medicoes.some((m) => m.status === 'Planejando' && m.numero < alvo.numero)) return false
  return !medicoes.some((m) => m.status === 'Em andamento')
}

/* ── Medição pela EAP ── */

// Período da primeira medição: o mês vigente, do dia 1 ao último dia. hoje: 'AAAA-MM-DD'.
export function mesVigente(hoje) {
  const [a, m] = hoje.split('-').map(Number)
  const ultimo = new Date(a, m, 0).getDate()
  return { inicio: `${hoje.slice(0, 7)}-01`, fim: `${hoje.slice(0, 7)}-${String(ultimo).padStart(2, '0')}` }
}

// Período da próxima medição: começa no dia seguinte ao fim da anterior. Se começa no dia 1, é o mês
// inteiro (a Medição 1 é mês-calendário, então as seguintes também são); senão, 31 dias, como era.
export function periodoDaProxima(fimDaAnterior) {
  const inicio = addDias(fimDaAnterior, 1)
  return inicio.endsWith('-01') ? mesVigente(inicio) : { inicio, fim: addDias(inicio, 30) }
}

// Itens da medição tirados da EAP: todo item ativo cujo período na EAP cruza o período da medição.
// Quantidade planejada = quantidade vigente × (dias úteis do item dentro do período ÷ dias úteis do
// item), truncada em 2 casas e limitada ao saldo do item. Item sem saldo (já executado) fica de fora.
// servicos: os da obra (qtd_contratada = vigente); acumulado: { servico_id: executado ANTES do início do
// período } — o que o Diário lança dentro do mês não encolhe a meta do próprio mês.
// Devolve [{ servico_id, qtd_planejada }].
export function itensPelaEap({ servicos, periodo, cal, acumulado = {} }) {
  const saida = []
  for (const s of servicos) {
    const ini = s.data_inicio_planejada
    const fim = s.data_fim_planejada
    if (s.ativo === false || !ini || !fim || fim < ini || fim < periodo.inicio || ini > periodo.fim) continue
    const saldo = Math.max(0, (s.qtd_contratada ?? 0) - (acumulado[s.id] ?? 0))
    if (saldo <= 1e-9) continue
    const deDentro = { inicio: ini > periodo.inicio ? ini : periodo.inicio, fim: fim < periodo.fim ? fim : periodo.fim }
    let total = diasUteisEntre(ini, fim, cal)
    let noPeriodo = diasUteisEntre(deDentro.inicio, deDentro.fim, cal)
    if (!total) { total = diasEntre(ini, fim) + 1; noPeriodo = diasEntre(deDentro.inicio, deDentro.fim) + 1 } // só folga: dias corridos
    saida.push({ servico_id: s.id, qtd_planejada: Math.min(truncar2((s.qtd_contratada * noPeriodo) / total), truncar2(saldo)) })
  }
  return saida
}

// A medição em planejamento acompanha a EAP: compara os itens que ela tem com os que a EAP pede agora.
// Sai o que a EAP não pede mais; entra o que é novo; quem ficou recebe o preço e a quantidade da EAP,
// menos a quantidade ajustada à mão (essa a EAP não reescreve).
// atuais: [{ id, servico_id, qtd_planejada, ajustada }]; daEap: [{ servico_id, qtd_planejada, preco_unitario }].
// Devolve { sair: [id], entrar: [daEap], mudar: [{ id, qtd_planejada, preco_unitario }] }.
export function reconciliarItens(atuais, daEap) {
  const pedidos = new Set(daEap.map((n) => n.servico_id))
  const atualDe = Object.fromEntries(atuais.map((i) => [i.servico_id, i]))
  return {
    sair: atuais.filter((i) => !pedidos.has(i.servico_id)).map((i) => i.id),
    entrar: daEap.filter((n) => !atualDe[n.servico_id]),
    mudar: daEap.filter((n) => atualDe[n.servico_id]).map((n) => {
      const i = atualDe[n.servico_id]
      return { id: i.id, preco_unitario: n.preco_unitario, qtd_planejada: i.ajustada ? i.qtd_planejada : n.qtd_planejada }
    }),
  }
}

// As linhas da medição fatiada, na estrutura do Orçamento: só os grupos e subgrupos que têm item na
// medição. Cada item traz as colunas do Orçamento (P. Total = TRUNCAR(Quant. × P. Unit., 2)) e a fatia
// do mês (R$ = TRUNCAR(Qtd do mês × P. Unit., 2)); cada grupo soma as duas.
// itens: [{ servico_id, qtd (do mês), preco (P. Unit. da medição) }]; servicoDe: { id: serviço com
// qtd_contratada vigente e preco_unitario }; grupos: [{ codigo, nome }]. Em ordem de código:
// [{ tipo: 'grupo', codigo, nome, nivel, totalOrcamento, totalMes }] e
// [{ tipo: 'item', codigo, nivel, item, servico, totalOrcamento, totalMes }].
export function estruturaDaMedicao({ itens, servicoDe, grupos }) {
  const nomeDoGrupo = Object.fromEntries(grupos.map((g) => [g.codigo, g.nome]))
  const linhas = new Map()
  for (const item of itens) {
    const servico = servicoDe[item.servico_id]
    if (!servico) continue
    const totalOrcamento = precoTotal(servico.qtd_contratada ?? 0, servico.preco_unitario ?? 0)
    const totalMes = precoTotal(item.qtd ?? 0, item.preco ?? 0)
    linhas.set(servico.codigo, { tipo: 'item', codigo: servico.codigo, item, servico, totalOrcamento, totalMes })
    for (let pai = paiDoCodigo(servico.codigo); pai; pai = paiDoCodigo(pai)) {
      if (!linhas.has(pai)) linhas.set(pai, { tipo: 'grupo', codigo: pai, nome: nomeDoGrupo[pai] ?? `Grupo ${pai}`, totalOrcamento: 0, totalMes: 0 })
      const g = linhas.get(pai)
      g.totalOrcamento = centavos(g.totalOrcamento + totalOrcamento)
      g.totalMes = centavos(g.totalMes + totalMes)
    }
  }
  return [...linhas.values()]
    .map((l) => ({ ...l, nivel: String(l.codigo).split('.').length }))
    .sort((a, b) => compararCodigos(a.codigo, b.codigo))
}

/* ── Cronograma de medições do contrato ── */

// O contrato define quando as medições começam e onde termina a primeira (que pode juntar mais de um
// mês, como out + nov); daí em diante, uma medição por mês-calendário até o mês da entrega.
// inicio, fimPrimeira, entrega: 'AAAA-MM-DD'. Devolve [{ numero, inicio, fim }]; vazio sem os dados.
export function cronogramaDeMedicoes({ inicio, fimPrimeira, entrega }) {
  if (!inicio || !fimPrimeira || !entrega || fimPrimeira < inicio) return []
  const periodos = [{ numero: 1, inicio, fim: fimPrimeira }]
  const ultimoMes = entrega.slice(0, 7)
  for (let ini = addDias(fimPrimeira, 1); ini.slice(0, 7) <= ultimoMes;) {
    const fim = mesVigente(ini).fim
    periodos.push({ numero: periodos.length + 1, inicio: ini, fim })
    ini = addDias(fim, 1)
  }
  return periodos
}

// Erros dos campos do cronograma na ficha da obra ({} = ok). Os dois juntos, ou nenhum.
export function validarCronogramaDeMedicoes({ inicio, fimPrimeira, entrega }) {
  const e = {}
  if (!inicio && !fimPrimeira) return e
  if (!inicio) e.medicoes_inicio = 'Informe quando as medições começam.'
  if (!fimPrimeira) e.medicoes_fim_primeira = 'Informe o fim da primeira medição.'
  else if (inicio && fimPrimeira < inicio) e.medicoes_fim_primeira = 'O fim da primeira medição não pode ser antes do início.'
  else if (entrega && fimPrimeira > entrega) e.medicoes_fim_primeira = 'A primeira medição não pode passar da entrega.'
  return e
}

// Rótulo do período de uma medição no botão: os meses cobertos ("out/26 + nov/26", "dez/26") quando
// o período é feito de meses inteiros; senão, as datas ("10/10 a 15/11").
export function rotuloDoPeriodo(inicio, fim) {
  const meses = []
  for (let ini = inicio; ini <= fim; ini = addDias(mesVigente(ini).fim, 1)) meses.push(ini)
  if (!ehDeMesesInteiros(inicio, fim)) return `${inicio.slice(8, 10)}/${inicio.slice(5, 7)} a ${fim.slice(8, 10)}/${fim.slice(5, 7)}`
  return meses.map((m) => rotuloDoMes(m.slice(0, 7))).join(' + ')
}

// A medição de um dia: a que tem o dia dentro do período (em qualquer situação). É dela a meta que o
// cartão do Diário mostra para cada item. medicoes: [{ data_inicio, data_fim }]; dia: 'AAAA-MM-DD'.
export const medicaoDoDia = (medicoes, dia) => medicoes.find((m) => m.data_inicio <= dia && dia <= m.data_fim) ?? null

// A obra tem cronograma de medições no contrato (as medições nascem todas de uma vez)?
export const temCronograma = (obra) => !!obra?.medicoes_inicio

// A meta de um item na medição: a congelada (ao iniciar) quando existe; em planejamento, a que está sendo montada.
export const metaDoItem = (item) => item?.qtd_planejada_inicial ?? item?.qtd_planejada ?? 0

// O R$ que uma medição em planejamento está montando: soma dos P. Total truncados (Qtd × P. Unit.).
export const valorEmMontagem = (itens) => centavos(itens.reduce((s, i) => s + precoTotal(i.qtd_planejada ?? 0, i.preco_unitario ?? 0), 0))
