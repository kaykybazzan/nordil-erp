"use client"

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import type { StatusDistribuicao } from "@/lib/dashboard"

const STATUS_COLORS: Record<string, string> = {
    CRIADO: "var(--chart-1)",
    RESERVADO: "var(--info)",
    EM_SEPARACAO: "var(--warning)",
    EM_CONFERENCIA: "var(--chart-4)",
    CONFERIDO: "var(--chart-3)",
    EXPEDIDO: "var(--chart-2)",
    ENTREGUE: "var(--success)",
    CANCELADO: "var(--destructive)",
}

export function StatusDonutChart({ dados }: { dados: StatusDistribuicao[] }) {
    const total = dados.reduce((soma, d) => soma + d.quantidade, 0)

    if (total === 0) {
        return (
            <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">
                Nenhum pedido no momento.
            </div>
        )
    }

    return (
        <div className="flex h-full items-center gap-5">
            <div className="relative h-[150px] w-[150px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={dados}
                            dataKey="quantidade"
                            nameKey="label"
                            innerRadius={48}
                            outerRadius={68}
                            paddingAngle={2}
                            stroke="none"
                        >
                            {dados.map((d) => (
                                <Cell key={d.status} fill={STATUS_COLORS[d.status]} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-semibold tabular-nums text-foreground">{total}</span>
                    <span className="text-xs text-muted-foreground">Total</span>
                </div>
            </div>

            <ul className="flex flex-1 flex-col gap-2">
                {dados.map((d) => (
                    <li key={d.status} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2 text-foreground">
                            <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: STATUS_COLORS[d.status] }}
                                aria-hidden
                            />
                            {d.label}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                            {d.quantidade} <span className="text-xs">({d.percentual}%)</span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
