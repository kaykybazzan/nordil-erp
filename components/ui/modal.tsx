"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    description?: string
    children: React.ReactNode
    className?: string
}

export function Modal({ open, onOpenChange, title, description, children, className }: ModalProps) {
    React.useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onOpenChange(false)
        }
        if (open) document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [open, onOpenChange])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} aria-hidden />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                className={cn(
                    "relative z-10 w-full max-w-sm rounded-lg border border-border bg-background p-5 shadow-lg",
                    className,
                )}
            >
                <h2 id="modal-title" className="text-sm font-semibold">
                    {title}
                </h2>
                {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
                <div className="mt-4">{children}</div>
            </div>
        </div>
    )
}