// Calendário de trabalho de cada obra: dias da semana trabalhados e feriados.
// O previsto do cronograma (Longo prazo) e os "dias úteis" da EAP contam por aqui.
// Regra pura, com teste em tests/calendario.mjs. Datas sempre 'AAAA-MM-DD' no fuso local.
import { addDias } from './datas.js'

// 0 = domingo … 6 = sábado (como o getDay do JavaScript).
export const DIAS_DA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const DIAS_PADRAO = [1, 2, 3, 4, 5]

// Feriados nacionais (e o Carnaval e Corpus Christi, em que a obra costuma parar), já preenchidos
// em toda obra nova. O engenheiro tira o que a obra trabalha e acrescenta os municipais e estaduais.
export const FERIADOS_NACIONAIS = [
  ['2026-01-01', 'Confraternização Universal'], ['2026-02-16', 'Carnaval'], ['2026-02-17', 'Carnaval'],
  ['2026-04-03', 'Sexta-feira Santa'], ['2026-04-21', 'Tiradentes'], ['2026-05-01', 'Dia do Trabalho'],
  ['2026-06-04', 'Corpus Christi'], ['2026-09-07', 'Independência'], ['2026-10-12', 'Nossa Senhora Aparecida'],
  ['2026-11-02', 'Finados'], ['2026-11-15', 'Proclamação da República'], ['2026-11-20', 'Consciência Negra'],
  ['2026-12-25', 'Natal'],
  ['2027-01-01', 'Confraternização Universal'], ['2027-02-08', 'Carnaval'], ['2027-02-09', 'Carnaval'],
  ['2027-03-26', 'Sexta-feira Santa'], ['2027-04-21', 'Tiradentes'], ['2027-05-01', 'Dia do Trabalho'],
  ['2027-05-27', 'Corpus Christi'], ['2027-09-07', 'Independência'], ['2027-10-12', 'Nossa Senhora Aparecida'],
  ['2027-11-02', 'Finados'], ['2027-11-15', 'Proclamação da República'], ['2027-11-20', 'Consciência Negra'],
  ['2027-12-25', 'Natal'],
].map(([data, nome]) => ({ data, nome }))

export const CALENDARIO_PADRAO = { dias_semana: DIAS_PADRAO, feriados: FERIADOS_NACIONAIS }

const diaDaSemana = (iso) => new Date(`${iso}T12:00:00`).getDay()

// cal: { dias_semana: [1..5], feriados: [{ data, nome }] }
export function ehDiaUtil(iso, cal) {
  return cal.dias_semana.includes(diaDaSemana(iso)) && !cal.feriados.some((f) => f.data === iso)
}

// Dias úteis de início a fim, contando os dois (vazio ou fim antes do início: null).
export function diasUteisEntre(inicio, fim, cal) {
  if (!inicio || !fim || fim < inicio) return null
  const feriados = new Set(cal.feriados.map((f) => f.data))
  let n = 0
  for (let d = inicio; d <= fim; d = addDias(d, 1)) {
    if (cal.dias_semana.includes(diaDaSemana(d)) && !feriados.has(d)) n++
  }
  return n
}

// Quanto do prazo já deveria estar feito hoje (0 a 1), contando o dia de hoje inteiro.
// Antes do início: 0. Do fim em diante: 1. Prazo sem nenhum dia útil (só fim de semana ou feriado): 0 até o fim.
export function previstoHoje({ inicio, fim, hoje, cal }) {
  if (!inicio || !fim) return null
  if (hoje < inicio) return 0
  if (hoje >= fim) return 1
  const total = diasUteisEntre(inicio, fim, cal)
  if (!total) return 0
  return Math.min(1, diasUteisEntre(inicio, hoje, cal) / total)
}

// Validação do que o engenheiro salva em Ajustes.
export function validarCalendario({ dias_semana, feriados }) {
  const erros = {}
  if (!dias_semana?.length) erros.dias_semana = 'Marque ao menos um dia de trabalho.'
  if (feriados.some((f) => !/^\d{4}-\d{2}-\d{2}$/.test(f.data ?? '') || !f.nome?.trim())) erros.feriados = 'Todo feriado precisa de data e nome.'
  else if (new Set(feriados.map((f) => f.data)).size !== feriados.length) erros.feriados = 'Há feriado repetido na mesma data.'
  return erros
}
