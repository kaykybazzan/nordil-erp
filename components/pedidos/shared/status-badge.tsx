import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PendenciaPedido, StatusPedido } from "@/types/domain"

type BadgeVariant = "info" | "success" | "warning" | "muted" | "destructive"

const STATUS_LABEL: Record<StatusPedido, string> = {
  CRIADO: "Criado",
  RESERVADO: "Reservado",
  EM_SEPARACAO: "Em separação",
  EM_CONFERENCIA: "Em conferência",
  CONFERIDO: "Conferido",
  EXPEDIDO: "Expedido",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
}

function resolveVariant(
  status: StatusPedido,
  pendencia: PendenciaPedido,
): BadgeVariant {
  switch (status) {
    case "CRIADO":
    case "RESERVADO":
    case "CONFERIDO":
    case "EXPEDIDO":
      return "info"
    case "EM_SEPARACAO":
    case "EM_CONFERENCIA":
      return pendencia !== "NENHUMA" ? "warning" : "muted"
    case "ENTREGUE":
      return "success"
    case "CANCELADO":
      return "destructive"
  }
}

const VARIANT_CLASSES: Record<
  BadgeVariant,
  { wrapper: string; dot: string }
> = {
  info: {
    wrapper: "bg-info/12 text-info",
    dot: "bg-info",
  },
  success: {
    wrapper: "bg-success/12 text-success",
    dot: "bg-success",
  },
  warning: {
    wrapper: "bg-warning/12 text-warning",
    dot: "bg-warning",
  },
  muted: {
    wrapper: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  destructive: {
    wrapper: "bg-destructive/12 text-destructive",
    dot: "bg-destructive",
  },
}

export function StatusBadgePedido({
  status,
  pendencia = "NENHUMA",
  className,
}: {
  status: StatusPedido
  pendencia?: PendenciaPedido
  className?: string
}) {
  const variant = resolveVariant(status, pendencia)
  const { wrapper, dot } = VARIANT_CLASSES[variant]
  const temPendencia = pendencia !== "NENHUMA"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium",
        wrapper,
        className,
      )}
    >
      {temPendencia ? (
        <AlertTriangle aria-hidden className="size-3 shrink-0" />
      ) : (
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dot)} />
      )}
      {STATUS_LABEL[status]}
    </span>
  )
}
