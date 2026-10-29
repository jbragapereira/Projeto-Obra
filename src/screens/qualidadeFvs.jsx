// Qualidade › FVS (Ficha de Verificação de Serviço): vistorias (checklist da ficha), não conformidades (o
// tratamento, com a linha do tempo) e as fichas (modelos). Engenheiro e equipe vistoriam e tratam; aprovar ou
// reprovar a correção e editar ficha é do engenheiro. As regras moram em lib/qualidade.js.
import { useState } from 'react'
import {
  finalizarVistoriaFvs, iniciarVistoriaFvs, juntar, listarModelosFvs, listarNcs, listarResponsaveis, listarVistoriasFvs, moverNc,
  registrarNcFvs, responderItemFvs,
} from '../lib/dados.js'
import {
  ACOES_NC, COR_SEVERIDADE, acoesPermitidasNc, COR_STATUS_NC, NC_FECHADA, VISTORIA_ANDAMENTO, VISTORIA_CONCLUIDA, diasEmAberto, kpisFvs, ordenarNcs,
  progressoVistoria, validarVistoria,
} from '../lib/qualidade.js'
import { podeEditar, podeRegistrarQualidade } from '../lib/perfis.js'
import { dataHoraCurta, dmy, hojeISO } from '../lib/datas.js'
import { Carregando, ErroCarga, Sheet, Vazio, avisar, useDados } from '../components/index.jsx'
import Checklist, { BarraFvs } from './qualidadeFvsVistoria.jsx'
import Fichas, { FormFicha } from './qualidadeFvsFichas.jsx'

const carregar = () => juntar({ fichas: listarModelosFvs(), vistorias: listarVistoriasFvs(), ncs: listarNcs(), responsaveis: listarResponsaveis() })
const SECOES = [{ id: 'vistorias', rotulo: 'Vistorias' }, { id: 'ncs', rotulo: 'Não conformidades' }, { id: 'fichas', rotulo: 'Fichas' }]
const dias = (n) => (n === 1 ? '1 dia' : `${n} dias`)

