"use client"

import { Menu } from "@base-ui/react/menu"
import { MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"

export interface RowAction {
    label: string
    onSelect: () => void
    destructive?: boolean
    disabled?: boolean
}

export function RowActionsMenu({ actions }: { actions: RowAction[] }) {
    return (
        <Menu.Root>
            <Menu.Trigger
                onClick={(e) => e.stopPropagation()}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label="Ações"
            >
                <MoreVertical className="size-4" />
            </Menu.Trigger>
            <Menu.Portal>
                <Menu.Positioner side="bottom" align="end" sideOffset={4}>
                    <Menu.Popup className="min-w-[160px] rounded-md border border-border bg-popover p-1 text-sm shadow-md outline-none data-[starting-style]:opacity-0 data-[ending-style]:opacity-0">
                        {actions.map((action) => (
                            <Menu.Item
                                key={action.label}
                                disabled={action.disabled}
                                onClick={(e) => {
                                    e.stopPropagation()
                                    action.onSelect()
                                }}
                                className={cn(
                                    "flex cursor-pointer items-center rounded-sm px-2.5 py-1.5 outline-none transition-colors",
                                    "hover:bg-muted focus-visible:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                    action.destructive ? "text-destructive" : "text-foreground",
                                )}
                            >
                                {action.label}
                            </Menu.Item>
                        ))}
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    )
}