// MULTI-OBRA: nenhum dado de uma obra aparece na outra, e todo lançamento
// sai com o obra_id da obra escolhida. Se este teste falhar, alguma busca
// ou algum salvamento esqueceu o filtro por obra.
import * as mock from '../src/lib/mockData.js'
import {
  entrar, definirObraAtual, listarMinhasObras, listarServicos, listarLancamentos, listarDiarios,
  listarResponsaveis, listarMedicoes, listarFuncoes, listarGrupos, salvarDatasEap, salvarDiario,
  listarAditivos, buscarDadosOrcamento, buscarCalendario, salvarCalendario, listarRestricoes, salvarRestricao, resolverRestricao, moverRestricao, excluirRestricao,
  cancelarCadastro, reativarCadastro, salvarObra, listarMateriais, salvarMaterial, listarCategoriasMaterial, salvarCategoriaMaterial, listarPedidosMaterial, salvarPedidoMaterial, moverPedidoMaterial,
  listarSemanaAtividades, listarSubtarefas, listarContratosEmpreiteiro, listarEquipamentos, salvarEquipamento, salvarContratoEmpreiteiro, moverContratoEmpreiteiro, salvarValorDoContrato, salvarBoletimEmpreiteiro, criarMedicao, listarItensMedicao, salvarQtdPlanejada, iniciarMedicao, descongelarMedicao, mudarStatusAtividade, definirResponsavelDaSemana, tirarDaSemana, salvarSubtarefa, mudarSubtarefa, excluirSubtarefa, salvarAditivo, salvarItemNovo, excluirAditivo, excluirItemNovo, arquivarServico,
} from '../src/lib/dados.js'
import { addDias, hojeISO } from '../src/lib/datas.js'
import { segundaDaSemana } from '../src/lib/datas.js'

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
const tabelas = { servicos: mock.servicos, responsaveis: mock.responsaveis, diarios: mock.diarios, lancamentos: mock.lancamentos, fotos: mock.fotos, medicoes: mock.medicoes, medicaoItens: mock.medicaoItens, membros: mock.membros, funcoes: mock.funcoes, efetivo: mock.efetivo, grupos: mock.grupos, aditivos: mock.aditivos, orcamentos: mock.orcamentos, calendarios: mock.calendarios, restricoes: mock.restricoes, semanaAtividades: mock.semanaAtividades, subtarefas: mock.subtarefas, contratosEmpreiteiro: mock.contratosEmpreiteiro, contratoItens: mock.contratoItens, boletinsEmpreiteiro: mock.boletinsEmpreiteiro, boletimLinhas: mock.boletimLinhas, equipamentos: mock.equipamentos, materiais: mock.materiais, categoriasMaterial: mock.categoriasMaterial, pedidosMaterial: mock.pedidosMaterial }
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
conferir('restrição e atividade são sempre da mesma obra', mock.restricoes.every((r) => r.obra_id === servicoObra[r.servico_id]), true)
conferir('kanban e subtarefa são sempre da mesma obra da atividade', [...mock.semanaAtividades, ...mock.subtarefas].every((r) => r.obra_id === servicoObra[r.servico_id]), true)
const contratoObra = obraDe(mock.contratosEmpreiteiro)
const boletimObra = obraDe(mock.boletinsEmpreiteiro)
conferir('contrato de empreiteiro, empreiteiro, itens, boletins e linhas são sempre da mesma obra', [
  mock.contratosEmpreiteiro.every((c) => c.obra_id === respObra[c.responsavel_id]),
  mock.contratoItens.every((i) => i.obra_id === contratoObra[i.contrato_id] && i.obra_id === servicoObra[i.servico_id]),
  mock.boletinsEmpreiteiro.every((b) => b.obra_id === contratoObra[b.contrato_id]),
  mock.boletimLinhas.every((l) => l.obra_id === boletimObra[l.boletim_id]),
], [true, true, true, true])
conferir('lançamento, diário e serviço são sempre da mesma obra',
  mock.lancamentos.every((l) => l.obra_id === diarioObra[l.diario_id] && l.obra_id === servicoObra[l.servico_id]), true)
conferir('existem duas obras de exemplo, diferentes', mock.obras.length === 2 && mock.obras[0].nome !== mock.obras[1].nome, true)

// 2. A camada de dados só devolve a obra escolhida.
await entrar('p-eng')
// A ARRECIFES começa zerada nos dados de exemplo: o teste lança um diário nela (tapume 2.1.7, 260 m²,
// com efetivo), para as duas obras terem dados e um vazamento aparecer.
definirObraAtual('obra-ba')
const tapumeBA = mock.servicos.find((s) => s.obra_id === 'obra-ba' && s.codigo === '2.1.7')
const respBAInicio = mock.responsaveis.find((r) => r.obra_id === 'obra-ba')
const funcaoBAInicio = mock.funcoes.find((x) => x.obra_id === 'obra-ba')
const inicioBA = await salvarDiario({ data: addDias(hojeISO(), -3), clima_manha: 'Bom', clima_tarde: 'Bom', ocorrencias: '',
  efetivo: [{ responsavel_id: respBAInicio.id, funcao_id: funcaoBAInicio.id, quantidade: 4 }],
  itens: [{ servico_id: tapumeBA.id, quantidade: 260, responsavel_id: respBAInicio.id, concluido: true }] })
