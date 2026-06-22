/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// dev proxy: /api → FastAPI(localhost:8000) (requirements-3 Q2=A)
export default defineConfig({
  plugins: [react()],
  // 이 환경의 리버스 프록시 규약상 프론트는 `/app/` 경로에서 서빙된다(백엔드 StaticFiles mount).
  // 자산 URL이 /app/assets/... 로 생성되도록 base 고정. (순수 정적 배포(nginx Dockerfile)는 '/'이지만
  // 거기서도 /app base는 동작 — 일관성 위해 통일.)
  base: '/app/',
  server: {
    // 원격/프록시 도메인(CloudFront 등)으로 dev 서버에 접속할 때 호스트 차단 해제.
    // 로컬 데모/터널 환경 편의용 — 프로덕션은 nginx(Dockerfile)로 서빙하므로 영향 없음.
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  // preview(프로덕션 빌드 서빙) — CloudFront 등 프록시 환경에서 dev 서버의 /@vite/* 특수 경로
  // 404 문제를 피하기 위해 빌드 산출물을 정적 서빙. dev와 동일하게 /api 프록시·호스트 허용.
  preview: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
