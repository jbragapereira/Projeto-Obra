// Qualidade › FVS (src/lib/qualidade.js): modelos, vistoria (checklist) e não conformidades.
import {
  MODELOS_FVS_PADRAO, NC_ABERTA, NC_CORRIGIDA, NC_ENCAMINHADA, NC_FECHADA, RESP_NA, RESP_NC, RESP_OK,
  VISTORIA_ANDAMENTO, VISTORIA_CONCLUIDA, diasEmAberto, kpisFvs, limparModelo, montarModeloPadrao, motivoParaNaoFinalizar,
  acoesPermitidasNc, motivoParaNaoMoverNc, motivoParaNaoResponder, numerarItens, ordenarNcs, progressoVistoria, proximoCodigoFvs, proximoCodigoNc,
  textoDoPassoNc, validarModelo, validarNc, validarVistoria,
} from '../src/lib/qualidade.js'

let ok = 0
let tot = 0
function conferir(descricao, real, esperado) {
  tot++
  if (JSON.stringify(real) === JSON.stringify(esperado)) ok++
  else console.log(`  ✗ ${descricao}\n     esperado: ${JSON.stringify(esperado)}\n     veio:     ${JSON.stringify(real)}`)
}

const HOJE = '2026-10-29'
const imper = montarModeloPadrao(MODELOS_FVS_PADRAO[0])
const ceram = montarModeloPadrao(MODELOS_FVS_PADRAO[1])
conferir('modelos padrão: impermeabilização com 3 grupos e 9 itens; cerâmico com 2 grupos e 7 itens', [
  imper.grupos.length, numerarItens(imper.grupos).length, ceram.grupos.length, numerarItens(ceram.grupos).length,
], [3, 9, 2, 7])
conferir('itens numerados por grupo', numerarItens(imper.grupos).map((i) => i.numero).slice(2, 5), ['1.3', '2.1', '2.2'])
conferir('códigos seguintes', [proximoCodigoFvs([]), proximoCodigoFvs([{ codigo: 'FVS-01' }, { codigo: 'FVS-07' }]), proximoCodigoNc([{ codigo: 'NC-009' }])], ['FVS-01', 'FVS-08', 'NC-010'])

conferir('modelo: nome sem repetir, categoria, grupo com nome e item', [
  Object.keys(validarModelo({ nome: 'revestimento cerâmico', categoria: 'Pintura', grupos: [{ nome: '', itens: [] }, { nome: 'Execução', itens: [{ titulo: ' ' }] }] }, ['Revestimento Cerâmico'])),
  Object.keys(validarModelo({ nome: 'Nova', categoria: 'Estrutura', grupos: [] })),
  validarModelo({ nome: 'Forma de pilar', categoria: 'Estrutura', grupos: [{ nome: 'Execução', itens: [{ titulo: 'Prumo conferido' }] }] }, ['Revestimento Cerâmico']),
], [['nome', 'categoria', 'grupo0', 'grupo1'], ['grupos'], {}])
conferir('limpar modelo: tira item em branco e dá id ao item novo sem repetir os que existem', limparModelo([
  { nome: ' Execução ', itens: [{ id: 'i1', titulo: 'A' }, { titulo: ' B ' }, { titulo: '' }] },
]), [{ nome: 'Execução', itens: [{ id: 'i1', titulo: 'A' }, { id: 'i2', titulo: 'B' }] }])

const respostas = { 'g1-1': RESP_OK, 'g1-2': RESP_OK, 'g1-3': RESP_NC, 'g2-1': RESP_NA }
conferir('progresso: OK, NC, N.A., pendentes e % = OK / (OK + NC) arredondado', progressoVistoria(imper.grupos, respostas),
  { ok: 2, nc: 1, na: 1, total: 9, verificados: 4, pendentes: 5, conformidade: 67 })
conferir('sem OK nem NC, sem % ainda', progressoVistoria(imper.grupos, { 'g1-1': RESP_NA }).conformidade, null)

const emAndamento = { status: VISTORIA_ANDAMENTO, grupos: imper.grupos, respostas }
conferir('responder: concluída é só leitura; NC registrada não muda; NC vai pelo painel; item de fora não', [
  motivoParaNaoResponder({ ...emAndamento, status: VISTORIA_CONCLUIDA }, 'g1-1', RESP_OK),
  motivoParaNaoResponder(emAndamento, 'g1-3', RESP_OK),
  motivoParaNaoResponder(emAndamento, 'g2-2', RESP_NC),
  motivoParaNaoResponder(emAndamento, 'x9', RESP_OK),
  motivoParaNaoResponder(emAndamento, 'g1-1', RESP_NA),
], ['Vistoria concluída: só leitura.', 'Este item já tem não conformidade registrada.', 'Registre a não conformidade no painel do item.', 'Item fora desta ficha.', null])
const tudo = Object.fromEntries(numerarItens(ceram.grupos).map((i) => [i.id, RESP_OK]))
conferir('finalizar só sem pendente', [
  motivoParaNaoFinalizar(emAndamento), motivoParaNaoFinalizar({ status: VISTORIA_ANDAMENTO, grupos: ceram.grupos, respostas: tudo }),
  motivoParaNaoFinalizar({ status: VISTORIA_CONCLUIDA, grupos: ceram.grupos, respostas: tudo }),
], ['Faltam 5 itens para verificar.', null, 'Esta vistoria já está concluída.'])
conferir('vistoria nova: ficha e ambiente', [Object.keys(validarVistoria({ modelo_id: 'x', ambiente: ' ' }, ['m1'])), validarVistoria({ modelo_id: 'm1', ambiente: 'Banheiro Social · Térreo' }, ['m1'])],
  [['modelo_id', 'ambiente'], {}])
