// Serviços contratados da obra, com a aba Responsáveis.
import { useState } from 'react'
import { buscarMedicaoAtual, juntar, listarItensMedicao, listarLancamentos, listarResponsaveis, listarServicos, salvarResponsavel } from '../lib/dados.js'
import { analisarServico } from '../lib/painel.js'
import { podeEditar, podeVerValores } from '../lib/perfis.js'
import { TIPOS_RESPONSAVEL as TIPOS } from '../lib/obras.js'
import { brl, brlCentavos, pct, qtd } from '../lib/formato.js'
import { dm, hojeISO } from '../lib/datas.js'
import { Barra, Carregando, Critico, ErroCarga, Faixa, Meta, Vazio, avisar, useDados } from '../components/index.jsx'
import ServicoDetalhe from './servicoDetalhe.jsx'


async function carregar() {
  const r = await juntar({ servicos: listarServicos(), lancamentos: listarLancamentos(), responsaveis: listarResponsaveis(), medicao: buscarMedicaoAtual() })
  if (r.erro || !r.data.medicao) return r
  const itens = await listarItensMedicao(r.data.medicao.id)
  if (itens.erro) return itens
  return { data: { ...r.data, itens: itens.data }, erro: null }
}

function Responsaveis({ responsaveis, edita, onSalvo }) {
  const [novo, setNovo] = useState({ nome: '', tipo: TIPOS[0], contato: '' })
  const [salvando, setSalvando] = useState(false)
  async function salvar() {
    setSalvando(true)
    const r = await salvarResponsavel(novo)
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar(`${r.data.nome} cadastrado.`)
    setNovo({ nome: '', tipo: TIPOS[0], contato: '' })
    onSalvo()
  }
  return (
    <>
      {edita && (
        <section className="card card-b">
          <div className="sec-t" style={{ padding: '0 0 10px' }}>Novo responsável</div>
          <div className="form-grid">
            <label className="field"><span>Nome</span><input className="ipt" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></label>
            <label className="field"><span>Tipo</span>
              <select className="ipt" value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value })}>{TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
            </label>
            <label className="field"><span>Contato</span><input className="ipt" value={novo.contato} placeholder="Telefone ou e-mail" onChange={(e) => setNovo({ ...novo, contato: e.target.value })} /></label>
          </div>
          <button className="btn primary" style={{ marginTop: 12 }} onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Cadastrar responsável'}</button>
        </section>
      )}
      <section className="card">
        <div className="card-h"><span className="rotulo">{responsaveis.length} responsáveis nesta obra</span></div>
        {responsaveis.length ? (
          <ul className="rows">
            {responsaveis.map((r) => (
              <li key={r.id}><div className="row"><div className="main-c">
                <div className="t">{r.nome}</div><Meta>{r.tipo}{r.contato}</Meta>
              </div></div></li>
            ))}
          </ul>
        ) : <div className="empty" style={{ padding: 24 }}><p>Nenhum responsável cadastrado nesta obra.</p></div>}
      </section>
    </>
  )
}

