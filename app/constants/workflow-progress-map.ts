export const WORKFLOW_PROGRESS_TEXT: Record<string, string> = {
  start: '正在校验输入信息',
  llm: '正在分析机构与项目匹配度',
  ifelse: '正在判断关键条件',
  'if-else': '正在判断关键条件',
  code: '正在整理评估结果',
  answer: '正在生成结论卡片',
  end: '正在完成输出',
}

export const getProgressText = (nodeType?: string, nodeTitle?: string) => {
  if (nodeType && WORKFLOW_PROGRESS_TEXT[nodeType])
    return WORKFLOW_PROGRESS_TEXT[nodeType]
  if (nodeTitle)
    return `正在处理：${nodeTitle}`
  return '正在生成评估结果'
}
