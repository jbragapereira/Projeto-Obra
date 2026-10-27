// Módulo Cadastro: tudo o que a obra cadastra fica aqui, e só aqui (o Diário, o Kanban e a medição de
// empreiteiros só escolhem da lista). Abas: Responsáveis (empreiteiro, empresa especializada ou mão de obra
// própria — o empreiteiro é um responsável, sem aba própria), Funções, Equipamentos e Materiais (o catálogo
// dos pedidos de material).
// Engenheiro cadastra, cancela e reativa (cancelar não apaga: sai das listas de escolha, fica no histórico);
// diretoria vê.
import { useState } from 'react'
import {
  cancelarCadastro, juntar, listarCategoriasMaterial, listarEquipamentos, listarFuncoes, listarMateriais, listarResponsaveis, salvarCategoriaMaterial,
  reativarCadastro, salvarEquipamento, salvarFuncao, salvarMaterial, salvarResponsavel,
} from '../lib/dados.js'
import { separar } from '../lib/cadastros.js'
import { CORES_CATEGORIA, classeDaCor, validarCategoria, validarMaterial } from '../lib/materiais.js'
import { podeEditar, veCadastro } from '../lib/perfis.js'
import { PROPRIEDADES_EQUIPAMENTO, TIPOS_RESPONSAVEL, validarEquipamento } from '../lib/obras.js'
import { Carregando, ErroCarga, Faixa, Meta, Vazio, avisar, useDados } from '../components/index.jsx'

const todos = { comCancelados: true }
const carregar = () => juntar({
  responsaveis: listarResponsaveis(), funcoes: listarFuncoes(todos), equipamentos: listarEquipamentos(todos),
  materiais: listarMateriais(todos), categorias: listarCategoriasMaterial(todos),
})

async function cancelar(tabela, item, onMudou) {
  if (!window.confirm(`Cancelar o cadastro de ${item.nome}?\n\nEle sai das listas de escolha, mas continua no histórico. Dá para reativar depois.`)) return
  const r = await cancelarCadastro(tabela, item.id)
  if (r.erro) { avisar(r.erro); return }
  avisar(`${item.nome}: cadastro cancelado.`)
  onMudou()
}
async function reativar(tabela, item, onMudou) {
  const r = await reativarCadastro(tabela, item.id)
  if (r.erro) { avisar(r.erro); return }
  avisar(`${item.nome}: reativado.`)
  onMudou()
}

// Botão da linha (só o engenheiro).
function BotaoCancelar({ tabela, item, edita, onMudou }) {
  if (!edita) return null
  return <button className="btn ghost cad-acao" aria-label={`Cancelar o cadastro de ${item.nome}`} onClick={() => cancelar(tabela, item, onMudou)}>Cancelar</button>
}

// Os cancelados, recolhidos no fim da lista, com Reativar.
function Cancelados({ tabela, itens, edita, onMudou, detalhe }) {
  if (!itens.length) return null
  return (
    <details className="cad-cancelados">
      <summary>Cancelados ({itens.length})</summary>
      <ul className="rows">
        {itens.map((x) => (
          <li key={x.id}><div className="row"><div className="main-c">
            <div className="t">{x.nome}</div>{detalhe?.(x)}
          </div>{edita && <button className="btn ghost cad-acao" aria-label={`Reativar ${x.nome}`} onClick={() => reativar(tabela, x, onMudou)}>Reativar</button>}</div></li>
        ))}
      </ul>
    </details>
  )
}
const ABAS = [
  { id: 'responsaveis', rotulo: 'Responsáveis' },
  { id: 'funcoes', rotulo: 'Funções' },
  { id: 'equipamentos', rotulo: 'Equipamentos' },
  { id: 'materiais', rotulo: 'Materiais' },
]

function Responsaveis({ responsaveis: todosResp, edita, onSalvo }) {
  const { ativos: responsaveis, cancelados } = separar(todosResp)
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
              </div><BotaoCancelar tabela="responsaveis" item={r} edita={edita} onMudou={onSalvo} /></div></li>
            ))}
          </ul>
        ) : <div className="empty" style={{ padding: 24 }}><p>Nenhum responsável cadastrado nesta obra.{edita ? ' Cadastre o primeiro acima.' : ''}</p></div>}
        <Cancelados tabela="responsaveis" itens={cancelados} edita={edita} onMudou={onSalvo} detalhe={(r) => <Meta>{r.tipo}</Meta>} />
      </section>
    </>
  )
}

