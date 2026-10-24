// Prepara uma foto para o diário, na ordem certa:
// 1. lê data, hora e GPS gravados pela câmera (EXIF);
// 2. decide se o GPS do aparelho pode ser usado (só foto tirada agora pela câmera do app);
// 3. decide o que gravar dentro do arquivo e comprime até caber no limite.
// As decisões vêm de lib/fotos.js; aqui só o que depende do navegador.
import { blocoExifSemGiro, lerExif, montarExif } from '../lib/exif.js'
import { escolherLocal, oQueGravarNoArquivo, quandoFoiTirada, usaGpsDoAparelho } from '../lib/fotos.js'
import { dataHoraLocal } from '../lib/datas.js'
import { comprimirFoto } from './comprimirFoto.js'
import { gpsDoAparelho } from './localizacao.js'

export async function prepararFoto(arquivo, { pelaCamera }) {
  const original = new Uint8Array(await arquivo.arrayBuffer())
  const exif = lerExif(original)
  const dataHoraArquivo = arquivo.lastModified ? dataHoraLocal(new Date(arquivo.lastModified)) : null
  const quando = quandoFoiTirada({ dataHoraExif: exif?.dataHora ?? null, dataHoraArquivo })
  const pedirGps = usaGpsDoAparelho({ pelaCamera, gpsDaFoto: exif?.gps ?? null, dataHoraArquivo, agora: dataHoraLocal(new Date()) })
  const local = escolherLocal({ gpsDaFoto: exif?.gps ?? null, gpsDoAparelho: pedirGps ? await gpsDoAparelho() : null })

  const plano = oQueGravarNoArquivo({ exifOriginal: exif, ...quando, ...local })
  const bloco = plano.manter === 'original' ? blocoExifSemGiro(original, exif)
    : plano.manter === 'novo' ? montarExif(plano)
      : null
  const { blob, largura, altura } = await comprimirFoto(arquivo, bloco)
  return { blob, tamanhoOriginal: arquivo.size, dados: { tamanho_bytes: blob.size, largura, altura, ...quando, ...local } }
}
