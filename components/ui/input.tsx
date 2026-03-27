import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        className={cn(
          'h-12 w-full rounded-2xl border border-white/35 bg-white/68 px-3.5 text-sm text-slate-900 outline-none ring-1 ring-white/70 backdrop-blur-sm transition placeholder:text-slate-400 focus:border-amber-200/70 focus:ring-amber-200/70',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
