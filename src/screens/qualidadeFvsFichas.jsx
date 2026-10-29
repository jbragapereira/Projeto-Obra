// Qualidade › FVS › fichas (modelos): a lista e o formulário de criar/editar (grupos e itens). Só o engenheiro
// cria e edita; editar sobe a versão e não muda as vistorias já abertas (elas guardam a cópia do dia).
import { useState } from 'react'
import { salvarModeloFvs } from '../lib/dados.js'
import { CATEGORIAS_FVS, GRUPOS_FVS_SUGERIDOS, numerarItens, validarModelo } from '../lib/qualidade.js'
import { Sheet, avisar } from '../components/index.jsx'

const grupoVazio = () => ({ nome: '', itens: [{ titulo: '' }] })

export function FormFicha({ atual, nomesOutras, onFechar, onSalvo }) {
  const [f, setF] = useState(atual
    ? { nome: atual.nome, categoria: atual.categoria, grupos: atual.grupos.map((g) => ({ nome: g.nome, itens: g.itens.map((it) => ({ ...it })) })) }
    : { nome: '', categoria: '', grupos: [{ nome: GRUPOS_FVS_SUGERIDOS[0], itens: [{ titulo: '' }] }] })
  const [tocado, setTocado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const erros = tocado ? validarModelo(f, nomesOutras) : {}
  const grupos = (fn) => setF((x) => ({ ...x, grupos: fn(x.grupos) }))
  const mudarGrupo = (gi, mudanca) => grupos((gs) => gs.map((g, j) => (j === gi ? { ...g, ...mudanca } : g)))
  const mudarItem = (gi, ii, titulo) => grupos((gs) => gs.map((g, j) => (j === gi ? { ...g, itens: g.itens.map((it, k) => (k === ii ? { ...it, titulo } : it)) } : g)))
  function tirarItem(gi, ii) {
    if (f.grupos[gi].itens[ii].titulo.trim() && !window.confirm('Tirar este item da ficha?')) return
    grupos((gs) => gs.map((g, j) => (j === gi ? { ...g, itens: g.itens.filter((_, k) => k !== ii) } : g)))
  }
  function tirarGrupo(gi) {
    if (f.grupos[gi].itens.some((it) => it.titulo.trim()) && !window.confirm(`Tirar o grupo "${f.grupos[gi].nome || 'sem nome'}" e os itens dele?`)) return
    grupos((gs) => gs.filter((_, j) => j !== gi))
  }
  async function salvar() {
    setTocado(true)
    if (Object.keys(validarModelo(f, nomesOutras)).length) return
    setSalvando(true)
    const r = await salvarModeloFvs({ id: atual?.id, ...f })
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar(atual ? `${r.data.codigo} salva (versão ${r.data.versao}).` : `Ficha ${r.data.codigo} criada.`)
    onSalvo()
  }
  return (
    <Sheet cheia titulo={atual ? `Editar ${atual.codigo}` : 'Nova ficha de verificação'} subtitulo={atual ? `Versão ${atual.versao}; salvar cria a versão ${atual.versao + 1}` : 'FVS'} onFechar={onFechar}>
      <div className="sheet-b">
        <div className="form-grid">
          <label className="field"><span>Nome da ficha</span>
            <input className="ipt" value={f.nome} aria-invalid={!!erros.nome} placeholder="Ex.: Impermeabilização — Áreas Molhadas" onChange={(e) => setF({ ...f, nome: e.target.value })} />
            {erros.nome && <span className="erro">{erros.nome}</span>}
          </label>
          <label className="field"><span>Categoria</span>
            <select className="ipt" value={f.categoria} aria-invalid={!!erros.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })}>
              <option value="">Escolha a categoria</option>
              {CATEGORIAS_FVS.map((c) => <option key={c}>{c}</option>)}
            </select>
            {erros.categoria && <span className="erro">{erros.categoria}</span>}
          </label>
        </div>
        <datalist id="grupos-fvs">{GRUPOS_FVS_SUGERIDOS.map((g) => <option key={g} value={g} />)}</datalist>
        {f.grupos.map((g, gi) => (
          <section key={gi} className="card card-b fvs-form-grupo">
            <div className="fvs-form-linha">
              <b>{gi + 1}.</b>
              <input className="ipt" list="grupos-fvs" value={g.nome} aria-label={`Nome do grupo ${gi + 1}`} aria-invalid={!!erros[`grupo${gi}`] && !g.nome.trim()} placeholder="Nome do grupo (ex.: Execução)" onChange={(e) => mudarGrupo(gi, { nome: e.target.value })} />
              <button className="remover" aria-label={`Tirar o grupo ${gi + 1}`} onClick={() => tirarGrupo(gi)}>✕</button>
            </div>
            {g.itens.map((it, ii) => (
              <div key={ii} className="fvs-form-linha item">
                <span className="obs">{gi + 1}.{ii + 1}</span>
                <input className="ipt" value={it.titulo} aria-label={`Item ${gi + 1}.${ii + 1}`} placeholder="O que se confere (ex.: Primer aplicado em toda a área)" onChange={(e) => mudarItem(gi, ii, e.target.value)} />
                <button className="remover" aria-label={`Tirar o item ${gi + 1}.${ii + 1}`} onClick={() => tirarItem(gi, ii)}>✕</button>
              </div>
            ))}
            {erros[`grupo${gi}`] && <span className="erro">{erros[`grupo${gi}`]}</span>}
            <button className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => mudarGrupo(gi, { itens: [...g.itens, { titulo: '' }] })}>＋ Item</button>
          </section>
        ))}
        {erros.grupos && <span className="erro">{erros.grupos}</span>}
        <button className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => grupos((gs) => [...gs, grupoVazio()])}>＋ Grupo</button>
        <div className="btns" style={{ marginTop: 6 }}>
          <button className="btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : atual ? 'Salvar nova versão' : 'Criar ficha'}</button>
          <button className="btn ghost" onClick={onFechar}>Cancelar</button>
        </div>
      </div>
    </Sheet>
  )
}

export default function Fichas({ fichas, edita, onNova, onEditar }) {
  return (
    <>
      {edita && <button className="btn dark" style={{ alignSelf: 'flex-start' }} onClick={onNova}>＋ Nova ficha</button>}
      {fichas.length ? (
        <div className="qual-grid">
          {fichas.map((m) => {
            const itens = numerarItens(m.grupos)
            return (
              <section key={m.id} className="card card-b fvs-ficha">
                <div className="qual-card-h"><b>{m.codigo}</b><span className="pill soft">{m.categoria}</span></div>
                <div className="qual-desc">{m.nome}</div>
                <div className="curto-info">Versão {m.versao}; {m.grupos.length} {m.grupos.length === 1 ? 'grupo' : 'grupos'}, {itens.length} itens</div>
                <details>
                  <summary>Ver os itens</summary>
                  <ol className="fvs-ficha-itens">{itens.map((it) => <li key={it.id}><b>{it.numero}</b> {it.titulo}</li>)}</ol>
                </details>
                {edita && <button className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => onEditar(m)}>Editar</button>}
              </section>
            )
          })}
        </div>
      ) : <section className="card empty" style={{ padding: 24 }}><p>Nenhuma ficha nesta obra.{edita ? ' Crie a primeira.' : ''}</p></section>}
    </>
  )
}
