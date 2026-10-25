// Calendário de trabalho: dias úteis, feriados e previsto do cronograma (src/lib/calendario.js).
import { CALENDARIO_PADRAO, diasUteisEntre, ehDiaUtil, previstoHoje, validarCalendario } from '../src/lib/calendario.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const cal = CALENDARIO_PADRAO
const comSabado = { ...cal, dias_semana: [1, 2, 3, 4, 5, 6] }

// 2026-11-02 é segunda e Finados; 2026-11-15 é domingo; 2026-11-20 é sexta e Consciência Negra.
conferir('segunda comum é dia útil', ehDiaUtil('2026-11-09', cal), true)
conferir('sábado não é (seg a sex)', ehDiaUtil('2026-11-07', cal), false)
conferir('feriado não é', ehDiaUtil('2026-11-02', cal), false)
conferir('sábado é, quando a obra trabalha sábado', ehDiaUtil('2026-11-07', comSabado), true)
// Novembro/2026: 21 dias de seg a sex, menos Finados (02) e Consciência Negra (20) = 19.
conferir('dias úteis de novembro/2026', diasUteisEntre('2026-11-01', '2026-11-30', cal), 19)
conferir('com sábado: + 4 sábados', diasUteisEntre('2026-11-01', '2026-11-30', comSabado), 23)
conferir('mesmo dia útil conta 1', diasUteisEntre('2026-11-09', '2026-11-09', cal), 1)
conferir('fim antes do início não conta', diasUteisEntre('2026-11-10', '2026-11-09', cal), null)

// Previsto: de 09/11 (seg) a 20/11 (sex, feriado) há 9 dias úteis; em 13/11 (sex) passaram 5.
conferir('previsto antes do início é 0', previstoHoje({ inicio: '2026-11-09', fim: '2026-11-20', hoje: '2026-11-01', cal }), 0)
conferir('previsto pelos dias úteis', previstoHoje({ inicio: '2026-11-09', fim: '2026-11-20', hoje: '2026-11-13', cal }), 5 / 9)
conferir('fim de semana não avança o previsto', previstoHoje({ inicio: '2026-11-09', fim: '2026-11-20', hoje: '2026-11-15', cal }), 5 / 9)
conferir('previsto do fim em diante é 1', previstoHoje({ inicio: '2026-11-09', fim: '2026-11-20', hoje: '2026-11-25', cal }), 1)
conferir('sem datas, sem previsto', previstoHoje({ inicio: null, fim: '2026-11-20', hoje: '2026-11-13', cal }), null)

// Validação
conferir('calendário padrão passa', validarCalendario(cal), {})
conferir('sem dia de trabalho é recusado', Object.keys(validarCalendario({ dias_semana: [], feriados: [] })), ['dias_semana'])
conferir('feriado sem nome é recusado', Object.keys(validarCalendario({ dias_semana: [1], feriados: [{ data: '2026-06-24', nome: '' }] })), ['feriados'])
conferir('feriado repetido é recusado', Object.keys(validarCalendario({ dias_semana: [1], feriados: [{ data: '2026-06-24', nome: 'São João' }, { data: '2026-06-24', nome: 'X' }] })), ['feriados'])

console.log(`${ok}/${tot} — calendário`)
process.exit(ok === tot ? 0 : 1)
