/** Current 12-level campaign. World units are metres and p is the athlete's feet.
 * This is an assisted arcade launch, not an unassisted pendulum simulation.
 * A solved initial impulse is followed by a constant hook-directed pull, then
 * gravity. Position and velocity are integrated continuously through release;
 * only physical floor contact stops motion and advances the course.
 */
import { HARNESS_HEIGHT, LEVELS, STAGES, normalizeProgress,
  type Vec, type FlightHook, type CampaignProgress } from './campaign';
export { HARNESS_HEIGHT, LEVELS, STAGES, normalizeProgress, serializeProgress } from './campaign';
export type { Vec, FlightHook, FlightStage, CampaignLevel, CampaignProgress, LevelRecord, Terrain } from './campaign';
export const FLIGHT = {
  fixedStep: 1 / 120,
  pullDuration: .45,
  coastDuration: 1.05,
  flightDuration: 1.5,
  landingDuration: .65,
  gravity: 22,
  pullAcceleration: 28,
  reachEpsilon: 1e-7,
  landingHalfWidth: 3.4,
  landingHalfDepth: 3.6,
  feedbackDuration: 4,
  trickDuration: .55,
} as const;

export type FlightMode = 'ready' | 'flying' | 'landing' | 'finished' | 'paused';
type ActiveMode = Exclude<FlightMode, 'paused'>;
export type FlightEvent = { type: string; stage: number; time: number; [key: string]: unknown };
type LaunchPlan = { acceleration: Vec; landing: Vec };
export type FlightRejection = {
  hookId: string; label: string; origin: Vec; dx: number; dy: number; dz: number;
  distance: number; squared: number; face: number; reach: number; shortfall: number;
};
export type FlightState = {
  mode: FlightMode; resumeMode: ActiveMode; stage: number; p: Vec; v: Vec;
  level: number; hop: number; progress: CampaignProgress;
  firstTry: number; stageAttempts: number; stageHinted: boolean; flow: number;
  rejection: FlightRejection | null;
  selected: string; attached: string | null; elapsed: number; phaseTime: number;
  landed: number; mistakes: number; launches: number; tricks: number; rings: number;
  message: string; messageTime: number; events: FlightEvent[]; timed: boolean;
  trickTime: number; accumulator: number;
  /** Domain bookkeeping. Rendering must never write these or the position. */
  plan: LaunchPlan | null; trickUsed: boolean;
};
const zero = (): Vec => ({ x: 0, y: 0, z: 0 });
const copy = (p: Vec): Vec => ({ ...p });
const EPS = 1e-10;
const event = (s: FlightState, type: string, data: Record<string, unknown> = {}) => {
  s.events.push({ type, stage: s.stage, level: s.level, hop: s.hop, time: s.elapsed, ...data });
  if (s.events.length > 200) s.events.shift();
};
export const flightHarness = (s: Pick<FlightState, 'p'>): Vec =>
  ({ x: s.p.x, y: s.p.y + HARNESS_HEIGHT, z: s.p.z });

export function createFlightState(options: { timed?: boolean; level?: number; progress?: unknown } = {}): FlightState {
  const progress = normalizeProgress(options.progress);
  const explicit = Number.isInteger(options.level) && options.level! >= 0 && options.level! <= progress.unlocked;
  const level = explicit ? options.level! : progress.currentLevel;
  if (explicit) {
    progress.currentLevel = level; progress.resumeStage = LEVELS[level].startStage;
    progress.resumeFirstTry = progress.resumeAttempts = progress.resumeMistakes = progress.resumeElapsed =
      progress.resumeTricks = progress.resumeFlow = 0; progress.resumeHinted = false;
  }
  const completedHops = progress.resumeStage - LEVELS[level].startStage;
  const finished = completedHops === 3;
  const stage = LEVELS[level].startStage + Math.min(completedHops, 2);
  return {
    mode: finished ? 'finished' : 'ready', resumeMode: finished ? 'finished' : 'ready', stage,
    level, hop: Math.min(completedHops, 2), progress,
    firstTry: progress.resumeFirstTry, stageAttempts: progress.resumeAttempts,
    stageHinted: progress.resumeHinted, flow: progress.resumeFlow, rejection: null,
    p: copy(finished ? STAGES[stage].landing : STAGES[stage].origin), v: zero(),
    selected: STAGES[stage].hooks[0].id, attached: null, elapsed: progress.resumeElapsed, phaseTime: 0,
    landed: completedHops, mistakes: progress.resumeMistakes, launches: completedHops,
    tricks: progress.resumeTricks, rings: 0,
    message: finished ? 'finished' : 'choose-hook', messageTime: 0, events: [], timed: options.timed ?? false,
    trickTime: 0, accumulator: 0, plan: null, trickUsed: false,
  };
}

