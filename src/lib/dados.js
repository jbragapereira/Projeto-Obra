// ============================================================
// CAMADA DE DADOS — a única porta de entrada dos dados.
// Nenhuma tela lê ou grava em outro lugar.
//
// MULTI-OBRA: a obra atual mora aqui dentro (definirObraAtual).
// Toda busca filtra por ela e todo salvamento grava obra_id por
// conta própria. As telas nunca passam obra_id, então nenhuma
// consegue esquecer o filtro.
//
// Hoje lê os dados de exemplo (mockData.js). Na etapa do banco,
// o miolo de cada função passa a ler do Supabase e nenhuma tela muda.
// Toda função devolve { data, erro }.
// ============================================================
import * as mock from './mockData.js'
import { dataHoraLocal, hojeISO, segundaDaSemana } from './datas.js'
import { podeAtualizarSemana, podeEditar, podeLancar, podeMoverPedidos, podePlanejar, podeRegistrarQualidade, podeRegistrarRestricao, podeVerValores, veMateriais, veQualidade, veTodasAsObras } from './perfis.js'
import { codigoValido, compararCodigos, paiDoCodigo, proximoCodigo, validarDatas } from './planejamento.js'
import { CRITICO_A_MAO, ORIGENS_ITEM, arredondarQtd, minimoDoItemNovo, podeExcluirAditivo, podeExcluirItemNovo, precoUnitario, qtdVigente, validarAditivo, validarItemNovo } from './orcamento.js'
import { congelarMeta, cronogramaDeMedicoes, itensPelaEap, mesVigente, periodoDaProxima, podeDescongelar, podeIniciar, reconciliarItens, temCronograma, valorEmMontagem } from './medicao.js'
import { TIPOS_EMPREITEIRO, aceitaLancamento, validarObra, validarEquipamento } from './obras.js'
import { CALENDARIO_PADRAO, validarCalendario } from './calendario.js'
import { moverSemana, validarRestricao } from './restricoes.js'
import { SITUACAO_SUBTAREFA, STATUS_SEMANA, causaParaGravar, efeitoDoDiarioNoKanban, planejadaNaSemana, validarCausa } from './curtoPrazo.js'
import { FUNCOES_PADRAO, diarioTemConteudo, itemTemConteudo, linhasPreenchidas, podeCorrigir, porQueNaoLanca, podeLancarData, validarEfetivo, zeraAlgumLancamento } from './diario.js'
import { LIMITE_FOTO_TEXTO, ORIGENS_DATA, ORIGENS_GPS, cabeNoLimite, coordenadaValida, montarEndereco } from './fotos.js'
import {
  MODELOS_FVS_PADRAO, NC_ABERTA, numerarItens, NC_FECHADA, RESP_NC, VISTORIA_ANDAMENTO, VISTORIA_CONCLUIDA, limparModelo, montarModeloPadrao,
  motivoParaNaoFinalizar, motivoParaNaoMoverNc, motivoParaNaoResponder, proximoCodigoFvs, proximoCodigoNc, textoDoPassoNc,
  validarModelo, validarNc, validarVistoria,
} from './qualidade.js'
import {
  EM_ANDAMENTO as PEND_EM_ANDAMENTO, PENDENTE, RESOLVIDO as PEND_RESOLVIDO, anexarObservacao, camposAlterados, motivoParaNaoAlterar,
  motivoParaNaoAvancar, motivoParaNaoCancelar as motivoParaNaoCancelarPendencia, proximoNumero, validarPendencia,
} from './qualidade.js'
import { motivoParaNaoCancelarGemba, motivoParaNaoMoverGemba, validarObservacao } from './qualidade.js'
import { CADASTROS, aceitaNoRegistro, motivoParaNaoCancelar, motivoParaNaoReativar } from './cadastros.js'
import { CATALOGO_PADRAO, CATEGORIAS_PADRAO, SOLICITAR, aplicarMovimento, validarCategoria, validarMaterial, validarMovimento, validarPedido } from './materiais.js'
import { ATIVO, ENVIADO, GLOBAL, POR_ESCOPO, EM_ELABORACAO, globalPorValor, linhaPorQuantidade, medidoDoContrato, motivoParaNaoMover, pctMedido, proximoNumeroDeBoletim, validarBoletim, validarValorDoContrato, valorDoBoletim, valorDoContrato } from './empreiteiros.js'

let sessao = null
let obraAtual = null

const ok = (data) => Promise.resolve({ data, erro: null })
const falha = (erro) => Promise.resolve({ data: null, erro })
const novoId = (prefixo) => `${prefixo}-${Math.random().toString(36).slice(2, 10)}`
const copia = (x) => JSON.parse(JSON.stringify(x))

// Toda função passa por aqui antes de tocar em dado.
function checar({ precisaObra = true } = {}) {
  if (!mock.USAR_MOCK) return 'O banco ainda não foi ligado.'
  if (!sessao) return 'Entre no app para continuar.'
  if (precisaObra && !obraAtual) return 'Escolha uma obra.'
  return null
}
const daObra = (lista) => lista.filter((r) => r.obra_id === obraAtual)

// Quem não vê valores não recebe valores: a camada tira, a tela nem fica sabendo.
function semValores(registro) {
  if (podeVerValores(sessao.role)) return registro
  const limpo = { ...registro }
  delete limpo.preco_unitario
  delete limpo.custo_unitario
  delete limpo.bdi
  delete limpo.valor_planejado
  delete limpo.valor_medido
  delete limpo.valor_em_montagem
  return limpo
}

// Junta várias buscas numa só: { servicos: listarServicos(), ... } → { data: { servicos: [...] }, erro }
export async function juntar(pedidos) {
  const chaves = Object.keys(pedidos)
  const respostas = await Promise.all(Object.values(pedidos))
  const comErro = respostas.find((r) => r.erro)
  if (comErro) return { data: null, erro: comErro.erro }
  return { data: Object.fromEntries(chaves.map((k, i) => [k, respostas[i].data])), erro: null }
}

/* ── Sessão (login de exemplo até o banco existir) ── */

export const usuariosDeExemplo = () => ok(copia(mock.profiles))

export function entrar(profileId) {
  const p = mock.profiles.find((x) => x.id === profileId && x.ativo)
  if (!p) return falha('Usuário não encontrado.')
  sessao = p
  obraAtual = null
  return ok(copia(p))
}

export function sair() {
  sessao = null
  obraAtual = null
}

/* ── Obras ── */

export function definirObraAtual(obraId) {
  obraAtual = obraId
}

export function listarMinhasObras() {
  const e = checar({ precisaObra: false }); if (e) return falha(e)
  if (sessao.role === 'Aguardando liberação') return ok([])
  const lista = veTodasAsObras(sessao.role)
    ? mock.obras
    : mock.obras.filter((o) => mock.membros.some((m) => m.ativo && m.obra_id === o.id && m.profile_id === sessao.id))
  return ok(copia(lista).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')))
}

export function salvarObra(obra) {
  const e = checar({ precisaObra: false }); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro cadastra obras.')
  const erros = validarObra(obra)
  if (Object.keys(erros).length) return Promise.resolve({ data: null, erro: 'Confira os campos marcados.', erros })
  const campos = {
    nome: obra.nome.trim(), codigo: obra.codigo.trim(), endereco: obra.endereco?.trim() ?? '',
    cliente: obra.cliente.trim(), numero_contrato: obra.numero_contrato?.trim() ?? '',
    data_inicio: obra.data_inicio, data_entrega: obra.data_entrega, situacao: obra.situacao,
    medicoes_inicio: obra.medicoes_inicio || null, medicoes_fim_primeira: obra.medicoes_fim_primeira || null,
  }
  if (obra.id) {
    const atual = mock.obras.find((o) => o.id === obra.id)
    if (!atual) return falha('Obra não encontrada.')
    Object.assign(atual, campos)
    criarMedicoesDoCronograma(atual)
    return ok(copia(atual))
  }
  const nova = { id: novoId('obra'), ...campos }
  mock.obras.push(nova)
  criarMedicoesDoCronograma(nova)
  FUNCOES_PADRAO.forEach((nome) => mock.funcoes.push({ id: novoId('fn'), obra_id: nova.id, nome, ativo: true }))
  mock.calendarios.push({ id: novoId('cal'), obra_id: nova.id, ...structuredClone(CALENDARIO_PADRAO) })
  const idCategoria = {}
  CATEGORIAS_PADRAO.forEach(([nome, cor]) => {
    idCategoria[nome] = novoId('cat')
    mock.categoriasMaterial.push({ id: idCategoria[nome], obra_id: nova.id, nome, cor, ativo: true })
  })
  MODELOS_FVS_PADRAO.forEach((m) => mock.modelosFvs.push({ id: novoId('mf'), obra_id: nova.id, codigo: proximoCodigoFvs(mock.modelosFvs.filter((x) => x.obra_id === nova.id)), ...montarModeloPadrao(m), ativo: true }))
  CATALOGO_PADRAO.forEach(([nome, unidade, categoria]) => mock.materiais.push({ id: novoId('mat'), obra_id: nova.id, nome, unidade, categoria_id: idCategoria[categoria], ativo: true }))
  // Quem cria a obra passa a ter acesso a ela.
  mock.membros.push({ id: novoId('m'), obra_id: nova.id, profile_id: sessao.id, ativo: true })
  return ok(copia(nova))
}

/* ── Orçamento: itens (serviços), aditivos e grupos (sempre da obra atual) ── */

// qtd_orcada = como veio na planilha; qtd_contratada = a vigente (com aditivos), a que o app inteiro usa.
const aditivosDo = (servicoId) => daObra(mock.aditivos).filter((a) => a.servico_id === servicoId)
const comVigente = (s) => ({ ...s, qtd_contratada: qtdVigente(s.qtd_orcada, aditivosDo(s.id)) })
// Executado de um item antes de uma data (pela data do diário de cada lançamento).
const acumuladoAntesDe = (servicoId, data) => {
  const dataDoDiario = Object.fromEntries(daObra(mock.diarios).map((x) => [x.id, x.data]))
  return daObra(mock.lancamentos).filter((l) => l.servico_id === servicoId && dataDoDiario[l.diario_id] < data).reduce((soma, l) => soma + l.quantidade, 0)
}
const acumuladoDo = (servicoId) => daObra(mock.lancamentos).filter((l) => l.servico_id === servicoId).reduce((soma, l) => soma + l.quantidade, 0)
const codigosOcupados = (excetoId) => [...daObra(mock.servicos).filter((x) => x.id !== excetoId).map((x) => x.codigo), ...daObra(mock.grupos).map((g) => g.codigo)]

export function listarServicos() {
  const e = checar(); if (e) return falha(e)
  const nomes = Object.fromEntries(mock.profiles.map((p) => [p.id, p.nome]))
  const lista = daObra(mock.servicos)
    .map((s) => ({ ...comVigente(s), editor: s.alterado_por ? nomes[s.alterado_por] ?? '—' : null }))
    .map(semValores)
    .sort((a, b) => compararCodigos(a.codigo, b.codigo))
  return ok(copia(lista))
}

// Cabeçalho do orçamento (base de referência, encargos, BDIs). Quem não vê valores não recebe.
export function buscarDadosOrcamento() {
  const e = checar(); if (e) return falha(e)
  if (!podeVerValores(sessao.role)) return ok(null)
  return ok(copia(daObra(mock.orcamentos)[0] ?? null))
}

export function listarAditivos() {
  const e = checar(); if (e) return falha(e)
  const nomes = Object.fromEntries(mock.profiles.map((p) => [p.id, p.nome]))
  return ok(copia(daObra(mock.aditivos)
    .map((a) => ({ ...a, autor: nomes[a.criado_por] ?? '—', editor: a.alterado_por ? nomes[a.alterado_por] ?? '—' : null }))
    .sort((a, b) => b.data.localeCompare(a.data))))
}

// Cria (sem id) ou corrige (com id) um aditivo.
// a: { id?, servico_id, numero, data, quantidade (positiva), tipo: 'acrescimo'|'supressao', motivo }
export function salvarAditivo(a) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro lança ou corrige aditivo.')
  const atual = a.id ? daObra(mock.aditivos).find((x) => x.id === a.id) : null
  if (a.id && !atual) return falha('Aditivo não encontrado nesta obra.')
  const s = daObra(mock.servicos).find((x) => x.id === (atual?.servico_id ?? a.servico_id))
  if (!s) return falha('Item não encontrado nesta obra.')
  const vigenteAtual = comVigente(s).qtd_contratada
  const vigente = atual ? arredondarQtd(vigenteAtual - atual.quantidade) : vigenteAtual
  const { erros, quantidade } = validarAditivo(a, { vigente, vigenteAtual, acumulado: acumuladoDo(s.id) })
  if (Object.keys(erros).length) return Promise.resolve({ data: null, erro: 'Confira os campos marcados.', erros })
  const campos = { numero: a.numero.trim(), data: a.data, quantidade, motivo: a.motivo.trim() }
  if (atual) {
    Object.assign(atual, campos, { alterado_por: sessao.id, alterado_em: dataHoraLocal(new Date()) })
    acompanharEap()
    return ok(copia(atual))
  }
  const novo = { id: novoId('ad'), obra_id: obraAtual, servico_id: s.id, ...campos, criado_por: sessao.id, alterado_por: null, alterado_em: null }
  mock.aditivos.push(novo)
  acompanharEap()
  return ok(copia(novo))
}

