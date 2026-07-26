import { cn } from "@/lib/utils"

export type BadgeTone = "neutral" | "info" | "warning" | "success" | "danger" | "accent"

const toneClasses: Record<BadgeTone, string> = {
    neutral: "bg-muted text-muted-foreground",
    info: "bg-info/12 text-info",
    warning: "bg-warning/12 text-warning",
    success: "bg-success/12 text-success",
    danger: "bg-destructive/12 text-destructive",
    accent: "bg-accent text-accent-foreground",
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
                "inline-flex w-fit items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium",
                toneClasses[tone],
                className,
            )}
        >
            {label}
        </span>
    )
}