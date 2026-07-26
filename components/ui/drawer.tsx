"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DrawerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    children: React.ReactNode
    footer?: React.ReactNode
    className?: string
}

export function Drawer({ open, onOpenChange, title, children, footer, className }: DrawerProps) {
    const panelRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onOpenChange(false)
        }
        if (open) document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [open, onOpenChange])

    React.useEffect(() => {
        if (open) panelRef.current?.focus()
    }, [open])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-40 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} aria-hidden />
            <div
                ref={panelRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby="drawer-title"
                className={cn(
                    "relative z-10 flex h-full w-full max-w-[420px] flex-col border-l border-border bg-background shadow-xl outline-none",
                    className,
                )}
            >
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <h2 id="drawer-title" className="text-sm font-semibold">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Fechar"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

                {footer && <div className="border-t border-border px-5 py-4">{footer}</div>}
            </div>
        </div>
    )
}