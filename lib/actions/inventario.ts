"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionAplicarMovimentacao } from "@/lib/actions/estoque"
import { actionRegistrarAuditoria } from "@/lib/actions/auditoria"
import {
  podeAbrirInventario,
  podeContarInventario,
  podeAplicarAjusteInventario,
  podeFinalizarInventario,
  podeReatribuirResponsavelInventario,
} from "@/lib/policies"
import { z } from "zod"

// ATENÇÃO: os casts `session.user as any` abaixo assumem que a sessão carrega
// role/funcao/id/empresaId (mesmo padrão usado em outras Server Actions do
// projeto). Se o shape de session.user for diferente, ajuste os casts.

const TIPOS_ESCOPO = [
  "CORREDOR",
  "CATEGORIA",
  "FORNECEDOR",
  "LISTA_MANUAL",
  "ESTOQUE_BAIXO",
  "TODOS_PRODUTOS",
] as const

const abrirInventarioSchema = z.object({
  tipoEscopo: z.enum(TIPOS_ESCOPO),
  recorte: z.string().nullable(),
  listaManualProdutoIds: z.array(z.string()).optional(),
  responsavelContagemId: z.string().min(1, "Responsável é obrigatório"),
  observacao: z.string().optional(),
})

const registrarContagemSchema = z.object({
  inventarioId: z.string().min(1),
  itemId: z.string().min(1),
  quantidadeContada: z.number().min(0, "Quantidade deve ser maior ou igual a zero"),
})

const itemInventarioSchema = z.object({
  inventarioId: z.string().min(1),
  itemId: z.string().min(1),
})

const aplicarTodosAjustesSchema = z.object({
  inventarioId: z.string().min(1),
})

const reatribuirResponsavelSchema = z.object({
  inventarioId: z.string().min(1),
  novoResponsavelId: z.string().min(1),
})

const finalizarInventarioSchema = z.object({
  inventarioId: z.string().min(1),
})

const listarInventariosSchema = z
  .object({
    status: z.string().optional(),
    dataInicio: z.string().optional(),
    dataFim: z.string().optional(),
  })
  .optional()

const obterInventarioSchema = z.object({
  inventarioId: z.string().min(1),
})

type AbrirInventarioInput = z.infer<typeof abrirInventarioSchema>
type RegistrarContagemInput = z.infer<typeof registrarContagemSchema>
type ItemInventarioInput = z.infer<typeof itemInventarioSchema>
type AplicarTodosAjustesInput = z.infer<typeof aplicarTodosAjustesSchema>
type ReatribuirResponsavelInput = z.infer<typeof reatribuirResponsavelSchema>
type FinalizarInventarioInput = z.infer<typeof finalizarInventarioSchema>
type ListarInventariosInput = z.infer<typeof listarInventariosSchema>
type ObterInventarioInput = z.infer<typeof obterInventarioSchema>

// ---------- Helpers internos (replicam a lógica que antes vivia no store) ----------

function validarEscopo(
  tipoEscopo: string,
  recorte: string | null,
  listaManualProdutoIds?: string[],
): string | null {
  if (tipoEscopo === "CORREDOR" && !recorte) return "Selecione o corredor."
  if (tipoEscopo === "CATEGORIA" && !recorte) return "Selecione a categoria."
  if (tipoEscopo === "FORNECEDOR" && !recorte) return "Selecione o fornecedor."
  if (tipoEscopo === "LISTA_MANUAL" && (!listaManualProdutoIds || listaManualProdutoIds.length === 0)) {
    return "Selecione ao menos um produto para a lista manual."
  }
  return null
}

async function resolverProdutosDoEscopo(
  tipoEscopo: string,
  recorte: string | null,
  empresaId: string,
  listaManualProdutoIds?: string[],
) {
  const produtos = await prisma.produto.findMany({
    where: { status: "ativo", empresaId },
  })

  switch (tipoEscopo) {
    case "CORREDOR":
      return recorte ? produtos.filter((p) => p.corredor === recorte) : []
    case "CATEGORIA":
      return recorte ? produtos.filter((p) => p.categoria === recorte) : []
    case "FORNECEDOR":
      return recorte ? produtos.filter((p) => p.fornecedor === recorte) : []
    case "LISTA_MANUAL":
      return listaManualProdutoIds ? produtos.filter((p) => listaManualProdutoIds.includes(p.id)) : []
    case "ESTOQUE_BAIXO":
      return produtos.filter((p) => p.estoqueAtual <= (p.estoqueMinimo ?? 10))
    case "TODOS_PRODUTOS":
      return produtos
    default:
      return []
  }
}

