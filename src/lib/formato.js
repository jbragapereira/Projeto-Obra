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

export const pct = (parte, total) => (total ? Math.round((parte / total) * 100) : 0)
