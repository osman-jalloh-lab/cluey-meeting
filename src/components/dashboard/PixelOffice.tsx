'use client'

import { useState, useCallback, useMemo } from 'react'

/* ── Theme by time of day ── */
type TimePeriod = 'morning' | 'day' | 'golden' | 'evening' | 'night'

const SCENE_THEME: Record<TimePeriod, {
  sceneBg: string; wallBg: string; ceilBg: string; floorBg: string
  lbeamAlpha: number; windowBg: string; windowBorder: string; windowGlow: string
  scanColor: string; vignetteEnd: string
}> = {
  morning: {
    sceneBg: '#0d1a28', wallBg: '#0f1a2a', ceilBg: '#0a1220', floorBg: '#101820',
    lbeamAlpha: .045, windowBg: '#1a3a6a', windowBorder: '#2a5a9a', windowGlow: 'rgba(100,160,255,.35)',
    scanColor: 'rgba(100,160,255,.05)', vignetteEnd: 'rgba(0,0,12,.75)',
  },
  day: {
    sceneBg: '#08100e', wallBg: '#09120c', ceilBg: '#070e09', floorBg: '#0c1410',
    lbeamAlpha: .065, windowBg: '#0d2a3a', windowBorder: '#1a4a6a', windowGlow: 'rgba(100,220,255,.25)',
    scanColor: 'rgba(29,158,117,.04)', vignetteEnd: 'rgba(0,8,4,.8)',
  },
  golden: {
    sceneBg: '#140c04', wallBg: '#1a0e04', ceilBg: '#100a02', floorBg: '#120a06',
    lbeamAlpha: .055, windowBg: '#2a1404', windowBorder: '#4a2a08', windowGlow: 'rgba(255,140,40,.4)',
    scanColor: 'rgba(239,159,39,.03)', vignetteEnd: 'rgba(8,4,0,.8)',
  },
  evening: {
    sceneBg: '#0a0618', wallBg: '#0c061c', ceilBg: '#080412', floorBg: '#0c0818',
    lbeamAlpha: .03, windowBg: '#10042a', windowBorder: '#200850', windowGlow: 'rgba(100,50,200,.3)',
    scanColor: 'rgba(127,119,221,.025)', vignetteEnd: 'rgba(4,0,12,.85)',
  },
  night: {
    sceneBg: '#060810', wallBg: '#08090f', ceilBg: '#060810', floorBg: '#0c1018',
    lbeamAlpha: .022, windowBg: '#050510', windowBorder: '#0a0a22', windowGlow: 'rgba(40,40,110,.18)',
    scanColor: 'rgba(29,158,117,.04)', vignetteEnd: 'rgba(0,0,0,.85)',
  },
}

/* ── Desk configurations ── */
interface DeskCfg {
  id: string; label: string; actBadge: string; actCls: '' | 'gold' | 'blue'
  nameLine1: string; nameLine2: string
  skin: string; hair: string; shirt: string; pants: string; shoe: string
  screenBg: string; lineColor: string; pipStatus: 'on' | 'idle' | 'ceo'
  glowColor: string; isCeo?: boolean
}

