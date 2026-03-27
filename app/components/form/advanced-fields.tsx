import type { FC } from 'react'
import React from 'react'
import Select from '@/app/components/base/select'
import type { PromptVariable } from '@/types/app'
import { DEFAULT_VALUE_MAX_LEN } from '@/config'

type AdvancedFieldsProps = {
  fields: PromptVariable[]
  inputs: Record<string, any>
  onInputsChange: (inputs: Record<string, any>) => void
}

const AdvancedFields: FC<AdvancedFieldsProps> = ({
  fields,
  inputs,
  onInputsChange,
}) => {
  if (!fields.length)
    return null

  return (
    <div className='space-y-4'>
      {fields.map((item) => {
        return (
          <div key={item.key}>
            <label className='mb-1.5 block text-sm font-medium text-slate-900'>{item.name}</label>
            {item.type === 'select' && (
              <Select
                className='w-full'
                defaultValue={inputs[item.key]}
                onSelect={(i) => { onInputsChange({ ...inputs, [item.key]: i.value }) }}
                items={(item.options || []).map(i => ({ name: i, value: i }))}
                allowSearch={false}
                bgClassName='bg-amber-50'
              />
            )}
            {item.type === 'paragraph' && (
              <textarea
                className='block h-[92px] w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-slate-900 focus:border-amber-500 focus:ring-amber-500'
                value={inputs[item.key] || ''}
                onChange={e => onInputsChange({ ...inputs, [item.key]: e.target.value })}
                maxLength={item.max_length || DEFAULT_VALUE_MAX_LEN}
              />
            )}
            {['string', 'number'].includes(item.type) && (
              <input
                type={item.type === 'number' ? 'number' : 'text'}
                className='block w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-slate-900 focus:border-amber-500 focus:ring-amber-500'
                value={inputs[item.key] || ''}
                onChange={e => onInputsChange({ ...inputs, [item.key]: e.target.value })}
                maxLength={item.max_length || DEFAULT_VALUE_MAX_LEN}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default React.memo(AdvancedFields)
