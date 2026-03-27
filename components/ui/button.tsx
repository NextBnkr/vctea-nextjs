import * as React from 'react'

import { cn } from '@/lib/utils'

type ButtonVariant = 'default' | 'secondary' | 'ghost'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-amber-500 text-white hover:bg-amber-400',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40',
          variantClasses[variant],
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button }