export default function Servicos({ profile }) {
  const { data, erro, carregando, recarregar } = useDados(carregar)
  const [aba, setAba] = useState('servicos')
  const [filtro, setFiltro] = useState('todos')
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(null)
  const comValores = podeVerValores(profile.role)
  const edita = podeEditar(profile.role)
  const hoje = hojeISO()

  if (carregando) return <Carregando />
  if (erro) return <ErroCarga erro={erro} onTentar={recarregar} />

  const nomeResp = Object.fromEntries(data.responsaveis.map((r) => [r.id, r.nome]))
  const itemDe = Object.fromEntries((data.itens ?? []).map((i) => [i.servico_id, i]))
  const analises = data.servicos.map((s) =>
    analisarServico({ servico: s, lancamentos: data.lancamentos, item: itemDe[s.id] ?? null, medicao: data.medicao, hoje }))
  const filtros = { todos: () => true, mes: (a) => a.noMes, criticos: (a) => a.servico.critico }
  const termo = busca.trim().toLowerCase()
  const lista = analises.filter(filtros[filtro]).filter((a) => !termo || `${a.servico.codigo} ${a.servico.descricao}`.toLowerCase().includes(termo))
  const importar = () => avisar('A importação do Excel (planilha contratual e MS Project) chega numa próxima etapa.')

  return (
    <>
      <Faixa>
        {comValores ? (
          <div className="tabs" role="tablist">
            <button className="tab" role="tab" aria-selected={aba === 'servicos'} onClick={() => setAba('servicos')}>Serviços<span className="n">{data.servicos.length}</span></button>
            <button className="tab" role="tab" aria-selected={aba === 'responsaveis'} onClick={() => setAba('responsaveis')}>Responsáveis<span className="n">{data.responsaveis.length}</span></button>
          </div>
        ) : <div className="faixa-titulo">Serviços contratados</div>}
      </Faixa>

      <div className="view">
        {aba === 'responsaveis' ? (
          <Responsaveis responsaveis={data.responsaveis} edita={edita} onSalvo={recarregar} />
        ) : !data.servicos.length ? (
          <Vazio titulo="Nenhum serviço nesta obra ainda"
            texto="Comece importando a planilha contratual. Depois, o Excel do MS Project traz as datas e marca os serviços críticos."
            acao={edita ? 'Importar a planilha contratual' : null} onAcao={importar} />
        ) : (
          <>
            {edita && (
              <div className="btns">
                <button className="btn dark" onClick={importar}>↑ Importar planilha contratual</button>
                <button className="btn" onClick={importar}>↑ Importar Excel do MS Project</button>
              </div>
            )}
            <div className="toolbar">
              <input className="ipt" type="search" placeholder="Buscar por código ou descrição" aria-label="Buscar serviço" value={busca} onChange={(e) => setBusca(e.target.value)} />
              <div className="filters">
                {[['todos', 'Todos'], ['mes', 'No mês'], ['criticos', 'Críticos']].map(([id, rotulo]) => (
                  <button key={id} aria-pressed={filtro === id} onClick={() => setFiltro(id)}>{rotulo}</button>
                ))}
              </div>
            </div>
            <section className="card">
              <div className="card-h"><span className="rotulo">{lista.length} de {data.servicos.length} serviços</span></div>
              {!lista.length ? <div className="empty" style={{ padding: 24 }}><p>Nenhum serviço encontrado.</p></div> : (
                <>
                  <ul className="rows only-narrow">
                    {lista.map((a) => {
                      const s = a.servico
                      return (
                        <li key={s.id}><button className="row" onClick={() => setAberto(a)}>
                          <div className="main-c">
                            <div style={{ margin: '0 0 3px' }}><span className="cod">{s.codigo}</span></div>
                            <div className="t">{s.descricao}</div>
                            <Meta>{s.critico && <Critico origem={s.critico_origem} />}{nomeResp[s.responsavel_id] ?? '—'}{comValores && brl(s.qtd_contratada * s.preco_unitario)}</Meta>
                            <Barra feito={pct(a.acumulado, s.qtd_contratada)} />
                          </div>
                          <div className="pct-big">{pct(a.acumulado, s.qtd_contratada)}%<small>{qtd(a.acumulado)} / {qtd(s.qtd_contratada, s.unidade)}</small></div>
                        </button></li>
                      )
                    })}
                  </ul>
                  <div className="only-wide tbl-wrap">
                    <table>
                      <thead><tr>
                        <th>Código</th><th>Descrição</th><th>Un</th><th className="num">Contratado</th>
                        {comValores && <><th className="num">Preço un.</th><th className="num">Valor total</th></>}
                        <th className="num">Acumulado</th><th className="num">%</th><th>Responsável</th><th className="num">Fim</th><th>Crítico</th>
                      </tr></thead>
                      <tbody>
                        {lista.map((a) => {
                          const s = a.servico
                          return (
                            <tr key={s.id} className="click" tabIndex={0} onClick={() => setAberto(a)} onKeyDown={(e) => { if (e.key === 'Enter') setAberto(a) }}>
                              <td className="nowrap"><span className="cod" style={{ fontSize: 13 }}>{s.codigo}</span></td>
                              <td className="desc">{s.descricao}</td><td>{s.unidade}</td>
                              <td className="num">{qtd(s.qtd_contratada)}</td>
                              {comValores && <><td className="num">{brlCentavos(s.preco_unitario)}</td><td className="num big">{brl(s.qtd_contratada * s.preco_unitario)}</td></>}
                              <td className="num">{qtd(a.acumulado)}</td><td className="num big">{pct(a.acumulado, s.qtd_contratada)}%</td>
                              <td className="nowrap">{nomeResp[s.responsavel_id] ?? '—'}</td><td className="num">{dm(s.data_fim_planejada)}</td>
                              <td>{s.critico ? <span className="pill dark">{s.critico_origem}</span> : '—'}</td>
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
      </div>

      {aberto && (
        <ServicoDetalhe a={aberto} medicao={data.medicao} responsavel={nomeResp[aberto.servico.responsavel_id]}
          comValores={comValores} podeMarcarCritico={edita}
          onFechar={() => setAberto(null)} onMudou={() => { setAberto(null); recarregar() }} />
      )}
    </>
  )
}
