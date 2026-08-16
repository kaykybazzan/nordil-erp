"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { actionRegistrarAuditoria } from "@/lib/actions/auditoria"
import { z } from "zod"

const ProdutoInputSchema = z.object({
  skuInterno: z.string().min(1, "SKU interno é obrigatório"),
  referenciaComercial: z.string().optional(),
  codigoBarras: z.string().optional(),
  nome: z.string().min(1, "Nome é obrigatório"),
  marca: z.string().min(1, "Marca é obrigatória"),
  unidadeMedida: z.enum(["UN", "M", "KG", "CX"]),
  permiteFracionado: z.boolean(),
  custo: z.number().nonnegative().optional(), // Optional for non-ADMIN
  precoVenda: z.number().nonnegative().optional(), // Optional for non-ADMIN
  status: z.enum(["ativo", "inativo"]),
  corredor: z.string().optional(),
  categoria: z.string().optional(),
  fornecedor: z.string().optional(),
  estoqueMinimo: z.number().int().nonnegative().default(10),
})

type ProdutoInput = z.infer<typeof ProdutoInputSchema>

export async function listarProdutos() {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado" }
  }

  try {
    const produtos = await prisma.produto.findMany({
      where: { empresaId: session.user.empresaId },
      orderBy: { createdAt: "desc" },
    })

    const produtosFormatados = produtos.map((p: any) => ({
      id: p.id,
      empresaId: p.empresaId,
      skuInterno: p.skuInterno,
      referenciaComercial: p.referenciaComercial ?? undefined,
      codigoBarras: p.codigoBarras ?? undefined,
      nome: p.nome,
      marca: p.marca,
      unidadeMedida: p.unidadeMedida as "UN" | "M" | "KG" | "CX",
      permiteFracionado: p.permiteFracionado,
      custo: Number(p.custo),
      precoVenda: Number(p.precoVenda),
      status: p.status as "ativo" | "inativo",
      estoqueAtual: Number(p.estoqueAtual),
      corredor: p.corredor ?? undefined,
      categoria: p.categoria ?? undefined,
      fornecedor: p.fornecedor ?? undefined,
      estoqueMinimo: p.estoqueMinimo,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }))

    return { ok: true, data: produtosFormatados }
  } catch (error) {
    console.error("Erro ao listar produtos:", error)
    return { ok: false, error: "Erro ao carregar produtos" }
  }
}

export async function criarProduto(input: ProdutoInput) {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado" }
  }

  const validated = ProdutoInputSchema.safeParse(input)
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0].message }
  }

  const dados = validated.data

  // Force financial fields to 0 for non-ADMIN users
  const isAdmin = session.user.role === "ADMIN"
  const custoFinal = isAdmin ? (dados.custo ?? 0) : 0
  const precoVendaFinal = isAdmin ? (dados.precoVenda ?? 0) : 0

  try {
    const produto = await prisma.produto.create({
      data: {
        empresaId: session.user.empresaId,
        skuInterno: dados.skuInterno,
        referenciaComercial: dados.referenciaComercial,
        codigoBarras: dados.codigoBarras,
        nome: dados.nome,
        marca: dados.marca,
        unidadeMedida: dados.unidadeMedida,
        permiteFracionado: dados.permiteFracionado,
        custo: custoFinal,
        precoVenda: precoVendaFinal,
        status: dados.status,
        corredor: dados.corredor,
        categoria: dados.categoria,
        fornecedor: dados.fornecedor,
        estoqueMinimo: dados.estoqueMinimo,
        estoqueAtual: 0, // Sempre inicia com 0, nunca editável via formulário
      },
    })

    await actionRegistrarAuditoria({
      modulo: "PRODUTOS",
      acao: "CRIADO",
      entidadeId: produto.id,
      entidadeDescricao: `Produto: ${produto.nome} (${produto.skuInterno})`,
      descricao: `Produto ${produto.nome} (${produto.skuInterno}) criado.`,
    })

    const produtoFormatado = {
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
      estoqueAtual: Number(produto.estoqueAtual),
      corredor: produto.corredor ?? undefined,
      categoria: produto.categoria ?? undefined,
      fornecedor: produto.fornecedor ?? undefined,
      estoqueMinimo: produto.estoqueMinimo,
      createdAt: produto.createdAt.toISOString(),
      updatedAt: produto.updatedAt.toISOString(),
    }

    return { ok: true, data: produtoFormatado }
  } catch (error: any) {
    if (error.code === "P2002") {
      return { ok: false, error: "Já existe um produto com este SKU interno nesta empresa." }
    }
    console.error("Erro ao criar produto:", error)
    return { ok: false, error: "Erro ao criar produto" }
  }
}

