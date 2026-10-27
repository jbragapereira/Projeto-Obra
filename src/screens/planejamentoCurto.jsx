// Aba Curto prazo do Planejamento: o kanban da semana (A fazer, Em andamento, Concluído, Não
// realizado), as subtarefas de cada atividade e o PPC. A lista nasce pela regra (cruza a semana ou
// está atrasada); o engenheiro pode tirar. Engenheiro e equipe movem; a diretoria só vê.
import { useState } from 'react'
import { definirResponsavelDaSemana, excluirSubtarefa, mudarStatusAtividade, mudarSubtarefa, salvarSubtarefa, tirarDaSemana } from '../lib/dados.js'
import { achatarEap, acumuladoPorServico, aplicarPrazo, eapTemDatas, ehItem, montarEap } from '../lib/planejamento.js'
import {
  CAUSAS, CAUSA_OUTRA, COLUNAS_KANBAN, SITUACAO_SUBTAREFA, STATUS_SEMANA, acoesDoStatus, atividadesDaSemanaCurta, causasMaisFrequentes, ppc, realPorItem,
  responsavelNaSemana, semanasAnteriores, textoDaCausa, validarCausa,
} from '../lib/curtoPrazo.js'
import { atividadeLiberada } from '../lib/restricoes.js'
import { podeAtualizarSemana, podeEditar } from '../lib/perfis.js'
import { paraEscolher, rotuloNaLista } from '../lib/cadastros.js'
import { addDias, dm, hojeISO, segundaDaSemana } from '../lib/datas.js'
import { Barra, Icon, Sheet, Vazio, avisar } from '../components/index.jsx'

const pctDe = (p) => Math.round((p ?? 0) * 100)
const SEMANAS_NO_GRAFICO = 8
const semanaDe = (inicio) => ({ inicio, fim: addDias(inicio, 6) })

// Causa raiz: obrigatória para "Não realizado" (atividade ou subtarefa).
function FormCausa({ titulo, onSalvar, onFechar }) {
  const [causa, setCausa] = useState('')
  const [texto, setTexto] = useState('')
  const [tocado, setTocado] = useState(false)
  const erro = tocado ? validarCausa({ causa, causa_texto: texto }) : null
  return (
    <Sheet titulo="Por que não foi realizado?" subtitulo={titulo} onFechar={onFechar}>
      <div className="sheet-b">
        <div className="chips curto-causas" role="radiogroup" aria-label="Causa raiz">
          {CAUSAS.map((c) => <button key={c} className="chip" role="radio" aria-checked={causa === c} aria-pressed={causa === c} onClick={() => setCausa(c)}>{c}</button>)}
        </div>
        {causa === CAUSA_OUTRA && (
          <label className="field" style={{ marginTop: 12 }}><span>Qual a causa?</span>
            <input className="ipt" value={texto} autoFocus placeholder="Ex.: greve dos rodoviários" onChange={(e) => setTexto(e.target.value)} />
          </label>
        )}
        {erro && <span className="erro">{erro}</span>}
        <div className="btns" style={{ marginTop: 14 }}>
          <button className="btn primary" onClick={() => { setTocado(true); if (!validarCausa({ causa, causa_texto: texto })) onSalvar(causa, texto) }}>Salvar como não realizado</button>
          <button className="btn ghost" onClick={onFechar}>Cancelar</button>
        </div>
      </div>
    </Sheet>
  )
}

