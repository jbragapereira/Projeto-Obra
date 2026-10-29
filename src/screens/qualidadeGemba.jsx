// Qualidade › Gemba Walk: o que se vê andando pela obra que faz perder tempo e dinheiro. Cada observação diz o
// local, a causa, o que será feito e quais dos 7 desperdícios ela mostra; anda num quadro de três colunas
// (Pendente, Em andamento, Resolvido), para a frente ou para trás. O ranking no alto mostra onde a obra mais
// perde. Engenheiro e equipe registram e movem; o engenheiro cancela (com motivo, sem apagar) e reativa.
// As regras moram em lib/qualidade.js.
import { useState } from 'react'
import {
  cancelarObservacaoGemba, juntar, listarObservacoesGemba, listarResponsaveis, moverObservacaoGemba, reativarObservacaoGemba,
  salvarObservacaoGemba,
} from '../lib/dados.js'
import {
  COR_DESPERDICIO, DESPERDICIOS, FILTROS_PRAZO_GEMBA, PRAZO_PADRAO_DIAS, RESOLVIDO, SEM_FILTRO_GEMBA, STATUS_GEMBA, filtrarGemba, ordenarGemba,
  rankingDesperdicios, validarObservacao, vencida,
} from '../lib/qualidade.js'
import { paraEscolher, rotuloNaLista } from '../lib/cadastros.js'
import { podeEditar, podeRegistrarQualidade } from '../lib/perfis.js'
import { addDias, dmy, hojeISO } from '../lib/datas.js'
import { Carregando, ErroCarga, Icon, Sheet, Vazio, avisar, useDados } from '../components/index.jsx'
import CampoFoto from '../components/CampoFoto.jsx'

const carregar = () => juntar({ observacoes: listarObservacoesGemba(), responsaveis: listarResponsaveis() })

const Tag = ({ tipo }) => <span className={`pill gem-cor-${COR_DESPERDICIO[tipo]}`}>{tipo}</span>

function Campo({ rotulo, erro, children, largo }) {
  return (
    <label className="field" style={largo ? { flexBasis: '100%' } : undefined}>
      <span>{rotulo}</span>{children}{erro && <span className="erro">{erro}</span>}
    </label>
  )
}

