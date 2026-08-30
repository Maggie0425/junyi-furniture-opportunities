import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import './App.css'
import './opportunities.css'

const SUPABASE_URL = 'https://scdimnaaguqkrkrkwmys.supabase.co'
const SUPABASE_KEY = 'sb_publishable_LuvNHuxGTfuNkh_f209pKQ_rni5o0-k'
const ALLOWED_EMAILS = ['1731028510@qq.com', '3282695806@qq.com']
const tabs = ['工作台', '采购项目库', '项目匹配', '客户与跟进', '企业资料', '报价与统计', '系统设置']

type Opportunity = {
  id: string; name: string; region: string; buyer: string; budget: string
  publishedAt: string; fileDeadline: string; bidDeadline: string; method: string
  category: string; qualification: string; jointBid: string; score: number
  grade: string; difficulty: string; strength: string; gap: string; action: string
  source: string; sourceUrl: string; verifiedAt: string
}
type Session = { access_token: string; refresh_token: string; expires_in: number; user: { email?: string } }

async function api(path: string, init: RequestInit = {}, token?: string) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token || SUPABASE_KEY}`, 'Content-Type': 'application/json', ...init.headers },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || '请求失败，请稍后重试')
  return data
}
function loadSession(): Session | null { try { return JSON.parse(localStorage.getItem('junyiSession') || 'null') } catch { return null } }

function Login() {
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  const sendCode = async (event: FormEvent) => {
    event.preventDefault(); const normalized = email.trim().toLowerCase()
    if (!ALLOWED_EMAILS.includes(normalized)) return setError('该邮箱未获得访问授权')
    setBusy(true); setError('')
    try { await api(`/auth/v1/otp?redirect_to=${encodeURIComponent(location.origin)}`, { method: 'POST', body: JSON.stringify({ email: normalized, create_user: true }) }); setEmail(normalized); setSent(true) }
    catch (e) { setError(e instanceof Error ? e.message : '验证码发送失败') } finally { setBusy(false) }
  }
  return <main className="login-page"><section className="login-card"><div className="login-brand">俊逸</div><small>JUNYI OPPORTUNITY OS</small><h1>采购商机系统</h1><p>仅限授权人员使用。系统会向已登记邮箱发送一次性安全登录链接。</p>{!sent ? <form onSubmit={sendCode}><label>授权邮箱<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="请输入授权邮箱" required autoComplete="email" /></label><button disabled={busy}>{busy ? '正在发送…' : '发送登录链接'}</button></form> : <div className="mail-sent"><b>登录邮件已发送</b><p>请打开 <strong>{email}</strong> 的收件箱并点击邮件中的 Sign in 链接。链接只能使用一次。</p><button type="button" className="text-button" onClick={() => { setSent(false); setError('') }}>更换邮箱</button></div>}{error && <p className="login-error">{error}</p>}<footer>吉安市吉州区俊逸办公家具有限公司</footer></section></main>
}

function Table({ items }: { items: Opportunity[] }) {
  const [registered, setRegistered] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('registeredBids') || '[]') } catch { return [] } })
  const mark = (id: string) => { const next = [...new Set([...registered, id])]; setRegistered(next); localStorage.setItem('registeredBids', JSON.stringify(next)) }
  const restore = (id: string) => { const next = registered.filter(x => x !== id); setRegistered(next); localStorage.setItem('registeredBids', JSON.stringify(next)) }
  const open = items.filter(x => !registered.includes(x.id)); const done = items.filter(x => registered.includes(x.id))
  const card = (x: Opportunity, isDone = false) => <article className={`opportunity ${isDone ? 'registered' : ''}`} key={x.id}><div className="op-head"><span className={`grade ${x.grade}`}>{x.grade}级 · {x.score}分</span><span>{x.region}　{x.method}</span></div><h3>{x.name}</h3><p className="summary"><b>项目概括：</b>{x.category}</p><div className="op-grid"><p><b>采购人</b>{x.buyer}</p><p><b>预算/限价</b>{x.budget}</p><p><b>获取文件截止</b>{x.fileDeadline}</p><p><b>响应截止</b>{x.bidDeadline}</p></div><p><b>参与要求说明：</b>{x.qualification}；联合体：{x.jointBid}。</p><p><b>主要缺口：</b>{x.gap}</p><p><b>建议动作：</b>{x.action}</p><div className="op-foot"><small>来源：{x.source} · 核验：{x.verifiedAt}</small><div><a href={x.sourceUrl} target="_blank" rel="noreferrer">打开官方原公告 ↗</a>{isDone ? <button onClick={() => restore(x.id)}>恢复未报名</button> : <button onClick={() => mark(x.id)}>标记已报名</button>}</div></div></article>
  return <div className="opportunities"><div className="op-summary">未报名项目 <b>{open.length}</b> 个 · 已报名 <b>{done.length}</b> 个</div>{open.map(x => card(x))}{open.length === 0 && <div className="empty">当前没有未报名项目。</div>}{done.length > 0 && <details className="registered-list"><summary>查看已报名项目（{done.length}）</summary>{done.map(x => card(x, true))}</details>}</div>
}
function Panel({ title, children }: { title: string; children: ReactNode }) { return <section className="panel"><small>业务模块</small><h2>{title}</h2>{children}</section> }
function Stats({ count }: { count: number }) { return <div className="stats"><article><span>当前有效项目</span><b>{count}</b><small>登录后实时读取</small></article><article><span>历史业绩</span><b>467.63万</b><small>可用于资格证明</small></article><article><span>最高承接</span><b>2,000万</b><small>单项目金额边界</small></article><article><span>资料完成度</span><b>72%</b><small>基础资料已具备</small></article></div> }

function Dashboard({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [tab, setTab] = useState(0); const [items, setItems] = useState<Opportunity[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  useEffect(() => { api('/rest/v1/opportunities?select=payload&order=updated_at.desc', {}, session.access_token).then(rows => setItems(rows.map((row: { payload: Opportunity }) => row.payload))).catch(e => setError(e.message)).finally(() => setLoading(false)) }, [session.access_token])
  const table = useMemo(() => loading ? <div className="empty">正在安全读取商机资料…</div> : error ? <div className="empty"><b>读取失败</b><p>{error}</p></div> : <Table items={items} />, [loading, error, items])
  const pages = [<><section className="hero"><div><small>企业采购商机管理中心</small><h1>把合适的家具项目，<br />变成可执行的投标计划。</h1><p>基于产品能力、历史业绩与资金边界，统一筛选、评分和跟进采购项目。</p><button onClick={() => setTab(1)}>查看项目库</button></div><aside>最大承接金额<b>1,000–2,000 万元</b><small>优先：办公、医养、酒店及校用家具</small></aside></section><Stats count={items.length} /><Panel title="优先级队列">{table}</Panel></>, <Panel title="采购项目库"><div className="filters"><input placeholder="搜索项目、采购单位或品类" /><select><option>全部状态</option></select></div>{table}</Panel>, <Panel title="项目匹配与评分"><div className="match"><div><b>94</b><span>综合匹配度</span></div>{[['产品范围', '96'], ['金额适配', '90'], ['属地服务', '98'], ['历史业绩', '89']].map(x => <article key={x[0]}><b>{x[0]}</b><strong>{x[1]}分</strong></article>)}</div></Panel>, <Panel title="客户及投标跟进"><div className="kanban">{[['待核实', '确认公告与预算', '核实报名要求'], ['资料准备', '整理公司资质', '匹配历史业绩'], ['方案报价', '确认清单参数', '编制成本报价'], ['投标执行', '内部审核盖章', '递交开标跟踪']].map(c => <section key={c[0]}><h3>{c[0]}</h3>{c.slice(1).map(x => <button key={x}>{x}<small>负责人：待安排</small></button>)}</section>)}</div></Panel>, <Panel title="企业资料与案例库"><div className="profile"><article><h3>吉安市吉州区俊逸办公家具有限公司</h3><p>江西省吉安市吉州区四方圆家居建材市场A馆4楼</p><p>18807960836 / 17779602338</p></article><article><h3>产品能力</h3><div className="chips">{'办公桌椅、医养家具、图书馆家具、酒店家具、床类、钢制家具、校用家具、民宿家具、康养家具、军用家具、密集架、窗帘'.split('、').map(x => <span key={x}>{x}</span>)}</div></article></div>{table}</Panel>, <Panel title="报价、成本及统计"><Stats count={items.length} /><div className="empty"><b>报价测算区</b><p>取得正式采购清单、参数和数量后，可生成成本、毛利和报价区间。</p></div></Panel>, <Panel title="系统设置与权限"><div className="settings"><label>当前账号<span>{session.user.email}</span></label><label>重点项目提醒<input type="checkbox" defaultChecked /></label><label>最大项目金额<select><option>2,000万元</option></select></label><button className="logout" onClick={onLogout}>退出登录</button></div></Panel>]
  return <div className="shell"><nav><div className="brand"><b>俊逸</b><span>采购商机系统<small>Opportunity OS</small></span></div>{tabs.map((x, i) => <button className={tab === i ? 'active' : ''} onClick={() => setTab(i)} key={x}><i>{i + 1}</i>{x}</button>)}</nav><main><header><span><small>{new Date().toLocaleDateString('zh-CN')}</small><b>{tabs[tab]}</b></span><button onClick={onLogout}>安全退出</button></header>{pages[tab]}<footer>俊逸办公家具 · 采购商机管理系统</footer></main></div>
}
export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession)
  useEffect(() => {
    if (!location.hash.includes('access_token=')) return
    const params = new URLSearchParams(location.hash.slice(1)); const accessToken = params.get('access_token'); const refreshToken = params.get('refresh_token')
    if (!accessToken || !refreshToken) return
    api('/auth/v1/user', {}, accessToken).then(user => {
      if (!ALLOWED_EMAILS.includes((user.email || '').toLowerCase())) throw new Error('该邮箱未获得访问授权')
      const next = { access_token: accessToken, refresh_token: refreshToken, expires_in: Number(params.get('expires_in') || 3600), user } as Session
      localStorage.setItem('junyiSession', JSON.stringify(next)); setSession(next); history.replaceState(null, '', location.pathname)
    }).catch(() => { localStorage.removeItem('junyiSession'); history.replaceState(null, '', location.pathname) })
  }, [])
  const logout = () => { localStorage.removeItem('junyiSession'); setSession(null) }
  return session ? <Dashboard session={session} onLogout={logout} /> : <Login />
}
