"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionAplicarMovimentacao } from "@/lib/actions/estoque"
import { actionRegistrarAuditoria } from "@/lib/actions/auditoria"
import { z } from "zod"

const fornecedorSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  contato: z.string().optional(),
})

const entradaItemSchema = z.object({
  produtoId: z.string().min(1, "Produto é obrigatório"),
  quantidade: z.number().positive("Quantidade deve ser maior que zero"),
  custoUnitario: z.number().positive("Custo unitário deve ser maior que zero"),
})

const criarEntradaSchema = z.object({
  fornecedorId: z.string().min(1, "Fornecedor é obrigatório"),
  numeroNF: z.string().min(1, "Número da NF é obrigatório"),
  serie: z.string().optional(),
  dataEmissao: z.string().min(1, "Data de emissão é obrigatória"),
  dataRecebimento: z.string().min(1, "Data de recebimento é obrigatória"),
  observacao: z.string().optional(),
  itens: z.array(entradaItemSchema).min(1, "Pelo menos um item é obrigatório"),
})

type FornecedorInput = z.infer<typeof fornecedorSchema>
type CriarEntradaInput = z.infer<typeof criarEntradaSchema>

/**
 * Lista todos os fornecedores ativos da empresa
 */
export async function actionListarFornecedores() {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado" }
  }

  try {
    const fornecedores = await prisma.fornecedor.findMany({
      where: {
        empresaId: session.user.empresaId,
        status: "ativo",
      },
      orderBy: { nome: "asc" },
    })

    return {
      ok: true,
      data: fornecedores.map((f: any) => ({
        id: f.id,
        nome: f.nome,
        contato: f.contato ?? undefined,
      })),
    }
  } catch (error) {
    console.error("Erro ao listar fornecedores:", error)
    return { ok: false, error: "Erro ao listar fornecedores" }
  }
}

/**
 * Cria um novo fornecedor
 */
export async function actionCriarFornecedor(input: FornecedorInput) {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado" }
  }

  const validationResult = fornecedorSchema.safeParse(input)
  if (!validationResult.success) {
    return { ok: false, error: "Dados inválidos" }
  }

  try {
    const fornecedor = await prisma.fornecedor.create({
      data: {
        empresaId: session.user.empresaId,
        nome: input.nome,
        contato: input.contato,
        status: "ativo",
      },
    })

    return {
      ok: true,
      data: {
        id: fornecedor.id,
        nome: fornecedor.nome,
        contato: fornecedor.contato ?? undefined,
      },
    }
  } catch (error) {
    console.error("Erro ao criar fornecedor:", error)
    return { ok: false, error: "Erro ao criar fornecedor" }
  }
}

/**
 * Lista entradas de estoque da empresa com filtros opcionais
 */
export async function actionListarEntradas(filtros?: {
  fornecedorId?: string
  dataInicio?: string
  dataFim?: string
}) {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado" }
  }

  try {
    const entradas = await prisma.entradaEstoque.findMany({
      where: {
        empresaId: session.user.empresaId,
        ...(filtros?.fornecedorId ? { fornecedorId: filtros.fornecedorId } : {}),
        ...(filtros?.dataInicio || filtros?.dataFim
          ? {
              dataRecebimento: {
                ...(filtros.dataInicio ? { gte: new Date(filtros.dataInicio) } : {}),
                ...(filtros.dataFim ? { lte: new Date(filtros.dataFim) } : {}),
              },
            }
          : {}),
      },
      include: {
        fornecedor: true,
        lancadoPor: {
          select: { nome: true },
        },
        itens: {
          include: {
            produto: true,
          },
        },
      },
      orderBy: { dataRecebimento: "desc" },
    })

    return {
      ok: true,
      data: entradas.map((e) => ({
        id: e.id,
        fornecedorId: e.fornecedorId,
        fornecedorNome: e.fornecedor.nome,
        numeroNF: e.numeroNF,
        serie: e.serie ?? undefined,
        dataEmissao: e.dataEmissao.toISOString().split("T")[0],
        dataRecebimento: e.dataRecebimento.toISOString().split("T")[0],
        observacao: e.observacao ?? undefined,
        lancadoPor: e.lancadoPor.nome,
        dataHoraLancamento: e.dataHoraLancamento.toISOString(),
        itens: e.itens.map((i) => ({
          id: i.id,
          produtoId: i.produtoId,
          produtoNome: i.produto.nome,
          quantidade: Number(i.quantidade),
          custoUnitario: Number(i.custoUnitario),
        })),
      })),
    }
  } catch (error) {
    console.error("Erro ao listar entradas:", error)
    return { ok: false, error: "Erro ao listar entradas" }
  }
}