// Nova observação (sem `atual`) ou alteração dos dados de uma (com `atual`).
function FormObservacao({ atual, responsaveis, onFechar, onSalvo }) {
  const hoje = hojeISO()
  const [o, setO] = useState(atual
    ? { local: atual.local, descricao: atual.descricao, causa_raiz: atual.causa_raiz, acao: atual.acao, desperdicios: atual.desperdicios, responsavel_id: atual.responsavel_id, prazo: atual.prazo ?? '', foto: atual.foto }
    : { local: '', descricao: '', causa_raiz: '', acao: '', desperdicios: [], responsavel_id: '', prazo: addDias(hoje, PRAZO_PADRAO_DIAS), foto: null })
  const [tocado, setTocado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const opcoes = paraEscolher(responsaveis, atual?.responsavel_id ?? '')
  const ids = opcoes.map((r) => r.id)
  const registradaEm = atual?.registrado_em ?? hoje
  const erros = tocado ? validarObservacao(o, ids, registradaEm) : {}
  const mudar = (campo) => (e) => setO({ ...o, [campo]: e.target.value })
  const alternar = (tipo) => setO((x) => ({ ...x, desperdicios: x.desperdicios.includes(tipo) ? x.desperdicios.filter((t) => t !== tipo) : DESPERDICIOS.filter((t) => t === tipo || x.desperdicios.includes(t)) }))
  const fotoNova = o.foto && o.foto !== atual?.foto ? o.foto : null
  function fechar() {
    if (fotoNova) URL.revokeObjectURL(fotoNova.url_previa)
    onFechar()
  }
  async function salvar() {
    setTocado(true)
    if (Object.keys(validarObservacao(o, ids, registradaEm)).length) return
    setSalvando(true)
    const r = await salvarObservacaoGemba({ ...o, id: atual?.id })
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar(atual ? `Observação #${atual.numero} alterada.` : `Observação #${r.data.numero} registrada.`)
    onSalvo(r.data)
  }
  return (
    <Sheet titulo={atual ? `Alterar observação #${atual.numero}` : 'Nova observação'} subtitulo={atual ? atual.status : 'Entra como Pendente'} onFechar={fechar}>
      <div className="sheet-b">
        <div className="form-grid">
          <CampoFoto rotulo="Foto" foto={o.foto} onFoto={(foto) => setO((x) => ({ ...x, foto }))} />
          <Campo rotulo="Local" erro={erros.local}>
            <input className="ipt" value={o.local} aria-invalid={!!erros.local} placeholder="Ex.: Pátio de descarga" onChange={mudar('local')} />
          </Campo>
          <Campo rotulo="Responsável" erro={erros.responsavel_id}>
            <select className="ipt" value={o.responsavel_id} aria-invalid={!!erros.responsavel_id} onChange={mudar('responsavel_id')}>
              <option value="">Escolha o responsável</option>
              {opcoes.map((r) => <option key={r.id} value={r.id}>{rotuloNaLista(r)}</option>)}
            </select>
          </Campo>
          <Campo rotulo="O que você viu" erro={erros.descricao} largo>
            <textarea className="ipt" rows={2} value={o.descricao} aria-invalid={!!erros.descricao} placeholder="Ex.: Pedreiros parados esperando a argamassa" onChange={mudar('descricao')} />
          </Campo>
          <div className="field" style={{ flexBasis: '100%' }}>
            <span>Desperdícios (marque um ou mais)</span>
            <div className="gem-tipos" role="group" aria-label="Desperdícios">
              {DESPERDICIOS.map((t) => (
                <button key={t} type="button" className={`gem-tipo gem-cor-${COR_DESPERDICIO[t]}`} aria-pressed={o.desperdicios.includes(t)} onClick={() => alternar(t)}>{t}</button>
              ))}
            </div>
            {erros.desperdicios && <span className="erro">{erros.desperdicios}</span>}
          </div>
          <Campo rotulo="Causa raiz (opcional)" largo>
            <textarea className="ipt" rows={2} value={o.causa_raiz} placeholder="Ex.: Pedido feito no dia, sem janela de entrega" onChange={mudar('causa_raiz')} />
          </Campo>
          <Campo rotulo="O que será feito" erro={erros.acao} largo>
            <textarea className="ipt" rows={2} value={o.acao} aria-invalid={!!erros.acao} placeholder="Ex.: Programar a argamassa com 2 dias de antecedência" onChange={mudar('acao')} />
          </Campo>
          <Campo rotulo="Prazo (opcional)" erro={erros.prazo}>
            <input className="ipt" type="date" value={o.prazo} min={registradaEm} aria-invalid={!!erros.prazo} onChange={mudar('prazo')} />
          </Campo>
        </div>
        {!ids.length && <p className="obs">Cadastre o responsável antes, no módulo Cadastro › Responsáveis.</p>}
        <div className="btns" style={{ marginTop: 6 }}>
          <button className="btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : atual ? 'Salvar alterações' : 'Registrar observação'}</button>
          <button className="btn ghost" onClick={fechar}>Cancelar</button>
        </div>
      </div>
    </Sheet>
  )
}

function Detalhe({ o, hoje, registra, edita, onFechar, onMover, onAlterar, onCancelar }) {
  const [motivo, setMotivo] = useState('')
  async function cancelar() {
    if (!motivo.trim()) { avisar('Diga por que está cancelando.'); return }
    if (!window.confirm(`Cancelar a observação #${o.numero}?\n\nEla sai do quadro e do ranking, mas não é apagada: o motivo fica registrado e dá para reativar depois.`)) return
    if (await onCancelar(o, motivo)) onFechar()
  }
  return (
    <Sheet titulo={`#${o.numero} ${o.local}`} subtitulo="Observação do Gemba Walk" onFechar={onFechar}
      topo={<div className="curto-marcas">{o.desperdicios.map((t) => <Tag key={t} tipo={t} />)}</div>}>
      <div className="sheet-b">
        {o.foto?.url_previa && <img className="qual-foto" src={o.foto.url_previa} alt="Foto da observação" />}
        <p style={{ margin: 0, fontSize: 16 }}>{o.descricao}</p>
        <dl className="qual-dados">
          <div><dt>Causa raiz</dt><dd>{o.causa_raiz || '—'}</dd></div>
          <div><dt>O que será feito</dt><dd>{o.acao}</dd></div>
          <div><dt>Responsável</dt><dd>{o.responsavel}</dd></div>
          <div><dt>Prazo</dt><dd className={vencida(o, hoje) ? 'alerta' : ''}>{o.prazo ? dmy(o.prazo) : 'Sem prazo'}</dd></div>
          <div><dt>Registrada em</dt><dd>{dmy(o.registrado_em)}</dd></div>
          {o.resolvido_em && <div><dt>Resolvida em</dt><dd>{dmy(o.resolvido_em)}</dd></div>}
        </dl>
        {registra && (
          <section className="card card-b qual-acao">
            <span className="rotulo">Situação</span>
            <div className="seg" role="radiogroup" aria-label="Situação" style={{ marginBottom: 0 }}>
              {STATUS_GEMBA.map((s) => <button key={s} role="radio" aria-checked={o.status === s} onClick={() => o.status !== s && onMover(o, s)}>{s}</button>)}
            </div>
          </section>
        )}
        {registra && <button className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => onAlterar(o)}>Alterar dados</button>}
        {edita && (
          <details className="qual-cancelar">
            <summary>Cancelar esta observação</summary>
            <p className="obs" style={{ margin: 0 }}>Para registro errado ou em duplicidade. Não apaga: o motivo fica guardado e dá para reativar.</p>
            <textarea className="ipt" rows={2} value={motivo} placeholder="Motivo (obrigatório). Ex.: Mesma observação da #2." onChange={(e) => setMotivo(e.target.value)} />
            <button className="btn qual-btn-cancelar" onClick={cancelar}>Cancelar observação</button>
          </details>
        )}
      </div>
    </Sheet>
  )
}

