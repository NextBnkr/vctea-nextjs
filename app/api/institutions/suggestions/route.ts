import { type NextRequest, NextResponse } from 'next/server'

const institutions = [
  '红杉中国',
  '高瓴创投',
  'IDG资本',
  '源码资本',
  '经纬创投',
  '启明创投',
  '真格基金',
  '峰瑞资本',
  'BAI资本',
  '金沙江创投',
  '五源资本',
  '创新工场',
  '云启资本',
  'DCM中国',
  '顺为资本',
  '纪源资本',
  '蓝驰创投',
  '愉悦资本',
  '青松基金',
  '险峰K2VC',
]

export async function GET(request: NextRequest) {
  const keyword = `${request.nextUrl.searchParams.get('q') || ''}`.trim().toLowerCase()
  const items = keyword
    ? institutions.filter(item => item.toLowerCase().includes(keyword)).slice(0, 12)
    : institutions.slice(0, 10)
  return NextResponse.json({ items })
}
