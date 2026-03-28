import type { Viewport } from 'next'

import { getLocaleOnServer } from '@/i18n/server'

import './styles/globals.css'
import './styles/markdown.scss'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

const LocaleLayout = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const locale = getLocaleOnServer()
  return (
    <html lang={locale ?? 'en'} className='h-full'>
      <body className='min-h-screen'>
        <div className='min-h-screen min-w-[300px] overflow-x-hidden'>
          {children}
        </div>
      </body>
    </html>
  )
}

export default LocaleLayout
