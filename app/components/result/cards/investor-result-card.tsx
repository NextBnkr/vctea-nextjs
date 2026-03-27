import type { FC } from 'react'
import React from 'react'
import ResultSection from './result-section'

export type InvestorCardData = {
  investorName: string
  conclusion: string
  confidence: string
  highlights: string[]
  concerns: string[]
  supplements: string[]
}

type InvestorResultCardProps = {
  data: InvestorCardData
}

const renderList = (items: string[], emptyText: string) => {
  if (!items.length)
    return <div>{emptyText}</div>
  return (
    <div className='space-y-1'>
      {items.map((item, index) => (
        <div key={`${item}-${index}`}>• {item}</div>
      ))}
    </div>
  )
}

const InvestorResultCard: FC<InvestorResultCardProps> = ({ data }) => {
  return (
    <article className='rounded-2xl border border-gray-200 bg-white p-4 shadow-sm'>
      <div className='mb-3 flex items-center justify-between gap-3'>
        <div className='truncate text-sm font-semibold text-gray-900'>{data.investorName}</div>
        <span className='rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700'>{data.confidence || '—'}</span>
      </div>
      <div className='mb-3 rounded-xl border border-primary-100 bg-primary-50 p-3'>
        <div className='text-xs font-semibold text-primary-700'>匹配结论</div>
        <div className='mt-1 text-sm font-medium text-primary-900'>{data.conclusion || '—'}</div>
      </div>
      <div className='space-y-3'>
        <ResultSection title='匹配亮点'>{renderList(data.highlights, '—')}</ResultSection>
        <ResultSection title='需关注事项'>{renderList(data.concerns, '无')}</ResultSection>
        <ResultSection title='建议补充信息'>{renderList(data.supplements, '—')}</ResultSection>
      </div>
    </article>
  )
}

export default React.memo(InvestorResultCard)