function Funcoes({ funcoes: todasFuncoes, edita, onSalvo }) {
  const { ativos: funcoes, cancelados } = separar(todasFuncoes)
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
        {funcoes.map((f) => <li key={f.id}><div className="row"><div className="main-c"><div className="t">{f.nome}</div></div><BotaoCancelar tabela="funcoes" item={f} edita={edita} onMudou={onSalvo} /></div></li>)}
      </ul>
      <Cancelados tabela="funcoes" itens={cancelados} edita={edita} onMudou={onSalvo} />
    </section>
  )
}

function Equipamentos({ equipamentos: todosEq, edita, onSalvo }) {
  const { ativos: equipamentos, cancelados } = separar(todosEq)
  const vazio = { nome: '', propriedade: PROPRIEDADES_EQUIPAMENTO[0], fornecedor: '', identificacao: '' }
  const [novo, setNovo] = useState(vazio)
  const [tocado, setTocado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const erros = tocado ? validarEquipamento(novo, todosEq.map((x) => x.nome)) : {}
  async function salvar() {
    setTocado(true)
    if (Object.keys(validarEquipamento(novo, todosEq.map((x) => x.nome))).length) return
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
              </div><BotaoCancelar tabela="equipamentos" item={x} edita={edita} onMudou={onSalvo} /></div></li>
            ))}
          </ul>
        ) : <div className="empty" style={{ padding: 24 }}><p>Nenhum equipamento cadastrado nesta obra.{edita ? ' Cadastre o primeiro acima.' : ''}</p></div>}
        <Cancelados tabela="equipamentos" itens={cancelados} edita={edita} onMudou={onSalvo} detalhe={(x) => <Meta>{x.propriedade}{x.fornecedor}</Meta>} />
      </section>
    </>
  )
}