export function excluirAditivo(aditivoId) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro exclui aditivo.')
  const aditivo = daObra(mock.aditivos).find((x) => x.id === aditivoId)
  if (!aditivo) return falha('Aditivo não encontrado nesta obra.')
  const s = daObra(mock.servicos).find((x) => x.id === aditivo.servico_id)
  const motivo = podeExcluirAditivo({ aditivo, vigenteAtual: comVigente(s).qtd_contratada, acumulado: acumuladoDo(s.id) })
  if (motivo) return falha(motivo)
  mock.aditivos.splice(mock.aditivos.indexOf(aditivo), 1)
  acompanharEap()
  return ok(copia(aditivo))
}

// Cria (sem id) ou corrige (com id) um item novo. O Item sai sozinho, o próximo dentro do grupo
// (dentro de 2.1 com 2.1.8 → 2.1.9). Na correção, o grupo só muda se o item nunca teve lançamento.
// i: { id?, grupo, fonte, codigo_ref, descricao, unidade, quantidade, custo_unitario, bdi, aditivo_numero, responsavel_id }
export function salvarItemNovo(i) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro inclui ou corrige item novo.')
  const atual = i.id ? daObra(mock.servicos).find((x) => x.id === i.id) : null
  if (i.id && !atual) return falha('Item não encontrado nesta obra.')
  if (atual && atual.origem !== ORIGENS_ITEM.novo) return falha('Item da planilha muda só por aditivo.')
  const acumulado = atual ? acumuladoDo(atual.id) : 0
  const erros = validarItemNovo(i, daObra(mock.grupos).map((g) => g.codigo), { minimo: atual ? minimoDoItemNovo({ qtdOrcada: atual.qtd_orcada, vigente: comVigente(atual).qtd_contratada, acumulado }) : 0, acumulado })
  const resp = i.responsavel_id ? daObra(mock.responsaveis).find((r) => r.id === i.responsavel_id) : null
  if (i.responsavel_id && !resp) erros.responsavel_id = 'Responsável de outra obra.'
  else if (resp && !aceitaNoRegistro(resp, new Set([atual?.responsavel_id]))) erros.responsavel_id = 'Este responsável foi cancelado. Escolha outro.'
  const mudouGrupo = atual && paiDoCodigo(atual.codigo) !== i.grupo
  if (mudouGrupo && acumulado > 0) erros.grupo = 'O item já tem lançamento no Diário: o grupo não muda mais.'
  if (Object.keys(erros).length) return Promise.resolve({ data: null, erro: 'Confira os campos marcados.', erros })
  const campos = {
    fonte: i.fonte, codigo_ref: i.codigo_ref?.trim() ?? '', descricao: i.descricao.trim(), unidade: i.unidade.trim().toUpperCase(),
    qtd_orcada: i.quantidade, custo_unitario: i.custo_unitario, bdi: i.bdi, preco_unitario: precoUnitario(i.custo_unitario, i.bdi),
    aditivo_numero: i.aditivo_numero.trim(), responsavel_id: i.responsavel_id || null,
  }
  if (atual) {
    Object.assign(atual, campos, { alterado_por: sessao.id, alterado_em: dataHoraLocal(new Date()) })
    if (mudouGrupo) atual.codigo = proximoCodigo(i.grupo, codigosOcupados(atual.id))
    acompanharEap()
    return ok(copia(semValores(comVigente(atual))))
  }
  const novo = {
    id: novoId('s'), obra_id: obraAtual, codigo: proximoCodigo(i.grupo, codigosOcupados()), ...campos,
    origem: ORIGENS_ITEM.novo, frente: '', data_inicio_planejada: null, data_fim_planejada: null,
    critico: false, critico_origem: CRITICO_A_MAO, ativo: true, alterado_por: null, alterado_em: null,
  }
  mock.servicos.push(novo)
  acompanharEap()
  return ok(copia(semValores(comVigente(novo))))
}

// Desfaz um item novo criado por engano (sem lançamento, foto nem medição planejada). Leva junto os aditivos dele.
export function excluirItemNovo(servicoId) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro exclui item novo.')
  const item = daObra(mock.servicos).find((x) => x.id === servicoId)
  if (!item) return falha('Item não encontrado nesta obra.')
  const doItem = (lista) => daObra(lista).filter((x) => x.servico_id === servicoId)
  const motivo = podeExcluirItemNovo({
    item, temLancamento: doItem(mock.lancamentos).length > 0, temFoto: doItem(mock.fotos).length > 0,
    planejadoNaMedicao: doItem(mock.medicaoItens).some((m) => m.qtd_planejada > 0),
  })
  if (motivo) return falha(motivo)
  for (const lista of [mock.aditivos, mock.medicaoItens]) {
    for (let k = lista.length - 1; k >= 0; k--) if (lista[k].obra_id === obraAtual && lista[k].servico_id === servicoId) lista.splice(k, 1)
  }
  mock.servicos.splice(mock.servicos.indexOf(item), 1)
  acompanharEap()
  return ok(copia(semValores(item)))
}

export function marcarCritico(servicoId, critico) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro marca serviço crítico.')
  const s = daObra(mock.servicos).find((x) => x.id === servicoId)
  if (!s) return falha('Serviço não encontrado nesta obra.')
  s.critico = critico
  s.critico_origem = CRITICO_A_MAO
  return ok(copia(s))
}

export function listarGrupos() {
  const e = checar(); if (e) return falha(e)
  return ok(copia(daObra(mock.grupos)))
}

// Cria um grupo novo, com código automático dentro do grupo de cima (ou na raiz).
export function criarGrupo({ pai, nome }) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro cria grupos.')
  const limpo = nome?.trim()
  if (!limpo) return falha('Informe o nome do grupo.')
  if (pai && !codigoValido(pai)) return falha('Grupo de cima inválido.')
  const codigo = proximoCodigo(pai ?? null, codigosOcupados())
  const novo = { id: novoId('gr'), obra_id: obraAtual, codigo, nome: limpo }
  mock.grupos.push(novo)
  return ok(copia(novo))
}

// EAP: grava de uma vez as datas dos ITENS lançadas no modo "Editar datas" — tudo ou nada.
// Etapa e subetapa não têm data gravada: a EAP calcula pelas datas dos itens de dentro.
// mudancas: [{ id, inicio, fim }]. Devolve { erros: { id: mensagem } } quando alguma linha tem erro.
export function salvarDatasEap(mudancas) {
  const e = checar(); if (e) return falha(e)
  if (!podePlanejar(sessao.role)) return falha('Só o engenheiro lança as datas da EAP.')
  const erros = {}
  const alvos = mudancas.map((m) => {
    const item = daObra(mock.servicos).find((s) => s.id === m.id)
    const erro = item ? validarDatas({ inicio: m.inicio, fim: m.fim }) : 'Item não encontrado nesta obra.'
    if (erro) erros[m.id] = erro
    return { m, item }
  })
  if (Object.keys(erros).length) return Promise.resolve({ data: null, erro: 'Confira as datas marcadas.', erros })
  for (const { m, item } of alvos) Object.assign(item, { data_inicio_planejada: m.inicio || null, data_fim_planejada: m.fim || null })
  acompanharEap()
  return ok({ salvas: mudancas.length })
}

export function arquivarServico(servicoId, arquivar) {
  const e = checar(); if (e) return falha(e)
  if (!podePlanejar(sessao.role)) return falha('Só o engenheiro arquiva serviços.')
  const s = daObra(mock.servicos).find((x) => x.id === servicoId)
  if (!s) return falha('Serviço não encontrado nesta obra.')
  if (s.origem !== ORIGENS_ITEM.novo) return falha('Só item novo é arquivado. Item da planilha muda por aditivo.')
  s.ativo = !arquivar
  acompanharEap()
  return ok(copia(semValores(comVigente(s))))
}

export function listarResponsaveis() {
  const e = checar(); if (e) return falha(e)
  return ok(copia(daObra(mock.responsaveis).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))))
}

export function salvarResponsavel({ nome, tipo, contato }) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro cadastra responsáveis.')
  if (!nome?.trim()) return falha('Informe o nome do responsável.')
  if (daObra(mock.responsaveis).some((r) => r.nome.toLowerCase() === nome.trim().toLowerCase())) return falha(`${nome.trim()} já está cadastrado nesta obra.`)
  const novo = { id: novoId('r'), obra_id: obraAtual, nome: nome.trim(), tipo, contato: contato?.trim() ?? '', ativo: true }
  mock.responsaveis.push(novo)
  return ok(copia(novo))
}

/* ── Restrições do médio prazo (lookahead) ── */

export function listarRestricoes() {
  const e = checar(); if (e) return falha(e)
  const nomes = Object.fromEntries(mock.profiles.map((p) => [p.id, p.nome]))
  return ok(copia(daObra(mock.restricoes).map((r) => ({ ...r, autor: nomes[r.criado_por] ?? '—', quem_resolveu: r.resolvida_por ? nomes[r.resolvida_por] ?? '—' : null }))))
}

// Cria (sem id; engenheiro e equipe) ou edita (com id; só o engenheiro).
// r: { id?, servico_id, tipo, descricao, semana (segunda), prazo, responsavel }
export function salvarRestricao(r) {
  const e = checar(); if (e) return falha(e)
  if (r.id ? !podeEditar(sessao.role) : !podeRegistrarRestricao(sessao.role)) return falha(r.id ? 'Só o engenheiro edita restrição.' : 'Seu perfil não registra restrição.')
  const atual = r.id ? daObra(mock.restricoes).find((x) => x.id === r.id) : null
  if (r.id && !atual) return falha('Restrição não encontrada nesta obra.')
  const erros = validarRestricao(r)
  if (r.servico_id && !daObra(mock.servicos).some((s) => s.id === r.servico_id)) erros.servico_id = 'Atividade de outra obra.'
  if (Object.keys(erros).length) return Promise.resolve({ data: null, erro: 'Confira os campos marcados.', erros })
  const campos = { servico_id: r.servico_id, tipo: r.tipo, descricao: r.descricao.trim(), semana: r.semana, prazo: r.prazo, responsavel: r.responsavel.trim() }
  if (atual) { Object.assign(atual, campos); return ok(copia(atual)) }
  const nova = { id: novoId('rs'), obra_id: obraAtual, ...campos, resolvida: false, resolvida_em: null, resolvida_por: null, criado_por: sessao.id }
  mock.restricoes.push(nova)
  return ok(copia(nova))
}

