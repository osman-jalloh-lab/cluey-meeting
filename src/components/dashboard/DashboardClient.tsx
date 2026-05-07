'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatRelativeTime } from '@/lib/utils'
import AgentPanel, { AgentDef } from './AgentPanel'
import PixelOffice from './PixelOffice'

const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono, monospace)' }

/* ── Time of day ── */
type TimePeriod = 'morning' | 'day' | 'golden' | 'evening' | 'night'

function getTimePeriod(h: number): TimePeriod {
  if (h >= 6  && h < 10) return 'morning'
  if (h >= 10 && h < 17) return 'day'
  if (h >= 17 && h < 20) return 'golden'
  if (h >= 20 && h < 22) return 'evening'
  return 'night'
}

function useTimeOfDay() {
  const [period, setPeriod] = useState<TimePeriod>(getTimePeriod(new Date().getHours()))
  useEffect(() => {
    const id = setInterval(() => setPeriod(getTimePeriod(new Date().getHours())), 60000)
    return () => clearInterval(id)
  }, [])
  return period
}

/* ── Weather (Open-Meteo, Austin TX — no API key, no cost) ── */
interface WeatherState { isRaining: boolean; isCold: boolean; tempF: number; icon: string }

function useAustinWeather() {
  const [w, setW] = useState<WeatherState | null>(null)
  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=30.2672&longitude=-97.7431&current=temperature_2m,weather_code,precipitation&temperature_unit=fahrenheit')
      .then(r => r.json())
      .then(d => {
        const c = d.current
        const code: number = c.weather_code
        setW({
          isRaining: code >= 51 && code <= 82,
          isCold:    c.temperature_2m < 55,
          tempF:     Math.round(c.temperature_2m),
          icon: code === 0 ? '☀️' : code <= 3 ? '⛅' : code <= 48 ? '🌫️' : code <= 67 ? '🌧️' : code <= 77 ? '❄️' : code <= 82 ? '🌦️' : '⛈️',
        })
      })
      .catch(() => {})
  }, [])
  return w
}

/* ── 7 agents
   IMPORTANT: Agents are fully idle by default.
   No AI API calls are made until the user explicitly opens an agent and sends a message.
   Background data (team feed, leads) only hits local DB routes — zero AI token cost.
── */
const AGENTS: AgentDef[] = [
  { id:'email',        type:'email',      icon:'✉️',  name:'Inbox Specialist',        role:'Email Triage & Drafting',             color:'#378ADD',
    description:'Filters noise. Flags what matters. Drafts replies before you ask. Knows job alert vs real recruiter.',
    placeholder:'Scan Gmail, triage, draft reply...', quickActions:['Summarize unread across all accounts','What emails need a reply today?','Draft a reply to the latest recruiter email','Flag anything with deadlines or action items'] },
  { id:'hr',           type:'hr',         icon:'🏛️', name:'HR Compliance Specialist', role:'I-9 · EAD/CPT · Workday · E-Verify',  color:'#E24B4A',
    badge:'F-1 CPT',
    description:'Careful and accurate. Reviews I-9, CPT, Workday workflows, and compliance risks.',
    placeholder:'Ask about I-9, CPT, EAD, Workday...', quickActions:['What do I need for Supplement B re-verification?','Walk me through my CPT timeline','What Workday actions before May 18?','Check my CPT status and what comes next'] },
  { id:'job',          type:'job_search', icon:'💼',  name:'Career Advisor',           role:'Job Search · Applications · Offers',  color:'#7F77DD',
    badge:'May 18',
    description:"Honest about what's worth applying to. Tracks applications and surfaces recruiter emails.",
    placeholder:'Ask about applications, interviews, jobs...', quickActions:['Find cybersecurity internships for CPT','Any recruiter emails to respond to?','Draft a follow-up for my Ferrovial interview',"What's the status of my active applications?"] },
  { id:'calendar',     type:'calendar',   icon:'📅',  name:'Schedule Manager',         role:'Calendar · Events · Scheduling',      color:'#1D9E75',
    description:"Keeps you from overloading the day. Surfaces deadlines before they're urgent.",
    placeholder:'Ask about your schedule, events, deadlines...', quickActions:['What do I have this week?','Any conflicts or back-to-back events?','Block focus time for job applications today','What deadlines are coming up in 7 days?'] },
  { id:'task',         type:'task',       icon:'✅',  name:'Ops Manager',              role:'Tasks · Priorities · Focus · History', color:'#8b5cf6',
    description:'Prioritizes what matters now, tracks what slipped through, carries unfinished work forward.',
    placeholder:'Ask about tasks, priorities, carry-forwards...', quickActions:['What are my top 3 priorities right now?','What tasks did I leave unfinished yesterday?','Extract action items from my recent emails','What have I completed this week?'] },
  { id:'chiefofstaff', type:'briefing',   icon:'🎯',  name:'Chief of Staff',           role:'Morning Brief · Command · Delegation', color:'#EF9F27',
    description:'Your strategic right hand. Runs morning briefings, routes complex commands, tracks agent output.',
    placeholder:'Run briefing, plan the day, delegate across agents...', quickActions:['Give me my full morning briefing for today','Plan my entire week across all agents','What do all agents have in progress right now?','End-of-day recap and next steps'] },
  { id:'growth',       type:'assistant',  icon:'📚',  name:'Growth Coach',             role:'Skills · Certs · Study · Career Dev',  color:'#06b6d4',
    description:'Maps your learning path to where you want to go. Tracks ACC deadlines, cert roadmap, and skill gaps.',
    placeholder:'Ask about skills, certs, coursework, career growth...', quickActions:['What skills should I build for GRC roles?','Check my upcoming class deadlines at ACC','What certifications come after CySA+?','Recommend a study plan for this week'] },
]

