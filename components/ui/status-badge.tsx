import { cn } from "@/lib/utils"

export type BadgeTone = "neutral" | "info" | "warning" | "success" | "danger" | "accent"

const toneClasses: Record<BadgeTone, string> = {
    neutral: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
    info: "bg-info/10 text-info ring-1 ring-inset ring-info/20",
    warning: "bg-warning/10 text-warning ring-1 ring-inset ring-warning/20",
    success: "bg-success/10 text-success ring-1 ring-inset ring-success/20",
    danger: "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20",
    accent: "bg-accent text-accent-foreground ring-1 ring-inset ring-accent-foreground/15",
}

const dotClasses: Record<BadgeTone, string> = {
    neutral: "bg-muted-foreground/50",
    info: "bg-info",
    warning: "bg-warning",
    success: "bg-success",
    danger: "bg-destructive",
    accent: "bg-accent-foreground",
}

interface StatusBadgeProps {
    label: string
    tone?: BadgeTone
    className?: string
}

export function StatusBadge({ label, tone = "neutral", className }: StatusBadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                toneClasses[tone],
                className,
            )}
        >
            <span className={cn("size-1.5 shrink-0 rounded-full", dotClasses[tone])} aria-hidden />
            {label}
        </span>
    )
}