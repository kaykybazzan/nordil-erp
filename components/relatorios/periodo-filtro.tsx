"use client"

import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PeriodoValue {
  inicio: string // yyyy-mm-dd
  fim: string // yyyy-mm-dd
}

interface PeriodoFiltroProps {
  value: PeriodoValue
  onChange: (value: PeriodoValue) => void
}

export function PeriodoFiltro({ value, onChange }: PeriodoFiltroProps) {
  const invalido = value.inicio !== "" && value.fim !== "" && value.fim < value.inicio

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Data inicial
          <input
            type="date"
            value={value.inicio}
            onChange={(e) => onChange({ ...value, inicio: e.target.value })}
            className={cn(
              "h-9 rounded-md border bg-background px-2 text-sm text-foreground",
              invalido ? "border-destructive" : "border-input",
            )}
          />
        </label>
        <span className="mt-4 text-muted-foreground">–</span>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Data final
          <input
            type="date"
            value={value.fim}
            onChange={(e) => onChange({ ...value, fim: e.target.value })}
            className={cn(
              "h-9 rounded-md border bg-background px-2 text-sm text-foreground",
              invalido ? "border-destructive" : "border-input",
            )}
          />
        </label>
      </div>
      {invalido && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="size-3.5" aria-hidden="true" />
          A data final não pode ser anterior à data inicial.
        </p>
      )}
    </div>
  )
}

/** Retorna o período padrão: últimos 30 dias, como PeriodoValue (yyyy-mm-dd). */
export function periodoUltimos30Dias(): PeriodoValue {
  const hoje = new Date()
  const inicio = new Date()
  inicio.setDate(inicio.getDate() - 30)
  return {
    inicio: inicio.toISOString().slice(0, 10),
    fim: hoje.toISOString().slice(0, 10),
  }
}