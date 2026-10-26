// Aba EAP do Planejamento: a árvore do Orçamento (etapa › subgrupo › item) com o avanço do Diário
// e as datas planejadas. Itens e grupos vêm do Orçamento; aqui o engenheiro só lança as datas dos
// ITENS: tocar no item abre os campos de data nele, com Salvar; o botão flutuante salva todos de uma
// vez. Etapa e subetapa não recebem data: a EAP calcula pelos itens de dentro (início mais cedo, fim
// mais tarde) e atualiza enquanto se digita.
import { useState } from 'react'
import { salvarDatasEap } from '../lib/dados.js'
import { achatarEap, acumuladoPorServico, ehItem, montarEap, paiDoCodigo, validarDatas } from '../lib/planejamento.js'
import { diasUteisEntre } from '../lib/calendario.js'
import { precoTotal } from '../lib/orcamento.js'
import { podePlanejar, podeVerValores } from '../lib/perfis.js'
import { dm, dmy } from '../lib/datas.js'
import { brl, pct, qtd } from '../lib/formato.js'
import { Barra, Critico, Meta, Sheet, Vazio, avisar } from '../components/index.jsx'

const periodo = (inicio, fim) => (inicio || fim ? `${dm(inicio)} a ${dm(fim)}` : 'Sem datas')

function Fato({ rotulo, valor }) {
  return <div className="fact"><div className="lbl">{rotulo}</div><div className="v">{valor}</div></div>
}

// Detalhe de uma linha (só leitura): datas, avanço e números do item.
function Detalhe({ n, responsavel, comValores, cal, onFechar }) {
  const s = n.servico
  return (
    <Sheet titulo={n.nome} subtitulo={`${n.codigo}${n.tipo === 'grupo' ? ', grupo' : ''}`} onFechar={onFechar}>
      <div className="sheet-b">
        <div className="facts">
          <Fato rotulo="Início" valor={n.inicio ? dmy(n.inicio) : '—'} />
          <Fato rotulo="Fim" valor={n.fim ? dmy(n.fim) : '—'} />
          <Fato rotulo="Dias úteis" valor={diasUteisEntre(n.inicio, n.fim, cal) ?? '—'} />
          <Fato rotulo="Avanço real" valor={`${pct(n.progresso, 1)}%`} />
          {s ? <Fato rotulo="Quantidade vigente" valor={qtd(s.qtd_contratada, s.unidade)} /> : <Fato rotulo="Itens" valor={n.qtdServicos} />}
          {s && comValores && <Fato rotulo="Valor vigente" valor={brl(precoTotal(s.qtd_contratada, s.preco_unitario))} />}
          {s && <Fato rotulo="Responsável" valor={responsavel ?? '—'} />}
        </div>
        {!ehItem(n) && <p className="obs">As datas do grupo são calculadas pelos itens de dentro: o início mais cedo e o fim mais tarde.</p>}
        <p className="obs">Quantidade, preço e descrição mudam no Orçamento.</p>
      </div>
    </Sheet>
  )
}

