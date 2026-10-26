// Medição pela EAP (src/lib/medicao.js): o mês vigente, os itens do período e a estrutura do Orçamento.
import { estruturaDaMedicao, itensPelaEap, mesVigente, metaDoItem, periodoDaProxima, podeDescongelar, reconciliarItens, temCronograma, valorEmMontagem } from '../src/lib/medicao.js'
import { CALENDARIO_PADRAO } from '../src/lib/calendario.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const cal = CALENDARIO_PADRAO
const item = (id, codigo, inicio, fim, qtd, extra = {}) => ({ id, codigo, data_inicio_planejada: inicio, data_fim_planejada: fim, qtd_contratada: qtd, ativo: true, ...extra })

conferir('mês vigente: do dia 1 ao último dia', [mesVigente('2026-10-25'), mesVigente('2027-02-10'), mesVigente('2028-02-10')],
  [{ inicio: '2026-10-01', fim: '2026-10-31' }, { inicio: '2027-02-01', fim: '2027-02-28' }, { inicio: '2028-02-01', fim: '2028-02-29' }])

const outubro = { inicio: '2026-10-01', fim: '2026-10-31' }
// a: 26/10 a 06/11 = 9 dias úteis (02/11 Finados), 5 em outubro → 90 × 5/9 = 50.
// b: inteiro em outubro → tudo. c: só em novembro → fora. d: sem datas → fora. e: arquivado → fora.
// f: em outubro, mas já executado todo → fora. g: 100 em outubro, 70 executados → limitado ao saldo 30.
const servicos = [
  item('a', '1.1.1', '2026-10-26', '2026-11-06', 90),
  item('b', '1.1.2', '2026-10-05', '2026-10-09', 12.5),
  item('c', '1.2.1', '2026-11-03', '2026-11-10', 10),
  item('d', '2.1.1', null, null, 10),
  item('e', '2.1.2', '2026-10-05', '2026-10-09', 10, { ativo: false }),
  item('f', '3.1.1', '2026-10-05', '2026-10-09', 10),
  item('g', '3.1.2', '2026-10-01', '2026-10-30', 100),
]
conferir('só os itens da EAP com período no mês, com a quantidade prevista pelos dias úteis e limitada ao saldo',
  itensPelaEap({ servicos, periodo: outubro, cal, acumulado: { f: 10, g: 70 } }),
  [{ servico_id: 'a', qtd_planejada: 50 }, { servico_id: 'b', qtd_planejada: 12.5 }, { servico_id: 'g', qtd_planejada: 30 }])
conferir('quantidade prevista é truncada em 2 casas', itensPelaEap({ servicos: [item('h', '1.1', '2026-10-26', '2026-11-06', 10)], periodo: outubro, cal }), [{ servico_id: 'h', qtd_planejada: 5.55 }])
conferir('EAP sem datas, medição sem itens', itensPelaEap({ servicos: [item('d', '1.1', null, null, 10)], periodo: outubro, cal }), [])

// Medição fatiada: só os grupos e subgrupos que têm item, com o P. Total do Orçamento e o R$ do mês
// (os dois truncados, como a planilha), somados em cada grupo, em ordem de código.
const servicoDe = {
  a: { codigo: '1.1.1', qtd_contratada: 90, preco_unitario: 2 },
  b: { codigo: '1.1.2', qtd_contratada: 12.5, preco_unitario: 4 },
  g: { codigo: '3.1.2', qtd_contratada: 100, preco_unitario: 10.333 },
}
const grupos = [{ codigo: '1', nome: 'Serviços preliminares' }, { codigo: '1.1', nome: 'Canteiro' }, { codigo: '2', nome: 'Fundação' }, { codigo: '3', nome: 'Estrutura' }, { codigo: '3.1', nome: 'Pilares' }]
const linhas = estruturaDaMedicao({ itens: [{ servico_id: 'g', qtd: 30, preco: 10.333 }, { servico_id: 'a', qtd: 50, preco: 2 }, { servico_id: 'b', qtd: 12.5, preco: 4 }], servicoDe, grupos })
conferir('grupos e itens na ordem do Orçamento, sem grupo vazio, com P. Total e R$ do mês',
  linhas.map((l) => [l.tipo, l.codigo, l.nivel, l.totalOrcamento, l.totalMes]),
  [['grupo', '1', 1, 230, 150], ['grupo', '1.1', 2, 230, 150], ['item', '1.1.1', 3, 180, 100], ['item', '1.1.2', 3, 50, 50],
    ['grupo', '3', 1, 1033.3, 309.99], ['grupo', '3.1', 2, 1033.3, 309.99], ['item', '3.1.2', 3, 1033.3, 309.99]])
conferir('o grupo leva o nome do Orçamento', linhas.filter((l) => l.tipo === 'grupo').map((l) => l.nome), ['Serviços preliminares', 'Canteiro', 'Estrutura', 'Pilares'])

// A medição em planejamento acompanha a EAP: sai, entra e muda — menos a quantidade ajustada à mão.
const atuais = [
  { id: 'i1', servico_id: 'a', qtd_planejada: 10, ajustada: false },
  { id: 'i2', servico_id: 'b', qtd_planejada: 3, ajustada: true },
  { id: 'i3', servico_id: 'c', qtd_planejada: 7, ajustada: false },
]
const daEap = [
  { servico_id: 'a', qtd_planejada: 12, preco_unitario: 2 },
  { servico_id: 'b', qtd_planejada: 9, preco_unitario: 4 },
  { servico_id: 'd', qtd_planejada: 5, preco_unitario: 1 },
]
conferir('reconciliar: c sai, d entra, a muda com a EAP e b fica com o ajuste à mão', reconciliarItens(atuais, daEap), {
  sair: ['i3'],
  entrar: [{ servico_id: 'd', qtd_planejada: 5, preco_unitario: 1 }],
  mudar: [{ id: 'i1', preco_unitario: 2, qtd_planejada: 12 }, { id: 'i2', preco_unitario: 4, qtd_planejada: 3 }],
})

// A medição seguinte à Medição 1 (mês-calendário) também é o mês inteiro; período antigo segue 31 dias.
conferir('próxima medição: mês seguinte inteiro, ou 31 dias quando não começa no dia 1',
  [periodoDaProxima('2026-10-31'), periodoDaProxima('2026-12-31'), periodoDaProxima('2026-11-02')],
  [{ inicio: '2026-11-01', fim: '2026-11-30' }, { inicio: '2027-01-01', fim: '2027-01-31' }, { inicio: '2026-11-03', fim: '2026-12-03' }])

conferir('descongela só a em andamento', [podeDescongelar({ status: 'Em andamento' }), podeDescongelar({ status: 'Planejando' }), podeDescongelar({ status: 'Fechada' }), podeDescongelar(null)], [true, false, false, false])

conferir('meta do item: a congelada quando iniciada; senão a em montagem', [metaDoItem({ qtd_planejada: 9, qtd_planejada_inicial: 7 }), metaDoItem({ qtd_planejada: 9, qtd_planejada_inicial: null }), metaDoItem(null)], [7, 9, 0])
conferir('R$ em montagem: P. Total truncado por item', valorEmMontagem([{ qtd_planejada: 3.77, preco_unitario: 841.08 }, { qtd_planejada: 1, preco_unitario: 0.333 }]), 3171.2)
conferir('obra com cronograma', [temCronograma({ medicoes_inicio: '2026-10-01' }), temCronograma({ medicoes_inicio: null }), temCronograma(null)], [true, false, false])

console.log(`${ok}/${tot} — medição pela EAP`)
process.exit(ok === tot ? 0 : 1)
