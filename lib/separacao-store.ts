import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Usuario, ItemPedido } from "@/types/domain"

function gerarId(prefixo: string) {
  return `${prefixo}-${Math.random().toString(36).slice(2, 9)}`
}

type ResultadoSeparacao = { sucesso: true; pedido?: any } | { sucesso: false; erro: string }

interface SeparacaoDraftItem {
  itemPedidoId: string
  quantidadeSolicitada: number // imutável, setado em iniciarSeparacao
  quantidadeSeparada: number | null
  statusLocal: "PENDENTE" | "CONFIRMADO" | "RUPTURA"
}

interface SeparacaoState {
  draft: Record<string, SeparacaoDraftItem[]> // pedidoId -> draft items
  pedidoIdAtivo: string | null

  iniciarSeparacao: (pedidoId: string, usuarioId: string, nomeUsuario: string, pedido: any) => Promise<ResultadoSeparacao>
  confirmarItem: (pedidoId: string, itemPedidoId: string, quantidadeInformada: number, produto: any) => Promise<ResultadoSeparacao>
  devolverAFila: (pedidoId: string) => Promise<ResultadoSeparacao>
  finalizarSeparacao: (pedidoId: string, usuarioId: string) => Promise<ResultadoSeparacao>
  forcarLiberacaoLock: (pedidoId: string) => Promise<ResultadoSeparacao>
  limparDraft: (pedidoId: string) => void
}

export const useSeparacaoStore = create<SeparacaoState>()(
  persist(
    (set, get) => ({
      draft: {},
      pedidoIdAtivo: null,

      iniciarSeparacao: async (pedidoId, usuarioId, nomeUsuario, pedido) => {
        // Validação: pedido.status === "RESERVADO"
        if (pedido.status !== "RESERVADO") {
          return { sucesso: false, erro: "Pedido não está disponível para separação" }
        }

        // Inicializa draft local: um item por ItemPedido
        const draftItems: SeparacaoDraftItem[] = pedido.itens.map((item: ItemPedido) => ({
          itemPedidoId: item.id,
          quantidadeSolicitada: Number(item.quantidade),
          quantidadeSeparada: Number(item.quantidade), // pré-preenchido com quantidade solicitada
          statusLocal: "PENDENTE",
        }))

        set((state) => ({
          draft: { ...state.draft, [pedidoId]: draftItems },
          pedidoIdAtivo: pedidoId,
        }))

        return { sucesso: true }
      },

      confirmarItem: async (pedidoId, itemPedidoId, quantidadeInformada, produto) => {
        const state = get()
        const currentDraft = state.draft[pedidoId]
        if (!currentDraft) {
          return { sucesso: false, erro: "Draft não encontrado para este pedido" }
        }

        const draftItem = currentDraft.find((d: SeparacaoDraftItem) => d.itemPedidoId === itemPedidoId)
        if (!draftItem) {
          return { sucesso: false, erro: "Item não encontrado no draft" }
        }

        // Validação: numérico, >= 0
        if (typeof quantidadeInformada !== "number" || quantidadeInformada < 0) {
          return { sucesso: false, erro: "Quantidade deve ser um número não negativo" }
        }

        // Validação: respeita fracionamento do produto
        if (!produto.permiteFracionado && !Number.isInteger(quantidadeInformada)) {
          return { sucesso: false, erro: "Produto não permite fracionamento" }
        }

        // Validação: <= quantidade solicitada do item
        if (quantidadeInformada > draftItem.quantidadeSolicitada) {
          return { sucesso: false, erro: "Quantidade informada não pode exceder a quantidade solicitada" }
        }

        // Atualiza draft
        const novoStatusLocal: "CONFIRMADO" | "RUPTURA" = quantidadeInformada === draftItem.quantidadeSolicitada ? "CONFIRMADO" : "RUPTURA"
        const updatedDraft = currentDraft.map((d: SeparacaoDraftItem) =>
          d.itemPedidoId === itemPedidoId
            ? { ...d, quantidadeSeparada: quantidadeInformada, statusLocal: novoStatusLocal }
            : d
        )

        set((state) => ({
          draft: { ...state.draft, [pedidoId]: updatedDraft },
        }))

        return { sucesso: true }
      },

      devolverAFila: async (pedidoId) => {
        // Descarta draft local inteiro
        set((state) => {
          const { [pedidoId]: _, ...rest } = state.draft
          return {
            draft: rest,
            pedidoIdAtivo: state.pedidoIdAtivo === pedidoId ? null : state.pedidoIdAtivo,
          }
        })

        return { sucesso: true }
      },

      finalizarSeparacao: async (pedidoId, usuarioId) => {
        const state = get()
        const currentDraft = state.draft[pedidoId]
        if (!currentDraft) {
          return { sucesso: false, erro: "Draft não encontrado para este pedido" }
        }

        // Valida: todo item do draft tem statusLocal !== "PENDENTE"
        const itensPendentes = currentDraft.filter((d) => d.statusLocal === "PENDENTE")
        if (itensPendentes.length > 0) {
          return { sucesso: false, erro: "Confirme a quantidade de todos os itens antes de finalizar" }
        }

        // Verifica se algum item ficou em RUPTURA
        const itensRuptura = currentDraft.filter((d) => d.statusLocal === "RUPTURA")
        const temRuptura = itensRuptura.length > 0

        // Descarta draft local
        set((state) => {
          const { [pedidoId]: _, ...rest } = state.draft
          return {
            draft: rest,
            pedidoIdAtivo: state.pedidoIdAtivo === pedidoId ? null : state.pedidoIdAtivo,
          }
        })

        // Retorna sucesso com informação sobre ruptura
        return { sucesso: true, pedido: { temRuptura, itensRuptura } }
      },

      forcarLiberacaoLock: async (pedidoId) => {
        // Igual devolverAFila, mas sem exigir que o usuário atual seja o separadorId
        set((state) => {
          const { [pedidoId]: _, ...rest } = state.draft
          return {
            draft: rest,
            pedidoIdAtivo: state.pedidoIdAtivo === pedidoId ? null : state.pedidoIdAtivo,
          }
        })

        return { sucesso: true }
      },

      limparDraft: (pedidoId) => {
        set((state) => {
          const { [pedidoId]: _, ...rest } = state.draft
          return {
            draft: rest,
            pedidoIdAtivo: state.pedidoIdAtivo === pedidoId ? null : state.pedidoIdAtivo,
          }
        })
      },
    }),
    { name: "nordil-separacao-store" },
  ),
)
