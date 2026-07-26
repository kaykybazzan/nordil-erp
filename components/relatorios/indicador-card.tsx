"use client"

import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ComparacaoPeriodo } from "@/lib/relatorios-utils"

interface IndicadorCardProps {
  label: string
  comparacao?: ComparacaoPeriodo | null
  valorEstatico?: number
  formatar?: (valor: number) => string
  isLoading?: boolean
  tooltip?: string
}

export function IndicadorCard({
  label,
  comparacao,
  valorEstatico,
  formatar = (v) => String(v),
  isLoading,
  tooltip,
}: IndicadorCardProps) {
  const valor = comparacao ? comparacao.valorAtual : valorEstatico ?? 0
  const variacao = comparacao?.variacaoPercentual ?? null

  return (
    <div
      className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4"
      title={tooltip}
    >
      <span className="text-xs font-medium text-muted-foreground">{label}</span>

      {isLoading ? (
        <div className="h-7 w-20 animate-pulse rounded bg-muted" />
      ) : (
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-card-foreground">
            {formatar(valor)}
          </span>
          {variacao !== null && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                variacao > 0 && "text-green-600",
                variacao < 0 && "text-destructive",
                variacao === 0 && "text-muted-foreground",
              )}
            >
              {variacao > 0 && <TrendingUp className="size-3.5" aria-hidden="true" />}
              {variacao < 0 && <TrendingDown className="size-3.5" aria-hidden="true" />}
              {variacao === 0 && <Minus className="size-3.5" aria-hidden="true" />}
              {Math.abs(variacao).toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}