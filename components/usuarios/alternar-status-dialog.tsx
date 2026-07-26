"use client"

import { Dialog } from "@base-ui/react/dialog"
import { Button } from "@/components/ui/button"
import type { Usuario } from "@/types/domain"

interface AlternarStatusDialogProps {
  usuario: Usuario | null
  onOpenChange: (open: boolean) => void
  onConfirm: (usuarioId: string) => void
}

export function AlternarStatusDialog({ usuario, onOpenChange, onConfirm }: AlternarStatusDialogProps) {
  const vaiInativar = usuario?.status === "ativo"

  return (
    <Dialog.Root open={usuario !== null} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg outline-none">
          <Dialog.Title className="text-base font-semibold">
            {vaiInativar ? "Inativar usuário" : "Ativar usuário"}
          </Dialog.Title>
          <p className="mt-2 text-sm text-muted-foreground">
            {vaiInativar
              ? `${usuario?.nome} não vai mais conseguir acessar o sistema.`
              : `${usuario?.nome} vai voltar a ter acesso ao sistema.`}
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={() => usuario && onConfirm(usuario.id)}>
              {vaiInativar ? "Inativar" : "Ativar"}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}