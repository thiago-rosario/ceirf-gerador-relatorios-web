import { useEffect, useRef, useState } from 'react'
import { InfoIcon } from 'lucide-react'
import type { AssetKind, ReportAsset, ReportDraft } from '@/types/report-draft'
import { ASSET_CAPTIONS, MAX_FIGURES, PRE_IMPLEMENTATION_NOTE, figureNumber, fileMimeType, validateSelectedFile } from '@/service/report-form-model'
import { UploadField } from './UploadField'

type MediaStepProps = { draft: ReportDraft; onChange: (draft: ReportDraft) => void }
const fixedCaptions: Partial<Record<AssetKind, string>> = ASSET_CAPTIONS

function useAssets({ draft, onChange }: MediaStepProps) {
  const currentDraft = useRef(draft)
  useEffect(() => { currentDraft.current = draft }, [draft])
  const processing = useRef(false)
  const [busy, setBusy] = useState(false)
  const change = (next: ReportDraft) => {
    currentDraft.current = next
    onChange(next)
  }

  const select = async (kind: AssetKind, file: File, existing?: ReportAsset): Promise<string | null> => {
    if (processing.current) return 'Aguarde a verificação do arquivo anterior.'
    if (existing?.reference && !existing.file) return 'A substituição deste arquivo depende da API de gerenciamento de arquivos.'
    const validation = validateSelectedFile(file)
    if (validation) return validation
    if (!existing && currentDraft.current.assets.length >= MAX_FIGURES) return 'Você alcançou o limite de imagens permitida'
    if (kind === 'photograph' && !existing && currentDraft.current.assets.some((asset) => asset.kind === kind && !asset.caption.trim())) return 'Informe a legenda da fotografia adicionada antes de selecionar outra.'
    processing.current = true
    setBusy(true)
    try {
      const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
      const checksum = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
      const latest = currentDraft.current
      if (latest.assets.some((asset) => asset.checksum === checksum && asset.id !== existing?.id)) return 'Este arquivo já está no relatório. Não é permitido adicionar arquivos duplicados.'
      // Recheck after hashing, since other form sections may have changed meanwhile.
      if (!existing && latest.assets.length >= MAX_FIGURES) return 'Você alcançou o limite de imagens permitida'
      if (existing && !latest.assets.some((asset) => asset.id === existing.id)) return 'O arquivo foi removido durante a seleção. Selecione-o novamente.'
      const previousOrder = latest.photoHistory[checksum]
      if (kind === 'photograph' && previousOrder !== undefined && existing?.order !== previousOrder && latest.assets.some((asset) => asset.kind === kind && asset.order === previousOrder && asset.id !== existing?.id)) {
        return 'Esta fotografia já ocupou uma posição agora utilizada por outra imagem. Remova a imagem dessa posição antes de reinseri-la, para preservar a ordem original.'
      }
      if (kind === 'photograph' && existing && previousOrder !== undefined && previousOrder !== existing.order) {
        return 'Esta fotografia já foi adicionada em outra posição. Para preservar a ordem original, remova o arquivo atual e adicione a fotografia pelo campo de inclusão.'
      }
      const order = existing?.order ?? (kind === 'photograph' ? previousOrder ?? latest.nextPhotoOrder : Math.max(0, ...latest.assets.filter((asset) => asset.kind === kind).map((asset) => asset.order)) + 1)
      const asset: ReportAsset = {
        id: existing?.id ?? crypto.randomUUID(), kind, file, name: file.name, mimeType: fileMimeType(file), size: file.size, checksum, order,
        caption: existing?.caption ?? fixedCaptions[kind] ?? '', description: existing?.description ?? '',
      }
      change({
        ...latest,
        assets: existing ? latest.assets.map((item) => item.id === existing.id ? asset : item) : [...latest.assets, asset],
        photoHistory: kind === 'photograph' ? { ...latest.photoHistory, [checksum]: order } : latest.photoHistory,
        nextPhotoOrder: kind === 'photograph' ? Math.max(latest.nextPhotoOrder, order + 1) : latest.nextPhotoOrder,
      })
      return null
    } catch {
      return 'Não foi possível verificar o arquivo com segurança. Tente selecioná-lo novamente.'
    } finally {
      processing.current = false
      setBusy(false)
    }
  }

  const remove = (asset: ReportAsset) => {
    const latest = currentDraft.current
    change({ ...latest, assets: latest.assets.filter((item) => item.id !== asset.id) })
  }
  const update = (asset: ReportAsset, values: Partial<Pick<ReportAsset, 'caption' | 'description'>>) => {
    const latest = currentDraft.current
    change({ ...latest, assets: latest.assets.map((item) => item.id === asset.id ? { ...item, ...values } : item) })
  }
  return { select, remove, update, busy }
}

