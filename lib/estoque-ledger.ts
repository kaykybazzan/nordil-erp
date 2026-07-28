import type { EstoqueMovimentacao, TipoEstoqueMovimentacao } from "@/types/domain"
import { prisma } from "./db"

export async function aplicarMovimentacao(input: {
  produtoId: string
  tipo: TipoEstoqueMovimentacao
  quantidade: number
  pedidoId?: string
  direcao?: "ENTRADA" | "SAIDA"
  usuarioId: string
}, tx?: any): Promise<void> {
  const db = tx ?? prisma

  // Buscar empresaId do produto
  const produto = await db.produto.findUnique({
    where: { id: input.produtoId },
    select: { empresaId: true },
  })

  if (!produto) {
    throw new Error("Produto não encontrado")
  }

  await db.estoqueMovimentacao.create({
    data: {
      empresaId: produto.empresaId,
      produtoId: input.produtoId,
      tipo: input.tipo,
      quantidade: input.quantidade,
      pedidoId: input.pedidoId,
      direcao: input.direcao,
      usuarioId: input.usuarioId,
    },
  })
}

// Wrapper para compatibilidade com código legado que ainda usa registrarMovimentacao
// (ex: lib/inventario-contagem-store.ts)
export async function registrarMovimentacao(movimentacao: {
  id: string
  empresaId: string
  produtoId: string
  tipo: TipoEstoqueMovimentacao
  quantidade: number
  dataHora: string
  usuarioId: string
  direcao?: "ENTRADA" | "SAIDA"
  pedidoId?: string
}): Promise<void> {
  await aplicarMovimentacao({
    produtoId: movimentacao.produtoId,
    tipo: movimentacao.tipo,
    quantidade: movimentacao.quantidade,
    pedidoId: movimentacao.pedidoId,
    direcao: movimentacao.direcao,
    usuarioId: movimentacao.usuarioId,
  })
}

export async function calcularReservado(produtoId: string, empresaId: string): Promise<number> {
  const movimentacoes = await prisma.estoqueMovimentacao.findMany({
    where: { produtoId, empresaId },
  })

  const total = movimentacoes.reduce((acc, m) => {
    if (m.tipo === "RESERVA") {
      return acc + Number(m.quantidade)
    } else if (m.tipo === "LIBERACAO_RESERVA" || m.tipo === "SAIDA") {
      return acc - Number(m.quantidade)
    }
    return acc
  }, 0)

  return Math.max(0, total)
}

export async function obterMovimentacoes(empresaId: string, produtoId?: string) {
  const movimentacoes = await prisma.estoqueMovimentacao.findMany({
    where: { empresaId, ...(produtoId ? { produtoId } : {}) },
    orderBy: { dataHora: "desc" },
  })
  return movimentacoes.map((m) => ({
    id: m.id,
    empresaId: m.empresaId,
    produtoId: m.produtoId,
    tipo: m.tipo as TipoEstoqueMovimentacao,
    quantidade: Number(m.quantidade),
    pedidoId: m.pedidoId ?? undefined,
    dataHora: m.dataHora.toISOString(),
    usuarioId: m.usuarioId,
    direcao: (m.direcao ?? undefined) as "ENTRADA" | "SAIDA" | undefined,
  }))
}