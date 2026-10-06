import { useId, useState } from "react"
import { ChartNoAxesCombinedIcon, ChevronDownIcon } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import type { DashboardData, DashboardPeriod, DashboardState } from "@/types/dashboard"

const periodOptions = [
  { value: "6-months", label: "Últimos 6 meses" },
  { value: "12-months", label: "Últimos 12 meses" },
  { value: "current-year", label: "Ano atual" },
] as const

const chartConfig = {
  inspections: { label: "Vistorias", color: "var(--primary)" },
} satisfies ChartConfig

interface ChartAreaInteractiveProps {
  periods: DashboardData["inspectionPeriods"]
  state: DashboardState
}

export function ChartAreaInteractive({ periods, state }: ChartAreaInteractiveProps) {
  const [requestedPeriod, setRequestedPeriod] = useState<DashboardPeriod>("6-months")
  const id = useId().replace(/:/g, "")
  const availablePeriods = periodOptions.filter(({ value }) => periods[value] !== undefined)
  const selectedPeriod = periods[requestedPeriod] !== undefined ? requestedPeriod : availablePeriods[0]?.value ?? "6-months"
  const chartData = state === "ready" ? (periods[selectedPeriod] ?? []) : []
  const isLoading = state === "loading"
  const hasPeriods = state === "ready" && availablePeriods.length > 0

  return (
    <Card className="border border-border bg-card shadow-none ring-0" aria-busy={isLoading}>
      <CardHeader className="flex flex-col gap-4 px-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="space-y-1">
          <CardTitle className="text-primary"><h2>Vistorias realizadas</h2></CardTitle>
          <CardDescription className="text-slate-600">Quantidade de vistorias realizadas por mês.</CardDescription>
        </div>
        <div className="shrink-0 space-y-1.5">
          <label htmlFor={`period-${id}`} className="sr-only">Período das vistorias</label>
          <div className="relative">
            <select
              id={`period-${id}`}
              aria-describedby={!hasPeriods && !isLoading ? `period-help-${id}` : undefined}
              value={selectedPeriod}
              onChange={(event) => setRequestedPeriod(event.target.value as DashboardPeriod)}
              disabled={!hasPeriods || isLoading}
              className="min-h-11 w-full cursor-pointer appearance-none rounded-lg border border-border bg-white py-2 pl-3 pr-9 text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 sm:w-44"
            >
              {periodOptions.map(({ value, label }) => <option key={value} value={value} disabled={periods[value] === undefined}>{label}</option>)}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute top-3.5 right-3 size-4 text-slate-500" aria-hidden="true" />
          </div>
          {!hasPeriods && !isLoading && <p id={`period-help-${id}`} className="text-xs text-slate-600">Aguardando dados por período</p>}
        </div>
      </CardHeader>
      <CardContent className="px-3 pt-2 sm:px-6">
        {isLoading ? (
          <div className="flex h-64 flex-col justify-between gap-5 p-3" role="status" aria-label="Carregando gráfico de vistorias">
            <Skeleton className="h-full w-full" />
            <div className="flex justify-between">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-3 w-7" />)}</div>
          </div>
        ) : chartData.length > 0 ? (
          <>
            <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full" aria-label="Gráfico de vistorias realizadas por mês">
              <AreaChart accessibilityLayer data={chartData} margin={{ top: 16, left: 0, right: 16, bottom: 8 }}>
                <defs>
                  <linearGradient id={`fill-inspections-${id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-inspections)" stopOpacity={0.16} />
                    <stop offset="95%" stopColor="var(--color-inspections)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.65} strokeDasharray="3 4" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={12} minTickGap={24} tick={{ fill: "var(--foreground)", fontSize: 12 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} width={38} tick={{ fill: "var(--foreground)", fontSize: 12 }} />
                <ChartTooltip cursor={{ stroke: "var(--border)", strokeDasharray: "3 4" }} content={<ChartTooltipContent indicator="dot" className="bg-white shadow-sm" />} />
                <Area dataKey="inspections" type="monotone" fill={`url(#fill-inspections-${id})`} stroke="var(--color-inspections)" strokeWidth={2.5} dot={false} isAnimationActive={false} activeDot={{ r: 5, fill: "var(--primary)", stroke: "white", strokeWidth: 3 }} />
              </AreaChart>
            </ChartContainer>
            <table className="sr-only">
              <caption>Vistorias realizadas — {periodOptions.find(({ value }) => value === selectedPeriod)?.label}</caption>
              <thead><tr><th scope="col">Mês</th><th scope="col">Vistorias</th></tr></thead>
              <tbody>{chartData.map((point, index) => <tr key={`${point.month}-${index}`}><th scope="row">{point.month}</th><td>{point.inspections}</td></tr>)}</tbody>
            </table>
          </>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-5 text-center">
            <span className="flex size-12 items-center justify-center rounded-lg bg-slate-50 text-primary"><ChartNoAxesCombinedIcon className="size-6" aria-hidden="true" /></span>
            <p className="max-w-sm text-sm leading-6 text-slate-600">As vistorias aparecerão aqui quando os dados estiverem disponíveis.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