/** The current physical harness is the origin; camera state is not an input.
 * Campaign hook supports have separately authored clear sight lines.
 */
export function inspectFlightHook(s: Pick<FlightState, 'p' | 'stage'>, hookOrId: FlightHook | string) {
  const stage = STAGES[s.stage];
  const hook = typeof hookOrId === 'string'
    ? stage.hooks.find(h => h.id === hookOrId) : hookOrId;
  if (!hook) return { dx: 0, dy: 0, dz: 0, distance: Infinity, squared: Infinity,
    face: Infinity, reach: stage.reach, shortfall: Infinity, slack: 0,
    reachable: false, reason: 'unknown-hook' as const };
  const p = flightHarness(s), dx = hook.position.x - p.x,
    dy = hook.position.y - p.y, dz = hook.position.z - p.z;
  const squared = dx * dx + dy * dy + dz * dz, distance = Math.hypot(dx, dy, dz);
  const reachable = distance <= stage.reach + FLIGHT.reachEpsilon;
  return { dx, dy, dz, distance, squared, face: Math.hypot(dx, dz), reach: stage.reach,
    shortfall: Math.max(0, distance - stage.reach), slack: Math.max(0, stage.reach - distance), reachable,
    reason: reachable ? 'ready' as const : 'overreach' as const };
}

/** Inspect/select only. Range validation is deliberately deferred until the
 * separate launch commitment; clicking every hook never attempts or moves.
 */
export function chooseHook(s: FlightState, id: string): boolean {
  if (s.mode !== 'ready') return false;
  const stage = STAGES[s.stage], hook = stage.hooks.find(h => h.id === id);
  if (!hook) return false;
  s.selected = id;
  event(s, 'inspect', { hook: id });
  return true;
}
export function launchSelected(s: FlightState): boolean {
  if (s.mode !== 'ready') return false;
  const stage = STAGES[s.stage], id = s.selected, hook = stage.hooks.find(h => h.id === id);
  if (!hook) return false;
  const witness = inspectFlightHook(s, hook);
  s.stageAttempts++;
  event(s, 'attempt', { hook: id, origin: flightHarness(s),
    ...witness, accepted: witness.reachable });
  if (!witness.reachable) {
    s.mistakes++;
    s.flow = 0;
    s.rejection = { hookId: id, label: hook.label, origin: flightHarness(s),
      dx: witness.dx, dy: witness.dy, dz: witness.dz, distance: witness.distance,
      squared: witness.squared, face: witness.face, reach: stage.reach, shortfall: witness.shortfall };
    s.message = 'overreach'; s.messageTime = FLIGHT.feedbackDuration;
    checkpoint(s);
    return false;
  }

  const g = FLIGHT.gravity, pull = FLIGHT.pullDuration, coast = FLIGHT.coastDuration;
  const duration = pull + coast, factor = .5 * pull * pull + pull * coast;
  const scale = FLIGHT.pullAcceleration / witness.distance;
  const acceleration = { x: witness.dx * scale, y: witness.dy * scale, z: witness.dz * scale };
  const destination = stage.landing;
  // D = v0*(pull+coast) + a*(pull²/2 + pull*coast) + gravity*coast²/2.
  // Solving this initial impulse retains a continuous release velocity.
  s.v = {
    x: (destination.x - s.p.x - acceleration.x * factor) / duration,
    y: (destination.y - s.p.y - acceleration.y * factor + .5 * g * coast * coast) / duration,
    z: (destination.z - s.p.z - acceleration.z * factor) / duration,
  };
  s.plan = { acceleration, landing: copy(destination) };
  s.rejection = null;
  s.mode = 'flying'; s.resumeMode = 'flying'; s.phaseTime = 0; s.attached = id;
  s.launches++; s.trickUsed = false; s.trickTime = 0;
  s.message = 'launch'; s.messageTime = .65;
  event(s, 'launch', { hook: id, position: copy(s.p), velocity: copy(s.v),
    acceleration: copy(acceleration), assisted: true });
  return true;
}

/** Selection is distinct from attempting. The UI ignores key-repeat for launch. */
export function selectHook(s: FlightState, direction: number): string | null {
  if (s.mode !== 'ready') return null;
  const hooks = STAGES[s.stage].hooks;
  if (!Number.isFinite(direction) || direction === 0) return s.selected;
  const current = Math.max(0, hooks.findIndex(h => h.id === s.selected));
  s.selected = hooks[(current + Math.sign(direction) + hooks.length) % hooks.length].id;
  return s.selected;
}

