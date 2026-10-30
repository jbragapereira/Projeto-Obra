// Relatórios (o BI da obra): as séries prontas para os gráficos, a partir dos dados de cada módulo.
// Regra pura, com teste em tests/relatorios.mjs. Painel sem dado devolve null (a tela mostra "Sem dados
// ainda"), nunca NaN.
import { addDias, diasEntre, segundaDaSemana } from './datas.js'
import { previstoHoje } from './calendario.js'
import { achatarEap, acumuladoPorServico, aplicarPrazo, ehItem, montarEap, progressoDoGrupo } from './planejamento.js'
import { atividadesDaSemanaCurta, causasMaisFrequentes, ppc, realPorItem, semanasAnteriores } from './curtoPrazo.js'
import { CLIMAS, climaComChuva } from './diario.js'
import { MEDICAO_FECHADA } from './medicao.js'
import { ATIVO, CONCLUIDO, STATUS_CONTRATO } from './empreiteiros.js'
import { ALMOXARIFADO, CRITICO, STATUS_PEDIDO, atrasado, leadTime } from './materiais.js'
import { NC_FECHADA, SEVERIDADES_NC, pendenciaEmAberto, progressoVistoria, rankingDesperdicios } from './qualidade.js'

// Semanas do PPC no painel (as últimas, terminando na atual).
const SEMANAS_DE_PPC = 8
const semanaDe = (inicio) => ({ inicio, fim: addDias(inicio, 6) })
const pctInteiro = (x) => (x == null ? null : Math.round(x * 100))

// Os itens da EAP (folhas), com início, fim e progresso — a mesma árvore do Planejamento.
export function itensDaEap({ servicos, grupos, lancamentos, hoje, cal }) {
  const raizes = aplicarPrazo(montarEap({ servicos, grupos, acumulado: acumuladoPorServico(lancamentos) }), { hoje, cal })
  return achatarEap(raizes).filter(ehItem)
}

const valorDoItem = (n) => (typeof n.servico.preco_unitario === 'number' ? n.servico.preco_unitario * n.servico.qtd_contratada : undefined)
const comDatas = (itens) => itens.filter((n) => n.inicio && n.fim)

// Planejado e real da obra num dia (0 a 1), ponderados pelo valor de cada item (média simples sem valores,
// como no Planejamento). Só entram os itens com datas. real usa os lançamentos até o dia, inclusive.
function avancoNoDia(itens, lancamentos, dia, cal) {
  const acumulado = acumuladoPorServico(lancamentos, addDias(dia, 1))
  const real = (n) => (n.servico.qtd_contratada > 0 ? Math.min(1, (acumulado[n.servico.id] ?? 0) / n.servico.qtd_contratada) : 0)
  return {
    planejado: progressoDoGrupo(itens.map((n) => ({ progresso: previstoHoje({ inicio: n.inicio, fim: n.fim, hoje: dia, cal }), valor: valorDoItem(n) }))),
    real: progressoDoGrupo(itens.map((n) => ({ progresso: real(n), valor: valorDoItem(n) }))),
  }
}

// KPI EVOLUÇÃO: % real × % planejado hoje (inteiros) e a diferença em pontos. null sem datas na EAP.
export function evolucao({ itens, lancamentos, hoje, cal }) {
  const datados = comDatas(itens)
  if (!datados.length) return null
  const a = avancoNoDia(datados, lancamentos, hoje, cal)
  const real = pctInteiro(a.real)
  const planejado = pctInteiro(a.planejado)
  return { real, planejado, diferenca: real - planejado }
}

// CURVA S: um ponto por semana (segunda), do início mais cedo da EAP ao fim mais tarde (ou hoje, se passou).
// planejado e real acumulados em % (uma casa); real só até hoje (null depois). A semana de hoje mede os dois até hoje.
// desde (filtro de período): só as semanas que terminam a partir dele (os valores continuam acumulados).
export function curvaS({ itens, lancamentos, hoje, cal, desde = null }) {
  const datados = comDatas(itens)
  if (!datados.length) return null
  const inicio = segundaDaSemana(datados.map((n) => n.inicio).sort()[0])
  const ultimo = [hoje, ...datados.map((n) => n.fim)].sort().at(-1)
  const pontos = []
  for (let seg = inicio; seg <= ultimo; seg = addDias(seg, 7)) {
    const fimDaSemana = addDias(seg, 6)
    const dia = fimDaSemana < hoje || seg > hoje ? fimDaSemana : hoje // semana atual: planejado e real no mesmo dia
    const a = avancoNoDia(datados, lancamentos, dia, cal)
    const planejado = a.planejado
    const real = seg > hoje ? null : a.real
    pontos.push({ semana: seg, planejado: Math.round(planejado * 1000) / 10, real: real === null ? null : Math.round(real * 1000) / 10 })
  }
  return desde ? pontos.filter((p) => addDias(p.semana, 6) >= desde) : pontos
}

