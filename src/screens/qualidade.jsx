// Módulo Qualidade: três abas — Pendências (vistoria rápida), FVS (fichas de verificação e não conformidades)
// e Gemba Walk (desperdícios) — e o relatório para imprimir. Engenheiro e equipe registram; a diretoria vê.
// Os filtros das abas moram aqui: o relatório (botão no alto) imprime o que elas mostram.
import { useState } from 'react'
import { veQualidade } from '../lib/perfis.js'
import { SEM_FILTRO_GEMBA, SEM_FILTRO_PENDENCIAS } from '../lib/qualidade.js'
import { Faixa, Icon, Vazio } from '../components/index.jsx'
import Pendencias from './qualidadePendencias.jsx'
import Fvs from './qualidadeFvs.jsx'
import Gemba from './qualidadeGemba.jsx'
import Relatorio from './qualidadeRelatorio.jsx'

const ABAS = [
  { id: 'pendencias', rotulo: 'Pendências' },
  { id: 'fvs', rotulo: 'FVS' },
  { id: 'gemba', rotulo: 'Gemba Walk' },
]

export default function Qualidade({ profile, obra }) {
  const [aba, setAba] = useState('pendencias')
  const [filtroPendencias, setFiltroPendencias] = useState(SEM_FILTRO_PENDENCIAS)
  const [filtroGemba, setFiltroGemba] = useState(SEM_FILTRO_GEMBA)
  const [relatorio, setRelatorio] = useState(false)
  if (!veQualidade(profile.role)) {
    return <div className="view"><Vazio titulo="A qualidade é da equipe da obra" texto="Seu perfil acompanha a obra pelas suas próprias telas." /></div>
  }
  return (
    <>
      <Faixa>
        <div className="qual-topo">
          <div className="tabs" role="tablist" aria-label="Qualidade">
            {ABAS.map((a) => <button key={a.id} className="tab" role="tab" aria-selected={aba === a.id} onClick={() => setAba(a.id)}>{a.rotulo}</button>)}
          </div>
          <button className="qual-btn-relatorio" onClick={() => setRelatorio(true)}><Icon nome="planilha" tamanho={18} />Relatório</button>
        </div>
      </Faixa>
      {aba === 'pendencias' && <Pendencias profile={profile} filtro={filtroPendencias} setFiltro={setFiltroPendencias} />}
      {aba === 'fvs' && <Fvs profile={profile} />}
      {aba === 'gemba' && <Gemba profile={profile} filtro={filtroGemba} setFiltro={setFiltroGemba} />}
      {relatorio && <Relatorio obra={obra} filtroPendencias={filtroPendencias} filtroGemba={filtroGemba} onFechar={() => setRelatorio(false)} />}
    </>
  )
}
