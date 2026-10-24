// Comprime uma foto no navegador antes de ela entrar no diário.
// Sempre regrava em JPEG e tenta da melhor qualidade para a menor até caber
// no limite (as tentativas e o limite estão em lib/fotos.js). Se receber um
// bloco EXIF (data, hora, GPS), ele vai dentro da foto comprimida e conta no limite.
import { LIMITE_FOTO_BYTES, LIMITE_FOTO_TEXTO, TENTATIVAS_COMPRESSAO, dimensoesPara } from '../lib/fotos.js'
import { inserirExif } from '../lib/exif.js'

async function abrirImagem(arquivo) {
  // createImageBitmap já desvira a foto tirada com o celular de lado.
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(arquivo, { imageOrientation: 'from-image' }) } catch (_) { /* tenta pelo <img> */ }
  }
  const url = URL.createObjectURL(arquivo)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

const paraBlob = (canvas, qualidade) => new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', qualidade))

export async function comprimirFoto(arquivo, blocoExif) {
  let imagem
  try {
    imagem = await abrirImagem(arquivo)
  } catch (_) {
    throw new Error('Não deu para ler esta foto. Tire a foto pela câmera ou envie em JPG ou PNG.')
  }
  try {
    for (const t of TENTATIVAS_COMPRESSAO) {
      const { largura, altura } = dimensoesPara(imagem.width, imagem.height, t.lado)
      const canvas = document.createElement('canvas')
      canvas.width = largura
      canvas.height = altura
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff' // PNG com transparência vira fundo branco, não preto
      ctx.fillRect(0, 0, largura, altura)
      ctx.drawImage(imagem, 0, 0, largura, altura)
      let blob = await paraBlob(canvas, t.qualidade)
      if (blob && blocoExif) {
        blob = new Blob([inserirExif(new Uint8Array(await blob.arrayBuffer()), blocoExif)], { type: 'image/jpeg' })
      }
      if (blob && blob.size <= LIMITE_FOTO_BYTES) return { blob, largura, altura }
    }
  } finally {
    imagem.close?.()
  }
  throw new Error(`Esta foto não coube em ${LIMITE_FOTO_TEXTO} nem com a compressão máxima. Tente outra foto.`)
}
