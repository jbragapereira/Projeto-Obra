// Medição de empreiteiros — o fluxo do contrato (Kanban). Cada card é o contrato de um empreiteiro;
// anda por setas (sem arrastar). Ativar pede o cadastro do valor: global (só o total) ou por escopo
// (itens do Orçamento da obra, com quantidade e preço do empreiteiro). Só quem vê valores entra; só o
// engenheiro mexe. As regras moram em lib/empreiteiros.js.
import { useState } from 'react'
import {
  juntar, listarContratosEmpreiteiro, listarGrupos, listarResponsaveis, listarServicos, moverContratoEmpreiteiro,
  salvarContratoEmpreiteiro, salvarValorDoContrato,
} from '../lib/dados.js'
import {
  ATIVO, CONCLUIDO, COR_STATUS_CONTRATO, GLOBAL, acumuladoComBoletim, STATUS_CONTRATO, TIPOS_CONTRATO, statusAoLado,
  validarValorDoContrato, valorDoContrato,
} from '../lib/empreiteiros.js'
import { precoTotal } from '../lib/orcamento.js'
import { TIPOS_EMPREITEIRO } from '../lib/obras.js'
import { podeEditar, podeVerValores } from '../lib/perfis.js'
import { brlCentavos, pctParaBaixo as pct, qtd } from '../lib/formato.js'
import { Barra, CampoNumero, Carregando, ErroCarga, Faixa, Sheet, Vazio, avisar, useDados } from '../components/index.jsx'
import EscolherItem from '../components/EscolherItem.jsx'
import FichaContrato from './empreiteiroFicha.jsx'

const carregar = () => juntar({ contratos: listarContratosEmpreiteiro(), responsaveis: listarResponsaveis(), servicos: listarServicos(), grupos: listarGrupos() })

function Campo({ rotulo, erro, children, largo }) {
  return (
    <label className="field" style={largo ? { flexBasis: '100%' } : undefined}>
      <span>{rotulo}</span>{children}{erro && <span className="erro">{erro}</span>}
    </label>
  )
}

// Novo contrato: empreiteiro (responsáveis desta obra que não são mão de obra própria) e descrição.
function FormNovoContrato({ responsaveis, onFechar, onSalvo }) {
  const [c, setC] = useState({ responsavel_id: '', descricao: '' })
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)
  async function salvar() {
    setSalvando(true)
    const r = await salvarContratoEmpreiteiro(c)
    setSalvando(false)
    if (r.erros) { setErros(r.erros); return }
    if (r.erro) { avisar(r.erro); return }
    avisar('Contrato criado em "Em elaboração".')
    onSalvo()
  }
  return (
    <Sheet titulo="Novo contrato" subtitulo="Nasce em Em elaboração" onFechar={onFechar}>
      <div className="sheet-b">
        <div className="form-grid">
          <Campo rotulo="Empreiteiro" erro={erros.responsavel_id} largo>
            <select className="ipt" value={c.responsavel_id} aria-invalid={!!erros.responsavel_id} onChange={(e) => setC({ ...c, responsavel_id: e.target.value })}>
              <option value="">Escolha o empreiteiro</option>
              {responsaveis.map((r) => <option key={r.id} value={r.id}>{r.nome} ({r.tipo})</option>)}
            </select>
          </Campo>
          <Campo rotulo="Descrição do serviço" erro={erros.descricao} largo>
            <input className="ipt" value={c.descricao} placeholder="Ex.: Alvenaria do 2º pavimento" aria-invalid={!!erros.descricao} onChange={(e) => setC({ ...c, descricao: e.target.value })} />
          </Campo>
        </div>
        {!responsaveis.length && <p className="obs">Cadastre o empreiteiro antes, no módulo Cadastro › Responsáveis (tipo Empreiteiro ou Empresa especializada).</p>}
        <div className="btns" style={{ marginTop: 14 }}>
          <button className="btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Criar contrato'}</button>
          <button className="btn ghost" onClick={onFechar}>Cancelar</button>
        </div>
      </div>
    </Sheet>
  )
}

