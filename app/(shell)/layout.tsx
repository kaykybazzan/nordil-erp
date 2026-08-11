'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/lib/auth-context'

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { currentUser, loading } = useAuth()
  const router = useRouter()

  // Route guard: se o usuário precisa trocar senha, redireciona para /trocar-senha
  useEffect(() => {
    if (currentUser?.precisaTrocarSenha) {
      router.push('/trocar-senha')
    }
  }, [currentUser?.precisaTrocarSenha, router])

  // Não renderiza o shell enquanto carregando ou precisa trocar senha
  if (currentUser?.precisaTrocarSenha) {
    return null
  }

  if (loading || !currentUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    )
  }

  return <AppShell usuario={currentUser}>{children}</AppShell>
}
