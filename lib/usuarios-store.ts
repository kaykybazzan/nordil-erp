import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Usuario } from "@/types/domain"
import { MOCK_USUARIOS } from "@/lib/mock-usuarios"

interface UsuariosState {
    usuarios: Usuario[]
    encontrarPorEmail: (email: string) => Usuario | undefined
    encontrarPorId: (id: string) => Usuario | undefined
    atualizarSenha: (usuarioId: string, novaSenha: string) => void
    atualizarUsuario: (usuarioId: string, dados: Partial<Usuario>) => void
}

export const useUsuariosStore = create<UsuariosState>()(
    persist(
        (set, get) => ({
            usuarios: MOCK_USUARIOS,

            encontrarPorEmail: (email) =>
                get().usuarios.find((u) => u.email.toLowerCase() === email.toLowerCase()),

            encontrarPorId: (id) => get().usuarios.find((u) => u.id === id),

            atualizarSenha: (usuarioId, novaSenha) =>
                set((state) => ({
                    usuarios: state.usuarios.map((u) =>
                        u.id === usuarioId
                            ? { ...u, senha: novaSenha, precisaTrocarSenha: false }
                            : u,
                    ),
                })),

            atualizarUsuario: (usuarioId, dados) =>
                set((state) => ({
                    usuarios: state.usuarios.map((u) =>
                        u.id === usuarioId ? { ...u, ...dados } : u,
                    ),
                })),
        }),
        { name: "nordil-usuarios-store" },
    ),
)