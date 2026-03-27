import type { FC } from 'react'
import React from 'react'
import Select from '@/app/components/base/select'
import type { PromptVariable } from '@/types/app'
import { DEFAULT_VALUE_MAX_LEN } from '@/config'
import TagInput from '@/app/components/base/tag-input'
import { getFieldRole } from './field-groups'

type MinimalFormProps = {
  fields: PromptVariable[]
  inputs: Record<string, any>
  onInputsChange: (inputs: Record<string, any>) => void
}

const MinimalForm: FC<MinimalFormProps> = ({
  fields,
  inputs,
  onInputsChange,
}) => {
  return (
    <div className='space-y-4'>
      {fields.map((item) => {
        const role = getFieldRole(item)
        return (
          <div key={item.key}>
            <div className='mb-1.5 flex items-center justify-between'>
              <label className='block text-sm font-medium text-slate-900'>{item.name}</label>
              {item.required !== false && (
                <span className='text-[11px] font-medium text-amber-700'>必填</span>
              )}
            </div>
            {role === 'investors'
              ? (
                <TagInput
                  value={Array.isArray(inputs[item.key]) ? inputs[item.key] : []}
                  onChange={next => onInputsChange({ ...inputs, [item.key]: next })}
                  placeholder='输入机构后回车，可粘贴多个名称'
                />
                )
              : (
                <>
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
                      className='block h-[110px] w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-amber-500'
                      value={inputs[item.key] || ''}
                      onChange={e => onInputsChange({ ...inputs, [item.key]: e.target.value })}
                      maxLength={item.max_length || DEFAULT_VALUE_MAX_LEN}
                    />
                  )}
                  {['string', 'number'].includes(item.type) && (
                    <input
                      type={item.type === 'number' ? 'number' : 'text'}
                      className='block w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-amber-500'
                      value={inputs[item.key] || ''}
                      onChange={e => onInputsChange({ ...inputs, [item.key]: e.target.value })}
                      maxLength={item.max_length || DEFAULT_VALUE_MAX_LEN}
                    />
                  )}
                </>
                )}
          </div>
        )
      })}
    </div>
  )
}

export default React.memo(MinimalForm)
