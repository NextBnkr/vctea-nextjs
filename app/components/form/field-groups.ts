import type { PromptVariable } from '@/types/app'

const matchByName = (name: string, keywords: string[]) => keywords.some(keyword => name.includes(keyword))

export const getFieldRole = (item: PromptVariable) => {
  const name = (item.name || '').toLowerCase()
  if (matchByName(name, ['赛道', '领域', '方向']))
    return 'track'
  if (matchByName(name, ['轮次', '融资轮']))
    return 'stage'
  if (matchByName(name, ['金额', '融资额', '目标金额']))
    return 'amount'
  if (matchByName(name, ['机构', '投资方', '投资机构']))
    return 'investors'
  if (matchByName(name, ['成熟度']))
    return 'maturity'
  if (matchByName(name, ['一句话', '描述', '简介']))
    return 'summary'
  if (matchByName(name, ['所在地', '城市', '地域', '地区']))
    return 'location'
  if (matchByName(name, ['架构', 'vIE'.toLowerCase(), '纯内资', '红筹']))
    return 'structure'
  if (matchByName(name, ['团队', '背景', '经历']))
    return 'team'
  if (matchByName(name, ['runway']))
    return 'runway'
  if (matchByName(name, ['需求']))
    return 'needs'
  return 'other'
}

export const getMinimalAndAdvancedFields = (fields: PromptVariable[]) => {
  const minimalRoles = ['track', 'stage', 'amount', 'investors']
  const chosenMinimal = new Set<string>()
  const minimal: PromptVariable[] = []
  const advanced: PromptVariable[] = []

  fields.forEach((item) => {
    const role = getFieldRole(item)
    if (minimalRoles.includes(role) && !chosenMinimal.has(role)) {
      chosenMinimal.add(role)
      minimal.push(item)
      return
    }
    advanced.push(item)
  })

  if (minimal.length < 4) {
    const remain = advanced.filter(item => !minimal.find(min => min.key === item.key))
    while (minimal.length < 4 && remain.length > 0) {
      const item = remain.shift() as PromptVariable
      minimal.push(item)
      const targetIndex = advanced.findIndex(adv => adv.key === item.key)
      if (targetIndex > -1)
        advanced.splice(targetIndex, 1)
    }
  }

  return { minimal, advanced }
}

export const getDefaultValueByRole = (name: string) => {
  const role = getFieldRole({ key: '', name, type: 'string' })
  if (role === 'maturity')
    return '已验证PMF但无收入'
  if (role === 'location')
    return '深圳'
  if (role === 'structure')
    return '纯内资'
  if (role === 'runway')
    return '3-6个月'
  return ''
}
