"use client"
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import type { Usuario } from "@/types/domain"

export function useAuth() {
  const { data: session, status } = useSession()

  const currentUser: Usuario | null = session?.user ? {
    id: session.user.id,
    nome: session.user.name,
    email: session.user.email,
    empresaId: session.user.empresaId,
    role: session.user.role as any,
    funcao: session.user.funcao as any,
    precisaTrocarSenha: session.user.precisaTrocarSenha,
    status: "ativo", // Assumimos ativo se a sessão existe
  } : null

  async function login(email: string, senha: string) {
    const resultado = await nextAuthSignIn("credentials", { email, senha, redirect: false })
    return resultado
  }

  async function logout() {
    await nextAuthSignOut({ redirect: true, callbackUrl: "/login" })
  }

  return { currentUser, loading: status === "loading", login, logout }
}

/**
 * Hook que garante que currentUser não seja null dentro de rotas protegidas.
 * Se o usuário não estiver autenticado, redireciona para /login.
 * Use este hook em componentes dentro de app/(shell)/* que são protegidos pelo middleware.
 */
export function useCurrentUser(): Usuario {
  const { currentUser, loading } = useAuth()
  const router = useRouter()

  if (loading) {
    // Durante o loading, lançamos um erro para que o componente possa tratar
    // ou retornar um estado de carregamento. Como a maioria dos componentes
    // não tem tratamento explícito de loading, vamos retornar um placeholder
    // que evita erros de TypeScript. Em produção, isso pode ser melhorado
    // com Suspense ou tratamento explícito de loading.
    throw new Promise(() => {}) // Suspense infinito até loading terminar
  }

  if (!currentUser) {
    // Se não está loading e currentUser é null, redireciona para login
    router.replace("/login")
    throw new Error("Usuário não autenticado, redirecionando para /login")
  }

  return currentUser
}