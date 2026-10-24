// Fotos do diário: nunca acima de 5 MB (src/lib/fotos.js e a trava em dados.js).
import { LIMITE_FOTO_BYTES, TENTATIVAS_COMPRESSAO, cabeNoLimite, dimensoesPara } from '../src/lib/fotos.js'
import * as mock from '../src/lib/mockData.js'
import { entrar, definirObraAtual, salvarDiario } from '../src/lib/dados.js'
import { hojeISO } from '../src/lib/datas.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

conferir('o limite é 5 MB (5.000.000 bytes)', LIMITE_FOTO_BYTES, 5000000)
conferir('5 MB exatos cabem', cabeNoLimite(5000000), true)
conferir('1 byte acima não cabe', cabeNoLimite(5000001), false)
conferir('tamanho ausente não cabe', cabeNoLimite(undefined), false)

conferir('foto grande encolhe pelo maior lado', dimensoesPara(8000, 6000, 4096), { largura: 4096, altura: 3072 })
conferir('foto em pé também', dimensoesPara(3000, 4000, 2048), { largura: 1536, altura: 2048 })
conferir('foto pequena nunca é aumentada', dimensoesPara(800, 600, 4096), { largura: 800, altura: 600 })

const decrescente = TENTATIVAS_COMPRESSAO.every((t, i, l) => i === 0 || (t.lado <= l[i - 1].lado && t.qualidade <= l[i - 1].qualidade))
conferir('as tentativas só diminuem lado e qualidade', decrescente, true)
// Pior caso de JPEG: ~3 bytes por pixel. A última tentativa tem que caber mesmo assim.
const ultima = TENTATIVAS_COMPRESSAO.at(-1)
conferir('a última tentativa cabe no limite até no pior caso', ultima.lado * ultima.lado * 3 <= LIMITE_FOTO_BYTES, true)

// A camada de dados recusa foto acima do limite, mesmo que a tela deixe passar.
await entrar('p-lucas')
definirObraAtual('obra-vn')
const servico = mock.servicos.find((s) => s.obra_id === 'obra-vn' && s.codigo === '4.2.1')
const base = { data: hojeISO(), clima_manha: 'Bom', clima_tarde: 'Bom', ocorrencias: '' }
const item = (tamanho) => ({ servico_id: servico.id, quantidade: 10, responsavel_id: servico.responsavel_id, concluido: false, fotos: [{ tamanho_bytes: tamanho, largura: 1000, altura: 750 }] })
const antes = mock.fotos.length
const grande = await salvarDiario({ ...base, itens: [item(6 * 1024 * 1024)] })
conferir('foto de 6 MB é recusada', grande.erro !== null, true)
conferir('nada foi gravado com a foto recusada', mock.fotos.length, antes)
const certa = await salvarDiario({ ...base, itens: [item(2 * 1024 * 1024)] })
conferir('foto de 2 MB entra', certa.erro, null)
conferir('a foto gravada guarda o tamanho e a obra', mock.fotos.at(-1).tamanho_bytes === 2 * 1024 * 1024 && mock.fotos.at(-1).obra_id === 'obra-vn', true)

// Data, hora, GPS e endereço ficam gravados com a foto (a fiscalização confere).
const comLocal = { tamanho_bytes: 1024 * 1024, largura: 1000, altura: 750, tirada_em: '2026-10-24T10:31:05', tirada_em_origem: 'Data da foto', gps_lat: -8.0476, gps_lon: -34.877, gps_origem: 'GPS da foto', endereco: 'Rua das Acácias, 120, Recife - PE' }
const r1 = await salvarDiario({ ...base, itens: [{ ...item(1), fotos: [comLocal] }] })
const gravada = mock.fotos.at(-1)
conferir('foto com localização entra', r1.erro, null)
conferir('data, GPS e endereço gravados', [gravada.tirada_em, gravada.gps_lat, gravada.gps_lon, gravada.gps_origem, gravada.endereco],
  ['2026-10-24T10:31:05', -8.0476, -34.877, 'GPS da foto', 'Rua das Acácias, 120, Recife - PE'])
const r2 = await salvarDiario({ ...base, itens: [{ ...item(1), fotos: [{ ...comLocal, gps_lat: 0, gps_lon: 0 }] }] })
conferir('GPS 0,0 (câmera sem sinal) é recusado', r2.erro !== null, true)
const r3 = await salvarDiario({ ...base, itens: [{ ...item(1), fotos: [{ ...comLocal, gps_origem: 'Chute' }] }] })
conferir('origem do GPS fora da lista é recusada', r3.erro !== null, true)

console.log(`${ok}/${tot} — fotos`)
process.exit(ok === tot ? 0 : 1)
