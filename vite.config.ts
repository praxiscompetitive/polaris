import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { setDefaultResultOrder } from 'node:dns'

const CESIUM = 'node_modules/cesium/Build/Cesium'

/** `npm run dev` serves api/*.ts the way Vercel does in production: GET(Request) → Response. */
const devApi = (): Plugin => ({
  name: 'polaris-dev-api',
  configureServer(server) {
    for (const [k, v] of Object.entries(loadEnv(server.config.mode, process.cwd(), ''))) process.env[k] ??= v // .env reaches api/*.ts in dev, as Vercel's settings do in production
    setDefaultResultOrder('ipv4first') // some local networks advertise IPv6 routes that time out (NASA GISS did)
    server.middlewares.use(async (req, res, next) => {
      const m = req.url?.match(/^\/api\/([\w-]+)/)
      if (!m) return next()
      try {
        const mod = await server.ssrLoadModule(`/api/${m[1]}.ts`)
        const r: Response = await mod.GET(new Request(`http://localhost${req.url}`))
        res.statusCode = r.status
        r.headers.forEach((v, k) => res.setHeader(k, v))
        res.end(Buffer.from(await r.arrayBuffer()))
      } catch (e) {
        res.statusCode = 500
        res.end(String(e))
      }
    })
  },
})

export default defineConfig({
  plugins: [
    react(),
    devApi(),
    // node_modules/cesium/Build/Cesium/<dir> is served and built as /cesium/<dir>
    viteStaticCopy({ targets: ['Workers', 'Assets', 'Widgets', 'ThirdParty'].map((d) => ({ src: `${CESIUM}/${d}`, dest: 'cesium', rename: { stripBase: 4 } })) }),
  ],
  // Cesium is one big lazy chunk that only loads inside a Mission view
  build: { chunkSizeWarningLimit: 6000 },
})
