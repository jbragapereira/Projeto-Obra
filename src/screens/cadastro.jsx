// Módulo Cadastro: tudo o que a obra cadastra fica aqui, e só aqui (o Diário, o Kanban e a medição de
// empreiteiros só escolhem da lista). Abas: Responsáveis (empreiteiro, empresa especializada ou mão de obra
// própria — o empreiteiro é um responsável, sem aba própria), Funções e Equipamentos.
// Engenheiro cadastra; diretoria vê.
import { useState } from 'react'
import { juntar, listarEquipamentos, listarFuncoes, listarResponsaveis, salvarEquipamento, salvarFuncao, salvarResponsavel } from '../lib/dados.js'
import { podeEditar, veCadastro } from '../lib/perfis.js'
import { PROPRIEDADES_EQUIPAMENTO, TIPOS_RESPONSAVEL, validarEquipamento } from '../lib/obras.js'
import { Carregando, ErroCarga, Faixa, Meta, Vazio, avisar, useDados } from '../components/index.jsx'

const carregar = () => juntar({ responsaveis: listarResponsaveis(), funcoes: listarFuncoes(), equipamentos: listarEquipamentos() })
const ABAS = [
  { id: 'responsaveis', rotulo: 'Responsáveis' },
  { id: 'funcoes', rotulo: 'Funções' },
  { id: 'equipamentos', rotulo: 'Equipamentos' },
]

function Responsaveis({ responsaveis, edita, onSalvo }) {
  const vazio = { nome: '', tipo: TIPOS_RESPONSAVEL[0], contato: '' }
  const [novo, setNovo] = useState(vazio)
  const [tocado, setTocado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const erroNome = tocado && !novo.nome.trim() ? 'Informe o nome.' : null
  async function salvar() {
    setTocado(true)
    if (!novo.nome.trim()) return
    setSalvando(true)
    const r = await salvarResponsavel(novo)
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar(`${r.data.nome} cadastrado.`)
    setNovo(vazio)
    setTocado(false)
    onSalvo()
  }
  return (
    <>
      {edita && (
        <section className="card card-b">
          <div className="sec-t" style={{ padding: '0 0 10px' }}>Novo responsável</div>
          <div className="form-grid">
            <label className="field"><span>Nome</span>
              <input className="ipt" value={novo.nome} aria-invalid={!!erroNome} placeholder="Ex.: Empreiteira Silva & Filhos" onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
              {erroNome && <span className="erro">{erroNome}</span>}
            </label>
            <label className="field"><span>Tipo</span>
              <select className="ipt" value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value })}>{TIPOS_RESPONSAVEL.map((t) => <option key={t}>{t}</option>)}</select>
            </label>
            <label className="field"><span>Contato</span><input className="ipt" value={novo.contato} placeholder="Telefone ou e-mail" onChange={(e) => setNovo({ ...novo, contato: e.target.value })} /></label>
          </div>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Cadastrar responsável'}</button>
        </section>
      )}
      <section className="card">
        <div className="card-h"><span className="rotulo">{responsaveis.length} {responsaveis.length === 1 ? 'responsável' : 'responsáveis'} nesta obra</span></div>
        {responsaveis.length ? (
          <ul className="rows">
            {responsaveis.map((r) => (
              <li key={r.id}><div className="row"><div className="main-c">
                <div className="t">{r.nome}</div><Meta>{r.tipo}{r.contato}</Meta>
              </div></div></li>
            ))}
          </ul>
        ) : <div className="empty" style={{ padding: 24 }}><p>Nenhum responsável cadastrado nesta obra.{edita ? ' Cadastre o primeiro acima.' : ''}</p></div>}
      </section>
    </>
  )
}

