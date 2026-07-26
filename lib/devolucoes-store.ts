import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Devolucao, ItemDevolucao, Usuario } from "@/types/domain"
import { MOCK_DEVOLUCOES } from "./mock-devolucoes"
import { usePedidosStore } from "./pedidos-store"
import { registrarMovimentacao } from "./estoque-ledger"
import { actionRegistrarAuditoria } from "./actions/auditoria"
import { podeGerenciarDevolucao } from "./policies"

function gerarId(prefixo: string) {
  return `${prefixo}-${Math.random().toString(36).slice(2, 9)}`
}

type ResultadoDevolucao = { sucesso: true; devolucao: Devolucao } | { sucesso: false; erro: string }

interface SolicitarDevolucaoInput {
  pedidoId: string
  itens: {
    itemPedidoId: string
    produtoId: string
    quantidadeSolicitada: number
  }[]
  motivo: "PRODUTO_AVARIADO" | "PRODUTO_INCORRETO" | "DEFEITO" | "DESISTENCIA_CLIENTE" | "EXCESSO_COMPRA" | "OUTRO"
  motivoOutroTexto?: string
  usuario: Usuario
}

interface ConfirmarDevolucaoInput {
  itens: {
    itemPedidoId: string
    quantidadeConfirmada: number
    observacaoAjuste?: string
  }[]
}

interface DevolucoesState {
  devolucoes: Devolucao[]

  solicitarDevolucao: (input: SolicitarDevolucaoInput) => Promise<ResultadoDevolucao>
  confirmarDevolucao: (devolucaoId: string, input: ConfirmarDevolucaoInput, usuario: Usuario) => ResultadoDevolucao
  cancelarDevolucao: (devolucaoId: string, usuario: Usuario) => ResultadoDevolucao
  calcularSaldoDevolvivel: (pedidoId: string, itemPedidoId: string) => number
}