function Subtarefas({ semana, servicoId, lista, atualiza, onCausa, onMudou }) {
  const [texto, setTexto] = useState('')
  const feitas = lista.filter((s) => s.situacao === SITUACAO_SUBTAREFA.feita).length
  const acao = async (fazer) => { const r = await fazer(); if (r.erro) { avisar(r.erro); return } onMudou() }
  const incluir = async () => {
    if (!texto.trim()) return
    const r = await salvarSubtarefa({ semana, servico_id: servicoId, texto })
    if (r.erro) { avisar(r.erro); return }
    setTexto('')
    onMudou()
  }
  return (
    <details className="curto-sub">
      <summary>Subtarefas{lista.length ? ` (${feitas} de ${lista.length})` : ''}</summary>
      <ul>
        {lista.map((s) => (
          <li key={s.id} className={s.situacao === SITUACAO_SUBTAREFA.naoRealizada ? 'nao' : undefined}>
            <label className="curto-sub-check">
              <input type="checkbox" checked={s.situacao === SITUACAO_SUBTAREFA.feita} disabled={!atualiza}
                onChange={(e) => acao(() => mudarSubtarefa(s.id, { situacao: e.target.checked ? SITUACAO_SUBTAREFA.feita : SITUACAO_SUBTAREFA.pendente }))} />
              <span>{s.texto}{s.situacao === SITUACAO_SUBTAREFA.naoRealizada && <em> Não realizada: {textoDaCausa(s)}</em>}</span>
            </label>
            {atualiza && s.situacao !== SITUACAO_SUBTAREFA.naoRealizada && (
              <button className="btn ghost" aria-label={`Marcar "${s.texto}" como não realizada`} title="Não realizada"
                onClick={() => onCausa(s.texto, (causa, causa_texto) => mudarSubtarefa(s.id, { situacao: SITUACAO_SUBTAREFA.naoRealizada, causa, causa_texto }))}>✗</button>
            )}
            {atualiza && <button className="btn ghost" aria-label={`Excluir a subtarefa "${s.texto}"`} onClick={() => acao(() => excluirSubtarefa(s.id))}>✕</button>}
          </li>
        ))}
      </ul>
      {atualiza && (
        <div className="curto-sub-nova">
          <input className="ipt" value={texto} placeholder="Nova subtarefa" aria-label="Nova subtarefa" onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') incluir() }} />
          <button className="btn" onClick={incluir} disabled={!texto.trim()}>＋</button>
        </div>
      )}
    </details>
  )
}

function Cartao({ a, semana, nomeResp, responsaveis, registros, lancamentos, subtarefas, comRestricao, atualiza, edita, onCausa, onMudou }) {
  const s = a.no.servico
  const mover = async (status) => {
    const r = await mudarStatusAtividade({ semana, servico_id: s.id, status })
    if (r.erro) { avisar(r.erro); return }
    onMudou()
  }
  const naoRealizado = () => onCausa(`${a.no.codigo} ${a.no.nome}`, (causa, causa_texto) => mudarStatusAtividade({ semana, servico_id: s.id, status: STATUS_SEMANA.naoRealizado, causa, causa_texto }))
  const tirar = async () => {
    if (!window.confirm(`Tirar ${a.no.codigo} desta semana? Ela deixa de contar no PPC.`)) return
    const r = await tirarDaSemana({ semana, servico_id: s.id, fora: true })
    if (r.erro) { avisar(r.erro); return }
    onMudou()
  }
  const responsavel = responsavelNaSemana({ registros, lancamentos, servicoId: s.id, semana, padrao: s.responsavel_id })
  const escolher = async (responsavel_id) => {
    const r = await definirResponsavelDaSemana({ semana, servico_id: s.id, responsavel_id })
    if (r.erro) { avisar(r.erro); return }
    onMudou()
  }
  return (
    <article className="curto-card">
      <div className="curto-card-t" title={a.no.nome}><span className="cod">{a.no.codigo}</span> {a.no.nome}</div>
      <div className="curto-marcas">
        {a.atrasada && <span className="pill red">Atrasada</span>}
        {comRestricao && <span className="pill amber">Com restrição</span>}
      </div>
      {atualiza ? (
        <label className="field curto-resp"><span>Responsável</span>
          <select className="ipt" value={responsavel ?? ''} onChange={(e) => escolher(e.target.value)}
            aria-label={`Responsável por ${a.no.codigo} nesta semana`}>
            {!responsavel && <option value="">Escolha o responsável</option>}
            {paraEscolher(responsaveis, responsavel).map((r) => <option key={r.id} value={r.id} disabled={!r.ativo}>{rotuloNaLista(r)}</option>)}
          </select>
        </label>
      ) : <div className="curto-info">{nomeResp[responsavel] ?? 'Sem responsável'}</div>}
      <div className="curto-info">Período na EAP: {dm(a.no.inicio)} a {dm(a.no.fim)}</div>
      <Barra feito={pctDe(a.no.real)} />
      <div className="curto-info">Real no Diário: {pctDe(a.no.real)}%</div>
      {a.status === STATUS_SEMANA.naoRealizado && <p className="curto-causa">Causa: {textoDaCausa(a)}</p>}
      {atualiza && (
        <div className="curto-acoes">
          {acoesDoStatus(a.status).map((acao) => (
            <button key={acao.para} className={`btn${acao.para === STATUS_SEMANA.concluido || acao.rotulo === 'Iniciar' ? '' : ' ghost'}`}
              onClick={() => (acao.para === STATUS_SEMANA.naoRealizado ? naoRealizado() : mover(acao.para))}>
              {acao.para === STATUS_SEMANA.concluido && <Icon nome="check" tamanho={16} />} {acao.rotulo}
            </button>
          ))}
          {edita && <button className="btn ghost" onClick={tirar}>Tirar da semana</button>}
        </div>
      )}
      <Subtarefas semana={semana} servicoId={s.id} lista={subtarefas} atualiza={atualiza} onCausa={onCausa} onMudou={onMudou} />
    </article>
  )
}

