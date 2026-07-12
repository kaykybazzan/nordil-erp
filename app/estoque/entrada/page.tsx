"use client"

import { AppShell } from "@/components/app-shell"
import { EntradaScreen } from "@/components/estoque/entrada/entrada-screen"
import { PROFILES } from "@/lib/shell-config"

export default function EntradaPage() {
  return (
    <AppShell
      profile={PROFILES.estoquista}
      initialActiveKey="entrada"
    >
      <EntradaScreen />
    </AppShell>
  )
}
