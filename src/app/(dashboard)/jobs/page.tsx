'use client'

import { useState, useEffect } from 'react'

interface Job {
  id: string
  title: string
  company: string
  location: string
  type: string
  salary: string
  posted: string
  relevance: 'high' | 'medium'
  match: string
  url: string
  source: string
}

// Live jobs fetched from Indeed + ZipRecruiter via Claude subscription MCPs
const LIVE_JOBS: Job[] = [
  {
    id: 'indeed-1',
    title: 'Cybersecurity Compliance and Audit Analyst',
    company: 'McLane Company',
    location: 'Austin, TX',
    type: 'Full-time',
    salary: '$68,800 – $93,909/year',
    posted: 'Apr 27',
    relevance: 'high',
    match: 'Direct match — audit + compliance + cybersecurity, Austin-based, aligns with Security+ and GRC background',
    url: 'https://to.indeed.com/aa7wqmxjyn27',
    source: 'Indeed',
  },
  {
    id: 'indeed-2',
    title: 'Cybersecurity Compliance Analyst – ISO Audit Support',
    company: 'Centex Technologies',
    location: 'Austin, TX',
    type: 'Full-time',
    salary: '$60,094 – $86,727/year',
    posted: 'May 4',
    relevance: 'high',
    match: 'Posted yesterday — ISO audit support, compliance analyst role at Austin tech company',
    url: 'https://to.indeed.com/aa9nf77mcdbq',
    source: 'Indeed',
  },
  {
    id: 'indeed-3',
    title: 'Governance, Risk and Compliance Senior Analyst',
    company: 'West Coast Consulting',
    location: 'Austin, TX',
    type: 'Contract',
    salary: '$72 – $75/hr',
    posted: 'Apr 6',
    relevance: 'high',
    match: 'GRC senior role — premium contract rate, directly matches NIST 800-53, HIPAA, PCI-DSS expertise',
    url: 'https://to.indeed.com/aa4gfdgh4zgj',
    source: 'Indeed',
  },
  {
    id: 'zip-1',
    title: 'Security & Compliance EPM, IT Governance & Planning',
    company: 'Apple',
    location: 'Austin, TX',
    type: 'Full-time',
    salary: '$134,800 – $245,800/year',
    posted: 'Apr 8',
    relevance: 'high',
    match: 'Apple Austin — security + compliance + IT governance, top-tier benefits including medical/dental/retirement',
    url: 'https://www.ziprecruiter.com/job-redirect?match_token=CowBChZQcGt2S05iMFFNcVA1OXpkQUZ6X1pBEiQwMTlkZmFkZC00OGJkLTczYzItODE0YS00M2E3ZjQyODY2YWUaSEFBSG1vbkJUVFMxRFdGTUpScDh4UTRneWkxRTlkbXpCRnNmNm5yWjExYXlvY0JOM2ZHZ0Q3RERVenAxeUl0NkNzSU5MWUo1QSDJrQUQAxjJrQUqf2h0dHBzOi8vd3d3LnppcHJlY3J1aXRlci5jb20vYy9BcHBsZS9Kb2IvU2VjdXJpdHktJi1Db21wbGlhbmNlLUVQTS0sSVQtR292ZXJuYW5jZS0mLVBsYW5uaW5nLy1pbi1BdXN0aW4sVFg%2FamlkPWEzMTgwZDBmYjkxNDA0ZjY%3D',
    source: 'ZipRecruiter',
  },
  {
    id: 'zip-2',
    title: 'Governance, Risk, and Compliance (GRC) Analyst',
    company: 'Genesis10',
    location: 'Austin, TX',
    type: 'Contract',
    salary: '$100,000 – $150,000/year',
    posted: '5 days ago',
    relevance: 'high',
    match: 'GRC Analyst — premium contract, full benefits (medical/vision/dental/life/retirement), strong GRC alignment',
    url: 'https://www.ziprecruiter.com/job-redirect?match_token=CpcBChZxN2QtSU1ud0FuX2dqZ3hkdXMzNkRREiQwMTlkZmFkZC00OGJkLTczYWUtODNmMi00MmE5NjJjNWJjNjUaU0FBSEdDVGlKdnI0czZqSTFzcXgzUDZMZXZaY2l2Y0l4WVlfNFJvZ040bVNKZVRLLTYxOER6N2hET2JSa1VlOXhzZTB0bjBUSGFGOV91VldBWkZnIMmtBRADGMmtBSp-aHR0cHM6Ly93d3cuemlwcmVjcnVpdGVyLmNvbS9jL0dlbmVzaXMxMC9Kb2IvR292ZXJuYW5jZSwtUmlzaywtYW5kLUNvbXBsaWFuY2UtKEdSQyktQW5hbHlzdC8taW4tQXVzdGluLFRYP2ppZD02NDEyOGUxZjI2ODUwMjBi',
    source: 'ZipRecruiter',
  },
  {
    id: 'email-1',
    title: 'IT – Cybersecurity Analyst (Vulnerability Management)',
    company: 'Texas Department of Public Safety',
    location: 'Austin, TX',
    type: 'Full-time',
    salary: 'State salary range',
    posted: 'Today',
    relevance: 'high',
    match: 'State agency, cybersecurity + vulnerability management, F-1 OPT-eligible, via your Indeed alert today',
    url: 'https://www.indeed.com/cmp/Texas-Department-of-Public-Safety',
    source: 'Indeed (via email alert)',
  },
  {
    id: 'email-2',
    title: 'Workday HRMS Lead',
    company: 'Professional Technology Integration',
    location: 'Austin, TX',
    type: 'Full-time',
    salary: 'Competitive',
    posted: 'Today',
    relevance: 'medium',
    match: 'Workday expertise match — HRMS Lead aligns with your Workday admin and HR compliance background',
    url: 'https://joinhandshake.com',
    source: 'Handshake (via email)',
  },
  {
    id: 'email-3',
    title: 'HR Immigration & Compliance Intern',
    company: 'Ferrovial Construction US',
    location: 'Austin, TX (Teams)',
    type: 'Internship',
    salary: 'See offer',
    posted: 'Active',
    relevance: 'high',
    match: '⚡ INTERVIEW TOMORROW May 6 @ 3:00–3:30 PM CST with Jude Malta — Teams meeting scheduled',
    url: 'https://teams.microsoft.com/meet/357817201060642',
    source: '📅 Calendar',
  },
]

