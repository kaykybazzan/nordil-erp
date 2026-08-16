"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionAplicarMovimentacao } from "@/lib/actions/estoque"
import { actionRegistrarAuditoria } from "@/lib/actions/auditoria"
import { podeCancelarPedido, podeOperarSeparacao } from "@/lib/pedidos"
import { podeOperarExpedicao } from "@/lib/policies"
import { z } from "zod"
import type {
  Pedido,
  ItemPedido,
  EnderecoPedido,
  StatusPedido,
  StatusItemPedido,
  PendenciaPedido,
} from "@/types/domain"

type PedidoComRelacoes = {
  id: string
  empresaId: string
  numero: number
  clienteId: string
  vendedorId: string
  enderecoLogradouro: string
  enderecoNumero: string
  enderecoBairro: string
  enderecoCidade: string
  enderecoUf: string
  enderecoCep: string
  enderecoRefId: string | null
  observacao: string | null
  transportadora: string | null
  status: string
  pendencia: string
  valorTotal: any
  criadoEm: Date
  statusAlteradoEm: Date
  motivoCancelamento: string | null
  separadorId: string | null
  itens: Array<{
    id: string
    pedidoId: string
    produtoId: string
    quantidade: any
    precoUnitario: any
    desconto: any
    status: string
  }>
  eventos: Array<{
    id: string
    pedidoId: string
    tipo: string
    descricao: string
    dataHora: Date
    usuarioId: string
  }>
}

// Schemas Zod baseados em types/domain.ts
const EnderecoPedidoSchema = z.object({
  enderecoId: z.string().optional(),
  logradouro: z.string().min(1, "Logradouro é obrigatório"),
  numero: z.string().min(1, "Número é obrigatório"),
  bairro: z.string().min(1, "Bairro é obrigatório"),
  cidade: z.string().min(1, "Cidade é obrigatória"),
  uf: z.string().min(2, "UF é obrigatória").max(2, "UF deve ter 2 caracteres"),
  cep: z.string().min(1, "CEP é obrigatório"),
})

const NovoPedidoItemSchema = z.object({
  produtoId: z.string().min(1, "Produto é obrigatório"),
  quantidade: z.number().positive("Quantidade deve ser maior que zero"),
  precoUnitario: z.number().positive("Preço unitário deve ser maior que zero"),
  desconto: z.number().min(0, "Desconto não pode ser negativo").default(0),
})

const CriarPedidoSchema = z.object({
  clienteId: z.string().min(1, "Cliente é obrigatório"),
  endereco: EnderecoPedidoSchema,
  itens: z.array(NovoPedidoItemSchema).min(1, "Pelo menos um item é obrigatório"),
  observacao: z.string().optional(),
})

type CriarPedidoInput = z.infer<typeof CriarPedidoSchema>

