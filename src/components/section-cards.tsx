import { FileTextIcon, MapPinIcon, ShieldCheckIcon } from "lucide-react"

import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { DashboardMetrics, DashboardState } from "@/types/dashboard"

const indicators = [
  { key: "municipalities", label: "Municípios Visitados", description: "municípios vistoriados", icon: MapPinIcon },
  { key: "forces", label: "Forças Vistoriadas", description: "forças atendidas", icon: ShieldCheckIcon },
  { key: "reports", label: "Relatórios Emitidos", description: "relatórios gerados", icon: FileTextIcon },
] as const

interface SectionCardsProps {
  metrics: DashboardMetrics
  state: DashboardState
}

export function SectionCards({ metrics, state }: SectionCardsProps) {
  const isLoading = state === "loading"

  return (
    <section aria-label="Indicadores principais" aria-busy={isLoading} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {indicators.map(({ key, label, description, icon: Icon }) => {
        const value = state === "ready" ? metrics[key] : null
        const hasValue = typeof value === "number" && Number.isFinite(value) && value >= 0
        const trend = state === "ready" ? metrics.trends?.[key] : undefined

        return (
          <Card key={key} className="min-h-40 border border-border bg-card shadow-none ring-0 transition-colors duration-200 hover:border-primary/25">
            <CardHeader className="gap-3 p-1 px-5">
              <CardDescription className="text-sm font-medium text-slate-600 sm:min-h-10 lg:min-h-5">{label}</CardDescription>
              <CardTitle className="text-4xl font-semibold tracking-tight text-primary tabular-nums">
                {isLoading ? <Skeleton className="h-10 w-20" aria-label="Carregando indicador" /> : hasValue ? value.toLocaleString("pt-BR") : <span aria-label="Dados indisponíveis">—</span>}
              </CardTitle>
              <CardAction className="flex size-11 items-center justify-center rounded-lg bg-blue-50 text-primary">
                <Icon className="size-6" strokeWidth={1.6} aria-hidden="true" />
              </CardAction>
              <p className="col-span-full flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-5 text-slate-600">
                <span>{isLoading ? "Carregando dados…" : hasValue ? description : "Dados ainda não disponíveis"}</span>
                {trend && <span className="rounded-md bg-blue-50 px-2 font-medium text-primary">{trend}</span>}
              </p>
            </CardHeader>
          </Card>
        )
      })}
    </section>
  )
}