export async function atualizarProduto(id: string, input: ProdutoInput) {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado" }
  }

  const validated = ProdutoInputSchema.safeParse(input)
  if (!validated.success) {
    return { ok: false, error: validated.error.issues[0].message }
  }

  const dados = validated.data

  try {
    const produtoAntigo = await prisma.produto.findUnique({
      where: { id },
    })

    if (!produtoAntigo) {
      return { ok: false, error: "Produto não encontrado" }
    }

    if (produtoAntigo.empresaId !== session.user.empresaId) {
      return { ok: false, error: "Não autorizado" }
    }

    // Force financial fields to 0 for non-ADMIN users, or preserve existing values
    const isAdmin = session.user.role === "ADMIN"
    const custoFinal = isAdmin ? (dados.custo ?? produtoAntigo.custo) : produtoAntigo.custo
    const precoVendaFinal = isAdmin ? (dados.precoVenda ?? produtoAntigo.precoVenda) : produtoAntigo.precoVenda

    const produto = await prisma.produto.update({
      where: { id },
      data: {
        skuInterno: dados.skuInterno,
        referenciaComercial: dados.referenciaComercial,
        codigoBarras: dados.codigoBarras,
        nome: dados.nome,
        marca: dados.marca,
        unidadeMedida: dados.unidadeMedida,
        permiteFracionado: dados.permiteFracionado,
        custo: custoFinal,
        precoVenda: precoVendaFinal,
        status: dados.status,
        corredor: dados.corredor,
        categoria: dados.categoria,
        fornecedor: dados.fornecedor,
        estoqueMinimo: dados.estoqueMinimo,
        // estoqueAtual NUNCA incluído no update - só via EstoqueService futuro
      },
    })

    const camposAlterados: { campo: string; valorAnterior: string; valorNovo: string }[] = []

    if (produtoAntigo.nome !== produto.nome) {
      camposAlterados.push({ campo: "nome", valorAnterior: produtoAntigo.nome, valorNovo: produto.nome })
    }
    if (produtoAntigo.skuInterno !== produto.skuInterno) {
      camposAlterados.push({ campo: "skuInterno", valorAnterior: produtoAntigo.skuInterno, valorNovo: produto.skuInterno })
    }
    if (produtoAntigo.marca !== produto.marca) {
      camposAlterados.push({ campo: "marca", valorAnterior: produtoAntigo.marca, valorNovo: produto.marca })
    }
    if (produtoAntigo.status !== produto.status) {
      camposAlterados.push({ campo: "status", valorAnterior: produtoAntigo.status, valorNovo: produto.status })
    }

    await actionRegistrarAuditoria({
      modulo: "PRODUTOS",
      acao: "ATUALIZADO",
      entidadeId: produto.id,
      entidadeDescricao: `Produto: ${produto.nome} (${produto.skuInterno})`,
      descricao: `Produto ${produto.nome} (${produto.skuInterno}) atualizado.`,
      camposAlterados,
    })

    const produtoFormatado = {
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
      estoqueAtual: Number(produto.estoqueAtual),
      corredor: produto.corredor ?? undefined,
      categoria: produto.categoria ?? undefined,
      fornecedor: produto.fornecedor ?? undefined,
      estoqueMinimo: produto.estoqueMinimo,
      createdAt: produto.createdAt.toISOString(),
      updatedAt: produto.updatedAt.toISOString(),
    }

    return { ok: true, data: produtoFormatado }
  } catch (error: any) {
    if (error.code === "P2002") {
      return { ok: false, error: "Já existe um produto com este SKU interno nesta empresa." }
    }
    console.error("Erro ao atualizar produto:", error)
    return { ok: false, error: "Erro ao atualizar produto" }
  }
}

