// Data, hora e GPS da foto (src/lib/exif.js e as regras em src/lib/fotos.js).
// Monta uma foto JPEG de mentira com o bloco EXIF que a câmera grava.
import { lerExif, blocoExifSemGiro, inserirExif, montarExif } from '../src/lib/exif.js'
import { coordenadaValida, escolherLocal, quandoFoiTirada, montarEndereco, usaGpsDoAparelho, oQueGravarNoArquivo } from '../src/lib/fotos.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

// Foto com: orientação 6 (celular de lado), data 24/10/2026 10:31:05,
// GPS 8°2'51,36" S e 34°52'37,2" O (Recife).
function fotoComExif(le) {
  const t = new DataView(new ArrayBuffer(190))
  const u16 = (o, v) => t.setUint16(o, v, le)
  const u32 = (o, v) => t.setUint32(o, v, le)
  const txt = (o, s) => [...s].forEach((c, i) => t.setUint8(o + i, c.charCodeAt(0)))
  txt(0, le ? 'II' : 'MM'); u16(2, 42); u32(4, 8)
  const entrada = (o, tag, tipo, n, valor) => { u16(o, tag); u16(o + 2, tipo); u32(o + 4, n); valor(o + 8) }
  // IFD0 em 8
  u16(8, 3)
  entrada(10, 0x0112, 3, 1, (o) => u16(o, 6))
  entrada(22, 0x8769, 4, 1, (o) => u32(o, 50))
  entrada(34, 0x8825, 4, 1, (o) => u32(o, 88))
  u32(46, 0)
  // Exif IFD em 50, data em 68
  u16(50, 1)
  entrada(52, 0x9003, 2, 20, (o) => u32(o, 68))
  u32(64, 0)
  txt(68, '2026:10:24 10:31:05\0')
  // GPS IFD em 88, latitude em 142, longitude em 166
  u16(88, 4)
  entrada(90, 1, 2, 2, (o) => txt(o, 'S\0'))
  entrada(102, 2, 5, 3, (o) => u32(o, 142))
  entrada(114, 3, 2, 2, (o) => txt(o, 'W\0'))
  entrada(126, 4, 5, 3, (o) => u32(o, 166))
  u32(138, 0)
  const racional = (o, num, den) => { u32(o, num); u32(o + 4, den) }
  racional(142, 8, 1); racional(150, 2, 1); racional(158, 5136, 100)
  racional(166, 34, 1); racional(174, 52, 1); racional(182, 372, 10)
  const tiff = new Uint8Array(t.buffer)
  const tam = 2 + 6 + tiff.length
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, tam >> 8, tam & 0xff, ...[...'Exif\0\0'].map((c) => c.charCodeAt(0)), ...tiff, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9])
}

for (const le of [true, false]) {
  const nome = le ? 'little-endian' : 'big-endian'
  const exif = lerExif(fotoComExif(le))
  conferir(`${nome}: data e hora da câmera`, exif.dataHora, '2026-10-24T10:31:05')
  conferir(`${nome}: GPS no hemisfério sul e oeste`, exif.gps, { lat: -8.0476, lon: -34.877 })
  conferir(`${nome}: orientação`, exif.orientacao, 6)

  // A foto comprimida (JPEG novo, com bloco JFIF) recebe o EXIF de volta, sem giro.
  const jpegNovo = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9])
  const comExif = inserirExif(jpegNovo, blocoExifSemGiro(fotoComExif(le), exif))
  const relido = lerExif(comExif)
  conferir(`${nome}: a foto comprimida guarda data e GPS`, [relido.dataHora, relido.gps], ['2026-10-24T10:31:05', { lat: -8.0476, lon: -34.877 }])
  conferir(`${nome}: a orientação vira normal (a foto já sai desvirada)`, relido.orientacao, 1)
  conferir(`${nome}: o EXIF fica logo depois do início do JPEG`, [comExif[2], comExif[3]], [0xff, 0xe1])
  conferir(`${nome}: a imagem nova continua inteira no fim`, [...comExif.slice(-4)], [0xff, 0xda, 0x00, 0x02, 0xff, 0xd9].slice(-4))
}

conferir('JPEG sem EXIF: nada', lerExif(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2, 0xff, 0xd9])), null)
conferir('arquivo que não é JPEG: nada', lerExif(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), null)
conferir('coordenada 0,0 não vale (câmera sem sinal)', coordenadaValida(0, 0), false)
conferir('latitude fora do mundo não vale', coordenadaValida(95, 10), false)

