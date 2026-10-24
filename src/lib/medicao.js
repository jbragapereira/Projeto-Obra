// Regras da medição mensal. Texto das situações idêntico ao CHECK do banco.

export const SITUACOES_MEDICAO = ['Planejando', 'Em andamento', 'Fechada']

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

// Só uma medição em andamento por obra.
export function podeIniciar(medicoes, medicaoId) {
  const alvo = medicoes.find((m) => m.id === medicaoId)
  if (!alvo || alvo.status !== 'Planejando') return false
  return !medicoes.some((m) => m.status === 'Em andamento')
}