/**
 * Verifica se já existe uma entrada com o mesmo fornecedor + número de NF
 */
export async function actionVerificarDuplicata({
  fornecedorId,
  numeroNF,
  ignorarId,
}: {
  fornecedorId: string
  numeroNF: string
  ignorarId?: string
}) {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado" }
  }

  try {
    const duplicata = await prisma.entradaEstoque.findFirst({
      where: {
        empresaId: session.user.empresaId,
        fornecedorId,
        numeroNF: numeroNF.trim(),
        ...(ignorarId ? { id: { not: ignorarId } } : {}),
      },
    })

    return {
      ok: true,
      data: { isDuplicata: !!duplicata },
    }
  } catch (error) {
    console.error("Erro ao verificar duplicata:", error)
    return { ok: false, error: "Erro ao verificar duplicata" }
  }
}

/**
 * Cria uma nova entrada de estoque
 * - Cria EntradaEstoque + EntradaItem[]
 * - Aplica movimentação de estoque (tipo ENTRADA) para cada item
 * - Registra auditoria
 * Tudo em uma transação atômica
 */
export async function actionCriarEntrada(input: CriarEntradaInput) {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado" }
  }

  const validationResult = criarEntradaSchema.safeParse(input)
  if (!validationResult.success) {
    return { ok: false, error: "Dados inválidos" }
  }

  // Verificar duplicata antes de criar
  const duplicataCheck = await actionVerificarDuplicata({
    fornecedorId: input.fornecedorId,
    numeroNF: input.numeroNF,
  })
  if (!duplicataCheck.ok) {
    return { ok: false, error: "Erro ao verificar duplicata" }
  }
  if (duplicataCheck.data?.isDuplicata) {
    return { ok: false, error: "Já existe uma entrada com esta nota fiscal deste fornecedor" }
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // Criar entrada
      const entrada = await tx.entradaEstoque.create({
        data: {
          empresaId: session.user.empresaId,
          fornecedorId: input.fornecedorId,
          numeroNF: input.numeroNF.trim(),
          serie: input.serie?.trim() || null,
          dataEmissao: new Date(input.dataEmissao),
          dataRecebimento: new Date(input.dataRecebimento),
          observacao: input.observacao?.trim() || null,
          lancadoPorId: session.user.id,
        },
      })

      // Criar itens e aplicar movimentação de estoque
      for (const item of input.itens) {
        // Criar item da entrada
        await tx.entradaItem.create({
          data: {
            entradaId: entrada.id,
            produtoId: item.produtoId,
            quantidade: item.quantidade,
            custoUnitario: item.custoUnitario,
          },
        })

        // Aplicar movimentação de estoque (ENTRADA)
        const resultadoMovimentacao = await actionAplicarMovimentacao(
          {
            produtoId: item.produtoId,
            tipo: "ENTRADA",
            quantidade: item.quantidade,
            pedidoId: undefined,
          },
          tx
        )

        if (!resultadoMovimentacao.ok) {
          throw new Error(`Falha ao aplicar movimentação de estoque: ${resultadoMovimentacao.error}`)
        }
      }

      return entrada
    })

    // Registrar auditoria (fora da transação, não é crítico falhar aqui)
    await actionRegistrarAuditoria({
      modulo: "INVENTARIO",
      acao: "CRIADO",
      entidadeId: resultado.id,
      entidadeDescricao: `Entrada de estoque: NF ${input.numeroNF}`,
      descricao: `Entrada de estoque criada: NF ${input.numeroNF} com ${input.itens.length} itens`,
    })

    return {
      ok: true,
      data: {
        id: resultado.id,
        numeroNF: resultado.numeroNF,
      },
    }
  } catch (error) {
    console.error("Erro ao criar entrada:", error)
    return { ok: false, error: "Erro ao criar entrada de estoque" }
  }
}