// Helper para formatar Pedido do Prisma para tipo domain
function formatarPedido(pedido: PedidoComRelacoes): Pedido {
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

/**
 * 1. actionCriarPedido
 * Cria um pedido em 3 etapas: gera número, cria pedido/itens/eventos, tenta reserva de estoque
 */
export async function actionCriarPedido(input: CriarPedidoInput) {
  const session = await auth()
  if (!session?.user?.empresaId || !session.user.id) {
    return { ok: false, error: "Não autenticado" }
  }

  const validated = CriarPedidoSchema.safeParse(input)
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0].message }
  }

  const dados = validated.data
  const empresaId = session.user.empresaId
  const usuarioId = session.user.id

  try {
    // Etapa 1: Transação para gerar número e criar pedido
    const resultado = await prisma.$transaction(async (tx) => {
      // Incrementa sequência de PEDIDO
      const sequencia = await tx.sequenciaNumeracao.update({
        where: { empresaId_tipo: { empresaId, tipo: "PEDIDO" } },
        data: { valorAtual: { increment: 1 } },
      })
      const numero = sequencia.valorAtual

      // Calcula valor total (desconto é percentual 0-100)
      const valorTotal = dados.itens.reduce(
        (acc, item) => acc + item.quantidade * item.precoUnitario * (1 - item.desconto / 100),
        0
      )

      // Cria pedido
      const pedido = await tx.pedido.create({
        data: {
          empresaId,
          numero,
          clienteId: dados.clienteId,
          vendedorId: usuarioId,
          enderecoLogradouro: dados.endereco.logradouro,
          enderecoNumero: dados.endereco.numero,
          enderecoBairro: dados.endereco.bairro,
          enderecoCidade: dados.endereco.cidade,
          enderecoUf: dados.endereco.uf,
          enderecoCep: dados.endereco.cep,
          enderecoRefId: dados.endereco.enderecoId,
          observacao: dados.observacao,
          status: "CRIADO",
          pendencia: "NENHUMA",
          valorTotal,
        },
      })

      // Cria itens (todos PENDENTE_ESTOQUE inicialmente)
      await tx.itemPedido.createMany({
        data: dados.itens.map((item) => ({
          pedidoId: pedido.id,
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          precoUnitario: item.precoUnitario,
          desconto: item.desconto,
          status: "PENDENTE_ESTOQUE",
        })),
      })

      // Cria evento PEDIDO_CRIADO
      await tx.pedidoEvento.create({
        data: {
          pedidoId: pedido.id,
          tipo: "PEDIDO_CRIADO",
          descricao: `Pedido #${numero} criado.`,
          usuarioId,
        },
      })

      return pedido
    })

    // Etapa 2: Tenta reserva de estoque para cada item
    const itens = await prisma.itemPedido.findMany({
      where: { pedidoId: resultado.id },
    })

    let algumReservado = false
    let algumFalhou = false

    for (const item of itens) {
      const resultadoMovimentacao = await actionAplicarMovimentacao({
        produtoId: item.produtoId,
        tipo: "RESERVA",
        quantidade: Number(item.quantidade),
        pedidoId: resultado.id,
      })

      if (resultadoMovimentacao.ok) {
        await prisma.itemPedido.update({
          where: { id: item.id },
          data: { status: "PENDENTE" },
        })
        algumReservado = true
      } else {
        algumFalhou = true
      }
    }

    // Etapa 3: Atualiza status/pendencia do pedido
    const novoStatus = algumReservado ? "RESERVADO" : "CRIADO"
    const novaPendencia = algumFalhou ? "RUPTURA_ESTOQUE" : "NENHUMA"

    const pedidoAtualizado = await prisma.pedido.update({
      where: { id: resultado.id },
      data: {
        status: novoStatus,
        pendencia: novaPendencia,
      },
      include: {
        itens: true,
        eventos: true,
      },
    })

    // Cria evento ESTOQUE_RESERVADO
    await prisma.pedidoEvento.create({
      data: {
        pedidoId: resultado.id,
        tipo: "ESTOQUE_RESERVADO",
        descricao: algumFalhou
          ? `Reserva concluída com ruptura de estoque em alguns itens.`
          : `Reserva de estoque concluída com sucesso.`,
        usuarioId,
      },
    })

    // Recarrega com evento novo
    const pedidoCompleto = await prisma.pedido.findUnique({
      where: { id: resultado.id },
      include: {
        itens: true,
        eventos: true,
      },
    })

    return { ok: true, data: formatarPedido(pedidoCompleto!) }
  } catch (error) {
    console.error("Erro ao criar pedido:", error)
    return { ok: false, error: "Erro ao criar pedido" }
  }
}

/**
 * 2. actionReprocessarReserva
 * Supervisor/Admin reprocessa reserva de itens PENDENTE_ESTOQUE
 */
