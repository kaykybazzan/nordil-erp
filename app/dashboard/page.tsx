"use client"

import { useState } from "react"
import { AppShell } from "@/components/app-shell"
import { DashboardScreen } from "@/components/dashboard/dashboard-screen"
import { AuthProvider } from "@/lib/auth-context"
import { PROFILES } from "@/lib/shell-config"
import { MOCK_USUARIOS } from "@/lib/mock-usuarios"
import { cn } from "@/lib/utils"

const DEMO_ROLES = ["admin", "supervisor"] as const
type DemoRole = (typeof DEMO_ROLES)[number]

const ROLE_USER_MAP: Record<DemoRole, string> = {
  admin: "usr-003",
  supervisor: "usr-003",
}

export default function DashboardPage() {
  const [role, setRole] = useState<DemoRole>("admin")
  const demoUser = MOCK_USUARIOS.find((u) => u.id === ROLE_USER_MAP[role]) ?? MOCK_USUARIOS[0]

  return (
    <>
      <AuthProvider overrideUser={demoUser}>
        <AppShell key={role} profile={PROFILES[role]} initialActiveKey="dashboard">
          <DashboardScreen role={role} />
        </AppShell>
      </AuthProvider>

      <div className="fixed bottom-3 left-1/2 z-[60] -translate-x-1/2">
        <div className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1 shadow-md">
          <span className="px-2 text-xs text-muted-foreground">Demo:</span>
          {DEMO_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                role === r
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {r === "admin" ? "Admin" : "Supervisor"}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
