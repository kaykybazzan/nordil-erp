"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionAplicarMovimentacao } from "@/lib/actions/estoque"
import { actionRegistrarAuditoria } from "@/lib/actions/auditoria"
import { podeGerenciarDevolucao } from "@/lib/policies"
import { z } from "zod"

// Motivos válidos (lowercase, conforme comentário no schema)
const MOTIVOS_VALIDOS = ["avariado", "incorreto", "defeito", "desistencia", "excesso", "outro"] as const
type MotivoValido = typeof MOTIVOS_VALIDOS[number]

const SolicitarDevolucaoItemSchema = z.object({
  itemPedidoId: z.string().min(1, "Item do pedido é obrigatório"),
  quantidadeSolicitada: z.number().positive("Quantidade deve ser maior que zero"),
})

const SolicitarDevolucaoSchema = z.object({
  pedidoId: z.string().min(1, "Pedido é obrigatório"),
  itens: z.array(SolicitarDevolucaoItemSchema).min(1, "Pelo menos um item é obrigatório"),
  motivo: z.enum(MOTIVOS_VALIDOS),
  motivoDescricao: z.string().optional(),
})

const ConfirmarDevolucaoItemSchema = z.object({
  itemPedidoId: z.string().min(1, "Item do pedido é obrigatório"),
  quantidadeConfirmada: z.number().min(0, "Quantidade não pode ser negativa"),
  observacaoAjuste: z.string().optional(),
})

const ConfirmarDevolucaoSchema = z.object({
  itens: z.array(ConfirmarDevolucaoItemSchema).min(1, "Pelo menos um item é obrigatório"),
})

type ResultadoAcao<T> = { ok: true; data: T } | { ok: false; error: string }

// Helper interno: calcular saldo devolvível
async function calcularSaldoDevolvivel(pedidoId: string, itemPedidoId: string, empresaId: string): Promise<number> {
  // Buscar quantidade vendida
  const itemPedido = await prisma.itemPedido.findUnique({
    where: { id: itemPedidoId },
    select: { quantidade: true },
  })

  if (!itemPedido) return 0

  const quantidadeVendida = Number(itemPedido.quantidade)

  // Somar quantidadeSolicitada de devoluções SOLICITADA + quantidadeConfirmada de devoluções CONCLUIDA
  const devolucoes = await prisma.devolucao.findMany({
    where: {
      pedidoId,
      empresaId,
      status: { in: ["SOLICITADA", "CONCLUIDA"] },
    },
    include: {
      itens: {
        where: { itemPedidoId },
      },
    },
  })

  const totalJaDevolvidoOuEmAndamento = devolucoes.reduce((acc: number, devolucao: any) => {
    const item = devolucao.itens[0]
    if (!item) return acc

    if (devolucao.status === "SOLICITADA") {
      return acc + Number(item.quantidadeSolicitada)
    } else if (devolucao.status === "CONCLUIDA") {
      return acc + Number(item.quantidadeConfirmada ?? 0)
    }
    return acc
  }, 0)

  return Math.max(0, quantidadeVendida - totalJaDevolvidoOuEmAndamento)
}