// Resolver (ou reabrir): engenheiro e equipe. Guarda quem resolveu e quando.
export function resolverRestricao(id, resolvida) {
  const e = checar(); if (e) return falha(e)
  if (!podeRegistrarRestricao(sessao.role)) return falha('Seu perfil não resolve restrição.')
  const r = daObra(mock.restricoes).find((x) => x.id === id)
  if (!r) return falha('Restrição não encontrada nesta obra.')
  Object.assign(r, resolvida
    ? { resolvida: true, resolvida_em: dataHoraLocal(new Date()), resolvida_por: sessao.id }
    : { resolvida: false, resolvida_em: null, resolvida_por: null })
  return ok(copia(r))
}

// Setas ◀ ▶: uma semana para trás ou para a frente (só o engenheiro).
export function moverRestricao(id, passo) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro move restrição de semana.')
  const r = daObra(mock.restricoes).find((x) => x.id === id)
  if (!r) return falha('Restrição não encontrada nesta obra.')
  r.semana = moverSemana(r.semana, passo)
  return ok(copia(r))
}

export function excluirRestricao(id) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro exclui restrição.')
  const r = daObra(mock.restricoes).find((x) => x.id === id)
  if (!r) return falha('Restrição não encontrada nesta obra.')
  mock.restricoes.splice(mock.restricoes.indexOf(r), 1)
  return ok(copia(r))
}

/* ── Curto prazo: atividades da semana (kanban) e subtarefas ── */

export function listarSemanaAtividades() {
  const e = checar(); if (e) return falha(e)
  return ok(copia(daObra(mock.semanaAtividades)))
}

export function listarSubtarefas() {
  const e = checar(); if (e) return falha(e)
  return ok(copia(daObra(mock.subtarefas)))
}

// Uma linha por atividade e semana (criada na primeira vez que ela é mexida).
function registroDaSemana(semana, servicoId) {
  let r = daObra(mock.semanaAtividades).find((x) => x.semana === semana && x.servico_id === servicoId)
  if (!r) {
    r = { id: novoId('sa'), obra_id: obraAtual, semana, servico_id: servicoId, status: STATUS_SEMANA.aFazer, causa: null, causa_texto: '', fora: false, responsavel_id: null }
    mock.semanaAtividades.push(r)
  }
  return r
}

// Mover no kanban (engenheiro e equipe). "Não realizado" exige a causa raiz.
export function mudarStatusAtividade({ semana, servico_id, status, causa, causa_texto }) {
  const e = checar(); if (e) return falha(e)
  if (!podeAtualizarSemana(sessao.role)) return falha('Seu perfil não atualiza a semana.')
  if (!Object.values(STATUS_SEMANA).includes(status)) return falha('Situação inválida.')
  if (!daObra(mock.servicos).some((s) => s.id === servico_id)) return falha('Atividade não encontrada nesta obra.')
  const naoRealizado = status === STATUS_SEMANA.naoRealizado
  const erroCausa = naoRealizado ? validarCausa({ causa, causa_texto }) : null
  if (erroCausa) return falha(erroCausa)
  const r = registroDaSemana(semana, servico_id)
  Object.assign(r, {
    status, ...causaParaGravar({ naoRealizado, causa, causa_texto }),
    atualizado_por: sessao.id, atualizado_em: dataHoraLocal(new Date()),
  })
  return ok(copia(r))
}

// Escolher no cartão do Kanban quem resolve e executa a atividade na semana (engenheiro e equipe).
export function definirResponsavelDaSemana({ semana, servico_id, responsavel_id }) {
  const e = checar(); if (e) return falha(e)
  if (!podeAtualizarSemana(sessao.role)) return falha('Seu perfil não atualiza a semana.')
  if (!daObra(mock.servicos).some((s) => s.id === servico_id)) return falha('Atividade não encontrada nesta obra.')
  if (!daObra(mock.responsaveis).some((r) => r.id === responsavel_id && r.ativo)) return falha('Escolha um responsável desta obra.')
  const r = registroDaSemana(semana, servico_id)
  Object.assign(r, { responsavel_id, atualizado_por: sessao.id, atualizado_em: dataHoraLocal(new Date()) })
  return ok(copia(r))
}

// Tirar (ou devolver) uma atividade da semana: só o engenheiro. Tirada não conta no PPC.
export function tirarDaSemana({ semana, servico_id, fora }) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro tira atividade da semana.')
  if (!daObra(mock.servicos).some((s) => s.id === servico_id)) return falha('Atividade não encontrada nesta obra.')
  const r = registroDaSemana(semana, servico_id)
  Object.assign(r, { fora: !!fora, atualizado_por: sessao.id, atualizado_em: dataHoraLocal(new Date()) })
  return ok(copia(r))
}

// Subtarefa nova (engenheiro e equipe).
export function salvarSubtarefa({ semana, servico_id, texto }) {
  const e = checar(); if (e) return falha(e)
  if (!podeAtualizarSemana(sessao.role)) return falha('Seu perfil não cria subtarefa.')
  if (!texto?.trim()) return falha('Escreva a subtarefa.')
  if (!daObra(mock.servicos).some((s) => s.id === servico_id)) return falha('Atividade não encontrada nesta obra.')
  const nova = { id: novoId('st'), obra_id: obraAtual, semana, servico_id, texto: texto.trim(), situacao: SITUACAO_SUBTAREFA.pendente, causa: null, causa_texto: '', criado_por: sessao.id }
  mock.subtarefas.push(nova)
  return ok(copia(nova))
}

// Feita, pendente ou não realizada (com causa raiz).
export function mudarSubtarefa(id, { situacao, causa, causa_texto }) {
  const e = checar(); if (e) return falha(e)
  if (!podeAtualizarSemana(sessao.role)) return falha('Seu perfil não atualiza subtarefa.')
  const s = daObra(mock.subtarefas).find((x) => x.id === id)
  if (!s) return falha('Subtarefa não encontrada nesta obra.')
  if (!Object.values(SITUACAO_SUBTAREFA).includes(situacao)) return falha('Situação inválida.')
  const naoRealizada = situacao === SITUACAO_SUBTAREFA.naoRealizada
  const erroCausa = naoRealizada ? validarCausa({ causa, causa_texto }) : null
  if (erroCausa) return falha(erroCausa)
  Object.assign(s, { situacao, ...causaParaGravar({ naoRealizado: naoRealizada, causa, causa_texto }) })
  return ok(copia(s))
}

export function excluirSubtarefa(id) {
  const e = checar(); if (e) return falha(e)
  if (!podeAtualizarSemana(sessao.role)) return falha('Seu perfil não exclui subtarefa.')
  const s = daObra(mock.subtarefas).find((x) => x.id === id)
  if (!s) return falha('Subtarefa não encontrada nesta obra.')
  mock.subtarefas.splice(mock.subtarefas.indexOf(s), 1)
  return ok(copia(s))
}

/* ── Calendário de trabalho da obra (dias úteis e feriados) ── */

export function buscarCalendario() {
  const e = checar(); if (e) return falha(e)
  const cal = daObra(mock.calendarios)[0]
  return ok(copia(cal ?? { obra_id: obraAtual, ...CALENDARIO_PADRAO }))
}

// cal: { dias_semana: [0..6], feriados: [{ data, nome }] }
export function salvarCalendario({ dias_semana, feriados }) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro muda o calendário da obra.')
  const limpo = {
    dias_semana: [...new Set(dias_semana)].filter((d) => d >= 0 && d <= 6).sort(),
    feriados: feriados.map((f) => ({ data: f.data, nome: f.nome?.trim() ?? '' })).sort((a, b) => a.data.localeCompare(b.data)),
  }
  const erros = validarCalendario(limpo)
  if (Object.keys(erros).length) return Promise.resolve({ data: null, erro: Object.values(erros)[0], erros })
  const atual = daObra(mock.calendarios)[0]
  if (atual) Object.assign(atual, limpo)
  else mock.calendarios.push({ id: novoId('cal'), obra_id: obraAtual, ...limpo })
  return ok(copia(daObra(mock.calendarios)[0]))
}

/* ── Funções (para o efetivo do diário) ── */

// Os cadastros devolvem só os ativos (as listas de escolha); o módulo Cadastro e a correção do diário pedem
// também os cancelados ({ comCancelados: true }).
const visiveis = (lista, comCancelados) => (comCancelados ? lista : lista.filter((x) => x.ativo))

export function listarFuncoes({ comCancelados = false } = {}) {
  const e = checar(); if (e) return falha(e)
  return ok(copia(visiveis(daObra(mock.funcoes), comCancelados).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))))
}

export function salvarFuncao({ nome }) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro cadastra funções.')
  const limpo = nome?.trim()
  if (!limpo) return falha('Informe o nome da função.')
  if (daObra(mock.funcoes).some((x) => x.nome.toLowerCase() === limpo.toLowerCase())) return falha(`A função ${limpo} já existe nesta obra.`)
  const nova = { id: novoId('fn'), obra_id: obraAtual, nome: limpo, ativo: true }
  mock.funcoes.push(nova)
  return ok(copia(nova))
}

export function listarEquipamentos({ comCancelados = false } = {}) {
  const e = checar(); if (e) return falha(e)
  return ok(copia(visiveis(daObra(mock.equipamentos), comCancelados).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))))
}

// Equipamento da obra (próprio ou locado). Só o engenheiro cadastra.
export function salvarEquipamento({ nome, propriedade, fornecedor, identificacao }) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro cadastra equipamentos.')
  const erros = validarEquipamento({ nome, propriedade, fornecedor }, daObra(mock.equipamentos).map((x) => x.nome))
  if (Object.keys(erros).length) return Promise.resolve({ data: null, erro: 'Confira os campos marcados.', erros })
  const novo = {
    id: novoId('eq'), obra_id: obraAtual, nome: nome.trim(), propriedade,
    fornecedor: propriedade === 'Locado' ? fornecedor.trim() : '', identificacao: identificacao?.trim() ?? '', ativo: true,
  }
  mock.equipamentos.push(novo)
  return ok(copia(novo))
}

/* ── Qualidade: pendências de vistoria ── */

const SEM_ACESSO_QUALIDADE = 'A qualidade é do engenheiro, da equipe da obra e da diretoria.'
const fotoValida = (f) => !f || cabeNoLimite(f.tamanho_bytes)

// Pendências da obra, já com o nome da empresa, de quem acompanha e de quem vistoriou.
export function listarPendencias() {
  const e = checar(); if (e) return falha(e)
  if (!veQualidade(sessao.role)) return falha(SEM_ACESSO_QUALIDADE)
  const nomeResp = Object.fromEntries(daObra(mock.responsaveis).map((r) => [r.id, r.nome]))
  const nomePessoa = Object.fromEntries(mock.profiles.map((p) => [p.id, p.nome]))
  return ok(copia(daObra(mock.pendencias).map((p) => ({
    ...p, empresa: nomeResp[p.empresa_id] ?? '—', responsavel: nomeResp[p.responsavel_id] ?? '—', vistoriador: nomePessoa[p.vistoriado_por] ?? '—',
  }))))
}

