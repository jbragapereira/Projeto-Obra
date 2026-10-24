// Regras de obra, medição e diário (src/lib/obras.js, medicao.js, diario.js).
import { validarObra, aceitaLancamento, OBRA_VAZIA } from '../src/lib/obras.js'
import { congelarMeta, bateuMeta, resumoMetas, podeIniciar } from '../src/lib/medicao.js'
import {
  podeCorrigir, podeLancarData, validarEfetivo, totalEfetivo, diarioTemConteudo, itemTemConteudo, linhasPreenchidas, efetivoParaComecar,
  efetivoPorFuncao, concluidoAoMudarQuantidade, cartaoNoDiario, porQueNaoLanca, climaComChuva, acimaDoSaldo,
} from '../src/lib/diario.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

// Obra
const obra = { ...OBRA_VAZIA, nome: 'Reforma X', codigo: 'RX-1', cliente: 'Prefeitura', data_inicio: '2026-01-10', data_entrega: '2026-12-20' }
conferir('obra completa passa', validarObra(obra), {})
conferir('obra vazia aponta os obrigatórios', Object.keys(validarObra(OBRA_VAZIA)).sort(), ['cliente', 'codigo', 'data_entrega', 'data_inicio', 'nome'])
conferir('entrega antes do início é recusada', Object.keys(validarObra({ ...obra, data_entrega: '2025-12-01' })), ['data_entrega'])
conferir('situação fora da lista é recusada', Object.keys(validarObra({ ...obra, situacao: 'Encerrada' })), ['situacao'])
conferir('obra concluída não aceita lançamento', aceitaLancamento({ situacao: 'Concluída' }), false)
conferir('obra parada aceita lançamento', aceitaLancamento({ situacao: 'Parada' }), true)

// Medição
const { itens, valor_planejado } = congelarMeta(
  [{ id: 'i1', servico_id: 'a', qtd_planejada: 10 }, { id: 'i2', servico_id: 'b', qtd_planejada: 3 }],
  { a: 12.5, b: 100 },
)
conferir('meta congelada = Σ qtd × preço', valor_planejado, 425)
conferir('preço e quantidade copiados no item', [itens[0].preco_unitario, itens[0].qtd_planejada_inicial], [12.5, 10])
conferir('bateu a meta com medido igual ao planejado', bateuMeta(100, 100), true)
conferir('não bateu abaixo do planejado', bateuMeta(100, 99.99), false)
conferir('meta zero nunca conta como batida', bateuMeta(0, 0), false)
conferir('resumo só conta medições fechadas', resumoMetas([
  { status: 'Fechada', meta_batida: true }, { status: 'Fechada', meta_batida: false }, { status: 'Em andamento', meta_batida: null },
]), { batidas: 1, total: 2 })
conferir('não inicia com outra em andamento', podeIniciar([{ id: 'm1', status: 'Em andamento' }, { id: 'm2', status: 'Planejando' }], 'm2'), false)
conferir('inicia a que está em planejamento', podeIniciar([{ id: 'm1', status: 'Fechada' }, { id: 'm2', status: 'Planejando' }], 'm2'), true)

// Correção do diário
const base = { role: 'Equipe da obra', profileId: 'p1', lancadoPor: 'p1', dataDiario: '2026-10-22' }
conferir('quem lançou corrige no dia seguinte', podeCorrigir({ ...base, hoje: '2026-10-23' }), true)
conferir('dois dias depois, não corrige mais', podeCorrigir({ ...base, hoje: '2026-10-24' }), false)
conferir('não corrige o lançamento de outra pessoa', podeCorrigir({ ...base, profileId: 'p2', hoje: '2026-10-22' }), false)
conferir('engenheiro corrige sempre', podeCorrigir({ ...base, role: 'Engenheiro', profileId: 'x', hoje: '2027-01-01' }), true)
conferir('diretoria não corrige', podeCorrigir({ ...base, role: 'Diretoria', hoje: '2026-10-22' }), false)

// Dia do diário: nunca no futuro; equipe hoje ou ontem; engenheiro desde o início da obra
const dia = (role, data) => podeLancarData({ role, data, hoje: '2026-10-24', inicioObra: '2026-06-26' })
conferir('equipe lança hoje', dia('Equipe da obra', '2026-10-24'), true)
conferir('equipe lança ontem', dia('Equipe da obra', '2026-10-23'), true)
conferir('equipe não lança anteontem', dia('Equipe da obra', '2026-10-22'), false)
conferir('ninguém lança amanhã', [dia('Engenheiro', '2026-10-25'), dia('Equipe da obra', '2026-10-25')], [false, false])
conferir('engenheiro lança um mês atrás', dia('Engenheiro', '2026-09-24'), true)
conferir('engenheiro não lança antes do início da obra', dia('Engenheiro', '2026-06-25'), false)
conferir('diretoria não lança', dia('Diretoria', '2026-10-24'), false)

// Efetivo
const L = (responsavel_id, funcao_id, quantidade) => ({ responsavel_id, funcao_id, quantidade })
conferir('efetivo completo passa', validarEfetivo([L('r1', 'f1', 4), L('r1', 'f2', 2)]), {})
conferir('linha sem responsável, sem função ou sem pessoas é apontada',
  Object.keys(validarEfetivo([L('', 'f1', 1), L('r1', '', 1), L('r1', 'f1', null), L('r1', 'f2', 0), L('r1', 'f3', 2.5)])), ['0', '1', '2', '3', '4'])
