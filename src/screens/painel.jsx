// Painel do mês — a tela de toda manhã. As contas vêm prontas de lib/painel.js.
import { useState } from 'react'
import { buscarCalendario, buscarMedicaoAtual, juntar, listarItensMedicao, listarLancamentos, listarMedicoes, listarResponsaveis, listarServicos, listarDiarios } from '../lib/dados.js'
import { COR_SITUACAO, FILTROS_PAINEL, analisarServico, ordenarPainel, sinalEntrega, totaisDoMes } from '../lib/painel.js'
import { podeVerValores, podeEditar } from '../lib/perfis.js'
import { brl, pct, qtd } from '../lib/formato.js'
import { diasEntre, dm, dmy, hojeISO } from '../lib/datas.js'
import { Barra, Carregando, Critico, Dinheiro, ErroCarga, Faixa, Meta, Pill, Vazio, useDados, avisar } from '../components/index.jsx'
import ServicoDetalhe from './servicoDetalhe.jsx'
import PrevisaoMensal from './previsaoMensal.jsx'

async function carregar() {
  const r = await juntar({ servicos: listarServicos(), lancamentos: listarLancamentos(), medicao: buscarMedicaoAtual(), responsaveis: listarResponsaveis(), diarios: listarDiarios(), calendario: buscarCalendario(), medicoes: listarMedicoes() })
  if (r.erro || !r.data.medicao) return r
  const itens = await listarItensMedicao(r.data.medicao.id)
  if (itens.erro) return itens
  return { data: { ...r.data, itens: itens.data }, erro: null }
}

const ABAS = [['todos', 'Todos'], ['parados', 'Parados', true], ['atrasados', 'Atrasados', true], ['atencao', 'Atenção'], ['criticos', 'Críticos']]

