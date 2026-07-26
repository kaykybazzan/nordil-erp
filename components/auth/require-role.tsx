"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import type { PapelUsuario } from "@/types/domain"
import { useCurrentUser } from "@/lib/auth-context"
import { getHomeRoute } from "@/lib/rbac"

interface RequireRoleProps {
    roles: PapelUsuario[]
    children: React.ReactNode
}

/**
 * Bloqueia acesso direto por URL a telas restritas por role.
 * O esconder-da-navegação já é feito por lib/shell-config.tsx — este
 * componente cobre o caso de alguém digitar a URL diretamente.
 * Usuário sem permissão é redirecionado para sua home route (rbac.ts).
 */
export function RequireRole({ roles, children }: RequireRoleProps) {
    const router = useRouter()
    const currentUser = useCurrentUser()
    const autorizado = roles.includes(currentUser.role)

    useEffect(() => {
        if (!autorizado) {
            router.replace(getHomeRoute(currentUser))
        }
    }, [autorizado, currentUser, router])

    if (!autorizado) {
        return null
    }

    return <>{children}</>
}