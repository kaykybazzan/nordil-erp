import { StatusBadge, type BadgeTone } from "@/components/ui/status-badge"
import type { StatusPedido } from "@/types/domain"

const PEDIDO_STATUS_CONFIG: Record<StatusPedido, { label: string; tone: BadgeTone }> = {
    CRIADO: { label: "Criado", tone: "neutral" },
    RESERVADO: { label: "Reservado", tone: "info" },
    EM_SEPARACAO: { label: "Em separação", tone: "warning" },
    EM_CONFERENCIA: { label: "Em conferência", tone: "warning" },
    CONFERIDO: { label: "Conferido", tone: "accent" },
    EXPEDIDO: { label: "Expedido", tone: "success" },
    ENTREGUE: { label: "Entregue", tone: "success" },
    CANCELADO: { label: "Cancelado", tone: "danger" },
}

export function PedidoStatusBadge({ status }: { status: StatusPedido }) {
    const config = PEDIDO_STATUS_CONFIG[status]
    return <StatusBadge label={config.label} tone={config.tone} />
}

const CLIENTE_STATUS_CONFIG: Record<"ativo" | "bloqueado", { label: string; tone: BadgeTone }> = {
    ativo: { label: "Ativo", tone: "success" },
    bloqueado: { label: "Bloqueado", tone: "danger" },
}

export function ClienteStatusBadge({ status }: { status: "ativo" | "bloqueado" }) {
    const config = CLIENTE_STATUS_CONFIG[status]
    return <StatusBadge label={config.label} tone={config.tone} />
}

const USUARIO_STATUS_CONFIG: Record<"ativo" | "inativo", { label: string; tone: BadgeTone }> = {
    ativo: { label: "Ativo", tone: "success" },
    inativo: { label: "Inativo", tone: "neutral" },
}

export function UsuarioStatusBadge({ status }: { status: "ativo" | "inativo" }) {
    const config = USUARIO_STATUS_CONFIG[status]
    return <StatusBadge label={config.label} tone={config.tone} />
}