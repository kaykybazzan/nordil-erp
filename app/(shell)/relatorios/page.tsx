"use client"

import { useState } from "react"
import { RequireRole } from "@/components/auth/require-role"
import { PedidosRelatorio } from "@/components/relatorios/pedidos-relatorio"
import { EstoqueRelatorio } from "@/components/relatorios/estoque-relatorio"
import { MovimentacoesRelatorio } from "@/components/relatorios/movimentacoes-relatorio"
import { OperacionalRelatorio } from "@/components/relatorios/operacional-relatorio"
import { cn } from "@/lib/utils"

type AbaRelatorio = "pedidos" | "estoque" | "movimentacoes" | "operacional"

const ABAS: { id: AbaRelatorio; label: string }[] = [
  { id: "pedidos", label: "Pedidos" },
  { id: "estoque", label: "Estoque" },
  { id: "movimentacoes", label: "Movimentações" },
  { id: "operacional", label: "Operacional" },
]

export default function RelatoriosPage() {
  const [abaAtiva, setAbaAtiva] = useState<AbaRelatorio>("pedidos")

  return (
    <RequireRole roles={["ADMIN", "SUPERVISOR"]}>
      <div className="flex flex-col gap-4 p-6">
        <h1 className="text-lg font-semibold">Relatórios</h1>

        <div role="tablist" className="flex gap-1 border-b border-border">
          {ABAS.map((aba) => (
            <button
              key={aba.id}
              role="tab"
              aria-selected={abaAtiva === aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors",
                abaAtiva === aba.id
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {aba.label}
            </button>
          ))}
        </div>

        <div className={cn(abaAtiva !== "pedidos" && "hidden")}>
          <PedidosRelatorio />
        </div>
        <div className={cn(abaAtiva !== "estoque" && "hidden")}>
          <EstoqueRelatorio />
        </div>
        <div className={cn(abaAtiva !== "movimentacoes" && "hidden")}>
          <MovimentacoesRelatorio />
        </div>
        <div className={cn(abaAtiva !== "operacional" && "hidden")}>
          <OperacionalRelatorio />
        </div>
      </div>
    </RequireRole>
  )
}