export default function AbaCurto({ profile, dados, onMudou, onIrParaEap }) {
  const hoje = hojeISO()
  const atual = segundaDaSemana(hoje)
  const [inicio, setInicio] = useState(atual)
  const [coluna, setColuna] = useState(0) // coluna aberta no celular
  const [causaDe, setCausaDe] = useState(null) // { titulo, salvar(causa, texto) }
  const atualiza = podeAtualizarSemana(profile.role)
  const edita = podeEditar(profile.role)

  if (!eapTemDatas(dados.servicos)) {
    return (
      <div className="view">
        <Vazio titulo="Ainda não há semana para acompanhar"
          texto="O Kanban da semana e o PPC saem das datas de início e fim dos itens da EAP. Lance as datas e a semana aparece aqui."
          acao="Lançar datas na EAP" onAcao={onIrParaEap} />
      </div>
    )
  }

  const acumulado = acumuladoPorServico(dados.lancamentos)
  const raizes = aplicarPrazo(montarEap({ servicos: dados.servicos, grupos: dados.grupos, acumulado }), { hoje, cal: dados.calendario })
  const itens = achatarEap(raizes).filter(ehItem)
  const semana = semanaDe(inicio)
  // Quem entra em cada semana: pelo progresso no começo dela (o PPC de semana passada não muda depois).
  const daSemana = (seg) => atividadesDaSemanaCurta({ itens, semana: semanaDe(seg), registros: dados.semanaAtividades, realNoInicio: realPorItem(itens, acumuladoPorServico(dados.lancamentos, seg)) })
  const { lista, fora } = daSemana(inicio)
  const medida = ppc(lista)
  const historico = semanasAnteriores(atual, SEMANAS_NO_GRAFICO).map((seg) => ({ seg, ...ppc(daSemana(seg).lista) }))
  const causas = causasMaisFrequentes({ registros: dados.semanaAtividades, subtarefas: dados.subtarefas, desde: historico[0].seg, ate: atual }).slice(0, 5)
  const nomeResp = Object.fromEntries(dados.responsaveis.map((r) => [r.id, r.nome]))
  const subtarefasDe = (servicoId) => dados.subtarefas.filter((s) => s.semana === inicio && s.servico_id === servicoId)
  const naColuna = (status) => lista.filter((a) => a.status === status)
  const quando = { [atual]: 'Esta semana', [addDias(atual, -7)]: 'Semana passada', [addDias(atual, 7)]: 'Próxima semana' }[inicio] ?? `Semana de ${dm(inicio)}`

  const pedirCausa = (titulo, salvar) => setCausaDe({ titulo, salvar })
  const salvarCausa = async (causa, texto) => {
    const r = await causaDe.salvar(causa, texto)
    if (r.erro) { avisar(r.erro); return }
    setCausaDe(null)
    avisar('Registrado como não realizado.')
    onMudou()
  }
  const devolver = async (no) => {
    const r = await tirarDaSemana({ semana: inicio, servico_id: no.servico.id, fora: false })
    if (r.erro) { avisar(r.erro); return }
    onMudou()
  }

  return (
    <div className="view larga">
      <div className="curto-topo">
        <div className="curto-semana">
          <button className="btn ghost" aria-label="Semana anterior" onClick={() => setInicio(addDias(inicio, -7))}>◀</button>
          <div>
            <div className="curto-semana-t">{quando}</div>
            <div className="obs">{dm(semana.inicio)} a {dm(semana.fim)}</div>
          </div>
          <button className="btn ghost" aria-label="Semana seguinte" onClick={() => setInicio(addDias(inicio, 7))}>▶</button>
          {inicio !== atual && <button className="btn ghost" onClick={() => setInicio(atual)}>Hoje</button>}
        </div>

        <section className="card card-b curto-ppc" aria-label="PPC da semana">
          <div className="rotulo">PPC da semana</div>
          <div className="curto-ppc-n">{medida.valor == null ? '—' : `${pctDe(medida.valor)}%`}</div>
          <Barra feito={pctDe(medida.valor)} />
          <div className="obs">{medida.concluidas} de {medida.total} concluídas</div>
        </section>

        <section className="card card-b curto-hist" aria-label={`PPC das últimas ${SEMANAS_NO_GRAFICO} semanas`}>
          <div className="rotulo">PPC das últimas {SEMANAS_NO_GRAFICO} semanas</div>
          <div className="curto-barras">
            {historico.map((h) => (
              <button key={h.seg} className={`curto-barra-h${h.seg === inicio ? ' atual' : ''}`} onClick={() => setInicio(h.seg)}
                title={`Semana de ${dm(h.seg)}: ${h.valor == null ? 'sem atividades' : `${pctDe(h.valor)}% (${h.concluidas} de ${h.total})`}`}>
                <span className="curto-barra-v">{h.valor == null ? '—' : pctDe(h.valor)}</span>
                <span className="curto-barra-c"><i style={{ height: `${pctDe(h.valor)}%` }} /></span>
                <span className="curto-barra-r">{dm(h.seg)}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="card card-b curto-causas-top" aria-label="Principais causas de não realizado">
          <div className="rotulo">Principais causas (8 semanas)</div>
          {causas.length ? (
            <ol>{causas.map((c) => <li key={c.causa}><span>{c.causa}</span><b>{c.n}</b></li>)}</ol>
          ) : <p className="obs" style={{ margin: '6px 0 0' }}>Nenhuma atividade não realizada.</p>}
        </section>
      </div>

      {/* Celular: uma coluna por vez */}
      <div className="tabs only-narrow curto-abas" role="tablist" aria-label="Colunas do kanban">
        {COLUNAS_KANBAN.map((c, i) => (
          <button key={c} role="tab" className="tab" aria-selected={coluna === i} onClick={() => setColuna(i)}>{c}<span className="n">{naColuna(c).length}</span></button>
        ))}
      </div>

      <div className="curto-kanban">
        {COLUNAS_KANBAN.map((c, i) => (
          <section key={c} className={`curto-col${coluna === i ? ' ativa' : ''} c${i}`} aria-label={c}>
            <header className="curto-col-h"><span>{c}</span><span className="n">{naColuna(c).length}</span></header>
            <div className="curto-col-b">
              {naColuna(c).map((a) => (
                <Cartao key={a.no.codigo} a={a} semana={inicio} nomeResp={nomeResp} responsaveis={dados.responsaveis} registros={dados.semanaAtividades} lancamentos={dados.lancamentos} subtarefas={subtarefasDe(a.no.servico.id)}
                  comRestricao={!atividadeLiberada(a.no.servico.id, dados.restricoes)} atualiza={atualiza} edita={edita}
                  onCausa={pedirCausa} onMudou={onMudou} />
              ))}
              {!naColuna(c).length && <p className="obs curto-vazio">Nenhuma atividade.</p>}
            </div>
          </section>
        ))}
      </div>

      {!lista.length && <p className="obs">Nenhuma atividade da EAP cai nesta semana. As atividades vêm das datas lançadas na EAP.</p>}

      {fora.length > 0 && (
        <details className="card card-b curto-fora">
          <summary>Fora da semana ({fora.length}): tiradas pelo engenheiro, não contam no PPC</summary>
          <ul>
            {fora.map((no) => (
              <li key={no.codigo}>
                <span><span className="cod">{no.codigo}</span> {no.nome}</span>
                {edita && <button className="btn ghost" onClick={() => devolver(no)}>Voltar para a semana</button>}
              </li>
            ))}
          </ul>
        </details>
      )}

      {causaDe && <FormCausa titulo={causaDe.titulo} onSalvar={salvarCausa} onFechar={() => setCausaDe(null)} />}
    </div>
  )
}