// KPI PRAZO: dias corridos de hoje até a entrega (negativo = passou). null sem data de entrega.
export const diasAteEntrega = (dataEntrega, hoje) => (dataEntrega ? diasEntre(hoje, dataEntrega) : null)

// KPI CUSTO MEDIDO: R$ das medições do cliente já fechadas. null quando o perfil não recebe valores.
export function custoMedido(medicoes) {
  const fechadas = medicoes.filter((m) => m.status === MEDICAO_FECHADA)
  if (fechadas.some((m) => typeof m.valor_medido !== 'number')) return null
  return { valor: Math.round(fechadas.reduce((s, m) => s + m.valor_medido, 0) * 100) / 100, medicoes: fechadas.length }
}

// PPC das últimas semanas (a mais antiga primeiro), com a mesma regra do Kanban do curto prazo: quem entra
// na semana se decide pelo progresso no começo dela. registros: semana_atividades da obra.
export function historicoPpc({ itens, registros, lancamentos, hoje, semanas = SEMANAS_DE_PPC }) {
  return semanasAnteriores(segundaDaSemana(hoje), semanas).map((seg) => {
    const { lista } = atividadesDaSemanaCurta({ itens, semana: semanaDe(seg), registros, realNoInicio: realPorItem(itens, acumuladoPorServico(lancamentos, seg)) })
    return { semana: seg, ...ppc(lista) }
  })
}

// PPC GERAL: concluídas ÷ planejadas somando as semanas (inteiro). null sem nenhuma atividade planejada.
export function ppcGeral(historico) {
  const total = historico.reduce((s, h) => s + h.total, 0)
  const concluidas = historico.reduce((s, h) => s + h.concluidas, 0)
  return total ? { concluidas, total, valor: Math.round((concluidas / total) * 100) } : null
}

/* ── Ritmo e produção ── */

// Dias de diário no gráfico de clima e efetivo (os últimos lançados).
export const DIAS_DE_CLIMA = 15

// PPC SEMANAL: uma barra por semana, concluídas (verde) em cima das não concluídas (vermelho).
// null quando nenhuma semana teve atividade planejada.
export function barrasPpc(historico) {
  if (!historico.some((h) => h.total)) return null
  return historico.map((h) => ({
    semana: h.semana, concluidas: h.concluidas, naoConcluidas: h.total - h.concluidas, total: h.total,
    valor: h.total ? Math.round((h.concluidas / h.total) * 100) : null,
  }))
}

// PARETO DE CAUSAS: as causas das atividades e subtarefas não realizadas nas mesmas semanas do PPC, da
// mais frequente para a menos, com a % de cada uma e a % acumulada. null sem nenhuma causa.
export function paretoCausas({ registros, subtarefas, hoje, semanas = SEMANAS_DE_PPC }) {
  const atual = segundaDaSemana(hoje)
  const lista = causasMaisFrequentes({ registros, subtarefas, desde: semanasAnteriores(atual, semanas)[0], ate: atual })
  if (!lista.length) return null
  const total = lista.reduce((s, c) => s + c.n, 0)
  let soma = 0
  return lista.map((c) => {
    soma += c.n
    return { ...c, pct: Math.round((c.n / total) * 100), acumulado: Math.round((soma / total) * 100) }
  })
}

// O clima do dia é o pior entre manhã e tarde (na ordem de CLIMAS: Bom < Nublado < Chuva < Chuva forte).
const climaDoDia = (d) => [d.clima_manha, d.clima_tarde].filter((c) => CLIMAS.includes(c)).sort((a, b) => CLIMAS.indexOf(b) - CLIMAS.indexOf(a))[0] ?? null

