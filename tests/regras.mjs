// Regras de obra, medição e diário (src/lib/obras.js, medicao.js, diario.js).
import { validarObra, aceitaLancamento, OBRA_VAZIA } from '../src/lib/obras.js'
import { congelarMeta, bateuMeta, resumoMetas, podeIniciar } from '../src/lib/medicao.js'
import { podeCorrigir } from '../src/lib/diario.js'

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

console.log(`${ok}/${tot} — regras de obra, medição e diário`)
process.exit(ok === tot ? 0 : 1)
