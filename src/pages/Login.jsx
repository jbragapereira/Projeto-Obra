// Login de exemplo: até o banco existir, escolhe-se com quem entrar.
// Na etapa do banco vira e-mail + senha (supabase.auth), pela camada de dados.
import { useEffect, useState } from 'react'
import { usuariosDeExemplo } from '../lib/dados.js'
import { Icon } from '../components/index.jsx'

export default function Login({ onEntrar }) {
  const [pessoas, setPessoas] = useState([])
  useEffect(() => { usuariosDeExemplo().then((r) => setPessoas(r.data ?? [])) }, [])

  return (
    <div className="login">
      <header className="login-top">
        <div className="b1">Projeto Obra</div>
        <div className="b2">Acompanhamento de obras</div>
      </header>
      <main className="view">
        <section className="card card-b">
          <h1 style={{ fontSize: 20 }}>Entrar como…</h1>
          <p style={{ color: 'var(--slate)', marginTop: 4 }}>
            Por enquanto o login é de exemplo: escolha uma pessoa para ver o app com o perfil dela.
            O login com e-mail e senha chega quando ligarmos o banco.
          </p>
        </section>
        <section className="card">
          <ul className="rows">
            {pessoas.map((p) => (
              <li key={p.id}>
                <button className="row" onClick={() => onEntrar(p.id)}>
                  <span style={{ color: 'var(--brand-d)', marginTop: 2 }}><Icon nome="perfil" /></span>
                  <span className="main-c">
                    <span className="t" style={{ display: 'block' }}>{p.nome}</span>
                    <span className="m" style={{ display: 'block' }}>{p.cargo ? `${p.role}, ${p.cargo.toLowerCase()}` : p.role}</span>
                  </span>
                  <span className="pill soft">Entrar</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
