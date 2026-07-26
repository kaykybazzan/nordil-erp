"use client"

import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Pedido } from "@/types/domain"

interface CancelarPedidoDialogProps {
    pedido: Pedido | null
    onOpenChange: (open: boolean) => void
    onConfirm: (pedidoId: string, motivo: string) => Promise<void> | void
}

export function CancelarPedidoDialog({ pedido, onOpenChange, onConfirm }: CancelarPedidoDialogProps) {
    const [motivo, setMotivo] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function handleConfirm() {
        if (!pedido || !motivo.trim()) return
        setIsSubmitting(true)
        try {
            await onConfirm(pedido.id, motivo.trim())
            setMotivo("")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog.Root
            open={!!pedido}
            onOpenChange={(open) => {
                if (!open) {
                    setMotivo("")
                    onOpenChange(false)
                }
            }}
        >
            <Dialog.Portal>
                <Dialog.Backdrop
                    className={cn(
                        "fixed inset-0 z-50 bg-foreground/25",
                        "transition-opacity data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
                    )}
                />
                <Dialog.Popup
                    className={cn(
                        "fixed top-1/2 left-1/2 z-50 w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xl shadow-black/20 outline-none",
                        "transition-all duration-150 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
                    )}
                >
                    {pedido && (
                        <>
                            <Dialog.Title className="text-sm font-semibold text-foreground">
                                Cancelar pedido #{pedido.numero}
                            </Dialog.Title>
                            <Dialog.Description className="mt-1 text-xs text-muted-foreground">
                                Essa ação reverte a reserva de estoque e não pode ser desfeita.
                            </Dialog.Description>

                            <div className="mt-3 flex gap-2 rounded-md border border-warning/40 bg-warning/10 p-2.5">
                                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                                <p className="text-xs leading-relaxed text-foreground">
                                    O motivo é obrigatório e fica registrado na auditoria do pedido.
                                </p>
                            </div>

                            <label htmlFor="motivo-cancelamento" className="mt-3 mb-1 block text-xs font-medium text-foreground">
                                Motivo do cancelamento <span className="text-destructive">*</span>
                            </label>
                            <textarea
                                id="motivo-cancelamento"
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                rows={3}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                                placeholder="Explique o motivo do cancelamento…"
                            />

                            <div className="mt-4 flex justify-end gap-2">
                                <Dialog.Close
                                    disabled={isSubmitting}
                                    className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                                >
                                    Voltar
                                </Dialog.Close>
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    disabled={!motivo.trim() || isSubmitting}
                                    className="inline-flex items-center gap-2 rounded-md bg-destructive px-3.5 py-2 text-sm font-medium text-destructive-foreground outline-none hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                                >
                                    {isSubmitting && (
                                        <span className="size-3.5 animate-spin rounded-full border-2 border-destructive-foreground/40 border-t-destructive-foreground" />
                                    )}
                                    {isSubmitting ? "Cancelando…" : "Confirmar cancelamento"}
                                </button>
                            </div>
                        </>
                    )}
                </Dialog.Popup>
            </Dialog.Portal>
        </Dialog.Root>
    )
}