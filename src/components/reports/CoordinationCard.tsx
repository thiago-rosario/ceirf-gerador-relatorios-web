import type { SVGProps } from 'react'
import { FileTextIcon } from 'lucide-react'
import type { Coordination } from '@/types/users'

type ReportIconProps = SVGProps<SVGSVGElement>

function TerrainIcon(props: ReportIconProps) {
  return (
    <svg viewBox="0 0 128 128" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="12" y="30" width="86" height="88" rx="5" />
      <path d="M12 47c20 0 28-7 36-17m-36 32c24-3 41-9 51-23 5-7 12-9 23-9M12 85c11-1 14-17 28-19 18-2 23-7 29-17 6-10 13-12 29-11M12 105c14-2 18-27 36-30 25-4 21-22 37-23 7 0 10 3 13 7M20 118c9-8 12-20 25-24m5 24c-4-9-5-19 1-27 8-13 24-7 28 5 2 8 5 15 11 22M67 118c-14-21 8-28 15-12m16-31c-11 0-16-11-27-4-7 5-18 5-22 10m-7-39c-1 7-6 10-16 11m34-14c-4 12-9 15-21 18" />
      <path d="m22 16 5 5m0-5-5 5M44 13h.1M28 69h.1M60 63h.1M88 88h.1M27 100h.1" />
      <circle cx="98" cy="29" r="20" fill="white" />
      <path d="m106 21-4 14-12 4 4-13 12-5Zm-12 5 8 9" />
    </svg>
  )
}

function ProjectIcon(props: ReportIconProps) {
  return (
    <svg viewBox="0 0 128 128" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M13 100V31a19 19 0 0 1 28-17v68a19 19 0 0 0-28 18 18 18 0 0 0 18 18h79v-12M42 35h15m20 0h30v15" />
      <path d="M55 27v79h73L55 27Z" />
      <path d="M68 60v34h32L68 60ZM55 44h7m-7 10h7m-7 10h7m-7 10h7m-7 10h7m-7 10h7" />
      <path d="m75 69 26-44c2-4 6-5 10-3l4 2c4 2 5 6 3 10L92 78l-19 9 2-18ZM80 70l29-47m-22 51 29-46m-41 41 17 9m-17-9-2 18" fill="white" />
    </svg>
  )
}

function ConstructionIcon(props: ReportIconProps) {
  return (
    <svg viewBox="0 0 128 128" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="square" strokeLinejoin="round" {...props}>
      <path d="M6 120h116M28 120V29h13v91M8 40h107v12H8V40ZM8 40l25-19h10l72 19M33 21v19m10-19v19M8 52v9h9v-9M17 40l9 12 9-12 9 12 9-12 9 12 9-12 9 12 9-12 9 12 9-12" />
      <path d="m29 56 11 10-11 10 11 10-11 10 11 10-11 10M91 53v9m0 0L77 76h28L91 62Zm-14 14v8h28v-8M64 120V92h9v28m9 0V92h27v28m-27-14h27m-27-11h27m-27-11h27m-18 0v9m18-9v9m9-9v36" />
    </svg>
  )
}

function MaintenanceIcon(props: ReportIconProps) {
  return (
    <svg viewBox="0 0 128 128" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M50 6h28v16a45 45 0 0 1 12 5l11-11 20 20-11 11a45 45 0 0 1 5 12h16v28h-16a45 45 0 0 1-5 12l11 11-20 20-11-11a45 45 0 0 1-12 5v16H50v-16a45 45 0 0 1-12-5l-11 11-20-20 11-11a45 45 0 0 1-5-12H-3V59h16a45 45 0 0 1 5-12L7 36l20-20 11 11a45 45 0 0 1 12-5V6Z" transform="translate(9 0) scale(.86)" />
      <circle cx="64" cy="63" r="27" />
    </svg>
  )
}

// Codes select existing artwork only. Navigation and authorization always use IDs.
const coordinationArtwork = {
  COTEC: { Icon: TerrainIcon, color: '#332186' },
  COPROJ: { Icon: ProjectIcon, color: '#ff8800' },
  COROB: { Icon: ConstructionIcon, color: '#2c8c43' },
  CORMAN: { Icon: MaintenanceIcon, color: '#9824ae' },
}

type CoordinationCardProps = {
  coordination: Coordination
  onNavigate: (href: string) => void
}

export function CoordinationCard({ coordination, onNavigate }: CoordinationCardProps) {
  const artwork = Object.hasOwn(coordinationArtwork, coordination.code)
    ? coordinationArtwork[coordination.code as keyof typeof coordinationArtwork] : null
  const { Icon, color } = artwork ?? { Icon: FileTextIcon, color: '#3564ad' }
  const href = `/relatorios/coordenacoes/${coordination.id}`

  return (
    <a href={href}
      className="flex min-h-[150px] w-full max-w-[440px] items-center gap-4 rounded-[28px] border border-[#dedede] bg-white px-4 py-5 shadow-[0_1px_9px_rgba(0,0,0,0.11)] transition-[transform,box-shadow] hover:shadow-[0_6px_20px_rgba(7,53,116,0.14)] focus-visible:outline-3 focus-visible:outline-[#073574] focus-visible:outline-offset-4 motion-safe:hover:-translate-y-1 motion-reduce:transition-none sm:min-h-[164px] sm:gap-6 sm:px-6"
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        onNavigate(href)
      }}>
      <Icon aria-hidden="true" className="size-[80px] shrink-0 sm:size-[120px]" style={{ color }} />
      <div className="min-w-0">
        <h2 className="break-words text-[30px] font-bold leading-tight text-[#073574] sm:text-[40px]">{coordination.code}</h2>
        <p className="mt-1 text-[16px] leading-snug text-slate-600 sm:text-[20px]">{coordination.name}</p>
      </div>
    </a>
  )
}
