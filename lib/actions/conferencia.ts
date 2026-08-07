"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionRegistrarAuditoria } from "@/lib/actions/auditoria"
import { podeOperarConferencia } from "@/lib/policies"
import { z } from "zod"
import type { StatusPedido, PendenciaPedido, StatusItemPedido, StatusConferencia } from "@/types/domain"

const iniciarConferenciaSchema = z.object({
  pedidoId: z.string().min(1),
})

const registrarItemConferenciaSchema = z.object({
  conferenciaId: z.string().min(1),
  conferenciaItemId: z.string().min(1),
  quantidadeConferida: z.number().nonnegative(),
})

const finalizarConferenciaSchema = z.object({
  conferenciaId: z.string().min(1),
})

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
    conferenteId: pedido.conferenteId ?? undefined,
  }
}

function formatarConferencia(conferencia: any): any {
  return {
    id: conferencia.id,
    pedidoId: conferencia.pedidoId,
    conferenteId: conferencia.conferenteId,
    iniciadoEm: conferencia.iniciadoEm.toISOString(),
    finalizadoEm: conferencia.finalizadoEm ? conferencia.finalizadoEm.toISOString() : null,
    status: conferencia.status as StatusConferencia,
    itens: conferencia.itens.map((item: any) => ({
      id: item.id,
      itemPedidoId: item.itemPedidoId,
      produtoId: item.produtoId,
      quantidadeSolicitada: Number(item.quantidadeSolicitada),
      quantidadeSeparada: Number(item.quantidadeSeparada),
      quantidadeConferida: item.quantidadeConferida !== null ? Number(item.quantidadeConferida) : null,
      divergente: item.divergente,
    })),
  }
}

export async function actionListarFilaConferencia() {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado." }
  }

  try {
    const pedidos = await prisma.pedido.findMany({
      where: { empresaId: session.user.empresaId, status: "EM_CONFERENCIA" },
      include: { itens: true, eventos: true },
      orderBy: { statusAlteradoEm: "asc" },
    })

    return { ok: true, data: pedidos.map(formatarPedido) }
  } catch (error) {
    console.error("Erro ao listar fila de conferência:", error)
    return { ok: false, error: "Erro ao listar fila de conferência." }
  }
}

export async function actionObterConferenciaAtual(input: { pedidoId: string }) {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado." }
  }

  try {
    const conferencia = await prisma.conferencia.findFirst({
      where: { pedidoId: input.pedidoId, status: "EM_ANDAMENTO" },
      include: { itens: true },
      orderBy: { iniciadoEm: "desc" },
    })

    return { ok: true, data: conferencia ? formatarConferencia(conferencia) : null }
  } catch (error) {
    console.error("Erro ao obter conferência atual:", error)
    return { ok: false, error: "Erro ao obter conferência atual." }
  }
}

export async function actionIniciarConferencia(input: { pedidoId: string }) {
  const session = await auth()
  if (!session?.user?.empresaId || !session.user.id) {
    return { ok: false, error: "Não autenticado." }
  }

  const validationResult = iniciarConferenciaSchema.safeParse(input)
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

    if (pedido.status !== "EM_CONFERENCIA") {
      return { ok: false, error: "Pedido não está disponível para conferência." }
    }
if (!podeOperarConferencia({ conferenteId: pedido.conferenteId }, session.user)) {
      return { ok: false, error: "Sem permissão para operar conferência ou pedido já em conferência por outro usuário." }
    }

    // Idempotente: se já existe sessão em andamento pra esse pedido, devolve ela em vez de duplicar.
    const conferenciaExistente = await prisma.conferencia.findFirst({
      where: { pedidoId: input.pedidoId, status: "EM_ANDAMENTO" },
      include: { itens: true },
    })

    if (conferenciaExistente) {
      return { ok: true, data: formatarConferencia(conferenciaExistente) }
    }

    const itensParaConferir = pedido.itens.filter((item) => item.status !== "CANCELADO")

    const conferencia = await prisma.$transaction(async (tx) => {
      const novaConferencia = await tx.conferencia.create({
        data: {
          pedidoId: input.pedidoId,
          conferenteId: session.user.id,
          status: "EM_ANDAMENTO",
          itens: {
            create: itensParaConferir.map((item) => ({
              itemPedidoId: item.id,
              produtoId: item.produtoId,
              quantidadeSolicitada: item.quantidade,
              quantidadeSeparada: item.quantidadeSeparada ?? item.quantidade,
              quantidadeConferida: null,
              divergente: null,
            })),
          },
        },
        include: { itens: true },
      })

      await tx.pedido.update({
        where: { id: input.pedidoId },
        data: { conferenteId: session.user.id },
      })

      await tx.pedidoEvento.create({
        data: {
          pedidoId: input.pedidoId,
          tipo: "CONFERENCIA_INICIADA",
          descricao: "Conferência iniciada.",
          usuarioId: session.user.id,
        },
      })

      return novaConferencia
    })

    await actionRegistrarAuditoria({
      modulo: "PEDIDOS",
      acao: "ATUALIZADO",
      entidadeId: input.pedidoId,
      descricao: `Conferência iniciada por ${session.user.name || session.user.email}.`,
    })

    return { ok: true, data: formatarConferencia(conferencia) }
  } catch (error) {
    console.error("Erro ao iniciar conferência:", error)
    return { ok: false, error: "Erro ao iniciar conferência." }
  }
}

