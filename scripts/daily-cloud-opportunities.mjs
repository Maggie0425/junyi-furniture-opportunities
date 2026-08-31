import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'

const root = resolve(import.meta.dirname, '..')
const dataPath = resolve(root, 'src', 'data', 'daily-opportunities.json')
const report = JSON.parse(await readFile(dataPath, 'utf8'))
if (!Array.isArray(report.items)) throw new Error('商机数据格式错误')
const invalidTestIds = new Set(['FREE-0ed7fd846aa64b6368a7b936', 'FREE-a649fe2e7536a246ff9e6f46', 'FREE-fa53603b9776abb66a5ea788', 'FREE-e6c02708ea6e383e6b38dbd1', 'FREE-d617b15b7c4f9c1c7b125e05', 'FREE-98a3ba9bf7e3e0f23bbb704e', 'FREE-67b905b8cb796a8c73835c79', 'FREE-20becaf855d1bcbd0f1146f5'])
report.items = report.items.filter(item => !invalidTestIds.has(item.id))

const keywords = ['家具', '办公桌', '办公椅', '桌椅', '床', '柜', '密集架', '书架', '窗帘', '软装', '宿舍', '养老', '康养', '适老', '民宿', '酒店用品']
const direct = ['家具', '办公桌', '办公椅', '桌椅', '床', '柜', '密集架', '书架', '窗帘', '软装']
const sources = [
  { name: '中国政府采购网', url: 'https://search.ccgp.gov.cn/bxsearch?searchtype=1&page_index=1&bidSort=0&buyerName=&projectId=&pinMu=0&bidType=0&dbselect=bidx&kw=%E5%AE%B6%E5%85%B7', hosts: ['ccgp.gov.cn'] },
  { name: '江西省公共资源交易平台', url: 'https://ggzy.jiangxi.gov.cn/jyxx/002006/002006001/tradeInfo.html', hosts: ['ggzy.jiangxi.gov.cn'] },
  { name: '吉安市企业采购交易服务平台', url: 'https://jagqcg.etrading.cn/jyxx/001004/001004001/', hosts: ['jagqcg.etrading.cn'] },
  { name: '全国公共资源交易平台', url: 'https://www.ggzy.gov.cn/information/html/a/360000/0101/', hosts: ['ggzy.gov.cn'] },
]

const clean = value => String(value || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
const abs = (href, base) => { try { return new URL(href, base).href.split('#')[0] } catch { return '' } }
const sha = value => createHash('sha256').update(value).digest('hex').slice(0, 24)
const todayCN = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date())
const verifiedAt = new Date().toISOString()

async function fetchText(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 18000)
  try {
    const res = await fetch(url, { redirect: 'follow', signal: controller.signal, headers: { 'user-agent': 'Mozilla/5.0 JunyiOpportunityBot/1.0', accept: 'text/html,application/xhtml+xml' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally { clearTimeout(timer) }
}

function linksFrom(html, source) {
  const rows = []
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  for (const match of html.matchAll(re)) {
    const title = clean(match[2] || match[0])
    const url = abs(match[1], source.url)
    if (title.length < 5 || !keywords.some(k => title.includes(k))) continue
    if (!source.hosts.some(host => { try { return new URL(url).hostname.endsWith(host) } catch { return false } })) continue
    const pos = match.index || 0
    rows.push({ title, url, context: clean(html.slice(Math.max(0, pos - 300), pos + match[0].length + 500)) })
  }
  return rows
}

function makeItem(row, source, detail = '') {
  const text = `${row.context} ${detail}`
  const date = text.match(/20\d{2}[-年\/.]\d{1,2}[-月\/.]\d{1,2}/)?.[0]?.replace(/[年\/.]/g, '-').replace('月', '-') || todayCN
  const money = text.match(/(?:预算(?:金额)?|最高限价|采购预算)[：:\s]*([0-9,.]+\s*(?:万元|元))/)?.[1] || '官方列表未公示，需打开原公告或下载采购文件核对'
  const isDirect = direct.some(k => row.title.includes(k))
  const ji = /吉安|吉州|吉水|吉县|泰和|万安|遂川|永新|井冈山|安福|峡江|新干/.test(text)
  const score = isDirect ? (ji ? 90 : 84) : (ji ? 74 : 66)
  const method = /竞争性磋商/.test(text) ? '竞争性磋商' : /询价/.test(text) ? '询价' : /采购意向/.test(text) ? '采购意向' : /公开招标/.test(text) ? '公开招标' : '以官方公告为准'
  return {
    id: `FREE-${sha(row.url)}`, name: row.title, region: ji ? '江西·吉安市（具体县区见原公告）' : '江西省（具体地区见原公告）', buyer: '以官方原始公告为准', budget: money,
    publishedAt: date, fileDeadline: '采购文件未公开或列表未展示，需打开原公告核对', bidDeadline: '采购文件未公开或列表未展示，需打开原公告核对', method,
    category: `免费规则采集发现与俊逸产品范围相关的${isDirect ? '家具类' : '家具配套类'}项目；具体数量、材质、安装及售后要求须以官方采购文件为准`,
    qualification: '需满足政府采购基础资格；特定资质、业绩、人员、保证金、交付期、CA下载和电子签章要求请打开官方原公告并下载采购文件核对，程序不对未公开内容作推测',
    jointBid: '以采购文件为准', score, grade: score >= 80 ? 'A' : 'B', difficulty: score >= 80 ? '★★★' : '★★★★',
    strength: `${ji ? '吉安本地服务响应快；' : ''}现有产品范围与公告标题匹配，金额在1000万至2000万元以内均可评估承接`,
    gap: '预算、详细清单、资格条件和截止时间需由负责人打开采购文件复核', action: '立即打开官方原链接，确认公告仍有效，并记录获取文件截止与投标截止；下载清单后当天完成供货能力判断',
    source: source.name, sourceUrl: row.url, verifiedAt,
  }
}

const found = []
const sourceStatus = []
for (const source of sources) {
  try {
    const html = await fetchText(source.url)
    const rows = linksFrom(html, source).slice(0, 8)
    for (const row of rows) {
      let detail = ''
      try { detail = clean((await fetchText(row.url)).slice(0, 300000)) } catch {}
      const fullText = `${row.title} ${row.context} ${detail}`
      if (!/江西|吉安|吉州|井冈山|南昌|赣州|九江|上饶|宜春|抚州|萍乡|新余|鹰潭|景德镇/.test(fullText)) continue
      if (/流标|废标|终止|中止|更正公告|结果公告|中标公告|成交公告/.test(row.title)) continue
      const item = makeItem(row, source, detail)
      if (item.score >= 60) found.push(item)
    }
    sourceStatus.push(`${source.name}:${rows.length}条候选`)
  } catch (error) {
    sourceStatus.push(`${source.name}:需人工核查(${error.message})`)
  }
}

const merged = new Map(report.items.map(item => [item.id, item]))
for (const item of found) {
  const duplicate = [...merged.values()].find(old => old.sourceUrl === item.sourceUrl)
  merged.set(duplicate?.id || item.id, { ...(duplicate || {}), ...item, id: duplicate?.id || item.id })
}
await writeFile(dataPath, `${JSON.stringify({ updatedAt: verifiedAt, items: [...merged.values()] }, null, 2)}\n`, 'utf8')
console.log(`免费规则采集完成：新增或更新 ${found.length} 条，商机库共 ${merged.size} 条`)
console.log(`来源状态：${sourceStatus.join('；')}`)
