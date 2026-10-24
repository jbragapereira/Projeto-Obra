// As contas do Painel do mês. Regra pura: sem React, sem banco, com teste em tests/painel.mjs.
// Cada lançamento aqui tem { data, quantidade, concluido }.
import { addDias, diasEntre } from './datas.js'

export const DIAS_PARA_PARADO = 5

// Ordem em que as situações aparecem no painel (a mais urgente primeiro).
export const ORDEM_SITUACAO = ['Parado', 'Atrasado', 'Atenção', 'Em dia', 'Concluído', 'Não iniciado']

export const COR_SITUACAO = {
  Parado: 'red', Atrasado: 'red', 'Atenção': 'amber', 'Em dia': 'ok', 'Concluído': 'done', 'Não iniciado': 'done',
}

const comAvanco = (lancs) => lancs.filter((l) => l.quantidade > 0)
const soma = (lancs) => lancs.reduce((a, l) => a + l.quantidade, 0)

export function ultimoAvanco(lancs) {
  const datas = comAvanco(lancs).map((l) => l.data).sort()
  return datas.length ? datas[datas.length - 1] : null
}

export function diasSemAvanco(lancs, hoje) {
  const u = ultimoAvanco(lancs)
  return u ? diasEntre(u, hoje) : null
}

// Média por dia trabalhado nos últimos 7 dias (hoje incluído). null = não trabalhou.
export function ritmoRecente(lancs, hoje) {
  const inicio = addDias(hoje, -6)
  const janela = comAvanco(lancs).filter((l) => l.data >= inicio && l.data <= hoje)
  if (!janela.length) return null
  return soma(janela) / new Set(janela.map((l) => l.data)).size
}

// A maior soma em qualquer janela de 7 dias seguidos.
export function melhorSemana(lancs) {
  const ls = comAvanco(lancs)
  let melhor = 0
  for (const l of ls) {
    const fim = addDias(l.data, 6)
    const s = soma(ls.filter((x) => x.data >= l.data && x.data <= fim))
    if (s > melhor) melhor = s
  }
  return melhor
}

// hoje + (o que falta ÷ ritmo). null = sem ritmo, sem previsão.
export function terminoPrevisto(falta, ritmo, hoje) {
  if (falta <= 0) return hoje
  if (!ritmo) return null
  return addDias(hoje, Math.ceil(falta / ritmo))
}

// Último dia em que ainda dá para cumprir o fim planejado, se a equipe
// voltar ao melhor ritmo semanal que já teve neste serviço.
export function dataLimiteDecisao(fimPlanejado, falta, semana) {
  if (!fimPlanejado || !semana) return null
  if (falta <= 0) return fimPlanejado
  return addDias(fimPlanejado, -Math.ceil(falta / (semana / 7)))
}

// A primeira regra que bater, nesta ordem.
export function situacao({ concluido, noMes, diasSem, termino, fimPlanejado, limite, hoje }) {
  if (concluido) return 'Concluído'
  if (diasSem === null && !noMes) return 'Não iniciado'
  if (diasSem === null || diasSem >= DIAS_PARA_PARADO) return 'Parado'
  if (termino && fimPlanejado && termino > fimPlanejado) return 'Atrasado'
  if (limite && hoje > limite) return 'Atenção'
  return 'Em dia'
}

// Junta tudo de um serviço. `item` é a linha da medição atual (ou null);
// o preço vem do item (congelado) e, sem item, do serviço. Sem preço = sem valores.
export function analisarServico({ servico, lancamentos, item, medicao, hoje }) {
  const lancs = lancamentos.filter((l) => l.servico_id === servico.id)
  const acumulado = soma(lancs)
  const falta = Math.max(0, servico.qtd_contratada - acumulado)
  const concluido = lancs.some((l) => l.concluido)
  const periodo = medicao
    ? lancs.filter((l) => l.data >= medicao.data_inicio && l.data <= medicao.data_fim)
    : []
  const executadoPeriodo = soma(periodo)
  const planejadoMes = item?.qtd_planejada ?? 0
  const noMes = planejadoMes > 0
  const diasSem = diasSemAvanco(lancs, hoje)
  const ritmo = ritmoRecente(lancs, hoje)
  const semana = melhorSemana(lancs)
  const termino = concluido ? null : terminoPrevisto(falta, ritmo, hoje)
  const limite = concluido ? null : dataLimiteDecisao(servico.data_fim_planejada, falta, semana)
  const preco = item?.preco_unitario ?? servico.preco_unitario
  const comValor = typeof preco === 'number'
  const valorPlanejado = comValor ? planejadoMes * preco : null
  const valorExecutado = comValor ? executadoPeriodo * preco : null
  return {
    servico, lancs, acumulado, falta, concluido, executadoPeriodo, planejadoMes, noMes,
    diasSem, ritmo, semana, termino, limite,
    valorPlanejado, valorExecutado,
    faltaValor: comValor ? Math.max(0, valorPlanejado - valorExecutado) : null,
    situacao: situacao({ concluido, noMes, diasSem, termino, fimPlanejado: servico.data_fim_planejada, limite, hoje }),
  }
}

// "A entrega ainda está de pé?" Só olha serviços críticos que já começaram ou estão no mês.
export function sinalEntrega(analises, dataEntrega) {
  const criticos = analises.filter(
    (a) => a.servico.critico && a.situacao !== 'Concluído' && a.situacao !== 'Não iniciado',
  )
  const vermelho = criticos.find((a) => a.situacao === 'Atrasado' && a.termino && a.termino > dataEntrega)
  if (vermelho) {
    return { cor: 'red', texto: 'Comprometida', motivo: `${vermelho.servico.descricao} termina depois da entrega no ritmo atual.` }
  }
  const amarelo = criticos.find((a) => ['Parado', 'Atenção', 'Atrasado'].includes(a.situacao))
  if (amarelo) {
    const porque = {
      Parado: amarelo.diasSem === null ? 'ainda não começou' : `parado há ${amarelo.diasSem} dias`,
      Atrasado: 'atrasado em relação ao fim planejado',
      'Atenção': 'passou da data limite de decisão',
    }[amarelo.situacao]
    return { cor: 'amber', texto: 'Em risco', motivo: `${amarelo.servico.descricao} (crítico) ${porque}.` }
  }
  return { cor: 'ok', texto: 'De pé', motivo: 'Todos os serviços críticos estão andando dentro do prazo.' }
}

export const FILTROS_PAINEL = {
  todos: () => true,
  parados: (a) => a.situacao === 'Parado',
  atrasados: (a) => a.situacao === 'Atrasado',
  atencao: (a) => a.situacao === 'Atenção',
  criticos: (a) => a.servico.critico,
}

// Mais urgente primeiro; dentro da mesma situação, o que mais pesa no dinheiro do mês
// (sem valores: o que está há mais dias sem avanço).
export function ordenarPainel(analises, comValores) {
  return [...analises].sort((a, b) =>
    ORDEM_SITUACAO.indexOf(a.situacao) - ORDEM_SITUACAO.indexOf(b.situacao) ||
    (comValores ? b.faltaValor - a.faltaValor : (b.diasSem ?? 999) - (a.diasSem ?? 999)))
}

export function totaisDoMes(analises) {
  const mes = analises.filter((a) => a.noMes)
  const planejado = mes.reduce((s, a) => s + (a.valorPlanejado ?? 0), 0)
  const executado = mes.reduce((s, a) => s + (a.valorExecutado ?? 0), 0)
  return { planejado, executado, falta: Math.max(0, planejado - executado) }
}
