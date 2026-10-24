// Perfis, o que cada um pode e o menu de cada um. Dono único destas listas:
// o texto dos papéis é idêntico ao CHECK de profiles.role no banco.

export const ROLES = ['Engenheiro', 'Diretoria', 'Equipe da obra', 'Fiscalização', 'Aguardando liberação']

export const podeVerValores = (role) => role === 'Engenheiro' || role === 'Diretoria'
export const podeEditar = (role) => role === 'Engenheiro'
export const podeLancar = (role) => role === 'Engenheiro' || role === 'Equipe da obra'
export const veTodasAsObras = (role) => role === 'Diretoria'

// Planejamento: o engenheiro lança as datas; a diretoria e a equipe só veem; a fiscalização não vê.
export const podePlanejar = (role) => role === 'Engenheiro'
export const vePlanejamento = (role) => role !== 'Fiscalização'

// Diário: a equipe vê a primeira aba como "Lançar o dia"; o cadastro de responsáveis e funções
// (com o contato de cada um) é do engenheiro e da diretoria.
export const rotuloDoDiario = (role) => (podeLancar(role) && role !== 'Engenheiro' ? 'Lançar o dia' : 'Diário do dia')
export const veCadastrosDoDiario = (role) => podeVerValores(role)

// id = tela; rotulo = menu lateral; curto = barra inferior; fase2 = ainda não construída;
// secundario = fica em "Mais" (celular) e no fim do menu lateral, fora do limite de 6 itens.
const PAINEL = { id: 'painel', rotulo: 'Painel do mês', curto: 'Painel', icone: 'painel' }
const ORCAMENTO = { id: 'orcamento', rotulo: 'Orçamento', curto: 'Orçamento', icone: 'servicos' }
const PLANEJAMENTO = { id: 'planejamento', rotulo: 'Planejamento', curto: 'Planejar', icone: 'planejamento' }
const MEDICAO = { id: 'medicao', rotulo: 'Medição', curto: 'Medição', icone: 'medicao' }
const RECADOS = { id: 'recados', rotulo: 'Recados', curto: 'Recados', icone: 'recados', fase2: true, secundario: true }
const PERFIL = { id: 'perfil', rotulo: 'Meu perfil', curto: 'Perfil', icone: 'perfil' }

export const MENUS = {
  Engenheiro: [
    PAINEL,
    { id: 'diario', rotulo: 'Diário', curto: 'Diário', icone: 'diario' },
    ORCAMENTO, PLANEJAMENTO, MEDICAO,
    { id: 'ajustes', rotulo: 'Ajustes', curto: 'Ajustes', icone: 'ajustes' },
    RECADOS,
  ],
  Diretoria: [
    PAINEL,
    { id: 'diario', rotulo: 'Diário', curto: 'Diário', icone: 'diario' },
    ORCAMENTO, PLANEJAMENTO, MEDICAO, PERFIL, RECADOS,
  ],
  'Equipe da obra': [
    { id: 'diario', rotulo: 'Lançar o dia', curto: 'Lançar', icone: 'diario' },
    PAINEL, PLANEJAMENTO, ORCAMENTO, PERFIL,
  ],
  Fiscalização: [
    { id: 'avanco', rotulo: 'Avanço por serviço', curto: 'Avanço', icone: 'avanco', fase2: true },
    { id: 'fotos', rotulo: 'Fotos da semana', curto: 'Fotos', icone: 'fotos', fase2: true },
    PERFIL,
  ],
}

export const telaInicial = (role) => MENUS[role]?.[0]?.id ?? 'perfil'

// A barra inferior do celular comporta 5 itens; o que passar, e os secundários, vão para "Mais".
export function dividirMenu(menu) {
  const principais = menu.filter((m) => !m.secundario)
  const secundarios = menu.filter((m) => m.secundario)
  if (principais.length <= 5 && !secundarios.length) return { barra: principais, mais: [] }
  return { barra: principais.slice(0, 4), mais: [...principais.slice(4), ...secundarios] }
}
