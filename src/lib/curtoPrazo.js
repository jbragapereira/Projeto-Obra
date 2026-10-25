// Curto prazo (a semana): kanban das atividades, subtarefas e PPC.
// Regra pura, com teste em tests/curtoPrazo.mjs. A semana começa na segunda ('AAAA-MM-DD').
import { addDias } from './datas.js'
import { TIPOS_RESTRICAO } from './restricoes.js'

// Situação da atividade na semana (texto idêntico ao CHECK de semana_atividades.status).
export const STATUS_SEMANA = { aFazer: 'A fazer', andamento: 'Em andamento', concluido: 'Concluído', naoRealizado: 'Não realizado' }
export const COLUNAS_KANBAN = [STATUS_SEMANA.aFazer, STATUS_SEMANA.andamento, STATUS_SEMANA.concluido, STATUS_SEMANA.naoRealizado]
// Cor (classe de pill) de cada situação, no Kanban e nos cartões do Diário.
export const COR_STATUS_SEMANA = {
  [STATUS_SEMANA.aFazer]: 'soft', [STATUS_SEMANA.andamento]: 'dark', [STATUS_SEMANA.concluido]: 'ok', [STATUS_SEMANA.naoRealizado]: 'red',
}

// A situação de uma atividade no Kanban de uma semana (sem registro: "A fazer").
export const statusNaSemana = ({ registros, semana, servicoId }) =>
  registros.find((r) => r.semana === semana && r.servico_id === servicoId)?.status ?? STATUS_SEMANA.aFazer

// Produção lançada no Diário faz o Kanban da semana andar: "A fazer" vira "Em andamento", e o item
// concluído no Diário vira "Concluído". Nunca volta, e não mexe em "Não realizado" (tem causa
// registrada) nem em atividade tirada da semana. Devolve a nova situação, ou null (fica como está).
export function statusAposLancamento({ atual, fora, quantidade, concluido }) {
  if (fora || atual === STATUS_SEMANA.naoRealizado || atual === STATUS_SEMANA.concluido) return null
  if (concluido) return STATUS_SEMANA.concluido
  if (quantidade > 0 && atual === STATUS_SEMANA.aFazer) return STATUS_SEMANA.andamento
  return null
}

// Situação da subtarefa (texto idêntico ao CHECK de subtarefas.situacao).
export const SITUACAO_SUBTAREFA = { pendente: 'Pendente', feita: 'Feita', naoRealizada: 'Não realizada' }
// Causa raiz do que não foi realizado (texto idêntico ao CHECK). "Outra" pede o texto.
// Os tipos de restrição do Médio prazo, mais Clima e Outra (texto idêntico ao CHECK).
export const CAUSA_OUTRA = 'Outra'
export const CAUSAS = [...TIPOS_RESTRICAO, 'Clima', CAUSA_OUTRA]

// A atividade entra na semana se o período dela cruza a semana, ou se já deveria ter terminado
// e não terminou (acumulada: "atrasada"). Atividade terminada no Diário (real 100%) não entra mais.
export function regraDaSemana(item, semana) {
  if (!item.inicio || !item.fim || (item.real ?? 0) >= 1) return { entra: false, atrasada: false }
  if (item.inicio <= semana.fim && item.fim >= semana.inicio) return { entra: true, atrasada: false }
  if (item.fim < semana.inicio) return { entra: true, atrasada: true }
  return { entra: false, atrasada: false }
}

// O item entra pela regra no Kanban da semana que começa na segunda 'semana'? (real: progresso no começo dela)
export const planejadaNaSemana = ({ servico, real, semana }) =>
  regraDaSemana({ inicio: servico.data_inicio_planejada, fim: servico.data_fim_planejada, real }, { inicio: semana, fim: addDias(semana, 6) }).entra