const DESKS: DeskCfg[] = [
  { id:'email',  label:'INBOX', actBadge:'mail', actCls:'blue', nameLine1:'Inbox',    nameLine2:'Agent',
    skin:'#c8945a', hair:'#2a1800', shirt:'#1a3a6a', pants:'#0f1a30', shoe:'#0a0a08',
    screenBg:'#050a12', lineColor:'#378ADD', pipStatus:'on',   glowColor:'#185FA5' },
  { id:'hr',     label:'I-9',   actBadge:'CPT ✓', actCls:'', nameLine1:'HR',        nameLine2:'Agent',
    skin:'#c08060', hair:'#1a0800', shirt:'#2a0a0a', pants:'#1a0808', shoe:'#080404',
    screenBg:'#080303', lineColor:'#E24B4A', pipStatus:'idle', glowColor:'#993C1D' },
  { id:'ceo',    label:'CMD',   actBadge:'CHIEF', actCls:'gold', nameLine1:'Osman', nameLine2:'CEO',
    skin:'#c8a060', hair:'#100800', shirt:'#1a3a6a', pants:'#0f1a2a', shoe:'#060608',
    screenBg:'#060500', lineColor:'#EF9F27', pipStatus:'ceo',  glowColor:'#EF9F27', isCeo:true },
  { id:'jobs',   label:'JOBS',  actBadge:'apps', actCls:'',   nameLine1:'Career',   nameLine2:'Agent',
    skin:'#b08050', hair:'#080008', shirt:'#1a0a2a', pants:'#100818', shoe:'#040408',
    screenBg:'#050308', lineColor:'#7F77DD', pipStatus:'on',   glowColor:'#534AB7' },
  { id:'ops',    label:'OPS',   actBadge:'tasks', actCls:'gold', nameLine1:'Ops',  nameLine2:'Agent',
    skin:'#a06030', hair:'#0a0400', shirt:'#2a1800', pants:'#1a1000', shoe:'#060400',
    screenBg:'#0a0800', lineColor:'#EF9F27', pipStatus:'idle', glowColor:'#854F0B' },
  { id:'cal',    label:'CAL',   actBadge:'events', actCls:'', nameLine1:'Schedule', nameLine2:'Agent',
    skin:'#d4a870', hair:'#060e00', shirt:'#0d2a1a', pants:'#081a10', shoe:'#040604',
    screenBg:'#030805', lineColor:'#1D9E75', pipStatus:'on',   glowColor:'#0F6E56' },
  { id:'brief',  label:'CHIEF', actBadge:'brief', actCls:'',  nameLine1:'Chief of', nameLine2:'Staff',
    skin:'#e0b080', hair:'#060a00', shirt:'#0a1a06', pants:'#081208', shoe:'#040604',
    screenBg:'#030501', lineColor:'#639922', pipStatus:'on',   glowColor:'#3B6D11' },
  { id:'learn',  label:'GROW',  actBadge:'skills', actCls:'blue', nameLine1:'Growth', nameLine2:'Coach',
    skin:'#b8706a', hair:'#1a0c00', shirt:'#1a1a2a', pants:'#101018', shoe:'#080808',
    screenBg:'#050508', lineColor:'#7F77DD', pipStatus:'idle', glowColor:'#3C3489' },
]

const BOB_DELAYS  = [0, .35, .7, 1.05, 1.4, 1.75, 2.1, 2.45]
const ARM_DELAYS  = [0, .2, .45, .7, .95, 1.2, 1.45, 1.7]
const ARM_SPEEDS  = ['1.1s','1.3s','1.0s','1.4s','1.2s','1.1s','1.3s','1.0s']

const BADGE_COLORS = {
  gold: { border:'#EF9F27', color:'#EF9F27', bg:'#1a1000' },
  blue: { border:'#378ADD', color:'#378ADD', bg:'#0a1020' },
  '':   { border:'#1D9E75', color:'#1D9E75', bg:'#0a1810' },
}

const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono, monospace)' }

