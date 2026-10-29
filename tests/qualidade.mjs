// Qualidade (src/lib/qualidade.js): pendências de vistoria.
import {
  CANCELADAS, EM_ANDAMENTO, PENDENTE, RESOLVIDO, abertasPorResponsavel, camposAlterados, descreverFiltros, motivoParaNaoAlterar, motivoParaNaoCancelar, anexarObservacao, filtrarPendencias, kpisPendencias,
  motivoParaNaoAvancar, ordenarPendencias, proximaSituacao, proximoNumero, validarPendencia, vencida,
} from '../src/lib/qualidade.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const HOJE = '2026-10-29' // quinta; a semana vai até 01/11 (domingo)
const p = (numero, status, prazo, extra = {}) => ({ id: `p${numero}`, numero, status, prazo, responsavel_id: 'r1', descricao: '', local: '', ...extra })
const lista = [
  p(1, PENDENTE, '2026-10-20', { descricao: 'Fissura na alvenaria', local: 'Fachada norte' }),
  p(2, EM_ANDAMENTO, HOJE, { responsavel_id: 'r2', local: 'Banheiro acessível', pavimento: 'Térreo' }),
  p(3, PENDENTE, '2026-10-31', { responsavel_id: 'r2', descricao: 'Rejunte falhado' }),
  p(4, RESOLVIDO, '2026-10-10'),
  p(5, PENDENTE, '2026-11-10'),
]

conferir('vencida: prazo passou e não resolvida (hoje ainda não vence)', lista.map((x) => vencida(x, HOJE)), [true, false, false, false, false])
conferir('fluxo: Pendente → Em andamento → Resolvido', [proximaSituacao(PENDENTE), proximaSituacao(EM_ANDAMENTO), proximaSituacao(RESOLVIDO)], [EM_ANDAMENTO, RESOLVIDO, null])
conferir('próximo número', [proximoNumero([]), proximoNumero(lista)], [1, 6])
conferir('KPIs', kpisPendencias(lista), { total: 5, pendentes: 3, andamento: 1, resolvidos: 1 })
conferir('em aberto por responsável, da maior para a menor (sem as resolvidas)', abertasPorResponsavel(lista, { r1: 'Pedra Firme', r2: 'Ponto Certo' }),
  [{ id: 'r1', nome: 'Pedra Firme', n: 2 }, { id: 'r2', nome: 'Ponto Certo', n: 2 }])
const ids = (l) => l.map((x) => x.numero)
conferir('filtro de prazo: atrasados, hoje, esta semana', [
  ids(filtrarPendencias(lista, { prazo: 'Atrasados' }, HOJE)), ids(filtrarPendencias(lista, { prazo: 'Hoje' }, HOJE)), ids(filtrarPendencias(lista, { prazo: 'Esta semana' }, HOJE)),
], [[1], [2], [2, 3]])
conferir('filtros de prazo deixam de fora a resolvida (prazo hoje ou na semana)', [
  ids(filtrarPendencias([...lista, p(6, RESOLVIDO, HOJE)], { prazo: 'Hoje' }, HOJE)), ids(filtrarPendencias([...lista, p(6, RESOLVIDO, HOJE)], { prazo: 'Todos' }, HOJE)).includes(6),
], [[2], true])
conferir('filtro de situação, responsável e busca sem acento (descrição, local, pavimento)', [
  ids(filtrarPendencias(lista, { status: PENDENTE, responsavel_id: 'r2' }, HOJE)),
  ids(filtrarPendencias(lista, { busca: 'banheiro acessivel' }, HOJE)), ids(filtrarPendencias(lista, { busca: 'TÉRREO' }, HOJE)), ids(filtrarPendencias(lista, { busca: 'fissura' }, HOJE)),
], [[3], [2], [2], [1]])
conferir('ordem da grade: vencidas, depois pelo prazo, resolvidas no fim', ids(ordenarPendencias(lista, HOJE)), [1, 2, 3, 5, 4])

