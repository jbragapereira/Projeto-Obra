// Medição: os períodos da obra, o planejamento do mês e a pergunta de um ano
// ("em quais meses, e em quantos, a gente bateu a meta?").
import { useState } from 'react'
import { criarMedicao, iniciarMedicao, juntar, listarItensMedicao, listarMedicoes, listarServicos, salvarQtdPlanejada } from '../lib/dados.js'
import { resumoMetas } from '../lib/medicao.js'
import { podeEditar, podeVerValores } from '../lib/perfis.js'
import { brl, brlCentavos, qtd } from '../lib/formato.js'
import { dm, dmy } from '../lib/datas.js'
import { CampoNumero, Carregando, ErroCarga, Faixa, Vazio, avisar, useDados } from '../components/index.jsx'

const COR = { Planejando: 'soft', 'Em andamento': 'amber', Fechada: 'done' }

function Detalhe({ medicao, servicos, edita, onVoltar, onMudou }) {
  const { data: itens, erro, carregando, recarregar } = useDados(() => listarItensMedicao(medicao.id))
  const [salvando, setSalvando] = useState(false)
  // O que está sendo digitado: o R$ da linha e a meta do mês mudam em tempo real.
  const [rascunho, setRascunho] = useState({})
  if (carregando) return <Carregando />
  if (erro) return <ErroCarga erro={erro} onTentar={recarregar} />
  const servicoDe = Object.fromEntries(servicos.map((s) => [s.id, s]))
  const editavel = edita && medicao.status !== 'Fechada'
  const qtdDe = (i) => rascunho[i.id] ?? i.qtd_planejada
  const total = itens.reduce((s, i) => s + qtdDe(i) * (i.preco_unitario ?? 0), 0)
  const ordenados = [...itens].sort((a, b) => (servicoDe[a.servico_id]?.codigo ?? '').localeCompare(servicoDe[b.servico_id]?.codigo ?? '', 'pt-BR', { numeric: true }))

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
        {edita && medicao.status === 'Planejando' && (
          <button className="btn primary" style={{ marginTop: 12 }} onClick={iniciar} disabled={salvando}>{salvando ? 'Iniciando…' : 'Iniciar medição e congelar a meta'}</button>
        )}
        {edita && medicao.status === 'Em andamento' && (
          <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => avisar('Fechar a medição e exportar para Excel chegam na Fase 2.')}>Fechar medição <span className="pill soft">Fase 2</span></button>
        )}
      </section>
      <section className="card">
        <div className="card-h"><span className="rotulo">Planejado por serviço</span></div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Serviço</th><th className="num">Qtd planejada</th><th className="num">Preço un.</th><th className="num">R$ planejado</th>{medicao.status === 'Fechada' && <th className="num">Qtd medida</th>}</tr></thead>
            <tbody>
              {ordenados.map((i) => {
                const s = servicoDe[i.servico_id]
                return (
                  <tr key={i.id}>
                    <td><div className="desc">{s?.descricao ?? '—'}</div><div className="cod">{s?.codigo}</div></td>
                    <td className="num">
                      {editavel ? (
                        <CampoNumero className="ipt" style={{ width: 130, textAlign: 'right' }} valor={qtdDe(i)} placeholder="0"
                          aria-label={`Quantidade planejada de ${s?.descricao}`}
                          onMudar={(n) => setRascunho((x) => ({ ...x, [i.id]: n ?? 0 }))}
                          onConfirmar={(n) => { const v = n ?? 0; if (v !== i.qtd_planejada) mudarQtd(i, v) }} />
                      ) : qtd(i.qtd_planejada, s?.unidade)}
                    </td>
                    <td className="num">{brlCentavos(i.preco_unitario)}</td>
                    <td className="num big">{brl(qtdDe(i) * (i.preco_unitario ?? 0))}</td>
                    {medicao.status === 'Fechada' && <td className="num">{qtd(i.qtd_medida, s?.unidade)}</td>}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!itens.length && <div className="empty" style={{ padding: 24 }}><p>Esta medição foi fechada antes do sistema existir: só os totais ficaram registrados.</p></div>}
      </section>
    </>
  )
}

export default function Medicao({ profile }) {
  const { data, erro, carregando, recarregar } = useDados(() => juntar({ medicoes: listarMedicoes(), servicos: listarServicos() }))
  const [abertaId, setAbertaId] = useState(null)
  const edita = podeEditar(profile.role)

  if (!podeVerValores(profile.role)) {
    return <div className="view"><Vazio titulo="Medição é do engenheiro e da diretoria" texto="Seu perfil acompanha o avanço pelo Painel do mês." /></div>
  }
  if (carregando) return <Carregando />
  if (erro) return <ErroCarga erro={erro} onTentar={recarregar} />

  const { medicoes, servicos } = data
  const aberta = medicoes.find((m) => m.id === abertaId)
  const { batidas, total } = resumoMetas(medicoes)

  async function nova() {
    const r = await criarMedicao()
    if (r.erro) { avisar(r.erro); return }
    avisar(`Medição ${r.data.numero} criada. Preencha o planejado do mês.`)
    recarregar()
    setAbertaId(r.data.id)
  }

  return (
    <>
      <Faixa><div className="faixa-titulo">Medição mensal</div></Faixa>
      <div className="view">
        {aberta ? (
          <Detalhe key={aberta.id + aberta.status} medicao={aberta} servicos={servicos} edita={edita}
            onVoltar={() => setAbertaId(null)} onMudou={recarregar} />
        ) : !medicoes.length ? (
          <Vazio icone="medicao" titulo="Nenhuma medição ainda"
            texto="Crie a primeira medição, informe quanto de cada serviço você quer executar no mês e inicie. A partir daí o painel compara o executado com essa meta."
            acao={edita ? 'Criar a primeira medição' : null} onAcao={nova} />
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
