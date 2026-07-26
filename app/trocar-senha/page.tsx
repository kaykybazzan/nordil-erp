"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { TrocarSenhaCard } from "@/components/auth/trocar-senha-card"
import { useAuth } from "@/lib/auth-context"
import { getHomeRoute } from "@/lib/rbac"
import { trocarSenha } from "@/lib/actions/trocar-senha"
import { actionRegistrarAuditoria } from "@/lib/actions/auditoria"

export default function TrocarSenhaPage() {
  const router = useRouter()
  const { currentUser } = useAuth()
  const { update } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(novaSenha: string) {
    if (!currentUser) {
      setErro("Não autenticado.")
      return
    }

    setIsLoading(true)
    setErro(null)

    try {
      const resultado = await trocarSenha(novaSenha)

      if (!resultado.sucesso) {
        setErro(resultado.erro || "Erro ao alterar senha.")
        return
      }

      // Registrar auditoria (sem incluir senha em camposAlterados)
      const resultadoAuditoria = await actionRegistrarAuditoria({
        modulo: "USUARIOS",
        acao: "ATUALIZADO",
        entidadeId: currentUser.id,
        descricao: `Usuário ${currentUser.nome} alterou sua senha no primeiro acesso.`,
        camposAlterados: [
          { campo: "precisaTrocarSenha", valorAnterior: "true", valorNovo: "false" },
        ],
      })
      if (!resultadoAuditoria.ok) {
        console.error("Falha ao registrar auditoria:", resultadoAuditoria.error)
      }

      // Força o JWT a ser regravado com precisaTrocarSenha: false
      // ANTES do redirect, senão o ShellLayout manda de volta pra cá
      await update({ precisaTrocarSenha: false })

      router.push(getHomeRoute(currentUser))
    } catch {
      setErro("Erro ao alterar senha. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <TrocarSenhaCard onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  )
}