/* ── Desk unit ── */
function DeskUnit({ d, idx, theme, onClick }: { d: DeskCfg; idx: number; theme: typeof SCENE_THEME.night; onClick: () => void }) {
  const C = !!d.isCeo
  const s = {
    dW: C?96:80, mW: C?44:38, mH: C?34:28, sW: C?36:30, sH: C?25:21,
    hW: C?13:10, hH: C?13:10, bW: C?17:14, bH: C?14:12, legH: C?9:7,
    cbW: C?20:17, cbH: C?14:12, cW: C?22:19,
  }
  const bc = BADGE_COLORS[d.actCls]
  const pipClass = d.pipStatus === 'on' ? 'pip-on' : d.pipStatus === 'ceo' ? 'pip-ceo' : 'pip-idle'
  const dtBg = C ? '#1c1800' : '#162024'
  const dtBd = C ? '#2a2400' : '#1e2c30'

  return (
    <div className="desk-unit" style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1, position:'relative' }} onClick={onClick}>
      {/* Character — headbob */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', animation:`headbob ${3+idx*.3}s ease-in-out infinite`, animationDelay:`${BOB_DELAYS[idx]}s` }}>
        {/* Head */}
        <div style={{ background:d.skin, width:s.hW, height:s.hH, borderRadius:1, position:'relative' }}>
          <div style={{ position:'absolute', top:0, left:0, right:0, height:C?5:3, background:d.hair, borderRadius:'1px 1px 0 0' }} />
          <div style={{ position:'absolute', width:2, height:2, background:'#08090e', left:C?2:1, top:C?6:4 }} />
          <div style={{ position:'absolute', width:2, height:2, background:'#08090e', right:C?2:1, top:C?6:4 }} />
        </div>
        {/* Body + arms */}
        <div style={{ background:d.shirt, width:s.bW, height:s.bH, borderRadius:1, margin:'1px auto 0', position:'relative' }}>
          <div style={{ position:'absolute', top:2, left:-4, width:4, height:8, background:d.shirt, borderRadius:1, transformOrigin:'top right', animation:`armtype ${ARM_SPEEDS[idx]} ease-in-out infinite alternate`, animationDelay:`${ARM_DELAYS[idx]}s` }} />
          <div style={{ position:'absolute', top:2, right:-4, width:4, height:8, background:d.shirt, borderRadius:1, transformOrigin:'top left', animation:`armtype ${ARM_SPEEDS[idx]} ease-in-out infinite alternate-reverse`, animationDelay:`${ARM_DELAYS[idx]+.12}s` }} />
          {C && <div style={{ position:'absolute', top:2, left:2, right:2, height:2, background:'#2a4a8a', borderRadius:1 }} />}
        </div>
        {/* Legs */}
        <div style={{ display:'flex', gap:2, width:s.bW }}>
          <div style={{ flex:1, height:s.legH, background:d.pants, borderRadius:'0 0 1px 1px' }} />
          <div style={{ flex:1, height:s.legH, background:d.pants, borderRadius:'0 0 1px 1px' }} />
        </div>
        {/* Feet */}
        <div style={{ display:'flex', gap:4, marginLeft:-1 }}>
          <div style={{ width:7, height:3, background:d.shoe, borderRadius:'0 0 1px 1px' }} />
          <div style={{ width:7, height:3, background:d.shoe, borderRadius:'0 0 1px 1px' }} />
        </div>
        {/* Chair */}
        <div style={{ position:'relative', marginTop:1 }}>
          <div style={{ position:'absolute', bottom:4, left:1, background:C?'#1a1800':'#141814', width:s.cbW, height:s.cbH, borderRadius:'2px 2px 0 0', borderTop:`1px solid ${C?'#2a2400':'#1a2018'}` }} />
          <div style={{ background:C?'#151400':'#141814', border:`1px solid ${C?'#2a2400':'#1a2018'}`, width:s.cW, height:C?7:5, borderRadius:1 }} />
        </div>
      </div>

      {/* Monitor */}
      <div style={{ position:'relative', marginBottom:3 }}>
        <div className="mon-glow" style={{ position:'absolute', inset:-8, borderRadius:6, boxShadow:`0 0 18px ${d.glowColor}`, opacity:0, transition:'opacity .2s', pointerEvents:'none' }} />
        {d.actBadge && (
          <div className="mon-badge" style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)', background:bc.bg, border:`1px solid ${bc.border}`, borderRadius:2, ...MONO, fontSize:7, color:bc.color, padding:'1px 5px', whiteSpace:'nowrap', zIndex:10 }}>
            {d.actBadge}
          </div>
        )}
        <div style={{ width:s.mW, height:s.mH, border:`1px solid #182018`, borderRadius:2, background:'#050808', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', ...(C?{border:'1px solid #3a3000'}:{}) }}>
          <div style={{ background:d.screenBg, width:s.sW, height:s.sH, borderRadius:1, display:'flex', flexDirection:'column', padding:2, gap:1, overflow:'hidden' }}>
            <div style={{ fontSize:6, color:d.lineColor, marginBottom:1, ...MONO }}>{d.label}</div>
            <div style={{ height:2, borderRadius:1, background:d.lineColor, width:'88%' }} />
            <div style={{ height:2, borderRadius:1, background:d.lineColor, width:'58%' }} />
            <div style={{ height:2, borderRadius:1, background:d.lineColor, width:'74%' }} />
            <div style={{ width:3, height:3, borderRight:`2px solid ${d.lineColor}`, animation:`armtype ${1+idx*.11}s infinite`, animationDelay:`${idx*.06}s` }} />
          </div>
          <div className={pipClass} style={{ position:'absolute', top:-2, right:-2, width:5, height:5, borderRadius:'50%' }} />
        </div>
        <div style={{ background:'#0d1210', width:C?14:10, height:3, margin:'0 auto' }} />
        <div style={{ background:'#0a0d0c', borderRadius:1, width:C?24:18, height:2, margin:'0 auto' }} />
      </div>

      {/* Desk surface */}
      <div style={{ width:s.dW, height:C?9:7, background:dtBg, borderTop:`1px solid ${dtBd}`, position:'relative' }}>
        {C && <div style={{ position:'absolute', top:2, left:'50%', transform:'translateX(-50%)', fontSize:5, color:'#EF9F27', whiteSpace:'nowrap', ...MONO }}>CEO</div>}
        <div style={{ position:'absolute', top:-2, right:6, width:7, height:2, background:'#0f1210', borderRadius:1 }} />
      </div>
      <div style={{ width:s.dW, height:C?6:5, background:C?'#141200':'#0e1820', borderRadius:'0 0 2px 2px' }} />
      <div style={{ display:'flex', justifyContent:'space-between', width:s.dW-6, padding:'0 2px' }}>
        <div style={{ width:4, height:15, background:'#0c1010' }} />
        <div style={{ width:4, height:15, background:'#0c1010' }} />
      </div>

      {/* Name */}
      <div className="desk-name" style={{ ...MONO, fontSize:8, color:'#243040', textAlign:'center', lineHeight:1.4, marginTop:5, transition:'color .15s', letterSpacing:'.04em' }}>
        {d.nameLine1}<br />{d.nameLine2}
      </div>
    </div>
  )
}

