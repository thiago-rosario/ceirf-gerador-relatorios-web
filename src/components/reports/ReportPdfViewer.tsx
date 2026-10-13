import { LoaderCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ReportPdfViewerProps = {
  available: boolean
  url?: string
  error: Error | null
  title: string
  onRetry: () => void
}

export function ReportPdfViewer({ available, url, error, title, onRetry }: ReportPdfViewerProps) {
  if (!available) return <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900"><p>O PDF deste relatório ainda não está disponível.</p><Button variant="outline" className="mt-4 h-11 bg-white" onClick={onRetry}>Verificar disponibilidade</Button></div>
  if (error) return <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900"><p>Não foi possível abrir o PDF. {error.message}</p><Button variant="outline" className="mt-4 h-11 bg-white" onClick={onRetry}>Tentar novamente</Button></div>
  if (!url) return <p role="status" className="flex min-h-[45vh] items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-5 text-center text-slate-600"><LoaderCircleIcon aria-hidden="true" className="size-6 animate-spin motion-reduce:animate-none" />Carregando PDF. Documentos maiores podem levar alguns instantes…</p>
  return <div className="overflow-hidden rounded-xl border border-slate-300 bg-[#3f3f3f] shadow-md">
    <iframe title={title} src={`${url}#toolbar=1&navpanes=1`} className="block h-[70dvh] min-h-[440px] w-full border-0 sm:h-[76dvh]" />
  </div>
}
