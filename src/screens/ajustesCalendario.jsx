// Calendário de trabalho da obra escolhida (em Ajustes): dias da semana trabalhados e feriados.
// O previsto do cronograma e os dias úteis da EAP contam por ele.
import { useState } from 'react'
import { buscarCalendario, salvarCalendario } from '../lib/dados.js'
import { DIAS_DA_SEMANA, validarCalendario } from '../lib/calendario.js'
import { dmy } from '../lib/datas.js'
import { Carregando, ErroCarga, avisar, useDados } from '../components/index.jsx'

function Editor({ obra, inicial, onSalvo }) {
  const [dias, setDias] = useState(inicial.dias_semana)
  const [feriados, setFeriados] = useState(inicial.feriados)
  const [novo, setNovo] = useState({ data: '', nome: '' })
  const [salvando, setSalvando] = useState(false)
  const mudou = JSON.stringify(dias) !== JSON.stringify(inicial.dias_semana) || JSON.stringify(feriados) !== JSON.stringify(inicial.feriados)
  const alternarDia = (d) => setDias(dias.includes(d) ? dias.filter((x) => x !== d) : [...dias, d].sort())
  const incluir = () => {
    const lista = [...feriados, { data: novo.data, nome: novo.nome.trim() }].sort((a, b) => a.data.localeCompare(b.data))
    const erro = validarCalendario({ dias_semana: dias, feriados: lista }).feriados
    if (erro) { avisar(erro); return }
    setFeriados(lista)
    setNovo({ data: '', nome: '' })
  }
  async function salvar() {
    setSalvando(true)
    const r = await salvarCalendario({ dias_semana: dias, feriados })
    setSalvando(false)
    if (r.erro) { avisar(r.erro); return }
    avisar(`Calendário de ${obra.codigo} salvo.`)
    onSalvo()
  }
  const anos = [...new Set(feriados.map((f) => f.data.slice(0, 4)))]

  return (
    <section className="card card-b cal">
      <div className="sec-t" style={{ padding: '0 0 4px' }}>Calendário de trabalho: {obra.nome}</div>
      <p className="obs" style={{ margin: '0 0 12px', fontSize: 14 }}>O cronograma conta o previsto em dias úteis por este calendário.</p>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Dias de trabalho</div>
      <div className="chips">
        {DIAS_DA_SEMANA.map((rotulo, d) => <button key={d} className="chip" aria-pressed={dias.includes(d)} onClick={() => alternarDia(d)}>{rotulo}</button>)}
      </div>
      <div style={{ fontWeight: 600, margin: '16px 0 6px' }}>Feriados ({feriados.length})</div>
      {anos.map((ano) => (
        <div key={ano} className="cal-ano">
          <div className="rotulo">{ano}</div>
          <ul className="cal-feriados">
            {feriados.filter((f) => f.data.startsWith(ano)).map((f) => (
              <li key={f.data}>
                <span className="cal-data">{dmy(f.data)}</span><span className="cal-nome">{f.nome}</span>
                <button className="remover" aria-label={`Tirar o feriado ${f.nome} de ${dmy(f.data)}`} onClick={() => setFeriados(feriados.filter((x) => x.data !== f.data))}>✕</button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="form-grid" style={{ marginTop: 12, alignItems: 'flex-end' }}>
        <label className="field" style={{ flex: '0 1 180px' }}><span>Data</span>
          <input className="ipt" type="date" value={novo.data} onChange={(e) => setNovo({ ...novo, data: e.target.value })} />
        </label>
        <label className="field"><span>Nome do feriado</span>
          <input className="ipt" value={novo.nome} placeholder="Ex.: Nossa Senhora do Carmo (Recife)" onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') incluir() }} />
        </label>
        <button className="btn" style={{ flex: '0 0 auto' }} onClick={incluir}>＋ Incluir feriado</button>
      </div>
      <div className="btns" style={{ marginTop: 16 }}>
        <button className="btn primary" onClick={salvar} disabled={salvando || !mudou}>{salvando ? 'Salvando…' : 'Salvar calendário'}</button>
      </div>
    </section>
  )
}

export default function CalendarioDaObra({ obra }) {
  const { data, erro, carregando, recarregar } = useDados(buscarCalendario)
  if (carregando) return <Carregando />
  if (erro) return <ErroCarga erro={erro} onTentar={recarregar} />
  // key: depois de salvar, o editor recomeça com o que ficou gravado.
  return <Editor key={JSON.stringify(data)} obra={obra} inicial={data} onSalvo={recarregar} />
}
