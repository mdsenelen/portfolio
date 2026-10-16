import * as THREE from 'three'

// Ported from the Claude Design export "Workstation Background.html".
// Design-tool chrome (tweaks panel, edit-mode postMessage, CDN importmap) is gone;
// links, profile copy, night mode and the desktop-view callback are injected instead.

const TW = { sky: '#4aa8f0', wall: 'violet', drift: true, parallax: 1 }
const NIGHT_KEY = 'room-night'

export function createRoom({ container, links = {}, profile = {}, onOpenDesktop, onOpenProjects, onTrackPlay }) {
  const canvas = document.createElement('canvas')
  canvas.className = 'room__canvas'
  container.appendChild(canvas)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  const aniso = renderer.capabilities.getMaxAnisotropy()

  const scene = new THREE.Scene()
  const bgDay = new THREE.Color(0xc9b3ea)
  const bgNight = new THREE.Color(0x2a1f44)
  scene.background = bgDay.clone()
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40)

  let night = false
  try { night = localStorage.getItem(NIGHT_KEY) === '1' } catch { /* storage unavailable */ }
  let nightK = night ? 1 : 0
  let disposed = false

  /* ---------- helpers ---------- */
  const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0, ...o })
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d)
  function mesh(geo, mat, name, parent, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, mat); m.name = name; m.position.set(x, y, z)
    m.castShadow = m.receiveShadow = true; if (parent) parent.add(m); return m
  }
  function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h
    draw(c.getContext('2d'), w, h)
    const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = aniso; t.userData.draw = draw; return t
  }
  function strand(a, b, r, mat, name, parent) {
    const len = a.distanceTo(b)
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), mat)
    m.name = name; m.position.copy(a).add(b).multiplyScalar(0.5)
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
    m.castShadow = true; parent.add(m); return m
  }
  function redraw(tex) {
    const c = tex.image
    tex.userData.draw(c.getContext('2d'), c.width, c.height)
    tex.needsUpdate = true
  }

  /* ---------- environment (soft studio reflections) ---------- */
  {
    const env = new THREE.Scene()
    env.add(new THREE.Mesh(new THREE.SphereGeometry(20, 24, 16), new THREE.MeshBasicMaterial({ color: 0xcdb4ee, side: THREE.BackSide })))
    const panel = (c, s, p) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(...s), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(...p); m.lookAt(0, 0, 0); env.add(m) }
    panel(new THREE.Color(7, 6.6, 6), [10, 6], [4, 9, 6])
    panel(new THREE.Color(3.2, 0.9, 2.2), [6, 6], [-9, 3, 4])
    panel(new THREE.Color(1.6, 2.4, 1.2), [6, 4], [9, 2, -2])
    const pm = new THREE.PMREMGenerator(renderer)
    scene.environment = pm.fromScene(env, 0.04).texture
    scene.environmentIntensity = 0.4
    pm.dispose()
  }

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight(0xe6f2ff, 0xd9c2a0, 0.5)
  scene.add(hemi)
  const key = new THREE.DirectionalLight(0xfff4e0, 0.5)
  key.position.set(1.8, 3.2, 2.6); key.target.position.set(0, 0.8, 0)
  scene.add(key, key.target)
  const sun = new THREE.DirectionalLight(0xffe2a8, 3.0)
  sun.position.set(1.0, 3.04, -3.12); sun.target.position.set(0.4, 1.0, 0)
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096)
  Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 12 })
  sun.shadow.camera.updateProjectionMatrix(); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.015; sun.shadow.radius = 3
  scene.add(sun, sun.target)
  const rim = new THREE.DirectionalLight(0xbfdcff, 0.5); rim.position.set(-2.6, 1.6, 1.6); scene.add(rim)

  /* ---------- room ---------- */
  const room = new THREE.Group(); room.name = 'room'; scene.add(room)
  const WALLS = { violet: ['#ad8ed6', '#bfa3e4'], lavender: ['#b9a2e0', '#c8b5ec'], pink: ['#f2a6cf', '#f8bddb'], mint: ['#a8dcc8', '#bde8d8'], butter: ['#f2dc8e', '#f7e8a8'] }
  function drawWall(g, w, h, [c1]) { g.fillStyle = c1; g.fillRect(0, 0, w, h) }
  const wallTex = canvasTex(512, 512, (g, w, h) => drawWall(g, w, h, WALLS[TW.wall] || WALLS.lavender))
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(10, 4)
  const wallMat = M(0xffffff, { map: wallTex, roughness: 0.95, name: 'wall_violet' })
  const wall = mesh(new THREE.PlaneGeometry(10, 3.6), wallMat, 'wall', room, 0, 1.8, -0.45)
  wall.castShadow = false
  const wallL = mesh(new THREE.PlaneGeometry(10, 3.6), wallMat, 'wall_left', room, -1.75, 1.8, 4.55); wallL.rotation.y = Math.PI / 2; wallL.castShadow = false
  const wallR = mesh(new THREE.PlaneGeometry(10, 3.6), wallMat, 'wall_right', room, 2.3, 1.8, 4.55); wallR.rotation.y = -Math.PI / 2; wallR.castShadow = false
  const bbM = M(0xe0338a, { roughness: 0.5, name: 'baseboard_pink' })
  mesh(box(0.02, 0.12, 10), bbM, 'baseboard_left', room, -1.74, 0.06, 4.55)
  mesh(box(0.02, 0.12, 10), bbM, 'baseboard_right', room, 2.29, 0.06, 4.55)
  mesh(box(10, 0.12, 0.02), M(0xe0338a, { roughness: 0.5, name: 'baseboard_pink' }), 'baseboard', room, 0, 0.06, -0.44)

  const floorTex = canvasTex(512, 512, (g, w) => {
    const cols = ['#e8e06a', '#b6d558', '#efe87c', '#a9cd52']
    for (let i = 0; i < 8; i++) {
      g.fillStyle = cols[i % 4]; g.fillRect(0, i * 64, w, 64)
      g.fillStyle = 'rgba(90,100,20,.10)'; for (let k = 0; k < 30; k++) g.fillRect(Math.random() * w, i * 64 + 4 + Math.random() * 56, 30 + Math.random() * 110, 1)
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, i * 64 + 2, w, 2)
      g.fillStyle = 'rgba(70,90,20,.45)'; g.fillRect(0, i * 64, w, 2)
      g.fillRect((i * 211 + 60) % w, i * 64, 2, 64)
    }
  })
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(5, 3)
  const floor = mesh(new THREE.PlaneGeometry(14, 8), M(0xffffff, { map: floorTex, roughness: 0.5, name: 'floor_wood' }), 'floor', room, 0, 0, 3.55)
  floor.rotation.x = -Math.PI / 2; floor.castShadow = false

  const rugTex = canvasTex(1024, 256, (g, w, h) => {
    const s = [['#ff4fa3', 84], ['#ffffff', 28], ['#9be34a', 72], ['#ffe14a', 60], ['#7c4dcc', 72], ['#16141a', 48], ['#ffffff', 28], ['#ff4fa3', 60], ['#9be34a', 72], ['#ffffff', 28]]
    let x = 0, i = 0; while (x < w) { const [c, wd] = s[i++ % s.length]; g.fillStyle = c; g.fillRect(x, 0, wd, h); x += wd }
  })
  const rug = new THREE.Group(); rug.name = 'rug_shag'; room.add(rug); rug.position.set(0.05, 0.002, 0.5)
  const furNoise = canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) { const v = Math.random() * 255 | 0; g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; g.fillRect(x, y, 2, 2) } }, false)
  furNoise.wrapS = furNoise.wrapT = THREE.RepeatWrapping; furNoise.repeat.set(11, 11)
  {
    const N = 10
    for (let i = 0; i < N; i++) {
      const k = i / (N - 1), sh = 0.5 + 0.5 * k
      const m = new THREE.MeshStandardMaterial({ map: rugTex, color: new THREE.Color(sh, sh, sh), roughness: 1, name: 'rug_fur_' + i, alphaMap: i ? furNoise : null, alphaTest: i ? 0.06 + 0.86 * k : 0, side: THREE.DoubleSide })
      const p = new THREE.Mesh(new THREE.CircleGeometry(0.72, 72), m); p.rotation.x = -Math.PI / 2; p.position.y = i * 0.0036; p.receiveShadow = true; p.name = 'rug_layer_' + i; rug.add(p)
    }
  }

  /* ---------- desk ---------- */
  const TOP = 0.77
  const desk = new THREE.Group(); desk.name = 'desk'; scene.add(desk)
  const deskMat = new THREE.MeshPhysicalMaterial({ color: 0x1b191d, roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.25, name: 'desk_black_lacquer' })
  const woodDark = M(0xf3eeee, { roughness: 0.4, name: 'desk_white' })
  mesh(box(1.5, 0.04, 0.8), deskMat, 'desk_top', desk, 0, TOP - 0.02, 0)
  mesh(box(1.46, 0.025, 0.76), woodDark, 'desk_apron', desk, 0, TOP - 0.0525, 0)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(box(0.05, TOP - 0.065, 0.05), woodDark, 'desk_leg', desk, sx * 0.7, (TOP - 0.065) / 2, sz * 0.35)
  desk.position.x = -0.3

  /* ---------- MacBook Pro (M1) ---------- */
  const screenCv = document.createElement('canvas'); screenCv.width = 1024; screenCv.height = 640
  const screenTex = new THREE.CanvasTexture(screenCv); screenTex.colorSpace = THREE.SRGBColorSpace; screenTex.anisotropy = aniso
  const tools = (profile.skills || ['figma', 'code', 'guitar']).slice(0, 3).map(s => '"' + String(s).toLowerCase() + '"').join(', ')
  const code = [
    'const portfolio = {',
    '  name: "' + (profile.name || 'your name') + '",',
    '  role: "' + (profile.role || 'designer + developer') + '",',
    '  tools: [' + tools + '],',
    '  mood: "late night, espresso",',
    '};',
    '',
    '// ship it',
  ]
  const codeAll = code.join('\n')
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath() }
  function drawScreen(t) {
    const g = screenCv.getContext('2d'), w = 1024, h = 640
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#ff8fc7'); bg.addColorStop(0.55, '#b58be8'); bg.addColorStop(1, '#6f8cf0')
    g.fillStyle = bg; g.fillRect(0, 0, w, h)
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, 0, w, 30)
    g.fillStyle = '#1b1320'; rr(g, w / 2 - 70, -10, 140, 30, 12); g.fill()
    g.fillStyle = '#3a2a45'; g.font = '600 17px ui-sans-serif,system-ui,sans-serif'; g.fillText('Code    File    Edit    View', 24, 21)
    rr(g, 130, 100, 764, 400, 16); g.fillStyle = '#241b2e'; g.fill()
    g.fillStyle = '#2f2440'; rr(g, 130, 100, 764, 46, 16); g.fill(); g.fillRect(130, 130, 764, 16);
    ['#ff6b9a', '#ffd166', '#7be08a'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(160 + i * 28, 123, 8, 0, 7); g.fill() })
    g.fillStyle = '#bba9d6'; g.font = '18px ui-monospace,Menlo,Consolas,monospace'; g.fillText('portfolio.js', 440, 129)
    const n = Math.floor(t * 16) % (codeAll.length + 36), shown = codeAll.slice(0, Math.min(n, codeAll.length)).split('\n')
    g.font = '26px ui-monospace,Menlo,Consolas,monospace'
    shown.forEach((l, i) => {
      g.fillStyle = '#5a4a70'; g.fillText(String(i + 1), 160, 200 + i * 38)
      g.fillStyle = l.startsWith('//') ? '#8f7bb0' : /"/.test(l) ? '#ffb3d9' : '#e9ddff'
      g.fillText(l, 210, 200 + i * 38)
    })
    if (Math.floor(t * 2) % 2 === 0) { const li = shown.length - 1; g.fillStyle = '#ffd166'; g.fillRect(210 + g.measureText(shown[li]).width + 3, 176 + li * 38, 13, 30) }
    screenTex.needsUpdate = true
  }
  drawScreen(0)

  function makeLaptop() {
    const g = new THREE.Group(); g.name = 'macbook_pro_m1'
    const al = M(0xb8b9bd, { metalness: 0.9, roughness: 0.32, name: 'aluminum_silver' })
    const dark = M(0x131316, { roughness: 0.5, name: 'keys_black' })
    mesh(box(0.3097, 0.0156, 0.2124), al, 'base', g, 0, 0.0078, 0)
    mesh(box(0.292, 0.0008, 0.098), dark, 'key_well', g, 0, 0.0158, -0.048)
    const keys = new THREE.InstancedMesh(box(0.0185, 0.0016, 0.0165), dark, 14 * 5)
    keys.name = 'keys'; keys.castShadow = true
    const d = new THREE.Object3D(); let k = 0
    for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) { d.position.set(-0.1332 + c * 0.0205, 0.0168, -0.088 + r * 0.0185); d.updateMatrix(); keys.setMatrixAt(k++, d.matrix) }
    g.add(keys)
    mesh(box(0.119, 0.0006, 0.079), dark, 'trackpad_edge', g, 0, 0.0157, 0.066)
    mesh(box(0.115, 0.0008, 0.075), M(0xc2c3c7, { metalness: 0.7, roughness: 0.25, name: 'trackpad' }), 'trackpad', g, 0, 0.0159, 0.066)
    const hinge = new THREE.Group(); hinge.name = 'lid'; hinge.position.set(0, 0.0156, -0.1062); g.add(hinge)
    mesh(box(0.3097, 0.0045, 0.2124), al, 'lid_shell', hinge, 0, 0.0023, 0.1062)
    const bezel = mesh(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshBasicMaterial({ color: 0x050507 }), 'bezel', hinge, 0, -0.0003, 0.1062); bezel.rotation.x = Math.PI / 2; bezel.castShadow = false
    const scr = mesh(new THREE.PlaneGeometry(0.286, 0.1788), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false, name: 'display' }), 'display', hinge, 0, -0.0006, 0.1062); scr.rotation.x = Math.PI / 2; scr.castShadow = false
    hinge.rotation.x = -110 * Math.PI / 180
    const glow = new THREE.PointLight(0xff9bd6, 0.5, 1.4, 2); glow.position.set(0, 0.16, 0.18); g.add(glow)
    return g
  }
  const LAPTOP_SCALE = 1.4
  const laptop = makeLaptop(); laptop.position.set(-0.28, TOP, 0.0); laptop.rotation.y = 0.1; laptop.scale.setScalar(LAPTOP_SCALE); laptop.userData.action = 'desktop'; scene.add(laptop)

  /* ---------- books & notebooks ---------- */
  const pageMat = M(0xf1e8d2, { roughness: 0.9, name: 'pages' })
  const gold = M(0xb68235, { metalness: 0.7, roughness: 0.35, name: 'gold_foil' })
  function book(w, h, d, color, name, opts = {}) {
    const g = new THREE.Group(); g.name = name; const t = opts.t || 0.004
    const cover = M(color, { roughness: opts.rough ?? 0.55, name: name + '_cover' })
    mesh(box(w, t, d), cover, name + '_top', g, 0, h - t / 2, 0)
    mesh(box(w, t, d), cover, name + '_bottom', g, 0, t / 2, 0)
    mesh(box(t, h, d), cover, name + '_spine', g, -w / 2 + t / 2, h / 2, 0)
    mesh(box(w - t - 0.004, h - 2 * t, d - 0.008), pageMat, name + '_pages', g, 0, h / 2, 0)
    if (opts.projectLabel) {
      const label = canvasTex(1024, 128, (ctx, width, height) => {
        ctx.fillStyle = opts.labelInk || '#f7f2ea'
        ctx.font = '700 88px ui-sans-serif,system-ui,sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(opts.projectLabel, width / 2, height / 2)
      })
      const title = mesh(new THREE.PlaneGeometry(d - 0.014, h - 0.004), new THREE.MeshBasicMaterial({ map: label, transparent: true, depthWrite: false }), name + '_project_label', g, -w / 2 - t / 2 - 0.0002, h / 2, 0)
      title.rotation.y = -Math.PI / 2
      title.castShadow = false
    }
    if (opts.foil) { mesh(box(0.0008, 0.0035, d * 0.7), gold, name + '_foil_a', g, -w / 2 - 0.0004, h * 0.72, 0); mesh(box(0.0008, 0.0035, d * 0.7), gold, name + '_foil_b', g, -w / 2 - 0.0004, h * 0.3, 0) }
    if (opts.band) {
      const bm = M(0x1a1618, { roughness: 0.7, name: 'elastic_band' }), bx = w / 2 - 0.028
      mesh(box(0.007, 0.0016, d + 0.002), bm, name + '_band_top', g, bx, h + 0.0004, 0)
      mesh(box(0.007, 0.0016, d + 0.002), bm, name + '_band_bot', g, bx, -0.0004, 0)
      mesh(box(0.007, h, 0.0016), bm, name + '_band_front', g, bx, h / 2, d / 2 + 0.0004)
      mesh(box(0.007, h, 0.0016), bm, name + '_band_back', g, bx, h / 2, -d / 2 - 0.0004)
    }
    return g
  }
  function stack(name, x, z, specs, base = TOP, targets = []) {
    const s = new THREE.Group(); s.name = name; s.position.set(x, 0, z); scene.add(s); s.scale.setScalar(1.4); s.position.y = TOP * (1 - 1.4)
    let y = base
    specs.forEach((sp, i) => { const b = book(sp.w, sp.h, sp.d, sp.c, name + '_' + (i + 1), sp); const target = targets[i]; b.position.set(sp.dx || 0, y, sp.dz || 0); b.rotation.y = Math.PI / 2 + (sp.r || 0); if (target) { b.userData.url = target.url; if (target.showCard) b.userData.projectCardId = target.id }; s.add(b); y += sp.h })
    return { g: s, top: y }
  }
  const projectsBox = new THREE.Group(); projectsBox.name = 'projects_box'; projectsBox.position.set(0.27, TOP, -0.12); projectsBox.rotation.y = -0.08; projectsBox.scale.setScalar(1.2); projectsBox.userData.action = 'projects'; scene.add(projectsBox)
  const boxBody = M(0x5b2a86, { roughness: 0.48, name: 'projects_box_body' })
  const boxLid = M(0xd9a21b, { roughness: 0.42, name: 'projects_box_lid' })
  mesh(box(0.36, 0.17, 0.28), boxBody, 'projects_box_body', projectsBox, 0, 0.085, 0)
  mesh(box(0.38, 0.035, 0.30), boxLid, 'projects_box_lid', projectsBox, 0, 0.1875, 0)
  const projectsLabel = canvasTex(512, 128, (ctx, width, height) => {
    ctx.fillStyle = '#fff9ea'
    ctx.font = '500 54px Caveat,"Bradley Hand",cursive'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('PROJECTS', width / 2, height / 2)
  })
  mesh(new THREE.PlaneGeometry(0.27, 0.09), new THREE.MeshBasicMaterial({ map: projectsLabel, transparent: true, depthWrite: false }), 'projects_box_label', projectsBox, 0, 0.09, 0.141)
  mesh(box(0.045, 0.025, 0.012), gold, 'projects_box_latch', projectsBox, 0, 0.17, 0.156)
  const notebookStack = stack('notebooks', -0.85, -0.16, [
    { w: 0.148, h: 0.013, d: 0.21, c: 0xff5fae, r: 0.1, t: 0.003, rough: 0.7 },
    { w: 0.148, h: 0.013, d: 0.21, c: 0x9be34a, r: -0.12, t: 0.003, rough: 0.7 },
    { w: 0.148, h: 0.013, d: 0.21, c: 0xfaf6ee, r: 0.04, t: 0.003, rough: 0.7, band: true },
  ])
  notebookStack.g.userData.action = 'medium'
  const pen = new THREE.Group(); pen.name = 'pen'; pen.position.set(-0.6, TOP + 0.0323, 0.26); pen.rotation.y = 0.5; pen.scale.setScalar(1.4); scene.add(pen)
  {
    const inner = new THREE.Group(); inner.rotation.z = Math.PI / 2; pen.add(inner)
    const navy = M(0x15233f, { roughness: 0.25, metalness: 0.2, name: 'pen_lacquer' })
    mesh(new THREE.CylinderGeometry(0.0052, 0.0052, 0.11, 20), navy, 'pen_barrel', inner, 0, 0.0, 0)
    mesh(new THREE.CylinderGeometry(0.0056, 0.0056, 0.004, 20), gold, 'pen_ring', inner, 0, 0.03, 0)
    mesh(new THREE.CylinderGeometry(0.0048, 0.0052, 0.03, 20), navy, 'pen_cap', inner, 0, 0.07, 0)
    mesh(box(0.0012, 0.036, 0.0016), gold, 'pen_clip', inner, 0.0058, 0.07, 0)
    const tip = mesh(new THREE.ConeGeometry(0.0046, 0.022, 20), gold, 'pen_nib', inner, 0, -0.066, 0); tip.rotation.x = Math.PI
  }

  /* ---------- espresso cup ---------- */
  const cup = new THREE.Group(); cup.name = 'espresso'; cup.position.set(0.36, TOP, 0.26); cup.rotation.y = -0.5; cup.scale.setScalar(1.4); scene.add(cup)
  {
    const porc = M(0xf7f2ea, { roughness: 0.18, name: 'porcelain', side: THREE.DoubleSide })
    const V = (a) => a.map(p => new THREE.Vector2(p[0], p[1]))
    mesh(new THREE.LatheGeometry(V([[0, 0], [0.04, 0], [0.062, 0.007], [0.066, 0.011], [0.064, 0.0125], [0.04, 0.005], [0, 0.005]]), 48), porc, 'saucer', cup)
    mesh(new THREE.LatheGeometry(V([[0.001, 0.005], [0.018, 0.005], [0.021, 0.009], [0.032, 0.026], [0.0385, 0.062], [0.0365, 0.063], [0.0345, 0.056], [0.0325, 0.052], [0.022, 0.022], [0.001, 0.017]]), 48), porc, 'cup', cup)
    const h = mesh(new THREE.TorusGeometry(0.016, 0.0046, 10, 24, Math.PI), porc, 'cup_handle', cup, 0.0375, 0.04, 0); h.rotation.z = -Math.PI / 2
    const cr = mesh(new THREE.CircleGeometry(0.0335, 40), M(0x9a6236, { roughness: 0.4, name: 'crema' }), 'crema', cup, 0, 0.0535, 0); cr.rotation.x = -Math.PI / 2; cr.castShadow = false
    const sp = mesh(new THREE.CircleGeometry(0.017, 32), M(0x5a3418, { roughness: 0.3, name: 'coffee_dark' }), 'coffee_spot', cup, 0.006, 0.0538, -0.004); sp.rotation.x = -Math.PI / 2; sp.castShadow = false
  }
  const steamTex = canvasTex(128, 128, (g) => { const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128) })
  const steam = []
  for (let i = 0; i < 7; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 }))
    sp.userData.p = i / 7; sp.userData.ph = i * 1.7; cup.add(sp); steam.push(sp)
  }

  /* ---------- water glass ---------- */
  const glassG = new THREE.Group(); glassG.name = 'water_glass'; glassG.position.set(0.02, TOP, 0.3); glassG.scale.setScalar(1.4); scene.add(glassG)
  {
    const gm = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, roughness: 0.03, metalness: 0, envMapIntensity: 0.5, side: THREE.DoubleSide, depthWrite: false, name: 'glass' })
    const gl = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.031, 0], [0.0395, 0.11], [0.0375, 0.11], [0.0295, 0.01], [0, 0.01]].map(p => new THREE.Vector2(...p)), 48), gm)
    const rimM = new THREE.Mesh(new THREE.TorusGeometry(0.0385, 0.0009, 6, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false })); rimM.rotation.x = Math.PI / 2; rimM.position.y = 0.11; rimM.name = 'glass_rim'; glassG.add(rimM)
    gl.name = 'glass_body'; gl.renderOrder = 2; glassG.add(gl)
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.0355, 0.0298, 0.085, 40), new THREE.MeshPhysicalMaterial({ color: 0x6cc3ff, transparent: true, opacity: 0.6, roughness: 0.05, depthWrite: false, name: 'water' }))
    w.name = 'water'; w.position.y = 0.0525; w.renderOrder = 1; glassG.add(w)
  }
  /* ---------- Ibanez-style acoustic guitar ---------- */
  function makeGuitar() {
    const g = new THREE.Group(); g.name = 'acoustic_guitar'
    const half = [[0, 0], [0.08, 0.003], [0.155, 0.03], [0.19, 0.1], [0.19, 0.17], [0.15, 0.25], [0.115, 0.31], [0.12, 0.35], [0.145, 0.4], [0.14, 0.45], [0.09, 0.485], [0.04, 0.498], [0, 0.5]]
    const loop = half.map(p => new THREE.Vector3(p[0], p[1], 0)).concat(half.slice(1, -1).reverse().map(p => new THREE.Vector3(-p[0], p[1], 0)))
    const pts = new THREE.CatmullRomCurve3(loop, true, 'centripetal').getPoints(160).map(p => new THREE.Vector2(p.x, p.y))
    const shape = new THREE.Shape(pts)
    const mahogany = M(0x4a2517, { roughness: 0.6, name: 'mahogany_dark' })
    const top = M(0x5d301d, { roughness: 0.5, name: 'mahogany_top' })
    const rosewood = M(0x22130d, { roughness: 0.45, name: 'rosewood' })
    const neckM = M(0x3a1c10, { roughness: 0.55, name: 'mahogany_neck' })
    const chrome = M(0xd4d4d8, { metalness: 1, roughness: 0.22, name: 'chrome' })
    const cream = M(0xd8c9a8, { roughness: 0.5, name: 'rosette_cream' })
    const black = M(0x0b0707, { roughness: 0.2, name: 'pickguard_black' })
    const bg = new THREE.ExtrudeGeometry(shape, { depth: 0.085, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.004, bevelSegments: 3, curveSegments: 1 })
    bg.translate(0, 0, -0.0425); mesh(bg, mahogany, 'body', g)
    const tg = new THREE.ExtrudeGeometry(shape, { depth: 0.002, bevelEnabled: false, curveSegments: 1 })
    tg.scale(0.99, 0.99, 1); tg.translate(0, 0.002, 0.0485); mesh(tg, top, 'soundboard', g)
    const zf = 0.0512
    mesh(new THREE.CircleGeometry(0.056, 48), black, 'soundhole', g, 0, 0.36, zf).castShadow = false
    mesh(new THREE.RingGeometry(0.058, 0.066, 48), cream, 'rosette', g, 0, 0.36, zf + 0.0002).castShadow = false
    mesh(new THREE.RingGeometry(0.068, 0.0705, 48), rosewood, 'rosette_outer', g, 0, 0.36, zf + 0.0002).castShadow = false
    const pgS = new THREE.Shape([[0.068, 0.27], [0.115, 0.285], [0.128, 0.335], [0.118, 0.405], [0.085, 0.43], [0.068, 0.41]].map(p => new THREE.Vector2(...p)))
    mesh(new THREE.ShapeGeometry(pgS), black, 'pickguard', g, 0, 0, zf + 0.0004).castShadow = false
    mesh(box(0.15, 0.022, 0.012), rosewood, 'bridge', g, 0, 0.2, 0.0555)
    mesh(box(0.118, 0.0035, 0.0035), M(0xefe9dc, { name: 'saddle_bone' }), 'saddle', g, 0, 0.2 + 0.0052, 0.0625)
    mesh(box(0.05, 0.43, 0.0295), neckM, 'neck', g, 0, 0.675, 0.0345)
    mesh(box(0.054, 0.5, 0.006), rosewood, 'fretboard', g, 0, 0.61, 0.0525)
    const fretM = M(0xcfc9b8, { metalness: 0.9, roughness: 0.3, name: 'fret_wire' })
    for (let n = 1; n <= 19; n++) { const y = 0.86 - 0.645 * (1 - Math.pow(2, -n / 12)); mesh(box(0.054 - 0.0006 * (19 - n) * 0.3, 0.0016, 0.0012), fretM, 'fret_' + n, g, 0, y, 0.0558).castShadow = false }
    const dotM = M(0xe9e1cc, { name: 'inlay_pearl' })
    ;[3, 5, 7, 9, 15].forEach(n => { const y = 0.86 - 0.645 * (1 - Math.pow(2, -(n - 0.5) / 12)); const d = mesh(new THREE.CircleGeometry(0.0034, 14), dotM, 'inlay_' + n, g, 0, y, 0.0559); d.castShadow = false })
    ;[-0.009, 0.009].forEach((x, i) => { const y = 0.86 - 0.645 * (1 - Math.pow(2, -11.5 / 12)); mesh(new THREE.CircleGeometry(0.0034, 14), dotM, 'inlay_12_' + i, g, x, y, 0.0559).castShadow = false })
    mesh(box(0.046, 0.004, 0.007), M(0xefe9dc, { name: 'nut_bone' }), 'nut', g, 0, 0.862, 0.0555)
    const head = mesh(box(0.062, 0.13, 0.016), neckM, 'headstock', g, 0, 0.927, 0.04); head.rotation.x = 0.03
    mesh(box(0.058, 0.126, 0.002), rosewood, 'headstock_face', g, 0, 0.927, 0.0494)
    ;[0.89, 0.93, 0.97].forEach((y) => [-1, 1].forEach(s => {
      const p = mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.03, 10), chrome, 'tuner_post', g, s * 0.04, y, 0.04); p.rotation.z = Math.PI / 2
      mesh(box(0.014, 0.011, 0.006), M(0xe8e2d2, { roughness: 0.4, name: 'tuner_button' }), 'tuner_button', g, s * 0.057, y, 0.04)
      mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.004, 12), chrome, 'tuner_bush', g, 0, y, 0.0505).rotation.x = Math.PI / 2
    }))
    const sm = M(0xd9d9dc, { metalness: 1, roughness: 0.3, name: 'string_steel' })
    for (let i = 0; i < 6; i++) {
      const a = new THREE.Vector3(-0.0175 + i * 0.007, 0.862, 0.0585), b = new THREE.Vector3(-0.0525 + i * 0.0105, 0.2052, 0.0645)
      strand(a, b, i < 3 ? 0.0004 : 0.0007, sm, 'string_' + (i + 1), g).castShadow = false
    }
    for (let i = 0; i < 6; i++) mesh(new THREE.SphereGeometry(0.0025, 10, 8), M(0xf3eee2, { name: 'bridge_pin' }), 'bridge_pin', g, -0.0525 + i * 0.0105, 0.19, 0.0625).castShadow = false
    return g
  }
  const guitar = makeGuitar(); guitar.position.set(0.78, 0, -0.3); guitar.rotation.set(-0.1, 0, -0.1)
  if (links.youtubeTrack) guitar.userData.action = 'youtube'
  scene.add(guitar)

  /* ---------- open notebook with handwriting ---------- */
  const openNb = new THREE.Group(); openNb.name = 'notebook_closed'; openNb.position.set(-0.78, TOP, 0.24); openNb.rotation.y = 0.08; openNb.scale.setScalar(1.7); scene.add(openNb)
  function pageTex(side) {
    const t = canvasTex(592, 820, () => {}); t.userData.side = side; return t
  }
  function drawPage(tex, side) {
    const c = tex.image, g = c.getContext('2d'), w = c.width, h = c.height
    g.fillStyle = '#fbf7ec'; g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(110,150,200,.45)'; g.lineWidth = 2; for (let y = 90; y < h; y += 42) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke() }
    g.strokeStyle = 'rgba(230,80,110,.5)'; g.beginPath(); const mx = side ? 54 : w - 54; g.moveTo(mx, 0); g.lineTo(mx, h); g.stroke()
    g.fillStyle = '#1f3a8a'; g.strokeStyle = '#1f3a8a'; g.lineWidth = 3.5; g.font = '500 38px Caveat,"Bradley Hand","Segoe Print",cursive'
    if (!side) {
      g.fillText('system design', 40, 70)
      const bx = (x, y, l) => { g.strokeRect(x, y, 170, 70); g.fillText(l, x + 20, y + 48) }
      bx(60, 140, 'client'); bx(60, 310, 'api'); bx(300, 310, 'cache'); bx(60, 480, 'database')
      const ar = (x1, y1, x2, y2) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); const a = Math.atan2(y2 - y1, x2 - x1); g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - 14 * Math.cos(a - 0.5), y2 - 14 * Math.sin(a - 0.5)); g.moveTo(x2, y2); g.lineTo(x2 - 14 * Math.cos(a + 0.5), y2 - 14 * Math.sin(a + 0.5)); g.stroke() }
      ar(145, 210, 145, 308); ar(145, 380, 145, 478); ar(232, 345, 298, 345)
      g.fillText('[x] auth', 330, 520); g.fillText('[x] schema', 330, 562); g.fillText('[ ] deploy', 330, 604)
    } else {
      ['function ship() {', '  const idea = think();', '  const code = build(idea);', '  test(code);', '  return deploy(code);', '}', '', '// bugs = features', 'ship();'].forEach((l, i) => g.fillText(l, 76, 130 + i * 42 * 1))
      g.strokeStyle = '#e0338a'; g.lineWidth = 3; g.beginPath(); g.ellipse(212, 130 + 8 * 42 - 10, 60, 24, 0, 0, 7); g.stroke()
    }
    tex.needsUpdate = true
  }
  const pgL = pageTex(0), pgR = pageTex(1); drawPage(pgL, 0); drawPage(pgR, 1)
  {
    const b = book(0.148, 0.014, 0.21, 0xff5fae, 'notebook_closed', { t: 0.003, rough: 0.7, band: true }); b.rotation.y = Math.PI / 2; openNb.add(b)
  }

  /* ---------- room dressing: zebra board, pink bench, red stool ---------- */
  const stickies = []
  const dragListeners = []
  let hovered = null
  {
    const bd = new THREE.Group(); bd.name = 'zebra_board'; bd.position.set(-1.2, 1.38, -0.445); bd.rotation.z = 0.04; scene.add(bd)
    mesh(box(0.62, 0.5, 0.02), M(0xf6efe0, { name: 'board_mat' }), 'board_frame', bd, 0, 0, 0.01)
    const boardTexture = new THREE.TextureLoader().load('/PXL_20260502_122514550%20(1).jpg', (texture) => {
      if (disposed) { texture.dispose(); return }
      const imageAspect = texture.image.width / texture.image.height
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = aniso
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
      texture.repeat.y = imageAspect / (0.56 / 0.44)
      texture.offset.y = (1 - texture.repeat.y) / 2
      texture.needsUpdate = true
    })
    const zp = mesh(new THREE.PlaneGeometry(0.56, 0.44), new THREE.MeshStandardMaterial({ map: boardTexture, roughness: 0.9, name: 'leopard_noticeboard' }), 'leopard_noticeboard', bd, 0, 0, 0.0205); zp.castShadow = false
    bd.scale.setScalar(1.2)
    const stickyDefs = [
      ['in', 'LinkedIn', links.linkedin, '#c3dd9c', -0.185, 0.02],
      ['</>', 'GitHub', links.github, '#ffb6d6', 0, -0.02],
      ['CV', 'Resume', links.resume, '#fff0a6', 0.185, 0.02],
    ].filter(([, , url]) => url)
    stickyDefs.forEach(([glyph, label, url, col, x, r]) => {
      const tex = canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = col; g.fillRect(0, 0, w, h)
        g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(0, 0, w, 26)
        g.fillStyle = '#2a1e33'; g.beginPath(); g.arc(w / 2, 88, 48, 0, 7); g.fill()
        g.fillStyle = '#fff'; g.font = '700 ' + (glyph.length > 2 ? 40 : 52) + 'px "Cormorant Garamond",Georgia,serif'; g.textAlign = 'center'; g.fillText(glyph, w / 2, glyph.length > 2 ? 102 : 106)
        g.fillStyle = '#2a1e33'; g.font = '500 54px Caveat,"Bradley Hand",cursive'; g.fillText(label, w / 2, 190)
        g.font = '500 30px Caveat,"Bradley Hand",cursive'; g.fillStyle = 'rgba(42,30,51,.65)'; g.fillText('open ↗', w / 2, 232)
      })
      const n = mesh(box(0.165, 0.2, 0.004), null, 'sticky_' + label, bd, x, 0.0, 0.024)
      n.material = [M(col, { roughness: 0.85 }), M(col, { roughness: 0.85 }), M(col, { roughness: 0.85 }), M(col, { roughness: 0.85 }), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, name: 'sticky_' + label }), M(col, { roughness: 0.85 })]
      n.rotation.z = r; n.userData = { url, r, h: 0, label }; stickies.push(n)
    })
    const bench = new THREE.Group(); bench.name = 'pink_bench'; bench.position.set(-1.42, 0, -0.27); scene.add(bench)
    mesh(box(0.6, 0.28, 0.32), M(0xf3569f, { roughness: 0.55, name: 'bench_pink' }), 'bench_body', bench, 0, 0.14, 0)
    ;[-0.15, 0.15].forEach((x, i) => mesh(box(0.26, 0.18, 0.01), M(0xff8cc6, { roughness: 0.5, name: 'bench_drawer' }), 'bench_drawer_' + i, bench, x, 0.14, 0.165))
    mesh(box(0.64, 0.025, 0.34), M(0xd9a35f, { roughness: 0.5, name: 'bench_top' }), 'bench_top', bench, 0, 0.2925, 0)
    const phCv = document.createElement('canvas'); phCv.width = 256; phCv.height = 320
    const phTex = new THREE.CanvasTexture(phCv); phTex.colorSpace = THREE.SRGBColorSpace; phTex.anisotropy = aniso
    function drawPhoto(img) {
      const g = phCv.getContext('2d')
      if (img) { const r = Math.max(256 / img.width, 270 / img.height), w = img.width * r, h = img.height * r; g.drawImage(img, (256 - w) / 2, (270 - h) / 2, w, h) }
      else { const bg = g.createLinearGradient(0, 0, 0, 270); bg.addColorStop(0, '#ffd1ec'); bg.addColorStop(1, '#c9a8ee'); g.fillStyle = bg; g.fillRect(0, 0, 256, 270); g.fillStyle = '#7a5aa8'; g.beginPath(); g.arc(128, 105, 50, 0, 7); g.fill(); g.beginPath(); g.ellipse(128, 262, 92, 78, 0, Math.PI, 0); g.fill() }
      const ig = g.createLinearGradient(0, 270, 256, 320); ig.addColorStop(0, '#feda75'); ig.addColorStop(0.45, '#d62976'); ig.addColorStop(1, '#962fbf'); g.fillStyle = ig; g.fillRect(0, 270, 256, 50)
      g.fillStyle = '#fff'; g.font = '600 30px "Cormorant Garamond",Georgia,serif'; g.textAlign = 'center'; g.fillText('instagram ↗', 128, 305); g.textAlign = 'left'
      phTex.needsUpdate = true
    }
    drawPhoto(null)
    const publicPhoto = new Image()
    publicPhoto.onload = () => drawPhoto(publicPhoto)
    publicPhoto.src = '/PXL_20260906_170423277.jpg'
    const onDragOver = (e) => e.preventDefault()
    const onDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (!f || !f.type.startsWith('image/')) return; const im = new Image(); im.onload = () => { drawPhoto(im); try { localStorage.setItem('ws_profile_photo', phCv.toDataURL('image/jpeg', 0.8)) } catch { /* quota */ } }; im.src = URL.createObjectURL(f) }
    addEventListener('dragover', onDragOver)
    addEventListener('drop', onDrop)
    dragListeners.push(['dragover', onDragOver], ['drop', onDrop])
    const fg = new THREE.Group(); fg.name = 'profile_frame'; fg.position.set(-0.12, 0.392, 0.03); fg.rotation.y = 0.3; bench.add(fg)
    mesh(box(0.125, 0.17, 0.012), M(0xff4fa3, { roughness: 0.4, name: 'photo_frame' }), 'photo_frame', fg, 0, 0, 0)
    const pm = mesh(new THREE.PlaneGeometry(0.105, 0.131), new THREE.MeshBasicMaterial({ map: phTex, toneMapped: false, name: 'profile_photo' }), 'profile_photo', fg, 0, 0.004, 0.0065); pm.castShadow = false
    if (links.instagram) { pm.userData = { url: links.instagram, h: 0, group: fg, label: 'instagram' }; stickies.push(pm) }
    mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.06, 20), M(0x8ccf3a, { name: 'plant_pot' }), 'plant_pot', bench, 0.14, 0.335, 0)
    ;[[0, 0.07], [0.03, 0.05], [-0.03, 0.05]].forEach(([dx, dy], i) => mesh(new THREE.SphereGeometry(0.03, 14, 10), M(0xff7ac0, { name: 'plant_bloom' }), 'bloom_' + i, bench, 0.14 + dx, 0.365 + dy, 0))
    const stool = new THREE.Group(); stool.name = 'red_stool'; stool.position.set(0.32, 0, 0.78); scene.add(stool)
    const red = M(0xc4222b, { roughness: 0.85, envMapIntensity: 0.3, name: 'stool_red' }), chr = M(0xd4d4d8, { metalness: 1, roughness: 0.2, name: 'stool_chrome' })
    mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.05, 36), red, 'stool_seat', stool, 0, 0.5, 0)
    mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.48, 12), chr, 'stool_stem', stool, 0, 0.25, 0)
    mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.02, 36), red, 'stool_base', stool, 0, 0.01, 0)
  }

  /* ---------- couch ---------- */
  function rbox(w, h, d, r, mat, name, parent, x, y, z) {
    const b = Math.min(r * 0.6, 0.03), W = w - 2 * b, H = h - 2 * b, rs = Math.max(r - b, 0.005), x0 = -W / 2, y0 = -H / 2, s = new THREE.Shape()
    s.moveTo(x0 + rs, y0); s.lineTo(x0 + W - rs, y0); s.quadraticCurveTo(x0 + W, y0, x0 + W, y0 + rs); s.lineTo(x0 + W, y0 + H - rs); s.quadraticCurveTo(x0 + W, y0 + H, x0 + W - rs, y0 + H)
    s.lineTo(x0 + rs, y0 + H); s.quadraticCurveTo(x0, y0 + H, x0, y0 + H - rs); s.lineTo(x0, y0 + rs); s.quadraticCurveTo(x0, y0, x0 + rs, y0)
    const geo = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 4, curveSegments: 6 })
    geo.translate(0, 0, -(d - 2 * b) / 2); return mesh(geo, mat, name, parent, x, y, z)
  }
  const couch = new THREE.Group(); couch.name = 'couch'; couch.position.set(1.25, 0, 0.35); couch.rotation.y = -Math.PI / 2; scene.add(couch)
  {
    const cord = (base, hi, lo, name) => {
      const t = canvasTex(64, 64, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) { const gr = g.createLinearGradient(x, 0, x + 8, 0); gr.addColorStop(0, lo); gr.addColorStop(0.5, hi); gr.addColorStop(1, lo); g.fillStyle = gr; g.fillRect(x, 0, 8, h) } g.fillStyle = 'rgba(0,0,0,.05)'; for (let i = 0; i < 400; i++) g.fillRect(Math.random() * w, Math.random() * h, 1, 1) })
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(21, 21); t.anisotropy = aniso
      return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 2.2, roughness: 1, name })
    }
    const fab = cord('#7d8450', '#8f9760', '#626a3e', 'couch_khaki_corduroy'), cush = cord('#8a9157', '#9ca468', '#6c7444', 'couch_cushion_corduroy')
    rbox(1.1, 0.2, 0.78, 0.04, fab, 'couch_base', couch, 0, 0.14, 0)
    rbox(0.39, 0.17, 0.64, 0.07, cush, 'seat_cushion_l', couch, -0.195, 0.325, 0.06)
    rbox(0.39, 0.17, 0.64, 0.07, cush, 'seat_cushion_r', couch, 0.195, 0.325, 0.06)
    ;[-0.255, 0.255].forEach((x, i) => { const b = rbox(0.5, 0.36, 0.14, 0.08, cush, 'back_cushion_' + i, couch, x, 0.55, -0.18); b.rotation.x = -0.18 })
    const bolster = mesh(new THREE.CapsuleGeometry(0.06, 0.2, 8, 16), M(0xfff1dc, { roughness: 0.95, name: 'bolster_cream' }), 'bolster', couch, 0.36, 0.5, 0.0); bolster.rotation.set(Math.PI / 2, 0, 0.1)
    const p3 = rbox(0.24, 0.24, 0.09, 0.05, M(0xfff1dc, { roughness: 0.95, name: 'pillow_cream' }), 'pillow_cream', couch, -0.38, 0.5, 0.0); p3.rotation.set(-0.15, 0.35, 0.1)
    const knit = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#fff3e0'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff8cc6'; for (let y = 0; y < h; y += 64) g.fillRect(0, y + 8, w, 20); g.strokeStyle = 'rgba(150,110,80,.25)'; g.lineWidth = 2; for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y + 8); g.lineTo(x + 8, y); g.stroke() } })
    const throwM = new THREE.MeshStandardMaterial({ map: knit, roughness: 1, name: 'knit_throw' })
    const th1 = rbox(0.42, 0.035, 0.62, 0.02, throwM, 'throw_seat', couch, 0.2, 0.425, 0.1); th1.rotation.z = 0.05
    const th2 = rbox(0.04, 0.3, 0.55, 0.02, throwM, 'throw_drape', couch, 0.405, 0.3, 0.1); th2.rotation.z = 0.05
    rbox(1.1, 0.52, 0.2, 0.07, fab, 'couch_back', couch, 0, 0.5, -0.29)
    rbox(0.16, 0.36, 0.78, 0.06, fab, 'arm_l', couch, -0.47, 0.38, 0)
    rbox(0.16, 0.36, 0.78, 0.06, fab, 'arm_r', couch, 0.47, 0.38, 0)
    const p1 = rbox(0.27, 0.27, 0.09, 0.04, M(0x9be34a, { roughness: 0.9, name: 'pillow_lime' }), 'pillow_lime', couch, -0.22, 0.52, -0.13); p1.rotation.set(-0.25, 0.1, 0.2)
    const p2 = rbox(0.27, 0.27, 0.09, 0.04, M(0xff5fae, { roughness: 0.9, name: 'pillow_pink' }), 'pillow_pink', couch, 0.2, 0.5, -0.13); p2.rotation.set(-0.25, -0.12, -0.15)
    const ft = M(0x2a1a12, { roughness: 0.6, name: 'couch_feet' })
    ;[-1, 1].forEach(sx => [-1, 1].forEach(sz => mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.05, 12), ft, 'couch_foot', couch, sx * 0.48, 0.025, sz * 0.33)))
  }

  /* ---------- wall TV (left wall) ---------- */
  {
    const tv = new THREE.Group(); tv.name = 'tv'; tv.position.set(-1.73, 1.0, 0.12); tv.rotation.y = Math.PI / 2; scene.add(tv)
    const cv = document.createElement('canvas'); cv.width = 800; cv.height = 500
    function drawTV() {
      const g = cv.getContext('2d')
      g.fillStyle = '#f4f2f2'; g.fillRect(0, 0, 800, 500)
      g.fillStyle = '#050506'; g.fillRect(18, 18, 764, 464)
      g.fillStyle = '#ffffff'; g.font = 'italic 600 58px "Cormorant Garamond",Georgia,serif'; g.fillText('as', 150, 150); g.font = 'italic 700 80px "Cormorant Garamond",Georgia,serif'; g.fillText('SEEN', 205, 150); g.font = 'italic 600 58px "Cormorant Garamond",Georgia,serif'; g.fillText('on', 395, 150)
      g.font = '900 260px Impact,"Arial Black",sans-serif'; g.lineJoin = 'round'; g.lineWidth = 16; g.strokeStyle = '#ff2f93'; g.strokeText('TV', 300, 400); g.fillStyle = '#ffffff'; g.fillText('TV', 300, 400)
      g.fillStyle = '#ff2f93'; g.beginPath(); g.moveTo(80, 230); g.lineTo(215, 215); g.lineTo(235, 440); g.lineTo(98, 455); g.closePath(); g.fill()
      g.strokeStyle = '#ff2f93'; g.lineWidth = 8; g.beginPath(); g.moveTo(130, 228); g.quadraticCurveTo(140, 168, 190, 178); g.stroke()
      g.fillStyle = '#fff'; g.font = 'italic 700 78px "Cormorant Garamond",Georgia,serif'; g.fillText('B', 125, 370)
      ;['#ff2f93', '#ffffff', '#ff2f93', '#ffffff', '#000'].forEach((c, i) => { g.fillStyle = c; g.fillRect(18, 428 + i * 10, 764, 7) })
      g.fillStyle = '#050506'; g.fillRect(18, 478, 764, 4)
      tvTex.needsUpdate = true
    }
    const tvTex = new THREE.CanvasTexture(cv); tvTex.colorSpace = THREE.SRGBColorSpace; tvTex.anisotropy = aniso
    drawTV()
    mesh(box(1.2, 0.76, 0.05), M(0xf4f2f2, { roughness: 0.4, name: 'tv_casing_white' }), 'tv_casing', tv, 0, 0, 0.025)
    const sc = mesh(new THREE.PlaneGeometry(1.18, 0.7375), new THREE.MeshBasicMaterial({ map: tvTex, toneMapped: false, name: 'tv_screen' }), 'tv_screen', tv, 0, 0, 0.0515); sc.castShadow = sc.receiveShadow = false
  }

  /* ---------- paper lanterns (the two ceiling lights) ---------- */
  const lanterns = [], lamps = []
  function lantern(x, z, hang, drop, color, name) {
    const pivot = new THREE.Group(); pivot.name = name; pivot.position.set(x, hang, z); scene.add(pivot)
    const mat = M(color, { emissive: color, emissiveIntensity: 0.2, roughness: 0.9, name: name + '_paper' })
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 20), mat); ball.scale.y = 0.92; ball.position.y = -drop; ball.name = name + '_shade'; ball.castShadow = true; pivot.add(ball)
    const rib = M(new THREE.Color(color).multiplyScalar(0.45), { roughness: 0.8, name: name + '_rib' })
    ;[-0.07, -0.035, 0, 0.035, 0.07].forEach((dy, i) => { const r = Math.sqrt(0.11 * 0.11 - dy * dy) + 0.0012; const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0016, 6, 48), rib); t.rotation.x = Math.PI / 2; t.position.y = -drop + dy * 0.92; t.name = name + '_ring_' + i; pivot.add(t) })
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.0013, 0.0013, drop, 6), M(0x2a2024, { name: 'cord' })); cord.position.y = -drop / 2; pivot.add(cord)
    const l = new THREE.PointLight(color, 0, 3.5, 2); l.position.y = -drop; l.visible = false; pivot.add(l); lamps.push({ mat, l })
    lanterns.push({ pivot, ph: Math.random() * 6 })
  }
  lantern(-0.45, -0.05, 2.15, 0.55, 0x8fd448, 'lantern_green')
  lantern(0.85, -0.02, 2.08, 0.5, 0xf5a04a, 'lantern_orange')

  /* ---------- window onto the magic garden (day + night painters) ---------- */
  const mixHex = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()
  function drawGarden(g, top, isNight) {
    const W = 1024, H = 512; let seed = 11; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647
    const ell = (x, y, rx, ry, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill() }
    const hill = (base, amp, f1, f2, ph, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) g.lineTo(x, base + amp * Math.sin(x / f1 + ph) + amp * 0.45 * Math.sin(x / f2 + ph * 2)); g.lineTo(W, H); g.fill() }
    const skyTop = isNight ? '#121230' : top
    function back() {
      const sk = g.createLinearGradient(0, 0, 0, H * 0.7)
      sk.addColorStop(0, skyTop); sk.addColorStop(1, isNight ? '#2c2c58' : mixHex(top, '#ffffff', 0.7))
      g.fillStyle = sk; g.fillRect(0, 0, W, H)
      if (isNight) {
        const moon = g.createRadialGradient(160, 90, 6, 160, 90, 120)
        moon.addColorStop(0, 'rgba(245,240,210,.95)'); moon.addColorStop(0.25, 'rgba(245,240,210,.5)'); moon.addColorStop(1, 'rgba(245,240,210,0)')
        g.fillStyle = moon; g.fillRect(0, 0, W, H)
        ell(160, 90, 34, 34, '#f5f0d2')
        g.fillStyle = 'rgba(200,190,160,.35)'; ell(150, 82, 8, 7, 'rgba(200,190,160,.35)'); ell(172, 98, 5, 5, 'rgba(200,190,160,.3)')
        for (let i = 0; i < 40; i++) { const sx = rnd() * W, sy = rnd() * H * 0.45, r = 1 + rnd() * 1.8; g.fillStyle = 'rgba(255,255,255,' + (0.4 + rnd() * 0.5) + ')'; g.fillRect(sx, sy, r * 2, r * 0.8); g.fillRect(sx + r * 0.6, sy - r * 0.6, r * 0.8, r * 2) }
        [[140, 70, 1], [470, 50, 0.8], [760, 105, 1.1], [980, 40, 0.7]].forEach(([x, y, k]) => { [[0, 0, 50], [45, -12, 42], [90, 2, 46], [-42, 8, 36], [130, 12, 32]].forEach(([dx, dy, r]) => ell(x + dx * k, y + dy * k, r * k, r * 0.62 * k, 'rgba(120,130,175,.45)')) })
      } else {
        const sun = g.createRadialGradient(900, 70, 4, 900, 70, 140)
        sun.addColorStop(0, 'rgba(255,250,200,.95)'); sun.addColorStop(1, 'rgba(255,250,200,0)')
        g.fillStyle = sun; g.fillRect(0, 0, W, H);
        [[140, 70, 1], [470, 50, 0.8], [760, 105, 1.1], [980, 40, 0.7]].forEach(([x, y, k]) => { [[0, 0, 50], [45, -12, 42], [90, 2, 46], [-42, 8, 36], [130, 12, 32]].forEach(([dx, dy, r]) => ell(x + dx * k, y + dy * k, r * k, r * 0.62 * k, 'rgba(255,255,255,.92)')) })
      }
      hill(300, 22, 150, 57, 1, isNight ? '#2f6b45' : '#a8dcae')
      const castleBody = isNight ? '#8a5a78' : '#f4b9de'
      const castleRoof = isNight ? '#4a2a70' : '#9d6ddb'
      const castleWin = isNight ? '#ffd97a' : '#8a5a2c'
      g.fillStyle = castleBody
      g.fillRect(588, 232, 64, 62); g.fillRect(568, 196, 24, 98); g.fillRect(648, 196, 24, 98); g.fillRect(606, 160, 28, 80)
      g.fillStyle = castleRoof
      ;[[580, 196, 30, 44], [660, 196, 30, 44], [620, 160, 34, 56], [620, 232, 70, 26]].forEach(([x, y, w, h]) => { g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x, y - h); g.lineTo(x + w / 2, y); g.fill() })
      g.fillStyle = castleWin
      ;[[580, 215], [660, 215], [620, 185], [606, 262], [634, 262]].forEach(([x, y]) => g.fillRect(x - 3, y, 6, 12))
      if (isNight) { g.fillStyle = 'rgba(255,217,122,.35)'; [[580, 221], [660, 221], [620, 191]].forEach(([x, y]) => ell(x, y, 14, 14, 'rgba(255,217,122,.3)')) }
      hill(335, 18, 120, 41, 3, isNight ? '#255538' : '#7fcb7f')
    }
    back()
    if (!isNight) {
      ['#ff6b8b', '#ffb04d', '#ffe35a', '#7bdc6e', '#5ab8ff', '#9a7bff'].forEach((c, i) => { g.strokeStyle = c; g.globalAlpha = 0.55; g.lineWidth = 11; g.beginPath(); g.arc(300, 400, 215 - i * 11, Math.PI * 1.06, Math.PI * 1.94); g.stroke() })
      g.globalAlpha = 1
    }
    const stone = isNight ? '#6a6a80' : '#bcbcc8'
    const mortar = isNight ? 'rgba(40,40,60,.55)' : 'rgba(110,110,130,.55)'
    g.fillStyle = stone; g.fillRect(420, 240, W - 420, 120)
    g.strokeStyle = mortar; g.lineWidth = 2
    for (let r = 0; r < 6; r++) { const y = 240 + r * 20; g.beginPath(); g.moveTo(420, y); g.lineTo(W, y); g.stroke(); for (let x = 420 + (r % 2) * 30; x < W; x += 60) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 20); g.stroke() } }
    g.save(); g.beginPath(); g.moveTo(650, 362); g.lineTo(650, 300); g.arc(715, 300, 65, Math.PI, 0); g.lineTo(780, 362); g.closePath(); g.clip(); back(); g.restore()
    g.strokeStyle = isNight ? '#9a98b0' : '#e4e2ec'; g.lineWidth = 9; g.beginPath(); g.moveTo(650, 362); g.lineTo(650, 300); g.arc(715, 300, 65, Math.PI, 0); g.lineTo(780, 362); g.stroke()
    const hedgeCols = isNight ? ['#2a4a3a', '#243f32', '#1e3428', '#2a4a3a'] : ['#ff5fae', '#ff8fc8', '#e0338a', '#ffb3d9']
    for (let x = 430; x < W; x += 15) { const c = hedgeCols[(x / 15 | 0) % 4]; ell(x, 236 + Math.sin(x) * 4, 11, 9, c); ell(x + 6, 244, 6, 5, isNight ? '#1e4a2a' : '#4aa84a') }
    const gr = g.createLinearGradient(0, 340, 0, H)
    gr.addColorStop(0, isNight ? '#1d4a2a' : '#6bcb62'); gr.addColorStop(1, isNight ? '#123018' : '#3da64a')
    g.fillStyle = gr; g.fillRect(0, 352, W, H)
    hill(372, 12, 90, 33, 5, isNight ? '#1a3f24' : '#58bd57'); g.fillStyle = gr; g.fillRect(0, 440, W, H)
    g.fillStyle = isNight ? '#8a8478' : '#ddd5c3'; g.beginPath(); g.moveTo(690, 362); g.lineTo(742, 362); g.lineTo(800, 440); g.lineTo(630, 440); g.fill()
    g.strokeStyle = isNight ? 'rgba(60,55,45,.5)' : 'rgba(140,130,110,.5)'; g.lineWidth = 2; for (let y = 372; y < 440; y += 14) { g.beginPath(); g.moveTo(660 + (y - 362) * -0.35 + 40, y); g.lineTo(770 + (y - 362) * 0.4 - 40, y); g.stroke() }
    g.strokeStyle = isNight ? '#1d3f6b' : '#4aa7ea'; g.lineWidth = 54; g.lineCap = 'round'; g.beginPath(); g.moveTo(-20, 462); g.bezierCurveTo(250, 420, 450, 505, 700, 462); g.bezierCurveTo(850, 440, 950, 455, 1050, 462); g.stroke()
    g.strokeStyle = isNight ? 'rgba(190,210,255,.35)' : 'rgba(255,255,255,.5)'; g.lineWidth = 3; for (let i = 0; i < 16; i++) { const x = rnd() * W, y = 450 + rnd() * 30; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 28, y + 2); g.stroke() }
    g.strokeStyle = isNight ? '#3a2810' : '#8a5a2e'; g.lineWidth = 16; g.lineCap = 'butt'; g.beginPath(); g.moveTo(640, 468); g.quadraticCurveTo(715, 408, 790, 468); g.stroke()
    g.strokeStyle = isNight ? '#5a3a18' : '#a8713f'; g.lineWidth = 4; g.beginPath(); g.moveTo(646, 452); g.quadraticCurveTo(715, 390, 784, 452); g.stroke()
    g.fillStyle = isNight ? '#3a2410' : '#7b4e2a'; g.beginPath(); g.moveTo(135, 460); g.quadraticCurveTo(168, 380, 150, 200); g.lineTo(240, 200); g.quadraticCurveTo(225, 380, 262, 460); g.fill()
    g.fillStyle = isNight ? '#4a2e14' : '#a86a3a'; g.beginPath(); g.moveTo(172, 440); g.lineTo(172, 385); g.arc(197, 385, 25, Math.PI, 0); g.lineTo(222, 440); g.fill()
    g.strokeStyle = isNight ? '#1e1208' : '#4d2f17'; g.lineWidth = 4; g.stroke(); ell(197, 330, 12, 12, isNight ? '#8a7a58' : '#f6e7c8')
    const willowCols = isNight ? ['#1e4a28', '#245530', '#2a5f38', '#183a20'] : ['#3f9a47', '#4fae4f', '#5cbd55', '#2f8a3f']
    willowCols.forEach((c) => { for (let k = 0; k < 7; k++) ell(40 + rnd() * 320, 60 + rnd() * 110, 70 + rnd() * 40, 34 + rnd() * 20, c) })
    const strandCols = isNight ? ['#183a20', '#1e4a28', '#245530', '#2a5f38'] : ['#2f8a3f', '#3f9a47', '#56b652', '#6fcb64']
    for (let i = 0; i < 170; i++) {
      const x = 10 + rnd() * 380, y = 80 + rnd() * 60, len = 120 + rnd() * 210, sw = (rnd() - 0.5) * 26
      g.strokeStyle = strandCols[i % 4]; g.lineWidth = 2.5 + rnd() * 3; g.globalAlpha = 0.9
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + sw, y + len * 0.5, x + sw * 0.6, y + len); g.stroke()
      if (i % 9 === 0 && !isNight) { g.globalAlpha = 1; ell(x + sw * 0.6, y + len, 5, 9, '#ffffff') }
      if (i % 14 === 0 && isNight) { g.globalAlpha = 1; ell(x + sw * 0.6, y + len, 4, 6, 'rgba(190,255,170,.8)') }
    }
    g.globalAlpha = 1
    const flower = (x, y, r, pc, cc) => { for (let p = 0; p < 9; p++) { const a = p * Math.PI * 2 / 9; ell(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.42, r * 0.24, pc) } ell(x, y, r * 0.3, r * 0.3, cc) }
    const petalA = isNight ? '#8a3a62' : '#ff6fb2'
    const petalB = isNight ? '#7a3058' : '#ff4f9a'
    const center = isNight ? '#8a5a20' : '#ff9a2e'
    ;[[840, 400, 30], [930, 380, 38], [985, 430, 26], [870, 462, 22], [40, 470, 26], [320, 486, 20], [520, 490, 24], [450, 410, 16], [1000, 322, 22]].forEach(([x, y, r], i) => flower(x, y, r, i % 2 ? petalA : petalB, center))
    const dotCols = isNight ? ['#8a5a20', '#8a7020', '#c8c0a0', '#8a4a68'] : ['#ff9a2e', '#ffd23f', '#ffffff', '#ff7ac0']
    for (let i = 0; i < 90; i++) { const x = rnd() * W, y = 390 + rnd() * 120; if (y > 440 && y < 490 && x < 700) continue; ell(x, y, 4, 4, dotCols[i % 4]) }
    if (isNight) { g.fillStyle = 'rgba(255,235,160,.9)'; for (let i = 0; i < 18; i++) { const x = rnd() * W, y = 360 + rnd() * 140; ell(x, y, 2.5, 2.5, 'rgba(255,235,160,.9)') } }
    else { g.fillStyle = '#fff'; for (let i = 0; i < 26; i++) { const x = rnd() * W, y = rnd() * 330, r = 3 + rnd() * 4; g.fillRect(x - r, y - 1, r * 2, 2); g.fillRect(x - 1, y - r, 2, r * 2) } }
  }
  const gardenCv = document.createElement('canvas'); gardenCv.width = 1024; gardenCv.height = 512
  const gardenCtx = gardenCv.getContext('2d')
  drawGarden(gardenCtx, TW.sky, night)
  const gardenTexP = new THREE.CanvasTexture(gardenCv); gardenTexP.colorSpace = THREE.SRGBColorSpace; gardenTexP.anisotropy = aniso
  const gardenMat = new THREE.MeshBasicMaterial({ map: gardenTexP, toneMapped: false, name: 'magic_garden' })
  let windowLight
  {
    const win = new THREE.Group(); win.name = 'window'; scene.add(win)
    const W = 1.5, H = 0.75, cx = 0.25, cy = 1.16, wz = -0.447
    const garden = mesh(new THREE.PlaneGeometry(W, H), gardenMat, 'garden_view', win, cx, cy, wz); garden.castShadow = garden.receiveShadow = false
    const frame = M(0xf6eee2, { roughness: 0.5, name: 'window_frame_cream' }), t = 0.04, d = 0.05
    mesh(box(W + 2 * t, t, d), frame, 'frame_top', win, cx, cy + H / 2 + t / 2, wz + d / 2)
    mesh(box(W + 2 * t, t, d), frame, 'frame_bottom', win, cx, cy - H / 2 - t / 2, wz + d / 2)
    mesh(box(t, H, d), frame, 'frame_left', win, cx - W / 2 - t / 2, cy, wz + d / 2)
    mesh(box(t, H, d), frame, 'frame_right', win, cx + W / 2 + t / 2, cy, wz + d / 2)
    mesh(box(0.014, H, 0.03), frame, 'mullion_v', win, cx, cy, wz + 0.02)
    mesh(box(W, 0.014, 0.03), frame, 'mullion_h', win, cx, cy, wz + 0.02)
    mesh(box(W + 0.16, 0.025, 0.1), frame, 'sill', win, cx, cy - H / 2 - t - 0.012, wz + 0.05)
    const hl = canvasTex(256, 128, (g, w, h) => { const l = g.createLinearGradient(0, h, w, 0); l.addColorStop(0.25, 'rgba(255,255,255,0)'); l.addColorStop(0.4, 'rgba(255,255,255,.35)'); l.addColorStop(0.5, 'rgba(255,255,255,0)'); l.addColorStop(0.62, 'rgba(255,255,255,.22)'); l.addColorStop(0.7, 'rgba(255,255,255,0)'); g.fillStyle = l; g.fillRect(0, 0, w, h) })
    const gl = mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: hl, transparent: true, depthWrite: false, toneMapped: false, name: 'window_glass' }), 'window_glass', win, cx, cy, wz + 0.03); gl.castShadow = gl.receiveShadow = false
    windowLight = new THREE.PointLight(0xfff0d0, 0.9, 3.2, 2); windowLight.position.set(cx, cy, -0.1); scene.add(windowLight)
  }

  /* wall pieces that block the sun everywhere except the window opening */
  {
    const occ = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, name: 'sun_occluder' })
    const cx = 0.25, cy = 1.16, hw = 0.79, hh = 0.415, z = -0.43
    const piece = (x0, x1, y0, y1) => { const m = new THREE.Mesh(box(x1 - x0, y1 - y0, 0.02), occ); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z); m.castShadow = true; m.name = 'sun_occluder'; scene.add(m) }
    piece(-5, 5, 0, cy - hh); piece(-5, 5, cy + hh, 3.6); piece(-5, cx - hw, cy - hh, cy + hh); piece(cx + hw, 5, cy - hh, cy + hh)
  }

  /* ---------- light switch (day / night) ---------- */
  const switchG = new THREE.Group(); switchG.name = 'light_switch'; switchG.position.set(1.32, 1.05, -0.44); switchG.userData.action = 'night'; scene.add(switchG)
  mesh(box(0.075, 0.115, 0.012), M(0xf2ece0, { roughness: 0.5, name: 'switch_plate' }), 'switch_plate', switchG, 0, 0, 0.006)
  mesh(box(0.055, 0.09, 0.004), M(0xe2dac8, { roughness: 0.6, name: 'switch_inset' }), 'switch_inset', switchG, 0, 0, 0.011)
  const switchNub = mesh(box(0.03, 0.042, 0.016), M(0xfaf6ee, { roughness: 0.35, name: 'switch_nub' }), 'switch_nub', switchG, 0, night ? -0.02 : 0.02, 0.016)
  const switchLabel = canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = '#f2ece0'; g.fillRect(0, 0, w, h)
    g.fillStyle = '#7a6f5a'; g.font = '600 22px ui-sans-serif,system-ui,sans-serif'; g.textAlign = 'center'
    g.fillText('DAY', w / 2, 22); g.fillText('NIGHT', w / 2, 54)
  })
  const labelPlate = mesh(new THREE.PlaneGeometry(0.06, 0.03), new THREE.MeshBasicMaterial({ map: switchLabel, toneMapped: false }), 'switch_label', switchG, 0, -0.075, 0.007); labelPlate.castShadow = false

  /* ---------- camera, resize, loop ---------- */
  const target = new THREE.Vector3(0.0, 0.8, 0.1)
  let camDist = 2.6
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight; renderer.setSize(w, h, false)
    camera.aspect = w / h
    const need = 1.45 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect)
    camDist = Math.max(1.9, need, 0.55 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))); camera.updateProjectionMatrix()
  }
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 }
  const onPointerMoveMouse = (e) => { const r = canvas.getBoundingClientRect(); mouse.x = (e.clientX - r.left) / r.width * 2 - 1; mouse.y = (e.clientY - r.top) / r.height * 2 - 1 }
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const clock = new THREE.Clock(); let lastScr = -1; let rafId = 0
  const L = (a, b) => a + (b - a) * nightK
  const wallDay = new THREE.Color(0xffffff), wallNite = new THREE.Color(0x8f7cb8)
  function tick() {
    if (disposed) return
    rafId = requestAnimationFrame(tick)
    const t = reduce ? 0 : clock.getElapsedTime()
    // ease the day/night factor
    nightK += ((night ? 1 : 0) - nightK) * 0.06
    if (Math.abs((night ? 1 : 0) - nightK) < 0.002) nightK = night ? 1 : 0
    mouse.sx += (mouse.x - mouse.sx) * 0.04; mouse.sy += (mouse.y - mouse.sy) * 0.04
    const dr = TW.drift ? 1 : 0, px = TW.parallax
    camera.position.set(0.0 + mouse.sx * 0.14 * px + Math.sin(t * 0.13) * 0.1 * dr, 1.35 - mouse.sy * 0.05 * px + Math.sin(t * 0.19) * 0.03 * dr, camDist)
    camera.lookAt(target)
    // day / night lighting
    hemi.intensity = L(0.5, 0.1)
    key.intensity = L(0.5, 0.06)
    sun.intensity = L(3.0, 0.0)
    rim.intensity = L(0.5, 0.12)
    scene.environmentIntensity = L(0.4, 0.08)
    renderer.toneMappingExposure = L(1.08, 0.8)
    scene.background.copy(bgDay).lerp(bgNight, nightK)
    wallMat.color.copy(wallDay).lerp(wallNite, nightK)
    windowLight.intensity = L(0.9, 0.04)
    lamps.forEach(o => {
      o.mat.emissiveIntensity = L(0.2, 0.9)
      o.l.intensity = nightK * 1.3
      o.l.visible = nightK > 0.02
    })
    switchNub.position.y = L(0.02, -0.02)
    lanterns.forEach(l => { l.pivot.rotation.z = Math.sin(t * 0.6 + l.ph) * 0.035; l.pivot.rotation.x = Math.cos(t * 0.45 + l.ph) * 0.02 })
    steam.forEach(s => {
      const u = (t * 0.16 + s.userData.p) % 1
      s.position.set(Math.sin(t * 0.9 + s.userData.ph + u * 5) * 0.012 * u * 3, 0.06 + u * 0.26, 0)
      s.scale.setScalar(0.025 + u * 0.085); s.material.opacity = Math.sin(Math.PI * u) * 0.3
    })
    if (t - lastScr > 0.08) { lastScr = t; drawScreen(t) }
    stickies.forEach(n => { const u = n.userData; u.h += ((n === hovered && n.userData.url ? 1 : 0) - u.h) * 0.18; if (u.group) { u.group.scale.setScalar(1 + u.h * 0.18); return } n.position.z = 0.024 + u.h * 0.035; n.scale.setScalar(1 + u.h * 0.14); n.rotation.z = u.r * (1 - u.h) })
    const lapHov = laptopHover ? 1 : 0
    laptopHoverK += (lapHov - laptopHoverK) * 0.12
    laptop.scale.setScalar(LAPTOP_SCALE * (1 + laptopHoverK * 0.03))
    renderer.render(scene, camera)
  }

  /* ---------- interactions: hover + click ---------- */
  let laptopHover = false, laptopHoverK = 0
  const ray = new THREE.Raycaster(), v = new THREE.Vector2()
  const interactive = [...stickies, laptop, switchG, projectsBox, notebookStack.g]
  if (guitar.userData.action) interactive.push(guitar)
  if (cup.userData.action) interactive.push(cup)
  // raycast one screen point; returns the nearest interactive object and its distance
  function pickAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect()
    v.set((clientX - r.left) / r.width * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(v, camera)
    const hit = ray.intersectObjects(interactive, true)[0]
    if (!hit) return null
    let o = hit.object
    while (o && !o.userData.url && !o.userData.action) o = o.parent
    return o ? { object: o, distance: hit.distance } : null
  }
  // fingers are ~40px wide while stickies can be a few px on a phone:
  // when the exact point misses, sample a ring around it
  function pickNear(clientX, clientY) {
    // inner ring first, so the closest hit to the finger wins
    for (const radius of [10, 20]) {
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2
        const hit = pickAt(clientX + Math.cos(a) * radius, clientY + Math.sin(a) * radius)
        if (hit) return hit
      }
    }
    return null
  }
  function pick(e) {
    const hit = pickAt(e.clientX, e.clientY) || (e.pointerType !== 'mouse' ? pickNear(e.clientX, e.clientY) : null)
    return hit ? hit.object : null
  }
  const setHover = (hit) => {
    hovered = hit && hit.userData.url ? hit : null
    laptopHover = !!(hit && hit.userData.action === 'desktop')
  }
  const onPointerMovePick = (e) => {
    if (disposed) return
    if (e.target !== canvas || e.pointerType !== 'mouse') return
    const hit = pick(e)
    setHover(hit)
    canvas.style.cursor = hit ? 'pointer' : ''
  }
  // our own tap detection: `click` gets dropped on mobile when the finger drifts slightly
  let down = null
  const onPointerDown = (e) => {
    if (disposed || !e.isPrimary) return
    down = { x: e.clientX, y: e.clientY, t: performance.now() }
    if (e.pointerType !== 'mouse') setHover(pick(e)) // visual feedback on touch
  }
  const onPointerUp = (e) => {
    if (disposed || !down || !e.isPrimary) return
    const tap = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12 && performance.now() - down.t < 600
    down = null
    if (e.pointerType !== 'mouse') setTimeout(() => setHover(null), 220)
    if (tap) activate(e)
  }
  const onPointerCancel = () => { down = null; setHover(null) }
  const activate = (e) => {
    const hit = pick(e)
    if (!hit) return
    const { url, action } = hit.userData
    if (url) window.open(url, '_blank', 'noopener')
    else if (action === 'desktop') { if (onOpenDesktop) onOpenDesktop() }
    else if (action === 'projects' && onOpenProjects) onOpenProjects()
    else if (action === 'night') toggleNight()
    else if (action === 'email') window.location.href = links.email
    else if (action === 'youtube' && onTrackPlay) onTrackPlay()
    else if (action === 'medium' && links.medium) window.open(links.medium, '_blank', 'noopener')
    else if (action === 'hobby' && links.hobby) window.open(links.hobby, '_blank', 'noopener')
  }
  function toggleNight() {
    night = !night
    try { localStorage.setItem(NIGHT_KEY, night ? '1' : '0') } catch { /* storage unavailable */ }
    drawGarden(gardenCtx, TW.sky, night)
    gardenTexP.needsUpdate = true
  }
  addEventListener('resize', resize)
  addEventListener('pointermove', onPointerMoveMouse)
  addEventListener('pointermove', onPointerMovePick)
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerCancel)
  // mobile address bar showing/hiding resizes the visual viewport without always firing window resize
  window.visualViewport?.addEventListener('resize', resize)
  resize()
  // fonts land after first paint; redraw the canvas textures that use them
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (disposed) return
      drawPage(pgL, 0); drawPage(pgR, 1)
      stickies.forEach(n => { const t = n.material[4]; if (t && t.map) redraw(t.map) })
    })
  }
  tick()

  /* ---------- teardown ---------- */
  function dispose() {
    disposed = true
    cancelAnimationFrame(rafId)
    removeEventListener('resize', resize)
    removeEventListener('pointermove', onPointerMoveMouse)
    removeEventListener('pointermove', onPointerMovePick)
    dragListeners.forEach(([type, fn]) => removeEventListener(type, fn))
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointercancel', onPointerCancel)
    window.visualViewport?.removeEventListener('resize', resize)
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose()
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
      mats.forEach((m) => {
        for (const k of ['map', 'alphaMap', 'bumpMap']) if (m[k]) m[k].dispose()
        m.dispose()
      })
    })
    if (scene.environment) scene.environment.dispose()
    renderer.dispose()
    canvas.remove()
  }

  return { dispose, toggleNight, isNight: () => night }
}
