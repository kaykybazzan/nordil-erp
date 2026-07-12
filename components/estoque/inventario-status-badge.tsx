"use client"

import { Tooltip } from "@base-ui/react/tooltip"
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react"
import type { InventarioStatus } from "@/lib/mock-inventario"

export function InventarioStatusBadge({
  status,
  tooltip,
}: {
  status: InventarioStatus
  tooltip: string
}) {
  const styles: Record<
    InventarioStatus,
    { bg: string; text: string; icon: React.ReactNode }
  > = {
    normal: {
      bg: "bg-[#f0f9f4]",
      text: "text-success",
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    baixo: {
      bg: "bg-[#fef4e6]",
      text: "text-warning",
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    zerado: {
      bg: "bg-[#fee2e2]",
      text: "text-destructive",
      icon: <AlertCircle className="w-4 h-4" />,
    },
  }

  const style = styles[status]
  const labels: Record<InventarioStatus, string> = {
    normal: "Normal",
    baixo: "Estoque baixo",
    zerado: "Sem estoque",
  }

  const label = labels[status]

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        className={cn(
          "inline-flex items-center gap-2 px-2.5 py-1.5 rounded text-sm font-medium whitespace-nowrap outline-none",
          style.bg,
          style.text
        )}
      >
        {style.icon}
        {label}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8}>
          <Tooltip.Popup
            className="bg-foreground text-background px-2 py-1 rounded text-xs max-w-xs"
          >
            {tooltip}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ")
}
