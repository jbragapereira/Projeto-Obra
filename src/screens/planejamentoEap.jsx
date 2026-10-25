// Aba EAP do Planejamento: a árvore do Orçamento (etapa › subgrupo › item) com o avanço do Diário
// e as datas planejadas. Itens e grupos vêm do Orçamento; aqui o engenheiro só lança as datas dos
// ITENS, todas de uma vez, no modo "Editar datas". Etapa e subetapa não recebem data: a EAP
// calcula pelos itens de dentro (início mais cedo, fim mais tarde) e atualiza enquanto se digita.
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
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState({}) // id do item → { inicio, fim }, só o que foi mexido
  const [errosSalvos, setErrosSalvos] = useState({})
  const [salvando, setSalvando] = useState(false)
  const edita = podePlanejar(profile.role)
  const comValores = podeVerValores(profile.role)

  // As datas que estão no banco, por item (para saber o que mudou).
  const original = Object.fromEntries(dados.servicos.map((s) => [s.id, { inicio: s.data_inicio_planejada ?? '', fim: s.data_fim_planejada ?? '' }]))
  const valorDe = (id) => rascunho[id] ?? original[id] ?? { inicio: '', fim: '' }
  const mudancas = Object.entries(rascunho)
    .filter(([id, v]) => v.inicio !== original[id]?.inicio || v.fim !== original[id]?.fim)
    .map(([id, v]) => ({ id, inicio: v.inicio, fim: v.fim }))
  const erroDe = (id) => (rascunho[id] ? validarDatas(rascunho[id]) : null) ?? errosSalvos[id] ?? null
  const comErro = mudancas.some((m) => validarDatas(m))

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

  const mudar = (id, campo, valor) => {
    setRascunho((r) => ({ ...r, [id]: { ...(r[id] ?? original[id] ?? { inicio: '', fim: '' }), [campo]: valor } }))
    setErrosSalvos((e) => { const n = { ...e }; delete n[id]; return n })
  }
  const comecarEdicao = () => { setEditando(true); setFechados(new Set()); setDetalhe(null) }
  const cancelar = () => {
    if (mudancas.length && !window.confirm(`Descartar ${mudancas.length} alteração(ões) de data que não foram salvas?`)) return
    setRascunho({}); setErrosSalvos({}); setEditando(false)
  }
  async function salvar() {
    if (comErro) { avisar('Confira as datas marcadas em vermelho.'); return }
    setSalvando(true)
    const r = await salvarDatasEap(mudancas)
    setSalvando(false)
    if (r.erro) { setErrosSalvos(r.erros ?? {}); avisar(r.erro); return }
    avisar(`${r.data.salvas} item(ns) com datas salvas.`)
    setRascunho({}); setEditando(false)
    onMudou()
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
      {editando ? (
        <div className="eap-edicao" role="region" aria-label="Edição das datas">
          <span className="eap-edicao-t">{mudancas.length ? `${mudancas.length} item(ns) com data não salva` : 'Preencha início e fim nos itens'}</span>
          <div className="btns">
            <button className="btn primary" onClick={salvar} disabled={salvando || !mudancas.length}>{salvando ? 'Salvando…' : 'Salvar datas'}</button>
            <button className="btn ghost" onClick={cancelar}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="btns">
          {edita && <button className="btn dark" onClick={comecarEdicao}>Editar datas</button>}
          <button className="btn" onClick={() => goto('orcamento')}>Ir para o Orçamento</button>
        </div>
      )}
      <p className="obs" style={{ fontSize: 14, margin: 0 }}>
        {editando
          ? 'As datas de etapa e subetapa saem sozinhas: o início mais cedo e o fim mais tarde dos itens de dentro.'
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
          <ul className={`rows eap${editando ? ' editando' : ''}`}>
            {linhas.map((n) => {
              const item = ehItem(n)
              const aberto = filtrando || !fechados.has(n.codigo)
              const v = item ? valorDe(n.servico.id) : null
              const erro = editando && item ? erroDe(n.servico.id) : null
              const dias = diasUteisEntre(n.inicio, n.fim, dados.calendario)
              const Corpo = editando ? 'div' : 'button'
              return (
                <li key={n.codigo} className={`eap-no ${item ? '' : 'eap-grupo'} ${n.arquivado ? 'arquivado' : ''} ${erro ? 'com-erro' : ''}`} style={{ '--nivel': n.nivel - 1 }}>
                  {!item
                    ? <button className="eap-seta" aria-expanded={aberto} aria-label={`${aberto ? 'Fechar' : 'Abrir'} ${n.nome}`} onClick={() => alternar(n.codigo)} disabled={filtrando}>{aberto ? '▾' : '▸'}</button>
                    : <span className="eap-seta" aria-hidden="true" />}
                  <Corpo className="eap-corpo" {...(editando ? {} : { onClick: () => setDetalhe(n) })}>
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
                  </Corpo>
                  <div className="eap-datas">
                    {editando && item ? (
                      <>
                        <label className="eap-data"><span>Início</span>
                          <input className="ipt" type="date" value={v.inicio} aria-invalid={!!erro} aria-label={`Início de ${n.codigo}`} onChange={(e) => mudar(n.servico.id, 'inicio', e.target.value)} />
                        </label>
                        <label className="eap-data"><span>Fim</span>
                          <input className="ipt" type="date" value={v.fim} min={v.inicio || undefined} aria-invalid={!!erro} aria-label={`Fim de ${n.codigo}`} onChange={(e) => mudar(n.servico.id, 'fim', e.target.value)} />
                        </label>
                      </>
                    ) : (
                      <span className={`eap-periodo${item ? '' : ' calculado'}${!n.inicio && !n.fim ? ' vazio' : ''}`}>
                        {periodo(n.inicio, n.fim)}
                        {dias != null && <small>{dias} {dias === 1 ? 'dia útil' : 'dias úteis'}{!item && editando ? ', pelos itens' : ''}</small>}
                      </span>
                    )}
                  </div>
                  <span className="eap-pct">{pct(n.progresso, 1)}%</span>
                  {erro && <div className="eap-avisos"><span className="erro">{erro}</span></div>}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {detalhe && <Detalhe n={detalhe} responsavel={nomeResp[detalhe.servico?.responsavel_id]} comValores={comValores} cal={dados.calendario} onFechar={() => setDetalhe(null)} />}
    </div>
  )
}
