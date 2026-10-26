// Medição: os períodos da obra, o planejamento do mês e a pergunta de um ano
// ("em quais meses, e em quantos, a gente bateu a meta?").
import { useState } from 'react'
import { criarMedicao, iniciarMedicao, juntar, listarGrupos, listarItensMedicao, listarMedicoes, listarServicos, salvarQtdPlanejada } from '../lib/dados.js'
import { estruturaDaMedicao, resumoMetas } from '../lib/medicao.js'
import { podeEditar, podeVerValores } from '../lib/perfis.js'
import { brl, brlCentavos, qtd } from '../lib/formato.js'
import { dm, dmy } from '../lib/datas.js'
import { CampoNumero, Carregando, ErroCarga, Faixa, Vazio, avisar, useDados } from '../components/index.jsx'

const COR = { Planejando: 'soft', 'Em andamento': 'amber', Fechada: 'done' }

function Detalhe({ medicao, servicos, grupos, edita, onVoltar, onMudou }) {
  const { data: itens, erro, carregando, recarregar } = useDados(() => listarItensMedicao(medicao.id))
  const [salvando, setSalvando] = useState(false)
  // O que está sendo digitado: o R$ da linha e a meta do mês mudam em tempo real.
  const [rascunho, setRascunho] = useState({})
  if (carregando) return <Carregando />
  if (erro) return <ErroCarga erro={erro} onTentar={recarregar} />
  const servicoDe = Object.fromEntries(servicos.map((s) => [s.id, s]))
  const editavel = edita && medicao.status !== 'Fechada'
  const fechada = medicao.status === 'Fechada'
  const qtdDe = (i) => rascunho[i.id] ?? i.qtd_planejada
  // A medição fatiada, na estrutura do Orçamento: só os grupos e subgrupos que têm item nesta medição.
  const linhas = estruturaDaMedicao({ itens: itens.map((i) => ({ ...i, qtd: qtdDe(i), preco: i.preco_unitario })), servicoDe, grupos })
  const doItem = linhas.filter((l) => l.tipo === 'item')
  const total = doItem.reduce((s, l) => s + l.totalMes, 0)
  const totalOrcamento = doItem.reduce((s, l) => s + l.totalOrcamento, 0)

  async function mudarQtd(item, valor) {
    const r = await salvarQtdPlanejada(item.id, valor)
    if (r.erro) {
      avisar(r.erro)
      setRascunho((x) => { const { [item.id]: _volta, ...resto } = x; return resto })
    } else recarregar()
  }
  async function iniciar() {
    setSalvando(true)
    const r = await iniciarMedicao(medicao.id)
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar(`Medição ${medicao.numero} iniciada. A meta de ${brl(r.data.valor_planejado)} ficou congelada.`)
    onMudou()
  }

  return (
    <>
      <button className="link" onClick={onVoltar}>Voltar para as medições</button>
      <section className="card card-b">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 22 }}>Medição {medicao.numero}</h2>
          <span className={`pill ${COR[medicao.status]}`}>{medicao.status}</span>
        </div>
        <div style={{ color: 'var(--slate)', marginTop: 4 }}>{dmy(medicao.data_inicio)} a {dmy(medicao.data_fim)}</div>
        <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>
          {medicao.status === 'Planejando' ? `Meta em montagem: ${brl(total)}` : `Meta congelada: ${brl(medicao.valor_planejado)}`}
        </div>
        {medicao.status === 'Em andamento' && Math.round(total) !== Math.round(medicao.valor_planejado ?? 0) && (
          <div style={{ color: 'var(--slate)', fontSize: 14 }}>O planejado foi ajustado para {brl(total)}, mas a comparação usa a meta do início.</div>
        )}
        {medicao.status === 'Planejando' && (
          <p className="obs" style={{ margin: '8px 0 0', fontSize: 14 }}>
            A medição segue a EAP sozinha: todo item que ganhar início e fim dentro de {dm(medicao.data_inicio)} a {dm(medicao.data_fim)} entra aqui,
            com a quantidade prevista pelos dias úteis dele no período (limitada ao saldo). Quantidade ajustada à mão não muda mais com a EAP.
          </p>
        )}
        {edita && medicao.status === 'Planejando' && (
          <button className="btn primary" style={{ marginTop: 12 }} onClick={iniciar} disabled={salvando || !itens.length}>{salvando ? 'Iniciando…' : 'Iniciar medição e congelar a meta'}</button>
        )}
        {edita && medicao.status === 'Em andamento' && (
          <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => avisar('Fechar a medição e exportar para Excel chegam na Fase 2.')}>Fechar medição <span className="pill soft">Fase 2</span></button>
        )}
      </section>
      <section className="card">
        <div className="card-h"><span className="rotulo">Medição {medicao.numero} fatiada, na estrutura do Orçamento</span></div>
        <div className="tbl-wrap">
          <table className="orc-tabela med-tabela">
            <thead>
              <tr>
                <th colSpan={8}>Orçamento</th>
                <th colSpan={fechada ? 3 : 2} className="med-fatia">Medição {medicao.numero}</th>
              </tr>
              <tr>
                <th>Item</th><th>Fonte</th><th>Referência</th><th>Descrição</th><th>Und</th>
                <th className="num">Quant.</th><th className="num">P. Unit.</th><th className="num">P. Total</th>
                <th className="num med-fatia">Qtd do mês</th><th className="num">R$ do mês</th>{fechada && <th className="num">Qtd medida</th>}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                if (l.tipo === 'grupo') {
                  return (
                    <tr key={l.codigo} className={`orc-g n${l.nivel}`}>
                      <td>{l.codigo}</td>
                      <td colSpan={6}>{l.nome}</td>
                      <td className="num">{brlCentavos(l.totalOrcamento)}</td>
                      <td className="med-fatia" />
                      <td className="num">{brlCentavos(l.totalMes)}</td>
                      {fechada && <td />}
                    </tr>
                  )
                }
                const { item: i, servico: s } = l
                return (
                  <tr key={i.id}>
                    <td className="cod nowrap">{s.codigo}</td>
                    <td className="nowrap">{s.fonte ?? '—'}</td>
                    <td className="nowrap">{s.codigo_ref || '—'}</td>
                    <td>
                      <div className="orc-desc" title={s.descricao}>{s.descricao}</div>
                      {s.data_inicio_planejada && <div className="obs" style={{ fontSize: 12.5 }}>Período na EAP: {dmy(s.data_inicio_planejada)} a {dmy(s.data_fim_planejada)}</div>}
                    </td>
                    <td>{s.unidade}</td>
                    <td className="num">{qtd(s.qtd_contratada)}</td>
                    <td className="num">{brlCentavos(s.preco_unitario)}</td>
                    <td className="num">{brlCentavos(l.totalOrcamento)}</td>
                    <td className="num med-fatia">
                      {editavel ? (
                        <CampoNumero className="ipt" style={{ width: 120, textAlign: 'right' }} valor={qtdDe(i)} placeholder="0"
                          aria-label={`Quantidade do mês de ${s.codigo}`}
                          onMudar={(n) => setRascunho((x) => ({ ...x, [i.id]: n ?? 0 }))}
                          onConfirmar={(n) => { const v = n ?? 0; if (v !== i.qtd_planejada) mudarQtd(i, v) }} />
                      ) : qtd(i.qtd_planejada)}
                    </td>
                    <td className="num big">{brlCentavos(l.totalMes)}</td>
                    {fechada && <td className="num">{qtd(i.qtd_medida)}</td>}
                  </tr>
                )
              })}
            </tbody>
            {itens.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={7}>Total desta medição</td>
                  <td className="num">{brlCentavos(totalOrcamento)}</td>
                  <td className="med-fatia" />
                  <td className="num">{brlCentavos(total)}</td>
                  {fechada && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {!itens.length && (
          <div className="empty" style={{ padding: 24 }}>
            <p>{fechada
              ? 'Esta medição foi fechada antes do sistema existir: só os totais ficaram registrados.'
              : `Nenhum item da EAP tem período entre ${dmy(medicao.data_inicio)} e ${dmy(medicao.data_fim)}. Lance o início e o fim dos itens na EAP (Planejamento): eles entram aqui sozinhos.`}</p>
          </div>
        )}
      </section>
    </>
  )
}

