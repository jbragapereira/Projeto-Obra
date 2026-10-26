import { addDias } from './datas.js'
import { regraDaSemana } from './curtoPrazo.js'
import { compararCodigos } from './planejamento.js'

// Texto idêntico ao CHECK de diarios.clima_manha / clima_tarde.
export const CLIMAS = ['Bom', 'Nublado', 'Chuva', 'Chuva forte']
export const climaComChuva = (diario) => [diario.clima_manha, diario.clima_tarde].some((c) => c === 'Chuva' || c === 'Chuva forte')

// Funções que toda obra nova já recebe; o engenheiro acrescenta as dele.
export const FUNCOES_PADRAO = ['Pedreiro', 'Servente', 'Carpinteiro', 'Armador', 'Eletricista', 'Encanador', 'Pintor', 'Encarregado', 'Mestre de obras']

// Quem lançou corrige até as 23h59 do dia seguinte à data do diário.
export const ultimoDiaDeCorrecao = (dataDiario) => addDias(dataDiario, 1)

export function podeCorrigir({ role, profileId, lancadoPor, dataDiario, hoje }) {
  if (role === 'Engenheiro') return true
  if (role !== 'Equipe da obra') return false
  return profileId === lancadoPor && hoje <= ultimoDiaDeCorrecao(dataDiario)
}

// Só a equipe tem prazo de correção (o engenheiro corrige sempre): só para ela o aviso aparece.
export const temPrazoDeCorrecao = (role) => role === 'Equipe da obra'

// Diário de um dia que ainda não tem diário: nunca no futuro.
// A equipe lança hoje ou ontem; o engenheiro, qualquer dia desde o início da obra.
export function primeiroDiaPermitido({ role, hoje, inicioObra }) {
  if (role === 'Engenheiro') return inicioObra ?? null
  if (role === 'Equipe da obra') return addDias(hoje, -1)
  return null
}

export function podeLancarData({ role, data, hoje, inicioObra }) {
  if (!data || data > hoje) return false
  if (role !== 'Engenheiro' && role !== 'Equipe da obra') return false
  const primeiro = primeiroDiaPermitido({ role, hoje, inicioObra })
  return !primeiro || data >= primeiro
}

// A mensagem de "não dá para lançar este dia", igual na tela e na camada de dados.
export function porQueNaoLanca({ role, lancaDiario, obraAceita }) {
  if (!lancaDiario) return 'Quem lança é a equipe da obra ou o engenheiro.'
  if (!obraAceita) return 'Esta obra está concluída e não aceita lançamentos.'
  return role === 'Engenheiro'
    ? 'Escolha um dia entre o início da obra e hoje.'
    : 'A equipe lança o diário de hoje ou de ontem. Para outro dia, peça ao engenheiro.'
}

/* ── Efetivo: linhas { responsavel_id, funcao_id, quantidade } ── */

const MAX_PESSOAS_POR_LINHA = 999

// Linha sem nada escolhido nem digitado não conta (não trava o envio).
export const linhaVazia = (l) => !l.responsavel_id && !l.funcao_id && !l.quantidade
export const linhasPreenchidas = (linhas) => linhas.filter((l) => !linhaVazia(l))

// Devolve { indice: 'mensagem' } com cada linha errada; vazio = ok. Linhas vazias são ignoradas.
export function validarEfetivo(linhas) {
  const erros = {}
  const vistos = new Set()
  linhas.forEach((l, i) => {
    if (linhaVazia(l)) return
    if (!l.responsavel_id) erros[i] = 'Escolha o responsável.'
    else if (!l.funcao_id) erros[i] = 'Escolha a função.'
    else if (!Number.isInteger(l.quantidade) || l.quantidade < 1) erros[i] = 'Informe quantas pessoas (número inteiro).'
    else if (l.quantidade > MAX_PESSOAS_POR_LINHA) erros[i] = `No máximo ${MAX_PESSOAS_POR_LINHA} pessoas por linha.`
    else {
      const chave = `${l.responsavel_id}|${l.funcao_id}`
      if (vistos.has(chave)) erros[i] = 'Esta combinação já está em outra linha: some as quantidades nela.'
      vistos.add(chave)
    }
  })
  return erros
}

export const totalEfetivo = (linhas) => linhas.reduce((s, l) => s + (Number.isInteger(l.quantidade) ? l.quantidade : 0), 0)

// Efetivo por função somando os responsáveis: [{ funcao, quantidade }], maior primeiro.
export function efetivoPorFuncao(linhas) {
  const soma = new Map()
  for (const l of linhas) soma.set(l.funcao, (soma.get(l.funcao) ?? 0) + l.quantidade)
  return [...soma].map(([funcao, quantidade]) => ({ funcao, quantidade })).sort((a, b) => b.quantidade - a.quantidade)
}

// Dia novo começa com o efetivo do último diário antes dele, para só ajustar.
export function efetivoParaComecar(diarios, dia) {
  const anterior = diarios.filter((d) => d.data < dia && d.efetivo?.length).sort((a, b) => b.data.localeCompare(a.data))[0]
  return (anterior?.efetivo ?? []).map((l) => ({ responsavel_id: l.responsavel_id, funcao_id: l.funcao_id, quantidade: l.quantidade }))
}

