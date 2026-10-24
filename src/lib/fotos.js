// Regras das fotos do diário. Toda foto é comprimida no aparelho antes de
// ser guardada e nunca passa de 5 MB, e leva data, hora, GPS e endereço
// (a fiscalização exige). A parte de navegador (canvas, câmera, GPS) mora em
// src/components/; aqui fica só a regra, que tem teste.
import { tamanhoArquivo } from './formato.js'

// 5 MB no sentido mais estrito (5.000.000 bytes): cabe em qualquer leitura de "5 MB".
export const LIMITE_FOTO_BYTES = 5 * 1000 * 1000
export const LIMITE_FOTO_TEXTO = tamanhoArquivo(LIMITE_FOTO_BYTES)

// Tentativas em ordem, da melhor qualidade para a menor. A primeira que
// couber no limite é a usada: foto de obra é prova de execução, então só
// perde qualidade o que for preciso.
export const TENTATIVAS_COMPRESSAO = [
  { lado: 4096, qualidade: 0.85 },
  { lado: 4096, qualidade: 0.75 },
  { lado: 3072, qualidade: 0.75 },
  { lado: 2560, qualidade: 0.7 },
  { lado: 2048, qualidade: 0.65 },
  { lado: 1600, qualidade: 0.6 },
  { lado: 1280, qualidade: 0.55 },
]

export const cabeNoLimite = (bytes) => typeof bytes === 'number' && bytes > 0 && bytes <= LIMITE_FOTO_BYTES

// Tamanho final para que o maior lado não passe de `lado`. Nunca aumenta a foto.
export function dimensoesPara(largura, altura, lado) {
  const escala = Math.min(1, lado / Math.max(largura, altura))
  return { largura: Math.max(1, Math.round(largura * escala)), altura: Math.max(1, Math.round(altura * escala)) }
}

/* ── Data, hora, GPS e endereço ── */

// Texto idêntico ao CHECK de fotos.gps_origem e fotos.tirada_em_origem.
export const ORIGENS_GPS = { foto: 'GPS da foto', aparelho: 'GPS do aparelho' }
export const ORIGENS_DATA = { foto: 'Data da foto', arquivo: 'Data do arquivo' }

export const coordenadaValida = (lat, lon) =>
  Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0)

// Uma foto "tirada agora" pela câmera do app só conta se o arquivo também é
// de agora — protege contra o computador, onde o botão da câmera abre arquivos.
const MINUTOS_FOTO_RECENTE = 15
const minutosEntre = (a, b) => Math.abs(new Date(a) - new Date(b)) / 60000

export function quandoFoiTirada({ dataHoraExif, dataHoraArquivo }) {
  if (dataHoraExif) return { tirada_em: dataHoraExif, tirada_em_origem: ORIGENS_DATA.foto }
  if (dataHoraArquivo) return { tirada_em: dataHoraArquivo, tirada_em_origem: ORIGENS_DATA.arquivo }
  return { tirada_em: null, tirada_em_origem: null }
}

// O GPS do aparelho só vale para foto tirada AGORA pela câmera do app.
// Foto da galeria fica só com o GPS que ela mesma trouxer: uma foto
// baixada do WhatsApp nunca pode ganhar o local de onde a pessoa está.
export function usaGpsDoAparelho({ pelaCamera, gpsDaFoto, dataHoraArquivo, agora }) {
  return !!pelaCamera && !gpsDaFoto && !!dataHoraArquivo && minutosEntre(dataHoraArquivo, agora) <= MINUTOS_FOTO_RECENTE
}

export function escolherLocal({ gpsDaFoto, gpsDoAparelho }) {
  if (gpsDaFoto) return { gps_lat: gpsDaFoto.lat, gps_lon: gpsDaFoto.lon, gps_origem: ORIGENS_GPS.foto }
  if (gpsDoAparelho) return { gps_lat: gpsDoAparelho.lat, gps_lon: gpsDoAparelho.lon, gps_origem: ORIGENS_GPS.aparelho }
  return { gps_lat: null, gps_lon: null, gps_origem: null }
}

// Que dados gravar DENTRO do arquivo comprimido:
// - a foto trouxe GPS: devolve o EXIF dela mesma (com data, câmera etc.);
// - senão, se há data ou GPS (do aparelho), monta um EXIF novo com eles;
// - senão, nada.
export function oQueGravarNoArquivo({ exifOriginal, tirada_em, gps_lat, gps_lon, gps_origem }) {
  if (exifOriginal?.gps) return { manter: 'original' }
  if (tirada_em || gps_origem) {
    return { manter: 'novo', dataHora: tirada_em, gps: gps_origem ? { lat: gps_lat, lon: gps_lon } : null }
  }
  return { manter: 'nada' }
}

// Endereço curto a partir da resposta do mapa (OpenStreetMap):
// "Rua das Acácias, 120, Jordão, Recife - PE"
export function montarEndereco(a) {
  if (!a) return null
  const rua = [a.road ?? a.pedestrian ?? a.footway, a.house_number].filter(Boolean).join(', ')
  const bairro = a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district
  const cidade = a.city ?? a.town ?? a.village ?? a.municipality
  const uf = a['ISO3166-2-lvl4']?.split('-')[1]
  const partes = [rua, bairro, cidade && uf ? `${cidade} - ${uf}` : cidade].filter(Boolean)
  return partes.length ? partes.join(', ') : null
}