conferir('diário de preparo lançado na ARRECIFES', inicioBA.erro, null)
// ARRECIFES: o cronograma do contrato já cria as 10 medições (1ª = out + nov/26; depois mês a mês até
// ago/27), em planejamento e vazias; cada uma se enche pela EAP do seu período.
const mesBA = (dia) => '2026-10-' + dia
const medicoesBA = (await listarMedicoes()).data.sort((a, b) => a.numero - b.numero)
conferir('cronograma: 10 medições vazias, a 1ª de 01/10 a 30/11/26 e a última em ago/27',
  [medicoesBA.length, medicoesBA[0].data_inicio, medicoesBA[0].data_fim, medicoesBA[1].data_inicio, medicoesBA.at(-1).data_fim, medicoesBA.every((m) => m.qtd_itens === 0)],
  [10, '2026-10-01', '2026-11-30', '2026-12-01', '2027-08-31', true])
const med11 = await criarMedicao()
const med12 = await criarMedicao()
conferir('passando do contrato, a Nova medição cria a 11 (set/27) e depois a 12 (out/27), na obra escolhida',
  [med11.erro, med11.data?.numero, med11.data?.data_inicio, med11.data?.data_fim, med11.data?.obra_id, med12.data?.numero, med12.data?.data_inicio, med12.data?.data_fim],
  [null, 11, '2027-09-01', '2027-09-30', 'obra-ba', 12, '2027-10-01', '2027-10-31'])
await entrar('p-dir')
conferir('diretoria não cria medição', (await criarMedicao()).erro !== null, true)
await entrar('p-eng'); definirObraAtual('obra-ba')
const placaBA = mock.servicos.find((s) => s.obra_id === 'obra-ba' && s.codigo === '2.1.1')
await salvarDatasEap([{ id: placaBA.id, inicio: mesBA('01'), fim: mesBA('02') }])
const med1 = medicoesBA[0]
const itensMed1 = async () => (await listarItensMedicao(med1.id)).data
conferir('a placa de obra com datas em outubro entra na Medição 1, só ela',
  [med1.numero, med1.obra_id, (await itensMed1()).map((i) => [i.servico_id, i.obra_id, i.qtd_planejada])],
  [1, 'obra-ba', [[placaBA.id, 'obra-ba', placaBA.qtd_orcada]]])
const escavacaoBA = mock.servicos.find((s) => s.obra_id === 'obra-ba' && s.codigo === '3.4.1')
await salvarDatasEap([{ id: escavacaoBA.id, inicio: mesBA('03'), fim: mesBA('10') }])
conferir('outro item com datas no mês entra sozinho na Medição 1', (await itensMed1()).map((i) => i.servico_id).sort(), [placaBA.id, escavacaoBA.id].sort())
const itemPlaca = (await itensMed1()).find((i) => i.servico_id === placaBA.id)
await salvarQtdPlanejada(itemPlaca.id, 3)
await salvarDatasEap([{ id: placaBA.id, inicio: mesBA('01'), fim: mesBA('05') }])
conferir('quantidade ajustada à mão não muda com a EAP', (await itensMed1()).find((i) => i.servico_id === placaBA.id).qtd_planejada, 3)
// Congelar e descongelar para replanejar: volta a Planejando, sem meta congelada, e segue a EAP de novo.
const congelada = await iniciarMedicao(med1.id)
await entrar('p-dir'); definirObraAtual('obra-ba')
const pelaDiretoria = await descongelarMedicao(med1.id)
await entrar('p-eng'); definirObraAtual('obra-ba')
const descongelada = await descongelarMedicao(med1.id)
conferir('descongelar: só o engenheiro; a medição volta a Planejando sem meta congelada',
  [congelada.data?.status, pelaDiretoria.erro !== null, descongelada.erro, descongelada.data?.status, descongelada.data?.valor_planejado, (await itensMed1()).every((i) => i.qtd_planejada_inicial === null)],
  ['Em andamento', true, null, 'Planejando', null, true])
conferir('medição em planejamento não descongela', (await descongelarMedicao(med1.id)).erro !== null, true)
// Item de 23/11 a 04/12: 6 dias úteis em novembro (Medição 1) e 4 em dezembro (Medição 2).
await salvarDatasEap([{ id: escavacaoBA.id, inicio: '2026-11-23', fim: '2026-12-04' }])
const itensDe = async (m) => (await listarItensMedicao(m.id)).data
const fatia = async (m) => (await itensDe(m)).find((i) => i.servico_id === escavacaoBA.id)?.qtd_planejada
conferir('item que cruza dois períodos entra nas duas medições, dividido pelos dias úteis',
  [await fatia(medicoesBA[0]), await fatia(medicoesBA[1]), await fatia(medicoesBA[2])],
  [Math.floor(escavacaoBA.qtd_orcada * 6 / 10 * 100) / 100, Math.floor(escavacaoBA.qtd_orcada * 4 / 10 * 100) / 100, undefined])
