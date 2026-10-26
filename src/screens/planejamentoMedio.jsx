// Aba Médio prazo (lookahead) do Planejamento: um quadro com uma coluna por semana (3 a 6 à
// frente). Cada atividade prevista na semana é um cartão, e as RESTRIÇÕES que a travam ficam dentro dele. Engenheiro e equipe criam e resolvem;
// editar, mover de semana e excluir é do engenheiro. No celular, uma semana por vez.
import { useState } from 'react'
import { excluirRestricao, moverRestricao, resolverRestricao, salvarRestricao } from '../lib/dados.js'
import { achatarEap, acumuladoPorServico, aplicarPrazo, eapTemDatas, ehItem, montarEap } from '../lib/planejamento.js'
import {
  SEMANAS_PADRAO, SEMANAS_POSSIVEIS, TIPOS_RESTRICAO, VISUAL_DO_TIPO, atividadesDaSemana,
  cartoesDaSemana, restricaoVencida, restricoesNaEap, semanaNoQuadro, semanasDoQuadro, veioDeSemanaPassada,
} from '../lib/restricoes.js'
import { podeEditar, podeRegistrarRestricao } from '../lib/perfis.js'
import { dataHoraCurta, dm, hojeISO } from '../lib/datas.js'
import { Barra, Icon, Meta, Sheet, Vazio, avisar } from '../components/index.jsx'
import EscolherItem from '../components/EscolherItem.jsx'

function Campo({ rotulo, erro, children, largo }) {
  return (
    <label className="field" style={largo ? { flexBasis: '100%' } : undefined}>
      <span>{rotulo}</span>{children}{erro && <span className="erro">{erro}</span>}
    </label>
  )
}

