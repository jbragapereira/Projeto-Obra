// Orçamento: contas da planilha (truncar), aditivos e item novo (src/lib/orcamento.js).
import {
  FILTROS_ORCAMENTO, arredondarQtd, gruposDosItens, minimoDoItemNovo, normalizarItem, pesoNoOrcamento, podeExcluirAditivo, podeExcluirItemNovo, precoTotal, precoUnitario, qtdVigente, subtotaisPorGrupo, totaisDoOrcamento,
  truncar2, validarAditivo, validarItemNovo,
} from '../src/lib/orcamento.js'
import { ITENS_ARRECIFES } from '../src/lib/mockOrcamentoArrecifes.js'
import { percentual } from '../src/lib/formato.js'
import { rotuloDoDiario, veCadastrosDoDiario } from '../src/lib/perfis.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

// Contas: truncar, como a planilha (TRUNC), e sem o erro do ponto flutuante.
conferir('490 × 1,242 = 608,58 (não 608,57)', precoUnitario(490, 0.242), 608.58)
conferir('trunca, não arredonda: 10,05 × 1,242 = 12,4821 → 12,48', precoUnitario(10.05, 0.242), 12.48)
conferir('P. Total trunca: 287,35 × 17,38', precoTotal(287.35, 17.38), 4994.14)
conferir('truncar2 de 1,999', truncar2(1.999), 1.99)
// O orçamento real inteiro fecha linha a linha e no total geral (R$ 4.689.999,99).
const errados = ITENS_ARRECIFES.filter(([, , , , , , custo, bdi, pu]) => precoUnitario(custo, bdi) !== pu).map((i) => i[0])
conferir('P. Unit. de todas as 418 linhas da ARRECIFES bate com a planilha', errados, [])
const itensReais = ITENS_ARRECIFES.map(([codigo, , , , , q, , , pu]) => ({ codigo, qtd_orcada: q, qtd_contratada: q, preco_unitario: pu, origem: 'Planilha', ativo: true }))
conferir('total geral da ARRECIFES', totaisDoOrcamento(itensReais), { original: 4689999.99, vigente: 4689999.99, aditivos: 0 })
const sub = subtotaisPorGrupo(itensReais)
conferir('subtotais iguais aos da planilha (2, 2.1 e 1)', [sub['2'], sub['2.1'], sub['1']], [370686.17, 92803.54, 560922.84])

// Peso no orçamento (sobre o vigente)
const total = totaisDoOrcamento(itensReais).vigente
conferir('etapa 1 pesa 11,96% do orçamento', percentual(pesoNoOrcamento(sub['1'], total)), '11,96%')
conferir('item 2.1.1 (placa) pesa 0,10%', percentual(pesoNoOrcamento(4868.64, total)), '0,10%')
conferir('com aditivo, a base é o vigente', pesoNoOrcamento(500, 2000), 0.25)
conferir('orçamento vazio não divide por zero', pesoNoOrcamento(10, 0), 0)

// Item
conferir('normaliza o Item da planilha', ['2.1.1.', '2.0.', '10.0.', '2.1.', '3.1.10.'].map(normalizarItem), ['2.1.1', '2', '10', '2.1', '3.1.10'])

// Aditivos e totais
conferir('vigente = orçado + aditivos', qtdVigente(120, [{ quantidade: 20 }, { quantidade: -5.5 }]), 134.5)
const servicos = [
  { codigo: '1.1', qtd_orcada: 100, qtd_contratada: 120, preco_unitario: 10, origem: 'Planilha', ativo: true },
  { codigo: '1.2', qtd_orcada: 5, qtd_contratada: 5, preco_unitario: 100, origem: 'Item novo', ativo: true },
  { codigo: '2.1', qtd_orcada: 3, qtd_contratada: 3, preco_unitario: 100, origem: 'Item novo', ativo: false },
]
conferir('totais: item novo só entra no vigente; arquivado não conta', totaisDoOrcamento(servicos), { original: 1000, vigente: 1700, aditivos: 700 })
conferir('sem preço (equipe), não há totais', totaisDoOrcamento([{ codigo: '1', qtd_orcada: 1, qtd_contratada: 1, ativo: true }]), null)

// Filtros
const lista = [
  { id: 'a', codigo: '1.1.1', ativo: true, origem: 'Planilha', critico: true },
  { id: 'b', codigo: '1.2.1', ativo: true, origem: 'Item novo' },
  { id: 'c', codigo: '2.1.1', ativo: false, origem: 'Item novo' },
]
const filtrar = (f) => lista.filter((s) => FILTROS_ORCAMENTO[f](s, new Set(['a']))).map((s) => s.id)
conferir('filtros: todos, com aditivo, novos, críticos, arquivados', ['todos', 'aditivo', 'novos', 'criticos', 'arquivados'].map(filtrar), [['a', 'b'], ['a'], ['b'], ['a'], ['c']])
conferir('só os grupos que contêm os itens', gruposDosItens([lista[1]], [{ codigo: '1' }, { codigo: '1.1' }, { codigo: '1.2' }, { codigo: '2' }]).map((g) => g.codigo), ['1', '1.2'])