export default function Painel({ profile, obra, goto }) {
  const { data, erro, carregando, recarregar } = useDados(carregar)
  const [filtro, setFiltro] = useState('todos')
  const [aberto, setAberto] = useState(null)
  const comValores = podeVerValores(profile.role)
  const hoje = hojeISO()

  if (carregando) return <Carregando />
  if (erro) return <ErroCarga erro={erro} onTentar={recarregar} />

  const { servicos, lancamentos, medicao, responsaveis, diarios } = data
  if (!servicos.length) {
    return (
      <div className="view">
        <Vazio titulo="Esta obra ainda não tem serviços"
          texto="Importe a planilha contratual e a tela Início passa a mostrar, toda manhã, o que está andando e o que parou."
          acao={podeEditar(profile.role) ? 'Ir para Orçamento' : null} onAcao={() => goto('orcamento')} />
      </div>
    )
  }

  const itemDe = Object.fromEntries((data.itens ?? []).map((i) => [i.servico_id, i]))
  const nomeResp = Object.fromEntries(responsaveis.map((r) => [r.id, r.nome]))
  const analises = servicos.filter((s) => s.ativo).map((s) =>
    analisarServico({ servico: s, lancamentos, item: itemDe[s.id] ?? null, medicao, hoje }))
  const doMes = analises.filter((a) => a.noMes)
  const sinal = sinalEntrega(analises, obra.data_entrega)
  const lista = ordenarPainel(doMes.filter(FILTROS_PAINEL[filtro]), comValores)
  const contagem = Object.fromEntries(Object.keys(FILTROS_PAINEL).map((k) => [k, doMes.filter(FILTROS_PAINEL[k]).length]))
  const vermelhos = doMes.filter((a) => COR_SITUACAO[a.situacao] === 'red')
  const atencao = doMes.filter((a) => a.situacao === 'Atenção')
  const concluidos = doMes.filter((a) => a.situacao === 'Concluído')
  const tot = totaisDoMes(analises)
  const decorrido = medicao ? Math.min(100, pct(diasEntre(medicao.data_inicio, hoje) + 1, diasEntre(medicao.data_inicio, medicao.data_fim) + 1)) : 0
  const feito = pct(tot.executado, tot.planejado)
  const diarioHoje = diarios.find((x) => x.data === hoje)
  const curto = (id) => (nomeResp[id] ?? '—').replace(/^(Construtora|Empreiteira) /, '')
  const alternar = (f) => setFiltro((atual) => (atual === f ? 'todos' : f))
  // Previsão de faturamento pela EAP: só quem vê valores.
  const previsao = comValores && <PrevisaoMensal dados={{ servicos, lancamentos, calendario: data.calendario, medicoes: data.medicoes }} hoje={hoje} onIrParaEap={() => goto('planejamento')} />

  return (
    <>
      <Faixa>
        <div className="tabs" role="tablist" aria-label="Filtrar serviços do mês">
          {ABAS.map(([id, rotulo, vermelho]) => (
            <button key={id} role="tab" aria-selected={filtro === id} className={`tab ${vermelho && contagem[id] ? 'red' : ''}`} onClick={() => setFiltro(id)}>
              {rotulo}<span className="n">{contagem[id]}</span>
            </button>
          ))}
        </div>
      </Faixa>

      <div className="view">
        <section className={`card sinal ${sinal.cor}`} aria-label="Situação da entrega">
          <div className="bar" />
          <div className="body">
            <div className="quando">A entrega de <b>{dmy(obra.data_entrega)}</b> está</div>
            <div className="big">{sinal.texto}</div>
            <div className="why">{sinal.motivo}</div>
          </div>
        </section>

        {!medicao ? (
          <>
          <Vazio icone="medicao" titulo="Nenhuma medição em andamento"
            texto="O painel compara o executado com a meta do mês. Monte e inicie a medição do mês para ele começar a mostrar os números."
            acao={podeEditar(profile.role) ? 'Ir para Medição cliente' : null} onAcao={() => goto('medicao')} />
          {previsao}
          </>
        ) : (
          <>
            {comValores ? (
              <section className="card kpis" aria-label="Números do mês">
                <div className="kpi"><div className="lbl">Executado no mês</div><div className="num"><Dinheiro valor={tot.executado} /></div><div className="sub">{feito}% da meta de {brl(tot.planejado)}</div></div>
                <button className="kpi red" aria-pressed={filtro === 'parados'} onClick={() => alternar('parados')}><div className="lbl">Parados</div><div className="num">{contagem.parados}</div><div className="sub">{vermelhos.length} em vermelho no total</div></button>
                <button className="kpi amber" aria-pressed={filtro === 'atencao'} onClick={() => alternar('atencao')}><div className="lbl">Atenção</div><div className="num">{atencao.length}</div><div className="sub">passaram da data limite</div></button>
                <div className="kpi w4"><div className="lbl">Falta executar</div><div className="num"><Dinheiro valor={tot.falta} /></div><div className="sub">até {dm(medicao.data_fim)}</div></div>
              </section>
            ) : (
              <section className="card kpis" aria-label="Números do mês">
                <button className="kpi red" aria-pressed={filtro === 'parados'} onClick={() => alternar('parados')}><div className="lbl">Parados</div><div className="num">{contagem.parados}</div><div className="sub">{vermelhos.length} em vermelho no total</div></button>
                <button className="kpi amber" aria-pressed={filtro === 'atencao'} onClick={() => alternar('atencao')}><div className="lbl">Atenção</div><div className="num">{atencao.length}</div><div className="sub">precisam de reforço</div></button>
                <div className="kpi ok"><div className="lbl">Concluídos</div><div className="num">{concluidos.length}<small> de {doMes.length}</small></div><div className="sub">serviços do mês</div></div>
              </section>
            )}

            {comValores && (
              <section className="card prog" aria-label="Avanço da medição">
                <div className="prog-h"><span className="rotulo">Medição {medicao.numero}, de {dm(medicao.data_inicio)} a {dm(medicao.data_fim)}</span><span className="pct">{feito}% feito em {decorrido}% do mês</span></div>
                <div className="track">
                  <div className={`fill ${feito < decorrido ? 'atras' : ''}`} style={{ width: `${Math.min(100, feito)}%` }} />
                  <div className="marker" style={{ left: `${decorrido}%` }}><span>hoje</span></div>
                </div>
                <div className="scale"><span>{dm(medicao.data_inicio)}</span><span>{feito < decorrido ? 'abaixo do ritmo do mês' : 'no ritmo do mês'}</span><span>{dm(medicao.data_fim)}</span></div>
              </section>
            )}

            {previsao}

            <section className="card">
              <div className="card-h">
                <span className="rotulo">{lista.length} serviços do mês</span>
                {comValores && <button className="link" onClick={() => avisar('Exportar para Excel chega numa próxima etapa.')}>Exportar para Excel</button>}
              </div>
              {lista.length === 0 ? (
                <div className="empty" style={{ padding: 24 }}><p>Nenhum serviço nesta situação.</p></div>
              ) : (
                <>
                  <ul className="rows only-narrow">
                    {lista.map((a) => {
                      const s = a.servico
                      const vermelho = COR_SITUACAO[a.situacao] === 'red'
                      const parado = a.situacao === 'Parado' ? (a.diasSem === null ? 'Não iniciado' : `${a.diasSem} dias parado`)
                        : a.diasSem === 0 ? 'Andou hoje' : a.diasSem === null ? null : `${a.diasSem} ${a.diasSem === 1 ? 'dia' : 'dias'} sem avanço`
                      return (
                        <li key={s.id}>
                          <button className={`row ${vermelho ? 'hl-red' : ''}`} onClick={() => setAberto(a)}>
                            <div className="main-c">
                              <div className="t">{s.descricao}</div>
                              <Meta>
                                {s.critico && <Critico />}
                                {curto(s.responsavel_id)}
                                {parado}
                                {a.limite && a.situacao !== 'Concluído' && `Decidir até ${dm(a.limite)}`}
                              </Meta>
                              {comValores ? (
                                <div className="money"><span className={`f ${vermelho ? 'red' : ''}`}>Falta {brl(a.faltaValor)}</span><span className="o">{brl(a.valorExecutado)} de {brl(a.valorPlanejado)}</span></div>
                              ) : (
                                <div className="money"><span className="f">{qtd(a.executadoPeriodo, s.unidade)}</span><span className="o">de {qtd(a.planejadoMes, s.unidade)} no mês</span></div>
                              )}
                              <Barra feito={pct(a.executadoPeriodo, a.planejadoMes)} hoje={decorrido} atras={vermelho} />
                            </div>
                            <Pill situacao={a.situacao} />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  <div className="only-wide tbl-wrap">
                    <table>
                      <thead><tr>
                        <th>Serviço</th><th className="num">Planejado mês</th><th className="num">Executado</th>
                        {comValores && <th className="num">Falta executar</th>}
                        <th className="num">%</th><th>Situação</th><th className="num">Dias s/ avanço</th><th>Responsável</th><th className="num">Data limite</th>
                      </tr></thead>
                      <tbody>
                        {lista.map((a) => {
                          const s = a.servico
                          const vermelho = COR_SITUACAO[a.situacao] === 'red'
                          const passou = a.limite && hoje > a.limite && a.situacao !== 'Concluído'
                          return (
                            <tr key={s.id} className={`click ${vermelho ? 'hl-red' : ''}`} tabIndex={0}
                              onClick={() => setAberto(a)} onKeyDown={(e) => { if (e.key === 'Enter') setAberto(a) }}>
                              <td><div className="desc">{s.descricao}</div><div className="sob"><span className="cod">{s.codigo}</span>{s.critico && <Critico />}</div></td>
                              <td className="num">{comValores ? brl(a.valorPlanejado) : qtd(a.planejadoMes, s.unidade)}</td>
                              <td className="num">{comValores ? brl(a.valorExecutado) : qtd(a.executadoPeriodo, s.unidade)}</td>
                              {comValores && <td className={`num big ${vermelho ? 'red' : ''}`}>{brl(a.faltaValor)}</td>}
                              <td className="num">{pct(a.executadoPeriodo, a.planejadoMes)}%</td>
                              <td><Pill situacao={a.situacao} /></td>
                              <td className={`num ${a.situacao === 'Parado' ? 'red' : ''}`}>{a.situacao === 'Concluído' ? '—' : (a.diasSem ?? 'não iniciou')}</td>
                              <td className="nowrap">{nomeResp[s.responsavel_id] ?? '—'}</td>
                              <td className={`num ${passou ? 'red' : ''}`}>{dm(a.limite)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </>
        )}

        <div className="duo">
          <button className="card mini" onClick={() => goto('diario')}>
            <div className="lbl">Diário de hoje</div>
            {diarioHoje
              ? <div className="v ok">Enviado por {diarioHoje.autor.split(' ')[0]}</div>
              : <div className="v red">Ainda não lançado</div>}
          </button>
          <div className="card mini">
            <div className="lbl">Último diário</div>
            <div className="v">{diarios[0] ? `${dm(diarios[0].data)}, por ${diarios[0].autor.split(' ')[0]}` : '—'}</div>
          </div>
        </div>
      </div>

      {aberto && (
        <ServicoDetalhe a={aberto} medicao={medicao} responsavel={nomeResp[aberto.servico.responsavel_id]}
          comValores={comValores} podeMarcarCritico={podeEditar(profile.role)}
          onFechar={() => setAberto(null)} onMudou={() => { setAberto(null); recarregar() }} />
      )}
    </>
  )
}