// As atividades do kanban de uma semana: as da regra mais as que já têm registro na semana
// (o que foi mexido continua lá, mesmo que o item termine no Diário). Tiradas pelo engenheiro ficam
// em "fora", não contam no PPC. registros: os da obra (semana_atividades). realNoInicio: progresso de
// cada item no começo da semana (realPorItem); sem ele, vale o real de cada nó.
// Devolve { lista: [{ no, status, causa, causa_texto, atrasada }], fora: [no] }.
export function atividadesDaSemanaCurta({ itens, semana, registros, realNoInicio = null }) {
  const daSemana = Object.fromEntries(registros.filter((r) => r.semana === semana.inicio).map((r) => [r.servico_id, r]))
  const lista = []
  const fora = []
  for (const no of itens) {
    const reg = daSemana[no.servico.id]
    const { entra, atrasada } = regraDaSemana(realNoInicio ? { ...no, real: realNoInicio[no.servico.id] ?? 0 } : no, semana)
    if (!entra && !reg) continue
    if (reg?.fora) { fora.push(no); continue }
    lista.push({ no, status: reg?.status ?? STATUS_SEMANA.aFazer, causa: reg?.causa ?? null, causa_texto: reg?.causa_texto ?? '', atrasada })
  }
  return { lista, fora }
}

// PPC = atividades concluídas ÷ planejadas na semana (0 a 1), ou null sem atividade.
export function ppc(lista) {
  const total = lista.length
  const concluidas = lista.filter((a) => a.status === STATUS_SEMANA.concluido).length
  return { concluidas, total, valor: total ? concluidas / total : null }
}

// A causa que vai para o banco: só quando é "não realizado"; o texto só quando a causa é "Outra".
export const causaParaGravar = ({ naoRealizado, causa, causa_texto }) => ({
  causa: naoRealizado ? causa : null,
  causa_texto: naoRealizado && causa === CAUSA_OUTRA ? causa_texto.trim() : '',
})

// Como a causa aparece na tela ("Outra" mostra o texto digitado).
export const textoDaCausa = (r) => (r.causa === CAUSA_OUTRA ? r.causa_texto : r.causa)

// Botões de cada cartão do kanban: para onde a atividade pode ir a partir de cada situação.
export function acoesDoStatus(status) {
  const { aFazer, andamento, concluido, naoRealizado } = STATUS_SEMANA
  if (status === aFazer) return [{ rotulo: 'Iniciar', para: andamento }, { rotulo: 'Concluir', para: concluido }, { rotulo: 'Não realizado', para: naoRealizado }]
  if (status === andamento) return [{ rotulo: 'Concluir', para: concluido }, { rotulo: 'Não realizado', para: naoRealizado }, { rotulo: 'Voltar', para: aFazer }]
  return [{ rotulo: 'Reabrir', para: andamento }]
}

// Progresso de cada item (0 a 1) a partir de um acumulado: { servico_id: real }. O kanban de uma semana
// decide quem entra pelo progresso NO COMEÇO da semana (acumulado só com os lançamentos antes dela):
// assim o PPC de uma semana passada não muda quando o item termina depois.
export const realPorItem = (itens, acumulado) =>
  Object.fromEntries(itens.map((n) => [n.servico.id, n.servico.qtd_contratada > 0 ? Math.min(1, (acumulado[n.servico.id] ?? 0) / n.servico.qtd_contratada) : 0]))

// Para mudar para "Não realizado" (atividade ou subtarefa) a causa raiz é obrigatória.
export function validarCausa({ causa, causa_texto }) {
  if (!CAUSAS.includes(causa)) return 'Escolha a causa raiz.'
  if (causa === CAUSA_OUTRA && !causa_texto?.trim()) return 'Descreva a causa.'
  return null
}

// As segundas-feiras das últimas N semanas (a mais antiga primeiro), terminando na semana dada.
export const semanasAnteriores = (segunda, n) => Array.from({ length: n }, (_, i) => addDias(segunda, -7 * (n - 1 - i)))

// As causas que mais aparecem (atividades e subtarefas não realizadas), da mais frequente para a menos.
export function causasMaisFrequentes({ registros, subtarefas, desde, ate }) {
  const naJanela = (semana) => semana >= desde && (!ate || semana <= ate)
  const conta = {}
  const somar = (c) => { if (c) conta[c] = (conta[c] ?? 0) + 1 }
  registros.filter((r) => naJanela(r.semana) && r.status === STATUS_SEMANA.naoRealizado && !r.fora).forEach((r) => somar(r.causa))
  subtarefas.filter((s) => naJanela(s.semana) && s.situacao === SITUACAO_SUBTAREFA.naoRealizada).forEach((s) => somar(s.causa))
  return Object.entries(conta).map(([causa, n]) => ({ causa, n })).sort((a, b) => b.n - a.n || a.causa.localeCompare(b.causa, 'pt-BR'))
}