/* ── Conteúdo do diário ── */

// Um diário precisa registrar alguma coisa do dia. Dia parado por chuva
// também é diário: vale efetivo ou ocorrências, mesmo sem produção.
// Um serviço conta se tem quantidade, se foi concluído ou se tem memória de cálculo.
export const itemTemConteudo = (i) => i.quantidade > 0 || !!i.concluido || !!i.memoria_calculo?.trim()

export function diarioTemConteudo({ itens = [], efetivo = [], ocorrencias = '' }) {
  return itens.some(itemTemConteudo)
    || linhasPreenchidas(efetivo).length > 0
    || !!ocorrencias?.trim()
}

/* ── Saldo, feito no mês e Concluído ── */

const FOLGA = 1e-9 // conta com decimais: 0,1 + 0,2 tem que bater com 0,3

// Saldo do item: o que ainda falta do contratado (acumulado sem o dia em lançamento).
export const saldoDoItem = ({ contratado, acumulado }) => Math.max(0, contratado - acumulado)

// Saldo que fica depois da quantidade digitada no dia (mostrado em tempo real).
export const saldoRestante = ({ saldo, quantidade }) => Math.max(0, saldo - (quantidade || 0))

export const acimaDoSaldo = ({ quantidade, saldo }) => (quantidade || 0) > saldo + FOLGA

// Feito no mês contando a quantidade que está sendo digitada (mostrado em tempo real).
// A quantidade do dia só entra se o dia estiver dentro do período da medição atual.
export function feitoNoMesComODia({ executadoNoMes, quantidade, dia, medicao }) {
  const dentro = !!medicao && dia >= medicao.data_inicio && dia <= medicao.data_fim
  return executadoNoMes + (dentro ? (quantidade || 0) : 0)
}

// O item fica Concluído sozinho quando a quantidade do dia cobre o saldo. Não há marcação à mão no
// cartão: a situação que o cartão mostra é a do Kanban (Curto prazo).
export const concluiPeloSaldo = ({ quantidade, saldo }) => saldo > 0 && quantidade >= saldo - FOLGA

/* ── Cartões de produção do dia ──
   Cada cartão é um item do orçamento. O diário de um dia abre só com os cartões do que está
   planejado na EAP para aquele dia (e, na correção, os itens já lançados nele). Não há cartão vazio:
   atividade fora do planejado entra lançando as datas dela na EAP. */

// Planejados no dia: o período do item na EAP inclui o dia, ou já deveria ter terminado e não terminou
// (atrasada). A mesma regra do Kanban, com a "semana" de um dia só. Fica de fora o item terminado
// (100% no Diário) ou concluído em outro dia.
// itens: as folhas da EAP (montarEap) com inicio, fim e real; concluidos: Set de servico_id.
// O cartão marca "Atrasada": já devia ter terminado na EAP e o item não está concluído nem completo.
export const atrasadaNoDia = ({ servico, acumulado, concluido, dia }) =>
  !concluido && regraDaSemana({ inicio: servico.data_inicio_planejada, fim: servico.data_fim_planejada, real: servico.qtd_contratada > 0 ? acumulado / servico.qtd_contratada : 0 }, { inicio: dia, fim: dia }).atrasada

export const planejadosNoDia = ({ itens, dia, concluidos }) =>
  itens.filter((n) => regraDaSemana(n, { inicio: dia, fim: dia }).entra && !concluidos.has(n.servico.id)).map((n) => n.servico.id)

// Os cartões de um dia (novo ou em correção): os itens já lançados naquele dia, depois os planejados
// na EAP que ainda não estão lá.
export const cartoesDoDia = ({ lancados, planejados }) => [...lancados, ...planejados.filter((id) => !lancados.includes(id))]

// Ordem em que os cartões aparecem: pelo código do item, do menor para o maior (1.2 antes de 1.10),
// sempre — também depois de trocar o item de um cartão. Devolve as posições de cartoes na ordem certa.
export const ordemDosCartoes = (cartoes, codigoDe) =>
  cartoes.map((id, indice) => ({ id, indice })).sort((x, y) => compararCodigos(codigoDe[x.id] ?? '', codigoDe[y.id] ?? '')).map((c) => c.indice)

// Trocar o item de um cartão (escolhido errado).
export const escolherNoCartao = (cartoes, indice, servicoId) => cartoes.map((c, i) => (i === indice ? servicoId : c))

// Tirar um cartão que não vai ser usado no dia.
export const tirarCartao = (cartoes, indice) => cartoes.filter((_, i) => i !== indice)

// O que pode ser escolhido num cartão: itens não concluídos em outro dia e que não estão em
// OUTRO cartão do dia (o item do próprio cartão continua na lista).
export const itensParaCartao = ({ analises, emOutrosCartoes }) =>
  analises.filter((a) => !a.concluido && !emOutrosCartoes.includes(a.servico.id))
