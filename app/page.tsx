'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { InstitutionSuggestionResponse } from '@/service'
import { fetchInstitutionSuggestions } from '@/service'

type FormValues = {
  projectName?: string
  oneLineSummary?: string
  track?: string
  stage?: string
  fundingAmount?: string
  targetInvestors?: string[]
  location?: string
  structure?: string
  traction?: string
  teamBackground?: string
  runway?: string
  resourceNeeds?: string
}

const FORM_HISTORY_KEY = 'vccha_form_history_v1'
const FORM_DRAFT_KEY = 'vccha_form_draft_v1'
const PENDING_ORG_KEY = 'vccha_pending_org_query'
const placeholderScenes = [
  '查查红杉中国的口碑和约谈反馈',
  '查查源码资本今年还有没有出手空间',
  '查查某机构对具身智能是否还在重点关注',
]
const TYPE_INTERVAL = 78
const TYPE_INTERVAL_PUNCT = 150
const HOLD_FULL = 2600
const DELETE_INTERVAL = 42
const HOLD_EMPTY = 420

const safeParse = (raw: string | null) => {
  if (!raw)
    return null
  try {
    return JSON.parse(raw)
  }
  catch {
    return null
  }
}

const readLatestProfile = (): FormValues | null => {
  const draft = safeParse(localStorage.getItem(FORM_DRAFT_KEY))
  if (draft && typeof draft === 'object')
    return draft as FormValues
  const history = safeParse(localStorage.getItem(FORM_HISTORY_KEY))
  if (Array.isArray(history) && history.length && history[0]?.values)
    return history[0].values as FormValues
  return null
}

const hasCoreProfile = (profile: FormValues | null) => {
  if (!profile)
    return false
  return !!(profile.oneLineSummary?.trim() && profile.fundingAmount?.trim() && profile.teamBackground?.trim())
}

const toWorkflowInputs = (profile: FormValues, orgName: string) => {
  const mergedOrgs = [orgName, ...(profile.targetInvestors || [])]
  const dedupedOrgs = Array.from(new Set(mergedOrgs.map(item => `${item || ''}`.trim()).filter(Boolean)))
  return {
    sai_dao: `${profile.track || ''}`.trim(),
    rong_zilun_ci: `${profile.stage || ''}`.trim(),
    jin_e: `${profile.fundingAmount || ''}`.trim(),
    cheng_shu_du: `${profile.traction || ''}`.trim(),
    mi_ao_shu: `${profile.oneLineSummary || ''}`.trim(),
    location: `${profile.location || ''}`.trim(),
    jia_gou: `${profile.structure || ''}`.trim(),
    beijing: `${profile.teamBackground || ''}`.trim(),
    run_wa_y: `${profile.runway || ''}`.trim(),
    xu_qiu: `${profile.resourceNeeds || ''}`.trim(),
    ji_gou: dedupedOrgs.join('、'),
  }
}

