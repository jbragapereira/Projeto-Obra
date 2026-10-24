// MULTI-OBRA: nenhum dado de uma obra aparece na outra, e todo lançamento
// sai com o obra_id da obra escolhida. Se este teste falhar, alguma busca
// ou algum salvamento esqueceu o filtro por obra.
import * as mock from '../src/lib/mockData.js'
import {
  entrar, definirObraAtual, listarMinhasObras, listarServicos, listarLancamentos, listarDiarios,
  listarResponsaveis, listarMedicoes, listarFuncoes, salvarDiario,
} from '../src/lib/dados.js'
import { addDias, hojeISO } from '../src/lib/datas.js'

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
const tabelas = { servicos: mock.servicos, responsaveis: mock.responsaveis, diarios: mock.diarios, lancamentos: mock.lancamentos, fotos: mock.fotos, medicoes: mock.medicoes, medicaoItens: mock.medicaoItens, membros: mock.membros, funcoes: mock.funcoes, efetivo: mock.efetivo }
for (const [nome, linhas] of Object.entries(tabelas)) {
  conferir(`${nome}: toda linha tem obra_id de uma obra que existe`, linhas.every((r) => obraIds.has(r.obra_id)), true)
}
const obraDe = (lista) => Object.fromEntries(lista.map((r) => [r.id, r.obra_id]))
const diarioObra = obraDe(mock.diarios)
const servicoObra = obraDe(mock.servicos)
const respObra = obraDe(mock.responsaveis)
const funcaoObra = obraDe(mock.funcoes)
conferir('efetivo, diário, responsável e função são sempre da mesma obra',
  mock.efetivo.every((l) => l.obra_id === diarioObra[l.diario_id] && l.obra_id === respObra[l.responsavel_id] && l.obra_id === funcaoObra[l.funcao_id]), true)
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
  conferir(`${obra.codigo}: funções só desta obra`, soDaObra((await listarFuncoes()).data, obra.id), true)
  const doHistorico = (await listarDiarios()).data.flatMap((d) => d.efetivo)
  conferir(`${obra.codigo}: efetivo do histórico só com responsáveis desta obra`, doHistorico.length > 0 && doHistorico.every((l) => respObra[l.responsavel_id] === obra.id), true)
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

// 7. Efetivo com responsável ou função de outra obra é recusado.
const funcaoVN = mock.funcoes.find((x) => x.obra_id === 'obra-vn')
const respBA = mock.responsaveis.find((r) => r.obra_id === 'obra-ba')
const misturaEfetivo = await salvarDiario({ data: hojeISO(), clima_manha: 'Bom', clima_tarde: 'Bom', ocorrencias: 'teste', itens: [], efetivo: [{ responsavel_id: respBA.id, funcao_id: funcaoVN.id, quantidade: 3 }] })
conferir('efetivo com função de outra obra é recusado', misturaEfetivo.erro !== null, true)

// 8. Dia sem produção, só com efetivo e ocorrência (chuva), é aceito e grava o efetivo na obra certa.
const funcaoBA = mock.funcoes.find((x) => x.obra_id === 'obra-ba')
const chuva = await salvarDiario({ data: hojeISO(), clima_manha: 'Chuva forte', clima_tarde: 'Chuva forte', ocorrencias: 'Chuva o dia todo', itens: [], efetivo: [{ responsavel_id: respBA.id, funcao_id: funcaoBA.id, quantidade: 3 }] })
conferir('dia de chuva sem produção é aceito', chuva.erro, null)
conferir('efetivo gravado com a obra escolhida', mock.efetivo.filter((l) => l.diario_id === chuva.data.id).every((l) => l.obra_id === 'obra-ba' && l.quantidade === 3), true)

// 9. A equipe não lança anteontem; o engenheiro lança.
const dataAnteontem = addDias(hojeISO(), -2)
const semDiario = mock.diarios.some((x) => x.obra_id === 'obra-ba' && x.data === dataAnteontem)
if (!semDiario) {
  conferir('equipe não lança anteontem', (await salvarDiario({ data: dataAnteontem, clima_manha: 'Bom', clima_tarde: 'Bom', ocorrencias: 'atrasado', itens: [] })).erro !== null, true)
  await entrar('p-eng'); definirObraAtual('obra-ba')
  conferir('engenheiro lança anteontem', (await salvarDiario({ data: dataAnteontem, clima_manha: 'Bom', clima_tarde: 'Bom', ocorrencias: 'lançado depois', itens: [] })).erro, null)
}
// 10. Memória de cálculo fica no serviço e não vai para o resumo do dia.
await entrar('p-eng'); definirObraAtual('obra-ba')
const servMem = mock.servicos.find((s) => s.obra_id === 'obra-ba' && s.codigo === '2.2.4')
const memoria = 'Bloco B1: 12 barras × 6,00 m × 0,617 kg/m = 44,42 kg'
const comMemoria = await salvarDiario({ data: hojeISO(), clima_manha: 'Bom', clima_tarde: 'Bom', ocorrencias: '', efetivo: [], itens: [{ servico_id: servMem.id, quantidade: 44.42, responsavel_id: servMem.responsavel_id, concluido: false, memoria_calculo: memoria }] })
conferir('diário com memória por serviço é salvo', comMemoria.erro, null)
conferir('memória gravada no lançamento do serviço', mock.lancamentos.some((l) => l.diario_id === comMemoria.data.id && l.servico_id === servMem.id && l.memoria_calculo === memoria), true)
const resumoDoDia = (await listarDiarios()).data.find((d) => d.id === comMemoria.data.id)
conferir('a memória não aparece no resumo do dia', JSON.stringify(resumoDoDia).includes('12 barras'), false)
conferir('o resumo traz o nome da atividade', resumoDoDia.atividades.some((a) => a.descricao === servMem.descricao), true)
conferir('ninguém lança amanhã', (await salvarDiario({ data: '2999-01-01', clima_manha: 'Bom', clima_tarde: 'Bom', ocorrencias: 'futuro', itens: [] })).erro !== null, true)

console.log(`${ok}/${tot} — multi-obra`)
process.exit(ok === tot ? 0 : 1)