export async function actionReprocessarReserva(pedidoId: string) {
  const session = await auth()
  if (!session?.user?.empresaId || !session.user.id) {
    return { ok: false, error: "Não autenticado" }
  }

  // Só supervisor/admin
  if (session.user.role !== "SUPERVISOR" && session.user.role !== "ADMIN") {
    return { ok: false, error: "Apenas supervisor ou admin pode reprocessar reserva" }
  }

  try {
    const pedido = await prisma.pedido.findFirst({
      where: { id: pedidoId, empresaId: session.user.empresaId },
      include: { itens: true, eventos: true },
    })

    if (!pedido) {
      return { ok: false, error: "Pedido não encontrado" }
    }

    if (pedido.status !== "CRIADO") {
      return { ok: false, error: "Só é possível reprocessar pedidos com status CRIADO" }
    }

    // Tenta reserva apenas para itens PENDENTE_ESTOQUE não cancelados
    const itensParaReprocessar = pedido.itens.filter(
      (item) => item.status === "PENDENTE_ESTOQUE"
    )

    if (itensParaReprocessar.length === 0) {
      return { ok: false, error: "Nenhum item pendente de estoque para reprocessar" }
    }

    let algumReservado = false
    let algumFalhou = false

    for (const item of itensParaReprocessar) {
      const resultadoMovimentacao = await actionAplicarMovimentacao({
        produtoId: item.produtoId,
        tipo: "RESERVA",
        quantidade: Number(item.quantidade),
        pedidoId: pedido.id,
      })

      if (resultadoMovimentacao.ok) {
        await prisma.itemPedido.update({
          where: { id: item.id },
          data: { status: "PENDENTE" },
        })
        algumReservado = true
      } else {
        algumFalhou = true
      }
    }

    // Atualiza status/pendencia
    const novoStatus = algumReservado ? "RESERVADO" : "CRIADO"
    const novaPendencia = algumFalhou ? "RUPTURA_ESTOQUE" : "NENHUMA"

    await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        status: novoStatus,
        pendencia: novaPendencia,
      },
    })

    // Cria evento PEDIDO_REPROCESSADO
    await prisma.pedidoEvento.create({
      data: {
        pedidoId,
        tipo: "PEDIDO_REPROCESSADO",
        descricao: algumFalhou
          ? `Reprocessamento concluído com ruptura de estoque em alguns itens.`
          : `Reprocessamento concluído com sucesso.`,
        usuarioId: session.user.id,
      },
    })

    const pedidoAtualizado = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { itens: true, eventos: true },
    })

    return { ok: true, data: formatarPedido(pedidoAtualizado!) }
  } catch (error) {
    console.error("Erro ao reprocessar reserva:", error)
    return { ok: false, error: "Erro ao reprocessar reserva" }
  }
}

/**
 * 3. actionCancelarPedido
 * Cancela um pedido, libera reserva e registra auditoria
 */
export async function actionCancelarPedido(pedidoId: string, motivo: string) {
  const session = await auth()
  if (!session?.user?.empresaId || !session.user.id) {
    return { ok: false, error: "Não autenticado" }
  }

  if (!motivo.trim()) {
    return { ok: false, error: "Informe o motivo do cancelamento" }
  }

  try {
    const pedido = await prisma.pedido.findFirst({
      where: { id: pedidoId, empresaId: session.user.empresaId },
      include: { itens: true, eventos: true },
    })

    if (!pedido) {
      return { ok: false, error: "Pedido não encontrado" }
    }

    const pedidoFormatado = formatarPedido(pedido)
    if (!podeCancelarPedido(pedidoFormatado, session.user)) {
      return { ok: false, error: "Não é possível cancelar este pedido" }
    }

    // Libera reserva para itens com reserva ativa (PENDENTE ou SEPARADO)
    const statusComReserva = ["PENDENTE", "SEPARADO"]
    for (const item of pedido.itens) {
      if (statusComReserva.includes(item.status)) {
        const resultadoMovimentacao = await actionAplicarMovimentacao({
          produtoId: item.produtoId,
          tipo: "LIBERACAO_RESERVA",
          quantidade: Number(item.quantidade),
          pedidoId: pedido.id,
        })
        if (!resultadoMovimentacao.ok) {
          console.error("Falha ao liberar reserva:", resultadoMovimentacao.error)
        }
      }
    }

    // Atualiza pedido
    await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        status: "CANCELADO",
        motivoCancelamento: motivo.trim(),
        separadorId: null,
      },
    })

    // Atualiza itens não cancelados
    await prisma.itemPedido.updateMany({
      where: { pedidoId, status: { not: "CANCELADO" } },
      data: { status: "CANCELADO" },
    })

    // Cria evento PEDIDO_CANCELADO
    await prisma.pedidoEvento.create({
      data: {
        pedidoId,
        tipo: "PEDIDO_CANCELADO",
        descricao: motivo.trim(),
        usuarioId: session.user.id,
      },
    })

    // Registra auditoria
    await actionRegistrarAuditoria({
      modulo: "PEDIDOS",
      acao: "CANCELADO",
      entidadeId: pedidoId,
      entidadeDescricao: `Pedido #${pedido.numero}`,
      descricao: `Pedido #${pedido.numero} cancelado.`,
      motivo: motivo.trim(),
    })

    const pedidoAtualizado = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { itens: true, eventos: true },
    })

    return { ok: true, data: formatarPedido(pedidoAtualizado!) }
  } catch (error) {
    console.error("Erro ao cancelar pedido:", error)
    return { ok: false, error: "Erro ao cancelar pedido" }
  }
}


