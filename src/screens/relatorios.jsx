// Relatórios: o BI da obra, para o engenheiro e a diretoria. Cada painel lê os dados do seu módulo (sempre
// pela camada de dados, na obra aberta) e pede as contas a lib/relatorios.js. Painel sem dado mostra
// "Sem dados ainda" e diz onde lançar — nunca quebra nem mostra NaN. Gráficos feitos à mão: CSS e SVG.
// Os filtros de empresa e período valem para todos os painéis (o recorte mora em lib/relatorios.js).
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  buscarCalendario, juntar, listarContratosEmpreiteiro, listarDiarios, listarGrupos, listarLancamentos, listarMedicoes, listarPedidosMaterial,
  listarNcs, listarObservacoesGemba, listarPendencias, listarResponsaveis, listarSemanaAtividades, listarServicos, listarSubtarefas,
  listarVistoriasFvs,
} from '../lib/dados.js'
import {
  DIAS_DE_CLIMA, PERIODOS, SEMANAS_DE_LEAD_TIME, TUDO, barrasPpc, climaEfetivo, curvaS, custoMedido, diasAteEntrega, evolucao, fluxoContratos,
  historicoPpc, itensDaEap, leadTimeMedio, matrizEmpreiteiros, paretoCausas, pedidosAtrasados, pedidosPorEtapa, ppcGeral, saldoPorContrato,
  tendenciaLeadTime, CONFORMIDADE_MINIMA, conformidadePorModelo, ncsEmAberto, desperdiciosDoGemba, descreverFiltrosBi, janelaDoPeriodo, pendenciasPorEmpresa, pendenciasPorLocal,
  recortarDados,
} from '../lib/relatorios.js'
import { COR_DESPERDICIO } from '../lib/qualidade.js'
import { CRITICO } from '../lib/materiais.js'
import { CONSTRUTORA } from '../lib/obras.js'
import { veRelatorios } from '../lib/perfis.js'
import { dataHoraCurta, dataHoraLocal, dm, dmy, hojeISO, segundaDaSemana } from '../lib/datas.js'
import { brl } from '../lib/formato.js'
import { Carregando, ErroCarga, Faixa, Icon, Vazio, useDados } from '../components/index.jsx'

const carregar = () => juntar({
  servicos: listarServicos(), grupos: listarGrupos(), lancamentos: listarLancamentos(), calendario: buscarCalendario(),
  semanaAtividades: listarSemanaAtividades(), subtarefas: listarSubtarefas(), medicoes: listarMedicoes(), diarios: listarDiarios(),
  contratos: listarContratosEmpreiteiro(), pedidos: listarPedidosMaterial(), responsaveis: listarResponsaveis(),
  pendencias: listarPendencias(), vistorias: listarVistoriasFvs(), ncs: listarNcs(), observacoes: listarObservacoesGemba(),
})

function Painel({ titulo, pergunta, children }) {
  return (
    <section className="card bi-painel">
      <header className="bi-painel-h"><h2>{titulo}</h2>{pergunta && <p>{pergunta}</p>}</header>
      <div className="bi-painel-b">{children}</div>
    </section>
  )
}

// Gráfico sem dado: diz o que falta e leva ao módulo onde se lança.
function SemDados({ texto, modulo, onIr }) {
  return (
    <div className="bi-sem-dados">
      <Icon nome="avanco" tamanho={28} />
      <b>Sem dados ainda</b>
      <span>{texto}</span>
      {onIr && <button className="btn ghost no-print" onClick={onIr}>Abrir {modulo}</button>}
    </div>
  )
}

function Grafico({ titulo, legenda, children }) {
  return (
    <figure className="bi-grafico">
      <figcaption><b>{titulo}</b>{legenda && <span className="bi-legenda">{legenda}</span>}</figcaption>
      {children}
    </figure>
  )
}
const Cor = ({ classe, children }) => <span className="bi-leg"><i className={classe} />{children}</span>

