// Gaveta de um serviço: números, gráfico planejado × executado e histórico.
// Usada pelo Painel e pela lista de Serviços. Recebe a análise pronta de lib/painel.js.
import { useState } from 'react'
import { Pill, Sheet, avisar } from '../components/index.jsx'
import { brl, qtd } from '../lib/formato.js'
import { diasEntre, dm, dmy, hojeISO } from '../lib/datas.js'
import { COR_SITUACAO } from '../lib/painel.js'
import { marcarCritico } from '../lib/dados.js'
import { saldoDoItem } from '../lib/diario.js'

function Fato({ rotulo, valor, vermelho }) {
  return <div className="fact"><div className="lbl">{rotulo}</div><div className={`v ${vermelho ? 'red' : ''}`}>{valor}</div></div>
}

function Grafico({ a, medicao, hoje }) {
  const W = 320, H = 130, P = 8
  const total = Math.max(1, diasEntre(medicao.data_inicio, medicao.data_fim))
  const X = (iso) => P + (Math.min(total, Math.max(0, diasEntre(medicao.data_inicio, iso))) / total) * (W - 2 * P)
  const topo = Math.max(a.planejadoMes, a.executadoPeriodo, 1)
  const Y = (v) => H - P - (v / topo) * (H - 2 * P)
  let acc = 0
  const pts = [[X(medicao.data_inicio), Y(0)]]
  a.lancs.filter((l) => l.data >= medicao.data_inicio && l.data <= medicao.data_fim)
    .sort((x, y) => x.data.localeCompare(y.data))
    .forEach((l) => { pts.push([X(l.data), Y(acc)]); acc += l.quantidade; pts.push([X(l.data), Y(acc)]) })
  pts.push([X(hoje), Y(acc)])
  const vermelho = COR_SITUACAO[a.situacao] === 'red'
  const cor = vermelho ? '#E2574C' : '#00A3B4'
  return (
    <section className="card chart">
      <div className="sec-t" style={{ padding: 0 }}>Vai bater a meta do mês?</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Planejado versus executado acumulado no mês">
        <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="#D5DCE0" />
        <line x1={X(medicao.data_inicio)} y1={Y(0)} x2={X(medicao.data_fim)} y2={Y(a.planejadoMes)} stroke="#26333A" strokeWidth="2" strokeDasharray="5 4" />
        <polyline fill="none" stroke={cor} strokeWidth="3" strokeLinejoin="round" points={pts.map((p) => p.join(',')).join(' ')} />
        <line x1={X(hoje)} y1={P} x2={X(hoje)} y2={H - P} stroke="#4A5A63" strokeDasharray="2 3" />
        <text x={X(hoje) + 4} y={P + 10} fontFamily="IBM Plex Sans, sans-serif" fontSize="11" fontWeight="600" fill="#4A5A63">hoje</text>
      </svg>
      <div className="legend">
        <span><i style={{ background: '#26333A' }} />Planejado (ritmo para a meta)</span>
        <span><i style={{ background: cor }} />Executado acumulado</span>
      </div>
    </section>
  )
}

export default function ServicoDetalhe({ a, medicao, responsavel, comValores, podeMarcarCritico, onFechar, onMudou }) {
  const hoje = hojeISO()
  const s = a.servico
  const [salvando, setSalvando] = useState(false)
  const passouLimite = a.limite && hoje > a.limite && a.situacao !== 'Concluído'

  async function alternarCritico() {
    setSalvando(true)
    const r = await marcarCritico(s.id, !s.critico)
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar(r.data.critico ? 'Marcado como crítico (à mão).' : 'Desmarcado como crítico (à mão).')
    onMudou?.()
  }

  const numerosDoMes = a.noMes
    ? (comValores
      ? <><Fato rotulo="Planejado no mês" valor={brl(a.valorPlanejado)} /><Fato rotulo="Executado" valor={brl(a.valorExecutado)} /><Fato rotulo="Falta executar" valor={brl(a.faltaValor)} vermelho={COR_SITUACAO[a.situacao] === 'red'} /></>
      : <><Fato rotulo="Planejado no mês" valor={qtd(a.planejadoMes, s.unidade)} /><Fato rotulo="Executado" valor={qtd(a.executadoPeriodo, s.unidade)} /><Fato rotulo="Falta no mês" valor={qtd(Math.max(0, a.planejadoMes - a.executadoPeriodo), s.unidade)} vermelho={COR_SITUACAO[a.situacao] === 'red'} /></>)
    : <><Fato rotulo="Contratado" valor={qtd(s.qtd_contratada, s.unidade)} /><Fato rotulo="Acumulado" valor={qtd(a.acumulado, s.unidade)} /><Fato rotulo="No mês" valor="não planejado" /></>

  return (
    <Sheet
      titulo={s.descricao}
      subtitulo={`${s.codigo}${s.critico ? ', crítico' : ''}`}
      topo={<div style={{ marginTop: 8 }}><Pill situacao={a.situacao} /></div>}
      onFechar={onFechar}
    >
      <div className="sheet-b">
        <div className="facts">
          {numerosDoMes}
          <Fato rotulo="Dias sem avanço" valor={a.situacao === 'Concluído' ? '—' : (a.diasSem ?? 'não iniciou')} vermelho={a.situacao === 'Parado'} />
          <Fato rotulo="Data limite" valor={dmy(a.limite)} vermelho={passouLimite} />
          <Fato rotulo="Término previsto" valor={a.termino ? dmy(a.termino) : (a.situacao === 'Concluído' ? 'concluído' : 'sem previsão')} vermelho={a.termino && a.termino > s.data_fim_planejada} />
          <Fato rotulo="Saldo do item" valor={qtd(saldoDoItem({ contratado: s.qtd_contratada, acumulado: a.acumulado }), s.unidade)} />
          <Fato rotulo="Fim planejado" valor={dmy(s.data_fim_planejada)} />
          <Fato rotulo="Responsável" valor={responsavel ?? '—'} />
        </div>

        {a.noMes && medicao && <Grafico a={a} medicao={medicao} hoje={hoje} />}

        {podeMarcarCritico && (
          <div className="btns">
            <button className="btn" onClick={alternarCritico} disabled={salvando}>
              {salvando ? 'Salvando…' : s.critico ? 'Desmarcar como crítico' : 'Marcar como crítico'}
            </button>
            <button className="btn ghost" onClick={() => avisar('Acionar o encarregado chega na Fase 2.')}>
              Acionar o encarregado <span className="pill soft">Fase 2</span>
            </button>
          </div>
        )}

        <section className="card">
          <div className="card-h"><span className="rotulo">Histórico de lançamentos</span></div>
          <ul className="rows">
            {[...a.lancs].sort((x, y) => y.data.localeCompare(x.data)).map((l) => (
              <li key={l.id}><div className="row" style={{ minHeight: 52 }}>
                <div className="main-c">
                  <div className="t" style={{ fontSize: 16 }}>{dm(l.data)}: {qtd(l.quantidade, s.unidade)}</div>
                  <div className="m">{l.concluido ? 'Concluído' : 'Produção do dia'}{l.corrigido_em ? ', corrigido depois' : ''}</div>
                </div>
              </div></li>
            ))}
            {!a.lancs.length && <li><div className="row">Nenhum lançamento ainda.</div></li>}
          </ul>
        </section>
      </div>
    </Sheet>
  )
}
