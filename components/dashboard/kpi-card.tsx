"use client"

import { useState } from "react"
import Link from "next/link"
import { type LucideIcon, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface KpiCardProps {
    label: string
    value: number
    criterio: string
    href: string
    icon: LucideIcon
    tone?: "default" | "danger"
    status?: "loading" | "success" | "error"
}

export function KpiCard({
    label,
    value,
    criterio,
    href,
    icon: Icon,
    tone = "default",
    status = "success",
}: KpiCardProps) {
    const [showTip, setShowTip] = useState(false)

    if (status === "loading") return <KpiCardSkeleton />

    const isDanger = tone === "danger" && value > 0 && status !== "error"

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
                    <span className={cn("text-2xl font-semibold tabular-nums", isDanger && "text-destructive")}>
                        {value}
                    </span>
                )}
            </div>

            <div
                className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    status === "error"
                        ? "bg-muted text-muted-foreground"
                        : isDanger
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground",
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