// O ícone de cada clima no gráfico (texto do clima vem de CLIMAS, dono em diario.js).
const ICONE_DO_CLIMA = Object.fromEntries(CLIMAS.map((c, i) => [c, ['sol', 'nuvem', 'chuva', 'chuva-forte'][i]]))

// CLIMA E EFETIVO: os últimos diários (o mais antigo primeiro), com o efetivo do dia (pessoas somadas),
// o clima e se choveu. null sem diário.
export function climaEfetivo(diarios, dias = DIAS_DE_CLIMA) {
  if (!diarios.length) return null
  return [...diarios].sort((a, b) => a.data.localeCompare(b.data)).slice(-dias).map((d) => ({
    data: d.data, efetivo: (d.efetivo ?? []).reduce((s, e) => s + (e.quantidade ?? 0), 0), clima: climaDoDia(d), icone: ICONE_DO_CLIMA[climaDoDia(d)] ?? null, chuva: climaComChuva(d),
  }))
}

/* ── Contratos e medições (empreiteiros) ── */

// FLUXO DOS CONTRATOS: quantos e quanto (R$) em cada etapa. Contrato ainda sem valor conta, mas soma R$ 0
// (semValor diz quantos). null sem contrato.
export function fluxoContratos(contratos) {
  if (!contratos.length) return null
  return STATUS_CONTRATO.map((status) => {
    const daEtapa = contratos.filter((c) => c.status === status)
    return {
      status, n: daEtapa.length, valor: daEtapa.reduce((s, c) => s + (c.valor_total ?? 0), 0),
      semValor: daEtapa.filter((c) => c.valor_total == null).length,
    }
  })
}

// Só os contratos fechados (aprovados/ativos e concluídos) entram na conta do que ainda vai sair do caixa.
const fechados = (contratos) => contratos.filter((c) => (c.status === ATIVO || c.status === CONCLUIDO) && c.valor_total > 0)

// MATRIZ DE EMPREITEIROS: por empreiteiro, o valor dos contratos fechados, o medido, a % medida e o saldo a
// medir; do maior valor para o menor. null sem contrato fechado.
export function matrizEmpreiteiros(contratos) {
  const por = {}
  for (const c of fechados(contratos)) {
    const x = (por[c.responsavel_id] ??= { responsavel_id: c.responsavel_id, empreiteiro: c.empreiteiro, contratos: 0, valor: 0, medido: 0 })
    x.contratos++
    x.valor += c.valor_total
    x.medido += c.medido_valor ?? 0
  }
  const lista = Object.values(por)
  if (!lista.length) return null
  return lista
    .map((x) => ({ ...x, pct: Math.round((x.medido / x.valor) * 100), saldo: Math.max(0, x.valor - x.medido) }))
    .sort((a, b) => b.valor - a.valor || a.empreiteiro.localeCompare(b.empreiteiro, 'pt-BR'))
}

// SALDO A MEDIR POR CONTRATO: os contratos ativos com saldo, do maior saldo para o menor. null sem nenhum.
export function saldoPorContrato(contratos) {
  const lista = fechados(contratos)
    .filter((c) => c.status === ATIVO)
    .map((c) => ({ id: c.id, descricao: c.descricao, empreiteiro: c.empreiteiro, saldo: Math.max(0, c.valor_total - (c.medido_valor ?? 0)) }))
    .filter((c) => c.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo)
  return lista.length ? lista : null
}

/* ── Materiais (pedidos do Kanban) ── */

// Semanas do gráfico de tendência do lead time (as últimas, terminando na atual).
export const SEMANAS_DE_LEAD_TIME = 4

// PEDIDOS POR ETAPA: quantos em cada coluna do Kanban. null sem pedido.
export const pedidosPorEtapa = (pedidos) => (pedidos.length ? STATUS_PEDIDO.map((status) => ({ status, n: pedidos.filter((p) => p.status === status).length })) : null)

// ATRASADOS: comprados com a previsão de entrega vencida, do mais atrasado para o menos.
export const pedidosAtrasados = (pedidos, hoje) => pedidos
  .filter((p) => atrasado(p, hoje))
  .map((p) => ({ id: p.id, material: p.material, frente: p.frente, critico: p.prioridade === CRITICO, dias: diasEntre(p.previsao_entrega, hoje) }))
  .sort((a, b) => b.dias - a.dias)

