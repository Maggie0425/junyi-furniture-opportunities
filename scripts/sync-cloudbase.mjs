import cloudbaseSDK from '@cloudbase/js-sdk'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const config = name => readFile(resolve(root, 'config', name), 'utf8').then(value => value.trim())
const [env, region, accessKey, reportText] = await Promise.all([
  config('cloudbase-env-id.txt'),
  config('cloudbase-region.txt'),
  config('cloudbase-service-api-key.txt'),
  readFile(resolve(root, 'src', 'data', 'daily-opportunities.json'), 'utf8'),
])

if (!env || !region || !accessKey) throw new Error('CloudBase 同步配置不完整')
const report = JSON.parse(reportText)
if (!Array.isArray(report.items)) throw new Error('商机数据格式不正确')

const cloudbase = cloudbaseSDK.init({ env, region, accessKey })
const rows = report.items.map(item => ({ id: item.id, payload: item, updated_at: report.updatedAt }))
const { error } = await cloudbase.rdb().from('opportunities').upsert(rows, { onConflict: 'id' })
if (error) throw new Error(`CloudBase 同步失败：${error.message || '未知错误'}`)
console.log(`CloudBase 同步成功，共 ${rows.length} 个项目`)
process.exit(0)
