import cloudbaseSDK from '@cloudbase/js-sdk'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const config = name => readFile(resolve(root, 'config', name), 'utf8').then(value => value.trim())
const [env, region, accessKey] = await Promise.all([
  config('cloudbase-env-id.txt'), config('cloudbase-region.txt'), config('cloudbase-service-api-key.txt'),
])
const ids = ['FREE-0ed7fd846aa64b6368a7b936', 'FREE-a649fe2e7536a246ff9e6f46', 'FREE-fa53603b9776abb66a5ea788', 'FREE-e6c02708ea6e383e6b38dbd1', 'FREE-d617b15b7c4f9c1c7b125e05', 'FREE-98a3ba9bf7e3e0f23bbb704e', 'FREE-67b905b8cb796a8c73835c79', 'FREE-20becaf855d1bcbd0f1146f5']
const cloudbase = cloudbaseSDK.init({ env, region, accessKey })
const { error } = await cloudbase.rdb().from('opportunities').delete().in('id', ids)
if (error) throw new Error(`测试误数据清理失败：${error.message || '未知错误'}`)
console.log(`测试误数据清理完成：${ids.length} 条`)
process.exit(0)
