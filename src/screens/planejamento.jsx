// Planejamento (Last Planner) em 4 abas: EAP, Longo, Médio e Curto prazo.
// REGRA DE OURO: as 4 abas usam a MESMA lista — os itens do Orçamento, os mesmos
// do Painel e do Diário. Os dados são carregados aqui, uma vez, e
// qualquer mudança recarrega para todas as abas.
import { useState } from 'react'
import { buscarCalendario, juntar, listarGrupos, listarLancamentos, listarResponsaveis, listarRestricoes, listarSemanaAtividades, listarServicos, listarSubtarefas } from '../lib/dados.js'
import { vePlanejamento } from '../lib/perfis.js'
import { Carregando, ErroCarga, Faixa, Vazio, useDados } from '../components/index.jsx'
import AbaEap from './planejamentoEap.jsx'
import AbaLongo from './planejamentoLongo.jsx'
import AbaMedio from './planejamentoMedio.jsx'
import AbaCurto from './planejamentoCurto.jsx'

const ABAS = [
  ['eap', 'EAP'],
  ['longo', 'Longo prazo'],
  ['medio', 'Médio prazo'],
  ['curto', 'Curto prazo'],
]

const carregar = () => juntar({
  servicos: listarServicos(), lancamentos: listarLancamentos(), grupos: listarGrupos(), responsaveis: listarResponsaveis(), calendario: buscarCalendario(), restricoes: listarRestricoes(),
  semanaAtividades: listarSemanaAtividades(), subtarefas: listarSubtarefas(),
})

export default function Planejamento({ profile, goto }) {
  const { data, erro, carregando, recarregar } = useDados(carregar)
  const [aba, setAba] = useState('eap')

  if (!vePlanejamento(profile.role)) {
    return <div className="view"><Vazio titulo="Planejamento é da equipe da obra" texto="Seu perfil acompanha o avanço pela tela de avanço da fiscalização." /></div>
  }

  return (
    <>
      <Faixa>
        <div className="tabs" role="tablist" aria-label="Horizontes do planejamento">
          {ABAS.map(([id, rotulo]) => (
            <button key={id} role="tab" className="tab" aria-selected={aba === id} onClick={() => setAba(id)}>{rotulo}</button>
          ))}
        </div>
      </Faixa>
      {carregando ? <Carregando />
        : erro ? <ErroCarga erro={erro} onTentar={recarregar} />
          : aba === 'eap' ? <AbaEap profile={profile} dados={data} onMudou={recarregar} goto={goto} />
            : aba === 'longo' ? <AbaLongo dados={data} onIrParaEap={() => setAba('eap')} />
            : aba === 'medio' ? <AbaMedio profile={profile} dados={data} onMudou={recarregar} />
            : <AbaCurto profile={profile} dados={data} onMudou={recarregar} />}
    </>
  )
}
