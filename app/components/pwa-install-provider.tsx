'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type PwaInstallContextValue = {
  canInstall: boolean
  isStandalone: boolean
  isIOS: boolean
  supportSW: boolean
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}

const PwaInstallContext = createContext<PwaInstallContextValue>({
  canInstall: false,
  isStandalone: false,
  isIOS: false,
  supportSW: false,
  install: async () => 'unavailable',
})

const isIOSDevice = () => {
  if (typeof navigator === 'undefined')
    return false
  const ua = navigator.userAgent || ''
  return /iPhone|iPad|iPod/i.test(ua)
}

const isStandaloneMode = () => {
  if (typeof window === 'undefined')
    return false
  const iOSStandalone = typeof navigator !== 'undefined' && (navigator as any).standalone === true
  return iOSStandalone || window.matchMedia('(display-mode: standalone)').matches
}

export const PwaInstallProvider = ({ children }: { children: React.ReactNode }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [supportSW, setSupportSW] = useState(false)

  useEffect(() => {
    setIsIOS(isIOSDevice())
    setIsStandalone(isStandaloneMode())
    setSupportSW(typeof navigator !== 'undefined' && 'serviceWorker' in navigator)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator))
      return
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined')
      return
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }
    const onAppInstalled = () => {
      setIsStandalone(true)
      setDeferredPrompt(null)
    }
    const onVisibilityChange = () => {
      if (!document.hidden)
        setIsStandalone(isStandaloneMode())
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const value = useMemo<PwaInstallContextValue>(() => ({
    canInstall: !!deferredPrompt && !isStandalone,
    isStandalone,
    isIOS,
    supportSW,
    install: async () => {
      if (!deferredPrompt)
        return 'unavailable'
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      if (choice.outcome === 'accepted')
        setIsStandalone(true)
      return choice.outcome
    },
  }), [deferredPrompt, isIOS, isStandalone, supportSW])

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  )
}

export const usePwaInstall = () => useContext(PwaInstallContext)
