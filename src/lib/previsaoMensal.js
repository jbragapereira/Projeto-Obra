// Previsão de faturamento por mês pela EAP (cronograma físico-financeiro).
// O valor vigente de cada item (P. Total do Orçamento) é espalhado pelos dias úteis do período dele
// na EAP e somado por mês. Ao lado, o realizado: o que o Diário executou em cada mês, a preço do item.
// Regra pura, com teste em tests/previsaoMensal.mjs.
import { addDias, ehDeMesesInteiros, primeiroDoMesSeguinte, rotuloDoMes } from './datas.js'
import { ehDiaUtil } from './calendario.js'
import { precoTotal } from './orcamento.js'

const centavos = (x) => Math.round(x * 100) / 100

// servicos: os itens do Orçamento (com preço: só quem vê valores). cal: calendário da obra.
// Devolve { porMes: { 'AAAA-MM': valor }, totalComDatas, totalSemDatas, itensSemDatas }.
export function previstoPorMes({ servicos, cal }) {
  const porMes = {}
  let totalComDatas = 0
  let totalSemDatas = 0
  let itensSemDatas = 0
  for (const s of servicos) {
    if (s.ativo === false || typeof s.preco_unitario !== 'number') continue
    const total = precoTotal(s.qtd_contratada, s.preco_unitario)
    if (!s.data_inicio_planejada || !s.data_fim_planejada || s.data_fim_planejada < s.data_inicio_planejada) {
      totalSemDatas += total
      itensSemDatas++
      continue
    }
    // Dias de trabalho do período, contados por mês (período só de folga: conta os dias corridos).
    const diasPorMes = {}
    let uteis = 0
    for (let d = s.data_inicio_planejada; d <= s.data_fim_planejada; d = addDias(d, 1)) {
      if (ehDiaUtil(d, cal)) { diasPorMes[d.slice(0, 7)] = (diasPorMes[d.slice(0, 7)] ?? 0) + 1; uteis++ }
    }
    if (!uteis) {
      for (let d = s.data_inicio_planejada; d <= s.data_fim_planejada; d = addDias(d, 1)) { diasPorMes[d.slice(0, 7)] = (diasPorMes[d.slice(0, 7)] ?? 0) + 1; uteis++ }
    }
    // Rateio em centavos; o último mês leva a sobra, para o item fechar no total exato.
    const meses = Object.keys(diasPorMes).sort()
    let distribuido = 0
    meses.forEach((m, i) => {
      const valor = i === meses.length - 1 ? centavos(total - distribuido) : centavos((total * diasPorMes[m]) / uteis)
      distribuido = centavos(distribuido + valor)
      porMes[m] = centavos((porMes[m] ?? 0) + valor)
    })
    totalComDatas += total
  }
  return { porMes, totalComDatas: centavos(totalComDatas), totalSemDatas: centavos(totalSemDatas), itensSemDatas }
}

// Realizado por mês: quantidade lançada no Diário × P. Unit. do item. lancamentos têm `data`.
export function realizadoPorMes({ lancamentos, servicos }) {
  const preco = Object.fromEntries(servicos.filter((s) => typeof s.preco_unitario === 'number').map((s) => [s.id, s.preco_unitario]))
  const porMes = {}
  for (const l of lancamentos) {
    if (!l.data || preco[l.servico_id] == null) continue
    const m = l.data.slice(0, 7)
    porMes[m] = centavos((porMes[m] ?? 0) + precoTotal(l.quantidade, preco[l.servico_id]))
  }
  return porMes
}

// As linhas da tabela/gráfico, mês a mês (todos os meses entre o primeiro e o último que têm valor):
// [{ mes, rotulo, previsto, realizado, previstoAcumulado, pctAcumulado }]. pctAcumulado é sobre o total
// previsto com datas.
export function linhasPorMes({ previsto, realizado, totalComDatas }) {
  const chaves = [...new Set([...Object.keys(previsto), ...Object.keys(realizado)])].sort()
  if (!chaves.length) return []
  const linhas = []
  let acumulado = 0
  for (let m = chaves[0]; m <= chaves.at(-1);) {
    acumulado = centavos(acumulado + (previsto[m] ?? 0))
    linhas.push({
      mes: m, rotulo: rotuloDoMes(m), previsto: previsto[m] ?? 0, realizado: realizado[m] ?? 0,
      previstoAcumulado: acumulado, pctAcumulado: totalComDatas ? acumulado / totalComDatas : 0,
    })
    const [a, mm] = m.split('-').map(Number)
    m = mm === 12 ? `${a + 1}-01` : `${a}-${String(mm + 1).padStart(2, '0')}`
  }
  return linhas
}

// Na obra que mede por meses inteiros, a previsão segue as medições: os meses de uma mesma medição viram
// uma linha só (ex.: Medição 1 = "out/26 + nov/26", com a soma dos dois). Medição que não é de meses
// inteiros não junta nada. linhas: as de linhasPorMes; medicoes: [{ numero, data_inicio, data_fim }].
// Cada linha ganha meses (os 'AAAA-MM' que ela soma) e medicao (o número, quando juntou).
export function juntarPorMedicao(linhas, medicoes) {
  const medicaoDoMes = {}
  for (const m of medicoes) {
    if (!ehDeMesesInteiros(m.data_inicio, m.data_fim)) continue
    for (let d = m.data_inicio; d <= m.data_fim; d = primeiroDoMesSeguinte(d)) medicaoDoMes[d.slice(0, 7)] = m.numero
  }
  const saida = []
  for (const l of linhas) {
    const numero = medicaoDoMes[l.mes] ?? null
    const anterior = saida.at(-1)
    if (numero !== null && anterior?.medicao === numero) {
      Object.assign(anterior, {
        rotulo: `${anterior.rotulo} + ${l.rotulo}`, meses: [...anterior.meses, l.mes],
        previsto: centavos(anterior.previsto + l.previsto), realizado: centavos(anterior.realizado + l.realizado),
        previstoAcumulado: l.previstoAcumulado, pctAcumulado: l.pctAcumulado,
      })
    } else saida.push({ ...l, meses: [l.mes], medicao: numero })
  }
  return saida
}
