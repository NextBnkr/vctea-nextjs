import type { FC } from 'react'
import React from 'react'

type WorkflowProgressProps = {
  progress: number
  text: string
}

const WorkflowProgress: FC<WorkflowProgressProps> = ({
  progress,
  text,
}) => {
  return (
    <div className='mb-3 rounded-xl border border-gray-200 bg-white p-3'>
      <div className='flex items-center justify-between text-xs text-gray-600'>
        <span>{text}</span>
        <span>{progress}%</span>
      </div>
      <div className='mt-2 h-2 rounded-full bg-gray-100'>
        <div
          className='h-2 rounded-full bg-primary-500 transition-all duration-300'
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  )
}

export default React.memo(WorkflowProgress)
