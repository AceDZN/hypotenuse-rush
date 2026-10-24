import * as THREE from 'three';
import { createAthlete, animateAthlete } from './art';
import { createFlowCanyon, atmosphere } from './canyon';
import { LEVELS, STAGES, createFlightState, chooseHook, selectHook, launchSelected, advanceFlight, toggleFlightPause, restartFlight, performTrick, inspectFlightHook, nextLevel, loadLevel, recordHint, serializeProgress } from './flight';
import { numberText, inspectionDiagram, calculation, type Inspection } from './inspection';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const ui = document.querySelector<HTMLDivElement>('#ui')!;
let saved: unknown = undefined;
try { saved = JSON.parse(localStorage.getItem('rush-campaign-v3') || 'null'); } catch { /* Ignore malformed records. */ }
const state = createFlightState({ progress: saved });
let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches, muted = false, manual = false;
let help = false, hint = false, mapOpen = false, mapLevel = state.level;
let builtStage = -1, frameTime = 0, lastLanded = state.landed, lastLaunches = 0, lastMistakes = 0, lastTricks = 0;
let lastMode = '', uiKey = '', overlayKey = '', inspectorKey = '', lastSaved = '';
const $ = (id: string) => document.getElementById(id)!;
const V = (p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, p.z);
const harness = () => V(state.p).add(new THREE.Vector3(0, 1.05, 0));
const stage = () => STAGES[state.stage];
const level = () => LEVELS[state.level];
const timeText = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`;
function save() { const value = serializeProgress(state.progress); if (value === lastSaved) return; try { localStorage.setItem('rush-campaign-v3', value); lastSaved = value; } catch { /* Saving may be disabled. */ } }
let renderer: THREE.WebGLRenderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true }); }
catch { ui.innerHTML = '<div class="fatal">התלת־ממד לא נטען. הפעילו האצת חומרה בדפדפן ונסו לרענן.</div>'; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.4));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, .1, 350);
const fitCamera = camera.clone();
const ambient = new THREE.HemisphereLight('#dcecff', '#9b5737', 2); scene.add(ambient);
const sun = new THREE.DirectionalLight('#ffe8bd', 3); sun.castShadow = true;
sun.shadow.mapSize.set(1536, 1536); Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 30, bottom: -25, near: 1, far: 100 }); sun.shadow.bias = -.0005;
scene.add(sun, sun.target);
const canyon = createFlowCanyon(scene, STAGES);
let archLoaded = false; void canyon.loaded.then(() => { archLoaded = true; }).catch(e => console.error('Canyon asset failed', e));
const athlete = createAthlete(); scene.add(athlete);
const ivory = new THREE.MeshStandardMaterial({ color: '#fff1ce', roughness: .42, metalness: .12 });
const coral = new THREE.MeshStandardMaterial({ color: '#f4774b', roughness: .65 });
const hookGroup = new THREE.Group(), marks = new THREE.Group(); scene.add(hookGroup, marks);
const hooks = new Map<string, THREE.Group>();
const rope = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 1, 7), ivory); scene.add(rope);
const dust = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.065, 0), new THREE.MeshBasicMaterial({ color: '#ffe4ac', transparent: true, opacity: .75 }), 32); dust.frustumCulled = false; scene.add(dust);
const particle = new THREE.Object3D();
let landingRing: THREE.Mesh, trickAt = -100;
const readyPosition = new THREE.Vector3(), readyFocus = new THREE.Vector3(), desiredPosition = new THREE.Vector3(), desiredFocus = new THREE.Vector3();
let cameraReady = false;

ui.innerHTML = `
<header class="hud"><div class="brand"><span>◭</span><div>HYPOTENUSE <em>RUSH</em><small>מסע מעל הקניון</small></div></div>
  <div class="journey"><button id="journey" aria-label="מפת השלבים">המסע</button><div><strong id="level-count"></strong><small id="hop-count"></small></div><button id="pause" aria-label="השהיה">Ⅱ</button></div>
