const SiteFooter = () => {
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || 'v0.0.0'
  return (
    <footer className='px-4 pb-4 pt-2 md:px-8'>
      <div className='mx-auto w-full max-w-[940px] text-center text-[11px] font-normal tracking-wide text-slate-400/70'>
        <span>版本 {appVersion}</span>
        <span className='px-1.5'>·</span>
        <span>京ICP备2025141140号</span>
      </div>
    </footer>
  )
}

export default SiteFooter