// Cadastro do valor: ao ativar o contrato, ou como aditivo de um contrato ativo.
function FormValor({ contrato, servicos, nomeDoGrupo, onFechar, onSalvo }) {
  const [tipo, setTipo] = useState(contrato.tipo ?? GLOBAL)
  const [valorGlobal, setValorGlobal] = useState(contrato.valor_global ?? null)
  const [itens, setItens] = useState(contrato.itens.length
    ? contrato.itens.map((i) => ({ servico_id: i.servico_id, quantidade: i.quantidade, preco_unitario: i.preco_unitario }))
    : [{ servico_id: '', quantidade: null, preco_unitario: null }])
  const [tocado, setTocado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const servicoDe = Object.fromEntries(servicos.map((s) => [s.id, s]))
  const travaTipo = contrato.boletins.length > 0
  const medidoPorServico = Object.fromEntries(contrato.itens.map((i) => [i.servico_id, contrato.medido_por_item[i.id] ?? 0]))
  const precoPorServico = Object.fromEntries(contrato.itens.map((i) => [i.servico_id, i.preco_unitario]))
  const erros = tocado ? validarValorDoContrato({ tipo, valor_global: valorGlobal, itens, medidoValor: contrato.medido_valor, medidoPorServico, precoPorServico }) : {}
  const total = valorDoContrato({ tipo, valor_global: valorGlobal, itens })
  const mudarItem = (k, mudanca) => setItens(itens.map((i, j) => (j === k ? { ...i, ...mudanca } : i)))
  function removerItem(k) {
    const i = itens[k]
    if ((i.servico_id || i.quantidade || i.preco_unitario) && !window.confirm('Remover este item do escopo?')) return
    setItens(itens.filter((_, j) => j !== k))
  }
  async function salvar() {
    setTocado(true)
    if (Object.keys(validarValorDoContrato({ tipo, valor_global: valorGlobal, itens, medidoValor: contrato.medido_valor, medidoPorServico, precoPorServico })).length) return
    setSalvando(true)
    const r = await salvarValorDoContrato(contrato.id, { tipo, valor_global: valorGlobal, itens })
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar(contrato.status === ATIVO ? 'Valor do contrato atualizado.' : 'Contrato ativo: já pode receber medição.')
    onSalvo()
  }
  return (
    <Sheet cheia titulo={contrato.status === ATIVO ? 'Aditivo: valor do contrato' : 'Ativar contrato: cadastre o valor'} subtitulo={`${contrato.empreiteiro}: ${contrato.descricao}`} onFechar={onFechar}>
      <div className="sheet-b">
        <div className="seg" role="radiogroup" aria-label="Tipo do contrato">
          {TIPOS_CONTRATO.map((t) => (
            <button key={t} role="radio" aria-checked={tipo === t} disabled={travaTipo && t !== contrato.tipo} onClick={() => setTipo(t)}>
              {t === GLOBAL ? 'Global (valor fechado)' : 'Por escopo (itens)'}
            </button>
          ))}
        </div>
        {travaTipo && <p className="obs" style={{ margin: '6px 0 0' }}>Contrato com boletim não muda de tipo.</p>}
        {erros.tipo && <span className="erro">{erros.tipo}</span>}

        {tipo === GLOBAL ? (
          <div className="form-grid" style={{ marginTop: 12 }}>
            <Campo rotulo="Valor total do contrato (R$)" erro={erros.valor_global} largo>
              <CampoNumero className="ipt" casas={2} valor={valorGlobal} placeholder="0,00" aria-label="Valor total do contrato em reais" onMudar={setValorGlobal} />
            </Campo>
          </div>
        ) : (
          <div className="emp-escopo">
            {itens.map((i, k) => {
              const s = servicoDe[i.servico_id]
              const jaMedido = medidoPorServico[i.servico_id] ?? 0
              return (
                <div key={k} className="emp-linha">
                  <div className="emp-linha-item">
                    <EscolherItem itens={servicos} nomeDoGrupo={nomeDoGrupo} escolhido={s ?? null} onEscolher={(id) => mudarItem(k, { servico_id: id })} />
                    <button className="remover" aria-label="Remover este item" disabled={jaMedido > 0} title={jaMedido > 0 ? 'Item já medido não sai do contrato' : 'Remover item'} onClick={() => removerItem(k)}>✕</button>
                  </div>
                  {s && <div className="obs" style={{ fontSize: 13 }}>Unidade: {s.unidade}{jaMedido > 0 ? `; já medido ${qtd(jaMedido, s.unidade)}` : ''}</div>}
                  <div className="emp-linha-nums">
                    <label className="field"><span>Quantidade{s ? ` (${s.unidade})` : ''}</span>
                      <CampoNumero className="ipt" valor={i.quantidade} placeholder="0" aria-label={`Quantidade do item ${k + 1}`} onMudar={(n) => mudarItem(k, { quantidade: n })} />
                    </label>
                    <label className="field"><span>Preço unitário (R$)</span>
                      <CampoNumero className="ipt" casas={2} valor={i.preco_unitario} placeholder="0,00" aria-label={`Preço unitário do item ${k + 1}`} onMudar={(n) => mudarItem(k, { preco_unitario: n })} />
                    </label>
                    <div className="field"><span>Total</span><b className="emp-total-linha">{brlCentavos(precoTotal(i.quantidade ?? 0, i.preco_unitario ?? 0))}</b></div>
                  </div>
                  {erros[`item${k}`] && <span className="erro">{erros[`item${k}`]}</span>}
                </div>
              )
            })}
            {erros.itens && <span className="erro">{erros.itens}</span>}
            <button className="btn ghost" onClick={() => setItens([...itens, { servico_id: '', quantidade: null, preco_unitario: null }])}>＋ Adicionar item do Orçamento</button>
          </div>
        )}

        <div className="emp-total">Valor total do contrato: <b>{brlCentavos(total ?? 0)}</b></div>
        {contrato.medido_valor > 0 && <p className="obs" style={{ margin: '4px 0 0' }}>Já medido: {brlCentavos(contrato.medido_valor)}. O valor não fica abaixo disso.</p>}
        <div className="btns" style={{ marginTop: 14 }}>
          <button className="btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : contrato.status === ATIVO ? 'Salvar aditivo' : 'Salvar e ativar'}</button>
          <button className="btn ghost" onClick={onFechar}>Cancelar</button>
        </div>
      </div>
    </Sheet>
  )
}

function CardContrato({ c, edita, onMover, onValor, onFicha }) {
  const voltar = statusAoLado(c.status, -1)
  const avancar = statusAoLado(c.status, 1)
  return (
    <article className="curto-card emp-card">
      <div className="emp-card-emp">{c.empreiteiro}</div>
      <div className="curto-card-t" title={c.descricao}>{c.descricao}</div>
      <div className="curto-marcas">
        {c.tipo && <span className="pill soft">{c.tipo}</span>}
        <span className={`pill ${COR_STATUS_CONTRATO[c.status]}`}>{c.status}</span>
      </div>
      {c.valor_total != null && <div className="emp-card-valor">{brlCentavos(c.valor_total)}</div>}
      {(c.status === ATIVO || c.status === CONCLUIDO) && (
        <>
          <Barra feito={Math.round(c.pct_medido * 100)} />
          <div className="curto-info">Medido {brlCentavos(c.medido_valor)} ({pct(c.pct_medido)})</div>
          <div className="curto-info emp-card-saldo">Saldo a receber <b>{brlCentavos(acumuladoComBoletim({ valorTotal: c.valor_total, medidoValor: c.medido_valor }).saldo)}</b></div>
        </>
      )}
      {edita && (
        <div className="curto-acoes">
          {voltar && <button className="btn ghost" aria-label={`Voltar para ${voltar}`} onClick={() => onMover(c, voltar)}>◀ {c.status === CONCLUIDO ? 'Reabrir' : 'Voltar'}</button>}
          {avancar && <button className="btn" aria-label={`Avançar para ${avancar}`} onClick={() => (avancar === ATIVO ? onValor(c) : onMover(c, avancar))}>{avancar === ATIVO ? 'Ativar' : avancar === CONCLUIDO ? 'Concluir' : 'Avançar'} ▶</button>}
          {c.status === ATIVO && <button className="btn ghost" onClick={() => onValor(c)}>Aditivo</button>}
        </div>
      )}
      {(c.status === ATIVO || c.status === CONCLUIDO) && <button className="btn emp-abrir-ficha" onClick={() => onFicha(c)}>Ficha de medição ▸</button>}
    </article>
  )
}

export default function Empreiteiros({ profile }) {
  const { data, erro, carregando, recarregar } = useDados(carregar)
  const [coluna, setColuna] = useState(0) // coluna aberta no celular
  const [novo, setNovo] = useState(false)
  const [valorDe, setValorDe] = useState(null) // contrato no cadastro do valor
  const [fichaId, setFichaId] = useState(null) // contrato com a ficha de medição aberta
  const edita = podeEditar(profile.role)

  if (!podeVerValores(profile.role)) {
    return <div className="view"><Vazio titulo="A medição de empreiteiros é do engenheiro e da diretoria" texto="Seu perfil acompanha o avanço pela tela Início." /></div>
  }
  if (carregando) return <Carregando />
  if (erro) return <ErroCarga erro={erro} onTentar={recarregar} />

  const { contratos, responsaveis, servicos, grupos } = data
  const empreiteiros = responsaveis.filter((r) => r.ativo && TIPOS_EMPREITEIRO.includes(r.tipo))
  const servicosAtivos = servicos.filter((s) => s.ativo)
  const nomeDoGrupo = Object.fromEntries(grupos.map((g) => [g.codigo, g.nome]))
  const naColuna = (status) => contratos.filter((c) => c.status === status)
  const ficha = contratos.find((c) => c.id === fichaId)
  async function mover(c, para) {
    const r = await moverContratoEmpreiteiro(c.id, para)
    if (r.erro) { avisar(r.erro); return }
    avisar(`${c.empreiteiro}: ${para}.`)
    recarregar()
  }

  if (ficha) {
    return (
      <>
        <Faixa><div className="faixa-titulo">Ficha de medição</div></Faixa>
        <FichaContrato key={ficha.id} contrato={ficha} edita={edita} onVoltar={() => setFichaId(null)} onMudou={recarregar} />
      </>
    )
  }

  return (
    <>
      <Faixa><div className="faixa-titulo">Medição empreiteiros</div></Faixa>
      <div className="view larga">
        {!contratos.length ? (
          <Vazio icone="medicao" titulo="Nenhum contrato de empreiteiro ainda"
            texto="Crie o primeiro contrato: ele nasce em elaboração, vai para aprovação e, ativado com o valor, passa a receber medição."
            acao={edita ? 'Criar o primeiro contrato' : null} onAcao={() => setNovo(true)} />
        ) : (
          <>
            <div className="toolbar">
              <p className="obs" style={{ margin: 0, flex: 1 }}>{contratos.length} contrato(s). Mova pelas setas; ativar pede o valor; concluir só com 100% medido.</p>
              {edita && <button className="btn dark" onClick={() => setNovo(true)}>＋ Novo contrato</button>}
            </div>
            <div className="tabs only-narrow curto-abas" role="tablist" aria-label="Colunas do fluxo do contrato">
              {STATUS_CONTRATO.map((s, i) => (
                <button key={s} role="tab" className="tab" aria-selected={coluna === i} onClick={() => setColuna(i)}>{s}<span className="n">{naColuna(s).length}</span></button>
              ))}
            </div>
            <div className="curto-kanban">
              {STATUS_CONTRATO.map((s, i) => (
                <section key={s} className={`curto-col${coluna === i ? ' ativa' : ''} c${i}`} aria-label={s}>
                  <header className="curto-col-h"><span>{s}</span><span className="n">{naColuna(s).length}</span></header>
                  <div className="curto-col-b">
                    {naColuna(s).map((c) => <CardContrato key={c.id} c={c} edita={edita} onMover={mover} onValor={setValorDe} onFicha={(c) => setFichaId(c.id)} />)}
                    {!naColuna(s).length && <p className="obs" style={{ margin: 0, fontSize: 13.5 }}>Nenhum contrato.</p>}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
      {novo && <FormNovoContrato responsaveis={empreiteiros} onFechar={() => setNovo(false)} onSalvo={() => { setNovo(false); recarregar() }} />}
      {valorDe && (
        <FormValor contrato={valorDe} servicos={servicosAtivos} nomeDoGrupo={nomeDoGrupo}
          onFechar={() => setValorDe(null)} onSalvo={() => { setValorDe(null); recarregar() }} />
      )}
    </>
  )
}
