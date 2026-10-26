// Medição de empreiteiros: o contrato de cada empreiteiro (Kanban), o valor dele (global ou por escopo,
// com itens do Orçamento) e os boletins de medição. Regra pura, com teste em tests/empreiteiros.mjs.
// Os textos de situação e tipo são idênticos ao CHECK do banco.
import { precoTotal, truncar2 } from './orcamento.js'

export const STATUS_CONTRATO = ['Em elaboração', 'Enviado p/ aprovação', 'Aprovado / Ativo', 'Concluído']
export const [EM_ELABORACAO, ENVIADO, ATIVO, CONCLUIDO] = STATUS_CONTRATO
export const TIPOS_CONTRATO = ['Global', 'Por escopo']
export const [GLOBAL, POR_ESCOPO] = TIPOS_CONTRATO
// Cor da etiqueta de cada situação (classes de .pill).
export const COR_STATUS_CONTRATO = { [EM_ELABORACAO]: 'soft', [ENVIADO]: 'amber', [ATIVO]: 'dark', [CONCLUIDO]: 'ok' }

const FOLGA = 1e-6
const centavos = (x) => Math.round(x * 100) / 100

// A coluna ao lado (passo +1 avança, −1 volta), ou null se não há.
export const statusAoLado = (status, passo) => STATUS_CONTRATO[STATUS_CONTRATO.indexOf(status) + passo] ?? null

// Pode mover o card? Devolve o motivo do bloqueio, ou null. Regras:
// - Ir para "Aprovado / Ativo" pede o cadastro do valor (quem chama abre o formulário; aqui só se avisa).
// - "Concluído" só com 100% medido.
// - Contrato com boletim não volta para antes de "Aprovado / Ativo" (a medição é dele).
// - Concluído pode ser reaberto (volta para "Aprovado / Ativo"), por exemplo para um aditivo.
export function motivoParaNaoMover({ contrato, para, pctMedido = 0, temBoletim = false }) {
  if (!STATUS_CONTRATO.includes(para)) return 'Situação inválida.'
  const de = STATUS_CONTRATO.indexOf(contrato.status)
  const ate = STATUS_CONTRATO.indexOf(para)
  if (Math.abs(ate - de) !== 1) return 'Mova uma coluna por vez.'
  if (para === CONCLUIDO && pctMedido < 1 - FOLGA) return `Só pode concluir com 100% medido (medido até agora: ${Math.floor(pctMedido * 1000) / 10}%).`
  if (ate < STATUS_CONTRATO.indexOf(ATIVO) && de >= STATUS_CONTRATO.indexOf(ATIVO) && temBoletim) {
    return 'Contrato com boletim de medição não volta para antes de "Aprovado / Ativo".'
  }
  return null
}

// Valor total do contrato: o global digitado, ou a soma do escopo (P. Total = TRUNCAR(Qtd × P. Unit., 2), como
// o Orçamento). itens: [{ quantidade, preco_unitario }].
export function valorDoContrato({ tipo, valor_global, itens = [] }) {
  if (tipo === GLOBAL) return centavos(valor_global ?? 0)
  if (tipo === POR_ESCOPO) return centavos(itens.reduce((s, i) => s + precoTotal(i.quantidade ?? 0, i.preco_unitario ?? 0), 0))
  return null
}

// Erros do cadastro do valor ({} = pode salvar). Também vale para o aditivo de um contrato ativo: o valor
// (global) e a quantidade de cada item não podem ficar abaixo do que já foi medido, e o item já medido não
// muda de preço (os boletins dele foram pagos por aquele preço).
// medidoValor: R$ já medido (global); medidoPorServico: { servico_id: quantidade já medida };
// precoPorServico: { servico_id: preço unitário atual }.
export function validarValorDoContrato({ tipo, valor_global, itens = [], medidoValor = 0, medidoPorServico = {}, precoPorServico = {} }) {
  const e = {}
  if (!TIPOS_CONTRATO.includes(tipo)) { e.tipo = 'Escolha o tipo do contrato.'; return e }
  if (tipo === GLOBAL) {
    if (!(valor_global > 0)) e.valor_global = 'Informe o valor total do contrato.'
    else if (valor_global < medidoValor - FOLGA) e.valor_global = 'O valor não pode ficar abaixo do que já foi medido.'
    return e
  }
  if (!itens.length) e.itens = 'Inclua pelo menos um item do Orçamento.'
  const vistos = new Set()
  itens.forEach((i, k) => {
    const erro = !i.servico_id ? 'Escolha o item do Orçamento.'
      : vistos.has(i.servico_id) ? 'Item repetido no contrato.'
        : !(i.quantidade > 0) ? 'Informe a quantidade.'
          : !(i.preco_unitario > 0) ? 'Informe o preço unitário.'
            : i.quantidade < (medidoPorServico[i.servico_id] ?? 0) - FOLGA ? 'A quantidade não pode ficar abaixo do que já foi medido.'
              : (medidoPorServico[i.servico_id] ?? 0) > FOLGA && Math.abs(i.preco_unitario - (precoPorServico[i.servico_id] ?? i.preco_unitario)) > FOLGA
                ? 'Item que já tem medição não muda de preço.'
                : null
    if (erro) e[`item${k}`] = erro
    vistos.add(i.servico_id)
  })
  // Item que já tem medição não sai do contrato.
  const mantidos = new Set(itens.map((i) => i.servico_id))
  if (Object.entries(medidoPorServico).some(([id, q]) => q > FOLGA && !mantidos.has(id))) e.itens = 'Item que já tem medição não sai do contrato.'
  return e
}

