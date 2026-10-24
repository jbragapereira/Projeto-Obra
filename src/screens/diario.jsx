// Lançar o dia (Equipe da obra) / Diário (Engenheiro e Diretoria).
import { useState } from 'react'
import { buscarMedicaoAtual, juntar, listarDiarios, listarItensMedicao, listarLancamentos, listarResponsaveis, listarServicos, salvarDiario } from '../lib/dados.js'
import { CLIMAS, podeCorrigir, ultimoDiaDeCorrecao } from '../lib/diario.js'
import { analisarServico, ORDEM_SITUACAO } from '../lib/painel.js'
import { podeLancar } from '../lib/perfis.js'
import { aceitaLancamento } from '../lib/obras.js'
import { qtd } from '../lib/formato.js'
import { dataLonga, dm, hojeISO } from '../lib/datas.js'
import { Carregando, Critico, ErroCarga, Faixa, Icon, Meta, Pill, Vazio, avisar, useDados } from '../components/index.jsx'

async function carregar() {
  const r = await juntar({ servicos: listarServicos(), lancamentos: listarLancamentos(), responsaveis: listarResponsaveis(), diarios: listarDiarios(), medicao: buscarMedicaoAtual() })
  if (r.erro || !r.data.medicao) return r
  const itens = await listarItensMedicao(r.data.medicao.id)
  if (itens.erro) return itens
  return { data: { ...r.data, itens: itens.data }, erro: null }
}

function formularioDe(dados, hoje, diarioHoje) {
  const daqui = dados.lancamentos.filter((l) => diarioHoje && l.diario_id === diarioHoje.id)
  const itens = {}
  for (const s of dados.servicos) {
    const l = daqui.find((x) => x.servico_id === s.id)
    itens[s.id] = { quantidade: l?.quantidade ?? 0, responsavel_id: l?.responsavel_id ?? s.responsavel_id, concluido: l?.concluido ?? false, novas_fotos: 0 }
  }
  return {
    data: hoje,
    clima_manha: diarioHoje?.clima_manha ?? null,
    clima_tarde: diarioHoje?.clima_tarde ?? null,
    ocorrencias: diarioHoje?.ocorrencias ?? '',
    itens,
    extras: daqui.map((l) => l.servico_id),
  }
}

