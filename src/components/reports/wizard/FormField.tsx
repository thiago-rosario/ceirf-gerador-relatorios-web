import type { ReactNode } from 'react'
import { textLength } from '@/service/report-form-model'

export const reportControlClass = 'w-full rounded-xl border border-[#d8d8d8] bg-white px-4 py-3.5 text-base text-slate-700 shadow-[0_2px_18px_#07357405] outline-none placeholder:text-slate-400 focus:border-[#073574] focus:ring-2 focus:ring-[#073574]/15 disabled:bg-slate-50 disabled:opacity-60'

export function FormField({ label, htmlFor, required, value, limit, error, hint, children }: {
  label: string; htmlFor: string; required?: boolean; value?: string; limit?: number; error?: string; hint?: string; children: ReactNode
}) {
  return <div className="min-w-0">
    <label htmlFor={htmlFor} className="mb-2 block text-lg font-bold text-[#073574]">{label}{required && <span className="ml-1 text-red-600" aria-label="obrigatório">*</span>}</label>
    {children}
    <div className="mt-1 flex items-start justify-between gap-3 text-sm">
      <div>{error ? <p id={`${htmlFor}-error`} className="text-red-700">{error}</p> : hint ? <p id={`${htmlFor}-hint`} className="text-slate-500">{hint}</p> : null}</div>
      {limit != null && <span className="shrink-0 text-slate-500" aria-label={`${textLength(value ?? '')} de ${limit} caracteres`}>{textLength(value ?? '')}/{limit}</span>}
    </div>
  </div>
}