/** Full calculation help is allowed, but this flight can no longer earn a
 * first-try star. Completion and the next level remain available regardless.
 */
export function recordHint(s: FlightState): void {
  if (s.mode !== 'ready' || s.stageHinted) return;
  s.stageHinted = true; s.flow = 0; event(s, 'hint'); checkpoint(s);
}

function checkpoint(s: FlightState, nextHop = s.hop, pendingCelebration = 0) {
  const p = s.progress, advancing = nextHop !== s.hop;
  p.currentLevel = s.level;
  p.resumeStage = LEVELS[s.level].startStage + nextHop;
  p.resumeFirstTry = s.firstTry; p.resumeMistakes = s.mistakes;
  p.resumeAttempts = advancing ? 0 : s.stageAttempts;
  p.resumeHinted = advancing ? false : s.stageHinted;
  p.resumeElapsed = s.elapsed + pendingCelebration;
  p.resumeTricks = s.tricks; p.resumeFlow = s.flow;
}

/** A cosmetic air trick is optional and can be awarded once per flight.
 * It never changes the trajectory or the required landing input.
 */
export function performTrick(s: FlightState): boolean {
  if (s.mode !== 'flying' || s.trickUsed) return false;
  s.trickUsed = true; s.tricks++; s.trickTime = FLIGHT.trickDuration;
  s.message = 'trick'; s.messageTime = FLIGHT.trickDuration;
  event(s, 'trick');
  return true;
}

function elapse(s: FlightState, dt: number) {
  // The run clock starts at the first successful launch. Choice time after it
  // counts, but time pressure is displayed only in an explicitly timed replay.
  if (s.launches > 0) s.elapsed += dt;
  s.phaseTime += dt;
  s.trickTime = Math.max(0, s.trickTime - dt);
  if (s.messageTime > 0) {
    s.messageTime = Math.max(0, s.messageTime - dt);
    if (s.messageTime < EPS) {
      s.messageTime = 0;
      s.message = s.mode === 'ready' ? 'choose-hook' : '';
    }
  }
}
function integrate(s: FlightState, a: Vec, dt: number) {
  s.p.x += s.v.x * dt + .5 * a.x * dt * dt;
  s.p.y += s.v.y * dt + .5 * a.y * dt * dt;
  s.p.z += s.v.z * dt + .5 * a.z * dt * dt;
  s.v.x += a.x * dt; s.v.y += a.y * dt; s.v.z += a.z * dt;
  elapse(s, dt);
}
function releaseIfDue(s: FlightState) {
  if (s.mode === 'flying' && s.attached && s.phaseTime >= FLIGHT.pullDuration - EPS) {
    s.attached = null;
    event(s, 'release', { position: copy(s.p), velocity: copy(s.v) });
  }
}

