// A obra atual do app: a lista das obras que a pessoa pode ver, a escolhida,
// e a troca. A escolha fica guardada neste aparelho, por pessoa: fechou e
// abriu o app, ele volta na mesma obra.
import { createContext, useContext, useEffect, useState } from 'react'
import { definirObraAtual, listarMinhasObras } from './dados.js'

const ObraCtx = createContext(null)

const lerGuardada = (chave) => {
  try { return localStorage.getItem(chave) } catch (_) { return null }
}
const guardar = (chave, valor) => {
  try { localStorage.setItem(chave, valor) } catch (_) { /* aba anônima: segue sem guardar */ }
}

export function ObraProvider({ profile, children }) {
  const chave = `projeto-obra:obra:${profile.id}`
  const [obras, setObras] = useState(null)
  const [obraId, setObraId] = useState(null)
  const [erro, setErro] = useState(null)

  function trocarObra(id) {
    // A camada de dados precisa saber ANTES de a tela nova montar.
    definirObraAtual(id)
    setObraId(id)
    if (id) guardar(chave, id)
  }

  async function carregar(preferida) {
    const r = await listarMinhasObras()
    if (r.erro) { setErro(r.erro); return }
    setObras(r.data)
    const desejada = preferida ?? lerGuardada(chave)
    const escolhida = r.data.find((o) => o.id === desejada)
      ?? r.data.find((o) => o.situacao === 'Em andamento')
      ?? r.data[0]
    trocarObra(escolhida?.id ?? null)
  }

  useEffect(() => { carregar() }, [])

  const obra = obras?.find((o) => o.id === obraId) ?? null
  return (
    <ObraCtx.Provider value={{ obras, obra, obraId, erro, trocarObra, recarregarObras: carregar }}>
      {children}
    </ObraCtx.Provider>
  )
}

export const useObra = () => useContext(ObraCtx)