export async function inativarProduto(id: string) {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado" }
  }

  try {
    const produto = await prisma.produto.findUnique({ where: { id } })
    if (!produto) {
      return { ok: false, error: "Produto não encontrado" }
    }

    if (produto.empresaId !== session.user.empresaId) {
      return { ok: false, error: "Não autorizado" }
    }

    const atualizado = await prisma.produto.update({
      where: { id },
      data: { status: "inativo" },
    })

    await actionRegistrarAuditoria({
      modulo: "PRODUTOS",
      acao: "STATUS_ALTERADO",
      entidadeId: produto.id,
      entidadeDescricao: `Produto: ${produto.nome} (${produto.skuInterno})`,
      descricao: `Produto ${produto.nome} (${produto.skuInterno}) inativado.`,
    })

    const produtoFormatado = {
      id: atualizado.id,
      empresaId: atualizado.empresaId,
      skuInterno: atualizado.skuInterno,
      referenciaComercial: atualizado.referenciaComercial ?? undefined,
      codigoBarras: atualizado.codigoBarras ?? undefined,
      nome: atualizado.nome,
      marca: atualizado.marca,
      unidadeMedida: atualizado.unidadeMedida as "UN" | "M" | "KG" | "CX",
      permiteFracionado: atualizado.permiteFracionado,
      custo: Number(atualizado.custo),
      precoVenda: Number(atualizado.precoVenda),
      status: atualizado.status as "ativo" | "inativo",
      estoqueAtual: Number(atualizado.estoqueAtual),
      corredor: atualizado.corredor ?? undefined,
      categoria: atualizado.categoria ?? undefined,
      fornecedor: atualizado.fornecedor ?? undefined,
      estoqueMinimo: atualizado.estoqueMinimo,
      createdAt: atualizado.createdAt.toISOString(),
      updatedAt: atualizado.updatedAt.toISOString(),
    }

    return { ok: true, data: produtoFormatado }
  } catch (error) {
    console.error("Erro ao inativar produto:", error)
    return { ok: false, error: "Erro ao inativar produto" }
  }
}

export async function reativarProduto(id: string) {
  const session = await auth()
  if (!session?.user?.empresaId) {
    return { ok: false, error: "Não autenticado" }
  }

  try {
    const produto = await prisma.produto.findUnique({ where: { id } })
    if (!produto) {
      return { ok: false, error: "Produto não encontrado" }
    }

    if (produto.empresaId !== session.user.empresaId) {
      return { ok: false, error: "Não autorizado" }
    }

    const atualizado = await prisma.produto.update({
      where: { id },
      data: { status: "ativo" },
    })

    await actionRegistrarAuditoria({
      modulo: "PRODUTOS",
      acao: "STATUS_ALTERADO",
      entidadeId: produto.id,
      entidadeDescricao: `Produto: ${produto.nome} (${produto.skuInterno})`,
      descricao: `Produto ${produto.nome} (${produto.skuInterno}) reativado.`,
    })

    const produtoFormatado = {
      id: atualizado.id,
      empresaId: atualizado.empresaId,
      skuInterno: atualizado.skuInterno,
      referenciaComercial: atualizado.referenciaComercial ?? undefined,
      codigoBarras: atualizado.codigoBarras ?? undefined,
      nome: atualizado.nome,
      marca: atualizado.marca,
      unidadeMedida: atualizado.unidadeMedida as "UN" | "M" | "KG" | "CX",
      permiteFracionado: atualizado.permiteFracionado,
      custo: Number(atualizado.custo),
      precoVenda: Number(atualizado.precoVenda),
      status: atualizado.status as "ativo" | "inativo",
      estoqueAtual: Number(atualizado.estoqueAtual),
      corredor: atualizado.corredor ?? undefined,
      categoria: atualizado.categoria ?? undefined,
      fornecedor: atualizado.fornecedor ?? undefined,
      estoqueMinimo: atualizado.estoqueMinimo,
      createdAt: atualizado.createdAt.toISOString(),
      updatedAt: atualizado.updatedAt.toISOString(),
    }

    return { ok: true, data: produtoFormatado }
  } catch (error) {
    console.error("Erro ao reativar produto:", error)
    return { ok: false, error: "Erro ao reativar produto" }
  }
}
