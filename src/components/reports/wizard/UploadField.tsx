import { useEffect, useId, useRef, useState } from 'react'
import { CheckCircle2Icon, CircleAlertIcon, FileImageIcon, FileTextIcon, ImagePlusIcon, LoaderCircleIcon, RefreshCwIcon, Trash2Icon } from 'lucide-react'
import Button from '@/components/Button'
import Input from '@/components/Input'
import type { ReportAsset } from '@/types/report-draft'
import { isAssetConfirmed, textLength, truncateText } from '@/service/report-form-model'

type UploadFieldProps = {
  title: string
  asset?: ReportAsset
  number?: number
  required?: boolean
  caption?: string
  editableCaption?: boolean
  description?: boolean
  busy?: boolean
  disabled?: boolean
  onSelect: (file: File) => Promise<string | null> | string | null
  onRemove?: () => void
  onRetry?: () => void
  onCaptionChange?: (caption: string) => void
  onDescriptionChange?: (description: string) => void
}

function fileSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MiB` : `${Math.ceil(bytes / 1024)} KiB`
}

export function UploadField({ title, asset, number, required, caption, editableCaption, description, busy, disabled, onSelect, onRemove, onRetry, onCaptionChange, onDescriptionChange }: UploadFieldProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLImageElement>(null)
  const pdfLinkRef = useRef<HTMLAnchorElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const serverAsset = Boolean(asset?.reference && !asset.file)
  const uploadStatus = asset?.uploadStatus
  const uploading = uploadStatus === 'hashing' || uploadStatus === 'uploading' || uploadStatus === 'processing'
  const confirmed = Boolean(asset && isAssetConfirmed(asset))
  const unavailable = Boolean(disabled || busy || checking || uploading)
  const statusText = uploadStatus === 'hashing' ? 'Calculando checksum SHA-256…'
    : uploadStatus === 'uploading' ? 'Enviando arquivo…'
      : uploadStatus === 'processing' ? 'Processando arquivo e confirmando vínculo ao relatório…'
        : uploadStatus === 'error' ? 'Envio não confirmado'
          : confirmed ? 'Arquivo enviado e vinculado ao relatório'
            : 'Aguardando envio ao servidor'
  const isImage = Boolean(asset?.mimeType.startsWith('image/'))
  const file = asset?.file

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    // The DOM owns the local preview URL; it is revoked when this file changes or unmounts.
    if (previewRef.current) previewRef.current.src = url
    if (pdfLinkRef.current) pdfLinkRef.current.href = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <section aria-labelledby={`${id}-heading`} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <h3 id={`${id}-heading`} className="text-lg font-semibold leading-snug text-[#073574]">
          {title}{required && <span className="ml-1 text-red-600" aria-label="obrigatório para finalizar">*</span>}
        </h3>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${required ? 'bg-blue-50 text-blue-900' : 'bg-slate-100 text-slate-500'}`}>
          {required ? 'Obrigatório na finalização' : 'Opcional'}
        </span>
      </div>

      <input
        id={`${id}-file`}
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
        className="sr-only"
        tabIndex={-1}
        disabled={unavailable}
        aria-label={asset ? `Substituir ${title}` : `Selecionar arquivo para ${title}`}
        onChange={async (event) => {
          const selected = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (!selected) return
          setError(null)
          setChecking(true)
          try {
            setError(await onSelect(selected))
          } catch {
            setError('Não foi possível enviar o arquivo. Tente novamente.')
          } finally {
            setChecking(false)
          }
        }}
      />

      {asset ? (
        <>
          <div className="flex h-48 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {file && isImage ? (
              <img ref={previewRef} alt={asset.caption || title} className="h-full w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 px-4 text-center text-slate-500">
                {isImage ? <FileImageIcon size={40} strokeWidth={1.5} aria-hidden="true" /> : <FileTextIcon size={40} strokeWidth={1.5} aria-hidden="true" />}
                <span className="text-sm">{serverAsset ? 'Pré-visualização indisponível' : 'Documento PDF'}</span>
                {file && <a ref={pdfLinkRef} target="_blank" rel="noopener noreferrer" className="rounded px-2 py-1 text-sm font-semibold text-[#073574] underline focus-visible:outline-2">Abrir PDF selecionado</a>}
              </div>
            )}
          </div>
          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-all text-sm font-medium text-slate-700">{asset.name}</p>
              <p className="mt-1 text-xs text-slate-500">{fileSize(asset.size)} · {confirmed ? 'Arquivo registrado no servidor' : 'Envio ainda não confirmado'}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button type="button" disabled={unavailable} aria-label={`Substituir ${asset.name}`} title="Substituir arquivo" onClick={() => inputRef.current?.click()} className="flex size-10 items-center justify-center rounded-lg text-[#073574] hover:bg-blue-50 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-40">
                <RefreshCwIcon size={18} aria-hidden="true" />
              </button>
              <button type="button" disabled={unavailable || !onRemove} aria-label={`Remover ${asset.name} do relatório`} title="Remover do relatório" onClick={() => { onRemove?.(); setError(null) }} className="flex size-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-40">
                <Trash2Icon size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div role={uploadStatus === 'error' ? 'alert' : 'status'} aria-live="polite" className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${uploadStatus === 'error' ? 'bg-red-50 text-red-700' : confirmed ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-900'}`}>
            {uploading ? <LoaderCircleIcon size={18} className="mt-0.5 shrink-0 animate-spin" aria-hidden="true" /> : confirmed ? <CheckCircle2Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> : <CircleAlertIcon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />}
            <div className="min-w-0 flex-1"><p>{statusText}</p>{uploadStatus === 'error' && <p className="mt-1">{asset.uploadError || 'Não foi possível confirmar o envio e o vínculo deste arquivo. Tente novamente.'}</p>}</div>
          </div>
          {uploadStatus === 'error' && onRetry && <button type="button" disabled={unavailable} onClick={() => { setError(null); onRetry() }} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-40"><RefreshCwIcon size={16} aria-hidden="true" />Tentar envio novamente</button>}
          {number !== undefined && <p className="mt-4 text-sm font-semibold text-[#073574]">Figura {number}{caption ? ` — ${caption}` : ''}</p>}
          {editableCaption && <div className="mt-4">
            <label htmlFor={`${id}-caption`} className="mb-2 block text-sm font-semibold text-[#073574]">Legenda <span className="text-red-600">*</span></label>
            <Input id={`${id}-caption`} value={asset.caption} maxLength={500} placeholder="Informe a legenda da fotografia" onChange={(event) => onCaptionChange?.(truncateText(event.target.value, 500))} aria-required="true" aria-invalid={!asset.caption.trim()} aria-describedby={`${id}-caption-count${!asset.caption.trim() ? ` ${id}-caption-error` : ''}`} />
            <p id={`${id}-caption-count`} className="mt-1 text-right text-xs text-slate-500">{textLength(asset.caption)}/500 · máximo disponível: 500 caracteres</p>
            {!asset.caption.trim() && <p id={`${id}-caption-error`} className="mt-1 text-sm text-amber-700">Informe a legenda para adicionar outra fotografia e finalizar o relatório.</p>}
          </div>}
          {description && <div className="mt-4">
            <label htmlFor={`${id}-description`} className="mb-2 block text-sm font-semibold text-[#073574]">Descrição <span className="text-red-600">*</span></label>
            <textarea id={`${id}-description`} rows={3} value={asset.description} maxLength={500} placeholder="Descreva o documento anexado" onChange={(event) => onDescriptionChange?.(truncateText(event.target.value, 500))} className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20" aria-required="true" aria-invalid={!asset.description.trim()} aria-describedby={`${id}-description-count${!asset.description.trim() ? ` ${id}-description-error` : ''}`} />
            <p id={`${id}-description-count`} className="mt-1 text-right text-xs text-slate-500">{textLength(asset.description)}/500 · máximo disponível: 500 caracteres</p>
            {!asset.description.trim() && <p id={`${id}-description-error`} className="mt-1 text-sm text-amber-700">Informe a descrição para finalizar o relatório.</p>}
          </div>}
          {serverAsset && <p className="mt-3 text-xs leading-relaxed text-slate-500">Arquivo recuperado do servidor. Você pode substituí-lo ou remover sua referência do relatório.</p>}
        </>
      ) : (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 px-4 py-6 text-center">
          {checking ? <LoaderCircleIcon size={34} aria-hidden="true" className="animate-spin text-blue-800" /> : <ImagePlusIcon size={34} strokeWidth={1.5} aria-hidden="true" className="text-blue-800" />}
          <p className="mb-4 mt-3 text-sm text-slate-500">PNG, JPG, JPEG ou PDF · até 25 MiB por arquivo</p>
          <Button type="button" className="max-w-56 !h-11 !rounded-lg !text-sm" disabled={unavailable} onClick={() => inputRef.current?.click()}>
            {checking ? 'Preparando envio…' : 'Selecionar arquivo'}
          </Button>
        </div>
      )}
      {!asset && caption && <p className="mt-3 text-sm text-slate-500">Legenda automática: {caption}</p>}
      {required && !asset && <p className="mt-3 text-sm text-amber-700">Este arquivo será exigido para finalizar. Você pode continuar preenchendo as outras etapas.</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </section>
  )
}