// Pendência nova: entra como Pendente, com o próximo número da obra. Empresa e responsável: do Cadastro (ativos).
export function salvarPendencia({ descricao, local, pavimento, empresa_id, responsavel_id, data_vistoria, prazo, foto }) {
  const e = checar(); if (e) return falha(e)
  if (!podeRegistrarQualidade(sessao.role)) return falha('Só o engenheiro e a equipe da obra registram pendências.')
  const ativos = daObra(mock.responsaveis).filter((r) => r.ativo).map((r) => r.id)
  const erros = validarPendencia({ descricao, local, empresa_id, responsavel_id, data_vistoria, prazo }, ativos, hojeISO())
  if (Object.keys(erros).length) return Promise.resolve({ data: null, erro: 'Confira os campos marcados.', erros })
  if (!fotoValida(foto)) return falha(`A foto passa de ${LIMITE_FOTO_TEXTO}.`)
  const nova = {
    id: novoId('pq'), obra_id: obraAtual, numero: proximoNumero(daObra(mock.pendencias)), descricao: descricao.trim(), local: local.trim(),
    pavimento: pavimento?.trim() ?? '', empresa_id, responsavel_id, data_vistoria, prazo, status: PENDENTE, vistoriado_por: sessao.id,
    foto: foto ?? null, foto_evidencia: null, observacoes: '', em_andamento_em: null, resolvido_em: null,
    cancelada: false, cancelada_em: null, motivo_cancelamento: '',
  }
  mock.pendencias.push(nova)
  return ok(copia(nova))
}

// Próxima etapa: Pendente → Em andamento → Resolvido (resolver pede a foto da correção e grava a data).
export function avancarPendencia(id, para, { foto_evidencia } = {}) {
  const e = checar(); if (e) return falha(e)
  if (!podeRegistrarQualidade(sessao.role)) return falha('Só o engenheiro e a equipe da obra movem as pendências.')
  const p = daObra(mock.pendencias).find((x) => x.id === id)
  if (!p) return falha('Pendência não encontrada nesta obra.')
  const motivo = motivoParaNaoAvancar(p, para, { foto_evidencia })
  if (motivo) return falha(motivo)
  if (!fotoValida(foto_evidencia)) return falha(`A foto passa de ${LIMITE_FOTO_TEXTO}.`)
  p.status = para
  if (para === PEND_EM_ANDAMENTO) p.em_andamento_em = hojeISO()
  if (para === PEND_RESOLVIDO) Object.assign(p, { resolvido_em: hojeISO(), foto_evidencia })
  return ok(copia(p))
}

const ROTULOS_PENDENCIA = {
  descricao: 'descrição', local: 'local', pavimento: 'pavimento', empresa_id: 'empresa', responsavel_id: 'quem acompanha',
  data_vistoria: 'data da vistoria', prazo: 'prazo',
}
const autorDaSessao = () => mock.profiles.find((x) => x.id === sessao.id)?.nome ?? ''
// Registro automático nas observações (alteração, cancelamento, reativação), com data, hora e autor.
const registrar = (p, texto) => { p.observacoes = anexarObservacao(p.observacoes, `${texto} (${autorDaSessao()})`, dataHoraLocal(new Date())) }

// Alterar os dados de uma pendência em aberto. Empresa e responsável: ativos do Cadastro, ou os que já estavam.
// O que mudou fica registrado nas observações.
export function alterarPendencia(id, { descricao, local, pavimento, empresa_id, responsavel_id, data_vistoria, prazo, foto }) {
  const e = checar(); if (e) return falha(e)
  if (!podeRegistrarQualidade(sessao.role)) return falha('Só o engenheiro e a equipe da obra alteram pendências.')
  const p = daObra(mock.pendencias).find((x) => x.id === id)
  if (!p) return falha('Pendência não encontrada nesta obra.')
  const motivo = motivoParaNaoAlterar(p)
  if (motivo) return falha(motivo)
  const aceitos = [...daObra(mock.responsaveis).filter((r) => r.ativo).map((r) => r.id), p.empresa_id, p.responsavel_id]
  const erros = validarPendencia({ descricao, local, empresa_id, responsavel_id, data_vistoria, prazo }, aceitos, hojeISO())
  if (Object.keys(erros).length) return Promise.resolve({ data: null, erro: 'Confira os campos marcados.', erros })
  if (!fotoValida(foto)) return falha(`A foto passa de ${LIMITE_FOTO_TEXTO}.`)
  const novos = { descricao: descricao.trim(), local: local.trim(), pavimento: pavimento?.trim() ?? '', empresa_id, responsavel_id, data_vistoria, prazo }
  const mudou = camposAlterados(p, novos, ROTULOS_PENDENCIA)
  const trocouFoto = (foto?.url_previa ?? null) !== (p.foto?.url_previa ?? null)
  if (!mudou.length && !trocouFoto) return ok(copia(p))
  Object.assign(p, novos, { foto: foto ?? null })
  registrar(p, `Dados alterados: ${[...mudou, ...(trocouFoto ? ['foto'] : [])].join(', ')}.`)
  return ok(copia(p))
}

// Cancelar não apaga: sai da grade e dos números, guarda o motivo e pode ser reativada. Só o engenheiro.
export function cancelarPendencia(id, motivo) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro cancela pendências.')
  const p = daObra(mock.pendencias).find((x) => x.id === id)
  if (!p) return falha('Pendência não encontrada nesta obra.')
  const bloqueio = motivoParaNaoCancelarPendencia(p, motivo)
  if (bloqueio) return falha(bloqueio)
  Object.assign(p, { cancelada: true, cancelada_em: hojeISO(), motivo_cancelamento: motivo.trim() })
  registrar(p, `Pendência cancelada: ${motivo.trim()}`)
  return ok(copia(p))
}

export function reativarPendencia(id) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro reativa pendências.')
  const p = daObra(mock.pendencias).find((x) => x.id === id)
  if (!p) return falha('Pendência não encontrada nesta obra.')
  if (!p.cancelada) return falha('Esta pendência não está cancelada.')
  Object.assign(p, { cancelada: false, cancelada_em: null, motivo_cancelamento: '' })
  registrar(p, 'Pendência reativada.')
  return ok(copia(p))
}

// Observação a qualquer momento: entra em cima do histórico, com data, hora e quem escreveu.
export function anotarPendencia(id, nota) {
  const e = checar(); if (e) return falha(e)
  if (!podeRegistrarQualidade(sessao.role)) return falha('Só o engenheiro e a equipe da obra anotam nas pendências.')
  const p = daObra(mock.pendencias).find((x) => x.id === id)
  if (!p) return falha('Pendência não encontrada nesta obra.')
  if (!nota?.trim()) return falha('Escreva a observação.')
  registrar(p, nota.trim())
  return ok(copia(p))
}

/* ── Qualidade: FVS (fichas, vistorias e não conformidades) ── */

const vistoriaDaObra = (id) => daObra(mock.vistoriasFvs).find((v) => v.id === id)
const ncDaObra = (id) => daObra(mock.naoConformidades).find((n) => n.id === id)
const agoraLocal = () => dataHoraLocal(new Date())

export function listarModelosFvs() {
  const e = checar(); if (e) return falha(e)
  if (!veQualidade(sessao.role)) return falha(SEM_ACESSO_QUALIDADE)
  return ok(copia(daObra(mock.modelosFvs).filter((m) => m.ativo).sort((a, b) => a.codigo.localeCompare(b.codigo))))
}

// Ficha nova (sem id) ou edição (com id; a versão sobe). Só o engenheiro. Vistorias já abertas guardam a
// cópia da ficha do dia: editar a ficha não muda o que já foi vistoriado.
export function salvarModeloFvs({ id, nome, categoria, grupos }) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro cria ou edita fichas de FVS.')
  const atual = id ? daObra(mock.modelosFvs).find((m) => m.id === id) : null
  if (id && !atual) return falha('Ficha não encontrada nesta obra.')
  const outros = daObra(mock.modelosFvs).filter((m) => m.id !== id).map((m) => m.nome)
  const erros = validarModelo({ nome, categoria, grupos }, outros)
  if (Object.keys(erros).length) return Promise.resolve({ data: null, erro: 'Confira os campos marcados.', erros })
  const campos = { nome: nome.trim(), categoria, grupos: limparModelo(grupos) }
  if (atual) {
    Object.assign(atual, campos, { versao: atual.versao + 1 })
    return ok(copia(atual))
  }
  const novo = { id: novoId('mf'), obra_id: obraAtual, codigo: proximoCodigoFvs(daObra(mock.modelosFvs)), versao: 1, ...campos, ativo: true }
  mock.modelosFvs.push(novo)
  return ok(copia(novo))
}

export function listarVistoriasFvs() {
  const e = checar(); if (e) return falha(e)
  if (!veQualidade(sessao.role)) return falha(SEM_ACESSO_QUALIDADE)
  return ok(copia(daObra(mock.vistoriasFvs)))
}

// Vistoria nova: a ficha escolhida é copiada (grupos e itens) e o checklist começa todo pendente.
export function iniciarVistoriaFvs({ modelo_id, ambiente }) {
  const e = checar(); if (e) return falha(e)
  if (!podeRegistrarQualidade(sessao.role)) return falha('Só o engenheiro e a equipe da obra fazem vistorias.')
  const fichas = daObra(mock.modelosFvs).filter((m) => m.ativo)
  const erros = validarVistoria({ modelo_id, ambiente }, fichas.map((m) => m.id))
  if (Object.keys(erros).length) return Promise.resolve({ data: null, erro: 'Confira os campos marcados.', erros })
  const ficha = fichas.find((m) => m.id === modelo_id)
  const nova = {
    id: novoId('vf'), obra_id: obraAtual, modelo_id, codigo_modelo: ficha.codigo, nome_modelo: ficha.nome, versao: ficha.versao,
    grupos: copia(ficha.grupos), ambiente: ambiente.trim(), status: VISTORIA_ANDAMENTO, respostas: {},
    iniciada_em: hojeISO(), iniciada_por: sessao.id, concluida_em: null,
  }
  mock.vistoriasFvs.push(nova)
  return ok(copia(nova))
}

// OK ou N.A. num item (null volta a pendente). NC vai por registrarNcFvs.
export function responderItemFvs(vistoriaId, itemId, resposta) {
  const e = checar(); if (e) return falha(e)
  if (!podeRegistrarQualidade(sessao.role)) return falha('Só o engenheiro e a equipe da obra fazem vistorias.')
  const v = vistoriaDaObra(vistoriaId)
  if (!v) return falha('Vistoria não encontrada nesta obra.')
  const motivo = motivoParaNaoResponder(v, itemId, resposta)
  if (motivo) return falha(motivo)
  if (resposta === null) delete v.respostas[itemId]
  else v.respostas[itemId] = resposta
  return ok(copia(v))
}

// Marcar NC num item = registrar a não conformidade (descrição, solução, severidade, responsável, fotos).
export function registrarNcFvs(vistoriaId, itemId, { descricao, solucao, severidade, responsavel_id, fotos = [] }) {
  const e = checar(); if (e) return falha(e)
  if (!podeRegistrarQualidade(sessao.role)) return falha('Só o engenheiro e a equipe da obra registram não conformidades.')
  const v = vistoriaDaObra(vistoriaId)
  if (!v) return falha('Vistoria não encontrada nesta obra.')
  if (v.status === VISTORIA_CONCLUIDA) return falha('Vistoria concluída: só leitura.')
  if (v.respostas[itemId] === RESP_NC) return falha('Este item já tem não conformidade registrada.')
  const item = numerarItens(v.grupos).find((it) => it.id === itemId)
  if (!item) return falha('Item fora desta ficha.')
  const ativos = daObra(mock.responsaveis).filter((r) => r.ativo).map((r) => r.id)
  const erros = validarNc({ descricao, solucao, severidade, responsavel_id, fotos }, ativos)
  if (Object.keys(erros).length) return Promise.resolve({ data: null, erro: 'Confira os campos marcados.', erros })
  if (fotos.some((f) => !fotoValida(f))) return falha(`Há foto acima de ${LIMITE_FOTO_TEXTO}.`)
  const nova = {
    id: novoId('nc'), obra_id: obraAtual, codigo: proximoCodigoNc(daObra(mock.naoConformidades)), vistoria_id: v.id, item_id: itemId,
    item_numero: item.numero, titulo: item.titulo, servico: v.nome_modelo, ambiente: v.ambiente, descricao: descricao.trim(),
    solucao: solucao.trim(), severidade, responsavel_id, fotos, status: NC_ABERTA, aberta_em: hojeISO(), fechada_em: null,
    timeline: [{ quando: agoraLocal(), texto: `Aberta por ${autorDaSessao()}` }],
  }
  mock.naoConformidades.push(nova)
  v.respostas[itemId] = RESP_NC
  return ok(copia({ vistoria: v, nc: nova }))
}