function Card({ o, hoje, registra, onAbrir, onMover }) {
  const vencido = vencida(o, hoje)
  return (
    <article className={`curto-card gem-card${o.status === RESOLVIDO ? ' resolvido' : ''}`}>
      <button className="gem-card-abrir" onClick={() => onAbrir(o.id)} aria-label={`Observação ${o.numero}: ${o.descricao}`}>
        {o.foto?.url_previa && <img className="qual-foto" src={o.foto.url_previa} alt="" />}
        <div className="gem-local"><Icon nome="local" tamanho={16} />{o.local}</div>
        <div className="curto-card-t gem-desc">{o.descricao}</div>
        <div className="curto-marcas">{o.desperdicios.map((t) => <Tag key={t} tipo={t} />)}</div>
        <div className="qual-card-p">
          <span>{o.responsavel}</span>
          {o.prazo ? <span className={vencido ? 'pill red' : ''}>{vencido ? 'Vencido ' : 'Prazo '}{dmy(o.prazo)}</span> : <span>Sem prazo</span>}
        </div>
      </button>
      {registra && (
        <select className="ipt gem-mover" value={o.status} aria-label={`Mover a observação ${o.numero}`} onChange={(e) => onMover(o, e.target.value)}>
          {STATUS_GEMBA.map((s) => <option key={s} value={s}>{s === o.status ? s : `Mover para ${s}`}</option>)}
        </select>
      )}
    </article>
  )
}

