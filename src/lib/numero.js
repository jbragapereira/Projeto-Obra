// Números digitados do jeito brasileiro: ponto de milhar e vírgula decimal.
// "1.234,56" → 1234.56 · "1234,5" → 1234.5 · "1.234" → 1234 · "12.5" → 12.5
// Regra pura, com teste em tests/numero.mjs. Toda quantidade digitada no app passa por aqui.

// Ao digitar, só ficam algarismos, ponto e vírgula (nada é proibido além de letras).
export const limparDigitacao = (texto) => String(texto ?? '').replace(/[^\d.,]/g, '')

// Devolve o número, ou null se o texto estiver vazio ou não der para entender.
export function lerNumero(texto) {
  const t = String(texto ?? '').replace(/\s/g, '')
  if (!t) return null
  if (/[^\d.,]/.test(t)) return null
  let normal
  if (t.includes(',')) {
    // Com vírgula: ela é o decimal e os pontos são de milhar.
    if (t.split(',').length > 2) return null
    const [inteiro, decimal] = t.split(',')
    if (inteiro.includes('.') && !/^\d{1,3}(\.\d{3})+$/.test(inteiro)) return null
    normal = `${inteiro.replace(/\./g, '') || '0'}.${decimal}`
  } else if (t.includes('.')) {
    // Só pontos: "1.234" ou "1.234.567" são milhar; "12.5" e "0.500" são decimal
    // (milhar nunca começa com zero).
    if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(t)) normal = t.replace(/\./g, '')
    else if (t.split('.').length === 2) normal = t
    else return null
  } else {
    normal = t
  }
  const n = Number(normal)
  return Number.isFinite(n) ? n : null
}

// O número guardado tem as mesmas casas que o campo mostra.
export const arredondar = (n, casas = 3) => (n == null ? n : Math.round(n * 10 ** casas) / 10 ** casas)

// Como o número aparece de volta no campo: "1.234,5".
export const formatarNumero = (n, casas = 3) =>
  n == null ? '' : n.toLocaleString('pt-BR', { maximumFractionDigits: casas })
