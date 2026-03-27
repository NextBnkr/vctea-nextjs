import 'server-only'

import { cookies, headers } from 'next/headers'
import Negotiator from 'negotiator'
import { match } from '@formatjs/intl-localematcher'
import type { Locale } from '.'
import { i18n } from '.'

const normalizeLanguages = (languages: string[] | undefined) => {
  if (!languages?.length)
    return []
  return languages.filter((item) => {
    const value = item?.trim()
    if (!value || value === '*')
      return false
    try {
      Intl.getCanonicalLocales(value)
      return true
    }
    catch {
      return false
    }
  })
}

export const getLocaleOnServer = (): Locale => {
  // @ts-expect-error locales are readonly
  const locales: string[] = i18n.locales

  let languages: string[] | undefined
  // get locale from cookie
  const localeCookie = cookies().get('locale')
  languages = normalizeLanguages(localeCookie?.value ? [localeCookie.value] : [])

  if (!languages.length) {
    // Negotiator expects plain object so we need to transform headers
    const negotiatorHeaders: Record<string, string> = {}
    headers().forEach((value, key) => (negotiatorHeaders[key] = value))
    // Use negotiator and intl-localematcher to get best locale
    languages = normalizeLanguages(new Negotiator({ headers: negotiatorHeaders }).languages())
  }

  // match locale
  const matchedLocale = match(languages.length ? languages : [i18n.defaultLocale], locales, i18n.defaultLocale) as Locale
  return matchedLocale
}