/**
 * 9. actionExpedirPedido
 * Expede pedido, registra saída de estoque
 * 
 * Lógica: processa TODOS os itens, só marca EXPEDIDO se todos tiverem sucesso.
 * Se falhar parcial: mantém status, marca pendencia RUPTURA_ESTOQUE, cria evento detalhado.
 */
export async function actionExpedirPedido(pedidoId: string, transportadora: string) {
  const session = await auth()
  if (!session?.user?.empresaId || !session.user.id) {
    return { ok: false, error: "Não autenticado" }
  }

  if (!transportadora.trim()) {
    return { ok: false, error: "Informe a transportadora" }
  }

  try {
    const pedido = await prisma.pedido.findFirst({
      where: { id: pedidoId, empresaId: session.user.empresaId },
      include: { itens: true, eventos: true },
    })

    if (!pedido) {
      return { ok: false, error: "Pedido não encontrado" }
    }

    // Processa saída para cada item não cancelado
    const itensNaoCancelados = pedido.itens.filter((item) => item.status !== "CANCELADO")
    const resultados: Array<{ itemId: string; ok: boolean; produtoId: string }> = []

    for (const item of itensNaoCancelados) {
      const resultadoMovimentacao = await actionAplicarMovimentacao({
        produtoId: item.produtoId,
        tipo: "SAIDA",
        quantidade: Number(item.quantidade),
        pedidoId: pedido.id,
      })

      resultados.push({
        itemId: item.id,
        ok: resultadoMovimentacao.ok,
        produtoId: item.produtoId,
      })

      if (!resultadoMovimentacao.ok) {
        console.error("Falha ao registrar saída:", resultadoMovimentacao.error)
      }
    }

    const todosSucesso = resultados.every((r) => r.ok)

    if (todosSucesso) {
      // Todos os itens tiveram saída aplicada com sucesso
      await prisma.pedido.update({
        where: { id: pedidoId },
        data: {
          status: "EXPEDIDO",
          transportadora: transportadora.trim(),
        },
      })

      // Atualiza status dos itens para EXPEDIDO
      for (const resultado of resultados) {
        await prisma.itemPedido.update({
          where: { id: resultado.itemId },
          data: { status: "EXPEDIDO" },
        })
      }

      await prisma.pedidoEvento.create({
        data: {
          pedidoId,
          tipo: "PEDIDO_EXPEDIDO",
          descricao: `Pedido expedido via ${transportadora.trim()}.`,
          usuarioId: session.user.id,
        },
      })
    } else {
      // Falha parcial: não marca EXPEDIDO, mantém status, marca pendencia
      const itensSucesso = resultados.filter((r) => r.ok)
      const itensFalha = resultados.filter((r) => !r.ok)

      await prisma.pedido.update({
        where: { id: pedidoId },
        data: {
          pendencia: "RUPTURA_ESTOQUE",
        },
      })

      // Atualiza status dos itens que tiveram sucesso para EXPEDIDO
      for (const resultado of itensSucesso) {
        await prisma.itemPedido.update({
          where: { id: resultado.itemId },
          data: { status: "EXPEDIDO" },
        })
      }

      await prisma.pedidoEvento.create({
        data: {
          pedidoId,
          tipo: "RUPTURA_ESTOQUE_DETECTADA",
          descricao: `Expedição parcial: ${itensSucesso.length} itens expedidos com sucesso, ${itensFalha.length} itens falharam. Supervisor deve investigar.`,
          usuarioId: session.user.id,
        },
      })
    }

    const pedidoAtualizado = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { itens: true, eventos: true },
    })

    return { ok: true, data: formatarPedido(pedidoAtualizado!) }
  } catch (error) {
    console.error("Erro ao expedir pedido:", error)
    return { ok: false, error: "Erro ao expedir pedido" }
  }
}