await salvarDatasEap([{ id: escavacaoBA.id, inicio: null, fim: null }])
conferir('item que perde as datas sai da Medição 1', (await itensMed1()).map((i) => i.servico_id), [placaBA.id])
// O que o Diário executa dentro do mês não encolhe a meta do próprio mês.
await salvarDatasEap([{ id: escavacaoBA.id, inicio: mesBA('01'), fim: mesBA('02') }])
const qtdEscavacao = () => itensMed1().then((l) => l.find((i) => i.servico_id === escavacaoBA.id)?.qtd_planejada)
const metaEscavacao = await qtdEscavacao()
await salvarDiario({ data: mesBA('01'), clima_manha: 'Bom', clima_tarde: 'Bom', ocorrencias: '', efetivo: [],
  itens: [{ servico_id: escavacaoBA.id, quantidade: 100, responsavel_id: 'r-silva', concluido: false }] })
conferir('execução no próprio mês não muda a meta da medição', [metaEscavacao, await qtdEscavacao()], [escavacaoBA.qtd_orcada, escavacaoBA.qtd_orcada])
const respDoINSS = mock.responsaveis.find((r) => r.obra_id === 'obra-vn')
conferir('"Quem executou" de outra obra é recusado no diário', (await salvarDiario({ data: mesBA('01'), clima_manha: 'Bom', clima_tarde: 'Bom', ocorrencias: '', efetivo: [],
  itens: [{ servico_id: escavacaoBA.id, quantidade: 1, responsavel_id: respDoINSS.id, concluido: false }] })).erro !== null, true)
await salvarDatasEap([{ id: escavacaoBA.id, inicio: null, fim: null }])
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
// 13. Calendário: o feriado municipal entra só na obra escolhida; a equipe não muda o calendário.
const feriadosBA = (await buscarCalendario()).data.feriados
const cal = await salvarCalendario({ dias_semana: [1, 2, 3, 4, 5, 6], feriados: [...feriadosBA, { data: '2026-07-16', nome: 'Nossa Senhora do Carmo (Recife)' }] })
conferir('calendário salvo na obra escolhida, com sábado e o feriado de Recife', [cal.erro, cal.data?.obra_id, cal.data?.dias_semana.includes(6), cal.data?.feriados.some((x) => x.data === '2026-07-16')], [null, 'obra-ba', true, true])
conferir('o calendário da outra obra não mudou', mock.calendarios.find((c) => c.obra_id === 'obra-vn').feriados.some((x) => x.data === '2026-07-16') || mock.calendarios.find((c) => c.obra_id === 'obra-vn').dias_semana.includes(6), false)
conferir('calendário sem dia de trabalho é recusado', (await salvarCalendario({ dias_semana: [], feriados: [] })).erro !== null, true)

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
conferir('equipe não muda o calendário', (await salvarCalendario({ dias_semana: [1], feriados: [] })).erro !== null, true)
conferir('equipe não lança datas da EAP', (await salvarDatasEap([{ id: placa.id, inicio: '2026-11-01', fim: '2026-11-02' }])).erro !== null, true)
conferir('equipe não inclui item novo', (await salvarItemNovo(novoItem)).erro !== null, true)
conferir('equipe não lança aditivo', (await salvarAditivo({ servico_id: tapume.id, numero: '1º', data: hojeISO(), quantidade: 1, tipo: 'acrescimo', motivo: 'x' })).erro !== null, true)

// 14. Restrições (médio prazo): ficam na obra escolhida; engenheiro e equipe criam e resolvem;
// editar, mover e excluir é do engenheiro.
await entrar('p-marcos'); definirObraAtual('obra-ba')
const escavacao = mock.servicos.find((s) => s.obra_id === 'obra-ba' && s.codigo === '3.4.1')
const novaR = { servico_id: escavacao.id, tipo: 'Material', descricao: 'Óleo do trator', semana: segundaDaSemana(hojeISO()), prazo: hojeISO(), responsavel: 'Marcos' }
const rEquipe = await salvarRestricao(novaR)
conferir('equipe cria restrição na obra escolhida', [rEquipe.erro, mock.restricoes.find((x) => x.id === rEquipe.data?.id)?.obra_id], [null, 'obra-ba'])
conferir('equipe resolve a restrição e fica o nome de quem resolveu', [(await resolverRestricao(rEquipe.data.id, true)).erro, mock.restricoes.find((x) => x.id === rEquipe.data.id).resolvida_por], [null, 'p-marcos'])
conferir('equipe não edita restrição', (await salvarRestricao({ ...novaR, id: rEquipe.data.id, descricao: 'x' })).erro !== null, true)
conferir('equipe não move restrição', (await moverRestricao(rEquipe.data.id, 1)).erro !== null, true)
conferir('equipe não exclui restrição', (await excluirRestricao(rEquipe.data.id)).erro !== null, true)
conferir('restrições só desta obra', (await listarRestricoes()).data.every((x) => x.obra_id === 'obra-ba'), true)
await entrar('p-eng'); definirObraAtual('obra-vn')
conferir('restrição em atividade de outra obra é recusada', (await salvarRestricao(novaR)).erro !== null, true)
conferir('resolver restrição de outra obra é recusado', (await resolverRestricao(rEquipe.data.id, false)).erro !== null, true)
definirObraAtual('obra-ba')
conferir('engenheiro move de semana', (await moverRestricao(rEquipe.data.id, 1)).data?.semana, addDias(segundaDaSemana(hojeISO()), 7))
conferir('engenheiro exclui', [(await excluirRestricao(rEquipe.data.id)).erro, mock.restricoes.some((x) => x.id === rEquipe.data.id)], [null, false])
await entrar('p-dir'); definirObraAtual('obra-ba')
conferir('diretoria só vê (não cria)', (await salvarRestricao(novaR)).erro !== null, true)

