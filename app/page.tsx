'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { usePwaInstall } from '@/app/components/pwa-install-provider'
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
  '查查XX机构有没有投过你的竞对？',
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
  const [showTips, setShowTips] = useState(false)
  const [loadingTips, setLoadingTips] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [showInterceptModal, setShowInterceptModal] = useState(false)
  const [pendingOrgName, setPendingOrgName] = useState('')
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [placeholderTypedCount, setPlaceholderTypedCount] = useState(0)
  const [placeholderPhase, setPlaceholderPhase] = useState<'typing' | 'hold' | 'deleting' | 'switching'>('typing')
  const [cursorVisible, setCursorVisible] = useState(true)
  const [installing, setInstalling] = useState(false)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [installModalTitle, setInstallModalTitle] = useState('添加到桌面')
  const [installModalMessage, setInstallModalMessage] = useState('')
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const trimmedQuery = useMemo(() => query.trim(), [query])
  const { canInstall, isStandalone, supportSW, install } = usePwaInstall()

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
      setShowTips(false)
      setLoadingTips(false)
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

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!searchWrapRef.current)
        return
      if (searchWrapRef.current.contains(event.target as Node))
        return
      setShowTips(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [])

  const goSearch = () => {
    if (showInterceptModal)
      return
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
    setRedirecting(false)
    setPendingOrgName(trimmedQuery)
    setShowInterceptModal(true)
    sessionStorage.setItem(PENDING_ORG_KEY, trimmedQuery)
  }

  const goIntakeFromModal = () => {
    const org = pendingOrgName || trimmedQuery
    setRedirecting(true)
    router.push(`/intake?org=${encodeURIComponent(org)}`)
  }

  const openInstallModal = (title: string, message: string) => {
    setInstallModalTitle(title)
    setInstallModalMessage(message)
    setShowInstallModal(true)
  }

  const handleInstall = async () => {
    if (installing || isStandalone)
      return
    const ua = navigator.userAgent.toLowerCase()
    const isEdge = ua.includes('edg/')
    const isOpera = ua.includes('opr/') || ua.includes('opera')
    const isChrome = ua.includes('chrome') && !isEdge && !isOpera
    if (isChrome) {
      setShowInstallModal(false)
      setInstalling(true)
      await install()
      setInstalling(false)
      return
    }
    if (!canInstall) {
      const isWeChat = ua.includes('micromessenger')
      const isMiniProgram = ua.includes('miniprogram')
      const isWebKit = ua.includes('applewebkit')
      if (isWeChat || isMiniProgram) {
        openInstallModal('请先在浏览器打开', '当前在微信环境中，请点击右上角“...”选择“在浏览器打开”，再点击“添加到桌面”。')
        return
      }
      if (isWebKit) {
        openInstallModal('添加到桌面指引', '请点击浏览器“分享”，再选择“添加到主屏幕”。')
        return
      }
      if (supportSW) {
        openInstallModal('添加到桌面指引', '请在浏览器菜单中选择“安装应用/添加到桌面”。')
        return
      }
      openInstallModal('当前暂不支持', '当前浏览器暂不支持添加到桌面能力。')
      return
    }
    setShowInstallModal(false)
    setInstalling(true)
    await install()
    setInstalling(false)
  }

  return (
    <main className='min-h-screen bg-[radial-gradient(1200px_680px_at_28%_-18%,#ffe7a4_0%,rgba(255,231,164,0)_56%),linear-gradient(180deg,#fffef9_0%,#fffdfa_42%,#fff8eb_100%)] px-4 pb-10 pt-12 md:px-8 md:pt-16'>
      <div className='mx-auto flex min-h-[70vh] w-full max-w-[920px] flex-col items-center justify-center'>
        <div className='w-full rounded-[30px] bg-white/55 px-5 py-8 ring-1 ring-white/70 backdrop-blur-md md:px-10 md:py-12'>
          <div className='mx-auto max-w-[760px]'>
            <div className='flex items-center justify-between gap-3'>
              <div className='inline-flex items-center rounded-full bg-amber-100/90 px-3 py-1 text-xs font-semibold tracking-wide text-amber-800'>
                VC查 · 机构匹配搜索
              </div>
              {!isStandalone && (
                <Button
                  type='button'
                  variant='secondary'
                  onClick={handleInstall}
                  disabled={installing}
                  className='h-8 rounded-full bg-transparent px-2 text-xs font-medium text-slate-500 hover:bg-transparent hover:text-slate-700'
                >
                  <ArrowDownTrayIcon className='mr-1 h-3.5 w-3.5' />
                  {installing ? '处理中...' : '安装到桌面'}
                </Button>
              )}
            </div>
            <div
              className='relative mt-4 overflow-hidden rounded-[28px] border border-white/70 bg-white/65 px-5 py-5 shadow-[0_20px_44px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-white/80 md:px-7 md:py-6'
            >
              <div
                className='pointer-events-none absolute -right-10 -top-10 h-28 w-28 animate-[pulse_3.4s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.92),rgba(253,186,116,0.36)_58%,rgba(251,191,36,0.12)_100%)] blur-sm'
              ></div>
              <h1 className='relative text-left text-[28px] font-semibold leading-tight text-slate-900 md:text-[48px]'>
                <span className='block whitespace-nowrap'>老师，</span>
                <span className='block whitespace-nowrap'>今天要谈哪家机构？</span>
              </h1>
            </div>

            <div ref={searchWrapRef} className='relative mt-8'>
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setShowTips(true)
                  if (error)
                    setError('')
                }}
                onFocus={() => {
                  if (tips.length)
                    setShowTips(true)
                }}
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
                  <span className='inline-block max-w-[calc(100%-6px)] select-none truncate whitespace-nowrap align-middle tracking-[0.01em] text-slate-400/95'>{placeholderScenes[placeholderIndex].slice(0, placeholderTypedCount)}</span>
                  <span className={`ml-0.5 inline-block h-5 w-[2px] shrink-0 rounded-full bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.45)] transition-opacity duration-150 ${cursorVisible ? 'opacity-100' : 'opacity-20'}`}></span>
                </div>
              )}
              {showTips && !!tips.length && (
                <div className='absolute left-0 right-0 top-[62px] z-20 rounded-2xl bg-white/92 p-2 text-left shadow-[0_16px_34px_rgba(15,23,42,0.08)] ring-1 ring-white/90 backdrop-blur'>
                  {tips.map(item => (
                    <button
                      key={item}
                      type='button'
                      className='block w-full rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-amber-50/80'
                      onClick={() => {
                        setQuery(item)
                        setShowTips(false)
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className='mt-8 flex flex-col items-center gap-5'>
              <Button type='button' onClick={goSearch} disabled={redirecting || showInterceptModal} className='flex h-12 w-auto min-w-[140px] items-center justify-center rounded-2xl px-6 text-base font-semibold'>
                {redirecting
                  ? '处理中...'
                  : (
                    <>
                      <MagnifyingGlassIcon className='mr-2 h-5 w-5' />
                      开始查询
                    </>
                  )}
              </Button>
              <button
                type='button'
                onClick={() => router.push('/intake')}
                className='block text-center text-sm font-medium leading-none text-slate-500 transition hover:text-slate-700'
              >
                想获得更多信息？先完善资料
              </button>
            </div>

            <div className='relative w-full h-0'>
              {loadingTips && <div className='absolute left-0 top-3 text-left text-xs text-slate-500'>正在加载机构候选...</div>}
            </div>
            {error && <div className='mt-3 rounded-xl bg-rose-50/85 px-3 py-2 text-sm text-rose-700'>{error}</div>}

          </div>
        </div>
      </div>
      {showInterceptModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.52)] px-4'>
          <div className='relative w-full max-w-[500px] overflow-hidden rounded-[30px] border border-amber-100 bg-white px-5 py-6 shadow-[0_30px_70px_rgba(15,23,42,0.28)] ring-1 ring-white md:px-7 md:py-7'>
            <div className='pointer-events-none absolute -right-12 -top-10 h-28 w-28 animate-[pulse_3.4s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.9),rgba(253,186,116,0.34)_58%,rgba(251,191,36,0.12)_100%)] blur-sm'></div>
            <div className='relative inline-flex items-center rounded-full bg-amber-100/92 px-3 py-1 text-xs font-semibold tracking-wide text-amber-800'>
              VC查 · 资料保密说明
            </div>
            <h2 className='relative mt-4 text-[26px] font-semibold leading-tight text-slate-900 md:text-[34px]'>
              请先完善资料
            </h2>
            <p className='relative mt-4 space-y-1.5 text-sm leading-8 text-slate-800 md:text-[15px]'>
              <span className='block'>
                VC 机构侧信息属于
                <strong className='font-semibold text-slate-900'>高度商业机密</strong>
                ，不能公开展示。
              </span>
              <span className='block'>
                我们会基于你补充的
                <strong className='font-semibold text-slate-900'>项目材料</strong>
                进行分析，
              </span>
              <span className='block'>
                返回更贴合你情况的搜索建议与
                <strong className='font-semibold text-slate-900'>匹配结论</strong>
                。
              </span>
            </p>
            <div className='relative mt-6'>
              <Button type='button' onClick={goIntakeFromModal} disabled={redirecting} className='h-12 w-full rounded-2xl text-base font-semibold'>
                {redirecting ? '处理中...' : '我知道了，去完善资料'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {showInstallModal && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(15,23,42,0.52)] px-4'>
          <div className='relative w-full max-w-[460px] overflow-hidden rounded-[30px] border border-amber-100 bg-white px-5 py-6 shadow-[0_30px_70px_rgba(15,23,42,0.28)] ring-1 ring-white md:px-7 md:py-7'>
            <div className='pointer-events-none absolute -right-12 -top-10 h-28 w-28 animate-[pulse_3.4s_ease-in-out_infinite] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.9),rgba(253,186,116,0.34)_58%,rgba(251,191,36,0.12)_100%)] blur-sm'></div>
            <div className='relative inline-flex items-center rounded-full bg-amber-100/92 px-3 py-1 text-xs font-semibold tracking-wide text-amber-800'>
              VC查 · 安装说明
            </div>
            <h2 className='relative mt-4 text-[24px] font-semibold leading-tight text-slate-900 md:text-[30px]'>
              {installModalTitle}
            </h2>
            <p className='relative mt-3 text-sm leading-7 text-slate-800 md:text-[15px]'>
              {installModalMessage}
            </p>
            <div className='relative mt-6'>
              <Button type='button' onClick={() => setShowInstallModal(false)} className='h-11 w-full rounded-2xl text-base font-semibold'>
                我知道了
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default HomePage
