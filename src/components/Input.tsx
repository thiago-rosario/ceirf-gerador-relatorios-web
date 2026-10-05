import type { InputHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: LucideIcon
}

const Input = ({
  icon: Icon,
  className = '',
  ...props
}: InputProps) => {
  return (
    <div className="flex h-14 w-full overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-blue-800/20">
      {Icon && (
        <span className="flex w-16 items-center justify-center border-r border-gray-200 text-gray-400">
          <Icon size={26} strokeWidth={1.5} />
        </span>
      )}

      <input
        {...props}
        className={`w-full bg-transparent px-4 text-base text-gray-800 outline-none placeholder:text-gray-400 ${className}`}
      />
    </div>
  )
}

export default Input
