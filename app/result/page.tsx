'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { usePwaInstall } from '@/app/components/pwa-install-provider'
import { sendWorkflowMessage } from '@/service'

type SavedPayload = {
  inputs: Record<string, any>
  title?: string
  description?: string
  createdAt?: number
}

type ResultCard = {
  investorName: string
  conclusion: string
  confidence: string
  highlights: string[]
  concerns: string[]
  supplements: string[]
  rank: number
}

const normalizeList = (value: any) => {
  if (Array.isArray(value))
    return value.map(item => `${item}`.trim()).filter(Boolean)
  if (typeof value === 'string')
    return value.split('\n').map(item => item.replace(/^[-•\s]+/, '').trim()).filter(Boolean)
  return []
}

const pick = (obj: Record<string, any>, keys: string[]) => {
  const key = Object.keys(obj || {}).find(item => keys.includes(item))
  return key ? obj[key] : undefined
}

const conclusionOrder = [
  '推荐优先沟通',
  '建议探索性接触',
  '建议补充更多信息后再评估',
  '当前匹配度有限，建议关注其他机构',
  '暂不建议优先推进',
]

const getConclusionRank = (conclusion: string) => {
  const index = conclusionOrder.findIndex(item => item === conclusion)
  return index === -1 ? 99 : index
}