conferir('mesma função do mesmo responsável em duas linhas é apontada', Object.keys(validarEfetivo([L('r1', 'f1', 2), L('r1', 'f1', 3)])), ['1'])
conferir('total do efetivo', totalEfetivo([L('r1', 'f1', 4), L('r2', 'f1', 3)]), 7)

// Dia parado por chuva também é diário
conferir('só ocorrência já é diário', diarioTemConteudo({ itens: [], efetivo: [], atividades: '', ocorrencias: 'Chuva o dia todo' }), true)
conferir('só efetivo já é diário', diarioTemConteudo({ itens: [], efetivo: [L('r1', 'f1', 3)] }), true)
conferir('nada preenchido não é diário', diarioTemConteudo({ itens: [{ quantidade: 0, concluido: false }], efetivo: [], ocorrencias: '  ' }), false)
conferir('linha de efetivo em branco não conta como conteúdo', diarioTemConteudo({ itens: [], efetivo: [L('', '', null)] }), false)

// Linha em branco no efetivo não trava o envio
conferir('linha em branco é ignorada na validação', validarEfetivo([L('r1', 'f1', 2), L('', '', null)]), {})
conferir('linha em branco sai na hora de gravar', linhasPreenchidas([L('r1', 'f1', 2), L('', '', null)]).length, 1)

// Dia novo começa com o efetivo do último diário antes dele
const diarios = [
  { data: '2026-10-20', efetivo: [{ responsavel_id: 'r1', funcao_id: 'f1', quantidade: 3, funcao: 'Pedreiro' }] },
  { data: '2026-10-22', efetivo: [{ responsavel_id: 'r1', funcao_id: 'f2', quantidade: 5, funcao: 'Servente' }] },
  { data: '2026-10-24', efetivo: [{ responsavel_id: 'r9', funcao_id: 'f9', quantidade: 9, funcao: 'X' }] },
]
conferir('efetivo para começar vem do último dia antes', efetivoParaComecar(diarios, '2026-10-23'), [{ responsavel_id: 'r1', funcao_id: 'f2', quantidade: 5 }])
conferir('sem diário antes, começa vazio', efetivoParaComecar(diarios, '2026-10-01'), [])
conferir('efetivo por função soma os responsáveis', efetivoPorFuncao([{ funcao: 'Servente', quantidade: 2 }, { funcao: 'Pedreiro', quantidade: 4 }, { funcao: 'Servente', quantidade: 3 }]),
  [{ funcao: 'Servente', quantidade: 5 }, { funcao: 'Pedreiro', quantidade: 4 }])

// Concluído: acompanha o saldo, mas a escolha à mão vale
conferir('sem escolha à mão, acompanha o saldo', concluidoAoMudarQuantidade({ quantidade: 90, saldo: 90, atual: false, manual: false }), true)
conferir('sem escolha à mão, desmarca abaixo do saldo', concluidoAoMudarQuantidade({ quantidade: 60, saldo: 90, atual: true, manual: false }), false)
conferir('marcado à mão abaixo do saldo continua marcado', concluidoAoMudarQuantidade({ quantidade: 60, saldo: 90, atual: true, manual: true }), true)
conferir('desmarcado à mão continua desmarcado mesmo cobrindo o saldo', concluidoAoMudarQuantidade({ quantidade: 90, saldo: 90, atual: false, manual: true }), false)
conferir('acima do saldo avisa', acimaDoSaldo({ quantidade: 90.5, saldo: 90 }), true)
conferir('igual ao saldo não avisa', acimaDoSaldo({ quantidade: 90, saldo: 90 }), false)

// Cartão do serviço no diário
const item = (q, c = false) => ({ quantidade: q, concluido: c })
conferir('serviço não concluído aparece', cartaoNoDiario({ concluidoEmOutroDia: false, item: item(0), jaNoDia: false }), true)
conferir('concluído em outro dia e sem nada hoje: sai', cartaoNoDiario({ concluidoEmOutroDia: true, item: item(0), jaNoDia: false }), false)
conferir('concluído em outro dia mas com quantidade hoje: fica', cartaoNoDiario({ concluidoEmOutroDia: true, item: item(5), jaNoDia: false }), true)
conferir('na correção, o que já estava no dia fica mesmo zerado', cartaoNoDiario({ concluidoEmOutroDia: true, item: item(0), jaNoDia: true }), true)

// Mensagens e clima
conferir('equipe fora do prazo recebe a mensagem certa', porQueNaoLanca({ role: 'Equipe da obra', lancaDiario: true, obraAceita: true }).startsWith('A equipe lança'), true)
conferir('obra concluída tem prioridade', porQueNaoLanca({ role: 'Engenheiro', lancaDiario: true, obraAceita: false }), 'Esta obra está concluída e não aceita lançamentos.')
conferir('chuva à tarde marca o dia como chuvoso', climaComChuva({ clima_manha: 'Bom', clima_tarde: 'Chuva forte' }), true)
conferir('dia nublado não é chuvoso', climaComChuva({ clima_manha: 'Nublado', clima_tarde: 'Bom' }), false)

conferir('serviço só com memória de cálculo conta', itemTemConteudo({ quantidade: 0, concluido: false, memoria_calculo: '3 × 8,00 m' }), true)
conferir('serviço com memória em branco não conta', itemTemConteudo({ quantidade: 0, concluido: false, memoria_calculo: '   ' }), false)

console.log(`${ok}/${tot} — regras de obra, medição e diário`)
process.exit(ok === tot ? 0 : 1)
