// Previsão de faturamento por mês pela EAP (src/lib/previsaoMensal.js).
import { juntarPorMedicao, linhasPorMes, previstoPorMes, realizadoPorMes } from '../src/lib/previsaoMensal.js'
import { ehDeMesesInteiros, primeiroDoMesSeguinte, rotuloDoMes } from '../src/lib/datas.js'
import { CALENDARIO_PADRAO } from '../src/lib/calendario.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const cal = CALENDARIO_PADRAO
const item = (id, inicio, fim, qtd, preco, extra = {}) => ({ id, data_inicio_planejada: inicio, data_fim_planejada: fim, qtd_contratada: qtd, preco_unitario: preco, ativo: true, ...extra })

// 26/10 (seg) a 06/11 (sex): out tem 26–30 (5 dias úteis); nov tem 02 Finados (feriado), 03–06 (4). Total 9.
const a = previstoPorMes({ servicos: [item('a', '2026-10-26', '2026-11-06', 9, 100)], cal })
conferir('rateio pelos dias úteis de cada mês (feriado não conta)', a.porMes, { '2026-10': 500, '2026-11': 400 })
// R$ 1.000 em 3 dias úteis: 333,33 + 333,33 e o último mês leva a sobra.
const b = previstoPorMes({ servicos: [item('b', '2026-10-30', '2026-11-04', 1, 1000)], cal }) // sex 30/10; seg 02 feriado; ter 03, qua 04
conferir('centavos fecham no total do item', [b.porMes['2026-10'] + b.porMes['2026-11'], b.porMes], [1000, { '2026-10': 333.33, '2026-11': 666.67 }])
const c = previstoPorMes({ servicos: [item('c', null, null, 1, 50), item('d', '2026-10-26', '2026-10-26', 2, 10), item('e', '2026-10-26', '2026-10-26', 1, 999, { ativo: false }), { id: 'f', data_inicio_planejada: '2026-10-26', data_fim_planejada: '2026-10-26', qtd_contratada: 1, ativo: true }], cal })
conferir('sem datas fica de fora (e é somado à parte); arquivado e sem preço não contam', [c.totalComDatas, c.totalSemDatas, c.itensSemDatas, c.porMes], [20, 50, 1, { '2026-10': 20 }])
conferir('período só em fim de semana conta os dias corridos', previstoPorMes({ servicos: [item('g', '2026-10-24', '2026-10-25', 1, 100)], cal }).porMes, { '2026-10': 100 })

// Realizado
conferir('realizado: quantidade lançada × P. Unit., por mês da data do diário',
  realizadoPorMes({ lancamentos: [{ servico_id: 'a', quantidade: 2, data: '2026-10-27' }, { servico_id: 'a', quantidade: 1, data: '2026-11-03' }, { servico_id: 'x', quantidade: 5, data: '2026-11-03' }], servicos: [item('a', null, null, 9, 100)] }),
  { '2026-10': 200, '2026-11': 100 })

// Linhas
conferir('rótulo do mês', [rotuloDoMes('2026-10'), rotuloDoMes('2027-01')], ['out/26', 'jan/27'])
conferir('mês seguinte e meses inteiros', [primeiroDoMesSeguinte('2026-10-15'), primeiroDoMesSeguinte('2026-12-01'), ehDeMesesInteiros('2026-10-01', '2026-11-30'), ehDeMesesInteiros('2026-10-01', '2026-11-29'), ehDeMesesInteiros('2026-10-02', '2026-11-30')],
  ['2026-11-01', '2027-01-01', true, false, false])
const linhas = linhasPorMes({ previsto: { '2026-10': 500, '2027-01': 400 }, realizado: { '2026-11': 50 }, totalComDatas: 900 })
conferir('meses do primeiro ao último, sem buraco, com acumulado e %', linhas.map((l) => [l.rotulo, l.previsto, l.realizado, l.previstoAcumulado, Math.round(l.pctAcumulado * 100)]),
  [['out/26', 500, 0, 500, 56], ['nov/26', 0, 50, 500, 56], ['dez/26', 0, 0, 500, 56], ['jan/27', 400, 0, 900, 100]])
conferir('sem valores, sem linhas', linhasPorMes({ previsto: {}, realizado: {}, totalComDatas: 0 }), [])

// Obra que mede out + nov juntos: a previsão mostra uma linha só para a Medição 1, com a soma.
const porMes = linhasPorMes({ previsto: { '2026-10': 100, '2026-11': 200, '2026-12': 50 }, realizado: { '2026-10': 30, '2026-11': 10 }, totalComDatas: 350 })
const medicoesCt = [{ numero: 1, data_inicio: '2026-10-01', data_fim: '2026-11-30' }, { numero: 2, data_inicio: '2026-12-01', data_fim: '2026-12-31' }]
conferir('meses da mesma medição viram uma linha, com a soma e o acumulado do último mês',
  juntarPorMedicao(porMes, medicoesCt).map((l) => [l.rotulo, l.meses, l.medicao, l.previsto, l.realizado, l.previstoAcumulado]),
  [['out/26 + nov/26', ['2026-10', '2026-11'], 1, 300, 40, 300], ['dez/26', ['2026-12'], 2, 50, 0, 350]])
conferir('medição que não é de meses inteiros não junta nada',
  juntarPorMedicao(porMes, [{ numero: 1, data_inicio: '2026-10-03', data_fim: '2026-11-02' }]).map((l) => l.rotulo), ['out/26', 'nov/26', 'dez/26'])

console.log(`${ok}/${tot} — previsão de faturamento por mês`)
process.exit(ok === tot ? 0 : 1)
