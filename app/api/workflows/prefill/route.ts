import { type NextRequest, NextResponse } from 'next/server'
import { getInfo, prefillClient, setSession } from '@/app/api/utils/common'

const tryParseJson = (value: any) => {
  if (typeof value !== 'string')
    return value
  try {
    return JSON.parse(value)
  }
  catch {
    return value
  }
}

const normalizeOutputs = (rawData: any) => {
  const outputs = rawData?.data?.outputs ?? rawData?.outputs ?? rawData
  const parsed = tryParseJson(outputs)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const textValue = (parsed as Record<string, any>).text
    if (typeof textValue === 'string') {
      const cleanedText = textValue.replace(/```json|```/gi, '').trim()
      const nested = tryParseJson(cleanedText)
      if (nested && typeof nested === 'object' && !Array.isArray(nested))
        return nested as Record<string, any>
    }
    return parsed as Record<string, any>
  }
  if (typeof parsed === 'string') {
    const cleaned = parsed.replace(/```json|```/gi, '').trim()
    const reparsed = tryParseJson(cleaned)
    if (reparsed && typeof reparsed === 'object' && !Array.isArray(reparsed))
      return reparsed as Record<string, any>
  }
  return {}
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { inputs } = body
  const { sessionId, user } = getInfo(request)
  try {
    const { data } = await prefillClient.runWorkflow(inputs || {}, user, false)
    const outputs = normalizeOutputs(data)
    const confidence = Number(outputs.confidence ?? 0)
    const missingFields = Array.isArray(outputs.missing_fields)
      ? outputs.missing_fields.map((item: any) => `${item}`.trim()).filter(Boolean)
      : []
    const reasoningBrief = `${outputs.reasoning_brief || ''}`.trim()
    return NextResponse.json({
      outputs,
      meta: {
        confidence: Number.isNaN(confidence) ? 0 : confidence,
        missingFields,
        reasoningBrief,
      },
    }, {
      headers: setSession(sessionId),
    })
  }
  catch (error: any) {
    return NextResponse.json({
      outputs: {},
      meta: {
        confidence: 0,
        missingFields: [],
        reasoningBrief: '',
      },
      error: `${error?.message || 'prefill_failed'}`,
    }, {
      status: 500,
      headers: setSession(sessionId),
    })
  }
}