export async function actionSolicitarDevolucao(input: {
  pedidoId: string
  itens: { itemPedidoId: string; quantidadeSolicitada: number }[]
  motivo: MotivoValido
  motivoDescricao?: string
}): Promise<ResultadoAcao<{ id: string }>> {
  const session = await auth()
  if (!session?.user?.empresaId || !session?.user?.id) {
    return { ok: false, error: "Não autenticado." }
  }

  const validationResult = SolicitarDevolucaoSchema.safeParse(input)
  if (!validationResult.success) {
    return { ok: false, error: "Dados inválidos." }
  }

  const { pedidoId, itens, motivo, motivoDescricao } = input
  const empresaId = session.user.empresaId
  const solicitadoPorId = session.user.id

  // Validação: motivo OUTRO exige motivoDescricao
  if (motivo === "outro" && !motivoDescricao?.trim()) {
    return { ok: false, error: "Para motivo 'outro', é obrigatório informar o texto explicativo." }
  }

  try {
    // Validação: verificar se pedido existe e pertence à empresa
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { itens: true },
    })

    if (!pedido || pedido.empresaId !== empresaId) {
      return { ok: false, error: "Pedido não encontrado." }
    }

    const pedidoNumero = pedido.numero

    // Validação: verificar se cada itemPedidoId pertence ao pedido
    for (const item of itens) {
      const itemPedido = pedido.itens.find((i) => i.id === item.itemPedidoId)
      if (!itemPedido) {
        return { ok: false, error: `Item ${item.itemPedidoId} não pertence ao pedido informado.` }
      }
    }

    // Validação: verificar se já existe devolução SOLICITADA para algum itemPedidoId
    for (const item of itens) {
      const jaExisteSolicitacao = await prisma.devolucao.findFirst({
        where: {
          pedidoId,
          empresaId,
          status: "SOLICITADA",
          itens: {
            some: { itemPedidoId: item.itemPedidoId },
          },
        },
      })

      if (jaExisteSolicitacao) {
        return { ok: false, error: `Já existe uma devolução solicitada para o item ${item.itemPedidoId}. Aguarde a conclusão ou cancelamento da solicitação anterior.` }
      }
    }

    // Validação: verificar saldo devolvível para cada item
    for (const item of itens) {
      const saldo = await calcularSaldoDevolvivel(pedidoId, item.itemPedidoId, empresaId)
      if (item.quantidadeSolicitada > saldo) {
        return { ok: false, error: `Quantidade solicitada (${item.quantidadeSolicitada}) excede o saldo devolvível (${saldo}) para o item ${item.itemPedidoId}.` }
      }
    }

    // Criar devolução e itens em transação
    const devolucao = await prisma.$transaction(async (tx) => {
      const novaDevolucao = await tx.devolucao.create({
        data: {
          empresaId,
          pedidoId,
          status: "SOLICITADA",
          motivo,
          motivoDescricao: motivo === "outro" ? motivoDescricao : null,
          solicitadoPorId,
        },
      })

      const itensDevolucao = await tx.itemDevolucao.createMany({
        data: itens.map((item) => ({
          devolucaoId: novaDevolucao.id,
          itemPedidoId: item.itemPedidoId,
          quantidadeSolicitada: item.quantidadeSolicitada,
        })),
      })

      return novaDevolucao
    })

    // Registrar auditoria
    const auditResult = await actionRegistrarAuditoria({
      modulo: "DEVOLUCOES",
      acao: "CRIADO",
      entidadeId: devolucao.id,
      entidadeDescricao: `Devolução do Pedido #${pedidoNumero}`,
      descricao: `Devolução solicitada para pedido ${pedidoId}.`,
    })

    if (!auditResult.ok) {
      console.error("Erro ao registrar auditoria:", auditResult.error)
    }

    return { ok: true, data: { id: devolucao.id } }
  } catch (error) {
    console.error("Erro ao solicitar devolução:", error)
    return { ok: false, error: "Erro ao solicitar devolução." }
  }
}

