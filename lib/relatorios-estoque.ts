import type { Produto } from "@/types/domain"
import { prisma } from "@/lib/db"
import { obterMovimentacoes } from "@/lib/estoque-ledger"
import { obterCategoriaProduto, ESTOQUE_MINIMO_MAP, calcularInventario } from "@/lib/mock-inventario"
import { diasDesdeUltimaMovimentacao } from "@/lib/relatorios-utils"

export interface IndicadoresEstoque {
  valorTotalEstoque: number
  quantidadeTotalItens: number
  produtosAbaixoMinimo: number
  produtosSemMovimentacao: number
}

export interface FiltrosEstoque {
  categoriaId?: string
  produtoId?: string
  diasSemMovimentacaoMin?: number // padrão: 30 dias
}

export type StatusEstoqueRelatorio = "Normal" | "Abaixo do mínimo" | "Parado"

export interface LinhaTabelaEstoque {
  produto: string
  sku: string
  categoria: string
  saldoAtual: number
  reservado: number
  disponivel: number
  valorEmEstoque: number
  giro: number | null // saída nos últimos 30 dias ÷ saldo médio
  diasSemMovimentacao: number
  status: StatusEstoqueRelatorio
}

/**
 * Calcula indicadores do relatório de estoque para uma empresa.
 * Não usa período (são indicadores de estado atual).
 * Filtra por empresaId antes de processar (usando Produto.empresaId).
 * 
 * Nota: Usa custo × saldo para valor em estoque.
 * Não há tipo "DIVERGENCIA" em TipoEstoqueMovimentacao (só RESERVA e LIBERACAO_RESERVA).
 */
export async function calcularIndicadoresEstoque(
  empresaId: string,
  filtros?: FiltrosEstoque
): Promise<{ indicadores: IndicadoresEstoque; tabela: LinhaTabelaEstoque[] }> {
  const diasSemMovimentacaoMin = filtros?.diasSemMovimentacaoMin ?? 30
  const limiteParado = 60 // dias sem movimentação para considerar "Parado"

  // Filtra produtos por empresaId usando Prisma
  const produtosPrisma = await prisma.produto.findMany({
    where: {
      empresaId,
      ...(filtros?.produtoId ? { id: filtros.produtoId } : {}),
      status: "ativo",
    },
  })

  // Formata produtos para o tipo domain (converte null para undefined)
  const produtosFiltrados = produtosPrisma.map((p) => ({
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
    estoqueAtual: p.estoqueAtual,
    corredor: p.corredor ?? undefined,
  }))

  // Calcula inventário para cada produto
  const inventarios = []
  for (const produto of produtosFiltrados) {
    inventarios.push(await calcularInventario(produto))
  }

  // Busca movimentações para calcular giro
  const todasMovimentacoes = await obterMovimentacoes(empresaId)
  const data30DiasAtras = new Date()
  data30DiasAtras.setDate(data30DiasAtras.getDate() - 30)

  // Monta Map por id para busca eficiente
  const produtosMap = new Map(produtosFiltrados.map((p) => [p.id, p]))

  // Gera dados da tabela
  const tabela: LinhaTabelaEstoque[] = []
  for (const inv of inventarios) {
    const produto = produtosMap.get(inv.produtoId)
    if (!produto) {
      continue
    }
    const categoria = obterCategoriaProduto(produto.id)
    const estoqueMinimo = ESTOQUE_MINIMO_MAP[produto.id] || 10

    // Valor em estoque (usa custo real)
    const valorEmEstoque = inv.estoqueFisico * Number(produto.custo)

    // Calcula giro: saída nos últimos 30 dias ÷ saldo médio
    // Saída = LIBERACAO_RESERVA (liberação de reserva = saída de estoque)
    const movimentacoes30Dias = todasMovimentacoes.filter((m) => {
      if (m.produtoId !== produto.id) return false
      const dataMov = new Date(m.dataHora)
      return dataMov >= data30DiasAtras && m.tipo === "LIBERACAO_RESERVA"
    })
    const saida30Dias = movimentacoes30Dias.reduce((acc, m) => acc + Number(m.quantidade), 0)
    const saldoMedio = inv.estoqueFisico // simplificação: usa saldo atual como saldo médio
    const giro = saldoMedio > 0 ? saida30Dias / saldoMedio : null

    // Dias sem movimentação
    const diasSemMovimentacao = diasDesdeUltimaMovimentacao(inv.ultimaMovimentacao)

    // Status
    let status: StatusEstoqueRelatorio = "Normal"
    if (inv.disponivel <= estoqueMinimo) {
      status = "Abaixo do mínimo"
    }
    if (diasSemMovimentacao >= limiteParado) {
      status = "Parado"
    }

    tabela.push({
      produto: produto.nome,
      sku: produto.skuInterno,
      categoria,
      saldoAtual: inv.estoqueFisico,
      reservado: inv.estoqueFisico - inv.disponivel,
      disponivel: inv.disponivel,
      valorEmEstoque,
      giro,
      diasSemMovimentacao,
      status,
    })
  }

  // Ordena por dias sem movimentação, decrescente
  tabela.sort((a, b) => b.diasSemMovimentacao - a.diasSemMovimentacao)

  // Calcula indicadores agregados
  const valorTotalEstoque = tabela.reduce((acc, linha) => acc + linha.valorEmEstoque, 0)
  const quantidadeTotalItens = tabela.reduce((acc, linha) => acc + linha.saldoAtual, 0)
  const produtosAbaixoMinimo = tabela.filter(
    (linha) => linha.status === "Abaixo do mínimo"
  ).length
  const produtosSemMovimentacao = tabela.filter(
    (linha) => linha.diasSemMovimentacao >= diasSemMovimentacaoMin
  ).length

  return {
    indicadores: {
      valorTotalEstoque,
      quantidadeTotalItens,
      produtosAbaixoMinimo,
      produtosSemMovimentacao,
    },
    tabela,
  }
}
