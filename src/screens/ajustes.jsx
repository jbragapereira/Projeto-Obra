// Ajustes (só engenheiro): cadastrar e editar OBRAS, e liberar pessoas.
// Abrir obra nova é tela, não comando no banco: o engenheiro faz sozinho.
import { useState } from 'react'
import { juntar, listarMinhasObras, listarPessoas, liberarPessoa, salvarObra } from '../lib/dados.js'
import { useObra } from '../lib/ObraContext.jsx'
import { OBRA_VAZIA, SITUACOES_OBRA } from '../lib/obras.js'
import { ROLES, podeEditar } from '../lib/perfis.js'
import { dmy } from '../lib/datas.js'
import { Carregando, ErroCarga, Faixa, Meta, Vazio, avisar, useDados } from '../components/index.jsx'

const COR_OBRA = { 'Em andamento': 'ok', 'Parada': 'red', 'Concluída': 'done' }

function Campo({ rotulo, erro, children }) {
  return <label className="field"><span>{rotulo}</span>{children}{erro && <span className="erro">{erro}</span>}</label>
}

function FormObra({ inicial, onCancelar, onSalvo }) {
  const [o, setO] = useState(inicial)
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)
  const set = (campo) => (e) => setO({ ...o, [campo]: e.target.value })
  async function salvar() {
    setSalvando(true)
    const r = await salvarObra(o)
    setSalvando(false)
    if (r.erro) { setErros(r.erros ?? {}); avisar(r.erro); return }
    avisar(o.id ? 'Obra atualizada.' : `Obra ${r.data.codigo} cadastrada.`)
    onSalvo(r.data)
  }
  const ipt = (campo, props = {}) => (
    <input className="ipt" value={o[campo] ?? ''} onChange={set(campo)} aria-invalid={!!erros[campo]} {...props} />
  )
  return (
    <section className="card card-b">
      <div className="sec-t" style={{ padding: '0 0 10px' }}>{o.id ? 'Editar obra' : 'Nova obra'}</div>
      <div className="form-grid">
        <Campo rotulo="Nome da obra" erro={erros.nome}>{ipt('nome', { placeholder: 'Ex.: Reforma da Escola Municipal…' })}</Campo>
        <Campo rotulo="Código / apelido" erro={erros.codigo}>{ipt('codigo', { placeholder: 'Ex.: INSS-045' })}</Campo>
        <Campo rotulo="Cliente" erro={erros.cliente}>{ipt('cliente', { placeholder: 'Órgão contratante' })}</Campo>
        <Campo rotulo="Endereço" erro={erros.endereco}>{ipt('endereco')}</Campo>
        <Campo rotulo="Nº do contrato (opcional)">{ipt('numero_contrato')}</Campo>
        <Campo rotulo="Data de início" erro={erros.data_inicio}>{ipt('data_inicio', { type: 'date' })}</Campo>
        <Campo rotulo="Data-meta de entrega" erro={erros.data_entrega}>{ipt('data_entrega', { type: 'date' })}</Campo>
        <Campo rotulo="Situação" erro={erros.situacao}>
          <select className="ipt" value={o.situacao} onChange={set('situacao')}>{SITUACOES_OBRA.map((s) => <option key={s}>{s}</option>)}</select>
        </Campo>
      </div>
      <div className="btns" style={{ marginTop: 12 }}>
        <button className="btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar obra'}</button>
        <button className="btn ghost" onClick={onCancelar}>Cancelar</button>
      </div>
    </section>
  )
}

function Liberar({ pessoa, obras, onCancelar, onSalvo }) {
  const [role, setRole] = useState(pessoa.role === 'Aguardando liberação' ? 'Equipe da obra' : pessoa.role)
  const [cargo, setCargo] = useState(pessoa.cargo ?? '')
  const [obraIds, setObraIds] = useState(pessoa.obra_ids)
  const umaSo = role === 'Equipe da obra' || role === 'Fiscalização'
  const marcar = (id) => setObraIds(umaSo ? [id] : obraIds.includes(id) ? obraIds.filter((x) => x !== id) : [...obraIds, id])
  async function salvar() {
    const r = await liberarPessoa(pessoa.id, { role, cargo, obraIds: role === 'Diretoria' ? [] : obraIds })
    if (r.erro) { avisar(r.erro); return }
    avisar(`${pessoa.nome} liberado como ${role}.`)
    onSalvo()
  }
  return (
    <section className="card card-b">
      <div className="sec-t" style={{ padding: '0 0 10px' }}>Liberar {pessoa.nome}</div>
      <div className="form-grid">
        <Campo rotulo="Perfil">
          <select className="ipt" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.filter((r) => r !== 'Aguardando liberação').map((r) => <option key={r}>{r}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Cargo (só para exibir)"><input className="ipt" value={cargo} placeholder="Ex.: Encarregado" onChange={(e) => setCargo(e.target.value)} /></Campo>
      </div>
      {role === 'Diretoria' ? (
        <p style={{ marginTop: 10, color: 'var(--slate)' }}>A Diretoria vê todas as obras da empresa, uma de cada vez pelo seletor.</p>
      ) : (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 600 }}>{umaSo ? 'Obra (uma por vez)' : 'Obras'}</div>
          {obras.map((o) => (
            <label key={o.id} className="check">
              <input type={umaSo ? 'radio' : 'checkbox'} name="obras-liberar" checked={obraIds.includes(o.id)} onChange={() => marcar(o.id)} />
              {o.nome} ({o.codigo})
            </label>
          ))}
        </div>
      )}
      <div className="btns" style={{ marginTop: 12 }}>
        <button className="btn primary" onClick={salvar}>Salvar liberação</button>
        <button className="btn ghost" onClick={onCancelar}>Cancelar</button>
      </div>
    </section>
  )
}

