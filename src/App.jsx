// Checa quem entrou e mostra a casca certa.
// Até o banco existir, o login é de exemplo: escolhe-se uma pessoa da lista.
import { useEffect, useState } from 'react'
import { entrar, sair } from './lib/dados.js'
import { ObraProvider } from './lib/ObraContext.jsx'
import { Avisos, avisar } from './components/index.jsx'
import Login from './pages/Login.jsx'
import Aguardando from './pages/Aguardando.jsx'
import Shell from './pages/Shell.jsx'

const CHAVE_SESSAO = 'projeto-obra:sessao'
const lerSessao = () => { try { return localStorage.getItem(CHAVE_SESSAO) } catch (_) { return null } }
const gravarSessao = (id) => {
  try { if (id) localStorage.setItem(CHAVE_SESSAO, id); else localStorage.removeItem(CHAVE_SESSAO) } catch (_) { /* segue */ }
}

export default function App() {
  const [profile, setProfile] = useState(null)
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    const id = lerSessao()
    if (!id) { setPronto(true); return }
    entrar(id).then((r) => {
      if (!r.erro) setProfile(r.data)
      setPronto(true)
    })
  }, [])

  async function onEntrar(id) {
    const r = await entrar(id)
    if (r.erro) { avisar(r.erro); return }
    gravarSessao(id)
    setProfile(r.data)
  }

  function onSair() {
    sair()
    gravarSessao(null)
    setProfile(null)
  }

  let tela
  if (!pronto) tela = null
  else if (!profile) tela = <Login onEntrar={onEntrar} />
  else if (profile.role === 'Aguardando liberação') tela = <Aguardando profile={profile} onSair={onSair} />
  else tela = (
    <ObraProvider key={profile.id} profile={profile}>
      <Shell profile={profile} onSair={onSair} />
    </ObraProvider>
  )

  return <>{tela}<Avisos /></>
}
