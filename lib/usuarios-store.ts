import { create } from "zustand"
import type { Usuario, PapelUsuario, FuncaoUsuario } from "@/types/domain"
import {
  actionObterUsuarios,
  actionCriarUsuario,
  actionAtualizarUsuario,
  actionInativarUsuario,
  actionReativarUsuario,
} from "@/lib/actions/usuarios"

type DadosUsuario = {
  nome: string
  email: string
  role: PapelUsuario
  funcao: FuncaoUsuario
  cargo?: string
}

interface UsuariosState {
  usuarios: Usuario[]
  carregando: boolean
  erro: string | null

  carregarUsuarios: () => Promise<void>
  encontrarPorId: (id: string) => Usuario | undefined

  criarUsuario: (
    dados: DadosUsuario,
  ) => Promise<{ ok: true; senhaTemporaria: string } | { ok: false; error: string }>

  atualizarUsuario: (
    id: string,
    dados: DadosUsuario,
  ) => Promise<{ ok: true } | { ok: false; error: string }>

  alternarStatus: (usuario: Usuario) => Promise<{ ok: true } | { ok: false; error: string }>
}

export const useUsuariosStore = create<UsuariosState>()((set, get) => ({
  usuarios: [],
  carregando: false,
  erro: null,

  carregarUsuarios: async () => {
    set({ carregando: true, erro: null })
    const result = await actionObterUsuarios()
    if (!result.ok) {
      set({ carregando: false, erro: result.error })
      return
    }
    set({ usuarios: result.data, carregando: false })
  },

  encontrarPorId: (id) => get().usuarios.find((u) => u.id === id),

  criarUsuario: async (dados) => {
    const result = await actionCriarUsuario(dados)
    if (!result.ok) return { ok: false, error: result.error }

    set((state) => ({ usuarios: [...state.usuarios, result.data.usuario] }))
    return { ok: true, senhaTemporaria: result.data.senhaTemporaria }
  },

  atualizarUsuario: async (id, dados) => {
    const result = await actionAtualizarUsuario({ id, ...dados })
    if (!result.ok) return { ok: false, error: result.error }

    set((state) => ({
      usuarios: state.usuarios.map((u) => (u.id === id ? result.data : u)),
    }))
    return { ok: true }
  },

  alternarStatus: async (usuario) => {
    const result =
      usuario.status === "ativo"
        ? await actionInativarUsuario(usuario.id)
        : await actionReativarUsuario(usuario.id)

    if (!result.ok) return { ok: false, error: result.error }

    set((state) => ({
      usuarios: state.usuarios.map((u) => (u.id === usuario.id ? result.data : u)),
    }))
    return { ok: true }
  },
}))