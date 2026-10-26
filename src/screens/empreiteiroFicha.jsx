// Ficha de medição de um contrato de empreiteiro (abre pelo card do Kanban): resumo, itens do escopo com o
// acumulado, "Nova medição" (boletim numerado) e o histórico dos boletins. Em cada linha do boletim digita-se
// a quantidade, o % ou o R$ e os outros dois saem na hora — a QUANTIDADE é a fonte da verdade (regras em
// lib/empreiteiros.js). Só o engenheiro lança; a diretoria vê.
import { useState } from 'react'
import { salvarBoletimEmpreiteiro } from '../lib/dados.js'
import {
  ATIVO, COR_STATUS_CONTRATO, GLOBAL, acumuladoComBoletim, globalPorPercentual, globalPorValor, linhaPorPercentual,
  linhaPorQuantidade, linhaPorValor, proximoNumeroDeBoletim, validarBoletim, valorDoBoletim,
} from '../lib/empreiteiros.js'
import { dmy, hojeISO } from '../lib/datas.js'
import { brlCentavos, pctParaBaixo as pct, qtd } from '../lib/formato.js'
import { Barra, CampoNumero, avisar } from '../components/index.jsx'

const duas = (x) => Math.round(x * 100) / 100

// A linha do boletim a partir do campo que está sendo digitado: { campo: 'qtd' | 'pct' | 'valor', valor }.
// jaMedido: quantidade já medida do item (o R$ da linha sai do acumulado; ver linhaPorQuantidade).
const linhaDoRascunho = (item, r, jaMedido) => (!r ? linhaPorQuantidade(item, 0, jaMedido)
  : r.campo === 'pct' ? linhaPorPercentual(item, r.valor, jaMedido) : r.campo === 'valor' ? linhaPorValor(item, r.valor, jaMedido) : linhaPorQuantidade(item, r.valor, jaMedido))
const globalDoRascunho = (total, r) => (!r ? globalPorValor(total, 0) : r.campo === 'pct' ? globalPorPercentual(total, r.valor) : globalPorValor(total, r.valor))

