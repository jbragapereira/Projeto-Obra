// Curto prazo: quem entra na semana, PPC e causas (src/lib/curtoPrazo.js).
import { atividadesDaSemanaCurta, causasMaisFrequentes, ppc, regraDaSemana, semanasAnteriores, statusAposLancamento, statusNaSemana, validarCausa } from '../src/lib/curtoPrazo.js'
import { CAUSAS, CAUSA_OUTRA, acoesDoStatus, causaParaGravar, planejadaNaSemana, realPorItem, textoDaCausa } from '../src/lib/curtoPrazo.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const semana = { inicio: '2026-10-19', fim: '2026-10-25' }
const item = (id, inicio, fim, real = 0) => ({ servico: { id }, codigo: id, inicio, fim, real })
conferir('cruza a semana: entra', regraDaSemana(item('a', '2026-10-01', '2026-10-20'), semana), { entra: true, atrasada: false })
conferir('deveria ter terminado e não terminou: entra atrasada', regraDaSemana(item('b', '2026-09-01', '2026-10-10', 0.4), semana), { entra: true, atrasada: true })
conferir('terminada no Diário: não entra', regraDaSemana(item('c', '2026-09-01', '2026-10-10', 1), semana), { entra: false, atrasada: false })
conferir('só começa depois: não entra', regraDaSemana(item('d', '2026-11-01', '2026-11-30'), semana), { entra: false, atrasada: false })
conferir('sem datas: não entra', regraDaSemana(item('e', null, null), semana), { entra: false, atrasada: false })

const itens = [item('a', '2026-10-01', '2026-10-20'), item('b', '2026-09-01', '2026-10-10', 0.4), item('c', '2026-09-01', '2026-10-10', 1), item('d', '2026-11-01', '2026-11-30'), item('f', '2026-10-19', '2026-10-30')]
const registros = [
  { semana: '2026-10-19', servico_id: 'a', status: 'Concluído' },
  { semana: '2026-10-19', servico_id: 'c', status: 'Concluído' }, // terminou no Diário, mas foi mexida na semana: fica
  { semana: '2026-10-19', servico_id: 'f', fora: true }, // tirada pelo engenheiro
  { semana: '2026-10-12', servico_id: 'b', status: 'Não realizado', causa: 'Material' }, // de outra semana
]
const { lista, fora } = atividadesDaSemanaCurta({ itens, semana, registros })
conferir('lista da semana com o status de cada uma', lista.map((x) => [x.no.codigo, x.status, x.atrasada]), [['a', 'Concluído', false], ['b', 'A fazer', true], ['c', 'Concluído', false]])
conferir('tirada pelo engenheiro fica fora', fora.map((n) => n.codigo), ['f'])
conferir('PPC: concluídas ÷ planejadas', ppc(lista), { concluidas: 2, total: 3, valor: 2 / 3 })
conferir('semana sem atividade: PPC vazio', ppc([]), { concluidas: 0, total: 0, valor: null })

// Diário ↔ Kanban
conferir('situação no Kanban da semana (sem registro: A fazer)', [statusNaSemana({ registros, semana: '2026-10-19', servicoId: 'a' }), statusNaSemana({ registros, semana: '2026-10-19', servicoId: 'b' })], ['Concluído', 'A fazer'])
const apos = (atual, quantidade, concluido = false, fora = false) => statusAposLancamento({ atual, fora, quantidade, concluido })
conferir('produção no Diário faz o Kanban andar, sem voltar',
  [apos('A fazer', 5), apos('Em andamento', 5), apos('A fazer', 5, true), apos('Em andamento', 0, true), apos('A fazer', 0), apos('Concluído', 5), apos('Não realizado', 5), apos('A fazer', 5, false, true)],
  ['Em andamento', null, 'Concluído', 'Concluído', null, null, null, null])

// PPC de semana passada não muda: quem entra é decidido pelo progresso no começo da semana.
const terminouDepois = [{ servico: { id: 'g', qtd_contratada: 10 }, codigo: 'g', inicio: '2026-10-01', fim: '2026-10-20', real: 1 }]
const semRegistro = atividadesDaSemanaCurta({ itens: terminouDepois, semana, registros: [] })
const peloInicio = atividadesDaSemanaCurta({ itens: terminouDepois, semana, registros: [], realNoInicio: realPorItem(terminouDepois, { g: 4 }) })
conferir('terminou depois: pelo real de hoje sai, pelo do começo da semana fica (e mostra o real de hoje)', [semRegistro.lista.length, peloInicio.lista.length, peloInicio.lista[0]?.no.real], [0, 1, 1])
conferir('planejada na semana (para o Diário mover o Kanban)', [planejadaNaSemana({ servico: { data_inicio_planejada: '2026-10-01', data_fim_planejada: '2026-10-20' }, real: 0.2, semana: '2026-10-19' }), planejadaNaSemana({ servico: { data_inicio_planejada: '2026-11-01', data_fim_planejada: '2026-11-20' }, real: 0, semana: '2026-10-19' })], [true, false])
conferir('botões de cada situação', ['A fazer', 'Em andamento', 'Concluído', 'Não realizado'].map((s) => acoesDoStatus(s).map((a) => a.rotulo)),
  [['Iniciar', 'Concluir', 'Não realizado'], ['Concluir', 'Não realizado', 'Voltar'], ['Reabrir'], ['Reabrir']])
conferir('causa para gravar e para mostrar', [causaParaGravar({ naoRealizado: true, causa: CAUSA_OUTRA, causa_texto: ' Greve ' }), causaParaGravar({ naoRealizado: false, causa: 'Clima', causa_texto: 'x' }), textoDaCausa({ causa: CAUSA_OUTRA, causa_texto: 'Greve' }), textoDaCausa({ causa: 'Clima' })],
  [{ causa: 'Outra', causa_texto: 'Greve' }, { causa: null, causa_texto: '' }, 'Greve', 'Clima'])
conferir('causas = tipos de restrição + Clima + Outra', CAUSAS.length, 9)
conferir('causas só dentro da janela', causasMaisFrequentes({ registros: [{ semana: '2026-11-30', status: 'Não realizado', causa: 'Clima' }], subtarefas: [], desde: '2026-10-01', ate: '2026-10-19' }), [])

conferir('não realizado exige causa', [validarCausa({ causa: '' }) !== null, validarCausa({ causa: 'Clima' }), validarCausa({ causa: 'Outra', causa_texto: '' }) !== null, validarCausa({ causa: 'Outra', causa_texto: 'Greve' })], [true, null, true, null])
conferir('últimas 3 semanas', semanasAnteriores('2026-10-19', 3), ['2026-10-05', '2026-10-12', '2026-10-19'])
conferir('causas mais frequentes', causasMaisFrequentes({
  registros: [...registros, { semana: '2026-10-05', servico_id: 'x', status: 'Não realizado', causa: 'Clima' }, { semana: '2026-09-01', servico_id: 'y', status: 'Não realizado', causa: 'Projeto' }],
  subtarefas: [{ semana: '2026-10-19', situacao: 'Não realizada', causa: 'Material' }],
  desde: '2026-10-01',
}), [{ causa: 'Material', n: 2 }, { causa: 'Clima', n: 1 }])

console.log(`${ok}/${tot} — curto prazo (kanban e PPC)`)
process.exit(ok === tot ? 0 : 1)
