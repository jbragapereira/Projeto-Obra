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
import { addDias, dataHoraLocal, hojeISO } from './datas.js'
import { podeEditar, podeLancar, podePlanejar, podeVerValores, veTodasAsObras } from './perfis.js'
import { codigoValido, compararCodigos, paiDoCodigo, proximoCodigo, validarDatas } from './planejamento.js'
import { CRITICO_A_MAO, ORIGENS_ITEM, arredondarQtd, minimoDoItemNovo, podeExcluirAditivo, podeExcluirItemNovo, precoUnitario, qtdVigente, validarAditivo, validarItemNovo } from './orcamento.js'
import { congelarMeta, podeIniciar } from './medicao.js'
import { aceitaLancamento, validarObra } from './obras.js'
import { FUNCOES_PADRAO, diarioTemConteudo, itemTemConteudo, linhasPreenchidas, podeCorrigir, porQueNaoLanca, podeLancarData, validarEfetivo } from './diario.js'
import { LIMITE_FOTO_TEXTO, ORIGENS_DATA, ORIGENS_GPS, cabeNoLimite, coordenadaValida, montarEndereco } from './fotos.js'

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
  }
  if (obra.id) {
    const atual = mock.obras.find((o) => o.id === obra.id)
    if (!atual) return falha('Obra não encontrada.')
    Object.assign(atual, campos)
    return ok(copia(atual))
  }
  const nova = { id: novoId('obra'), ...campos }
  mock.obras.push(nova)
  FUNCOES_PADRAO.forEach((nome) => mock.funcoes.push({ id: novoId('fn'), obra_id: nova.id, nome, ativo: true }))
  // Quem cria a obra passa a ter acesso a ela.
  mock.membros.push({ id: novoId('m'), obra_id: nova.id, profile_id: sessao.id, ativo: true })
  return ok(copia(nova))
}

/* ── Orçamento: itens (serviços), aditivos e grupos (sempre da obra atual) ── */

// qtd_orcada = como veio na planilha; qtd_contratada = a vigente (com aditivos), a que o app inteiro usa.
const aditivosDo = (servicoId) => daObra(mock.aditivos).filter((a) => a.servico_id === servicoId)
const comVigente = (s) => ({ ...s, qtd_contratada: qtdVigente(s.qtd_orcada, aditivosDo(s.id)) })
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
    return ok(copia(atual))
  }
  const novo = { id: novoId('ad'), obra_id: obraAtual, servico_id: s.id, ...campos, criado_por: sessao.id, alterado_por: null, alterado_em: null }
  mock.aditivos.push(novo)
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
  if (i.responsavel_id && !daObra(mock.responsaveis).some((r) => r.id === i.responsavel_id)) erros.responsavel_id = 'Responsável de outra obra.'
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
    return ok(copia(semValores(comVigente(atual))))
  }
  const novo = {
    id: novoId('s'), obra_id: obraAtual, codigo: proximoCodigo(i.grupo, codigosOcupados()), ...campos,
    origem: ORIGENS_ITEM.novo, frente: '', data_inicio_planejada: null, data_fim_planejada: null,
    critico: false, critico_origem: CRITICO_A_MAO, ativo: true, alterado_por: null, alterado_em: null,
  }
  mock.servicos.push(novo)
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
  return ok({ salvas: mudancas.length })
}

