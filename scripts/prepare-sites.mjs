import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const serverDir = resolve(import.meta.dirname, '..', 'dist', 'server')
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