const DESK_TO_AGENT: Record<string, string> = {
  email: 'email', hr: 'hr', ceo: 'chiefofstaff', jobs: 'job',
  ops: 'task', cal: 'calendar', brief: 'chiefofstaff', learn: 'growth',
}

const QUICK_CMDS = [
  'Plan my day', 'Check Gmail', 'Find cybersecurity internships',
  'Run morning briefing', 'HR compliance review',
  'What should I focus on?', 'Show job tracker', 'Find GRC roles in Austin',
]

/* ── Team feed — loads once, no background polling (zero idle API cost) ── */
interface FeedMsg { id: string; fromAgent: string; message: string; messageType: string; createdAt: string }

function useMiniMessages() {
  const [msgs, setMsgs]       = useState<FeedMsg[]>([])
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)

  const load = useCallback(() => {
    fetch('/api/agent-messages').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.messages) { setMsgs(d.messages.slice(0, 10)); setLoadedAt(new Date()) }
    }).catch(() => {})
  }, [])

  // Load once on mount — no polling interval
  useEffect(() => { load() }, [load])

  return { msgs, loadedAt, refresh: load }
}

function useMiniLeads() {
  const [leads, setLeads] = useState<Array<{ id: string; title: string; company: string; status: string }>>([])
  useEffect(() => {
    fetch('/api/job-leads').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.leads) setLeads(d.leads.filter((l: { status: string }) => l.status === 'Interview' || l.status === 'Offer').slice(0, 3))
    }).catch(() => {})
  }, [])
  return leads
}

/* ── Helpers ── */
const PIPE_STATUS: Record<string, { c: string }> = {
  Interview: { c: '#10b981' }, Offer: { c: '#f59e0b' }, Applied: { c: '#22d3ee' }, default: { c: '#1D9E75' },
}
const LOG_TYPE: Record<string, string> = {
  complete: '#1D9E75', alert: '#EF9F27', handoff: '#378ADD', update: '#1D9E75', question: '#7F77DD',
}

/* ── Props ── */
interface Props {
  user:         { name?: string | null; email?: string | null }
  accounts:     Array<{ id: string; emailAddress: string; accountLabel: string }>
  tasks:        Array<{ id: string; title: string; priority: string; dueDate: Date | null; status: string }>
  recentEmails: Array<{ id: string; from: string; subject: string | null; snippet: string | null; receivedAt: Date | null; isImportant: boolean; connectedAccount: { accountLabel: string; emailAddress: string } }>
}