/**
 * 10. actionMarcarEntregue
 * Marca pedido como entregue
 */
export async function actionMarcarEntregue(pedidoId: string) {
  const session = await auth()
  if (!session?.user?.empresaId || !session.user.id) {
    return { ok: false, error: "Não autenticado" }
  }

  if (!podeOperarExpedicao(session.user)) {
    return { ok: false, error: "Sem permissão" }
  }

  try {
    const pedido = await prisma.pedido.findFirst({
      where: { id: pedidoId, empresaId: session.user.empresaId },
    })

    if (!pedido) {
      return { ok: false, error: "Pedido não encontrado" }
    }

    await prisma.pedido.update({
      where: { id: pedidoId },
      data: { status: "ENTREGUE" },
    })

    await prisma.pedidoEvento.create({
      data: {
        pedidoId,
        tipo: "PEDIDO_ENTREGUE",
        descricao: "Pedido entregue.",
        usuarioId: session.user.id,
      },
    })

    const pedidoAtualizado = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { itens: true, eventos: true },
    })

    return { ok: true, data: formatarPedido(pedidoAtualizado!) }
  } catch (error) {
    console.error("Erro ao marcar entregue:", error)
    return { ok: false, error: "Erro ao marcar entregue" }
  }
}

/**
 * 11. actionObterPedidos
 * Lista pedidos da empresa com filtros opcionais
 */
export async function actionObterPedidos(filtros?: {
  status?: StatusPedido
  clienteId?: string
  vendedorId?: string
}) {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado" }
  }

  try {
    const pedidos = await prisma.pedido.findMany({
      where: {
        empresaId: session.user.empresaId,
        ...(filtros?.status ? { status: filtros.status } : {}),
        ...(filtros?.clienteId ? { clienteId: filtros.clienteId } : {}),
        ...(filtros?.vendedorId ? { vendedorId: filtros.vendedorId } : {}),
      },
      include: {
        itens: true,
        eventos: true,
      },
      orderBy: { criadoEm: "desc" },
    })

    return { ok: true, data: pedidos.map(formatarPedido) }
  } catch (error) {
    console.error("Erro ao obter pedidos:", error)
    return { ok: false, error: "Erro ao carregar pedidos" }
  }
}

/**
 * 12. actionObterPedido
 * Busca um pedido específico da empresa
 */
export async function actionObterPedido(pedidoId: string) {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado" }
  }

  try {
    const pedido = await prisma.pedido.findFirst({
      where: {
        id: pedidoId,
        empresaId: session.user.empresaId,
      },
      include: {
        itens: true,
        eventos: true,
      },
    })

    if (!pedido) {
      return { ok: false, error: "Pedido não encontrado" }
    }

    return { ok: true, data: formatarPedido(pedido) }
  } catch (error) {
    console.error("Erro ao obter pedido:", error)
    return { ok: false, error: "Erro ao carregar pedido" }
  }
}