/* ── Curva S: planejado (cinza) × real (turquesa, com área) ── */
const W = 640
const H = 240
const M = { l: 40, r: 14, t: 14, b: 30 }
function CurvaS({ pontos, hoje }) {
  const n = pontos.length
  const x = (i) => M.l + (n > 1 ? (i * (W - M.l - M.r)) / (n - 1) : (W - M.l - M.r) / 2)
  const y = (v) => M.t + ((100 - v) / 100) * (H - M.t - M.b)
  const linha = (vals) => vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const reais = pontos.map((p) => p.real).filter((v) => v !== null)
  const area = reais.length ? `M${x(0)},${y(0)} L${linha(reais).replaceAll(' ', ' L')} L${x(reais.length - 1)},${y(0)} Z` : ''
  const passo = Math.max(1, Math.ceil(n / 7))
  const iHoje = pontos.findIndex((p) => p.semana === segundaDaSemana(hoje))
  return (
    <div className="bi-rola">
      <svg className="bi-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Curva S: hoje ${reais.at(-1) ?? 0}% feito`}>
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line className="bi-grade" x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} />
            <text className="bi-eixo" x={M.l - 6} y={y(v) + 4} textAnchor="end">{v}%</text>
          </g>
        ))}
        {pontos.map((p, i) => i % passo === 0 && <text key={p.semana} className="bi-eixo" x={x(i)} y={H - 10} textAnchor="middle">{dm(p.semana)}</text>)}
        {iHoje >= 0 && (
          <g>
            <line className="bi-hoje" x1={x(iHoje)} x2={x(iHoje)} y1={M.t} y2={H - M.b} />
            <text className="bi-eixo forte" x={x(iHoje) + 4} y={M.t + 10}>hoje</text>
          </g>
        )}
        {area && <path className="bi-area" d={area} />}
        <polyline className="bi-linha plan" points={linha(pontos.map((p) => p.planejado))} />
        {reais.length > 0 && <polyline className="bi-linha real" points={linha(reais)} />}
        {pontos.map((p, i) => (
          <rect key={p.semana} className="bi-alvo" x={x(i) - (W - M.l - M.r) / Math.max(1, n - 1) / 2} y={M.t} width={(W - M.l - M.r) / Math.max(1, n - 1)} height={H - M.t - M.b}>
            <title>{`Semana de ${dm(p.semana)}: planejado ${p.planejado.toLocaleString('pt-BR')}%${p.real === null ? '' : `, real ${p.real.toLocaleString('pt-BR')}%`}`}</title>
          </rect>
        ))}
      </svg>
    </div>
  )
}

// Donut: a fatia turquesa é a parte feita; o número grande fica no furo.
function Donut({ valor, rotulo }) {
  return (
    <div className="bi-donut" style={{ '--p': `${valor}%` }} role="img" aria-label={`${rotulo}: ${valor}%`}>
      <div className="bi-donut-furo"><b>{valor}%</b><span>{rotulo}</span></div>
    </div>
  )
}

function Executivo({ dados, itens, historico, janela, filtrando, obra, hoje, goto }) {
  const evo = evolucao({ itens, lancamentos: dados.lancamentos, hoje, cal: dados.calendario })
  const curva = curvaS({ itens, lancamentos: dados.lancamentos, hoje, cal: dados.calendario, desde: janela.desde })
  const prazo = diasAteEntrega(obra?.data_entrega, hoje)
  const custo = custoMedido(dados.medicoes)
  const ppc = ppcGeral(historico)
  const irPlanejamento = () => goto('planejamento')

  return (
    <Painel titulo="Executivo" pergunta="Como está a saúde da obra hoje?">
      <div className="bi-kpis">
        <div className={`bi-kpi ${evo ? (evo.diferenca >= 0 ? 'ok' : 'red') : ''}`}>
          <span className="lbl">Evolução</span>
          {evo ? (
            <>
              <div className="num">{evo.real}%<small> | plan {evo.planejado}%</small></div>
              <span className="sub">{evo.diferenca >= 0 ? '▲' : '▼'} {Math.abs(evo.diferenca)} {Math.abs(evo.diferenca) === 1 ? 'ponto' : 'pontos'} {evo.diferenca >= 0 ? 'à frente' : 'atrás'} do planejado</span>
            </>
          ) : <><div className="num">—</div><span className="sub">Lance as datas da EAP</span></>}
        </div>
        <div className={`bi-kpi ${prazo !== null && prazo < 0 ? 'red' : ''}`}>
          <span className="lbl">Prazo</span>
          {prazo === null ? <><div className="num">—</div><span className="sub">Sem data de entrega</span></> : (
            <>
              <div className="num">{Math.abs(prazo).toLocaleString('pt-BR')}<small> {Math.abs(prazo) === 1 ? 'dia' : 'dias'}</small></div>
              <span className="sub">{prazo >= 0 ? `até a entrega em ${dmy(obra.data_entrega)}` : `de atraso: a entrega era ${dmy(obra.data_entrega)}`}</span>
            </>
          )}
        </div>
        <div className="bi-kpi">
          <span className="lbl">Custo medido</span>
          {custo ? (
            <>
              <div className="num">{brl(custo.valor)}</div>
              <span className="sub">{custo.medicoes ? `${custo.medicoes} ${custo.medicoes === 1 ? 'medição fechada' : 'medições fechadas'} do cliente${filtrando ? ' (obra toda)' : ''}` : 'Nenhuma medição fechada ainda'}</span>
            </>
          ) : <><div className="num">—</div><span className="sub">Sem valores para este perfil</span></>}
        </div>
      </div>

      <div className="bi-dupla">
        <Grafico titulo="Curva S" legenda={curva && <><Cor classe="plan">Planejado acumulado</Cor><Cor classe="real">Real acumulado</Cor></>}>
          {curva ? <CurvaS pontos={curva} hoje={hoje} />
            : <SemDados texto="A Curva S sai das datas de início e fim dos itens da EAP." modulo="Planejamento" onIr={irPlanejamento} />}
        </Grafico>
        <Grafico titulo={`PPC geral (${janela.semanas} ${janela.semanas === 1 ? 'semana' : 'semanas'})`} legenda={ppc && <><Cor classe="real">Concluídas</Cor><Cor classe="cinza">Não concluídas</Cor></>}>
          {ppc ? (
            <div className="bi-donut-caixa">
              <Donut valor={ppc.valor} rotulo="PPC" />
              <span className="bi-nota">{ppc.concluidas} de {ppc.total} atividades planejadas concluídas</span>
            </div>
          ) : <SemDados texto="O PPC sai do Kanban da semana, no Planejamento › Curto prazo." modulo="Planejamento" onIr={irPlanejamento} />}
        </Grafico>
      </div>
    </Painel>
  )
}

