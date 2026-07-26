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
  if (loading || !currentUser || currentUser.precisaTrocarSenha) {
    return null
  }

  return <AppShell usuario={currentUser}>{children}</AppShell>
}