export async function actionConfirmarDevolucao(
  devolucaoId: string,
  input: {
    itens: { itemPedidoId: string; quantidadeConfirmada: number; observacaoAjuste?: string }[]
  }
): Promise<ResultadoAcao<{ id: string }>> {
  const session = await auth()
  if (!session?.user?.empresaId || !session?.user?.id) {
    return { ok: false, error: "Não autenticado." }
  }

  const validationResult = ConfirmarDevolucaoSchema.safeParse(input)
  if (!validationResult.success) {
    return { ok: false, error: "Dados inválidos." }
  }

  // Validação: permissão
  if (!podeGerenciarDevolucao(session.user as any)) {
    return { ok: false, error: "Sem permissão para gerenciar devoluções." }
  }

  const { itens } = input
  const empresaId = session.user.empresaId
  const confirmadoPorId = session.user.id

  try {
    // Buscar devolução com itens
    const devolucao = await prisma.devolucao.findUnique({
      where: { id: devolucaoId },
      include: {
        itens: {
          include: {
            itemPedido: {
              select: {
                quantidade: true,
                produtoId: true,
              },
            },
          },
        },
      },
    })

    if (!devolucao || devolucao.empresaId !== empresaId) {
      return { ok: false, error: "Devolução não encontrada." }
    }

    // Validação: status deve ser SOLICITADA
    if (devolucao.status !== "SOLICITADA") {
      return { ok: false, error: "Só é possível confirmar devoluções com status SOLICITADA." }
    }

    // Validação: input.itens deve cobrir EXATAMENTE todos os itens da devolução
    for (const itemOriginal of devolucao.itens) {
      const itemConfirmado = itens.find((i) => i.itemPedidoId === itemOriginal.itemPedidoId)
      if (!itemConfirmado) {
        return { ok: false, error: `Confirmação deve incluir todos os itens da devolução. Item ${itemOriginal.itemPedidoId} está faltando.` }
      }
    }

    // Validações por item
    for (const itemOriginal of devolucao.itens) {
      const itemConfirmado = itens.find((i) => i.itemPedidoId === itemOriginal.itemPedidoId)
      if (!itemConfirmado) continue

      const quantidadeSolicitada = Number(itemOriginal.quantidadeSolicitada)
      const quantidadeConfirmada = itemConfirmado.quantidadeConfirmada

      // Validação: quantidadeConfirmada nunca pode ser maior que quantidadeSolicitada
      if (quantidadeConfirmada > quantidadeSolicitada) {
        return { ok: false, error: `Quantidade confirmada (${quantidadeConfirmada}) não pode exceder a quantidade solicitada (${quantidadeSolicitada}) para o item ${itemOriginal.itemPedidoId}.` }
      }

      // Validação: observacaoAjuste obrigatória quando quantidadeConfirmada < quantidadeSolicitada
      if (quantidadeConfirmada < quantidadeSolicitada && !itemConfirmado.observacaoAjuste?.trim()) {
        return { ok: false, error: `Observação de ajuste é obrigatória para o item ${itemOriginal.itemPedidoId} pois a quantidade confirmada (${quantidadeConfirmada}) é menor que a solicitada (${quantidadeSolicitada}).` }
      }

      // Validação cumulativa: quantidadeConfirmada + outras devoluções CONCLUIDA não pode exceder quantidade originalmente comprada
      const quantidadeVendida = Number(itemOriginal.itemPedido.quantidade)

      // Somar quantidadeConfirmada de outras devoluções CONCLUIDA para este item (excluindo a atual)
      const totalOutrasConcluidas = await prisma.itemDevolucao.aggregate({
        where: {
          itemPedidoId: itemOriginal.itemPedidoId,
          devolucao: {
            pedidoId: devolucao.pedidoId,
            empresaId,
            status: "CONCLUIDA",
            id: { not: devolucaoId },
          },
        },
        _sum: {
          quantidadeConfirmada: true,
        },
      })

      const totalOutras = Number(totalOutrasConcluidas._sum.quantidadeConfirmada ?? 0)
      const totalAposConfirmacao = totalOutras + quantidadeConfirmada

      if (totalAposConfirmacao > quantidadeVendida) {
        return { ok: false, error: `Quantidade confirmada (${quantidadeConfirmada}) somada a outras devoluções já concluídas (${totalOutras}) excede a quantidade originalmente comprada (${quantidadeVendida}) para o item ${itemOriginal.itemPedidoId}.` }
      }
    }

    // Atualizar devolução e itens em transação
    await prisma.$transaction(async (tx) => {
      // Atualizar itens
      for (const itemConfirmado of itens) {
        await tx.itemDevolucao.updateMany({
          where: {
            devolucaoId,
            itemPedidoId: itemConfirmado.itemPedidoId,
          },
          data: {
            quantidadeConfirmada: itemConfirmado.quantidadeConfirmada,
            observacaoAjuste: itemConfirmado.observacaoAjuste,
          },
        })
      }

      // Atualizar devolução
      await tx.devolucao.update({
        where: { id: devolucaoId },
        data: {
          status: "CONCLUIDA",
          confirmadoPorId,
        },
      })

      // Lançar ENTRADA_DEVOLUCAO no ledger para cada item confirmado com quantidade > 0
      for (const itemOriginal of devolucao.itens) {
        const itemConfirmado = itens.find((i) => i.itemPedidoId === itemOriginal.itemPedidoId)
        if (!itemConfirmado) continue

        if (itemConfirmado.quantidadeConfirmada > 0) {
          const produtoId = itemOriginal.itemPedido.produtoId
          const resultadoMovimentacao = await actionAplicarMovimentacao({
            produtoId,
            tipo: "ENTRADA_DEVOLUCAO",
            quantidade: itemConfirmado.quantidadeConfirmada,
            pedidoId: devolucao.pedidoId,
          }, tx)

          if (!resultadoMovimentacao.ok) {
            throw new Error(`Falha ao lançar entrada de devolução: ${resultadoMovimentacao.error}`)
          }
        }
      }
    })

    // Registrar auditoria
    const pedido = await prisma.pedido.findUnique({
      where: { id: devolucao.pedidoId },
      select: { numero: true },
    })
    const auditResult = await actionRegistrarAuditoria({
      modulo: "DEVOLUCOES",
      acao: "STATUS_ALTERADO",
      entidadeId: devolucaoId,
      entidadeDescricao: `Devolução do Pedido #${pedido?.numero}`,
      descricao: `Devolução confirmada e concluída para pedido ${devolucao.pedidoId}.`,
    })

    if (!auditResult.ok) {
      console.error("Erro ao registrar auditoria:", auditResult.error)
    }

    return { ok: true, data: { id: devolucaoId } }
  } catch (error) {
    console.error("Erro ao confirmar devolução:", error)
    return { ok: false, error: "Erro ao confirmar devolução." }
  }
}

