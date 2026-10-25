// Médio prazo (lookahead): as semanas à frente e as RESTRIÇÕES que travam as atividades.
// Regra pura, com teste em tests/restricoes.mjs. Datas 'AAAA-MM-DD'; a semana começa na segunda.
import { addDias, segundaDaSemana } from './datas.js'
import { colunasDoCronograma } from './planejamento.js'

// Tipos de restrição: texto idêntico ao CHECK de restricoes.tipo. Cor (classe) e ícone de cada um.
export const TIPOS_RESTRICAO = ['Material', 'Mão de obra', 'Método', 'Equipamento', 'Projeto', 'Segurança', 'Logística']
export const VISUAL_DO_TIPO = {
  Material: { cor: 't-material', icone: 'material' },
  'Mão de obra': { cor: 't-mao', icone: 'perfil' },
  Método: { cor: 't-metodo', icone: 'metodo' },
  Equipamento: { cor: 't-equip', icone: 'ferramenta' },
  Projeto: { cor: 't-projeto', icone: 'projeto' },
  Segurança: { cor: 't-seguranca', icone: 'seguranca' },
  Logística: { cor: 't-logistica', icone: 'logistica' },
}
export const SEMANAS_POSSIVEIS = [3, 4, 5, 6]
export const SEMANAS_PADRAO = 4

// As N semanas do quadro, começando na semana de hoje: [{ inicio (segunda), fim (domingo), rotulo }].
export const semanasDoQuadro = (hoje, n) =>
  colunasDoCronograma({ inicio: segundaDaSemana(hoje), fim: addDias(segundaDaSemana(hoje), 7 * n - 1), escala: 'semana' }).slice(0, n)

// Atividades previstas numa semana: itens cujo período cruza a semana e que ainda não terminaram.
export const atividadesDaSemana = (itens, semana) =>
  itens.filter((n) => n.inicio && n.fim && n.inicio <= semana.fim && n.fim >= semana.inicio && (n.real ?? n.progresso ?? 0) < 1)

// Restrição de uma semana que já passou aparece na primeira semana do quadro ("veio de dd/mm") enquanto
// está aberta, ou se foi resolvida nesta semana (para o "Mostrar resolvidas" achá-la).
export const semanaNoQuadro = (r, primeiraSemana) =>
  (r.semana < primeiraSemana && (!r.resolvida || (r.resolvida_em ?? '').slice(0, 10) >= primeiraSemana) ? primeiraSemana : r.semana)

// A restrição está na primeira coluna porque veio de uma semana que já passou?
export const veioDeSemanaPassada = (r, primeiraSemana) => r.semana < primeiraSemana && semanaNoQuadro(r, primeiraSemana) === primeiraSemana

export const restricaoVencida = (r, hoje) => !r.resolvida && !!r.prazo && r.prazo < hoje

// Atividade liberada = sem nenhuma restrição aberta.
export const atividadeLiberada = (servicoId, restricoes) => !restricoes.some((r) => r.servico_id === servicoId && !r.resolvida)

// Mover de semana pelas setas: uma semana para trás (-1) ou para a frente (+1).
export const moverSemana = (semana, passo) => addDias(semana, 7 * passo)

// r: { servico_id, tipo, descricao, semana, prazo, responsavel }
export function validarRestricao(r) {
  const erros = {}
  if (!r.servico_id) erros.servico_id = 'Escolha a atividade que a restrição trava.'
  if (!TIPOS_RESTRICAO.includes(r.tipo)) erros.tipo = 'Escolha o tipo.'
  if (!r.descricao?.trim()) erros.descricao = 'Descreva a restrição.'
  if (!r.semana || segundaDaSemana(r.semana) !== r.semana) erros.semana = 'Escolha a semana.'
  if (!r.prazo) erros.prazo = 'Informe o prazo para resolver.'
  if (!r.responsavel?.trim()) erros.responsavel = 'Informe quem vai resolver.'
  return erros
}
