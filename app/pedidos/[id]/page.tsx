"use client"

import { use } from "react"
import { AppShell } from "@/components/app-shell"
import { DetalhePedidoScreen } from "@/components/pedidos/detalhe/detalhe-pedido-screen"
import { AuthProvider } from "@/lib/auth-context"
import { PROFILES } from "@/lib/shell-config"
import { MOCK_USUARIOS } from "@/lib/mock-usuarios"

export default function PedidoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  // Usa perfil admin por padrão para ter acesso ao painel de revisão/supervisor
  const demoUser = MOCK_USUARIOS.find((u) => u.id === "usr-003") ?? MOCK_USUARIOS[0]

  return (
    <AuthProvider overrideUser={demoUser}>
      <AppShell profile={PROFILES["admin"]} initialActiveKey="pedidos">
        <DetalhePedidoScreen pedidoId={id} />
      </AppShell>
    </AuthProvider>
  )
}
