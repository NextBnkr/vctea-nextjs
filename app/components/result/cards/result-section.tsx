import type { FC } from 'react'
import React from 'react'

type ResultSectionProps = {
  title: string
  children: React.ReactNode
}

const ResultSection: FC<ResultSectionProps> = ({ title, children }) => {
  return (
    <section className='rounded-xl border border-gray-100 bg-gray-50 p-3'>
      <div className='mb-2 text-xs font-semibold text-gray-600'>{title}</div>
      <div className='text-sm leading-6 text-gray-800'>{children}</div>
    </section>
  )
}

export default React.memo(ResultSection)