export default function Diario({ profile, obra }) {
  const { data, erro, carregando, recarregar } = useDados(carregar)
  const [form, setForm] = useState(null)
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(false)
  const hoje = hojeISO()

  if (carregando) return <Carregando />
  if (erro) return <ErroCarga erro={erro} onTentar={recarregar} />

  const titulo = <Faixa><div className="faixa-titulo">{podeLancar(profile.role) && profile.role !== 'Engenheiro' ? 'Lançar o dia' : 'Diário de obra'}<span style={{ fontWeight: 400, color: 'var(--head-sub)', marginLeft: 10 }}>{dataLonga(hoje)}</span></div></Faixa>

  if (!data.servicos.length) {
    return <>{titulo}<div className="view"><Vazio titulo="Ainda não há o que lançar"
      texto="Assim que o engenheiro importar os serviços desta obra, eles aparecem aqui para você lançar a produção do dia." /></div></>
  }

  const diarioHoje = data.diarios.find((x) => x.data === hoje)
  const autorHoje = diarioHoje && data.lancamentos.find((l) => l.diario_id === diarioHoje.id)?.lancado_por
  const pode = podeLancar(profile.role) && aceitaLancamento(obra)
  const corrigivel = diarioHoje && podeCorrigir({ role: profile.role, profileId: profile.id, lancadoPor: autorHoje ?? diarioHoje.criado_por, dataDiario: hoje, hoje })

  const anteriores = (
    <section className="card">
      <div className="card-h"><span className="rotulo">Dias anteriores</span></div>
      <ul className="rows">
        {data.diarios.filter((x) => x.data !== hoje).slice(0, 15).map((x) => (
          <li key={x.id}><div className="row">
            <div className="main-c">
              <div className="t" style={{ fontSize: 16 }}>{dataLonga(x.data)}</div>
              <Meta>{`${x.clima_manha ?? '—'}${x.clima_tarde && x.clima_tarde !== x.clima_manha ? ` / ${x.clima_tarde}` : ''}`}{`${x.servicos_com_producao} serviço(s)`}{`${x.qtd_fotos} foto(s)`}{x.autor}</Meta>
              {x.ocorrencias && <div style={{ marginTop: 6, fontSize: 14, color: 'var(--red-d)', fontWeight: 600 }}>{x.ocorrencias}</div>}
            </div>
            {x.clima_tarde === 'Chuva forte' && <span className="pill amber">Chuva</span>}
          </div></li>
        ))}
        {data.diarios.filter((x) => x.data !== hoje).length === 0 && <li><div className="row">Nenhum diário anterior.</div></li>}
      </ul>
    </section>
  )

  // Diário de hoje já enviado e ninguém corrigindo: mostra o resumo.
  if ((diarioHoje && !form) || !pode) {
    return (
      <>
        {titulo}
        <div className="view">
          {diarioHoje ? (
            <section className="card done-card">
              <span style={{ color: 'var(--ok)' }}><Icon nome="check" /></span>
              <div>
                <div className="big">Diário de hoje enviado</div>
                <div style={{ color: 'var(--slate)', marginTop: 4 }}>{diarioHoje.servicos_com_producao} serviço(s) com produção e {diarioHoje.qtd_fotos} foto(s), por {diarioHoje.autor}</div>
                {corrigivel && pode && <>
                  <div style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>Dá para corrigir até {dm(ultimoDiaDeCorrecao(hoje))}, 23h59.</div>
                  <button className="btn" style={{ marginTop: 10 }} onClick={() => setForm(formularioDe(data, hoje, diarioHoje))}>Corrigir lançamento</button>
                </>}
              </div>
            </section>
          ) : (
            <section className="card card-b">
              <div style={{ fontWeight: 700 }}>Nenhum diário hoje.</div>
              <div style={{ color: 'var(--slate)' }}>{aceitaLancamento(obra) ? 'Quem lança é a equipe da obra ou o engenheiro.' : 'Esta obra está concluída e não aceita lançamentos.'}</div>
            </section>
          )}
          {anteriores}
        </div>
      </>
    )
  }

  const f = form ?? formularioDe(data, hoje, null)
  const atualizar = (mudanca) => setForm({ ...f, ...mudanca })
  const atualizarItem = (id, mudanca) => setForm({ ...f, itens: { ...f.itens, [id]: { ...f.itens[id], ...mudanca } } })

  const itemDe = Object.fromEntries((data.itens ?? []).map((i) => [i.servico_id, i]))
  const analises = data.servicos.filter((s) => s.ativo).map((s) =>
    analisarServico({ servico: s, lancamentos: data.lancamentos, item: itemDe[s.id] ?? null, medicao: data.medicao, hoje }))
  const visiveis = analises
    .filter((a) => !a.concluido || f.itens[a.servico.id].concluido)
    .filter((a) => a.noMes || f.extras.includes(a.servico.id))
    .sort((x, y) => ORDEM_SITUACAO.indexOf(x.situacao) - ORDEM_SITUACAO.indexOf(y.situacao))
  const termo = busca.trim().toLowerCase()
  const achados = termo
    ? analises.filter((a) => !a.concluido && !visiveis.includes(a) && `${a.servico.codigo} ${a.servico.descricao}`.toLowerCase().includes(termo)).slice(0, 6)
    : []
  const comProducao = Object.values(f.itens).filter((i) => i.quantidade > 0).length
  const fotosNovas = Object.values(f.itens).reduce((s, i) => s + i.novas_fotos, 0)

  async function enviar() {
    setSalvando(true)
    const r = await salvarDiario({
      data: hoje, clima_manha: f.clima_manha, clima_tarde: f.clima_tarde, ocorrencias: f.ocorrencias,
      itens: Object.entries(f.itens).map(([servico_id, i]) => ({ servico_id, ...i })),
    })
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar(`Diário de ${dm(hoje)} enviado. O painel já foi atualizado.`)
    setForm(null)
    recarregar()
  }

  return (
    <>
      {titulo}
      <div className="view">
        <section className="card card-b" style={{ display: 'grid', gap: 12 }}>
          {[['clima_manha', 'Clima de manhã'], ['clima_tarde', 'Clima à tarde']].map(([campo, rotulo]) => (
            <div key={campo}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{rotulo}</div>
              <div className="chips">
                {CLIMAS.map((c) => (
                  <button key={c} className="chip" aria-pressed={f[campo] === c} onClick={() => atualizar({ [campo]: c })}>{c}</button>
                ))}
              </div>
            </div>
          ))}
        </section>

        <div className="sec-t">Produção de hoje ({visiveis.length} serviços)</div>
        <div className="lanc-grid">
          {visiveis.map((a) => {
            const s = a.servico
            const it = f.itens[s.id]
            return (
              <section key={s.id} className={`card svc ${it.quantidade > 0 ? 'has' : ''}`}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="t">{s.descricao}</div>
                    <Meta><span className="cod">{s.codigo}</span>{s.critico && <Critico />}{a.noMes ? `Feito ${qtd(a.executadoPeriodo, s.unidade)} de ${qtd(a.planejadoMes, s.unidade)} no mês` : 'Fora do planejado do mês'}</Meta>
                  </div>
                  <Pill situacao={a.situacao} />
                </div>
                <div className="qty">
                  <button aria-label={`Diminuir ${s.descricao}`} onClick={() => atualizarItem(s.id, { quantidade: Math.max(0, it.quantidade - 1) })}>−</button>
                  <input inputMode="decimal" aria-label={`Quantidade executada hoje de ${s.descricao}, em ${s.unidade}`}
                    value={it.quantidade || ''} placeholder="0"
                    onChange={(e) => { const v = parseFloat(e.target.value.replace(',', '.')); atualizarItem(s.id, { quantidade: Number.isNaN(v) ? 0 : Math.max(0, v) }) }} />
                  <span className="un">{s.unidade}</span>
                  <button aria-label={`Aumentar ${s.descricao}`} onClick={() => atualizarItem(s.id, { quantidade: it.quantidade + 1 })}>＋</button>
                </div>
                <div className="svc-row">
                  <label className="field"><span>Quem executou</span>
                    <select className="ipt" value={it.responsavel_id ?? ''} onChange={(e) => atualizarItem(s.id, { responsavel_id: e.target.value })}>
                      {data.responsaveis.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                    </select>
                  </label>
                </div>
                <div className="svc-row">
                  <button className={`btn ${it.concluido ? 'on' : ''}`} style={{ flex: 1 }} aria-pressed={it.concluido} onClick={() => atualizarItem(s.id, { concluido: !it.concluido })}>
                    {it.concluido ? <><Icon nome="check" tamanho={20} /> Concluído</> : 'Marcar concluído'}
                  </button>
                  <button className="btn" style={{ flex: 1 }} onClick={() => { atualizarItem(s.id, { novas_fotos: it.novas_fotos + 1 }); avisar('Foto anexada (de exemplo, até ligarmos o armazenamento).') }}>
                    <Icon nome="camera" tamanho={20} /> Foto{it.novas_fotos ? ` (${it.novas_fotos})` : ''}
                  </button>
                </div>
                {it.novas_fotos > 0 && (
                  <div className="thumbs">{Array.from({ length: it.novas_fotos }, (_, i) => <div key={i} className="thumb">FOTO {i + 1}</div>)}</div>
                )}
              </section>
            )
          })}
        </div>

        <section className="card card-b">
          <label className="field"><span>Outro serviço (fora do planejado do mês)</span>
            <input className="ipt" type="search" placeholder="Buscar por código ou descrição" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </label>
          {achados.map((a) => (
            <button key={a.servico.id} className="opt" style={{ marginTop: 6, border: '1px solid var(--line)', borderRadius: 6 }}
              onClick={() => { atualizar({ extras: [...f.extras, a.servico.id] }); setBusca('') }}>
              <span style={{ flex: 1 }}><span className="nome">{a.servico.descricao}</span><Meta><span className="cod">{a.servico.codigo}</span>Toque para incluir</Meta></span>
            </button>
          ))}
        </section>

        <section className="card card-b">
          <label className="field"><span>Ocorrências do dia</span>
            <textarea className="ipt" placeholder="Ex.: falta de bloco cerâmico, chuva às 14h, visita da fiscalização…"
              value={f.ocorrencias} onChange={(e) => atualizar({ ocorrencias: e.target.value })} />
          </label>
        </section>

        <div className="send">
          <button className="btn primary" onClick={enviar} disabled={salvando || comProducao === 0}>
            {salvando ? 'Enviando…' : `${diarioHoje ? 'Salvar correção' : 'Enviar diário'} de ${dm(hoje)}`}
          </button>
          <div className="hint">{comProducao} serviço(s) com produção e {fotosNovas} foto(s) nova(s)</div>
        </div>

        {anteriores}
      </div>
    </>
  )
}
