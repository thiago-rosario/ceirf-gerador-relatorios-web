import { useEffect, useRef, useState } from 'react'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { truncateText } from '@/service/report-form-model'
import { FormField, reportControlClass } from './FormField'

type FieldName<T> = Exclude<keyof T, 'id'> & string
type DynamicField<T> = { name: FieldName<T>; label: string; placeholder: string; limit: number }
type DynamicFieldsProps<T extends { id: string }> = {
  prefix: string
  title: string
  description: string
  rowLabel: string
  rows: T[]
  fields: DynamicField<T>[]
  addLabel: string
  compactAdd?: boolean
  required?: boolean
  requiredForRow?: (row: T) => boolean
  error?: string
  summary?: string
  summaryLabel?: string
  canRemove?: (row: T) => boolean
  fieldError?: (id: string, field: FieldName<T>) => string | undefined
  validate?: (row: T, field: FieldName<T>) => string | undefined
  onAdd: () => void
  onEdit: (id: string, field: FieldName<T>, value: string) => void
  onRemove: (id: string) => void
}

export function DynamicFields<T extends { id: string }>({ prefix, title, description, rowLabel, rows, fields, addLabel, compactAdd, required, requiredForRow, error, summary, summaryLabel, canRemove, fieldError, validate, onAdd, onEdit, onRemove }: DynamicFieldsProps<T>) {
  const [touched, setTouched] = useState<Set<string>>(() => new Set())
  const previousIds = useRef(new Set(rows.map((row) => row.id)))
  const inputId = (id: string, field: FieldName<T>) => `${prefix}-${id}-${field}`
  useEffect(() => {
    const added = rows.find((row) => !previousIds.current.has(row.id))
    previousIds.current = new Set(rows.map((row) => row.id))
    if (added && fields[0]) document.getElementById(`${prefix}-${added.id}-${fields[0].name}`)?.focus()
  }, [rows, fields, prefix])

  const addButton = <Button type="button" variant="outline" className={`h-11 text-[#073574] ${compactAdd ? 'w-11 px-0' : 'max-w-full px-4'}`} aria-label={addLabel} onClick={onAdd}>
    <PlusIcon aria-hidden="true" className="size-5" />{!compactAdd && addLabel}
  </Button>

  return <section aria-labelledby={`${prefix}-heading`} aria-describedby={`${prefix}-description`} className="min-w-0 space-y-4">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0"><h3 id={`${prefix}-heading`} className="text-lg font-bold text-[#073574]">{title}{required && <span className="ml-1 text-red-600" aria-label="obrigatório">*</span>}</h3><p id={`${prefix}-description`} className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p></div>
      {compactAdd && addButton}
    </div>
    <div className="space-y-4">
      {rows.map((row, index) => <div key={row.id} role="group" aria-label={`${rowLabel} ${index + 1}`} className={`flex items-start gap-3 ${index ? 'border-t border-slate-100 pt-4' : ''}`}>
        <div className={`grid min-w-0 flex-1 gap-4 ${fields.length > 1 ? 'md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]' : ''}`}>
          {fields.map((field) => {
            const id = inputId(row.id, field.name)
            const value = String(row[field.name] ?? '')
            const message = fieldError?.(row.id, field.name) || (touched.has(row.id) ? validate?.(row, field.name) : undefined)
            const describedBy = [message ? `${id}-error` : undefined, `${prefix}-description`, error ? `${prefix}-error` : undefined].filter(Boolean).join(' ')
            const fieldRequired = Boolean(requiredForRow?.(row))
            return <FormField key={field.name} label={field.label} htmlFor={id} required={fieldRequired} error={message}>
              <input id={id} type="text" className={`${reportControlClass} ${message ? 'border-red-500' : ''}`} placeholder={field.placeholder} value={value} aria-required={fieldRequired} aria-invalid={Boolean(message || error)} aria-describedby={describedBy} onChange={(event) => onEdit(row.id, field.name, truncateText(event.target.value, field.limit))} onBlur={() => setTouched((current) => new Set(current).add(row.id))} />
            </FormField>
          })}
        </div>
        <Button type="button" variant="outline" className="mt-10 h-11 w-11 px-0 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700" disabled={canRemove ? !canRemove(row) : rows.length <= 1} aria-label={`Remover ${rowLabel.toLowerCase()} ${index + 1}`} title={(canRemove ? !canRemove(row) : rows.length <= 1) ? 'Mantenha pelo menos um campo disponível.' : `Remover ${rowLabel.toLowerCase()}`} onClick={() => {
          const next = rows[index + 1] ?? rows[index - 1]
          onRemove(row.id)
          if (next && fields[0]) document.getElementById(inputId(next.id, fields[0].name))?.focus()
        }}><Trash2Icon aria-hidden="true" className="size-5" /></Button>
      </div>)}
    </div>
    {(error || summary) && <div className="flex items-start justify-between gap-3 text-sm">
      <div>{error && <p id={`${prefix}-error`} className="text-red-700">{error}</p>}</div>
      {summary && <span className="shrink-0 text-slate-500" aria-label={summaryLabel}>{summary}</span>}
    </div>}
    {!compactAdd && addButton}
  </section>
}
