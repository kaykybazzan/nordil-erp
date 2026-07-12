export interface Endereco {
  id: string
  logradouro: string
  numero: string
  bairro: string
  cidade: string
  uf: string
  cep: string
  principal: boolean
}

export interface Cliente {
  id: string
  nome: string // nome ou razão social
  documento: string // CPF ou CNPJ
  status: "ativo" | "bloqueado"
  enderecos: Endereco[]
  dataCadastro: string
}

export type UnidadeMedida = "UN" | "M" | "KG" | "CX"

export interface Produto {
  id: string
  skuInterno: string // gerado pelo sistema, somente leitura após criação
  referenciaComercial?: string
  codigoBarras?: string
  nome: string
  marca: string
  unidadeMedida: UnidadeMedida
  permiteFracionado: boolean // default por unidade: UN/CX = false, M/KG = true
  precoVenda: number
  status: "ativo" | "inativo"
  // campos somente leitura, vêm do agregado Inventario, nunca editados aqui:
  estoqueAtual: number
}

export interface Inventario {
  produtoId: string
  estoqueFisico: number
  reservado: number
  estoqueMinimo: number
  ultimaMovimentacao: string
}

export interface Fornecedor {
  id: string
  nome: string
}

export interface EntradaItem {
  produtoId: string
  quantidade: number
  custoUnitario: number
}

export interface EntradaEstoque {
  id: string
  fornecedorId: string
  numeroNF: string
  serie?: string
  dataEmissao: string
  dataRecebimento: string
  observacao?: string
  itens: EntradaItem[]
  lancadoPor: string
  dataHoraLancamento: string
}

export type PapelUsuario = "ADMIN" | "SUPERVISOR" | "OPERADOR"
export type FuncaoUsuario = "VENDAS" | "ESTOQUE" | "SEPARACAO" | "CONFERENCIA" | "EXPEDICAO" | "ADMINISTRATIVO"

export interface Usuario {
  id: string
  nome: string
  email: string
  empresaId: string
  role: PapelUsuario
  funcao: FuncaoUsuario
}


// ─── Pedido ──────────────────────────────────────────────────────────────

export type StatusPedido =
  | "CRIADO"
  | "RESERVADO"
  | "EM_SEPARACAO"
  | "EM_CONFERENCIA"
  | "CONFERIDO"
  | "EXPEDIDO"
  | "ENTREGUE"
  | "CANCELADO"

export type PendenciaPedido =
  | "NENHUMA"
  | "RUPTURA_ESTOQUE" 
  | "DIVERGENCIA_CONFERENCIA" 

export type StatusItemPedido = "PENDENTE" | "PENDENTE_ESTOQUE" | "SEPARADO" | "CANCELADO"

export interface ItemPedido {
  id: string
  produtoId: string
  quantidade: number
  precoUnitario: number 
  desconto: number 
  status: StatusItemPedido
}

export interface EnderecoPedido {
  enderecoId?: string 
  logradouro: string
  numero: string
  bairro: string
  cidade: string
  uf: string
  cep: string
}

export interface PedidoEvento {
  id: string
  tipo: string 
  descricao: string
  dataHora: string
  usuarioId: string
}

export interface Pedido {
  id: string
  numero: number 
  clienteId: string
  vendedorId: string
  endereco: EnderecoPedido
  itens: ItemPedido[]
  observacao?: string
  transportadora?: string
  status: StatusPedido
  pendencia: PendenciaPedido 
  valorTotal: number
  criadoEm: string
  statusAlteradoEm: string 
  eventos: PedidoEvento[]
  motivoCancelamento?: string
}