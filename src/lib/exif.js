// Lê e preserva os metadados (EXIF) de uma foto JPEG: data e hora em que foi
// tirada, GPS e orientação. Regra pura, sem navegador: recebe e devolve bytes.
// A fiscalização precisa desses dados, e a compressão (canvas) apaga tudo; por
// isso o bloco EXIF original é lido aqui e devolvido para dentro da foto nova.

import { coordenadaValida } from './fotos.js'

const TAMANHO_TIPO = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }

const texto = (b, i, n) => String.fromCharCode(...b.subarray(i, i + n))

function lerTiff(b, base, tamanho) {
  const dv = new DataView(b.buffer, b.byteOffset + base, Math.min(tamanho, b.length - base))
  const le = dv.getUint16(0) === 0x4949 // "II" = little-endian
  const u16 = (o) => dv.getUint16(o, le)
  const u32 = (o) => dv.getUint32(o, le)
  if (u16(2) !== 42) return null

  // Uma "pasta" (IFD): devolve { tag: { tipo, n, valor } }, com `valor` = posição do dado.
  function ifd(pos) {
    const campos = {}
    const qtd = u16(pos)
    for (let i = 0; i < qtd; i++) {
      const e = pos + 2 + i * 12
      const tipo = u16(e + 2)
      const n = u32(e + 4)
      const bytes = (TAMANHO_TIPO[tipo] ?? 1) * n
      campos[u16(e)] = { tipo, n, valor: bytes <= 4 ? e + 8 : u32(e + 8) }
    }
    return campos
  }
  const ascii = (c) => (c ? texto(new Uint8Array(dv.buffer, dv.byteOffset + c.valor, c.n), 0, c.n).replace(/\0+$/, '').trim() : null)
  const racionais = (c) => (c ? Array.from({ length: c.n }, (_, i) => u32(c.valor + i * 8) / (u32(c.valor + i * 8 + 4) || 1)) : null)

  const r = { dataHora: null, gps: null, orientacao: 1, posOrientacao: null }
  try {
    const ifd0 = ifd(u32(4))
    if (ifd0[0x0112]) {
      r.orientacao = u16(ifd0[0x0112].valor)
      r.posOrientacao = base + ifd0[0x0112].valor
    }
    const exif = ifd0[0x8769] ? ifd(u32(ifd0[0x8769].valor)) : {}
    const bruto = ascii(exif[0x9003]) || ascii(ifd0[0x0132]) // DateTimeOriginal, senão DateTime
    const m = bruto && bruto.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
    if (m) r.dataHora = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`
    if (ifd0[0x8825]) {
      const g = ifd(u32(ifd0[0x8825].valor))
      const lat = racionais(g[2])
      const lon = racionais(g[4])
      if (lat?.length === 3 && lon?.length === 3) {
        const grau = ([d, mi, s]) => d + mi / 60 + s / 3600
        const la = grau(lat) * (ascii(g[1]) === 'S' ? -1 : 1)
        const lo = grau(lon) * (ascii(g[3]) === 'W' ? -1 : 1)
        if (coordenadaValida(la, lo)) r.gps = { lat: arredonda(la), lon: arredonda(lo) }
      }
    }
  } catch (_) {
    // EXIF quebrado: fica com o que deu para ler.
  }
  return { ...r, le }
}

const arredonda = (v) => Math.round(v * 1e6) / 1e6

// Devolve { dataHora: 'AAAA-MM-DDTHH:MM:SS' | null, gps: { lat, lon } | null,
// orientacao, bloco: { inicio, fim } } — ou null se a foto não tiver EXIF.
export function lerExif(entrada) {
  const b = entrada instanceof Uint8Array ? entrada : new Uint8Array(entrada)
  if (b[0] !== 0xff || b[1] !== 0xd8) return null // não é JPEG
  let p = 2
  while (p + 4 <= b.length) {
    if (b[p] !== 0xff) return null
    const marcador = b[p + 1]
    if (marcador === 0xda || marcador === 0xd9) return null // a imagem começou e não houve EXIF
    const tamanho = (b[p + 2] << 8) | b[p + 3]
    if (marcador === 0xe1 && texto(b, p + 4, 6) === 'Exif\0\0') {
      const t = lerTiff(b, p + 10, tamanho - 8)
      if (!t) return null
      return { dataHora: t.dataHora, gps: t.gps, orientacao: t.orientacao, posOrientacao: t.posOrientacao, le: t.le, bloco: { inicio: p, fim: p + 2 + tamanho } }
    }
    p += 2 + tamanho
  }
  return null
}

// Copia o bloco EXIF da foto original. A orientação vira "normal" (1), porque
// a foto comprimida já sai desvirada; sem isso, o visualizador giraria de novo.
export function blocoExifSemGiro(original, exif) {
  const b = original instanceof Uint8Array ? original : new Uint8Array(original)
  const bloco = b.slice(exif.bloco.inicio, exif.bloco.fim)
  if (exif.posOrientacao != null) {
    const i = exif.posOrientacao - exif.bloco.inicio
    bloco[i] = exif.le ? 1 : 0
    bloco[i + 1] = exif.le ? 0 : 1
  }
  return bloco
}

// Monta um bloco EXIF novo, só com orientação normal, data/hora e GPS.
// Usado quando a foto não trouxe GPS e ele veio do aparelho: assim a foto
// baixada pela fiscalização também carrega o local dentro do arquivo.
export function montarExif({ dataHora, gps }) {
  const le = true
  const tamIfd = (n) => 2 + n * 12 + 4
  const n0 = 1 + (dataHora ? 1 : 0) + (gps ? 1 : 0)
  let p = 8 + tamIfd(n0)
  const pos = {}
  if (dataHora) { pos.exif = p; p += tamIfd(1); pos.data = p; p += 20 }
  if (gps) { pos.gps = p; p += tamIfd(5); pos.lat = p; p += 24; pos.lon = p; p += 24 }
  const dv = new DataView(new ArrayBuffer(p))
  const u8 = (o, v) => dv.setUint8(o, v)
  const u16 = (o, v) => dv.setUint16(o, v, le)
  const u32 = (o, v) => dv.setUint32(o, v, le)
  const txt = (o, s) => [...s].forEach((c, i) => u8(o + i, c.charCodeAt(0)))
  const campo = (o, tag, tipo, n, escrever) => { u16(o, tag); u16(o + 2, tipo); u32(o + 4, n); escrever(o + 8) }
  const grausMinSeg = (o, v) => {
    const a = Math.abs(v)
    const g = Math.floor(a)
    const m = Math.floor((a - g) * 60)
    const s = Math.round(((a - g) * 60 - m) * 60 * 1000)
    u32(o, g); u32(o + 4, 1); u32(o + 8, m); u32(o + 12, 1); u32(o + 16, s); u32(o + 20, 1000)
  }

  txt(0, 'II'); u16(2, 42); u32(4, 8)
  let e = 8
  u16(e, n0); e += 2
  campo(e, 0x0112, 3, 1, (o) => u16(o, 1)); e += 12
  if (dataHora) { campo(e, 0x8769, 4, 1, (o) => u32(o, pos.exif)); e += 12 }
  if (gps) { campo(e, 0x8825, 4, 1, (o) => u32(o, pos.gps)); e += 12 }
  u32(e, 0)
  if (dataHora) {
    u16(pos.exif, 1)
    campo(pos.exif + 2, 0x9003, 2, 20, (o) => u32(o, pos.data))
    u32(pos.exif + 14, 0)
    txt(pos.data, `${dataHora.slice(0, 4)}:${dataHora.slice(5, 7)}:${dataHora.slice(8, 10)} ${dataHora.slice(11, 19)}\0`)
  }
  if (gps) {
    let g = pos.gps
    u16(g, 5); g += 2
    campo(g, 0, 1, 4, (o) => { u8(o, 2); u8(o + 1, 3) }); g += 12 // versão 2.3
    campo(g, 1, 2, 2, (o) => txt(o, gps.lat < 0 ? 'S\0' : 'N\0')); g += 12
    campo(g, 2, 5, 3, (o) => u32(o, pos.lat)); g += 12
    campo(g, 3, 2, 2, (o) => txt(o, gps.lon < 0 ? 'W\0' : 'E\0')); g += 12
    campo(g, 4, 5, 3, (o) => u32(o, pos.lon)); g += 12
    u32(g, 0)
    grausMinSeg(pos.lat, gps.lat)
    grausMinSeg(pos.lon, gps.lon)
  }
  const tiff = new Uint8Array(dv.buffer)
  const tamanho = 2 + 6 + tiff.length
  const bloco = new Uint8Array(2 + tamanho)
  bloco.set([0xff, 0xe1, tamanho >> 8, tamanho & 0xff, 0x45, 0x78, 0x69, 0x66, 0, 0], 0)
  bloco.set(tiff, 10)
  return bloco
}

// Coloca o bloco EXIF logo depois do início do JPEG novo (no lugar do bloco JFIF, se houver).
export function inserirExif(jpeg, bloco) {
  const b = jpeg instanceof Uint8Array ? jpeg : new Uint8Array(jpeg)
  let resto = 2
  if (b[2] === 0xff && b[3] === 0xe0) resto = 4 + ((b[4] << 8) | b[5])
  const saida = new Uint8Array(2 + bloco.length + (b.length - resto))
  saida.set(b.subarray(0, 2), 0)
  saida.set(bloco, 2)
  saida.set(b.subarray(resto), 2 + bloco.length)
  return saida
}