// Finalizar: só sem item pendente; depois fica travada (só leitura).
export function finalizarVistoriaFvs(id) {
  const e = checar(); if (e) return falha(e)
  if (!podeRegistrarQualidade(sessao.role)) return falha('Só o engenheiro e a equipe da obra fazem vistorias.')
  const v = vistoriaDaObra(id)
  if (!v) return falha('Vistoria não encontrada nesta obra.')
  const motivo = motivoParaNaoFinalizar(v)
  if (motivo) return falha(motivo)
  Object.assign(v, { status: VISTORIA_CONCLUIDA, concluida_em: hojeISO() })
  return ok(copia(v))
}

// Não conformidades da obra, já com o nome do responsável.
export function listarNcs() {
  const e = checar(); if (e) return falha(e)
  if (!veQualidade(sessao.role)) return falha(SEM_ACESSO_QUALIDADE)
  const nomeResp = Object.fromEntries(daObra(mock.responsaveis).map((r) => [r.id, r.nome]))
  return ok(copia(daObra(mock.naoConformidades).map((n) => ({ ...n, responsavel: nomeResp[n.responsavel_id] ?? '—' }))))
}

// Um passo no tratamento da NC; aprovar e reprovar são do engenheiro. Cada passo entra na linha do tempo.
export function moverNc(id, para) {
  const e = checar(); if (e) return falha(e)
  if (!podeRegistrarQualidade(sessao.role)) return falha('Só o engenheiro e a equipe da obra tratam não conformidades.')
  const n = ncDaObra(id)
  if (!n) return falha('Não conformidade não encontrada nesta obra.')
  const motivo = motivoParaNaoMoverNc(n, para, podeEditar(sessao.role))
  if (motivo) return falha(motivo)
  const responsavel = daObra(mock.responsaveis).find((r) => r.id === n.responsavel_id)?.nome ?? '—'
  n.timeline.push({ quando: agoraLocal(), texto: `${textoDoPassoNc(para, n.status, responsavel)} (${autorDaSessao()})` })
  n.status = para
  n.fechada_em = para === NC_FECHADA ? hojeISO() : null
  return ok(copia({ ...n, responsavel }))
}

/* ── Qualidade: Gemba Walk (observações de desperdício) ── */

const observacaoDaObra = (id) => daObra(mock.observacoesGemba).find((o) => o.id === id)

// Observações da obra, já com o nome do responsável.
export function listarObservacoesGemba() {
  const e = checar(); if (e) return falha(e)
  if (!veQualidade(sessao.role)) return falha(SEM_ACESSO_QUALIDADE)
  const nomeResp = Object.fromEntries(daObra(mock.responsaveis).map((r) => [r.id, r.nome]))
  return ok(copia(daObra(mock.observacoesGemba).map((o) => ({ ...o, responsavel: nomeResp[o.responsavel_id] ?? '—' }))))
}

// Observação nova (sem id: entra como Pendente, com o próximo número) ou alteração dos dados (com id).
// Responsável: ativo do Cadastro, ou o que já estava. Prazo opcional.
export function salvarObservacaoGemba({ id, local, descricao, causa_raiz, acao, desperdicios = [], responsavel_id, prazo, foto }) {
  const e = checar(); if (e) return falha(e)
  if (!podeRegistrarQualidade(sessao.role)) return falha('Só o engenheiro e a equipe da obra registram observações.')
  const atual = id ? observacaoDaObra(id) : null
  if (id && !atual) return falha('Observação não encontrada nesta obra.')
  if (atual?.cancelada) return falha('Observação cancelada: reative para alterar.')
  const aceitos = [...daObra(mock.responsaveis).filter((r) => r.ativo).map((r) => r.id), ...(atual ? [atual.responsavel_id] : [])]
  const dados = { local, descricao, acao, desperdicios, responsavel_id, prazo: prazo || null }
  const erros = validarObservacao(dados, aceitos, atual?.registrado_em ?? hojeISO())
  if (Object.keys(erros).length) return Promise.resolve({ data: null, erro: 'Confira os campos marcados.', erros })
  if (!fotoValida(foto)) return falha(`A foto passa de ${LIMITE_FOTO_TEXTO}.`)
  const limpos = {
    local: local.trim(), descricao: descricao.trim(), causa_raiz: causa_raiz?.trim() ?? '', acao: acao.trim(),
    desperdicios: [...desperdicios], responsavel_id, prazo: prazo || null, foto: foto ?? null,
  }
  if (atual) { Object.assign(atual, limpos); return ok(copia(atual)) }
  const nova = {
    id: novoId('gw'), obra_id: obraAtual, numero: proximoNumero(daObra(mock.observacoesGemba)), ...limpos, status: PENDENTE,
    registrado_em: hojeISO(), registrado_por: sessao.id, resolvido_em: null, cancelada: false, cancelada_em: null, motivo_cancelamento: '',
  }
  mock.observacoesGemba.push(nova)
  return ok(copia(nova))
}

// Mudar de coluna (para a frente ou para trás). Resolvido grava a data; sair de Resolvido a apaga.
export function moverObservacaoGemba(id, para) {
  const e = checar(); if (e) return falha(e)
  if (!podeRegistrarQualidade(sessao.role)) return falha('Só o engenheiro e a equipe da obra movem as observações.')
  const o = observacaoDaObra(id)
  if (!o) return falha('Observação não encontrada nesta obra.')
  const motivo = motivoParaNaoMoverGemba(o, para)
  if (motivo) return falha(motivo)
  Object.assign(o, { status: para, resolvido_em: para === PEND_RESOLVIDO ? hojeISO() : null })
  return ok(copia(o))
}

// Cancelar não apaga: sai do quadro e do ranking, guarda o motivo e pode ser reativada. Só o engenheiro.
export function cancelarObservacaoGemba(id, motivo) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro cancela observações.')
  const o = observacaoDaObra(id)
  if (!o) return falha('Observação não encontrada nesta obra.')
  const bloqueio = motivoParaNaoCancelarGemba(o, motivo)
  if (bloqueio) return falha(bloqueio)
  Object.assign(o, { cancelada: true, cancelada_em: hojeISO(), motivo_cancelamento: motivo.trim() })
  return ok(copia(o))
}

export function reativarObservacaoGemba(id) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro reativa observações.')
  const o = observacaoDaObra(id)
  if (!o) return falha('Observação não encontrada nesta obra.')
  if (!o.cancelada) return falha('Esta observação não está cancelada.')
  Object.assign(o, { cancelada: false, cancelada_em: null, motivo_cancelamento: '' })
  return ok(copia(o))
}

/* ── Cancelar e reativar cadastros (módulo Cadastro) ── */

// Cancelar não apaga: o cadastro fica com ativo = false, sai das listas de escolha e continua no histórico.
// Só o engenheiro. tabela: uma de CADASTROS (lib/cadastros.js).
function mudarSituacaoDoCadastro(tabela, id, ativo) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro cancela ou reativa cadastros.')
  if (!CADASTROS.includes(tabela)) return falha('Cadastro desconhecido.')
  const item = daObra(mock[tabela]).find((x) => x.id === id)
  const motivo = ativo
    ? motivoParaNaoReativar(tabela, item, { categorias: daObra(mock.categoriasMaterial) })
    : motivoParaNaoCancelar(tabela, item, { materiais: daObra(mock.materiais) })
  if (motivo) return falha(motivo)
  item.ativo = ativo
  return ok(copia(item))
}
export const cancelarCadastro = (tabela, id) => mudarSituacaoDoCadastro(tabela, id, false)
export const reativarCadastro = (tabela, id) => mudarSituacaoDoCadastro(tabela, id, true)

/* ── Materiais: catálogo (aba do Cadastro) e pedidos (Kanban) ── */

const SEM_ACESSO_MATERIAIS = 'Os pedidos de material são do engenheiro, da equipe da obra e da diretoria.'

const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR')
const categoriaDe = () => Object.fromEntries(daObra(mock.categoriasMaterial).map((c) => [c.id, c]))

export function listarCategoriasMaterial({ comCancelados = false } = {}) {
  const e = checar(); if (e) return falha(e)
  if (!veMateriais(sessao.role)) return falha(SEM_ACESSO_MATERIAIS)
  return ok(copia(visiveis(daObra(mock.categoriasMaterial), comCancelados).sort(porNome)))
}

// Categoria nova (nome e cor da etiqueta). Só o engenheiro cadastra.
export function salvarCategoriaMaterial({ nome, cor }) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro cadastra categorias.')
  const erros = validarCategoria({ nome, cor }, daObra(mock.categoriasMaterial).map((c) => c.nome))
  if (Object.keys(erros).length) return Promise.resolve({ data: null, erro: 'Confira os campos marcados.', erros })
  const nova = { id: novoId('cat'), obra_id: obraAtual, nome: nome.trim(), cor, ativo: true }
  mock.categoriasMaterial.push(nova)
  return ok(copia(nova))
}

// Catálogo da obra, já com o nome e a cor da categoria.
export function listarMateriais({ comCancelados = false } = {}) {
  const e = checar(); if (e) return falha(e)
  if (!veMateriais(sessao.role)) return falha(SEM_ACESSO_MATERIAIS)
  const cat = categoriaDe()
  return ok(copia(visiveis(daObra(mock.materiais), comCancelados).sort(porNome)
    .map((m) => ({ ...m, categoria: cat[m.categoria_id]?.nome ?? '', cor: cat[m.categoria_id]?.cor ?? '' }))))
}

// Material do catálogo da obra. Só o engenheiro cadastra.
export function salvarMaterial({ nome, unidade, categoria_id }) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro cadastra materiais.')
  const categorias = daObra(mock.categoriasMaterial).filter((c) => c.ativo).map((c) => c.id)
  const erros = validarMaterial({ nome, unidade, categoria_id }, daObra(mock.materiais).map((m) => m.nome), categorias)
  if (Object.keys(erros).length) return Promise.resolve({ data: null, erro: 'Confira os campos marcados.', erros })
  const novo = { id: novoId('mat'), obra_id: obraAtual, nome: nome.trim(), unidade: unidade.trim(), categoria_id, ativo: true }
  mock.materiais.push(novo)
  return ok(copia(novo))
}

// Pedidos da obra, já com o nome, a unidade e a categoria (nome e cor) do material.
export function listarPedidosMaterial() {
  const e = checar(); if (e) return falha(e)
  if (!veMateriais(sessao.role)) return falha(SEM_ACESSO_MATERIAIS)
  const materialDe = Object.fromEntries(daObra(mock.materiais).map((m) => [m.id, m]))
  const cat = categoriaDe()
  return ok(copia(daObra(mock.pedidosMaterial).map((p) => {
    const m = materialDe[p.material_id]
    const c = cat[m?.categoria_id]
    return { ...p, material: m?.nome ?? 'Material fora do catálogo', unidade: m?.unidade ?? '', categoria: c?.nome ?? '', cor: c?.cor ?? '' }
  })))
}

