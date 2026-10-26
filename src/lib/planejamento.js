// Planejamento (Last Planner) em cima dos SERVIÇOS da obra — sem lista paralela.
// A EAP é a árvore montada pelos códigos dos serviços (1 › 1.2 › 1.2.1); os
// níveis que não são serviço são "grupos" com nome. Regra pura, com teste em
// tests/planejamento.mjs.

import { addDias, segundaDaSemana } from './datas.js'
import { previstoHoje } from './calendario.js'

/* ── Códigos ── */

const partes = (codigo) => String(codigo).split('.').map(Number)

export function compararCodigos(a, b) {
  const pa = partes(a)
  const pb = partes(b)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? -1) - (pb[i] ?? -1)
    if (d) return d
  }
  return 0
}

export const codigoValido = (codigo) => /^\d+(\.\d+)*$/.test(String(codigo ?? ''))
export const nivelDoCodigo = (codigo) => partes(codigo).length
export const paiDoCodigo = (codigo) => (nivelDoCodigo(codigo) > 1 ? String(codigo).split('.').slice(0, -1).join('.') : null)

// Código automático do próximo filho: dentro de "1.2" com 1.2.1 e 1.2.3 → "1.2.4"; na raiz → próximo número.
export function proximoCodigo(pai, codigosExistentes) {
  const nivel = pai ? nivelDoCodigo(pai) + 1 : 1
  const irmaos = codigosExistentes.filter((c) => nivelDoCodigo(c) === nivel && paiDoCodigo(c) === (pai ?? null))
  const ultimo = irmaos.reduce((m, c) => Math.max(m, partes(c).at(-1)), 0)
  return pai ? `${pai}.${ultimo + 1}` : String(ultimo + 1)
}

/* ── Progresso ── */

// Progresso real de um serviço: acumulado ÷ contratado (0 a 1).
export const progressoDoServico = ({ acumulado, contratado }) =>
  (contratado > 0 ? Math.min(1, Math.max(0, acumulado / contratado)) : 0)

// Progresso de um grupo: ponderado pelo valor contratado de cada serviço quando
// todos têm preço (quem vê valores); senão, média simples (unidades diferentes não se somam).
export function progressoDoGrupo(folhas) {
  if (!folhas.length) return 0
  const comValor = folhas.every((f) => typeof f.valor === 'number' && f.valor > 0)
  if (comValor) {
    const total = folhas.reduce((s, f) => s + f.valor, 0)
    return folhas.reduce((s, f) => s + f.progresso * f.valor, 0) / total
  }
  return folhas.reduce((s, f) => s + f.progresso, 0) / folhas.length
}

/* ── A árvore ── */

// Executado acumulado de cada item: { servico_id: quantidade }. Só os lançamentos antes de 'ate', se vier.
export function acumuladoPorServico(lancamentos, ate = null) {
  const soma = {}
  for (const l of lancamentos) if (!ate || l.data < ate) soma[l.servico_id] = (soma[l.servico_id] ?? 0) + l.quantidade
  return soma
}

// Item = folha da árvore (o serviço sem filhos). Só ele tem data lançada.
export const ehItem = (no) => no.tipo === 'servico' && !no.filhos.length
// A EAP já tem alguma data? Sem nenhum item ativo com início e fim, o planejamento (Longo, Médio e Curto
// prazo) não desenha período nenhum: só convida a lançar as datas.
export const eapTemDatas = (servicos) => servicos.some((s) => s.ativo !== false && !!s.data_inicio_planejada && !!s.data_fim_planejada)
export const folhasDe = (no) => (ehItem(no) ? [no] : no.filhos.flatMap(folhasDe))
// Peso de uma folha nas médias do grupo: o valor vigente (quem vê valores), ou nada (média simples).
const valorDaFolha = (f) => (typeof f.servico.preco_unitario === 'number' ? f.servico.preco_unitario * f.servico.qtd_contratada : undefined)

// servicos: os da obra; grupos: [{ codigo, nome }]; acumulado: { servico_id: quantidade }.
// Devolve as raízes; cada nó: { codigo, nome, tipo: 'grupo'|'servico', nivel, filhos,
// servico?, inicio, fim, progresso, arquivado }.
// Só o item tem data lançada. Etapa e subetapa nunca: o início do grupo é o início mais cedo dos
// itens de dentro, e o fim é o fim mais tarde (em todos os níveis).
export function montarEap({ servicos, grupos, acumulado = {}, mostrarArquivados = false }) {
  const nomeDoGrupo = Object.fromEntries(grupos.map((g) => [g.codigo, g.nome]))
  const nos = new Map()
  const garantir = (codigo) => {
    if (!nos.has(codigo)) {
      nos.set(codigo, { codigo, nome: nomeDoGrupo[codigo] ?? `Grupo ${codigo}`, tipo: 'grupo', nivel: nivelDoCodigo(codigo), filhos: [] })
    }
    return nos.get(codigo)
  }
  // Grupos com nome entram mesmo vazios (o engenheiro acabou de criar).
  grupos.forEach((g) => garantir(g.codigo))
  for (const s of servicos) {
    if (!s.ativo && !mostrarArquivados) continue
    const no = garantir(s.codigo)
    Object.assign(no, {
      tipo: 'servico', nome: s.descricao, servico: s, arquivado: !s.ativo,
      progresso: progressoDoServico({ acumulado: acumulado[s.id] ?? 0, contratado: s.qtd_contratada }),
    })
  }
  // Todo nível intermediário vira grupo, e cada nó entra no pai.
  for (const codigo of [...nos.keys()]) {
    for (let pai = paiDoCodigo(codigo); pai; pai = paiDoCodigo(pai)) garantir(pai)
  }
  const raizes = []
  for (const no of nos.values()) {
    const pai = paiDoCodigo(no.codigo)
    if (pai) nos.get(pai).filhos.push(no)
    else raizes.push(no)
  }
  // De baixo para cima: datas e progresso dos grupos a partir das folhas.
  const completar = (no) => {
    no.filhos.sort((a, b) => compararCodigos(a.codigo, b.codigo))
    no.filhos.forEach(completar)
    const folhas = folhasDe(no).filter((f) => !f.arquivado)
    const inicios = folhas.map((f) => f.servico.data_inicio_planejada).filter(Boolean).sort()
    const fins = folhas.map((f) => f.servico.data_fim_planejada).filter(Boolean).sort()
    if (ehItem(no)) {
      no.inicio = no.servico.data_inicio_planejada ?? null
      no.fim = no.servico.data_fim_planejada ?? null
    } else {
      no.inicio = inicios[0] ?? null
      no.fim = fins.at(-1) ?? null
      no.progresso = progressoDoGrupo(folhas.map((f) => ({ progresso: f.progresso, valor: valorDaFolha(f) })))
      no.qtdServicos = folhas.length
    }
  }
  raizes.sort((a, b) => compararCodigos(a.codigo, b.codigo)).forEach(completar)
  return raizes
}