const base = { numero: '1º aditivo', data: '2026-10-24', quantidade: 20, tipo: 'acrescimo', motivo: 'Ampliação do tapume' }
conferir('acréscimo completo passa', validarAditivo(base, { vigente: 100, acumulado: 0 }), { erros: {}, quantidade: 20 })
conferir('supressão vem com sinal negativo', validarAditivo({ ...base, tipo: 'supressao' }, { vigente: 100, acumulado: 0 }).quantidade, -20)
conferir('supressão não deixa abaixo do executado', Object.keys(validarAditivo({ ...base, tipo: 'supressao', quantidade: 50 }, { vigente: 100, acumulado: 60 }).erros), ['quantidade'])
conferir('supressão maior que a vigente é recusada', Object.keys(validarAditivo({ ...base, tipo: 'supressao', quantidade: 150 }, { vigente: 100, acumulado: 0 }).erros), ['quantidade'])
conferir('aditivo vazio aponta os obrigatórios', Object.keys(validarAditivo({}, { vigente: 1, acumulado: 0 }).erros).sort(), ['data', 'motivo', 'numero', 'quantidade'])

// Editar e excluir aditivo: o tapume orçado em 260, +50 de aditivo (vigente 310), com 300 executados.
const tapume = { vigente: 260, vigenteAtual: 310, acumulado: 300 }
conferir('editar o acréscimo de 50 para 10 deixaria abaixo do executado', Object.keys(validarAditivo({ ...base, quantidade: 10 }, tapume).erros), ['quantidade'])
conferir('editar o acréscimo de 50 para 45 passa (305 ≥ 300)', validarAditivo({ ...base, quantidade: 45 }, tapume).erros, {})
conferir('editar para um acréscimo maior sempre passa', validarAditivo({ ...base, quantidade: 80 }, tapume).erros, {})
conferir('excluir o acréscimo com 300 executados é recusado', podeExcluirAditivo({ aditivo: { quantidade: 50 }, vigenteAtual: 310, acumulado: 300 }) !== null, true)
conferir('excluir o acréscimo sem execução passa', podeExcluirAditivo({ aditivo: { quantidade: 50 }, vigenteAtual: 310, acumulado: 0 }), null)
conferir('excluir uma supressão (a vigente sobe) sempre passa', podeExcluirAditivo({ aditivo: { quantidade: -4 }, vigenteAtual: 20, acumulado: 20 }), null)

const novo = { grupo: '2.1', fonte: 'COTAÇÃO', codigo_ref: '', descricao: 'Placa adicional', unidade: 'UN', quantidade: 1, custo_unitario: 850, bdi: 0.242, aditivo_numero: '1º aditivo' }
conferir('item novo completo passa', validarItemNovo(novo, ['2', '2.1']), {})
conferir('grupo que não existe é recusado', Object.keys(validarItemNovo({ ...novo, grupo: '9.9' }, ['2', '2.1'])), ['grupo'])
conferir('editar item novo para abaixo do executado é recusado', Object.keys(validarItemNovo({ ...novo, quantidade: 1 }, ['2.1'], { minimo: 1.5, acumulado: 1.5 })), ['quantidade'])
conferir('mínimo do item novo: incluídos 10, +5 de aditivo, 12 executados → 7', minimoDoItemNovo({ qtdOrcada: 10, vigente: 15, acumulado: 12 }), 7)
conferir('mínimo do item novo sem execução é zero', minimoDoItemNovo({ qtdOrcada: 10, vigente: 10, acumulado: 0 }), 0)
conferir('executou além: não deixa descer, mas aceita manter', minimoDoItemNovo({ qtdOrcada: 10, vigente: 10, acumulado: 12 }), 10)
conferir('item novo sem lançamento pode ser excluído', podeExcluirItemNovo({ item: { origem: 'Item novo' }, temLancamento: false, temFoto: false }), null)
conferir('item novo com lançamento não é excluído (arquiva)', podeExcluirItemNovo({ item: { origem: 'Item novo' }, temLancamento: true, temFoto: false }) !== null, true)
conferir('item da planilha nunca é excluído', podeExcluirItemNovo({ item: { origem: 'Planilha' }, temLancamento: false, temFoto: false }) !== null, true)
conferir('fonte fora da lista é recusada', Object.keys(validarItemNovo({ ...novo, fonte: 'X' }, ['2.1'])), ['fonte'])

conferir('quantidade sem resíduo do ponto flutuante', arredondarQtd(0.1 + 0.2), 0.3)
// Diário: rótulo da primeira aba e quem vê o cadastro (com o contato) de responsáveis e funções
conferir('rótulo do Diário por perfil', ['Engenheiro', 'Diretoria', 'Equipe da obra'].map(rotuloDoDiario), ['Diário do dia', 'Diário do dia', 'Lançar o dia'])
conferir('equipe não vê o cadastro com contatos', ['Engenheiro', 'Diretoria', 'Equipe da obra'].map(veCadastrosDoDiario), [true, true, false])

console.log(`${ok}/${tot} — orçamento`)
process.exit(ok === tot ? 0 : 1)
