import type { FC } from 'react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

export type INoDataProps = {}
const NoData: FC<INoDataProps> = () => {
  const { t } = useTranslation()
  return (
    <div className='flex flex-col h-full w-full justify-center items-center'>
      <DocumentTextIcon className='mb-3 h-12 w-12 text-amber-300' />
      <div
        className='text-center text-xs leading-5 text-slate-400'
      >
        {t('app.generation.noData')}
      </div>
    </div>
  )
}
export default React.memo(NoData)
