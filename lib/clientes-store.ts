import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Cliente } from "@/types/domain"
import {
  listarClientes,
  criarCliente,
  atualizarCliente,
  inativarCliente,
  reativarCliente,
} from "./actions/clientes"

type ResultadoAcao = { ok: true; data?: Cliente } | { ok: false; error: string }

interface ClientesState {
  clientes: Cliente[]
  loading: boolean
  error: string | null

  carregarClientes: () => Promise<void>
  criarCliente: (input: any) => Promise<ResultadoAcao>
  atualizarCliente: (id: string, input: any) => Promise<ResultadoAcao>
  inativarCliente: (id: string) => Promise<ResultadoAcao>
  reativarCliente: (id: string) => Promise<ResultadoAcao>
}

export const useClientesStore = create<ClientesState>()(
  persist(
    (set, get) => ({
      clientes: [],
      loading: false,
      error: null,

      carregarClientes: async () => {
        set({ loading: true, error: null })
        try {
          const resultado = await listarClientes()
          if (resultado.ok && resultado.data) {
            set({ clientes: resultado.data, loading: false })
          } else {
            set({ error: resultado.error || "Erro ao carregar clientes", loading: false })
          }
        } catch (error) {
          set({ error: "Erro ao carregar clientes", loading: false })
        }
      },

      criarCliente: async (input) => {
        set({ loading: true, error: null })
        try {
          const resultado = await criarCliente(input)
          if (resultado.ok && resultado.data) {
            set((state) => ({
              clientes: [resultado.data, ...state.clientes],
              loading: false,
            }))
            return { ok: true, data: resultado.data }
          } else {
            set({ error: resultado.error || "Erro ao criar cliente", loading: false })
            return { ok: false, error: resultado.error || "Erro ao criar cliente" }
          }
        } catch (error) {
          set({ error: "Erro ao criar cliente", loading: false })
          return { ok: false, error: "Erro ao criar cliente" }
        }
      },

      atualizarCliente: async (id, input) => {
        set({ loading: true, error: null })
        try {
          const resultado = await atualizarCliente(id, input)
          if (resultado.ok && resultado.data) {
            set((state) => ({
              clientes: state.clientes.map((c) => (c.id === id ? resultado.data : c)),
              loading: false,
            }))
            return { ok: true, data: resultado.data }
          } else {
            set({ error: resultado.error || "Erro ao atualizar cliente", loading: false })
            return { ok: false, error: resultado.error || "Erro ao atualizar cliente" }
          }
        } catch (error) {
          set({ error: "Erro ao atualizar cliente", loading: false })
          return { ok: false, error: "Erro ao atualizar cliente" }
        }
      },

      inativarCliente: async (id) => {
        set({ loading: true, error: null })
        try {
          const resultado = await inativarCliente(id)
          if (resultado.ok) {
            set((state) => ({
              clientes: state.clientes.map((c) =>
                c.id === id ? { ...c, status: "bloqueado" as const } : c
              ),
              loading: false,
            }))
            return { ok: true }
          } else {
            set({ error: resultado.error || "Erro ao inativar cliente", loading: false })
            return { ok: false, error: resultado.error || "Erro ao inativar cliente" }
          }
        } catch (error) {
          set({ error: "Erro ao inativar cliente", loading: false })
          return { ok: false, error: "Erro ao inativar cliente" }
        }
      },

      reativarCliente: async (id) => {
        set({ loading: true, error: null })
        try {
          const resultado = await reativarCliente(id)
          if (resultado.ok) {
            set((state) => ({
              clientes: state.clientes.map((c) =>
                c.id === id ? { ...c, status: "ativo" as const } : c
              ),
              loading: false,
            }))
            return { ok: true }
          } else {
            set({ error: resultado.error || "Erro ao reativar cliente", loading: false })
            return { ok: false, error: resultado.error || "Erro ao reativar cliente" }
          }
        } catch (error) {
          set({ error: "Erro ao reativar cliente", loading: false })
          return { ok: false, error: "Erro ao reativar cliente" }
        }
      },
    }),
    { name: "nordil-clientes-store" },
  ),
)
