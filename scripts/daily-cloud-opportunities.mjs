import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const dataPath = resolve(root, 'src', 'data', 'daily-opportunities.json')
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) throw new Error('OPENAI_API_KEY 未配置')

const report = JSON.parse(await readFile(dataPath, 'utf8'))
if (!Array.isArray(report.items)) throw new Error('商机数据格式错误')

const itemProperties = {
  id: { type: 'string' }, name: { type: 'string' }, region: { type: 'string' }, buyer: { type: 'string' },
  budget: { type: 'string' }, publishedAt: { type: 'string' }, fileDeadline: { type: 'string' }, bidDeadline: { type: 'string' },
  method: { type: 'string' }, category: { type: 'string' }, qualification: { type: 'string' }, jointBid: { type: 'string' },
  score: { type: 'number' }, grade: { type: 'string', enum: ['A', 'B'] }, difficulty: { type: 'string' },
  strength: { type: 'string' }, gap: { type: 'string' }, action: { type: 'string' }, source: { type: 'string' },
  sourceUrl: { type: 'string' }, verifiedAt: { type: 'string' },
}
const schema = {
  type: 'object', additionalProperties: false,
  properties: { items: { type: 'array', items: { type: 'object', additionalProperties: false, properties: itemProperties, required: Object.keys(itemProperties) } } },
  required: ['items'],
}

const today = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', dateStyle: 'full', timeStyle: 'long' }).format(new Date())
const existing = report.items.map(({ id, name, sourceUrl, bidDeadline }) => ({ id, name, sourceUrl, bidDeadline }))
const prompt = `当前北京时间：${today}。
你是江西家具采购商机核验员。使用网页搜索，寻找今天最新发布或仍可参与的江西省采购意向、招标公告、询价、竞争性磋商、电子卖场、框架协议和军队采购信息。吉安市及各县区优先，其次江西其他地区；不要推荐江西省外项目。

必须优先查找并核验官方原始页面：中国政府采购网、全国公共资源交易平台、江西省公共资源交易平台、中国招标投标公共服务平台、军队采购网、江西省政府采购网、江西政府采购电子卖场、吉安市及各县区公共资源交易官方信息。再检查江西高校、职业院校、中小学、医院、卫健、民政、养老机构、福利院、残联、机关事务管理局，以及与江西有关的央企、国企、城投、旅投、文旅集团官方采购平台。不得把第三方转载页作为sourceUrl；无法核验官方原文的项目不要输出。

重点产品：办公家具、医养及适老家具、养老设施、学校和宿舍家具、酒店民宿家具、床、钢制家具、校用家具、图书馆家具、密集架、窗帘、软装；也可保留家具加家电、教学设备、厨房设备等可通过供应链补齐的组合项目。

按吉安市吉州区俊逸办公家具有限公司能力评分：单项目承接边界1000万至2000万元；80至100分为A级，60至79分为B级，低于60分不要输出。所有日期必须区分获取文件截止与投标/响应截止。预算、资格、保证金、联合体、CA电子签章或截止时间不明确时必须写“采购文件未公开，需下载核对”，不得猜测。sourceUrl必须是可直接打开的官方原始公告链接。只输出仍可报名或值得提前跟进的采购意向，最多10条。

现有项目用于去重（相同id或sourceUrl不要重复创建）：${JSON.stringify(existing)}`

const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gpt-5.4',
    tools: [{ type: 'web_search_preview' }],
    input: prompt,
    text: { format: { type: 'json_schema', name: 'daily_opportunities', strict: true, schema } },
    store: false,
  }),
})
const payload = await response.json()
if (!response.ok) throw new Error(`OpenAI 检索失败：${response.status} ${payload?.error?.message || '未知错误'}`)
const outputText = payload.output_text || payload.output?.flatMap(item => item.content || []).find(x => x.type === 'output_text')?.text
if (!outputText) throw new Error('OpenAI 未返回结构化商机数据')
const found = JSON.parse(outputText).items

const merged = new Map(report.items.map(item => [item.id, item]))
for (const item of found) {
  const duplicate = [...merged.values()].find(old => old.sourceUrl === item.sourceUrl)
  merged.set(duplicate?.id || item.id, { ...(duplicate || {}), ...item, id: duplicate?.id || item.id })
}
const updatedAt = new Date().toISOString()
await writeFile(dataPath, `${JSON.stringify({ updatedAt, items: [...merged.values()] }, null, 2)}\n`, 'utf8')
console.log(`云端检索完成：发现 ${found.length} 条，商机库共 ${merged.size} 条`)