// filtro/setFiltro moram no módulo: o relatório imprime as observações que a aba mostra.
export default function Gemba({ profile, filtro, setFiltro }) {
  const { data, erro, carregando, recarregar } = useDados(carregar)
  const [form, setForm] = useState(null) // { atual } — atual null = observação nova
  const [abertaId, setAbertaId] = useState(null)
  const [mudadas, setMudadas] = useState({}) // id → observação já mudada na tela (otimista)
  const registra = podeRegistrarQualidade(profile.role)
  const edita = podeEditar(profile.role)

  if (carregando) return <Carregando />
  if (erro) return <ErroCarga erro={erro} onTentar={recarregar} />

  const hoje = hojeISO()
  const observacoes = data.observacoes.map((o) => mudadas[o.id] ?? o)
  const nomeDe = Object.fromEntries(data.responsaveis.map((r) => [r.id, r.nome]))
  const ranking = rankingDesperdicios(observacoes)
  const maior = ranking[0]?.n ?? 0
  const visiveis = filtrarGemba(observacoes, filtro, hoje)
  const canceladas = observacoes.filter((o) => o.cancelada)
  const aberta = observacoes.find((o) => o.id === abertaId && !o.cancelada)
  const filtrando = filtro.tipo || filtro.prazo !== 'Todos' || filtro.busca.trim()

  // Otimista: muda na tela na hora; se a camada recusar, relê o que está gravado e avisa.
  async function executar(o, previsto, chamada, aviso) {
    setMudadas((m) => ({ ...m, [o.id]: { ...o, ...previsto } }))
    const r = await chamada()
    if (r.erro) {
      setMudadas((m) => { const resto = { ...m }; delete resto[o.id]; return resto })
      recarregar()
      avisar(r.erro)
      return false
    }
    setMudadas((m) => ({ ...m, [o.id]: { ...o, ...r.data } }))
    avisar(aviso)
    return true
  }
  const mover = (o, para) => executar(o, { status: para, resolvido_em: para === RESOLVIDO ? hoje : null }, () => moverObservacaoGemba(o.id, para), `Observação #${o.numero}: ${para}.`)
  const cancelar = (o, motivo) => executar(o, { cancelada: true, cancelada_em: hoje, motivo_cancelamento: motivo.trim() }, () => cancelarObservacaoGemba(o.id, motivo), `Observação #${o.numero} cancelada.`)
  const reativar = (o) => executar(o, { cancelada: false }, () => reativarObservacaoGemba(o.id), `Observação #${o.numero} reativada.`)
  function aposSalvar(salva) {
    const alterou = form?.atual
    setForm(null)
    if (alterou) setMudadas((m) => ({ ...m, [salva.id]: { ...alterou, ...salva, responsavel: nomeDe[salva.responsavel_id] ?? alterou.responsavel } }))
    else recarregar()
  }

  return (
    <div className="view larga">
      {!observacoes.length ? (
        <Vazio icone="local" titulo="Nenhuma observação nesta obra"
          texto="Ande pela obra e anote o que faz perder tempo ou material: o local, a causa, o que será feito e qual desperdício é."
          acao={registra ? 'Registrar a primeira observação' : null} onAcao={() => setForm({ atual: null })} />
      ) : (
        <>
          {ranking.length > 0 && (
            <section className="card">
              <div className="card-h"><span className="rotulo">Onde a obra mais perde</span><span className="obs" style={{ margin: 0 }}>Toque para filtrar</span></div>
              <ol className="gem-ranking">
                {ranking.map((x) => (
                  <li key={x.tipo}>
                    <button aria-pressed={filtro.tipo === x.tipo} onClick={() => setFiltro({ ...filtro, tipo: filtro.tipo === x.tipo ? '' : x.tipo })}>
                      <span className="gem-rank-nome">{x.tipo}</span>
                      <span className="gem-rank-trilho"><span className={`gem-rank-barra gem-cor-${COR_DESPERDICIO[x.tipo]}`} style={{ width: `${(x.n / maior) * 100}%` }} /></span>
                      <b>{x.n}</b>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="toolbar">
            <input className="ipt" type="search" value={filtro.busca} placeholder="Buscar por local, descrição ou ação" aria-label="Buscar observação" onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })} />
            <select className="ipt qual-filtro" value={filtro.tipo} aria-label="Desperdício" onChange={(e) => setFiltro({ ...filtro, tipo: e.target.value })}>
              <option value="">Todos os desperdícios</option>
              {DESPERDICIOS.map((t) => <option key={t}>{t}</option>)}
            </select>
            {registra && <button className="btn dark" onClick={() => setForm({ atual: null })}>＋ Nova observação</button>}
          </div>
          <div className="filters" role="group" aria-label="Prazo">
            {FILTROS_PRAZO_GEMBA.map((x) => <button key={x} aria-pressed={filtro.prazo === x} onClick={() => setFiltro({ ...filtro, prazo: x })}>{x}</button>)}
          </div>

          {visiveis.length ? (
            <div className="gem-kanban">
              {STATUS_GEMBA.map((s, i) => {
                const daColuna = ordenarGemba(visiveis.filter((o) => o.status === s), hoje)
                return (
                  <section key={s} className={`curto-col g${i}`} aria-label={s}>
                    <header className="curto-col-h"><span>{s}</span><span className="n">{daColuna.length}</span></header>
                    <div className="curto-col-b">
                      {daColuna.length
                        ? daColuna.map((o) => <Card key={o.id} o={o} hoje={hoje} registra={registra} onAbrir={setAbertaId} onMover={mover} />)
                        : <p className="obs gem-col-vazia">Nada aqui.</p>}
                    </div>
                  </section>
                )
              })}
            </div>
          ) : (
            <section className="card empty" style={{ padding: 24 }}>
              <p>Nenhuma observação com esses filtros.</p>
              {filtrando && <button className="btn ghost" onClick={() => setFiltro(SEM_FILTRO_GEMBA)}>Limpar filtros</button>}
            </section>
          )}

          {canceladas.length > 0 && (
            <details className="card gem-canceladas">
              <summary>Canceladas ({canceladas.length})</summary>
              <ul>
                {canceladas.map((o) => (
                  <li key={o.id}>
                    <span><b>#{o.numero} {o.local}</b>: {o.descricao}<br /><span className="obs">Cancelada em {dmy(o.cancelada_em)}: {o.motivo_cancelamento}</span></span>
                    {edita && <button className="btn" onClick={() => reativar(o)}>Reativar</button>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      {form && <FormObservacao key={form.atual?.id ?? 'nova'} atual={form.atual} responsaveis={data.responsaveis} onFechar={() => setForm(null)} onSalvo={aposSalvar} />}
      {aberta && !form && (
        <Detalhe key={aberta.id} o={aberta} hoje={hoje} registra={registra} edita={edita} onFechar={() => setAbertaId(null)}
          onMover={mover} onAlterar={(o) => setForm({ atual: o })} onCancelar={cancelar} />
      )}
    </div>
  )
}
