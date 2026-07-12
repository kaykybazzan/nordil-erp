import { cn } from "@/lib/utils"
import type { Produto } from "@/types/domain"

export function ProdutoStatusBadge({
  status,
  className,
}: {
  status: Produto["status"]
  className?: string
}) {
  const ativo = status === "ativo"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium",
        ativo
          ? "bg-success/12 text-success"
          : "bg-muted text-muted-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          ativo ? "bg-success" : "bg-muted-foreground",
        )}
      />
      {ativo ? "Ativo" : "Inativo"}
    </span>
  )
}
