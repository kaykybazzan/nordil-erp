import type { ResumoPeriodo as ResumoPeriodoData } from "@/lib/dashboard"

function formatarMoeda(valor: number): string {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function ResumoPeriodo({ dados }: { dados: ResumoPeriodoData }) {
    const linhas = [
        { label: "Pedidos no período", valor: dados.totalPedidos.toLocaleString("pt-BR") },
        { label: "Faturado", valor: formatarMoeda(dados.totalFaturado) },
        { label: "Itens movimentados", valor: dados.itensMovimentados.toLocaleString("pt-BR") },
        { label: "Clientes atendidos", valor: dados.clientesAtendidos.toLocaleString("pt-BR") },
    ]

    return (
        <dl className="grid grid-cols-2 gap-3">
            {linhas.map((linha) => (
                <div
                    key={linha.label}
                    className="flex flex-col gap-1 rounded-lg border border-border bg-background p-3"
                >
                    <dt className="text-xs text-muted-foreground">{linha.label}</dt>
                    <dd className="text-lg font-semibold tabular-nums text-foreground">{linha.valor}</dd>
                </div>
            ))}
        </dl>
    )
}
