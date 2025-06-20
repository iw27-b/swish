import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        env: {
            JWT_SECRET: 'uNwENBngDJuxa2vsk4DTssUIhp0R90/GiEb1h0qxseg=',
            JWT_REFRESH_SECRET: 'RefreshKey123456789AbCdEfGhIjKlMnOpQrStUvWxYz=',
        },
        setupFiles: ['./tests/setup.ts'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
})
