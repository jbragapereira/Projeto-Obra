import { useObra } from '../lib/ObraContext.jsx'
import { veTodasAsObras } from '../lib/perfis.js'
import { Faixa, Icon, Meta } from '../components/index.jsx'

export default function Perfil({ profile, onSair }) {
  const { obras } = useObra()
  return (
    <>
      <Faixa><div className="faixa-titulo">Meu perfil</div></Faixa>
      <div className="view">
        <section className="card card-b">
          <div style={{ fontSize: 22, fontWeight: 700 }}>{profile.nome}</div>
          <div style={{ color: 'var(--slate)' }}>{profile.email}</div>
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span className="pill dark">{profile.role}</span>
            {profile.cargo && <span className="pill soft">{profile.cargo}</span>}
          </div>
        </section>
        <section className="card">
          <div className="card-h"><span className="rotulo">{veTodasAsObras(profile.role) ? 'Todas as obras da empresa' : 'Minhas obras'}</span></div>
          <ul className="rows">
            {(obras ?? []).map((o) => (
              <li key={o.id}><div className="row"><div className="main-c"><div className="t">{o.nome}</div><Meta><span className="cod">{o.codigo}</span>{o.situacao}</Meta></div></div></li>
            ))}
          </ul>
        </section>
        <button className="btn block" onClick={onSair}><Icon nome="sair" /> Sair</button>
      </div>
    </>
  )
}
