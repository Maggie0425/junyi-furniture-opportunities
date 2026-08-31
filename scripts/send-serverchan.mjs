import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const readOptional = async path => readFile(path, 'utf8').catch(error => {
  if (error?.code === 'ENOENT') return ''
  throw error
})
const singleKey = await readOptional(resolve(root, 'config', 'serverchan-sendkey.txt'))
const multipleKeys = await readOptional(resolve(root, 'config', 'serverchan-sendkeys.txt'))
const sendKeys = [...new Set(`${singleKey}\n${multipleKeys}`.split(/\r?\n/).map(value => value.trim()).filter(Boolean))]
if (!sendKeys.length || sendKeys.some(key => !/^SCT[0-9A-Za-z_-]+$/.test(key))) {
  throw new Error('Server酱Turbo SendKey 尚未配置或格式不正确')
}

const report = JSON.parse(await readFile(resolve(root, 'src', 'data', 'daily-opportunities.json'), 'utf8'))
const rows = report.items.slice(0, 8).map((item, index) => [
  `### ${index + 1}. ${item.grade}级｜${item.score}分｜${item.name}`,
  `- 地区：${item.region}`,
  `- 采购人：${item.buyer}`,
  `- 预算/限价：${item.budget}`,
  `- 项目概括：${item.category}`,
  `- 获取文件截止：${item.fileDeadline}`,
  `- 投标/响应截止：${item.bidDeadline}`,
  `- 要求说明：${item.qualification}；联合体：${item.jointBid}`,
  `- 主要缺口：${item.gap}`,
  `- 建议动作：${item.action}`,
  `- [打开官方原公告](${item.sourceUrl})`,
].join('\n')).join('\n\n---\n\n')

const params = new URLSearchParams({
  title: `江西家具采购商机日报（${report.items.length}项）`,
  desp: `更新时间：${report.updatedAt}\n\n${rows || '今日没有达到推送标准的新项目。'}\n\n> 投标前请重新核对官方原始公告及采购文件。`,
})
const results = await Promise.allSettled(sendKeys.map(async sendKey => {
  const response = await fetch(`https://sctapi.ftqq.com/${sendKey}.send`, { method: 'POST', body: params })
  const result = await response.json()
  if (!response.ok || result.code !== 0) throw new Error('Server酱接口返回失败')
}))
const failed = results.filter(result => result.status === 'rejected').length
if (failed) throw new Error(`Server酱推送失败：${failed} 个接收账号未成功`)
console.log(`Server酱推送成功，共 ${report.items.length} 个项目，已发送至 ${sendKeys.length} 个接收账号`)