export default function Medicao({ profile }) {
  const { data, erro, carregando, recarregar } = useDados(() => juntar({ medicoes: listarMedicoes(), servicos: listarServicos(), grupos: listarGrupos() }))
  const [abertaId, setAbertaId] = useState(null)
  const edita = podeEditar(profile.role)

  if (!podeVerValores(profile.role)) {
    return <div className="view"><Vazio titulo="Medição é do engenheiro e da diretoria" texto="Seu perfil acompanha o avanço pela tela Início." /></div>
  }
  if (carregando) return <Carregando />
  if (erro) return <ErroCarga erro={erro} onTentar={recarregar} />

  const { medicoes, servicos, grupos } = data
  const aberta = medicoes.find((m) => m.id === abertaId)
  const { batidas, total } = resumoMetas(medicoes)

  async function nova() {
    const r = await criarMedicao()
    if (r.erro) { avisar(r.erro); return }
    avisar(`Medição ${r.data.numero} criada com os itens da EAP do período.`)
    recarregar()
    setAbertaId(r.data.id)
  }

  return (
    <>
      <Faixa><div className="faixa-titulo">Medição mensal</div></Faixa>
      <div className={`view${aberta ? ' larga' : ''}`}>
        {aberta ? (
          <Detalhe key={aberta.id + aberta.status} medicao={aberta} servicos={servicos} grupos={grupos} edita={edita}
            onVoltar={() => setAbertaId(null)} onMudou={recarregar} />
        ) : !medicoes.length ? (
          <Vazio icone="medicao" titulo="Nenhuma medição ainda"
            texto="A Medição 1 é criada sozinha quando você lança o início e o fim de um item na EAP (Planejamento) dentro do mês vigente. Cada item com datas no mês entra nela, na estrutura do Orçamento." />
        ) : (
          <>
            <section className="card kpis" aria-label="Resumo das medições">
              <div className="kpi ok"><div className="lbl">Metas batidas</div><div className="num">{batidas}<small> de {total}</small></div><div className="sub">medições fechadas</div></div>
              <div className="kpi"><div className="lbl">Medições</div><div className="num">{medicoes.length}</div><div className="sub">nesta obra</div></div>
              {edita && <button className="kpi" onClick={nova}><div className="lbl">Nova medição</div><div className="num">＋</div><div className="sub">criar o próximo período</div></button>}
            </section>
            <section className="card">
              <div className="card-h"><span className="rotulo">Períodos de medição</span></div>
              <ul className="rows">
                {medicoes.map((m) => (
                  <li key={m.id}><button className="row" onClick={() => setAbertaId(m.id)}>
                    <div className="main-c">
                      <div className="t">Medição {m.numero}, de {dm(m.data_inicio)} a {dm(m.data_fim)}</div>
                      <div className="m">
                        {m.status === 'Fechada' ? `Planejado ${brl(m.valor_planejado)}, medido ${brl(m.valor_medido)}` : m.valor_planejado ? `Meta de ${brl(m.valor_planejado)}` : 'Meta em montagem'}
                      </div>
                    </div>
                    {m.status === 'Fechada'
                      ? <span className={`pill ${m.meta_batida ? 'ok' : 'red'}`}>{m.meta_batida ? 'Bateu a meta' : 'Não bateu'}</span>
                      : <span className={`pill ${COR[m.status]}`}>{m.status}</span>}
                  </button></li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </>
  )
}
