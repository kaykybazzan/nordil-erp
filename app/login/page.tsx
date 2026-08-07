"use client"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import { getSession } from "next-auth/react"
import { LoginCard, type LoginState } from "@/components/auth/login-card"
import { LoginBrandingPanel } from "@/components/auth/login-branding-panel"
import { useAuth } from "@/lib/auth-context"
import { getHomeRoute } from "@/lib/rbac"
import Image from "next/image"

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
    <div className="relative min-h-screen isolate">
      <div className="fixed inset-0 z-0">
        <Image src="/login-bg.png" alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/75 via-[#0a1628]/35 to-[#0a1628]/70" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1600px] items-start lg:grid-cols-2">
        <LoginBrandingPanel className="hidden lg:flex lg:pt-32 lg:mt-18" />
        <div className="flex w-full items-start justify-center px-4 pt-32 pb-12">
          <LoginCard state={state} onSubmit={handleSubmit} companyName="Nordil Distribuição" />
        </div>
      </div>
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