// De onde vem a data
conferir('data da câmera tem preferência', quandoFoiTirada({ dataHoraExif: '2026-10-24T10:31:05', dataHoraArquivo: '2026-10-24T11:00:00' }), { tirada_em: '2026-10-24T10:31:05', tirada_em_origem: 'Data da foto' })
conferir('sem data da câmera, usa a do arquivo', quandoFoiTirada({ dataHoraExif: null, dataHoraArquivo: '2026-10-24T11:00:00' }).tirada_em_origem, 'Data do arquivo')

// Quando o GPS do aparelho pode ser usado
const agora = '2026-10-24T11:00:00'
conferir('foto tirada agora pela câmera, sem GPS: usa o do aparelho', usaGpsDoAparelho({ pelaCamera: true, gpsDaFoto: null, dataHoraArquivo: '2026-10-24T10:58:00', agora }), true)
conferir('foto da galeria NUNCA usa o GPS do aparelho, mesmo baixada agora (WhatsApp)', usaGpsDoAparelho({ pelaCamera: false, gpsDaFoto: null, dataHoraArquivo: '2026-10-24T10:59:00', agora }), false)
conferir('botão da câmera com arquivo antigo (computador): não usa', usaGpsDoAparelho({ pelaCamera: true, gpsDaFoto: null, dataHoraArquivo: '2026-10-20T09:00:00', agora }), false)
conferir('foto que já tem GPS não pede o do aparelho', usaGpsDoAparelho({ pelaCamera: true, gpsDaFoto: { lat: -8, lon: -34 }, dataHoraArquivo: agora, agora }), false)

// De onde vem o GPS
conferir('GPS da foto tem preferência', escolherLocal({ gpsDaFoto: { lat: -8, lon: -34 }, gpsDoAparelho: { lat: -9, lon: -35 } }).gps_origem, 'GPS da foto')
conferir('sem GPS na foto, usa o do aparelho quando houver', escolherLocal({ gpsDaFoto: null, gpsDoAparelho: { lat: -9, lon: -35 } }), { gps_lat: -9, gps_lon: -35, gps_origem: 'GPS do aparelho' })
conferir('sem nenhum GPS, fica sem', escolherLocal({ gpsDaFoto: null, gpsDoAparelho: null }).gps_lat, null)

// O que vai dentro do arquivo
conferir('foto com GPS próprio: mantém o EXIF dela', oQueGravarNoArquivo({ exifOriginal: { gps: { lat: -8, lon: -34 } }, tirada_em: agora, gps_origem: 'GPS da foto', gps_lat: -8, gps_lon: -34 }).manter, 'original')
conferir('GPS do aparelho: monta EXIF novo com data e GPS', oQueGravarNoArquivo({ exifOriginal: null, tirada_em: agora, tirada_em_origem: 'Data do arquivo', gps_lat: -9, gps_lon: -35, gps_origem: 'GPS do aparelho' }), { manter: 'novo', dataHora: agora, gps: { lat: -9, lon: -35 } })
conferir('sem data nem GPS: nada a gravar', oQueGravarNoArquivo({ exifOriginal: null, tirada_em: null, gps_origem: null }).manter, 'nada')

// EXIF montado do zero (GPS do aparelho) é lido de volta igual
const jpegLimpo = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9])
const montado = lerExif(inserirExif(jpegLimpo, montarExif({ dataHora: '2026-10-24T10:58:12', gps: { lat: -8.047612, lon: -34.876954 } })))
const perto = (a, b) => Math.abs(a - b) < 2e-6
conferir('EXIF montado: data e hora', montado.dataHora, '2026-10-24T10:58:12')
conferir('EXIF montado: GPS (sul e oeste) com precisão de centímetros', perto(montado.gps.lat, -8.047612) && perto(montado.gps.lon, -34.876954), true)
conferir('EXIF montado: orientação normal', montado.orientacao, 1)
const norte = lerExif(inserirExif(jpegLimpo, montarExif({ dataHora: null, gps: { lat: 40.4168, lon: 3.7038 } })))
conferir('EXIF montado: hemisfério norte e leste, sem data', [norte.dataHora, perto(norte.gps.lat, 40.4168), perto(norte.gps.lon, 3.7038)], [null, true, true])

// Endereço
conferir('endereço curto a partir do mapa', montarEndereco({ road: 'Rua das Acácias', house_number: '120', suburb: 'Jordão', city: 'Recife', 'ISO3166-2-lvl4': 'BR-PE' }), 'Rua das Acácias, 120, Jordão, Recife - PE')
conferir('sem rua, fica bairro e cidade', montarEndereco({ neighbourhood: 'Jordão Alto', city: 'Recife' }), 'Jordão Alto, Recife')
conferir('resposta vazia: sem endereço', montarEndereco({}), null)

console.log(`${ok}/${tot} — data, hora, GPS e endereço das fotos`)
process.exit(ok === tot ? 0 : 1)
