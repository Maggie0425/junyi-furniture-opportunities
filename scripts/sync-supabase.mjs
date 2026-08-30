import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const url = (await readFile(resolve(root, 'config', 'supabase-project-url.txt'), 'utf8')).trim()
const serviceKey = (await readFile(resolve(root, 'config', 'supabase-service-role-key.txt'), 'utf8')).trim()
const report = JSON.parse(await readFile(resolve(root, 'src', 'data', 'daily-opportunities.json'), 'utf8'))
if (!url.startsWith('https://') || !serviceKey) throw new Error('Supabase 同步配置不完整')

const rows = report.items.map(item => ({ id: item.id, payload: item, updated_at: report.updatedAt }))
const response = await fetch(`${url}/rest/v1/opportunities?on_conflict=id`, {
  method: 'POST',
  headers: { apikey: serviceKey, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
  body: JSON.stringify(rows),
})
if (!response.ok) throw new Error(`Supabase 同步失败：${response.status} ${(await response.text()).slice(0, 300)}`)
console.log(`Supabase 同步成功，共 ${rows.length} 个项目`)
