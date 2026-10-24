import { addDias } from './datas.js'

// Texto idêntico ao CHECK de diarios.clima_manha / clima_tarde.
export const CLIMAS = ['Bom', 'Nublado', 'Chuva', 'Chuva forte']

// Quem lançou corrige até as 23h59 do dia seguinte à data do diário.
export const ultimoDiaDeCorrecao = (dataDiario) => addDias(dataDiario, 1)

export function podeCorrigir({ role, profileId, lancadoPor, dataDiario, hoje }) {
  if (role === 'Engenheiro') return true
  if (role !== 'Equipe da obra') return false
  return profileId === lancadoPor && hoje <= ultimoDiaDeCorrecao(dataDiario)
}
