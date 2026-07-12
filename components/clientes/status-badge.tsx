import { cn } from "@/lib/utils"
import type { Cliente } from "@/types/domain"

export function StatusBadge({
  status,
  className,
}: {
  status: Cliente["status"]
  className?: string
}) {
  const ativo = status === "ativo"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium",
        ativo
          ? "bg-success/12 text-success"
          : "bg-destructive/12 text-destructive",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          ativo ? "bg-success" : "bg-destructive",
        )}
      />
      {ativo ? "Ativo" : "Bloqueado"}
    </span>
  )
}
