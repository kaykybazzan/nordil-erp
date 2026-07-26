import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge"
import type { StatusDevolucao } from "@/types/domain"

const DEVOLUCAO_STATUS_CONFIG: Record<StatusDevolucao, { label: string; tone: BadgeTone }> = {
  SOLICITADA: { label: "Solicitada", tone: "info" },
  CONCLUIDA: { label: "Concluída", tone: "success" },
  CANCELADA: { label: "Cancelada", tone: "danger" },
}

export function StatusDevolucaoBadge({ status }: { status: StatusDevolucao }) {
  const config = DEVOLUCAO_STATUS_CONFIG[status]
  return <StatusBadge label={config.label} tone={config.tone} />
}