export default function AbaEap({ profile, dados, onMudou, goto }) {
  const [fechados, setFechados] = useState(new Set())
  const [busca, setBusca] = useState('')
  const [soSemDatas, setSoSemDatas] = useState(false)
  const [mostrarArquivados, setMostrarArquivados] = useState(false)
  const [detalhe, setDetalhe] = useState(null)
  const [emEdicao, setEmEdicao] = useState(new Set()) // itens com os campos de data abertos
  const [rascunho, setRascunho] = useState({}) // id do item → { inicio, fim }, só o que foi mexido
  const [errosSalvos, setErrosSalvos] = useState({})
  const [salvando, setSalvando] = useState(false)
  const edita = podePlanejar(profile.role)
  const comValores = podeVerValores(profile.role)

  // As datas que estão no banco, por item (para saber o que mudou).
  const original = Object.fromEntries(dados.servicos.map((s) => [s.id, { inicio: s.data_inicio_planejada ?? '', fim: s.data_fim_planejada ?? '' }]))
  const valorDe = (id) => rascunho[id] ?? original[id] ?? { inicio: '', fim: '' }
  const mudou = (id) => !!rascunho[id] && (rascunho[id].inicio !== original[id]?.inicio || rascunho[id].fim !== original[id]?.fim)
  const mudancas = Object.keys(rascunho).filter(mudou).map((id) => ({ id, ...rascunho[id] }))
  const erroDe = (id) => (rascunho[id] ? validarDatas(rascunho[id]) : null) ?? errosSalvos[id] ?? null

  // A árvore já com o rascunho: as datas de etapa e subetapa acompanham a digitação.
  const servicos = dados.servicos.map((s) => {
    const r = rascunho[s.id]
    return r ? { ...s, data_inicio_planejada: r.inicio || null, data_fim_planejada: r.fim || null } : s
  })
  const acumulado = acumuladoPorServico(dados.lancamentos)
  const raizes = montarEap({ servicos, grupos: dados.grupos, acumulado, mostrarArquivados })
  const todos = achatarEap(raizes)
  const codigosDeGrupo = todos.filter((n) => !ehItem(n)).map((n) => n.codigo)
  const itens = todos.filter((n) => ehItem(n) && !n.arquivado)
  const semDatas = itens.filter((n) => !n.inicio && !n.fim).length
  const nomeResp = Object.fromEntries(dados.responsaveis.map((r) => [r.id, r.nome]))

  // Busca e "Sem datas": mostram o que bate e os grupos de cima dele.
  const termo = busca.trim().toLowerCase()
  const filtrando = termo !== '' || soSemDatas
  const bate = new Set()
  if (filtrando) {
    for (const n of todos) {
      const passaBusca = !termo || `${n.codigo} ${n.nome}`.toLowerCase().includes(termo)
      // "Sem datas" olha o que está salvo: a linha não some enquanto as datas são digitadas.
      const passaDatas = !soSemDatas || (ehItem(n) && !original[n.servico.id]?.inicio && !original[n.servico.id]?.fim)
      if (passaBusca && passaDatas) for (let c = n.codigo; c; c = paiDoCodigo(c)) bate.add(c)
    }
  }
  const linhas = filtrando ? todos.filter((n) => bate.has(n.codigo)) : achatarEap(raizes, fechados)
  const alternar = (codigo) => setFechados((f) => { const n = new Set(f); if (n.has(codigo)) n.delete(codigo); else n.add(codigo); return n })
  const alternarEdicao = (id) => setEmEdicao((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const mudar = (id, campo, valor) => {
    setRascunho((r) => ({ ...r, [id]: { ...(r[id] ?? original[id] ?? { inicio: '', fim: '' }), [campo]: valor } }))
    setErrosSalvos((e) => { const n = { ...e }; delete n[id]; return n })
  }
  // Grava uma lista de itens (um só, pelo Salvar do item; ou todos, pelo botão flutuante).
  async function gravar(lista) {
    if (lista.some((m) => validarDatas(m))) { avisar('Confira as datas marcadas em vermelho.'); return }
    setSalvando(true)
    const r = await salvarDatasEap(lista)
    setSalvando(false)
    if (r.erro) { setErrosSalvos(r.erros ?? {}); avisar(r.erro); return }
    avisar(lista.length === 1 ? 'Datas salvas.' : `${r.data.salvas} itens com datas salvas.`)
    const salvos = new Set(lista.map((m) => m.id))
    setRascunho((rs) => Object.fromEntries(Object.entries(rs).filter(([id]) => !salvos.has(id))))
    setEmEdicao((s) => new Set([...s].filter((id) => !salvos.has(id))))
    onMudou()
  }
  const descartar = () => {
    if (!window.confirm(`Descartar ${mudancas.length} data(s) que não foram salvas?`)) return
    setRascunho({}); setErrosSalvos({}); setEmEdicao(new Set())
  }

  if (!dados.servicos.length) {
    return (
      <div className="view">
        <Vazio titulo="A EAP desta obra está vazia" texto="A EAP é montada a partir do Orçamento. Assim que o orçamento da obra entrar, ela aparece aqui."
          acao={edita ? 'Ir para o Orçamento' : null} onAcao={() => goto('orcamento')} />
      </div>
    )
  }

  return (
    <div className="view">
      <div className="btns">
        <button className="btn" onClick={() => goto('orcamento')}>Ir para o Orçamento</button>
      </div>
      <p className="obs" style={{ fontSize: 14, margin: 0 }}>
        {edita
          ? 'Toque num item para lançar o início e o fim. As datas de etapa e subetapa saem sozinhas dos itens de dentro.'
          : 'Itens e grupos vêm do Orçamento. Aqui ficam as datas dos itens e o avanço lançado no Diário.'}
      </p>

      <div className="toolbar">
        <input className="ipt" type="search" placeholder="Buscar por código ou nome" aria-label="Buscar na EAP" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <div className="filters">
          <button onClick={() => setFechados(new Set())}>Abrir tudo</button>
          <button onClick={() => setFechados(new Set(codigosDeGrupo))}>Fechar tudo</button>
          <button aria-pressed={soSemDatas} onClick={() => setSoSemDatas(!soSemDatas)}>Sem datas</button>
          <button aria-pressed={mostrarArquivados} onClick={() => setMostrarArquivados(!mostrarArquivados)}>Arquivados</button>
        </div>
      </div>

      <section className="card">
        <div className="card-h">
          <span className="rotulo">{itens.length} itens em {codigosDeGrupo.length} grupos; {semDatas ? `${semDatas} sem datas` : 'todos com datas'}</span>
        </div>
        {!linhas.length ? <div className="empty" style={{ padding: 24 }}><p>{soSemDatas ? 'Todos os itens já têm datas.' : 'Nada encontrado com essa busca.'}</p></div> : (
          <ul className="rows eap">
            {linhas.map((n) => {
              const item = ehItem(n)
              const aberto = filtrando || !fechados.has(n.codigo)
              const id = n.servico?.id
              const editando = item && edita && emEdicao.has(id)
              const v = item ? valorDe(id) : null
              const erro = editando ? erroDe(id) : null
              const pendente = item && mudou(id)
              const dias = diasUteisEntre(n.inicio, n.fim, dados.calendario)
              // Engenheiro: tocar no item abre (ou fecha) as datas dele. Os outros: abre o detalhe.
              const tocar = item && edita ? () => alternarEdicao(id) : () => setDetalhe(n)
              return (
                <li key={n.codigo} className={`eap-no ${item ? '' : 'eap-grupo'} ${n.arquivado ? 'arquivado' : ''} ${erro ? 'com-erro' : ''} ${editando ? 'em-edicao' : ''}`} style={{ '--nivel': n.nivel - 1 }}>
                  {!item
                    ? <button className="eap-seta" aria-expanded={aberto} aria-label={`${aberto ? 'Fechar' : 'Abrir'} ${n.nome}`} onClick={() => alternar(n.codigo)} disabled={filtrando}>{aberto ? '▾' : '▸'}</button>
                    : <span className="eap-seta" aria-hidden="true" />}
                  <button className="eap-corpo" onClick={tocar} aria-expanded={item && edita ? editando : undefined}
                    title={item && edita ? (editando ? 'Fechar as datas deste item' : 'Lançar as datas deste item') : undefined}>
                    <span className="eap-linha1">
                      <span className="cod">{n.codigo}</span>
                      <span className="eap-nome">{n.nome}</span>
                    </span>
                    <Meta>
                      {n.servico?.critico && <Critico />}
                      {n.arquivado && 'Arquivado'}
                      {!item && `${n.qtdServicos} item(ns)`}
                      {item && nomeResp[n.servico.responsavel_id]}
                    </Meta>
                    <Barra feito={pct(n.progresso, 1)} />
                  </button>
                  <div className="eap-datas">
                    {editando ? (
                      <div className="eap-editor">
                        <label className="eap-data"><span>Início</span>
                          <input className="ipt" type="date" value={v.inicio} aria-invalid={!!erro} aria-label={`Início de ${n.codigo}`} onChange={(e) => mudar(id, 'inicio', e.target.value)} />
                        </label>
                        <label className="eap-data"><span>Fim</span>
                          <input className="ipt" type="date" value={v.fim} min={v.inicio || undefined} aria-invalid={!!erro} aria-label={`Fim de ${n.codigo}`} onChange={(e) => mudar(id, 'fim', e.target.value)} />
                        </label>
                        <button className="btn primary eap-salvar" disabled={salvando || !pendente} onClick={() => gravar([{ id, ...v }])}>Salvar</button>
                        <button className="btn ghost eap-fechar" aria-label={`Fechar as datas de ${n.codigo}`} onClick={() => alternarEdicao(id)}>✕</button>
                      </div>
                    ) : (
                      <span className={`eap-periodo${item ? '' : ' calculado'}${!n.inicio && !n.fim ? ' vazio' : ''}`}>
                        {periodo(n.inicio, n.fim)}
                        {dias != null && <small>{dias} {dias === 1 ? 'dia útil' : 'dias úteis'}{!item ? ', pelos itens' : ''}</small>}
                        {pendente && <small className="eap-pendente">não salva</small>}
                      </span>
                    )}
                  </div>
                  <span className="eap-pct">{pct(n.progresso, 1)}%</span>
                  {item && edita && (
                    <button className="eap-info" aria-label={`Detalhes de ${n.codigo}`} title="Detalhes" onClick={() => setDetalhe(n)}>i</button>
                  )}
                  {erro && <div className="eap-avisos"><span className="erro">{erro}</span></div>}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Botão flutuante: aparece quando há data digitada e não salva, e grava todas de uma vez. */}
      {mudancas.length > 0 && (
        <div className="eap-flutuante" role="region" aria-label="Datas não salvas">
          <span>{mudancas.length} {mudancas.length === 1 ? 'data não salva' : 'datas não salvas'}</span>
          <button className="btn primary" disabled={salvando} onClick={() => gravar(mudancas)}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          <button className="btn ghost" onClick={descartar}>Descartar</button>
        </div>
      )}

      {detalhe && <Detalhe n={detalhe} responsavel={nomeResp[detalhe.servico?.responsavel_id]} comValores={comValores} cal={dados.calendario} onFechar={() => setDetalhe(null)} />}
    </div>
  )
}
