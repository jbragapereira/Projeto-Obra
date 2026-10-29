// Campo de uma foto com prévia local: abre a câmera no celular (capture="environment"), comprime até 5 MB
// (comprimirFoto) e devolve { url_previa, tamanho_bytes, largura, altura } — sem upload por enquanto.
// Quem usa libera a prévia (URL.revokeObjectURL) quando descarta a foto sem salvar.
import { useState } from 'react'
import { comprimirFoto } from './comprimirFoto.js'
import { tamanhoArquivo } from '../lib/formato.js'
import { Icon, avisar } from './index.jsx'

export default function CampoFoto({ rotulo, foto, onFoto, obrigatoria = false, erro }) {
  const [comprimindo, setComprimindo] = useState(false)
  async function escolher(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setComprimindo(true)
    try {
      const { blob, largura, altura } = await comprimirFoto(arquivo)
      if (foto?.url_previa) URL.revokeObjectURL(foto.url_previa)
      onFoto({ url_previa: URL.createObjectURL(blob), tamanho_bytes: blob.size, largura, altura })
    } catch (falhou) {
      avisar(falhou.message)
    }
    setComprimindo(false)
  }
  return (
    <div className="field campo-foto" style={{ flexBasis: '100%' }}>
      <span>{rotulo}{obrigatoria ? '' : ' (opcional)'}</span>
      {foto?.url_previa && <img className="campo-foto-previa" src={foto.url_previa} alt={rotulo} />}
      <label className={`btn ${foto ? 'ghost' : ''}`} style={{ alignSelf: 'flex-start' }} aria-busy={comprimindo}>
        <Icon nome="camera" tamanho={20} />
        {comprimindo ? 'Preparando a foto…' : foto ? 'Trocar a foto' : 'Tirar ou escolher foto'}
        <input type="file" accept="image/*" capture="environment" hidden onChange={escolher} disabled={comprimindo} />
      </label>
      {foto && <span className="obs" style={{ fontSize: 13 }}>Foto comprimida: {tamanhoArquivo(foto.tamanho_bytes)}</span>}
      {erro && <span className="erro">{erro}</span>}
    </div>
  )
}
