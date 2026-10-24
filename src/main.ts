import * as THREE from 'three';
import { createAthlete, animateAthlete } from './art';
import { createFlowCanyon } from './canyon';
import {
  STAGES, createFlightState, chooseHook, selectHook, launchSelected,
  advanceFlight, toggleFlightPause, restartFlight, performTrick, inspectFlightHook,
} from './flight';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#game')!;
const ui = document.querySelector<HTMLDivElement>('#ui')!;
const state = createFlightState();
let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let muted = false, manual = false, help = false, hint = false;
let best: number | null = null;
let hintUses = 0;
try {
  const saved = JSON.parse(localStorage.getItem('rush-flow-v2') || '{}');
  if (typeof saved.best === 'number' && Number.isFinite(saved.best) && saved.best > 0) best = saved.best;
} catch { /* A broken local record cannot prevent play. */ }

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#85bed7');
scene.fog = new THREE.Fog('#a7ccda', 50, 160);
const camera = new THREE.OrthographicCamera(-16, 16, 9, -9, .1, 240);
scene.add(new THREE.HemisphereLight('#e5f4ff', '#b0734a', 2.4));
const sun = new THREE.DirectionalLight('#fff0d1', 3.5);
sun.position.set(-10, 26, 17); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -35, right: 70, top: 30, bottom: -30, near: 1, far: 100 });
sun.shadow.bias = -.0005;
scene.add(sun, sun.target);
const canyon = createFlowCanyon(scene);
let archLoaded = false;
void canyon.loaded.then(() => archLoaded = true).catch(error => console.error('Local canyon asset failed', error));
const athlete = createAthlete(); scene.add(athlete);
athlete.rotation.y = Math.PI / 2;
const cream = new THREE.MeshStandardMaterial({ color: '#fff4d8', roughness: .5 });
const coral = new THREE.MeshStandardMaterial({ color: '#f27550', roughness: .6 });
const navy = new THREE.MeshStandardMaterial({ color: '#263c49', roughness: .75 });
const hookGroup = new THREE.Group(), marks = new THREE.Group(), measure = new THREE.Group();
scene.add(hookGroup, marks, measure);
const rope = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#fff5d7' }));
scene.add(rope);
const preview = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: '#fff0d1', dashSize: .2, gapSize: .2, transparent: true, opacity: .6 }));
scene.add(preview);
const recoil = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#f8e3bd' }));
scene.add(recoil);
const particles = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.07, 0), new THREE.MeshBasicMaterial({ color: '#ffe1a0', transparent: true, opacity: .75 }), 24);
particles.frustumCulled = false; scene.add(particles);
const temp = new THREE.Object3D();
let builtStage = -1, frameTime = 0, lastMode = '', lastLandings = 0, lastLaunches = 0, lastMistakes = 0, lastTricks = 0;
const hookMeshes = new Map<string, THREE.Group>();
let labelPoints: { p: THREE.Vector3; text: string; className?: string }[] = [];
let landingRing: THREE.Mesh;
let flightTrickAt = -100, lastTrickCount = 0;

