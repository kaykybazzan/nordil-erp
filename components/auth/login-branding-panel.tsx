import Image from "next/image"
import { Package, ClipboardList, BarChart3, ShieldCheck } from "lucide-react"

interface LoginBrandingPanelProps {
  className?: string
}

const FEATURES = [
  {
    icon: Package,
    title: "Estoque inteligente",
    description: "Controle total do seu estoque",
  },
  {
    icon: ClipboardList,
    title: "Pedidos e expedição",
    description: "Do pedido à entrega com eficiência",
  },
  {
    icon: BarChart3,
    title: "Relatórios estratégicos",
    description: "Dados para decisões mais assertivas",
  },
]

export function LoginBrandingPanel({ className }: LoginBrandingPanelProps) {
  return (
<div className={`flex flex-col justify-between p-12 xl:p-16 ${className ?? ""}`}>
    <div>
    <h1 className="font-[family-name:var(--font-space-grotesk)] text-5xl font-bold tracking-tight text-white xl:text-6xl">
            <span className="text-[#3b82f6]">Nordil</span> <span className="text-white">ERP</span>
        </h1>

          <p className="mt-5 max-w-md text-lg text-white/70">
            Gestão completa para distribuidoras de materiais elétricos.
          </p>

          <ul className="mt-10 flex flex-col gap-5">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5">
                  <Icon className="size-5 text-[#3b82f6]" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-base font-medium text-white">{title}</p>
                  <p className="text-sm text-white/60">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
  )
}