function NovaVistoria({ fichas, onFechar, onCriada }) {
  const [v, setV] = useState({ modelo_id: '', ambiente: '' })
  const [tocado, setTocado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const ids = fichas.map((m) => m.id)
  const erros = tocado ? validarVistoria(v, ids) : {}
  async function salvar() {
    setTocado(true)
    if (Object.keys(validarVistoria(v, ids)).length) return
    setSalvando(true)
    const r = await iniciarVistoriaFvs(v)
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar('Vistoria aberta: marque cada item.')
    onCriada(r.data.id)
  }
  return (
    <Sheet titulo="Nova vistoria" subtitulo="Escolha a ficha e o ambiente" onFechar={onFechar}>
      <div className="sheet-b">
        <label className="field"><span>Ficha (FVS)</span>
          <select className="ipt" value={v.modelo_id} aria-invalid={!!erros.modelo_id} onChange={(e) => setV({ ...v, modelo_id: e.target.value })}>
            <option value="">Escolha a ficha</option>
            {fichas.map((m) => <option key={m.id} value={m.id}>{m.codigo}: {m.nome}</option>)}
          </select>
          {erros.modelo_id && <span className="erro">{erros.modelo_id}</span>}
        </label>
        <label className="field"><span>Ambiente</span>
          <input className="ipt" value={v.ambiente} aria-invalid={!!erros.ambiente} placeholder="Ex.: Banheiro Social · Térreo" onChange={(e) => setV({ ...v, ambiente: e.target.value })} />
          {erros.ambiente && <span className="erro">{erros.ambiente}</span>}
        </label>
        <div className="btns" style={{ marginTop: 6 }}>
          <button className="btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Abrindo…' : 'Abrir o checklist'}</button>
          <button className="btn ghost" onClick={onFechar}>Cancelar</button>
        </div>
      </div>
    </Sheet>
  )
}

function DetalheNc({ nc, hoje, registra, edita, onFechar, onMover }) {
  const acoes = ACOES_NC[nc.status] ?? []
  const permitidas = acoesPermitidasNc(nc, edita)
  return (
    <Sheet titulo={`${nc.codigo} ${nc.titulo}`} subtitulo={`${nc.servico} · ${nc.ambiente}`} onFechar={onFechar}
      topo={<div className="curto-marcas"><span className={`pill ${COR_STATUS_NC[nc.status]}`}>{nc.status}</span><span className={`pill ${COR_SEVERIDADE[nc.severidade]}`}>Severidade {nc.severidade}</span></div>}>
      <div className="sheet-b">
        {nc.fotos.length > 0 && <div className="fvs-thumbs">{nc.fotos.map((f, i) => <div key={i}><img src={f.url_previa} alt={`Foto ${i + 1} da ${nc.codigo}`} /></div>)}</div>}
        <dl className="qual-dados">
          <div><dt>Item da ficha</dt><dd>{nc.item_numero} {nc.titulo}</dd></div>
          <div><dt>Responsável</dt><dd>{nc.responsavel}</dd></div>
          <div><dt>Aberta em</dt><dd>{dmy(nc.aberta_em)}</dd></div>
          <div><dt>{nc.status === NC_FECHADA ? 'Ficou aberta' : 'Em aberto há'}</dt><dd>{dias(diasEmAberto(nc, hoje))}</dd></div>
        </dl>
        <div><div className="sec-t">Problema</div><p style={{ margin: '4px 0 0' }}>{nc.descricao}</p></div>
        <div><div className="sec-t">Solução proposta</div><p style={{ margin: '4px 0 0' }}>{nc.solucao}</p></div>
        {registra && permitidas.length > 0 && (
          <div className="btns">{permitidas.map((a) => <button key={a.para + a.rotulo} className={`btn ${a.volta ? 'ghost' : 'primary'}`} onClick={() => onMover(nc, a.para)}>{a.rotulo}</button>)}</div>
        )}
        {registra && acoes.some((a) => a.aprova) && !edita && <p className="obs" style={{ margin: 0 }}>Corrigida: aguardando a aprovação do engenheiro.</p>}
        <div className="sec-t">Linha do tempo</div>
        <ol className="fvs-timeline">
          {[...nc.timeline].reverse().map((p, i) => <li key={i}><span>{dataHoraCurta(p.quando)}</span>{p.texto}</li>)}
        </ol>
      </div>
    </Sheet>
  )
}

export default function Fvs({ profile }) {
  const { data, erro, carregando, recarregar } = useDados(carregar)
  const [secao, setSecao] = useState('vistorias')
  const [vistoriaId, setVistoriaId] = useState(null) // checklist aberto
  const [ncId, setNcId] = useState(null)
  const [novaVistoria, setNovaVistoria] = useState(false)
  const [fichaForm, setFichaForm] = useState(null) // { atual } — atual null = ficha nova
  const [soAbertas, setSoAbertas] = useState(true)
  const [mudadas, setMudadas] = useState({}) // id da vistoria → vistoria já respondida na tela (otimista)
  const registra = podeRegistrarQualidade(profile.role)
  const edita = podeEditar(profile.role)

  if (carregando) return <Carregando />
  if (erro) return <ErroCarga erro={erro} onTentar={recarregar} />

  const hoje = hojeISO()
  const vistorias = data.vistorias.map((v) => mudadas[v.id] ?? v)
  const k = kpisFvs(vistorias, data.ncs)
  const aberta = vistorias.find((v) => v.id === vistoriaId)
  const nc = data.ncs.find((n) => n.id === ncId)
  const ncsVisiveis = ordenarNcs(soAbertas ? data.ncs.filter((n) => n.status !== NC_FECHADA) : data.ncs, hoje)
  const ordemVistorias = [...vistorias].sort((a, b) => (a.status === VISTORIA_ANDAMENTO ? 0 : 1) - (b.status === VISTORIA_ANDAMENTO ? 0 : 1) || b.iniciada_em.localeCompare(a.iniciada_em))

  // Responder: muda na hora; se a camada recusar, relê e avisa.
  async function responder(v, itemId, resposta) {
    const respostas = { ...v.respostas }
    if (resposta === null) delete respostas[itemId]
    else respostas[itemId] = resposta
    setMudadas((m) => ({ ...m, [v.id]: { ...v, respostas } }))
    const r = await responderItemFvs(v.id, itemId, resposta)
    if (r.erro) {
      setMudadas((m) => { const resto = { ...m }; delete resto[v.id]; return resto })
      recarregar()
      avisar(r.erro)
    }
  }
  async function registrarNc(v, itemId, dados) {
    const r = await registrarNcFvs(v.id, itemId, dados)
    if (r.erro) { avisar(r.erro); return false }
    setMudadas((m) => ({ ...m, [v.id]: r.data.vistoria }))
    avisar(`${r.data.nc.codigo} registrada.`)
    recarregar()
    return true
  }
  async function finalizar(v) {
    const r = await finalizarVistoriaFvs(v.id)
    if (r.erro) { avisar(r.erro); return }
    setMudadas((m) => ({ ...m, [v.id]: r.data }))
    avisar('Vistoria concluída.')
  }
  async function mover(n, para) {
    const r = await moverNc(n.id, para)
    if (r.erro) { avisar(r.erro); return }
    avisar(`${n.codigo}: ${r.data.status}.`)
    recarregar()
  }

  const detalheNc = nc && <DetalheNc key={nc.id + nc.status} nc={nc} hoje={hoje} registra={registra} edita={edita} onFechar={() => setNcId(null)} onMover={mover} />

  if (vistoriaId) {
    if (!aberta) return <Carregando />
    return (
      <>
        <Checklist vistoria={aberta} ncs={data.ncs.filter((n) => n.vistoria_id === aberta.id)} responsaveis={data.responsaveis} registra={registra}
          onVoltar={() => setVistoriaId(null)} onResponder={responder} onRegistrarNc={registrarNc} onFinalizar={finalizar} onAbrirNc={setNcId} />
        {detalheNc}
      </>
    )
  }

  return (
    <div className="view larga">
      <section className="qual-kpis tres" aria-label="Resumo da FVS">
        <div className="qual-kpi ok"><div className="num">{k.conforme === null ? '—' : `${k.conforme}%`}</div><div className="lbl">Conforme (geral)</div></div>
        <div className="qual-kpi red"><div className="num">{k.ncsAbertas}</div><div className="lbl">NCs em aberto</div></div>
        <div className="qual-kpi"><div className="num">{k.concluidas}</div><div className="lbl">Vistorias concluídas</div></div>
      </section>
      <div className="seg" role="tablist" aria-label="Partes da FVS" style={{ alignSelf: 'flex-start', marginBottom: 0 }}>
        {SECOES.map((s) => <button key={s.id} role="tab" aria-checked={secao === s.id} aria-selected={secao === s.id} onClick={() => setSecao(s.id)}>{s.rotulo}</button>)}
      </div>

      {secao === 'vistorias' && (
        <>
          {registra && <button className="btn dark" style={{ alignSelf: 'flex-start' }} onClick={() => setNovaVistoria(true)} disabled={!data.fichas.length}>＋ Nova vistoria</button>}
          {ordemVistorias.length ? (
            <div className="qual-grid">
              {ordemVistorias.map((v) => {
                const p = progressoVistoria(v.grupos, v.respostas)
                return (
                  <button key={v.id} className="qual-card" onClick={() => setVistoriaId(v.id)} aria-label={`Vistoria ${v.nome_modelo}, ${v.ambiente}`}>
                    <div className="qual-card-h"><b>{v.codigo_modelo}</b>{v.status === VISTORIA_CONCLUIDA ? <span className="pill ok">✓ Concluída</span> : <span className="pill amber">Em andamento</span>}</div>
                    <div className="qual-desc">{v.nome_modelo}</div>
                    <div className="curto-info">{v.ambiente}</div>
                    <BarraFvs progresso={p} />
                    <div className="qual-card-p"><span>{p.verificados} de {p.total} itens verificados</span><span>Conformidade {p.conformidade === null ? '—' : `${p.conformidade}%`}</span></div>
                  </button>
                )
              })}
            </div>
          ) : (
            <Vazio icone="planilha" titulo="Nenhuma vistoria de FVS nesta obra"
              texto={data.fichas.length ? 'Abra uma vistoria: escolha a ficha e o ambiente, e marque cada item como OK, NC ou N.A.' : 'Crie antes uma ficha na parte "Fichas".'}
              acao={registra && data.fichas.length ? 'Abrir a primeira vistoria' : null} onAcao={() => setNovaVistoria(true)} />
          )}
        </>
      )}

      {secao === 'ncs' && (
        <>
          <div className="filters" role="group" aria-label="Quais não conformidades">
            <button aria-pressed={soAbertas} onClick={() => setSoAbertas(true)}>Em aberto</button>
            <button aria-pressed={!soAbertas} onClick={() => setSoAbertas(false)}>Todas</button>
          </div>
          {ncsVisiveis.length ? (
            <section className="card">
              <ul className="rows">
                {ncsVisiveis.map((n) => (
                  <li key={n.id}>
                    <button className="row fvs-nc-row" onClick={() => setNcId(n.id)}>
                      <div className="main-c">
                        <div className="t">{n.codigo} {n.titulo}</div>
                        <div className="m">{n.servico} · {n.ambiente}</div>
                        <div className="curto-marcas">
                          <span className={`pill ${COR_STATUS_NC[n.status]}`}>{n.status}</span>
                          <span className={`pill ${COR_SEVERIDADE[n.severidade]}`}>{n.severidade}</span>
                          <span className="obs" style={{ fontSize: 13 }}>{n.responsavel}</span>
                        </div>
                      </div>
                      <div className="fvs-dias"><b>{diasEmAberto(n, hoje)}</b><span>{diasEmAberto(n, hoje) === 1 ? 'dia' : 'dias'} {n.status === NC_FECHADA ? 'aberta' : 'em aberto'}</span></div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : <section className="card empty" style={{ padding: 24 }}><p>{soAbertas ? 'Nenhuma não conformidade em aberto.' : 'Nenhuma não conformidade registrada nesta obra.'}</p></section>}
        </>
      )}

      {secao === 'fichas' && <Fichas fichas={data.fichas} edita={edita} onNova={() => setFichaForm({ atual: null })} onEditar={(m) => setFichaForm({ atual: m })} />}

      {novaVistoria && <NovaVistoria fichas={data.fichas} onFechar={() => setNovaVistoria(false)} onCriada={(id) => { setNovaVistoria(false); recarregar(); setVistoriaId(id) }} />}
      {fichaForm && (
        <FormFicha key={fichaForm.atual?.id ?? 'nova'} atual={fichaForm.atual} nomesOutras={data.fichas.filter((m) => m.id !== fichaForm.atual?.id).map((m) => m.nome)}
          onFechar={() => setFichaForm(null)} onSalvo={() => { setFichaForm(null); recarregar() }} />
      )}
      {detalheNc}
    </div>
  )
}
