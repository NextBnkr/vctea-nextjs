'use client'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import cn from 'classnames'
import { useBoolean } from 'ahooks'
import RunOnce from './run-once'
import Result from './result'
import s from './style.module.css'
import useBreakpoints, { MediaType } from '@/hooks/use-breakpoints'
import { fetchAppParams } from '@/service'
import type { PromptConfig, VisionFile, VisionSettings } from '@/types/app'
import { Resolution, TransferMethod } from '@/types/app'
import { changeLanguage } from '@/i18n/i18next-config'
import Loading from '@/app/components/base/loading'
import AppUnavailable from '@/app/components/app-unavailable'
import { API_KEY, APP_ID, APP_INFO, IS_WORKFLOW } from '@/config'
import { userInputsFormToPromptVariables } from '@/utils/prompt'
import { getDefaultValueByRole } from '@/app/components/form/field-groups'

const TextGeneration = () => {
  const { t } = useTranslation()

  const media = useBreakpoints()
  const isPC = media === MediaType.pc
  const isMobile = media === MediaType.mobile

  /*
  * app info
  */
  const hasSetAppConfig = APP_ID && API_KEY
  const [appUnavailable, setAppUnavailable] = useState<boolean>(false)
  const [isUnknwonReason, setIsUnknwonReason] = useState<boolean>(false)

  const [inputs, setInputs] = useState<Record<string, any>>({})
  const [promptConfig, setPromptConfig] = useState<PromptConfig | null>(null)
  const [controlSend, setControlSend] = useState(0)
  const [visionConfig, setVisionConfig] = useState<VisionSettings>({
    enabled: false,
    number_limits: 2,
    detail: Resolution.low,
    transfer_methods: [TransferMethod.local_file],
  })
  const [completionFiles, setCompletionFiles] = useState<VisionFile[]>([])
  const [controlStopResponding, setControlStopResponding] = useState(0)

  const mergeDefaultInputs = (rawInputs: Record<string, any>) => {
    const nextInputs = { ...rawInputs }
    promptConfig?.prompt_variables.forEach((item) => {
      const currentValue = nextInputs[item.key]
      const isEmpty = currentValue === undefined || currentValue === null || currentValue === '' || (Array.isArray(currentValue) && currentValue.length === 0)
      if (!isEmpty)
        return
      if (item.default !== undefined && item.default !== null && item.default !== '') {
        nextInputs[item.key] = item.default
        return
      }
      const fallback = getDefaultValueByRole(item.name)
      nextInputs[item.key] = fallback
    })
    return nextInputs
  }

  const handleSend = async () => {
    const normalizedInputs = mergeDefaultInputs(inputs)
    setInputs(normalizedInputs)
    setControlStopResponding(Date.now())
    setControlSend(Date.now())
  }

  useEffect(() => {
    if (!hasSetAppConfig) {
      setAppUnavailable(true)
      return
    }
    (async () => {
      try {
        changeLanguage(APP_INFO.default_language)

        const { user_input_form, file_upload, system_parameters }: any = await fetchAppParams()
        const prompt_variables = userInputsFormToPromptVariables(user_input_form)

        setPromptConfig({
          prompt_template: '',
          prompt_variables,
        } as PromptConfig)
        const initialInputs: Record<string, any> = {}
        prompt_variables.forEach((item: any) => {
          initialInputs[item.key] = item.default || ''
        })
        setInputs(initialInputs)
        setVisionConfig({
          ...file_upload?.image,
          image_file_size_limit: system_parameters?.image_file_size_limit || 0,
        })
      }
      catch (e: any) {
        if (e.status === 404) {
          setAppUnavailable(true)
        }
        else {
          setIsUnknwonReason(true)
          setAppUnavailable(true)
        }
      }
    })()
  }, [])

  useEffect(() => {
    if (APP_INFO?.title)
      document.title = `${APP_INFO.title}｜VC查`
  }, [APP_INFO?.title])

  const [, { setTrue: showResult }] = useBoolean(false)

  const renderRes = () => (
    <Result
      isWorkflow={IS_WORKFLOW}
      isCallBatchAPI={false}
      isPC={isPC}
      isMobile={isMobile}
      isError={false}
      promptConfig={promptConfig}
      inputs={inputs}
      controlSend={controlSend}
      controlRetry={0}
      controlStopResponding={controlStopResponding}
      onShowRes={showResult}
      onCompleted={() => { }}
      visionConfig={visionConfig}
      completionFiles={completionFiles}
    />
  )

  if (appUnavailable)
    return <AppUnavailable isUnknwonReason={isUnknwonReason} errMessage={!hasSetAppConfig ? 'Please set APP_ID and API_KEY in config/index.tsx' : ''} />

  if (!APP_INFO || !promptConfig)
    return <Loading type='app' />

  return (
    <div className='min-h-screen bg-gradient-to-b from-amber-50/40 via-white to-white'>
      <div className='mx-auto w-full max-w-[1240px] p-4 md:p-6 lg:p-8'>
        <div className={cn(isPC ? 'grid grid-cols-[420px_minmax(0,1fr)] gap-6 items-start' : 'space-y-4')}>
          <div className='rounded-2xl border border-amber-200 bg-white p-4 shadow-sm md:p-6'>
            <div className='mb-5'>
              <div className='flex items-center space-x-3'>
                <div className={cn(s.appIcon, 'shrink-0')}></div>
                <div>
                  <div className='text-lg font-semibold text-slate-900'>{APP_INFO.title}</div>
                  <div className='mt-0.5 text-xs text-slate-500'>{t('app.generation.brandSubtitle')}</div>
                </div>
              </div>
              {APP_INFO.description && (
                <div className='mt-2 text-sm text-slate-600'>{APP_INFO.description}</div>
              )}
              <div className='mt-3 flex flex-wrap gap-2'>
                <div className='rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-800'>{t('app.generation.badgeOne')}</div>
                <div className='rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700'>{t('app.generation.badgeTwo')}</div>
                <div className='rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-700'>{t('app.generation.badgeThree')}</div>
              </div>
            </div>
            <RunOnce
              inputs={inputs}
              onInputsChange={setInputs}
              promptConfig={promptConfig}
              onSend={handleSend}
              visionConfig={visionConfig}
              onVisionFilesChange={setCompletionFiles}
            />
            <div className='mt-6 flex flex-wrap items-center gap-2 text-xs text-slate-400'>
              <div>© {APP_INFO.copyright || APP_INFO.title} {(new Date()).getFullYear()}</div>
              {APP_INFO.privacy_policy && (
                <div>{t('app.generation.privacyPolicyLeft')}
                  <a
                    className='ml-1 text-slate-500'
                    href={APP_INFO.privacy_policy}
                    target='_blank'>{t('app.generation.privacyPolicyMiddle')}</a>
                  {t('app.generation.privacyPolicyRight')}
                </div>
              )}
            </div>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6'>
            <div className='mb-4 flex items-center space-x-2'>
              <div className={s.starIcon}></div>
              <div className='text-base font-semibold text-slate-900'>{t('app.generation.title')}</div>
            </div>
            {renderRes()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TextGeneration