const valida = { descricao: 'Fissura', local: 'Fachada', empresa_id: 'r1', responsavel_id: 'r2', data_vistoria: HOJE, prazo: '2026-11-05' }
conferir('pendência nova: obrigatórios, vistoria sem data futura, prazo depois da vistoria', [
  Object.keys(validarPendencia({ descricao: ' ', local: '', empresa_id: 'x', responsavel_id: '', data_vistoria: '', prazo: '' }, ['r1', 'r2'], HOJE)),
  Object.keys(validarPendencia({ ...valida, data_vistoria: '2026-10-30' }, ['r1', 'r2'], HOJE)),
  Object.keys(validarPendencia({ ...valida, prazo: '2026-10-01' }, ['r1', 'r2'], HOJE)),
  validarPendencia(valida, ['r1', 'r2'], HOJE),
], [['descricao', 'local', 'empresa_id', 'responsavel_id', 'data_vistoria', 'prazo'], ['data_vistoria'], ['prazo'], {}])
conferir('avançar: uma etapa por vez; resolver pede a foto da correção', [
  motivoParaNaoAvancar({ status: PENDENTE }, RESOLVIDO), motivoParaNaoAvancar({ status: EM_ANDAMENTO }, RESOLVIDO),
  motivoParaNaoAvancar({ status: EM_ANDAMENTO }, RESOLVIDO, { foto_evidencia: { tamanho_bytes: 10 } }), motivoParaNaoAvancar({ status: PENDENTE }, EM_ANDAMENTO),
], ['A pendência anda uma etapa por vez.', 'Tire a foto da correção para resolver.', null, null])
conferir('observação acumulativa: a nova em cima, com carimbo', anexarObservacao(anexarObservacao('', ' Empresa avisada. ', '2026-10-28T09:05:00'), 'Equipe chegou.', '2026-10-29T14:18:00'),
  '[29/10/2026 14:18] Equipe chegou.\n[28/10/2026 09:05] Empresa avisada.')

// Alterar e cancelar (pedido do engenheiro em 29/10/2026).
const cancelada = p(6, PENDENTE, '2026-10-01', { cancelada: true })
const comCancelada = [...lista, cancelada]
conferir('cancelada sai dos números, do "em aberto", da grade e não vence; aparece só no filtro Canceladas', [
  kpisPendencias(comCancelada).total, abertasPorResponsavel(comCancelada).reduce((s, x) => s + x.n, 0), vencida(cancelada, HOJE),
  ids(filtrarPendencias(comCancelada, {}, HOJE)).includes(6), ids(filtrarPendencias(comCancelada, { status: CANCELADAS }, HOJE)),
], [5, 4, false, false, [6]])
conferir('alterar: só em aberto', [motivoParaNaoAlterar(lista[0]), motivoParaNaoAlterar(lista[3]), motivoParaNaoAlterar(cancelada)],
  [null, 'Pendência resolvida não muda mais.', 'Pendência cancelada: reative para alterar.'])
conferir('cancelar: com motivo, nunca resolvida nem já cancelada', [
  motivoParaNaoCancelar(lista[0], ' '), motivoParaNaoCancelar(lista[0], 'Registro em duplicidade'), motivoParaNaoCancelar(lista[3], 'x'), motivoParaNaoCancelar(cancelada, 'x'),
], ['Diga por que está cancelando.', null, 'Pendência resolvida não se cancela.', 'Esta pendência já está cancelada.'])
conferir('cancelada não anda', motivoParaNaoAvancar(cancelada, EM_ANDAMENTO), 'Pendência cancelada: reative para mexer.')
conferir('campos alterados, com o nome de cada um', camposAlterados({ local: 'A', prazo: '2026-11-01', pavimento: '' }, { local: 'B', prazo: '2026-11-01', pavimento: undefined }, { local: 'local', prazo: 'prazo', pavimento: 'pavimento' }), ['local'])
conferir('filtros em texto (relatório)', [descreverFiltros({}), descreverFiltros({ status: PENDENTE, responsavel_id: 'r1', prazo: 'Atrasados', busca: ' fachada ' }, { r1: 'Pedra Firme' })],
  ['Todas as pendências em aberto e resolvidas', 'Situação: Pendente; Responsável: Pedra Firme; Prazo: Atrasados; Busca: "fachada"'])

console.log(`${ok}/${tot} — qualidade`)
process.exit(ok === tot ? 0 : 1)