export function arquivarServico(servicoId, arquivar) {
  const e = checar(); if (e) return falha(e)
  if (!podePlanejar(sessao.role)) return falha('Só o engenheiro arquiva serviços.')
  const s = daObra(mock.servicos).find((x) => x.id === servicoId)
  if (!s) return falha('Serviço não encontrado nesta obra.')
  if (s.origem !== ORIGENS_ITEM.novo) return falha('Só item novo é arquivado. Item da planilha muda por aditivo.')
  s.ativo = !arquivar
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

/* ── Funções (para o efetivo do diário) ── */

export function listarFuncoes() {
  const e = checar(); if (e) return falha(e)
  return ok(copia(daObra(mock.funcoes).filter((x) => x.ativo).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))))
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
  if (!diarioTemConteudo({ itens, efetivo, ocorrencias })) return falha('Registre alguma coisa do dia: produção, efetivo, memória de cálculo ou ocorrências.')
  if (Object.keys(validarEfetivo(efetivo)).length) return falha('Confira as linhas do efetivo.')
  const responsaveisDaObra = new Set(daObra(mock.responsaveis).map((r) => r.id))
  const funcoesDaObra = new Set(daObra(mock.funcoes).map((x) => x.id))
  if (efetivo.some((l) => !responsaveisDaObra.has(l.responsavel_id) || !funcoesDaObra.has(l.funcao_id))) return falha('Há responsável ou função de outra obra no efetivo.')
  const diarioExistente = daObra(mock.diarios).find((x) => x.data === data)
  const jaLancados = new Set(diarioExistente ? daObra(mock.lancamentos).filter((l) => l.diario_id === diarioExistente.id).map((l) => l.servico_id) : [])
  // Na correção, um serviço que voltou para zero também é gravado (zera o lançamento).
  const comProducao = itens.filter((i) => itemTemConteudo(i) || jaLancados.has(i.servico_id))
  const servicosDaObra = new Set(daObra(mock.servicos).map((s) => s.id))
  const comFoto = itens.filter((i) => i.fotos?.length)
  if ([...comProducao, ...comFoto].some((i) => !servicosDaObra.has(i.servico_id))) return falha('Há serviço de outra obra no lançamento.')
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

  for (const i of comProducao) {
    const existente = daObra(mock.lancamentos).find((l) => l.diario_id === diario.id && l.servico_id === i.servico_id)
    const campos = {
      quantidade: Math.max(0, Number(i.quantidade) || 0), concluido: !!i.concluido,
      responsavel_id: i.responsavel_id ?? null, memoria_calculo: (i.memoria_calculo ?? '').trim(),
    }
    if (existente) {
      Object.assign(existente, campos, { corrigido_por: sessao.id, corrigido_em: new Date().toISOString() })
    } else {
      mock.lancamentos.push({
        id: novoId('lan'), obra_id: obraAtual, diario_id: diario.id, servico_id: i.servico_id,
        ...campos, lancado_por: sessao.id, corrigido_por: null, corrigido_em: null,
      })
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
  return ok(copia(diario))
}

/* ── Medição ── */

export function listarMedicoes() {
  const e = checar(); if (e) return falha(e)
  return ok(copia(daObra(mock.medicoes).map(semValores).sort((a, b) => b.numero - a.numero)))
}

export function buscarMedicaoAtual() {
  const e = checar(); if (e) return falha(e)
  const m = daObra(mock.medicoes).find((x) => x.status === 'Em andamento')
  return ok(m ? copia(semValores(m)) : null)
}

export function listarItensMedicao(medicaoId) {
  const e = checar(); if (e) return falha(e)
  return ok(copia(daObra(mock.medicaoItens).filter((i) => i.medicao_id === medicaoId).map(semValores)))
}

export function criarMedicao() {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro cria medições.')
  const daObraAtual = daObra(mock.medicoes)
  if (daObraAtual.some((m) => m.status === 'Planejando')) return falha('Já existe uma medição em planejamento.')
  const ultima = [...daObraAtual].sort((a, b) => b.numero - a.numero)[0]
  const inicio = ultima ? addDias(ultima.data_fim, 1) : hojeISO()
  const nova = {
    id: novoId('med'), obra_id: obraAtual, numero: (ultima?.numero ?? 0) + 1,
    data_inicio: inicio, data_fim: addDias(inicio, 30), status: 'Planejando',
    valor_planejado: null, valor_medido: null, meta_batida: null, fechada_em: null,
  }
  mock.medicoes.push(nova)
  const concluidos = new Set(daObra(mock.lancamentos).filter((l) => l.concluido).map((l) => l.servico_id))
  for (const s of daObra(mock.servicos).filter((x) => x.ativo && !concluidos.has(x.id))) {
    mock.medicaoItens.push({
      id: novoId('item'), obra_id: obraAtual, medicao_id: nova.id, servico_id: s.id,
      qtd_planejada: 0, qtd_planejada_inicial: null, preco_unitario: s.preco_unitario, qtd_medida: null,
    })
  }
  return ok(copia(nova))
}

export function salvarQtdPlanejada(itemId, quantidade) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro planeja a medição.')
  const item = daObra(mock.medicaoItens).find((i) => i.id === itemId)
  if (!item) return falha('Item não encontrado nesta obra.')
  const med = mock.medicoes.find((m) => m.id === item.medicao_id)
  if (med.status === 'Fechada') return falha('Medição fechada não muda mais.')
  item.qtd_planejada = Math.max(0, Number(quantidade) || 0)
  return ok(copia(item))
}

export function iniciarMedicao(medicaoId) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro inicia a medição.')
  const lista = daObra(mock.medicoes)
  if (!podeIniciar(lista, medicaoId)) return falha('Só dá para iniciar uma medição em planejamento, sem outra em andamento.')
  const med = lista.find((m) => m.id === medicaoId)
  const itens = daObra(mock.medicaoItens).filter((i) => i.medicao_id === medicaoId)
  const preco = Object.fromEntries(daObra(mock.servicos).map((s) => [s.id, s.preco_unitario]))
  const { itens: congelados, valor_planejado } = congelarMeta(itens, preco)
  congelados.forEach((c) => Object.assign(itens.find((i) => i.id === c.id), c))
  Object.assign(med, { status: 'Em andamento', valor_planejado })
  return ok(copia(med))
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
