import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  InventarioContagem,
  ItemInventarioContagem,
  Usuario,
  TipoEscopoInventario,
  StatusItemContagem,
  EstoqueMovimentacao,
} from "@/types/domain"
import { prisma } from "./db"
import { actionObterMovimentacoes, actionAplicarMovimentacao } from "./actions/estoque"
import { actionRegistrarAuditoria } from "./actions/auditoria"
import {
  podeAbrirInventario,
  podeContarInventario,
  podeAplicarAjusteInventario,
  podeFinalizarInventario,
  podeReatribuirResponsavelInventario,
} from "./policies"
import { obterCategoriaProduto, obterFornecedorProduto, ESTOQUE_MINIMO_MAP } from "./mock-inventario"

function gerarId(prefixo: string) {
  return `${prefixo}-${Math.random().toString(36).slice(2, 9)}`
}

type ResultadoInventario = { sucesso: true; inventario: InventarioContagem } | { sucesso: false; erro: string }

interface AbrirInventarioInput {
  tipoEscopo: TipoEscopoInventario
  recorte: string | null // corredor, categoria, fornecedor, or null for TODOS_PRODUTOS/LISTA_MANUAL
  listaManualProdutoIds?: string[] // only for LISTA_MANUAL
  responsavelContagemId: string
  observacao?: string
  usuario: Usuario
}

interface InventarioContagemState {
  inventarios: InventarioContagem[]

  abrirInventario: (input: AbrirInventarioInput) => Promise<ResultadoInventario>
  registrarContagem: (inventarioId: string, itemId: string, quantidadeContada: number, usuario: Usuario) => Promise<ResultadoInventario>
  recontarItem: (inventarioId: string, itemId: string, usuario: Usuario) => Promise<ResultadoInventario>
  aplicarAjuste: (inventarioId: string, itemId: string, usuario: Usuario) => Promise<ResultadoInventario>
  aplicarTodosAjustes: (inventarioId: string, usuario: Usuario) => Promise<ResultadoInventario>
  reatribuirResponsavel: (inventarioId: string, novoResponsavelId: string, usuario: Usuario) => Promise<ResultadoInventario>
  finalizarInventario: (inventarioId: string, usuario: Usuario) => Promise<ResultadoInventario>
}

async function calcularSaldoAtual(produtoId: string, empresaId: string): Promise<number> {
  const produto = await prisma.produto.findFirst({
    where: { id: produtoId, empresaId },
  })
  return produto ? produto.estoqueAtual : 0
}

async function obterUltimaMovimentacaoId(produtoId: string, empresaId: string): Promise<string | null> {
  const resultado = await actionObterMovimentacoes({ produtoId })
  if (!resultado.ok || !resultado.data) return null
  const movimentacoes = resultado.data
  const movimentacoesProduto = movimentacoes.filter((m) => m.produtoId === produtoId)
  if (movimentacoesProduto.length === 0) return null
  // Ordenar por dataHora descendente e pegar a mais recente
  const ordenadas = movimentacoesProduto.sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())
  return ordenadas[0].id
}

async function resolverProdutosDoEscopo(
  tipoEscopo: TipoEscopoInventario,
  recorte: string | null,
  empresaId: string,
  listaManualProdutoIds?: string[]
) {
  const produtos = await prisma.produto.findMany({
    where: {
      status: "ativo",
      empresaId,
    },
  })

  switch (tipoEscopo) {
    case "CORREDOR":
      if (!recorte) return []
      return produtos.filter((p) => p.corredor === recorte)

    case "CATEGORIA":
      if (!recorte) return []
      return produtos.filter((p) => obterCategoriaProduto(p.id) === recorte)

    case "FORNECEDOR":
      if (!recorte) return []
      return produtos.filter((p) => obterFornecedorProduto(p.id) === recorte)

    case "LISTA_MANUAL":
      if (!listaManualProdutoIds) return []
      return produtos.filter((p) => listaManualProdutoIds.includes(p.id))

    case "ESTOQUE_BAIXO":
      // Produtos com estoqueAtual <= estoqueMinimo (usando mapa único do mock-inventario)
      return produtos.filter((p) => p.estoqueAtual <= (ESTOQUE_MINIMO_MAP[p.id] || 10))

    case "TODOS_PRODUTOS":
      return produtos

    default:
      return []
  }
}