function gerarDescricaoEscopo(tipoEscopo: string, recorte: string | null, quantidadeItens: number): string {
  switch (tipoEscopo) {
    case "CORREDOR":
      return `Corredor ${recorte} — ${quantidadeItens} itens`
    case "CATEGORIA":
      return `Categoria ${recorte} — ${quantidadeItens} itens`
    case "FORNECEDOR":
      return `Fornecedor ${recorte} — ${quantidadeItens} itens`
    case "LISTA_MANUAL":
      return `Lista manual — ${quantidadeItens} itens`
    case "ESTOQUE_BAIXO":
      return `Estoque baixo — ${quantidadeItens} itens`
    case "TODOS_PRODUTOS":
      return `Todos os produtos — ${quantidadeItens} itens`
    default:
      return `${quantidadeItens} itens`
  }
}

async function obterUltimaMovimentacaoId(produtoId: string): Promise<string | null> {
  const ultima = await prisma.estoqueMovimentacao.findFirst({
    where: { produtoId },
    orderBy: { dataHora: "desc" },
  })
  return ultima?.id ?? null
}

/**
 * Detecta se houve movimentação de estoque nova desde o snapshot registrado no item
 * (ultimaMovimentacaoId). Mesma lógica de staleness que existia no store.
 */
async function temMovimentacaoNovaDesde(produtoId: string, ultimaMovimentacaoIdSnapshot: string | null): Promise<boolean> {
  if (!ultimaMovimentacaoIdSnapshot) {
    const count = await prisma.estoqueMovimentacao.count({ where: { produtoId } })
    return count > 0
  }
  const snapshot = await prisma.estoqueMovimentacao.findUnique({
    where: { id: ultimaMovimentacaoIdSnapshot },
  })
  if (!snapshot) return true // snapshot não encontrado: trata como stale por segurança
  const count = await prisma.estoqueMovimentacao.count({
    where: { produtoId, dataHora: { gt: snapshot.dataHora } },
  })
  return count > 0
}

// ---------- Server Actions ----------

/**
 * Abre uma nova sessão de inventário: resolve os produtos do escopo escolhido,
 * gera o snapshot de saldo esperado por produto, e cria Inventario + InventarioItem[].
 */
export async function actionAbrirInventario(input: AbrirInventarioInput) {
  const session = await auth()
  if (!session?.user?.empresaId) return { ok: false, error: "Não autenticado" }

  const usuario = session.user as any
  if (!podeAbrirInventario(usuario)) {
    return { ok: false, error: "Sem permissão para abrir inventário." }
  }

  const validation = abrirInventarioSchema.safeParse(input)
  if (!validation.success) return { ok: false, error: "Dados inválidos" }

  const erroEscopo = validarEscopo(input.tipoEscopo, input.recorte, input.listaManualProdutoIds)
  if (erroEscopo) return { ok: false, error: erroEscopo }

  try {
    const empresaId = session.user.empresaId
    const produtos = await resolverProdutosDoEscopo(
      input.tipoEscopo,
      input.recorte,
      empresaId,
      input.listaManualProdutoIds,
    )
    if (produtos.length === 0) {
      return { ok: false, error: "Nenhum produto encontrado para o escopo informado." }
    }

    const descricaoEscopo = gerarDescricaoEscopo(input.tipoEscopo, input.recorte, produtos.length)

    const inventario = await prisma.$transaction(async (tx) => {
      const novoInventario = await tx.inventario.create({
        data: {
          empresaId,
          tipoEscopo: input.tipoEscopo,
          descricaoEscopo,
          recorte: input.recorte,
          observacao: input.observacao,
          status: "EM_ANDAMENTO",
          abertoPorId: session.user.id,
          responsavelContagemId: input.responsavelContagemId,
        },
      })

      for (const produto of produtos) {
        const ultimaMovimentacaoId = await obterUltimaMovimentacaoId(produto.id)
        await tx.inventarioItem.create({
          data: {
            inventarioId: novoInventario.id,
            produtoId: produto.id,
            saldoEsperado: produto.estoqueAtual,
            ultimaMovimentacaoId,
            quantidadeContada: null,
            status: "PENDENTE",
          },
        })
      }

      return novoInventario
    })

    await actionRegistrarAuditoria({
      modulo: "INVENTARIO",
      acao: "CRIADO",
      entidadeId: inventario.id,
      entidadeDescricao: `Inventário: ${descricaoEscopo}`,
      descricao: `Inventário iniciado: ${descricaoEscopo}. Responsável: ${input.responsavelContagemId}.`,
    })

    return { ok: true, data: inventario }
  } catch (error) {
    console.error("Erro ao abrir inventário:", error)
    return { ok: false, error: "Erro ao abrir inventário" }
  }
}

