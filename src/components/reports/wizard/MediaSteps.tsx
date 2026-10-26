import type { Dispatch, SetStateAction } from 'react'
import { InfoIcon } from 'lucide-react'
import type { AssetKind, ReportAsset, ReportDraft } from '@/types/report-draft'
import { ASSET_CAPTIONS, MAX_FIGURES, PRE_IMPLEMENTATION_NOTE, figureNumber } from '@/service/report-form-model'
import { UploadField } from './UploadField'

type MediaStepProps = {
  draft: ReportDraft
  onChange: Dispatch<SetStateAction<ReportDraft>>
  onSelectMedia: (kind: AssetKind, file: File, existing?: ReportAsset) => Promise<string | null>
  onRemoveMedia: (asset: ReportAsset) => void
  onRetryMedia: (asset: ReportAsset) => void
}

function updateAsset({ onChange }: MediaStepProps, asset: ReportAsset, values: Partial<Pick<ReportAsset, 'caption' | 'description'>>) {
  onChange((current) => ({ ...current, assets: current.assets.map((item) => item.id === asset.id || (asset.clientId && item.clientId === asset.clientId) ? { ...item, ...values } : item) }))
}

function SelectionNotice() {
  return <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-relaxed text-[#073574]">
    <InfoIcon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
    <p>Os arquivos selecionados são enviados ao servidor e vinculados ao relatório. Aguarde a confirmação de cada envio; você pode continuar preenchendo as outras etapas durante o processamento.</p>
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
  const { draft, onSelectMedia: select, onRemoveMedia: remove, onRetryMedia: retry } = props
  return <>
    <SelectionNotice />
    <FigureCapacity draft={draft} />
    <div className="grid gap-5 xl:grid-cols-2">
      {(['location_map', 'state_map'] as const).map((kind) => {
        const asset = draft.assets.find((item) => item.kind === kind)
        return <UploadField key={kind} title={ASSET_CAPTIONS[kind]} required={kind === 'state_map'} caption={ASSET_CAPTIONS[kind]} asset={asset} number={asset ? figureNumber(draft.assets, asset.id) : undefined} disabled={!asset && draft.assets.length >= MAX_FIGURES} onSelect={(file) => select(kind, file, asset)} onRemove={asset ? () => remove(asset) : undefined} onRetry={asset ? () => retry(asset) : undefined} />
      })}
    </div>
  </>
}

export function PreImplementationStep(props: MediaStepProps) {
  const { draft, onSelectMedia: select, onRemoveMedia: remove, onRetryMedia: retry } = props
  const asset = draft.assets.find((item) => item.kind === 'pre_implementation')
  return <>
    <SelectionNotice />
    <FigureCapacity draft={draft} />
    <UploadField title="Sugestão de pré-implantação" caption={ASSET_CAPTIONS.pre_implementation} asset={asset} number={asset ? figureNumber(draft.assets, asset.id) : undefined} disabled={!asset && draft.assets.length >= MAX_FIGURES} onSelect={(file) => select('pre_implementation', file, asset)} onRemove={asset ? () => remove(asset) : undefined} onRetry={asset ? () => retry(asset) : undefined} />
    <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">{PRE_IMPLEMENTATION_NOTE}</p>
  </>
}

export function PhotographsStep(props: MediaStepProps) {
  const { draft, onSelectMedia: select, onRemoveMedia: remove, onRetryMedia: retry } = props
  const photos = draft.assets.filter((asset) => asset.kind === 'photograph').sort((a, b) => a.order - b.order)
  const pendingCaption = photos.some((asset) => !asset.caption.trim())
  return <>
    <SelectionNotice />
    <FigureCapacity draft={draft} />
    <p className="mb-5 text-sm text-slate-500">As fotografias mantêm a ordem em que foram adicionadas. Uma substituição mantém a posição da fotografia original.</p>
    {pendingCaption && <p role="status" className="mb-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Preencha a legenda da fotografia adicionada para liberar a seleção de outra imagem. Você pode continuar navegando pelas etapas.</p>}
    <div className="grid gap-5 xl:grid-cols-2">
      {photos.map((asset) => <UploadField key={asset.clientId ?? asset.id} title={`Fotografia ${photos.indexOf(asset) + 1}`} asset={asset} number={figureNumber(draft.assets, asset.id)} editableCaption onSelect={(file) => select('photograph', file, asset)} onRemove={() => remove(asset)} onRetry={() => retry(asset)} onCaptionChange={(caption) => updateAsset(props, asset, { caption })} />)}
      <UploadField title="Adicionar fotografia" disabled={draft.assets.length >= MAX_FIGURES || pendingCaption} onSelect={(file) => select('photograph', file)} />
    </div>
  </>
}

export function AttachmentDocuments(props: MediaStepProps) {
  const { draft, onSelectMedia: select, onRemoveMedia: remove, onRetryMedia: retry } = props
  const others = draft.assets.filter((asset) => asset.kind === 'other').sort((a, b) => a.order - b.order)
  return <section aria-labelledby="attachment-documents-heading" className="mt-8 border-t border-slate-200 pt-7">
    <h3 id="attachment-documents-heading" className="mb-4 text-xl font-semibold text-[#073574]">Documentos adicionais</h3>
    <SelectionNotice />
    <FigureCapacity draft={draft} />
    <div className="grid gap-5 xl:grid-cols-2">
      {(['municipality_map', 'topographic_plan'] as const).map((kind) => {
        const asset = draft.assets.find((item) => item.kind === kind)
        return <UploadField key={kind} title={ASSET_CAPTIONS[kind]} caption={ASSET_CAPTIONS[kind]} asset={asset} number={asset ? figureNumber(draft.assets, asset.id) : undefined} disabled={!asset && draft.assets.length >= MAX_FIGURES} onSelect={(file) => select(kind, file, asset)} onRemove={asset ? () => remove(asset) : undefined} onRetry={asset ? () => retry(asset) : undefined} />
      })}
      {others.map((asset, index) => <UploadField key={asset.clientId ?? asset.id} title={`Outro documento ${index + 1}`} asset={asset} number={figureNumber(draft.assets, asset.id)} description onSelect={(file) => select('other', file, asset)} onRemove={() => remove(asset)} onRetry={() => retry(asset)} onDescriptionChange={(description) => updateAsset(props, asset, { description })} />)}
      <UploadField title="Adicionar outro documento" disabled={draft.assets.length >= MAX_FIGURES} onSelect={(file) => select('other', file)} />
    </div>
  </section>
}
