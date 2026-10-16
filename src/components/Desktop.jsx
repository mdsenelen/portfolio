import { useEffect, useRef, useState } from 'react'

const hrefOf = (profile, label) => profile.links.find((l) => l.label === label)?.href || ''

const ICONS = [
  { id: 'projects', label: 'Projects', glyph: '📁', tint: '#ffb6d6' },
  { id: 'readme', label: 'README.txt', glyph: '📝', tint: '#fff0a6' },
  { id: 'github', label: 'GitHub', glyph: '🐙', tint: '#e8e0f4' },
  { id: 'linkedin', label: 'LinkedIn', glyph: '💼', tint: '#c3dd9c' },
  { id: 'mail', label: 'Mail', glyph: '✉️', tint: '#c9b3ea' },
  { id: 'resume', label: 'Resume.pdf', glyph: '📄', tint: '#ffe3bf' },
]

const TITLES = {
  projects: 'Projects',
  readme: 'README.txt',
  github: 'GitHub',
  linkedin: 'LinkedIn',
  mail: 'Mail',
  resume: 'Resume.pdf',
}

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="desktop__clock">
      {now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
      {' '}
      {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  )
}

function WindowBody({ id, profile, about, skills, projects }) {
  if (id === 'projects') {
    return (
      <ul className="win__projects">
        {projects.map((p) => (
          <li key={p.id} className="win__project">
            <div className="win__project-head">
              <strong>{p.title}</strong>
              <span className="win__year">{p.year}</span>
            </div>
            <p>{p.summary}</p>
            <div className="win__meta">
              <span className="win__tech">{p.tech.join(' · ')}</span>
              <span className="win__links">
                {p.repo && <a href={p.repo} target="_blank" rel="noreferrer">repo ↗</a>}
                {p.live && <a href={p.live} target="_blank" rel="noreferrer">live ↗</a>}
              </span>
            </div>
          </li>
        ))}
      </ul>
    )
  }
  if (id === 'readme') {
    return (
      <div className="win__readme">
        <h2>{profile.name}</h2>
        <p className="win__role">{profile.role}</p>
        {about.map((para, i) => <p key={i}>{para}</p>)}
        <ul className="win__skills">
          {skills.map((s) => <li key={s}>{s}</li>)}
        </ul>
      </div>
    )
  }
  if (id === 'github' || id === 'linkedin') {
    const url = hrefOf(profile, id === 'github' ? 'GitHub' : 'LinkedIn')
    return (
      <div className="win__link">
        <a className="win__big" href={url} target="_blank" rel="noreferrer">
          open {url.replace(/^https?:\/\//, '')} ↗
        </a>
      </div>
    )
  }
  if (id === 'mail') {
    return (
      <div className="win__link">
        <p>Coffee, a role, a project, or just to say hi</p>
        <a className="win__big" href={`mailto:${profile.email}`}>{profile.email}</a>
      </div>
    )
  }
  if (id === 'resume') {
    return (
      <div className="win__link">
        <p>{profile.name} — curriculum vitae, PDF.</p>
        <a className="win__big" href="/resume.pdf" download>download resume.pdf ↓</a>
        <a className="win__alt" href="/resume.pdf" target="_blank" rel="noreferrer">or open in a new tab</a>
      </div>
    )
  }
  return null
}

export default function Desktop({ profile, about, skills, projects, onClose }) {
  const [wins, setWins] = useState([])
  const topRef = useRef(20)
  const dragRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const open = (id) => {
    setWins((ws) => {
      if (ws.some((w) => w.id === id)) {
        topRef.current += 1
        return ws.map((w) => (w.id === id ? { ...w, z: topRef.current } : w))
      }
      topRef.current += 1
      const n = ws.length
      return [...ws, { id, x: 150 + n * 32, y: 88 + n * 28, z: topRef.current }]
    })
  }

  const closeWin = (id) => setWins((ws) => ws.filter((w) => w.id !== id))

  const raise = (id) => {
    topRef.current += 1
    const z = topRef.current
    setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z } : w)))
  }

  const onTitlePointerDown = (e, win) => {
    raise(win.id)
    dragRef.current = { id: win.id, dx: e.clientX - win.x, dy: e.clientY - win.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onTitlePointerMove = (e) => {
    const d = dragRef.current
    if (!d) return
    const x = Math.min(Math.max(e.clientX - d.dx, -40), window.innerWidth - 120)
    const y = Math.min(Math.max(e.clientY - d.dy, 34), window.innerHeight - 60)
    setWins((ws) => ws.map((w) => (w.id === d.id ? { ...w, x, y } : w)))
  }
  const onTitlePointerUp = () => { dragRef.current = null }

  return (
    <div className="desktop" role="dialog" aria-modal="true" aria-label="Desktop with projects and links">
      <div className="desktop__wallpaper" aria-hidden="true" />
      <header className="desktop__bar">
        <span className="desktop__brand">⌂ {profile.name}</span>
        <span className="desktop__menu" aria-hidden="true">File&nbsp;&nbsp;Edit&nbsp;&nbsp;View&nbsp;&nbsp;Go</span>
        <span className="desktop__bar-right">
          <Clock />
          <button type="button" className="desktop__back" onClick={onClose}>← back to room</button>
        </span>
      </header>
      <ul className="desktop__icons">
        {ICONS.map((ic) => (
          <li key={ic.id}>
            <button type="button" className="desktop__icon" onClick={() => open(ic.id)}>
              <span className="desktop__glyph" style={{ background: ic.tint }} aria-hidden="true">{ic.glyph}</span>
              <span className="desktop__label">{ic.label}</span>
            </button>
          </li>
        ))}
      </ul>
      {wins.map((w) => (
        <div
          key={w.id}
          className="window"
          style={{ left: w.x, top: w.y, zIndex: w.z }}
          onPointerDown={() => raise(w.id)}
        >
          <div
            className="window__title"
            onPointerDown={(e) => onTitlePointerDown(e, w)}
            onPointerMove={onTitlePointerMove}
            onPointerUp={onTitlePointerUp}
          >
            <span className="window__dots" aria-hidden="true">
              <i className="window__dot window__dot--close" />
              <i className="window__dot window__dot--min" />
            </span>
            <span className="window__name">{TITLES[w.id]}</span>
            <button
              type="button"
              className="window__x"
              aria-label={`Close ${TITLES[w.id]}`}
              onPointerDown={(e) => { e.stopPropagation(); raise(w.id) }}
              onClick={() => closeWin(w.id)}
            >✕</button>
          </div>
          <div className="window__body">
            <WindowBody id={w.id} profile={profile} about={about} skills={skills} projects={projects} />
          </div>
        </div>
      ))}
    </div>
  )
}