const HomePage = () => {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [tips, setTips] = useState<string[]>([])
  const [loadingTips, setLoadingTips] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [placeholderTypedCount, setPlaceholderTypedCount] = useState(0)
  const [placeholderPhase, setPlaceholderPhase] = useState<'typing' | 'hold' | 'deleting' | 'switching'>('typing')
  const [cursorVisible, setCursorVisible] = useState(true)
  const trimmedQuery = useMemo(() => query.trim(), [query])

  useEffect(() => {
    document.title = 'VC查｜机构搜索'
  }, [])

  useEffect(() => {
    if (trimmedQuery)
      return
    const currentText = placeholderScenes[placeholderIndex]
    let timer = 0
    if (placeholderPhase === 'typing') {
      if (placeholderTypedCount < currentText.length) {
        const nextChar = currentText[placeholderTypedCount] || ''
        const delay = '，。！？?'.includes(nextChar) ? TYPE_INTERVAL_PUNCT : TYPE_INTERVAL
        timer = window.setTimeout(() => {
          setPlaceholderTypedCount(prev => prev + 1)
        }, delay)
      }
      else {
        timer = window.setTimeout(() => {
          setPlaceholderPhase('hold')
        }, HOLD_FULL)
      }
    }
    else if (placeholderPhase === 'hold') {
      timer = window.setTimeout(() => {
        setPlaceholderPhase('deleting')
      }, 0)
    }
    else if (placeholderPhase === 'deleting') {
      if (placeholderTypedCount > 0) {
        timer = window.setTimeout(() => {
          setPlaceholderTypedCount(prev => prev - 1)
        }, DELETE_INTERVAL)
      }
      else {
        timer = window.setTimeout(() => {
          setPlaceholderPhase('switching')
        }, HOLD_EMPTY)
      }
    }
    else {
      timer = window.setTimeout(() => {
        setPlaceholderIndex(prev => (prev + 1) % placeholderScenes.length)
        setPlaceholderPhase('typing')
      }, 0)
    }
    return () => window.clearTimeout(timer)
  }, [trimmedQuery, placeholderIndex, placeholderTypedCount, placeholderPhase])

  useEffect(() => {
    if (trimmedQuery) {
      setCursorVisible(true)
      return
    }
    const timer = window.setInterval(() => {
      setCursorVisible(prev => !prev)
    }, 520)
    return () => window.clearInterval(timer)
  }, [trimmedQuery])

  useEffect(() => {
    if (!trimmedQuery) {
      setTips([])
      return
    }
    let cancelled = false
    setLoadingTips(true)
    void fetchInstitutionSuggestions(trimmedQuery)
      .then((res: InstitutionSuggestionResponse) => {
        if (cancelled)
          return
        setTips(Array.isArray(res?.items) ? res.items : [])
      })
      .catch(() => {
        if (cancelled)
          return
        setTips([])
      })
      .finally(() => {
        if (!cancelled)
          setLoadingTips(false)
      })
    return () => {
      cancelled = true
    }
  }, [trimmedQuery])

  const goSearch = () => {
    if (!trimmedQuery) {
      setError('请输入要查询的投资机构')
      return
    }
    setError('')
    setRedirecting(true)
    const profile = readLatestProfile()
    if (hasCoreProfile(profile)) {
      sessionStorage.setItem('vccha_run_payload', JSON.stringify({
        inputs: toWorkflowInputs(profile as FormValues, trimmedQuery),
        title: 'VC查',
        description: `机构查询：${trimmedQuery}`,
        createdAt: Date.now(),
      }))
      router.push('/result')
      return
    }
    setShowGuide(true)
    sessionStorage.setItem(PENDING_ORG_KEY, trimmedQuery)
    setTimeout(() => {
      router.push(`/intake?org=${encodeURIComponent(trimmedQuery)}`)
    }, 900)
  }

  return (
    <main className='min-h-screen bg-[radial-gradient(1200px_680px_at_28%_-18%,#ffe7a4_0%,rgba(255,231,164,0)_56%),linear-gradient(180deg,#fffef9_0%,#fffdfa_42%,#fff8eb_100%)] px-4 pb-10 pt-12 md:px-8 md:pt-16'>
      <div className='mx-auto flex min-h-[70vh] w-full max-w-[920px] flex-col items-center justify-center'>
        <div className='w-full rounded-[30px] bg-white/55 px-5 py-8 ring-1 ring-white/70 backdrop-blur-md md:px-10 md:py-12'>
          <div className='mx-auto max-w-[760px]'>
            <div className='inline-flex items-center rounded-full bg-amber-100/90 px-3 py-1 text-xs font-semibold tracking-wide text-amber-800'>
              VC查 · 机构匹配搜索
            </div>
            <div
              className='relative mt-4 overflow-hidden rounded-[28px] border border-white/70 bg-white/65 px-5 py-5 shadow-[0_20px_44px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-white/80 md:px-7 md:py-6'
            >
              <div
                className='pointer-events-none absolute -right-10 -top-10 h-28 w-28 animate-[pulse_3.4s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.92),rgba(253,186,116,0.36)_58%,rgba(251,191,36,0.12)_100%)] blur-sm'
              ></div>
              <h1 className='relative text-left text-[28px] font-semibold leading-tight text-slate-900 md:text-[48px]'>
                <span className='block whitespace-nowrap'>老板，</span>
                <span className='block whitespace-nowrap'>今天要谈哪家机构？</span>
              </h1>
            </div>

            <div className='relative mt-8'>
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder=''
                className='h-14 rounded-2xl border-white/45 bg-white/80 px-4 text-base ring-1 ring-white/80'
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    goSearch()
                  }
                }}
              />
              {!trimmedQuery && (
                <div className='pointer-events-none absolute inset-y-0 left-4 right-4 flex items-center text-base text-slate-400'>
                  <span className='select-none tracking-[0.01em] text-slate-400/95'>{placeholderScenes[placeholderIndex].slice(0, placeholderTypedCount)}</span>
                  <span className={`ml-0.5 inline-block h-5 w-[2px] rounded-full bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.45)] transition-opacity duration-150 ${cursorVisible ? 'opacity-100' : 'opacity-20'}`}></span>
                </div>
              )}
              {!!tips.length && (
                <div className='absolute left-0 right-0 top-[62px] z-20 rounded-2xl bg-white/92 p-2 text-left shadow-[0_16px_34px_rgba(15,23,42,0.08)] ring-1 ring-white/90 backdrop-blur'>
                  {tips.map(item => (
                    <button
                      key={item}
                      type='button'
                      className='block w-full rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-amber-50/80'
                      onClick={() => setQuery(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className='mt-5 flex items-center gap-3'>
              <Button type='button' onClick={goSearch} disabled={redirecting} className='min-w-[148px]'>
                {redirecting ? '处理中...' : '开始查询'}
              </Button>
              <Button type='button' variant='secondary' onClick={() => router.push('/intake')} className='min-w-[148px] bg-white/70 text-slate-700 hover:bg-white'>
                先完善资料
              </Button>
            </div>

            {loadingTips && <div className='mt-3 text-left text-xs text-slate-500'>正在加载机构候选...</div>}
            {error && <div className='mt-3 rounded-xl bg-rose-50/85 px-3 py-2 text-sm text-rose-700'>{error}</div>}

            {showGuide && (
              <div className='mt-4 rounded-2xl bg-sky-50/75 px-4 py-3 text-left ring-1 ring-sky-100/80'>
                <div className='text-sm font-medium text-slate-900'>我们会将你的资料按商业机密处理</div>
                <div className='mt-1 text-xs leading-5 text-slate-600'>为了给出可信结论，需要基于你真实上报的团队与融资情况。正在为你进入资料填写页...</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

export default HomePage
