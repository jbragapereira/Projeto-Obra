// Medição de empreiteiros (src/lib/empreiteiros.js): Kanban, valor do contrato e boletins.
import {
  ATIVO, CONCLUIDO, acumuladoComBoletim, EM_ELABORACAO, ENVIADO, GLOBAL, POR_ESCOPO, globalPorPercentual, globalPorValor, linhaPorPercentual,
  linhaPorQuantidade, linhaPorValor, medidoDoContrato, motivoParaNaoMover, pctMedido, proximoNumeroDeBoletim, statusAoLado,
  validarBoletim, validarValorDoContrato, valorDoBoletim, valorDoContrato,
} from '../src/lib/empreiteiros.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

// Kanban
conferir('coluna ao lado', [statusAoLado(EM_ELABORACAO, 1), statusAoLado(ATIVO, -1), statusAoLado(CONCLUIDO, 1), statusAoLado(EM_ELABORACAO, -1)], [ENVIADO, ENVIADO, null, null])
const ativo = { status: ATIVO }
conferir('concluir só com 100% medido', [motivoParaNaoMover({ contrato: ativo, para: CONCLUIDO, pctMedido: 0.4 }) !== null, motivoParaNaoMover({ contrato: ativo, para: CONCLUIDO, pctMedido: 1 })], [true, null])
conferir('contrato com boletim não volta para antes de Ativo', [motivoParaNaoMover({ contrato: ativo, para: ENVIADO, temBoletim: true }) !== null, motivoParaNaoMover({ contrato: ativo, para: ENVIADO, temBoletim: false })], [true, null])
conferir('concluído pode ser reaberto (volta para Ativo)', motivoParaNaoMover({ contrato: { status: CONCLUIDO }, para: ATIVO, pctMedido: 1, temBoletim: true }), null)
conferir('uma coluna por vez', motivoParaNaoMover({ contrato: { status: EM_ELABORACAO }, para: ATIVO }) !== null, true)

// Valor do contrato
conferir('valor global e por escopo (P. Total truncado)', [
  valorDoContrato({ tipo: GLOBAL, valor_global: 30000 }),
  valorDoContrato({ tipo: POR_ESCOPO, itens: [{ quantidade: 200, preco_unitario: 80 }, { quantidade: 200, preco_unitario: 40 }, { quantidade: 50, preco_unitario: 120 }, { quantidade: 3, preco_unitario: 0.333 }] }),
  valorDoContrato({ tipo: null }),
], [30000, 30000.99, null])
conferir('cadastro do valor: obrigatórios, item repetido e sem item', [
  Object.keys(validarValorDoContrato({ tipo: GLOBAL, valor_global: 0 })),
  Object.keys(validarValorDoContrato({ tipo: POR_ESCOPO, itens: [] })),
  Object.keys(validarValorDoContrato({ tipo: POR_ESCOPO, itens: [{ servico_id: 'a', quantidade: 10, preco_unitario: 5 }, { servico_id: 'a', quantidade: 1, preco_unitario: 1 }, { servico_id: '', quantidade: 1, preco_unitario: 1 }] })),
  validarValorDoContrato({ tipo: POR_ESCOPO, itens: [{ servico_id: 'a', quantidade: 10, preco_unitario: 5 }] }),
], [['valor_global'], ['itens'], ['item1', 'item2'], {}])
conferir('aditivo não fica abaixo do medido (valor, quantidade, item medido não sai)', [
  Object.keys(validarValorDoContrato({ tipo: GLOBAL, valor_global: 5000, medidoValor: 7500 })),
  Object.keys(validarValorDoContrato({ tipo: POR_ESCOPO, itens: [{ servico_id: 'a', quantidade: 5, preco_unitario: 5 }], medidoPorServico: { a: 8 } })),
  Object.keys(validarValorDoContrato({ tipo: POR_ESCOPO, itens: [{ servico_id: 'a', quantidade: 10, preco_unitario: 5 }], medidoPorServico: { b: 2 } })),
], [['valor_global'], ['item0'], ['itens']])

// Medição
const placas = { id: 'i1', quantidade: 200, preco_unitario: 80 }
conferir('linha pela quantidade, pelo % e pelo R$ (a quantidade manda)', [linhaPorQuantidade(placas, 50), linhaPorPercentual(placas, 25), linhaPorValor(placas, 4000)],
  [{ quantidade: 50, pct: 0.25, valor: 4000 }, { quantidade: 50, pct: 0.25, valor: 4000 }, { quantidade: 50, pct: 0.25, valor: 4000 }])
