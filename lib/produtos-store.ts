import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Produto } from "@/types/domain"
import {
  listarProdutos,
  criarProduto,
  atualizarProduto,
  inativarProduto,
  reativarProduto,
} from "./actions/produtos"

type ResultadoAcao = { ok: true; data?: Produto } | { ok: false; error: string }

interface ProdutosState {
  produtos: Produto[]
  loading: boolean
  error: string | null

  carregarProdutos: () => Promise<void>
  criarProduto: (input: any) => Promise<ResultadoAcao>
  atualizarProduto: (id: string, input: any) => Promise<ResultadoAcao>
  inativarProduto: (id: string) => Promise<ResultadoAcao>
  reativarProduto: (id: string) => Promise<ResultadoAcao>
}

export const useProdutosStore = create<ProdutosState>()(
  persist(
    (set, get) => ({
      produtos: [],
      loading: false,
      error: null,

      carregarProdutos: async () => {
        set({ loading: true, error: null })
        try {
          const resultado = await listarProdutos()
          if (resultado.ok && resultado.data) {
            set({ produtos: resultado.data, loading: false })
          } else {
            set({ error: resultado.error || "Erro ao carregar produtos", loading: false })
          }
        } catch (error) {
          set({ error: "Erro ao carregar produtos", loading: false })
        }
      },

      criarProduto: async (input) => {
        set({ loading: true, error: null })
        try {
          const resultado = await criarProduto(input)
          if (resultado.ok && resultado.data) {
            set((state) => ({
              produtos: [resultado.data, ...state.produtos],
              loading: false,
            }))
            return { ok: true, data: resultado.data }
          } else {
            set({ error: resultado.error || "Erro ao criar produto", loading: false })
            return { ok: false, error: resultado.error || "Erro ao criar produto" }
          }
        } catch (error) {
          set({ error: "Erro ao criar produto", loading: false })
          return { ok: false, error: "Erro ao criar produto" }
        }
      },

      atualizarProduto: async (id, input) => {
        set({ loading: true, error: null })
        try {
          const resultado = await atualizarProduto(id, input)
          if (resultado.ok && resultado.data) {
            set((state) => ({
              produtos: state.produtos.map((p) => (p.id === id ? resultado.data : p)),
              loading: false,
            }))
            return { ok: true, data: resultado.data }
          } else {
            set({ error: resultado.error || "Erro ao atualizar produto", loading: false })
            return { ok: false, error: resultado.error || "Erro ao atualizar produto" }
          }
        } catch (error) {
          set({ error: "Erro ao atualizar produto", loading: false })
          return { ok: false, error: "Erro ao atualizar produto" }
        }
      },

      inativarProduto: async (id) => {
        set({ loading: true, error: null })
        try {
          const resultado = await inativarProduto(id)
          if (resultado.ok) {
            set((state) => ({
              produtos: state.produtos.map((p) =>
                p.id === id ? { ...p, status: "inativo" as const } : p
              ),
              loading: false,
            }))
            return { ok: true }
          } else {
            set({ error: resultado.error || "Erro ao inativar produto", loading: false })
            return { ok: false, error: resultado.error || "Erro ao inativar produto" }
          }
        } catch (error) {
          set({ error: "Erro ao inativar produto", loading: false })
          return { ok: false, error: "Erro ao inativar produto" }
        }
      },

      reativarProduto: async (id) => {
        set({ loading: true, error: null })
        try {
          const resultado = await reativarProduto(id)
          if (resultado.ok) {
            set((state) => ({
              produtos: state.produtos.map((p) =>
                p.id === id ? { ...p, status: "ativo" as const } : p
              ),
              loading: false,
            }))
            return { ok: true }
          } else {
            set({ error: resultado.error || "Erro ao reativar produto", loading: false })
            return { ok: false, error: resultado.error || "Erro ao reativar produto" }
          }
        } catch (error) {
          set({ error: "Erro ao reativar produto", loading: false })
          return { ok: false, error: "Erro ao reativar produto" }
        }
      },
    }),
    { name: "nordil-produtos-store" },
  ),
)
