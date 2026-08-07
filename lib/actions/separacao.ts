"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionRegistrarAuditoria } from "@/lib/actions/auditoria"
import { podeOperarSeparacao } from "@/lib/pedidos"
import { z } from "zod"
import type { StatusPedido, PendenciaPedido, StatusItemPedido } from "@/types/domain"

const iniciarSeparacaoSchema = z.object({
  pedidoId: z.string().min(1),
})



const devolverAFilaSchema = z.object({
  pedidoId: z.string().min(1),
})



const finalizarSeparacaoSchema = z.object({
  pedidoId: z.string().min(1),
  itens: z.array(z.object({
    itemPedidoId: z.string().min(1),
    quantidadeSeparada: z.number().nonnegative(),
  })),
})

const forcarLiberacaoLockSchema = z.object({
  pedidoId: z.string().min(1),
})

// Helper para formatar Pedido do Prisma para tipo domain
function formatarPedido(pedido: any): any {
  return {
    id: pedido.id,
    numero: pedido.numero,
    clienteId: pedido.clienteId,
    vendedorId: pedido.vendedorId,
    endereco: {
      enderecoId: pedido.enderecoRefId ?? undefined,
      logradouro: pedido.enderecoLogradouro,
      numero: pedido.enderecoNumero,
      bairro: pedido.enderecoBairro,
      cidade: pedido.enderecoCidade,
      uf: pedido.enderecoUf,
      cep: pedido.enderecoCep,
    },
    itens: pedido.itens.map((item: any) => ({
      id: item.id,
      produtoId: item.produtoId,
      quantidade: Number(item.quantidade),
      precoUnitario: Number(item.precoUnitario),
      desconto: Number(item.desconto),
      status: item.status as StatusItemPedido,
      quantidadeSeparada: item.quantidadeSeparada ? Number(item.quantidadeSeparada) : undefined,
    })),
    observacao: pedido.observacao ?? undefined,
    transportadora: pedido.transportadora ?? undefined,
    status: pedido.status as StatusPedido,
    pendencia: pedido.pendencia as PendenciaPedido,
    valorTotal: Number(pedido.valorTotal),
    criadoEm: pedido.criadoEm.toISOString(),
    statusAlteradoEm: pedido.statusAlteradoEm.toISOString(),
    eventos: pedido.eventos.map((evt: any) => ({
      id: evt.id,
      tipo: evt.tipo,
      descricao: evt.descricao,
      dataHora: evt.dataHora.toISOString(),
      usuarioId: evt.usuarioId,
    })),
    motivoCancelamento: pedido.motivoCancelamento ?? undefined,
    separadorId: pedido.separadorId ?? undefined,
  }
}

export async function actionListarFilaSeparacao() {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado." }
  }

  try {
    const pedidos = await prisma.pedido.findMany({
      where: {
        empresaId: session.user.empresaId,
        OR: [
          { status: "RESERVADO" },
          { status: "EM_SEPARACAO", separadorId: { not: null } },
        ],
      },
      include: { itens: true, eventos: true },
      orderBy: { statusAlteradoEm: "asc" },
    })

    return { ok: true, data: pedidos.map(formatarPedido) }
  } catch (error) {
    console.error("Erro ao listar fila de separação:", error)
    return { ok: false, error: "Erro ao listar fila de separação." }
  }
}

export async function actionIniciarSeparacao(input: { pedidoId: string }) {
  const session = await auth()
  if (!session?.user?.empresaId || !session.user.id) {
    return { ok: false, error: "Não autenticado." }
  }

  const validationResult = iniciarSeparacaoSchema.safeParse(input)
  if (!validationResult.success) {
    return { ok: false, error: "Dados inválidos." }
  }

  try {
    const pedido = await prisma.pedido.findFirst({
      where: { id: input.pedidoId, empresaId: session.user.empresaId },
      include: { itens: true, eventos: true },
    })

    if (!pedido) {
      return { ok: false, error: "Pedido não encontrado." }
    }

    if (pedido.status !== "RESERVADO") {
      return { ok: false, error: "Pedido não está disponível para separação." }
    }

    const pedidoFormatado = formatarPedido(pedido)
    if (!podeOperarSeparacao(pedidoFormatado, session.user)) {
      return { ok: false, error: "Sem permissão para operar separação." }
    }

    await prisma.pedido.update({
      where: { id: input.pedidoId },
      data: {
        status: "EM_SEPARACAO",
        separadorId: session.user.id,
      },
    })

    await prisma.pedidoEvento.create({
      data: {
        pedidoId: input.pedidoId,
        tipo: "SEPARACAO_INICIADA",
        descricao: "Separação iniciada.",
        usuarioId: session.user.id,
      },
    })

    await actionRegistrarAuditoria({
      modulo: "PEDIDOS",
      acao: "ATUALIZADO",
      entidadeId: input.pedidoId,
      descricao: `Separação iniciada por ${session.user.name || session.user.email}.`,
    })

    const pedidoAtualizado = await prisma.pedido.findUnique({
      where: { id: input.pedidoId },
      include: { itens: true, eventos: true },
    })

    return { ok: true, data: formatarPedido(pedidoAtualizado!) }
  } catch (error) {
    console.error("Erro ao iniciar separação:", error)
    return { ok: false, error: "Erro ao iniciar separação." }
  }
}