const getConclusionStyle = (conclusion: string) => {
  switch (conclusion) {
    case '推荐优先沟通':
      return 'bg-emerald-50 text-emerald-700'
    case '建议探索性接触':
      return 'bg-amber-50 text-amber-700'
    case '建议补充更多信息后再评估':
      return 'bg-sky-50 text-sky-700'
    case '当前匹配度有限，建议关注其他机构':
      return 'bg-slate-100 text-slate-600'
    case '暂不建议优先推进':
      return 'bg-rose-50 text-rose-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

const parseStructuredOutput = (content: any) => {
  if (typeof content !== 'string')
    return content
  const withoutThink = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  const withoutFence = withoutThink.replace(/```json|```/gi, '').trim()
  const arrayStart = withoutFence.indexOf('[')
  const objectStart = withoutFence.indexOf('{')
  const start = arrayStart === -1
    ? objectStart
    : (objectStart === -1 ? arrayStart : Math.min(arrayStart, objectStart))
  if (start === -1)
    return withoutFence
  const candidate = withoutFence.slice(start).trim()
  try {
    return JSON.parse(candidate)
  }
  catch {
    return withoutFence
  }
}

const toCards = (content: any) => {
  const parsedContent = parseStructuredOutput(content)
  const toCard = (item: any, index: number): ResultCard | null => {
    if (!item || typeof item !== 'object')
      return null
    const conclusion = pick(item, ['match_conclusion', '匹配结论', '结论', 'conclusion']) || ''
    return {
      investorName: pick(item, ['org_name', '机构', '机构名称', 'investor', 'investor_name']) || `机构 ${index + 1}`,
      conclusion,
      confidence: pick(item, ['confidence', '置信度']) || '',
      highlights: normalizeList(pick(item, ['match_highlights', '匹配亮点', '亮点', 'highlights'])),
      concerns: normalizeList(pick(item, ['attention_items', '需关注事项', '关注事项', 'concerns'])),
      supplements: normalizeList(pick(item, ['suggested_info', '建议补充信息', '补充信息', 'supplements'])),
      rank: getConclusionRank(conclusion),
    }
  }

  if (Array.isArray(parsedContent))
    return parsedContent.map((item, index) => toCard(item, index)).filter(Boolean) as ResultCard[]
  if (parsedContent && typeof parsedContent === 'object') {
    const direct = toCard(parsedContent, 0)
    if (direct && (direct.conclusion || direct.highlights.length || direct.concerns.length))
      return [direct]
    const firstArray = Object.values(parsedContent).find(item => Array.isArray(item)) as any[] | undefined
    if (firstArray)
      return firstArray.map((item, index) => toCard(item, index)).filter(Boolean) as ResultCard[]
  }
  return []
}

const ResultPage = () => {
  const router = useRouter()
  const [payload, setPayload] = useState<SavedPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(10)
  const [stepText, setStepText] = useState('正在初始化评估')
  const [rawOutput, setRawOutput] = useState<any>(null)
  const [nodes, setNodes] = useState<string[]>([])
  const [expandedCard, setExpandedCard] = useState<number | null>(0)
  const [installing, setInstalling] = useState(false)
  const { canInstall, isStandalone, isIOS, supportSW, install } = usePwaInstall()

  const cards = useMemo(() => {
    return toCards(rawOutput).sort((a, b) => a.rank - b.rank)
  }, [rawOutput])

  const run = async (currentPayload: SavedPayload) => {
    setLoading(true)
    setError('')
    setProgress(10)
    setStepText('正在校验输入信息')
    setRawOutput(null)
    setNodes([])

    await sendWorkflowMessage(
      { inputs: currentPayload.inputs },
      {
        onWorkflowStarted: () => {
          setProgress(20)
          setStepText('已启动评估流程')
        },
        onNodeStarted: ({ data }) => {
          const nodeLabel = data?.extras?.title || data?.node_type || '节点执行中'
          setNodes(prev => [...prev, nodeLabel])
          setProgress(prev => Math.min(92, prev + 8))
          setStepText(`正在执行：${nodeLabel}`)
        },
        onNodeFinished: () => { },
        onWorkflowFinished: ({ data }) => {
          if (data?.error) {
            setError(data.error)
            setLoading(false)
            return
          }
          const outputs = data?.outputs
          if (!outputs)
            setRawOutput('')
          else if (Object.keys(outputs).length === 1)
            setRawOutput(outputs[Object.keys(outputs)[0]])
          else
            setRawOutput(outputs)
          setProgress(100)
          setStepText('评估完成')
          setLoading(false)
        },
      },
    )
  }

  useEffect(() => {
    document.title = 'VC查｜评估结果'
    const raw = sessionStorage.getItem('vccha_run_payload')
    if (!raw) {
      setLoading(false)
      setError('未找到提交内容，请先返回填写表单')
      return
    }
    const parsed = JSON.parse(raw) as SavedPayload
    setPayload(parsed)
    run(parsed)
  }, [])

  const renderList = (items: string[], emptyText: string) => {
    if (!items.length)
      return <div className='text-sm leading-6 text-slate-500'>{emptyText}</div>
    return (
      <ul className='space-y-1.5 text-sm leading-6 text-slate-700'>
        {items.map(item => (
          <li key={item} className='flex gap-2'>
            <span className='mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300'></span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    )
  }

  const handleInstall = async () => {
    if (installing || isStandalone || !canInstall)
      return
    setInstalling(true)
    await install()
    setInstalling(false)
  }

  return (
    <main className='min-h-screen bg-[radial-gradient(1100px_620px_at_22%_-14%,#ffe6a0_0%,rgba(255,230,160,0)_56%),linear-gradient(180deg,#fffef9_0%,#fffdfa_46%,#fff7e9_100%)] px-4 py-6 md:px-8 md:py-8'>
      <div className='mx-auto w-full max-w-[940px] space-y-4'>
        <section className='rounded-[28px] bg-white/58 px-5 py-5 ring-1 ring-white/70 backdrop-blur-md md:px-7 md:py-6'>
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div className='space-y-2'>
              <div className='inline-flex items-center rounded-full bg-amber-100/90 px-3 py-1 text-xs font-semibold text-amber-800'>VC查结果页</div>
              <h1 className='text-2xl font-semibold text-slate-900 md:text-3xl'>机构匹配结论</h1>
              <p className='text-sm text-slate-600'>{payload?.title || '本次评估'}</p>
            </div>
            <div className='flex flex-col items-end gap-2'>
              {!isStandalone && (
                <button
                  type='button'
                  onClick={handleInstall}
                  disabled={!canInstall || installing}
                  className='h-10 rounded-full bg-amber-100 px-4 text-sm font-semibold text-amber-800 ring-1 ring-amber-200/80 transition enabled:hover:bg-amber-50 disabled:opacity-60'
                >
                  {installing ? '处理中...' : '安装到桌面'}
                </button>
              )}
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() => router.push('/')}
                  className='h-10 rounded-full bg-white/75 px-4 text-sm font-medium text-slate-700 ring-1 ring-white/80 transition hover:bg-white'
                >
                  返回修改表单
                </button>
                <button
                  type='button'
                  onClick={() => payload && run(payload)}
                  className='h-10 rounded-full bg-amber-500 px-4 text-sm font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-400'
                >
                  重新评估
                </button>
              </div>
              {!isStandalone && (
                <p className='text-right text-xs text-slate-500'>
                  建议安装到桌面，后续复访更快。
                </p>
              )}
            </div>
          </div>

          <div className='mt-4 rounded-2xl bg-amber-50/65 px-4 py-3 ring-1 ring-amber-100/70'>
            <div className='mb-2 flex items-center justify-between text-sm'>
              <span className='font-medium text-slate-900'>{stepText}</span>
              <span className='text-slate-600'>{progress}%</span>
            </div>
            <div className='h-2 w-full rounded-full bg-white/90'>
              <div className='h-2 rounded-full bg-amber-500 transition-all duration-500 ease-out' style={{ width: `${progress}%` }}></div>
            </div>
            {!!nodes.length && <div className='mt-2 line-clamp-2 text-xs text-slate-500'>{nodes.slice(-3).join(' · ')}</div>}
            {!isStandalone && (
              <div className='mt-2 text-xs text-slate-500'>
                {canInstall
                  ? '支持一键添加到桌面，方便后续快速查看匹配结果。'
                  : isIOS
                    ? 'iPhone/iPad 请在 Safari 点“分享”后选择“添加到主屏幕”。'
                    : supportSW
                      ? '若未出现一键安装，可在浏览器菜单中选择“安装应用/添加到桌面”。'
                      : '当前浏览器暂不支持桌面安装能力。'}
              </div>
            )}
          </div>

          {error && (
            <div className='mt-4 rounded-2xl bg-rose-50/80 px-3 py-2 text-sm text-rose-700'>{error}</div>
          )}
        </section>

        {!error && loading && (
          <div className='rounded-[26px] bg-white/56 px-5 py-5 text-sm text-slate-500 ring-1 ring-white/70 backdrop-blur-sm md:px-7'>正在生成结果，请稍候...</div>
        )}

        {!error && !loading && (
          <div className='space-y-3 rounded-[26px] bg-white/56 p-4 ring-1 ring-white/70 backdrop-blur-sm md:p-6'>
            {cards.length > 0 && (
              <section className='space-y-3'>
                <div className='flex flex-wrap items-center gap-2 rounded-2xl bg-white/72 px-3 py-2 text-xs text-slate-600 ring-1 ring-white/80'>
                  <span>共 {cards.length} 家候选机构</span>
                  <span>·</span>
                  <span>Top 1：{cards[0]?.investorName || '—'}</span>
                </div>
                {cards.map((card, index) => {
                  const isExpanded = expandedCard === index
                  return (
                    <article key={`${card.investorName}-${index}`} className='rounded-2xl bg-white/70 px-4 py-3 ring-1 ring-white/80 transition-all duration-300 hover:bg-white/85'>
                      <button type='button' onClick={() => setExpandedCard(prev => (prev === index ? null : index))} className='flex w-full items-start justify-between gap-3 text-left'>
                        <div className='min-w-0 space-y-1'>
                          <div className='flex items-center gap-2'>
                            <span className='rounded-full bg-amber-100/90 px-2 py-0.5 text-[11px] font-semibold text-amber-700'>#{index + 1}</span>
                            <div className='truncate text-base font-semibold text-slate-900'>{card.investorName}</div>
                          </div>
                          <div className='mt-1 flex items-center gap-2 text-xs text-slate-500'>
                            <span>置信度 {card.confidence || '—'}</span>
                          </div>
                        </div>
                        <div className='flex flex-col items-end gap-1.5'>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${getConclusionStyle(card.conclusion)}`}>
                            {card.conclusion || '暂无结论'}
                          </span>
                          <span className='inline-flex items-center gap-1 text-xs text-slate-500'>
                            {isExpanded ? '收起详情' : '展开详情'}
                            <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className='mt-3 space-y-3 border-t border-white/80 pt-3'>
                          <div>
                            <div className='text-xs font-semibold tracking-wide text-slate-500'>匹配亮点</div>
                            <div className='mt-1'>{renderList(card.highlights, '—')}</div>
                          </div>
                          <div>
                            <div className='text-xs font-semibold tracking-wide text-slate-500'>需关注事项</div>
                            <div className='mt-1'>{renderList(card.concerns, '无')}</div>
                          </div>
                          <div>
                            <div className='text-xs font-semibold tracking-wide text-slate-500'>建议补充信息</div>
                            <div className='mt-1'>{renderList(card.supplements, '—')}</div>
                          </div>
                        </div>
                      )}
                    </article>
                  )
                })}
              </section>
            )}

            {cards.length === 0 && (
              <pre className='overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-white/78 p-4 text-sm leading-6 text-slate-700 ring-1 ring-white/80'>
                {typeof rawOutput === 'string' ? rawOutput : JSON.stringify(rawOutput, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

export default ResultPage