/* ── Datas da EAP (lançadas nos itens, de uma vez, no modo "Editar datas") ── */

// Erro que impede salvar a linha, ou null. Vazio nos dois é permitido (ainda sem data).
export function validarDatas({ inicio, fim }) {
  if (!inicio && !fim) return null
  if (!inicio || !fim) return 'Preencha o início e o fim.'
  if (fim < inicio) return 'O fim não pode ser antes do início.'
  return null
}

// Lista achatada para desenhar (respeitando os grupos fechados).
export function achatarEap(raizes, fechados = new Set()) {
  const saida = []
  const andar = (no) => {
    saida.push(no)
    if (!fechados.has(no.codigo)) no.filhos.forEach(andar)
  }
  raizes.forEach(andar)
  return saida
}

/* ── Cronograma (aba Longo prazo): previsto × real e situação no prazo ── */

// Texto idêntico ao que a tela mostra; a cor de cada um mora em COR_PRAZO.
export const SITUACOES_PRAZO = { aIniciar: 'A iniciar', emDia: 'Em dia', atencao: 'Atenção', atrasado: 'Atrasado', concluido: 'Concluído' }
export const COR_PRAZO = { 'A iniciar': 'soft', 'Em dia': 'ok', Atenção: 'amber', Atrasado: 'red', Concluído: 'done' }
const TOLERANCIA = 0.02 // até 2 pontos atrás ainda é "em dia"
const LIMITE_ATENCAO = 0.10 // até 10 pontos atrás é "atenção"; mais que isso, "atrasado"

export function situacaoNoPrazo({ previsto, real, inicio, fim, hoje }) {
  if (real >= 1) return SITUACOES_PRAZO.concluido
  if (!inicio || !fim) return null
  if (hoje > fim) return SITUACOES_PRAZO.atrasado
  if (hoje < inicio) return real > 0 ? SITUACOES_PRAZO.emDia : SITUACOES_PRAZO.aIniciar
  const atraso = previsto - real
  if (atraso <= TOLERANCIA) return SITUACOES_PRAZO.emDia
  if (atraso <= LIMITE_ATENCAO) return SITUACOES_PRAZO.atencao
  return SITUACOES_PRAZO.atrasado
}

// Acrescenta em cada nó da árvore (montarEap): previsto e real no prazo (0 a 1) e a situação.
// Só entram os itens com datas: no grupo, as médias são ponderadas pelo valor, como o avanço.
export function aplicarPrazo(raizes, { hoje, cal }) {
  const andar = (no) => {
    no.filhos.forEach(andar)
    if (ehItem(no)) {
      no.previsto = previstoHoje({ inicio: no.inicio, fim: no.fim, hoje, cal })
      no.real = no.progresso
    } else {
      const comDatas = folhasDe(no).filter((x) => !x.arquivado && x.inicio && x.fim)
      no.previsto = comDatas.length ? progressoDoGrupo(comDatas.map((x) => ({ progresso: x.previsto, valor: valorDaFolha(x) }))) : null
      no.real = comDatas.length ? progressoDoGrupo(comDatas.map((x) => ({ progresso: x.real, valor: valorDaFolha(x) }))) : null
    }
    no.situacaoPrazo = no.previsto == null ? null : situacaoNoPrazo({ previsto: no.previsto, real: no.real, inicio: no.inicio, fim: no.fim, hoje })
  }
  raizes.forEach(andar)
  return raizes
}

// Colunas do cabeçalho do cronograma. Semana: de segunda a domingo. Mês: do dia 1 ao último dia.
// O período vai do início mais cedo ao fim mais tarde (incluindo hoje), arredondado para colunas inteiras.
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export function colunasDoCronograma({ inicio, fim, escala }) {
  const colunas = []
  if (escala === 'semana') {
    for (let d = segundaDaSemana(inicio); d <= fim; d = addDias(d, 7)) {
      colunas.push({ inicio: d, fim: addDias(d, 6), rotulo: `${d.slice(8, 10)}/${d.slice(5, 7)}` })
    }
  } else {
    for (let d = `${inicio.slice(0, 7)}-01`; d <= fim;) {
      const [a, m] = d.split('-').map(Number)
      const proximo = m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, '0')}-01`
      colunas.push({ inicio: d, fim: addDias(proximo, -1), rotulo: `${MESES[m - 1]}/${String(a).slice(2)}` })
      d = proximo
    }
  }
  return colunas
}