/**
 * Registra a quantidade contada de um item. Detecta staleness (movimentação nova
 * desde o snapshot) e classifica o item como CONTADO_OK, DIVERGENTE ou
 * NECESSITA_RECONTAGEM.
 */
export async function actionRegistrarContagemItem(input: RegistrarContagemInput) {
  const session = await auth()
  if (!session?.user?.empresaId) return { ok: false, error: "Não autenticado" }

  const validation = registrarContagemSchema.safeParse(input)
  if (!validation.success) return { ok: false, error: "Dados inválidos" }

  try {
    const inventario = await prisma.inventario.findFirst({
      where: { id: input.inventarioId, empresaId: session.user.empresaId },
    })
    if (!inventario) return { ok: false, error: "Inventário não encontrado." }

    const usuario = session.user as any
    if (!podeContarInventario(usuario, inventario as any)) {
      return { ok: false, error: "Sem permissão para contar neste inventário." }
    }

    if (inventario.status !== "EM_ANDAMENTO") {
      return { ok: false, error: "Só é possível contar em inventários em andamento." }
    }

    const item = await prisma.inventarioItem.findFirst({
      where: { id: input.itemId, inventarioId: input.inventarioId },
    })
    if (!item) return { ok: false, error: "Item não encontrado no inventário." }

    const stale = await temMovimentacaoNovaDesde(item.produtoId, item.ultimaMovimentacaoId)

    const novoStatus = stale
      ? "NECESSITA_RECONTAGEM"
      : input.quantidadeContada === item.saldoEsperado
        ? "CONTADO_OK"
        : "DIVERGENTE"

    const itemAtualizado = await prisma.inventarioItem.update({
      where: { id: item.id },
      data: {
        quantidadeContada: input.quantidadeContada,
        status: novoStatus,
        contadoEm: new Date(),
      },
    })

    return { ok: true, data: itemAtualizado }
  } catch (error) {
    console.error("Erro ao registrar contagem:", error)
    return { ok: false, error: "Erro ao registrar contagem" }
  }
}

/**
 * Regenera o snapshot de um item (novo saldoEsperado + ultimaMovimentacaoId) e
 * reseta a contagem. Usado quando o item está NECESSITA_RECONTAGEM.
 */
export async function actionRecontarItem(input: ItemInventarioInput) {
  const session = await auth()
  if (!session?.user?.empresaId) return { ok: false, error: "Não autenticado" }

  const validation = itemInventarioSchema.safeParse(input)
  if (!validation.success) return { ok: false, error: "Dados inválidos" }

  try {
    const inventario = await prisma.inventario.findFirst({
      where: { id: input.inventarioId, empresaId: session.user.empresaId },
    })
    if (!inventario) return { ok: false, error: "Inventário não encontrado." }

    const usuario = session.user as any
    if (!podeContarInventario(usuario, inventario as any)) {
      return { ok: false, error: "Sem permissão para contar neste inventário." }
    }

    if (inventario.status !== "EM_ANDAMENTO") {
      return { ok: false, error: "Só é possível recontar em inventários em andamento." }
    }

    const item = await prisma.inventarioItem.findFirst({
      where: { id: input.itemId, inventarioId: input.inventarioId },
    })
    if (!item) return { ok: false, error: "Item não encontrado no inventário." }

    const produto = await prisma.produto.findFirst({
      where: { id: item.produtoId, empresaId: session.user.empresaId },
    })
    if (!produto) return { ok: false, error: "Produto não encontrado." }

    const novaUltimaMovimentacaoId = await obterUltimaMovimentacaoId(item.produtoId)

    const itemAtualizado = await prisma.inventarioItem.update({
      where: { id: item.id },
      data: {
        saldoEsperado: produto.estoqueAtual,
        ultimaMovimentacaoId: novaUltimaMovimentacaoId,
        quantidadeContada: null,
        status: "PENDENTE",
        contadoEm: null,
      },
    })

    return { ok: true, data: itemAtualizado }
  } catch (error) {
    console.error("Erro ao recontar item:", error)
    return { ok: false, error: "Erro ao recontar item" }
  }
}