// 15. Curto prazo: kanban e subtarefas ficam na obra escolhida; "não realizado" exige causa;
// engenheiro e equipe movem; tirar da semana é do engenheiro.
await entrar('p-marcos'); definirObraAtual('obra-ba')
const semanaAtual = segundaDaSemana(hojeISO())
const piso = mock.servicos.find((s) => s.obra_id === 'obra-ba' && s.codigo === '3.5.3')
conferir('equipe move para "Em andamento" na obra escolhida', [(await mudarStatusAtividade({ semana: semanaAtual, servico_id: piso.id, status: 'Em andamento' })).erro,
  mock.semanaAtividades.find((x) => x.servico_id === piso.id && x.semana === semanaAtual)?.obra_id], [null, 'obra-ba'])
conferir('"não realizado" sem causa é recusado', (await mudarStatusAtividade({ semana: semanaAtual, servico_id: piso.id, status: 'Não realizado' })).erro !== null, true)
conferir('"não realizado" com causa passa', (await mudarStatusAtividade({ semana: semanaAtual, servico_id: piso.id, status: 'Não realizado', causa: 'Clima' })).data?.causa, 'Clima')
const respVN = mock.responsaveis.find((r) => r.obra_id === 'obra-vn')
conferir('equipe escolhe o responsável do cartão na obra escolhida', [(await definirResponsavelDaSemana({ semana: semanaAtual, servico_id: piso.id, responsavel_id: 'r-silva' })).erro,
  mock.semanaAtividades.find((x) => x.servico_id === piso.id && x.semana === semanaAtual)?.responsavel_id], [null, 'r-silva'])
conferir('responsável de outra obra no cartão é recusado', (await definirResponsavelDaSemana({ semana: semanaAtual, servico_id: piso.id, responsavel_id: respVN.id })).erro !== null, true)
conferir('equipe não tira atividade da semana', (await tirarDaSemana({ semana: semanaAtual, servico_id: piso.id, fora: true })).erro !== null, true)
const sub = await salvarSubtarefa({ semana: semanaAtual, servico_id: piso.id, texto: 'Assentar trecho A' })
conferir('subtarefa criada na obra escolhida', [sub.erro, mock.subtarefas.find((x) => x.id === sub.data?.id)?.obra_id], [null, 'obra-ba'])
conferir('subtarefa não realizada sem causa é recusada', (await mudarSubtarefa(sub.data.id, { situacao: 'Não realizada' })).erro !== null, true)
conferir('subtarefa feita', (await mudarSubtarefa(sub.data.id, { situacao: 'Feita' })).data?.situacao, 'Feita')
conferir('semana e subtarefas só desta obra', [(await listarSemanaAtividades()).data.every((x) => x.obra_id === 'obra-ba'), (await listarSubtarefas()).data.every((x) => x.obra_id === 'obra-ba')], [true, true])
await entrar('p-eng'); definirObraAtual('obra-vn')
conferir('mexer em atividade de outra obra é recusado', (await mudarStatusAtividade({ semana: semanaAtual, servico_id: piso.id, status: 'Concluído' })).erro !== null, true)
conferir('subtarefa de outra obra é recusada', (await mudarSubtarefa(sub.data.id, { situacao: 'Pendente' })).erro !== null, true)
definirObraAtual('obra-ba')
conferir('engenheiro tira da semana', (await tirarDaSemana({ semana: semanaAtual, servico_id: piso.id, fora: true })).data?.fora, true)
conferir('engenheiro exclui subtarefa', (await excluirSubtarefa(sub.data.id)).erro, null)
await entrar('p-dir'); definirObraAtual('obra-ba')
conferir('diretoria não escolhe responsável', (await definirResponsavelDaSemana({ semana: semanaAtual, servico_id: piso.id, responsavel_id: 'r-silva' })).erro !== null, true)
conferir('diretoria só vê o curto prazo', (await mudarStatusAtividade({ semana: semanaAtual, servico_id: piso.id, status: 'Concluído' })).erro !== null, true)

