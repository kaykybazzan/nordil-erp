"use server"

import { auth } from "@/lib/auth"
import { aplicarMovimentacao, obterMovimentacoes } from "@/lib/estoque-ledger"
import { carregarInventarios } from "@/lib/mock-inventario"
import { calcularIndicadoresEstoque } from "@/lib/relatorios-estoque"
import { calcularIndicadoresMovimentacoes } from "@/lib/relatorios-movimentacoes"
import { z } from "zod"

const aplicarMovimentacaoSchema = z.object({
  produtoId: z.string().min(1),
  tipo: z.enum(["RESERVA", "LIBERACAO_RESERVA", "SAIDA", "ENTRADA", "ENTRADA_DEVOLUCAO", "AJUSTE"]),
  quantidade: z.number().positive(),
  pedidoId: z.string().optional(),
  direcao: z.enum(["ENTRADA", "SAIDA"]).optional(),
})

export async function actionAplicarMovimentacao(input: {
  produtoId: string
  tipo: "RESERVA" | "LIBERACAO_RESERVA" | "SAIDA" | "ENTRADA" | "ENTRADA_DEVOLUCAO" | "AJUSTE"
  quantidade: number
  pedidoId?: string
  direcao?: "ENTRADA" | "SAIDA"
}, tx?: any) {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado." }
  }

  const validationResult = aplicarMovimentacaoSchema.safeParse(input)
  if (!validationResult.success) {
    return { ok: false, error: "Dados inválidos." }
  }

  try {
    await aplicarMovimentacao({
      produtoId: input.produtoId,
      tipo: input.tipo,
      quantidade: input.quantidade,
      pedidoId: input.pedidoId,
      direcao: input.direcao,
      usuarioId: session.user.id,
    }, tx)
    return { ok: true, data: null }
  } catch (error) {
    console.error("Erro ao aplicar movimentação:", error)
    return { ok: false, error: "Erro ao aplicar movimentação." }
  }
}

export async function actionObterMovimentacoes(input: { produtoId?: string }) {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado." }
  }
  try {
    const data = await obterMovimentacoes(session.user.empresaId, input.produtoId)
    return { ok: true, data }
  } catch (error) {
    console.error("Erro ao obter movimentações:", error)
    return { ok: false, error: "Erro ao obter movimentações." }
  }
}

export async function actionCarregarInventarios() {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado." }
  }
  try {
    const data = await carregarInventarios(session.user.empresaId)
    return { ok: true, data }
  } catch (error) {
    console.error("Erro ao carregar inventários:", error)
    return { ok: false, error: "Erro ao carregar inventários." }
  }
}

export async function actionCalcularIndicadoresEstoque(input: {
  categoriaId?: string
  produtoId?: string
}) {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado." }
  }
  try {
    const data = await calcularIndicadoresEstoque(session.user.empresaId, input)
    return { ok: true, data }
  } catch (error) {
    console.error("Erro ao calcular indicadores de estoque:", error)
    return { ok: false, error: "Erro ao calcular indicadores de estoque." }
  }
}

export async function actionCalcularIndicadoresMovimentacoes(input: {
  dataInicio: string
  dataFim: string
  tipo?: string
  produtoId?: string
  operadorId?: string
}) {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado." }
  }
  try {
    const data = await calcularIndicadoresMovimentacoes(
      session.user.empresaId,
      new Date(input.dataInicio),
      new Date(input.dataFim),
      {
        tipo: input.tipo as any,
        produtoId: input.produtoId,
        operadorId: input.operadorId,
      }
    )
    return { ok: true, data }
  } catch (error) {
    console.error("Erro ao calcular indicadores de movimentações:", error)
    return { ok: false, error: "Erro ao calcular indicadores de movimentações." }
  }
}