ui.innerHTML = `
  <header class="hud"><div class="brand" aria-label="Hypotenuse Rush"><span class="brand-mark">◭</span> HYPOTENUSE <em>RUSH</em></div>
    <div class="progress" aria-label="התקדמות"><div id="dots"></div><span id="chapter"></span></div>
    <div class="top-actions"><span id="reach"></span><button id="pause" aria-label="השהיה">Ⅱ</button></div>
  </header>
  <div id="chapter-name" class="chapter-name"></div>
  <svg id="hook-leaders" aria-hidden="true"></svg><div id="hook-buttons"></div><div id="measure-labels"></div>
  <div id="pop" class="pop" aria-live="polite"></div>
  <div class="prompt-wrap"><div id="message" class="feedback" role="status"></div><div id="prompt" class="prompt"></div><div id="hint"></div></div>
  <div class="tools"><button id="help" aria-label="עזרה והגדרות">?</button><button id="calc" aria-label="הצגת חישוב">√</button><span id="timer" class="ltr"></span></div>
  <div id="overlay"></div>
`;
const $ = (id: string) => document.getElementById(id)!;
const measureText = (n: number) => Math.abs(n).toFixed(2).replace(/\.?0+$/, '');
const vector = (p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, p.z);
const harness = () => vector(state.p).add(new THREE.Vector3(0, 1.05, 0));
const rejectedHook = () => {
  const attempt = [...state.events].reverse().find(e => e.type === 'attempt' && e.accepted === false && e.stage === state.stage);
  return STAGES[state.stage].hooks.find(h => h.id === attempt?.hook);
};
const formatTime = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
function disposeGroup(group: THREE.Group) {
  group.traverse(o => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
      o.geometry.dispose();
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      for (const mat of materials) if (![cream, coral, navy].includes(mat)) mat.dispose();
    }
  });
  group.clear();
}
function addLine(points: THREE.Vector3[], material: THREE.LineBasicMaterial | THREE.LineDashedMaterial, parent: THREE.Group) {
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
  line.computeLineDistances(); parent.add(line);
}
function buildStage() {
  const stage = STAGES[state.stage];
  builtStage = state.stage; hint = false;
  canyon.setStage(state.stage);
  disposeGroup(hookGroup); disposeGroup(marks); hookMeshes.clear();
  for (const hook of stage.hooks) {
    const group = new THREE.Group(); group.position.copy(vector(hook.position));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.54, .085, 8, 36), cream);
    group.add(ring);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(.32, .26, .27), coral); cap.position.y = .66; group.add(cap);
    // Authored cantilever gives each hook a physical fixture without blocking its reach segment.
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.065, .08, 1.15, 8), navy); mast.position.y = 1.35; group.add(mast);
    const span = stage.landing.x - 2.5 - hook.position.x;
    const boom = new THREE.Mesh(new THREE.BoxGeometry(span + .2, .12, .18), coral); boom.position.set(span / 2, 1.9, 0); group.add(boom);
    const postHeight = hook.position.y + 1.9 - stage.landing.y;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.06, .085, postHeight, 8), navy);
    post.position.set(span, 1.9 - postHeight / 2, 0); group.add(post);
    hookGroup.add(group); hookMeshes.set(hook.id, group);
  }
  for (const [p, isLanding] of [[stage.origin, false], [stage.landing, true]] as const) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(isLanding ? 1.5 : .75, isLanding ? 1.72 : .89, 64), cream);
    ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, p.y + .025, p.z); marks.add(ring);
    const centre = new THREE.Mesh(new THREE.CircleGeometry(isLanding ? 1.43 : .68, 64), new THREE.MeshBasicMaterial({ color: isLanding ? '#f58a65' : '#2f4c59', transparent: true, opacity: .55 }));
    centre.rotation.x = -Math.PI / 2; centre.position.set(p.x, p.y + .018, p.z); marks.add(centre);
    if (isLanding) landingRing = ring;
  }
  const endFlag = new THREE.Group();
  endFlag.position.copy(vector(stage.landing));
  for (const z of [-3.6, 3.6]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.035, .04, 2.1, 8), cream); pole.position.set(1, 1.05, z); endFlag.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(.7, .38), coral); flag.material = coral.clone(); (flag.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide; flag.position.set(.65, 1.8, z); endFlag.add(flag);
  }
  marks.add(endFlag);
  $('hook-buttons').innerHTML = stage.hooks.map(h => `<button class="hook-target" data-hook="${h.id}" aria-label="טבעת ${h.label}" aria-pressed="${h.id === state.selected}"><span class="hook-number">${h.label}</span><span class="hook-parts ltr"></span></button>`).join('');
  for (const el of Array.from(document.querySelectorAll<HTMLButtonElement>('.hook-target'))) {
    el.addEventListener('pointerenter', () => { if (state.mode === 'ready') state.selected = el.dataset.hook!; });
    el.addEventListener('focus', () => { if (state.mode === 'ready') state.selected = el.dataset.hook!; });
    el.addEventListener('click', () => { beginAudio(); chooseHook(state, el.dataset.hook!); hint = false; render(0); });
  }
  updateMeasurements();
}
function updateMeasurements() {
  disposeGroup(measure); labelPoints = [];
  const stage = STAGES[state.stage];
  if (!stage.showMeasurements || state.mode !== 'ready') return;
  const hook = stage.hooks.find(h => h.id === state.selected)!;
  const p = harness(), q = vector(hook.position), c = new THREE.Vector3(q.x, p.y, p.z);
  const guideMat = new THREE.LineBasicMaterial({ color: '#fff5d7', depthTest: false, transparent: true, opacity: .85 });
  const dashMat = new THREE.LineDashedMaterial({ color: '#fff5d7', depthTest: false, dashSize: .15, gapSize: .13, transparent: true, opacity: .65 });
  addLine([p, c, q], guideMat, measure); addLine([p, q], dashMat, measure);
  addLine([c.clone().add(new THREE.Vector3(-.45, 0, 0)), c.clone().add(new THREE.Vector3(-.45, .45, 0)), c.clone().add(new THREE.Vector3(0, .45, 0))], guideMat, measure);
  labelPoints.push({ p: p.clone().lerp(c, .55).add(new THREE.Vector3(0, -.42, 0)), text: `${measureText(q.x - p.x)} m` });
  labelPoints.push({ p: c.clone().lerp(q, .56).add(new THREE.Vector3(.55, 0, 0)), text: `${measureText(q.y - p.y)} m` });
  labelPoints.push({ p: p.clone().add(new THREE.Vector3(-.45, 0, 0)), text: 'P', className: 'origin-label' });
}
let measuredSelection = '';
function projectWorld() {
  const stage = STAGES[state.stage];
  const project = (p: THREE.Vector3) => { const v = p.clone().project(camera); return { x: (v.x + 1) * innerWidth / 2, y: (1 - v.y) * innerHeight / 2, z: v.z }; };
  const raw = stage.hooks.map(h => project(vector(h.position)));
  const separate = (innerWidth < innerHeight || innerWidth < 700) && raw.length === 2 && Math.hypot(raw[0].x - raw[1].x, raw[0].y - raw[1].y) < 135;
  let leaders = '';
  for (const [i, hook] of stage.hooks.entries()) {
    const el = document.querySelector<HTMLButtonElement>(`[data-hook="${hook.id}"]`)!;
    const p = { ...raw[i] };
    el.classList.toggle('detached', separate);
    if (separate) {
      p.x = innerWidth / 2 + (i - .5) * 152;
      p.y = Math.max(145, Math.min(...raw.map(q => q.y)) - 62);
      if (state.mode === 'ready') leaders += `<line x1="${p.x}" y1="${p.y}" x2="${raw[i].x}" y2="${raw[i].y}"/>`;
    }
    el.style.left = `${p.x}px`; el.style.top = `${p.y}px`;
    el.hidden = state.mode !== 'ready';
    el.classList.toggle('selected', hook.id === state.selected);
    el.classList.toggle('intro-target', state.stage === 0 && !reduced);
    el.setAttribute('aria-pressed', String(hook.id === state.selected));
    const info = inspectFlightHook(state, hook.id);
    el.querySelector('.hook-parts')!.textContent = stage.showMeasurements ? `${measureText(info.dx)} ↔  ${measureText(info.dy)} ↑` : '';
  }
  $('hook-leaders').innerHTML = leaders;
  $('measure-labels').innerHTML = labelPoints.map(({ p, text, className }) => { const s = project(p); return `<span class="measure-label ${className || ''}" style="left:${s.x}px;top:${s.y}px">${text}</span>`; }).join('');
}
function action() {
  if (help || state.mode === 'paused') return;
  beginAudio();
  if (state.mode === 'ready') { launchSelected(state); hint = false; }
  else if (state.mode === 'flying') performTrick(state);
  render(0);
}
function pause() { help = false; toggleFlightPause(state); render(0); }
$('pause').onclick = pause;
$('help').onclick = () => { help = !help; if (help && state.mode !== 'paused' && state.mode !== 'finished') toggleFlightPause(state); else if (!help && state.mode === 'paused') toggleFlightPause(state); render(0); };
$('calc').onclick = () => { if (state.mode === 'ready') { hint = !hint; if (hint) hintUses++; render(0); } };
canvas.addEventListener('click', () => { if (state.mode === 'flying') action(); });
addEventListener('keydown', e => {
  if (e.repeat) return;
  const nativeButton = e.target instanceof HTMLButtonElement && ['Space', 'Enter'].includes(e.code);
  if (nativeButton && !e.target.classList.contains('hook-target') && e.target.id !== 'trick') return;
  if (['Space', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  if (e.code === 'Space' || e.code === 'Enter') action();
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') selectHook(state, -1);
  if (e.code === 'ArrowRight' || e.code === 'KeyD') selectHook(state, 1);
  if (e.code === 'Digit1') { const h = STAGES[state.stage].hooks[0]; chooseHook(state, h.id); }
  if (e.code === 'Digit2') { const h = STAGES[state.stage].hooks[1]; if (h) chooseHook(state, h.id); }
  if (e.code === 'Escape' || e.code === 'KeyP') pause();
  if (e.code === 'KeyF') { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen().catch(() => {}); }
  render(0);
});
addEventListener('blur', () => { if (['flying', 'landing', 'ready'].includes(state.mode)) { toggleFlightPause(state); render(0); } });
document.addEventListener('visibilitychange', () => { if (document.hidden && ['flying', 'landing', 'ready'].includes(state.mode)) { toggleFlightPause(state); render(0); } });
let overlayKey = '';
function overlays() {
  const key = `${state.mode}:${help}:${reduced}:${muted}:${state.timed}`;
  if (key === overlayKey) return;
  overlayKey = key;
  const el = $('overlay');
  if (!help && state.mode !== 'paused' && state.mode !== 'finished') { el.innerHTML = ''; return; }
  if (state.mode === 'finished') {
    el.innerHTML = `<section class="overlay"><div class="finish"><div class="eyebrow">THREE FLIGHTS. ONE CANYON.</div><h1>עפתם על זה.</h1><p>שלוש נחיתות. הקניון שלכם.</p><div class="finish-stats"><div><strong>3<span>/3</span></strong><small>נחיתות</small></div><div><strong>${state.tricks}</strong><small>פעלולים באוויר</small></div><div><strong>${state.mistakes}</strong><small>ניסיונות מחוץ לטווח</small></div></div>${state.timed ? `<p class="run-result">זמן ריצה <bdi>${formatTime(state.elapsed)}</bdi>${best ? ` · שיא <bdi>${formatTime(best)}</bdi>` : ''}</p>` : ''}<button class="primary" id="replay">עוד סיבוב ←</button><button class="secondary" id="timed-replay">אתגר זמן</button><p class="small">בוחרים טבעת. עפים. נוחתים. עכשיו בקצב שלכם.</p></div></section>`;
    $('replay').onclick = () => newRun(false); $('timed-replay').onclick = () => newRun(true);
  } else {
    el.innerHTML = `<section class="overlay"><div class="pause-panel"><div class="eyebrow">HYPOTENUSE RUSH</div><h2>${help ? 'איך עפים?' : 'נושמים רגע'}</h2>${help ? `<p>לחיצה על טבעת מתחילה קפיצה שלמה.<br>הכבל משתחרר והנחיתה מתבצעת אוטומטית.</p><p>בוחרים לפי המרחק מהרתמה <bdi>P</bdi>.<br>הקווים מראים את הניצבים, והכבל הוא היתר.</p><p>במקלדת: חצים לבחירה, <bdi>Space</bdi> לזינוק.<br>באוויר: לחיצה נוספת לפעלול, רק אם בא לכם.</p><p class="small">זהו מעוף ארקייד עם סיוע לנחיתה.</p>` : '<p>הקניון יחכה לכם.</p>'}<button class="primary" id="resume">ממשיכים ←</button><div class="settings"><button id="sound-toggle">${muted ? 'להפעיל צליל' : 'להשתיק צליל'}</button><button id="motion-toggle">${reduced ? 'תנועה רגילה' : 'תנועה מופחתת'}</button></div><button class="text-button" id="reset">מההתחלה</button></div></section>`;
    $('resume').onclick = () => { help = false; if (state.mode === 'paused') toggleFlightPause(state); render(0); };
    $('sound-toggle').onclick = () => { muted = !muted; render(0); };
    $('motion-toggle').onclick = () => { reduced = !reduced; render(0); };
    $('reset').onclick = () => newRun(false);
  }
}
function newRun(timed: boolean) {
  restartFlight(state, timed); hintUses = 0; help = false; hint = false; builtStage = -1; measuredSelection = ''; lastLandings = lastLaunches = lastMistakes = lastTricks = 0; lastTrickCount = 0; frameTime = 0; overlayKey = ''; promptKey = ''; render(0);
}
let promptKey = '';
function updateHUD() {
  const stage = STAGES[state.stage];
  $('dots').innerHTML = STAGES.map((_, i) => `<i class="${i < state.landed ? 'done' : i === state.stage ? 'current' : ''}"></i>`).join('');
  $('chapter').textContent = `${Math.min(state.landed + 1, 3)} / 3`;
  $('reach').innerHTML = `<span>כבל</span> <bdi>${stage.reach} m</bdi>`;
  $('chapter-name').textContent = state.stage === 0 ? '01 / הזינוק הראשון' : state.stage === 1 ? '02 / בוחרים לפי המרחק' : '03 / עולים לגובה';
  const prompt = $('prompt');
  const nextPrompt = `${state.stage}:${state.mode}`;
  if (nextPrompt !== promptKey) {
  promptKey = nextPrompt;
  if (state.mode === 'ready') {
    prompt.innerHTML = state.stage === 0
      ? '<strong>לחצו על הטבעת כדי לעוף</strong><small><kbd>SPACE</kbd><span>או לחיצה אחת על הטבעת</span></small>'
      : '<strong>איזו טבעת בטווח הכבל?</strong><small>לחצו על מספר הטבעת כדי לעוף <span class="keyboard-tip">· <kbd>←</kbd><kbd>→</kbd> לבחירה, <kbd>SPACE</kbd> לזינוק</span></small>';
  } else if (state.mode === 'flying') {
    prompt.innerHTML = '<button id="trick" class="trick-button">בא לכם פעלול? <kbd>SPACE</kbd><span>או הקישו כאן · הנחיתה אוטומטית</span></button>';
    $('trick').onclick = action;
  } else if (state.mode === 'landing') prompt.innerHTML = '<strong>נחיתה חלקה.</strong><small>ממשיכים לטבעת הבאה…</small>';
  else prompt.innerHTML = '';
  }
  $('calc').hidden = !stage.showMeasurements || state.mode !== 'ready';
  $('timer').textContent = state.timed ? formatTime(state.elapsed) : '';
  // Domain rejection messages are translated here, without revealing the other hook in advance.
  const messageActive = state.message === 'overreach' && state.messageTime > 0 && state.mode === 'ready';
  $('message').innerHTML = messageActive ? (state.message === 'overreach' ? `טבעת <bdi>${rejectedHook()?.label || ''}</bdi> רחוקה מדי לכבל. אפשר לנסות שוב.` : String(state.message)) : '';
  if (hint && state.mode === 'ready') {
    const info = inspectFlightHook(state, state.selected);
    $('hint').innerHTML = `<bdi>${measureText(info.dx)}² + ${measureText(info.dy)}² = ${Math.round(info.distance ** 2)} m²</bdi><br>אורך נדרש: <bdi>${info.distance.toFixed(2)} m</bdi> · טווח: <bdi>${stage.reach} m</bdi>`;
  } else $('hint').innerHTML = '';
  if (state.launches > lastLaunches) { tone(360, .09, 710); lastLaunches = state.launches; }
  if (state.mistakes > lastMistakes) { tone(170, .09, 120); lastMistakes = state.mistakes; }
  if (state.landed > lastLandings) { tone(630, .2, 1040); lastLandings = state.landed; }
  if (state.tricks > lastTricks) { tone(850, .08, 1200); lastTricks = state.tricks; }
  if (state.mode === 'finished' && lastMode !== 'finished' && state.timed) {
    best = Math.min(best ?? Infinity, state.elapsed);
    try { localStorage.setItem('rush-flow-v2', JSON.stringify({ best })); } catch { /* Private mode can disable saving. */ }
  }
  lastMode = state.mode;
  overlays();
}
const viewTarget = new THREE.Vector3();
function frameCamera() {
  const stage = STAGES[state.stage], portrait = innerWidth < innerHeight;
  const highest = Math.max(...stage.hooks.map(h => h.position.y)) - stage.origin.y;
  const cx = (stage.origin.x + stage.landing.x) / 2;
  viewTarget.set(cx, stage.origin.y + (highest > 10 ? 5.6 : 3.2), 0);
  camera.position.copy(viewTarget).add(portrait ? new THREE.Vector3(-26, 17, 8) : new THREE.Vector3(-3.8, 11, 27));
  camera.lookAt(viewTarget); camera.updateMatrixWorld();
  // Fit real world points to the camera instead of cropping targets on a phone.
  const view = camera.matrixWorldInverse;
  const points = [
    vector(stage.origin).add(new THREE.Vector3(-2, 0, -3)), vector(stage.origin).add(new THREE.Vector3(-2, 2, 3)),
    vector(stage.landing).add(new THREE.Vector3(4, 0, 4)), vector(stage.landing).add(new THREE.Vector3(4, 0, -4)),
    ...stage.hooks.map(h => vector(h.position).add(new THREE.Vector3(0, 1.8, 0))),
  ].map(v => v.applyMatrix4(view));
  const maxX = Math.max(...points.map(v => Math.abs(v.x)));
  const minY = Math.min(...points.map(v => v.y)), maxY = Math.max(...points.map(v => v.y));
  const aspect = innerWidth / innerHeight;
  const topNdc = 1 - 2 * Math.max(105, innerHeight * .12) / innerHeight;
  const bottomNdc = 1 - 2 * (innerHeight - (portrait ? 185 : 155)) / innerHeight;
  const halfH = Math.max((maxY - minY + .8) / (topNdc - bottomNdc), (maxX * 1.13 + .6) / aspect, 7.4);
  const centreY = (minY + maxY) / 2 - (topNdc + bottomNdc) / 2 * halfH;
  camera.top = centreY + halfH; camera.bottom = centreY - halfH;
  camera.left = -halfH * aspect; camera.right = halfH * aspect;
  camera.updateProjectionMatrix();
}
function render(dt: number, draw = true) {
  if (builtStage !== state.stage) { buildStage(); frameCamera(); }
  if (state.mode !== 'paused') frameTime += dt;
  const stage = STAGES[state.stage];
  const visualMode = state.mode === 'paused' ? state.resumeMode : state.mode;
  const landingPulse = visualMode === 'landing' ? Math.max(0, 1 - state.phaseTime / .65) : 0;
  canyon.update(frameTime, landingPulse);
  athlete.position.copy(vector(state.p));
  const speed = Math.hypot(state.v.x, state.v.z);
  animateAthlete(athlete, { time: frameTime, speed, grounded: visualMode !== 'flying', grappling: !!state.attached, verticalVelocity: state.v.y, reducedMotion: reduced });
  if (state.tricks !== lastTrickCount) { flightTrickAt = frameTime; lastTrickCount = state.tricks; }
  const trickAge = frameTime - flightTrickAt;
  athlete.rotation.set(0, Math.PI / 2, visualMode === 'flying' && !reduced ? -.14 : 0);
  if (!reduced && visualMode === 'flying' && trickAge < .55) athlete.rotation.x = -Math.PI * 2 * Math.min(1, trickAge / .55);
  if (visualMode === 'landing' && !reduced) athlete.scale.y = 1 - .12 * Math.sin(Math.min(1, state.phaseTime / .35) * Math.PI);
  else athlete.scale.y = 1;
  for (const [id, g] of hookMeshes) {
    const s = state.mode === 'ready' && id === state.selected ? 1.07 : 1;
    g.children[0].scale.setScalar(s);
  }
  if (landingRing) landingRing.scale.setScalar(1 + (reduced ? 0 : landingPulse * .25));
  rope.visible = !!state.attached;
  if (state.attached) {
    const h = stage.hooks.find(h => h.id === state.attached)!;
    rope.geometry.dispose(); rope.geometry = new THREE.BufferGeometry().setFromPoints([harness(), vector(h.position)]);
  }
  preview.visible = state.stage === 0 && state.mode === 'ready';
  if (preview.visible) {
    const start = harness(), end = vector(stage.landing).add(new THREE.Vector3(0, .08, 0));
    const curve = new THREE.QuadraticBezierCurve3(start, start.clone().lerp(end, .55).add(new THREE.Vector3(0, 9, 0)), end);
    preview.geometry.dispose(); preview.geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(50)); preview.computeLineDistances();
  }
  recoil.visible = state.mode === 'ready' && state.message === 'overreach' && state.messageTime > 0;
  if (recoil.visible) {
    const h = rejectedHook()!;
    const p = harness(), q = p.clone().lerp(vector(h.position), .58 + .04 * Math.sin(frameTime * 30));
    recoil.geometry.dispose(); recoil.geometry = new THREE.BufferGeometry().setFromPoints([p, q]);
  }
  particles.visible = !reduced && (state.mode === 'flying' || state.mode === 'landing');
  for (let i = 0; i < 24; i++) {
    const age = (frameTime * 1.7 + i / 24) % 1;
    if (state.mode === 'landing') temp.position.set(state.p.x + Math.cos(i * 4.2) * (1 + age), state.p.y + .07 + age * .35, state.p.z + Math.sin(i * 4.2) * (1 + age));
    else temp.position.set(state.p.x - state.v.x * age * .12, state.p.y + .7 - age * .2 + Math.sin(i * 3) * .15, state.p.z + Math.cos(i * 7) * .25);
    temp.scale.setScalar((1 - age) * .9); temp.updateMatrix(); particles.setMatrixAt(i, temp.matrix);
  }
  particles.instanceMatrix.needsUpdate = true;
  const currentMeasurement = `${state.stage}:${state.selected}:${state.mode}`;
  if (measuredSelection !== currentMeasurement) { measuredSelection = currentMeasurement; updateMeasurements(); }
  $('pop').textContent = state.mode === 'flying' && trickAge < .7 ? 'סיבוב באוויר! ✦' : state.mode === 'landing' ? 'בול על הסימן! ✦' : '';
  updateHUD(); projectWorld();
  if (draw) renderer.render(scene, camera);
}
function resize() { renderer.setSize(innerWidth, innerHeight, false); frameCamera(); render(0); }
addEventListener('resize', resize);
addEventListener('fullscreenchange', resize);
let audio: AudioContext | null = null;
function beginAudio() { audio ??= new AudioContext(); if (audio.state === 'suspended') void audio.resume(); }
function tone(from: number, seconds: number, to: number) {
  if (!audio || muted) return;
  const osc = audio.createOscillator(), gain = audio.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(from, audio.currentTime); osc.frequency.exponentialRampToValueAtTime(to, audio.currentTime + seconds);
  gain.gain.setValueAtTime(.065, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + seconds);
  osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + seconds);
}
let last = performance.now(), lastRender = 0;
const frameTimes: number[] = [];
function frame(now: number) {
  if (!manual && now - lastRender >= 1000 / 60 - 1) {
    const raw = now - last; lastRender = now;
    const dt = Math.min(raw / 1000, .1); advanceFlight(state, dt * 1000); render(dt);
    frameTimes.push(raw); if (frameTimes.length > 180) frameTimes.shift();
  }
  last = manual ? now : lastRender;
  requestAnimationFrame(frame);
}
buildStage(); resize(); requestAnimationFrame(frame);
(window as any).advanceTime = (ms: number, draw = true) => { manual = true; advanceFlight(state, ms); render(ms / 1000, draw); };
(window as any).render_game_to_text = () => JSON.stringify({
  game: 'Hypotenuse Rush', version: 'flow-v2', coordinateSystem: 'metres; +X route forward, +Y up, +Z lateral; player feet; harness feet +1.05m',
  mode: state.mode, stage: state.stage, stageTitle: STAGES[state.stage].title, landed: state.landed,
  player: { position: state.p, velocity: state.v, harness: harness(), grounded: state.mode !== 'flying' },
  selected: state.selected, attached: state.attached, reach: STAGES[state.stage].reach,
  hooks: STAGES[state.stage].hooks.map(h => ({ ...h, ...inspectFlightHook(state, h.id) })),
  destination: STAGES[state.stage].landing, launches: state.launches, mistakes: state.mistakes, tricks: state.tricks,
  elapsed: state.elapsed, timed: state.timed, message: state.message, recoilTarget: recoil.visible ? rejectedHook()?.id : null, phaseTime: state.phaseTime,
  camera: { position: camera.position, type: 'authored automatic orthographic' },
  art: archLoaded && athlete.userData.tripoHelmetLoaded ? 'loaded' : 'loading', archLoaded, helmetLoaded: athlete.userData.tripoHelmetLoaded,
  help, hint, hintUses, reducedMotion: reduced, muted, best, events: state.events.slice(-8),
  performance: { sampleFrames: frameTimes.length, meanFrameMs: frameTimes.reduce((a, b) => a + b, 0) / (frameTimes.length || 1), calls: renderer.info.render.calls, triangles: renderer.info.render.triangles },
});