/* ── Walker ── */
function Walker({ dir, skin, hair, shirt, pants }: { dir: 'lr' | 'rl'; skin: string; hair: string; shirt: string; pants: string }) {
  const dur = dir === 'lr' ? '18s' : '24s'
  return (
    <div style={{ position:'absolute', bottom:16, left: dir === 'lr' ? 0 : undefined, right: dir === 'rl' ? 0 : undefined, zIndex:5,
      display:'flex', flexDirection:'column', alignItems:'center',
      animation: dir === 'lr' ? `walklr ${dur} linear infinite` : `walkrl ${dur} linear infinite` }}>
      <div style={{ width:9, height:9, borderRadius:1, background:skin, position:'relative' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:hair, borderRadius:'1px 1px 0 0' }} />
      </div>
      <div style={{ width:13, height:11, background:shirt, borderRadius:1, margin:'1px auto 0' }} />
      <div style={{ display:'flex', gap:2 }}>
        <div style={{ width:6, height:7, background:pants, borderRadius:'0 0 1px 1px' }} />
        <div style={{ width:6, height:7, background:pants, borderRadius:'0 0 1px 1px' }} />
      </div>
    </div>
  )
}

/* ── Float notification ── */
interface FloatNote { id: number; text: string; color: string; pct: number }

/* ── Props ── */
export interface PixelOfficeProps {
  onDeskClick: (agentId: string) => void
  timePeriod: TimePeriod
  isRaining: boolean
  isCold: boolean
  tempF: number | null
}