/**
 * Aplica o ajuste de estoque de um item DIVERGENTE via EstoqueService
 * (actionAplicarMovimentacao, tipo AJUSTE). Revalida staleness antes de aplicar.
 */
export async function actionAplicarAjusteInventario(input: ItemInventarioInput) {
  const session = await auth()
  if (!session?.user?.empresaId) return { ok: false, error: "Não autenticado" }

  const validation = itemInventarioSchema.safeParse(input)
  if (!validation.success) return { ok: false, error: "Dados inválidos" }

  const usuario = session.user as any
  if (!podeAplicarAjusteInventario(usuario)) {
    return { ok: false, error: "Sem permissão para aplicar ajustes." }
  }

  try {
    const inventario = await prisma.inventario.findFirst({
      where: { id: input.inventarioId, empresaId: session.user.empresaId },
    })
    if (!inventario) return { ok: false, error: "Inventário não encontrado." }
    if (inventario.status !== "EM_ANDAMENTO") {
      return { ok: false, error: "Só é possível aplicar ajustes em inventários em andamento." }
    }

    const item = await prisma.inventarioItem.findFirst({
      where: { id: input.itemId, inventarioId: input.inventarioId },
    })
    if (!item) return { ok: false, error: "Item não encontrado no inventário." }
    if (item.status !== "DIVERGENTE") {
      return { ok: false, error: "Só é possível ajustar itens com status DIVERGENTE." }
    }
    if (item.quantidadeContada === null) {
      return { ok: false, error: "Item não foi contado ainda." }
    }

    // Revalidar staleness: pode ter havido movimentação nova entre a contagem e este ajuste
    const stale = await temMovimentacaoNovaDesde(item.produtoId, item.ultimaMovimentacaoId)
    if (stale) {
      await prisma.inventarioItem.update({
        where: { id: item.id },
        data: { status: "NECESSITA_RECONTAGEM" },
      })
      return { ok: false, error: "Houve movimentação de estoque desde a contagem. Item marcado para recontagem." }
    }

    const diferenca = item.quantidadeContada - item.saldoEsperado
    if (diferenca === 0) {
      return { ok: false, error: "Não há diferença para ajustar." }
    }

    const direcao: "ENTRADA" | "SAIDA" = diferenca > 0 ? "ENTRADA" : "SAIDA"
    const quantidade = Math.abs(diferenca)

    // CRÍTICO: passa pelo EstoqueService via actionAplicarMovimentacao — nunca
    // update direto em Produto.estoqueAtual.
    const resultadoMovimentacao = await actionAplicarMovimentacao({
      produtoId: item.produtoId,
      tipo: "AJUSTE",
      quantidade,
      direcao,
    })
    if (!resultadoMovimentacao.ok) {
      return { ok: false, error: resultadoMovimentacao.error || "Erro ao registrar movimentação de ajuste." }
    }

    const itemAtualizado = await prisma.inventarioItem.update({
      where: { id: item.id },
      data: { status: "AJUSTADO" },
    })

    const produto = await prisma.produto.findFirst({ where: { id: item.produtoId } })
    await actionRegistrarAuditoria({
      modulo: "INVENTARIO",
      acao: "ATUALIZADO",
      entidadeId: inventario.id,
      entidadeDescricao: `Inventário: ${inventario.descricaoEscopo}`,
      descricao: `Ajuste aplicado: ${produto?.nome ?? item.produtoId}. Diferença: ${diferenca > 0 ? "+" : ""}${diferenca}.`,
    })

    return { ok: true, data: itemAtualizado }
  } catch (error) {
    console.error("Erro ao aplicar ajuste:", error)
    return { ok: false, error: "Erro ao aplicar ajuste" }
  }
}

