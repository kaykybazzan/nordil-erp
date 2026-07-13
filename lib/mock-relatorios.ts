// Dados derivados de MOCK_PEDIDOS + MOCK_INVENTARIO para uso nas telas de Relatórios.
// Em produção viriam de queries agregadas no backend.

export interface RelatorioVendedor {
  vendedorId: string
  vendedorNome: string
  qtdPedidos: number
  receita: number
  ticketMedio: number
}

export interface RelatorioProdutoABC {
  produtoId: string
  produtoNome: string
  sku: string
  qtdVendida: number
  receita: number
  percentualReceita: number
  classeABC: "A" | "B" | "C"
}

export interface RelatorioStatusPedido {
  status: string
  label: string
  quantidade: number
  percentual: number
}

// ── Vendas por vendedor ──────────────────────────────────────────────────────
export const RELATORIO_VENDEDORES: RelatorioVendedor[] = [
  { vendedorId: "usr-001", vendedorNome: "Carla Mendes",  qtdPedidos: 7, receita: 4218.43, ticketMedio: 602.63 },
  { vendedorId: "usr-002", vendedorNome: "Rafael Torres", qtdPedidos: 5, receita: 2890.15, ticketMedio: 578.03 },
]

// ── Curva ABC de produtos ────────────────────────────────────────────────────
export const RELATORIO_PRODUTOS_ABC: RelatorioProdutoABC[] = [
  { produtoId: "prd-002", produtoNome: "Furadeira de impacto 650W",          sku: "PRD-000102", qtdVendida: 14,  receita: 4606.00, percentualReceita: 35.2, classeABC: "A" },
  { produtoId: "prd-001", produtoNome: "Jogo de chaves combinadas 8 peças",  sku: "PRD-000101", qtdVendida: 9,   receita: 1709.10, percentualReceita: 13.1, classeABC: "A" },
  { produtoId: "prd-005", produtoNome: "Vergalhão CA-50 10mm",               sku: "PRD-000105", qtdVendida: 180, receita: 1242.00, percentualReceita: 9.5,  classeABC: "B" },
  { produtoId: "prd-006", produtoNome: "Arame recozido nº 18",               sku: "PRD-000106", qtdVendida: 65,  receita: 799.50,  percentualReceita: 6.1,  classeABC: "B" },
  { produtoId: "prd-008", produtoNome: "Tinta acrílica fosca branco neve 18L", sku: "PRD-000108", qtdVendida: 3, receita: 689.70, percentualReceita: 5.3,  classeABC: "B" },
  { produtoId: "prd-003", produtoNome: "Tubo PVC soldável 25mm",             sku: "PRD-000103", qtdVendida: 62,  receita: 542.50,  percentualReceita: 4.1,  classeABC: "C" },
  { produtoId: "prd-007", produtoNome: "Fita isolante 19mm x 20m",           sku: "PRD-000107", qtdVendida: 28,  receita: 277.20,  percentualReceita: 2.1,  classeABC: "C" },
  { produtoId: "prd-004", produtoNome: "Conexão joelho 90° 25mm",            sku: "PRD-000104", qtdVendida: 0,   receita: 0,       percentualReceita: 0,    classeABC: "C" },
]

// ── Pedidos por status ───────────────────────────────────────────────────────
export const RELATORIO_STATUS_PEDIDOS: RelatorioStatusPedido[] = [
  { status: "CRIADO",         label: "Criado",         quantidade: 2, percentual: 14.3 },
  { status: "RESERVADO",      label: "Reservado",      quantidade: 3, percentual: 21.4 },
  { status: "EM_SEPARACAO",   label: "Em separação",   quantidade: 2, percentual: 14.3 },
  { status: "EM_CONFERENCIA", label: "Em conferência", quantidade: 1, percentual: 7.1  },
  { status: "CONFERIDO",      label: "Conferido",      quantidade: 1, percentual: 7.1  },
  { status: "EXPEDIDO",       label: "Expedido",       quantidade: 2, percentual: 14.3 },
  { status: "ENTREGUE",       label: "Entregue",       quantidade: 2, percentual: 14.3 },
  { status: "CANCELADO",      label: "Cancelado",      quantidade: 1, percentual: 7.1  },
]
