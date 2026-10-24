// Perfis, o que cada um pode e o menu de cada um. Dono único destas listas:
// o texto dos papéis é idêntico ao CHECK de profiles.role no banco.

export const ROLES = ['Engenheiro', 'Diretoria', 'Equipe da obra', 'Fiscalização', 'Aguardando liberação']

export const podeVerValores = (role) => role === 'Engenheiro' || role === 'Diretoria'
export const podeEditar = (role) => role === 'Engenheiro'
export const podeLancar = (role) => role === 'Engenheiro' || role === 'Equipe da obra'
export const veTodasAsObras = (role) => role === 'Diretoria'

// id = tela; rotulo = menu lateral; curto = barra inferior; fase2 = ainda não construída
const PAINEL = { id: 'painel', rotulo: 'Painel do mês', curto: 'Painel', icone: 'painel' }
const SERVICOS = { id: 'servicos', rotulo: 'Serviços', curto: 'Serviços', icone: 'servicos' }
const MEDICAO = { id: 'medicao', rotulo: 'Medição', curto: 'Medição', icone: 'medicao' }
const RECADOS = { id: 'recados', rotulo: 'Recados', curto: 'Recados', icone: 'recados', fase2: true }
const PERFIL = { id: 'perfil', rotulo: 'Meu perfil', curto: 'Perfil', icone: 'perfil' }

export const MENUS = {
  Engenheiro: [
    PAINEL,
    { id: 'diario', rotulo: 'Diário', curto: 'Diário', icone: 'diario' },
    SERVICOS, MEDICAO, RECADOS,
    { id: 'ajustes', rotulo: 'Ajustes', curto: 'Ajustes', icone: 'ajustes' },
  ],
  Diretoria: [
    PAINEL,
    { id: 'diario', rotulo: 'Diário', curto: 'Diário', icone: 'diario' },
    SERVICOS, MEDICAO, RECADOS, PERFIL,
  ],
  'Equipe da obra': [
    { id: 'diario', rotulo: 'Lançar o dia', curto: 'Lançar', icone: 'diario' },
    PAINEL, SERVICOS, PERFIL,
  ],
  Fiscalização: [
    { id: 'avanco', rotulo: 'Avanço por serviço', curto: 'Avanço', icone: 'avanco', fase2: true },
    { id: 'fotos', rotulo: 'Fotos da semana', curto: 'Fotos', icone: 'fotos', fase2: true },
    PERFIL,
  ],
}

export const telaInicial = (role) => MENUS[role]?.[0]?.id ?? 'perfil'

// A barra inferior do celular comporta 5 itens; o que passar vai para "Mais".
export function dividirMenu(menu) {
  if (menu.length <= 5) return { barra: menu, mais: [] }
  return { barra: menu.slice(0, 4), mais: menu.slice(4) }
}
