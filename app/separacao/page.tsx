"use client"

import { AppShell } from "@/components/app-shell"
import { SeparacaoScreen } from "@/components/separacao/separacao-screen"
import { PROFILES } from "@/lib/shell-config"

export default function SeparacaoPage() {
  return (
    <AppShell profile={PROFILES["separador"]} initialActiveKey="separacao">
      <SeparacaoScreen />
    </AppShell>
  )
}