// Pedido novo: material, quantidade, frente e prioridade. Entra em "Solicitar".
export function salvarPedidoMaterial({ material_id, quantidade, frente, prioridade }) {
  const e = checar(); if (e) return falha(e)
  if (!podeMoverPedidos(sessao.role)) return falha('Só o engenheiro e a equipe da obra fazem pedidos de material.')
  const ativos = daObra(mock.materiais).filter((m) => m.ativo).map((m) => m.id)
  const erros = validarPedido({ material_id, quantidade, frente, prioridade }, ativos)
  if (Object.keys(erros).length) return Promise.resolve({ data: null, erro: 'Confira os campos marcados.', erros })
  const novo = {
    id: novoId('pm'), obra_id: obraAtual, material_id, quantidade: Number(quantidade), frente: frente.trim(), prioridade,
    status: SOLICITAR, fornecedor: '', previsao_entrega: '', historico: [{ status: SOLICITAR, data: hojeISO() }],
    recebimento: null, frente_aplicada: '', criado_por: sessao.id,
  }
  mock.pedidosMaterial.push(novo)
  return ok(copia(novo))
}

// Mover o pedido uma coluna. Comprar pede fornecedor e previsão; receber, o checklist (foto da NF já
// comprimida pela tela); entregar, a frente de aplicação. Cada mudança grava {status, data} no histórico.
export function moverPedidoMaterial(pedidoId, para, dados = {}) {
  const e = checar(); if (e) return falha(e)
  if (!podeMoverPedidos(sessao.role)) return falha('Só o engenheiro e a equipe da obra movem os pedidos.')
  const k = mock.pedidosMaterial.findIndex((p) => p.id === pedidoId && p.obra_id === obraAtual)
  if (k < 0) return falha('Pedido não encontrado nesta obra.')
  const foto = dados.recebimento?.foto_nf
  if (foto && !cabeNoLimite(foto.tamanho_bytes)) return falha(`A foto da nota passa de ${LIMITE_FOTO_TEXTO}.`)
  const erros = validarMovimento(mock.pedidosMaterial[k], para, dados)
  if (Object.keys(erros).length) return Promise.resolve({ data: null, erro: erros.status ?? 'Confira os campos marcados.', erros })
  mock.pedidosMaterial[k] = aplicarMovimento(mock.pedidosMaterial[k], para, dados, hojeISO())
  return ok(copia(mock.pedidosMaterial[k]))
}

/* ── Lançamentos e diário ── */

// Fotos da obra (para as miniaturas do histórico do diário).
export function listarFotos() {
  const e = checar(); if (e) return falha(e)
  return ok(copia(daObra(mock.fotos).map((f) => ({ id: f.id, diario_id: f.diario_id, servico_id: f.servico_id, url_previa: f.url_previa ?? null, tirada_em: f.tirada_em ?? null }))))
}

// Lançamentos da obra já com a data do diário (como um select com o diário embutido).
export function listarLancamentos() {
  const e = checar(); if (e) return falha(e)
  const dataDoDiario = Object.fromEntries(daObra(mock.diarios).map((x) => [x.id, x.data]))
  return ok(copia(daObra(mock.lancamentos).map((l) => ({ ...l, data: dataDoDiario[l.diario_id] }))))
}

export function listarDiarios() {
  const e = checar(); if (e) return falha(e)
  const nomes = Object.fromEntries(mock.profiles.map((p) => [p.id, p.nome]))
  const nomeResp = Object.fromEntries(daObra(mock.responsaveis).map((r) => [r.id, r.nome]))
  const nomeFuncao = Object.fromEntries(daObra(mock.funcoes).map((x) => [x.id, x.nome]))
  const servicoDe = Object.fromEntries(daObra(mock.servicos).map((s) => [s.id, s]))
  const lista = daObra(mock.diarios)
    .map((x) => {
      // As atividades do dia são os serviços com produção ou concluídos (o nome de cada cartão).
      const doDia = daObra(mock.lancamentos).filter((l) => l.diario_id === x.id && (l.quantidade > 0 || l.concluido))
      return {
        ...x,
        atividades: doDia.map((l) => ({
          servico_id: l.servico_id, descricao: servicoDe[l.servico_id]?.descricao ?? '—',
          quantidade: l.quantidade, unidade: servicoDe[l.servico_id]?.unidade ?? '', concluido: l.concluido,
        })),
        autor: nomes[x.criado_por] ?? '—',
        efetivo: daObra(mock.efetivo).filter((l) => l.diario_id === x.id).map((l) => ({
          responsavel_id: l.responsavel_id, funcao_id: l.funcao_id, quantidade: l.quantidade,
          responsavel: nomeResp[l.responsavel_id] ?? '—', funcao: nomeFuncao[l.funcao_id] ?? '—',
        })),
        servicos_com_producao: doDia.filter((l) => l.quantidade > 0).length,
        qtd_fotos: daObra(mock.fotos).filter((f) => f.diario_id === x.id).length,
      }
    })
    .sort((a, b) => b.data.localeCompare(a.data))
  return ok(copia(lista))
}

// itens: [{ servico_id, quantidade, responsavel_id, concluido, memoria_calculo, fotos: [{ tamanho_bytes, largura, altura, url_previa }] }]
// A memória de cálculo é de cada serviço (fica no lançamento) e não entra no resumo do dia.
// efetivo: [{ responsavel_id, funcao_id, quantidade }]
// As fotos chegam já comprimidas pela tela; aqui o limite de tamanho é conferido de novo.
export function salvarDiario({ data, clima_manha, clima_tarde, ocorrencias, efetivo: efetivoDigitado = [], itens }) {
  const e = checar(); if (e) return falha(e)
  const efetivo = linhasPreenchidas(efetivoDigitado) // linha deixada em branco não conta
  if (!podeLancar(sessao.role)) return falha('Seu perfil não lança diário.')
  const obra = mock.obras.find((o) => o.id === obraAtual)
  if (!aceitaLancamento(obra)) return falha('Esta obra está concluída e não aceita lançamentos.')
  if (Object.keys(validarEfetivo(efetivo)).length) return falha('Confira as linhas do efetivo.')
  const responsaveisDaObra = new Set(daObra(mock.responsaveis).map((r) => r.id))
  const funcoesDaObra = new Set(daObra(mock.funcoes).map((x) => x.id))
  if (efetivo.some((l) => !responsaveisDaObra.has(l.responsavel_id) || !funcoesDaObra.has(l.funcao_id))) return falha('Há responsável ou função de outra obra no efetivo.')
  const diarioExistente = daObra(mock.diarios).find((x) => x.data === data)
  // Cadastro cancelado só entra se já estava neste diário (a correção não obriga a trocar).
  const jaNoDiario = (campo) => new Set(diarioExistente
    ? [...daObra(mock.efetivo), ...daObra(mock.lancamentos)].filter((l) => l.diario_id === diarioExistente.id).map((l) => l[campo]) : [])
  const respDe = Object.fromEntries(daObra(mock.responsaveis).map((r) => [r.id, r]))
  const funcaoDe = Object.fromEntries(daObra(mock.funcoes).map((x) => [x.id, x]))
  const respGravados = jaNoDiario('responsavel_id')
  if (efetivo.some((l) => !aceitaNoRegistro(respDe[l.responsavel_id], respGravados) || !aceitaNoRegistro(funcaoDe[l.funcao_id], jaNoDiario('funcao_id')))) {
    return falha('Há responsável ou função cancelado no efetivo. Escolha um da lista.')
  }
  // Na correção, zerar o que estava lançado também é registro (o Kanban e o saldo voltam junto).
  const zeraLancamento = !!diarioExistente && zeraAlgumLancamento({
    lancados: daObra(mock.lancamentos).filter((l) => l.diario_id === diarioExistente.id),
    quantidadeDe: Object.fromEntries(itens.map((i) => [i.servico_id, i.quantidade])),
  })
  if (!diarioTemConteudo({ itens, efetivo, ocorrencias, zeraLancamento })) return falha('Registre alguma coisa do dia: produção, efetivo, memória de cálculo ou ocorrências.')
  const jaLancados = new Set(diarioExistente ? daObra(mock.lancamentos).filter((l) => l.diario_id === diarioExistente.id).map((l) => l.servico_id) : [])
  // Na correção, um serviço que voltou para zero também é gravado (zera o lançamento).
  const comProducao = itens.filter((i) => itemTemConteudo(i) || jaLancados.has(i.servico_id))
  const servicosDaObra = new Set(daObra(mock.servicos).map((s) => s.id))
  const comFoto = itens.filter((i) => i.fotos?.length)
  if ([...comProducao, ...comFoto].some((i) => !servicosDaObra.has(i.servico_id))) return falha('Há serviço de outra obra no lançamento.')
  // "Quem executou" vai também para o cartão do Kanban: só responsável desta obra.
  if (comProducao.some((i) => i.responsavel_id && !responsaveisDaObra.has(i.responsavel_id))) return falha('Há responsável de outra obra em "Quem executou".')
  if (comProducao.some((i) => i.responsavel_id && !aceitaNoRegistro(respDe[i.responsavel_id], respGravados))) return falha('Há responsável cancelado em "Quem executou". Escolha um da lista.')
  const fotosEnviadas = comFoto.flatMap((i) => i.fotos)
  if (fotosEnviadas.some((f) => !cabeNoLimite(f.tamanho_bytes))) return falha(`Há foto acima de ${LIMITE_FOTO_TEXTO}. Ela precisa ser comprimida antes de enviar.`)
  const origemGps = Object.values(ORIGENS_GPS)
  const origemData = Object.values(ORIGENS_DATA)
  if (fotosEnviadas.some((f) => (f.gps_lat != null && (!coordenadaValida(f.gps_lat, f.gps_lon) || !origemGps.includes(f.gps_origem)))
    || (f.tirada_em_origem != null && !origemData.includes(f.tirada_em_origem)))) {
    return falha('Há foto com data ou localização inválida.')
  }

  let diario = diarioExistente
  if (diario) {
    const autorDoDia = diario.criado_por
    if (!podeCorrigir({ role: sessao.role, profileId: sessao.id, lancadoPor: autorDoDia, dataDiario: data, hoje: hojeISO() })) {
      return falha('O prazo para corrigir este diário acabou. Peça ao engenheiro.')
    }
  } else {
    if (!podeLancarData({ role: sessao.role, data, hoje: hojeISO(), inicioObra: obra.data_inicio })) {
      return falha(porQueNaoLanca({ role: sessao.role, lancaDiario: true, obraAceita: true }))
    }
    diario = { id: novoId('dia'), obra_id: obraAtual, data, criado_por: sessao.id }
    mock.diarios.push(diario)
  }
  Object.assign(diario, { clima_manha, clima_tarde, ocorrencias: ocorrencias ?? '', enviado_em: new Date().toISOString() })

  // O efetivo do dia é substituído pelo que veio agora.
  for (let k = mock.efetivo.length - 1; k >= 0; k--) {
    if (mock.efetivo[k].obra_id === obraAtual && mock.efetivo[k].diario_id === diario.id) mock.efetivo.splice(k, 1)
  }
  efetivo.forEach((l) => mock.efetivo.push({
    id: novoId('ef'), obra_id: obraAtual, diario_id: diario.id,
    responsavel_id: l.responsavel_id, funcao_id: l.funcao_id, quantidade: l.quantidade,
  }))

  const dataDoDiario = Object.fromEntries(daObra(mock.diarios).map((x) => [x.id, x.data]))
  for (const i of comProducao) {
    const existente = daObra(mock.lancamentos).find((l) => l.diario_id === diario.id && l.servico_id === i.servico_id)
    const campos = {
      quantidade: Math.max(0, Number(i.quantidade) || 0), concluido: !!i.concluido,
      responsavel_id: i.responsavel_id ?? null, memoria_calculo: (i.memoria_calculo ?? '').trim(),
    }
    // O que este envio faz com o cartão do Kanban (regra em efeitoDoDiarioNoKanban), calculado antes de
    // gravar: vale a última ação, e só o item cuja quantidade ou conclusão mudou mexe no Kanban.
    const semana = segundaDaSemana(data)
    const { novo: novoNoKanban } = efeitoDoDiarioNoKanban({
      registros: daObra(mock.semanaAtividades), lancamentos: daObra(mock.lancamentos).map((l) => ({ ...l, data: dataDoDiario[l.diario_id] })),
      servico: comVigente(daObra(mock.servicos).find((s) => s.id === i.servico_id)), semana, diarioId: diario.id, quantidade: campos.quantidade,
    })
    if (existente) {
      Object.assign(existente, campos, { corrigido_por: sessao.id, corrigido_em: new Date().toISOString() })
    } else {
      mock.lancamentos.push({
        id: novoId('lan'), obra_id: obraAtual, diario_id: diario.id, servico_id: i.servico_id,
        ...campos, lancado_por: sessao.id, corrigido_por: null, corrigido_em: null,
      })
    }
    // "Quem executou" vai para o cartão só do que já está no Kanban da semana (registro ou EAP).
    const reg = daObra(mock.semanaAtividades).find((x) => x.semana === semana && x.servico_id === i.servico_id)
    const servico = comVigente(daObra(mock.servicos).find((s) => s.id === i.servico_id))
    const antes = acumuladoAntesDe(i.servico_id, semana)
    const noKanban = !!reg || planejadaNaSemana({ servico, real: servico.qtd_contratada > 0 ? antes / servico.qtd_contratada : 0, semana })
    if (novoNoKanban) Object.assign(registroDaSemana(semana, i.servico_id), { status: novoNoKanban, causa: null, causa_texto: '', atualizado_por: sessao.id, atualizado_em: dataHoraLocal(new Date()) })
    // Quem executou no Diário passa a ser o responsável do cartão na semana (vale a última ação).
    if (noKanban && campos.quantidade > 0 && campos.responsavel_id && reg?.responsavel_id !== campos.responsavel_id) {
      Object.assign(registroDaSemana(semana, i.servico_id), { responsavel_id: campos.responsavel_id, atualizado_por: sessao.id, atualizado_em: dataHoraLocal(new Date()) })
    }
  }
  // Foto pode ir mesmo em serviço sem produção no dia (ex.: registrar que está parado).
  for (const i of comFoto) {
    for (const f of i.fotos) {
      mock.fotos.push({
        id: novoId('foto'), obra_id: obraAtual, diario_id: diario.id, servico_id: i.servico_id,
        caminho: `fotos/${obraAtual}/${diario.id}/${novoId('f')}.jpg`, tirada_por: sessao.id,
        tamanho_bytes: f.tamanho_bytes, largura: f.largura, altura: f.altura,
        tirada_em: f.tirada_em ?? null, tirada_em_origem: f.tirada_em_origem ?? null,
        gps_lat: f.gps_lat ?? null, gps_lon: f.gps_lon ?? null, gps_origem: f.gps_lat != null ? f.gps_origem : null,
        endereco: f.endereco ?? null,
        url_previa: f.url_previa ?? null, // só nos dados de exemplo: a foto fica na memória do navegador
      })
    }
  }
  acompanharEap()
  return ok(copia(diario))
}