/* ── Ritmo e produção ── */

// PPC semanal: barras empilhadas (verde concluídas embaixo, vermelho não concluídas em cima), altura pelo total.
function BarrasPpc({ semanas, atual }) {
  const maior = Math.max(1, ...semanas.map((s) => s.total))
  return (
    <div className="bi-rola">
      <div className="bi-colunas" role="img" aria-label="PPC por semana">
        {semanas.map((s) => (
          <div key={s.semana} className={`bi-coluna${s.semana === atual ? ' atual' : ''}`} title={`${s.semana === atual ? 'Semana atual, ainda em andamento' : `Semana de ${dm(s.semana)}`}: ${s.concluidas} de ${s.total} concluídas${s.valor === null ? '' : ` (${s.valor}%)`}`}>
            <span className="bi-coluna-v">{s.valor === null ? '—' : `${s.valor}%`}</span>
            <div className="bi-coluna-trilho">
              <div className="bi-pilha" style={{ height: `${(s.total / maior) * 100}%` }}>
                {s.naoConcluidas > 0 && <i className="nao" style={{ flexGrow: s.naoConcluidas }} />}
                {s.concluidas > 0 && <i className="sim" style={{ flexGrow: s.concluidas }} />}
              </div>
            </div>
            <span className="bi-coluna-x">{s.semana === atual ? 'atual' : dm(s.semana)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Pareto: barras horizontais da causa mais frequente para a menos, com a % acumulada.
function Pareto({ causas }) {
  const maior = causas[0].n
  return (
    <ol className="bi-barras-h">
      {causas.map((c) => (
        <li key={c.causa}>
          <span className="nome">{c.causa}</span>
          <span className="trilho"><span className="barra" style={{ width: `${(c.n / maior) * 100}%` }} /></span>
          <span className="valor"><b>{c.n}</b> <small>{c.pct}% · acum. {c.acumulado}%</small></span>
        </li>
      ))}
    </ol>
  )
}

// Ícone do clima desenhado no SVG (sol, nuvem, chuva), centrado em (cx, cy).
function IconeClima({ icone, cx, cy }) {
  if (icone === 'sol') return <circle className="bi-sol" cx={cx} cy={cy} r={6} />
  const nuvem = <path className="bi-nuvem" d={`M${cx - 8},${cy + 3} a4,4 0 0 1 2,-7 a5,5 0 0 1 9,-1 a4,4 0 0 1 5,8 z`} />
  if (icone === 'nuvem') return nuvem
  const gotas = icone === 'chuva-forte' ? [-5, 0, 5] : [-3, 3]
  return <g>{nuvem}{gotas.map((dx) => <line key={dx} className="bi-gota" x1={cx + dx} x2={cx + dx - 2} y1={cy + 6} y2={cy + 11} />)}</g>
}

// Clima e efetivo: colunas = pessoas no dia; o ícone em cima = clima; dia de chuva com fundo azulado.
const CW = 960
const CH = 230
const CM = { l: 34, r: 8, t: 30, b: 28 }
function ClimaEfetivo({ dias }) {
  const n = dias.length
  const largura = (CW - CM.l - CM.r) / n
  const topo = Math.max(5, Math.ceil(Math.max(...dias.map((d) => d.efetivo)) / 5) * 5)
  const y = (v) => CM.t + (1 - v / topo) * (CH - CM.t - CM.b)
  return (
    <div className="bi-rola">
      <svg className="bi-svg" viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label={`Efetivo e clima dos últimos ${n} diários`}>
        {[0, topo / 2, topo].map((v) => (
          <g key={v}>
            <line className="bi-grade" x1={CM.l} x2={CW - CM.r} y1={y(v)} y2={y(v)} />
            <text className="bi-eixo" x={CM.l - 6} y={y(v) + 4} textAnchor="end">{v}</text>
          </g>
        ))}
        {dias.map((d, i) => {
          const x = CM.l + i * largura
          return (
            <g key={d.data}>
              {d.chuva && <rect className="bi-chuva" x={x} y={CM.t - 24} width={largura} height={CH - CM.t - CM.b + 24} />}
              <rect className="bi-efetivo" x={x + largura * 0.2} y={y(d.efetivo)} width={largura * 0.6} height={y(0) - y(d.efetivo)} rx={2} />
              {d.icone && <IconeClima icone={d.icone} cx={x + largura / 2} cy={CM.t - 14} />}
              {(n <= 10 || i % 2 === 0) && <text className="bi-eixo" x={x + largura / 2} y={CH - 10} textAnchor="middle">{dm(d.data)}</text>}
              <rect className="bi-alvo" x={x} y={CM.t - 24} width={largura} height={CH - CM.t - CM.b + 24}>
                <title>{`${dm(d.data)}: ${d.efetivo} ${d.efetivo === 1 ? 'pessoa' : 'pessoas'}, ${d.clima ?? 'clima não informado'}`}</title>
              </rect>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function Ritmo({ dados, historico, janela, hoje, goto }) {
  const semanas = barrasPpc(historico)
  const causas = paretoCausas({ registros: dados.semanaAtividades, subtarefas: dados.subtarefas, hoje, semanas: janela.semanas })
  const dias = climaEfetivo(dados.diarios)
  const irPlanejamento = () => goto('planejamento')
  return (
    <Painel titulo="Ritmo e produção" pergunta="A obra está cumprindo o que planeja na semana? O que trava?">
      <div className="bi-dupla meio">
        <Grafico titulo={`PPC semanal (${janela.semanas} ${janela.semanas === 1 ? 'semana' : 'semanas'})`} legenda={semanas && <><Cor classe="sim">Concluídas</Cor><Cor classe="nao">Não concluídas</Cor></>}>
          {semanas ? <BarrasPpc semanas={semanas} atual={segundaDaSemana(hoje)} />
            : <SemDados texto="O PPC sai do Kanban da semana, no Planejamento › Curto prazo." modulo="Planejamento" onIr={irPlanejamento} />}
        </Grafico>
        <Grafico titulo="Pareto das causas (não realizadas)">
          {causas ? <Pareto causas={causas} />
            : <SemDados texto={`Nenhuma atividade não realizada ${janela.semanas === 1 ? 'nesta semana' : `nas últimas ${janela.semanas} semanas`}.`} />}
        </Grafico>
      </div>
      <Grafico titulo={`Clima e efetivo (${dias && dias.length < DIAS_DE_CLIMA ? (dias.length === 1 ? '1 diário' : `${dias.length} diários`) : `últimos ${DIAS_DE_CLIMA} diários`})`}
        legenda={dias && <><Cor classe="real">Pessoas na obra</Cor><Cor classe="chuva">Dia com chuva</Cor></>}>
        {dias ? <ClimaEfetivo dias={dias} />
          : <SemDados texto="Clima e efetivo saem do Diário de cada dia." modulo="Diário" onIr={() => goto('diario')} />}
      </Grafico>
    </Painel>
  )
}

/* ── Contratos e medições ── */

// Mini-cartões de contagem (fluxo dos contratos, pedidos por etapa).
function Contagens({ itens }) {
  return (
    <div className="bi-contagens">
      {itens.map((x) => (
        <div key={x.rotulo} className={`bi-contagem${x.n ? '' : ' zero'}`}>
          <span className="lbl">{x.rotulo}</span>
          <b>{x.n}</b>
          {x.sub && <span className="sub">{x.sub}</span>}
        </div>
      ))}
    </div>
  )
}

// Barras horizontais em R$ (saldo a medir por contrato).
function BarrasReais({ linhas }) {
  const maior = Math.max(1, ...linhas.map((l) => l.valor))
  return (
    <ol className="bi-barras-h largo">
      {linhas.map((l) => (
        <li key={l.id}>
          <span className="nome" title={l.nome}>{l.nome}<small>{l.sub}</small></span>
          <span className="trilho"><span className="barra" style={{ width: `${(l.valor / maior) * 100}%` }} /></span>
          <span className="valor"><b>{brl(l.valor)}</b></span>
        </li>
      ))}
    </ol>
  )
}

function Contratos({ dados, periodoAtivo, goto }) {
  const fluxo = fluxoContratos(dados.contratos)
  const matriz = matrizEmpreiteiros(dados.contratos)
  const saldos = saldoPorContrato(dados.contratos)
  const ir = () => goto('empreiteiros')
  if (!fluxo) {
    return (
      <Painel titulo="Contratos e medições" pergunta="Quanto já foi medido aos empreiteiros e quanto ainda vai sair do caixa?">
        <SemDados texto="Os contratos e boletins saem da Medição empreiteiros." modulo="Medição empreiteiros" onIr={ir} />
      </Painel>
    )
  }
  return (
    <Painel titulo="Contratos e medições" pergunta="Quanto já foi medido aos empreiteiros e quanto ainda vai sair do caixa?">
      {periodoAtivo && <p className="bi-nota esq">Contratos e saldos são a situação de hoje: o período não se aplica.</p>}
      <Grafico titulo="Fluxo dos contratos">
        <Contagens itens={fluxo.map((e) => ({
          rotulo: e.status, n: e.n,
          sub: e.n ? `${brl(e.valor)}${e.semValor ? ` · ${e.semValor} sem valor` : ''}` : null,
        }))} />
      </Grafico>
      <Grafico titulo="Empreiteiros (contratos aprovados e concluídos)">
        {matriz ? (
          <div className="bi-rola">
            <table className="bi-tabela">
              <thead><tr><th>Empreiteiro</th><th className="n">Valor total</th><th>% medido</th><th className="n">Saldo a medir</th></tr></thead>
              <tbody>
                {matriz.map((x) => (
                  <tr key={x.responsavel_id}>
                    <td><b>{x.empreiteiro}</b><br /><small>{x.contratos} {x.contratos === 1 ? 'contrato' : 'contratos'}</small></td>
                    <td className="n">{brl(x.valor)}</td>
                    <td><div className="bi-celula-barra" title={`${brl(x.medido)} medidos`}><span style={{ width: `${Math.min(100, x.pct)}%` }} /><b>{x.pct}%</b></div></td>
                    <td className="n">{brl(x.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <SemDados texto="Nenhum contrato aprovado com valor ainda." modulo="Medição empreiteiros" onIr={ir} />}
      </Grafico>
      <Grafico titulo="Saldo a medir por contrato ativo">
        {saldos ? <BarrasReais linhas={saldos.map((c) => ({ id: c.id, nome: c.descricao, sub: c.empreiteiro, valor: c.saldo }))} />
          : <SemDados texto="Nenhum contrato ativo com saldo a medir." />}
      </Grafico>
    </Painel>
  )
}

/* ── Materiais ── */

function TendenciaLeadTime({ semanas }) {
  const maior = Math.max(1, ...semanas.map((s) => s.dias ?? 0))
  return (
    <div className="bi-colunas baixo" role="img" aria-label="Lead time médio por semana">
      {semanas.map((s) => (
        <div key={s.semana} className="bi-coluna" title={s.dias === null ? `Semana de ${dm(s.semana)}: nenhum pedido chegou` : `Semana de ${dm(s.semana)}: ${s.dias.toLocaleString('pt-BR')} dias (${s.pedidos} ${s.pedidos === 1 ? 'pedido' : 'pedidos'})`}>
          <span className="bi-coluna-v">{s.dias === null ? '—' : s.dias.toLocaleString('pt-BR')}</span>
          <div className="bi-coluna-trilho">
            {s.dias !== null && <div className="bi-pilha"><i className="lead" style={{ height: `${(s.dias / maior) * 120}px` }} /></div>}
          </div>
          <span className="bi-coluna-x">{dm(s.semana)}</span>
        </div>
      ))}
    </div>
  )
}

function Materiais({ dados, janela, filtrando, hoje, goto }) {
  const etapas = pedidosPorEtapa(dados.pedidos)
  const ir = () => goto('materiais')
  if (!etapas) {
    return (
      <Painel titulo="Materiais" pergunta="O material está chegando a tempo na frente de serviço?">
        <SemDados texto="Os pedidos saem do Kanban de Materiais." modulo="Materiais" onIr={ir} />
      </Painel>
    )
  }
  const atrasados = pedidosAtrasados(dados.pedidos, hoje)
  const lead = leadTimeMedio(dados.pedidos, janela.desde)
  const tendencia = tendenciaLeadTime(dados.pedidos, hoje)
  return (
    <Painel titulo="Materiais" pergunta="O material está chegando a tempo na frente de serviço?">
      {filtrando && <p className="bi-nota esq">Pedidos de material não têm empresa: este painel é da obra toda.</p>}
      <Grafico titulo="Pedidos por etapa">
        <Contagens itens={etapas.map((e) => ({ rotulo: e.status, n: e.n }))} />
      </Grafico>
      <div className={`bi-atrasados${atrasados.length ? '' : ' nenhum'}`}>
        <div className="bi-atrasados-h"><b>{atrasados.length}</b><span>{atrasados.length === 1 ? 'pedido atrasado' : 'pedidos atrasados'}</span></div>
        {atrasados.length ? (
          <ul>
            {atrasados.map((p) => (
              <li key={p.id}>
                <span><b>{p.material}</b>{p.critico && <span className="pill red">{CRITICO}</span>}<br /><small>{p.frente}</small></span>
                <span className="dias">{p.dias} {p.dias === 1 ? 'dia' : 'dias'}</span>
              </li>
            ))}
          </ul>
        ) : <span className="sub">Nenhum pedido comprado passou da previsão de entrega.</span>}
      </div>
      <div className="bi-dupla meio">
        <Grafico titulo="Lead time médio">
          {lead ? (
            <div className="bi-lead">
              <b>{lead.dias.toLocaleString('pt-BR')}<small> {lead.dias === 1 ? 'dia' : 'dias'}</small></b>
              <span>do pedido à chegada no almoxarifado ({lead.pedidos} {lead.pedidos === 1 ? 'pedido' : 'pedidos'})</span>
            </div>
          ) : <SemDados texto="Nenhum pedido chegou ao almoxarifado ainda." />}
        </Grafico>
        <Grafico titulo={`Tendência (${SEMANAS_DE_LEAD_TIME} semanas)`}>
          {tendencia ? <TendenciaLeadTime semanas={tendencia} />
            : <SemDados texto={`Nenhum pedido chegou nas últimas ${SEMANAS_DE_LEAD_TIME} semanas.`} />}
        </Grafico>
      </div>
    </Painel>
  )
}

/* ── Qualidade e entrega ── */

// Cores das fatias do donut de empresas, em ordem fixa (a última é "Outras").
const CORES_FATIA = ['#007C89', '#E3A23B', '#5B3A8C', '#2A7F51', '#8A979E']

function DonutEmpresas({ fatias }) {
  const total = fatias.reduce((s, f) => s + f.n, 0)
  // Cada fatia vai do fim da anterior (soma das de antes) até o seu fim.
  const paradas = fatias.map((f, i) => {
    const inicio = (fatias.slice(0, i).reduce((s, x) => s + x.n, 0) / total) * 100
    return `${CORES_FATIA[i % CORES_FATIA.length]} ${inicio}% ${inicio + (f.n / total) * 100}%`
  })
  return (
    <div className="bi-donut-legenda">
      <div className="bi-donut" style={{ background: `conic-gradient(${paradas.join(', ')})` }} role="img" aria-label={`Pendências em aberto por empresa: ${total}`}>
        <div className="bi-donut-furo"><b>{total}</b><span>em aberto</span></div>
      </div>
      <ul className="bi-legenda-lista">
        {fatias.map((f, i) => (
          <li key={f.id}><i style={{ background: CORES_FATIA[i % CORES_FATIA.length] }} /><span>{f.nome}</span><b>{f.n}</b><small>{f.pct}%</small></li>
        ))}
      </ul>
    </div>
  )
}

// Treemap simplificado: cada local é um bloco que cresce com o número de pendências em aberto.
function MapaLocais({ locais }) {
  const maior = locais[0].n
  return (
    <div className="bi-mapa">
      {locais.map((l) => (
        <div key={l.local} className="bi-mapa-bloco" title={`${l.local}: ${l.n} ${l.n === 1 ? 'pendência' : 'pendências'} em aberto`}
          style={{ flex: `${l.n} 1 ${70 + l.n * 50}px`, '--forca': 0.35 + 0.65 * (l.n / maior) }}>
          <b>{l.n}</b><span>{l.local}</span>
        </div>
      ))}
    </div>
  )
}

function Qualidade({ dados, filtrando, periodoAtivo, goto }) {
  const fichas = conformidadePorModelo(dados.vistorias)
  const ncs = ncsEmAberto(dados.ncs)
  const empresas = pendenciasPorEmpresa(dados.pendencias)
  const locais = pendenciasPorLocal(dados.pendencias)
  const desperdicios = desperdiciosDoGemba(dados.observacoes)
  const ir = () => goto('qualidade')
  return (
    <Painel titulo="Qualidade e entrega" pergunta="Onde a obra erra, quem precisa ser cobrado e onde se perde dinheiro?">
      <div className={`bi-ncs${ncs ? '' : ' nenhum'}`}>
        <b>{ncs ? ncs.total : 0}</b>
        <span>{ncs ? `${ncs.total === 1 ? 'não conformidade em aberto' : 'não conformidades em aberto'}${ncs.alta ? ` (${ncs.alta} de severidade alta)` : ''}` : 'Nenhuma não conformidade em aberto.'}</span>
        {periodoAtivo && <small>Pendências e NCs em aberto são a situação de hoje: o período não se aplica.</small>}
      </div>
      <div className="bi-dupla meio">
        <Grafico titulo="% conforme por ficha de FVS" legenda={fichas && <><Cor classe="real">Conforme</Cor><Cor classe="nao">Abaixo de {CONFORMIDADE_MINIMA}%</Cor></>}>
          {fichas ? (
            <>
              <ol className="bi-barras-h largo">
                {fichas.map((f) => (
                  <li key={f.modelo_id}>
                    <span className="nome" title={f.ficha}>{f.ficha}<small>{f.vistorias} {f.vistorias === 1 ? 'vistoria' : 'vistorias'}</small></span>
                    <span className="trilho"><span className={`barra ${f.baixa ? 'baixa' : ''}`} style={{ width: `${f.pct}%` }} /></span>
                    <span className="valor"><b>{f.pct}%</b></span>
                  </li>
                ))}
              </ol>
              {filtrando && <p className="bi-nota esq">As vistorias não têm empresa: este gráfico é da obra toda.</p>}
            </>
          ) : <SemDados texto="A conformidade sai das vistorias da FVS (Qualidade › FVS)." modulo="Qualidade" onIr={ir} />}
        </Grafico>
        <Grafico titulo="Pendências em aberto por empresa">
          {empresas ? <DonutEmpresas fatias={empresas} />
            : <SemDados texto="Nenhuma pendência de vistoria em aberto." modulo="Qualidade" onIr={ir} />}
        </Grafico>
      </div>
      <div className="bi-dupla meio">
        <Grafico titulo="Mapa das pendências por local" legenda={locais && <span>Bloco maior e mais escuro: mais pendências em aberto</span>}>
          {locais ? <MapaLocais locais={locais} /> : <SemDados texto="Nenhuma pendência de vistoria em aberto." />}
        </Grafico>
        <Grafico titulo="Ranking de desperdícios (Gemba Walk)">
          {desperdicios ? (
            <ol className="bi-barras-h largo">
              {desperdicios.map((d) => (
                <li key={d.tipo}>
                  <span className="nome">{d.tipo}</span>
                  <span className="trilho"><span className={`barra gem-cor-${COR_DESPERDICIO[d.tipo]}`} style={{ width: `${(d.n / desperdicios[0].n) * 100}%` }} /></span>
                  <span className="valor"><b>{d.n}</b></span>
                </li>
              ))}
            </ol>
          ) : <SemDados texto="As observações saem do Gemba Walk (Qualidade › Gemba Walk)." modulo="Qualidade" onIr={ir} />}
        </Grafico>
      </div>
    </Painel>
  )
}

/* ── Os painéis juntos (na tela e no relatório para imprimir) ── */

function Paineis({ dados, janela, filtrando, obra, hoje, goto }) {
  // A EAP e o PPC das semanas servem a mais de um painel: calculados uma vez.
  const itens = itensDaEap({ servicos: dados.servicos, grupos: dados.grupos, lancamentos: dados.lancamentos, hoje, cal: dados.calendario })
  const historico = historicoPpc({ itens, registros: dados.semanaAtividades, lancamentos: dados.lancamentos, hoje, semanas: janela.semanas })
  return (
    <>
      <Executivo dados={dados} itens={itens} historico={historico} janela={janela} filtrando={filtrando} obra={obra} hoje={hoje} goto={goto} />
      <Ritmo dados={dados} historico={historico} janela={janela} hoje={hoje} goto={goto} />
      <div className="bi-par">
        <Contratos dados={dados} periodoAtivo={!!janela.desde} goto={goto} />
        <Materiais dados={dados} janela={janela} filtrando={filtrando} hoje={hoje} goto={goto} />
      </div>
      <Qualidade dados={dados} filtrando={filtrando} periodoAtivo={!!janela.desde} goto={goto} />
    </>
  )
}

// Relatório executivo para imprimir: camada própria por cima do app (portal no body), como o da Qualidade.
// Na impressão só ela sai no papel (index.css, @media print).
function RelatorioExecutivo({ obra, filtros, hoje, onFechar, children }) {
  useEffect(() => {
    document.body.classList.add('com-relatorio')
    const esc = (e) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', esc)
    return () => { document.body.classList.remove('com-relatorio'); window.removeEventListener('keydown', esc) }
  }, [])
  return createPortal(
    <div className="relatorio" role="dialog" aria-modal="true" aria-label="Relatório executivo da obra">
      <div className="rel-barra no-print">
        <button className="btn primary" onClick={() => window.print()}>Imprimir</button>
        <button className="btn ghost" onClick={onFechar} autoFocus>Fechar</button>
      </div>
      <article className="rel-papel bi-papel">
        <header className="rel-cab">
          <div className="rel-marca">{CONSTRUTORA}</div>
          <h1>RELATÓRIO EXECUTIVO DA OBRA</h1>
          <div className="rel-obra">{obra?.nome}{obra?.codigo ? ` (${obra.codigo})` : ''}</div>
          <div className="rel-meta">{dmy(hoje)}. {filtros}</div>
        </header>
        <div className="bi">{children}</div>
        <footer className="rel-rodape">Gerado automaticamente em {dataHoraCurta(dataHoraLocal(new Date()))}.</footer>
      </article>
    </div>,
    document.body,
  )
}

export default function Relatorios({ profile, obra, goto }) {
  const { data, erro, carregando, recarregar } = useDados(carregar)
  const [filtro, setFiltro] = useState({ responsavel_id: '', periodo: TUDO })
  const [imprimindo, setImprimindo] = useState(false)
  if (!veRelatorios(profile.role)) {
    return <div className="view"><Vazio titulo="Os relatórios são do engenheiro e da diretoria" texto="Seu perfil acompanha a obra pelas suas próprias telas." /></div>
  }
  if (carregando) return <Carregando />
  if (erro) return <ErroCarga erro={erro} onTentar={recarregar} />
  const hoje = hojeISO()
  const dados = recortarDados(data, filtro, hoje)
  const janela = janelaDoPeriodo(filtro.periodo, hoje)
  const filtrando = !!filtro.responsavel_id
  const nomeDe = Object.fromEntries(data.responsaveis.map((r) => [r.id, r.nome]))
  const paineis = (irPara) => <Paineis dados={dados} janela={janela} filtrando={filtrando} obra={obra} hoje={hoje} goto={irPara} />
  return (
    <>
      <Faixa><div className="faixa-titulo">Relatórios da obra</div></Faixa>
      <div className="bi-filtros no-print" role="group" aria-label="Filtros dos relatórios">
        <select className="ipt" value={filtro.responsavel_id} aria-label="Empresa" onChange={(e) => setFiltro({ ...filtro, responsavel_id: e.target.value })}>
          <option value="">Todas as empresas</option>
          {data.responsaveis.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
        </select>
        <div className="filters" role="group" aria-label="Período">
          {PERIODOS.map((p) => <button key={p} aria-pressed={filtro.periodo === p} onClick={() => setFiltro({ ...filtro, periodo: p })}>{p}</button>)}
        </div>
        <button className="btn ghost bi-imprimir" onClick={() => setImprimindo(true)}><Icon nome="planilha" tamanho={18} />Imprimir relatório executivo</button>
      </div>
      <div className="view larga bi">{paineis(goto)}</div>
      {imprimindo && (
        <RelatorioExecutivo obra={obra} filtros={descreverFiltrosBi(filtro, nomeDe)} hoje={hoje} onFechar={() => setImprimindo(false)}>
          {paineis((tela) => { setImprimindo(false); goto(tela) })}
        </RelatorioExecutivo>
      )}
    </>
  )
}
