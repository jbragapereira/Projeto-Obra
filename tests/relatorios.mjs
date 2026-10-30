// Relatórios (src/lib/relatorios.js): painel executivo (evolução, Curva S, prazo, custo medido, PPC) e
// ritmo e produção (PPC semanal, Pareto de causas, clima e efetivo), contratos, materiais, qualidade e
// os filtros cruzados (empresa e período).
import {
  barrasPpc, climaEfetivo, curvaS, custoMedido, diasAteEntrega, evolucao, fluxoContratos, historicoPpc, leadTimeMedio, matrizEmpreiteiros,
  paretoCausas, pedidosAtrasados, pedidosPorEtapa, ppcGeral, saldoPorContrato, tendenciaLeadTime,
  conformidadePorModelo, pendenciasPorEmpresa, pendenciasPorLocal, desperdiciosDoGemba, janelaDoPeriodo, recortarDados, descreverFiltrosBi, ncsEmAberto,
} from '../src/lib/relatorios.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

// Todo dia é útil: o planejado anda em linha reta pelo calendário.
const CAL = { dias_semana: [0, 1, 2, 3, 4, 5, 6], feriados: [] }
const no = (id, qtd, preco, inicio, fim) => ({ servico: { id, qtd_contratada: qtd, preco_unitario: preco }, inicio, fim })
// A vale R$ 100 (05 a 14/10), B vale R$ 300 (15 a 24/10).
const itens = [no('a', 10, 10, '2026-10-05', '2026-10-14'), no('b', 10, 30, '2026-10-15', '2026-10-24')]
const lancamentos = [{ servico_id: 'a', quantidade: 10, data: '2026-10-10' }, { servico_id: 'b', quantidade: 2, data: '2026-10-18' }]

conferir('evolução: real × planejado ponderados pelo valor (A pronto, B 20% feito e 50% previsto)',
  evolucao({ itens, lancamentos, hoje: '2026-10-19', cal: CAL }), { real: 40, planejado: 63, diferenca: -23 })
conferir('sem datas na EAP: evolução e Curva S ficam sem dado (nunca NaN)', [
  evolucao({ itens: [no('a', 10, 10, null, null)], lancamentos, hoje: '2026-10-19', cal: CAL }), curvaS({ itens: [], lancamentos, hoje: '2026-10-19', cal: CAL }),
], [null, null])
conferir('Curva S: uma semana por ponto, acumulados; na semana atual, planejado e real medidos hoje', curvaS({ itens, lancamentos, hoje: '2026-10-19', cal: CAL }), [
  { semana: '2026-10-05', planejado: 17.5, real: 25 },
  { semana: '2026-10-12', planejado: 55, real: 40 },
  { semana: '2026-10-19', planejado: 62.5, real: 40 },
])
conferir('Curva S: o real para em hoje (semanas futuras sem real)', curvaS({ itens, lancamentos, hoje: '2026-10-12', cal: CAL }).map((p) => p.real), [25, 25, null])
conferir('sem preço (quem não vê valores): média simples', evolucao({ itens: itens.map((n) => ({ ...n, servico: { ...n.servico, preco_unitario: undefined } })), lancamentos, hoje: '2026-10-19', cal: CAL }),
  { real: 60, planejado: 75, diferenca: -15 })

conferir('prazo: dias até a entrega (negativo depois dela)', [diasAteEntrega('2026-11-01', '2026-10-29'), diasAteEntrega('2026-10-27', '2026-10-29'), diasAteEntrega(null, '2026-10-29')], [3, -2, null])
conferir('custo medido: soma das medições fechadas', custoMedido([
  { status: 'Fechada', valor_medido: 100 }, { status: 'Fechada', valor_medido: 50.5 }, { status: 'Em andamento', valor_medido: null },
]), { valor: 150.5, medicoes: 2 })
conferir('custo medido: sem valores no perfil, sem número', custoMedido([{ status: 'Fechada' }]), null)
conferir('custo medido: nenhuma fechada é R$ 0', custoMedido([{ status: 'Planejando', valor_medido: null }]), { valor: 0, medicoes: 0 })