/* ── Medição ── */

// Cada medição vem com quantos itens tem e, em planejamento, o valor que está montando (só quem vê R$).
export function listarMedicoes() {
  const e = checar(); if (e) return falha(e)
  const itensDe = (id) => daObra(mock.medicaoItens).filter((i) => i.medicao_id === id)
  return ok(copia(daObra(mock.medicoes).map((m) => semValores({
    ...m, qtd_itens: itensDe(m.id).length,
    valor_em_montagem: valorEmMontagem(itensDe(m.id)),
  })).sort((a, b) => b.numero - a.numero)))
}

// Obra com cronograma de medições no contrato: todas as medições nascem de uma vez, em planejamento
// (a 1ª pode juntar meses; depois, uma por mês até a entrega), e cada uma segue a EAP do seu período.
// Só cria se a obra ainda não tem medição (cronograma mudado depois não reescreve o que existe).
function criarMedicoesDoCronograma(obra) {
  const periodos = cronogramaDeMedicoes({ inicio: obra.medicoes_inicio, fimPrimeira: obra.medicoes_fim_primeira, entrega: obra.data_entrega })
  if (!periodos.length || mock.medicoes.some((m) => m.obra_id === obra.id)) return
  for (const p of periodos) {
    mock.medicoes.push({
      id: novoId('med'), obra_id: obra.id, numero: p.numero, data_inicio: p.inicio, data_fim: p.fim, status: 'Planejando',
      valor_planejado: null, valor_medido: null, meta_batida: null, fechada_em: null,
    })
  }
  if (obra.id === obraAtual) acompanharEap()
}
const obraAtualTemCronograma = () => temCronograma(mock.obras.find((o) => o.id === obraAtual))

export function buscarMedicaoAtual() {
  const e = checar(); if (e) return falha(e)
  const m = daObra(mock.medicoes).find((x) => x.status === 'Em andamento')
  return ok(m ? copia(semValores(m)) : null)
}

// Os itens de todas as medições da obra (o Diário acha a medição do dia e mostra a meta de cada item).
export function listarItensDasMedicoes() {
  const e = checar(); if (e) return falha(e)
  return ok(copia(daObra(mock.medicaoItens).map(semValores)))
}

export function listarItensMedicao(medicaoId) {
  const e = checar(); if (e) return falha(e)
  return ok(copia(daObra(mock.medicaoItens).filter((i) => i.medicao_id === medicaoId).map(semValores)))
}

// A próxima medição, continuando do fim da última (periodoDaProxima: mês inteiro quando começa no dia 1),
// criada só quando o engenheiro pede. Obra com cronograma: é a que passa do contrato (a 11 em set/27…).
// Sem cronograma, a Medição 1 nasce sozinha pela EAP. A ordem de iniciar é a de podeIniciar.
export function criarMedicao() {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro cria medições.')
  const daObraAtual = daObra(mock.medicoes)
  const ultima = [...daObraAtual].sort((a, b) => b.numero - a.numero)[0]
  if (!ultima) return falha('A Medição 1 é criada sozinha quando um item da EAP ganha datas no mês vigente.')
  return ok(copia(novaMedicao(periodoDaProxima(ultima.data_fim), ultima.numero + 1)))
}

function novaMedicao(periodo, numero) {
  const nova = {
    id: novoId('med'), obra_id: obraAtual, numero,
    data_inicio: periodo.inicio, data_fim: periodo.fim, status: 'Planejando',
    valor_planejado: null, valor_medido: null, meta_batida: null, fechada_em: null,
  }
  mock.medicoes.push(nova)
  sincronizarPelaEap(nova)
  return nova
}

// Os itens da EAP com período dentro do da medição, e a quantidade prevista (regra em medicao.js).
function itensDaEapNoPeriodo(periodo) {
  const servicos = daObra(mock.servicos).map(comVigente)
  // Saldo pelo executado ANTES do período: o que o Diário lança no próprio mês não encolhe a meta dele.
  const dataDoDiario = Object.fromEntries(daObra(mock.diarios).map((x) => [x.id, x.data]))
  const acumulado = {}
  for (const l of daObra(mock.lancamentos)) {
    if (dataDoDiario[l.diario_id] < periodo.inicio) acumulado[l.servico_id] = (acumulado[l.servico_id] ?? 0) + l.quantidade
  }
  const cal = daObra(mock.calendarios)[0] ?? CALENDARIO_PADRAO
  const preco = Object.fromEntries(servicos.map((s) => [s.id, s.preco_unitario]))
  return itensPelaEap({ servicos, periodo, cal, acumulado }).map((i) => ({ ...i, preco_unitario: preco[i.servico_id] }))
}

// A Medição 1 nasce no primeiro item da EAP com datas no mês vigente (dia 1 ao último dia do mês).
function garantirMedicao1() {
  if (obraAtualTemCronograma() || daObra(mock.medicoes).length) return
  const periodo = mesVigente(hojeISO())
  if (itensDaEapNoPeriodo(periodo).length) novaMedicao(periodo, 1)
}

// Medição em planejamento segue a EAP (regra em reconciliarItens): entra o item que ganhou datas no
// período, sai o que saiu dele, e a quantidade acompanha as datas, menos a ajustada à mão.
function sincronizarPelaEap(med) {
  if (med.status !== 'Planejando') return
  const atuais = daObra(mock.medicaoItens).filter((i) => i.medicao_id === med.id)
  const { sair, entrar, mudar } = reconciliarItens(atuais, itensDaEapNoPeriodo({ inicio: med.data_inicio, fim: med.data_fim }))
  for (let k = mock.medicaoItens.length - 1; k >= 0; k--) {
    if (mock.medicaoItens[k].obra_id === obraAtual && sair.includes(mock.medicaoItens[k].id)) mock.medicaoItens.splice(k, 1)
  }
  for (const m of mudar) Object.assign(atuais.find((i) => i.id === m.id), m)
  for (const n of entrar) {
    mock.medicaoItens.push({
      id: novoId('item'), obra_id: obraAtual, medicao_id: med.id, servico_id: n.servico_id,
      qtd_planejada: n.qtd_planejada, qtd_planejada_inicial: null, preco_unitario: n.preco_unitario, qtd_medida: null, ajustada: false,
    })
  }
}

// Toda gravação que muda datas da EAP, quantidade vigente, preço ou executado chama isto no fim: nasce a
// Medição 1 (se é o primeiro item com datas no mês) e a medição em planejamento acompanha a EAP.
function acompanharEap() {
  garantirMedicao1()
  daObra(mock.medicoes).forEach(sincronizarPelaEap)
}

export function salvarQtdPlanejada(itemId, quantidade) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro planeja a medição.')
  const item = daObra(mock.medicaoItens).find((i) => i.id === itemId)
  if (!item) return falha('Item não encontrado nesta obra.')
  const med = mock.medicoes.find((m) => m.id === item.medicao_id)
  if (med.status === 'Fechada') return falha('Medição fechada não muda mais.')
  // Ajustada à mão: a EAP não reescreve mais essa quantidade.
  Object.assign(item, { qtd_planejada: Math.max(0, Number(quantidade) || 0), ajustada: true })
  return ok(copia(item))
}

export function iniciarMedicao(medicaoId) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro inicia a medição.')
  const lista = daObra(mock.medicoes)
  if (!podeIniciar(lista, medicaoId)) return falha('Inicie as medições na ordem: a de número mais baixo em planejamento, sem outra em andamento.')
  const med = lista.find((m) => m.id === medicaoId)
  sincronizarPelaEap(med)
  const itens = daObra(mock.medicaoItens).filter((i) => i.medicao_id === medicaoId)
  if (!itens.length) return falha('A medição não tem item: lance as datas na EAP.')
  const preco = Object.fromEntries(daObra(mock.servicos).map((s) => [s.id, s.preco_unitario]))
  const { itens: congelados, valor_planejado } = congelarMeta(itens, preco)
  congelados.forEach((c) => Object.assign(itens.find((i) => i.id === c.id), c))
  Object.assign(med, { status: 'Em andamento', valor_planejado })
  return ok(copia(med))
}

// Descongelar para replanejar: volta a "Planejando", a meta congelada sai e os itens voltam a acompanhar
// a EAP (a quantidade ajustada à mão fica). Iniciar de novo congela a meta replanejada.
export function descongelarMedicao(medicaoId) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro descongela a medição.')
  const med = daObra(mock.medicoes).find((m) => m.id === medicaoId)
  if (!med) return falha('Medição não encontrada nesta obra.')
  if (!podeDescongelar(med)) return falha('Só a medição em andamento pode ser descongelada.')
  Object.assign(med, { status: 'Planejando', valor_planejado: null })
  for (const i of daObra(mock.medicaoItens).filter((x) => x.medicao_id === med.id)) i.qtd_planejada_inicial = null
  sincronizarPelaEap(med)
  return ok(copia(semValores(med)))
}

/* ── Medição de empreiteiros ── */
// Mostra R$ do começo ao fim: só quem vê valores lê; só o engenheiro grava.

