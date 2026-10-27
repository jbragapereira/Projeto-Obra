// Materiais — o fluxo dos pedidos de material (Kanban). Cada card é um pedido/lote ("50 sacos de cimento")
// que anda por setas (sem arrastar): Solicitar → Em cotação → Comprado / a caminho → No almoxarifado →
// Entregue na frente. Comprar pede fornecedor e previsão; receber, o checklist da nota; entregar, a frente.
// Engenheiro e equipe mexem; a diretoria vê. Nada de R$ aqui. As regras moram em lib/materiais.js.
import { useRef, useState } from 'react'
import { juntar, listarMateriais, listarPedidosMaterial, moverPedidoMaterial, salvarPedidoMaterial } from '../lib/dados.js'
import {
  ALMOXARIFADO, COMPRADO, COTACAO, CRITICO, ENTREGUE, NORMAL, PRIORIDADES_PEDIDO, STATUS_PEDIDO, aplicarMovimento, atrasado, classeDaCor,
  contadores, diasNaColuna, frenteDoCard, leadTime, ordenarColuna, pedeFormulario, recebimentoNoCard, statusAoLado, validarMovimento,
  validarPedido,
} from '../lib/materiais.js'
import { podeEditar, podeMoverPedidos, veMateriais } from '../lib/perfis.js'
import { dm, hojeISO } from '../lib/datas.js'
import { qtd, tamanhoArquivo } from '../lib/formato.js'
import { CampoNumero, Carregando, ErroCarga, Faixa, Sheet, Vazio, avisar, useDados } from '../components/index.jsx'
import { comprimirFoto } from '../components/comprimirFoto.js'

const carregar = () => juntar({ pedidos: listarPedidosMaterial(), materiais: listarMateriais() })

// O verbo do botão de avançar e o título do formulário, pela coluna de destino.
const VERBO = { [COTACAO]: 'Cotar', [COMPRADO]: 'Comprar', [ALMOXARIFADO]: 'Receber', [ENTREGUE]: 'Entregar' }
const TITULO_DO_FORMULARIO = { [COMPRADO]: 'Comprar: fornecedor e previsão', [ALMOXARIFADO]: 'Receber no almoxarifado', [ENTREGUE]: 'Entregar na frente' }

const dias = (n) => (n === 1 ? '1 dia' : `${n} dias`)

function Campo({ rotulo, erro, children, largo }) {
  return (
    <label className="field" style={largo ? { flexBasis: '100%' } : undefined}>
      <span>{rotulo}</span>{children}{erro && <span className="erro">{erro}</span>}
    </label>
  )
}

function SimNao({ rotulo, valor, erro, onMudar }) {
  return (
    <div className="field" style={{ flexBasis: '100%' }}>
      <span>{rotulo}</span>
      <div className="seg" role="radiogroup" aria-label={rotulo} style={{ marginBottom: 0, alignSelf: 'flex-start' }}>
        <button role="radio" aria-checked={valor === true} onClick={() => onMudar(true)}>Sim</button>
        <button role="radio" aria-checked={valor === false} onClick={() => onMudar(false)}>Não</button>
      </div>
      {erro && <span className="erro">{erro}</span>}
    </div>
  )
}