function Categorias({ categorias: todasCat, materiais, edita, onSalvo }) {
  const { ativos: categorias, cancelados } = separar(todasCat)
  const vazio = { nome: '', cor: CORES_CATEGORIA[0] }
  const [nova, setNova] = useState(vazio)
  const [tocado, setTocado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const nomes = todasCat.map((c) => c.nome)
  const erros = tocado ? validarCategoria(nova, nomes) : {}
  const emUso = (c) => materiais.filter((m) => m.ativo && m.categoria_id === c.id).length
  async function salvar() {
    setTocado(true)
    if (Object.keys(validarCategoria(nova, nomes)).length) return
    setSalvando(true)
    const r = await salvarCategoriaMaterial(nova)
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar(`Categoria ${r.data.nome} cadastrada.`)
    setNova(vazio)
    setTocado(false)
    onSalvo()
  }
  return (
    <section className="card">
      <div className="card-h"><span className="rotulo">{categorias.length} {categorias.length === 1 ? 'categoria' : 'categorias'} de material</span></div>
      {edita && (
        <div className="card-b" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="field" style={{ flex: '1 1 220px' }}><span>Nova categoria</span>
            <input className="ipt" value={nova.nome} aria-invalid={!!erros.nome} placeholder="Ex.: Impermeabilização, Esquadrias" onChange={(e) => setNova({ ...nova, nome: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') salvar() }} />
            {erros.nome && <span className="erro">{erros.nome}</span>}
          </label>
          <label className="field" style={{ flex: '0 1 160px' }}><span>Cor da etiqueta</span>
            <select className="ipt" value={nova.cor} onChange={(e) => setNova({ ...nova, cor: e.target.value })}>{CORES_CATEGORIA.map((c) => <option key={c}>{c}</option>)}</select>
          </label>
          <span className={`pill ${classeDaCor(nova.cor)}`} style={{ alignSelf: 'center' }}>{nova.nome.trim() || 'Prévia'}</span>
          <button className="btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Cadastrar categoria'}</button>
        </div>
      )}
      <ul className="rows">
        {categorias.map((c) => (
          <li key={c.id}><div className="row"><div className="main-c">
            <div className="curto-marcas" style={{ marginTop: 0 }}><span className={`pill ${classeDaCor(c.cor)}`}>{c.nome}</span><span className="obs" style={{ fontSize: 13 }}>{emUso(c) === 1 ? '1 material' : `${emUso(c)} materiais`}</span></div>
          </div><BotaoCancelar tabela="categoriasMaterial" item={c} edita={edita} onMudou={onSalvo} /></div></li>
        ))}
      </ul>
      <Cancelados tabela="categoriasMaterial" itens={cancelados} edita={edita} onMudou={onSalvo} />
    </section>
  )
}

function Materiais({ materiais: todosMat, categorias: todasCat, edita, onSalvo }) {
  const { ativos: materiais, cancelados } = separar(todosMat)
  const categorias = separar(todasCat).ativos
  const vazio = { nome: '', unidade: '', categoria_id: '' }
  const [novo, setNovo] = useState(vazio)
  const [tocado, setTocado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const nomes = todosMat.map((m) => m.nome)
  const idsCategorias = categorias.map((c) => c.id)
  const erros = tocado ? validarMaterial(novo, nomes, idsCategorias) : {}
  async function salvar() {
    setTocado(true)
    if (Object.keys(validarMaterial(novo, nomes, idsCategorias)).length) return
    setSalvando(true)
    const r = await salvarMaterial(novo)
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
          <div className="sec-t" style={{ padding: '0 0 10px' }}>Novo material</div>
          <div className="form-grid">
            <label className="field"><span>Nome</span>
              <input className="ipt" value={novo.nome} aria-invalid={!!erros.nome} placeholder="Ex.: Cimento CP-II 50 kg" onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
              {erros.nome && <span className="erro">{erros.nome}</span>}
            </label>
            <label className="field"><span>Unidade</span>
              <input className="ipt" value={novo.unidade} aria-invalid={!!erros.unidade} placeholder="Ex.: saco, m³, barra" onChange={(e) => setNovo({ ...novo, unidade: e.target.value })} />
              {erros.unidade && <span className="erro">{erros.unidade}</span>}
            </label>
            <label className="field"><span>Categoria</span>
              <select className="ipt" value={novo.categoria_id} aria-invalid={!!erros.categoria_id} onChange={(e) => setNovo({ ...novo, categoria_id: e.target.value })}>
                <option value="">Escolha a categoria</option>
                {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              {erros.categoria_id && <span className="erro">{erros.categoria_id}</span>}
            </label>
          </div>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Cadastrar material'}</button>
        </section>
      )}
      <section className="card">
        <div className="card-h"><span className="rotulo">{materiais.length} {materiais.length === 1 ? 'material' : 'materiais'} nesta obra</span></div>
        {materiais.length ? (
          <ul className="rows">
            {materiais.map((m) => (
              <li key={m.id}><div className="row"><div className="main-c">
                <div className="t">{m.nome}</div>
                <div className="curto-marcas">{m.categoria && <span className={`pill ${classeDaCor(m.cor)}`}>{m.categoria}</span>}<span className="obs" style={{ fontSize: 13 }}>Unidade: {m.unidade}</span></div>
              </div><BotaoCancelar tabela="materiais" item={m} edita={edita} onMudou={onSalvo} /></div></li>
            ))}
          </ul>
        ) : <div className="empty" style={{ padding: 24 }}><p>Nenhum material cadastrado nesta obra.{edita ? ' Cadastre o primeiro acima.' : ''}</p></div>}
        <Cancelados tabela="materiais" itens={cancelados} edita={edita} onMudou={onSalvo} detalhe={(m) => <Meta>{m.categoria}{`Unidade: ${m.unidade}`}</Meta>} />
      </section>
    </>
  )
}

export default function Cadastro({ profile }) {
  const { data, erro, carregando, recarregar } = useDados(carregar)
  const [aba, setAba] = useState('responsaveis')
  if (!veCadastro(profile.role)) {
    return <div className="view"><Vazio titulo="O cadastro é do engenheiro e da diretoria" texto="Seu perfil escolhe responsáveis, funções, equipamentos e materiais nas listas de cada tela." /></div>
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
          {aba === 'materiais' && (
            <>
              <Categorias categorias={data.categorias} materiais={data.materiais} edita={edita} onSalvo={recarregar} />
              <Materiais materiais={data.materiais} categorias={data.categorias} edita={edita} onSalvo={recarregar} />
            </>
          )}
        </div>
      )}
    </>
  )
}
