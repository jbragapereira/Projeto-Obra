// "Previsão de faturamento pela EAP" (na tela Início): quanto o cronograma da EAP gera por mês,
// em R$, ao lado do realizado no Diário. Só para quem vê valores (a camada de dados nem manda o preço
// para os outros perfis).
import { juntarPorMedicao, linhasPorMes, previstoPorMes, realizadoPorMes } from '../lib/previsaoMensal.js'
import { totaisDoOrcamento } from '../lib/orcamento.js'
import { brl, brlCentavos } from '../lib/formato.js'

export default function PrevisaoMensal({ dados, hoje, onIrParaEap }) {
  const previsao = previstoPorMes({ servicos: dados.servicos, cal: dados.calendario })
  const realizado = realizadoPorMes({ lancamentos: dados.lancamentos, servicos: dados.servicos })
  // Obra que mede por meses inteiros: os meses de uma medição viram uma barra só (ex.: out/26 + nov/26).
  const linhas = juntarPorMedicao(linhasPorMes({ previsto: previsao.porMes, realizado, totalComDatas: previsao.totalComDatas }), dados.medicoes ?? [])
  const vigente = totaisDoOrcamento(dados.servicos)?.vigente ?? 0
  const mesAtual = hoje.slice(0, 7)
  const doMes = linhas.find((l) => l.meses.includes(mesAtual))
  const topo = Math.max(1, ...linhas.map((l) => Math.max(l.previsto, l.realizado)))
  const maior = linhas.reduce((m, l) => (l.previsto > (m?.previsto ?? 0) ? l : m), null)
  const pctDoVigente = vigente ? Math.round((previsao.totalComDatas / vigente) * 100) : 0

  return (
    <section className="card card-b prev-mes" aria-labelledby="prev-mes-t">
      <div className="prev-cab">
        <div>
          <h2 id="prev-mes-t" className="prev-t">Previsão de faturamento pela EAP</h2>
          <p className="obs prev-sub">O valor de cada item (P. Total do Orçamento) espalhado pelos dias úteis do período dele na EAP.</p>
        </div>
        <div className="prev-legenda" aria-hidden="true">
          <span><i className="l-prev" />Previsto (EAP)</span>
          <span><i className="l-real" />Realizado (Diário)</span>
        </div>
      </div>

      <div className="prev-fatos">
        <div><div className="lbl">Previsto com datas na EAP</div><div className="v">{brl(previsao.totalComDatas)}</div><div className="obs">{pctDoVigente}% do orçamento vigente ({brl(vigente)})</div></div>
        <div><div className="lbl">{doMes?.medicao ? `Esta medição (Medição ${doMes.medicao}, ${doMes.rotulo})` : `Este mês (${doMes?.rotulo ?? '—'})`}</div><div className="v">{brl(doMes?.previsto ?? 0)}</div><div className="obs">realizado até agora {brl(doMes?.realizado ?? 0)}</div></div>
        <div><div className="lbl">{maior?.medicao ? 'Período de maior previsão' : 'Mês de maior previsão'}</div><div className="v">{maior ? maior.rotulo : '—'}</div><div className="obs">{maior ? brl(maior.previsto) : 'sem datas'}</div></div>
        <div>
          <div className="lbl">Ainda sem datas na EAP</div><div className="v">{brl(previsao.totalSemDatas)}</div>
          <div className="obs">{previsao.itensSemDatas} item(ns) fora da previsão{previsao.itensSemDatas > 0 && <>; <button className="link" onClick={onIrParaEap}>lançar datas</button></>}</div>
        </div>
      </div>

      {linhas.length ? (
        <>
          <div className="prev-grafico" role="img" aria-label={`Previsto e realizado por mês, de ${linhas[0].rotulo} a ${linhas.at(-1).rotulo}. A tabela abaixo tem os números.`}>
            <div className="prev-barras" style={{ '--meses': linhas.length }}>
              {linhas.map((l) => {
                const atual = l.meses.includes(mesAtual)
                const rotular = atual || l === maior
                return (
                  <div key={l.mes} className={`prev-mes-col${atual ? ' atual' : ''}`}
                    title={`${l.medicao ? `Medição ${l.medicao}, ` : ''}${l.rotulo}: previsto ${brlCentavos(l.previsto)}; realizado ${brlCentavos(l.realizado)}; acumulado previsto ${Math.round(l.pctAcumulado * 100)}%`}>
                    <div className="prev-par">
                      <span className="prev-barra p" style={{ height: `${(l.previsto / topo) * 100}%` }}>{rotular && l.previsto > 0 && <b>{brl(l.previsto)}</b>}</span>
                      <span className="prev-barra r" style={{ height: `${(l.realizado / topo) * 100}%` }} />
                    </div>
                    <span className="prev-rot">{l.rotulo}{atual && <small>hoje</small>}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <details className="prev-tabela">
            <summary>Ver a tabela mês a mês</summary>
            <div className="tbl-wrap">
              <table>
                <thead><tr><th>Período</th><th className="num">Previsto</th><th className="num">Previsto acumulado</th><th className="num">% acumulado</th><th className="num">Realizado</th></tr></thead>
                <tbody>
                  {linhas.map((l) => (
                    <tr key={l.mes} className={l.meses.includes(mesAtual) ? 'atual' : undefined}>
                      <td>{l.medicao ? <>Medição {l.medicao}: </> : null}{l.rotulo}</td><td className="num">{brlCentavos(l.previsto)}</td><td className="num">{brlCentavos(l.previstoAcumulado)}</td>
                      <td className="num">{Math.round(l.pctAcumulado * 100)}%</td><td className="num">{brlCentavos(l.realizado)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td>Total</td><td className="num">{brlCentavos(previsao.totalComDatas)}</td><td /><td /><td className="num">{brlCentavos(linhas.reduce((s, l) => s + l.realizado, 0))}</td></tr></tfoot>
              </table>
            </div>
          </details>
        </>
      ) : <p className="obs">Ainda não há itens com datas na EAP para prever o faturamento.</p>}
    </section>
  )
}
