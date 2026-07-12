"use client"

import { AppShell } from "@/components/app-shell"
import { ProdutosScreen } from "@/components/produtos/produtos-screen"
import { PROFILES } from "@/lib/shell-config"

export default function ProdutosPage() {
  // Somente o Administrador acessa a gestão de catálogo.
  return (
    <AppShell profile={PROFILES.admin} initialActiveKey="produtos">
      <ProdutosScreen />
    </AppShell>
  )
}