// Dia em que o pedido chegou ao almoxarifado (a última chegada, como no lead time).
const chegada = (p) => [...(p.historico ?? [])].reverse().find((h) => h.status === ALMOXARIFADO)?.data ?? null
const media = (xs) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null)

// LEAD TIME MÉDIO (dias, uma casa) dos pedidos que já chegaram (a partir de 'desde', se vier), e quantos entraram
// na conta. null se nenhum chegou.
export function leadTimeMedio(pedidos, desde = null) {
  const tempos = pedidos.filter((p) => !desde || (chegada(p) ?? '') >= desde).map(leadTime).filter((x) => x !== null)
  return tempos.length ? { dias: media(tempos), pedidos: tempos.length } : null
}

// TENDÊNCIA: lead time médio dos pedidos que chegaram em cada uma das últimas semanas (null na semana sem
// chegada). null se nenhum pedido chegou nessas semanas.
export function tendenciaLeadTime(pedidos, hoje, semanas = SEMANAS_DE_LEAD_TIME) {
  const lista = semanasAnteriores(segundaDaSemana(hoje), semanas).map((seg) => {
    const tempos = pedidos.filter((p) => { const c = chegada(p); return c && segundaDaSemana(c) === seg }).map(leadTime).filter((x) => x !== null)
    return { semana: seg, dias: media(tempos), pedidos: tempos.length }
  })
  return lista.some((s) => s.pedidos) ? lista : null
}

/* ── Qualidade e entrega ── */

// Quantas fatias o donut de empresas mostra antes de juntar o resto em "Outras".
const FATIAS_EMPRESA = 4
// Abaixo disto, a barra da ficha de FVS fica vermelha (o serviço está errando e gerando retrabalho).
export const CONFORMIDADE_MINIMA = 80

// % CONFORME POR FICHA DE FVS: OK ÷ (OK + NC) somando as vistorias de cada ficha, da pior para a melhor.
// Ficha só com N.A. ou pendentes fica de fora. null sem nenhuma.
export function conformidadePorModelo(vistorias) {
  const por = {}
  for (const v of vistorias) {
    const p = progressoVistoria(v.grupos, v.respostas)
    const x = (por[v.modelo_id] ??= { modelo_id: v.modelo_id, ficha: `${v.codigo_modelo} ${v.nome_modelo}`, ok: 0, nc: 0, vistorias: 0 })
    x.ok += p.ok
    x.nc += p.nc
    x.vistorias++
  }
  const lista = Object.values(por).filter((x) => x.ok + x.nc)
    .map((x) => { const pct = Math.round((x.ok / (x.ok + x.nc)) * 100); return { ...x, pct, baixa: pct < CONFORMIDADE_MINIMA } })
    .sort((a, b) => a.pct - b.pct || a.ficha.localeCompare(b.ficha, 'pt-BR'))
  return lista.length ? lista : null
}

// PENDÊNCIAS POR EMPRESA (as em aberto): fatias do donut, da maior para a menor; depois de FATIAS_EMPRESA,
// o resto vira "Outras". pct inteiro. null sem pendência em aberto.
export function pendenciasPorEmpresa(pendencias) {
  const por = {}
  for (const p of pendencias.filter(pendenciaEmAberto)) (por[p.empresa_id] ??= { id: p.empresa_id, nome: p.empresa, n: 0 }).n++
  const lista = Object.values(por).sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, 'pt-BR'))
  if (!lista.length) return null
  const total = lista.reduce((s, x) => s + x.n, 0)
  const fatias = lista.length > FATIAS_EMPRESA + 1
    ? [...lista.slice(0, FATIAS_EMPRESA), { id: 'outras', nome: 'Outras', n: lista.slice(FATIAS_EMPRESA).reduce((s, x) => s + x.n, 0) }]
    : lista
  return fatias.map((x) => ({ ...x, pct: Math.round((x.n / total) * 100) }))
}

// MAPA POR LOCAL (as pendências em aberto): um bloco por local, do maior para o menor. null sem nenhuma.
export function pendenciasPorLocal(pendencias) {
  const por = {}
  for (const p of pendencias.filter(pendenciaEmAberto)) por[p.local] = (por[p.local] ?? 0) + 1
  const lista = Object.entries(por).map(([local, n]) => ({ local, n })).sort((a, b) => b.n - a.n || a.local.localeCompare(b.local, 'pt-BR'))
  return lista.length ? lista : null
}