export async function actionCancelarDevolucao(devolucaoId: string): Promise<ResultadoAcao<{ id: string }>> {
  const session = await auth()
  if (!session?.user?.empresaId || !session?.user?.id) {
    return { ok: false, error: "Não autenticado." }
  }

  // Validação: permissão
  if (!podeGerenciarDevolucao(session.user as any)) {
    return { ok: false, error: "Sem permissão para gerenciar devoluções." }
  }

  const empresaId = session.user.empresaId
  const canceladoPorId = session.user.id

  try {
    const devolucao = await prisma.devolucao.findUnique({
      where: { id: devolucaoId },
    })

    if (!devolucao || devolucao.empresaId !== empresaId) {
      return { ok: false, error: "Devolução não encontrada." }
    }

    // Validação: status deve ser SOLICITADA
    if (devolucao.status !== "SOLICITADA") {
      return { ok: false, error: "Só é possível cancelar devoluções com status SOLICITADA." }
    }

    // Atualizar devolução
    await prisma.devolucao.update({
      where: { id: devolucaoId },
      data: {
        status: "CANCELADA",
        canceladoPorId,
      },
    })

    // Registrar auditoria
    const pedido = await prisma.pedido.findUnique({
      where: { id: devolucao.pedidoId },
      select: { numero: true },
    })
    const auditResult = await actionRegistrarAuditoria({
      modulo: "DEVOLUCOES",
      acao: "CANCELADO",
      entidadeId: devolucaoId,
      entidadeDescricao: `Devolução do Pedido #${pedido?.numero}`,
      descricao: `Devolução cancelada para pedido ${devolucao.pedidoId}.`,
    })

    if (!auditResult.ok) {
      console.error("Erro ao registrar auditoria:", auditResult.error)
    }

    return { ok: true, data: { id: devolucaoId } }
  } catch (error) {
    console.error("Erro ao cancelar devolução:", error)
    return { ok: false, error: "Erro ao cancelar devolução." }
  }
}

export async function actionCalcularSaldoDevolvivel(
  pedidoId: string,
  itemPedidoId: string
): Promise<ResultadoAcao<{ saldo: number }>> {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado." }
  }

  try {
    const saldo = await calcularSaldoDevolvivel(pedidoId, itemPedidoId, session.user.empresaId)
    return { ok: true, data: { saldo } }
  } catch (error) {
    console.error("Erro ao calcular saldo devolvível:", error)
    return { ok: false, error: "Erro ao calcular saldo devolvível." }
  }
}

export async function actionListarDevolucoes(filtros?: {
  status?: string
  pedidoId?: string
}): Promise<ResultadoAcao<any>> {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado." }
  }

  try {
    const where: any = {
      empresaId: session.user.empresaId,
    }

    if (filtros?.status) {
      where.status = filtros.status
    }

    if (filtros?.pedidoId) {
      where.pedidoId = filtros.pedidoId
    }

    const devolucoes = await prisma.devolucao.findMany({
      where,
      include: {
        itens: {
          include: {
            itemPedido: {
              select: { produtoId: true },
            },
          },
        },
      },
      orderBy: {
        criadoEm: "desc",
      },
    })

    // Converter Decimal para Number para evitar erro de serialização
    const devolucoesConvertidas = devolucoes.map((d: any) => ({
      ...d,
      itens: d.itens.map((i: any) => ({
        ...i,
        quantidadeSolicitada: Number(i.quantidadeSolicitada),
        quantidadeConfirmada: i.quantidadeConfirmada ? Number(i.quantidadeConfirmada) : null,
      })),
    }))

    return { ok: true, data: devolucoesConvertidas }
  } catch (error) {
    console.error("Erro ao listar devoluções:", error)
    return { ok: false, error: "Erro ao listar devoluções." }
  }
}
