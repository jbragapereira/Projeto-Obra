// Cancelar e reativar cadastros (src/lib/cadastros.js).
import { aceitaNoRegistro, escolhaInicial, motivoParaNaoCancelar, motivoParaNaoReativar, paraEscolher, rotuloNaLista, separar } from '../src/lib/cadastros.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const lista = [{ id: 'a', nome: 'Pedreiro', ativo: true }, { id: 'b', nome: 'Gesseiro', ativo: false }, { id: 'c', nome: 'Servente', ativo: true }]
conferir('separar ativos e cancelados', ((s) => [s.ativos.map((x) => x.id), s.cancelados.map((x) => x.id)])(separar(lista)), [['a', 'c'], ['b']])
conferir('lista de escolha: só os ativos', paraEscolher(lista, '').map((x) => x.id), ['a', 'c'])
conferir('lista de escolha: o cancelado que já estava escolhido continua (correção de lançamento antigo)', paraEscolher(lista, 'b').map((x) => x.id), ['a', 'b', 'c'])
conferir('o cancelado aparece marcado', [rotuloNaLista(lista[0]), rotuloNaLista(lista[1])], ['Pedreiro', 'Gesseiro (cancelado)'])

const cat = { id: 'cat1', ativo: true }
const materiais = [{ id: 'm1', categoria_id: 'cat1', ativo: true }, { id: 'm2', categoria_id: 'cat1', ativo: true }, { id: 'm3', categoria_id: 'cat1', ativo: false }]
conferir('cancelar: categoria com material ativo não sai; sem material ativo, sai', [
  motivoParaNaoCancelar('categoriasMaterial', cat, { materiais }),
  motivoParaNaoCancelar('categoriasMaterial', cat, { materiais: [materiais[2]] }),
], ['Cancele antes os 2 materiais desta categoria.', null])
conferir('cancelar: já cancelado, inexistente, tabela desconhecida', [
  motivoParaNaoCancelar('funcoes', lista[1]), motivoParaNaoCancelar('funcoes', undefined), motivoParaNaoCancelar('obras', lista[0]),
], ['Este cadastro já está cancelado.', 'Cadastro não encontrado nesta obra.', 'Cadastro desconhecido.'])
conferir('reativar: material só com a categoria ativa', [
  motivoParaNaoReativar('materiais', { id: 'm3', categoria_id: 'cat1', ativo: false }, { categorias: [{ id: 'cat1', ativo: false }] }),
  motivoParaNaoReativar('materiais', { id: 'm3', categoria_id: 'cat1', ativo: false }, { categorias: [cat] }),
  motivoParaNaoReativar('funcoes', lista[0]),
], ['Reative antes a categoria deste material.', null, 'Este cadastro já está ativo.'])

// Bugs da revisão de 26/10/2026: o diário novo podia gravar (e já abrir com) um responsável cancelado.
conferir('gravar: ativo sempre; cancelado só se já estava gravado no registro', [
  aceitaNoRegistro(lista[0]), aceitaNoRegistro(lista[1]), aceitaNoRegistro(lista[1], new Set(['b'])), aceitaNoRegistro(undefined),
], [true, false, true, false])
conferir('sugestão de registro novo: só se ainda ativo', [escolhaInicial(lista, 'a'), escolhaInicial(lista, 'b'), escolhaInicial(lista, '')], ['a', '', ''])

console.log(`${ok}/${tot} — cancelar e reativar cadastros`)
process.exit(ok === tot ? 0 : 1)