export async function actionRegistrarItemConferencia(input: {
  conferenciaId: string
  conferenciaItemId: string
  quantidadeConferida: number
}) {
  const session = await auth()
  if (!session?.user?.empresaId || !session.user.id) {
    return { ok: false, error: "Não autenticado." }
  }

  const validationResult = registrarItemConferenciaSchema.safeParse(input)
  if (!validationResult.success) {
    return { ok: false, error: "Dados inválidos." }
  }

  try {
    const conferencia = await prisma.conferencia.findFirst({
      where: { id: input.conferenciaId },
      include: { itens: true, pedido: true },
    })

    if (!conferencia || conferencia.pedido.empresaId !== session.user.empresaId) {
      return { ok: false, error: "Conferência não encontrada." }
    }

    if (conferencia.status !== "EM_ANDAMENTO") {
      return { ok: false, error: "Esta conferência já foi finalizada." }
    }

    if (!podeOperarConferencia({ conferenteId: conferencia.conferenteId }, session.user)) {
      return { ok: false, error: "Sem permissão para operar esta conferência ou você não é o conferente desta sessão." }
    }

    const item = conferencia.itens.find((i) => i.id === input.conferenciaItemId)
    if (!item) {
      return { ok: false, error: "Item não encontrado nesta conferência." }
    }

    await prisma.conferenciaItem.update({
      where: { id: input.conferenciaItemId },
      data: { quantidadeConferida: input.quantidadeConferida },
    })

    const conferenciaAtualizada = await prisma.conferencia.findUnique({
      where: { id: input.conferenciaId },
      include: { itens: true },
    })

    return { ok: true, data: formatarConferencia(conferenciaAtualizada!) }
  } catch (error) {
    console.error("Erro ao registrar item de conferência:", error)
    return { ok: false, error: "Erro ao registrar item de conferência." }
  }
}

export async function actionFinalizarConferencia(input: { conferenciaId: string }) {
  const session = await auth()
  if (!session?.user?.empresaId || !session.user.id) {
    return { ok: false, error: "Não autenticado." }
  }

  const validationResult = finalizarConferenciaSchema.safeParse(input)
  if (!validationResult.success) {
    return { ok: false, error: "Dados inválidos." }
  }

  try {
    const conferencia = await prisma.conferencia.findFirst({
      where: { id: input.conferenciaId },
      include: { itens: true, pedido: true },
    })

    if (!conferencia || conferencia.pedido.empresaId !== session.user.empresaId) {
      return { ok: false, error: "Conferência não encontrada." }
    }

    if (conferencia.status !== "EM_ANDAMENTO") {
      return { ok: false, error: "Esta conferência já foi finalizada." }
    }

    if (!podeOperarConferencia({ conferenteId: conferencia.conferenteId }, session.user)) {
      return { ok: false, error: "Sem permissão para operar esta conferência ou você não é o conferente desta sessão." }
    }

    const itemNaoConferido = conferencia.itens.find((item) => item.quantidadeConferida === null)
    if (itemNaoConferido) {
      return { ok: false, error: "Existem itens ainda não conferidos." }
    }

    const itensComDivergencia = conferencia.itens.filter(
      (item) => Number(item.quantidadeConferida) !== Number(item.quantidadeSeparada),
    )
    const temDivergencia = itensComDivergencia.length > 0

    await prisma.$transaction(async (tx) => {
      for (const item of conferencia.itens) {
        await tx.conferenciaItem.update({
          where: { id: item.id },
          data: { divergente: Number(item.quantidadeConferida) !== Number(item.quantidadeSeparada) },
        })
      }

      await tx.conferencia.update({
        where: { id: input.conferenciaId },
        data: {
          status: temDivergencia ? "CONCLUIDA_COM_DIVERGENCIA" : "CONCLUIDA_SEM_DIVERGENCIA",
          finalizadoEm: new Date(),
        },
      })

      await tx.pedido.update({
        where: { id: conferencia.pedidoId },
        data: {
          status: "CONFERIDO",
          pendencia: temDivergencia ? "DIVERGENCIA_CONFERENCIA" : "NENHUMA",
          conferenteId: null,
        },
      })

      if (temDivergencia) {
        await tx.pedidoEvento.create({
          data: {
            pedidoId: conferencia.pedidoId,
            tipo: "DIVERGENCIA_DETECTADA",
            descricao: `Divergência detectada em ${itensComDivergencia.length} item(ns).`,
            usuarioId: session.user.id,
          },
        })
      }

      await tx.pedidoEvento.create({
        data: {
          pedidoId: conferencia.pedidoId,
          tipo: "CONFERENCIA_CONCLUIDA",
          descricao: temDivergencia ? "Conferência concluída com divergências." : "Conferência concluída.",
          usuarioId: session.user.id,
        },
      })
    })

    await actionRegistrarAuditoria({
      modulo: "PEDIDOS",
      acao: "ATUALIZADO",
      entidadeId: conferencia.pedidoId,
      descricao: temDivergencia
        ? `Conferência concluída com divergência em ${itensComDivergencia.length} item(ns) por ${session.user.name || session.user.email}.`
        : `Conferência concluída por ${session.user.name || session.user.email}.`,
    })

    const pedidoAtualizado = await prisma.pedido.findUnique({
      where: { id: conferencia.pedidoId },
      include: { itens: true, eventos: true },
    })

    return { ok: true, data: formatarPedido(pedidoAtualizado!) }
  } catch (error) {
    console.error("Erro ao finalizar conferência:", error)
    return { ok: false, error: "Erro ao finalizar conferência." }
  }
}