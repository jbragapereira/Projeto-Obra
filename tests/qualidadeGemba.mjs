// Qualidade (src/lib/qualidade.js): Gemba Walk, observações de desperdício.
import {
  DESPERDICIOS, EM_ANDAMENTO, PENDENTE, RESOLVIDO, filtrarGemba, motivoParaNaoCancelarGemba, motivoParaNaoMoverGemba,
  ordenarGemba, rankingDesperdicios, validarObservacao, vencida,
} from '../src/lib/qualidade.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const HOJE = '2026-10-29' // quinta; a semana vai até 01/11 (domingo)
const o = (numero, status, prazo, desperdicios, extra = {}) => ({
  id: `g${numero}`, numero, status, prazo, desperdicios, local: '', descricao: '', causa_raiz: '', acao: '', cancelada: false, ...extra,
})
const lista = [
  o(1, PENDENTE, '2026-10-20', ['Retrabalho', 'Espera'], { local: 'Fachada', descricao: 'Reboco refeito' }),
  o(2, EM_ANDAMENTO, HOJE, ['Transporte'], { acao: 'Mudar a betoneira de lugar' }),
  o(3, PENDENTE, null, ['Espera', 'Movimentação']),
  o(4, RESOLVIDO, '2026-10-10', ['Retrabalho']),
  o(5, PENDENTE, '2026-10-31', ['Estoque']),
  o(6, PENDENTE, '2026-10-30', ['Retrabalho'], { cancelada: true }),
]

conferir('são os 7 desperdícios do Lean, na ordem', DESPERDICIOS.length, 7)
conferir('vencida: prazo passou e não resolvida; sem prazo não vence', lista.map((x) => vencida(x, HOJE)), [true, false, false, false, false, false])
conferir('ranking: do maior para o menor, sem as canceladas, empate na ordem da lista', rankingDesperdicios(lista), [
  { tipo: 'Retrabalho', n: 2 }, { tipo: 'Espera', n: 2 }, { tipo: 'Transporte', n: 1 }, { tipo: 'Movimentação', n: 1 }, { tipo: 'Estoque', n: 1 },
])
conferir('ranking vazio sem observações', rankingDesperdicios([]), [])
const ids = (l) => l.map((x) => x.numero)
conferir('filtro por tipo (sem as canceladas)', ids(filtrarGemba(lista, { tipo: 'Retrabalho' }, HOJE)), [1, 4])
conferir('filtro de prazo: vencidos, hoje, esta semana, sem prazo', [
  ids(filtrarGemba(lista, { prazo: 'Vencidos' }, HOJE)), ids(filtrarGemba(lista, { prazo: 'Hoje' }, HOJE)),
  ids(filtrarGemba(lista, { prazo: 'Esta semana' }, HOJE)), ids(filtrarGemba(lista, { prazo: 'Sem prazo' }, HOJE)),
], [[1], [2], [2, 5], [3]])
conferir('busca sem acento em local, descrição e ação', [ids(filtrarGemba(lista, { busca: 'fachada' }, HOJE)), ids(filtrarGemba(lista, { busca: 'BETONEIRA' }, HOJE))], [[1], [2]])
conferir('ordem: vencidas, pelo prazo, sem prazo no fim', ids(ordenarGemba(lista.slice(0, 5), HOJE)), [1, 4, 2, 5, 3])

const valida = { local: 'Laje', descricao: 'Bloco quebrado', acao: 'Conferir o descarregamento', desperdicios: ['Retrabalho'], responsavel_id: 'r1', prazo: null }
conferir('observação completa passa, prazo é opcional', validarObservacao(valida, ['r1'], HOJE), {})
conferir('sem local, descrição, ação, desperdício e responsável', Object.keys(validarObservacao({}, ['r1'], HOJE)), ['local', 'descricao', 'acao', 'desperdicios', 'responsavel_id'])
conferir('desperdício fora da lista e prazo antes do registro', validarObservacao({ ...valida, desperdicios: ['Atraso'], prazo: '2026-10-20' }, ['r1'], HOJE),
  { desperdicios: 'Desperdício desconhecido.', prazo: 'O prazo não pode ser antes do registro.' })
conferir('mover: anda para qualquer coluna, menos a mesma; cancelada não anda', [
  motivoParaNaoMoverGemba(lista[0], RESOLVIDO), motivoParaNaoMoverGemba(lista[3], PENDENTE), motivoParaNaoMoverGemba(lista[0], PENDENTE),
  motivoParaNaoMoverGemba(lista[5], EM_ANDAMENTO), motivoParaNaoMoverGemba(lista[0], 'Arquivada'),
], [null, null, 'A observação já está em Pendente.', 'Observação cancelada: reative para mexer.', 'Situação desconhecida.'])
conferir('cancelar pede motivo; cancelada não se cancela de novo', [
  motivoParaNaoCancelarGemba(lista[0], ' '), motivoParaNaoCancelarGemba(lista[0], 'Duplicada'), motivoParaNaoCancelarGemba(lista[5], 'x'),
], ['Diga por que está cancelando.', null, 'Esta observação já está cancelada.'])

console.log(`${ok}/${tot} — qualidade (Gemba Walk)`)
process.exit(ok === tot ? 0 : 1)