export const useDevolucoesStore = create<DevolucoesState>()(
  persist(
    (set, get) => ({
      devolucoes: MOCK_DEVOLUCOES,

      solicitarDevolucao: async (input) => {
        const { pedidoId, itens, motivo, motivoOutroTexto, usuario } = input

        // Validação: motivo OUTRO exige motivoOutroTexto
        if (motivo === "OUTRO" && !motivoOutroTexto?.trim()) {
          return { sucesso: false, erro: "Para motivo 'OUTRO', é obrigatório informar o texto explicativo." }
        }

        // Validação: verificar se itemPedidoId existe no pedido e produtoId bate
        const pedido = usePedidosStore.getState().pedidos.find((p) => p.id === pedidoId)
        if (!pedido) {
          return { sucesso: false, erro: "Pedido não encontrado." }
        }

        for (const item of itens) {
          const itemPedido = pedido.itens.find((i) => i.id === item.itemPedidoId)
          if (!itemPedido) {
            return { sucesso: false, erro: `Item ${item.itemPedidoId} não pertence ao pedido informado.` }
          }
          if (itemPedido.produtoId !== item.produtoId) {
            return { sucesso: false, erro: `ProdutoId informado (${item.produtoId}) não bate com o produtoId do item no pedido (${itemPedido.produtoId}).` }
          }
        }

        // Validação: verificar se já existe devolução SOLICITADA para algum itemPedidoId
        for (const item of itens) {
          const jaExisteSolicitacao = get().devolucoes.some(
            (d) =>
              d.pedidoId === pedidoId &&
              d.status === "SOLICITADA" &&
              d.itens.some((i) => i.itemPedidoId === item.itemPedidoId)
          )
          if (jaExisteSolicitacao) {
            return { sucesso: false, erro: `Já existe uma devolução solicitada para o item ${item.itemPedidoId}. Aguarde a conclusão ou cancelamento da solicitação anterior.` }
          }
        }

        // Validação: verificar saldo devolvível para cada item
        for (const item of itens) {
          const saldo = get().calcularSaldoDevolvivel(pedidoId, item.itemPedidoId)
          if (item.quantidadeSolicitada > saldo) {
            return { sucesso: false, erro: `Quantidade solicitada (${item.quantidadeSolicitada}) excede o saldo devolvível (${saldo}) para o item ${item.itemPedidoId}.` }
          }
        }

        const agora = new Date().toISOString()
        const devolucaoId = gerarId("dev")

        const itensDevolucao: ItemDevolucao[] = itens.map((item) => ({
          itemPedidoId: item.itemPedidoId,
          produtoId: item.produtoId,
          quantidadeSolicitada: item.quantidadeSolicitada,
          quantidadeConfirmada: null,
        }))

        const devolucao: Devolucao = {
          id: devolucaoId,
          empresaId: usuario.empresaId,
          pedidoId,
          itens: itensDevolucao,
          motivo,
          motivoOutroTexto: motivo === "OUTRO" ? motivoOutroTexto : undefined,
          status: "SOLICITADA",
          solicitadoPor: usuario.id,
          solicitadoEm: agora,
        }

        // Registrar auditoria
        const auditResult = await actionRegistrarAuditoria({
          modulo: "DEVOLUCOES",
          acao: "CRIADO",
          entidadeId: devolucaoId,
          descricao: `Devolução solicitada para pedido ${pedidoId}.`,
        })
        if (!auditResult.ok) {
          console.error("Erro ao registrar auditoria:", auditResult.error)
        }

        set((state) => ({
          devolucoes: [...state.devolucoes, devolucao],
        }))

        return { sucesso: true, devolucao }
      },

      confirmarDevolucao: (devolucaoId, input, usuario) => {
        // Validação: permissão
        if (!podeGerenciarDevolucao(usuario)) {
          return { sucesso: false, erro: "Sem permissão para gerenciar devoluções." }
        }

        const devolucao = get().devolucoes.find((d) => d.id === devolucaoId)
        if (!devolucao) {
          return { sucesso: false, erro: "Devolução não encontrada." }
        }

        // Validação: status deve ser SOLICITADA
        if (devolucao.status !== "SOLICITADA") {
          return { sucesso: false, erro: "Só é possível confirmar devoluções com status SOLICITADA." }
        }

        const agora = new Date().toISOString()

        // Validação: input.itens deve cobrir EXATAMENTE todos os itens da devolução
        for (const itemOriginal of devolucao.itens) {
          const itemConfirmado = input.itens.find((i) => i.itemPedidoId === itemOriginal.itemPedidoId)
          if (!itemConfirmado) {
            return { sucesso: false, erro: `Confirmação deve incluir todos os itens da devolução. Item ${itemOriginal.itemPedidoId} está faltando.` }
          }
        }

        // Validação: quantidadeConfirmada nunca pode ser maior que quantidadeSolicitada
        // Validação: observacaoAjuste obrigatória quando quantidadeConfirmada < quantidadeSolicitada
        // Validação cumulativa: quantidadeConfirmada + outras devoluções CONCLUIDA não pode exceder quantidade originalmente comprada
        for (const itemOriginal of devolucao.itens) {
          const itemConfirmado = input.itens.find((i) => i.itemPedidoId === itemOriginal.itemPedidoId)
          if (!itemConfirmado) continue // já validado acima, mas TypeScript não sabe

          if (itemConfirmado.quantidadeConfirmada > itemOriginal.quantidadeSolicitada) {
            return { sucesso: false, erro: `Quantidade confirmada (${itemConfirmado.quantidadeConfirmada}) não pode ser maior que a solicitada (${itemOriginal.quantidadeSolicitada}) para o item ${itemOriginal.itemPedidoId}.` }
          }

          if (itemConfirmado.quantidadeConfirmada < itemOriginal.quantidadeSolicitada && !itemConfirmado.observacaoAjuste?.trim()) {
            return { sucesso: false, erro: `Observação de ajuste é obrigatória para o item ${itemOriginal.itemPedidoId} pois a quantidade confirmada (${itemConfirmado.quantidadeConfirmada}) é menor que a solicitada (${itemOriginal.quantidadeSolicitada}).` }
          }

          // Validação cumulativa: verificar se quantidadeConfirmada + outras devoluções CONCLUIDA excede quantidade original
          const pedido = usePedidosStore.getState().pedidos.find((p) => p.id === devolucao.pedidoId)
          if (pedido) {
            const itemPedido = pedido.itens.find((i) => i.id === itemOriginal.itemPedidoId)
            if (itemPedido) {
              const quantidadeVendida = itemPedido.quantidade
              
              // Somar quantidadeConfirmada de outras devoluções CONCLUIDA para este item (excluindo a atual)
              const totalOutrasConcluidas = get().devolucoes
                .filter((d) => d.pedidoId === devolucao.pedidoId && d.status === "CONCLUIDA" && d.id !== devolucaoId)
                .reduce((acc, d) => {
                  const item = d.itens.find((i) => i.itemPedidoId === itemOriginal.itemPedidoId)
                  return acc + (item?.quantidadeConfirmada ?? 0)
                }, 0)

              const totalAposConfirmacao = totalOutrasConcluidas + itemConfirmado.quantidadeConfirmada
              
              if (totalAposConfirmacao > quantidadeVendida) {
                return { sucesso: false, erro: `Quantidade confirmada (${itemConfirmado.quantidadeConfirmada}) somada a outras devoluções já concluídas (${totalOutrasConcluidas}) excede a quantidade originalmente comprada (${quantidadeVendida}) para o item ${itemOriginal.itemPedidoId}.` }
              }
            }
          }
        }

        // Montar itensAtualizados com .map() limpo, sem objetos de erro misturados
        const itensAtualizados: ItemDevolucao[] = devolucao.itens.map((itemOriginal) => {
          const itemConfirmado = input.itens.find((i) => i.itemPedidoId === itemOriginal.itemPedidoId)
          if (!itemConfirmado) {
            return itemOriginal
          }

          return {
            ...itemOriginal,
            quantidadeConfirmada: itemConfirmado.quantidadeConfirmada,
            observacaoAjuste: itemConfirmado.observacaoAjuste,
          }
        })

        // Lançar ENTRADA_DEVOLUCAO no ledger para cada item confirmado
        itensAtualizados.forEach((item) => {
          if (item.quantidadeConfirmada && item.quantidadeConfirmada > 0) {
            registrarMovimentacao({
              id: gerarId("mov"),
              empresaId: devolucao.empresaId,
              produtoId: item.produtoId,
              tipo: "ENTRADA_DEVOLUCAO",
              quantidade: item.quantidadeConfirmada,
              pedidoId: devolucao.pedidoId,
              dataHora: agora,
              usuarioId: usuario.id,
            })
          }
        })

        const devolucaoAtualizada: Devolucao = {
          ...devolucao,
          itens: itensAtualizados as ItemDevolucao[],
          status: "CONCLUIDA",
          confirmadoPor: usuario.id,
          confirmadoEm: agora,
        }

        // Registrar auditoria
        actionRegistrarAuditoria({
          modulo: "DEVOLUCOES",
          acao: "STATUS_ALTERADO",
          entidadeId: devolucaoId,
          descricao: `Devolução confirmada e concluída para pedido ${devolucao.pedidoId}.`,
        }).then((result) => {
          if (!result.ok) console.error("Erro ao registrar auditoria:", result.error)
        })

        set((state) => ({
          devolucoes: state.devolucoes.map((d) => (d.id === devolucaoId ? devolucaoAtualizada : d)),
        }))

        return { sucesso: true, devolucao: devolucaoAtualizada }
      },

      cancelarDevolucao: (devolucaoId, usuario) => {
        // Validação: permissão
        if (!podeGerenciarDevolucao(usuario)) {
          return { sucesso: false, erro: "Sem permissão para gerenciar devoluções." }
        }

        const devolucao = get().devolucoes.find((d) => d.id === devolucaoId)
        if (!devolucao) {
          return { sucesso: false, erro: "Devolução não encontrada." }
        }

        // Validação: status deve ser SOLICITADA
        if (devolucao.status !== "SOLICITADA") {
          return { sucesso: false, erro: "Só é possível cancelar devoluções com status SOLICITADA." }
        }

        const agora = new Date().toISOString()

        const devolucaoAtualizada: Devolucao = {
          ...devolucao,
          status: "CANCELADA",
          canceladoPor: usuario.id,
          canceladoEm: agora,
        }

        // Registrar auditoria
        actionRegistrarAuditoria({
          modulo: "DEVOLUCOES",
          acao: "CANCELADO",
          entidadeId: devolucaoId,
          descricao: `Devolução cancelada para pedido ${devolucao.pedidoId}.`,
        }).then((result) => {
          if (!result.ok) console.error("Erro ao registrar auditoria:", result.error)
        })

        set((state) => ({
          devolucoes: state.devolucoes.map((d) => (d.id === devolucaoId ? devolucaoAtualizada : d)),
        }))

        return { sucesso: true, devolucao: devolucaoAtualizada }
      },

      calcularSaldoDevolvivel: (pedidoId, itemPedidoId) => {
        // Encontrar o pedido para obter a quantidade vendida do item
        const pedido = usePedidosStore.getState().pedidos.find((p) => p.id === pedidoId)
        if (!pedido) return 0

        const itemPedido = pedido.itens.find((i) => i.id === itemPedidoId)
        if (!itemPedido) return 0

        const quantidadeVendida = itemPedido.quantidade

        // Somar quantidadeSolicitada de devoluções SOLICITADA + quantidadeConfirmada de devoluções CONCLUIDA
        const totalJaDevolvidoOuEmAndamento = get().devolucoes
          .filter((d) => d.pedidoId === pedidoId && (d.status === "SOLICITADA" || d.status === "CONCLUIDA"))
          .reduce((acc, devolucao) => {
            const item = devolucao.itens.find((i) => i.itemPedidoId === itemPedidoId)
            if (!item) return acc

            if (devolucao.status === "SOLICITADA") {
              return acc + item.quantidadeSolicitada
            } else if (devolucao.status === "CONCLUIDA") {
              return acc + (item.quantidadeConfirmada ?? 0)
            }
            return acc
          }, 0)

        return Math.max(0, quantidadeVendida - totalJaDevolvidoOuEmAndamento)
      },
    }),
    { name: "nordil-devolucoes-store" },
  ),
)