const registros = [{ semana: '2026-10-12', servico_id: 'b', status: 'Concluído' }]
conferir('PPC por semana: quem entra se decide pelo progresso no começo dela', historicoPpc({ itens, registros, lancamentos, hoje: '2026-10-21', semanas: 2 }), [
  { semana: '2026-10-12', concluidas: 1, total: 1, valor: 1 },
  { semana: '2026-10-19', concluidas: 0, total: 1, valor: 0 },
])
conferir('PPC geral soma as semanas; sem atividade, sem dado', [
  ppcGeral([{ concluidas: 1, total: 2 }, { concluidas: 0, total: 0 }, { concluidas: 3, total: 4 }]), ppcGeral([{ concluidas: 0, total: 0 }]),
], [{ concluidas: 4, total: 6, valor: 67 }, null])


conferir('PPC semanal: concluídas e não concluídas por semana; semana sem atividade fica sem %', barrasPpc([
  { semana: '2026-10-12', concluidas: 3, total: 4 }, { semana: '2026-10-19', concluidas: 0, total: 0 },
]), [
  { semana: '2026-10-12', concluidas: 3, naoConcluidas: 1, total: 4, valor: 75 },
  { semana: '2026-10-19', concluidas: 0, naoConcluidas: 0, total: 0, valor: null },
])
conferir('PPC semanal sem nenhuma atividade: sem dado', barrasPpc([{ semana: '2026-10-19', concluidas: 0, total: 0 }]), null)

const naoFeita = (semana, causa) => ({ semana, status: 'Não realizado', causa, fora: false })
const regs = [naoFeita('2026-10-26', 'Clima'), naoFeita('2026-10-19', 'Clima'), naoFeita('2026-10-19', 'Material'), naoFeita('2026-08-03', 'Clima'),
  { semana: '2026-10-19', status: 'Não realizado', causa: 'Projeto', fora: true }]
const subs = [{ semana: '2026-10-26', situacao: 'Não realizada', causa: 'Mão de obra' }, { semana: '2026-10-26', situacao: 'Feita', causa: null }]
conferir('Pareto: só as semanas do PPC, sem as tiradas da semana, com % e % acumulada (empate em ordem alfabética)', paretoCausas({ registros: regs, subtarefas: subs, hoje: '2026-10-29' }), [
  { causa: 'Clima', n: 2, pct: 50, acumulado: 50 }, { causa: 'Mão de obra', n: 1, pct: 25, acumulado: 75 }, { causa: 'Material', n: 1, pct: 25, acumulado: 100 },
])
conferir('Pareto sem causa: sem dado', paretoCausas({ registros: [], subtarefas: [], hoje: '2026-10-29' }), null)

conferir('clima do dia: o pior entre manhã e tarde, com o ícone', climaEfetivo([
  { data: '2026-10-01', clima_manha: 'Bom', clima_tarde: 'Chuva forte' }, { data: '2026-10-02', clima_manha: 'Nublado', clima_tarde: 'Bom' }, { data: '2026-10-03' },
]).map((d) => [d.clima, d.icone]), [['Chuva forte', 'chuva-forte'], ['Nublado', 'nuvem'], [null, null]])
const diarios = [
  { data: '2026-10-28', clima_manha: 'Bom', clima_tarde: 'Chuva', efetivo: [{ quantidade: 4 }, { quantidade: 3 }] },
  { data: '2026-10-26', clima_manha: 'Bom', clima_tarde: 'Bom', efetivo: [] },
  { data: '2026-10-27', clima_manha: 'Nublado', clima_tarde: 'Nublado', efetivo: [{ quantidade: 9 }] },
]
conferir('clima e efetivo: os últimos diários, do mais antigo ao mais novo, com pessoas somadas', climaEfetivo(diarios, 2), [
  { data: '2026-10-27', efetivo: 9, clima: 'Nublado', icone: 'nuvem', chuva: false }, { data: '2026-10-28', efetivo: 7, clima: 'Chuva', icone: 'chuva', chuva: true },
])
conferir('sem diário: sem dado', climaEfetivo([]), null)

