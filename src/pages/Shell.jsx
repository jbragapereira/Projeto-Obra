// A casca do app para todos os perfis: menu lateral (tela larga), barra
// inferior (celular), cabeçalho com o SELETOR DE OBRA e a tela atual.
// O menu de cada perfil vem de lib/perfis.js. O botão "Topo" mora aqui: vale para todo menu,
// inclusive os que ainda vão ser criados.
//
// Trocar de obra remonta a tela inteira (key={obraId}): nada da obra
// anterior sobra na tela — lista, filtro, gaveta ou formulário pela metade.
import { Suspense, lazy, useState } from 'react'
import { useObra } from '../lib/ObraContext.jsx'
import { MENUS, dividirMenu, telaInicial } from '../lib/perfis.js'
import { dmy } from '../lib/datas.js'
import { Carregando, ErroCarga, Icon, Meta, Sheet, Vazio, VoltarAoTopo } from '../components/index.jsx'
import Painel from '../screens/painel.jsx'
import Diario from '../screens/diario.jsx'
import Medicao from '../screens/medicao.jsx'
import Recados from '../screens/recados.jsx'
import Ajustes from '../screens/ajustes.jsx'
import Perfil from '../screens/perfil.jsx'
import Avanco from '../screens/avanco.jsx'
import Fotos from '../screens/fotos.jsx'
// As telas maiores carregam só quando são abertas (o app abre mais rápido no celular).
const Orcamento = lazy(() => import('../screens/orcamento.jsx'))
const Planejamento = lazy(() => import('../screens/planejamento.jsx'))
const Empreiteiros = lazy(() => import('../screens/empreiteiros.jsx'))
const Qualidade = lazy(() => import('../screens/qualidade.jsx'))
const Materiais = lazy(() => import('../screens/materiais.jsx'))
const Relatorios = lazy(() => import('../screens/relatorios.jsx'))
const Cadastro = lazy(() => import('../screens/cadastro.jsx'))

const TELAS = { painel: Painel, diario: Diario, orcamento: Orcamento, medicao: Medicao, recados: Recados, ajustes: Ajustes, perfil: Perfil, avanco: Avanco, fotos: Fotos, planejamento: Planejamento, empreiteiros: Empreiteiros, cadastro: Cadastro, materiais: Materiais, qualidade: Qualidade, relatorios: Relatorios }

export default function Shell({ profile, onSair }) {
  const { obras, obra, obraId, erro, trocarObra } = useObra()
  const [rota, setRota] = useState({ tela: telaInicial(profile.role), params: {} })
  const [folha, setFolha] = useState(null) // 'obras' | 'mais' | null

  const goto = (tela, params = {}) => {
    setRota({ tela, params })
    setFolha(null)
    window.scrollTo(0, 0)
  }

  if (erro) return <ErroCarga erro={erro} />
  if (!obras) return <Carregando />

  const menu = MENUS[profile.role] ?? []
  const { barra, mais } = dividirMenu(menu)
  const semObra = !obra
  // Engenheiro sem nenhuma obra vai direto para Ajustes, para cadastrar a primeira.
  const telaAtual = semObra && profile.role === 'Engenheiro' ? 'ajustes' : rota.tela
  const Tela = TELAS[telaAtual] ?? Painel

  return (
    <div className="app">
      <aside className="side" aria-label="Menu">
        <div className="brandmark">
          <div className="b1">Projeto Obra</div>
          <div className="b2">Acompanhamento de obras</div>
        </div>
        <nav>
          {menu.map((m) => (
            <button key={m.id} className={m.secundario ? 'secundario' : undefined} onClick={() => goto(m.id)} aria-current={telaAtual === m.id ? 'page' : undefined}>
              <Icon nome={m.icone} /><span>{m.rotulo}</span>{m.fase2 && <span className="f2">F2</span>}
            </button>
          ))}
        </nav>
        <button className="who" onClick={() => goto('perfil')}>
          <div className="rotulo">{profile.cargo || profile.role}</div>
          <div>{profile.nome}</div>
        </button>
      </aside>

      <div className="main">
        <header className="top">
          {obra ? (
            <div className="top-row">
              <div className="obra-badge" aria-hidden="true">{obra.codigo.slice(0, 2).toUpperCase()}</div>
              <div style={{ minWidth: 0 }}>
                <div className="obra-name">{obra.nome}</div>
                <div className="obra-sub">
                  <span className="cod">{obra.codigo}</span>
                  <span>Entrega {dmy(obra.data_entrega)}</span>
                  <span>{obra.situacao}</span>
                </div>
              </div>
              {obras.length > 1 && (
                <button className="trocar" onClick={() => setFolha('obras')} aria-haspopup="dialog">
                  <Icon nome="trocar" tamanho={18} /><span>Trocar obra</span>
                </button>
              )}
            </div>
          ) : (
            <div className="top-row"><div className="obra-name">Nenhuma obra ainda</div></div>
          )}
        </header>

        {semObra && profile.role !== 'Engenheiro' ? (
          <div className="view">
            <Vazio icone="obra" titulo="Você ainda não está em nenhuma obra"
              texto="Peça ao engenheiro responsável para incluir você numa obra. Assim que ele fizer isso, ela aparece aqui." />
          </div>
        ) : (
          <Suspense fallback={<Carregando />}>
            <Tela key={obraId ?? 'sem-obra'} profile={profile} obra={obra} goto={goto} params={rota.params} onSair={onSair} />
          </Suspense>
        )}
      </div>

      <VoltarAoTopo />

      <nav className="bottom" aria-label="Navegação">
        {barra.map((m) => (
          <button key={m.id} onClick={() => goto(m.id)} aria-current={telaAtual === m.id ? 'page' : undefined}>
            <Icon nome={m.icone} /><span>{m.curto}</span>
          </button>
        ))}
        {mais.length > 0 && (
          <button onClick={() => setFolha('mais')} aria-current={mais.some((m) => m.id === telaAtual) ? 'page' : undefined}>
            <Icon nome="mais" /><span>Mais</span>
          </button>
        )}
      </nav>

      {folha === 'obras' && (
        <Sheet titulo="Trocar de obra" subtitulo="Suas obras" onFechar={() => setFolha(null)}>
          {obras.map((o) => (
            <button key={o.id} className="opt" aria-current={o.id === obraId ? 'true' : undefined}
              onClick={() => { trocarObra(o.id); setFolha(null) }}>
              <span className="obra-badge" aria-hidden="true">{o.codigo.slice(0, 2).toUpperCase()}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="nome">{o.nome}</span>
                <Meta><span className="cod">{o.codigo}</span>{o.cliente}{`Entrega ${dmy(o.data_entrega)}`}{o.situacao}</Meta>
              </span>
              {o.id === obraId && <span style={{ color: 'var(--brand-d)' }}><Icon nome="check" /></span>}
            </button>
          ))}
        </Sheet>
      )}

      {folha === 'mais' && (
        <Sheet titulo="Mais" onFechar={() => setFolha(null)}>
          {[...mais, ...(menu.some((m) => m.id === 'perfil') ? [] : [{ id: 'perfil', rotulo: 'Meu perfil', icone: 'perfil' }])].map((m) => (
            <button key={m.id} className="opt" onClick={() => goto(m.id)}>
              <Icon nome={m.icone} />
              <span className="nome" style={{ flex: 1 }}>{m.rotulo}</span>
              {m.fase2 && <span className="pill soft">Fase 2</span>}
            </button>
          ))}
        </Sheet>
      )}
    </div>
  )
}
