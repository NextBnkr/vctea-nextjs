import { ImageResponse } from 'next/og'

export const contentType = 'image/png'
export const size = {
  width: 512,
  height: 512,
}

export default function Icon() {
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
          fontSize: 230,
          fontWeight: 700,
          borderRadius: 120,
        }}
      >
        VC
      </div>
    ),
    size,
  )
}
