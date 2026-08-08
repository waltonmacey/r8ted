import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base must equal the GitHub repo name for Pages.
// If you rename the repo, change this string to match.
export default defineConfig({
  base: '/r8ted/',
  plugins: [react()],
})
