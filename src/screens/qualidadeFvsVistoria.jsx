// Qualidade › FVS › vistoria: o checklist da ficha, item a item (OK | NC | N.A.). Marcar NC abre o painel da
// não conformidade (fotos, descrição, solução, severidade e responsável). Finalizar só sem pendente; depois,
// só leitura. As regras moram em lib/qualidade.js.
import { useState } from 'react'
import {
  COR_STATUS_NC, MAX_FOTOS_NC, RESP_NA, RESP_NC, RESP_OK, SEVERIDADES_NC, VISTORIA_CONCLUIDA, motivoParaNaoFinalizar, progressoVistoria, validarNc,
} from '../lib/qualidade.js'
import { paraEscolher, rotuloNaLista } from '../lib/cadastros.js'
import { dmy } from '../lib/datas.js'
import { Sheet } from '../components/index.jsx'
import CampoFoto from '../components/CampoFoto.jsx'


// Barra do andamento: verde OK, vermelho NC, cinza-claro N.A., trilho pendente.
export function BarraFvs({ progresso: p }) {
  const pct = (n) => (p.total ? `${(n / p.total) * 100}%` : '0%')
  return (
    <div className="fvs-barra" role="img" aria-label={`${p.ok} OK, ${p.nc} NC, ${p.na} N.A., ${p.pendentes} pendentes`}>
      <span className="ok" style={{ width: pct(p.ok) }} /><span className="nc" style={{ width: pct(p.nc) }} /><span className="na" style={{ width: pct(p.na) }} />
    </div>
  )
}

