import type { ComponentType, SVGProps } from 'react'

type CoordinationCardProps = {
  name: string
  description: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  color: string
}

export function CoordinationCard({ name, description, Icon, color }: CoordinationCardProps) {
  return (
    <article className="flex min-h-[150px] w-full max-w-[440px] items-center gap-4 rounded-[28px] border border-[#dedede] bg-white px-4 py-5 shadow-[0_1px_9px_rgba(0,0,0,0.11)] sm:min-h-[164px] sm:gap-6 sm:px-6">
      <Icon aria-hidden="true" className="size-[80px] shrink-0 sm:size-[120px]" style={{ color }} />
      <div className="min-w-0">
        <h2 className="text-[30px] font-bold leading-tight text-[#073574] sm:text-[40px]">{name}</h2>
        <p className="mt-1 text-[16px] leading-snug text-[#808080] sm:text-[20px]">{description}</p>
      </div>
    </article>
  )
}
