/** Current three-hop pilot. World units are metres and p is the athlete's feet.
 * This is an assisted arcade launch, not an unassisted pendulum simulation.
 * A solved initial impulse is followed by a constant hook-directed pull, then
 * gravity. Position and velocity are integrated continuously through release;
 * only physical floor contact stops motion and advances the course.
 */
export type Vec = { x: number; y: number; z: number };
export type FlightHook = { id: string; label: string; position: Vec };
export type FlightStage = {
  id: string; title: string; reach: number; origin: Vec; landing: Vec;
  hooks: FlightHook[]; showMeasurements: boolean;
};
export const HARNESS_HEIGHT = 1.05;
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
  feedbackDuration: 1.1,
  trickDuration: .55,
} as const;

export const STAGES: FlightStage[] = [
  { id: 'first-flight', title: 'הזינוק הראשון', reach: 10,
    origin: { x: 0, y: 0, z: 0 }, landing: { x: 15, y: 1, z: 0 },
    hooks: [{ id: 'intro-1', label: '1', position: { x: 8, y: 7.05, z: 0 } }],
    showMeasurements: false },
  { id: 'first-choice', title: 'בוחרים טבעת', reach: 10,
    origin: { x: 15, y: 1, z: 0 }, landing: { x: 30, y: 2, z: 0 },
    hooks: [
      { id: 'fork-1', label: '1', position: { x: 21, y: 11.05, z: 0 } },
      { id: 'fork-2', label: '2', position: { x: 23, y: 8.05, z: 0 } },
    ], showMeasurements: true },
  { id: 'higher-choice', title: 'עולים לגובה', reach: 13,
    origin: { x: 30, y: 2, z: 0 }, landing: { x: 46, y: 5, z: 0 },
    hooks: [
      { id: 'rise-1', label: '1', position: { x: 35, y: 15.05, z: 0 } },
      { id: 'rise-2', label: '2', position: { x: 33, y: 16.05, z: 0 } },
    ], showMeasurements: true },
];

export type FlightMode = 'ready' | 'flying' | 'landing' | 'finished' | 'paused';
type ActiveMode = Exclude<FlightMode, 'paused'>;
export type FlightEvent = { type: string; stage: number; time: number; [key: string]: unknown };
type LaunchPlan = { acceleration: Vec; landing: Vec };
export type FlightState = {
  mode: FlightMode; resumeMode: ActiveMode; stage: number; p: Vec; v: Vec;
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
  s.events.push({ type, stage: s.stage, time: s.elapsed, ...data });
  if (s.events.length > 200) s.events.shift();
};
export const flightHarness = (s: Pick<FlightState, 'p'>): Vec =>
  ({ x: s.p.x, y: s.p.y + HARNESS_HEIGHT, z: s.p.z });

export function createFlightState(options: { timed?: boolean } = {}): FlightState {
  return {
    mode: 'ready', resumeMode: 'ready', stage: 0, p: copy(STAGES[0].origin), v: zero(),
    selected: STAGES[0].hooks[0].id, attached: null, elapsed: 0, phaseTime: 0,
    landed: 0, mistakes: 0, launches: 0, tricks: 0, rings: 0,
    message: 'choose-hook', messageTime: 0, events: [], timed: options.timed ?? false,
    trickTime: 0, accumulator: 0, plan: null, trickUsed: false,
  };
}

/** The current physical harness is the origin; camera state is not an input.
 * The pilot's hooks have separately authored clear sight lines. Obstruction and
 * spatial fork mechanics stay in the historical rules until introduced later.
 */
export function inspectFlightHook(s: Pick<FlightState, 'p' | 'stage'>, hookOrId: FlightHook | string) {
  const stage = STAGES[s.stage];
  const hook = typeof hookOrId === 'string'
    ? stage.hooks.find(h => h.id === hookOrId) : hookOrId;
  if (!hook) return { dx: 0, dy: 0, dz: 0, distance: Infinity, squared: Infinity,
    reachable: false, reason: 'unknown-hook' as const };
  const p = flightHarness(s), dx = hook.position.x - p.x,
    dy = hook.position.y - p.y, dz = hook.position.z - p.z;
  const squared = dx * dx + dy * dy + dz * dz, distance = Math.hypot(dx, dy, dz);
  const reachable = distance <= stage.reach + FLIGHT.reachEpsilon;
  return { dx, dy, dz, distance, squared, reachable,
    reason: reachable ? 'ready' as const : 'overreach' as const };
}

/** Choose and attempt are atomic. A rejected hook never moves the athlete,
 * clears completed progress, or locks out the next click.
 */
export function chooseHook(s: FlightState, id: string): boolean {
  if (s.mode !== 'ready') return false;
  const stage = STAGES[s.stage], hook = stage.hooks.find(h => h.id === id);
  if (!hook) return false;
  s.selected = id;
  const witness = inspectFlightHook(s, hook);
  event(s, 'attempt', { hook: id, origin: flightHarness(s), reach: stage.reach,
    ...witness, accepted: witness.reachable });
  if (!witness.reachable) {
    s.mistakes++;
    s.message = 'overreach'; s.messageTime = FLIGHT.feedbackDuration;
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
export const launchSelected = (s: FlightState): boolean => chooseHook(s, s.selected);

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
  if (Math.abs(x - landing.x) > FLIGHT.landingHalfWidth ||
      Math.abs(z - landing.z) > FLIGHT.landingHalfDepth) return null;
  return Math.max(0, Math.min(t, dt));
}
function land(s: FlightState) {
  const velocity = copy(s.v);
  // This is the floor collision response, not a traversal/landing teleport.
  // X/Z retain the integrated contact point; Y resolves to the collision plane.
  s.p.y = s.plan!.landing.y;
  s.v = zero(); s.attached = null;
  s.mode = 'landing'; s.resumeMode = 'landing'; s.phaseTime = 0;
  s.landed = s.stage + 1; s.message = 'landed'; s.messageTime = FLIGHT.landingDuration;
  event(s, 'land', { position: copy(s.p), approachVelocity: velocity });
}
function completeLanding(s: FlightState) {
  s.plan = null; s.trickTime = 0;
  if (s.stage === STAGES.length - 1) {
    s.mode = 'finished'; s.resumeMode = 'finished'; s.phaseTime = 0;
    s.message = 'finished'; s.messageTime = 0;
    event(s, 'finish', { landed: s.landed, mistakes: s.mistakes, tricks: s.tricks });
  } else {
    s.stage++;
    // The preceding physical contact is already the next launch stance.
    // Do not assign p from a checkpoint or authored animation pose.
    s.mode = 'ready'; s.resumeMode = 'ready'; s.phaseTime = 0;
    s.selected = STAGES[s.stage].hooks[0].id;
    s.message = 'choose-hook'; s.messageTime = 0;
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
 * this pilot: it cannot spoil a correct flight or move the next math origin.
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
  s.message = 'choose-hook'; s.messageTime = 0;
  return true;
}
export function restartFlight(s: FlightState, timed = s.timed): void {
  Object.assign(s, createFlightState({ timed }));
}
