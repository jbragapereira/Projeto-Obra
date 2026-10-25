// Orçamento da obra: a planilha (etapas, subgrupos e itens), com o peso de cada linha no orçamento vigente.
// O engenheiro inclui aditivo de quantidade, item novo e grupo. A EAP do Planejamento
// lê estes mesmos itens: o que muda aqui aparece lá.
import { useState } from 'react'
import {
  arquivarServico, buscarDadosOrcamento, criarGrupo, excluirAditivo, excluirItemNovo, juntar, listarAditivos, listarGrupos,
  listarLancamentos, listarResponsaveis, listarServicos, marcarCritico, salvarAditivo, salvarItemNovo,
} from '../lib/dados.js'
import {
  FILTROS_ORCAMENTO, FONTES, ORIGENS_ITEM, TIPOS_ADITIVO, arredondarQtd, gruposDosItens, podeExcluirItemNovo, minimoDoItemNovo, pesoNoOrcamento, precoTotal, precoUnitario, subtotaisPorGrupo,
  totaisDoOrcamento, valoresDoItem, validarAditivo, validarItemNovo,
} from '../lib/orcamento.js'
import { achatarEap, acumuladoPorServico, montarEap, nivelDoCodigo, paiDoCodigo, proximoCodigo } from '../lib/planejamento.js'
import { podeEditar, podeVerValores } from '../lib/perfis.js'
import { brlCentavos, percentual, qtd } from '../lib/formato.js'
import { dataHoraCurta, dmy, hojeISO } from '../lib/datas.js'
import { saldoDoItem } from '../lib/diario.js'
import { CampoNumero, Carregando, Critico, ErroCarga, Faixa, Meta, Sheet, Vazio, avisar, useDados } from '../components/index.jsx'

const carregar = () => juntar({
  servicos: listarServicos(), lancamentos: listarLancamentos(), grupos: listarGrupos(), aditivos: listarAditivos(),
  dados: buscarDadosOrcamento(), responsaveis: listarResponsaveis(),
})

const FILTROS = [['todos', 'Todos'], ['aditivo', 'Com aditivo'], ['novos', 'Itens novos'], ['criticos', 'Críticos'], ['arquivados', 'Arquivados']]

function Campo({ rotulo, erro, children, largo }) {
  return (
    <label className="field" style={largo ? { flexBasis: '100%' } : undefined}>
      <span>{rotulo}</span>{children}{erro && <span className="erro">{erro}</span>}
    </label>
  )
}

function Fato({ rotulo, valor, destaque }) {
  return <div className="fact"><div className="lbl">{rotulo}</div><div className={`v ${destaque ?? ''}`}>{valor}</div></div>
}

// Números de aditivo já usados na obra, para escolher em vez de digitar de novo.
function ListaAditivos({ id, numeros }) {
  return <datalist id={id}>{numeros.map((n) => <option key={n} value={n} />)}</datalist>
}

/* ── Cabeçalho: totais e dados da planilha ── */

function DadosDoOrcamento({ dados, totais }) {
  return (
    <section className="card card-b orc-dados">
      <div className="orc-totais">
        <Fato rotulo="Orçamento original" valor={brlCentavos(totais.original)} />
        <Fato rotulo="Aditivos" valor={`${totais.aditivos > 0 ? '+' : ''}${brlCentavos(totais.aditivos)}`} destaque={totais.aditivos ? 'brand' : ''} />
        <Fato rotulo="Orçamento vigente" valor={brlCentavos(totais.vigente)} />
      </div>
      {dados && (
        <details className="orc-base">
          <summary>Base de referência, encargos e BDI</summary>
          <dl>
            <div><dt>Base de referência</dt><dd>{dados.base_referencia}</dd></div>
            <div><dt>Mês de referência</dt><dd>{dados.mes_referencia}</dd></div>
            <div><dt>Encargos</dt><dd>{dados.encargos}</dd></div>
            <div><dt>Período</dt><dd>{dados.periodo}</dd></div>
            <div><dt>BDI de serviço</dt><dd>{percentual(dados.bdi_servico)}</dd></div>
            <div><dt>BDI de material e equipamento</dt><dd>{percentual(dados.bdi_material)}</dd></div>
          </dl>
        </details>
      )}
    </section>
  )
}

/* ── Gaveta do item: números, aditivos e ações ── */