function NovaMedicao({ contrato, onFechar, onSalvo }) {
  const [data, setData] = useState(hojeISO())
  const [rascunho, setRascunho] = useState({}) // { contrato_item_id | 'global': { campo, valor } }
  const [salvando, setSalvando] = useState(false)
  const global = contrato.tipo === GLOBAL
  const numero = proximoNumeroDeBoletim(contrato.boletins)
  const linhas = global ? [] : contrato.itens.map((i) => ({ item: i, ...linhaDoRascunho(i, rascunho[i.id], contrato.medido_por_item[i.id] ?? 0) }))
  const doGlobal = global ? globalDoRascunho(contrato.valor_total, rascunho.global) : null
  const valorBoletim = global ? doGlobal.valor : valorDoBoletim(linhas)
  const erros = global
    ? validarBoletim({ tipo: GLOBAL, data, hoje: hojeISO(), valorTotal: contrato.valor_total, medidoValor: contrato.medido_valor, valor: doGlobal.valor })
    : validarBoletim({ tipo: contrato.tipo, data, hoje: hojeISO(), itens: contrato.itens, medidoPorItem: contrato.medido_por_item, linhas: linhas.map((l) => ({ contrato_item_id: l.item.id, quantidade: l.quantidade })) })
  // Passou de 100%: erro em algum item (escopo) ou no valor já digitado (global).
  const passou = Object.keys(erros).some((k) => !['linhas', 'valor', 'data'].includes(k)) || (global && !!erros.valor && doGlobal.valor > 0)
  const total = acumuladoComBoletim({ valorTotal: contrato.valor_total, medidoValor: contrato.medido_valor, valorBoletim })
  const digitar = (chave, campo) => (valor) => setRascunho({ ...rascunho, [chave]: { campo, valor: valor ?? 0 } })
  // O campo digitado mostra o que se digita; os outros dois, o que sai da quantidade.
  const mostrar = (r, campo, calculado) => (r?.campo === campo ? r.valor : calculado || null)

  async function salvar() {
    if (Object.keys(erros).length) { avisar(erros.valor ?? erros.linhas ?? erros.data ?? 'Há item passando de 100% acumulado.'); return }
    setSalvando(true)
    const r = await salvarBoletimEmpreiteiro(contrato.id, global ? { data, valor: doGlobal.valor } : { data, linhas: linhas.map((l) => ({ contrato_item_id: l.item.id, quantidade: l.quantidade })) })
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar(`Medição nº ${numero} lançada: ${brlCentavos(valorBoletim)}.`)
    onSalvo()
  }

  return (
    <section className="card card-b emp-boletim" aria-label={`Nova medição nº ${numero}`}>
      <div className="emp-boletim-cab">
        <h3>Medição nº {numero}</h3>
        <label className="field emp-data"><span>Data</span>
          <input className="ipt" type="date" value={data} max={hojeISO()} aria-invalid={!!erros.data} onChange={(e) => setData(e.target.value)} />
        </label>
      </div>
      {erros.data && <span className="erro">{erros.data}</span>}

      {global ? (
        <div className="emp-med-linhas">
          <div className="emp-med-linha">
            <div className="emp-med-item"><b>Contrato global</b><span className="obs">Saldo a medir {brlCentavos(contrato.valor_total - contrato.medido_valor)} ({pct(1 - contrato.pct_medido)})</span></div>
            <label className="field"><span>% deste boletim</span>
              <CampoNumero className="ipt" casas={2} valor={mostrar(rascunho.global, 'pct', duas(doGlobal.pct * 100))} placeholder="0" aria-label="Percentual medido" onMudar={digitar('global', 'pct')} />
            </label>
            <label className="field"><span>R$ deste boletim</span>
              <CampoNumero className="ipt" casas={2} valor={mostrar(rascunho.global, 'valor', doGlobal.valor)} placeholder="0,00" aria-label="Valor medido em reais" onMudar={digitar('global', 'valor')} />
            </label>
            <div className="field"><span>Acumulado</span><b className="emp-med-acum">{pct(total.pct)}</b></div>
          </div>
          {erros.valor && doGlobal.valor > 0 && <span className="erro">{erros.valor}</span>}
        </div>
      ) : (
        <div className="emp-med-linhas escopo">
          <div className="emp-med-linha emp-med-titulos" aria-hidden="true">
            <span>Item</span><span>Quantidade</span><span>%</span><span>R$</span><span>Acumulado</span>
          </div>
          {linhas.map((l) => {
            const i = l.item
            const r = rascunho[i.id]
            const medidoAntes = contrato.medido_por_item[i.id] ?? 0
            const novoPct = i.quantidade > 0 ? (medidoAntes + l.quantidade) / i.quantidade : 0
            return (
              <div key={i.id} className={`emp-med-linha${erros[i.id] ? ' passou' : ''}`}>
                <div className="emp-med-item">
                  <b><span className="cod">{i.codigo}</span> {i.descricao}</b>
                  <span className="obs">Contratado {qtd(i.quantidade, i.unidade)} × {brlCentavos(i.preco_unitario)}; já medido {qtd(medidoAntes, i.unidade)} ({pct(i.quantidade ? medidoAntes / i.quantidade : 0)})</span>
                </div>
                <label className="field"><span>Quantidade ({i.unidade})</span>
                  <CampoNumero className="ipt" valor={mostrar(r, 'qtd', l.quantidade)} placeholder="0" aria-label={`Quantidade executada de ${i.codigo}`} onMudar={digitar(i.id, 'qtd')} />
                </label>
                <label className="field"><span>%</span>
                  <CampoNumero className="ipt" casas={2} valor={mostrar(r, 'pct', duas(l.pct * 100))} placeholder="0" aria-label={`Percentual de ${i.codigo}`} onMudar={digitar(i.id, 'pct')} />
                </label>
                <label className="field"><span>R$</span>
                  <CampoNumero className="ipt" casas={2} valor={mostrar(r, 'valor', l.valor)} placeholder="0,00" aria-label={`Valor medido de ${i.codigo}`} onMudar={digitar(i.id, 'valor')} />
                </label>
                <div className="field"><span>Acumulado</span><b className="emp-med-acum">{pct(novoPct)}</b></div>
                {erros[i.id] && <span className="erro emp-med-erro">Passa de 100%: o saldo deste item é {qtd(i.quantidade - medidoAntes, i.unidade)}.</span>}
              </div>
            )
          })}
        </div>
      )}

      <div className="emp-boletim-rodape">
        <span>Total do boletim: <b>{brlCentavos(valorBoletim)}</b></span>
        <span>Novo acumulado: <b>{brlCentavos(total.acumulado)}</b> ({pct(total.pct)})</span>
        <span>Saldo a medir: <b>{brlCentavos(total.saldo)}</b></span>
      </div>
      {passou && <p className="erro" role="alert">Nenhum item pode passar de 100% acumulado. Corrija para salvar.</p>}
      <div className="btns">
        <button className="btn primary" onClick={salvar} disabled={salvando || passou || !(valorBoletim > 0)}>{salvando ? 'Salvando…' : `Salvar medição nº ${numero}`}</button>
        <button className="btn ghost" onClick={onFechar}>Cancelar</button>
      </div>
    </section>
  )
}

