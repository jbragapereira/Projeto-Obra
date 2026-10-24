// Diário de obra (Engenheiro e Diretoria) / Lançar o dia (Equipe da obra).
// Escolhe o dia (hoje por padrão), lança ou corrige o diário daquele dia,
// e mostra o histórico em cartões. Tudo da obra escolhida no seletor.
import { useState } from 'react'
import {
  buscarEndereco, buscarMedicaoAtual, juntar, listarDiarios, listarFotos, listarFuncoes, listarItensMedicao,
  listarLancamentos, listarResponsaveis, listarServicos, salvarDiario, salvarFuncao, salvarResponsavel,
} from '../lib/dados.js'
import {
  CLIMAS, acimaDoSaldo, cartaoNoDiario, climaComChuva, concluidoAoMudarQuantidade, diarioTemConteudo, efetivoParaComecar, efetivoPorFuncao,
  feitoNoMesComODia, podeCorrigir, podeLancarData, porQueNaoLanca, primeiroDiaPermitido, saldoDoItem, saldoRestante, temPrazoDeCorrecao,
  totalEfetivo, ultimoDiaDeCorrecao, validarEfetivo,
} from '../lib/diario.js'
import { analisarServico, ORDEM_SITUACAO } from '../lib/painel.js'
import { podeEditar, podeLancar } from '../lib/perfis.js'
import { TIPOS_RESPONSAVEL, aceitaLancamento } from '../lib/obras.js'
import { qtd, tamanhoArquivo } from '../lib/formato.js'
import { dataHoraCurta, dataLonga, dm, dmy, hojeISO } from '../lib/datas.js'
import { ORIGENS_DATA } from '../lib/fotos.js'
import { CampoNumero, Carregando, Critico, ErroCarga, Faixa, Icon, Meta, Pill, Vazio, avisar, useDados } from '../components/index.jsx'
import { prepararFoto } from '../components/prepararFoto.js'

async function carregar() {
  const r = await juntar({
    servicos: listarServicos(), lancamentos: listarLancamentos(), responsaveis: listarResponsaveis(),
    diarios: listarDiarios(), medicao: buscarMedicaoAtual(), funcoes: listarFuncoes(), fotos: listarFotos(),
  })
  if (r.erro || !r.data.medicao) return r
  const itens = await listarItensMedicao(r.data.medicao.id)
  if (itens.erro) return itens
  return { data: { ...r.data, itens: itens.data }, erro: null }
}

// O que a fiscalização vai conferir em cada foto: data e hora, GPS e endereço.
function DadosDaFoto({ foto }) {
  const temGps = foto.gps_lat != null
  return (
    <dl className="foto-dados">
      <div><dt>Tirada em</dt><dd>{foto.tirada_em ? dataHoraCurta(foto.tirada_em) : 'sem data'}{foto.tirada_em_origem === ORIGENS_DATA.arquivo && <span className="obs"> (data do arquivo)</span>}</dd></div>
      <div>
        <dt>Local</dt>
        <dd>
          {temGps ? (
            <a href={`https://www.openstreetmap.org/?mlat=${foto.gps_lat}&mlon=${foto.gps_lon}#map=18/${foto.gps_lat}/${foto.gps_lon}`} target="_blank" rel="noreferrer">
              {foto.gps_lat.toLocaleString('pt-BR', { minimumFractionDigits: 5 })}, {foto.gps_lon.toLocaleString('pt-BR', { minimumFractionDigits: 5 })}
            </a>
          ) : <span className="alerta">Sem GPS. Tire a foto pelo botão “Tirar foto”, com a localização do celular ligada.</span>}
          {temGps && <span className="obs"> ({foto.gps_origem})</span>}
        </dd>
      </div>
      {temGps && (
        <div><dt>Endereço</dt><dd>{foto.buscandoEndereco ? <span className="obs">Buscando endereço…</span> : foto.endereco ?? <span className="obs">Não encontrado agora; o GPS fica guardado.</span>}</dd></div>
      )}
      <div><dt>Tamanho</dt><dd>{tamanhoArquivo(foto.tamanho_bytes)}</dd></div>
    </dl>
  )
}

