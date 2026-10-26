// Formatação de números para a tela. Uma função por jeito de mostrar.

export const brl = (v) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export const brlCentavos = (v) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Para os números grandes dos cartões: { valor: '70,1', sufixo: 'mil' }
export const emMil = (v) =>
  v >= 1000
    ? { valor: (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }), sufixo: 'mil' }
    : { valor: Math.round(v).toLocaleString('pt-BR'), sufixo: '' }

export const qtd = (v, unidade) =>
  `${(v ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}${unidade ? ` ${unidade}` : ''}`

// "2,1 MB", "840 KB" (em base 1000, como o limite de 5 MB das fotos)
export const tamanhoArquivo = (bytes) =>
  bytes >= 1000 * 1000
    ? `${(bytes / (1000 * 1000)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
    : `${Math.max(1, Math.round(bytes / 1000)).toLocaleString('pt-BR')} KB`

// BDI e outras taxas guardadas como fração: 0.242 → "24,20%"
export const percentual = (v) =>
  `${((v ?? 0) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`

export const pct = (parte, total) => (total ? Math.round((parte / total) * 100) : 0)

// "54,6%": % de 0 a 1 com uma casa, sempre para baixo (100% só quando chegou mesmo a 100%).
export const pctParaBaixo = (x) => `${(Math.floor((x ?? 0) * 1000 + 1e-9) / 10).toLocaleString('pt-BR')}%`