function SelectionNotice() {
  return <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-relaxed text-[#073574]">
    <InfoIcon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
    <p>Os arquivos ficam selecionados apenas neste navegador durante o preenchimento. A API de envio de arquivos ainda não está disponível; o salvamento dos campos de texto não envia estes arquivos ao servidor.</p>
  </div>
}

function FigureCapacity({ draft }: { draft: ReportDraft }) {
  const remaining = Math.max(0, MAX_FIGURES - draft.assets.length)
  return <div className="mb-5">
    <p role="status" className="text-sm text-slate-600"><strong className="font-semibold text-[#073574]">{draft.assets.length}/{MAX_FIGURES} figuras</strong> no relatório · {remaining} {remaining === 1 ? 'disponível' : 'disponíveis'}. O limite inclui mapas, fotografias e anexos.</p>
    {remaining === 0 && <p role="alert" className="mt-2 text-sm text-red-700">Você alcançou o limite de imagens permitida</p>}
  </div>
}

export function LocationStep(props: MediaStepProps) {
  const { draft } = props
  const { select, remove, busy } = useAssets(props)
  return <>
    <SelectionNotice />
    <FigureCapacity draft={draft} />
    <div className="grid gap-5 xl:grid-cols-2">
      {(['location_map', 'state_map'] as const).map((kind) => {
        const asset = draft.assets.find((item) => item.kind === kind)
        return <UploadField key={kind} title={ASSET_CAPTIONS[kind]} required={kind === 'state_map'} caption={ASSET_CAPTIONS[kind]} asset={asset} number={asset ? figureNumber(draft.assets, asset.id) : undefined} busy={busy} disabled={!asset && draft.assets.length >= MAX_FIGURES} onSelect={(file) => select(kind, file, asset)} onRemove={asset ? () => remove(asset) : undefined} />
      })}
    </div>
  </>
}

export function PreImplementationStep(props: MediaStepProps) {
  const { draft } = props
  const { select, remove, busy } = useAssets(props)
  const asset = draft.assets.find((item) => item.kind === 'pre_implementation')
  return <>
    <SelectionNotice />
    <FigureCapacity draft={draft} />
    <UploadField title="Sugestão de pré-implantação" caption={ASSET_CAPTIONS.pre_implementation} asset={asset} number={asset ? figureNumber(draft.assets, asset.id) : undefined} busy={busy} disabled={!asset && draft.assets.length >= MAX_FIGURES} onSelect={(file) => select('pre_implementation', file, asset)} onRemove={asset ? () => remove(asset) : undefined} />
    <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">{PRE_IMPLEMENTATION_NOTE}</p>
  </>
}

export function PhotographsStep(props: MediaStepProps) {
  const { draft } = props
  const { select, remove, update, busy } = useAssets(props)
  const photos = draft.assets.filter((asset) => asset.kind === 'photograph').sort((a, b) => a.order - b.order)
  const pendingCaption = photos.some((asset) => !asset.caption.trim())
  return <>
    <SelectionNotice />
    <FigureCapacity draft={draft} />
    <p className="mb-5 text-sm text-slate-500">As fotografias mantêm a ordem em que foram adicionadas. Uma substituição mantém a posição da fotografia original.</p>
    {pendingCaption && <p role="status" className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Preencha a legenda da fotografia adicionada para liberar a seleção de outra imagem. Você pode continuar navegando pelas etapas.</p>}
    <div className="grid gap-5 xl:grid-cols-2">
      {photos.map((asset) => <UploadField key={asset.id} title={`Fotografia ${photos.indexOf(asset) + 1}`} asset={asset} number={figureNumber(draft.assets, asset.id)} editableCaption busy={busy} onSelect={(file) => select('photograph', file, asset)} onRemove={() => remove(asset)} onCaptionChange={(caption) => update(asset, { caption })} />)}
      <UploadField title="Adicionar fotografia" busy={busy} disabled={draft.assets.length >= MAX_FIGURES || pendingCaption} onSelect={(file) => select('photograph', file)} />
    </div>
  </>
}

export function AttachmentDocuments(props: MediaStepProps) {
  const { draft } = props
  const { select, remove, update, busy } = useAssets(props)
  const others = draft.assets.filter((asset) => asset.kind === 'other').sort((a, b) => a.order - b.order)
  return <section aria-labelledby="attachment-documents-heading" className="mt-8 border-t border-slate-200 pt-7">
    <h3 id="attachment-documents-heading" className="mb-4 text-xl font-semibold text-[#073574]">Documentos adicionais</h3>
    <SelectionNotice />
    <FigureCapacity draft={draft} />
    <div className="grid gap-5 xl:grid-cols-2">
      {(['municipality_map', 'topographic_plan'] as const).map((kind) => {
        const asset = draft.assets.find((item) => item.kind === kind)
        return <UploadField key={kind} title={ASSET_CAPTIONS[kind]} caption={ASSET_CAPTIONS[kind]} asset={asset} number={asset ? figureNumber(draft.assets, asset.id) : undefined} busy={busy} disabled={!asset && draft.assets.length >= MAX_FIGURES} onSelect={(file) => select(kind, file, asset)} onRemove={asset ? () => remove(asset) : undefined} />
      })}
      {others.map((asset, index) => <UploadField key={asset.id} title={`Outro documento ${index + 1}`} asset={asset} number={figureNumber(draft.assets, asset.id)} description busy={busy} onSelect={(file) => select('other', file, asset)} onRemove={() => remove(asset)} onDescriptionChange={(description) => update(asset, { description })} />)}
      <UploadField title="Adicionar outro documento" busy={busy} disabled={draft.assets.length >= MAX_FIGURES} onSelect={(file) => select('other', file)} />
    </div>
  </section>
}
