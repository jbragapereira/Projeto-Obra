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
import { addDias, hojeISO } from './datas.js'
import { podeEditar, podeLancar, podeVerValores, veTodasAsObras } from './perfis.js'
import { congelarMeta, podeIniciar } from './medicao.js'
import { aceitaLancamento, validarObra } from './obras.js'
import { podeCorrigir } from './diario.js'

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
  // Quem cria a obra passa a ter acesso a ela.
  mock.membros.push({ id: novoId('m'), obra_id: nova.id, profile_id: sessao.id, ativo: true })
  return ok(copia(nova))
}

/* ── Serviços e responsáveis (sempre da obra atual) ── */

export function listarServicos() {
  const e = checar(); if (e) return falha(e)
  const lista = daObra(mock.servicos)
    .map(semValores)
    .sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }))
  return ok(copia(lista))
}

export function marcarCritico(servicoId, critico) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro marca serviço crítico.')
  const s = daObra(mock.servicos).find((x) => x.id === servicoId)
  if (!s) return falha('Serviço não encontrado nesta obra.')
  s.critico = critico
  s.critico_origem = 'À mão'
  return ok(copia(s))
}

export function listarResponsaveis() {
  const e = checar(); if (e) return falha(e)
  return ok(copia(daObra(mock.responsaveis).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))))
}

export function salvarResponsavel({ nome, tipo, contato }) {
  const e = checar(); if (e) return falha(e)
  if (!podeEditar(sessao.role)) return falha('Só o engenheiro cadastra responsáveis.')
  if (!nome?.trim()) return falha('Informe o nome do responsável.')
  const novo = { id: novoId('r'), obra_id: obraAtual, nome: nome.trim(), tipo, contato: contato?.trim() ?? '', ativo: true }
  mock.responsaveis.push(novo)
  return ok(copia(novo))
}

/* ── Lançamentos e diário ── */

// Lançamentos da obra já com a data do diário (como um select com o diário embutido).
export function listarLancamentos() {
  const e = checar(); if (e) return falha(e)
  const dataDoDiario = Object.fromEntries(daObra(mock.diarios).map((x) => [x.id, x.data]))
  return ok(copia(daObra(mock.lancamentos).map((l) => ({ ...l, data: dataDoDiario[l.diario_id] }))))
}

export function listarDiarios() {
  const e = checar(); if (e) return falha(e)
  const nomes = Object.fromEntries(mock.profiles.map((p) => [p.id, p.nome]))
  const lista = daObra(mock.diarios)
    .map((x) => ({
      ...x,
      autor: nomes[x.criado_por] ?? '—',
      servicos_com_producao: daObra(mock.lancamentos).filter((l) => l.diario_id === x.id && l.quantidade > 0).length,
      qtd_fotos: daObra(mock.fotos).filter((f) => f.diario_id === x.id).length,
    }))
    .sort((a, b) => b.data.localeCompare(a.data))
  return ok(copia(lista))
}

// itens: [{ servico_id, quantidade, responsavel_id, concluido, novas_fotos }]
export function salvarDiario({ data, clima_manha, clima_tarde, ocorrencias, itens }) {
  const e = checar(); if (e) return falha(e)
  if (!podeLancar(sessao.role)) return falha('Seu perfil não lança diário.')
  const obra = mock.obras.find((o) => o.id === obraAtual)
  if (!aceitaLancamento(obra)) return falha('Esta obra está concluída e não aceita lançamentos.')
  const comProducao = itens.filter((i) => i.quantidade > 0 || i.concluido)
  if (!comProducao.length) return falha('Lance a quantidade de pelo menos um serviço.')
  const servicosDaObra = new Set(daObra(mock.servicos).map((s) => s.id))
  if (comProducao.some((i) => !servicosDaObra.has(i.servico_id))) return falha('Há serviço de outra obra no lançamento.')

  let diario = daObra(mock.diarios).find((x) => x.data === data)
  if (diario) {
    const autorDoDia = diario.criado_por
    if (!podeCorrigir({ role: sessao.role, profileId: sessao.id, lancadoPor: autorDoDia, dataDiario: data, hoje: hojeISO() })) {
      return falha('O prazo para corrigir este diário acabou. Peça ao engenheiro.')
    }
  } else {
    diario = { id: novoId('dia'), obra_id: obraAtual, data, criado_por: sessao.id }
    mock.diarios.push(diario)
  }
  Object.assign(diario, { clima_manha, clima_tarde, ocorrencias: ocorrencias ?? '', enviado_em: new Date().toISOString() })

  for (const i of comProducao) {
    const existente = daObra(mock.lancamentos).find((l) => l.diario_id === diario.id && l.servico_id === i.servico_id)
    const campos = {
      quantidade: Math.max(0, Number(i.quantidade) || 0), concluido: !!i.concluido,
      responsavel_id: i.responsavel_id ?? null,
    }
    if (existente) {
      Object.assign(existente, campos, { corrigido_por: sessao.id, corrigido_em: new Date().toISOString() })
    } else {
      mock.lancamentos.push({
        id: novoId('lan'), obra_id: obraAtual, diario_id: diario.id, servico_id: i.servico_id,
        ...campos, lancado_por: sessao.id, corrigido_por: null, corrigido_em: null,
      })
    }
    for (let k = 0; k < (i.novas_fotos ?? 0); k++) {
      mock.fotos.push({
        id: novoId('foto'), obra_id: obraAtual, diario_id: diario.id, servico_id: i.servico_id,
        caminho: `fotos/${obraAtual}/${diario.id}/${novoId('f')}.jpg`, tirada_por: sessao.id,
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
