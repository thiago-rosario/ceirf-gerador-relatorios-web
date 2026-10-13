import { Combobox } from '@base-ui/react/combobox'
import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react'
import type { Municipality } from '@/types/reports'

type MunicipalityPickerProps = {
  municipalities: Municipality[]
  value: number | null
  onChange: (id: number | null) => void
  disabled?: boolean
}

export function MunicipalityPicker({ municipalities, value, onChange, disabled }: MunicipalityPickerProps) {
  const selected = municipalities.find((municipality) => municipality.id === value) ?? null
  return (
    <Combobox.Root items={municipalities} value={selected} autoHighlight onValueChange={(municipality) => onChange(municipality?.id ?? null)}
      itemToStringLabel={(municipality) => municipality.name} itemToStringValue={(municipality) => String(municipality.id)}
      isItemEqualToValue={(item, selectedValue) => item.id === selectedValue.id} disabled={disabled}>
      <div className="relative flex h-12 w-full items-center rounded-xl border border-[#d8d8d8] bg-white focus-within:border-[#073574] focus-within:ring-2 focus-within:ring-[#073574]/15">
        <Combobox.Input id="report-municipality" aria-label="Município" placeholder="Selecione ou pesquise o município"
          className="h-full w-full min-w-0 rounded-xl px-4 pr-20 text-base outline-none disabled:opacity-60" />
        <div className="absolute right-1 flex items-center">
          {selected && <Combobox.Clear aria-label="Remover município" className="flex size-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><XIcon className="size-4" /></Combobox.Clear>}
          <Combobox.Trigger aria-label="Exibir municípios" className="flex size-10 items-center justify-center rounded-lg text-[#073574] hover:bg-slate-100"><ChevronsUpDownIcon aria-hidden="true" className="size-5" /></Combobox.Trigger>
        </div>
      </div>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={6} className="z-50 w-[var(--anchor-width)]">
          <Combobox.Popup className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
            <Combobox.Empty className="p-3 text-sm text-slate-600">Nenhum município encontrado.</Combobox.Empty>
            <Combobox.List>{(municipality: Municipality) => <Combobox.Item key={municipality.id} value={municipality}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none data-highlighted:bg-[#edf2ff] data-highlighted:text-[#073574]">
              {municipality.name}<Combobox.ItemIndicator><CheckIcon aria-hidden="true" className="size-4" /></Combobox.ItemIndicator>
            </Combobox.Item>}</Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