// 16. Diário → Kanban: produção lançada faz a atividade andar na semana, na obra escolhida.
await entrar('p-eng'); definirObraAtual('obra-ba')
const demolicao = mock.servicos.find((s) => s.obra_id === 'obra-ba' && s.codigo === '3.1.4')
// A EAP da ARRECIFES começa sem datas: o engenheiro lança o período da demolição cobrindo esta semana.
await salvarDatasEap([{ id: demolicao.id, inicio: addDias(segundaDaSemana(hojeISO()), -7), fim: addDias(segundaDaSemana(hojeISO()), 13) }])
const regDemolicao = () => mock.semanaAtividades.find((x) => x.servico_id === demolicao.id && x.semana === segundaDaSemana(hojeISO()))
conferir('antes do diário, a demolição não foi mexida no Kanban', regDemolicao()?.status ?? 'A fazer', 'A fazer')
await salvarDiario({ data: hojeISO(), clima_manha: 'Bom', clima_tarde: 'Bom', ocorrencias: '', efetivo: [], itens: [{ servico_id: demolicao.id, quantidade: 5, responsavel_id: demolicao.responsavel_id, concluido: false }] })
conferir('com produção no diário, vai para Em andamento (na obra escolhida)', [regDemolicao()?.status, regDemolicao()?.obra_id], ['Em andamento', 'obra-ba'])
await salvarDiario({ data: hojeISO(), clima_manha: 'Bom', clima_tarde: 'Bom', ocorrencias: '', efetivo: [], itens: [{ servico_id: demolicao.id, quantidade: 5, responsavel_id: 'r-ba-prop', concluido: false }] })
conferir('quem executou no diário vira o responsável do cartão na semana', regDemolicao()?.responsavel_id, 'r-ba-prop')
const zerado = await salvarDiario({ data: hojeISO(), clima_manha: 'Bom', clima_tarde: 'Bom', ocorrencias: '', efetivo: [], itens: [{ servico_id: demolicao.id, quantidade: 0, responsavel_id: 'r-ba-prop', concluido: false }] })
conferir('zerar no diário (sem mais nada no dia) salva e o Kanban volta para A fazer', [zerado.erro, regDemolicao()?.status], [null, 'A fazer'])
await salvarDiario({ data: hojeISO(), clima_manha: 'Bom', clima_tarde: 'Bom', ocorrencias: '', efetivo: [], itens: [{ servico_id: demolicao.id, quantidade: 5, responsavel_id: 'r-ba-prop', concluido: false }] })
conferir('lançada de novo, volta para Em andamento', regDemolicao()?.status, 'Em andamento')
// Vale a última ação: movido no Kanban, só uma mudança na quantidade dele no Diário mexe de novo.
await mudarStatusAtividade({ semana: segundaDaSemana(hojeISO()), servico_id: demolicao.id, status: 'A fazer' })
await salvarDiario({ data: hojeISO(), clima_manha: 'Bom', clima_tarde: 'Bom', ocorrencias: 'Visita da fiscalização.', efetivo: [], itens: [{ servico_id: demolicao.id, quantidade: 5, responsavel_id: 'r-ba-prop', concluido: false }] })
conferir('salvar o diário sem mudar a quantidade não desfaz o que foi movido no Kanban', regDemolicao()?.status, 'A fazer')
await salvarDiario({ data: hojeISO(), clima_manha: 'Bom', clima_tarde: 'Bom', ocorrencias: '', efetivo: [], itens: [{ servico_id: demolicao.id, quantidade: 7, responsavel_id: 'r-ba-prop', concluido: false }] })
conferir('mudar a quantidade no diário volta a mandar no Kanban', regDemolicao()?.status, 'Em andamento')
await salvarDiario({ data: hojeISO(), clima_manha: 'Bom', clima_tarde: 'Bom', ocorrencias: '', efetivo: [], itens: [{ servico_id: demolicao.id, quantidade: demolicao.qtd_orcada, responsavel_id: 'r-ba-prop', concluido: true }] })
conferir('quantidade total do item leva o Kanban para Concluído', regDemolicao()?.status, 'Concluído')
await salvarDiario({ data: hojeISO(), clima_manha: 'Bom', clima_tarde: 'Bom', ocorrencias: '', efetivo: [], itens: [{ servico_id: demolicao.id, quantidade: 5, responsavel_id: 'r-ba-prop', concluido: false }] })
conferir('e, corrigida para menos, volta para Em andamento', regDemolicao()?.status, 'Em andamento')
const semDatas = mock.servicos.find((s) => s.obra_id === 'obra-ba' && s.codigo === '17.5.3')
await salvarDiario({ data: hojeISO(), clima_manha: 'Bom', clima_tarde: 'Bom', ocorrencias: '', efetivo: [], itens: [{ servico_id: semDatas.id, quantidade: 1, responsavel_id: null, concluido: false }] })
conferir('item não planejado na semana não entra no Kanban pelo diário', mock.semanaAtividades.some((x) => x.servico_id === semDatas.id), false)

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

// 17. Medição de empreiteiros: cada obra vê só os seus contratos; só o engenheiro mexe; a equipe não vê.
await entrar('p-eng'); definirObraAtual('obra-vn')
const contratosVN = (await listarContratosEmpreiteiro()).data
conferir('INSS: só contratos desta obra, com valor e medido', [contratosVN.every((c) => c.obra_id === 'obra-vn'), contratosVN.length, contratosVN.find((c) => c.id === 'ce-vn-4')?.valor_total, contratosVN.find((c) => c.id === 'ce-vn-4')?.medido_valor],
  [true, 5, 1850 * 38 + 980 * 21 + 180 * 70, 46400])