export default function Ajustes({ profile }) {
  const { recarregarObras } = useObra()
  const { data, erro, carregando, recarregar } = useDados(() => juntar({ obras: listarMinhasObras(), pessoas: listarPessoas() }))
  const [editando, setEditando] = useState(null) // obra em edição (ou OBRA_VAZIA)
  const [liberando, setLiberando] = useState(null)

  if (!podeEditar(profile.role)) return <div className="view"><Vazio titulo="Ajustes é do engenheiro" texto="Só o engenheiro cadastra obras e libera pessoas." /></div>
  if (carregando) return <Carregando />
  if (erro) return <ErroCarga erro={erro} onTentar={recarregar} />

  const { obras, pessoas } = data
  const nomeObra = Object.fromEntries(obras.map((o) => [o.id, o.codigo]))
  const aguardando = pessoas.filter((p) => p.role === 'Aguardando liberação')
  const liberadas = pessoas.filter((p) => p.role !== 'Aguardando liberação' && p.id !== profile.id)

  return (
    <>
      <Faixa><div className="faixa-titulo">Obras e pessoas</div></Faixa>
      <div className="view">
        {editando ? (
          <FormObra inicial={editando} onCancelar={() => setEditando(null)}
            onSalvo={(obra) => { setEditando(null); recarregar(); recarregarObras(editando.id ? undefined : obra.id) }} />
        ) : (
          <section className="card">
            <div className="card-h">
              <span className="rotulo">{obras.length} obras</span>
              <button className="link" onClick={() => setEditando(OBRA_VAZIA)}>＋ Nova obra</button>
            </div>
            {obras.length ? (
              <ul className="rows">
                {obras.map((o) => (
                  <li key={o.id}><button className="row" onClick={() => setEditando(o)}>
                    <div className="main-c">
                      <div className="t">{o.nome}</div>
                      <Meta><span className="cod">{o.codigo}</span>{o.cliente}{`${dmy(o.data_inicio)} a ${dmy(o.data_entrega)}`}</Meta>
                      {o.endereco && <div style={{ fontSize: 14, color: 'var(--slate)', marginTop: 2 }}>{o.endereco}</div>}
                    </div>
                    <span className={`pill ${COR_OBRA[o.situacao]}`}>{o.situacao}</span>
                  </button></li>
                ))}
              </ul>
            ) : (
              <Vazio icone="obra" titulo="Nenhuma obra cadastrada" texto="Cadastre a primeira obra para começar a lançar." acao="Cadastrar a primeira obra" onAcao={() => setEditando(OBRA_VAZIA)} />
            )}
          </section>
        )}

        {liberando ? (
          <Liberar pessoa={liberando} obras={obras} onCancelar={() => setLiberando(null)} onSalvo={() => { setLiberando(null); recarregar() }} />
        ) : (
          <>
            <section className="card">
              <div className="card-h"><span className="rotulo">Aguardando liberação ({aguardando.length})</span></div>
              {aguardando.length ? (
                <ul className="rows">
                  {aguardando.map((p) => (
                    <li key={p.id}><button className="row" onClick={() => setLiberando(p)}>
                      <div className="main-c"><div className="t">{p.nome}</div><div className="m">{p.email}</div></div>
                      <span className="pill amber">Liberar</span>
                    </button></li>
                  ))}
                </ul>
              ) : <div className="empty" style={{ padding: 20 }}><p>Ninguém aguardando liberação.</p></div>}
            </section>
            <section className="card">
              <div className="card-h"><span className="rotulo">Pessoas liberadas ({liberadas.length})</span></div>
              <ul className="rows">
                {liberadas.map((p) => (
                  <li key={p.id}><button className="row" onClick={() => setLiberando(p)}>
                    <div className="main-c">
                      <div className="t">{p.nome}</div>
                      <Meta>{p.role}{p.cargo}{p.role === 'Diretoria' ? 'Todas as obras' : p.obra_ids.map((id) => nomeObra[id] ?? '—').join(', ') || 'Sem obra'}</Meta>
                    </div>
                    <span className="pill soft">Editar</span>
                  </button></li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </>
  )
}