export default function PixelOffice({ onDeskClick, timePeriod, isRaining, isCold, tempF }: PixelOfficeProps) {
  const theme = SCENE_THEME[timePeriod]
  const [floats, setFloats] = useState<FloatNote[]>([])
  let notifId = 0

  const rainDrops = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: (i * 2.5 + Math.sin(i * 7.3) * 15 + 50) % 100,
      delay: (i * 0.067) % 2.2,
      dur: 0.55 + (i % 7) * 0.06,
      opacity: 0.25 + (i % 4) * 0.12,
    }))
  , [])

  const handleDesk = useCallback((d: DeskCfg, idx: number) => {
    const id = ++notifId
    const pct = ((idx + .5) / DESKS.length) * 100
    setFloats(prev => [...prev, { id, text: `▶ ${d.nameLine1} ${d.nameLine2}`, color: d.glowColor, pct }])
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 2400)
    onDeskClick(d.id)
  }, [onDeskClick])

  // Window glow for time of day
  const winStyle = (i: number): React.CSSProperties => ({
    position: 'absolute', top: 24, left: `${20 + i * 28}%`,
    width: 28, height: 22, border: `1px solid ${theme.windowBorder}`,
    background: theme.windowBg, boxShadow: `0 0 10px ${theme.windowGlow}`,
    zIndex: 2,
  })

  return (
    <div style={{ height: 320, background: theme.sceneBg, position: 'relative', overflow: 'hidden', flexShrink: 0, transition: 'background 2s ease' }}>
      {/* Ambient lightning if storming */}
      {isRaining && (
        <div style={{ position:'absolute', inset:0, background:'rgba(200,220,255,.08)', animation:'lightning 8s ease-in-out infinite', pointerEvents:'none', zIndex:70 }} />
      )}

      {/* Scan line */}
      <div style={{ position:'absolute', left:0, right:0, height:2, background: theme.scanColor, animation:'scanline 8s linear infinite', pointerEvents:'none', zIndex:60 }} />
      {/* Vignette */}
      <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 50% 35%, transparent 40%, ${theme.vignetteEnd} 100%)`, pointerEvents:'none', zIndex:59 }} />

      {/* Ceiling */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:20, background: theme.ceilBg, borderBottom:`1px solid ${theme.wallBg}`, transition:'background 2s ease' }} />
      {/* Wall */}
      <div style={{ position:'absolute', top:20, left:0, right:0, height:55, background: theme.wallBg, transition:'background 2s ease' }} />
      {/* Floor strip */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:16, background: theme.floorBg, borderTop:`2px solid ${theme.wallBg}`, transition:'background 2s ease' }} />

      {/* Windows (time-themed) */}
      {[0,1,2].map(i => (
        <div key={i} style={winStyle(i)}>
          <div style={{ position:'absolute', top:'50%', left:0, right:0, height:1, background: theme.windowBorder }} />
          <div style={{ position:'absolute', top:0, bottom:0, left:'50%', width:1, background: theme.windowBorder }} />
          {/* Stars at night */}
          {(timePeriod === 'night' || timePeriod === 'evening') && [0,1,2].map(s => (
            <div key={s} style={{ position:'absolute', width:1, height:1, background:'#aac', borderRadius:'50%', top:`${20 + s*25}%`, left:`${15 + s*30}%`, opacity:.6 }} />
          ))}
        </div>
      ))}

      {/* Light fixtures */}
      {[8,22,36,50,64,78,91].map(pct => (
        <div key={pct} style={{ position:'absolute', top:20, left:`${pct}%`, width:2, height:7, background:'var(--teal)', opacity:.55 }}>
          <div style={{ position:'absolute', top:7, left:-34, background:`rgba(29,158,117,${theme.lbeamAlpha})`, clipPath:'polygon(30% 0,70% 0,100% 100%,0 100%)', width:68, height:200 }} />
        </div>
      ))}

      {/* Rain */}
      {isRaining && rainDrops.map(drop => (
        <div key={drop.id} style={{
          position:'absolute', top:0, left:`${drop.x}%`,
          width:1, height:10, background:`rgba(160,200,240,${drop.opacity})`,
          animation:`raindrop ${drop.dur}s linear infinite`,
          animationDelay:`${drop.delay}s`,
          transform:'scaleX(.4)', pointerEvents:'none', zIndex:55,
        }} />
      ))}

      {/* Walkers */}
      <Walker dir="lr" skin="#c8945a" hair="#2a1800" shirt="#1a3a6a" pants="#0f1a30" />
      <Walker dir="rl" skin="#d4a870" hair="#060e00" shirt="#0d2a1a" pants="#081a10" />

      {/* Desks */}
      <div style={{ display:'flex', justifyContent:'space-around', alignItems:'flex-end', position:'absolute', bottom:16, left:0, right:0, padding:'0 10px' }}>
        {DESKS.map((d, i) => (
          <DeskUnit key={d.id} d={d} idx={i} theme={theme} onClick={() => handleDesk(d, i)} />
        ))}
      </div>

      {/* Float notifications */}
      {floats.map(f => (
        <div key={f.id} style={{
          position:'absolute', bottom:50, left:`${f.pct}%`,
          transform:'translateX(-50%)', animation:'floatup 2.4s ease-out forwards',
          background:'#030806', border:`1px solid ${f.color}`,
          color:f.color, ...MONO, fontSize:9, padding:'3px 9px', borderRadius:2,
          pointerEvents:'none', whiteSpace:'nowrap', zIndex:80,
        }}>
          {f.text} activated
        </div>
      ))}

      {/* Temp badge */}
      {tempF !== null && (
        <div style={{ position:'absolute', top:6, right:10, ...MONO, fontSize:9, color: isCold ? '#60a5fa' : '#fbbf24', background:'rgba(0,0,0,.4)', padding:'2px 7px', borderRadius:3, border:`1px solid ${isCold ? '#1e3a5a' : '#3a2a00'}` }}>
          {isRaining ? '🌧' : isCold ? '❄️' : timePeriod === 'morning' ? '🌅' : timePeriod === 'day' ? '☀️' : timePeriod === 'golden' ? '🌇' : '🌙'} Austin {tempF}°F
        </div>
      )}

      {/* Time-of-day label */}
      <div style={{ position:'absolute', top:6, left:10, ...MONO, fontSize:8, color:'#243040', letterSpacing:1, textTransform:'uppercase' }}>
        {{ morning:'⬆ Morning', day:'☀ Daytime', golden:'🟠 Golden Hour', evening:'🌆 Evening', night:'🌙 Night' }[timePeriod]}
      </div>
    </div>
  )
}
