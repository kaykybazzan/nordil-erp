'use client'

import { Menu } from '@base-ui/react/menu'
import { Avatar } from '@base-ui/react/avatar'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { initials, type UserProfile } from '@/lib/shell-config'

export function ProfileMenu({ profile }: { profile: UserProfile }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          'flex items-center gap-2 rounded-md p-0.5 pr-1.5 outline-none transition-colors',
          'hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50',
          'aria-expanded:bg-muted',
        )}
        aria-label="Abrir menu do perfil"
      >
        <Avatar.Root className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary text-[0.72rem] font-semibold text-primary-foreground select-none">
          <Avatar.Fallback>{initials(profile.name)}</Avatar.Fallback>
        </Avatar.Root>
        <span className="hidden max-w-[9rem] truncate text-sm font-medium text-foreground sm:block">
          {profile.name.split(' ')[0]}
        </span>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner
          side="bottom"
          align="end"
          sideOffset={6}
          className="z-50"
        >
          <Menu.Popup
            className={cn(
              'min-w-60 origin-[var(--transform-origin)] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg shadow-black/10 outline-none',
              'transition-[transform,opacity] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
            )}
          >
            <div className="flex flex-col gap-0.5 px-2.5 py-2">
              <span className="truncate text-sm font-semibold text-foreground">
                {profile.name}
              </span>
              <span className="truncate font-mono text-xs text-muted-foreground">
                {profile.email}
              </span>
              <span className="mt-1 w-fit rounded bg-accent px-1.5 py-0.5 text-[0.68rem] font-medium text-accent-foreground">
                {profile.roleLabel}
              </span>
            </div>

            <Menu.Separator className="my-1 h-px bg-border" />

            <Menu.Item
              className={cn(
                'flex cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none select-none',
                'data-[highlighted]:bg-muted data-[highlighted]:text-foreground',
              )}
              onClick={() => console.log('[v0] logout clicked')}
            >
              <LogOut className="size-4 text-muted-foreground" />
              Sair
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
