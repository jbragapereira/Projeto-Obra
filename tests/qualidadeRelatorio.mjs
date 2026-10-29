// Qualidade (src/lib/qualidade.js): as partes do relatório que vêm da FVS e do Gemba Walk.
import { EM_ANDAMENTO, PENDENTE, RESOLVIDO, andamentoFvs, descreverFiltrosGemba, gembaEmAberto } from '../src/lib/qualidade.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const HOJE = '2026-10-29'
const grupos = [{ nome: 'Execução', itens: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }] }]
const vistorias = [
  { id: 'v1', codigo_modelo: 'FVS-01', nome_modelo: 'Impermeabilização', ambiente: 'Box', grupos, respostas: { a: 'OK', b: 'OK', c: 'NC', d: 'N.A.' }, status: 'Concluída', iniciada_em: '2026-10-10' },
  { id: 'v2', codigo_modelo: 'FVS-02', nome_modelo: 'Revestimento', ambiente: 'Copa', grupos, respostas: { a: 'OK' }, status: 'Em andamento', iniciada_em: '2026-10-27' },
  { id: 'v3', codigo_modelo: 'FVS-02', nome_modelo: 'Revestimento', ambiente: 'Sala', grupos, respostas: {}, status: 'Em andamento', iniciada_em: '2026-10-28' },
]
conferir('andamento: em andamento primeiro (mais recente na frente), com OK, NC e % de conformidade', andamentoFvs(vistorias), [
  { id: 'v3', ficha: 'FVS-02 Revestimento', ambiente: 'Sala', ok: 0, nc: 0, pendentes: 4, conformidade: null, status: 'Em andamento' },
  { id: 'v2', ficha: 'FVS-02 Revestimento', ambiente: 'Copa', ok: 1, nc: 0, pendentes: 3, conformidade: 100, status: 'Em andamento' },
  { id: 'v1', ficha: 'FVS-01 Impermeabilização', ambiente: 'Box', ok: 2, nc: 1, pendentes: 0, conformidade: 67, status: 'Concluída' },
])
conferir('andamento vazio sem vistorias', andamentoFvs([]), [])

const o = (numero, status, prazo, desperdicios, extra = {}) => ({ id: `g${numero}`, numero, status, prazo, desperdicios, local: '', descricao: '', causa_raiz: '', acao: '', cancelada: false, ...extra })
const obs = [
  o(1, PENDENTE, '2026-11-05', ['Espera']), o(2, RESOLVIDO, '2026-10-20', ['Espera']), o(3, EM_ANDAMENTO, '2026-10-25', ['Transporte']),
  o(4, PENDENTE, null, ['Espera'], { cancelada: true }),
]
conferir('Gemba no relatório: só as em aberto, sem canceladas, vencidas na frente', gembaEmAberto(obs, {}, HOJE).map((x) => x.numero), [3, 1])
conferir('Gemba no relatório respeita o filtro da aba', gembaEmAberto(obs, { tipo: 'Espera' }, HOJE).map((x) => x.numero), [1])
conferir('filtros do Gemba em texto', [descreverFiltrosGemba({}), descreverFiltrosGemba({ tipo: 'Espera', prazo: 'Vencidos', busca: ' laje ' })],
  [null, 'Desperdício: Espera; Prazo: Vencidos; Busca: "laje"'])

console.log(`${ok}/${tot} — qualidade (relatório)`)
process.exit(ok === tot ? 0 : 1)
