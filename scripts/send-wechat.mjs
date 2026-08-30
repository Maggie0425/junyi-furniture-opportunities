import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const webhookPath = resolve(root, 'config', 'wechat-webhook.txt')
const dataPath = resolve(root, 'src', 'data', 'daily-opportunities.json')

const webhook = (await readFile(webhookPath, 'utf8')).trim()
if (!/^https:\/\/qyapi\.weixin\.qq\.com\/cgi-bin\/webhook\/send\?key=/.test(webhook)) {
  throw new Error('企业微信 Webhook 地址无效或尚未配置')
}

const report = JSON.parse(await readFile(dataPath, 'utf8'))
const rows = report.items.slice(0, 8).map((item, index) => [
  `${index + 1}. **${item.grade}级｜${item.score}分｜${item.name}**`,
  `> ${item.region}｜${item.budget}｜截止：${item.bidDeadline}`,
  `> 建议：${item.action}`,
  `[查看官方公告](${item.sourceUrl})`,
].join('\n')).join('\n\n')

const content = [
  `## 江西家具采购商机日报`,
  `更新时间：${report.updatedAt}`,
  rows || '今日没有达到推送标准的新项目。',
  '',
  '投标前请重新核对官方原始公告及采购文件。',
].join('\n').slice(0, 4000)

const response = await fetch(webhook, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ msgtype: 'markdown', markdown: { content } }),
})
const result = await response.json()
if (!response.ok || result.errcode !== 0) throw new Error(`微信推送失败：${JSON.stringify(result)}`)
console.log(`微信推送成功，共 ${report.items.length} 个项目`)