conferir('R$ que não fecha numa quantidade redonda vira quantidade de 3 casas e o R$ sai dela', linhaPorValor({ quantidade: 50, preco_unitario: 120 }, 1000), { quantidade: 8.333, pct: 0.16666, valor: 999.96 })
conferir('global pelo % e pelo R$ (o R$ em centavos manda)', [globalPorPercentual(30000, 25), globalPorValor(30000, 7500.555)].map((g) => [g.valor, Math.round(g.pct * 1e6) / 1e6]), [[7500, 0.25], [7500.55, 0.250018]])
const medido = medidoDoContrato({ boletins: [{ valor: 4000 }, { valor: 2400 }], linhas: [{ contrato_item_id: 'i1', quantidade: 50 }, { contrato_item_id: 'i1', quantidade: 10 }, { contrato_item_id: 'i2', quantidade: 20 }] })
conferir('medido do contrato: R$ dos boletins e quantidade por item', [medido.valor, medido.porItem, pctMedido(6400, 32000)], [6400, { i1: 60, i2: 20 }, 0.2])
conferir('boletim global: não passa de 100%', [
  Object.keys(validarBoletim({ tipo: GLOBAL, data: '2026-10-26', valorTotal: 30000, medidoValor: 25000, valor: 6000 })),
  validarBoletim({ tipo: GLOBAL, data: '2026-10-26', valorTotal: 30000, medidoValor: 25000, valor: 5000 }),
  Object.keys(validarBoletim({ tipo: GLOBAL, data: '', valorTotal: 30000, valor: 10 })),
], [['valor'], {}, ['data']])
conferir('boletim por escopo: item não passa de 100% acumulado e o boletim mede algo', [
  Object.keys(validarBoletim({ tipo: POR_ESCOPO, data: '2026-10-26', itens: [placas], medidoPorItem: { i1: 190 }, linhas: [{ contrato_item_id: 'i1', quantidade: 20 }] })),
  validarBoletim({ tipo: POR_ESCOPO, data: '2026-10-26', itens: [placas], medidoPorItem: { i1: 190 }, linhas: [{ contrato_item_id: 'i1', quantidade: 10 }] }),
  Object.keys(validarBoletim({ tipo: POR_ESCOPO, data: '2026-10-26', itens: [placas], linhas: [{ contrato_item_id: 'i1', quantidade: 0 }] })),
], [['i1'], {}, ['linhas']])
// Bug da revisão de 26/10/2026: cada linha truncada sozinha perdia centavos (3 × 3,83 = 11,49 de 11,50) e o
// contrato por escopo medido inteiro nunca chegava a 100% para concluir.
const fio = { id: 'i9', quantidade: 10, preco_unitario: 1.15 }
const l1 = linhaPorQuantidade(fio, 3.333, 0)
const l2 = linhaPorQuantidade(fio, 3.333, 3.333)
const l3 = linhaPorQuantidade(fio, 3.334, 6.666)
conferir('item medido inteiro em vários boletins fecha no P. Total do contrato', [valorDoBoletim([l1, l2, l3]), valorDoContrato({ tipo: POR_ESCOPO, itens: [fio] })], [11.5, 11.5])
conferir('boletim não aceita data futura', [
  Object.keys(validarBoletim({ tipo: GLOBAL, data: '2026-10-27', hoje: '2026-10-26', valorTotal: 30000, valor: 10 })),
  validarBoletim({ tipo: GLOBAL, data: '2026-10-26', hoje: '2026-10-26', valorTotal: 30000, valor: 10 }),
], [['data'], {}])
conferir('aditivo: item já medido não muda de preço; item sem medição muda', [
  Object.keys(validarValorDoContrato({ tipo: POR_ESCOPO, itens: [{ servico_id: 'a', quantidade: 10, preco_unitario: 4 }], medidoPorServico: { a: 2 }, precoPorServico: { a: 5 } })),
  validarValorDoContrato({ tipo: POR_ESCOPO, itens: [{ servico_id: 'a', quantidade: 12, preco_unitario: 5 }], medidoPorServico: { a: 2 }, precoPorServico: { a: 5 } }),
  validarValorDoContrato({ tipo: POR_ESCOPO, itens: [{ servico_id: 'a', quantidade: 10, preco_unitario: 4 }], precoPorServico: { a: 5 } }),
], [['item0'], {}, {}])
conferir('próximo número de boletim', [proximoNumeroDeBoletim([]), proximoNumeroDeBoletim([{ numero: 1 }, { numero: 2 }])], [1, 3])

conferir('acumulado com o boletim, % e saldo', acumuladoComBoletim({ valorTotal: 30000, medidoValor: 16400, valorBoletim: 1600 }), { acumulado: 18000, pct: 0.6, saldo: 12000 })

console.log(`${ok}/${tot} — medição de empreiteiros`)
process.exit(ok === tot ? 0 : 1)
