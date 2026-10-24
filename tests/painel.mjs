// As contas do Painel do mês (src/lib/painel.js). Node puro, sem framework.
import {
  diasSemAvanco, ritmoRecente, melhorSemana, terminoPrevisto, dataLimiteDecisao,
  situacao, sinalEntrega, ordenarPainel, analisarServico,
} from '../src/lib/painel.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const HOJE = '2026-10-23'
const L = (data, quantidade, concluido = false) => ({ servico_id: 's1', data, quantidade, concluido })

// Dias sem avanço
conferir('sem lançamento: null', diasSemAvanco([], HOJE), null)
conferir('lançamento zero não conta como avanço', diasSemAvanco([L('2026-10-20', 5), L('2026-10-22', 0)], HOJE), 3)
conferir('andou hoje: 0', diasSemAvanco([L(HOJE, 1)], HOJE), 0)

// Ritmo: média por dia trabalhado nos últimos 7 dias
conferir('ritmo dos últimos 7 dias', ritmoRecente([L('2026-10-20', 10), L('2026-10-22', 20), L('2026-10-10', 99)], HOJE), 15)
conferir('sem trabalho na semana: null', ritmoRecente([L('2026-10-01', 10)], HOJE), null)

// Melhor semana
conferir('melhor janela de 7 dias', melhorSemana([L('2026-10-01', 10), L('2026-10-05', 10), L('2026-10-20', 15)]), 20)

// Término e data limite
conferir('término = hoje + falta ÷ ritmo', terminoPrevisto(100, 10, HOJE), '2026-11-02')
conferir('sem ritmo, sem previsão', terminoPrevisto(100, null, HOJE), null)
conferir('data limite = fim − falta ÷ (melhor semana ÷ 7)', dataLimiteDecisao('2026-11-30', 70, 70), '2026-11-23')
conferir('sem histórico, sem data limite', dataLimiteDecisao('2026-11-30', 70, 0), null)

// Situação: a primeira regra que bater
const base = { concluido: false, noMes: true, diasSem: 1, termino: '2026-11-10', fimPlanejado: '2026-11-20', limite: '2026-11-01', hoje: HOJE }
conferir('concluído vence tudo', situacao({ ...base, concluido: true, diasSem: 30 }), 'Concluído')
conferir('5 dias sem avanço = parado', situacao({ ...base, diasSem: 5 }), 'Parado')
conferir('planejado no mês e nunca lançado = parado', situacao({ ...base, diasSem: null }), 'Parado')
conferir('fora do mês e nunca lançado = não iniciado', situacao({ ...base, diasSem: null, noMes: false }), 'Não iniciado')
conferir('termina depois do fim = atrasado', situacao({ ...base, termino: '2026-11-25' }), 'Atrasado')
conferir('passou da data limite = atenção', situacao({ ...base, limite: '2026-10-20' }), 'Atenção')
conferir('tudo certo = em dia', situacao(base), 'Em dia')

// Sinal da entrega
const a = (critico, sit, termino = null) => ({ servico: { critico, descricao: 'X' }, situacao: sit, termino, diasSem: 8 })
conferir('sem críticos com problema: de pé', sinalEntrega([a(true, 'Em dia'), a(false, 'Parado')], '2027-03-15').cor, 'ok')
conferir('crítico parado: em risco', sinalEntrega([a(true, 'Parado')], '2027-03-15').cor, 'amber')
conferir('crítico terminando depois da entrega: comprometida', sinalEntrega([a(true, 'Atrasado', '2027-04-01')], '2027-03-15').cor, 'red')
conferir('crítico não iniciado não acende o sinal', sinalEntrega([a(true, 'Não iniciado')], '2027-03-15').cor, 'ok')

// Ordem do painel: mais urgente primeiro; empate, o que mais falta em R$
const o = (id, sit, faltaValor) => ({ servico: { id }, situacao: sit, faltaValor, diasSem: 1 })
conferir('ordem por situação e por R$ que falta',
  ordenarPainel([o('a', 'Em dia', 900), o('b', 'Parado', 10), o('c', 'Parado', 500), o('d', 'Atenção', 1)], true).map((x) => x.servico.id),
  ['c', 'b', 'd', 'a'])

// Análise completa: valores somem quando o serviço não tem preço (perfil sem valores)
const servico = { id: 's1', descricao: 'Reboco', qtd_contratada: 100, data_fim_planejada: '2026-11-30', critico: false }
const medicao = { data_inicio: '2026-10-01', data_fim: '2026-10-31' }
const lancs = [L('2026-09-20', 10), L('2026-10-10', 20), L('2026-10-22', 10)]
const comPreco = analisarServico({ servico, lancamentos: lancs, item: { qtd_planejada: 50, preco_unitario: 2 }, medicao, hoje: HOJE })
conferir('executado no período só conta a medição', comPreco.executadoPeriodo, 30)
conferir('acumulado conta tudo', comPreco.acumulado, 40)
conferir('falta em R$ do mês', comPreco.faltaValor, 40)
const semPreco = analisarServico({ servico, lancamentos: lancs, item: { qtd_planejada: 50 }, medicao, hoje: HOJE })
conferir('sem preço, sem valores', [semPreco.valorPlanejado, semPreco.faltaValor], [null, null])

console.log(`${ok}/${tot} — painel`)
process.exit(ok === tot ? 0 : 1)
