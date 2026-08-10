"use client"

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import type { PontoTendencia } from "@/lib/dashboard"

export function TendenciaChart({ dados }: { dados: PontoTendencia[] }) {
    return (
        <ResponsiveContainer width="100%" height="100%" minHeight={160}>
            <AreaChart data={dados} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                    <linearGradient id="tendenciaFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                    dataKey="data"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={28}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <Tooltip
                    cursor={{ stroke: "var(--border)" }}
                    contentStyle={{
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--popover)",
                        color: "var(--popover-foreground)",
                        fontSize: 13,
                    }}
                    labelStyle={{ color: "var(--muted-foreground)" }}
                    formatter={(value: any) => [`${value ?? 0} pedidos`, ""]}
                />
                <Area
                    type="monotone"
                    dataKey="quantidade"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#tendenciaFill)"
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}