/**
 * Aplica ajuste em todos os itens DIVERGENTE do inventário, em "melhor esforço"
 * (Ajuste 4 aprovado): continua mesmo se um item falhar, retorna resumo.
 */
export async function actionAplicarTodosAjustesInventario(input: AplicarTodosAjustesInput) {
  const session = await auth()
  if (!session?.user?.empresaId) return { ok: false, error: "Não autenticado" }

  const validation = aplicarTodosAjustesSchema.safeParse(input)
  if (!validation.success) return { ok: false, error: "Dados inválidos" }

  const usuario = session.user as any
  if (!podeAplicarAjusteInventario(usuario)) {
    return { ok: false, error: "Sem permissão para aplicar ajustes." }
  }

  try {
    const inventario = await prisma.inventario.findFirst({
      where: { id: input.inventarioId, empresaId: session.user.empresaId },
    })
    if (!inventario) return { ok: false, error: "Inventário não encontrado." }
    if (inventario.status !== "EM_ANDAMENTO") {
      return { ok: false, error: "Só é possível aplicar ajustes em inventários em andamento." }
    }

    const itensDivergentes = await prisma.inventarioItem.findMany({
      where: { inventarioId: input.inventarioId, status: "DIVERGENTE" },
    })
    if (itensDivergentes.length === 0) {
      return { ok: false, error: "Nenhum item divergente encontrado para ajuste." }
    }

    let aplicados = 0
    const falharam: { itemId: string; erro: string }[] = []

    for (const item of itensDivergentes) {
      const resultado = await actionAplicarAjusteInventario({
        inventarioId: input.inventarioId,
        itemId: item.id,
      })
      if (resultado.ok) {
        aplicados++
      } else {
        falharam.push({ itemId: item.id, erro: resultado.error || "Erro desconhecido" })
      }
    }

    return { ok: true, data: { aplicados, falharam } }
  } catch (error) {
    console.error("Erro ao aplicar todos os ajustes:", error)
    return { ok: false, error: "Erro ao aplicar todos os ajustes" }
  }
}

/**
 * Troca o responsável pela contagem de um inventário em andamento.
 */
export async function actionReatribuirResponsavelInventario(input: ReatribuirResponsavelInput) {
  const session = await auth()
  if (!session?.user?.empresaId) return { ok: false, error: "Não autenticado" }

  const validation = reatribuirResponsavelSchema.safeParse(input)
  if (!validation.success) return { ok: false, error: "Dados inválidos" }

  const usuario = session.user as any
  if (!podeReatribuirResponsavelInventario(usuario)) {
    return { ok: false, error: "Sem permissão para reatribuir responsável." }
  }

  try {
    const inventario = await prisma.inventario.findFirst({
      where: { id: input.inventarioId, empresaId: session.user.empresaId },
    })
    if (!inventario) return { ok: false, error: "Inventário não encontrado." }
    if (inventario.status !== "EM_ANDAMENTO") {
      return { ok: false, error: "Só é possível reatribuir responsável em inventários em andamento." }
    }
    if (inventario.responsavelContagemId === input.novoResponsavelId) {
      return { ok: false, error: "O novo responsável é o mesmo que o atual." }
    }

    const responsavelAnteriorId = inventario.responsavelContagemId

    const inventarioAtualizado = await prisma.inventario.update({
      where: { id: inventario.id },
      data: { responsavelContagemId: input.novoResponsavelId },
    })

    await actionRegistrarAuditoria({
      modulo: "INVENTARIO",
      acao: "ATUALIZADO",
      entidadeId: inventario.id,
      entidadeDescricao: `Inventário: ${inventario.descricaoEscopo}`,
      descricao: `Responsável da contagem alterado: ${responsavelAnteriorId} → ${input.novoResponsavelId}.`,
    })

    return { ok: true, data: inventarioAtualizado }
  } catch (error) {
    console.error("Erro ao reatribuir responsável:", error)
    return { ok: false, error: "Erro ao reatribuir responsável" }
  }
}

/**
 * Finaliza o inventário. Bloqueia se houver item DIVERGENTE sem ajuste aplicado.
 * Marca finalizadoComPendencias=true se houver itens NECESSITA_RECONTAGEM.
 */
