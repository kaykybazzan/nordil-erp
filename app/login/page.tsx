"use client"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { getSession } from "next-auth/react"
import { LoginCard, type LoginState } from "@/components/auth/login-card"
import { useAuth } from "@/lib/auth-context"
import { getHomeRoute } from "@/lib/rbac"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const sessaoExpirada = searchParams.get("motivo") === "sessao-expirada"
  const redirectTo = searchParams.get("redirect")
  const [state, setState] = useState<LoginState>(sessaoExpirada ? "expired" : "idle")

  async function handleSubmit(email: string, senha: string) {
    setState("loading")
    try {
      const resultado = await login(email, senha)
      if (!resultado || resultado.error) {
        setState("error")
        return
      }

      // Busca a sessão fresca direto — não confia no currentUser do hook,
      // que pode estar com valor antigo capturado antes do login.
      const session = await getSession()
      const usuarioAtualizado = session?.user as typeof session extends null ? never : any

      if (!usuarioAtualizado) {
        setState("error")
        return
      }

      if (usuarioAtualizado.precisaTrocarSenha) {
        router.push("/trocar-senha")
        return
      }

      router.push(redirectTo ?? getHomeRoute(usuarioAtualizado))
    } catch {
      setState("network_error")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <LoginCard state={state} onSubmit={handleSubmit} companyName="Nordil Distribuição" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}