export default function DashboardClient({ user, accounts, tasks, recentEmails }: Props) {
  const [activeAgent, setActiveAgent] = useState<AgentDef | null>(null)
  const [cmdInput,    setCmdInput]    = useState('')
  const [cmdLoading,  setCmdLoading]  = useState(false)
  const [lastAck,     setLastAck]     = useState<{ message: string; agent: string } | null>(null)

  /* Quick Assign (right drawer) */
  const [qaAgent,    setQaAgent]    = useState(AGENTS[0].name)
  const [qaText,     setQaText]     = useState('')
  const [qaPriority, setQaPriority] = useState<'low'|'normal'|'high'|'urgent'>('normal')
  const [qaLoading,  setQaLoading]  = useState(false)
  const [qaAck,      setQaAck]      = useState<string | null>(null)
  const qaInputRef = useRef<HTMLInputElement>(null)

  const timePeriod = useTimeOfDay()
  const weather    = useAustinWeather()
  const { msgs: miniMsgs, loadedAt: feedLoadedAt, refresh: refreshFeed } = useMiniMessages()
  const miniLeads  = useMiniLeads()

  /* ── CEO command bar ── */
  const runCommand = async (text: string) => {
    const cmd = (text || cmdInput).trim()
    if (!cmd || cmdLoading) return
    setCmdInput(''); setCmdLoading(true); setLastAck(null)
    try {
      const res  = await fetch('/api/ai/ceo-command', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ command: cmd }) })
      const data = await res.json()
      if (res.ok) { setLastAck({ message: data.message, agent: data.routing.agent }); refreshFeed() }
    } catch { setLastAck({ message:'Something went wrong. Try again.', agent:'System' }) }
    finally   { setCmdLoading(false) }
  }

  /* ── Quick Assign form submit ── */
  const submitQuickAssign = async () => {
    const title = qaText.trim()
    if (!title || qaLoading) return
    setQaLoading(true); setQaAck(null)
    try {
      const res = await fetch('/api/agent-tasks', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ title, assignedTo: qaAgent, priority: qaPriority, createdBy:'Chief of Staff', source:'dashboard' }),
      })
      if (res.ok) {
        setQaText('')
        setQaAck(`✓ Assigned to ${qaAgent}`)
        refreshFeed()
        setTimeout(() => setQaAck(null), 3000)
      } else {
        setQaAck('Failed — try again')
      }
    } catch { setQaAck('Failed — try again') }
    finally { setQaLoading(false) }
  }

  /* Pre-fill quick assign from agent card click on "+ Task" */
  const openQuickAssign = (agentName: string) => {
    setQaAgent(agentName)
    setTimeout(() => qaInputRef.current?.focus(), 50)
  }

  const handleDeskClick = useCallback((deskId: string) => {
    const agentId = DESK_TO_AGENT[deskId]
    const agent   = AGENTS.find(a => a.id === agentId)
    if (agent) setActiveAgent(agent)
  }, [])

  const greeting  = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'
  const firstName = user.name?.split(' ')[0] ?? 'Osman'

  /* ── Overview bar tiles ── */
  const overviewTiles = [
    { icon: weather?.icon ?? '🌤️', label: weather ? `${weather.tempF}°F` : 'Austin',    sub: weather?.isRaining ? 'Raining' : weather?.isCold ? 'Cold snap' : 'Clear', color:'#378ADD', href: null },
    { icon: '✉️',                   label: `${recentEmails.length} unread`,               sub: 'Gmail',         color:'#378ADD', href:'/email' },
    { icon: '🎯',                   label: '1 Interview',                                 sub: 'Ferrovial · Wed', color:'#EF9F27', href: null },
    { icon: '🏢',                   label: 'UT System',                                   sub: 'Start May 18',  color:'#1D9E75', href: null },
    { icon: '✅',                   label: `${tasks.length} tasks`,                       sub: 'Active',        color:'#8b5cf6', href:'/tasks' },
    { icon: '💼',                   label: '100+ apps',                                   sub: 'Job pipeline',  color:'#7F77DD', href:'/jobs' },
  ]

  return (
    <>
      <AgentPanel agent={activeAgent} onClose={() => setActiveAgent(null)} />

      <div style={{ height:'100%', display:'flex', overflow:'hidden' }}>

        {/* ── Center stage ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

          {/* Pixel Office */}
          <PixelOffice
            onDeskClick={handleDeskClick}
            timePeriod={timePeriod}
            isRaining={weather?.isRaining ?? false}
            isCold={weather?.isCold ?? false}
            tempF={weather?.tempF ?? null}
          />

          {/* Overview bar */}
          <div style={{ background:'#070a0e', borderBottom:'1px solid #18222e', padding:'8px 14px', display:'flex', gap:6, overflowX:'auto', flexShrink:0 }} className="scrollbar-thin">
            {overviewTiles.map((t, i) => (
              <div key={i}
                onClick={() => t.href && (window.location.href = t.href)}
                style={{ display:'flex', alignItems:'center', gap:8, background:'#0b0e14', border:`1px solid ${t.color}22`, borderRadius:6, padding:'7px 12px', cursor: t.href ? 'pointer' : 'default', flexShrink:0, transition:'all .15s', minWidth:120 }}
                onMouseEnter={e => { if (t.href) { (e.currentTarget as HTMLElement).style.borderColor = t.color+'60'; (e.currentTarget as HTMLElement).style.background = t.color+'0a' } }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = t.color+'22'; (e.currentTarget as HTMLElement).style.background = '#0b0e14' }}
              >
                <span style={{ fontSize:18 }}>{t.icon}</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:t.color, ...MONO, lineHeight:1.2 }}>{t.label}</div>
                  <div style={{ fontSize:10, color:'#4a6878', ...MONO, marginTop:1 }}>{t.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Agent grid — always visible, no tab switching */}
          <div style={{ flex:1, overflowY:'auto', padding:'12px 14px' }} className="scrollbar-thin">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:10 }}>
              {AGENTS.map((agent, idx) => (
                <div key={agent.id}
                  style={{ background:'#0f1420', border:'1px solid #18222e', borderRadius:8, padding:'14px 16px', cursor:'pointer', transition:'all .15s', display:'flex', flexDirection:'column', gap:10, position:'relative',
                    animation:`cardFloat ${4+idx*.4}s ease-in-out infinite`, animationDelay:`${idx*.5}s` }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor=agent.color; el.style.background=agent.color+'0a'; el.style.animationPlayState='paused' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='#18222e'; el.style.background='#0f1420'; el.style.animationPlayState='running' }}
                  onClick={() => setActiveAgent(agent)}
                >
                  {/* Idle pip — gray when no active task */}
                  <div style={{ position:'absolute', top:12, right:12, width:7, height:7, borderRadius:'50%', background:'#243040', opacity:.7 }} title="Idle — no API usage" />

                  {/* Header */}
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:7, background:`${agent.color}20`, border:`1px solid ${agent.color}35`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                      {agent.icon}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1)', ...MONO, lineHeight:1.3 }}>{agent.name}</div>
                      <div style={{ fontSize:10, color:'#4a6878', ...MONO, marginTop:2, lineHeight:1.4 }}>{agent.role}</div>
                    </div>
                    {agent.badge && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:10, background:`${agent.color}20`, color:agent.color, ...MONO, flexShrink:0 }}>{agent.badge}</span>}
                  </div>

                  {/* Description */}
                  <div style={{ fontSize:11, color:'#4a6878', lineHeight:1.6 }}>{agent.description}</div>

                  {/* Buttons */}
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={e => { e.stopPropagation(); setActiveAgent(agent) }}
                      style={{ flex:1, fontSize:10, padding:'6px 0', border:`1px solid #1f2c3a`, borderRadius:4, background:'transparent', color:'#4a6878', cursor:'pointer', ...MONO, transition:'all .12s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor=agent.color; e.currentTarget.style.color=agent.color }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='#1f2c3a'; e.currentTarget.style.color='#4a6878' }}
                    >Chat ↗</button>
                    <button onClick={e => { e.stopPropagation(); openQuickAssign(agent.name) }}
                      style={{ flex:1, fontSize:10, padding:'6px 0', border:'1px solid #1f2c3a', borderRadius:4, background:'transparent', color:'#4a6878', cursor:'pointer', ...MONO, transition:'all .12s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor=agent.color; e.currentTarget.style.color=agent.color }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='#1f2c3a'; e.currentTarget.style.color='#4a6878' }}
                    >+ Assign →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── CEO CMD bar — sticky bottom ── */}
          <div style={{ background:'#07090e', borderTop:'1px solid #18222e', padding:'10px 14px', flexShrink:0 }}>
            {lastAck && (
              <div style={{ marginBottom:7, padding:'5px 10px', borderRadius:4, background:'rgba(29,158,117,.08)', color:'#1D9E75', border:'1px solid rgba(29,158,117,.2)', ...MONO, fontSize:10 }}>
                <span style={{ fontWeight:700 }}>{lastAck.agent}:</span> {lastAck.message}
              </div>
            )}
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ ...MONO, fontSize:10, color:'var(--teal)', letterSpacing:1, flexShrink:0 }}>⚡ CEO COMMAND</span>
              <input
                value={cmdInput}
                onChange={e => setCmdInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && runCommand(cmdInput)}
                placeholder={`Good ${greeting}, ${firstName}. Route a command to your agents...`}
                style={{ flex:1, background:'#060910', border:'1px solid #1f2c3a', borderRadius:4, padding:'7px 12px', ...MONO, fontSize:12, color:'var(--text-1)', outline:'none' }}
                onFocus={e => e.currentTarget.style.borderColor='var(--teal)'}
                onBlur={e  => e.currentTarget.style.borderColor='#1f2c3a'}
              />
              <button onClick={() => runCommand(cmdInput)} disabled={!cmdInput.trim() || cmdLoading}
                style={{ background: cmdInput.trim()&&!cmdLoading ? 'var(--teal)' : 'rgba(29,158,117,.2)', border:'none', borderRadius:4, padding:'0 16px', height:36, ...MONO, fontSize:11, fontWeight:700, color:'#fff', cursor: cmdInput.trim() ? 'pointer':'not-allowed', letterSpacing:'.5px', flexShrink:0, transition:'background .15s' }}
              >{cmdLoading ? '⟳' : '$RUN'}</button>
            </div>
          </div>
        </div>

        {/* ── Right drawer ── */}
        <aside style={{ width:260, flexShrink:0, background:'#0c0f16', borderLeft:'1px solid #18222e', display:'flex', flexDirection:'column', overflowY:'auto' }} className="scrollbar-thin">

          {/* ── Quick Commands ── */}
          <div style={{ padding:'10px 12px', borderBottom:'1px solid #18222e', background:'#07090e' }}>
            <div style={{ ...MONO, fontSize:10, color:'var(--teal)', letterSpacing:1, textTransform:'uppercase', marginBottom:7 }}>⚡ Quick Commands</div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {QUICK_CMDS.map(qc => (
                <button key={qc} onClick={() => runCommand(qc)} disabled={cmdLoading}
                  style={{ fontSize:10, color:'#4a6878', background:'#080b10', border:'1px solid #18222e', borderRadius:4, padding:'5px 10px', cursor:'pointer', ...MONO, transition:'all .12s', textAlign:'left' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='var(--teal)'; e.currentTarget.style.color='var(--teal)'; e.currentTarget.style.background='rgba(29,158,117,.07)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='#18222e'; e.currentTarget.style.color='#4a6878'; e.currentTarget.style.background='#080b10' }}
                >{qc}</button>
              ))}
            </div>
          </div>

          {/* ── Quick Assign form ── */}
          <div style={{ padding:'12px 12px 10px', borderBottom:'1px solid #18222e', background:'#07090e' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ ...MONO, fontSize:10, color:'var(--teal)', letterSpacing:1, textTransform:'uppercase' }}>⚡ Quick Assign</span>
              <span style={{ ...MONO, fontSize:9, color:'#243040' }}>no AI used until sent</span>
            </div>

            {/* Agent selector */}
            <select
              value={qaAgent}
              onChange={e => setQaAgent(e.target.value)}
              style={{ width:'100%', background:'#060910', border:'1px solid #1f2c3a', borderRadius:4, padding:'6px 8px', ...MONO, fontSize:11, color:'var(--text-1)', marginBottom:6, outline:'none', cursor:'pointer' }}
            >
              {AGENTS.map(a => (
                <option key={a.id} value={a.name}>{a.icon} {a.name}</option>
              ))}
            </select>

            {/* Task description */}
            <input
              ref={qaInputRef}
              value={qaText}
              onChange={e => setQaText(e.target.value)}
              onKeyDown={e => e.key==='Enter' && submitQuickAssign()}
              placeholder="Describe the task..."
              style={{ width:'100%', background:'#060910', border:'1px solid #1f2c3a', borderRadius:4, padding:'6px 8px', ...MONO, fontSize:11, color:'var(--text-1)', marginBottom:6, outline:'none', boxSizing:'border-box' }}
              onFocus={e => e.currentTarget.style.borderColor='var(--teal)'}
              onBlur={e  => e.currentTarget.style.borderColor='#1f2c3a'}
            />

            {/* Priority + Submit row */}
            <div style={{ display:'flex', gap:6 }}>
              <select
                value={qaPriority}
                onChange={e => setQaPriority(e.target.value as 'low'|'normal'|'high'|'urgent')}
                style={{ flex:1, background:'#060910', border:'1px solid #1f2c3a', borderRadius:4, padding:'6px 6px', ...MONO, fontSize:10, color:'#4a6878', outline:'none', cursor:'pointer' }}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <button
                onClick={submitQuickAssign}
                disabled={!qaText.trim() || qaLoading}
                style={{ flex:2, background: qaText.trim()&&!qaLoading ? 'var(--teal)':'rgba(29,158,117,.2)', border:'none', borderRadius:4, padding:'6px 0', ...MONO, fontSize:11, fontWeight:700, color:'#fff', cursor: qaText.trim() ? 'pointer':'not-allowed', transition:'background .15s' }}
              >{qaLoading ? '⟳' : 'Assign →'}</button>
            </div>

            {qaAck && (
              <div style={{ marginTop:6, padding:'4px 8px', borderRadius:3, background:'rgba(29,158,117,.1)', border:'1px solid rgba(29,158,117,.25)', ...MONO, fontSize:10, color:'var(--teal)' }}>
                {qaAck}
              </div>
            )}
          </div>

          {/* User */}
          <div style={{ padding:'12px 14px', borderBottom:'1px solid #18222e' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#1D9E75,#0F6E56)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff', ...MONO, flexShrink:0 }}>
                {user.name?.split(' ').map(p=>p[0]).slice(0,2).join('').toUpperCase() ?? 'OJ'}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{user.name ?? 'Osman Jalloh'}</div>
                <div style={{ fontSize:10, color:'#4a6878', ...MONO, marginTop:1 }}>CEO · F-1 CPT · ACC</div>
                <div style={{ fontSize:10, color:'#243040', ...MONO, marginTop:1 }}>Good {greeting} 👋</div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ borderBottom:'1px solid #18222e' }}>
            <div style={{ padding:'9px 14px 5px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:10, letterSpacing:1, color:'#243040', textTransform:'uppercase', ...MONO }}>Stats</span>
              <span style={{ fontSize:9, padding:'1px 7px', borderRadius:10, background:'rgba(29,158,117,.15)', color:'var(--teal)', ...MONO }}>Live</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, padding:'0 14px 12px' }}>
              {[
                { v: recentEmails.length, l:'Email',     c:'#378ADD' },
                { v: 1,                   l:'Interview',  c:'#EF9F27' },
                { v: AGENTS.length,       l:'Agents',     c:'var(--teal)' },
                { v: 'May 18',            l:'UT Start',   c:'#E24B4A' },
              ].map(s => (
                <div key={s.l} style={{ background:'#0b0e14', border:'1px solid #18222e', borderRadius:5, padding:'8px 10px', textAlign:'center' }}>
                  <div style={{ ...MONO, fontSize: typeof s.v==='number' ? 20 : 12, fontWeight:700, color:s.c, lineHeight:1 }}>{s.v}</div>
                  <div style={{ fontSize:9, color:'#243040', textTransform:'uppercase', letterSpacing:'.06em', marginTop:3, ...MONO }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Team feed */}
          <div style={{ borderBottom:'1px solid #18222e' }}>
            <div style={{ padding:'9px 14px 5px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:10, letterSpacing:1, color:'#243040', textTransform:'uppercase', ...MONO }}>📡 Team Feed</span>
              <button onClick={refreshFeed} title="Refresh feed" style={{ fontSize:10, color:'#243040', background:'none', border:'none', cursor:'pointer', ...MONO, lineHeight:1 }}
                onMouseEnter={e => e.currentTarget.style.color='var(--teal)'}
                onMouseLeave={e => e.currentTarget.style.color='#243040'}
              >↻ {feedLoadedAt ? formatRelativeTime(feedLoadedAt.toISOString()) : ''}</button>
            </div>
            <div style={{ padding:'0 14px 10px', display:'flex', flexDirection:'column' }}>
              {miniMsgs.length === 0 ? (
                <div style={{ ...MONO, fontSize:10, color:'#243040', padding:'5px 0' }}>All {AGENTS.length} agents idle — no API usage</div>
              ) : (
                miniMsgs.map(msg => (
                  <div key={msg.id} className="log-entry" style={{ display:'flex', alignItems:'center', gap:5, ...MONO, fontSize:10, color:'#243040', padding:'3px 0', borderBottom:'1px solid rgba(255,255,255,.02)' }}>
                    <span style={{ color:'#4a6878', minWidth:30, flexShrink:0 }}>{formatRelativeTime(msg.createdAt)}</span>
                    <span style={{ color: LOG_TYPE[msg.messageType] ?? '#1D9E75', flexShrink:0 }}>●</span>
                    <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{msg.fromAgent.split(' ')[0]}: {msg.message.slice(0,38)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Job pipeline */}
          <div style={{ borderBottom:'1px solid #18222e' }}>
            <div style={{ padding:'9px 14px 5px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:10, letterSpacing:1, color:'#243040', textTransform:'uppercase', ...MONO }}>💼 Pipeline</span>
              <a href="/jobs" style={{ fontSize:10, color:'var(--teal)', textDecoration:'none', ...MONO }}>View all →</a>
            </div>
            <div style={{ padding:'0 14px 12px', display:'flex', flexDirection:'column', gap:6 }}>
              <div style={{ borderRadius:5, padding:'8px 10px', background:'rgba(29,158,117,.07)', border:'1px solid rgba(29,158,117,.25)' }}>
                <div style={{ fontSize:11, fontWeight:500, color:'var(--teal)', ...MONO }}>UT System — OCIO</div>
                <div style={{ fontSize:10, color:'#4a6878', ...MONO, marginTop:2 }}>CS Associate · Start May 18 · BGC pending</div>
              </div>
              <div style={{ borderRadius:5, padding:'8px 10px', background:'rgba(239,159,39,.07)', border:'1px solid rgba(239,159,39,.25)' }}>
                <div style={{ fontSize:11, fontWeight:500, color:'#EF9F27', ...MONO }}>Ferrovial — HR Intern</div>
                <div style={{ fontSize:10, color:'#4a6878', ...MONO, marginTop:2 }}>Phone screen Wed May 6 · 3PM · Jude Malta</div>
              </div>
              {miniLeads.map(lead => {
                const c = (PIPE_STATUS[lead.status] ?? PIPE_STATUS.default).c
                return (
                  <div key={lead.id} style={{ borderRadius:5, padding:'8px 10px', background:`${c}10`, border:`1px solid ${c}30` }}>
                    <div style={{ fontSize:11, fontWeight:500, color:c, ...MONO }}>{lead.title}</div>
                    <div style={{ fontSize:10, color:'#4a6878', ...MONO, marginTop:2 }}>{lead.company} · {lead.status}</div>
                  </div>
                )
              })}
              <div style={{ fontSize:10, color:'#243040', ...MONO, textAlign:'center', padding:'2px 0' }}>100+ total applications sent</div>
            </div>
          </div>

          {/* Recent emails */}
          <div style={{ borderBottom:'1px solid #18222e' }}>
            <div style={{ padding:'9px 14px 5px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:10, letterSpacing:1, color:'#243040', textTransform:'uppercase', ...MONO }}>✉️ Unread</span>
              <a href="/email" style={{ fontSize:10, color:'var(--teal)', ...MONO, textDecoration:'none' }}>View all →</a>
            </div>
            <div style={{ padding:'0 14px 10px' }}>
              {recentEmails.slice(0,5).map(email => (
                <div key={email.id} style={{ padding:'7px 0', borderBottom:'1px solid #18222e', cursor:'pointer' }}
                  onMouseEnter={e => { const el = e.currentTarget.querySelector('.esubj') as HTMLElement; if (el) el.style.color='var(--teal)' }}
                  onMouseLeave={e => { const el = e.currentTarget.querySelector('.esubj') as HTMLElement; if (el) el.style.color='var(--text-1)' }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
                    <span style={{ fontSize:8, background:'rgba(55,138,221,.1)', color:'#1a5a99', padding:'1px 4px', borderRadius:2, ...MONO }}>{email.connectedAccount.accountLabel}</span>
                    {email.isImportant && <span style={{ fontSize:9 }}>⭐</span>}
                    <span style={{ fontSize:9, color:'#243040', ...MONO, marginLeft:'auto' }}>{formatRelativeTime(email.receivedAt)}</span>
                  </div>
                  <div style={{ fontSize:10, color:'#4a6878', ...MONO, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{email.from}</div>
                  <div className="esubj" style={{ fontSize:11, color:'var(--text-1)', lineHeight:1.4, marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', transition:'color .12s' }}>{email.subject}</div>
                </div>
              ))}
              {recentEmails.length===0 && <div style={{ fontSize:11, color:'#243040', ...MONO, padding:'10px 0', textAlign:'center' }}>Inbox clear ✓</div>}
            </div>
          </div>

          {/* More nav */}
          <div style={{ padding:'9px 14px 5px' }}>
            <span style={{ fontSize:10, letterSpacing:1, color:'#243040', textTransform:'uppercase', ...MONO }}>More</span>
          </div>
          <div style={{ padding:'0 14px 20px', display:'flex', flexDirection:'column', gap:0 }}>
            {[
              { href:'/tasks',     label:'✅ Tasks' },
              { href:'/jobs',      label:'💼 Jobs' },
              { href:'/notes',     label:'📝 Notes' },
              { href:'/accounts',  label:`🔗 Accounts  [${accounts.length}]` },
              { href:'/settings',  label:'⚙️ Settings' },
              { href:'/assistant', label:'🤖 AI Assistant' },
            ].map(item => (
              <a key={item.href} href={item.href}
                style={{ display:'flex', alignItems:'center', padding:'8px 0', fontSize:11, color:'#4a6878', ...MONO, borderBottom:'1px solid #18222e', textDecoration:'none', transition:'color .12s' }}
                onMouseEnter={e => e.currentTarget.style.color='var(--teal)'}
                onMouseLeave={e => e.currentTarget.style.color='#4a6878'}
              >{item.label}</a>
            ))}
          </div>

        </aside>
      </div>
    </>
  )
}