/* Contratos e medições */
const ct = (id, resp, nome, status, valor, medido = 0) => ({ id, responsavel_id: resp, empreiteiro: nome, descricao: `Contrato ${id}`, status, valor_total: valor, medido_valor: medido })
const contratos = [
  ct('c1', 'r1', 'Gesso Fino', 'Aprovado / Ativo', 10000, 8000),
  ct('c2', 'r2', 'Pedra Firme', 'Aprovado / Ativo', 30000, 6000),
  ct('c3', 'r2', 'Pedra Firme', 'Concluído', 5000, 5000),
  ct('c4', 'r1', 'Gesso Fino', 'Em elaboração', null),
  ct('c5', 'r3', 'Elétrica', 'Enviado p/ aprovação', 7000),
]
conferir('fluxo: quantos e quanto em cada etapa (sem valor conta, soma zero)', fluxoContratos(contratos), [
  { status: 'Em elaboração', n: 1, valor: 0, semValor: 1 }, { status: 'Enviado p/ aprovação', n: 1, valor: 7000, semValor: 0 },
  { status: 'Aprovado / Ativo', n: 2, valor: 40000, semValor: 0 }, { status: 'Concluído', n: 1, valor: 5000, semValor: 0 },
])
conferir('matriz: só contratos fechados, por empreiteiro, do maior valor ao menor', matrizEmpreiteiros(contratos), [
  { responsavel_id: 'r2', empreiteiro: 'Pedra Firme', contratos: 2, valor: 35000, medido: 11000, pct: 31, saldo: 24000 },
  { responsavel_id: 'r1', empreiteiro: 'Gesso Fino', contratos: 1, valor: 10000, medido: 8000, pct: 80, saldo: 2000 },
])
conferir('saldo a medir: só os ativos com saldo, do maior ao menor', saldoPorContrato(contratos).map((c) => [c.id, c.saldo]), [['c2', 24000], ['c1', 2000]])
conferir('sem contrato (ou nenhum fechado): sem dado', [fluxoContratos([]), matrizEmpreiteiros([contratos[3]]), saldoPorContrato([contratos[2]])], [null, null, null])

/* Materiais */
const ped = (id, status, historico, extra = {}) => ({ id, status, material: `Material ${id}`, frente: 'Térreo', prioridade: 'Normal', previsao_entrega: '', historico: historico.map(([s, data]) => ({ status: s, data })), ...extra })
const pedidos = [
  ped('p1', 'Solicitar', [['Solicitar', '2026-10-28']]),
  ped('p2', 'Comprado / a caminho', [['Solicitar', '2026-10-10'], ['Comprado / a caminho', '2026-10-15']], { previsao_entrega: '2026-10-25', prioridade: 'Crítico' }),
  ped('p3', 'Comprado / a caminho', [['Solicitar', '2026-10-20'], ['Comprado / a caminho', '2026-10-22']], { previsao_entrega: '2026-10-28' }),
  ped('p4', 'No almoxarifado', [['Solicitar', '2026-10-10'], ['No almoxarifado', '2026-10-20']]),
  ped('p5', 'Entregue na frente', [['Solicitar', '2026-10-01'], ['No almoxarifado', '2026-10-07'], ['Entregue na frente', '2026-10-08']]),
  ped('p6', 'No almoxarifado', [['Solicitar', '2026-10-14'], ['No almoxarifado', '2026-10-22']]),
]
conferir('pedidos por etapa (as 5 colunas do Kanban)', pedidosPorEtapa(pedidos).map((x) => x.n), [1, 0, 2, 2, 1])
conferir('atrasados: comprados com previsão vencida, do mais atrasado ao menos', pedidosAtrasados(pedidos, '2026-10-29'), [
  { id: 'p2', material: 'Material p2', frente: 'Térreo', critico: true, dias: 4 }, { id: 'p3', material: 'Material p3', frente: 'Térreo', critico: false, dias: 1 },
])
conferir('lead time médio: só os que chegaram (10, 6 e 8 dias)', leadTimeMedio(pedidos), { dias: 8, pedidos: 3 })
conferir('lead time médio no período: só as chegadas a partir do início (10 e 8 dias)', leadTimeMedio(pedidos, '2026-10-12'), { dias: 9, pedidos: 2 })
conferir('tendência: média por semana de chegada; semana sem chegada fica vazia', tendenciaLeadTime(pedidos, '2026-10-29'), [
  { semana: '2026-10-05', dias: 6, pedidos: 1 }, { semana: '2026-10-12', dias: null, pedidos: 0 },
  { semana: '2026-10-19', dias: 9, pedidos: 2 }, { semana: '2026-10-26', dias: null, pedidos: 0 },
])
conferir('sem pedido ou sem chegada: sem dado', [pedidosPorEtapa([]), leadTimeMedio([pedidos[0]]), tendenciaLeadTime([pedidos[0]], '2026-10-29')], [null, null, null])

