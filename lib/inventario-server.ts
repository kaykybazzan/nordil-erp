import type { InventarioEstoque, Produto } from "@/types/domain"
import { prisma } from "./db"
import { calcularReservado } from "./estoque-ledger"
import { obterCategoriaProduto, obterFornecedorProduto, calcularStatusEstoque, type Categoria, type InventarioStatus } from "./inventario-utils"

/**
 * Calcula o inventário agregado para um produto.
 *
 * Disponível = max(0, estoqueFisico - reservado)
 * Nunca exibe número negativo.
 */
export async function calcularInventario(
  produto: Produto,
  ultimaMovimentacao: string = new Date().toISOString()
): Promise<InventarioEstoque> {
  const estoqueFisico = produto.estoqueAtual
  const reservado = await calcularReservado(produto.id, produto.empresaId)
  const estoqueMinimo = produto.estoqueMinimo ?? 10
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
 * Carrega todos os inventários agregados.
 * Em produção, viria do backend com paginação e filtros aplicados lá.
 */
export async function carregarInventarios(empresaId: string): Promise<(InventarioEstoque & {
  produto: Produto
  categoria: Categoria
  fornecedor: string
  status: InventarioStatus
})[]> {
  const produtos = await prisma.produto.findMany({
    where: {
      empresaId,
    },
    orderBy: { createdAt: "desc" },
  })

  const inventarios = []
  for (const produto of produtos) {
    const produtoFormatado: Produto = {
      id: produto.id,
      empresaId: produto.empresaId,
      skuInterno: produto.skuInterno,
      referenciaComercial: produto.referenciaComercial ?? undefined,
      codigoBarras: produto.codigoBarras ?? undefined,
      nome: produto.nome,
      marca: produto.marca,
      unidadeMedida: produto.unidadeMedida as "UN" | "M" | "KG" | "CX",
      permiteFracionado: produto.permiteFracionado,
      custo: Number(produto.custo),
      precoVenda: Number(produto.precoVenda),
      status: produto.status as "ativo" | "inativo",
      estoqueAtual: produto.estoqueAtual,
      corredor: produto.corredor ?? undefined,
      categoria: produto.categoria ?? undefined,
      fornecedor: produto.fornecedor ?? undefined,
      estoqueMinimo: produto.estoqueMinimo,
    }

    const inv = await calcularInventario(produtoFormatado)
    const status = calcularStatusEstoque(inv.disponivel, inv.estoqueMinimo)
    inventarios.push({
      ...inv,
      produto: produtoFormatado,
      categoria: obterCategoriaProduto(produtoFormatado),
      fornecedor: obterFornecedorProduto(produtoFormatado),
      status,
    })
  }
  return inventarios
}