definirObraAtual('obra-ba')
conferir('ARRECIFES: só os dela, com Gesso (30.000, 30% medido) e Drywall (30.000, 16.400 medido)', ((l) => [l.every((c) => c.obra_id === 'obra-ba'), l.length, l.find((c) => c.id === 'ce-ba-3')?.pct_medido, l.find((c) => c.id === 'ce-ba-4')?.valor_total, l.find((c) => c.id === 'ce-ba-4')?.medido_valor])((await listarContratosEmpreiteiro()).data), [true, 5, 0.3, 30000, 16400])
conferir('mão de obra própria não tem contrato de empreiteiro', (await salvarContratoEmpreiteiro({ responsavel_id: 'r-ba-prop', descricao: 'Teste' })).erros?.responsavel_id !== undefined, true)
conferir('empreiteiro de outra obra é recusado', (await salvarContratoEmpreiteiro({ responsavel_id: 'r-pedra', descricao: 'Teste' })).erros?.responsavel_id !== undefined, true)
const novoBA = await salvarContratoEmpreiteiro({ responsavel_id: 'r-silva', descricao: 'Drenagem' })
conferir('novo contrato nasce em elaboração, na obra escolhida', [novoBA.erro, novoBA.data?.status, novoBA.data?.obra_id], [null, 'Em elaboração', 'obra-ba'])
conferir('ativar direto pela seta é recusado (pede o valor)', [(await moverContratoEmpreiteiro(novoBA.data.id, 'Enviado p/ aprovação')).erro, (await moverContratoEmpreiteiro(novoBA.data.id, 'Aprovado / Ativo')).erro !== null], [null, true])
conferir('item de outra obra no escopo é recusado', (await salvarValorDoContrato(novoBA.data.id, { tipo: 'Por escopo', itens: [{ servico_id: 's-vn-3.1.4', quantidade: 10, preco_unitario: 5 }] })).erro !== null, true)
const ativadoBA = await salvarValorDoContrato(novoBA.data.id, { tipo: 'Por escopo', itens: [{ servico_id: 's-ba-3.4.1', quantidade: 100, preco_unitario: 4.5 }] })
conferir('ativar por escopo com item do Orçamento desta obra', [ativadoBA.erro, ativadoBA.data?.status, ativadoBA.data?.valor_total, mock.contratoItens.filter((i) => i.contrato_id === novoBA.data.id).every((i) => i.obra_id === 'obra-ba')], [null, 'Aprovado / Ativo', 450, true])
conferir('concluir sem 100% medido é recusado', (await moverContratoEmpreiteiro(novoBA.data.id, 'Concluído')).erro !== null, true)
definirObraAtual('obra-vn')
conferir('aditivo não fica abaixo do medido', (await salvarValorDoContrato('ce-vn-3', { tipo: 'Global', valor_global: 5000 })).erro !== null, true)
conferir('concluído reabre para aditivo', (await moverContratoEmpreiteiro('ce-vn-5', 'Aprovado / Ativo')).data?.status, 'Aprovado / Ativo')
conferir('contrato de outra obra não se move', (await moverContratoEmpreiteiro('ce-ba-1', 'Enviado p/ aprovação')).erro !== null, true)
// Boletins: numerados por contrato, na obra escolhida; o escopo grava a quantidade e o R$ sai dela.
definirObraAtual('obra-ba')
const drywallAntes = (await listarContratosEmpreiteiro()).data.find((c) => c.id === 'ce-ba-4')
const placas = drywallAntes.itens.find((i) => i.servico_id === 's-ba-15.10.1')
const boletim3 = await salvarBoletimEmpreiteiro('ce-ba-4', { data: hojeISO(), linhas: [{ contrato_item_id: placas.id, quantidade: 20 }] })
conferir('boletim por escopo: nº 3, R$ da quantidade, acumulado e na obra escolhida', [boletim3.erro, boletim3.data?.boletins[0].numero, boletim3.data?.boletins[0].valor, boletim3.data?.medido_valor, mock.boletinsEmpreiteiro.at(-1).obra_id, mock.boletimLinhas.at(-1).obra_id],
  [null, 3, 1600, 18000, 'obra-ba', 'obra-ba'])
