import type { Produto } from "@/types/domain"

export const CATEGORIAS = [
  "Ferramentas Manuais",
  "Ferramentas Elétricas",
  "Hidráulica & Encanamento",
  "Construção",
  "Acabamento",
] as const

export type Categoria = (typeof CATEGORIAS)[number]

export function obterCategoriaProduto(produto: Produto): Categoria {
  return (produto.categoria as Categoria) || "Ferramentas Manuais"
}

export function obterFornecedorProduto(produto: Produto): string {
  return produto.fornecedor || "Desconhecido"
}

/**
 * Status do estoque: "Normal" / "Estoque baixo" / "Sem estoque"
 *
 * Regra:
 * - Disponível === 0 → "Sem estoque"
 * - Disponível <= Mínimo → "Estoque baixo"
 * - Caso contrário → "Normal"
 */
export type InventarioStatus = "normal" | "baixo" | "zerado"

export function calcularStatusEstoque(
  disponivel: number,
  estoqueMinimo: number
): InventarioStatus {
  if (disponivel === 0) return "zerado"
  if (disponivel <= estoqueMinimo) return "baixo"
  return "normal"
}
