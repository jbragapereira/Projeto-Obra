// Cancelar um cadastro (responsável, função, equipamento, material ou categoria de material): ele sai das
// listas de escolha, mas nada se apaga — o histórico (diários, contratos, pedidos já feitos) continua com o
// nome, e o cadastro pode ser reativado. Regra pura, com teste em tests/cadastros.mjs.

// As tabelas de cadastro (os nomes são os do mockData e do PRD-BACKEND).
export const CADASTROS = ['responsaveis', 'funcoes', 'equipamentos', 'materiais', 'categoriasMaterial']

// Os ativos e os cancelados de uma lista.
export const separar = (lista) => ({ ativos: lista.filter((x) => x.ativo), cancelados: lista.filter((x) => !x.ativo) })

// Opções de uma lista de escolha: os ativos e, se o que já estava escolhido foi cancelado, ele também
// (para a correção de um lançamento antigo não perder o que tinha).
export const paraEscolher = (lista, atualId) => lista.filter((x) => x.ativo || (atualId && x.id === atualId))

// Pode gravar este cadastro num registro? Ativo, ou já gravado nesse mesmo registro (corrigir um diário
// antigo não obriga a trocar quem foi cancelado depois). jaGravados: Set de ids.
export const aceitaNoRegistro = (item, jaGravados = new Set()) => !!item && (item.ativo || jaGravados.has(item.id))

// Escolha que a tela sugere num registro novo: o sugerido, se ainda está ativo; senão, nenhum.
export const escolhaInicial = (lista, id) => (id && lista.some((x) => x.id === id && x.ativo) ? id : '')

// O nome na lista de escolha, marcando o cancelado.
export const rotuloNaLista = (x) => (x.ativo ? x.nome : `${x.nome} (cancelado)`)

// Pode cancelar? Devolve o motivo do bloqueio, ou null.
// Categoria com material ativo não sai: o material ficaria sem categoria na lista.
export function motivoParaNaoCancelar(tabela, item, { materiais = [] } = {}) {
  if (!CADASTROS.includes(tabela)) return 'Cadastro desconhecido.'
  if (!item) return 'Cadastro não encontrado nesta obra.'
  if (!item.ativo) return 'Este cadastro já está cancelado.'
  if (tabela === 'categoriasMaterial') {
    const n = materiais.filter((m) => m.ativo && m.categoria_id === item.id).length
    if (n) return `Cancele antes ${n === 1 ? 'o material' : `os ${n} materiais`} desta categoria.`
  }
  return null
}

// Pode reativar? Devolve o motivo do bloqueio, ou null. Material só volta com a categoria dele ativa.
export function motivoParaNaoReativar(tabela, item, { categorias = [] } = {}) {
  if (!CADASTROS.includes(tabela)) return 'Cadastro desconhecido.'
  if (!item) return 'Cadastro não encontrado nesta obra.'
  if (item.ativo) return 'Este cadastro já está ativo.'
  if (tabela === 'materiais' && !categorias.some((c) => c.id === item.categoria_id && c.ativo)) return 'Reative antes a categoria deste material.'
  return null
}
