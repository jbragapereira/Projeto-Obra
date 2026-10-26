// Campo "Item do orçamento" do cartão do Diário: a setinha abre todos os itens do orçamento,
// separados por etapa e subetapa; digitar filtra pelo código ou pela descrição.
import { useEffect, useId, useRef, useState } from 'react'
import { paiDoCodigo } from '../lib/planejamento.js'

const etapaDe = (codigo) => String(codigo).split('.')[0]

// itens: serviços que podem ser escolhidos, em ordem de código; nomeDoGrupo: { '2.1': 'CANTEIRO DE OBRA', ... }
export default function EscolherItem({ itens, nomeDoGrupo, escolhido, onEscolher }) {
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const idLista = useId()
  const termo = texto.trim().toLowerCase()
  const achados = termo ? itens.filter((s) => `${s.codigo} ${s.codigo_ref ?? ''} ${s.descricao}`.toLowerCase().includes(termo)) : itens

  // A lista com os títulos de etapa e subetapa entre os itens.
  const linhas = []
  let etapa = null
  let subetapa = null
  for (const s of achados) {
    const e = etapaDe(s.codigo)
    const sub = paiDoCodigo(s.codigo)
    if (e !== etapa) { linhas.push({ titulo: `${e} ${nomeDoGrupo[e] ?? ''}`, nivel: 1, chave: `e${e}` }); etapa = e; subetapa = null }
    if (sub && sub !== e && sub !== subetapa) { linhas.push({ titulo: `${sub} ${nomeDoGrupo[sub] ?? ''}`, nivel: 2, chave: `s${sub}` }); subetapa = sub }
    linhas.push({ item: s, chave: s.id })
  }

  const escolher = (s) => { onEscolher(s.id); setAberto(false); setTexto('') }
  const fechar = () => { setAberto(false); setTexto('') }
  // Aberta pela setinha, a lista não tem foco para perder: clicar (ou tocar) fora dela, ou Esc, fecha e
  // volta o campo ao normal, sem escolher nada.
  const caixa = useRef(null)
  useEffect(() => {
    if (!aberto) return
    const foraDaCaixa = (e) => { if (!caixa.current?.contains(e.target)) fechar() }
    const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); fechar() } } // fecha só a lista, não o painel
    document.addEventListener('pointerdown', foraDaCaixa)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', foraDaCaixa); document.removeEventListener('keydown', esc) }
  }, [aberto])

  return (
    <div className="escolher" ref={caixa} onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) fechar() }}>
      <label className="field">
        <span>Item do orçamento</span>
        <div className="escolher-campo">
          <input className="ipt" role="combobox" aria-expanded={aberto} aria-controls={idLista} autoComplete="off"
            placeholder={escolhido ? `${escolhido.codigo}: trocar o item` : 'Escolha ou digite código ou descrição'}
            // Fechado, o campo mostra o código e a descrição do item escolhido (o texto inteiro no title).
            value={aberto ? texto : (escolhido ? `${escolhido.codigo} ${escolhido.descricao}` : '')}
            title={escolhido ? `${escolhido.codigo} ${escolhido.descricao}` : undefined}
            onFocus={() => setAberto(true)}
            onChange={(e) => { setTexto(e.target.value); setAberto(true) }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { e.stopPropagation(); fechar() }
              if (e.key === 'Enter' && achados.length) { e.preventDefault(); escolher(achados[0]) }
            }} />
          <button type="button" className="escolher-seta" aria-label="Mostrar todos os itens do orçamento" aria-expanded={aberto}
            onMouseDown={(e) => e.preventDefault()} onClick={() => (aberto ? fechar() : setAberto(true))}>▾</button>
        </div>
      </label>
      {aberto && (
        <ul className="escolher-lista" id={idLista} role="listbox" aria-label="Itens do orçamento">
          {!achados.length && <li className="escolher-vazio">Nenhum item com “{texto}”.</li>}
          {linhas.map((l) => (l.item ? (
            <li key={l.chave} role="option" aria-selected={escolhido?.id === l.item.id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => escolher(l.item)}>
                <span className="cod">{l.item.codigo}</span> {l.item.descricao}
              </button>
            </li>
          ) : (
            <li key={l.chave} className={`escolher-grupo n${l.nivel}`} role="presentation">{l.titulo}</li>
          )))}
        </ul>
      )}
    </div>
  )
}
