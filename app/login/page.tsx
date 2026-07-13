"use client"

import { useState } from "react"
import { LoginCard, type LoginState } from "@/components/auth/login-card"

const STATES: { value: LoginState; label: string }[] = [
  { value: "idle", label: "Inicial" },
  { value: "loading", label: "Carregando" },
  { value: "error", label: "Credencial" },
  { value: "blocked", label: "Bloqueada" },
  { value: "inactive", label: "Emp. inativa" },
  { value: "rate_limited", label: "Rate limit" },
  { value: "network_error", label: "Sem rede" },
  { value: "expired", label: "Expirada" },
]

export default function LoginPage() {
  const [state, setState] = useState<LoginState>("idle")

  function handleSubmit() {
    setState("loading")
    setTimeout(() => setState("idle"), 1800)
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <LoginCard state={state} onSubmit={handleSubmit} />

      {/* Demo-only: state switcher, sits outside the auth card. */}
      <div className="fixed bottom-4 left-1/2 z-10 flex -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm">
        <span className="px-2 text-xs text-muted-foreground">Demo:</span>
        {STATES.map((s) => (
          <button
            key={s.value}
            onClick={() => setState(s.value)}
            className={
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors " +
              (state === s.value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground")
            }
          >
            {s.label}
          </button>
        ))}
      </div>
    </main>
  )
}
