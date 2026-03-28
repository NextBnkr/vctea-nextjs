import type { Viewport } from 'next'

import { PwaInstallProvider } from '@/app/components/pwa-install-provider'
import SiteFooter from '@/app/components/site-footer'
import { getLocaleOnServer } from '@/i18n/server'

import './styles/globals.css'
import './styles/markdown.scss'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffe7a4',
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
        <PwaInstallProvider>
          <div className='flex min-h-screen min-w-[300px] flex-col overflow-x-hidden'>
            <div className='flex-1'>
              {children}
            </div>
            <SiteFooter />
          </div>
        </PwaInstallProvider>
      </body>
    </html>
  )
}

export default LocaleLayout