conferir('boletim que passa de 100% no item é recusado', (await salvarBoletimEmpreiteiro('ce-ba-4', { data: hojeISO(), linhas: [{ contrato_item_id: placas.id, quantidade: 60 }] })).erro !== null, true)
conferir('item de outro contrato no boletim é recusado', (await salvarBoletimEmpreiteiro('ce-ba-4', { data: hojeISO(), linhas: [{ contrato_item_id: 'ci-vn-4-1', quantidade: 1 }] })).erro !== null, true)
conferir('boletim global: pelo R$, sem passar de 100%', [(await salvarBoletimEmpreiteiro('ce-ba-3', { data: hojeISO(), valor: 21000 })).data?.pct_medido, (await salvarBoletimEmpreiteiro('ce-ba-3', { data: hojeISO(), valor: 1 })).erro !== null], [1, true])
conferir('contrato que não está ativo não recebe medição', (await salvarBoletimEmpreiteiro('ce-ba-1', { data: hojeISO(), valor: 10 })).erro !== null, true)
conferir('boletim com data futura é recusado', (await salvarBoletimEmpreiteiro('ce-ba-4', { data: '2999-01-01', linhas: [{ contrato_item_id: placas.id, quantidade: 1 }] })).erro !== null, true)
await entrar('p-dir'); definirObraAtual('obra-vn')
conferir('diretoria não lança boletim', (await salvarBoletimEmpreiteiro('ce-vn-3', { data: hojeISO(), valor: 100 })).erro !== null, true)
conferir('diretoria vê, mas não cria nem move', [(await listarContratosEmpreiteiro()).erro, (await salvarContratoEmpreiteiro({ responsavel_id: 'r-pedra', descricao: 'x' })).erro !== null, (await moverContratoEmpreiteiro('ce-vn-1', 'Enviado p/ aprovação')).erro !== null], [null, true, true])
// 18. Cadastro de equipamentos: cada obra vê só os seus; só o engenheiro cadastra.
await entrar('p-eng'); definirObraAtual('obra-ba')
conferir('ARRECIFES: só os equipamentos dela', (await listarEquipamentos()).data.map((x) => x.id), ['eq-ba-1'])
const eqNovo = await salvarEquipamento({ nome: 'Rolo compactador', propriedade: 'Locado', fornecedor: 'Terraplena Nordeste', identificacao: '' })
conferir('equipamento novo na obra escolhida', [eqNovo.erro, mock.equipamentos.find((x) => x.id === eqNovo.data?.id)?.obra_id], [null, 'obra-ba'])
conferir('equipamento repetido na mesma obra é recusado', (await salvarEquipamento({ nome: 'rolo compactador', propriedade: 'Próprio' })).erros?.nome !== undefined, true)
definirObraAtual('obra-vn')
conferir('o mesmo nome em outra obra pode', (await salvarEquipamento({ nome: 'Rolo compactador', propriedade: 'Próprio' })).erro, null)
await entrar('p-dir'); definirObraAtual('obra-vn')
conferir('diretoria vê, mas não cadastra equipamento', [(await listarEquipamentos()).erro, (await salvarEquipamento({ nome: 'Serra', propriedade: 'Próprio' })).erro !== null], [null, true])
await entrar('p-lucas'); definirObraAtual('obra-vn')
conferir('equipe da obra não recebe contratos de empreiteiro (têm R$)', (await listarContratosEmpreiteiro()).erro !== null, true)

// 19. Materiais: catálogo e pedidos por obra; engenheiro e equipe pedem e movem; diretoria vê; fiscalização não.
await entrar('p-eng'); definirObraAtual('obra-ba')
const pedidosBA = (await listarPedidosMaterial()).data
conferir('ARRECIFES: só os pedidos dela, com o nome do material', [pedidosBA.map((p) => p.id), pedidosBA.every((p) => p.material && !p.material.includes('fora'))], [['pm-ba-1', 'pm-ba-2'], true])
conferir('obra nova nasce com as 3 categorias e os 12 materiais, ligados entre si', await (async () => {
  const r = await salvarObra({ nome: 'Obra de teste dos materiais', codigo: 'TM-01', cliente: 'Prefeitura (teste)', data_inicio: hojeISO(), data_entrega: hojeISO(), situacao: 'Em andamento' })
  const cats = mock.categoriasMaterial.filter((c) => c.obra_id === r.data?.id)
  const mats = mock.materiais.filter((m) => m.obra_id === r.data?.id)
  return [cats.length, mats.length, mats.every((m) => cats.some((c) => c.id === m.categoria_id))]
})(), [3, 12, true])
definirObraAtual('obra-ba')
conferir('ARRECIFES: catálogo só dela', (await listarMateriais()).data.every((m) => m.obra_id === 'obra-ba'), true)
conferir('pedido com material de outra obra é recusado', (await salvarPedidoMaterial({ material_id: 'mat-vn-1', quantidade: 10, frente: 'Canteiro', prioridade: 'Normal' })).erros?.material_id !== undefined, true)
const pmNovo = await salvarPedidoMaterial({ material_id: 'mat-ba-2', quantidade: 6, frente: 'Canteiro', prioridade: 'Normal' })
conferir('pedido novo entra em Solicitar, na obra escolhida', [pmNovo.data?.status, pmNovo.data?.obra_id, pmNovo.data?.historico.length], ['Solicitar', 'obra-ba', 1])
conferir('pedido de outra obra não se move daqui', (await moverPedidoMaterial('pm-vn-1', 'Em cotação')).erro !== null, true)
conferir('comprar sem fornecedor é recusado', (await moverPedidoMaterial(pmNovo.data.id, 'Em cotação').then(() => moverPedidoMaterial(pmNovo.data.id, 'Comprado / a caminho', {}))).erros?.fornecedor !== undefined, true)
const catNova = await salvarCategoriaMaterial({ nome: 'Impermeabilização', cor: 'Roxo' })
conferir('categoria nova na obra escolhida, só nela', [catNova.erro, mock.categoriasMaterial.find((c) => c.id === catNova.data?.id)?.obra_id, (await listarCategoriasMaterial()).data.every((c) => c.obra_id === 'obra-ba')], [null, 'obra-ba', true])
conferir('material com categoria de outra obra é recusado', (await salvarMaterial({ nome: 'Manta asfáltica', unidade: 'rolo', categoria_id: 'cat-vn-1' })).erros?.categoria_id !== undefined, true)
const matNovo = await salvarMaterial({ nome: 'Manta asfáltica', unidade: 'rolo', categoria_id: catNova.data.id })
conferir('material novo no catálogo da obra escolhida, com a categoria nova', [mock.materiais.find((m) => m.id === matNovo.data?.id)?.obra_id, (await listarMateriais()).data.find((m) => m.id === matNovo.data?.id)?.categoria], ['obra-ba', 'Impermeabilização'])
await entrar('p-lucas'); definirObraAtual('obra-vn')
conferir('equipe faz pedido e move, mas não cadastra material', [
  (await salvarPedidoMaterial({ material_id: 'mat-vn-1', quantidade: 20, frente: 'Rampa', prioridade: 'Crítico' })).erro,
  (await moverPedidoMaterial('pm-vn-2', 'Em cotação')).erro,
  (await salvarMaterial({ nome: 'Prego 18×27', unidade: 'kg', categoria_id: 'cat-vn-1' })).erro !== null,
  (await salvarCategoriaMaterial({ nome: 'Pregos', cor: 'Cinza' })).erro !== null,
], [null, null, true, true])
conferir('INSS: os pedidos não trazem os da ARRECIFES', (await listarPedidosMaterial()).data.every((p) => p.obra_id === 'obra-vn'), true)
await entrar('p-dir'); definirObraAtual('obra-vn')
conferir('diretoria vê, mas não pede', [(await listarPedidosMaterial()).erro, (await salvarPedidoMaterial({ material_id: 'mat-vn-1', quantidade: 1, frente: 'x', prioridade: 'Normal' })).erro !== null], [null, true])
await entrar('p-fiscal'); definirObraAtual('obra-vn')
conferir('fiscalização não vê os pedidos', (await listarPedidosMaterial()).erro !== null, true)

