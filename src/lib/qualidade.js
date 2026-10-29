// Qualidade: pendências de vistoria (Etapa 1), FVS e não conformidades (Etapa 2), Gemba Walk (Etapa 3).
// Regra pura, com teste em tests/qualidade.mjs. Os textos de situação são idênticos ao CHECK do banco.
import { addDias, dataHoraCurta, diasEntre, segundaDaSemana } from './datas.js'

/* ── Pendências ── */

export const STATUS_PENDENCIA = ['Pendente', 'Em andamento', 'Resolvido']
export const [PENDENTE, EM_ANDAMENTO, RESOLVIDO] = STATUS_PENDENCIA
// Cor de cada situação (classes de .pill e da borda dos KPIs).
export const COR_STATUS_PENDENCIA = { [PENDENTE]: 'red', [EM_ANDAMENTO]: 'amber', [RESOLVIDO]: 'ok' }
export const FILTROS_PRAZO = ['Todos', 'Atrasados', 'Hoje', 'Esta semana']
// Os filtros das abas sem nada escolhido (a tela começa assim; o relatório imprime com os filtros ativos).
export const SEM_FILTRO_PENDENCIAS = { status: '', responsavel_id: '', prazo: 'Todos', busca: '' }
// Pendência cancelada não some (fica com o motivo e pode ser reativada): sai da grade e dos números, e
// aparece só com este filtro de situação.
export const CANCELADAS = 'Canceladas'
// O verbo do botão que leva à próxima situação.
export const ACAO_PENDENCIA = { [EM_ANDAMENTO]: 'Colocar em andamento', [RESOLVIDO]: 'Resolver' }
// Prazo sugerido ao registrar (pendência e observação do Gemba): hoje + 7 dias.
export const PRAZO_PADRAO_DIAS = 7

// Prazo passou e ainda não foi resolvida (cancelada não vence).
export const vencida = (p, hoje) => !p.cancelada && p.status !== RESOLVIDO && !!p.prazo && p.prazo < hoje
const ativas = (lista) => lista.filter((p) => !p.cancelada)

// A próxima situação no fluxo (Pendente → Em andamento → Resolvido), ou null.
export const proximaSituacao = (status) => STATUS_PENDENCIA[STATUS_PENDENCIA.indexOf(status) + 1] ?? null

// Próximo número de registro da obra (#1, #2…).
export const proximoNumero = (pendencias) => pendencias.reduce((m, p) => Math.max(m, p.numero ?? 0), 0) + 1

// Os quatro números do alto.
export function kpisPendencias(todas) {
  const lista = ativas(todas)
  const conta = (s) => lista.filter((p) => p.status === s).length
  return { total: lista.length, pendentes: conta(PENDENTE), andamento: conta(EM_ANDAMENTO), resolvidos: conta(RESOLVIDO) }
}

// Em aberto (não resolvidas) por responsável, da maior para a menor. nomeDe: { id: nome }.
export function abertasPorResponsavel(lista, nomeDe = {}) {
  const conta = {}
  for (const p of ativas(lista)) if (p.status !== RESOLVIDO) conta[p.responsavel_id] = (conta[p.responsavel_id] ?? 0) + 1
  return Object.entries(conta)
    .map(([id, n]) => ({ id, nome: nomeDe[id] ?? '—', n }))
    .sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, 'pt-BR'))
}

// O prazo cabe no filtro? Os filtros de prazo são do que ainda falta fazer: resolvida fica de fora.
// (Atrasados = vencidas; Hoje; Esta semana = até o domingo, sem as vencidas.)
function cabeNoPrazo(p, filtro, hoje) {
  if (filtro !== 'Todos' && p.status === RESOLVIDO) return false
  if (filtro === 'Atrasados') return vencida(p, hoje)
  if (filtro === 'Hoje') return p.prazo === hoje
  if (filtro === 'Esta semana') return !!p.prazo && p.prazo >= hoje && p.prazo <= addDias(segundaDaSemana(hoje), 6)
  return true
}

