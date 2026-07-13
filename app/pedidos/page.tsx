"use client"

import { useState } from "react"
import { AppShell } from "@/components/app-shell"
import { PedidosScreen } from "@/components/pedidos/lista/pedidos-screen"
import { AuthProvider } from "@/lib/auth-context"
import { PROFILES } from "@/lib/shell-config"
import { MOCK_USUARIOS } from "@/lib/mock-usuarios"
import { cn } from "@/lib/utils"

const DEMO_ROLES = ["vendedor", "admin", "supervisor"] as const
type DemoRole = (typeof DEMO_ROLES)[number]

// Mapeia cada role de demo para um usuário mock que represente esse perfil
const ROLE_USER_MAP: Record<DemoRole, string> = {
  vendedor: "usr-001", // Carla Mendes — VENDAS
  admin: "usr-003",   // Patrícia Lima — ADMINISTRATIVO (ADMIN/SUPERVISOR no contexto do ERP)
  supervisor: "usr-003",
}

export default function PedidosPage() {
  const [role, setRole] = useState<DemoRole>("admin")

  const demoUser =
    MOCK_USUARIOS.find((u) => u.id === ROLE_USER_MAP[role]) ?? MOCK_USUARIOS[0]

  return (
    <>
      <AuthProvider overrideUser={demoUser}>
        <AppShell key={role} profile={PROFILES[role]} initialActiveKey="pedidos">
          <PedidosScreen />
        </AppShell>
      </AuthProvider>

      {/* Demo-only: alterna entre os perfis que acessam Pedidos */}
      <div className="fixed bottom-3 left-1/2 z-[60] -translate-x-1/2">
        <div className="flex items-center gap-1 rounded-lg border border-border bg-popover/95 p-1 shadow-lg shadow-black/10 backdrop-blur">
          <span className="px-2 text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
            Perfil
          </span>
          {DEMO_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
                r === role
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {PROFILES[r].roleLabel}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