// Miniaturas das fotos de um dia. Foto de exemplo (sem imagem guardada) vira um quadradinho.
function Miniaturas({ fotos, max = 4 }) {
  if (!fotos.length) return null
  const vistas = fotos.slice(0, max)
  return (
    <div className="miniaturas">
      {vistas.map((f) => (f.url_previa
        ? <img key={f.id} src={f.url_previa} alt="Foto do dia" />
        : <span key={f.id} className="mini-foto" role="img" aria-label="Foto de exemplo"><Icon nome="camera" tamanho={18} /></span>))}
      {fotos.length > max && <span className="mini-foto mais">+{fotos.length - max}</span>}
    </div>
  )
}

function AtividadesDoDia({ lista, max }) {
  if (!lista.length) return <p className="resumo obs">Sem produção lançada.</p>
  const vistas = max ? lista.slice(0, max) : lista
  return (
    <ul className="atividades">
      {vistas.map((a) => (
        <li key={a.servico_id}>
          <span>{a.descricao}</span>
          <span className="obs"> — {qtd(a.quantidade, a.unidade)}{a.concluido ? ', concluído' : ''}</span>
        </li>
      ))}
      {max && lista.length > max && <li className="obs">e mais {lista.length - max}</li>}
    </ul>
  )
}

function Clima({ diario }) {
  const texto = diario.clima_tarde && diario.clima_tarde !== diario.clima_manha ? `${diario.clima_manha ?? '—'} / ${diario.clima_tarde}` : diario.clima_manha
  if (!texto) return null
  return <span className={`pill ${climaComChuva(diario) ? 'amber' : 'soft'}`}>{texto}</span>
}

function formularioDe(dados, dia, diario) {
  const daqui = dados.lancamentos.filter((l) => diario && l.diario_id === diario.id)
  const itens = {}
  for (const s of dados.servicos) {
    const l = daqui.find((x) => x.servico_id === s.id)
    itens[s.id] = {
      quantidade: l?.quantidade ?? 0, responsavel_id: l?.responsavel_id ?? s.responsavel_id, concluido: l?.concluido ?? false,
      concluidoManual: false, memoria_calculo: l?.memoria_calculo ?? '', fotos: [],
    }
  }
  return {
    data: dia,
    clima_manha: diario?.clima_manha ?? null,
    clima_tarde: diario?.clima_tarde ?? null,
    ocorrencias: diario?.ocorrencias ?? '',
    efetivo: diario
      ? diario.efetivo.map((l) => ({ responsavel_id: l.responsavel_id, funcao_id: l.funcao_id, quantidade: l.quantidade }))
      : efetivoParaComecar(dados.diarios, dia),
    itens,
    extras: daqui.map((l) => l.servico_id),
  }
}

