import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

const distDir = resolve(import.meta.dirname, '..', 'dist')
const serverDir = resolve(distDir, 'server')
const clientDir = resolve(distDir, 'client')

// Sites serves static files from dist/client and executes dist/server/index.js.
// Vite emits static files directly into dist, so place them in the layout the
// hosting runtime expects while keeping deployment metadata at dist/.openai.
await rm(clientDir, { recursive: true, force: true })
await mkdir(clientDir, { recursive: true })
for (const entry of await readdir(distDir, { withFileTypes: true })) {
  if (['.openai', 'client', 'server'].includes(entry.name)) continue
  await rename(resolve(distDir, entry.name), resolve(clientDir, basename(entry.name)))
}

await mkdir(serverDir, { recursive: true })
await writeFile(resolve(serverDir, 'index.js'), `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)
    if (response.status !== 404) return response
    const url = new URL(request.url)
    url.pathname = '/index.html'
    return env.ASSETS.fetch(new Request(url, request))
  }
}\n`)
