import Link from "next/link"
import {
    FilePlus2,
    PackageCheck,
    RotateCw,
    ClipboardList,
    CircleCheckBig,
    AlertTriangle,
    ClipboardCheck,
    ShieldAlert,
    Truck,
    Home,
    XCircle,
    type LucideIcon,
} from "lucide-react"
import type { AtividadeRecente } from "@/lib/dashboard"
import type { TipoPedidoEvento } from "@/types/domain"

const EVENTO_ICON: Record<TipoPedidoEvento, LucideIcon> = {
    PEDIDO_CRIADO: FilePlus2,
    ESTOQUE_RESERVADO: PackageCheck,
    PEDIDO_REPROCESSADO: RotateCw,
    SEPARACAO_INICIADA: ClipboardList,
    SEPARACAO_CONCLUIDA: CircleCheckBig,
    RUPTURA_ESTOQUE_DETECTADA: AlertTriangle,
    CONFERENCIA_INICIADA: ClipboardCheck,
    DIVERGENCIA_DETECTADA: ShieldAlert,
    CONFERENCIA_CONCLUIDA: CircleCheckBig,
    PEDIDO_EXPEDIDO: Truck,
    PEDIDO_ENTREGUE: Home,
    PEDIDO_CANCELADO: XCircle,
}

function tempoRelativo(dataIso: string): string {
    const diffMs = Date.now() - new Date(dataIso).getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return "agora"
    if (diffMin < 60) return `há ${diffMin} min` 
    const diffHoras = Math.floor(diffMin / 60)
    if (diffHoras < 24) return `há ${diffHoras}h` 
    const diffDias = Math.floor(diffHoras / 24)
    return `há ${diffDias}d` 
}

export function ActivityFeed({ itens }: { itens: AtividadeRecente[] }) {
    if (itens.length === 0) {
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma movimentação registrada ainda.
            </p>
        )
    }

    return (
        <ul className="flex flex-col gap-3">
            {itens.map((item) => {
                const Icon = EVENTO_ICON[item.tipo]
                return (
                    <li key={item.id}>
                        <Link
                            href={`/pedidos/${item.pedidoId}`}
                            className="-mx-1.5 flex items-start gap-2.5 rounded-md px-1.5 py-1 transition-colors hover:bg-muted/50"
                        >
                            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <Icon className="size-3.5" />
                            </span>
                            <span className="flex flex-1 flex-col">
                                <span className="text-sm text-foreground">{item.descricao}</span>
                                <span className="text-xs text-muted-foreground">{tempoRelativo(item.dataHora)}</span>
                            </span>
                        </Link>
                    </li>
                )
            })}
        </ul>
    )
}
