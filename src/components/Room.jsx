import { useEffect, useRef, useState } from 'react'
import { createRoom } from '../room/scene.js'
import { about, githubProjects, profile, projects, skills } from '../content.js'
import Desktop from './Desktop.jsx'

const hrefOf = (label) => profile.links.find((link) => link.label === label)?.href || ''
const selectedProjects = githubProjects.filter((project) => project.cardOnHover)
let youtubeApiPromise

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve, reject) => {
      const previousCallback = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        previousCallback?.()
        resolve(window.YT)
      }
      let script = document.getElementById('youtube-iframe-api')
      if (!script) {
        script = document.createElement('script')
        script.id = 'youtube-iframe-api'
        script.src = 'https://www.youtube.com/iframe_api'
        script.onerror = reject
        document.head.appendChild(script)
      }
    })
  }
  return youtubeApiPromise
}

export default function Room() {
  const stageRef = useRef(null)
  const roomRef = useRef(null)
  const playerHostRef = useRef(null)
  const youtubePlayerRef = useRef(null)
  const youtubeReadyRef = useRef(false)
  const pendingPlayRef = useRef(false)
  const youtubeTrackIndexRef = useRef(0)
  const [desktopOpen, setDesktopOpen] = useState(false)
  const [projectsOpen, setProjectsOpen] = useState(false)
  const [projectDetails, setProjectDetails] = useState({})
  const [musicOpen, setMusicOpen] = useState(false)
  const [musicState, setMusicState] = useState('stopped')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    let active = true
    loadYouTubeApi().then((YT) => {
      if (!active || !playerHostRef.current) return
      youtubePlayerRef.current = new YT.Player(playerHostRef.current, {
        width: '320',
        height: '180',
        videoId: profile.youtubeTrackIds[0],
        playerVars: { autoplay: 0, controls: 1, playsinline: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: (event) => {
            if (!active) return
            youtubeReadyRef.current = true
            if (pendingPlayRef.current) {
              pendingPlayRef.current = false
              event.target.playVideo()
            }
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) setMusicState('playing')
            else if (event.data === YT.PlayerState.PAUSED) setMusicState('paused')
            else if (event.data === YT.PlayerState.ENDED) {
              if (youtubeTrackIndexRef.current === 0) {
                youtubeTrackIndexRef.current = 1
                youtubePlayerRef.current?.loadVideoById(profile.youtubeTrackIds[1])
              } else {
                setMusicState('stopped')
              }
            } else if (event.data === YT.PlayerState.CUED) setMusicState('stopped')
          },
          onAutoplayBlocked: () => setMusicState('paused'),
          onError: () => {
            pendingPlayRef.current = false
            setMusicState('stopped')
          },
        },
      })
    }).catch(() => undefined)
    return () => {
      active = false
      youtubePlayerRef.current?.destroy()
      youtubePlayerRef.current = null
      youtubeReadyRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!projectsOpen) return
    let active = true
    Promise.all(selectedProjects.map(async (project) => {
      try {
        const response = await fetch(`https://api.github.com/repos/mdsenelen/${encodeURIComponent(project.id)}`, {
          headers: { Accept: 'application/vnd.github+json' },
        })
        if (!response.ok) throw new Error('GitHub project details unavailable')
        const repo = await response.json()
        const languageResponse = await fetch(repo.languages_url, {
          headers: { Accept: 'application/vnd.github+json' },
        }).catch(() => null)
        const languageData = languageResponse?.ok ? await languageResponse.json().catch(() => ({})) : {}
        return {
          ...project,
          name: repo.name || project.name,
          description: repo.description || project.description,
          language: repo.language || project.language,
          languages: Object.keys(languageData),
          href: repo.html_url || project.href,
          live: repo.homepage || project.live,
        }
      } catch {
        return project
      }
    })).then((details) => {
      if (!active) return
      setProjectDetails((current) => ({
        ...current,
        ...Object.fromEntries(details.map((project) => [project.id, project])),
      }))
    })
    return () => { active = false }
  }, [projectsOpen])

  useEffect(() => {
    if (!projectsOpen) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setProjectsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [projectsOpen])

  useEffect(() => {
    const room = createRoom({
      container: stageRef.current,
      profile: { name: profile.name, role: profile.role, skills },
      links: {
        github: hrefOf('GitHub'),
        linkedin: hrefOf('LinkedIn'),
        resume: profile.resumeHref,
        instagram: profile.instagram,
        email: profile.email ? `mailto:${profile.email}` : '',
        hobby: profile.hobby?.href || '',
        medium: profile.mediumHref,
        youtubeTrack: profile.youtubeTrackHref,
      },
      onOpenProjects: () => {
        setProjectsOpen(true)
        setTouched(true)
      },
      onTrackPlay: () => {
        youtubeTrackIndexRef.current = 0
        pendingPlayRef.current = true
        if (youtubeReadyRef.current && youtubePlayerRef.current) {
          pendingPlayRef.current = false
          youtubePlayerRef.current.loadVideoById(profile.youtubeTrackIds[0])
        }
        setMusicOpen(true)
      },
      onOpenDesktop: () => {
        setDesktopOpen(true)
        setTouched(true)
      },
    })
    roomRef.current = room
    return () => {
      room.dispose()
      roomRef.current = null
    }
  }, [])

  return (
    <div className="room">
      <div
        ref={stageRef}
        className="room__stage"
        role="img"
        aria-label="A 3D room with a desk, a project box that opens selected projects, a guitar that opens a YouTube player, sticky notes on a leopard-print board and a window onto a garden."
      />
      {!touched && (
        <p className="room__hint">
          laptop: desktop · project box: projects · notebooks: Medium · guitar: music
        </p>
      )}
      {projectsOpen && (
        <div className="room__projects-overlay" onClick={() => setProjectsOpen(false)}>
          <section
            className="room__projects-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="selected-projects-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="room__projects-header">
              <div>
                <span className="room__project-source">Portfolio</span>
                <h1 id="selected-projects-title">Selected projects</h1>
              </div>
              <button type="button" aria-label="Close projects" onClick={() => setProjectsOpen(false)}>×</button>
            </header>
            <div className="room__projects-list" tabIndex="0" aria-label="Project list">
              {selectedProjects.map((project) => {
                const details = projectDetails[project.id] || project
                return (
                  <article className="room__project-item" key={project.id}>
                    <h2>{details.name}</h2>
                    <p>{details.description}</p>
                    <ul className="room__project-tech" aria-label={`${details.name} technologies`}>
                      {[...new Set([...(details.languages || [details.language]), ...details.technologies])].map((technology) => (
                        <li key={technology}>{technology}</li>
                      ))}
                    </ul>
                    <div className="room__project-footer">
                      <a href={details.href} target="_blank" rel="noreferrer">GitHub ↗</a>
                      {details.live && <a href={details.live} target="_blank" rel="noreferrer">Live demo ↗</a>}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </div>
      )}
      <aside
        className={musicOpen ? 'room__music-player' : 'room__music-preload'}
        aria-label={musicOpen ? 'YouTube mini player' : undefined}
      >
        {musicOpen && (
          <div className="room__music-header">
            <strong>YouTube song</strong>
            <button
              type="button"
              aria-label="Close mini player"
              onClick={() => { pendingPlayRef.current = false; youtubePlayerRef.current?.stopVideo(); setMusicOpen(false); setMusicState('stopped') }}
            >×</button>
          </div>
        )}
        <div className="room__music-embed-slot">
          <div className="room__music-embed" ref={playerHostRef} />
        </div>
        {musicOpen && (
          <div className="room__music-actions">
            {musicState === 'playing' ? (
              <button type="button" onClick={() => { pendingPlayRef.current = false; youtubePlayerRef.current?.pauseVideo() }}>Pause</button>
            ) : (
              <button type="button" onClick={() => {
                pendingPlayRef.current = true
                if (youtubeReadyRef.current && youtubePlayerRef.current) {
                  pendingPlayRef.current = false
                  youtubePlayerRef.current.playVideo()
                }
              }}>Play</button>
            )}
            <button type="button" onClick={() => { pendingPlayRef.current = false; youtubePlayerRef.current?.stopVideo() }}>Stop</button>
            <a href={profile.youtubeTrackHref}>Open on YouTube ↗</a>
          </div>
        )}
      </aside>
      <nav className="sr-only" aria-label="Portfolio links">
        <ul>
          {hrefOf('GitHub') && <li><a href={hrefOf('GitHub')} target="_blank" rel="noreferrer">GitHub</a></li>}
          {githubProjects.map((project) => (
            <li key={project.id}><a href={project.bookHref} target="_blank" rel="noreferrer">{project.name}</a></li>
          ))}
          {profile.youtubeTrackHref && <li><a href={profile.youtubeTrackHref}>Song on YouTube</a></li>}
          {profile.mediumHref && <li><a href={profile.mediumHref} target="_blank" rel="noreferrer">Medium</a></li>}
          {hrefOf('LinkedIn') && <li><a href={hrefOf('LinkedIn')} target="_blank" rel="noreferrer">LinkedIn</a></li>}
          {profile.resumeHref && <li><a href={profile.resumeHref}>Resume (PDF)</a></li>}
          {profile.email && <li><a href={`mailto:${profile.email}`}>Email {profile.name}</a></li>}
          {profile.instagram && <li><a href={profile.instagram} target="_blank" rel="noreferrer">Instagram</a></li>}
          {profile.hobby?.href && <li><a href={profile.hobby.href} target="_blank" rel="noreferrer">{profile.hobby.label}</a></li>}
          <li><button type="button" onClick={() => roomRef.current?.toggleNight()}>Toggle day / night mode</button></li>
          <li><button type="button" onClick={() => setProjectsOpen(true)}>Open selected projects</button></li>
          <li><button type="button" onClick={() => { setDesktopOpen(true); setTouched(true) }}>Open desktop with projects and links</button></li>
        </ul>
      </nav>
      {desktopOpen && (
        <Desktop
          profile={profile}
          about={about}
          skills={skills}
          projects={projects}
          onClose={() => setDesktopOpen(false)}
        />
      )}
    </div>
  )
}