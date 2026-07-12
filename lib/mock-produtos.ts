import type { Produto, UnidadeMedida } from "@/types/domain"

/** Unidades de medida disponíveis, com rótulos legíveis. */
export const UNIDADES: { value: UnidadeMedida; label: string }[] = [
  { value: "UN", label: "Unidade (UN)" },
  { value: "M", label: "Metro (M)" },
  { value: "KG", label: "Quilograma (KG)" },
  { value: "CX", label: "Caixa (CX)" },
]

/**
 * Default de "permite fracionado" por unidade:
 * UN/CX vendidos inteiros (false), M/KG admitem fração (true).
 */
export function fracionadoPadrao(unidade: UnidadeMedida): boolean {
  return unidade === "M" || unidade === "KG"
}

/** Marcas do catálogo — usadas no seletor do drawer e no filtro da lista. */
export const MARCAS = [
  "Tramontina",
  "Vonder",
  "Tigre",
  "Amanco",
  "Gerdau",
  "Belgo",
  "3M",
  "Suvinil",
] as const

/** Remove tudo que não é dígito. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "")
}

/** Formata um número como moeda brasileira (R$). */
export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

/**
 * Converte a string digitada no campo de preço (aceita "1234", "12,34")
 * para número. Retorna NaN quando inválida.
 */
export function parsePreco(value: string): number {
  const normalizado = value.replace(/\./g, "").replace(",", ".").trim()
  if (normalizado === "") return Number.NaN
  return Number(normalizado)
}

/**
 * Gera um SKU interno sequencial no padrão PRD-000123.
 * Em produção viria do backend; aqui é derivado do maior SKU existente.
 */
export function gerarSku(existentes: Produto[]): string {
  const maior = existentes.reduce((max, p) => {
    const n = Number(onlyDigits(p.skuInterno))
    return Number.isFinite(n) && n > max ? n : max
  }, 0)
  return `PRD-${String(maior + 1).padStart(6, "0")}`
}

export const MOCK_PRODUTOS: Produto[] = [
  {
    id: "prd-001",
    skuInterno: "PRD-000101",
    referenciaComercial: "TRA-2205",
    codigoBarras: "7891234500011",
    nome: "Jogo de chaves combinadas 8 peças",
    marca: "Tramontina",
    unidadeMedida: "CX",
    permiteFracionado: false,
    precoVenda: 189.9,
    status: "ativo",
    estoqueAtual: 42,
  },
  {
    id: "prd-002",
    skuInterno: "PRD-000102",
    referenciaComercial: "VND-1180",
    codigoBarras: "7891234500028",
    nome: "Furadeira de impacto 650W",
    marca: "Vonder",
    unidadeMedida: "UN",
    permiteFracionado: false,
    precoVenda: 329.0,
    status: "ativo",
    estoqueAtual: 15,
  },
  {
    id: "prd-003",
    skuInterno: "PRD-000103",
    referenciaComercial: "TIG-3410",
    codigoBarras: "7891234500035",
    nome: "Tubo PVC soldável 25mm",
    marca: "Tigre",
    unidadeMedida: "M",
    permiteFracionado: true,
    precoVenda: 8.75,
    status: "ativo",
    estoqueAtual: 320,
  },
  {
    id: "prd-004",
    skuInterno: "PRD-000104",
    referenciaComercial: "AMN-5521",
    nome: "Conexão joelho 90° 25mm",
    marca: "Amanco",
    unidadeMedida: "UN",
    permiteFracionado: false,
    precoVenda: 2.4,
    status: "inativo",
    estoqueAtual: 0,
  },
  {
    id: "prd-005",
    skuInterno: "PRD-000105",
    referenciaComercial: "GER-7788",
    codigoBarras: "7891234500059",
    nome: "Vergalhão CA-50 10mm",
    marca: "Gerdau",
    unidadeMedida: "KG",
    permiteFracionado: true,
    precoVenda: 6.9,
    status: "ativo",
    estoqueAtual: 1240,
  },
  {
    id: "prd-006",
    skuInterno: "PRD-000106",
    referenciaComercial: "BLG-2031",
    codigoBarras: "7891234500066",
    nome: "Arame recozido nº 18",
    marca: "Belgo",
    unidadeMedida: "KG",
    permiteFracionado: true,
    precoVenda: 12.3,
    status: "ativo",
    estoqueAtual: 87,
  },
  {
    id: "prd-007",
    skuInterno: "PRD-000107",
    referenciaComercial: "3M-9910",
    codigoBarras: "7891234500073",
    nome: "Fita isolante 19mm x 20m",
    marca: "3M",
    unidadeMedida: "UN",
    permiteFracionado: false,
    precoVenda: 9.9,
    status: "ativo",
    estoqueAtual: 210,
  },
  {
    id: "prd-008",
    skuInterno: "PRD-000108",
    referenciaComercial: "SUV-4402",
    codigoBarras: "7891234500080",
    nome: "Tinta acrílica fosca branca 18L",
    marca: "Suvinil",
    unidadeMedida: "CX",
    permiteFracionado: false,
    precoVenda: 279.9,
    status: "inativo",
    estoqueAtual: 6,
  },
]