function gerarDescricaoEscopo(tipoEscopo: TipoEscopoInventario, recorte: string | null, quantidadeItens: number): string {
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

export const useInventarioContagemStore = create<InventarioContagemState>()(
  persist(
    (set, get) => ({
      inventarios: [],

      abrirInventario: async (input) => {
        const { tipoEscopo, recorte, listaManualProdutoIds, responsavelContagemId, observacao, usuario } = input

        // Validação: permissão
        if (!podeAbrirInventario(usuario)) {
          return { sucesso: false, erro: "Sem permissão para abrir inventário." }
        }

        // Validação: tipoEscopo e recorte
        if (tipoEscopo === "CORREDOR" && !recorte) {
          return { sucesso: false, erro: "Para escopo CORREDOR, informe o corredor." }
        }
        if (tipoEscopo === "CATEGORIA" && !recorte) {
          return { sucesso: false, erro: "Para escopo CATEGORIA, informe a categoria." }
        }
        if (tipoEscopo === "FORNECEDOR" && !recorte) {
          return { sucesso: false, erro: "Para escopo FORNECEDOR, informe o fornecedor." }
        }
        if (tipoEscopo === "LISTA_MANUAL" && (!listaManualProdutoIds || listaManualProdutoIds.length === 0)) {
          return { sucesso: false, erro: "Para escopo LISTA_MANUAL, informe ao menos um produto." }
        }

        // Resolver produtos do escopo
        const produtos = await resolverProdutosDoEscopo(tipoEscopo, recorte, usuario.empresaId, listaManualProdutoIds)
        if (produtos.length === 0) {
          return { sucesso: false, erro: "Nenhum produto encontrado para o escopo informado." }
        }

        const agora = new Date().toISOString()
        const inventarioId = gerarId("inv")

        // Gerar snapshot para cada produto
        const itens: ItemInventarioContagem[] = []
        for (const produto of produtos) {
          const saldoEsperado = await calcularSaldoAtual(produto.id, usuario.empresaId)
          const ultimaMovimentacaoId = await obterUltimaMovimentacaoId(produto.id, usuario.empresaId)

          itens.push({
            id: gerarId("item"),
            produtoId: produto.id,
            saldoEsperado,
            ultimaMovimentacaoId: ultimaMovimentacaoId || "",
            quantidadeContada: null,
            status: "PENDENTE" as StatusItemContagem,
            contadoEm: null,
          })
        }

        const descricaoEscopo = gerarDescricaoEscopo(tipoEscopo, recorte, itens.length)

        const inventario: InventarioContagem = {
          id: inventarioId,
          empresaId: usuario.empresaId,
          tipoEscopo,
          descricaoEscopo,
          recorte,
          observacao,
          itens,
          status: "EM_ANDAMENTO",
          abertoPorId: usuario.id,
          responsavelContagemId,
          abertoEm: agora,
          finalizadoEm: null,
          finalizadoComPendencias: false,
        }

        // Registrar auditoria
        actionRegistrarAuditoria({
          modulo: "INVENTARIO",
          acao: "CRIADO",
          entidadeId: inventarioId,
          descricao: `Inventário iniciado: ${descricaoEscopo}. Responsável: ${responsavelContagemId}.`,
        }).then((result) => {
          if (!result.ok) console.error("Erro ao registrar auditoria:", result.error)
        })

        set((state) => ({
          inventarios: [...state.inventarios, inventario],
        }))

        return { sucesso: true, inventario }
      },

      registrarContagem: async (inventarioId, itemId, quantidadeContada, usuario) => {
        const inventario = get().inventarios.find((i) => i.id === inventarioId)
        if (!inventario) {
          return { sucesso: false, erro: "Inventário não encontrado." }
        }

        // Validação: permissão
        if (!podeContarInventario(usuario, inventario)) {
          return { sucesso: false, erro: "Sem permissão para contar neste inventário." }
        }

        // Validação: status
        if (inventario.status !== "EM_ANDAMENTO") {
          return { sucesso: false, erro: "Só é possível contar em inventários em andamento." }
        }

        const item = inventario.itens.find((i) => i.id === itemId)
        if (!item) {
          return { sucesso: false, erro: "Item não encontrado no inventário." }
        }

        // Validação: quantidadeContada numérica, >= 0
        if (typeof quantidadeContada !== "number" || quantidadeContada < 0) {
          return { sucesso: false, erro: "Quantidade contada deve ser um número não negativo." }
        }

        // Verificar se existe movimentação nova após o snapshot do item
        const resultadoMovimentacoes = await actionObterMovimentacoes({ produtoId: item.produtoId })
        if (!resultadoMovimentacoes.ok || !resultadoMovimentacoes.data) {
          return { sucesso: false, erro: "Erro ao verificar movimentações." }
        }
        const movimentacoes = resultadoMovimentacoes.data
        const movimentacoesProduto = movimentacoes.filter((m) => m.produtoId === item.produtoId)
        const movimentacaoSnapshot = item.ultimaMovimentacaoId
          ? movimentacoesProduto.find((m) => m.id === item.ultimaMovimentacaoId)
          : null

        const dataHoraSnapshot = movimentacaoSnapshot ? new Date(movimentacaoSnapshot.dataHora).getTime() : 0
        const temMovimentacaoNova = movimentacoesProduto.some(
          (m) => new Date(m.dataHora).getTime() > dataHoraSnapshot
        )

        const agora = new Date().toISOString()
        let novoStatus: StatusItemContagem

        if (temMovimentacaoNova) {
          // Houve movimentação nova: status NECESSITA_RECONTAGEM
          novoStatus = "NECESSITA_RECONTAGEM"
        } else {
          // Sem movimentação nova: comparar com saldoEsperado
          if (quantidadeContada === item.saldoEsperado) {
            novoStatus = "CONTADO_OK"
          } else {
            novoStatus = "DIVERGENTE"
          }
        }

        const itensAtualizados = inventario.itens.map((i) =>
          i.id === itemId
            ? {
                ...i,
                quantidadeContada,
                status: novoStatus,
                contadoEm: agora,
              }
            : i
        )

        const inventarioAtualizado: InventarioContagem = {
          ...inventario,
          itens: itensAtualizados,
        }

        set((state) => ({
          inventarios: state.inventarios.map((i) => (i.id === inventarioId ? inventarioAtualizado : i)),
        }))

        return { sucesso: true, inventario: inventarioAtualizado }
      },

      recontarItem: async (inventarioId, itemId, usuario) => {
        const inventario = get().inventarios.find((i) => i.id === inventarioId)
        if (!inventario) {
          return { sucesso: false, erro: "Inventário não encontrado." }
        }

        // Validação: permissão
        if (!podeContarInventario(usuario, inventario)) {
          return { sucesso: false, erro: "Sem permissão para contar neste inventário." }
        }

        // Validação: status
        if (inventario.status !== "EM_ANDAMENTO") {
          return { sucesso: false, erro: "Só é possível recontar em inventários em andamento." }
        }

        const item = inventario.itens.find((i) => i.id === itemId)
        if (!item) {
          return { sucesso: false, erro: "Item não encontrado no inventário." }
        }

        // Gerar novo snapshot para o item
        const novoSaldoEsperado = await calcularSaldoAtual(item.produtoId, usuario.empresaId)
        const novaUltimaMovimentacaoId = await obterUltimaMovimentacaoId(item.produtoId, usuario.empresaId)

        const itensAtualizados = inventario.itens.map((i) =>
          i.id === itemId
            ? {
                ...i,
                saldoEsperado: novoSaldoEsperado,
                ultimaMovimentacaoId: novaUltimaMovimentacaoId || "",
                quantidadeContada: null,
                status: "PENDENTE" as StatusItemContagem,
                contadoEm: null,
              }
            : i
        )

        const inventarioAtualizado: InventarioContagem = {
          ...inventario,
          itens: itensAtualizados,
        }

        set((state) => ({
          inventarios: state.inventarios.map((i) => (i.id === inventarioId ? inventarioAtualizado : i)),
        }))

        return { sucesso: true, inventario: inventarioAtualizado }
      },

      aplicarAjuste: async (inventarioId, itemId, usuario) => {
        const inventario = get().inventarios.find((i) => i.id === inventarioId)
        if (!inventario) {
          return { sucesso: false, erro: "Inventário não encontrado." }
        }

        // Validação: permissão
        if (!podeAplicarAjusteInventario(usuario)) {
          return { sucesso: false, erro: "Sem permissão para aplicar ajustes." }
        }

        // Validação: status do inventário
        if (inventario.status !== "EM_ANDAMENTO") {
          return { sucesso: false, erro: "Só é possível aplicar ajustes em inventários em andamento." }
        }

        const item = inventario.itens.find((i) => i.id === itemId)
        if (!item) {
          return { sucesso: false, erro: "Item não encontrado no inventário." }
        }

        // Validação: status do item deve ser DIVERGENTE
        if (item.status !== "DIVERGENTE") {
          return { sucesso: false, erro: "Só é possível ajustar itens com status DIVERGENTE." }
        }

        if (item.quantidadeContada === null) {
          return { sucesso: false, erro: "Item não foi contado ainda." }
        }

        // Calcular diferença
        const diferenca = item.quantidadeContada - item.saldoEsperado
        if (diferenca === 0) {
          return { sucesso: false, erro: "Não há diferença para ajustar." }
        }

        const direcao: "ENTRADA" | "SAIDA" = diferenca > 0 ? "ENTRADA" : "SAIDA"
        const quantidade = Math.abs(diferenca)

        // Registrar movimentação de ajuste via Server Action
        const resultadoMovimentacao = await actionAplicarMovimentacao({
          produtoId: item.produtoId,
          tipo: "AJUSTE",
          quantidade,
          direcao,
        })
        if (!resultadoMovimentacao.ok) {
          return { sucesso: false, erro: resultadoMovimentacao.error || "Erro ao registrar movimentação de ajuste." }
        }

        // Atualizar status do item
        const itensAtualizados = inventario.itens.map((i) =>
          i.id === itemId
            ? {
                ...i,
                status: "AJUSTADO" as StatusItemContagem,
              }
            : i
        )

        const inventarioAtualizado: InventarioContagem = {
          ...inventario,
          itens: itensAtualizados,
        }

        // Registrar auditoria
        const produto = await prisma.produto.findFirst({
          where: { id: item.produtoId, empresaId: inventario.empresaId },
        })
        actionRegistrarAuditoria({
          modulo: "INVENTARIO",
          acao: "ATUALIZADO",
          entidadeId: inventarioId,
          descricao: `Ajuste aplicado: ${produto?.nome ?? item.produtoId}. Diferença: ${diferenca > 0 ? "+" : ""}${diferenca}.`,
        }).then((result) => {
          if (!result.ok) console.error("Erro ao registrar auditoria:", result.error)
        })

        set((state) => ({
          inventarios: state.inventarios.map((i) => (i.id === inventarioId ? inventarioAtualizado : i)),
        }))

        return { sucesso: true, inventario: inventarioAtualizado }
      },

      aplicarTodosAjustes: async (inventarioId, usuario) => {
        const inventario = get().inventarios.find((i) => i.id === inventarioId)
        if (!inventario) {
          return { sucesso: false, erro: "Inventário não encontrado." }
        }

        // Validação: permissão
        if (!podeAplicarAjusteInventario(usuario)) {
          return { sucesso: false, erro: "Sem permissão para aplicar ajustes." }
        }

        // Validação: status
        if (inventario.status !== "EM_ANDAMENTO") {
          return { sucesso: false, erro: "Só é possível aplicar ajustes em inventários em andamento." }
        }

        // Encontrar itens DIVERGENTE
        const itensDivergentes = inventario.itens.filter((i) => i.status === "DIVERGENTE")
        if (itensDivergentes.length === 0) {
          return { sucesso: false, erro: "Nenhum item divergente encontrado para ajuste." }
        }

        // Aplicar ajuste para cada item divergente
        let inventarioAtualizado = inventario
        for (const item of itensDivergentes) {
          const resultado = await get().aplicarAjuste(inventarioId, item.id, usuario)
          if (!resultado.sucesso) {
            return resultado // Retorna o primeiro erro encontrado
          }
          inventarioAtualizado = resultado.inventario
        }

        return { sucesso: true, inventario: inventarioAtualizado }
      },

      reatribuirResponsavel: async (inventarioId, novoResponsavelId, usuario) => {
        const inventario = get().inventarios.find((i) => i.id === inventarioId)
        if (!inventario) {
          return { sucesso: false, erro: "Inventário não encontrado." }
        }

        // Validação: permissão
        if (!podeReatribuirResponsavelInventario(usuario)) {
          return { sucesso: false, erro: "Sem permissão para reatribuir responsável." }
        }

        // Validação: status
        if (inventario.status !== "EM_ANDAMENTO") {
          return { sucesso: false, erro: "Só é possível reatribuir responsável em inventários em andamento." }
        }

        const responsavelAnteriorId = inventario.responsavelContagemId
        if (responsavelAnteriorId === novoResponsavelId) {
          return { sucesso: false, erro: "O novo responsável é o mesmo que o atual." }
        }

        const agora = new Date().toISOString()

        const inventarioAtualizado: InventarioContagem = {
          ...inventario,
          responsavelContagemId: novoResponsavelId,
        }

        // Registrar auditoria
        actionRegistrarAuditoria({
          modulo: "INVENTARIO",
          acao: "ATUALIZADO",
          entidadeId: inventarioId,
          descricao: `Responsável da contagem alterado: ${responsavelAnteriorId} → ${novoResponsavelId}.`,
        }).then((result) => {
          if (!result.ok) console.error("Erro ao registrar auditoria:", result.error)
        })

        set((state) => ({
          inventarios: state.inventarios.map((i) => (i.id === inventarioId ? inventarioAtualizado : i)),
        }))

        return { sucesso: true, inventario: inventarioAtualizado }
      },

      finalizarInventario: async (inventarioId, usuario) => {
        const inventario = get().inventarios.find((i) => i.id === inventarioId)
        if (!inventario) {
          return { sucesso: false, erro: "Inventário não encontrado." }
        }

        // Validação: permissão
        if (!podeFinalizarInventario(usuario)) {
          return { sucesso: false, erro: "Sem permissão para finalizar inventário." }
        }

        // Validação: status
        if (inventario.status !== "EM_ANDAMENTO") {
          return { sucesso: false, erro: "Só é possível finalizar inventários em andamento." }
        }

        // Bloqueia se existir item DIVERGENTE sem ajuste
        const itensDivergentesSemAjuste = inventario.itens.filter((i) => i.status === "DIVERGENTE")
        if (itensDivergentesSemAjuste.length > 0) {
          return { sucesso: false, erro: "Existem itens divergentes sem ajuste aplicado. Resolva as divergências antes de finalizar." }
        }

        // Verifica se há itens NECESSITA_RECONTAGEM
        const itensRecontagem = inventario.itens.filter((i) => i.status === "NECESSITA_RECONTAGEM")
        const finalizadoComPendencias = itensRecontagem.length > 0

        const agora = new Date().toISOString()

        const inventarioAtualizado: InventarioContagem = {
          ...inventario,
          status: "FINALIZADO",
          finalizadoEm: agora,
          finalizadoComPendencias,
        }

        // Registrar auditoria
        actionRegistrarAuditoria({
          modulo: "INVENTARIO",
          acao: "STATUS_ALTERADO",
          entidadeId: inventarioId,
          descricao: `Inventário finalizado${finalizadoComPendencias ? " com pendências (itens necessitam recontagem)" : ""}.`,
        }).then((result) => {
          if (!result.ok) console.error("Erro ao registrar auditoria:", result.error)
        })

        set((state) => ({
          inventarios: state.inventarios.map((i) => (i.id === inventarioId ? inventarioAtualizado : i)),
        }))

        return { sucesso: true, inventario: inventarioAtualizado }
      },
    }),
    { name: "nordil-inventario-contagem-store" },
  ),
)
