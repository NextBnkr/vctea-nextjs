import { ImageResponse } from 'next/og'

export const contentType = 'image/png'
export const size = {
  width: 180,
  height: 180,
}

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #fbbf24 0%, #f59e0b 52%, #ea580c 100%)',
          color: '#ffffff',
          fontSize: 76,
          fontWeight: 700,
          borderRadius: 42,
        }}
      >
        VC
      </div>
    ),
    size,
  )
}