// Pedido novo em menos de 30 segundos: material, quantidade, frente e prioridade.
function FormNovoPedido({ materiais, edita, goto, onFechar, onSalvo }) {
  const [p, setP] = useState({ material_id: '', quantidade: null, frente: '', prioridade: NORMAL })
  const [tocado, setTocado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const ids = materiais.map((m) => m.id)
  const erros = tocado ? validarPedido(p, ids) : {}
  const unidade = materiais.find((m) => m.id === p.material_id)?.unidade
  async function salvar() {
    setTocado(true)
    if (Object.keys(validarPedido(p, ids)).length) return
    setSalvando(true)
    const r = await salvarPedidoMaterial(p)
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar('Pedido feito: está em Solicitar.')
    onSalvo()
  }
  return (
    <Sheet titulo="Novo pedido de material" subtitulo="Entra em Solicitar" onFechar={onFechar}>
      <div className="sheet-b">
        {!materiais.length ? (
          <p className="obs">Nenhum material no catálogo desta obra. {edita
            ? <>Cadastre em <button className="link" onClick={() => goto('cadastro')}>Cadastro › Materiais</button>.</>
            : 'Peça ao engenheiro para cadastrar em Cadastro › Materiais.'}</p>
        ) : (
          <div className="form-grid">
            <Campo rotulo="Material" erro={erros.material_id} largo>
              <select className="ipt" value={p.material_id} aria-invalid={!!erros.material_id} onChange={(e) => setP({ ...p, material_id: e.target.value })}>
                <option value="">Escolha o material</option>
                {materiais.map((m) => <option key={m.id} value={m.id}>{m.nome} ({m.unidade})</option>)}
              </select>
            </Campo>
            <Campo rotulo={`Quantidade${unidade ? ` (${unidade})` : ''}`} erro={erros.quantidade}>
              <CampoNumero className="ipt" valor={p.quantidade} placeholder="0" aria-label="Quantidade" onMudar={(n) => setP({ ...p, quantidade: n })} />
            </Campo>
            <Campo rotulo="Frente de serviço" erro={erros.frente}>
              <input className="ipt" value={p.frente} placeholder="Ex.: Banheiro suíte" aria-invalid={!!erros.frente} onChange={(e) => setP({ ...p, frente: e.target.value })} />
            </Campo>
            <div className="field" style={{ flexBasis: '100%' }}>
              <span>Prioridade</span>
              <div className="seg" role="radiogroup" aria-label="Prioridade" style={{ marginBottom: 0, alignSelf: 'flex-start' }}>
                {PRIORIDADES_PEDIDO.map((x) => <button key={x} role="radio" aria-checked={p.prioridade === x} onClick={() => setP({ ...p, prioridade: x })}>{x}</button>)}
              </div>
            </div>
          </div>
        )}
        <div className="btns" style={{ marginTop: 14 }}>
          {materiais.length > 0 && <button className="btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Fazer pedido'}</button>}
          <button className="btn ghost" onClick={onFechar}>Cancelar</button>
        </div>
      </div>
    </Sheet>
  )
}

// O que o movimento pede: comprar (fornecedor e previsão), receber (checklist) ou entregar (frente).
function FormMovimento({ pedido, para, onFechar, onConfirmar }) {
  const [d, setD] = useState({
    fornecedor: pedido.fornecedor ?? '', previsao_entrega: pedido.previsao_entrega || hojeISO(),
    recebimento: { qtd_bate_nf: null, estado_ok: null, avarias: '', foto_nf: null }, frente_aplicada: pedido.frente,
  })
  const [tocado, setTocado] = useState(false)
  const [comprimindo, setComprimindo] = useState(false)
  const erros = tocado ? validarMovimento(pedido, para, d) : {}
  const rec = d.recebimento
  const mudarRec = (m) => setD((atual) => ({ ...atual, recebimento: { ...atual.recebimento, ...m } }))
  async function escolherFoto(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setComprimindo(true)
    try {
      const { blob, largura, altura } = await comprimirFoto(arquivo)
      const url_previa = URL.createObjectURL(blob)
      setD((atual) => {
        if (atual.recebimento.foto_nf) URL.revokeObjectURL(atual.recebimento.foto_nf.url_previa)
        return { ...atual, recebimento: { ...atual.recebimento, foto_nf: { url_previa, tamanho_bytes: blob.size, largura, altura } } }
      })
    } catch (erro) {
      avisar(erro.message)
    }
    setComprimindo(false)
  }
  function confirmar() {
    setTocado(true)
    if (Object.keys(validarMovimento(pedido, para, d)).length) return
    onConfirmar(d)
  }
  // Fechou sem confirmar: a prévia da foto não vai a lugar nenhum.
  function fechar() {
    if (rec.foto_nf) URL.revokeObjectURL(rec.foto_nf.url_previa)
    onFechar()
  }
  return (
    <Sheet titulo={TITULO_DO_FORMULARIO[para]} subtitulo={`${qtd(pedido.quantidade, pedido.unidade)} de ${pedido.material}`} onFechar={fechar}>
      <div className="sheet-b">
        <div className="form-grid">
          {para === COMPRADO && (
            <>
              <Campo rotulo="Fornecedor" erro={erros.fornecedor}>
                <input className="ipt" value={d.fornecedor} placeholder="Ex.: Casa do Construtor" aria-invalid={!!erros.fornecedor} onChange={(e) => setD({ ...d, fornecedor: e.target.value })} />
              </Campo>
              <Campo rotulo="Previsão de entrega" erro={erros.previsao_entrega}>
                <input className="ipt" type="date" value={d.previsao_entrega} aria-invalid={!!erros.previsao_entrega} onChange={(e) => setD({ ...d, previsao_entrega: e.target.value })} />
              </Campo>
            </>
          )}
          {para === ALMOXARIFADO && (
            <>
              <SimNao rotulo="A quantidade bate com a nota fiscal?" valor={rec.qtd_bate_nf} erro={erros.qtd_bate_nf} onMudar={(v) => mudarRec({ qtd_bate_nf: v })} />
              <SimNao rotulo="O material chegou em perfeito estado?" valor={rec.estado_ok} erro={erros.estado_ok} onMudar={(v) => mudarRec({ estado_ok: v })} />
              <Campo rotulo="Avarias (opcional)" largo>
                <textarea className="ipt" rows={2} value={rec.avarias} placeholder="Ex.: 3 sacos rasgados na descarga" onChange={(e) => mudarRec({ avarias: e.target.value })} />
              </Campo>
              <div className="field" style={{ flexBasis: '100%' }}>
                <span>Foto da nota fiscal (opcional)</span>
                <label className="btn ghost" style={{ alignSelf: 'flex-start' }}>
                  {comprimindo ? 'Preparando a foto…' : rec.foto_nf ? 'Trocar a foto' : 'Tirar ou escolher foto'}
                  <input type="file" accept="image/*" capture="environment" hidden onChange={escolherFoto} disabled={comprimindo} />
                </label>
                {rec.foto_nf && (
                  <div className="thumbs mat-nf">
                    <img src={rec.foto_nf.url_previa} alt="Foto da nota fiscal" />
                    <span className="obs" style={{ fontSize: 13 }}>{tamanhoArquivo(rec.foto_nf.tamanho_bytes)}</span>
                  </div>
                )}
              </div>
              {(rec.qtd_bate_nf === false || rec.estado_ok === false) && <p className="obs alerta" style={{ margin: 0 }}>O pedido vai ficar marcado com alerta no quadro.</p>}
            </>
          )}
          {para === ENTREGUE && (
            <Campo rotulo="Frente de aplicação" erro={erros.frente_aplicada} largo>
              <input className="ipt" value={d.frente_aplicada} aria-invalid={!!erros.frente_aplicada} onChange={(e) => setD({ ...d, frente_aplicada: e.target.value })} />
            </Campo>
          )}
        </div>
        <div className="btns" style={{ marginTop: 14 }}>
          <button className="btn primary" onClick={confirmar} disabled={comprimindo}>{VERBO[para]}</button>
          <button className="btn ghost" onClick={fechar}>Cancelar</button>
        </div>
      </div>
    </Sheet>
  )
}

function CardPedido({ p, hoje, mexe, ocupado, onMover }) {
  const voltar = statusAoLado(p.status, -1)
  const avancar = statusAoLado(p.status, 1)
  const emAtraso = atrasado(p, hoje)
  const { problema, avarias } = recebimentoNoCard(p)
  const naColuna = diasNaColuna(p, hoje)
  const lead = leadTime(p)
  return (
    <article className={`curto-card mat-card${emAtraso ? ' atrasado' : ''}`}>
      <div className="curto-card-t">{p.material}</div>
      <div className="mat-qtd">{qtd(p.quantidade, p.unidade)}</div>
      <div className="curto-info">Frente: {frenteDoCard(p)}</div>
      <div className="curto-marcas">
        {p.prioridade === CRITICO && <span className="pill red">Crítico</span>}
        {emAtraso && <span className="pill red">Atrasado</span>}
        {p.categoria && <span className={`pill ${classeDaCor(p.cor)}`}>{p.categoria}</span>}
        {problema && <span className="pill amber">Recebido com problema</span>}
      </div>
      {p.fornecedor && <div className="curto-info">{p.fornecedor}{p.previsao_entrega ? `; previsão ${dm(p.previsao_entrega)}` : ''}</div>}
      {avarias && <div className={`curto-info${problema ? ' alerta' : ''}`}>Avarias: {avarias}</div>}
      <div className="curto-info">{naColuna === 0 ? 'Entrou hoje nesta coluna' : `Há ${dias(naColuna)} nesta coluna`}</div>
      {lead !== null && <div className="curto-info">Lead time: <b>{dias(lead)}</b> do pedido ao almoxarifado</div>}
      {mexe && (
        <div className="curto-acoes">
          {voltar && <button className="btn ghost" aria-label={`Voltar para ${voltar}`} disabled={ocupado} onClick={() => onMover(p, voltar)}>◀ Voltar</button>}
          {avancar && <button className="btn" aria-label={`Avançar para ${avancar}`} disabled={ocupado} onClick={() => onMover(p, avancar)}>{VERBO[avancar]} ▶</button>}
        </div>
      )}
    </article>
  )
}

export default function Materiais({ profile, goto }) {
  const { data, erro, carregando, recarregar } = useDados(carregar)
  const [coluna, setColuna] = useState(0) // coluna aberta no celular
  const [verEntregues, setVerEntregues] = useState(false)
  const [novo, setNovo] = useState(false)
  const [movimento, setMovimento] = useState(null) // { pedido, para } com formulário aberto
  // id → o pedido como a tela mostra depois de mover (antes e depois da resposta da camada). Vive no estado da
  // tela, que remonta ao trocar de obra.
  const [movidos, setMovidos] = useState({})
  const [ocupados, setOcupados] = useState({}) // id → movimento em andamento (trava os botões do card)
  // A mesma trava, valendo já no clique seguinte (o estado só muda no próximo desenho da tela): dois cliques
  // rápidos no mesmo card não mandam dois movimentos.
  const emAndamento = useRef(new Set())
  const mexe = podeMoverPedidos(profile.role)

  if (!veMateriais(profile.role)) {
    return <div className="view"><Vazio titulo="Os pedidos de material são da equipe da obra" texto="Seu perfil acompanha a obra pelas suas próprias telas." /></div>
  }
  if (carregando) return <Carregando />
  if (erro) return <ErroCarga erro={erro} onTentar={recarregar} />

  const hoje = hojeISO()
  const pedidos = data.pedidos.map((p) => movidos[p.id] ?? p)
  const colunas = verEntregues ? STATUS_PEDIDO : STATUS_PEDIDO.filter((s) => s !== ENTREGUE)
  const naColuna = (status) => ordenarColuna(pedidos.filter((p) => p.status === status), hoje)
  const conta = contadores(pedidos, hoje)
  const colunaAberta = Math.min(coluna, colunas.length - 1)

  // Otimista: o card muda de coluna na hora; se a camada recusar, a tela relê o que está gravado e avisa.
  async function executar(p, para, dados = {}) {
    if (emAndamento.current.has(p.id)) return
    emAndamento.current.add(p.id)
    setMovimento(null)
    setOcupados((o) => ({ ...o, [p.id]: true }))
    setMovidos((m) => ({ ...m, [p.id]: aplicarMovimento(p, para, dados, hoje) }))
    const r = await moverPedidoMaterial(p.id, para, dados)
    emAndamento.current.delete(p.id)
    setOcupados((o) => ({ ...o, [p.id]: false }))
    if (r.erro) {
      setMovidos((m) => { const resto = { ...m }; delete resto[p.id]; return resto })
      recarregar()
      avisar(r.erro)
      return
    }
    // Deu certo: fica o que a camada gravou (com o nome, a unidade e a categoria que a tela já tinha).
    setMovidos((m) => ({ ...m, [p.id]: { ...p, ...r.data } }))
    avisar(para === ENTREGUE && !verEntregues ? 'Entregue na frente: saiu do quadro (marque "Ver entregues" para ver).' : `${p.material}: ${para}.`)
  }
  const mover = (p, para) => (pedeFormulario(p, para) ? setMovimento({ pedido: p, para }) : executar(p, para))

  return (
    <>
      <Faixa><div className="faixa-titulo">Materiais</div></Faixa>
      <div className="view larga">
        {!pedidos.length ? (
          <Vazio icone="material" titulo="Nenhum pedido de material ainda"
            texto="Faça o primeiro pedido: escolha o material, a quantidade e a frente. Ele entra em Solicitar e anda até ser entregue na frente."
            acao={mexe ? 'Fazer o primeiro pedido' : null} onAcao={() => setNovo(true)} />
        ) : (
          <>
            <section className="card kpis" aria-label="Resumo dos pedidos">
              <div className="kpi amber"><div className="lbl">Em cotação</div><div className="num">{conta.cotacao}</div><div className="sub">aguardando preço</div></div>
              <div className="kpi ok"><div className="lbl">Chegam esta semana</div><div className="num">{conta.semana}</div><div className="sub">pela previsão, até domingo</div></div>
              <div className="kpi red"><div className="lbl">Atrasados</div><div className="num">{conta.atrasados}</div><div className="sub">previsão vencida</div></div>
            </section>
            <div className="toolbar">
              <label className="check" style={{ flex: 1, margin: 0 }}>
                <input type="checkbox" checked={verEntregues} onChange={(e) => setVerEntregues(e.target.checked)} /> Ver entregues ({naColuna(ENTREGUE).length})
              </label>
              {mexe && <button className="btn dark" onClick={() => setNovo(true)}>＋ Novo pedido</button>}
            </div>
            <div className="tabs only-narrow curto-abas" role="tablist" aria-label="Colunas do fluxo dos pedidos">
              {colunas.map((s, i) => (
                <button key={s} role="tab" className="tab" aria-selected={colunaAberta === i} onClick={() => setColuna(i)}>{s}<span className="n">{naColuna(s).length}</span></button>
              ))}
            </div>
            <div className={`curto-kanban mat-kanban${verEntregues ? ' com-entregues' : ''}`}>
              {colunas.map((s, i) => (
                <section key={s} className={`curto-col${colunaAberta === i ? ' ativa' : ''} m${STATUS_PEDIDO.indexOf(s)}`} aria-label={s}>
                  <header className="curto-col-h"><span>{s}</span><span className="n">{naColuna(s).length}</span></header>
                  <div className="curto-col-b">
                    {naColuna(s).map((p) => <CardPedido key={p.id} p={p} hoje={hoje} mexe={mexe} ocupado={!!ocupados[p.id]} onMover={mover} />)}
                    {!naColuna(s).length && <p className="obs" style={{ margin: 0, fontSize: 13.5 }}>Nenhum pedido.</p>}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
      {novo && <FormNovoPedido materiais={data.materiais} edita={podeEditar(profile.role)} goto={goto} onFechar={() => setNovo(false)} onSalvo={() => { setNovo(false); recarregar() }} />}
      {movimento && (
        <FormMovimento pedido={movimento.pedido} para={movimento.para} onFechar={() => setMovimento(null)}
          onConfirmar={(dados) => executar(movimento.pedido, movimento.para, dados)} />
      )}
    </>
  )
}
