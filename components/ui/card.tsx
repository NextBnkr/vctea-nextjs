import * as React from 'react'

import { cn } from '@/lib/utils'

const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-[26px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]', className)} {...props} />
)

const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('space-y-1.5 px-4 pt-4 md:px-5 md:pt-5', className)} {...props} />
)

const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('space-y-4 px-4 pb-4 md:px-5 md:pb-5', className)} {...props} />
)

export { Card, CardContent, CardHeader }
