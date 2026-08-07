import type { ResumoPeriodo as ResumoPeriodoData } from "@/lib/dashboard"

function formatarMoeda(valor: number): string {
    return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function ResumoPeriodo({ dados }: { dados: ResumoPeriodoData }) {
    const linhas = [
        { label: "Pedidos no período", valor: dados.totalPedidos.toLocaleString("pt-BR") },
        { label: "Faturado (expedido + entregue)", valor: formatarMoeda(dados.totalFaturado) },
        { label: "Itens movimentados", valor: dados.itensMovimentados.toLocaleString("pt-BR") },
        { label: "Clientes atendidos", valor: dados.clientesAtendidos.toLocaleString("pt-BR") },
    ]

    return (
        <dl className="flex flex-col gap-3">
            {linhas.map((linha) => (
                <div key={linha.label} className="flex items-center justify-between gap-3 text-sm">
                    <dt className="text-muted-foreground">{linha.label}</dt>
                    <dd className="font-medium tabular-nums text-foreground">{linha.valor}</dd>
                </div>
            ))}
        </dl>
    )
}
