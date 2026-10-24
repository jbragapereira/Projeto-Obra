// MULTI-OBRA: nenhum dado de uma obra aparece na outra, e todo lançamento
// sai com o obra_id da obra escolhida. Se este teste falhar, alguma busca
// ou algum salvamento esqueceu o filtro por obra.
import * as mock from '../src/lib/mockData.js'
import {
  entrar, definirObraAtual, listarMinhasObras, listarServicos, listarLancamentos, listarDiarios,
  listarResponsaveis, listarMedicoes, salvarDiario,
} from '../src/lib/dados.js'
import { hojeISO } from '../src/lib/datas.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}
const soDaObra = (lista, obraId) => lista.length > 0 && lista.every((r) => r.obra_id === obraId)

// 1. Os dados de exemplo: toda tabela de lançamento tem obra_id válido, e coerente.
const obraIds = new Set(mock.obras.map((o) => o.id))
const tabelas = { servicos: mock.servicos, responsaveis: mock.responsaveis, diarios: mock.diarios, lancamentos: mock.lancamentos, fotos: mock.fotos, medicoes: mock.medicoes, medicaoItens: mock.medicaoItens, membros: mock.membros }
for (const [nome, linhas] of Object.entries(tabelas)) {
  conferir(`${nome}: toda linha tem obra_id de uma obra que existe`, linhas.every((r) => obraIds.has(r.obra_id)), true)
}
const obraDe = (lista) => Object.fromEntries(lista.map((r) => [r.id, r.obra_id]))
const diarioObra = obraDe(mock.diarios)
const servicoObra = obraDe(mock.servicos)
conferir('lançamento, diário e serviço são sempre da mesma obra',
  mock.lancamentos.every((l) => l.obra_id === diarioObra[l.diario_id] && l.obra_id === servicoObra[l.servico_id]), true)
conferir('existem duas obras de exemplo, diferentes', mock.obras.length === 2 && mock.obras[0].nome !== mock.obras[1].nome, true)

// 2. A camada de dados só devolve a obra escolhida.
await entrar('p-eng')
for (const obra of mock.obras) {
  definirObraAtual(obra.id)
  conferir(`${obra.codigo}: serviços só desta obra`, soDaObra((await listarServicos()).data, obra.id), true)
  conferir(`${obra.codigo}: lançamentos só desta obra`, soDaObra((await listarLancamentos()).data, obra.id), true)
  conferir(`${obra.codigo}: diários só desta obra`, soDaObra((await listarDiarios()).data, obra.id), true)
  conferir(`${obra.codigo}: responsáveis só desta obra`, soDaObra((await listarResponsaveis()).data, obra.id), true)
  conferir(`${obra.codigo}: medições só desta obra`, soDaObra((await listarMedicoes()).data, obra.id), true)
}

// 3. Sem obra escolhida, nada sai.
definirObraAtual(null)
conferir('sem obra escolhida, a busca recusa', (await listarServicos()).erro !== null, true)

// 4. Quem é de uma obra só vê aquela, e a equipe não recebe valores.
await entrar('p-lucas')
conferir('equipe do INSS só vê o INSS', (await listarMinhasObras()).data.map((o) => o.id), ['obra-vn'])
definirObraAtual('obra-vn')
conferir('equipe não recebe preço unitário', (await listarServicos()).data.some((s) => 'preco_unitario' in s), false)
await entrar('p-dir')
conferir('diretoria vê as duas obras', (await listarMinhasObras()).data.length, 2)

// 5. Salvar o diário grava o obra_id da obra escolhida (a tela não passa obra).
await entrar('p-marcos')
definirObraAtual('obra-ba')
const servicoBA = mock.servicos.find((s) => s.obra_id === 'obra-ba' && s.codigo === '2.3.1')
const antes = mock.lancamentos.length
const r = await salvarDiario({ data: hojeISO(), clima_manha: 'Bom', clima_tarde: 'Bom', ocorrencias: '', itens: [{ servico_id: servicoBA.id, quantidade: 12, responsavel_id: servicoBA.responsavel_id, concluido: false }] })
conferir('diário salvo sem erro', r.erro, null)
const novos = mock.lancamentos.slice(antes)
const tocados = mock.lancamentos.filter((l) => l.servico_id === servicoBA.id && l.quantidade === 12)
conferir('lançamento gravado com obra_id da obra escolhida', [...novos, ...tocados].every((l) => l.obra_id === 'obra-ba'), true)

// 6. Serviço de outra obra no lançamento é recusado.
const servicoVN = mock.servicos.find((s) => s.obra_id === 'obra-vn')
const misturado = await salvarDiario({ data: hojeISO(), clima_manha: 'Bom', clima_tarde: 'Bom', itens: [{ servico_id: servicoVN.id, quantidade: 1 }] })
conferir('lançar serviço de outra obra é recusado', misturado.erro !== null, true)

console.log(`${ok}/${tot} — multi-obra`)
process.exit(ok === tot ? 0 : 1)
