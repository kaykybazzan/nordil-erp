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
  empresaId: string
  nome: string
  documento: string
  status: "ativo" | "bloqueado"
  enderecos: Endereco[]
  dataCadastro: string
}

export type UnidadeMedida = "UN" | "M" | "KG" | "CX"

export interface Produto {
  id: string
  empresaId: string
  skuInterno: string
  referenciaComercial?: string
  codigoBarras?: string
  nome: string
  marca: string
  unidadeMedida: UnidadeMedida
  permiteFracionado: boolean
  custo: number
  precoVenda: number
  status: "ativo" | "inativo"
  estoqueAtual: number
  corredor?: string
  categoria?: string
  fornecedor?: string
  estoqueMinimo: number
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
  precisaTrocarSenha: boolean
  cargo?: string
  empresaId: string
  role: PapelUsuario
  funcao: FuncaoUsuario
  status: "ativo" | "inativo"
}

// ─── Pedido

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

export type StatusItemPedido = "PENDENTE" | "PENDENTE_ESTOQUE" | "SEPARADO" | "EXPEDIDO" | "CANCELADO"

export interface ItemPedido {
  id: string
  produtoId: string
  quantidade: number
  precoUnitario: number
  desconto: number
  status: StatusItemPedido
  quantidadeSeparada?: number   // preenchido só ao finalizar separação (Módulo 12).
                                  // undefined/null = ainda não separado.
                                  // ruptura = quantidade - quantidadeSeparada > 0
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

// União fechada — todo tipo de evento em uso real no projeto.
// Adicionar um novo tipo aqui sempre que um novo evento for criado em código.
export type TipoPedidoEvento =
  | "PEDIDO_CRIADO"
  | "ESTOQUE_RESERVADO"
  | "PEDIDO_REPROCESSADO"
  | "SEPARACAO_INICIADA"
  | "SEPARACAO_CONCLUIDA"
  | "RUPTURA_ESTOQUE_DETECTADA"
  | "CONFERENCIA_INICIADA"
  | "DIVERGENCIA_DETECTADA"
  | "CONFERENCIA_CONCLUIDA"
  | "PEDIDO_EXPEDIDO"
  | "PEDIDO_ENTREGUE"
  | "PEDIDO_CANCELADO"

export interface PedidoEvento {
  id: string
  tipo: TipoPedidoEvento
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
  separadorId?: string
  conferenteId?: string
}


export type StatusConferencia = "EM_ANDAMENTO" | "CONCLUIDA_SEM_DIVERGENCIA" | "CONCLUIDA_COM_DIVERGENCIA"

export interface ConferenciaItem {
  id: string
  itemPedidoId: string
  produtoId: string
  quantidadeSolicitada: number
  quantidadeSeparada: number
  quantidadeConferida: number | null
  divergente: boolean | null
}

export interface Conferencia {
  id: string
  pedidoId: string
  conferenteId: string
  iniciadoEm: string
  finalizadoEm: string | null
  status: StatusConferencia
  itens: ConferenciaItem[]
}

export interface InventarioEstoque {
  produtoId: string
  estoqueFisico: number
  reservado: number
  disponivel: number
  estoqueMinimo: number
  ultimaMovimentacao: string
}


export type TipoEstoqueMovimentacao = "RESERVA" | "LIBERACAO_RESERVA" | "SAIDA" | "ENTRADA" | "ENTRADA_DEVOLUCAO" | "AJUSTE"

export interface EstoqueMovimentacao {
  id: string
  empresaId: string
  produtoId: string
  tipo: TipoEstoqueMovimentacao
  quantidade: number
  pedidoId?: string
  dataHora: string
  usuarioId: string
  direcao?: "ENTRADA" | "SAIDA"
}

// ─── Configurações

export type EnderecoConfiguracao = Omit<Endereco, "id" | "principal">

export type PoliticaSenhaMinima = "BASICA" | "MEDIA" | "FORTE"

export interface Configuracoes {
  empresaId: string
  regrasOperacionais: {
    permitirAutoConferencia: boolean
    permitirAprovacaoExcepcionalDivergencia: boolean
  }
  dadosEmpresa: {
    razaoSocial: string
    nomeFantasia?: string
    cnpj: string
    email?: string
    telefone?: string
    endereco?: EnderecoConfiguracao
  }
  deposito: {
    nome: string
    endereco: EnderecoConfiguracao
    responsavel?: string
  }
  seguranca: {
    tempoExpiracaoSessaoMinutos: number
    politicaSenhaMinima: PoliticaSenhaMinima
    duracaoSenhaTemporariaDias: number
  }
}

// ─── Devoluções

export type StatusDevolucao = "SOLICITADA" | "CONCLUIDA" | "CANCELADA"

export type MotivoDevolucao =
  | "PRODUTO_AVARIADO"
  | "PRODUTO_INCORRETO"
  | "DEFEITO"
  | "DESISTENCIA_CLIENTE"
  | "EXCESSO_COMPRA"
  | "OUTRO"

export interface ItemDevolucao {
  itemPedidoId: string
  produtoId: string
  quantidadeSolicitada: number
  quantidadeConfirmada: number | null // preenchido só na confirmação; null até lá
  observacaoAjuste?: string // obrigatório na UI/store quando quantidadeConfirmada < quantidadeSolicitada; registra o motivo da divergência (ex: perda no transporte, desistência parcial)
}

export interface Devolucao {
  id: string
  empresaId: string
  pedidoId: string
  itens: ItemDevolucao[]
  motivo: MotivoDevolucao
  motivoOutroTexto?: string // obrigatório apenas quando motivo === "OUTRO"
  status: StatusDevolucao
  solicitadoPor: string // usuarioId — Vendedor ou Supervisor
  solicitadoEm: string
  confirmadoPor?: string // usuarioId — sempre um Supervisor
  confirmadoEm?: string
  canceladoPor?: string
  canceladoEm?: string
}

// ─── Inventário Contagem

export type TipoEscopoInventario =
  | "CORREDOR"
  | "CATEGORIA"
  | "LISTA_MANUAL"
  | "ESTOQUE_BAIXO"
  | "FORNECEDOR"
  | "TODOS_PRODUTOS"

export type StatusInventarioContagem = "EM_ANDAMENTO" | "FINALIZADO"

export type StatusItemContagem =
  | "PENDENTE"
  | "CONTADO_OK"
  | "DIVERGENTE"
  | "NECESSITA_RECONTAGEM"
  | "AJUSTADO"

export interface ItemInventarioContagem {
  id: string
  produtoId: string
  saldoEsperado: number
  ultimaMovimentacaoId: string | null // snapshot: referência da última movimentação no momento da contagem/recontagem
  quantidadeContada: number | null
  status: StatusItemContagem
  contadoEm: string | null
}

export interface InventarioContagem {
  id: string
  empresaId: string
  tipoEscopo: TipoEscopoInventario
  descricaoEscopo: string // ex: "Corredor A — 54 itens", gerado na abertura
  recorte: string | null // valor do corredor/categoria/fornecedor selecionado, null se TODOS_PRODUTOS ou LISTA_MANUAL
  observacao?: string
  itens: ItemInventarioContagem[]
  status: StatusInventarioContagem
  abertoPorId: string
  responsavelContagemId: string
  abertoEm: string
  finalizadoEm: string | null
  finalizadoComPendencias: boolean
}

// ─── Auditoria

export const MODULOS_AUDITORIA = [
  "PEDIDOS",
  "CLIENTES",
  "PRODUTOS",
  "ESTOQUE",
  "USUARIOS",
  "CONFIGURACOES",
  "AUTH",
  "DEVOLUCOES",
  "INVENTARIO",
] as const

export type ModuloAuditoria = (typeof MODULOS_AUDITORIA)[number]

export const ACOES_AUDITORIA = [
  "CRIADO",
  "ATUALIZADO",
  "CANCELADO",
  "EXCLUIDO",
  "LOGIN",
  "LOGOUT",
  "STATUS_ALTERADO",
  "EXPORTADO",
] as const

export type AcaoAuditoria = (typeof ACOES_AUDITORIA)[number]

// ─── Sequência de Numeração

export const TIPOS_SEQUENCIA_NUMERACAO = ["PEDIDO", "NF", "OS", "INVENTARIO"] as const

export type TipoSequenciaNumeracao = (typeof TIPOS_SEQUENCIA_NUMERACAO)[number]


export interface Notificacao {
  id: string
  tipo: TipoPedidoEvento | "ESTOQUE_ABAIXO_MINIMO" | "DEVOLUCAO_SOLICITADA" | "PEDIDO_ATRASADO"
  mensagem: string
  href: string
  destinatarioRole?: PapelUsuario
  destinatarioFuncao?: FuncaoUsuario
  criadoEm: string
  lida: boolean
}