</header>
<section class="rope-spec" aria-label="אורך הכבל שלך"><svg viewBox="0 0 46 46" aria-hidden="true"><path d="M12 9h22v28H12zM9 12h28M9 20h28M9 28h28M9 36h28" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg><div><small>אורך הכבל שלך</small><strong id="rope-length"></strong><span>מהרתמה <bdi>P</bdi> אל הטבעת</span></div></section>
<div id="region-title" class="region-title"></div>
<svg id="world-measure" aria-hidden="true"></svg><svg id="hook-leaders" aria-hidden="true"></svg><div id="hook-buttons"></div>
<div id="pop" class="pop" aria-live="polite"></div>
<aside id="inspection" class="inspection"><div class="inspection-heading"><strong id="inspection-title"></strong><span id="first-try"></span></div><div id="diagram"></div><div id="calculation"></div><div class="inspection-note" id="inspection-note"></div><button id="calc">חשבו איתי <bdi>√</bdi></button></aside>
<div class="action-dock"><div id="feedback" class="feedback" role="status"></div><div id="action-content"></div></div>
<button id="help" class="help" aria-label="עזרה והגדרות">?</button><div id="timer" class="timer ltr"></div>
<div id="overlay"></div>`;

function clearGroup(group: THREE.Group) {
  group.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m !== ivory && m !== coral) m.dispose(); } }); group.clear();
}
function buildStage() {
  builtStage = state.stage; hint = false; inspectorKey = ''; uiKey = ''; overlayKey = '';
  canyon.setStage(state.stage);
  const a = atmosphere(stage().region);
  scene.fog = new THREE.Fog(a.fog, a.fogNear, a.fogFar);
  ambient.color.set(a.ambient); ambient.groundColor.set(a.ground); ambient.intensity = a.hemisphereIntensity;
  sun.color.set(a.sun); sun.intensity = a.sunIntensity;
  sun.position.copy(V(stage().origin)).add(new THREE.Vector3(-13, 30, 15)); sun.target.position.copy(V(stage().origin)); sun.target.updateMatrixWorld();
  clearGroup(hookGroup); clearGroup(marks); hooks.clear();
  for (const h of stage().hooks) {
    const g = new THREE.Group(); g.position.copy(V(h.position));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.42, .075, 10, 40), ivory); g.add(ring);
    const clip = new THREE.Mesh(new THREE.BoxGeometry(.23, .22, .2), coral); clip.position.y = .49; g.add(clip);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(.028, .028, .6, 7), ivory); chain.position.y = .88; g.add(chain);
    hookGroup.add(g); hooks.set(h.id, g);
  }
  for (const [p, landing] of [[stage().origin, false], [stage().landing, true]] as const) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(landing ? 1.15 : .7, landing ? 1.32 : .78, 64), ivory);
    ring.rotation.x = -Math.PI / 2; ring.position.copy(V(p)).y += .025; marks.add(ring);
    if (landing) { landingRing = ring; const disk = new THREE.Mesh(new THREE.CircleGeometry(1.1, 64), new THREE.MeshBasicMaterial({ color: '#f5a367', transparent: true, opacity: .35 })); disk.rotation.x = -Math.PI / 2; disk.position.copy(V(p)).y += .02; marks.add(disk); }
  }
  $('hook-buttons').innerHTML = stage().hooks.map(h => `<button class="hook-target" data-hook="${h.id}" aria-label="מדידת טבעת ${h.label}" aria-pressed="${h.id === state.selected}"><span>${h.label}</span></button>`).join('');
  for (const el of Array.from(document.querySelectorAll<HTMLButtonElement>('.hook-target'))) {
    const inspect = () => { chooseHook(state, el.dataset.hook!); hint = false; render(0); };
    el.addEventListener('click', inspect);
    el.addEventListener('focus', () => { if (state.mode === 'ready') { chooseHook(state, el.dataset.hook!); hint = false; } });
  }
  computeReadyCamera();
  camera.position.copy(readyPosition); camera.lookAt(readyFocus); camera.updateMatrixWorld(); cameraReady = true;
}
function computeReadyCamera() {
  const s = stage(), portrait = innerWidth < 850;
  const maxY = Math.max(...s.hooks.map(h => h.position.y));
  readyFocus.copy(V(s.origin));
  readyFocus.x += Math.min(9, Math.max(...s.hooks.map(h => h.position.x - s.origin.x)) * .7);
  readyFocus.y += Math.max(4.8, (maxY - s.origin.y) * .48);
  readyFocus.z += s.hooks.reduce((sum, h) => sum + h.position.z - s.origin.z, 0) / s.hooks.length * .2;
  const direction = (portrait ? new THREE.Vector3(-14, 3.6, 15) : new THREE.Vector3(-14, 1.2, 13)).normalize();
  const points = [
    { p: V(s.origin), top: 150, bottom: portrait ? 345 : 30 },
    { p: V(s.origin).add(new THREE.Vector3(0, 1.85, 0)), top: 150, bottom: portrait ? 280 : 45 },
    ...s.hooks.map(h => ({ p: V(h.position), top: portrait ? 170 : 150, bottom: portrait ? 290 : 200 })),
    ...[[-2.4, 0, -2.6], [2.4, 0, 2.6], [2.4, 0, -2.6]].map(d => ({ p: V(s.landing).add(new THREE.Vector3(...d as [number, number, number])), top: 130, bottom: portrait ? 265 : 130 })),
  ];
  fitCamera.aspect = camera.aspect; fitCamera.fov = portrait ? 53 : 48; fitCamera.updateProjectionMatrix();
  let distance = portrait ? 16 : 19.2;
  for (let i = 0; i < 90; i++) {
    fitCamera.position.copy(readyFocus).addScaledVector(direction, distance); fitCamera.lookAt(readyFocus); fitCamera.updateMatrixWorld();
    const fits = points.every(({ p, top, bottom }) => {
      const q = p.clone().project(fitCamera), x = (q.x + 1) * innerWidth / 2, y = (1 - q.y) * innerHeight / 2;
      const behindInspector = !portrait && x < 355 && y > innerHeight - 290;
      const behindAction = !portrait && Math.abs(x - innerWidth * .59) < 245 && y > innerHeight - 160;
      return q.z < 1 && x > 45 && x < innerWidth - 45 && y > top && y < Math.max(top + 120, innerHeight - bottom) && !behindInspector && !behindAction;
    });
    if (fits) break;
    distance *= 1.035;
  }
  readyPosition.copy(fitCamera.position); camera.fov = fitCamera.fov; camera.updateProjectionMatrix();
}
const screen = (v: THREE.Vector3) => { const p = v.clone().project(camera); return { x: (p.x + 1) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2 }; };
const pointText = (v: THREE.Vector3) => { const p = screen(v); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; };
function drawMeasurements() {
  const visible = state.mode === 'ready' && !mapOpen && !help;
  $('world-measure').style.display = visible ? '' : 'none';
  if (!visible) return;
  const h = stage().hooks.find(h => h.id === state.selected)!;
  const p = harness(), q = V(h.position), c = new THREE.Vector3(q.x, p.y, p.z), f = new THREE.Vector3(q.x, p.y, q.z);
  const spatial = Math.abs(q.z - p.z) > .001;
  const leg = (a: THREE.Vector3, b: THREE.Vector3, color: string, dash = false) => `<polyline points="${pointText(a)} ${pointText(b)}" class="measure-outline"/><polyline points="${pointText(a)} ${pointText(b)}" stroke="${color}" class="measure-line" ${dash ? 'stroke-dasharray="10 7"' : ''}/>`;
  const label = (at: THREE.Vector3, text: string, color: string, ox = 0, oy = 0) => { const s = screen(at); const w = Math.max(42, text.length * 10 + 16); return `<g transform="translate(${s.x + ox},${s.y + oy})"><rect x="${-w / 2}" y="-15" width="${w}" height="30" rx="7" fill="#132a3e" fill-opacity=".96" stroke="${color}" stroke-width="1.2"/><text y="6" text-anchor="middle" fill="${color}">${text}</text></g>`; };
  let svg = `<polygon points="${pointText(p)} ${pointText(f)} ${pointText(q)}" fill="#4fcddb" fill-opacity=".12"/>`;
  if (spatial) svg += `<polygon points="${pointText(p)} ${pointText(c)} ${pointText(f)}" fill="#bc8dff" fill-opacity=".12"/>`;
  svg += leg(p, c, '#57e4f0') + (spatial ? leg(c, f, '#bb9aff') + leg(p, f, '#9bc9fb', true) : '') + leg(f, q, '#ffcd66') + leg(p, q, '#fff1d3', true);
  const axis = p.clone().sub(f).normalize().multiplyScalar(.55), up = q.clone().sub(f).normalize().multiplyScalar(.55);
  svg += `<polyline points="${pointText(f.clone().add(axis))} ${pointText(f.clone().add(axis).add(up))} ${pointText(f.clone().add(up))}" fill="none" stroke="#fff5dc" stroke-width="3"/>`;
  if (spatial) { const x = p.clone().sub(c).normalize().multiplyScalar(.5), z = f.clone().sub(c).normalize().multiplyScalar(.5); svg += `<polyline points="${pointText(c.clone().add(x))} ${pointText(c.clone().add(x).add(z))} ${pointText(c.clone().add(z))}" fill="none" stroke="#fff5dc" stroke-width="3"/>`; }
  svg += label(p.clone().lerp(c, .5), `${numberText(q.x - p.x)} m`, '#57e4f0', 0, 22);
  svg += label(f.clone().lerp(q, .5), `${numberText(q.y - p.y)} m`, '#ffcd66', 32, 0);
  if (spatial) svg += label(c.clone().lerp(f, .5), `${numberText(q.z - p.z)} m`, '#bb9aff', 24, 12);
  svg += label(p.clone().lerp(q, .5), hint ? `${numberText(inspectInfo().distance)} m` : '? m', '#fff1d3', -24, -13);
  const ps = screen(p); svg += `<circle cx="${ps.x}" cy="${ps.y}" r="5" fill="#fff2cf" stroke="#142c3d" stroke-width="2"/><text x="${ps.x - 19}" y="${ps.y + 5}" fill="#fff3d5" class="origin-text">P</text>`;
  $('world-measure').innerHTML = svg;
}
function positionHooks() {
  const raw = stage().hooks.map(h => screen(V(h.position)));
  const compact = innerWidth < 850 || raw.some(p => p.y < 225 || p.x < 70 || p.x > innerWidth - 70) || raw.some((p, i) => raw.some((q, j) => i !== j && Math.hypot(p.x - q.x, p.y - q.y) < 95));
  let leaders = '';
  stage().hooks.forEach((h, i) => {
    const el = document.querySelector<HTMLButtonElement>(`[data-hook="${h.id}"]`)!;
    const p = { ...raw[i] };
    if (compact) {
      p.x = innerWidth * (.22 + i * .28);
      p.y = Math.max(innerWidth < 850 ? 195 : 175, Math.min(...raw.map(p => p.y)) - 48);
      p.y = Math.min(p.y, innerHeight * .48);
      leaders += `<line x1="${p.x}" y1="${p.y}" x2="${raw[i].x}" y2="${raw[i].y}"/>`;
    }
    el.hidden = state.mode !== 'ready' || mapOpen || help;
    el.style.left = `${p.x}px`; el.style.top = `${p.y}px`;
    el.classList.toggle('selected', state.selected === h.id); el.classList.toggle('detached', compact);
    el.setAttribute('aria-pressed', String(state.selected === h.id));
    hooks.get(h.id)!.children[0].scale.setScalar(state.selected === h.id && state.mode === 'ready' ? 1.1 : 1);
  });
  $('hook-leaders').innerHTML = state.mode === 'ready' && !mapOpen && !help ? leaders : '';
}
function inspectInfo(): Inspection { const m = inspectFlightHook(state, state.selected); return { ...m, reach: stage().reach, face: Math.hypot(m.dx, m.dz) }; }
function updateInspector() {
  const visible = state.mode === 'ready' && !mapOpen;
  $('inspection').hidden = !visible;
  if (!visible) return;
  const key = `${state.stage}:${state.selected}:${hint}:${state.stageAttempts}`;
  if (key === inspectorKey) return; inspectorKey = key;
  const h = stage().hooks.find(h => h.id === state.selected)!;
  $('inspection-title').innerHTML = `מדידת טבעת <bdi>${h.label}</bdi>`;
  $('first-try').textContent = state.stageHinted ? 'חישוב מסייע · ללא כוכב דיוק' : state.stageAttempts === 0 ? '✦ כוכב בניסיון ראשון' : 'ניסיון נוסף';
  const info = inspectInfo();
  $('diagram').innerHTML = inspectionDiagram(info, hint);
  $('calculation').innerHTML = hint ? calculation(info) : '';
  $('inspection-note').textContent = Math.abs(info.dz) > .001 ? 'המרחק לטבעת כולל גם תזוזה לצד.' : 'היתר הוא המרחק לטבעת. האם הכבל יספיק?';
  $('calc').textContent = hint ? 'להסתיר חישוב' : 'חשבו איתי · ללא כוכב √';
}
function updateHUD() {
  $('level-count').innerHTML = `שלב <bdi>${state.level + 1} / ${LEVELS.length}</bdi>`;
  $('hop-count').innerHTML = `קפיצה <bdi>${state.hop + 1} / 3</bdi>`;
  $('rope-length').innerHTML = `<bdi>${stage().reach}</bdi><span>מטר</span>`;
  $('region-title').textContent = `${level().regionTitle} / ${level().title}`;
  $('timer').textContent = state.timed ? timeText(state.elapsed) : '';
  const key = `${state.mode}:${state.stage}:${state.selected}`;
  if (key !== uiKey) {
    uiKey = key;
    if (state.mode === 'ready') {
      const h = stage().hooks.find(h => h.id === state.selected)!;
      $('action-content').innerHTML = `<div class="step-hint"><span>1</span> בוחרים טבעת למדידה <i>←</i> <span>2</span> משגרים</div><button id="launch" class="launch">שיגור לטבעת <bdi>${h.label}</bdi> <kbd>Space</kbd><b>↗</b></button><p>הכבל צריך להגיע לטבעת; התנופה תיקח אתכם לנחיתה.</p>`;
      $('launch').onclick = fire;
    } else if (state.mode === 'flying') { $('action-content').innerHTML = '<button id="trick" class="air-action">פעלול באוויר <kbd>Space</kbd><small>רק אם בא לכם · הנחיתה אוטומטית</small></button>'; $('trick').onclick = fire; }
    else if (state.mode === 'landing') $('action-content').innerHTML = '<div class="landed-note">נחיתה חלקה. <span>ממשיכים אל הטבעת הבאה</span></div>';
    else $('action-content').innerHTML = '';
  }
  const r = state.rejection;
  $('feedback').innerHTML = state.mode === 'ready' && r ? `<strong>לטבעת <bdi>${r.label}</bdi> צריך כבל ארוך יותר</strong><div><span>מרחק לטבעת <bdi>${r.distance.toFixed(2)} m</bdi></span><span>הכבל שלך <bdi>${r.reach} m</bdi></span><span>חסרים <bdi>${r.shortfall.toFixed(2)} m</bdi></span></div>` : '';
  if (state.launches > lastLaunches) { tone(300, .12, 740); lastLaunches = state.launches; }
  if (state.mistakes > lastMistakes) { tone(180, .12, 120); lastMistakes = state.mistakes; save(); }
  if (state.landed !== lastLanded) { if (state.landed > lastLanded) tone(600, .2, 1100); lastLanded = state.landed; save(); }
  if (state.tricks > lastTricks) { tone(850, .08, 1250); lastTricks = state.tricks; trickAt = frameTime; }
  if (state.mode === 'finished' && lastMode !== 'finished') { save(); tone(800, .3, 1450); }
  lastMode = state.mode;
  updateInspector(); overlays();
}
function selectFromKeyboard(direction: number) { selectHook(state, direction); hint = false; inspectorKey = ''; }
function fire() {
  if (mapOpen || help || state.mode === 'paused' || state.mode === 'finished') return;
  beginAudio(); if (state.mode === 'ready') { launchSelected(state); hint = false; save(); } else if (state.mode === 'flying') performTrick(state); render(0);
}
function pause() { if (mapOpen) { closeMap(); return; } help = false; toggleFlightPause(state); render(0); }
$('pause').onclick = pause;
$('help').onclick = () => { help = true; if (state.mode !== 'paused' && state.mode !== 'finished') toggleFlightPause(state); overlayKey = ''; render(0); };
$('calc').onclick = () => { hint = !hint; if (hint) { recordHint(state); save(); } inspectorKey = ''; render(0); };
$('journey').onclick = openMap;
canvas.addEventListener('click', () => { if (state.mode === 'flying') fire(); });
addEventListener('keydown', e => {
  if (e.repeat) return;
  const native = e.target instanceof HTMLButtonElement && ['Enter', 'Space'].includes(e.code);
  if (native && !e.target.classList.contains('hook-target') && !['launch', 'trick'].includes(e.target.id)) return;
  if (['Space', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape' || e.code === 'KeyP') { pause(); return; }
  if (mapOpen || help || state.mode === 'paused') return;
  if (e.code === 'Space' || e.code === 'Enter') fire();
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') selectFromKeyboard(-1);
  if (e.code === 'ArrowRight' || e.code === 'KeyD') selectFromKeyboard(1);
  const digit = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code); if (digit >= 0) { chooseHook(state, stage().hooks[digit].id); hint = false; }
  if (e.code === 'KeyF') { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen().catch(() => {}); }
  render(0);
});
addEventListener('blur', () => { if (!mapOpen && ['ready', 'flying', 'landing'].includes(state.mode)) { toggleFlightPause(state); render(0); } });
document.addEventListener('visibilitychange', () => { if (document.hidden && !mapOpen && ['ready', 'flying', 'landing'].includes(state.mode)) { toggleFlightPause(state); render(0); } });

const mapPoints = [[6, 44], [13, 49], [20, 55], [31, 59], [40, 47], [47, 40], [56, 51], [64, 44], [72, 54], [80, 42], [87, 35], [94, 25]];
function openMap() { help = false; mapOpen = true; mapLevel = state.level; if (state.mode !== 'paused' && state.mode !== 'finished') toggleFlightPause(state); overlayKey = ''; render(0); }
function closeMap() { help = false; mapOpen = false; if (state.mode === 'paused') toggleFlightPause(state); overlayKey = ''; render(0); }
function startLevel(index: number) { if (index === state.level && state.mode !== 'finished') { closeMap(); return; } if (!loadLevel(state, index)) return; mapOpen = false; help = false; hint = false; resetPresentation(); save(); render(0); }
function resetPresentation() { builtStage = -1; uiKey = inspectorKey = overlayKey = ''; lastLanded = state.landed; lastLaunches = state.launches; lastMistakes = state.mistakes; lastTricks = state.tricks; lastMode = ''; cameraReady = false; }
function overlays() {
  const key = `${mapOpen}:${mapLevel}:${help}:${state.mode}:${state.level}:${reduced}:${muted}`;
  if (key === overlayKey) return; overlayKey = key;
  if (mapOpen) {
    const selected = LEVELS[mapLevel], record = state.progress.records[mapLevel], unlocked = mapLevel <= state.progress.unlocked;
    $('overlay').innerHTML = `<section class="campaign"><header><div class="brand">HYPOTENUSE <em>RUSH</em></div><div><h1>המסע שלכם</h1><p>12 שלבים · 36 קפיצות · ההתקדמות נשמרת</p></div><button id="close-map" aria-label="חזרה למשחק">×</button></header><nav class="region-tabs">${[0, 1, 2, 3].map(r => `<button data-region="${r}" class="${Math.floor(mapLevel / 3) === r ? 'active' : ''}">${LEVELS[r * 3].regionTitle}</button>`).join('')}</nav><div id="map-scroll" class="map-scroll"><div class="map-landscape">${LEVELS.map((l, i) => { const rec = state.progress.records[i]; return `<button data-level="${i}" style="left:${mapPoints[i][0]}%;top:${mapPoints[i][1]}%" class="map-node ${i === mapLevel ? 'selected' : ''} ${rec.completed ? 'complete' : ''} ${i > state.progress.unlocked ? 'locked' : ''}" aria-label="שלב ${i + 1}: ${l.title}${i > state.progress.unlocked ? ', נעול' : ''}"><b>${i + 1}</b><small>${rec.completed ? '★'.repeat(rec.stars) || '✓' : i > state.progress.unlocked ? 'נעול' : 'זמין'}</small></button>`; }).join('')}</div></div><footer><div><span class="eyebrow">${selected.regionTitle}</span><h2>${mapLevel + 1}. ${selected.title}</h2><p>3 קפיצות · כבל <bdi>${selected.stages[0].reach} m</bdi>${record.completed ? ` · ${record.stars} כוכבים` : ''}</p></div><button id="open-level" class="launch" ${unlocked ? '' : 'disabled'}>${unlocked ? mapLevel === state.level && state.mode !== 'finished' ? `ממשיכים בשלב ${mapLevel + 1} ←` : record.completed ? `שוב לשלב ${mapLevel + 1} ←` : `לשלב ${mapLevel + 1} ←` : 'סיימו את השלב הקודם'}</button></footer></section>`;
    $('close-map').onclick = closeMap;
    for (const el of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-level]'))) el.onclick = () => { const scroll = $('map-scroll').scrollLeft; mapLevel = Number(el.dataset.level); overlayKey = ''; overlays(); $('map-scroll').scrollLeft = scroll; };
    for (const el of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-region]'))) el.onclick = () => { mapLevel = Number(el.dataset.region) * 3; overlayKey = ''; overlays(); $('map-scroll').scrollLeft = ($('map-scroll').scrollWidth - $('map-scroll').clientWidth) * Number(el.dataset.region) / 3; };
    $('open-level').onclick = () => startLevel(mapLevel);
    $('map-scroll').scrollLeft = ($('map-scroll').scrollWidth - $('map-scroll').clientWidth) * Math.floor(mapLevel / 3) / 3;
    return;
  }
  if (state.mode === 'finished') {
    const rec = state.progress.records[state.level], final = state.level === LEVELS.length - 1;
    $('overlay').innerHTML = `<section class="modal"><div class="completion"><div class="eyebrow">${level().regionTitle} / ${state.level + 1} מתוך 12</div><div class="medal">${'★'.repeat(state.firstTry)}<span>${'☆'.repeat(3 - state.firstTry)}</span></div><h1>${final ? 'הגעתם לפסגה.' : 'שלב הושלם!'}</h1><p>${level().title} · שלוש נחיתות בטוחות</p><div class="completion-stats"><span><b>${state.firstTry}</b> בחירות בניסיון ראשון</span><span><b>${state.tricks}</b> פעלולים</span>${state.timed ? `<span><b class="ltr">${timeText(state.elapsed)}</b> זמן</span>` : ''}</div><button id="next-level" class="launch">${final ? 'למפת המסע' : `ממשיכים לשלב ${state.level + 2} ←`}</button><div class="completion-actions"><button id="replay">שיפור כוכבים</button><button id="timed-replay">אתגר זמן</button><button id="map-finish">מפת השלבים</button></div><small>ההתקדמות נשמרה · ${state.progress.records.filter(r => r.completed).length} / 12 שלבים הושלמו${rec.bestTime ? ` · שיא ${timeText(rec.bestTime)}` : ''}</small></div></section>`;
    $('next-level').onclick = () => { if (final) openMap(); else { nextLevel(state); resetPresentation(); save(); render(0); } };
    $('replay').onclick = () => { restartFlight(state, false); resetPresentation(); save(); render(0); };
    $('timed-replay').onclick = () => { restartFlight(state, true); resetPresentation(); save(); render(0); };
    $('map-finish').onclick = openMap; return;
  }
  if (state.mode === 'paused' || help) {
    $('overlay').innerHTML = `<section class="modal"><div class="pause-panel"><div class="eyebrow">HYPOTENUSE RUSH</div><h2>${help ? 'הכבל צריך להגיע לטבעת' : 'נושמים רגע'}</h2>${help ? '<p>1. בוחרים טבעת ובודקים את הניצבים.<br>2. משווים את היתר לאורך הכבל שמופיע למעלה.<br>3. משגרים — השחרור והנחיתה אוטומטיים.</p><p>הניצבים בתכלת ובזהב. היתר בקו מקווקו.<br>כוכב דיוק מתקבל בבחירה נכונה ראשונה, ללא חישוב מסייע.</p><p>חצים או 1–3 לבחירה · Space לשיגור.<br>Space באוויר לפעלול, רק אם רוצים.</p>' : `<p>שלב ${state.level + 1}: ${level().title}</p>`}<button id="resume" class="launch">ממשיכים ←</button><div class="settings"><button id="sound">${muted ? 'להפעיל צליל' : 'להשתיק צליל'}</button><button id="motion">${reduced ? 'תנועה רגילה' : 'תנועה מופחתת'}</button><button id="restart">מהתחלת השלב</button><button id="map-pause">מפת המסע</button></div><small>מעוף ארקייד עם סיוע לנחיתה.</small></div></section>`;
    $('resume').onclick = () => { help = false; if (state.mode === 'paused') toggleFlightPause(state); render(0); };
    $('sound').onclick = () => { muted = !muted; render(0); }; $('motion').onclick = () => { reduced = !reduced; render(0); };
    $('restart').onclick = () => { help = false; restartFlight(state); resetPresentation(); save(); render(0); }; $('map-pause').onclick = openMap; return;
  }
  $('overlay').innerHTML = '';
}

function render(dt: number, draw = true) {
  if (builtStage !== state.stage) buildStage();
  const visualMode = state.mode === 'paused' ? state.resumeMode : state.mode;
  if (state.mode !== 'paused' && !mapOpen) frameTime += dt;
  const landingPulse = visualMode === 'landing' ? Math.max(0, 1 - state.phaseTime / .65) : 0;
  canyon.update(frameTime, reduced ? 0 : landingPulse);
  athlete.position.copy(V(state.p)); athlete.rotation.set(0, Math.atan2(stage().landing.x - stage().origin.x, stage().landing.z - stage().origin.z), visualMode === 'flying' && !reduced ? -.1 : 0);
  animateAthlete(athlete, { time: frameTime, speed: Math.hypot(state.v.x, state.v.z), grounded: visualMode !== 'flying', grappling: !!state.attached, verticalVelocity: state.v.y, reducedMotion: reduced });
  const trickAge = frameTime - trickAt; if (visualMode === 'flying' && !reduced && trickAge < .55) athlete.rotation.z -= Math.PI * 2 * Math.min(1, trickAge / .55);
  athlete.scale.y = visualMode === 'landing' && !reduced ? 1 - .1 * Math.sin(Math.min(1, state.phaseTime / .35) * Math.PI) : 1;
  desiredPosition.copy(readyPosition); desiredFocus.copy(readyFocus);
  if (visualMode === 'flying' && !reduced) {
    const blend = Math.sin(Math.min(1, state.phaseTime / 1.5) * Math.PI) * .6;
    const follow = V(state.p).add(new THREE.Vector3(-5, 4.8, 9));
    desiredPosition.lerp(follow, blend); desiredFocus.lerp(V(state.p).add(new THREE.Vector3(3.5, 1.5, 0)), blend);
  }
  const smooth = reduced || !cameraReady ? 1 : 1 - Math.exp(-Math.min(dt, .2) * 8);
  camera.position.lerp(desiredPosition, smooth); camera.lookAt(desiredFocus); camera.updateMatrixWorld();
  rope.visible = !!state.attached;
  if (state.attached) { const h = stage().hooks.find(h => h.id === state.attached)!, a = harness(), b = V(h.position); rope.position.copy(a).lerp(b, .5); rope.scale.y = a.distanceTo(b); rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize()); }
  if (landingRing) landingRing.scale.setScalar(1 + landingPulse * .16);
  dust.visible = !reduced && ['flying', 'landing'].includes(visualMode);
  for (let i = 0; i < 32; i++) { const age = (frameTime * 1.6 + i / 32) % 1; if (visualMode === 'landing') particle.position.set(state.p.x + Math.cos(i * 4.2) * age * 2, state.p.y + .05 + age * .45, state.p.z + Math.sin(i * 4.2) * age * 2); else particle.position.set(state.p.x - state.v.x * age * .1, state.p.y + .6 + Math.sin(i * 3) * .12, state.p.z + Math.cos(i * 7) * .2); particle.scale.setScalar((1 - age) * .9); particle.updateMatrix(); dust.setMatrixAt(i, particle.matrix); } dust.instanceMatrix.needsUpdate = true;
  $('pop').textContent = visualMode === 'flying' && trickAge < .7 ? 'סיבוב מושלם! ✦' : visualMode === 'landing' ? state.stageAttempts === 1 && !state.stageHinted ? 'נחיתה מדויקת! ✦' : 'נחיתה חלקה!' : '';
  updateHUD(); positionHooks(); drawMeasurements();
  $('action-content').parentElement!.classList.toggle('inactive', mapOpen || state.mode === 'paused' || state.mode === 'finished');
  if (draw) renderer.render(scene, camera);
}
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); computeReadyCamera(); camera.position.copy(readyPosition); render(0); }
addEventListener('resize', resize); addEventListener('fullscreenchange', resize);
let audio: AudioContext | null = null;
function beginAudio() { audio ??= new AudioContext(); if (audio.state === 'suspended') void audio.resume(); }
function tone(from: number, seconds: number, to: number) { if (!audio || muted) return; const osc = audio.createOscillator(), gain = audio.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(from, audio.currentTime); osc.frequency.exponentialRampToValueAtTime(to, audio.currentTime + seconds); gain.gain.setValueAtTime(.055, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + seconds); osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + seconds); }
let last = performance.now(), lastRender = 0; const frames: number[] = [];
function frame(now: number) { if (!manual && now - lastRender >= 1000 / 60 - 1) { const raw = now - last; lastRender = now; const dt = Math.min(raw / 1000, .1); advanceFlight(state, dt * 1000); render(dt); frames.push(raw); if (frames.length > 180) frames.shift(); } last = manual ? now : lastRender; requestAnimationFrame(frame); }
buildStage(); resize(); save(); requestAnimationFrame(frame);
(window as any).advanceTime = (ms: number, draw = true) => { manual = true; advanceFlight(state, ms); render(ms / 1000, draw); };
(window as any).render_game_to_text = () => JSON.stringify({ game: 'Hypotenuse Rush', version: 'campaign-v3', coordinateSystem: 'metres; +X route, +Y up, +Z lateral; feet position; harness+1.05m', mode: state.mode, level: state.level, hop: state.hop, stage: state.stage, totalLevels: LEVELS.length, totalFlights: STAGES.length, title: level().title, region: level().regionTitle, ropeLength: stage().reach, player: { position: state.p, velocity: state.v, harness: harness(), grounded: state.mode !== 'flying' }, selected: state.selected, attached: state.attached, hooks: stage().hooks.map(h => ({ ...h, ...inspectFlightHook(state, h.id) })), destination: stage().landing, landed: state.landed, launches: state.launches, mistakes: state.mistakes, tricks: state.tricks, firstTry: state.firstTry, stageAttempts: state.stageAttempts, rejection: state.rejection, elapsed: state.elapsed, timed: state.timed, phaseTime: state.phaseTime, progress: state.progress, layout: { player: screen(V(state.p)), head: screen(V(state.p).add(new THREE.Vector3(0, 1.8, 0))), hooks: stage().hooks.map(h => screen(V(h.position))) }, camera: { position: camera.position, type: 'automatic perspective', fov: camera.fov }, art: archLoaded && athlete.userData.tripoHelmetLoaded ? 'loaded' : 'loading', archLoaded, helmetLoaded: athlete.userData.tripoHelmetLoaded, mapOpen, mapLevel, help, hint, reducedMotion: reduced, muted, events: state.events.slice(-8), performance: { frames: frames.length, meanFrameMs: frames.reduce((a, b) => a + b, 0) / (frames.length || 1), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles } });
