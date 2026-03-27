'use client'
import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import TagInput from '@/app/components/base/tag-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { runPrefillWorkflow } from '@/service'

type FormValues = {
  projectName: string
  oneLineSummary: string
  track: string
  stage: string
  fundingAmount: string
  targetInvestors: string[]
  location: string
  structure: string
  traction: string
  teamBackground: string
  runway: string
  resourceNeeds: string
}

type HistoryItem = {
  id: string
  savedAt: number
  values: FormValues
}

type StepItem = {
  title: string
  subtitle: string
  helper: string
  requiredKeys: (keyof FormValues)[]
}

const FORM_HISTORY_KEY = 'vccha_form_history_v1'
const FORM_DRAFT_KEY = 'vccha_form_draft_v1'
const PENDING_ORG_KEY = 'vccha_pending_org_query'
const structureOptions = ['纯内资', '红筹', 'VIE']
const runwayOptions = ['0-3个月', '3-6个月', '6-12个月', '12个月以上']
const normalizeRunwayText = (value: string) => value.replace(/\s+/g, '').replace(/个?月/g, '个月').replace(/～|—|－|至/g, '-').toLowerCase()
const normalizeRunwayOption = (value: any) => {
  const source = `${value || ''}`.trim()
  if (!source)
    return ''
  if (runwayOptions.includes(source))
    return source
  const normalized = normalizeRunwayText(source)
  if (normalized.includes('12个月以上') || normalized.includes('一年以上') || normalized.includes('>=12') || normalized.includes('大于12'))
    return '12个月以上'
  if (normalized.includes('6-12') || normalized.includes('6到12') || normalized.includes('6-12个月'))
    return '6-12个月'
  if (normalized.includes('3-6') || normalized.includes('3到6') || normalized.includes('3-6个月'))
    return '3-6个月'
  if (normalized.includes('0-3') || normalized.includes('0到3') || normalized.includes('3个月以内') || normalized.includes('3个月内'))
    return '0-3个月'
  return ''
}

const initialValues: FormValues = {
  projectName: '',
  oneLineSummary: '',
  track: '',
  stage: '',
  fundingAmount: '',
  targetInvestors: [],
  location: '',
  structure: '',
  traction: '',
  teamBackground: '',
  runway: '',
  resourceNeeds: '',
}

const steps: StepItem[] = [
  {
    title: '核心输入',
    subtitle: '只填 3 项即可启动',
    helper: '输入项目一句话、目标机构、融资金额后，系统会自动补全其余字段。',
    requiredKeys: ['oneLineSummary', 'fundingAmount', 'targetInvestors'],
  },
  {
    title: '自动补全确认',
    subtitle: '系统已补全，请快速确认或改动',
    helper: '你可以直接沿用系统补全值，也可以按实际情况覆盖修改。',
    requiredKeys: [],
  },
  {
    title: '可选补充',
    subtitle: '按需补充背景信息',
    helper: '客观信息越完整，匹配结论越稳定，也更利于后续沟通。',
    requiredKeys: [],
  },
  {
    title: '确认提交',
    subtitle: '检查关键信息后生成结果',
    helper: '保持当前向导风格，提交后将沿用现有结果页分析流程。',
    requiredKeys: [],
  },
]

const requiredLabelMap: Record<string, string> = {
  oneLineSummary: '项目一句话介绍',
  fundingAmount: '本轮目标融资金额',
  targetInvestors: '目标机构',
}

const selectClassName = 'h-12 w-full rounded-2xl border border-white/40 bg-white/65 px-3 text-sm text-slate-900 outline-none ring-1 ring-white/60 backdrop-blur-sm transition focus:border-amber-200/70 focus:ring-amber-200/70'

const IntakePage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [values, setValues] = useState<FormValues>(initialValues)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [prefillStatus, setPrefillStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [prefillSignature, setPrefillSignature] = useState('')
  const [manualMode, setManualMode] = useState(false)
  const [prefillMeta, setPrefillMeta] = useState<{
    confidence: number
    missingFields: string[]
    reasoningBrief: string
  }>({
    confidence: 0,
    missingFields: [],
    reasoningBrief: '',
  })

  useEffect(() => {
    document.title = 'VC查｜AI FA 融资匹配向导'
    const historyRaw = localStorage.getItem(FORM_HISTORY_KEY)
    let parsedHistory: HistoryItem[] = []
    if (historyRaw) {
      try {
        const parsed = JSON.parse(historyRaw)
        if (Array.isArray(parsed))
          parsedHistory = parsed
      }
      catch { }
    }
    setHistory(parsedHistory)
    const draftRaw = localStorage.getItem(FORM_DRAFT_KEY)
    if (draftRaw) {
      try {
        const parsedDraft = JSON.parse(draftRaw)
        if (parsedDraft && typeof parsedDraft === 'object') {
          setValues({ ...initialValues, ...parsedDraft })
          return
        }
      }
      catch { }
    }
    if (parsedHistory.length)
      setValues({ ...initialValues, ...parsedHistory[0].values })
  }, [])

  useEffect(() => {
    localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(values))
  }, [values])

  useEffect(() => {
    const orgFromQuery = searchParams.get('org')?.trim() || ''
    const orgFromSession = sessionStorage.getItem(PENDING_ORG_KEY)?.trim() || ''
    const org = orgFromQuery || orgFromSession
    if (!org)
      return
    setValues((prev) => {
      if (prev.targetInvestors.includes(org))
        return prev
      return { ...prev, targetInvestors: [org, ...prev.targetInvestors].slice(0, 30) }
    })
    sessionStorage.removeItem(PENDING_ORG_KEY)
  }, [searchParams])

  function findMissingByKeys(keys: readonly (keyof FormValues)[]) {
    const missingKey = keys.find((key) => {
      const value = values[key]
      if (Array.isArray(value))
        return !value.length
      return !`${value || ''}`.trim()
    })
    if (!missingKey)
      return ''
    return requiredLabelMap[missingKey] || '必填项'
  }

  const saveHistorySnapshot = () => {
    const snapshot: FormValues = { ...values, targetInvestors: [...values.targetInvestors] }
    setHistory((prev) => {
      const deduped = prev.filter(item => JSON.stringify(item.values) !== JSON.stringify(snapshot))
      const next = [{ id: `${Date.now()}`, savedAt: Date.now(), values: snapshot }, ...deduped].slice(0, 6)
      localStorage.setItem(FORM_HISTORY_KEY, JSON.stringify(next))
      return next
    })
    localStorage.removeItem(FORM_DRAFT_KEY)
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const missing = findMissingByKeys(['oneLineSummary', 'fundingAmount', 'targetInvestors'])
    if (missing) {
      setError(`请补充「${missing}」，我们会据此给出更准确的匹配结果`)
      return
    }
    saveHistorySnapshot()
    const normalizedInputs: Record<string, any> = {
      sai_dao: values.track.trim(),
      rong_zilun_ci: values.stage,
      jin_e: values.fundingAmount.trim(),
      cheng_shu_du: values.traction.trim(),
      mi_ao_shu: values.oneLineSummary.trim(),
      location: values.location.trim(),
      jia_gou: values.structure,
      beijing: values.teamBackground.trim(),
      run_wa_y: values.runway,
      xu_qiu: values.resourceNeeds.trim(),
      ji_gou: values.targetInvestors.join('、'),
    }
    sessionStorage.setItem('vccha_run_payload', JSON.stringify({
      inputs: normalizedInputs,
      title: 'VC查',
      description: '给创始人的机构匹配顾问',
      createdAt: Date.now(),
    }))
    router.push('/result')
  }

  const goNextStep = () => {
    void (async () => {
      const missingLabel = findMissingByKeys(steps[currentStep].requiredKeys)
      if (missingLabel) {
        setError(`请先补充「${missingLabel}」后再继续`)
        return
      }
      if (currentStep === 0) {
        const signature = [
          values.oneLineSummary.trim(),
          values.fundingAmount.trim(),
          values.targetInvestors.join('、'),
        ].join('|')
        if (signature && signature !== prefillSignature) {
          setError('')
          setPrefillStatus('loading')
          try {
            const res = await runPrefillWorkflow({
              one_line_summary: values.oneLineSummary.trim(),
              target_investors: values.targetInvestors.join('、'),
              funding_amount: values.fundingAmount.trim(),
            })
            const outputs = res?.outputs || {}
            const confidence = Number(res?.meta?.confidence ?? outputs.confidence ?? 0)
            const missingFields = Array.isArray(res?.meta?.missingFields)
              ? res.meta.missingFields
              : (Array.isArray(outputs.missing_fields) ? outputs.missing_fields.map((item: any) => `${item}`.trim()).filter(Boolean) : [])
            const reasoningBrief = `${res?.meta?.reasoningBrief || outputs.reasoning_brief || ''}`.trim()
            const metricTexts = [
              outputs.monthly_revenue ? `月收入：${outputs.monthly_revenue}` : '',
              outputs.arr ? `ARR：${outputs.arr}` : '',
              outputs.growth ? `增长：${outputs.growth}` : '',
              outputs.burn_rate ? `消耗：${outputs.burn_rate}` : '',
            ].filter(Boolean).join('；')
            const runwayCandidate = `${outputs.current_runway || outputs.runway || ''}`.trim()
            const normalizedRunway = normalizeRunwayOption(runwayCandidate)
            const fundUsage = `${outputs.fund_usage || ''}`.trim()
            const askForInvestor = `${outputs.ask_for_investor || ''}`.trim()
            setValues(prev => ({
              ...prev,
              track: prev.track || `${outputs.track || ''}`.trim(),
              stage: prev.stage || `${outputs.stage || ''}`.trim(),
              traction: prev.traction || `${outputs.traction || metricTexts || ''}`.trim(),
              runway: prev.runway || normalizedRunway,
              resourceNeeds: prev.resourceNeeds || [fundUsage, askForInvestor].filter(Boolean).join('；'),
              location: prev.location || `${outputs.location || ''}`.trim(),
              structure: prev.structure || `${outputs.structure || ''}`.trim(),
              teamBackground: prev.teamBackground || `${outputs.team_background || ''}`.trim(),
              projectName: prev.projectName || `${outputs.project_name || ''}`.trim(),
            }))
            setPrefillMeta({
              confidence: Number.isNaN(confidence) ? 0 : confidence,
              missingFields,
              reasoningBrief,
            })
            setManualMode(false)
            setPrefillStatus('success')
          }
          catch {
            setManualMode(true)
            setPrefillStatus('error')
            setPrefillMeta({
              confidence: 0,
              missingFields: [],
              reasoningBrief: '',
            })
            setError('自动补全暂时不可用，已切换为手动补充模式。')
          }
          finally {
            setPrefillSignature(signature)
          }
        }
      }
      setError('')
      setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))
    })()
  }

  const goPrevStep = () => {
    setError('')
    setCurrentStep(prev => Math.max(0, prev - 1))
  }

  return (
    <main className='min-h-screen bg-[radial-gradient(1200px_680px_at_28%_-18%,#ffe7a4_0%,rgba(255,231,164,0)_56%),linear-gradient(180deg,#fffef9_0%,#fffdfa_42%,#fff8eb_100%)] px-4 pb-8 pt-6 md:px-8 md:pb-10' style={{ minHeight: '100dvh' }}>
      <div className='mx-auto w-full max-w-[920px] space-y-4 md:space-y-5'>
        <section className='rounded-[28px] bg-white/55 px-5 py-5 ring-1 ring-white/70 backdrop-blur-md md:px-8 md:py-7'>
          <div className='space-y-4'>
            <div className='inline-flex items-center rounded-full bg-amber-100/90 px-3 py-1 text-xs font-semibold tracking-wide text-amber-800'>
              VC查 · AI FA 融资助手
            </div>
            <div className='space-y-1.5'>
              <h1 className='text-[30px] font-semibold leading-tight text-slate-900 md:text-[40px]'>用更清晰的融资信息，找到更匹配的 VC</h1>
              <p className='max-w-[680px] text-sm leading-6 text-slate-600'>
                回答关键问题，我们会按机构视角整理你的项目信息，帮你更高效判断优先沟通对象。
              </p>
            </div>
          </div>
        </section>

        <form className='space-y-5' onSubmit={onSubmit}>
          <Card key={currentStep} className='rounded-[28px] bg-white/56 shadow-[0_14px_30px_rgba(15,23,42,0.04)] ring-1 ring-white/70 backdrop-blur-sm'>
            <CardHeader className='pb-0 pt-5 md:pt-6'>
              {currentStep !== 0 && <div className='text-xs text-slate-500'>{steps[currentStep].subtitle}</div>}
              {currentStep !== 0 && <div className='mt-2 text-[11px] leading-5 text-slate-500'>{steps[currentStep].helper}</div>}
            </CardHeader>
            <CardContent className='space-y-5 pt-1 md:space-y-6'>
              {currentStep === 0 && (
                <>
                  <div className='space-y-1.5'>
                    <div className='flex items-center justify-between'>
                      <label className='text-sm font-medium text-slate-900'>项目一句话介绍</label>
                      <span className='rounded-full bg-amber-100/80 px-2 py-0.5 text-[11px] font-medium text-amber-700'>必填</span>
                    </div>
                    <Textarea value={values.oneLineSummary} onChange={e => setValues(prev => ({ ...prev, oneLineSummary: e.target.value }))} placeholder='模板：我们为【谁】解决【什么问题】，通过【什么方式】实现。' className='h-28 border-white/40 bg-white/70 ring-1 ring-white/70' />
                  </div>
                  <div className='space-y-1.5'>
                    <div className='flex items-center justify-between'>
                      <label className='text-sm font-medium text-slate-900'>本轮目标融资金额</label>
                      <span className='rounded-full bg-amber-100/80 px-2 py-0.5 text-[11px] font-medium text-amber-700'>必填</span>
                    </div>
                    <Input value={values.fundingAmount} onChange={e => setValues(prev => ({ ...prev, fundingAmount: e.target.value }))} placeholder='例如：600万人民币' className='border-white/40 bg-white/70 ring-1 ring-white/70' />
                  </div>
                  <div className='space-y-1.5'>
                    <div className='flex items-center justify-between'>
                      <label className='text-sm font-medium text-slate-900'>目标机构</label>
                      <span className='rounded-full bg-amber-100/80 px-2 py-0.5 text-[11px] font-medium text-amber-700'>必填</span>
                    </div>
                    <TagInput value={values.targetInvestors} onChange={next => setValues(prev => ({ ...prev, targetInvestors: next }))} placeholder='输入机构后回车，可粘贴多个机构' maxCount={30} />
                  </div>
                  {prefillStatus === 'loading' && (
                    <div className='rounded-2xl bg-gradient-to-r from-amber-50/85 via-white/80 to-sky-50/85 px-3 py-3 ring-1 ring-white/80'>
                      <div className='flex items-center gap-2.5'>
                        <span className='h-5 w-5 animate-spin rounded-full border-2 border-amber-200 border-t-amber-500'></span>
                        <div className='text-sm font-medium text-slate-800'>正在自动补全信息</div>
                      </div>
                      <div className='mt-1 text-xs text-slate-500'>系统正在推断赛道、轮次、runway 与资源诉求</div>
                      <div className='mt-3 space-y-2'>
                        <div className='h-2 w-full animate-pulse rounded-full bg-white/90'></div>
                        <div className='h-2 w-5/6 animate-pulse rounded-full bg-white/85'></div>
                        <div className='h-2 w-2/3 animate-pulse rounded-full bg-white/80'></div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {currentStep === 1 && (
                <>
                  <div className='rounded-2xl bg-sky-50/75 px-3 py-2.5 text-xs leading-5 text-sky-900'>
                    {prefillStatus === 'loading' && '正在自动补全字段，请稍候...'}
                    {prefillStatus === 'success' && `自动补全完成 · 置信度 ${Math.round(Math.max(0, prefillMeta.confidence) * 100)}%`}
                    {prefillStatus === 'error' && '自动补全失败，已切换为手动补充模式'}
                    {prefillStatus === 'idle' && '你可以在本步确认并调整自动补全结果'}
                  </div>
                  {!!prefillMeta.reasoningBrief && (
                    <div className='rounded-2xl bg-white/80 px-3 py-2 text-xs leading-5 text-slate-600 ring-1 ring-white/80'>
                      推断依据：{prefillMeta.reasoningBrief}
                    </div>
                  )}
                  {!!prefillMeta.missingFields.length && (
                    <div className='rounded-2xl bg-amber-50/70 px-3 py-2 text-xs leading-5 text-amber-800'>
                      待补充：{prefillMeta.missingFields.join('、')}
                    </div>
                  )}
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    <div className='space-y-1.5'>
                      <label className='text-sm font-medium text-slate-900'>项目赛道</label>
                      <Input value={values.track} onChange={e => setValues(prev => ({ ...prev, track: e.target.value }))} placeholder='例如：AI 应用、跨境消费、智能制造' className='border-white/40 bg-white/70 ring-1 ring-white/70' />
                    </div>
                    <div className='space-y-1.5'>
                      <label className='text-sm font-medium text-slate-900'>融资轮次</label>
                      <Input value={values.stage} onChange={e => setValues(prev => ({ ...prev, stage: e.target.value }))} placeholder='例如：种子轮、天使轮、Pre-A' className='border-white/40 bg-white/70 ring-1 ring-white/70' />
                    </div>
                  </div>
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    <div className='space-y-1.5'>
                      <label className='text-sm font-medium text-slate-900'>资金 runway</label>
                      <select value={values.runway} onChange={e => setValues(prev => ({ ...prev, runway: e.target.value }))} className={cn(selectClassName, 'focus:border-slate-200 focus:ring-slate-200')}>
                        <option value=''>请选择</option>
                        {runwayOptions.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className='space-y-1.5'>
                      <label className='text-sm font-medium text-slate-900'>项目名称</label>
                      <Input value={values.projectName} onChange={e => setValues(prev => ({ ...prev, projectName: e.target.value }))} placeholder='例如：AstraFlow AI Sales' className='border-white/40 bg-white/70 ring-1 ring-white/70' />
                    </div>
                  </div>
                  <div className='space-y-1.5'>
                    <label className='text-sm font-medium text-slate-900'>当前进展与关键数据</label>
                    <Textarea value={values.traction} onChange={e => setValues(prev => ({ ...prev, traction: e.target.value }))} placeholder='例如：月收入、月增长、客户数、复购率、试点落地情况' className='h-24 border-white/40 bg-white/70 ring-1 ring-white/70 focus:border-slate-200 focus:ring-slate-200' />
                  </div>
                  <div className='space-y-1.5'>
                    <label className='text-sm font-medium text-slate-900'>希望机构提供的资源</label>
                    <Textarea value={values.resourceNeeds} onChange={e => setValues(prev => ({ ...prev, resourceNeeds: e.target.value }))} placeholder='例如：3个月内落地华东渠道，希望有消费连锁资源的机构帮助对接' className='h-24 border-white/40 bg-white/70 ring-1 ring-white/70 focus:border-slate-200 focus:ring-slate-200' />
                  </div>
                  {manualMode && (
                    <div className='rounded-2xl bg-amber-50/70 px-3 py-2 text-xs leading-5 text-amber-800'>
                      当前为手动补充模式：你可以继续填写本页和下一页字段后提交。
                    </div>
                  )}
                </>
              )}

              {currentStep === 2 && (
                <>
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    <div className='space-y-1.5'>
                      <label className='text-sm font-medium text-slate-900'>项目所在地</label>
                      <Input value={values.location} onChange={e => setValues(prev => ({ ...prev, location: e.target.value }))} placeholder='例如：深圳' className='border-white/40 bg-white/70 ring-1 ring-white/70' />
                    </div>
                    <div className='space-y-1.5'>
                      <label className='text-sm font-medium text-slate-900'>公司架构</label>
                      <select value={values.structure} onChange={e => setValues(prev => ({ ...prev, structure: e.target.value }))} className={cn(selectClassName, 'focus:border-slate-200 focus:ring-slate-200')}>
                        <option value=''>请选择</option>
                        {structureOptions.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className='space-y-1.5'>
                    <label className='text-sm font-medium text-slate-900'>团队背景</label>
                    <Textarea value={values.teamBackground} onChange={e => setValues(prev => ({ ...prev, teamBackground: e.target.value }))} placeholder='例如：核心成员行业经验、创业经历、能力分工' className='h-28 border-white/40 bg-white/70 ring-1 ring-white/70 focus:border-slate-200 focus:ring-slate-200' />
                  </div>
                </>
              )}

              {currentStep === 3 && (
                <div className='space-y-3'>
                  <div className='rounded-2xl bg-white/78 px-3 py-2 text-sm text-slate-700 ring-1 ring-white/80'>项目概述：{values.oneLineSummary || '—'}</div>
                  <div className='rounded-2xl bg-white/78 px-3 py-2 text-sm text-slate-700 ring-1 ring-white/80'>目标机构：{values.targetInvestors.join('、') || '—'}</div>
                  <div className='rounded-2xl bg-white/78 px-3 py-2 text-sm text-slate-700 ring-1 ring-white/80'>融资金额：{values.fundingAmount || '—'}</div>
                  <div className='rounded-2xl bg-white/78 px-3 py-2 text-sm text-slate-700 ring-1 ring-white/80'>赛道 / 轮次：{values.track || '未填'} / {values.stage || '未填'}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {error && <div className='rounded-2xl bg-rose-50/80 px-3 py-2 text-sm text-rose-700'>{error}</div>}

          <div className='sticky bottom-0 z-20 overflow-hidden rounded-2xl bg-white/60 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:bg-transparent md:px-0 md:pb-0 md:pt-2'>
            <div className='pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-white/40'>
              <div className='h-full bg-amber-500 transition-all duration-500 ease-out' style={{ width: `${steps.length > 1 ? 50 + (currentStep / (steps.length - 1)) * 50 : 100}%` }}></div>
            </div>
            <div className='mx-auto flex w-full max-w-[920px] items-center justify-between gap-3'>
              <Button type='button' onClick={goPrevStep} disabled={currentStep === 0} variant='secondary' className='min-w-[116px] bg-white/70 text-slate-700 hover:bg-white'>
                上一步
              </Button>
              {currentStep < steps.length - 1
                ? (
                  <Button type='button' onClick={goNextStep} disabled={prefillStatus === 'loading' && currentStep === 0} className='min-w-[138px] hover:-translate-y-0.5'>
                    {(prefillStatus === 'loading' && currentStep === 0) ? '自动补全中...' : '下一步'}
                  </Button>
                )
                : (
                  <Button type='submit' className='min-w-[156px] hover:-translate-y-0.5'>
                    查看匹配结果
                  </Button>
                )}
            </div>
          </div>
        </form>
      </div>
    </main>
  )
}

export default IntakePage
