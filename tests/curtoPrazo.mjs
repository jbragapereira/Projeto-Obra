// Curto prazo: quem entra na semana, PPC e causas (src/lib/curtoPrazo.js).
import { atividadesDaSemanaCurta, causasMaisFrequentes, ppc, regraDaSemana, semanasAnteriores, efeitoDoDiarioNoKanban, quantidadeNaSemana, statusNaSemana, statusPeloDiario, validarCausa } from '../src/lib/curtoPrazo.js'
import { CAUSAS, CAUSA_OUTRA, acoesDoStatus, causaParaGravar, planejadaNaSemana, realPorItem, responsavelNaSemana, textoDaCausa } from '../src/lib/curtoPrazo.js'

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
const pelo = (atual, quantidadeNaSemana, concluido = false, extra = {}) => statusPeloDiario({ atual, quantidadeNaSemana, concluido, ...extra })
conferir('produção no Diário faz o Kanban andar',
  [pelo('A fazer', 5), pelo('Em andamento', 5), pelo('A fazer', 5, true), pelo('Em andamento', 0, true)],
  ['Em andamento', null, 'Concluído', 'Concluído'])
conferir('corrigir ou desfazer no Diário faz o Kanban voltar junto',
  [pelo('Em andamento', 0), pelo('Concluído', 3), pelo('Concluído', 0), pelo('A fazer', 0)],
  ['A fazer', 'Em andamento', 'A fazer', null])
const lancsSemana = [{ servico_id: 's1', quantidade: 3, data: '2026-10-19', diario_id: 'd1' }, { servico_id: 's1', quantidade: 4, data: '2026-10-21', diario_id: 'd2' }, { servico_id: 's1', quantidade: 9, data: '2026-10-26', diario_id: 'd3' }, { servico_id: 's2', quantidade: 5, data: '2026-10-20', diario_id: 'd1' }]
conferir('quantidade do item na semana, sem o diário que está sendo corrigido',
  [quantidadeNaSemana({ lancamentos: lancsSemana, servicoId: 's1', semana: '2026-10-19' }), quantidadeNaSemana({ lancamentos: lancsSemana, servicoId: 's1', semana: '2026-10-19', excetoDiarioId: 'd2' })], [7, 3])
// O cartão do Diário: mostra o Kanban; com a quantidade mudada agora, já mostra o que vai ficar.
// Item de 10 com período na semana de 26/10. d3 é o diário de 26/10; d4, de 27/10, já tem 4.
const sEfeito = { id: 's1', qtd_contratada: 10, data_inicio_planejada: '2026-10-26', data_fim_planejada: '2026-10-30' }
const lancsEfeito = [{ servico_id: 's1', quantidade: 2, data: '2026-10-26', diario_id: 'd3' }, { servico_id: 's1', quantidade: 4, data: '2026-10-27', diario_id: 'd4' }]
const efeito = (status, diarioId, quantidade, lancamentos = lancsEfeito, servico = sEfeito) => efeitoDoDiarioNoKanban({
  registros: status ? [{ semana: '2026-10-26', servico_id: 's1', status }] : [], lancamentos, servico, semana: '2026-10-26', diarioId, quantidade }).novo
conferir('Diário → Kanban: só muda o que mudou; parcial anda, total conclui, menos volta, zero com outro dia na semana fica em andamento',
  [efeito('Concluído', 'd3', 2), efeito('A fazer', null, 3, []), efeito('Em andamento', 'd3', 6), efeito('Concluído', 'd3', 1), efeito('Em andamento', 'd3', 0), efeito('Em andamento', 'd3', 0, [lancsEfeito[0]])],
  [null, 'Em andamento', 'Concluído', 'Em andamento', null, 'A fazer'])
conferir('item novo só com memória (quantidade 0) não mexe no cartão movido no Kanban', efeito('Em andamento', null, 0, []), null)
conferir('concluído pelo total: corrigir outro dia para menos tira o Concluído (sem marca velha)',
  efeito('Concluído', 'd4', 1, [{ servico_id: 's1', quantidade: 6, data: '2026-10-26', diario_id: 'd3' }, { servico_id: 's1', quantidade: 4, data: '2026-10-27', diario_id: 'd4' }]), 'Em andamento')
conferir('item fora do Kanban da semana (sem registro e fora do período na EAP) não muda',
  efeito(null, null, 3, [], { ...sEfeito, data_inicio_planejada: '2026-11-09', data_fim_planejada: '2026-11-13' }), null)
conferir('não mexe em "Não realizado" nem em atividade tirada da semana',
  [pelo('Não realizado', 5), pelo('A fazer', 5, false, { fora: true })], [null, null])

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

// Responsável no cartão: quem executou no Diário na semana (o mais recente); sem lançamento, o do item.
const lancsResp = [
  { servico_id: 's1', data: '2026-10-19', responsavel_id: 'r-a' },
  { servico_id: 's1', data: '2026-10-22', responsavel_id: 'r-b' },
  { servico_id: 's1', data: '2026-10-27', responsavel_id: 'r-c' },
  { servico_id: 's2', data: '2026-10-20', responsavel_id: 'r-d' },
]
conferir('responsável do cartão é quem executou por último na semana', responsavelNaSemana({ lancamentos: lancsResp, servicoId: 's1', semana: '2026-10-19', padrao: 'r-item' }), 'r-b')
conferir('o escolhido no cartão da semana vale primeiro', responsavelNaSemana({ registros: [{ semana: '2026-10-19', servico_id: 's1', responsavel_id: 'r-x' }, { semana: '2026-10-26', servico_id: 's1', responsavel_id: 'r-y' }], lancamentos: lancsResp, servicoId: 's1', semana: '2026-10-19', padrao: 'r-item' }), 'r-x')
conferir('o do Kanban manda mesmo sobre o já lançado no dia', responsavelNaSemana({ registros: [{ semana: '2026-10-19', servico_id: 's1', responsavel_id: 'r-x' }], lancamentos: lancsResp, servicoId: 's1', semana: '2026-10-19', lancado: 'r-a', padrao: 'r-item' }), 'r-x')
conferir('sem escolha no Kanban, fica o já lançado no dia', responsavelNaSemana({ registros: [], lancamentos: lancsResp, servicoId: 's1', semana: '2026-10-19', lancado: 'r-a', padrao: 'r-item' }), 'r-a')
conferir('sem lançamento na semana, fica o responsável do item', responsavelNaSemana({ lancamentos: lancsResp, servicoId: 's1', semana: '2026-11-02', padrao: 'r-item' }), 'r-item')

console.log(`${ok}/${tot} — curto prazo (kanban e PPC)`)
process.exit(ok === tot ? 0 : 1)
