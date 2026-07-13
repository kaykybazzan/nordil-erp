"use client"

import { AppShell } from "@/components/app-shell"
import { ConferenciaScreen } from "@/components/conferencia/conferencia-screen"
import { PROFILES } from "@/lib/shell-config"

export default function ConferenciaPage() {
  return (
    <AppShell profile={PROFILES["conferente"]} initialActiveKey="conferencia">
      <ConferenciaScreen />
    </AppShell>
  )
}