export async function actionDevolverAFila(input: { pedidoId: string }) {
  const session = await auth()
  if (!session?.user?.empresaId || !session.user.id) {
    return { ok: false, error: "Não autenticado." }
  }

  const validationResult = devolverAFilaSchema.safeParse(input)
  if (!validationResult.success) {
    return { ok: false, error: "Dados inválidos." }
  }

  try {
    const pedido = await prisma.pedido.findFirst({
      where: { id: input.pedidoId, empresaId: session.user.empresaId },
      include: { itens: true, eventos: true },
    })

    if (!pedido) {
      return { ok: false, error: "Pedido não encontrado." }
    }

    if (pedido.status !== "EM_SEPARACAO") {
      return { ok: false, error: "Pedido não está em separação." }
    }

    if (pedido.separadorId !== session.user.id) {
      return { ok: false, error: "Você não é o separador deste pedido." }
    }

    await prisma.pedido.update({
      where: { id: input.pedidoId },
      data: {
        status: "RESERVADO",
        separadorId: null,
      },
    })

    const pedidoAtualizado = await prisma.pedido.findUnique({
      where: { id: input.pedidoId },
      include: { itens: true, eventos: true },
    })

    return { ok: true, data: formatarPedido(pedidoAtualizado!) }
  } catch (error) {
    console.error("Erro ao devolver à fila:", error)
    return { ok: false, error: "Erro ao devolver à fila." }
  }
}

