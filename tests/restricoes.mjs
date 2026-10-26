// Médio prazo: semanas do quadro e restrições (src/lib/restricoes.js).
import {
  atividadeLiberada, atividadesDaSemana, moverSemana, restricaoVencida, semanaNoQuadro, semanasDoQuadro, validarRestricao, veioDeSemanaPassada, cartoesDaSemana, restricoesNaEap,
} from '../src/lib/restricoes.js'
import { segundaDaSemana } from '../src/lib/datas.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

// 24/10/2026 é sábado: a semana começa na segunda 19/10.
conferir('segunda da semana', [segundaDaSemana('2026-10-24'), segundaDaSemana('2026-10-19'), segundaDaSemana('2026-10-25')], ['2026-10-19', '2026-10-19', '2026-10-19'])
const semanas = semanasDoQuadro('2026-10-24', 4)
conferir('4 semanas a partir da semana de hoje', semanas.map((s) => [s.inicio, s.fim]), [['2026-10-19', '2026-10-25'], ['2026-10-26', '2026-11-01'], ['2026-11-02', '2026-11-08'], ['2026-11-09', '2026-11-15']])
conferir('6 semanas', semanasDoQuadro('2026-10-24', 6).length, 6)

// Atividades da semana: o período cruza a semana e ainda não terminou.
const itens = [
  { codigo: 'a', inicio: '2026-10-01', fim: '2026-10-20', real: 0.5 }, // cruza a 1ª semana (até terça)
  { codigo: 'b', inicio: '2026-10-26', fim: '2026-11-30', real: 0 }, // começa na 2ª
  { codigo: 'c', inicio: '2026-10-01', fim: '2026-12-31', real: 1 }, // já concluída
  { codigo: 'd', inicio: null, fim: null, real: 0 }, // sem datas
]
conferir('atividades da 1ª semana', atividadesDaSemana(itens, semanas[0]).map((n) => n.codigo), ['a'])
conferir('atividades da 2ª semana', atividadesDaSemana(itens, semanas[1]).map((n) => n.codigo), ['b'])

// Restrições
const aberta = { servico_id: 's1', semana: '2026-10-12', prazo: '2026-10-20', resolvida: false }
conferir('aberta de semana passada aparece na primeira semana', semanaNoQuadro(aberta, '2026-10-19'), '2026-10-19')
conferir('resolvida antes desta semana fica na semana dela', semanaNoQuadro({ ...aberta, resolvida: true, resolvida_em: '2026-10-16T10:00:00' }, '2026-10-19'), '2026-10-12')
conferir('resolvida nesta semana continua na primeira semana', semanaNoQuadro({ ...aberta, resolvida: true, resolvida_em: '2026-10-21T10:00:00' }, '2026-10-19'), '2026-10-19')
conferir('veio de semana passada: aberta, e resolvida nesta semana; não a resolvida antes', [veioDeSemanaPassada(aberta, '2026-10-19'), veioDeSemanaPassada({ ...aberta, resolvida: true, resolvida_em: '2026-10-21T10:00:00' }, '2026-10-19'), veioDeSemanaPassada({ ...aberta, resolvida: true, resolvida_em: '2026-10-16T10:00:00' }, '2026-10-19')], [true, true, false])
conferir('vencida: prazo passou sem resolver', [restricaoVencida(aberta, '2026-10-24'), restricaoVencida({ ...aberta, resolvida: true }, '2026-10-24'), restricaoVencida(aberta, '2026-10-20')], [true, false, false])
conferir('liberada = sem restrição aberta', [atividadeLiberada('s1', [aberta]), atividadeLiberada('s1', [{ ...aberta, resolvida: true }]), atividadeLiberada('s2', [aberta])], [false, true, true])
conferir('mover de semana', [moverSemana('2026-10-19', 1), moverSemana('2026-10-19', -1)], ['2026-10-26', '2026-10-12'])

// Cartões de uma coluna: as atividades previstas e as que têm restrição na semana, em ordem de código.
const sv = (id, codigo) => ({ id, codigo })
const noS1 = { servico: sv('s1', '2.1.1') }
const noS2 = { servico: sv('s2', '3.4.1') }
const noS9 = { servico: sv('s9', '1.1.1') }
const col = cartoesDaSemana({
  atividades: [noS2, noS1],
  itensComDatas: [noS1, noS2, noS9],
  // s7 tem restrição mas não tem datas na EAP: não vira cartão.
  restricoesDaSemana: [{ servico_id: 's1', resolvida: false }, { servico_id: 's9', resolvida: false }, { servico_id: 's7', resolvida: false }],
  todas: [{ servico_id: 's1', resolvida: false }, { servico_id: 's9', resolvida: false }, { servico_id: 's7', resolvida: false }],
})
conferir('cartões da coluna em ordem, com a restrição dentro, e a de fora do período marcada',
  col.map((c) => [c.servico.codigo, c.prevista, c.restricoes.length, c.liberada]), [['1.1.1', false, 1, false], ['2.1.1', true, 1, false], ['3.4.1', true, 0, true]])
conferir('o quadro só conta restrição de atividade com datas na EAP', restricoesNaEap([{ id: 'a', servico_id: 's1' }, { id: 'b', servico_id: 's7' }], [noS1, noS2]).map((r) => r.id), ['a'])
conferir('EAP sem datas, quadro vazio (nem restrição puxa cartão)',
  cartoesDaSemana({ atividades: [], itensComDatas: [], restricoesDaSemana: [{ servico_id: 's1', resolvida: false }], todas: [] }), [])

const r = { servico_id: 's1', tipo: 'Material', descricao: 'Bloco cerâmico em falta', semana: '2026-10-26', prazo: '2026-10-28', responsavel: 'Compras' }
conferir('restrição completa passa', validarRestricao(r), {})
conferir('semana precisa ser segunda', Object.keys(validarRestricao({ ...r, semana: '2026-10-27' })), ['semana'])
conferir('tipo fora da lista é recusado', Object.keys(validarRestricao({ ...r, tipo: 'Outro' })), ['tipo'])
conferir('vazia aponta os obrigatórios', Object.keys(validarRestricao({})).sort(), ['descricao', 'prazo', 'responsavel', 'semana', 'servico_id', 'tipo'])

console.log(`${ok}/${tot} — restrições (médio prazo)`)
process.exit(ok === tot ? 0 : 1)
