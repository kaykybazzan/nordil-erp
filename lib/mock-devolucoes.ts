import type { Devolucao } from "@/types/domain"

export const MOCK_DEVOLUCOES: Devolucao[] = [
  {
    id: "dev-001",
    empresaId: "emp-001",
    pedidoId: "ped-010",
    itens: [
      {
        itemPedidoId: "item-015",
        produtoId: "prd-007",
        quantidadeSolicitada: 3,
        quantidadeConfirmada: 2,
      },
    ],
    motivo: "PRODUTO_AVARIADO",
    status: "CONCLUIDA",
    solicitadoPor: "usr-002",
    solicitadoEm: "2026-06-25T10:00:00-03:00",
    confirmadoPor: "usr-003",
    confirmadoEm: "2026-06-26T14:00:00-03:00",
  },
  {
    id: "dev-002",
    empresaId: "emp-001",
    pedidoId: "ped-010",
    itens: [
      {
        itemPedidoId: "item-015",
        produtoId: "prd-007",
        quantidadeSolicitada: 5,
        quantidadeConfirmada: null,
      },
    ],
    motivo: "OUTRO",
    motivoOutroTexto: "Cliente comprou por engano, produto errado para a aplicação",
    status: "SOLICITADA",
    solicitadoPor: "usr-002",
    solicitadoEm: "2026-07-01T09:00:00-03:00",
  },
  {
    id: "dev-003",
    empresaId: "emp-001",
    pedidoId: "ped-010",
    itens: [
      {
        itemPedidoId: "item-015",
        produtoId: "prd-007",
        quantidadeSolicitada: 10,
        quantidadeConfirmada: null,
      },
    ],
    motivo: "DESISTENCIA_CLIENTE",
    status: "CANCELADA",
    solicitadoPor: "usr-003",
    solicitadoEm: "2026-07-05T11:00:00-03:00",
    canceladoPor: "usr-003",
    canceladoEm: "2026-07-06T10:00:00-03:00",
  },
]
