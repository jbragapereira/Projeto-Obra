// Planejamento (Last Planner) em cima dos SERVIÇOS da obra — sem lista paralela.
// A EAP é a árvore montada pelos códigos dos serviços (1 › 1.2 › 1.2.1); os
// níveis que não são serviço são "grupos" com nome. Regra pura, com teste em
// tests/planejamento.mjs.

import { diasEntre } from './datas.js'

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
  const folhasDe = (no) => (no.tipo === 'servico' && !no.filhos.length ? [no] : no.filhos.flatMap(folhasDe))
  const completar = (no) => {
    no.filhos.sort((a, b) => compararCodigos(a.codigo, b.codigo))
    no.filhos.forEach(completar)
    const folhas = folhasDe(no).filter((f) => !f.arquivado)
    const inicios = folhas.map((f) => f.servico.data_inicio_planejada).filter(Boolean).sort()
    const fins = folhas.map((f) => f.servico.data_fim_planejada).filter(Boolean).sort()
    if (no.tipo === 'servico' && !no.filhos.length) {
      no.inicio = no.servico.data_inicio_planejada ?? null
      no.fim = no.servico.data_fim_planejada ?? null
    } else {
      no.inicio = inicios[0] ?? null
      no.fim = fins.at(-1) ?? null
      no.progresso = progressoDoGrupo(folhas.map((f) => ({
        progresso: f.progresso,
        valor: typeof f.servico.preco_unitario === 'number' ? f.servico.preco_unitario * f.servico.qtd_contratada : undefined,
      })))
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

// Dias corridos, contando o primeiro e o último (01/10 a 01/10 = 1 dia).
export const diasCorridos = (inicio, fim) =>
  (inicio && fim && fim >= inicio ? diasEntre(inicio, fim) + 1 : null)

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
