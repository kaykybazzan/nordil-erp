"use client"

import { useState } from "react"
import Link from "next/link"
import { type LucideIcon, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react"
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
    const [showTip, setShowTip] = useState(false)

    if (status === "loading") return <KpiCardSkeleton />

    const isActiveAlert = tone !== "default" && value > 0 && status !== "error"
    const effectiveTone: NonNullable<KpiCardProps["tone"]> =
        status === "error" ? "default" : isActiveAlert ? tone : "default"

    const conteudo = (
        <div
            className={cn(
                "relative flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors",
                status !== "error" && "hover:border-foreground/20",
            )}
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
            onFocus={() => setShowTip(true)}
            onBlur={() => setShowTip(false)}
        >
            <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">{label}</span>
                {status === "error" ? (
                    <span className="text-2xl font-semibold text-muted-foreground">—</span>
                ) : (
                    <span
                        className={cn(
                            "text-2xl font-semibold tabular-nums",
                            effectiveTone === "danger" && "text-destructive",
                            effectiveTone === "warning" && "text-warning",
                        )}
                    >
                        {value}
                    </span>
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
                        {delta.percentual === null ? "novo" : `${Math.abs(delta.percentual)}%`}
                        <span className="font-normal text-muted-foreground">vs ontem</span>
                    </span>
                )}
            </div>

            <div
                className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    iconToneClasses[status === "error" ? "default" : effectiveTone],
                )}
            >
                {status === "error" ? <AlertTriangle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
            </div>

            {showTip && (
                <div className="absolute bottom-full left-0 z-10 mb-2 w-64 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                    {status === "error" ? "Não foi possível carregar este indicador." : criterio}
                </div>
            )}
        </div>
    )

    return status === "error" ? (
        <div className="cursor-default">{conteudo}</div>
    ) : (
        <Link href={href} className="block">
            {conteudo}
        </Link>
    )
}

export function KpiCardSkeleton() {
    return (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <div className="flex flex-col gap-2">
                <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
                <div className="h-7 w-12 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
        </div>
    )
}