// 20. Cancelar cadastro: só o engenheiro, só na obra escolhida; sai da lista de escolha, fica no histórico.
await entrar('p-eng'); definirObraAtual('obra-vn')
const umaFuncao = (await listarFuncoes()).data[0]
const umResp = mock.responsaveis.find((x) => x.obra_id === 'obra-vn' && mock.efetivo.some((l) => l.responsavel_id === x.id))
conferir('cadastro de outra obra não se cancela daqui', (await cancelarCadastro('funcoes', mock.funcoes.find((x) => x.obra_id === 'obra-ba').id)).erro !== null, true)
conferir('categoria com material ativo não se cancela', (await cancelarCadastro('categoriasMaterial', 'cat-vn-1')).erro, 'Cancele antes os 5 materiais desta categoria.')
conferir('cancelar a função: sai da lista de escolha, aparece com os cancelados', [
  (await cancelarCadastro('funcoes', umaFuncao.id)).erro,
  (await listarFuncoes()).data.some((x) => x.id === umaFuncao.id),
  (await listarFuncoes({ comCancelados: true })).data.find((x) => x.id === umaFuncao.id)?.ativo,
], [null, false, false])
conferir('responsável cancelado continua com o nome no histórico do diário', await (async () => {
  await cancelarCadastro('responsaveis', umResp.id)
  const diarios = (await listarDiarios()).data
  return diarios.some((d) => d.efetivo.some((l) => l.responsavel_id === umResp.id && l.responsavel === umResp.nome))
})(), true)
conferir('reativar devolve à lista de escolha', [(await reativarCadastro('funcoes', umaFuncao.id)).erro, (await listarFuncoes()).data.some((x) => x.id === umaFuncao.id)], [null, true])
await reativarCadastro('responsaveis', umResp.id)
conferir('material cancelado não entra em pedido novo', await (async () => {
  await cancelarCadastro('materiais', 'mat-vn-12')
  const r = await salvarPedidoMaterial({ material_id: 'mat-vn-12', quantidade: 1, frente: 'x', prioridade: 'Normal' })
  await reativarCadastro('materiais', 'mat-vn-12')
  return r.erros?.material_id !== undefined
})(), true)
conferir('diário novo não grava responsável nem função cancelados', await (async () => {
  const resp = mock.responsaveis.find((x) => x.obra_id === 'obra-vn' && x.ativo)
  await cancelarCadastro('funcoes', umaFuncao.id)
  await cancelarCadastro('responsaveis', resp.id)
  const dia = addDias(hojeISO(), -400)
  const comFuncao = await salvarDiario({ data: dia, clima_manha: 'Bom', clima_tarde: 'Bom', ocorrencias: '', efetivo: [{ responsavel_id: resp.id, funcao_id: umaFuncao.id, quantidade: 2 }], itens: [] })
  await reativarCadastro('funcoes', umaFuncao.id)
  await reativarCadastro('responsaveis', resp.id)
  return comFuncao.erro
})(), 'Há responsável ou função cancelado no efetivo. Escolha um da lista.')
await entrar('p-dir'); definirObraAtual('obra-vn')
conferir('diretoria não cancela cadastro', (await cancelarCadastro('funcoes', umaFuncao.id)).erro !== null, true)

console.log(`${ok}/${tot} — multi-obra`)
process.exit(ok === tot ? 0 : 1)
