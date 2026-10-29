// Relatório de qualidade para imprimir (window.print): pendências (com os filtros da aba), FVS (andamento das
// vistorias e as não conformidades) e Gemba Walk (ranking e observações em aberto, com os filtros da aba).
// Abre por cima do app numa camada própria (portal no body): na impressão só ela sai no papel.
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { juntar, listarNcs, listarObservacoesGemba, listarPendencias, listarResponsaveis, listarVistoriasFvs } from '../lib/dados.js'
import {
  CANCELADAS, COR_DESPERDICIO, COR_SEVERIDADE, COR_STATUS_NC, COR_STATUS_PENDENCIA, RESOLVIDO, VISTORIA_CONCLUIDA, abertasPorResponsavel, andamentoFvs,
  descreverFiltros, descreverFiltrosGemba, diasEmAberto, filtrarPendencias, gembaEmAberto, kpisFvs, kpisPendencias,
  ordenarNcs, ordenarPendencias, rankingDesperdicios, vencida,
} from '../lib/qualidade.js'
import { CONSTRUTORA } from '../lib/obras.js'
import { dataHoraCurta, dataHoraLocal, dmy, hojeISO } from '../lib/datas.js'
import { Carregando, ErroCarga, useDados } from '../components/index.jsx'

const carregar = () => juntar({
  pendencias: listarPendencias(), responsaveis: listarResponsaveis(), vistorias: listarVistoriasFvs(), ncs: listarNcs(), observacoes: listarObservacoesGemba(),
})
const dias = (n) => (n === 1 ? '1 dia' : `${n} dias`)

function FotoPapel({ foto, alt }) {
  return foto?.url_previa ? <img src={foto.url_previa} alt={alt} /> : <div className="rel-sem-foto">Sem foto</div>
}

// canceladas: o filtro da aba é "Canceladas" — os números são das ativas, então no lugar deles vai a contagem.
function Pendencias({ pendencias, kpis, porResponsavel, canceladas, hoje }) {
  return (
    <>
      <h2>Pendências de vistoria</h2>
      {canceladas ? <p>{pendencias.length === 1 ? '1 pendência cancelada.' : `${pendencias.length} pendências canceladas.`}</p> : <section className="qual-kpis rel-kpis">
        <div className="qual-kpi"><div className="num">{kpis.total}</div><div className="lbl">Total</div></div>
        <div className="qual-kpi red"><div className="num">{kpis.pendentes}</div><div className="lbl">Pendentes</div></div>
        <div className="qual-kpi amber"><div className="num">{kpis.andamento}</div><div className="lbl">Em andamento</div></div>
        <div className="qual-kpi ok"><div className="num">{kpis.resolvidos}</div><div className="lbl">Resolvidos</div></div>
      </section>}

      {porResponsavel.length > 0 && (
        <section className="rel-bloco">
          <h3>Em aberto por responsável</h3>
          <div className="rel-resp">{porResponsavel.map((x) => <span key={x.id}>{x.nome}: <b>{x.n}</b></span>)}</div>
        </section>
      )}

      {pendencias.length ? pendencias.map((p) => (
        <section key={p.id} className="rel-registro">
          <div className="rel-fotos">
            <FotoPapel foto={p.foto} alt={`Foto da pendência ${p.numero}`} />
            {p.status === RESOLVIDO && <FotoPapel foto={p.foto_evidencia} alt={`Correção da pendência ${p.numero}`} />}
          </div>
          <div className="rel-dados">
            <div className="rel-titulo">
              <b>#{p.numero}</b>
              <span className={`pill ${p.cancelada ? 'soft' : COR_STATUS_PENDENCIA[p.status]}`}>{p.cancelada ? 'Cancelada' : p.status}</span>
              {vencida(p, hoje) && <span className="pill red">Vencido</span>}
            </div>
            <dl>
              <div><dt>Local</dt><dd>{p.local}{p.pavimento ? `, ${p.pavimento}` : ''}</dd></div>
              <div><dt>Vistoria</dt><dd>{dmy(p.data_vistoria)}</dd></div>
              <div><dt>Vistoriado por</dt><dd>{p.vistoriador}</dd></div>
              <div><dt>Empresa que corrige</dt><dd>{p.empresa}</dd></div>
              <div><dt>Quem acompanha</dt><dd>{p.responsavel}</dd></div>
              <div><dt>Prazo</dt><dd>{dmy(p.prazo)}{p.resolvido_em ? `; resolvida em ${dmy(p.resolvido_em)}` : ''}</dd></div>
            </dl>
            <p className="rel-desc">{p.descricao}</p>
            {p.observacoes && <pre className="rel-obs">{p.observacoes}</pre>}
          </div>
        </section>
      )) : <p>Nenhuma pendência com esses filtros.</p>}
    </>
  )
}

