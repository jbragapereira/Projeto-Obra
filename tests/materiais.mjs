// Materiais (src/lib/materiais.js): o fluxo dos pedidos de material no Kanban.
import {
  ALMOXARIFADO, CATALOGO_PADRAO, CATEGORIAS_PADRAO, COMPRADO, COTACAO, CRITICO, ENTREGUE, NORMAL, SOLICITAR, aplicarMovimento, atrasado, avanca,
  chegaEstaSemana, frenteDoCard, ordenarColuna, pedeFormulario, recebimentoNoCard,
  classeDaCor, contadores, diasNaColuna, leadTime, recebidoComProblema, statusAoLado, validarCategoria, validarMaterial, validarMovimento, validarPedido,
} from '../src/lib/materiais.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const HOJE = '2026-10-28' // quarta; a semana vai de 26/10 (segunda) a 01/11 (domingo)

conferir('coluna ao lado', [statusAoLado(SOLICITAR, 1), statusAoLado(ALMOXARIFADO, -1), statusAoLado(ENTREGUE, 1), statusAoLado(SOLICITAR, -1)], [COTACAO, COMPRADO, null, null])

const vencido = { status: COMPRADO, previsao_entrega: '2026-10-27' }
const sexta = { status: COMPRADO, previsao_entrega: '2026-10-30' }
const proxima = { status: COMPRADO, previsao_entrega: '2026-11-02' }
const hoje = { status: COMPRADO, previsao_entrega: HOJE }
conferir('atrasado: comprado com a previsão vencida (hoje ainda não é atraso)', [vencido, sexta, hoje, { ...vencido, status: ALMOXARIFADO }].map((p) => atrasado(p, HOJE)), [true, false, false, false])
conferir('chega esta semana: até domingo, sem os atrasados', [vencido, sexta, hoje, proxima].map((p) => chegaEstaSemana(p, HOJE)), [false, true, true, false])
conferir('contadores do topo', contadores([vencido, sexta, proxima, { status: COTACAO }, { status: COTACAO }, { status: SOLICITAR }], HOJE), { cotacao: 2, semana: 1, atrasados: 1 })

const andou = {
  status: COMPRADO,
  historico: [{ status: SOLICITAR, data: '2026-10-10' }, { status: COTACAO, data: '2026-10-12' }, { status: COMPRADO, data: '2026-10-20' }],
}
conferir('dias na coluna atual', diasNaColuna(andou, HOJE), 8)
const voltou = { ...andou, status: COTACAO, historico: [...andou.historico, { status: COTACAO, data: '2026-10-25' }] }
conferir('voltou de coluna: conta da última entrada nela', diasNaColuna(voltou, HOJE), 3)
conferir('lead time: só depois de chegar no almoxarifado', [leadTime(andou), leadTime({ status: ALMOXARIFADO, historico: [...andou.historico, { status: ALMOXARIFADO, data: '2026-10-24' }] })], [null, 14])
// Bugs da revisão de 26/10/2026: o card devolvido para Comprado seguia com lead time e com "Recebido com problema".
const idaEVolta = {
  status: COMPRADO, recebimento: { qtd_bate_nf: true, estado_ok: false, avarias: 'rasgados' },
  historico: [...andou.historico, { status: ALMOXARIFADO, data: '2026-10-22' }, { status: COMPRADO, data: '2026-10-23' }],
}
conferir('devolvido para Comprado: sem lead time e sem alerta de recebimento no card', [leadTime(idaEVolta), recebimentoNoCard(idaEVolta)], [null, { problema: false, avarias: '' }])
const chegouDeNovo = { ...idaEVolta, status: ALMOXARIFADO, historico: [...idaEVolta.historico, { status: ALMOXARIFADO, data: '2026-10-26' }] }
conferir('chegou de novo: lead time da última chegada e o alerta volta', [leadTime(chegouDeNovo), recebimentoNoCard(chegouDeNovo)], [16, { problema: true, avarias: 'rasgados' }])
conferir('avarias anotadas com tudo "sim" também aparecem (sem alerta)', recebimentoNoCard({ status: ALMOXARIFADO, recebimento: { qtd_bate_nf: true, estado_ok: true, avarias: 'caixa amassada' } }), { problema: false, avarias: 'caixa amassada' })
conferir('o que abre formulário: comprar, receber e entregar; cotar e voltar não', [
  pedeFormulario({ status: COTACAO }, COMPRADO), pedeFormulario({ status: SOLICITAR }, COTACAO), pedeFormulario({ status: ALMOXARIFADO }, COMPRADO),
  avanca({ status: COMPRADO }, ALMOXARIFADO), avanca({ status: COMPRADO }, COTACAO),
], [true, false, false, true, false])
conferir('frente do card: a de aplicação depois de entregue', [frenteDoCard({ status: ENTREGUE, frente: 'Pedido', frente_aplicada: 'Aplicada' }), frenteDoCard({ status: ALMOXARIFADO, frente: 'Pedido', frente_aplicada: 'x' })], ['Aplicada', 'Pedido'])
const velho = { id: 'v', prioridade: NORMAL, status: SOLICITAR, historico: [{ status: SOLICITAR, data: '2026-10-01' }] }
const novoCritico = { id: 'c', prioridade: CRITICO, status: SOLICITAR, historico: [{ status: SOLICITAR, data: '2026-10-27' }] }
const novoNormal = { id: 'n', prioridade: NORMAL, status: SOLICITAR, historico: [{ status: SOLICITAR, data: '2026-10-27' }] }
conferir('ordem na coluna: crítico primeiro, depois o mais antigo', ordenarColuna([novoNormal, velho, novoCritico], HOJE).map((p) => p.id), ['c', 'v', 'n'])
conferir('catálogo padrão: toda categoria usada existe', CATALOGO_PADRAO.every(([, , c]) => CATEGORIAS_PADRAO.some(([n]) => n === c)), true)

