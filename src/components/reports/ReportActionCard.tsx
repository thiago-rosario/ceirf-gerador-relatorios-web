import { ArrowRightIcon, type LucideIcon } from 'lucide-react'

type ReportActionCardProps = {
  title: string
  description: string
  href: string
  Icon: LucideIcon
  color: string
  onNavigate: (href: string) => void
}

export function ReportActionCard({ title, description, href, Icon, color, onNavigate }: ReportActionCardProps) {
  return (
    <a
      href={href}
      className="group flex min-h-[286px] w-full min-w-0 max-w-[440px] flex-1 basis-[300px] flex-col rounded-[36px] border border-[#dedede] bg-white px-7 py-8 shadow-[0_2px_12px_rgba(0,0,0,0.11)] transition-[transform,box-shadow,border-color] duration-200 hover:border-[#a5bbd9] hover:shadow-[0_8px_24px_rgba(7,53,116,0.14)] focus-visible:outline-3 focus-visible:outline-[#073574] focus-visible:outline-offset-5 motion-safe:hover:-translate-y-1 motion-reduce:transition-none sm:min-h-[320px] sm:rounded-[44px] sm:px-8 sm:py-9"
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        onNavigate(href)
      }}
    >
      <div className="mb-5 flex items-end justify-between gap-4" style={{ color }}>
        <Icon aria-hidden="true" className="size-24 shrink-0 sm:size-28" strokeWidth={1.5} />
        <ArrowRightIcon aria-hidden="true" className="size-11 shrink-0 transition-transform duration-200 motion-safe:group-hover:translate-x-1 motion-reduce:transition-none sm:size-12" strokeWidth={2} />
      </div>
      <h3 className="text-[26px] font-bold leading-tight text-[#073574] sm:text-[30px]">{title}</h3>
      <p className="mt-2 text-lg leading-snug text-slate-600 sm:text-xl">{description}</p>
    </a>
  )
}
