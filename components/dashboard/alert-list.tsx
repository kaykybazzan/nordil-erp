import Link from "next/link"
import { AlertCircle, CheckCircle2, ChevronRight } from "lucide-react"
import type { Alerta } from "@/lib/dashboard"

const LIMITE_VISIVEL = 5

interface AlertListProps {
    alertas: Alerta[]
    status?: "loading" | "success" | "error"
}

export function AlertList({ alertas, status = "success" }: AlertListProps) {
    if (status === "loading") return <AlertListSkeleton />

    if (status === "error") {
        return (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Não foi possível carregar os alertas agora.
            </div>
        )
    }

    if (alertas.length === 0) {
        return (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Nenhum alerta no momento — operação em dia.
            </div>
        )
    }

    const visiveis = alertas.slice(0, LIMITE_VISIVEL)
    const restantes = alertas.length - visiveis.length

    return (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {visiveis.map((alerta) => (
                <Link
                    key={alerta.id}
                    href={alerta.href}
                    className="flex items-center gap-3 p-3 text-sm hover:bg-muted/50"
                >
                    <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
                    <span className="flex-1 text-foreground">{alerta.mensagem}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
            ))}

            {restantes > 0 && (
                <Link
                    href="/pedidos?atrasado=true"
                    className="p-3 text-center text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                >
                    Ver todos ({restantes} a mais)
                </Link>
            )}
        </div>
    )
}

function AlertListSkeleton() {
    return (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                    <div className="h-4 w-4 animate-pulse rounded-full bg-muted" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                </div>
            ))}
        </div>
    )
}