conferir('NC: descrição, solução, severidade e responsável', [
  Object.keys(validarNc({ descricao: '', solucao: ' ', severidade: 'Crítica', responsavel_id: 'x' }, ['r1'])),
  validarNc({ descricao: 'Manta rasgada', solucao: 'Remendo com sobreposição', severidade: 'Alta', responsavel_id: 'r1' }, ['r1']),
], [['descricao', 'solucao', 'severidade', 'responsavel_id'], {}])
conferir('NC: no máximo 3 fotos', validarNc({ descricao: 'x', solucao: 'y', severidade: 'Baixa', responsavel_id: 'r1', fotos: [{}, {}, {}, {}] }, ['r1']), { fotos: 'No máximo 3 fotos por não conformidade.' })
conferir('botões da NC por perfil: corrigida mostra aprovar e reprovar só ao engenheiro', [acoesPermitidasNc({ status: NC_CORRIGIDA }, true).map((x) => x.rotulo), acoesPermitidasNc({ status: NC_CORRIGIDA }, false), acoesPermitidasNc({ status: NC_ABERTA }, false).map((x) => x.rotulo)], [['Aprovar e fechar', 'Reprovar'], [], ['Encaminhar p/ correção']])

conferir('fluxo da NC: um passo por vez; aprovar e reprovar só o engenheiro', [
  motivoParaNaoMoverNc({ status: NC_ABERTA }, NC_ENCAMINHADA, false),
  motivoParaNaoMoverNc({ status: NC_ABERTA }, NC_FECHADA, true),
  motivoParaNaoMoverNc({ status: NC_CORRIGIDA }, NC_FECHADA, false),
  motivoParaNaoMoverNc({ status: NC_CORRIGIDA }, NC_ENCAMINHADA, true),
  motivoParaNaoMoverNc({ status: NC_FECHADA }, NC_ABERTA, true),
], [null, 'Esta mudança não é possível agora.', 'Só o engenheiro aprova ou reprova a correção.', null, 'Esta mudança não é possível agora.'])
conferir('linha do tempo: encaminhar, reprovar, corrigir, fechar', [
  textoDoPassoNc(NC_ENCAMINHADA, NC_ABERTA, 'Pedra Firme'), textoDoPassoNc(NC_ENCAMINHADA, NC_CORRIGIDA, 'Pedra Firme'),
  textoDoPassoNc(NC_CORRIGIDA, NC_ENCAMINHADA), textoDoPassoNc(NC_FECHADA, NC_CORRIGIDA),
], ['Encaminhada para correção a Pedra Firme', 'Reprovada na reavaliação; volta para correção', 'Marcada como corrigida', 'Aprovada e fechada'])
conferir('dias em aberto: até hoje, ou até fechar', [diasEmAberto({ aberta_em: '2026-10-20' }, HOJE), diasEmAberto({ aberta_em: '2026-10-20', fechada_em: '2026-10-23' }, HOJE)], [9, 3])
const ncs = [
  { codigo: 'NC-001', status: NC_FECHADA, severidade: 'Alta', aberta_em: '2026-10-01', fechada_em: '2026-10-05' },
  { codigo: 'NC-002', status: NC_ABERTA, severidade: 'Baixa', aberta_em: '2026-10-01' },
  { codigo: 'NC-003', status: NC_ENCAMINHADA, severidade: 'Alta', aberta_em: '2026-10-25' },
  { codigo: 'NC-004', status: NC_CORRIGIDA, severidade: 'Alta', aberta_em: '2026-10-10' },
]
conferir('ordem das NCs: em aberto, Alta primeiro, mais antigas; fechadas no fim', ordenarNcs(ncs, HOJE).map((n) => n.codigo), ['NC-004', 'NC-003', 'NC-002', 'NC-001'])
conferir('KPIs da aba: % conforme geral, NCs em aberto, vistorias concluídas', kpisFvs([
  { status: VISTORIA_CONCLUIDA, grupos: ceram.grupos, respostas: tudo }, emAndamento,
], ncs), { conforme: 90, ncsAbertas: 3, concluidas: 1 })

console.log(`${ok}/${tot} — qualidade, FVS`)
process.exit(ok === tot ? 0 : 1)