const semAcento = (t) => (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Filtros da aba: situação, responsável, prazo e busca (descrição, local, pavimento; sem acento).
// Sem o filtro "Canceladas", as canceladas ficam de fora.
export function filtrarPendencias(lista, { status = '', responsavel_id = '', prazo = 'Todos', busca = '' } = {}, hoje) {
  const termo = semAcento(busca.trim())
  return lista.filter((p) => (status === CANCELADAS ? p.cancelada : !p.cancelada && (!status || p.status === status))
    && (!responsavel_id || p.responsavel_id === responsavel_id)
    && cabeNoPrazo(p, prazo, hoje)
    && (!termo || [p.descricao, p.local, p.pavimento].some((t) => semAcento(t).includes(termo))))
}

// Ordem da grade: as abertas primeiro (vencidas na frente, depois pelo prazo); as resolvidas no fim.
export function ordenarPendencias(lista, hoje) {
  const peso = (p) => (p.status === RESOLVIDO ? 2 : vencida(p, hoje) ? 0 : 1)
  return [...lista].sort((a, b) => peso(a) - peso(b) || (a.prazo ?? '').localeCompare(b.prazo ?? '') || b.numero - a.numero)
}

// Erros da pendência nova ({} = pode salvar). idsResponsaveis: os ativos da obra (empresa e responsável).
export function validarPendencia({ descricao, local, empresa_id, responsavel_id, prazo, data_vistoria }, idsResponsaveis = [], hoje) {
  const e = {}
  if (!descricao?.trim()) e.descricao = 'Descreva o problema.'
  if (!local?.trim()) e.local = 'Informe o local.'
  if (!idsResponsaveis.includes(empresa_id)) e.empresa_id = 'Escolha a empresa que corrige.'
  if (!idsResponsaveis.includes(responsavel_id)) e.responsavel_id = 'Escolha quem acompanha.'
  if (!data_vistoria) e.data_vistoria = 'Informe a data da vistoria.'
  else if (hoje && data_vistoria > hoje) e.data_vistoria = 'A vistoria não pode ter data futura.'
  if (!prazo) e.prazo = 'Informe o prazo.'
  else if (data_vistoria && prazo < data_vistoria) e.prazo = 'O prazo não pode ser antes da vistoria.'
  return e
}

// Os filtros ativos, em texto (cabeçalho do relatório). nomeDe: { id: nome }.
export function descreverFiltros({ status = '', responsavel_id = '', prazo = 'Todos', busca = '' } = {}, nomeDe = {}) {
  const partes = []
  if (status) partes.push(`Situação: ${status}`)
  if (responsavel_id) partes.push(`Responsável: ${nomeDe[responsavel_id] ?? '—'}`)
  if (prazo && prazo !== 'Todos') partes.push(`Prazo: ${prazo}`)
  if (busca.trim()) partes.push(`Busca: "${busca.trim()}"`)
  return partes.length ? partes.join('; ') : 'Todas as pendências em aberto e resolvidas'
}

// Pode alterar os dados? Resolvida ou cancelada fica como está. Devolve o motivo, ou null.
export function motivoParaNaoAlterar(p) {
  if (p.cancelada) return 'Pendência cancelada: reative para alterar.'
  if (p.status === RESOLVIDO) return 'Pendência resolvida não muda mais.'
  return null
}

// Pode cancelar? Precisa do motivo; resolvida não se cancela. Devolve o motivo do bloqueio, ou null.
export function motivoParaNaoCancelar(p, motivo) {
  if (p.cancelada) return 'Esta pendência já está cancelada.'
  if (p.status === RESOLVIDO) return 'Pendência resolvida não se cancela.'
  if (!motivo?.trim()) return 'Diga por que está cancelando.'
  return null
}

// O que mudou entre a pendência e os dados novos (para o registro nas observações). rotulos: { campo: nome }.
export function camposAlterados(antes, depois, rotulos) {
  return Object.keys(rotulos).filter((c) => (antes[c] ?? '') !== (depois[c] ?? '')).map((c) => rotulos[c])
}

// Pode ir para a próxima situação? Resolver pede a foto da correção. Devolve o motivo, ou null.
export function motivoParaNaoAvancar(p, para, { foto_evidencia } = {}) {
  if (p.cancelada) return 'Pendência cancelada: reative para mexer.'
  if (para !== proximaSituacao(p.status)) return 'A pendência anda uma etapa por vez.'
  if (para === RESOLVIDO && !foto_evidencia) return 'Tire a foto da correção para resolver.'
  return null
}

// Observações acumulativas: a nota nova entra em cima, com carimbo [DD/MM/AAAA HH:MM].
// agora: 'AAAA-MM-DDTHH:MM:SS' local (dataHoraLocal).
export function anexarObservacao(observacoes, nota, agora) {
  const linha = `[${dataHoraCurta(agora)}] ${nota.trim()}`
  return observacoes ? `${linha}\n${observacoes}` : linha
}

/* ── FVS: modelos (fichas), vistorias (checklist) e não conformidades ── */

export const CATEGORIAS_FVS = ['Impermeabilização', 'Estrutura', 'Instalações', 'Acabamento']
// Nomes de grupo sugeridos no formulário do modelo (o engenheiro pode escrever outro).
export const GRUPOS_FVS_SUGERIDOS = ['Pré-execução', 'Execução', 'Proteção e acabamento']
export const RESPOSTAS_FVS = ['OK', 'NC', 'N.A.']
export const [RESP_OK, RESP_NC, RESP_NA] = RESPOSTAS_FVS
export const STATUS_VISTORIA = ['Em andamento', 'Concluída']
export const [VISTORIA_ANDAMENTO, VISTORIA_CONCLUIDA] = STATUS_VISTORIA
export const SEVERIDADES_NC = ['Baixa', 'Média', 'Alta']
export const COR_SEVERIDADE = { Baixa: 'soft', Média: 'amber', Alta: 'red' }
export const STATUS_NC = ['Aberta', 'Encaminhada', 'Corrigida', 'Fechada']
export const [NC_ABERTA, NC_ENCAMINHADA, NC_CORRIGIDA, NC_FECHADA] = STATUS_NC
export const COR_STATUS_NC = { [NC_ABERTA]: 'red', [NC_ENCAMINHADA]: 'amber', [NC_CORRIGIDA]: 'dark', [NC_FECHADA]: 'ok' }
export const MAX_FOTOS_NC = 3

// Os dois modelos com que toda obra nova nasce (e os dados de exemplo). [nome, categoria, [[grupo, [itens]]]]
export const MODELOS_FVS_PADRAO = [
  ['Impermeabilização — Áreas Molhadas', 'Impermeabilização', [
    ['Pré-execução', ['Superfície limpa, seca e sem partes soltas', 'Cantos e arestas arredondados (meia-cana)', 'Ralos e tubulações fixados antes da manta']],
    ['Execução', ['Primer aplicado em toda a área', 'Manta com sobreposição mínima de 10 cm', 'Subida de 30 cm nas paredes (rodapé)', 'Reforço nos ralos e passagens de tubo']],
    ['Proteção e acabamento', ['Teste de estanqueidade de 72 h sem vazamento', 'Proteção mecânica executada']],
  ]],
  ['Revestimento Cerâmico', 'Acabamento', [
    ['Execução', ['Base regularizada e no prumo', 'Argamassa colante do tipo indicado (AC-II/AC-III)', 'Dupla colagem nas peças acima de 30 × 30 cm', 'Juntas alinhadas e com espaçador', 'Caimento para o ralo conferido']],
    ['Proteção e acabamento', ['Rejunte uniforme e sem falhas', 'Peças sem som cavo (teste de percussão)']],
  ]],
]
// O modelo padrão no formato salvo (os ids dos itens são só do modelo: 'g1-1', 'g1-2'…).
export const montarModeloPadrao = ([nome, categoria, grupos]) => ({
  nome, categoria, versao: 1,
  grupos: grupos.map(([g, itens], gi) => ({ nome: g, itens: itens.map((titulo, ii) => ({ id: `g${gi + 1}-${ii + 1}`, titulo })) })),
})

// Próximo código: FVS-01, FVS-02… e NC-001, NC-002… (por obra).
const proximoComPrefixo = (lista, prefixo, casas) => {
  const n = lista.reduce((m, x) => Math.max(m, Number(String(x.codigo ?? '').replace(prefixo, '')) || 0), 0) + 1
  return `${prefixo}${String(n).padStart(casas, '0')}`
}
export const proximoCodigoFvs = (modelos) => proximoComPrefixo(modelos, 'FVS-', 2)
export const proximoCodigoNc = (ncs) => proximoComPrefixo(ncs, 'NC-', 3)

// Itens numerados por grupo (1.1, 1.2, 2.1…), na ordem da ficha.
export const numerarItens = (grupos) => grupos.flatMap((g, gi) => g.itens.map((it, ii) => ({ ...it, grupo: g.nome, numero: `${gi + 1}.${ii + 1}` })))

// Erros do modelo ({} = pode salvar): nome sem repetir, categoria, pelo menos um grupo, e todo grupo com nome e item.
export function validarModelo({ nome, categoria, grupos = [] }, nomesExistentes = []) {
  const e = {}
  const limpo = nome?.trim() ?? ''
  if (!limpo) e.nome = 'Informe o nome da ficha.'
  else if (nomesExistentes.some((n) => n.trim().toLowerCase() === limpo.toLowerCase())) e.nome = 'Já existe uma ficha com este nome nesta obra.'
  if (!CATEGORIAS_FVS.includes(categoria)) e.categoria = 'Escolha a categoria.'
  if (!grupos.length) e.grupos = 'Inclua pelo menos um grupo com itens.'
  grupos.forEach((g, gi) => {
    if (!g.nome?.trim()) e[`grupo${gi}`] = 'Dê um nome ao grupo.'
    else if (!g.itens.some((it) => it.titulo?.trim())) e[`grupo${gi}`] = 'Inclua pelo menos um item no grupo.'
  })
  return e
}

// O modelo como é gravado: sem item em branco, nomes sem espaço nas pontas, e item novo com id único no modelo.
export function limparModelo(grupos) {
  const usados = new Set(grupos.flatMap((g) => g.itens.map((it) => it.id)).filter(Boolean))
  let n = 0
  const novoId = () => { do n++; while (usados.has(`i${n}`)); usados.add(`i${n}`); return `i${n}` }
  return grupos.map((g) => ({
    nome: g.nome.trim(),
    itens: g.itens.filter((it) => it.titulo?.trim()).map((it) => ({ id: it.id || novoId(), titulo: it.titulo.trim() })),
  }))
}

// O andamento da vistoria: OK, NC, N.A., pendentes, verificados e % de conformidade = OK / (OK + NC),
// arredondado (null enquanto não há OK nem NC).
export function progressoVistoria(grupos, respostas = {}) {
  const itens = numerarItens(grupos)
  const conta = (r) => itens.filter((it) => respostas[it.id] === r).length
  const ok = conta(RESP_OK)
  const nc = conta(RESP_NC)
  const na = conta(RESP_NA)
  const verificados = ok + nc + na
  return { ok, nc, na, total: itens.length, verificados, pendentes: itens.length - verificados, conformidade: ok + nc ? Math.round((ok / (ok + nc)) * 100) : null }
}

// Pode responder o item? Vistoria concluída é só leitura; item com NC registrada não muda (a NC tem o seu fluxo);
// NC se marca pelo painel da não conformidade.
export function motivoParaNaoResponder(vistoria, itemId, resposta) {
  if (vistoria.status === VISTORIA_CONCLUIDA) return 'Vistoria concluída: só leitura.'
  if (!numerarItens(vistoria.grupos).some((it) => it.id === itemId)) return 'Item fora desta ficha.'
  if (vistoria.respostas?.[itemId] === RESP_NC) return 'Este item já tem não conformidade registrada.'
  if (resposta !== null && !RESPOSTAS_FVS.includes(resposta)) return 'Resposta inválida.' // null = voltar a pendente
  if (resposta === RESP_NC) return 'Registre a não conformidade no painel do item.'
  return null
}

// Finalizar só sem item pendente.
export function motivoParaNaoFinalizar(vistoria) {
  if (vistoria.status === VISTORIA_CONCLUIDA) return 'Esta vistoria já está concluída.'
  const p = progressoVistoria(vistoria.grupos, vistoria.respostas)
  if (p.pendentes) return `Faltam ${p.pendentes === 1 ? '1 item' : `${p.pendentes} itens`} para verificar.`
  return null
}

// Erros da vistoria nova: ficha da obra e ambiente.
export function validarVistoria({ modelo_id, ambiente }, idsModelos = []) {
  const e = {}
  if (!idsModelos.includes(modelo_id)) e.modelo_id = 'Escolha a ficha.'
  if (!ambiente?.trim()) e.ambiente = 'Informe o ambiente.'
  return e
}

// Erros da não conformidade: descrição, solução proposta, severidade e responsável.
export function validarNc({ descricao, solucao, severidade, responsavel_id, fotos = [] }, idsResponsaveis = []) {
  const e = {}
  if (!descricao?.trim()) e.descricao = 'Descreva o problema.'
  if (!solucao?.trim()) e.solucao = 'Diga a solução proposta.'
  if (!SEVERIDADES_NC.includes(severidade)) e.severidade = 'Escolha a severidade.'
  if (!idsResponsaveis.includes(responsavel_id)) e.responsavel_id = 'Escolha o responsável.'
  if (fotos.length > MAX_FOTOS_NC) e.fotos = `No máximo ${MAX_FOTOS_NC} fotos por não conformidade.`
  return e
}

// Os botões de cada situação da NC. Aprovar e reprovar são do engenheiro (aprova: true).
// Aberta → Encaminhada → Corrigida → Fechada; Reprovar devolve a corrigida para Encaminhada (reavaliação).
export const ACOES_NC = {
  [NC_ABERTA]: [{ para: NC_ENCAMINHADA, rotulo: 'Encaminhar p/ correção' }],
  [NC_ENCAMINHADA]: [{ para: NC_CORRIGIDA, rotulo: 'Marcar corrigida' }],
  [NC_CORRIGIDA]: [{ para: NC_FECHADA, rotulo: 'Aprovar e fechar', aprova: true }, { para: NC_ENCAMINHADA, rotulo: 'Reprovar', aprova: true, volta: true }],
  [NC_FECHADA]: [],
}

// O texto que entra na linha do tempo em cada passo (de: a situação de antes; responsavel: o nome).
export function textoDoPassoNc(para, de, responsavel) {
  if (para === NC_ENCAMINHADA) return de === NC_CORRIGIDA ? 'Reprovada na reavaliação; volta para correção' : `Encaminhada para correção a ${responsavel}`
  if (para === NC_CORRIGIDA) return 'Marcada como corrigida'
  if (para === NC_FECHADA) return 'Aprovada e fechada'
  return para
}

// Os botões que o perfil pode usar agora (aprovar e reprovar só com podeAprovar).
export const acoesPermitidasNc = (nc, podeAprovar) => (ACOES_NC[nc.status] ?? []).filter((a) => !a.aprova || podeAprovar)

// Pode mover a NC? podeAprovar: o perfil aprova (engenheiro). Devolve o motivo do bloqueio, ou null.
export function motivoParaNaoMoverNc(nc, para, podeAprovar) {
  const acao = (ACOES_NC[nc.status] ?? []).find((a) => a.para === para)
  if (!acao) return 'Esta mudança não é possível agora.'
  if (acao.aprova && !podeAprovar) return 'Só o engenheiro aprova ou reprova a correção.'
  return null
}

// Dias em aberto: da abertura até hoje (ou até fechar).
export const diasEmAberto = (nc, hoje) => Math.max(0, diasEntre(nc.aberta_em, nc.fechada_em ?? hoje))

// Ordem da lista de NCs: as em aberto primeiro (Alta na frente, depois as mais antigas); fechadas no fim.
export function ordenarNcs(ncs, hoje) {
  const peso = (n) => (n.status === NC_FECHADA ? 1 : 0)
  const sev = (n) => -SEVERIDADES_NC.indexOf(n.severidade)
  return [...ncs].sort((a, b) => peso(a) - peso(b) || sev(a) - sev(b) || diasEmAberto(b, hoje) - diasEmAberto(a, hoje))
}

// Números do alto da aba: % conforme geral (somando todas as vistorias), NCs em aberto e vistorias concluídas.
export function kpisFvs(vistorias, ncs) {
  const soma = vistorias.reduce((s, v) => {
    const p = progressoVistoria(v.grupos, v.respostas)
    return { ok: s.ok + p.ok, nc: s.nc + p.nc }
  }, { ok: 0, nc: 0 })
  return {
    conforme: soma.ok + soma.nc ? Math.round((soma.ok / (soma.ok + soma.nc)) * 100) : null,
    ncsAbertas: ncs.filter((n) => n.status !== NC_FECHADA).length,
    concluidas: vistorias.filter((v) => v.status === VISTORIA_CONCLUIDA).length,
  }
}

/* ── Gemba Walk: observações de desperdício ── */

// Os 7 desperdícios do Lean (texto idêntico ao CHECK) e a cor da etiqueta de cada um (classe .gem-cor-*).
export const DESPERDICIOS = ['Retrabalho', 'Espera', 'Transporte', 'Movimentação', 'Estoque', 'Superprodução', 'Processo desnecessário']
export const COR_DESPERDICIO = {
  Retrabalho: 'vermelho', Espera: 'ambar', Transporte: 'azul', Movimentação: 'roxo', Estoque: 'verde', Superprodução: 'rosa', 'Processo desnecessário': 'cinza',
}
// A observação anda pelas mesmas três situações da pendência, para a frente ou para trás.
export const STATUS_GEMBA = STATUS_PENDENCIA
export const FILTROS_PRAZO_GEMBA = ['Todos', 'Vencidos', 'Hoje', 'Esta semana', 'Sem prazo']
export const SEM_FILTRO_GEMBA = { tipo: '', prazo: 'Todos', busca: '' }

// Vencida: a mesma regra da pendência (vencida).

// Quantas vezes cada desperdício aparece nas observações (sem as canceladas), do maior para o menor;
// empate segue a ordem da lista. Só os que apareceram.
export function rankingDesperdicios(lista) {
  const conta = Object.fromEntries(DESPERDICIOS.map((t) => [t, 0]))
  for (const o of ativas(lista)) for (const t of o.desperdicios ?? []) if (t in conta) conta[t]++
  return DESPERDICIOS.map((tipo) => ({ tipo, n: conta[tipo] })).filter((x) => x.n).sort((a, b) => b.n - a.n)
}

function cabeNoPrazoGemba(o, filtro, hoje) {
  if (filtro === 'Vencidos') return vencida(o, hoje)
  if (filtro === 'Sem prazo') return !o.prazo
  return cabeNoPrazo(o, filtro, hoje)
}

// Filtros da aba: tipo de desperdício, prazo e busca (local, descrição, causa e ação; sem acento). Sem as canceladas.
export function filtrarGemba(lista, { tipo = '', prazo = 'Todos', busca = '' } = {}, hoje) {
  const termo = semAcento(busca.trim())
  return ativas(lista).filter((o) => (!tipo || o.desperdicios.includes(tipo))
    && cabeNoPrazoGemba(o, prazo, hoje)
    && (!termo || [o.local, o.descricao, o.causa_raiz, o.acao].some((t) => semAcento(t).includes(termo))))
}

// Ordem dentro da coluna: vencidas primeiro, depois pelo prazo (sem prazo no fim), depois as mais novas.
export function ordenarGemba(lista, hoje) {
  const peso = (o) => (vencida(o, hoje) ? 0 : o.prazo ? 1 : 2)
  return [...lista].sort((a, b) => peso(a) - peso(b) || (a.prazo ?? '').localeCompare(b.prazo ?? '') || b.numero - a.numero)
}

// Erros da observação ({} = pode salvar). O prazo é opcional, mas não antes do dia do registro.
export function validarObservacao({ local, descricao, acao, desperdicios = [], responsavel_id, prazo }, idsResponsaveis = [], registradaEm) {
  const e = {}
  if (!local?.trim()) e.local = 'Informe o local.'
  if (!descricao?.trim()) e.descricao = 'Descreva o que viu.'
  if (!acao?.trim()) e.acao = 'Diga o que será feito.'
  if (!desperdicios.length) e.desperdicios = 'Marque pelo menos um desperdício.'
  else if (desperdicios.some((t) => !DESPERDICIOS.includes(t))) e.desperdicios = 'Desperdício desconhecido.'
  if (!idsResponsaveis.includes(responsavel_id)) e.responsavel_id = 'Escolha o responsável.'
  if (prazo && registradaEm && prazo < registradaEm) e.prazo = 'O prazo não pode ser antes do registro.'
  return e
}

// Pode mudar de coluna? Devolve o motivo do bloqueio, ou null.
export function motivoParaNaoMoverGemba(o, para) {
  if (o.cancelada) return 'Observação cancelada: reative para mexer.'
  if (!STATUS_GEMBA.includes(para)) return 'Situação desconhecida.'
  if (o.status === para) return `A observação já está em ${para}.`
  return null
}

// Pode cancelar? Precisa do motivo. Devolve o motivo do bloqueio, ou null.
export function motivoParaNaoCancelarGemba(o, motivo) {
  if (o.cancelada) return 'Esta observação já está cancelada.'
  if (!motivo?.trim()) return 'Diga por que está cancelando.'
  return null
}

/* ── Relatório (as partes da FVS e do Gemba) ── */

// Uma linha por vistoria na tabela de andamento: ficha, ambiente, OK, NC, % de conformidade e situação.
// Em andamento primeiro, depois as concluídas; dentro de cada uma, as mais recentes.
export function andamentoFvs(vistorias) {
  const peso = (v) => (v.status === VISTORIA_CONCLUIDA ? 1 : 0)
  return [...vistorias]
    .sort((a, b) => peso(a) - peso(b) || (b.iniciada_em ?? '').localeCompare(a.iniciada_em ?? ''))
    .map((v) => {
      const p = progressoVistoria(v.grupos, v.respostas)
      return { id: v.id, ficha: `${v.codigo_modelo} ${v.nome_modelo}`, ambiente: v.ambiente, ok: p.ok, nc: p.nc, pendentes: p.pendentes, conformidade: p.conformidade, status: v.status }
    })
}

// As observações do Gemba que vão para o relatório: as em aberto (não resolvidas), com os filtros da aba.
export const gembaEmAberto = (lista, filtro, hoje) => ordenarGemba(filtrarGemba(lista, filtro, hoje).filter((o) => o.status !== RESOLVIDO), hoje)

// Os filtros da aba Gemba, em texto (cabeçalho do relatório). null = sem filtro.
export function descreverFiltrosGemba({ tipo = '', prazo = 'Todos', busca = '' } = {}) {
  const partes = []
  if (tipo) partes.push(`Desperdício: ${tipo}`)
  if (prazo && prazo !== 'Todos') partes.push(`Prazo: ${prazo}`)
  if (busca.trim()) partes.push(`Busca: "${busca.trim()}"`)
  return partes.length ? partes.join('; ') : null
}
