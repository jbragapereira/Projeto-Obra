// Planejamento: EAP montada pelos códigos dos serviços (src/lib/planejamento.js).
import { compararCodigos, proximoCodigo, montarEap, achatarEap, progressoDoGrupo, codigoValido, validarDatas, diasCorridos } from '../src/lib/planejamento.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

// Códigos
conferir('ordem numérica, não alfabética', ['10', '2', '1.10', '1.2', '1'].sort(compararCodigos), ['1', '1.2', '1.10', '2', '10'])
conferir('próximo filho dentro de 1.2', proximoCodigo('1.2', ['1', '1.2', '1.2.1', '1.2.3', '1.3']), '1.2.4')
conferir('primeiro filho de um grupo vazio', proximoCodigo('4', ['4']), '4.1')
conferir('próximo na raiz', proximoCodigo(null, ['1', '2', '2.1', '9']), '10')
conferir('código válido', [codigoValido('1.2.3'), codigoValido('1..2'), codigoValido('a')], [true, false, false])

// Árvore
const S = (id, codigo, extra = {}) => ({ id, codigo, descricao: `Serviço ${codigo}`, qtd_contratada: 100, preco_unitario: 10, ativo: true,
  data_inicio_planejada: '2026-10-01', data_fim_planejada: '2026-10-31', ...extra })
const servicos = [
  S('a', '1.2.1', { data_inicio_planejada: '2026-09-01', data_fim_planejada: '2026-10-10' }),
  S('b', '1.2.2', { data_fim_planejada: '2026-11-20', preco_unitario: 30 }),
  S('c', '3.1', {}),
  S('d', '1.1.1', { ativo: false }),
]
const raizes = montarEap({ servicos, grupos: [{ codigo: '1', nome: 'Preliminares' }], acumulado: { a: 100, b: 50, c: 0 } })
conferir('raízes em ordem, com os grupos criados pelos códigos', raizes.map((r) => [r.codigo, r.nome, r.tipo]), [['1', 'Preliminares', 'grupo'], ['3', 'Grupo 3', 'grupo']])
const g12 = raizes[0].filhos.find((f) => f.codigo === '1.2')
conferir('grupo intermediário sem nome aparece como "Grupo 1.2"', g12.nome, 'Grupo 1.2')
conferir('serviço arquivado não aparece', raizes[0].filhos.map((f) => f.codigo), ['1.2'])
conferir('datas do grupo = do início mais cedo ao fim mais tarde', [g12.inicio, g12.fim], ['2026-09-01', '2026-11-20'])
// a: 100% de R$ 1.000; b: 50% de R$ 3.000 → (1000 + 1500) / 4000 = 62,5%
conferir('progresso do grupo ponderado pelo valor', g12.progresso, 0.625)
conferir('lista achatada respeita grupo fechado', achatarEap(raizes, new Set(['1.2'])).map((n) => n.codigo), ['1', '1.2', '3', '3.1'])
const comArquivados = montarEap({ servicos, grupos: [], acumulado: {}, mostrarArquivados: true })
conferir('mostrando arquivados, ele volta marcado', achatarEap(comArquivados).find((n) => n.codigo === '1.1.1').arquivado, true)
conferir('grupo com nome e vazio aparece (acabou de ser criado)', montarEap({ servicos: [], grupos: [{ codigo: '7', nome: 'Hidráulica' }] }).map((r) => r.nome), ['Hidráulica'])

// Sem valores (equipe da obra), o progresso do grupo é média simples
conferir('sem preço, média simples', progressoDoGrupo([{ progresso: 1 }, { progresso: 0.5 }]), 0.75)

// Etapa e subetapa pegam as datas dos itens de dentro: início mais cedo e fim mais tarde, em todos os níveis.
// O exemplo do engenheiro: a placa (2.1.1) começa antes e termina depois de todos os outros itens.
const preliminares = montarEap({
  servicos: [
    S('placa', '2.1.1', { data_inicio_planejada: '2026-11-01', data_fim_planejada: '2027-02-28' }),
    S('container', '2.1.2', { data_inicio_planejada: '2026-11-05', data_fim_planejada: '2026-12-10' }),
    S('gerador', '2.2.5', { data_inicio_planejada: '2026-11-10', data_fim_planejada: '2027-01-31' }),
    S('topografia', '2.4.1', { data_inicio_planejada: null, data_fim_planejada: null }),
  ],
  grupos: [{ codigo: '2', nome: 'SERVIÇOS PRELIMINARES' }, { codigo: '2.1', nome: 'CANTEIRO DE OBRA' }, { codigo: '2.4', nome: 'EQUIPES' }],
})
const linhasP = achatarEap(preliminares)
const noP = (c) => linhasP.find((n) => n.codigo === c)
conferir('subetapa 2.1 pega o início e o fim da placa', [noP('2.1').inicio, noP('2.1').fim], ['2026-11-01', '2027-02-28'])
conferir('etapa 2 pega o início mais cedo e o fim mais tarde de todos os itens', [noP('2').inicio, noP('2').fim], ['2026-11-01', '2027-02-28'])
conferir('subetapa só com itens sem data fica sem data', [noP('2.4').inicio, noP('2.4').fim], [null, null])
conferir('grupo não usa data própria, mesmo que venha uma', montarEap({ servicos: [S('p', '9.1', { data_inicio_planejada: '2026-11-03', data_fim_planejada: '2026-11-04' })], grupos: [{ codigo: '9', nome: 'X', data_inicio_planejada: '2026-01-01', data_fim_planejada: '2026-12-31' }] }).map((g) => [g.inicio, g.fim]), [['2026-11-03', '2026-11-04']])

// Validação das datas
conferir('datas vazias podem (ainda sem data)', validarDatas({ inicio: '', fim: '' }), null)
conferir('só uma das datas é recusada', validarDatas({ inicio: '2026-11-01', fim: '' }) !== null, true)
conferir('fim antes do início é recusado', validarDatas({ inicio: '2026-11-10', fim: '2026-11-01' }) !== null, true)
conferir('mesmo dia passa', validarDatas({ inicio: '2026-11-10', fim: '2026-11-10' }), null)
conferir('dias corridos contam o primeiro e o último', [diasCorridos('2026-11-01', '2026-11-01'), diasCorridos('2026-11-01', '2026-11-30'), diasCorridos(null, '2026-11-30')], [1, 30, null])

console.log(`${ok}/${tot} — planejamento (EAP)`)
process.exit(ok === tot ? 0 : 1)
