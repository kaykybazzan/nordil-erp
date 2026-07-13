"use client"

import { AppShell } from "@/components/app-shell"
import { ExpedicaoScreen } from "@/components/expedicao/expedicao-screen"
import { PROFILES } from "@/lib/shell-config"

export default function ExpedicaoPage() {
  return (
    <AppShell profile={PROFILES["expedicao"]} initialActiveKey="expedicao">
      <ExpedicaoScreen />
    </AppShell>
  )
}
