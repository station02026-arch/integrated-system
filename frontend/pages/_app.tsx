// frontend/pages/_app.tsx (フルコード)

import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { AuthContainer } from '@/components/AuthContainer' // ★追加

export default function App({ Component, pageProps }: AppProps) {
  return (
    // ★AuthContainerでアプリケーション全体をラップする
    <AuthContainer> 
      <Component {...pageProps} />
    </AuthContainer>
  )
}