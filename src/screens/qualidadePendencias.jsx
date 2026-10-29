// Qualidade › Pendências: o que a vistoria achou, quem corrige e até quando. Cada pendência anda por botões
// (Pendente → Em andamento → Resolvido); resolver pede a foto da correção. Observação entra a qualquer
// momento, em cima do histórico, com data e hora. Em aberto, os dados podem ser alterados; o engenheiro
// cancela (com motivo, sem apagar) e reativa. As regras moram em lib/qualidade.js.
import { useState } from 'react'
import {
  alterarPendencia, anotarPendencia, avancarPendencia, cancelarPendencia, juntar, listarPendencias, listarResponsaveis,
  reativarPendencia, salvarPendencia,
} from '../lib/dados.js'
import {
  ACAO_PENDENCIA, CANCELADAS, PRAZO_PADRAO_DIAS, COR_STATUS_PENDENCIA, FILTROS_PRAZO, RESOLVIDO, SEM_FILTRO_PENDENCIAS, STATUS_PENDENCIA, abertasPorResponsavel,
  filtrarPendencias, kpisPendencias, motivoParaNaoAlterar, ordenarPendencias, proximaSituacao, validarPendencia, vencida,
} from '../lib/qualidade.js'
import { paraEscolher, rotuloNaLista } from '../lib/cadastros.js'
import { podeEditar, podeRegistrarQualidade } from '../lib/perfis.js'
import { addDias, dmy, hojeISO } from '../lib/datas.js'
import { Carregando, ErroCarga, Icon, Sheet, Vazio, avisar, useDados } from '../components/index.jsx'
import CampoFoto from '../components/CampoFoto.jsx'

const carregar = () => juntar({ pendencias: listarPendencias(), responsaveis: listarResponsaveis() })

function Campo({ rotulo, erro, children, largo }) {
  return (
    <label className="field" style={largo ? { flexBasis: '100%' } : undefined}>
      <span>{rotulo}</span>{children}{erro && <span className="erro">{erro}</span>}
    </label>
  )
}

function Foto({ foto, alt }) {
  return foto?.url_previa
    ? <img className="qual-foto" src={foto.url_previa} alt={alt} />
    : <div className="qual-foto vazia" aria-label="Sem foto"><Icon nome="camera" tamanho={28} /><span>Sem foto</span></div>
}

const etiqueta = (p) => (p.cancelada ? <span className="pill soft">Cancelada</span> : <span className={`pill ${COR_STATUS_PENDENCIA[p.status]}`}>{p.status}</span>)