export async function actionFinalizarInventario(input: FinalizarInventarioInput) {
  const session = await auth()
  if (!session?.user?.empresaId) return { ok: false, error: "Não autenticado" }

  const validation = finalizarInventarioSchema.safeParse(input)
  if (!validation.success) return { ok: false, error: "Dados inválidos" }

  const usuario = session.user as any
  if (!podeFinalizarInventario(usuario)) {
    return { ok: false, error: "Sem permissão para finalizar inventário." }
  }

  try {
    const inventario = await prisma.inventario.findFirst({
      where: { id: input.inventarioId, empresaId: session.user.empresaId },
    })
    if (!inventario) return { ok: false, error: "Inventário não encontrado." }
    if (inventario.status !== "EM_ANDAMENTO") {
      return { ok: false, error: "Só é possível finalizar inventários em andamento." }
    }

    const itensDivergentesSemAjuste = await prisma.inventarioItem.count({
      where: { inventarioId: inventario.id, status: "DIVERGENTE" },
    })
    if (itensDivergentesSemAjuste > 0) {
      return {
        ok: false,
        error: "Existem itens divergentes sem ajuste aplicado. Resolva as divergências antes de finalizar.",
      }
    }

    const itensRecontagem = await prisma.inventarioItem.count({
      where: { inventarioId: inventario.id, status: "NECESSITA_RECONTAGEM" },
    })
    const finalizadoComPendencias = itensRecontagem > 0

    const inventarioAtualizado = await prisma.inventario.update({
      where: { id: inventario.id },
      data: {
        status: "FINALIZADO",
        finalizadoEm: new Date(),
        finalizadoComPendencias,
      },
    })

    await actionRegistrarAuditoria({
      modulo: "INVENTARIO",
      acao: "STATUS_ALTERADO",
      entidadeId: inventario.id,
      entidadeDescricao: `Inventário: ${inventario.descricaoEscopo}`,
      descricao: `Inventário finalizado${finalizadoComPendencias ? " com pendências (itens necessitam recontagem)" : ""}.`,
    })

    return { ok: true, data: inventarioAtualizado }
  } catch (error) {
    console.error("Erro ao finalizar inventário:", error)
    return { ok: false, error: "Erro ao finalizar inventário" }
  }
}

/**
 * Lista inventários da empresa, com filtros opcionais de status e intervalo de data.
 */
export async function actionListarInventarios(filtros?: ListarInventariosInput) {
  const session = await auth()
  if (!session?.user?.empresaId) return { ok: false, error: "Não autenticado" }

  try {
    const inventarios = await prisma.inventario.findMany({
      where: {
        empresaId: session.user.empresaId,
        ...(filtros?.status ? { status: filtros.status } : {}),
        ...(filtros?.dataInicio || filtros?.dataFim
          ? {
              abertoEm: {
                ...(filtros.dataInicio ? { gte: new Date(filtros.dataInicio) } : {}),
                ...(filtros.dataFim ? { lte: new Date(filtros.dataFim) } : {}),
              },
            }
          : {}),
      },
      include: {
        responsavelContagem: { select: { id: true, nome: true } },
        abertoPor: { select: { id: true, nome: true } },
        itens: true,
      },
      orderBy: { abertoEm: "desc" },
    })

    return { ok: true, data: inventarios }
  } catch (error) {
    console.error("Erro ao listar inventários:", error)
    return { ok: false, error: "Erro ao listar inventários" }
  }
}

/**
 * Busca um inventário específico por ID, com itens e produtos incluídos.
 */
export async function actionObterInventario(input: ObterInventarioInput) {
  const session = await auth()
  if (!session?.user?.empresaId) return { ok: false, error: "Não autenticado" }

  const validation = obterInventarioSchema.safeParse(input)
  if (!validation.success) return { ok: false, error: "Dados inválidos" }

  try {
    const inventario = await prisma.inventario.findFirst({
      where: { id: input.inventarioId, empresaId: session.user.empresaId },
      include: {
        responsavelContagem: { select: { id: true, nome: true } },
        abertoPor: { select: { id: true, nome: true } },
        itens: { include: { produto: true } },
      },
    })
    if (!inventario) return { ok: false, error: "Inventário não encontrado." }

    return { ok: true, data: inventario }
  } catch (error) {
    console.error("Erro ao obter inventário:", error)
    return { ok: false, error: "Erro ao obter inventário" }
  }
}