// Aditivo novo (sem inicial) ou correção de um aditivo já lançado (inicial).
function FormAditivo({ item, inicial, acumulado, numeros, onFechar, onSalvo }) {
  const [a, setA] = useState(inicial
    ? { tipo: inicial.quantidade < 0 ? TIPOS_ADITIVO.supressao : TIPOS_ADITIVO.acrescimo, quantidade: Math.abs(inicial.quantidade), numero: inicial.numero, data: inicial.data, motivo: inicial.motivo }
    : { tipo: TIPOS_ADITIVO.acrescimo, quantidade: null, numero: numeros[0] ?? '', data: hojeISO(), motivo: '' })
  const [tocado, setTocado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const vigenteSemEste = arredondarQtd(item.qtd_contratada - (inicial?.quantidade ?? 0))
  const { erros, quantidade } = validarAditivo(a, { vigente: vigenteSemEste, vigenteAtual: item.qtd_contratada, acumulado })
  const erro = (campo) => (tocado ? erros[campo] : undefined)
  const nova = a.quantidade ? arredondarQtd(vigenteSemEste + quantidade) : item.qtd_contratada
  const diferenca = arredondarQtd(nova - item.qtd_contratada)
  const mudar = (campo, valor) => setA({ ...a, [campo]: valor })

  async function salvar() {
    setTocado(true)
    if (Object.keys(erros).length) return
    setSalvando(true)
    const r = await salvarAditivo({ ...a, id: inicial?.id, servico_id: item.id })
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar(`${inicial ? 'Aditivo corrigido' : 'Aditivo lançado'}: o item ${item.codigo} passa a ${qtd(nova, item.unidade)}.`)
    onSalvo()
  }

  return (
    <section className="card card-b orc-form">
      <div className="sec-t" style={{ padding: '0 0 10px' }}>{inicial ? `Corrigir ${inicial.numero}` : 'Aditivo de quantidade'}</div>
      <div className="seg" role="radiogroup" aria-label="Tipo do aditivo">
        {[[TIPOS_ADITIVO.acrescimo, 'Acréscimo'], [TIPOS_ADITIVO.supressao, 'Supressão']].map(([id, rotulo]) => (
          <button key={id} role="radio" aria-checked={a.tipo === id} onClick={() => mudar('tipo', id)}>{rotulo}</button>
        ))}
      </div>
      <div className="form-grid">
        <Campo rotulo={`Quantidade (${item.unidade})`} erro={erro('quantidade')}>
          <CampoNumero className="ipt" valor={a.quantidade} placeholder="0" aria-invalid={!!erro('quantidade')} onMudar={(n) => mudar('quantidade', n)} />
        </Campo>
        <Campo rotulo="Número do aditivo" erro={erro('numero')}>
          <input className="ipt" list="numeros-aditivo" value={a.numero} placeholder="Ex.: 1º aditivo" onChange={(e) => mudar('numero', e.target.value)} />
        </Campo>
        <Campo rotulo="Data" erro={erro('data')}>
          <input className="ipt" type="date" value={a.data} onChange={(e) => mudar('data', e.target.value)} />
        </Campo>
        <Campo rotulo="Motivo" erro={erro('motivo')} largo>
          <textarea className="ipt" rows={2} value={a.motivo} onChange={(e) => mudar('motivo', e.target.value)} />
        </Campo>
      </div>
      <ListaAditivos id="numeros-aditivo" numeros={numeros} />
      <p className="orc-previa">
        Quantidade vigente: {qtd(item.qtd_contratada, item.unidade)} → <strong>{qtd(nova, item.unidade)}</strong>
        {typeof item.preco_unitario === 'number' && diferenca !== 0 && <> ({diferenca > 0 ? '+' : '−'}{brlCentavos(precoTotal(Math.abs(diferenca), item.preco_unitario))})</>}
      </p>
      <div className="btns">
        <button className="btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : inicial ? 'Salvar correção' : 'Lançar aditivo'}</button>
        <button className="btn ghost" onClick={onFechar}>Cancelar</button>
      </div>
    </section>
  )
}

function ItemDoOrcamento({ item, aditivos, acumulado, responsavel, numeros, comValores, edita, onCorrigir, onFechar, onMudou }) {
  const [formAditivo, setFormAditivo] = useState(null) // null | 'novo' | o aditivo sendo corrigido
  const [salvando, setSalvando] = useState(false)
  const somaAditivos = arredondarQtd(item.qtd_contratada - item.qtd_orcada)
  const novo = item.origem === ORIGENS_ITEM.novo

  async function acao(fazer, mensagem) {
    setSalvando(true)
    const r = await fazer()
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar(mensagem(r.data))
    onMudou()
  }

  return (
    <Sheet titulo={item.descricao} subtitulo={`Item ${item.codigo}${novo ? `, item novo (${item.aditivo_numero ?? 'sem aditivo'})` : ''}${item.critico ? ', crítico' : ''}`} onFechar={onFechar}>
      <div className="sheet-b">
        <div className="facts">
          <Fato rotulo="Fonte e código" valor={`${item.fonte ?? '—'} ${item.codigo_ref || ''}`} />
          <Fato rotulo="Unidade" valor={item.unidade} />
          <Fato rotulo={novo ? 'Quantidade incluída' : 'Quantidade orçada'} valor={qtd(item.qtd_orcada)} />
          <Fato rotulo="Aditivos" valor={somaAditivos ? `${somaAditivos > 0 ? '+' : ''}${qtd(somaAditivos)}` : '—'} destaque={somaAditivos ? 'brand' : ''} />
          <Fato rotulo="Quantidade vigente" valor={qtd(item.qtd_contratada, item.unidade)} />
          <Fato rotulo="Executado (Diário)" valor={qtd(acumulado, item.unidade)} />
          <Fato rotulo="Saldo do item" valor={qtd(saldoDoItem({ contratado: item.qtd_contratada, acumulado }), item.unidade)} />
          <Fato rotulo="Responsável" valor={responsavel ?? '—'} />
          {comValores && <>
            <Fato rotulo="C. Unitário" valor={item.custo_unitario != null ? brlCentavos(item.custo_unitario) : '—'} />
            <Fato rotulo="BDI" valor={item.bdi != null ? percentual(item.bdi) : '—'} />
            <Fato rotulo="P. Unitário" valor={brlCentavos(item.preco_unitario)} />
            <Fato rotulo="P. Total vigente" valor={brlCentavos(precoTotal(item.qtd_contratada, item.preco_unitario))} />
          </>}
        </div>
        {item.editor && <p className="obs" style={{ fontSize: 14, margin: 0 }}>Corrigido por {item.editor} em {dataHoraCurta(item.alterado_em)}.</p>}

        {edita && !formAditivo && item.ativo !== false && (
          <div className="btns">
            <button className="btn primary" onClick={() => setFormAditivo('novo')}>Aditivo de quantidade</button>
            {novo && <button className="btn" onClick={() => onCorrigir(item)}>Corrigir item novo</button>}
            <button className="btn" disabled={salvando} onClick={() => acao(() => marcarCritico(item.id, !item.critico), (s) => (s.critico ? 'Marcado como crítico.' : 'Desmarcado como crítico.'))}>
              {item.critico ? 'Desmarcar crítico' : 'Marcar como crítico'}
            </button>
          </div>
        )}
        {formAditivo && (
          <FormAditivo key={formAditivo === 'novo' ? 'novo' : formAditivo.id} item={item} inicial={formAditivo === 'novo' ? null : formAditivo}
            acumulado={acumulado} numeros={numeros} onFechar={() => setFormAditivo(null)} onSalvo={onMudou} />
        )}

        <section className="card">
          <div className="card-h"><span className="rotulo">Aditivos deste item</span></div>
          <ul className="rows">
            {aditivos.map((a) => (
              <li key={a.id}><div className="row" style={{ minHeight: 52 }}><div className="main-c">
                <div className="t" style={{ fontSize: 16 }}>{a.numero}: {a.quantidade > 0 ? '+' : ''}{qtd(a.quantidade, item.unidade)}</div>
                <Meta>{dmy(a.data)}{a.autor}{a.editor && `corrigido por ${a.editor} em ${dataHoraCurta(a.alterado_em)}`}</Meta>
                <p className="resumo obs">{a.motivo}</p>
                {edita && !formAditivo && (
                  <div className="orc-acoes">
                    <button className="btn ghost" onClick={() => setFormAditivo(a)}>Corrigir</button>
                    <button className="btn ghost" disabled={salvando} onClick={() => {
                      const volta = arredondarQtd(item.qtd_contratada - a.quantidade)
                      if (!window.confirm(`Excluir o ${a.numero} (${a.quantidade > 0 ? '+' : ''}${qtd(a.quantidade, item.unidade)})? A quantidade vigente volta para ${qtd(volta, item.unidade)}.`)) return
                      acao(() => excluirAditivo(a.id), () => `Aditivo excluído: o item ${item.codigo} volta a ${qtd(volta, item.unidade)}.`)
                    }}>Excluir</button>
                  </div>
                )}
              </div></div></li>
            ))}
            {!aditivos.length && <li><div className="row">Nenhum aditivo neste item.</div></li>}
          </ul>
        </section>

        {edita && novo && (
          <div className="btns">
            {!podeExcluirItemNovo({ item, temLancamento: acumulado > 0, temFoto: false }) && (
              <button className="btn ghost" disabled={salvando} onClick={() => {
                if (!window.confirm(`Excluir o item novo ${item.codigo}? Ele e os aditivos dele saem do orçamento.`)) return
                acao(() => excluirItemNovo(item.id), () => `Item novo ${item.codigo} excluído.`)
              }}>Excluir item novo</button>
            )}
            {(acumulado > 0 || item.ativo === false) && (
              <button className="btn ghost" disabled={salvando} onClick={() => acao(() => arquivarServico(item.id, item.ativo !== false), (s) => (s.ativo ? 'Item desarquivado.' : 'Item arquivado.'))}>
                {item.ativo === false ? 'Desarquivar item' : 'Arquivar item novo'}
              </button>
            )}
          </div>
        )}
      </div>
    </Sheet>
  )
}

/* ── Inclusões: item novo e grupo ── */

const ITEM_VAZIO = { grupo: '', fonte: 'COMPOSIÇÃO', codigo_ref: '', descricao: '', unidade: '', quantidade: null, custo_unitario: null, bdi: null, aditivo_numero: '', responsavel_id: '' }

function nomeDoGrupo(g) {
  return `${'— '.repeat(nivelDoCodigo(g.codigo) - 1)}${g.codigo} ${g.nome}`
}

// Item novo (sem inicial) ou correção de um item novo já incluído (inicial).
// minimo/acumulado: na correção, a quantidade não desce abaixo do executado no Diário.
function FormItemNovo({ inicial, minimo, acumulado, grupos, ocupados, dados, numeros, responsaveis, onFechar, onSalvo }) {
  const bdis = [dados?.bdi_servico, dados?.bdi_material].filter((b) => b != null)
  const grupoInicial = inicial ? paiDoCodigo(inicial.codigo) : ''
  const [i, setI] = useState(inicial
    ? {
      grupo: grupoInicial, fonte: inicial.fonte, codigo_ref: inicial.codigo_ref ?? '', descricao: inicial.descricao, unidade: inicial.unidade,
      quantidade: inicial.qtd_orcada, custo_unitario: inicial.custo_unitario, bdi: inicial.bdi, aditivo_numero: inicial.aditivo_numero ?? '',
      responsavel_id: inicial.responsavel_id ?? '',
    }
    : { ...ITEM_VAZIO, bdi: bdis[0] ?? null, aditivo_numero: numeros[0] ?? '' })
  const [bdiOutro, setBdiOutro] = useState(inicial ? !bdis.includes(inicial.bdi) : bdis.length === 0)
  const [tocado, setTocado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const erros = validarItemNovo(i, grupos.map((g) => g.codigo), { minimo, acumulado })
  const erro = (campo) => (tocado ? erros[campo] : undefined)
  const mudar = (campo, valor) => setI({ ...i, [campo]: valor })
  const pu = i.custo_unitario > 0 && i.bdi != null ? precoUnitario(i.custo_unitario, i.bdi) : null
  const codigo = !i.grupo ? null
    : inicial && i.grupo === grupoInicial ? inicial.codigo : proximoCodigo(i.grupo, ocupados.filter((c) => c !== inicial?.codigo))

  async function salvar() {
    setTocado(true)
    if (Object.keys(erros).length) { avisar('Confira os campos marcados.'); return }
    setSalvando(true)
    const r = await salvarItemNovo({ ...i, id: inicial?.id })
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar(inicial ? `Item novo ${r.data.codigo} corrigido.` : `Item novo ${r.data.codigo} incluído.`)
    onSalvo()
  }

  return (
    <Sheet titulo={inicial ? 'Corrigir item novo' : 'Item novo'} subtitulo={!codigo ? 'Escolha o grupo' : inicial ? `Item ${codigo}` : `Vai entrar como item ${codigo}`} onFechar={onFechar}>
      <div className="sheet-b">
        <div className="form-grid">
          <Campo rotulo="Grupo" erro={erro('grupo')} largo>
            <select className="ipt" value={i.grupo} aria-invalid={!!erro('grupo')} disabled={acumulado > 0} onChange={(e) => mudar('grupo', e.target.value)}>
              <option value="">Escolha o grupo</option>
              {grupos.map((g) => <option key={g.codigo} value={g.codigo}>{nomeDoGrupo(g)}</option>)}
            </select>
            {acumulado > 0 && <span className="obs" style={{ fontSize: 13 }}>O item já tem lançamento no Diário: o grupo não muda mais.</span>}
          </Campo>
          <Campo rotulo="Fonte" erro={erro('fonte')}>
            <select className="ipt" value={i.fonte} onChange={(e) => mudar('fonte', e.target.value)}>{FONTES.map((f) => <option key={f}>{f}</option>)}</select>
          </Campo>
          <Campo rotulo="Código (opcional)"><input className="ipt" value={i.codigo_ref} placeholder="Ex.: 98459 ou C-12" onChange={(e) => mudar('codigo_ref', e.target.value)} /></Campo>
          <Campo rotulo="Descrição" erro={erro('descricao')} largo>
            <textarea className="ipt" rows={3} value={i.descricao} aria-invalid={!!erro('descricao')} onChange={(e) => mudar('descricao', e.target.value)} />
          </Campo>
          <Campo rotulo="Unidade" erro={erro('unidade')}>
            <input className="ipt" value={i.unidade} placeholder="M2, M3, UN…" aria-invalid={!!erro('unidade')} onChange={(e) => mudar('unidade', e.target.value)} />
          </Campo>
          <Campo rotulo="Quantidade" erro={erro('quantidade')}>
            <CampoNumero className="ipt" valor={i.quantidade} placeholder="0" aria-invalid={!!erro('quantidade')} onMudar={(n) => mudar('quantidade', n)} />
          </Campo>
          <Campo rotulo="C. Unitário (R$)" erro={erro('custo_unitario')}>
            <CampoNumero className="ipt" casas={2} valor={i.custo_unitario} placeholder="0,00" aria-invalid={!!erro('custo_unitario')} onMudar={(n) => mudar('custo_unitario', n)} />
          </Campo>
          <Campo rotulo="BDI" erro={erro('bdi')}>
            <select className="ipt" value={bdiOutro ? 'outro' : String(i.bdi)}
              onChange={(e) => { const outro = e.target.value === 'outro'; setBdiOutro(outro); mudar('bdi', outro ? null : Number(e.target.value)) }}>
              {dados && <option value={String(dados.bdi_servico)}>Serviço {percentual(dados.bdi_servico)}</option>}
              {dados && <option value={String(dados.bdi_material)}>Material e equipamento {percentual(dados.bdi_material)}</option>}
              <option value="outro">Outro</option>
            </select>
          </Campo>
          {bdiOutro && (
            <Campo rotulo="BDI (%)">
              <CampoNumero className="ipt" casas={2} valor={i.bdi != null ? Math.round(i.bdi * 10000) / 100 : null} placeholder="0,00"
                onMudar={(n) => mudar('bdi', n == null ? null : n / 100)} />
            </Campo>
          )}
          <Campo rotulo="Aditivo que incluiu o item" erro={erro('aditivo_numero')}>
            <input className="ipt" list="numeros-aditivo-novo" value={i.aditivo_numero} placeholder="Ex.: 1º aditivo" onChange={(e) => mudar('aditivo_numero', e.target.value)} />
          </Campo>
          <Campo rotulo="Responsável">
            <select className="ipt" value={i.responsavel_id} onChange={(e) => mudar('responsavel_id', e.target.value)}>
              <option value="">Sem responsável</option>
              {responsaveis.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </Campo>
        </div>
        <ListaAditivos id="numeros-aditivo-novo" numeros={numeros} />
        <p className="orc-previa">
          P. Unitário: <strong>{pu != null ? brlCentavos(pu) : '—'}</strong>
          {pu != null && i.quantidade > 0 && <>; P. Total: <strong>{brlCentavos(precoTotal(i.quantidade, pu))}</strong></>}
          <span className="obs"> (truncado em 2 casas, como na planilha)</span>
        </p>
        <div className="btns">
          <button className="btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : inicial ? 'Salvar correção' : 'Incluir item novo'}</button>
          <button className="btn ghost" onClick={onFechar}>Cancelar</button>
        </div>
      </div>
    </Sheet>
  )
}

function FormGrupo({ grupos, onFechar, onSalvo }) {
  const [pai, setPai] = useState('')
  const [nome, setNome] = useState('')
  const [tocado, setTocado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const erro = tocado && !nome.trim() ? 'Informe o nome do grupo.' : null

  async function salvar() {
    setTocado(true)
    if (!nome.trim()) return
    setSalvando(true)
    const r = await criarGrupo({ pai: pai || null, nome })
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar(`Grupo ${r.data.codigo} criado.`)
    onSalvo()
  }

  return (
    <Sheet titulo="Novo grupo" subtitulo="Etapa ou subgrupo do orçamento" onFechar={onFechar}>
      <div className="sheet-b">
        <div className="form-grid">
          <Campo rotulo="Dentro de" largo>
            <select className="ipt" value={pai} onChange={(e) => setPai(e.target.value)}>
              <option value="">Etapa nova (no primeiro nível)</option>
              {grupos.map((g) => <option key={g.codigo} value={g.codigo}>{nomeDoGrupo(g)}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Nome do grupo" erro={erro} largo>
            <input className="ipt" value={nome} aria-invalid={!!erro} placeholder="Ex.: DRENAGEM" onChange={(e) => setNome(e.target.value)} />
          </Campo>
        </div>
        <div className="btns">
          <button className="btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Criar grupo'}</button>
          <button className="btn ghost" onClick={onFechar}>Cancelar</button>
        </div>
      </div>
    </Sheet>
  )
}

/* ── A tela ── */

export default function Orcamento({ profile }) {
  const { data, erro, carregando, recarregar } = useDados(carregar)
  const [filtro, setFiltro] = useState('todos')
  const [busca, setBusca] = useState('')
  const [abertos, setAbertos] = useState(new Set()) // grupos abertos; de início, só as etapas aparecem
  const [abertoId, setAbertoId] = useState(null)
  const [folha, setFolha] = useState(null) // { tipo: 'item', item? } | { tipo: 'grupo' } | null
  const comValores = podeVerValores(profile.role)
  const edita = podeEditar(profile.role)

  if (carregando) return <Carregando />
  if (erro) return <ErroCarga erro={erro} onTentar={recarregar} />

  const { servicos, lancamentos, grupos, aditivos, dados, responsaveis } = data
  const acumulado = acumuladoPorServico(lancamentos)
  const ativos = servicos.filter(FILTROS_ORCAMENTO.todos)
  const totais = comValores ? totaisDoOrcamento(servicos) : null
  const subtotais = comValores ? subtotaisPorGrupo(ativos) : {}
  // Peso de cada item e grupo no orçamento vigente (original + aditivos). Só para quem vê valores.
  const peso = (valor) => percentual(pesoNoOrcamento(valor, totais?.vigente))
  const pesoDoGrupo = (codigo) => peso(subtotais[codigo] ?? 0)
  const pesoDoItem = (s) => peso(valoresDoItem(s)?.vigente)
  const comAditivo = new Set(aditivos.map((a) => a.servico_id))
  const numeros = [...new Set(aditivos.map((a) => a.numero).concat(servicos.map((s) => s.aditivo_numero).filter(Boolean)))]
  const nomeResp = Object.fromEntries(responsaveis.map((r) => [r.id, r.nome]))
  const ocupados = [...servicos.map((s) => s.codigo), ...grupos.map((g) => g.codigo)]
  const gruposOrdenados = achatarEap(montarEap({ servicos: [], grupos }))

  const termo = busca.trim().toLowerCase()
  const filtrando = filtro !== 'todos' || termo !== ''
  const itens = servicos
    .filter((s) => FILTROS_ORCAMENTO[filtro](s, comAditivo))
    .filter((s) => !termo || `${s.codigo} ${s.codigo_ref ?? ''} ${s.descricao}`.toLowerCase().includes(termo))
  const raizes = montarEap({ servicos: itens, grupos: filtrando ? gruposDosItens(itens, grupos) : grupos, acumulado, mostrarArquivados: filtro === 'arquivados' })
  const todosOsGrupos = achatarEap(raizes).filter((n) => n.tipo === 'grupo').map((n) => n.codigo)
  const fechados = filtrando ? new Set() : new Set(todosOsGrupos.filter((c) => !abertos.has(c)))
  const linhas = achatarEap(raizes, fechados)
  const alternar = (codigo) => { const n = new Set(abertos); if (n.has(codigo)) n.delete(codigo); else n.add(codigo); setAbertos(n) }
  const aberto = abertoId && servicos.find((s) => s.id === abertoId)
  const depoisDeMudar = () => { setAbertoId(null); setFolha(null); recarregar() }

  const quantidade = (s) => (s.qtd_contratada !== s.qtd_orcada
    ? <><s className="obs">{qtd(s.qtd_orcada)}</s> {qtd(s.qtd_contratada)}</>
    : qtd(s.qtd_contratada))
  const marcas = (s) => <>
    {s.origem === ORIGENS_ITEM.novo && <span className="pill soft">Item novo</span>}
    {comAditivo.has(s.id) && <span className="pill soft">Aditivo</span>}
    {s.critico && <Critico />}
  </>

  return (
    <>
      <Faixa><div className="faixa-titulo">Orçamento</div></Faixa>

      <div className="view larga">
        {!servicos.length ? (
          <Vazio titulo="Nenhum item nesta obra ainda"
            texto="Comece importando o orçamento da obra em Excel. A EAP do Planejamento é montada a partir dele."
            acao={edita ? 'Importar o orçamento' : null} onAcao={() => avisar('A importação do orçamento em Excel chega numa próxima etapa.')} />
        ) : (
          <>
            {totais && <DadosDoOrcamento dados={dados} totais={totais} />}

            {edita && (
              <div className="btns">
                <button className="btn dark" onClick={() => setFolha({ tipo: 'item' })}>＋ Item novo</button>
                <button className="btn" onClick={() => setFolha({ tipo: 'grupo' })}>＋ Grupo</button>
                <button className="btn ghost" onClick={() => avisar('A importação do orçamento em Excel chega numa próxima etapa.')}>↑ Importar orçamento (Excel)</button>
              </div>
            )}

            <div className="toolbar">
              <input className="ipt" type="search" placeholder="Buscar por item, código ou descrição" aria-label="Buscar no orçamento" value={busca} onChange={(e) => setBusca(e.target.value)} />
              <div className="filters">
                {FILTROS.map(([id, rotulo]) => <button key={id} aria-pressed={filtro === id} onClick={() => setFiltro(id)}>{rotulo}</button>)}
              </div>
            </div>

            <section className="card">
              <div className="card-h">
                <span className="rotulo">{filtrando ? `${itens.length} de ${ativos.length} itens` : `${ativos.length} itens em ${todosOsGrupos.length} grupos`}</span>
                {!filtrando && (
                  <span className="orc-abrir">
                    <button className="btn ghost" onClick={() => setAbertos(new Set(todosOsGrupos))}>Abrir tudo</button>
                    <button className="btn ghost" onClick={() => setAbertos(new Set())}>Fechar tudo</button>
                  </span>
                )}
              </div>
              {!linhas.length ? <div className="empty" style={{ padding: 24 }}><p>Nenhum item encontrado.</p></div> : (
                <>
                  <ul className="rows only-narrow orc-lista">
                    {linhas.map((n) => (n.tipo === 'grupo' ? (
                      <li key={n.codigo} className={`orc-g n${n.nivel}`}>
                        <button className="row" aria-expanded={!fechados.has(n.codigo)} onClick={() => alternar(n.codigo)} disabled={filtrando}>
                          <span className="orc-seta" aria-hidden="true">{fechados.has(n.codigo) ? '▸' : '▾'}</span>
                          <div className="main-c">
                            <div className="t"><span className="cod">{n.codigo}</span> {n.nome}</div>
                            <Meta>{comValores && brlCentavos(subtotais[n.codigo] ?? 0)}{comValores && `${pesoDoGrupo(n.codigo)} do orçamento`}</Meta>
                          </div>
                        </button>
                      </li>
                    ) : (
                      <li key={n.codigo} className={n.arquivado ? 'arquivado' : undefined}>
                        <button className="row" onClick={() => setAbertoId(n.servico.id)}>
                          <div className="main-c">
                            <div className="orc-marcas"><span className="cod">{n.codigo}</span>{marcas(n.servico)}</div>
                            <div className="t orc-desc">{n.servico.descricao}</div>
                            <Meta>{<>{quantidade(n.servico)} {n.servico.unidade}</>}{comValores && brlCentavos(precoTotal(n.servico.qtd_contratada, n.servico.preco_unitario))}</Meta>
                          </div>
                          {comValores && <div className="pct-big orc-peso">{pesoDoItem(n.servico)}<small>do orçamento</small></div>}
                        </button>
                      </li>
                    )))}
                  </ul>

                  <div className="only-wide tbl-wrap">
                    <table className="orc-tabela">
                      <thead><tr>
                        <th>Item</th>
                        {comValores && <><th>Fonte</th><th>Código</th></>}
                        <th>Descrição</th><th>Und</th><th className="num">Quant.</th>
                        {comValores && <><th className="num">C. Unit.</th><th className="num">BDI</th><th className="num">P. Unit.</th><th className="num">P. Total</th></>}
                        {comValores && <th className="num">% do orçamento</th>}
                      </tr></thead>
                      <tbody>
                        {linhas.map((n) => (n.tipo === 'grupo' ? (
                          <tr key={n.codigo} className={`orc-g n${n.nivel}`}>
                            <td className="nowrap">
                              <button className="orc-toggle" aria-expanded={!fechados.has(n.codigo)} onClick={() => alternar(n.codigo)} disabled={filtrando}>
                                <span aria-hidden="true">{fechados.has(n.codigo) ? '▸' : '▾'}</span> <span className="cod">{n.codigo}</span>
                              </button>
                            </td>
                            <td colSpan={comValores ? 5 : 3}>{n.nome}</td>
                            {comValores && <><td colSpan={3} /><td className="num">{brlCentavos(subtotais[n.codigo] ?? 0)}</td><td className="num">{pesoDoGrupo(n.codigo)}</td></>}
                          </tr>
                        ) : (
                          <tr key={n.codigo} className={`click${n.arquivado ? ' arquivado' : ''}`} tabIndex={0} onClick={() => setAbertoId(n.servico.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter') setAbertoId(n.servico.id) }}>
                            <td className="nowrap"><span className="cod">{n.codigo}</span></td>
                            {comValores && <><td className="nowrap">{n.servico.fonte}</td><td className="nowrap">{n.servico.codigo_ref || '—'}</td></>}
                            <td><div className="orc-desc" title={n.servico.descricao}>{n.servico.descricao}</div><div className="orc-marcas">{marcas(n.servico)}</div></td>
                            <td>{n.servico.unidade}</td>
                            <td className="num">{quantidade(n.servico)}</td>
                            {comValores && <>
                              <td className="num">{n.servico.custo_unitario != null ? brlCentavos(n.servico.custo_unitario) : '—'}</td>
                              <td className="num">{n.servico.bdi != null ? percentual(n.servico.bdi) : '—'}</td>
                              <td className="num">{brlCentavos(n.servico.preco_unitario)}</td>
                              <td className="num big">{brlCentavos(precoTotal(n.servico.qtd_contratada, n.servico.preco_unitario))}</td>
                            </>}
                            {comValores && <td className="num">{pesoDoItem(n.servico)}</td>}
                          </tr>
                        )))}
                      </tbody>
                      {totais && !filtrando && (
                        <tfoot><tr>
                          <td colSpan={9}>Total vigente</td><td className="num big">{brlCentavos(totais.vigente)}</td><td className="num">100,00%</td>
                        </tr></tfoot>
                      )}
                    </table>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>

      {aberto && (
        <ItemDoOrcamento item={aberto} aditivos={aditivos.filter((a) => a.servico_id === aberto.id)} acumulado={acumulado[aberto.id] ?? 0}
          responsavel={nomeResp[aberto.responsavel_id]} numeros={numeros} comValores={comValores} edita={edita}
          onCorrigir={(item) => { setAbertoId(null); setFolha({ tipo: 'item', item }) }}
          onFechar={() => setAbertoId(null)} onMudou={depoisDeMudar} />
      )}
      {folha?.tipo === 'item' && (
        <FormItemNovo inicial={folha.item} grupos={gruposOrdenados}
          acumulado={folha.item ? acumulado[folha.item.id] ?? 0 : 0}
          minimo={folha.item ? minimoDoItemNovo({ qtdOrcada: folha.item.qtd_orcada, vigente: folha.item.qtd_contratada, acumulado: acumulado[folha.item.id] ?? 0 }) : 0} ocupados={ocupados} dados={dados} numeros={numeros} responsaveis={responsaveis}
          onFechar={() => setFolha(null)} onSalvo={depoisDeMudar} />
      )}
      {folha?.tipo === 'grupo' && <FormGrupo grupos={gruposOrdenados} onFechar={() => setFolha(null)} onSalvo={depoisDeMudar} />}
    </>
  )
}
