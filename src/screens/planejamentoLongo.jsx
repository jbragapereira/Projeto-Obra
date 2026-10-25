// Aba Longo prazo do Planejamento: o cronograma em barras da EAP (sem biblioteca de Gantt).
// Cada barra vai do início ao fim planejado; a parte cheia é o avanço real do Diário e a marca
// fina é o previsto para hoje, contado em dias úteis pelo calendário da obra. No celular, lista.
import { useState } from 'react'
import { COR_PRAZO, SITUACOES_PRAZO, achatarEap, acumuladoPorServico, aplicarPrazo, colunasDoCronograma, ehItem, montarEap, paiDoCodigo } from '../lib/planejamento.js'
import { diasUteisEntre } from '../lib/calendario.js'
import { diasEntre, dm, dmy, hojeISO } from '../lib/datas.js'
import { Vazio } from '../components/index.jsx'

// Largura de um dia em cada escala (px): a semana fica com 98 px; o mês, com uns 120 px.
const PX_POR_DIA = { semana: 14, mes: 4 }
const pctDe = (p) => Math.round((p ?? 0) * 100)

function Situacao({ s }) {
  return s ? <span className={`pill ${COR_PRAZO[s]}`}>{s}</span> : null
}

export default function AbaLongo({ dados, onIrParaEap }) {
  const hoje = hojeISO()
  const [escala, setEscala] = useState('semana')
  const [abertos, setAbertos] = useState(new Set()) // de início, só as etapas
  const [busca, setBusca] = useState('')
  const [soAtrasados, setSoAtrasados] = useState(false)

  const acumulado = acumuladoPorServico(dados.lancamentos)
  const raizes = aplicarPrazo(montarEap({ servicos: dados.servicos, grupos: dados.grupos, acumulado }), { hoje, cal: dados.calendario })
  const todos = achatarEap(raizes)
  const comDatas = todos.filter((n) => n.inicio && n.fim)
  const itensSemDatas = todos.filter((n) => ehItem(n) && !n.inicio && !n.fim).length

  if (!comDatas.length) {
    return (
      <div className="view">
        <Vazio titulo="Ainda não há datas para o cronograma"
          texto="O cronograma é desenhado com as datas de início e fim dos itens, lançadas na EAP."
          acao="Lançar datas na EAP" onAcao={onIrParaEap} />
      </div>
    )
  }

  // Busca e "Atrasados": o que bate e os grupos de cima. Sem filtro: a árvore com os grupos abertos.
  const termo = busca.trim().toLowerCase()
  const filtrando = termo !== '' || soAtrasados
  const bate = new Set()
  if (filtrando) {
    for (const n of comDatas) {
      const passa = (!termo || `${n.codigo} ${n.nome}`.toLowerCase().includes(termo)) && (!soAtrasados || n.situacaoPrazo === SITUACOES_PRAZO.atrasado)
      if (passa && (ehItem(n) || !soAtrasados)) for (let c = n.codigo; c; c = paiDoCodigo(c)) bate.add(c)
    }
  }
  const codigosDeGrupo = comDatas.filter((n) => !ehItem(n)).map((n) => n.codigo)
  const fechados = filtrando ? new Set() : new Set(codigosDeGrupo.filter((c) => !abertos.has(c)))
  const linhas = achatarEap(raizes, fechados).filter((n) => n.inicio && n.fim && (!filtrando || bate.has(n.codigo)))
  const alternar = (codigo) => setAbertos((a) => { const n = new Set(a); if (n.has(codigo)) n.delete(codigo); else n.add(codigo); return n })

  // Período do desenho: do início mais cedo ao fim mais tarde, com hoje dentro.
  const inicioObra = [...comDatas.map((n) => n.inicio), hoje].sort()[0]
  const fimObra = [...comDatas.map((n) => n.fim), hoje].sort().at(-1)
  const colunas = colunasDoCronograma({ inicio: inicioObra, fim: fimObra, escala })
  const comeco = colunas[0].inicio
  const px = PX_POR_DIA[escala]
  const largura = (diasEntre(comeco, colunas.at(-1).fim) + 1) * px
  const xHoje = (diasEntre(comeco, hoje) + 0.5) * px
  const atrasados = comDatas.filter((n) => ehItem(n) && n.situacaoPrazo === SITUACOES_PRAZO.atrasado).length

  const cabecalhoDaLinha = (n) => (
    <>
      {!ehItem(n)
        ? <button className="crono-seta" aria-expanded={!fechados.has(n.codigo)} aria-label={`${fechados.has(n.codigo) ? 'Abrir' : 'Fechar'} ${n.nome}`} onClick={() => alternar(n.codigo)} disabled={filtrando}>{fechados.has(n.codigo) ? '▸' : '▾'}</button>
        : <span className="crono-seta" aria-hidden="true" />}
      <span className="crono-nome">
        <span className="cod">{n.codigo}</span> <span title={n.nome}>{n.nome}</span>
      </span>
    </>
  )

  return (
    <div className="view larga">
      <div className="toolbar">
        <div className="seg" role="radiogroup" aria-label="Escala do cronograma">
          {[['semana', 'Semana'], ['mes', 'Mês']].map(([id, rotulo]) => (
            <button key={id} role="radio" aria-checked={escala === id} onClick={() => setEscala(id)}>{rotulo}</button>
          ))}
        </div>
        <input className="ipt" type="search" placeholder="Buscar por código ou nome" aria-label="Buscar no cronograma" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <div className="filters">
          <button onClick={() => setAbertos(new Set(codigosDeGrupo))}>Abrir tudo</button>
          <button onClick={() => setAbertos(new Set())}>Fechar tudo</button>
          <button aria-pressed={soAtrasados} onClick={() => setSoAtrasados(!soAtrasados)}>Atrasados ({atrasados})</button>
        </div>
      </div>

      <div className="crono-legenda" aria-label="Legenda">
        <span><i className="l-real" />Real (Diário)</span>
        <span><i className="l-prev" />Previsto para hoje</span>
        <span><i className="l-hoje" />Hoje, {dm(hoje)}</span>
        <span className="obs">Previsto em dias úteis pelo calendário da obra.</span>
      </div>

      {itensSemDatas > 0 && (
        <div className="crono-aviso">
          <span>{itensSemDatas} {itensSemDatas === 1 ? 'item sem datas não aparece' : 'itens sem datas não aparecem'} no cronograma.</span>
          <button className="btn ghost" onClick={onIrParaEap}>Lançar datas na EAP</button>
        </div>
      )}

      {/* Computador: as barras ao longo do tempo */}
      <section className="card only-wide crono" style={{ '--px': `${px}px` }}>
        <div className="crono-rolagem">
          <div className="crono-tabela" style={{ width: `calc(var(--crono-esq) + ${largura}px)` }}>
            <div className="crono-linha crono-cab">
              <div className="crono-esq"><span className="rotulo">Item</span><span className="rotulo crono-nums">Prev. / Real</span></div>
              <div className="crono-trilha" style={{ width: largura }}>
                {colunas.map((c) => (
                  <span key={c.inicio} className="crono-col" style={{ left: diasEntre(comeco, c.inicio) * px, width: (diasEntre(comeco, c.fim) + 1) * px }}>{c.rotulo}</span>
                ))}
              </div>
            </div>
            <div className="crono-corpo">
              <div className="crono-grade" style={{ width: largura }} aria-hidden="true">
                {colunas.map((c) => <span key={c.inicio} style={{ left: diasEntre(comeco, c.inicio) * px }} />)}
                <span className="crono-hoje" style={{ left: xHoje }} />
              </div>
              {linhas.map((n) => {
                const esq = diasEntre(comeco, n.inicio) * px
                const larg = (diasEntre(comeco, n.fim) + 1) * px - esq
                const uteis = diasUteisEntre(n.inicio, n.fim, dados.calendario)
                return (
                  <div key={n.codigo} className={`crono-linha ${ehItem(n) ? '' : `crono-grupo n${n.nivel}`}`}>
                    <div className="crono-esq">
                      {cabecalhoDaLinha(n)}
                      <span className="crono-nums">{pctDe(n.previsto)}% / <b>{pctDe(n.real)}%</b></span>
                    </div>
                    <div className="crono-trilha" style={{ width: largura }}>
                      <div className={`crono-barra s-${COR_PRAZO[n.situacaoPrazo] ?? 'soft'}`} style={{ left: esq, width: Math.max(larg, 3) }}
                        title={`${n.codigo} ${n.nome}: ${dmy(n.inicio)} a ${dmy(n.fim)} (${uteis} dias úteis). Previsto ${pctDe(n.previsto)}%, real ${pctDe(n.real)}%. ${n.situacaoPrazo}.`}>
                        <i className="crono-real" style={{ width: `${pctDe(n.real)}%` }} />
                        {n.previsto > 0 && n.previsto < 1 && <i className="crono-prev" style={{ left: `${pctDe(n.previsto)}%` }} />}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Celular: lista */}
      <section className="card only-narrow">
        <ul className="rows crono-lista">
          {linhas.map((n) => (
            <li key={n.codigo} className={ehItem(n) ? '' : `crono-grupo n${n.nivel}`}>
              <div className="row">
                <div className="main-c">
                  <div className="crono-lista-t">{cabecalhoDaLinha(n)}</div>
                  <div className="crono-lista-m">
                    <span>{dm(n.inicio)} a {dm(n.fim)}</span>
                    <span>Previsto {pctDe(n.previsto)}%, real <b>{pctDe(n.real)}%</b></span>
                    <Situacao s={n.situacaoPrazo} />
                  </div>
                  <div className={`crono-barra lista s-${COR_PRAZO[n.situacaoPrazo] ?? 'soft'}`}>
                    <i className="crono-real" style={{ width: `${pctDe(n.real)}%` }} />
                    {n.previsto > 0 && n.previsto < 1 && <i className="crono-prev" style={{ left: `${pctDe(n.previsto)}%` }} />}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
