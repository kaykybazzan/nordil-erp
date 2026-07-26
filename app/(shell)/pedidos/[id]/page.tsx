"use client"

import { use } from "react"
import { DetalhePedidoScreen } from "@/components/pedidos/detalhe/detalhe-pedido-screen"

export default function PedidoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <DetalhePedidoScreen pedidoId={id} />
}