// Nova restrição (sem inicial.id) ou edição (com id). semanas: as do quadro, para escolher.
function FormRestricao({ inicial, itens, nomeDoGrupo, semanas, sugestoes, podeExcluir, onFechar, onSalvo }) {
  const [r, setR] = useState({ tipo: TIPOS_RESTRICAO[0], descricao: '', responsavel: '', ...inicial })
  const [erros, setErros] = useState({})
  const [salvando, setSalvando] = useState(false)
  const mudar = (campo, valor) => setR({ ...r, [campo]: valor })
  const escolhido = itens.find((s) => s.id === r.servico_id) ?? null
  const opcoesSemana = semanas.some((s) => s.inicio === r.semana) || !r.semana ? semanas : [{ inicio: r.semana, rotulo: dm(r.semana) }, ...semanas]

  async function salvar() {
    setSalvando(true)
    const res = await salvarRestricao(r)
    setSalvando(false)
    if (res.erro) { setErros(res.erros ?? {}); avisar(res.erro); return }
    avisar(r.id ? 'Restrição atualizada.' : 'Restrição registrada.')
    onSalvo()
  }
  async function excluir() {
    if (!window.confirm('Excluir esta restrição? Ela sai do quadro.')) return
    const res = await excluirRestricao(r.id)
    if (res.erro) { avisar(res.erro); return }
    avisar('Restrição excluída.')
    onSalvo()
  }

  return (
    <Sheet titulo={r.id ? 'Editar restrição' : 'Nova restrição'} subtitulo="Médio prazo" onFechar={onFechar}>
      <div className="sheet-b">
        <EscolherItem itens={itens} nomeDoGrupo={nomeDoGrupo} escolhido={escolhido} onEscolher={(id) => mudar('servico_id', id)} />
        {erros.servico_id && <span className="erro">{erros.servico_id}</span>}
        <div style={{ fontWeight: 600, margin: '14px 0 6px', fontSize: 14 }}>Tipo</div>
        <div className="rest-tipos" role="radiogroup" aria-label="Tipo da restrição">
          {TIPOS_RESTRICAO.map((t) => (
            <button key={t} role="radio" aria-checked={r.tipo === t} className={`rest-tipo-op ${VISUAL_DO_TIPO[t].cor}`} onClick={() => mudar('tipo', t)}>
              <Icon nome={VISUAL_DO_TIPO[t].icone} tamanho={16} />{t}
            </button>
          ))}
        </div>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <Campo rotulo="O que está travando" erro={erros.descricao} largo>
            <textarea className="ipt" rows={2} value={r.descricao} placeholder="Ex.: bloco cerâmico em falta no fornecedor" onChange={(e) => mudar('descricao', e.target.value)} />
          </Campo>
          <Campo rotulo="Semana" erro={erros.semana}>
            <select className="ipt" value={r.semana ?? ''} onChange={(e) => mudar('semana', e.target.value)}>
              <option value="">Escolha a semana</option>
              {opcoesSemana.map((s) => <option key={s.inicio} value={s.inicio}>Semana de {s.rotulo ?? dm(s.inicio)}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Prazo para resolver" erro={erros.prazo}>
            <input className="ipt" type="date" value={r.prazo ?? ''} onChange={(e) => mudar('prazo', e.target.value)} />
          </Campo>
          <Campo rotulo="Responsável por resolver" erro={erros.responsavel} largo>
            <input className="ipt" list="responsaveis-restricao" value={r.responsavel} placeholder="Ex.: Compras, Construtora Pedra Firme" onChange={(e) => mudar('responsavel', e.target.value)} />
          </Campo>
        </div>
        <datalist id="responsaveis-restricao">{sugestoes.map((n) => <option key={n} value={n} />)}</datalist>
        <div className="btns" style={{ marginTop: 14 }}>
          <button className="btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : r.id ? 'Salvar restrição' : 'Registrar restrição'}</button>
          <button className="btn ghost" onClick={onFechar}>Cancelar</button>
          {r.id && podeExcluir && <button className="btn ghost" onClick={excluir}>Excluir</button>}
        </div>
      </div>
    </Sheet>
  )
}

// A restrição, dentro do cartão da atividade que ela trava.
function CartaoRestricao({ r, hoje, primeiraSemana, registra, edita, onEditar, onMudou }) {
  const visual = VISUAL_DO_TIPO[r.tipo]
  const vencida = restricaoVencida(r, hoje)
  const veioDe = veioDeSemanaPassada(r, primeiraSemana)
  const acao = async (fazer, mensagem) => {
    const res = await fazer()
    if (res.erro) { avisar(res.erro); return }
    avisar(mensagem)
    onMudou()
  }
  return (
    <article className={`rest-card ${visual.cor}${vencida ? ' vencida' : ''}${r.resolvida ? ' resolvida' : ''}`}>
      <div className="rest-tipo"><Icon nome={visual.icone} tamanho={15} />{r.tipo}</div>
      <p className="rest-desc">{r.descricao}</p>
      <Meta>
        <span>Resp.: {r.responsavel}</span>
        <span className={vencida ? 'alerta' : undefined}>Prazo {dm(r.prazo)}{vencida ? ', vencido' : ''}</span>
        {veioDe && <span className="obs">Veio da semana de {dm(r.semana)}</span>}
      </Meta>
      {r.resolvida && <p className="rest-ok">Resolvida por {r.quem_resolveu} em {dataHoraCurta(r.resolvida_em)}</p>}
      {(registra || edita) && (
        <div className="rest-acoes">
          {registra && (r.resolvida
            ? <button className="btn ghost" onClick={() => acao(() => resolverRestricao(r.id, false), 'Restrição reaberta.')}>Reabrir</button>
            : <button className="btn" onClick={() => acao(() => resolverRestricao(r.id, true), 'Restrição resolvida.')}><Icon nome="check" tamanho={16} /> Resolver</button>)}
          {edita && !r.resolvida && <>
            <button className="btn ghost" aria-label="Mover para a semana anterior" disabled={r.semana <= primeiraSemana} onClick={() => acao(() => moverRestricao(r.id, -1), 'Restrição movida para a semana anterior.')}>◀</button>
            <button className="btn ghost" aria-label="Mover para a semana seguinte" onClick={() => acao(() => moverRestricao(r.id, 1), 'Restrição movida para a semana seguinte.')}>▶</button>
          </>}
          {edita && <button className="btn ghost" onClick={onEditar}>Editar</button>}
        </div>
      )}
    </article>
  )
}

export default function AbaMedio({ profile, dados, onMudou, onIrParaEap }) {
  const hoje = hojeISO()
  const [n, setN] = useState(SEMANAS_PADRAO)
  const [responsavel, setResponsavel] = useState('')
  const [mostrarResolvidas, setMostrarResolvidas] = useState(false)
  const [ativa, setAtiva] = useState(0) // semana aberta no celular
  const [form, setForm] = useState(null) // dados iniciais do formulário, ou null
  const registra = podeRegistrarRestricao(profile.role)
  const edita = podeEditar(profile.role)

  if (!eapTemDatas(dados.servicos)) {
    return (
      <div className="view">
        <Vazio titulo="Ainda não há semanas para planejar"
          texto="O quadro das próximas semanas sai das datas de início e fim dos itens da EAP. Lance as datas e as semanas aparecem aqui."
          acao="Lançar datas na EAP" onAcao={onIrParaEap} />
      </div>
    )
  }

  const acumulado = acumuladoPorServico(dados.lancamentos)
  const raizes = aplicarPrazo(montarEap({ servicos: dados.servicos, grupos: dados.grupos, acumulado }), { hoje, cal: dados.calendario })
  const itens = achatarEap(raizes).filter((x) => ehItem(x) && x.inicio && x.fim)
  const nomeDoGrupo = Object.fromEntries(dados.grupos.map((g) => [g.codigo, g.nome]))
  const semanas = semanasDoQuadro(hoje, n)
  const primeira = semanas[0].inicio
  const ativaReal = Math.min(ativa, n - 1)

  const doQuadro = restricoesNaEap(dados.restricoes, itens)
  const responsaveis = [...new Set(doQuadro.map((r) => r.responsavel))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const sugestoes = [...new Set([...dados.responsaveis.map((r) => r.nome), ...responsaveis])]
  const visiveis = doQuadro.filter((r) => (mostrarResolvidas || !r.resolvida) && (!responsavel || r.responsavel === responsavel))
  const abertas = doQuadro.filter((r) => !r.resolvida)
  const vencidas = abertas.filter((r) => restricaoVencida(r, hoje)).length
  const naSemana = (s) => visiveis.filter((r) => semanaNoQuadro(r, primeira) === s.inicio)
  const fechar = () => setForm(null)
  const salvou = () => { setForm(null); onMudou() }

  return (
    <div className="view larga">
      <div className="toolbar">
        <div className="seg" role="radiogroup" aria-label="Semanas no quadro">
          {SEMANAS_POSSIVEIS.map((x) => <button key={x} role="radio" aria-checked={n === x} onClick={() => setN(x)}>{x} sem.</button>)}
        </div>
        <select className="ipt rest-filtro" value={responsavel} aria-label="Filtrar por responsável" onChange={(e) => setResponsavel(e.target.value)}>
          <option value="">Todos os responsáveis</option>
          {responsaveis.map((nome) => <option key={nome}>{nome}</option>)}
        </select>
        <div className="filters">
          <button aria-pressed={mostrarResolvidas} onClick={() => setMostrarResolvidas(!mostrarResolvidas)}>Mostrar resolvidas</button>
        </div>
        {registra && <button className="btn dark" onClick={() => setForm({ semana: semanas[ativaReal].inicio })}>＋ Nova restrição</button>}
      </div>
      <p className="obs" style={{ margin: 0, fontSize: 14 }}>
        {abertas.length} {abertas.length === 1 ? 'restrição aberta' : 'restrições abertas'}{vencidas ? `, ${vencidas} com prazo vencido` : ''}.
        Atividade liberada é a que não tem restrição aberta: pode ir para a semana.
      </p>

      {/* Celular: uma semana por vez */}
      <div className="tabs only-narrow rest-abas" role="tablist" aria-label="Semanas">
        {semanas.map((s, i) => (
          <button key={s.inicio} role="tab" className="tab" aria-selected={ativaReal === i} onClick={() => setAtiva(i)}>
            Sem. {i + 1}<span className="n">{naSemana(s).filter((r) => !r.resolvida).length}</span>
          </button>
        ))}
      </div>

      <div className="rest-quadro" style={{ '--semanas': n }}>
        {semanas.map((s, i) => {
          const rs = naSemana(s)
          const todosOsCartoes = cartoesDaSemana({ atividades: atividadesDaSemana(itens, s), itensComDatas: itens, restricoesDaSemana: rs, todas: dados.restricoes })
          // Com filtro de responsável, ficam só as atividades com restrição dele.
          const cartoes = responsavel ? todosOsCartoes.filter((c) => c.restricoes.length) : todosOsCartoes
          const liberadas = cartoes.filter((c) => c.liberada).length
          return (
            <section key={s.inicio} className={`rest-col${ativaReal === i ? ' ativa' : ''}`} aria-label={`Semana de ${dm(s.inicio)} a ${dm(s.fim)}`}>
              <header className="rest-col-h">
                <div className="rest-col-t">{i === 0 ? 'Esta semana' : `Semana ${i + 1}`}<span>{dm(s.inicio)} a {dm(s.fim)}</span></div>
                <Meta><span>{cartoes.length} atividade(s)</span><span>{liberadas} liberada(s)</span><span>{rs.filter((r) => !r.resolvida).length} restrição(ões) aberta(s)</span></Meta>
              </header>
              <div className="rest-col-b">
                {cartoes.map((c) => (
                  <article key={c.servico.id} className={`med-ativ${c.liberada ? ' livre' : ' travada'}`}>
                    <div className="med-ativ-t" title={c.servico.descricao}><span className="cod">{c.servico.codigo}</span> {c.servico.descricao}</div>
                    <div className="med-ativ-m">
                      <span className={`pill ${c.liberada ? 'ok' : 'amber'}`}>{c.liberada ? 'Liberada' : 'Com restrição'}</span>
                      <span>{dm(c.no.inicio)} a {dm(c.no.fim)}</span>
                      {!c.prevista && <span className="obs">Fora do período na EAP</span>}
                    </div>
                    <Barra feito={Math.round((c.no.real ?? 0) * 100)} />
                    {c.restricoes.map((r) => (
                      <CartaoRestricao key={r.id} r={r} hoje={hoje} primeiraSemana={primeira}
                        registra={registra} edita={edita} onEditar={() => setForm({ ...r })} onMudou={onMudou} />
                    ))}
                    {registra && <button className="btn ghost med-mais" onClick={() => setForm({ servico_id: c.servico.id, semana: s.inicio })}>＋ Restrição</button>}
                  </article>
                ))}
                {!cartoes.length && <p className="obs rest-vazio">{responsavel ? 'Nenhuma restrição desse responsável nesta semana.' : 'Nenhuma atividade da EAP prevista nesta semana.'}</p>}
              </div>
            </section>
          )
        })}
      </div>

      {form && (
        <FormRestricao inicial={form} itens={itens.map((x) => x.servico)} nomeDoGrupo={nomeDoGrupo} semanas={semanas}
          sugestoes={sugestoes} podeExcluir={edita} onFechar={fechar} onSalvo={salvou} />
      )}
    </div>
  )
}