/* Qualidade e entrega */
const gruposFvs = [{ nome: 'G', itens: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }] }]
const vist = (modelo, codigo, respostas, iniciada = '2026-10-20') => ({ modelo_id: modelo, codigo_modelo: codigo, nome_modelo: `Ficha ${codigo}`, grupos: gruposFvs, respostas, iniciada_em: iniciada })
conferir('conformidade por ficha: soma as vistorias, da pior para a melhor (abaixo de 80% é baixa); só N.A. fica de fora', conformidadePorModelo([
  vist('m1', 'FVS-01', { a: 'OK', b: 'OK', c: 'OK', d: 'NC' }), vist('m1', 'FVS-01', { a: 'OK', b: 'OK', c: 'OK', d: 'OK' }),
  vist('m2', 'FVS-02', { a: 'OK', b: 'NC' }), vist('m3', 'FVS-03', { a: 'N.A.' }),
]).map((x) => [x.ficha, x.ok, x.nc, x.pct, x.vistorias, x.baixa]), [['FVS-02 Ficha FVS-02', 1, 1, 50, 1, true], ['FVS-01 Ficha FVS-01', 7, 1, 88, 2, false]])
conferir('conformidade sem OK nem NC: sem dado', conformidadePorModelo([vist('m3', 'FVS-03', {})]), null)

const pend = (empresa_id, empresa, local, status = 'Pendente', extra = {}) => ({ empresa_id, empresa, local, status, cancelada: false, data_vistoria: '2026-10-20', ...extra })
const pends = [
  pend('e1', 'Pedra Firme', 'Fachada'), pend('e1', 'Pedra Firme', 'Fachada'), pend('e1', 'Pedra Firme', 'Copa', 'Em andamento'),
  pend('e2', 'Ponto Certo', 'Copa'), pend('e2', 'Ponto Certo', 'Copa', 'Resolvido'), pend('e3', 'Própria', 'Escada', 'Pendente', { cancelada: true }),
]
conferir('pendências por empresa: só as em aberto, da maior para a menor', pendenciasPorEmpresa(pends), [
  { id: 'e1', nome: 'Pedra Firme', n: 3, pct: 75 }, { id: 'e2', nome: 'Ponto Certo', n: 1, pct: 25 },
])
const muitas = ['A', 'B', 'C', 'D', 'E', 'F'].map((x, i) => Array.from({ length: 6 - i }, () => pend(x, `Empresa ${x}`, 'L'))).flat()
conferir('mais de 5 empresas: as 4 maiores e "Outras"', pendenciasPorEmpresa(muitas).map((x) => [x.nome, x.n]),
  [['Empresa A', 6], ['Empresa B', 5], ['Empresa C', 4], ['Empresa D', 3], ['Outras', 3]])
conferir('mapa por local: só as em aberto, do maior bloco para o menor', pendenciasPorLocal(pends), [{ local: 'Copa', n: 2 }, { local: 'Fachada', n: 2 }])
conferir('NCs em aberto: as não fechadas e quantas da severidade mais alta', [
  ncsEmAberto([{ status: 'Aberta', severidade: 'Alta' }, { status: 'Corrigida', severidade: 'Média' }, { status: 'Fechada', severidade: 'Alta' }]), ncsEmAberto([{ status: 'Fechada' }]),
], [{ total: 2, alta: 1 }, null])
conferir('sem pendência em aberto: sem dado', [pendenciasPorEmpresa([pends[4]]), pendenciasPorLocal([])], [null, null])
conferir('desperdícios do Gemba: o ranking, ou sem dado', [
  desperdiciosDoGemba([{ desperdicios: ['Espera', 'Estoque'], cancelada: false }, { desperdicios: ['Espera'], cancelada: false }]), desperdiciosDoGemba([]),
], [[{ tipo: 'Espera', n: 2 }, { tipo: 'Estoque', n: 1 }], null])

