"use client"

import { AppShell } from "@/components/app-shell"
import { EstoqueScreen } from "@/components/estoque/estoque-screen"
import { PROFILES } from "@/lib/shell-config"

export default function EstoquePage() {
  return (
    <AppShell
      profile={PROFILES.estoquista}
      initialActiveKey="estoque"
    >
      <EstoqueScreen />
    </AppShell>
  )
}
