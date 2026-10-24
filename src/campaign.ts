/** Authored campaign geometry. Every hook position is constructed from its
 * stated perpendicular offsets relative to the launch harness, in metres.
 * There are no answer flags on runtime hooks: Euclidean reach decides.
 */
export type Vec = { x: number; y: number; z: number };
export type FlightHook = { id: string; label: string; position: Vec };
export type Terrain = 'rim' | 'slot' | 'islets' | 'arch' | 'switchback' | 'summit';
export type FlightStage = {
  id: string; title: string; reach: number; origin: Vec; landing: Vec;
  hooks: FlightHook[]; showMeasurements: boolean;
  region: 0 | 1 | 2 | 3; level: number; hop: number; terrain: Terrain;
  platformHalfSize?: { x: number; z: number };
};
export type CampaignLevel = {
  id: string; title: string; region: 0 | 1 | 2 | 3; regionTitle: string;
  stages: FlightStage[]; startStage: number; reach: number;
};
export type LevelRecord = { completed: boolean; stars: number; bestTime: number | null };
export type CampaignProgress = {
  version: 3; currentLevel: number; unlocked: number; records: LevelRecord[];
  resumeStage: number; resumeFirstTry: number; resumeAttempts: number;
  resumeHinted: boolean; resumeMistakes: number; resumeElapsed: number;
  resumeTricks: number; resumeFlow: number;
};
export const HARNESS_HEIGHT = 1.05;

type Offset = readonly [number, number, number];
type Witness = readonly [Offset, Offset, Offset]; // first is valid; ordered below independently
type LevelSpec = { title: string; reach: number; terrain: Terrain; flights: Witness[] };
const SPECS: LevelSpec[] = [
  { title: 'קצה הקניון', reach: 10, terrain: 'rim', flights: [
    [[8,6,0], [6,9,0], [9,6,0]],
    [[6,8,0], [9,5,0], [7,8,0]],
    [[5,8,0], [8,8,0], [4,10,0]],
  ] },
  { title: 'המעבר הצר', reach: 10, terrain: 'slot', flights: [
    [[4,8,0], [3,10,0], [9,6,0]],
    [[7,7,0], [6,9,0], [8,7,0]],
    [[9,4,0], [9,5,0], [5,9,0]],
  ] },
  { title: 'קשת האבן', reach: 10, terrain: 'arch', flights: [
    [[8,5,0], [8,7,0], [7,8,0]],
    [[4,9,0], [4,10,0], [9,6,0]],
    [[7,6,0], [7,8,0], [6,9,0]],
  ] },
  { title: 'טרסות המים', reach: 13, terrain: 'islets', flights: [
    [[5,12,0], [3,13,0], [10,9,0]],
    [[12,5,0], [11,8,0], [6,12,0]],
    [[9,9,0], [12,6,0], [4,13,0]],
  ] },
  { title: 'מעלה המפל', reach: 13, terrain: 'switchback', flights: [
    [[8,10,0], [7,12,0], [11,8,0]],
    [[10,8,0], [8,11,0], [12,6,0]],
    [[6,11,0], [6,12,0], [12,7,0]],
  ] },
  { title: 'גשר הרוח', reach: 17, terrain: 'arch', flights: [
    [[8,15,0], [10,15,0], [16,7,0]],
    [[15,8,0], [16,6,0], [13,12,0]],
    [[12,12,0], [13,11,0], [8,16,0]],
  ] },
  { title: 'עומק חדש', reach: 7, terrain: 'slot', flights: [
    [[2,6,3], [3,6,3], [2,6,4]],
    [[3,6,-2], [3,6,-3], [4,6,-2]],
    [[4,5,2], [4,5,3], [2,6,4]],
  ] },
  { title: 'איי השקיעה', reach: 9, terrain: 'islets', flights: [
    [[4,7,4], [5,7,3], [2,8,4]],
    [[6,3,-6], [7,3,-5], [6,4,-6]],
    [[4,6,5], [5,6,5], [3,8,4]],
  ] },
  { title: 'שני משולשים', reach: 13, terrain: 'switchback', flights: [
    [[3,12,4], [3,12,5], [4,12,4]],
    [[4,12,-3], [5,12,-3], [4,12,-4]],
    [[8,9,4], [8,10,3], [7,10,5]],
  ] },
  { title: 'קשת הירח', reach: 10, terrain: 'arch', flights: [
    [[6,6,5], [6,7,4], [7,6,4]],
    [[8,6,0], [6,9,0], [9,5,0]],
    [[6,7,-3], [6,7,-4], [8,6,-1]],
  ] },
  { title: 'מדרגות הכוכבים', reach: 15, terrain: 'switchback', flights: [
    [[6,13,4], [6,14,3], [7,13,4]],
    [[9,12,0], [10,12,0], [12,10,0]],
    [[10,10,-5], [11,9,-5], [8,12,-5]],
  ] },
  { title: 'פסגת היתר', reach: 17, terrain: 'summit', flights: [
    [[8,12,9], [6,15,8], [9,12,9]],
    [[9,12,-8], [9,12,-9], [8,13,-8]],
    [[12,9,8], [13,9,8], [12,10,8]],
  ] },
];
const REGIONS = ['הקניון האדום', 'נאות המים', 'צריחי השקיעה', 'הפסגה לאור ירח'];
const SLOTS = [1,0,2, 2,1,0, 0,2,1, 1,2,0, 2,0,1, 0,1,2,
  1,1,0, 2,0,2, 0,2,1, 2,1,0, 1,0,2, 0,2,1];