export default function Diario({ profile, obra }) {
  const { data, erro, carregando, recarregar } = useDados(carregar)
  const hoje = hojeISO()
  const [dia, setDia] = useState(hoje)
  const [form, setForm] = useState(null)
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [comprimindo, setComprimindo] = useState([]) // ids dos serviços com foto sendo preparada
  const [novaFuncao, setNovaFuncao] = useState(null) // nome em digitação, ou null (fechado)
  const [novoResp, setNovoResp] = useState(null) // { nome, tipo }, ou null (fechado)

  if (carregando) return <Carregando />
  if (erro) return <ErroCarga erro={erro} onTentar={recarregar} />

  const lanca = podeLancar(profile.role)
  const titulo = (
    <Faixa><div className="faixa-titulo">{lanca && profile.role !== 'Engenheiro' ? 'Lançar o dia' : 'Diário de obra'}
      <span style={{ fontWeight: 400, color: 'var(--head-sub)', marginLeft: 10 }}>{dataLonga(dia)}</span></div></Faixa>
  )

  if (!data.servicos.length) {
    return <>{titulo}<div className="view"><Vazio titulo="Ainda não há o que lançar"
      texto="Assim que o engenheiro importar os serviços desta obra, eles aparecem aqui para você lançar o dia." /></div></>
  }

  const fotosDoDiario = (id) => data.fotos.filter((f) => f.diario_id === id)
  const diarioDoDia = data.diarios.find((x) => x.data === dia)
  const autorDoDia = diarioDoDia?.criado_por
  const pode = lanca && aceitaLancamento(obra)
  const corrigivel = pode && diarioDoDia && podeCorrigir({ role: profile.role, profileId: profile.id, lancadoPor: autorDoDia, dataDiario: dia, hoje })
  const podeNovo = pode && !diarioDoDia && podeLancarData({ role: profile.role, data: dia, hoje, inicioObra: obra.data_inicio })
  const primeiro = primeiroDiaPermitido({ role: profile.role, hoje, inicioObra: obra.data_inicio })
  function trocarDia(novo) {
    if (novo === dia) return
    if (comprimindo.length) { avisar('Espere a foto terminar de ser preparada.'); return }
    const fotosDoForm = form ? Object.values(form.itens).flatMap((i) => i.fotos) : []
    const temRascunho = form && (fotosDoForm.length || diarioTemConteudo({ itens: Object.values(form.itens), efetivo: form.efetivo, ocorrencias: form.ocorrencias }))
    if (temRascunho && !window.confirm('Há um lançamento que ainda não foi enviado. Trocar de dia e descartar?')) return
    fotosDoForm.forEach((f) => URL.revokeObjectURL(f.url_previa))
    setDia(novo); setForm(null); setBusca(''); setNovaFuncao(null); setNovoResp(null)
    window.scrollTo(0, 0)
  }

  const seletorDeDia = (
    <section className="card card-b dia-card">
      <label className="field"><span>Dia do diário</span>
        <input className="ipt" type="date" value={dia} max={hoje} min={lanca ? primeiro ?? undefined : undefined} disabled={comprimindo.length > 0}
          onChange={(e) => { if (e.target.value) trocarDia(e.target.value) }} />
      </label>
      {dia !== hoje && <button className="btn" onClick={() => trocarDia(hoje)}>Voltar para hoje</button>}
      {lanca && temPrazoDeCorrecao(profile.role) && <div className="obs" style={{ fontSize: 14 }}>A equipe lança o dia de hoje ou de ontem.</div>}
    </section>
  )

  const historico = (
    <section className="card">
      <div className="card-h"><span className="rotulo">Outros dias</span></div>
      <ul className="rows">
        {data.diarios.filter((x) => x.data !== dia).slice(0, 15).map((x) => {
          const pessoas = totalEfetivo(x.efetivo)
          return (
            <li key={x.id}>
              <button className="row" onClick={() => trocarDia(x.data)}>
                <div className="main-c">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="t" style={{ fontSize: 16 }}>{dataLonga(x.data)}</span>
                    <Clima diario={x} />
                  </div>
                  <Meta>{pessoas ? `${pessoas} pessoas` : 'Sem efetivo'}{`${x.servicos_com_producao} serviço(s)`}{`${x.qtd_fotos} foto(s)`}{x.autor}</Meta>
                  {pessoas > 0 && <p className="resumo obs">{efetivoPorFuncao(x.efetivo).map((f) => `${f.funcao} ${f.quantidade}`).join(', ')}</p>}
                  <AtividadesDoDia lista={x.atividades} max={3} />
                  {x.ocorrencias && <p className="resumo alerta">{x.ocorrencias}</p>}
                  <Miniaturas fotos={fotosDoDiario(x.id)} />
                </div>
              </button>
            </li>
          )
        })}
        {data.diarios.filter((x) => x.data !== dia).length === 0 && <li><div className="row">Nenhum outro diário.</div></li>}
      </ul>
    </section>
  )

  // Dia com diário e ninguém corrigindo, ou dia que não dá para lançar: resumo.
  if (!form && !podeNovo) {
    const motivo = diarioDoDia ? null : porQueNaoLanca({ role: profile.role, lancaDiario: lanca, obraAceita: aceitaLancamento(obra) })
    return (
      <>
        {titulo}
        <div className="view">
          {seletorDeDia}
          {diarioDoDia ? (
            <section className="card done-card">
              <span style={{ color: 'var(--ok)' }}><Icon nome="check" /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="big">Diário de {dia === hoje ? 'hoje' : dmy(dia)} enviado</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
                  <Clima diario={diarioDoDia} /><span className="obs">por {diarioDoDia.autor}</span>
                </div>
                <dl className="resumo-dia">
                  <div><dt>Efetivo</dt><dd>{diarioDoDia.efetivo.length
                    ? <>{totalEfetivo(diarioDoDia.efetivo)} pessoas: {diarioDoDia.efetivo.map((l) => `${l.quantidade} ${l.funcao.toLowerCase()} (${l.responsavel})`).join(', ')}</>
                    : 'não registrado'}</dd></div>
                  <div><dt>Atividades</dt><dd><AtividadesDoDia lista={diarioDoDia.atividades} /></dd></div>
                  {diarioDoDia.ocorrencias && <div><dt>Ocorrências</dt><dd className="alerta">{diarioDoDia.ocorrencias}</dd></div>}
                </dl>
                <Miniaturas fotos={fotosDoDiario(diarioDoDia.id)} max={8} />
                {corrigivel && <>
                  {temPrazoDeCorrecao(profile.role) && <div className="obs" style={{ fontSize: 14, marginTop: 8 }}>Dá para corrigir até {dm(ultimoDiaDeCorrecao(dia))}, 23h59.</div>}
                  <button className="btn" style={{ marginTop: 10 }} onClick={() => setForm(formularioDe(data, dia, diarioDoDia))}>Corrigir este diário</button>
                </>}
              </div>
            </section>
          ) : (
            <Vazio icone="diario" titulo={`Nenhum diário em ${dmy(dia)}`} texto={motivo} />
          )}
          {historico}
        </div>
      </>
    )
  }

  const f = form ?? formularioDe(data, dia, null)
  const atualizar = (mudanca) => setForm({ ...f, ...mudanca })
  const atualizarItem = (id, mudanca) => setForm({ ...f, itens: { ...f.itens, [id]: { ...f.itens[id], ...mudanca } } })
  const atualizarLinha = (i, mudanca) => atualizar({ efetivo: f.efetivo.map((l, k) => (k === i ? { ...l, ...mudanca } : l)) })
  const errosEfetivo = validarEfetivo(f.efetivo)

  const itemDe = Object.fromEntries((data.itens ?? []).map((i) => [i.servico_id, i]))
  // O formulário olha o serviço SEM o próprio dia: assim o que se está lançando
  // (ou corrigindo) não esconde o cartão nem entra duas vezes no saldo.
  const lancamentosDeOutrosDias = data.lancamentos.filter((l) => !diarioDoDia || l.diario_id !== diarioDoDia.id)
  const analises = data.servicos.filter((s) => s.ativo).map((s) =>
    analisarServico({ servico: s, lancamentos: lancamentosDeOutrosDias, item: itemDe[s.id] ?? null, medicao: data.medicao, hoje }))
  // Cartão some só se o serviço já foi concluído em outro dia; o que está em
  // lançamento (com quantidade, concluído ou já lançado neste dia) fica na tela.
  const visiveis = analises
    .filter((a) => cartaoNoDiario({ concluidoEmOutroDia: a.concluido, item: f.itens[a.servico.id], jaNoDia: f.extras.includes(a.servico.id) }))
    .filter((a) => a.noMes || f.extras.includes(a.servico.id))
    .sort((x, y) => ORDEM_SITUACAO.indexOf(x.situacao) - ORDEM_SITUACAO.indexOf(y.situacao))
  const termo = busca.trim().toLowerCase()
  const achados = termo
    ? analises.filter((a) => !a.concluido && !visiveis.includes(a) && `${a.servico.codigo} ${a.servico.descricao}`.toLowerCase().includes(termo)).slice(0, 6)
    : []
  const comProducao = Object.values(f.itens).filter((i) => i.quantidade > 0).length
  const fotosNovas = Object.values(f.itens).reduce((s, i) => s + i.fotos.length, 0)
  const temConteudo = diarioTemConteudo({ itens: Object.values(f.itens), efetivo: f.efetivo, ocorrencias: f.ocorrencias })

  // A compressão demora um instante: as fotos entram no formulário pelo estado mais recente.
  const mudarFotos = (id, mudar) => setForm((atual) => {
    const base = atual ?? formularioDe(data, dia, null)
    return { ...base, itens: { ...base.itens, [id]: { ...base.itens[id], fotos: mudar(base.itens[id].fotos) } } }
  })

  // Cada foto: lê data, hora e GPS, comprime guardando esses dados no arquivo,
  // e busca o endereço (em fila, sem travar a tela).
  async function anexarFotos(id, arquivos, pelaCamera) {
    setComprimindo((ids) => [...ids, id])
    for (const arquivo of arquivos) {
      try {
        const p = await prepararFoto(arquivo, { pelaCamera })
        const foto = { url_previa: URL.createObjectURL(p.blob), ...p.dados, endereco: null, buscandoEndereco: p.dados.gps_lat != null }
        mudarFotos(id, (fotos) => [...fotos, foto])
        avisar(`Foto anexada: ${tamanhoArquivo(p.tamanhoOriginal)} comprimida para ${tamanhoArquivo(p.dados.tamanho_bytes)}.`)
        if (foto.buscandoEndereco) {
          buscarEndereco(foto.gps_lat, foto.gps_lon).then(({ data: endereco }) =>
            mudarFotos(id, (fotos) => fotos.map((x) => (x.url_previa === foto.url_previa ? { ...x, endereco, buscandoEndereco: false } : x))))
        }
      } catch (e) {
        avisar(e.message)
      }
    }
    setComprimindo((ids) => ids.filter((x) => x !== id))
  }

  function tirarFoto(id, foto) {
    URL.revokeObjectURL(foto.url_previa)
    mudarFotos(id, (fotos) => fotos.filter((x) => x !== foto))
  }

  // O cadastrado já entra na primeira linha que estava sem aquele campo (ou numa linha nova).
  function preencherVaga(campo, id) {
    const vaga = f.efetivo.findIndex((l) => !l[campo])
    const nova = { responsavel_id: '', funcao_id: '', quantidade: null, [campo]: id }
    atualizar({ efetivo: vaga >= 0 ? f.efetivo.map((l, k) => (k === vaga ? { ...l, [campo]: id } : l)) : [...f.efetivo, nova] })
  }

  async function criarFuncao() {
    const r = await salvarFuncao({ nome: novaFuncao })
    if (r.erro) { avisar(r.erro); return }
    avisar(`Função ${r.data.nome} cadastrada.`)
    setNovaFuncao(null)
    preencherVaga('funcao_id', r.data.id)
    recarregar()
  }

  async function criarResponsavel() {
    const r = await salvarResponsavel(novoResp)
    if (r.erro) { avisar(r.erro); return }
    avisar(`${r.data.nome} cadastrado.`)
    setNovoResp(null)
    preencherVaga('responsavel_id', r.data.id)
    recarregar()
  }

  async function enviar() {
    if (Object.keys(errosEfetivo).length) { avisar('Confira as linhas do efetivo marcadas em vermelho.'); return }
    setSalvando(true)
    const itens = await Promise.all(Object.entries(f.itens).map(async ([servico_id, i]) => ({
      servico_id, ...i,
      fotos: await Promise.all(i.fotos.map(async (foto) =>
        (foto.buscandoEndereco ? { ...foto, endereco: (await buscarEndereco(foto.gps_lat, foto.gps_lon)).data } : foto))),
    })))
    const r = await salvarDiario({
      data: dia, clima_manha: f.clima_manha, clima_tarde: f.clima_tarde, ocorrencias: f.ocorrencias,
      efetivo: f.efetivo, itens,
    })
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    Object.values(f.itens).flatMap((i) => i.fotos).forEach((foto) => URL.revokeObjectURL(foto.url_previa))
    avisar(`Diário de ${dm(dia)} enviado. O painel já foi atualizado.`)
    setForm(null)
    recarregar()
  }

  const edita = podeEditar(profile.role)

  return (
    <>
      {titulo}
      <div className="view">
        {seletorDeDia}

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

        <section className="card card-b efetivo">
          <div className="efetivo-h">
            <span className="sec-t" style={{ padding: 0 }}>Efetivo do dia</span>
            <span className="efetivo-total">{totalEfetivo(f.efetivo)} pessoas</span>
          </div>
          {f.efetivo.length === 0 && <p className="obs">Ninguém registrado ainda. Acrescente uma linha por função de cada responsável.</p>}
          {f.efetivo.map((l, i) => (
            <div key={i} className={`efetivo-linha ${errosEfetivo[i] ? 'com-erro' : ''}`}>
              <label className="field f-resp"><span>Responsável</span>
                <select className="ipt" value={l.responsavel_id} aria-invalid={!l.responsavel_id} onChange={(e) => atualizarLinha(i, { responsavel_id: e.target.value })}>
                  <option value="">Escolha…</option>
                  {data.responsaveis.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </label>
              <label className="field f-func"><span>Função</span>
                <select className="ipt" value={l.funcao_id} aria-invalid={!l.funcao_id} onChange={(e) => atualizarLinha(i, { funcao_id: e.target.value })}>
                  <option value="">Escolha…</option>
                  {data.funcoes.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                </select>
              </label>
              <label className="field f-pess"><span>Pessoas</span>
                <CampoNumero className="ipt" inteiro casas={0} valor={l.quantidade} placeholder="0"
                  aria-label={`Pessoas na linha ${i + 1}`} onMudar={(n) => atualizarLinha(i, { quantidade: n })} />
              </label>
              <button className="remover f-rem" aria-label={`Tirar a linha ${i + 1} do efetivo`} onClick={() => atualizar({ efetivo: f.efetivo.filter((_, k) => k !== i) })}>✕</button>
              {errosEfetivo[i] && <span className="erro">{errosEfetivo[i]}</span>}
            </div>
          ))}
          <div className="btns">
            <button className="btn" onClick={() => atualizar({ efetivo: [...f.efetivo, { responsavel_id: '', funcao_id: '', quantidade: null }] })}>＋ Adicionar linha</button>
            {edita && <button className="btn ghost" onClick={() => { setNovaFuncao(''); setNovoResp(null) }}>＋ Nova função</button>}
            {edita && <button className="btn ghost" onClick={() => { setNovoResp({ nome: '', tipo: TIPOS_RESPONSAVEL[0] }); setNovaFuncao(null) }}>＋ Novo responsável</button>}
          </div>
          {novaFuncao !== null && (
            <div className="cadastro-rapido">
              <label className="field"><span>Nome da nova função</span>
                <input className="ipt" value={novaFuncao} placeholder="Ex.: Gesseiro, Soldador, Operador de betoneira" autoFocus onChange={(e) => setNovaFuncao(e.target.value)} />
              </label>
              <div className="btns">
                <button className="btn primary" onClick={criarFuncao} disabled={!novaFuncao.trim()}>Cadastrar função</button>
                <button className="btn ghost" onClick={() => setNovaFuncao(null)}>Cancelar</button>
              </div>
            </div>
          )}
          {novoResp && (
            <div className="cadastro-rapido">
              <div className="form-grid">
                <label className="field"><span>Nome do responsável</span>
                  <input className="ipt" value={novoResp.nome} placeholder="Ex.: Construtora Alfa" autoFocus onChange={(e) => setNovoResp({ ...novoResp, nome: e.target.value })} />
                </label>
                <label className="field"><span>Tipo</span>
                  <select className="ipt" value={novoResp.tipo} onChange={(e) => setNovoResp({ ...novoResp, tipo: e.target.value })}>
                    {TIPOS_RESPONSAVEL.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </label>
              </div>
              <div className="btns" style={{ marginTop: 10 }}>
                <button className="btn primary" onClick={criarResponsavel} disabled={!novoResp.nome.trim()}>Cadastrar responsável</button>
                <button className="btn ghost" onClick={() => setNovoResp(null)}>Cancelar</button>
              </div>
            </div>
          )}
        </section>

        <div className="sec-t">Produção {dia === hoje ? 'de hoje' : `de ${dmy(dia)}`} ({visiveis.length} serviços)</div>
        <div className="lanc-grid">
          {visiveis.map((a) => {
            const s = a.servico
            const it = f.itens[s.id]
            const saldo = saldoDoItem({ contratado: s.qtd_contratada, acumulado: a.acumulado })
            const fica = saldoRestante({ saldo, quantidade: it.quantidade })
            const feito = feitoNoMesComODia({ executadoNoMes: a.executadoPeriodo, quantidade: it.quantidade, dia, medicao: data.medicao })
            const feitoMudou = feito !== a.executadoPeriodo
            // Quantidade nova: o Concluído acompanha sozinho o saldo do item.
            const mudarQuantidade = (q) => atualizarItem(s.id, {
              quantidade: q, concluido: concluidoAoMudarQuantidade({ quantidade: q, saldo, atual: it.concluido, manual: it.concluidoManual }),
            })
            return (
              <section key={s.id} className={`card svc ${it.quantidade > 0 ? 'has' : ''}`}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="t">{s.descricao}</div>
                    <Meta><span className="cod">{s.codigo}</span>{s.critico && <Critico />}{a.noMes
                      ? <span className={`saldo ${feitoMudou ? 'mudou' : ''}`} aria-live="polite">Feito <b>{qtd(feito, s.unidade)}</b> de {qtd(a.planejadoMes, s.unidade)} no mês{feitoMudou && <span className="obs"> (era {qtd(a.executadoPeriodo, s.unidade)})</span>}</span>
                      : 'Fora do planejado do mês'}<span className={`saldo ${it.quantidade > 0 ? 'mudou' : ''}`} aria-live="polite">Saldo do item: <b>{qtd(fica, s.unidade)}</b>{it.quantidade > 0 && <span className="obs"> (era {qtd(saldo, s.unidade)})</span>}</span></Meta>
                  </div>
                  <Pill situacao={a.situacao} />
                </div>
                <div className="qty">
                  <button aria-label={`Diminuir ${s.descricao}`} onClick={() => mudarQuantidade(Math.max(0, it.quantidade - 1))}>−</button>
                  <CampoNumero valor={it.quantidade} placeholder="0" aria-label={`Quantidade executada de ${s.descricao}, em ${s.unidade}`}
                    onMudar={(n) => mudarQuantidade(Math.max(0, n ?? 0))} />
                  <span className="un">{s.unidade}</span>
                  <button aria-label={`Aumentar ${s.descricao}`} onClick={() => mudarQuantidade(it.quantidade + 1)}>＋</button>
                </div>
                {acimaDoSaldo({ quantidade: it.quantidade, saldo }) && (
                  <div className="alerta" style={{ fontSize: 14, marginTop: 6 }}>Acima do saldo do item ({qtd(saldo, s.unidade)}). Confira a quantidade.</div>
                )}
                <label className="field memoria">
                  <span>Memória de cálculo</span>
                  <textarea className="ipt" rows={2} value={it.memoria_calculo}
                    placeholder={`Ex.: 3 trechos × 8,00 ${s.unidade} = 24,00 ${s.unidade}`}
                    onChange={(e) => atualizarItem(s.id, { memoria_calculo: e.target.value })} />
                </label>
                <div className="svc-row">
                  <label className="field"><span>Quem executou</span>
                    <select className="ipt" value={it.responsavel_id ?? ''} onChange={(e) => atualizarItem(s.id, { responsavel_id: e.target.value })}>
                      {data.responsaveis.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                    </select>
                  </label>
                </div>
                <div className="svc-row">
                  <button className={`btn ${it.concluido ? 'on' : ''}`} style={{ flex: 1 }} aria-pressed={it.concluido}
                    title="Fica marcado sozinho quando a quantidade do dia cobre o saldo do item; marcado ou desmarcado à mão, a sua escolha vale"
                    onClick={() => atualizarItem(s.id, { concluido: !it.concluido, concluidoManual: true })}>
                    {it.concluido ? <Icon nome="check" tamanho={20} /> : <span className="caixa" aria-hidden="true" />} Concluído
                  </button>
                </div>
                <div className="svc-row">
                  {[['camera', 'Tirar foto', true], ['galeria', 'Da galeria', false]].map(([chave, rotulo, pelaCamera]) => (
                    <label key={chave} className="btn" style={{ flex: 1 }} aria-disabled={comprimindo.includes(s.id)}>
                      <input className="sr-only" type="file" accept="image/*" multiple={!pelaCamera} capture={pelaCamera ? 'environment' : undefined}
                        disabled={comprimindo.includes(s.id)}
                        onChange={(e) => { const arquivos = [...e.target.files]; e.target.value = ''; if (arquivos.length) anexarFotos(s.id, arquivos, pelaCamera) }} />
                      <Icon nome={pelaCamera ? 'camera' : 'fotos'} tamanho={20} />
                      {comprimindo.includes(s.id) ? 'Preparando…' : rotulo}
                    </label>
                  ))}
                </div>
                {it.fotos.length > 0 && (
                  <div className="fotos-lista">
                    {it.fotos.map((foto, i) => (
                      <figure key={foto.url_previa} className="foto-item">
                        <div className="thumb-foto">
                          <img src={foto.url_previa} alt={`Foto ${i + 1} de ${s.descricao}`} />
                          <button aria-label={`Tirar a foto ${i + 1}`} onClick={() => tirarFoto(s.id, foto)}>✕</button>
                        </div>
                        <figcaption><DadosDaFoto foto={foto} /></figcaption>
                      </figure>
                    ))}
                  </div>
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

        <section className="card card-b" style={{ display: 'grid', gap: 12 }}>
          <label className="field"><span>Ocorrências do dia</span>
            <textarea className="ipt" placeholder="Ex.: falta de bloco cerâmico, chuva às 14h, visita da fiscalização…"
              value={f.ocorrencias} onChange={(e) => atualizar({ ocorrencias: e.target.value })} />
          </label>
        </section>

        <div className="send">
          <button className="btn primary" onClick={enviar} disabled={salvando || comprimindo.length > 0 || !temConteudo}>
            {salvando ? 'Enviando…' : `${diarioDoDia ? 'Salvar correção' : 'Enviar diário'} de ${dm(dia)}`}
          </button>
          <div className="hint">{totalEfetivo(f.efetivo)} pessoas, {comProducao} serviço(s) com produção e {fotosNovas} foto(s) nova(s)</div>
        </div>

        {form && diarioDoDia && <button className="btn ghost" onClick={() => setForm(null)}>Cancelar a correção</button>}

        {historico}
      </div>
    </>
  )
}
