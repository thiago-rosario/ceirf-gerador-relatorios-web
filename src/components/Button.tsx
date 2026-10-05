import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

const Button = ({
  className = '',
  children,
  ...props
}: ButtonProps) => {
  return (
    <button
      {...props}
      className={`
        h-14 w-full cursor-pointer
        rounded-xl
        bg-blue-900
        px-4
        text-base font-semibold text-white
        transition-opacity
        hover:opacity-90
        focus-visible:outline-2
        focus-visible:outline-offset-2
        focus-visible:outline-blue-900
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${className}
      `}
    >
      {children}
    </button>
  )
}

export default Button
