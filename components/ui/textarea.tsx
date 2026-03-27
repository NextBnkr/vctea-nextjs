import * as React from 'react'

import { cn } from '@/lib/utils'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'w-full rounded-2xl border border-white/35 bg-white/68 px-3.5 py-2.5 text-sm text-slate-900 outline-none ring-1 ring-white/70 backdrop-blur-sm transition placeholder:text-slate-400 focus:border-amber-200/70 focus:ring-amber-200/70',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Textarea.displayName = 'Textarea'

export { Textarea }
