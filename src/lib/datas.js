// Datas sempre como texto 'AAAA-MM-DD' no fuso local.
// Nunca use toISOString(): ela converte para UTC e, no Brasil, pode pular um dia.

const pad = (n) => String(n).padStart(2, '0')

export const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const hojeISO = () => isoLocal(new Date())

// Data e hora local 'AAAA-MM-DDTHH:MM:SS' (sem fuso, como o relógio da câmera).
export const dataHoraLocal = (d) => `${isoLocal(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

// '24/10/2026 10:31'
export const dataHoraCurta = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} ${iso.slice(11, 16)}` : '—')

// Meio-dia evita erro de horário de verão na conta de dias.
const meioDia = (iso) => new Date(`${iso}T12:00:00`)

export const addDias = (iso, n) => {
  const d = meioDia(iso)
  d.setDate(d.getDate() + n)
  return isoLocal(d)
}

export const diasEntre = (de, ate) => Math.round((meioDia(ate) - meioDia(de)) / 864e5)

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export const dm = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—')
export const dmy = (iso) => (iso ? `${dm(iso)}/${iso.slice(0, 4)}` : '—')

// "sexta, 23 de out"
export const dataLonga = (iso) => {
  const d = meioDia(iso)
  return `${DIAS[d.getDay()]}, ${iso.slice(8, 10)} de ${MESES[d.getMonth()]}`
}

// Segunda-feira da semana de uma data (a semana do app vai de segunda a domingo).
export const segundaDaSemana = (iso) => addDias(iso, -((new Date(`${iso}T12:00:00`).getDay() + 6) % 7))
