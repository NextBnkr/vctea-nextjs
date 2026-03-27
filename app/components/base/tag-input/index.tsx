import type { FC, KeyboardEvent } from 'react'
import React, { useMemo, useState } from 'react'
import cn from 'classnames'
import { XMarkIcon } from '@heroicons/react/24/outline'

type TagInputProps = {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  disabled?: boolean
  maxCount?: number
}

const splitTextToTags = (text: string) => text
  .split(/[\n,，;；]/g)
  .map(item => item.trim())
  .filter(Boolean)

const TagInput: FC<TagInputProps> = ({
  value,
  onChange,
  placeholder,
  disabled,
  maxCount = 20,
}) => {
  const [inputValue, setInputValue] = useState('')
  const canAdd = useMemo(() => value.length < maxCount, [value.length, maxCount])

  const addTags = (rawText: string) => {
    if (!rawText.trim() || !canAdd)
      return
    const parsed = splitTextToTags(rawText)
    if (!parsed.length)
      return
    const existing = new Set(value)
    const next = [...value]
    parsed.forEach((item) => {
      if (next.length >= maxCount)
        return
      if (!existing.has(item)) {
        existing.add(item)
        next.push(item)
      }
    })
    onChange(next)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', '，', ';', '；'].includes(e.key)) {
      e.preventDefault()
      addTags(inputValue)
      setInputValue('')
    }
    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      const next = [...value]
      next.pop()
      onChange(next)
    }
  }

  return (
    <div className='w-full rounded-2xl border border-white/40 bg-white/72 px-3 py-2.5 ring-1 ring-white/70 backdrop-blur-sm'>
      <div className='flex flex-wrap gap-2'>
        {value.map(item => (
          <div key={item} className='inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50/90 px-2.5 py-1 text-xs text-amber-900'>
            <span className='max-w-[180px] truncate'>{item}</span>
            {!disabled && (
              <XMarkIcon
                className='ml-1 h-3.5 w-3.5 cursor-pointer text-amber-700/70 hover:text-amber-800'
                onClick={() => onChange(value.filter(v => v !== item))}
              />
            )}
          </div>
        ))}
        <input
          value={inputValue}
          disabled={disabled || !canAdd}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            addTags(inputValue)
            setInputValue('')
          }}
          onPaste={(e) => {
            const text = e.clipboardData?.getData('text') || ''
            if (!text)
              return
            e.preventDefault()
            addTags(text)
          }}
          className={cn('h-7 min-w-[140px] flex-1 border-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400', (!canAdd || disabled) && 'cursor-not-allowed opacity-70')}
          placeholder={canAdd ? placeholder : `最多 ${maxCount} 个机构`}
        />
      </div>
    </div>
  )
}

export default React.memo(TagInput)
