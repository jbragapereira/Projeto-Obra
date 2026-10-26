// Regras da entidade OBRA. O texto das situações é idêntico ao CHECK do banco.
import { validarCronogramaDeMedicoes } from './medicao.js'

export const SITUACOES_OBRA = ['Em andamento', 'Concluída', 'Parada']

// Texto idêntico ao CHECK de responsaveis.tipo.
export const TIPOS_RESPONSAVEL = ['Empreiteiro', 'Empresa especializada', 'Mão de obra própria']

export const OBRA_VAZIA = {
  nome: '', codigo: '', endereco: '', cliente: '', numero_contrato: '',
  data_inicio: '', data_entrega: '', situacao: 'Em andamento',
  medicoes_inicio: '', medicoes_fim_primeira: '',
}

// Devolve { campo: 'mensagem' } com cada problema; objeto vazio = pode salvar.
export function validarObra(o) {
  const e = {}
  if (!o.nome?.trim()) e.nome = 'Informe o nome da obra.'
  if (!o.codigo?.trim()) e.codigo = 'Informe um código ou apelido curto.'
  if (!o.cliente?.trim()) e.cliente = 'Informe o cliente.'
  if (!o.data_inicio) e.data_inicio = 'Informe a data de início.'
  if (!o.data_entrega) e.data_entrega = 'Informe a data-meta de entrega.'
  else if (o.data_inicio && o.data_entrega < o.data_inicio) e.data_entrega = 'A entrega não pode ser antes do início.'
  if (!SITUACOES_OBRA.includes(o.situacao)) e.situacao = 'Escolha a situação.'
  return { ...e, ...validarCronogramaDeMedicoes({ inicio: o.medicoes_inicio, fimPrimeira: o.medicoes_fim_primeira, entrega: o.data_entrega }) }
}

// Obra concluída não aceita lançamento novo.
export const aceitaLancamento = (obra) => obra?.situacao !== 'Concluída'
