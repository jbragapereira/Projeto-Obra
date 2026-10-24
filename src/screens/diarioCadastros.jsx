// Aba "Responsáveis e funções" do Diário: o cadastro que alimenta o efetivo do dia.
// Só o engenheiro cadastra; os outros perfis só veem.
import { useState } from 'react'
import { juntar, listarFuncoes, listarResponsaveis, salvarFuncao, salvarResponsavel } from '../lib/dados.js'
import { podeEditar } from '../lib/perfis.js'
import { TIPOS_RESPONSAVEL as TIPOS } from '../lib/obras.js'
import { Carregando, ErroCarga, Meta, avisar, useDados } from '../components/index.jsx'

const carregar = () => juntar({ responsaveis: listarResponsaveis(), funcoes: listarFuncoes() })

function Responsaveis({ responsaveis, edita, onSalvo }) {
  const [novo, setNovo] = useState({ nome: '', tipo: TIPOS[0], contato: '' })
  const [salvando, setSalvando] = useState(false)
  async function salvar() {
    setSalvando(true)
    const r = await salvarResponsavel(novo)
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar(`${r.data.nome} cadastrado.`)
    setNovo({ nome: '', tipo: TIPOS[0], contato: '' })
    onSalvo()
  }
  return (
    <>
      {edita && (
        <section className="card card-b">
          <div className="sec-t" style={{ padding: '0 0 10px' }}>Novo responsável</div>
          <div className="form-grid">
            <label className="field"><span>Nome</span><input className="ipt" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></label>
            <label className="field"><span>Tipo</span>
              <select className="ipt" value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value })}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
            </label>
            <label className="field"><span>Contato</span><input className="ipt" value={novo.contato} placeholder="Telefone ou e-mail" onChange={(e) => setNovo({ ...novo, contato: e.target.value })} /></label>
          </div>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Cadastrar responsável'}</button>
        </section>
      )}
      <section className="card">
        <div className="card-h"><span className="rotulo">{responsaveis.length} responsáveis nesta obra</span></div>
        {responsaveis.length ? (
          <ul className="rows">
            {responsaveis.map((r) => (
              <li key={r.id}><div className="row"><div className="main-c">
                <div className="t">{r.nome}</div><Meta>{r.tipo}{r.contato}</Meta>
              </div></div></li>
            ))}
          </ul>
        ) : <div className="empty" style={{ padding: 24 }}><p>Nenhum responsável cadastrado nesta obra.</p></div>}
      </section>
    </>
  )
}

function Funcoes({ funcoes, edita, onSalvo }) {
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)
  async function salvar() {
    setSalvando(true)
    const r = await salvarFuncao({ nome })
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar(`Função ${r.data.nome} cadastrada.`)
    setNome('')
    onSalvo()
  }
  return (
    <section className="card">
      <div className="card-h"><span className="rotulo">{funcoes.length} funções nesta obra</span></div>
      {edita && (
        <div className="card-b" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: '1 1 220px' }}><span>Nova função</span>
            <input className="ipt" value={nome} placeholder="Ex.: Armador" onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') salvar() }} />
          </label>
          <button className="btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Cadastrar função'}</button>
        </div>
      )}
      <ul className="rows">
        {funcoes.map((f) => <li key={f.id}><div className="row"><div className="main-c"><div className="t">{f.nome}</div></div></div></li>)}
      </ul>
    </section>
  )
}

export default function DiarioCadastros({ profile, onMudou }) {
  const { data, erro, carregando, recarregar } = useDados(carregar)
  if (carregando) return <Carregando />
  if (erro) return <ErroCarga erro={erro} onTentar={recarregar} />
  const edita = podeEditar(profile.role)
  const salvo = () => { recarregar(); onMudou() }
  return (
    <div className="view">
      <Responsaveis responsaveis={data.responsaveis} edita={edita} onSalvo={salvo} />
      <Funcoes funcoes={data.funcoes} edita={edita} onSalvo={salvo} />
    </div>
  )
}
