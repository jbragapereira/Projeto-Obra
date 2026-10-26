// Cronograma de medições do contrato (src/lib/medicao.js).
import { cronogramaDeMedicoes, medicaoDoDia, rotuloDoPeriodo, validarCronogramaDeMedicoes } from '../src/lib/medicao.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

// ARRECIFES: a primeira junta outubro e novembro de 2026; depois, um mês por medição até agosto de 2027.
const arrecifes = cronogramaDeMedicoes({ inicio: '2026-10-01', fimPrimeira: '2026-11-30', entrega: '2027-08-14' })
conferir('10 medições: out+nov/26, dez/26, jan/27 … ago/27', arrecifes.map((m) => [m.numero, m.inicio, m.fim]), [
  [1, '2026-10-01', '2026-11-30'], [2, '2026-12-01', '2026-12-31'], [3, '2027-01-01', '2027-01-31'], [4, '2027-02-01', '2027-02-28'],
  [5, '2027-03-01', '2027-03-31'], [6, '2027-04-01', '2027-04-30'], [7, '2027-05-01', '2027-05-31'], [8, '2027-06-01', '2027-06-30'],
  [9, '2027-07-01', '2027-07-31'], [10, '2027-08-01', '2027-08-31'],
])
conferir('primeira que termina no meio do mês: a segunda completa o mês',
  cronogramaDeMedicoes({ inicio: '2026-10-10', fimPrimeira: '2026-11-15', entrega: '2026-12-20' }).map((m) => [m.inicio, m.fim]),
  [['2026-10-10', '2026-11-15'], ['2026-11-16', '2026-11-30'], ['2026-12-01', '2026-12-31']])
conferir('sem os dados do contrato, sem cronograma', [cronogramaDeMedicoes({ inicio: '', fimPrimeira: '', entrega: '2027-08-14' }), cronogramaDeMedicoes({ inicio: '2026-11-01', fimPrimeira: '2026-10-31', entrega: '2027-08-14' })], [[], []])
conferir('validação: os dois juntos, fim depois do início e antes da entrega', [
  validarCronogramaDeMedicoes({ inicio: '', fimPrimeira: '', entrega: '2027-08-14' }),
  Object.keys(validarCronogramaDeMedicoes({ inicio: '2026-10-01', fimPrimeira: '', entrega: '2027-08-14' })),
  Object.keys(validarCronogramaDeMedicoes({ inicio: '2026-10-01', fimPrimeira: '2026-09-30', entrega: '2027-08-14' })),
  Object.keys(validarCronogramaDeMedicoes({ inicio: '2026-10-01', fimPrimeira: '2027-09-30', entrega: '2027-08-14' })),
], [{}, ['medicoes_fim_primeira'], ['medicoes_fim_primeira'], ['medicoes_fim_primeira']])

conferir('rótulo do botão: meses inteiros pelo nome, senão as datas', [rotuloDoPeriodo('2026-10-01', '2026-11-30'), rotuloDoPeriodo('2026-12-01', '2026-12-31'), rotuloDoPeriodo('2026-10-10', '2026-11-15')], ['out/26 + nov/26', 'dez/26', '10/10 a 15/11'])
const medicoesArrecifes = arrecifes.map((p) => ({ numero: p.numero, data_inicio: p.inicio, data_fim: p.fim }))
conferir('medição do dia: a que tem o dia no período, em qualquer situação; fora de todas, nenhuma',
  [medicaoDoDia(medicoesArrecifes, '2026-10-26')?.numero, medicaoDoDia(medicoesArrecifes, '2026-11-30')?.numero, medicaoDoDia(medicoesArrecifes, '2026-12-01')?.numero, medicaoDoDia(medicoesArrecifes, '2027-09-01')], [1, 1, 2, null])

console.log(`${ok}/${tot} — cronograma de medições`)
process.exit(ok === tot ? 0 : 1)