conferir('pedido novo: material do catálogo, quantidade, frente e prioridade', [
  Object.keys(validarPedido({ material_id: 'x', quantidade: 0, frente: ' ', prioridade: 'Urgente' }, ['m1'])),
  validarPedido({ material_id: 'm1', quantidade: 50, frente: 'Banheiro suíte', prioridade: CRITICO }, ['m1']),
], [['material_id', 'quantidade', 'frente', 'prioridade'], {}])

const emCotacao = { status: COTACAO, historico: [] }
conferir('comprar pede fornecedor e previsão', [
  Object.keys(validarMovimento(emCotacao, COMPRADO, {})),
  validarMovimento(emCotacao, COMPRADO, { fornecedor: 'Casa do Construtor', previsao_entrega: '2026-10-30' }),
], [['fornecedor', 'previsao_entrega'], {}])
conferir('receber pede o checklist respondido (sim ou não)', [
  Object.keys(validarMovimento(sexta, ALMOXARIFADO, { recebimento: { qtd_bate_nf: null } })),
  validarMovimento(sexta, ALMOXARIFADO, { recebimento: { qtd_bate_nf: false, estado_ok: true } }),
], [['qtd_bate_nf', 'estado_ok'], {}])
conferir('entregar pede a frente; voltar não pede nada; pular coluna não pode', [
  Object.keys(validarMovimento({ status: ALMOXARIFADO }, ENTREGUE, { frente_aplicada: '' })),
  validarMovimento({ status: ALMOXARIFADO }, COMPRADO, {}),
  Object.keys(validarMovimento({ status: SOLICITAR }, COMPRADO, {})),
], [['frente_aplicada'], {}, ['status']])

const recebido = aplicarMovimento({ ...sexta, historico: [] }, ALMOXARIFADO, { recebimento: { qtd_bate_nf: true, estado_ok: false, avarias: ' 3 sacos rasgados ' } }, HOJE)
conferir('mover grava o histórico e o checklist', [recebido.status, recebido.historico, recebido.recebimento], [ALMOXARIFADO, [{ status: ALMOXARIFADO, data: HOJE }], { qtd_bate_nf: true, estado_ok: false, avarias: '3 sacos rasgados', foto_nf: null }])
conferir('resposta "não" no checklist marca alerta', [recebidoComProblema(recebido.recebimento), recebidoComProblema({ qtd_bate_nf: true, estado_ok: true }), recebidoComProblema(null)], [true, false, false])
const comprado = aplicarMovimento({ ...emCotacao, fornecedor: '' }, COMPRADO, { fornecedor: ' Casa do Construtor ', previsao_entrega: '2026-10-30' }, HOJE)
conferir('comprar grava fornecedor e previsão', [comprado.fornecedor, comprado.previsao_entrega], ['Casa do Construtor', '2026-10-30'])
conferir('voltar não apaga o fornecedor', aplicarMovimento(comprado, COTACAO, {}, HOJE).fornecedor, 'Casa do Construtor')

conferir('material do catálogo: nome sem repetir, unidade e categoria da obra', [
  Object.keys(validarMaterial({ nome: 'cimento cp-ii 50 kg', unidade: '', categoria_id: 'cat-de-outra-obra' }, ['Cimento CP-II 50 kg'], ['cat-1'])),
  validarMaterial({ nome: 'Areia média', unidade: 'm³', categoria_id: 'cat-1' }, ['Cimento CP-II 50 kg'], ['cat-1']),
], [['nome', 'unidade', 'categoria_id'], {}])
conferir('categoria nova: nome sem repetir e cor da lista', [
  Object.keys(validarCategoria({ nome: ' acabamento ', cor: 'Vermelho' }, ['Acabamento'])),
  validarCategoria({ nome: 'Esquadrias', cor: 'Roxo' }, ['Acabamento']),
], [['nome', 'cor'], {}])
conferir('classe da etiqueta pela cor (cor desconhecida vira cinza)', [classeDaCor('Azul'), classeDaCor('Roxo'), classeDaCor('')], ['mat-cor-azul', 'mat-cor-roxo', 'mat-cor-cinza'])
conferir('prioridades', [NORMAL, CRITICO], ['Normal', 'Crítico'])

console.log(`${ok}/${tot} — materiais (pedidos)`)
process.exit(ok === tot ? 0 : 1)