export const LEVELS: CampaignLevel[] = SPECS.map((spec, level) => {
  const region = Math.floor(level / 3) as 0 | 1 | 2 | 3;
  // A new explicit level opens a new scene. Within a level, only physical
  // contact reaches each succeeding origin; no frame writes a traversal pose.
  let origin: Vec = { x: 0, y: 0, z: 0 };
  const stages = spec.flights.map((witness, hop): FlightStage => {
    const index = level * 3 + hop, slot = SLOTS[index];
    const offsets: Offset[] = [];
    let other = 1;
    for (let option = 0; option < 3; option++) offsets.push(witness[option === slot ? 0 : other++]);
    const span = Math.max(13, Math.max(...witness.map(([dx]) => dx)) + 5) + ((level + hop) % 2);
    const landing = { x: origin.x + span,
      y: origin.y + 3, z: origin.z + (region >= 2 ? [2,-3,1][hop] : 0) };
    const stage: FlightStage = {
      id: `level-${level + 1}-hop-${hop + 1}`, title: spec.title,
      level, hop, region, terrain: spec.terrain, reach: spec.reach,
      origin: { ...origin }, landing, showMeasurements: true,
      platformHalfSize: { x: 4.5, z: 4.8 },
      hooks: offsets.map(([x,y,z], option) => ({
        id: `l${level + 1}-h${hop + 1}-${option + 1}`, label: String(option + 1),
        position: { x: origin.x + x, y: origin.y + HARNESS_HEIGHT + y, z: origin.z + z },
      })),
    };
    origin = { ...landing };
    return stage;
  });
  return { id: `level-${level + 1}`, title: spec.title, region,
    regionTitle: REGIONS[region], stages, startStage: level * 3, reach: spec.reach };
});
export const STAGES: FlightStage[] = LEVELS.flatMap(level => level.stages);

const emptyRecord = (): LevelRecord => ({ completed: false, stars: 0, bestTime: null });
/** Validate all saved values and derive unlocks from contiguous completed
 * records. A stored unlocked:999 or currentLevel:-1 is never trusted.
 * This is local save validation, not an anti-cheat/authentication boundary.
 */
export function normalizeProgress(raw: unknown): CampaignProgress {
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch { raw = null; }
  }
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const incoming = source.version === 3 && Array.isArray(source.records) ? source.records : [];
  const records = LEVELS.map((_, index): LevelRecord => {
    const item = incoming[index];
    if (!item || typeof item !== 'object' || item.completed !== true ||
        !Number.isInteger(item.stars) || item.stars < 0 || item.stars > 3 ||
        typeof item.bestTime !== 'number' || !Number.isFinite(item.bestTime) || item.bestTime <= 0) return emptyRecord();
    return { completed: true, stars: item.stars, bestTime: item.bestTime };
  });
  let unlocked = 0;
  while (unlocked < LEVELS.length - 1 && records[unlocked].completed) unlocked++;
  const currentLevel = Number.isInteger(source.currentLevel)
    ? Math.max(0, Math.min(source.currentLevel as number, unlocked)) : 0;
  const start = LEVELS[currentLevel].startStage;
  const candidate = source.resumeStage;
  const resumeStage = Number.isInteger(candidate) && (candidate as number) >= start &&
    (candidate as number) <= start + (records[currentLevel].completed ? 3 : 2)
    ? candidate as number : start;
  const hop = resumeStage - start;
  const integer = (value: unknown, max = 10_000) => typeof value === 'number' &&
    Number.isInteger(value) && value >= 0 && value <= max ? value : 0;
  const resumeFirstTry = integer(source.resumeFirstTry, hop);
  return { version: 3, currentLevel, unlocked, records, resumeStage, resumeFirstTry,
    resumeAttempts: integer(source.resumeAttempts), resumeHinted: source.resumeHinted === true,
    resumeMistakes: integer(source.resumeMistakes),
    resumeElapsed: typeof source.resumeElapsed === 'number' && Number.isFinite(source.resumeElapsed) &&
      source.resumeElapsed >= 0 && source.resumeElapsed <= 86_400 ? source.resumeElapsed : 0,
    resumeTricks: integer(source.resumeTricks, hop), resumeFlow: integer(source.resumeFlow, resumeFirstTry) };
}
export function serializeProgress(progress: CampaignProgress): string {
  return JSON.stringify(normalizeProgress(progress));
}