function PainelNc({ item, responsaveis, onFechar, onSalvar }) {
  const [nc, setNc] = useState({ descricao: '', solucao: '', severidade: '', responsavel_id: '', fotos: [] })
  const [tocado, setTocado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const ativos = paraEscolher(responsaveis, '')
  const erros = tocado ? validarNc(nc, ativos.map((r) => r.id)) : {}
  // Sempre sobre o estado mais novo: dois toques seguidos não se apagam.
  const mudar = (campo) => (e) => { const valor = e.target.value; setNc((x) => ({ ...x, [campo]: valor })) }
  function fechar() {
    nc.fotos.forEach((f) => URL.revokeObjectURL(f.url_previa))
    onFechar()
  }
  function tirarFoto(i) {
    URL.revokeObjectURL(nc.fotos[i].url_previa)
    setNc((x) => ({ ...x, fotos: x.fotos.filter((_, j) => j !== i) }))
  }
  async function salvar() {
    setTocado(true)
    if (Object.keys(validarNc(nc, ativos.map((r) => r.id))).length) return
    setSalvando(true)
    await onSalvar(nc) // deu certo: o painel fecha; não deu: o aviso já saiu e o painel fica
    setSalvando(false)
  }
  return (
    <Sheet titulo="Não conformidade" subtitulo={`Item ${item.numero}: ${item.titulo}`} onFechar={fechar}>
      <div className="sheet-b">
        <div className="field" style={{ flexBasis: '100%' }}>
          <span>Fotos ({nc.fotos.length} de {MAX_FOTOS_NC})</span>
          {nc.fotos.length > 0 && (
            <div className="fvs-thumbs">
              {nc.fotos.map((f, i) => (
                <div key={f.url_previa}><img src={f.url_previa} alt={`Foto ${i + 1} da não conformidade`} /><button className="remover" aria-label={`Tirar a foto ${i + 1}`} onClick={() => tirarFoto(i)}>✕</button></div>
              ))}
            </div>
          )}
        </div>
        {nc.fotos.length < MAX_FOTOS_NC && <CampoFoto key={nc.fotos.length} rotulo={nc.fotos.length ? 'Mais uma foto' : 'Foto do problema'} foto={null} onFoto={(f) => setNc((x) => ({ ...x, fotos: [...x.fotos, f] }))} />}
        <label className="field"><span>Descrição do problema</span>
          <textarea className="ipt" rows={2} value={nc.descricao} aria-invalid={!!erros.descricao} placeholder="Ex.: Manta subiu só 15 cm na parede do box" onChange={mudar('descricao')} />
          {erros.descricao && <span className="erro">{erros.descricao}</span>}
        </label>
        <label className="field"><span>Solução proposta</span>
          <textarea className="ipt" rows={2} value={nc.solucao} aria-invalid={!!erros.solucao} placeholder="Ex.: Complementar a subida até 30 cm" onChange={mudar('solucao')} />
          {erros.solucao && <span className="erro">{erros.solucao}</span>}
        </label>
        <div className="field">
          <span>Severidade</span>
          <div className="seg" role="radiogroup" aria-label="Severidade" style={{ marginBottom: 0, alignSelf: 'flex-start' }}>
            {SEVERIDADES_NC.map((s) => <button key={s} role="radio" aria-checked={nc.severidade === s} onClick={() => setNc((x) => ({ ...x, severidade: s }))}>{s}</button>)}
          </div>
          {erros.severidade && <span className="erro">{erros.severidade}</span>}
        </div>
        <label className="field"><span>Responsável pela correção</span>
          <select className="ipt" value={nc.responsavel_id} aria-invalid={!!erros.responsavel_id} onChange={mudar('responsavel_id')}>
            <option value="">Escolha o responsável</option>
            {ativos.map((r) => <option key={r.id} value={r.id}>{rotuloNaLista(r)}</option>)}
          </select>
          {erros.responsavel_id && <span className="erro">{erros.responsavel_id}</span>}
        </label>
        <div className="btns" style={{ marginTop: 6 }}>
          <button className="btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Registrar não conformidade'}</button>
          <button className="btn ghost" onClick={fechar}>Cancelar</button>
        </div>
      </div>
    </Sheet>
  )
}

export default function Checklist({ vistoria: v, ncs, responsaveis, registra, onVoltar, onResponder, onRegistrarNc, onFinalizar, onAbrirNc }) {
  const [ncDoItem, setNcDoItem] = useState(null) // item com o painel de NC aberto
  const p = progressoVistoria(v.grupos, v.respostas)
  const concluida = v.status === VISTORIA_CONCLUIDA
  const mexe = registra && !concluida
  const ncDe = Object.fromEntries(ncs.map((n) => [n.item_id, n]))
  const faltam = motivoParaNaoFinalizar(v)
  function responder(item, resposta) {
    if (resposta === RESP_NC) { setNcDoItem(item); return }
    onResponder(v, item.id, v.respostas[item.id] === resposta ? null : resposta) // tocar de novo desmarca
  }
  function finalizar() {
    if (!window.confirm('Finalizar a vistoria?\n\nDepois de finalizada, ela fica só para leitura.')) return
    onFinalizar(v)
  }
  return (
    <div className="view">
      <button className="btn ghost" style={{ alignSelf: 'flex-start' }} onClick={onVoltar}>◀ Voltar às vistorias</button>
      <section className="card card-b fvs-cab">
        <div className="fvs-cab-t">
          <div>
            <div className="obs" style={{ fontSize: 13 }}>{v.codigo_modelo} · versão {v.versao}</div>
            <h2>{v.nome_modelo}</h2>
            <div className="fvs-ambiente">{v.ambiente}</div>
          </div>
          {concluida ? <span className="pill ok">✓ Concluída em {dmy(v.concluida_em)}</span> : <span className="pill amber">Em andamento</span>}
        </div>
        <BarraFvs progresso={p} />
        <div className="fvs-cab-nums">
          <span><b>{p.verificados}</b> de {p.total} itens verificados</span>
          <span>Conformidade: <b>{p.conformidade === null ? '—' : `${p.conformidade}%`}</b></span>
          <span className="fvs-legenda"><i className="ok" />OK {p.ok} <i className="nc" />NC {p.nc} <i className="na" />N.A. {p.na}</span>
        </div>
      </section>

      {v.grupos.map((g, gi) => (
        <section key={g.nome + gi} className="card">
          <div className="card-h"><span className="rotulo">{gi + 1}. {g.nome}</span></div>
          <ul className="fvs-itens">
            {g.itens.map((it, ii) => {
              const item = { ...it, numero: `${gi + 1}.${ii + 1}` }
              const r = v.respostas[it.id]
              const nc = ncDe[it.id]
              return (
                <li key={it.id} className={`fvs-item${r ? ` r-${r === RESP_NA ? 'na' : r.toLowerCase()}` : ''}`}>
                  <div className="fvs-item-t"><b>{item.numero}</b> {it.titulo}
                    {nc && <button className="link fvs-nc-link" onClick={() => onAbrirNc(nc.id)}>{nc.codigo} <span className={`pill ${COR_STATUS_NC[nc.status]}`}>{nc.status}</span></button>}
                  </div>
                  <div className="fvs-resp" role="group" aria-label={`Resposta do item ${item.numero}`}>
                    {[RESP_OK, RESP_NC, RESP_NA].map((x) => (
                      <button key={x} className={`r-${x === RESP_NA ? 'na' : x.toLowerCase()}`} aria-pressed={r === x}
                        disabled={!mexe || r === RESP_NC} onClick={() => responder(item, x)}>{x}</button>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      {mexe && (
        <div className="fvs-rodape">
          <span className="obs">{faltam ?? 'Tudo verificado.'}</span>
          <button className="btn primary" disabled={!!faltam} onClick={finalizar}>Finalizar vistoria</button>
        </div>
      )}
      {ncDoItem && (
        <PainelNc item={ncDoItem} responsaveis={responsaveis} onFechar={() => setNcDoItem(null)}
          onSalvar={async (dados) => { if (await onRegistrarNc(v, ncDoItem.id, dados)) setNcDoItem(null) }} />
      )}
    </div>
  )
}