export default function FichaContrato({ contrato: c, edita, onVoltar, onMudou }) {
  const [lancando, setLancando] = useState(false)
  const podeMedir = edita && c.status === ATIVO
  return (
    <div className="view larga">
      <button className="link" onClick={onVoltar}>Voltar para o fluxo dos contratos</button>
      <section className="card card-b">
        <div className="emp-ficha-cab">
          <div>
            <div className="emp-card-emp">{c.empreiteiro}</div>
            <h2 className="emp-ficha-t">{c.descricao}</h2>
            <div className="curto-marcas"><span className="pill soft">{c.tipo}</span><span className={`pill ${COR_STATUS_CONTRATO[c.status]}`}>{c.status}</span></div>
          </div>
          {podeMedir && !lancando && <button className="btn primary" onClick={() => setLancando(true)}>＋ Nova medição</button>}
        </div>
        <div className="emp-resumo">
          <div><div className="lbl">Valor total</div><div className="v">{brlCentavos(c.valor_total)}</div></div>
          <div><div className="lbl">Medido acumulado</div><div className="v">{brlCentavos(c.medido_valor)}</div><div className="obs">{pct(c.pct_medido)}</div></div>
          <div><div className="lbl">Saldo a medir</div><div className="v">{brlCentavos(Math.max(0, c.valor_total - c.medido_valor))}</div></div>
        </div>
        <Barra feito={Math.round(c.pct_medido * 100)} />
        {c.status !== ATIVO && <p className="obs" style={{ margin: '8px 0 0' }}>Só contrato "Aprovado / Ativo" recebe medição.</p>}
      </section>

      {lancando && <NovaMedicao contrato={c} onFechar={() => setLancando(false)} onSalvo={() => { setLancando(false); onMudou() }} />}

      {c.tipo !== GLOBAL && (
        <section className="card card-b">
          <div className="rotulo" style={{ marginBottom: 8 }}>Itens do contrato</div>
          <div className="emp-med-linhas">
            {c.itens.map((i) => {
              const medido = c.medido_por_item[i.id] ?? 0
              return (
                <div key={i.id} className="emp-item-resumo">
                  <div className="emp-med-item"><b><span className="cod">{i.codigo}</span> {i.descricao}</b>
                    <span className="obs">Contratado {qtd(i.quantidade, i.unidade)} × {brlCentavos(i.preco_unitario)}</span></div>
                  <div className="emp-item-nums">
                    <span>Medido <b>{qtd(medido, i.unidade)}</b></span>
                    <span>Saldo <b>{qtd(Math.max(0, i.quantidade - medido), i.unidade)}</b></span>
                    <span><b>{pct(i.quantidade ? medido / i.quantidade : 0)}</b></span>
                  </div>
                  <Barra feito={Math.round((i.quantidade ? medido / i.quantidade : 0) * 100)} />
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="card card-b">
        <div className="rotulo" style={{ marginBottom: 8 }}>Histórico de boletins</div>
        {c.boletins.length ? (
          <ul className="emp-historico">
            {c.boletins.map((b) => (
              <li key={b.id}><b>Medição nº {b.numero}</b><span>{dmy(b.data)}</span><b>{brlCentavos(b.valor)}</b></li>
            ))}
          </ul>
        ) : (
          <p className="obs" style={{ margin: 0 }}>Nenhum boletim ainda.{podeMedir ? ' Clique em "＋ Nova medição" para lançar o primeiro.' : ''}</p>
        )}
      </section>
    </div>
  )
}