function Funcoes({ funcoes, edita, onSalvo }) {
  const [nome, setNome] = useState('')
  const [tocado, setTocado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const erroNome = tocado && !nome.trim() ? 'Informe o nome da função.' : null
  async function salvar() {
    setTocado(true)
    if (!nome.trim()) return
    setSalvando(true)
    const r = await salvarFuncao({ nome })
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar(`Função ${r.data.nome} cadastrada.`)
    setNome('')
    setTocado(false)
    onSalvo()
  }
  return (
    <section className="card">
      <div className="card-h"><span className="rotulo">{funcoes.length} {funcoes.length === 1 ? 'função' : 'funções'} nesta obra</span></div>
      {edita && (
        <div className="card-b" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: '1 1 220px' }}><span>Nova função</span>
            <input className="ipt" value={nome} aria-invalid={!!erroNome} placeholder="Ex.: Armador, Gesseiro, Operador de betoneira" onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') salvar() }} />
            {erroNome && <span className="erro">{erroNome}</span>}
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

function Equipamentos({ equipamentos, edita, onSalvo }) {
  const vazio = { nome: '', propriedade: PROPRIEDADES_EQUIPAMENTO[0], fornecedor: '', identificacao: '' }
  const [novo, setNovo] = useState(vazio)
  const [tocado, setTocado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const erros = tocado ? validarEquipamento(novo, equipamentos.map((x) => x.nome)) : {}
  async function salvar() {
    setTocado(true)
    if (Object.keys(validarEquipamento(novo, equipamentos.map((x) => x.nome))).length) return
    setSalvando(true)
    const r = await salvarEquipamento(novo)
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar(`${r.data.nome} cadastrado.`)
    setNovo(vazio)
    setTocado(false)
    onSalvo()
  }
  return (
    <>
      {edita && (
        <section className="card card-b">
          <div className="sec-t" style={{ padding: '0 0 10px' }}>Novo equipamento</div>
          <div className="form-grid">
            <label className="field"><span>Nome</span>
              <input className="ipt" value={novo.nome} aria-invalid={!!erros.nome} placeholder="Ex.: Betoneira 400 L" onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
              {erros.nome && <span className="erro">{erros.nome}</span>}
            </label>
            <label className="field"><span>Próprio ou locado</span>
              <select className="ipt" value={novo.propriedade} onChange={(e) => setNovo({ ...novo, propriedade: e.target.value })}>{PROPRIEDADES_EQUIPAMENTO.map((p) => <option key={p}>{p}</option>)}</select>
            </label>
            {novo.propriedade === 'Locado' && (
              <label className="field"><span>Locado de</span>
                <input className="ipt" value={novo.fornecedor} aria-invalid={!!erros.fornecedor} placeholder="Ex.: Locaforte Andaimes" onChange={(e) => setNovo({ ...novo, fornecedor: e.target.value })} />
                {erros.fornecedor && <span className="erro">{erros.fornecedor}</span>}
              </label>
            )}
            <label className="field"><span>Identificação (opcional)</span>
              <input className="ipt" value={novo.identificacao} placeholder="Placa, série ou patrimônio" onChange={(e) => setNovo({ ...novo, identificacao: e.target.value })} />
            </label>
          </div>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Cadastrar equipamento'}</button>
        </section>
      )}
      <section className="card">
        <div className="card-h"><span className="rotulo">{equipamentos.length} {equipamentos.length === 1 ? 'equipamento' : 'equipamentos'} nesta obra</span></div>
        {equipamentos.length ? (
          <ul className="rows">
            {equipamentos.map((x) => (
              <li key={x.id}><div className="row"><div className="main-c">
                <div className="t">{x.nome}</div><Meta>{x.propriedade}{x.fornecedor}{x.identificacao}</Meta>
              </div></div></li>
            ))}
          </ul>
        ) : <div className="empty" style={{ padding: 24 }}><p>Nenhum equipamento cadastrado nesta obra.{edita ? ' Cadastre o primeiro acima.' : ''}</p></div>}
      </section>
    </>
  )
}

export default function Cadastro({ profile }) {
  const { data, erro, carregando, recarregar } = useDados(carregar)
  const [aba, setAba] = useState('responsaveis')
  if (!veCadastro(profile.role)) {
    return <div className="view"><Vazio titulo="O cadastro é do engenheiro e da diretoria" texto="Seu perfil escolhe responsáveis, funções e equipamentos nas listas de cada tela." /></div>
  }
  const edita = podeEditar(profile.role)
  return (
    <>
      <Faixa>
        <div className="tabs" role="tablist" aria-label="Cadastro">
          {ABAS.map((a) => <button key={a.id} className="tab" role="tab" aria-selected={aba === a.id} onClick={() => setAba(a.id)}>{a.rotulo}</button>)}
        </div>
      </Faixa>
      {carregando ? <Carregando /> : erro ? <ErroCarga erro={erro} onTentar={recarregar} /> : (
        <div className="view">
          {aba === 'responsaveis' && <Responsaveis responsaveis={data.responsaveis} edita={edita} onSalvo={recarregar} />}
          {aba === 'funcoes' && <Funcoes funcoes={data.funcoes} edita={edita} onSalvo={recarregar} />}
          {aba === 'equipamentos' && <Equipamentos equipamentos={data.equipamentos} edita={edita} onSalvo={recarregar} />}
        </div>
      )}
    </>
  )
}