// NÃO CONFORMIDADES EM ABERTO (não fechadas): quantas e quantas da severidade mais alta. null sem nenhuma.
export function ncsEmAberto(ncs) {
  const abertas = ncs.filter((n) => n.status !== NC_FECHADA)
  return abertas.length ? { total: abertas.length, alta: abertas.filter((n) => n.severidade === SEVERIDADES_NC.at(-1)).length } : null
}

// RANKING DE DESPERDÍCIOS (Gemba): o mesmo da aba Gemba Walk. null sem observação.
export const desperdiciosDoGemba = (observacoes) => {
  const r = rankingDesperdicios(observacoes)
  return r.length ? r : null
}

/* ── Filtros cruzados: empresa e período, valendo para todos os painéis ── */

export const PERIODOS = ['Tudo', 'Este mês', 'Últimas 4 semanas']
export const [TUDO] = PERIODOS
const [, ESTE_MES, ULTIMAS_4] = PERIODOS

// A janela de cada período: desde (null = sem limite) e quantas semanas de PPC entram.
export function janelaDoPeriodo(periodo, hoje) {
  const atual = segundaDaSemana(hoje)
  if (periodo === ESTE_MES) {
    const desde = `${hoje.slice(0, 7)}-01`
    return { desde, semanas: diasEntre(segundaDaSemana(desde), atual) / 7 + 1 }
  }
  if (periodo === ULTIMAS_4) return { desde: addDias(atual, -21), semanas: 4 }
  return { desde: null, semanas: SEMANAS_DE_PPC }
}

// Os dados de cada módulo recortados pela empresa (responsavel_id; '' = todas) e pelo período.
// Empresa: serviços dela (e o que vem deles: lançamentos, Kanban, subtarefas), o efetivo dela no diário,
// os contratos dela, as pendências em que ela corrige, as NCs e as observações dela. Os pedidos de
// material e as vistorias não têm empresa; as medições do cliente são da obra toda.
// Período: diários, vistorias e observações a partir do início da janela; o PPC usa as semanas da janela; o
// lead time conta as chegadas da janela (leadTimeMedio). Pedidos, pendências, NCs e contratos são a situação
// de hoje: o período não os esconde (um pedido atrasado antigo continua atrasado).
export function recortarDados(dados, { responsavel_id = '', periodo = TUDO } = {}, hoje) {
  const { desde } = janelaDoPeriodo(periodo, hoje)
  const naJanela = (data) => !desde || (!!data && data >= desde)
  const daEmpresa = (id) => !responsavel_id || id === responsavel_id
  const servicos = dados.servicos.filter((s) => daEmpresa(s.responsavel_id))
  const ids = new Set(servicos.map((s) => s.id))
  return {
    ...dados,
    servicos,
    lancamentos: dados.lancamentos.filter((l) => ids.has(l.servico_id)),
    semanaAtividades: dados.semanaAtividades.filter((r) => ids.has(r.servico_id)),
    subtarefas: dados.subtarefas.filter((s) => ids.has(s.servico_id)),
    diarios: dados.diarios.filter((d) => naJanela(d.data)).map((d) => ({ ...d, efetivo: (d.efetivo ?? []).filter((e) => daEmpresa(e.responsavel_id)) })),
    contratos: dados.contratos.filter((c) => daEmpresa(c.responsavel_id)),
    pendencias: dados.pendencias.filter((p) => daEmpresa(p.empresa_id)),
    vistorias: dados.vistorias.filter((v) => naJanela(v.iniciada_em)),
    ncs: dados.ncs.filter((n) => daEmpresa(n.responsavel_id)),
    observacoes: dados.observacoes.filter((o) => daEmpresa(o.responsavel_id) && naJanela(o.registrado_em)),
  }
}

// Os filtros ativos, em texto (cabeçalho do relatório executivo). nomeDe: { id: nome }.
export function descreverFiltrosBi({ responsavel_id = '', periodo = TUDO } = {}, nomeDe = {}) {
  const partes = [`Período: ${periodo}`]
  partes.push(responsavel_id ? `Empresa: ${nomeDe[responsavel_id] ?? '—'}` : 'Todas as empresas')
  return partes.join('; ')
}
