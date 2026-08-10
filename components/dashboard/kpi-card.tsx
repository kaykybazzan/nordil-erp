"use client"

import Link from "next/link"
import { type LucideIcon, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react"
import { Tooltip } from "@base-ui/react/tooltip"
import { cn } from "@/lib/utils"
import type { Delta } from "@/lib/dashboard"

interface KpiCardProps {
    label: string
    value: number
    criterio: string
    href: string
    icon: LucideIcon
    tone?: "default" | "info" | "warning" | "success" | "danger"
    status?: "loading" | "success" | "error"
    delta?: Delta
}

const iconToneClasses: Record<NonNullable<KpiCardProps["tone"]>, string> = {
    default: "bg-muted text-muted-foreground",
    info: "bg-info/10 text-info",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
    danger: "bg-destructive/10 text-destructive",
}

export function KpiCard({
    label,
    value,
    criterio,
    href,
    icon: Icon,
    tone = "default",
    status = "success",
    delta,
}: KpiCardProps) {
    if (status === "loading") return <KpiCardSkeleton />

    const effectiveTone: NonNullable<KpiCardProps["tone"]> =
        status === "error" ? "default" : tone

    const card = (
        <div
            className={cn(
                "flex h-full flex-col gap-1.5 rounded-lg border border-border bg-card p-2.5 transition-colors",
                status !== "error" && "hover:border-foreground/20",
            )}
        >
            <div className="flex items-center gap-2">
                <div
                    className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg",
                        iconToneClasses[effectiveTone],
                    )}
                >
                    {status === "error" ? (
                        <AlertTriangle className="size-[15px]" />
                    ) : (
                        <Icon className="size-[15px]" />
                    )}
                </div>
                <span className="text-xs leading-tight text-muted-foreground text-pretty">{label}</span>
            </div>

            <div className="mt-auto flex flex-col gap-0.5">
                {status === "error" ? (
                    <span className="text-xl font-semibold text-muted-foreground">—</span>
                ) : (
                    <span className="text-xl font-semibold tabular-nums text-foreground">{value}</span>
                )}

                {delta && status === "success" && (
                    <span
                        className={cn(
                            "inline-flex items-center gap-0.5 text-xs font-medium",
                            delta.direcao === "up" && "text-success",
                            delta.direcao === "down" && "text-destructive",
                            delta.direcao === "flat" && "text-muted-foreground",
                        )}
                    >
                        {delta.direcao === "up" && <ArrowUp className="size-3" />}
                        {delta.direcao === "down" && <ArrowDown className="size-3" />}
                        {delta.direcao === "flat" && delta.percentual === null
                            ? "sem movimento"
                            : delta.percentual === null
                                ? "novo"
                                : `${Math.abs(delta.percentual)}%`}
                        <span className="font-normal text-muted-foreground">
                            {delta.direcao === "flat" && delta.percentual === null ? "hoje ou ontem" : "vs ontem"}
                        </span>
                    </span>
                )}
            </div>
        </div>
    )

    const trigger =
        status === "error" ? (
            <div className="block h-full cursor-default">{card}</div>
        ) : (
            <Link href={href} className="block h-full">
                {card}
            </Link>
        )

    return (
        <Tooltip.Root>
            <Tooltip.Trigger render={trigger} />
            <Tooltip.Portal>
                <Tooltip.Positioner side="top" sideOffset={8}>
                    <Tooltip.Popup className="z-50 w-64 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md data-[starting-style]:opacity-0 data-[ending-style]:opacity-0">
                        {status === "error" ? "Não foi possível carregar este indicador." : criterio}
                    </Tooltip.Popup>
                </Tooltip.Positioner>
            </Tooltip.Portal>
        </Tooltip.Root>
    )
}

export function KpiCardSkeleton() {
    return (
        <div className="flex h-full flex-col gap-1.5 rounded-lg border border-border bg-card p-2.5">
            <div className="flex items-center gap-2">
                <div className="size-7 shrink-0 animate-pulse rounded-lg bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-auto h-7 w-12 animate-pulse rounded bg-muted" />
        </div>
    )
}