/* ── Medição (boletins) ── */

// O que já foi medido de um contrato: em R$ (soma dos boletins) e, no escopo, a quantidade por item.
// boletins: [{ valor }]; linhas: [{ contrato_item_id, quantidade }] dos boletins do contrato.
export function medidoDoContrato({ boletins, linhas = [] }) {
  const porItem = {}
  for (const l of linhas) porItem[l.contrato_item_id] = (porItem[l.contrato_item_id] ?? 0) + (l.quantidade ?? 0)
  return { valor: centavos(boletins.reduce((s, b) => s + (b.valor ?? 0), 0)), porItem }
}

// % medido do contrato (0 a 1).
export const pctMedido = (medidoValor, valorTotal) => (valorTotal > 0 ? medidoValor / valorTotal : 0)

// Linha do boletim por escopo, a partir de qualquer um dos três campos. A QUANTIDADE é a fonte da verdade:
// do % e do R$ sai a quantidade (3 casas), e dela saem o % e o R$.
// O R$ da linha é o P. Total do acumulado depois dela menos o de antes (jaMedido): somadas, as linhas de um
// item dão sempre TRUNCAR(acumulado × preço, 2), e o item medido inteiro fecha no P. Total do contrato —
// truncar cada linha sozinha perdia centavos e o contrato nunca chegava a 100%.
// item: { quantidade (contratada), preco_unitario }. Devolve { quantidade, pct (0 a 1), valor }.
export function linhaPorQuantidade(item, quantidade, jaMedido = 0) {
  const q = Math.max(0, Math.round((Number(quantidade) || 0) * 1000) / 1000)
  const valor = centavos(precoTotal(jaMedido + q, item.preco_unitario) - precoTotal(jaMedido, item.preco_unitario))
  return { quantidade: q, pct: item.quantidade > 0 ? q / item.quantidade : 0, valor }
}
export const linhaPorPercentual = (item, pct, jaMedido = 0) => linhaPorQuantidade(item, (item.quantidade * (Number(pct) || 0)) / 100, jaMedido)
export const linhaPorValor = (item, valor, jaMedido = 0) => linhaPorQuantidade(item, item.preco_unitario > 0 ? (Number(valor) || 0) / item.preco_unitario : 0, jaMedido)

// Valor do boletim por escopo: a soma das linhas, em centavos.
export const valorDoBoletim = (linhas) => centavos(linhas.reduce((s, l) => s + (l.valor ?? 0), 0))

// Boletim do contrato global: digita-se o % ou o R$; o R$ (em centavos) é a verdade.
export const globalPorValor = (valorTotal, valor) => {
  const v = truncar2(Math.max(0, Number(valor) || 0))
  return { valor: v, pct: valorTotal > 0 ? v / valorTotal : 0 }
}
export const globalPorPercentual = (valorTotal, pct) => globalPorValor(valorTotal, (valorTotal * (Number(pct) || 0)) / 100)

// Erros do boletim ({} = pode salvar): nada passa de 100% acumulado, o boletim mede alguma coisa e não tem
// data futura (hoje: 'AAAA-MM-DD').
// Global: { valorTotal, medidoValor, valor }. Escopo: { itens: [{ id, quantidade }], medidoPorItem, linhas: [{ contrato_item_id, quantidade }] }.
export function validarBoletim({ tipo, data, hoje, valorTotal, medidoValor = 0, valor = 0, itens = [], medidoPorItem = {}, linhas = [] }) {
  const e = {}
  if (!data) e.data = 'Informe a data do boletim.'
  else if (hoje && data > hoje) e.data = 'O boletim não pode ter data futura.'
  if (tipo === GLOBAL) {
    if (!(valor > 0)) e.valor = 'Informe o % ou o valor medido.'
    else if (medidoValor + valor > valorTotal + FOLGA) e.valor = `Passa de 100%: o saldo a medir é ${centavos(valorTotal - medidoValor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`
    return e
  }
  const itemDe = Object.fromEntries(itens.map((i) => [i.id, i]))
  if (!linhas.some((l) => l.quantidade > 0)) e.linhas = 'Meça pelo menos um item.'
  for (const l of linhas) {
    const item = itemDe[l.contrato_item_id]
    if (!item) { e[l.contrato_item_id] = 'Item fora do contrato.'; continue }
    if ((medidoPorItem[item.id] ?? 0) + (l.quantidade ?? 0) > item.quantidade + FOLGA) e[item.id] = 'Passa de 100% acumulado neste item.'
  }
  return e
}

// Próximo número de boletim do contrato (Medição nº 1, nº 2…).
export const proximoNumeroDeBoletim = (boletins) => boletins.reduce((m, b) => Math.max(m, b.numero), 0) + 1

// Rodapé do boletim e resumo da ficha: o acumulado depois deste boletim, o % e o saldo a medir.
export function acumuladoComBoletim({ valorTotal, medidoValor, valorBoletim = 0 }) {
  const acumulado = centavos(medidoValor + valorBoletim)
  return { acumulado, pct: pctMedido(acumulado, valorTotal), saldo: centavos(Math.max(0, valorTotal - acumulado)) }
}