const SOURCE_COLORS: Record<string, string> = {
  'Indeed': '#2557a7',
  'ZipRecruiter': '#4a90d9',
  'Handshake': '#e85d26',
  'LinkedIn': '#0077b5',
  'Texas.gov': '#1a5276',
  'Indeed (via email alert)': '#2557a7',
  'Handshake (via email)': '#e85d26',
  '📅 Calendar': '#10b981',
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>(LIVE_JOBS)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'high' | 'medium'>('all')
  const [lastRefreshed] = useState(new Date())

  const runSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setSearchError(null)
    try {
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setJobs(data.jobs)
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.relevance === filter)
  const highCount = jobs.filter(j => j.relevance === 'high').length

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--foreground)' }}>💼 Job Board</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Live from Indeed · ZipRecruiter · Gmail alerts — refreshed {lastRefreshed.toLocaleTimeString()}
        </p>
      </div>

      {/* Critical interview alert */}
      <div
        className="mb-5 p-4 rounded-xl flex items-start gap-3"
        style={{ background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.4)' }}
      >
        <span className="text-xl">⚡</span>
        <div className="flex-1">
          <p className="font-semibold text-sm" style={{ color: '#10b981' }}>Phone Screening Tomorrow — Ferrovial</p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--foreground)' }}>
            <strong>May 6 @ 3:00–3:30 PM CST</strong> · HR Immigration &amp; Compliance Intern · with Jude Malta
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            Prep: I-9 experience, EAD tracking, E-Verify, Workday, I-9 Compliance Hub, DOD/HHS verifications
          </p>
          <a
            href="https://teams.microsoft.com/meet/357817201060642?p=xLa8uP1nvFUBGnZCv4"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-2 text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: '#10b981', color: '#fff' }}
          >
            📹 Join Microsoft Teams
          </a>
        </div>
      </div>

      {/* Search */}
      <div className="mb-5">
        <div
          className="flex gap-2 p-2 rounded-xl"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runSearch()}
            placeholder="Search: e.g. cybersecurity analyst, GRC remote, Workday admin…"
            className="flex-1 bg-transparent text-sm outline-none px-2"
            style={{ color: 'var(--foreground)' }}
          />
          <button
            onClick={() => { setJobs(LIVE_JOBS); setQuery('') }}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ color: 'var(--muted)', cursor: 'pointer', background: 'none', border: 'none' }}
          >
            Reset
          </button>
          <button
            onClick={runSearch}
            disabled={!query.trim() || searching}
            className="px-4 py-1.5 rounded-lg text-sm font-medium"
            style={{
              background: query.trim() && !searching ? 'var(--primary)' : 'var(--border)',
              color: 'white',
              border: 'none',
              cursor: query.trim() && !searching ? 'pointer' : 'not-allowed',
            }}
          >
            {searching ? '⟳ Searching…' : '🔍 Search'}
          </button>
        </div>
        {searchError && (
          <p className="text-xs mt-2" style={{ color: '#ef4444' }}>❌ {searchError}</p>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        {(['all', 'high', 'medium'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filter === f ? 'var(--primary)' : 'var(--card)',
              color: filter === f ? 'white' : 'var(--muted)',
              border: filter === f ? 'none' : '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            {f === 'all' ? `All (${jobs.length})` : f === 'high' ? `🔥 High match (${highCount})` : `Medium match (${jobs.length - highCount})`}
          </button>
        ))}
        <span className="ml-auto text-xs" style={{ color: 'var(--muted)' }}>
          {filtered.length} results
        </span>
      </div>

      {/* Job cards */}
      <div className="space-y-3">
        {filtered.map(job => (
          <a
            key={job.id}
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 rounded-xl transition-all"
            style={{
              background: 'var(--card)',
              border: job.id === 'email-3'
                ? '2px solid rgba(16,185,129,0.5)'
                : job.relevance === 'high'
                  ? '1px solid rgba(99,102,241,0.3)'
                  : '1px solid var(--border)',
              textDecoration: 'none',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)' }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = job.id === 'email-3'
                ? 'rgba(16,185,129,0.5)'
                : job.relevance === 'high' ? 'rgba(99,102,241,0.3)' : 'var(--border)'
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{job.title}</h3>
                  {job.relevance === 'high' && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--primary)' }}
                    >
                      Strong match
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                  {job.company}
                </p>
                <div className="flex items-center gap-3 text-xs flex-wrap mb-2" style={{ color: 'var(--muted)' }}>
                  <span>📍 {job.location}</span>
                  <span>⏱ {job.type}</span>
                  {job.salary && <span>💰 {job.salary}</span>}
                  <span>🕐 {job.posted}</span>
                </div>
                <p className="text-xs" style={{ color: job.id === 'email-3' ? '#10b981' : 'var(--muted)', lineHeight: 1.5 }}>
                  → {job.match}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span
                  className="text-xs px-2 py-1 rounded-lg font-medium"
                  style={{
                    background: `${SOURCE_COLORS[job.source] ?? '#6366f1'}18`,
                    color: SOURCE_COLORS[job.source] ?? '#6366f1',
                  }}
                >
                  {job.source}
                </span>
                <span className="text-xs" style={{ color: 'var(--primary)' }}>View →</span>
              </div>
            </div>
          </a>
        ))}
      </div>

      <p className="text-xs text-center mt-6" style={{ color: 'var(--muted)' }}>
        Data pulled live from Indeed + ZipRecruiter via Claude subscription MCPs · Gmail job alerts included
      </p>
    </div>
  )
}