// Nova pendência (sem `atual`) ou alteração dos dados de uma em aberto (com `atual`).
function FormPendencia({ atual, responsaveis, onFechar, onSalvo }) {
  const hoje = hojeISO()
  const [p, setP] = useState(atual
    ? { descricao: atual.descricao, local: atual.local, pavimento: atual.pavimento ?? '', empresa_id: atual.empresa_id, responsavel_id: atual.responsavel_id, data_vistoria: atual.data_vistoria, prazo: atual.prazo, foto: atual.foto }
    : { descricao: '', local: '', pavimento: '', empresa_id: '', responsavel_id: '', data_vistoria: hoje, prazo: addDias(hoje, PRAZO_PADRAO_DIAS), foto: null })
  const [tocado, setTocado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const empresas = paraEscolher(responsaveis, p.empresa_id === atual?.empresa_id ? p.empresa_id : '')
  const acompanham = paraEscolher(responsaveis, p.responsavel_id === atual?.responsavel_id ? p.responsavel_id : '')
  const ids = [...new Set([...empresas, ...acompanham].map((r) => r.id))]
  const erros = tocado ? validarPendencia(p, ids, hoje) : {}
  const mudar = (campo) => (e) => setP({ ...p, [campo]: e.target.value })
  // A prévia de uma foto nova que não foi salva é liberada ao sair.
  const fotoNova = p.foto && p.foto !== atual?.foto ? p.foto : null
  function fechar() {
    if (fotoNova) URL.revokeObjectURL(fotoNova.url_previa)
    onFechar()
  }
  async function salvar() {
    setTocado(true)
    if (Object.keys(validarPendencia(p, ids, hoje)).length) return
    setSalvando(true)
    const r = atual ? await alterarPendencia(atual.id, p) : await salvarPendencia(p)
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar(atual ? `Pendência #${atual.numero} alterada.` : `Pendência #${r.data.numero} registrada.`)
    onSalvo(r.data)
  }
  return (
    <Sheet titulo={atual ? `Alterar pendência #${atual.numero}` : 'Nova pendência'} subtitulo={atual ? atual.status : 'Entra como Pendente'} onFechar={fechar}>
      <div className="sheet-b">
        <div className="form-grid">
          <CampoFoto rotulo="Foto do problema" foto={p.foto} onFoto={(foto) => setP((x) => ({ ...x, foto }))} />
          <Campo rotulo="Descrição do problema" erro={erros.descricao} largo>
            <textarea className="ipt" rows={2} value={p.descricao} aria-invalid={!!erros.descricao} placeholder="Ex.: Fissura diagonal na alvenaria ao lado da janela" onChange={mudar('descricao')} />
          </Campo>
          <Campo rotulo="Local" erro={erros.local}>
            <input className="ipt" value={p.local} aria-invalid={!!erros.local} placeholder="Ex.: Banheiro social" onChange={mudar('local')} />
          </Campo>
          <Campo rotulo="Pavimento (opcional)">
            <input className="ipt" value={p.pavimento} placeholder="Ex.: Térreo" onChange={mudar('pavimento')} />
          </Campo>
          <Campo rotulo="Empresa que corrige" erro={erros.empresa_id}>
            <select className="ipt" value={p.empresa_id} aria-invalid={!!erros.empresa_id} onChange={mudar('empresa_id')}>
              <option value="">Escolha a empresa</option>
              {empresas.map((r) => <option key={r.id} value={r.id}>{rotuloNaLista(r)}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Quem acompanha" erro={erros.responsavel_id}>
            <select className="ipt" value={p.responsavel_id} aria-invalid={!!erros.responsavel_id} onChange={mudar('responsavel_id')}>
              <option value="">Escolha o responsável</option>
              {acompanham.map((r) => <option key={r.id} value={r.id}>{rotuloNaLista(r)}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Data da vistoria" erro={erros.data_vistoria}>
            <input className="ipt" type="date" value={p.data_vistoria} max={hoje} aria-invalid={!!erros.data_vistoria} onChange={mudar('data_vistoria')} />
          </Campo>
          <Campo rotulo="Prazo para corrigir" erro={erros.prazo}>
            <input className="ipt" type="date" value={p.prazo} min={p.data_vistoria} aria-invalid={!!erros.prazo} onChange={mudar('prazo')} />
          </Campo>
        </div>
        {!ids.length && <p className="obs">Cadastre a empresa e o responsável antes, no módulo Cadastro › Responsáveis.</p>}
        <div className="btns" style={{ marginTop: 6 }}>
          <button className="btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : atual ? 'Salvar alterações' : 'Registrar pendência'}</button>
          <button className="btn ghost" onClick={fechar}>Cancelar</button>
        </div>
      </div>
    </Sheet>
  )
}

function Detalhe({ p, hoje, registra, edita, onFechar, onAvancar, onAnotar, onAlterar, onCancelar, onReativar }) {
  const [nota, setNota] = useState('')
  const [evidencia, setEvidencia] = useState(null)
  const [motivo, setMotivo] = useState('')
  const proxima = p.cancelada ? null : proximaSituacao(p.status)
  const podeAlterar = registra && !motivoParaNaoAlterar(p)
  function fechar() {
    if (evidencia) URL.revokeObjectURL(evidencia.url_previa)
    onFechar()
  }
  async function anotar() {
    if (!nota.trim()) { avisar('Escreva a observação.'); return }
    if (await onAnotar(p, nota)) setNota('')
  }
  async function cancelar() {
    if (!motivo.trim()) { avisar('Diga por que está cancelando.'); return }
    if (!window.confirm(`Cancelar a pendência #${p.numero}?\n\nEla sai da grade e dos números, mas não é apagada: o motivo fica registrado e dá para reativar depois.`)) return
    if (await onCancelar(p, motivo)) setMotivo('')
  }
  return (
    <Sheet titulo={`#${p.numero} ${p.local}`} subtitulo={p.pavimento || 'Pendência'} onFechar={fechar}
      topo={<div className="curto-marcas">{etiqueta(p)}{vencida(p, hoje) && <span className="pill red">Vencido</span>}</div>}>
      <div className="sheet-b">
        {p.cancelada && (
          <div className="qual-cancelada">
            <span>Cancelada em {dmy(p.cancelada_em)}: {p.motivo_cancelamento}</span>
            {edita && <button className="btn" onClick={() => onReativar(p)}>Reativar</button>}
          </div>
        )}
        <div className="qual-fotos-detalhe">
          <figure><Foto foto={p.foto} alt="Foto do problema" /><figcaption>Problema</figcaption></figure>
          {p.status === RESOLVIDO && <figure><Foto foto={p.foto_evidencia} alt="Foto da correção" /><figcaption>Correção</figcaption></figure>}
        </div>
        <p style={{ margin: 0, fontSize: 16 }}>{p.descricao}</p>
        <dl className="qual-dados">
          <div><dt>Empresa que corrige</dt><dd>{p.empresa}</dd></div>
          <div><dt>Quem acompanha</dt><dd>{p.responsavel}</dd></div>
          <div><dt>Vistoria</dt><dd>{dmy(p.data_vistoria)}, por {p.vistoriador}</dd></div>
          <div><dt>Prazo</dt><dd className={vencida(p, hoje) ? 'alerta' : ''}>{dmy(p.prazo)}</dd></div>
          {p.em_andamento_em && <div><dt>Em andamento desde</dt><dd>{dmy(p.em_andamento_em)}</dd></div>}
          {p.resolvido_em && <div><dt>Resolvida em</dt><dd>{dmy(p.resolvido_em)}</dd></div>}
        </dl>
        {podeAlterar && <button className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={() => onAlterar(p)}>Alterar dados</button>}

        {registra && proxima && (
          <section className="card card-b qual-acao">
            {proxima === RESOLVIDO && <CampoFoto rotulo="Foto da correção" obrigatoria foto={evidencia} onFoto={setEvidencia} />}
            <button className="btn primary" disabled={proxima === RESOLVIDO && !evidencia}
              onClick={async () => { if (await onAvancar(p, proxima, { foto_evidencia: evidencia })) setEvidencia(null) }}>{ACAO_PENDENCIA[proxima]}</button>
          </section>
        )}

        <div className="sec-t">Observações</div>
        {registra && (
          <div className="qual-nota">
            <textarea className="ipt" rows={2} value={nota} placeholder="Ex.: Empresa avisada; equipe vem na quinta." onChange={(e) => setNota(e.target.value)} />
            <button className="btn" onClick={anotar}>Adicionar observação</button>
          </div>
        )}
        {p.observacoes ? <pre className="qual-obs">{p.observacoes}</pre> : <p className="obs" style={{ margin: 0 }}>Nenhuma observação ainda.</p>}

        {edita && !p.cancelada && p.status !== RESOLVIDO && (
          <details className="qual-cancelar">
            <summary>Cancelar esta pendência</summary>
            <p className="obs" style={{ margin: 0 }}>Para registro errado ou em duplicidade. Não apaga: o motivo fica nas observações e dá para reativar.</p>
            <textarea className="ipt" rows={2} value={motivo} placeholder="Motivo (obrigatório). Ex.: Registro em duplicidade da #3." onChange={(e) => setMotivo(e.target.value)} />
            <button className="btn qual-btn-cancelar" onClick={cancelar}>Cancelar pendência</button>
          </details>
        )}
      </div>
    </Sheet>
  )
}

function Card({ p, hoje, onAbrir }) {
  return (
    <button className={`qual-card${p.status === RESOLVIDO || p.cancelada ? ' resolvido' : ''}`} onClick={() => onAbrir(p.id)} aria-label={`Pendência ${p.numero}: ${p.descricao}`}>
      <div className="qual-card-h">
        <b>#{p.numero}</b>
        <span className="curto-marcas" style={{ marginTop: 0 }}>{vencida(p, hoje) && <span className="pill red">Vencido</span>}{etiqueta(p)}</span>
      </div>
      <Foto foto={p.foto} alt={`Foto da pendência ${p.numero}`} />
      <div className="qual-desc">{p.descricao}</div>
      <div className="curto-info">{p.local}{p.pavimento ? `, ${p.pavimento}` : ''}</div>
      <div className="qual-card-p">
        <span>{p.responsavel}</span>
        <span className={vencida(p, hoje) ? 'alerta' : ''}>Prazo {dmy(p.prazo)}</span>
      </div>
    </button>
  )
}

// filtro/setFiltro moram no módulo: o relatório (botão no alto do módulo) imprime o que a aba mostra.
export default function Pendencias({ profile, filtro, setFiltro }) {
  const { data, erro, carregando, recarregar } = useDados(carregar)
  const [form, setForm] = useState(null) // { atual } — atual null = nova pendência
  const [abertaId, setAbertaId] = useState(null)
  const [mudadas, setMudadas] = useState({}) // id → pendência já mudada na tela (otimista)
  const registra = podeRegistrarQualidade(profile.role)
  const edita = podeEditar(profile.role)

  if (carregando) return <Carregando />
  if (erro) return <ErroCarga erro={erro} onTentar={recarregar} />

  const hoje = hojeISO()
  const pendencias = data.pendencias.map((p) => mudadas[p.id] ?? p)
  const nomeDe = Object.fromEntries(data.responsaveis.map((r) => [r.id, r.nome]))
  const visiveis = ordenarPendencias(filtrarPendencias(pendencias, filtro, hoje), hoje)
  const k = kpisPendencias(pendencias)
  const porResponsavel = abertasPorResponsavel(pendencias, nomeDe)
  const aberta = pendencias.find((p) => p.id === abertaId)
  const filtrando = filtro.status || filtro.responsavel_id || filtro.prazo !== 'Todos' || filtro.busca.trim()
  const comNomes = (p, novo) => ({ ...p, ...novo, empresa: nomeDe[novo.empresa_id ?? p.empresa_id] ?? p.empresa, responsavel: nomeDe[novo.responsavel_id ?? p.responsavel_id] ?? p.responsavel })

  // Otimista: muda na tela na hora; se a camada recusar, relê o que está gravado e avisa.
  async function executar(p, previsto, chamada, aviso) {
    setMudadas((m) => ({ ...m, [p.id]: comNomes(p, previsto) }))
    const r = await chamada()
    if (r.erro) {
      setMudadas((m) => { const resto = { ...m }; delete resto[p.id]; return resto })
      recarregar()
      avisar(r.erro)
      return false
    }
    setMudadas((m) => ({ ...m, [p.id]: comNomes(p, r.data) }))
    avisar(aviso)
    return true
  }
  const avancar = (p, para, dados) => executar(p, { status: para, ...(para === RESOLVIDO ? { resolvido_em: hoje, foto_evidencia: dados.foto_evidencia } : {}) },
    () => avancarPendencia(p.id, para, dados), `Pendência #${p.numero}: ${para}.`)
  const anotar = (p, nota) => executar(p, {}, () => anotarPendencia(p.id, nota), 'Observação adicionada.')
  const cancelar = (p, motivo) => executar(p, { cancelada: true, cancelada_em: hoje, motivo_cancelamento: motivo.trim() },
    () => cancelarPendencia(p.id, motivo), `Pendência #${p.numero} cancelada.`)
  const reativar = (p) => executar(p, { cancelada: false }, () => reativarPendencia(p.id), `Pendência #${p.numero} reativada.`)
  function aposSalvar(salva) {
    const alterou = form?.atual
    setForm(null)
    if (alterou) setMudadas((m) => ({ ...m, [salva.id]: comNomes(alterou, salva) }))
    else recarregar()
  }

  return (
    <div className="view larga">
      {!pendencias.length ? (
        <Vazio icone="camera" titulo="Nenhuma pendência nesta obra"
          texto="Na vistoria, fotografe o problema, diga onde é, quem corrige e até quando. A pendência anda até ser resolvida com a foto da correção."
          acao={registra ? 'Registrar a primeira pendência' : null} onAcao={() => setForm({ atual: null })} />
      ) : (
        <>
          <section className="qual-kpis" aria-label="Resumo das pendências">
            <div className="qual-kpi"><div className="num">{k.total}</div><div className="lbl">Total</div></div>
            <div className="qual-kpi red"><div className="num">{k.pendentes}</div><div className="lbl">Pendentes</div></div>
            <div className="qual-kpi amber"><div className="num">{k.andamento}</div><div className="lbl">Em andamento</div></div>
            <div className="qual-kpi ok"><div className="num">{k.resolvidos}</div><div className="lbl">Resolvidos</div></div>
          </section>

          {porResponsavel.length > 0 && (
            <section className="card">
              <div className="card-h"><span className="rotulo">Em aberto por responsável</span></div>
              <div className="qual-resp">
                {porResponsavel.map((x) => (
                  <button key={x.id} className="qual-resp-chip" aria-pressed={filtro.responsavel_id === x.id}
                    onClick={() => setFiltro({ ...filtro, responsavel_id: filtro.responsavel_id === x.id ? '' : x.id })}>
                    {x.nome}<b>{x.n}</b>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="toolbar">
            <input className="ipt" type="search" value={filtro.busca} placeholder="Buscar por descrição ou local" aria-label="Buscar pendência" onChange={(e) => setFiltro({ ...filtro, busca: e.target.value })} />
            <select className="ipt qual-filtro" value={filtro.status} aria-label="Situação" onChange={(e) => setFiltro({ ...filtro, status: e.target.value })}>
              <option value="">Todas as situações</option>
              {STATUS_PENDENCIA.map((s) => <option key={s}>{s}</option>)}
              <option value={CANCELADAS}>Canceladas</option>
            </select>
            <select className="ipt qual-filtro" value={filtro.responsavel_id} aria-label="Responsável" onChange={(e) => setFiltro({ ...filtro, responsavel_id: e.target.value })}>
              <option value="">Todos os responsáveis</option>
              {data.responsaveis.filter((r) => pendencias.some((p) => p.responsavel_id === r.id)).map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
            {registra && <button className="btn dark qual-nova" onClick={() => setForm({ atual: null })}>＋ Nova pendência</button>}
          </div>
          <div className="filters" role="group" aria-label="Prazo">
            {FILTROS_PRAZO.map((x) => <button key={x} aria-pressed={filtro.prazo === x} onClick={() => setFiltro({ ...filtro, prazo: x })}>{x}</button>)}
          </div>

          {visiveis.length ? (
            <div className="qual-grid">
              {visiveis.map((p) => <Card key={p.id} p={p} hoje={hoje} onAbrir={setAbertaId} />)}
            </div>
          ) : (
            <section className="card empty" style={{ padding: 24 }}>
              <p>Nenhuma pendência com esses filtros.</p>
              {filtrando && <button className="btn ghost" onClick={() => setFiltro(SEM_FILTRO_PENDENCIAS)}>Limpar filtros</button>}
            </section>
          )}
        </>
      )}

      {registra && pendencias.length > 0 && (
        <button className="qual-fab" aria-label="Nova pendência" onClick={() => setForm({ atual: null })}><Icon nome="camera" tamanho={26} /></button>
      )}
      {form && <FormPendencia key={form.atual?.id ?? 'nova'} atual={form.atual} responsaveis={data.responsaveis} onFechar={() => setForm(null)} onSalvo={aposSalvar} />}
      {aberta && !form && (
        <Detalhe key={aberta.id} p={aberta} hoje={hoje} registra={registra} edita={edita} onFechar={() => setAbertaId(null)}
          onAvancar={avancar} onAnotar={anotar} onAlterar={(p) => setForm({ atual: p })} onCancelar={cancelar} onReativar={reativar} />
      )}
    </div>
  )
}