const SEM_ACESSO_EMPREITEIROS = 'A medição de empreiteiros é do engenheiro e da diretoria.'

// Um contrato com tudo o que as telas mostram: empreiteiro, itens do escopo (com código, descrição e unidade
// do Orçamento), boletins (do mais recente para o mais antigo), linhas, valor total, medido e %.
function contratoCompleto(c) {
  const nomeResp = Object.fromEntries(daObra(mock.responsaveis).map((x) => [x.id, x.nome]))
  const servicoDe = Object.fromEntries(daObra(mock.servicos).map((s) => [s.id, s]))
  const itens = daObra(mock.contratoItens).filter((i) => i.contrato_id === c.id).map((i) => {
    const s = servicoDe[i.servico_id]
    return { ...i, codigo: s?.codigo ?? '—', descricao: s?.descricao ?? 'Item fora do Orçamento', unidade: s?.unidade ?? '' }
  })
  const boletins = daObra(mock.boletinsEmpreiteiro).filter((b) => b.contrato_id === c.id).sort((a, b) => b.numero - a.numero)
  const idsBoletins = new Set(boletins.map((b) => b.id))
  const linhas = daObra(mock.boletimLinhas).filter((l) => idsBoletins.has(l.boletim_id))
  const valor_total = valorDoContrato({ tipo: c.tipo, valor_global: c.valor_global, itens })
  const medido = medidoDoContrato({ boletins, linhas })
  return {
    ...c, empreiteiro: nomeResp[c.responsavel_id] ?? '—', itens, boletins, linhas, valor_total,
    medido_valor: medido.valor, medido_por_item: medido.porItem, pct_medido: pctMedido(medido.valor, valor_total ?? 0),
  }
}

export function listarContratosEmpreiteiro() {
  const e = checar(); if (e) return falha(e)
  if (!podeVerValores(sessao.role)) return falha(SEM_ACESSO_EMPREITEIROS)
  return ok(copia(daObra(mock.contratosEmpreiteiro).map(contratoCompleto)))
}

// Novo contrato: empreiteiro (um responsável desta obra) e descrição; nasce em "Em elaboração", sem valor.
export function salvarContratoEmpreiteiro({ responsavel_id, descricao }) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro cria contratos de empreiteiro.')
  const erros = {}
  if (!daObra(mock.responsaveis).some((r) => r.id === responsavel_id && r.ativo && TIPOS_EMPREITEIRO.includes(r.tipo))) erros.responsavel_id = 'Escolha o empreiteiro.'
  if (!descricao?.trim()) erros.descricao = 'Descreva o serviço contratado.'
  if (Object.keys(erros).length) return Promise.resolve({ data: null, erro: 'Confira os campos marcados.', erros })
  const novo = {
    id: novoId('ce'), obra_id: obraAtual, responsavel_id, descricao: descricao.trim(), status: EM_ELABORACAO,
    tipo: null, valor_global: null, criado_em: dataHoraLocal(new Date()),
  }
  mock.contratosEmpreiteiro.push(novo)
  return ok(copia(contratoCompleto(novo)))
}

// Mover o card uma coluna (setas). Ir para "Aprovado / Ativo" é pelo cadastro do valor (salvarValorDoContrato).
export function moverContratoEmpreiteiro(contratoId, para) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro move os contratos.')
  const c = daObra(mock.contratosEmpreiteiro).find((x) => x.id === contratoId)
  if (!c) return falha('Contrato não encontrado nesta obra.')
  if (para === ATIVO && c.status === ENVIADO) return falha('Cadastre o valor do contrato para ativá-lo.')
  const completo = contratoCompleto(c)
  const motivo = motivoParaNaoMover({ contrato: c, para, pctMedido: completo.pct_medido, temBoletim: completo.boletins.length > 0 })
  if (motivo) return falha(motivo)
  c.status = para
  return ok(copia(contratoCompleto(c)))
}

// Cadastro do valor: ao ativar (contrato "Enviado p/ aprovação") ou como aditivo (contrato ativo).
// Global: só o valor. Por escopo: itens do Orçamento desta obra, com quantidade e preço do empreiteiro.
// O item que já tem medição mantém o id (os boletins apontam para ele) e não sai nem fica abaixo do medido.
export function salvarValorDoContrato(contratoId, { tipo, valor_global, itens = [] }) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro cadastra o valor do contrato.')
  const c = daObra(mock.contratosEmpreiteiro).find((x) => x.id === contratoId)
  if (!c) return falha('Contrato não encontrado nesta obra.')
  if (c.status !== ENVIADO && c.status !== ATIVO) return falha('O valor é cadastrado ao ativar o contrato (ou como aditivo, com ele ativo).')
  const completo = contratoCompleto(c)
  if (completo.boletins.length && c.tipo && tipo !== c.tipo) return falha('Contrato com boletim não muda de tipo.')
  const servicosDaObra = new Set(daObra(mock.servicos).map((s) => s.id))
  if (itens.some((i) => i.servico_id && !servicosDaObra.has(i.servico_id))) return falha('Há item de outra obra no escopo.')
  const itemAtualDe = Object.fromEntries(completo.itens.map((i) => [i.servico_id, i]))
  const medidoPorServico = Object.fromEntries(completo.itens.map((i) => [i.servico_id, completo.medido_por_item[i.id] ?? 0]))
  const precoPorServico = Object.fromEntries(completo.itens.map((i) => [i.servico_id, i.preco_unitario]))
  const erros = validarValorDoContrato({ tipo, valor_global, itens, medidoValor: completo.medido_valor, medidoPorServico, precoPorServico })
  if (Object.keys(erros).length) return Promise.resolve({ data: null, erro: 'Confira os campos marcados.', erros })
  for (let k = mock.contratoItens.length - 1; k >= 0; k--) {
    if (mock.contratoItens[k].obra_id === obraAtual && mock.contratoItens[k].contrato_id === c.id) mock.contratoItens.splice(k, 1)
  }
  if (tipo === POR_ESCOPO) {
    for (const i of itens) {
      mock.contratoItens.push({
        id: itemAtualDe[i.servico_id]?.id ?? novoId('ci'), obra_id: obraAtual, contrato_id: c.id,
        servico_id: i.servico_id, quantidade: Number(i.quantidade), preco_unitario: Number(i.preco_unitario),
      })
    }
  }
  Object.assign(c, { tipo, valor_global: tipo === POR_ESCOPO ? null : Number(valor_global), status: ATIVO })
  return ok(copia(contratoCompleto(c)))
}

// Nova medição (boletim numerado) de um contrato ativo. Global: o R$ medido. Por escopo: a quantidade de cada
// item (a fonte da verdade; o R$ da linha sai dela). Nada passa de 100% acumulado. Só o engenheiro lança.
// linhas: [{ contrato_item_id, quantidade }].
export function salvarBoletimEmpreiteiro(contratoId, { data, valor, linhas = [] }) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro lança boletim de medição.')
  const c = daObra(mock.contratosEmpreiteiro).find((x) => x.id === contratoId)
  if (!c) return falha('Contrato não encontrado nesta obra.')
  if (c.status !== ATIVO) return falha('Só contrato "Aprovado / Ativo" recebe medição.')
  const completo = contratoCompleto(c)
  let valorBoletim
  let linhasBoletim = []
  let erros
  if (c.tipo === GLOBAL) {
    valorBoletim = globalPorValor(completo.valor_total, valor).valor
    erros = validarBoletim({ tipo: GLOBAL, data, hoje: hojeISO(), valorTotal: completo.valor_total, medidoValor: completo.medido_valor, valor: valorBoletim })
  } else {
    const itemDe = Object.fromEntries(completo.itens.map((i) => [i.id, i]))
    if (linhas.some((l) => !itemDe[l.contrato_item_id])) return falha('Há item fora deste contrato no boletim.')
    linhasBoletim = linhas.filter((l) => Number(l.quantidade) > 0).map((l) => {
      const x = linhaPorQuantidade(itemDe[l.contrato_item_id], l.quantidade, completo.medido_por_item[l.contrato_item_id] ?? 0)
      return { contrato_item_id: l.contrato_item_id, quantidade: x.quantidade, valor: x.valor }
    })
    valorBoletim = valorDoBoletim(linhasBoletim)
    erros = validarBoletim({ tipo: POR_ESCOPO, data, hoje: hojeISO(), itens: completo.itens, medidoPorItem: completo.medido_por_item, linhas: linhasBoletim })
  }
  if (Object.keys(erros).length) return Promise.resolve({ data: null, erro: erros.data ?? 'Confira o boletim: nada pode passar de 100% acumulado.', erros })
  const boletim = {
    id: novoId('be'), obra_id: obraAtual, contrato_id: c.id, numero: proximoNumeroDeBoletim(completo.boletins),
    data, valor: valorBoletim, criado_por: sessao.id,
  }
  mock.boletinsEmpreiteiro.push(boletim)
  for (const l of linhasBoletim) mock.boletimLinhas.push({ id: novoId('bl'), obra_id: obraAtual, boletim_id: boletim.id, ...l })
  return ok(copia(contratoCompleto(c)))
}

/* ── Pessoas e liberações ── */

export function listarPessoas() {
  const e = checar({ precisaObra: false }); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro gerencia pessoas.')
  const lista = mock.profiles.map((p) => ({
    ...p,
    obra_ids: mock.membros.filter((m) => m.ativo && m.profile_id === p.id).map((m) => m.obra_id),
  }))
  return ok(copia(lista))
}

export function liberarPessoa(profileId, { role, cargo, obraIds }) {
  const e = checar({ precisaObra: false }); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro libera pessoas.')
  const p = mock.profiles.find((x) => x.id === profileId)
  if (!p) return falha('Pessoa não encontrada.')
  if (role === 'Aguardando liberação') return falha('Escolha um perfil.')
  const precisaObra = role !== 'Diretoria'
  if (precisaObra && !obraIds.length) return falha('Escolha pelo menos uma obra.')
  if ((role === 'Equipe da obra' || role === 'Fiscalização') && obraIds.length > 1) {
    return falha('Equipe da obra e Fiscalização ficam em uma obra por vez.')
  }
  p.role = role
  p.cargo = cargo ?? p.cargo
  mock.membros.filter((m) => m.profile_id === p.id).forEach((m) => { m.ativo = obraIds.includes(m.obra_id) })
  for (const obraId of obraIds) {
    if (!mock.membros.some((m) => m.profile_id === p.id && m.obra_id === obraId)) {
      mock.membros.push({ id: novoId('m'), obra_id: obraId, profile_id: p.id, ativo: true })
    }
  }
  return ok(copia(p))
}

/* ── Endereço das fotos (serviço externo: mapa aberto do OpenStreetMap) ── */

// Só as coordenadas saem do aparelho. O serviço aceita no máximo 1 pedido por
// segundo: os pedidos entram numa fila. Sem internet ou sem resposta: null.
const enderecos = new Map()
let fila = Promise.resolve()
const espera = (ms) => new Promise((r) => setTimeout(r, ms))

export function buscarEndereco(lat, lon) {
  const chave = `${lat.toFixed(5)},${lon.toFixed(5)}`
  if (!enderecos.has(chave)) {
    const pedido = fila.then(async () => {
      const controle = new AbortController()
      const tempo = setTimeout(() => controle.abort(), 8000)
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=pt-BR&lat=${lat}&lon=${lon}`
        const r = await fetch(url, { signal: controle.signal })
        return r.ok ? montarEndereco((await r.json()).address) : null
      } catch (_) {
        return null
      } finally {
        clearTimeout(tempo)
      }
    })
    fila = pedido.then(() => espera(1100))
    // Falhou: não guarda, para tentar de novo no próximo pedido.
    pedido.then((e) => { if (e === null) enderecos.delete(chave) })
    enderecos.set(chave, pedido)
  }
  return enderecos.get(chave).then((endereco) => ({ data: endereco, erro: null }))
}
