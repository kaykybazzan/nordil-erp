"use client"

import type { Inventario, Produto } from "@/types/domain"
import { MOCK_PRODUTOS } from "./mock-produtos"

/**
 * Categorias do catálogo — usadas no filtro da tela de estoque.
 * Mapeadas aqui, mas em produção viriam de uma tabela de referência.
 */
export const CATEGORIAS = [
  "Ferramentas Manuais",
  "Ferramentas Elétricas",
  "Hidráulica & Encanamento",
  "Construção",
  "Acabamento",
] as const

export type Categoria = (typeof CATEGORIAS)[number]

/**
 * Mapa produto → categoria. Em produção, categoria seria um campo do Produto.
 */
const PRODUTO_CATEGORIA_MAP: Record<string, Categoria> = {
  "prd-001": "Ferramentas Manuais",
  "prd-002": "Ferramentas Elétricas",
  "prd-003": "Hidráulica & Encanamento",
  "prd-004": "Hidráulica & Encanamento",
  "prd-005": "Construção",
  "prd-006": "Construção",
  "prd-007": "Acabamento",
  "prd-008": "Acabamento",
}

/**
 * Mapa produto → fornecedor. Em produção, seria uma relação de tabela.
 */
const PRODUTO_FORNECEDOR_MAP: Record<string, string> = {
  "prd-001": "Tramontina",
  "prd-002": "Vonder",
  "prd-003": "Tigre",
  "prd-004": "Amanco",
  "prd-005": "Gerdau",
  "prd-006": "Belgo",
  "prd-007": "3M",
  "prd-008": "Suvinil",
}

/**
 * Estoques mínimos por produto. Em produção, seria um campo da tabela Inventario.
 */
const ESTOQUE_MINIMO_MAP: Record<string, number> = {
  "prd-001": 20,
  "prd-002": 5,
  "prd-003": 100,
  "prd-004": 50,
  "prd-005": 500,
  "prd-006": 50,
  "prd-007": 50,
  "prd-008": 10,
}

/**
 * Reservas (quantidade comprometida em pedidos aguardando separação).
 * Em produção, calculada dinamicamente a partir das tabelas de pedidos.
 */
const RESERVADO_MAP: Record<string, number> = {
  "prd-001": 5,
  "prd-002": 2,
  "prd-003": 30,
  "prd-004": 8,
  "prd-005": 100,
  "prd-006": 10,
  "prd-007": 20,
  "prd-008": 2,
}

/**
 * Retorna a categoria de um produto pelo ID.
 * Em produção, seria um campo desnormalizado ou consultado via join.
 */
export function obterCategoriaProduto(produtoId: string): Categoria {
  return PRODUTO_CATEGORIA_MAP[produtoId] || "Ferramentas Manuais"
}

/**
 * Retorna o fornecedor de um produto pelo ID.
 */
export function obterFornecedorProduto(produtoId: string): string {
  return PRODUTO_FORNECEDOR_MAP[produtoId] || "Desconhecido"
}

/**
 * Calcula o inventário agregado para um produto.
 *
 * Disponível = max(0, estoqueFisico - reservado)
 * Nunca exibe número negativo.
 */
export function calcularInventario(
  produto: Produto,
  ultimaMovimentacao: string = new Date().toISOString()
): Inventario {
  const estoqueFisico = produto.estoqueAtual
  const reservado = RESERVADO_MAP[produto.id] || 0
  const estoqueMinimo = ESTOQUE_MINIMO_MAP[produto.id] || 10
  const disponivel = Math.max(0, estoqueFisico - reservado)

  return {
    produtoId: produto.id,
    estoqueFisico,
    reservado,
    disponivel,
    estoqueMinimo,
    ultimaMovimentacao,
  }
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

/**
 * Carrega todos os inventários agregados.
 * Em produção, viria do backend com paginação e filtros aplicados lá.
 */
export function carregarInventarios(): (Inventario & {
  produto: Produto
  categoria: Categoria
  fornecedor: string
  status: InventarioStatus
})[] {
  return MOCK_PRODUTOS.map((produto) => {
    const inv = calcularInventario(produto)
    const status = calcularStatusEstoque(inv.disponivel, inv.estoqueMinimo)
    return {
      ...inv,
      produto,
      categoria: obterCategoriaProduto(produto.id),
      fornecedor: obterFornecedorProduto(produto.id),
      status,
    }
  })
}