export async function actionFinalizarSeparacao(input: {
  pedidoId: string
  itens: Array<{ itemPedidoId: string; quantidadeSeparada: number }>
}) {
  const session = await auth()
  if (!session?.user?.empresaId || !session.user.id) {
    return { ok: false, error: "Não autenticado." }
  }

  const validationResult = finalizarSeparacaoSchema.safeParse(input)
  if (!validationResult.success) {
    return { ok: false, error: "Dados inválidos." }
  }

  try {
    const pedido = await prisma.pedido.findFirst({
      where: { id: input.pedidoId, empresaId: session.user.empresaId },
      include: { itens: true, eventos: true },
    })

    if (!pedido) {
      return { ok: false, error: "Pedido não encontrado." }
    }

    // Valida: pedido ainda existe e não foi CANCELADO
    if (pedido.status === "CANCELADO") {
      // Limpa separadorId, não altera mais nada
      await prisma.pedido.update({
        where: { id: input.pedidoId },
        data: { separadorId: null },
      })
      return { ok: false, error: "Este pedido foi cancelado e não pode mais ser separado." }
    }

    if (pedido.status !== "EM_SEPARACAO") {
      return { ok: false, error: "Pedido não está em separação." }
    }

    // Calcula ruptura no SERVIDOR comparando quantidadeSeparada com quantidade original
    const itensComRuptura: Array<{ itemPedidoId: string; quantidadeSeparada: number }> = []
    for (const itemInput of input.itens) {
      const itemOriginal = pedido.itens.find((i) => i.id === itemInput.itemPedidoId)
      if (!itemOriginal) {
        return { ok: false, error: `Item ${itemInput.itemPedidoId} não encontrado no pedido.` }
      }

      const produto = await prisma.produto.findUnique({ where: { id: itemOriginal.produtoId } })
      if (!produto) {
        return { ok: false, error: `Produto do item ${itemInput.itemPedidoId} não encontrado.` }
      }

      const quantidadeOriginal = Number(itemOriginal.quantidade)

      if (itemInput.quantidadeSeparada > quantidadeOriginal) {
        return {
          ok: false,
          error: `Quantidade separada do item ${itemInput.itemPedidoId} não pode exceder a quantidade solicitada.`,
        }
      }

      if (!produto.permiteFracionado && !Number.isInteger(itemInput.quantidadeSeparada)) {
        return {
          ok: false,
          error: `Produto "${produto.nome}" não permite fracionamento.`,
        }
      }

      if (itemInput.quantidadeSeparada < quantidadeOriginal) {
        itensComRuptura.push(itemInput)
      }
    }

    const temRuptura = itensComRuptura.length > 0

    // Executa updates em transação
    await prisma.$transaction(async (tx) => {
      // Atualiza todos os itens com quantidadeSeparada e status SEPARADO
      for (const itemInput of input.itens) {
        await tx.itemPedido.update({
          where: { id: itemInput.itemPedidoId },
          data: {
            quantidadeSeparada: itemInput.quantidadeSeparada,
            status: "SEPARADO",
          },
        })
      }

      // Atualiza pedido conforme presença de ruptura
      await tx.pedido.update({
        where: { id: input.pedidoId },
        data: {
          status: temRuptura ? "EM_SEPARACAO" : "EM_CONFERENCIA",
          pendencia: temRuptura ? "RUPTURA_ESTOQUE" : "NENHUMA",
          separadorId: null,
        },
      })

      // Registra evento
      if (temRuptura) {
        await tx.pedidoEvento.create({
          data: {
            pedidoId: input.pedidoId,
            tipo: "RUPTURA_ESTOQUE_DETECTADA",
            descricao: `Ruptura de estoque detectada em ${itensComRuptura.length} item(ns).`,
            usuarioId: session.user.id,
          },
        })
      }

      await tx.pedidoEvento.create({
        data: {
          pedidoId: input.pedidoId,
          tipo: "SEPARACAO_CONCLUIDA",
          descricao: temRuptura ? "Separação concluída com pendências." : "Separação concluída.",
          usuarioId: session.user.id,
        },
      })
    })

    // Registra auditoria
    await actionRegistrarAuditoria({
      modulo: "PEDIDOS",
      acao: "ATUALIZADO",
      entidadeId: input.pedidoId,
      descricao: temRuptura
        ? `Ruptura de estoque detectada em ${itensComRuptura.length} item(ns). Separação concluída por ${session.user.name || session.user.email}.`
        : `Separação concluída por ${session.user.name || session.user.email}.`,
    })

    const pedidoAtualizado = await prisma.pedido.findUnique({
      where: { id: input.pedidoId },
      include: { itens: true, eventos: true },
    })

    return { ok: true, data: formatarPedido(pedidoAtualizado!) }
  } catch (error) {
    console.error("Erro ao finalizar separação:", error)
    return { ok: false, error: "Erro ao finalizar separação." }
  }
}

export async function actionForcarLiberacaoLock(input: { pedidoId: string }) {
  const session = await auth()
  if (!session?.user?.empresaId || !session.user.id) {
    return { ok: false, error: "Não autenticado." }
  }

  const validationResult = forcarLiberacaoLockSchema.safeParse(input)
  if (!validationResult.success) {
    return { ok: false, error: "Dados inválidos." }
  }

  // Checar role ADMIN
  if (session.user.role !== "ADMIN") {
    return { ok: false, error: "Não autorizado." }
  }

  try {
    const pedido = await prisma.pedido.findFirst({
      where: { id: input.pedidoId, empresaId: session.user.empresaId },
      include: { itens: true, eventos: true },
    })

    if (!pedido) {
      return { ok: false, error: "Pedido não encontrado." }
    }

    if (pedido.status !== "EM_SEPARACAO") {
      return { ok: false, error: "Pedido não está em separação." }
    }

    await prisma.pedido.update({
      where: { id: input.pedidoId },
      data: {
        status: "RESERVADO",
        separadorId: null,
      },
    })

    await actionRegistrarAuditoria({
      modulo: "PEDIDOS",
      acao: "ATUALIZADO",
      entidadeId: input.pedidoId,
      descricao: `Lock de separação forçadamente liberado por ${session.user.name || session.user.email}.`,
    })

    const pedidoAtualizado = await prisma.pedido.findUnique({
      where: { id: input.pedidoId },
      include: { itens: true, eventos: true },
    })

    return { ok: true, data: formatarPedido(pedidoAtualizado!) }
  } catch (error) {
    console.error("Erro ao forçar liberação de lock:", error)
    return { ok: false, error: "Erro ao forçar liberação de lock." }
  }
}