function Fvs({ vistorias, ncs, hoje }) {
  const k = kpisFvs(vistorias, ncs)
  const linhas = andamentoFvs(vistorias)
  return (
    <>
      <h2 className="rel-quebra">FVS: fichas de verificação de serviço</h2>
      <section className="qual-kpis tres rel-kpis">
        <div className="qual-kpi ok"><div className="num">{k.conforme === null ? '—' : `${k.conforme}%`}</div><div className="lbl">Conforme geral</div></div>
        <div className="qual-kpi red"><div className="num">{k.ncsAbertas}</div><div className="lbl">NCs em aberto</div></div>
        <div className="qual-kpi"><div className="num">{k.concluidas}</div><div className="lbl">Vistorias concluídas</div></div>
      </section>

      <section className="rel-bloco">
        <h3>Andamento das vistorias</h3>
        {linhas.length ? (
          <table className="rel-tabela">
            <thead><tr><th>Ficha · ambiente</th><th className="n">OK</th><th className="n">NC</th><th className="n">Conformidade</th><th>Situação</th></tr></thead>
            <tbody>
              {linhas.map((v) => (
                <tr key={v.id}>
                  <td><b>{v.ficha}</b><br />{v.ambiente}</td>
                  <td className="n">{v.ok}</td>
                  <td className="n">{v.nc}</td>
                  <td className="n">{v.conformidade === null ? '—' : `${v.conformidade}%`}</td>
                  <td>
                    <span className={`pill ${v.status === VISTORIA_CONCLUIDA ? 'ok' : 'amber'}`}>{v.status}</span>
                    {v.pendentes > 0 && <span className="rel-nota"> {v.pendentes === 1 ? '1 item pendente' : `${v.pendentes} itens pendentes`}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p>Nenhuma vistoria nesta obra.</p>}
      </section>

      <section className="rel-bloco">
        <h3>Não conformidades</h3>
        {ncs.length ? (
          <table className="rel-tabela">
            <thead><tr><th>Código</th><th>Item</th><th>Severidade</th><th>Situação</th><th>Responsável</th><th className="n">Dias em aberto</th></tr></thead>
            <tbody>
              {ordenarNcs(ncs, hoje).map((n) => (
                <tr key={n.id}>
                  <td><b>{n.codigo}</b></td>
                  <td>{n.item_numero} {n.titulo}<br /><span className="rel-nota">{n.servico} · {n.ambiente}</span></td>
                  <td><span className={`pill ${COR_SEVERIDADE[n.severidade]}`}>{n.severidade}</span></td>
                  <td><span className={`pill ${COR_STATUS_NC[n.status]}`}>{n.status}</span></td>
                  <td>{n.responsavel}</td>
                  <td className="n">{dias(diasEmAberto(n, hoje))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p>Nenhuma não conformidade nesta obra.</p>}
      </section>
    </>
  )
}

function Gemba({ observacoes, filtro, hoje }) {
  const ranking = rankingDesperdicios(observacoes)
  const emAberto = gembaEmAberto(observacoes, filtro, hoje)
  return (
    <>
      <h2 className="rel-quebra">Gemba Walk: desperdícios</h2>
      <section className="rel-bloco">
        <h3>Onde a obra mais perde</h3>
        {ranking.length ? (
          <ol className="rel-ranking">
            {ranking.map((x) => <li key={x.tipo}><span className={`pill gem-cor-${COR_DESPERDICIO[x.tipo]}`}>{x.tipo}</span><b>{x.n}</b></li>)}
          </ol>
        ) : <p>Nenhuma observação nesta obra.</p>}
      </section>

      <section className="rel-bloco">
        <h3>Observações em aberto</h3>
        {emAberto.length ? (
          <table className="rel-tabela">
            <thead><tr><th>Nº</th><th>Local e o que se viu</th><th>O que será feito</th><th>Responsável</th><th>Prazo</th></tr></thead>
            <tbody>
              {emAberto.map((o) => (
                <tr key={o.id}>
                  <td><b>#{o.numero}</b><br /><span className="rel-nota">{o.status}</span></td>
                  <td>
                    <b>{o.local}</b>: {o.descricao}
                    <div className="rel-tags">{o.desperdicios.map((t) => <span key={t} className={`pill gem-cor-${COR_DESPERDICIO[t]}`}>{t}</span>)}</div>
                  </td>
                  <td>{o.acao}{o.causa_raiz && <><br /><span className="rel-nota">Causa: {o.causa_raiz}</span></>}</td>
                  <td>{o.responsavel}</td>
                  <td>{o.prazo ? dmy(o.prazo) : 'Sem prazo'}{vencida(o, hoje) && <><br /><span className="pill red">Vencido</span></>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p>Nenhuma observação em aberto com esses filtros.</p>}
      </section>
    </>
  )
}

// filtroPendencias e filtroGemba: os filtros ativos nas abas (o relatório imprime o que elas mostram).
export default function Relatorio({ obra, filtroPendencias, filtroGemba, onFechar }) {
  const { data, erro, carregando, recarregar } = useDados(carregar)
  // Enquanto o relatório está aberto, a impressão mostra só ele (index.css, @media print).
  useEffect(() => {
    document.body.classList.add('com-relatorio')
    const esc = (e) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', esc)
    return () => { document.body.classList.remove('com-relatorio'); window.removeEventListener('keydown', esc) }
  }, [])
  const hoje = hojeISO()
  const gerado = dataHoraCurta(dataHoraLocal(new Date()))

  let corpo
  if (carregando) corpo = <Carregando />
  else if (erro) corpo = <ErroCarga erro={erro} onTentar={recarregar} />
  else {
    const nomeDe = Object.fromEntries(data.responsaveis.map((r) => [r.id, r.nome]))
    const pendencias = ordenarPendencias(filtrarPendencias(data.pendencias, filtroPendencias, hoje), hoje)
    const filtrosGemba = descreverFiltrosGemba(filtroGemba)
    corpo = (
      <>
        <header className="rel-cab">
          <div className="rel-marca">{CONSTRUTORA}</div>
          <h1>RELATÓRIO DE QUALIDADE</h1>
          <div className="rel-obra">{obra?.nome}{obra?.codigo ? ` (${obra.codigo})` : ''}</div>
          <div className="rel-meta">{dmy(hoje)}</div>
          <div className="rel-meta">Pendências: {descreverFiltros(filtroPendencias, nomeDe)}{filtrosGemba ? `. Gemba Walk: ${filtrosGemba}` : ''}</div>
        </header>
        <Pendencias pendencias={pendencias} kpis={kpisPendencias(pendencias)} porResponsavel={abertasPorResponsavel(pendencias, nomeDe)} canceladas={filtroPendencias.status === CANCELADAS} hoje={hoje} />
        <Fvs vistorias={data.vistorias} ncs={data.ncs} hoje={hoje} />
        <Gemba observacoes={data.observacoes} filtro={filtroGemba} hoje={hoje} />
        <footer className="rel-rodape">Relatório gerado automaticamente em {gerado}.</footer>
      </>
    )
  }

  return createPortal(
    <div className="relatorio" role="dialog" aria-modal="true" aria-label="Relatório de qualidade">
      <div className="rel-barra no-print">
        <button className="btn primary" onClick={() => window.print()} disabled={carregando || !!erro}>Imprimir</button>
        <button className="btn ghost" onClick={onFechar} autoFocus>Fechar</button>
      </div>
      <article className="rel-papel">{corpo}</article>
    </div>,
    document.body,
  )
}
