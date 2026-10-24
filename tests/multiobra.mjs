// MULTI-OBRA: nenhum dado de uma obra aparece na outra, e todo lançamento
// sai com o obra_id da obra escolhida. Se este teste falhar, alguma busca
// ou algum salvamento esqueceu o filtro por obra.
import * as mock from '../src/lib/mockData.js'
import {
  entrar, definirObraAtual, listarMinhasObras, listarServicos, listarLancamentos, listarDiarios,
  listarResponsaveis, listarMedicoes, listarFuncoes, listarGrupos, salvarDatasEap, salvarDiario,
  listarAditivos, buscarDadosOrcamento, salvarAditivo, salvarItemNovo, excluirAditivo, excluirItemNovo, arquivarServico,
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
const tabelas = { servicos: mock.servicos, responsaveis: mock.responsaveis, diarios: mock.diarios, lancamentos: mock.lancamentos, fotos: mock.fotos, medicoes: mock.medicoes, medicaoItens: mock.medicaoItens, membros: mock.membros, funcoes: mock.funcoes, efetivo: mock.efetivo, grupos: mock.grupos, aditivos: mock.aditivos, orcamentos: mock.orcamentos }
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
conferir('aditivo e item são sempre da mesma obra', mock.aditivos.every((a) => a.obra_id === servicoObra[a.servico_id]), true)
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
  conferir(`${obra.codigo}: grupos só desta obra`, soDaObra((await listarGrupos()).data, obra.id), true)
  conferir(`${obra.codigo}: dados do orçamento desta obra`, (await buscarDadosOrcamento()).data.obra_id, obra.id)
  conferir(`${obra.codigo}: aditivos só desta obra`, (await listarAditivos()).data.every((a) => a.obra_id === obra.id), true)
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
conferir('equipe não recebe preço, custo nem BDI', (await listarServicos()).data.some((s) => 'preco_unitario' in s || 'custo_unitario' in s || 'bdi' in s), false)
conferir('equipe não recebe os dados do orçamento', (await buscarDadosOrcamento()).data, null)
await entrar('p-dir')
conferir('diretoria vê as duas obras', (await listarMinhasObras()).data.length, 2)

// 5. Salvar o diário grava o obra_id da obra escolhida (a tela não passa obra).
await entrar('p-marcos')
definirObraAtual('obra-ba')
const servicoBA = mock.servicos.find((s) => s.obra_id === 'obra-ba' && s.codigo === '3.4.1')
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
// 11. Orçamento: item novo e aditivo nascem na obra escolhida e mudam a quantidade vigente.
await entrar('p-eng'); definirObraAtual('obra-ba')
const novoItem = { grupo: '2.1', fonte: 'COTAÇÃO', codigo_ref: 'COT-99', descricao: 'Placa adicional', unidade: 'un', quantidade: 2, custo_unitario: 850, bdi: 0.242, aditivo_numero: '1º aditivo' }
const criado = await salvarItemNovo(novoItem)
conferir('item novo fica na obra escolhida, com Item automático e P. Unit. truncado',
  criado.erro === null && [mock.servicos.find((s) => s.id === criado.data.id).obra_id, criado.data.codigo, criado.data.preco_unitario, criado.data.unidade], ['obra-ba', '2.1.9', 1055.7, 'UN'])
const tapume = mock.servicos.find((s) => s.obra_id === 'obra-ba' && s.codigo === '2.1.7')
const ad = await salvarAditivo({ servico_id: tapume.id, numero: '1º aditivo', data: hojeISO(), quantidade: 40, tipo: 'acrescimo', motivo: 'Ampliação' })
conferir('aditivo fica na obra escolhida', ad.erro === null && mock.aditivos.find((a) => a.id === ad.data.id).obra_id, 'obra-ba')
conferir('quantidade vigente = orçada + aditivo', (await listarServicos()).data.find((s) => s.id === tapume.id).qtd_contratada, 300)
conferir('supressão abaixo do executado é recusada', (await salvarAditivo({ servico_id: tapume.id, numero: '2º aditivo', data: hojeISO(), quantidade: 100, tipo: 'supressao', motivo: 'x' })).erro !== null, true)
// Corrigir e excluir aditivo; corrigir e excluir item novo.
conferir('corrigir o aditivo de 40 para 10 deixaria abaixo do executado (260)', (await salvarAditivo({ id: ad.data.id, numero: '1º aditivo', data: hojeISO(), quantidade: 10, tipo: 'supressao', motivo: 'x' })).erro !== null, true)
const corrigido = await salvarAditivo({ id: ad.data.id, numero: '1º aditivo', data: hojeISO(), quantidade: 60, tipo: 'acrescimo', motivo: 'Corrigido' })
conferir('aditivo corrigido muda a vigente e guarda quem editou', [corrigido.erro, (await listarServicos()).data.find((s) => s.id === tapume.id).qtd_contratada, mock.aditivos.find((a) => a.id === ad.data.id).alterado_por], [null, 320, 'p-eng'])
conferir('excluir o aditivo sem execução por cima passa', (await excluirAditivo(ad.data.id)).erro, null)
conferir('excluído, a vigente volta à orçada', (await listarServicos()).data.find((s) => s.id === tapume.id).qtd_contratada, 260)
const itemCorrigido = await salvarItemNovo({ ...novoItem, id: criado.data.id, quantidade: 3, custo_unitario: 900, grupo: '2.2' })
conferir('item novo corrigido: quantidade, preço e grupo (sem lançamento, ganha Item novo)', [itemCorrigido.erro, itemCorrigido.data?.qtd_contratada, itemCorrigido.data?.preco_unitario, itemCorrigido.data?.codigo], [null, 3, 1117.8, '2.2.9'])
const itemPlanilha = mock.servicos.find((s) => s.obra_id === 'obra-ba' && s.codigo === '2.1.1')
conferir('item da planilha não é corrigido como item novo', (await salvarItemNovo({ ...novoItem, id: itemPlanilha.id })).erro !== null, true)
conferir('item da planilha não é excluído', (await excluirItemNovo(itemPlanilha.id)).erro !== null, true)
conferir('item da planilha não é arquivado (muda por aditivo)', (await arquivarServico(itemPlanilha.id, true)).erro !== null, true)
conferir('item novo sem lançamento é excluído', [(await excluirItemNovo(criado.data.id)).erro, mock.servicos.some((s) => s.id === criado.data.id)], [null, false])

definirObraAtual('obra-vn')
conferir('excluir aditivo de outra obra é recusado', (await excluirAditivo('ad-ba-inexistente')).erro !== null, true)
conferir('aditivo em item de outra obra é recusado', (await salvarAditivo({ servico_id: tapume.id, numero: '1º', data: hojeISO(), quantidade: 1, tipo: 'acrescimo', motivo: 'x' })).erro !== null, true)
conferir('item novo em grupo que só existe na outra obra é recusado', (await salvarItemNovo({ ...novoItem, grupo: '17.5' })).erro !== null, true)
definirObraAtual('obra-ba')
// 12. EAP: datas dos itens gravadas de uma vez, na obra escolhida; com um erro, nada é gravado.
// Etapa e subetapa não recebem data: a EAP calcula pelos itens.
const placa = mock.servicos.find((s) => s.obra_id === 'obra-ba' && s.codigo === '2.1.1')
const container = mock.servicos.find((s) => s.obra_id === 'obra-ba' && s.codigo === '2.1.2')
const datasOk = await salvarDatasEap([
  { id: placa.id, inicio: '2026-11-03', fim: '2026-11-05' },
  { id: container.id, inicio: '2026-11-04', fim: '2026-12-10' },
])
conferir('datas da EAP gravadas nos itens desta obra', [datasOk.erro, placa.data_inicio_planejada, container.data_fim_planejada], [null, '2026-11-03', '2026-12-10'])
conferir('nenhuma data foi gravada em grupo', mock.grupos.some((g) => g.data_inicio_planejada || g.data_fim_planejada), false)
const comErro = await salvarDatasEap([
  { id: placa.id, inicio: '2026-12-01', fim: '2026-12-10' },
  { id: container.id, inicio: '2027-03-10', fim: '2027-03-01' },
])
conferir('fim antes do início recusa tudo, e aponta a linha', [comErro.erro !== null, Object.keys(comErro.erros), placa.data_inicio_planejada], [true, [container.id], '2026-11-03'])
definirObraAtual('obra-vn')
conferir('datas para item de outra obra são recusadas', (await salvarDatasEap([{ id: placa.id, inicio: '2026-11-01', fim: '2026-11-02' }])).erro !== null, true)
await entrar('p-marcos'); definirObraAtual('obra-ba')
conferir('equipe não lança datas da EAP', (await salvarDatasEap([{ id: placa.id, inicio: '2026-11-01', fim: '2026-11-02' }])).erro !== null, true)
conferir('equipe não inclui item novo', (await salvarItemNovo(novoItem)).erro !== null, true)
conferir('equipe não lança aditivo', (await salvarAditivo({ servico_id: tapume.id, numero: '1º', data: hojeISO(), quantidade: 1, tipo: 'acrescimo', motivo: 'x' })).erro !== null, true)

// 10. Memória de cálculo fica no serviço e não vai para o resumo do dia.
await entrar('p-eng'); definirObraAtual('obra-ba')
const servMem = mock.servicos.find((s) => s.obra_id === 'obra-ba' && s.codigo === '3.5.3')
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