/** Exact downward intersection of a ballistic segment with the safe pad plane. */
function floorContact(s: FlightState, dt: number): number | null {
  if (s.attached || !s.plan) return null;
  const landing = s.plan.landing, a = -FLIGHT.gravity;
  const discriminant = s.v.y * s.v.y - 2 * a * (s.p.y - landing.y);
  if (discriminant < 0) return null;
  const t = (-s.v.y - Math.sqrt(discriminant)) / a;
  if (t < -EPS || t > dt + EPS || s.v.y + a * t >= 0) return null;
  const x = s.p.x + s.v.x * t, z = s.p.z + s.v.z * t;
  const half = STAGES[s.stage].platformHalfSize;
  if (Math.abs(x - landing.x) > (half?.x ?? FLIGHT.landingHalfWidth) ||
      Math.abs(z - landing.z) > (half?.z ?? FLIGHT.landingHalfDepth)) return null;
  return Math.max(0, Math.min(t, dt));
}
function land(s: FlightState) {
  const velocity = copy(s.v);
  // This is the floor collision response, not a traversal/landing teleport.
  // X/Z retain the integrated contact point; Y resolves to the collision plane.
  s.p.y = s.plan!.landing.y;
  s.v = zero(); s.attached = null;
  s.mode = 'landing'; s.resumeMode = 'landing'; s.phaseTime = 0;
  const firstTry = s.stageAttempts === 1 && !s.stageHinted;
  if (firstTry) { s.firstTry++; s.flow++; } else s.flow = 0;
  s.landed = s.hop + 1; s.message = 'landed'; s.messageTime = FLIGHT.landingDuration;
  if (s.landed === 3) {
    const previous = s.progress.records[s.level], time = s.elapsed + FLIGHT.landingDuration;
    s.progress.records[s.level] = { completed: true, stars: Math.max(previous.stars, s.firstTry),
      bestTime: Math.min(previous.bestTime ?? Infinity, time) };
    s.progress.unlocked = Math.max(s.progress.unlocked, Math.min(LEVELS.length - 1, s.level + 1));
  }
  checkpoint(s, s.hop + 1, FLIGHT.landingDuration);
  event(s, 'land', { position: copy(s.p), approachVelocity: velocity, firstTry });
}
function completeLanding(s: FlightState) {
  s.plan = null; s.trickTime = 0;
  if (s.hop === 2) {
    s.mode = 'finished'; s.resumeMode = 'finished'; s.phaseTime = 0;
    s.message = 'finished'; s.messageTime = 0;
    checkpoint(s, 3);
    event(s, 'finish', { landed: s.landed, mistakes: s.mistakes, tricks: s.tricks });
  } else {
    s.stage++; s.hop++;
    // The preceding physical contact is already the next launch stance.
    // Do not assign p from a checkpoint or authored animation pose.
    s.mode = 'ready'; s.resumeMode = 'ready'; s.phaseTime = 0;
    s.selected = STAGES[s.stage].hooks[0].id;
    s.stageAttempts = 0; s.stageHinted = false; s.rejection = null;
    s.message = 'choose-hook'; s.messageTime = 0;
    checkpoint(s);
    event(s, 'ready');
  }
}
function fixedStep(s: FlightState) {
  let remaining = FLIGHT.fixedStep;
  while (remaining > EPS && s.mode !== 'paused' && s.mode !== 'finished') {
    if (s.mode === 'ready') { elapse(s, remaining); break; }
    if (s.mode === 'landing') {
      const h = Math.min(remaining, Math.max(0, FLIGHT.landingDuration - s.phaseTime));
      elapse(s, h); remaining -= h;
      if (s.phaseTime >= FLIGHT.landingDuration - EPS) completeLanding(s);
      continue;
    }
    releaseIfDue(s);
    const h = Math.min(remaining, s.attached
      ? Math.max(0, FLIGHT.pullDuration - s.phaseTime) : remaining);
    const a = s.attached ? s.plan!.acceleration : { x: 0, y: -FLIGHT.gravity, z: 0 };
    const contact = floorContact(s, h);
    if (contact !== null) {
      integrate(s, a, contact); remaining -= contact; land(s);
    } else {
      integrate(s, a, h); remaining -= h; releaseIfDue(s);
    }
  }
}

/** Deterministic fixed-step clock. Optional lean is intentionally cosmetic in
 * this campaign: it cannot spoil a correct flight or move the next math origin.
 * The UI can use performTrick for the optional airborne action instead.
 */
export function advanceFlight(s: FlightState, ms: number, _lean = 0): void {
  if (s.mode === 'paused' || s.mode === 'finished' || !Number.isFinite(ms) || ms <= 0) return;
  s.accumulator += Math.min(ms, 60_000) / 1000;
  while (s.accumulator + EPS >= FLIGHT.fixedStep) {
    fixedStep(s);
    s.accumulator = Math.max(0, s.accumulator - FLIGHT.fixedStep);
    // fixedStep may finish the run even though TypeScript retains the entry mode.
    if ((s.mode as FlightMode) === 'finished') { s.accumulator = 0; break; }
  }
}
export function toggleFlightPause(s: FlightState): void {
  if (s.mode === 'finished') return;
  if (s.mode === 'paused') { s.mode = s.resumeMode; event(s, 'resume'); }
  else { s.resumeMode = s.mode; s.mode = 'paused'; event(s, 'pause'); }
}
/** No movement reset is needed: an unsuccessful choice already stays safe.
 * Retry just dismisses its feedback and preserves every completed flight.
 */
export function retryFlight(s: FlightState): boolean {
  if (s.mode !== 'ready') return false;
  s.message = 'choose-hook'; s.messageTime = 0; s.rejection = null;
  return true;
}
export function restartFlight(s: FlightState, timed = s.timed): void {
  Object.assign(s, createFlightState({ timed, level: s.level, progress: s.progress }));
}
/** Explicit level navigation can initialize a scene; it never occurs during a
 * flight step and cannot open a locked or non-existent level.
 */
export function loadLevel(s: FlightState, index: number): boolean {
  if (!Number.isInteger(index) || index < 0 || index >= LEVELS.length || index > s.progress.unlocked) return false;
  Object.assign(s, createFlightState({ timed: s.timed, level: index, progress: s.progress }));
  event(s, 'level-open');
  return true;
}
export function nextLevel(s: FlightState): boolean {
  if (s.mode !== 'finished' || s.level === LEVELS.length - 1) return false;
  return loadLevel(s, s.level + 1);
}
