import type { FC } from 'react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlayIcon,
} from '@heroicons/react/24/solid'
import { useBoolean } from 'ahooks'
import type { PromptConfig, VisionFile, VisionSettings } from '@/types/app'
import Button from '@/app/components/base/button'
import TextGenerationImageUploader from '@/app/components/base/image-uploader/text-generation-image-uploader'
import MinimalForm from '@/app/components/form/minimal-form'
import AdvancedFields from '@/app/components/form/advanced-fields'
import { getMinimalAndAdvancedFields } from '@/app/components/form/field-groups'

export type IRunOnceProps = {
  promptConfig: PromptConfig
  inputs: Record<string, any>
  onInputsChange: (inputs: Record<string, any>) => void
  onSend: () => void
  visionConfig: VisionSettings
  onVisionFilesChange: (files: VisionFile[]) => void
}
const RunOnce: FC<IRunOnceProps> = ({
  promptConfig,
  inputs,
  onInputsChange,
  onSend,
  visionConfig,
  onVisionFilesChange,
}) => {
  const { t } = useTranslation()
  const [isAdvancedOpen, { toggle }] = useBoolean(false)
  const { minimal, advanced } = getMinimalAndAdvancedFields(promptConfig.prompt_variables)

  const onClear = () => {
    const newInputs: Record<string, any> = {}
    promptConfig.prompt_variables.forEach((item) => {
      newInputs[item.key] = ''
    })
    onInputsChange(newInputs)
  }

  return (
    <div>
      <section>
        <form>
          <div className='rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm'>
            <div className='mb-3 flex items-start justify-between gap-3'>
              <div>
                <div className='inline-flex items-center rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[11px] font-medium text-amber-700'>
                  VC查
                </div>
                <div className='mt-2 text-sm font-semibold text-slate-900'>{t('app.generation.minimalTitle')}</div>
                <div className='mt-1 text-xs leading-5 text-slate-600'>{t('app.generation.minimalDesc')}</div>
              </div>
              <div className='rounded-xl bg-white px-2 py-1 text-[11px] text-slate-500'>
                {t('app.generation.fieldCount', { count: promptConfig.prompt_variables.length })}
              </div>
            </div>
            <MinimalForm
              fields={minimal}
              inputs={inputs}
              onInputsChange={onInputsChange}
            />
          </div>
          {advanced.length > 0 && (
            <div className='mt-4 rounded-2xl border border-amber-100 bg-white'>
              <div className='flex cursor-pointer items-center justify-between p-4' onClick={toggle}>
                <div>
                  <div className='text-sm font-semibold text-slate-900'>{t('app.generation.advancedTitle')}</div>
                  <div className='mt-1 text-xs text-slate-500'>{t('app.generation.advancedDesc')}</div>
                </div>
                {isAdvancedOpen ? <ChevronUpIcon className='h-4 w-4 text-amber-700' /> : <ChevronDownIcon className='h-4 w-4 text-amber-700' />}
              </div>
              {isAdvancedOpen && (
                <div className='border-t border-amber-100 p-4 pt-3'>
                  <AdvancedFields
                    fields={advanced}
                    inputs={inputs}
                    onInputsChange={onInputsChange}
                  />
                </div>
              )}
            </div>
          )}
          {
            visionConfig?.enabled && (
              <div className="mt-4 w-full">
                <div className="text-sm font-medium text-slate-900">{t('common.imageUploader.imageUpload')}</div>
                <div className='mt-2'>
                  <TextGenerationImageUploader
                    settings={visionConfig}
                    onFilesChange={files => onVisionFilesChange(files.filter(file => file.progress !== -1).map(fileItem => ({
                      type: 'image',
                      transfer_method: fileItem.type,
                      url: fileItem.url,
                      upload_file_id: fileItem.fileId,
                    })))}
                  />
                </div>
              </div>
            )
          }
          {promptConfig.prompt_variables.length > 0 && (
            <div className='mt-4 h-[1px] bg-amber-100'></div>
          )}
          <div className='mt-4 w-full'>
            <div className="flex items-center justify-between">
              <Button
                className='!h-8 !p-3'
                onClick={onClear}
                disabled={false}
              >
                <span className='text-[13px]'>{t('common.operation.clear')}</span>
              </Button>
              <Button
                type="primary"
                className='!h-9 !rounded-xl !bg-amber-600 !pl-3 !pr-4 hover:!bg-amber-500'
                onClick={onSend}
                disabled={false}
              >
                <PlayIcon className="shrink-0 w-4 h-4 mr-1" aria-hidden="true" />
                <span className='text-[13px]'>{t('app.generation.run')}</span>
              </Button>
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}
export default React.memo(RunOnce)
