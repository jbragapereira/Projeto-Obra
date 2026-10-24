import { Icon } from '../components/index.jsx'

export default function Aguardando({ profile, onSair }) {
  return (
    <div className="login">
      <header className="login-top">
        <div className="b1">Projeto Obra</div>
        <div className="b2">Acompanhamento de obras</div>
      </header>
      <main className="view">
        <section className="card empty">
          <div className="ico"><Icon nome="perfil" tamanho={40} /></div>
          <h2>Conta aguardando liberação</h2>
          <p>
            Olá, {profile.nome}. Sua conta foi criada, mas o engenheiro responsável ainda precisa
            liberar o seu acesso e escolher as suas obras. Assim que ele liberar, elas aparecem aqui.
          </p>
          <button className="btn" onClick={onSair}><Icon nome="sair" /> Sair</button>
        </section>
      </main>
    </div>
  )
}
