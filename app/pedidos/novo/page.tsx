"use client"

import { AppShell } from "@/components/app-shell"
import { NovoPedidoScreen } from "@/components/pedidos/novo/novo-pedido-screen"
import { AuthProvider } from "@/lib/auth-context"
import { PROFILES } from "@/lib/shell-config"
import { MOCK_USUARIOS } from "@/lib/mock-usuarios"

export default function NovoPedidoPage() {
  const demoUser = MOCK_USUARIOS.find((u) => u.id === "usr-001") ?? MOCK_USUARIOS[0]

  return (
    <AuthProvider overrideUser={demoUser}>
      <AppShell profile={PROFILES["vendedor"]} initialActiveKey="novo-pedido">
        <NovoPedidoScreen />
      </AppShell>
    </AuthProvider>
  )
}
