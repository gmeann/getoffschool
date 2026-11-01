import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * GitHub Pages 배포 경로 설정
 * - 레포 이름이 바뀌면 REPO_NAME 한 줄만 고치면 됩니다.
 * - 또는 빌드할 때 환경변수 BASE_PATH 로 덮어쓸 수 있습니다. (예: BASE_PATH=/my-repo/ npm run build)
 * - GitHub Actions 워크플로는 레포 이름을 자동으로 읽어 BASE_PATH 에 넣어 줍니다.
 */
const REPO_NAME = 'getoffschool'

export default defineConfig(({ command }) => ({
  base: process.env.BASE_PATH ?? (command === 'build' ? `/${REPO_NAME}/` : '/'),
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
  },
}))