/* Filtros cruzados */
conferir('janela do período: tudo, este mês e últimas 4 semanas (hoje quinta 29/10)', [
  janelaDoPeriodo('Tudo', '2026-10-29'), janelaDoPeriodo('Este mês', '2026-10-29'), janelaDoPeriodo('Últimas 4 semanas', '2026-10-29'),
], [{ desde: null, semanas: 8 }, { desde: '2026-10-01', semanas: 5 }, { desde: '2026-10-05', semanas: 4 }])
const dadosBi = {
  servicos: [{ id: 's1', responsavel_id: 'e1' }, { id: 's2', responsavel_id: 'e2' }],
  lancamentos: [{ servico_id: 's1' }, { servico_id: 's2' }],
  semanaAtividades: [{ servico_id: 's1' }, { servico_id: 's2' }], subtarefas: [{ servico_id: 's2' }],
  diarios: [{ data: '2026-09-20', efetivo: [{ responsavel_id: 'e1', quantidade: 3 }] }, { data: '2026-10-20', efetivo: [{ responsavel_id: 'e1', quantidade: 3 }, { responsavel_id: 'e2', quantidade: 5 }] }],
  contratos: [{ responsavel_id: 'e1' }, { responsavel_id: 'e2' }],
  pedidos: [{ historico: [{ data: '2026-09-01' }] }, { historico: [{ data: '2026-10-10' }] }],
  pendencias: pends, vistorias: [vist('m1', 'FVS-01', {}, '2026-09-10'), vist('m1', 'FVS-01', {}, '2026-10-10')],
  ncs: [{ responsavel_id: 'e1', aberta_em: '2026-10-02' }, { responsavel_id: 'e2', aberta_em: '2026-10-02' }],
  observacoes: [{ responsavel_id: 'e1', registrado_em: '2026-09-02' }, { responsavel_id: 'e1', registrado_em: '2026-10-22' }],
  medicoes: [{ status: 'Fechada', valor_medido: 10 }],
}
const conta = (d) => ['servicos', 'lancamentos', 'semanaAtividades', 'subtarefas', 'diarios', 'contratos', 'pedidos', 'pendencias', 'vistorias', 'ncs', 'observacoes', 'medicoes'].map((k) => d[k].length)
conferir('sem filtro: tudo', conta(recortarDados(dadosBi, {}, '2026-10-29')), [2, 2, 2, 1, 2, 2, 2, 6, 2, 2, 2, 1])
const soE1 = recortarDados(dadosBi, { responsavel_id: 'e1' }, '2026-10-29')
conferir('empresa: o que é dela; pedidos, vistorias e medições não têm empresa', conta(soE1), [1, 1, 1, 0, 2, 1, 2, 3, 2, 1, 2, 1])
conferir('empresa: no diário fica só o efetivo dela', soE1.diarios[1].efetivo.map((e) => e.quantidade), [3])
conferir('período "Este mês": diários, vistorias e observações do mês; pedidos, pendências, NCs e contratos são de hoje', conta(recortarDados(dadosBi, { periodo: 'Este mês' }, '2026-10-29')), [2, 2, 2, 1, 1, 2, 2, 6, 1, 2, 1, 1])
conferir('filtros em texto', [descreverFiltrosBi({}), descreverFiltrosBi({ responsavel_id: 'e1', periodo: 'Este mês' }, { e1: 'Pedra Firme' })],
  ['Período: Tudo; Todas as empresas', 'Período: Este mês; Empresa: Pedra Firme'])
conferir('Curva S com período: só as semanas da janela, valores acumulados', curvaS({ itens, lancamentos, hoje: '2026-10-19', cal: CAL, desde: '2026-10-12' }).map((p) => p.semana), ['2026-10-12', '2026-10-19'])

console.log(`${ok}/${tot} — relatórios (os 5 painéis e os filtros)`)
process.exit(ok === tot ? 0 : 1)
