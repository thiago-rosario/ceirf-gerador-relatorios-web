import { useId } from 'react'
import { CalendarDaysIcon, ChevronDownIcon } from 'lucide-react'
import type { DashboardIndicatorPeriod } from '@/types/dashboard'

const options = [
  { value: '7-days', label: 'Últimos 7 dias' },
  { value: '30-days', label: 'Últimos 30 dias' },
  { value: '6-months', label: 'Últimos 6 meses' },
  { value: 'all-time', label: 'Sempre' },
] as const

export function DashboardPeriodFilter({ value, onChange }: {
  value: DashboardIndicatorPeriod
  onChange: (period: DashboardIndicatorPeriod) => void
}) {
  const id = useId()
  return (
    <div className="w-full space-y-2 sm:w-52">
      <label htmlFor={`indicators-period-${id}`} className="block text-xs font-medium text-slate-600">Período dos indicadores</label>
      <div className="relative">
        <CalendarDaysIcon aria-hidden="true" className="pointer-events-none absolute top-3.5 left-3 size-4 text-primary" />
        <select id={`indicators-period-${id}`} value={value} aria-describedby="dashboard-period-help"
          onChange={(event) => onChange(event.target.value as DashboardIndicatorPeriod)}
          className="min-h-11 w-full cursor-pointer appearance-none rounded-lg border border-border bg-card py-2 pr-9 pl-10 text-sm font-medium text-slate-800 transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <ChevronDownIcon aria-hidden="true" className="pointer-events-none absolute top-3.5 right-3 size-4 text-slate-500" />
      </div>
    </div>
  )
}
