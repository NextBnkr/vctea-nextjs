import type { IOnCompleted, IOnData, IOnError, IOnNodeFinished, IOnNodeStarted, IOnWorkflowFinished, IOnWorkflowStarted } from './base'
import { get, post, ssePost } from './base'
import type { Feedbacktype } from '@/types/app'

export type PrefillResponse = {
  outputs: Record<string, any>
  meta: {
    confidence: number
    missingFields: string[]
    reasoningBrief: string
  }
  error?: string
}

export type InstitutionSuggestionResponse = {
  items: string[]
}

export const sendCompletionMessage = async (body: Record<string, any>, { onData, onCompleted, onError }: {
  onData: IOnData
  onCompleted: IOnCompleted
  onError: IOnError
}) => {
  return ssePost('completion-messages', {
    body: {
      ...body,
      response_mode: 'streaming',
    },
  }, { onData, onCompleted, onError })
}

export const sendWorkflowMessage = async (
  body: Record<string, any>,
  {
    onWorkflowStarted,
    onNodeStarted,
    onNodeFinished,
    onWorkflowFinished,
  }: {
    onWorkflowStarted: IOnWorkflowStarted
    onNodeStarted: IOnNodeStarted
    onNodeFinished: IOnNodeFinished
    onWorkflowFinished: IOnWorkflowFinished
  },
) => {
  return ssePost('workflows/run', {
    body: {
      ...body,
      response_mode: 'streaming',
    },
  }, { onNodeStarted, onWorkflowStarted, onWorkflowFinished, onNodeFinished })
}

export const fetchAppParams = async () => {
  return get('parameters')
}

export const runPrefillWorkflow = async (inputs: Record<string, any>) => {
  return post('workflows/prefill', { body: { inputs } }) as Promise<PrefillResponse>
}

export const fetchInstitutionSuggestions = async (keyword: string) => {
  return get('institutions/suggestions', {
    params: {
      q: keyword,
    },
  }) as Promise<InstitutionSuggestionResponse>
}

export const updateFeedback = async ({ url, body }: { url: string; body: Feedbacktype }) => {
  return post(url, { body })
}
