import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

type Point = readonly [number, number, number];
type OutlinePoint = readonly [number, number];
type Vec = { x: number; y: number; z: number };
type GeometryData = { positions: number[]; colors: number[]; uvs: number[] };

/** Structural input avoids coupling environment code to the flight domain. */
export type CanyonStage = {
  id: string;
  origin: Vec;
  landing: Vec;
  hooks: readonly { position: Vec }[];
  region?: number | string;
  level?: number;
  hop?: number;
  terrain?: string;
  platformHalfSize?: { x: number; z: number };
};
export type RegionAtmosphere = {
  skyTop: string; skyBottom: string; horizon: string; fog: string;
  ambient: string; ground: string; sun: string;
  sunIntensity: number; hemisphereIntensity: number;
  fogNear: number; fogFar: number;
};
export type FlowCanyon = {
  setStage: (index: number) => void;
  update: (time: number, landingPulse: number) => void;
  loaded: Promise<void>;
};

const ATMOSPHERES: readonly RegionAtmosphere[] = [
  { skyTop: '#237cd0', skyBottom: '#d8e7e6', horizon: '#a7cedf', fog: '#accad5',
    ambient: '#d3eaff', ground: '#906246', sun: '#ffe3b0',
    sunIntensity: 3, hemisphereIntensity: 1.9, fogNear: 55, fogFar: 205 },
  { skyTop: '#1679be', skyBottom: '#d5eee3', horizon: '#a9d5d8', fog: '#9ecdd0',
    ambient: '#d5f5ec', ground: '#55765b', sun: '#fff0c5',
    sunIntensity: 2.8, hemisphereIntensity: 2, fogNear: 52, fogFar: 195 },
  { skyTop: '#4b467d', skyBottom: '#f4bd8f', horizon: '#ecac80', fog: '#c5908e',
    ambient: '#c1b9e4', ground: '#914b3b', sun: '#ffb775',
    sunIntensity: 3.1, hemisphereIntensity: 1.6, fogNear: 55, fogFar: 195 },
  { skyTop: '#08152f', skyBottom: '#6c7d9f', horizon: '#485c83', fog: '#344765',
    ambient: '#a8c8f5', ground: '#363c59', sun: '#b8d8ff',
    sunIntensity: 2.5, hemisphereIntensity: 1.45, fogNear: 48, fogFar: 185 },
];
const REGION_NAMES = ['canyon', 'oasis', 'sunset', 'summit'];
function regionIndex(value: number | string = 0): number {
  if (typeof value === 'number') return THREE.MathUtils.clamp(Math.floor(value), 0, 3);
  const index = REGION_NAMES.findIndex(name => value.toLowerCase().includes(name));
  return index < 0 ? 0 : index;
}
/** Main owns the lights/fog; the canyon uses the same palette for its sky. */
export function atmosphere(region: number | string): RegionAtmosphere {
  return { ...ATMOSPHERES[regionIndex(region)] };
}

const ROCK_PALETTES = [
  ['#ba6240', '#d88650', '#9d4d38', '#e7b77c'],
  ['#9f9671', '#bdab7d', '#717961', '#e4c997'],
  ['#a14b3a', '#d77846', '#753f43', '#e9aa71'],
  ['#465a7c', '#607896', '#354563', '#b3c3cf'],
].map(palette => palette.map(color => new THREE.Color(color)));
const FALLBACK_STAGES: readonly CanyonStage[] = [{
  id: 'preview', origin: { x: 0, y: 0, z: 0 }, landing: { x: 18, y: 3, z: 0 },
  hooks: [{ position: { x: 8, y: 7.05, z: 0 } }], region: 0,
}];
const LEVELS = [0, .2, .9, 1.08, 2.5, 2.7, 4.8, 5.05, 8, 8.25, 12, 12.3, 18, 27, 38];

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function data(): GeometryData { return { positions: [], colors: [], uvs: [] }; }
function triangle(target: GeometryData, a: Point, b: Point, c: Point, color: THREE.Color): void {
  const horizontal = Math.abs(a[1] - b[1]) < .001 && Math.abs(a[1] - c[1]) < .001;
  const alongX = Math.abs(a[0] - b[0]) + Math.abs(a[0] - c[0]) >
    Math.abs(a[2] - b[2]) + Math.abs(a[2] - c[2]);
  for (const point of [a, b, c]) {
    target.positions.push(...point);
    target.colors.push(color.r, color.g, color.b);
    target.uvs.push((horizontal || alongX ? point[0] : point[2]) * .18,
      (horizontal ? point[2] : point[1]) * .18);
  }
}
function geometry(target: GeometryData): THREE.BufferGeometry {
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(target.positions, 3));
  result.setAttribute('color', new THREE.Float32BufferAttribute(target.colors, 3));
  result.setAttribute('uv', new THREE.Float32BufferAttribute(target.uvs, 2));
  result.computeVertexNormals();
  result.computeBoundingSphere();
  return result;
}
function primitive(target: GeometryData, source: THREE.BufferGeometry, position: Point,
  scale: Point, color: THREE.Color, rotation: THREE.Quaternion = new THREE.Quaternion()): void {
  const flat = source.index ? source.toNonIndexed() : source;
  const positions = flat.getAttribute('position');
  const transform = new THREE.Matrix4().compose(new THREE.Vector3(...position), rotation, new THREE.Vector3(...scale));
  const point = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i).applyMatrix4(transform);
    target.positions.push(point.x, point.y, point.z);
    target.colors.push(color.r, color.g, color.b);
    target.uvs.push(point.x * .18, point.z * .18);
  }
  if (flat !== source) flat.dispose();
}
function beam(target: GeometryData, a: Point, b: Point, radius: number, color: THREE.Color,
  sides = 6): void {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const direction = end.clone().sub(start);
  const cylinder = new THREE.CylinderGeometry(radius * .8, radius, direction.length(), sides);
  primitive(target, cylinder, start.clone().lerp(end, .5).toArray() as [number, number, number], [1, 1, 1], color,
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
  cylinder.dispose();
}
function outline(width: number, depth: number, seed: number, safe = false): OutlinePoint[] {
  if (safe) {
    // The corner chamfers stay outside all four corners of the safe rectangle.
    return [
      [-width - .48, -depth + .28], [-width - .12, -depth - .3],
      [-width * .5, -depth - .5], [width * .55, -depth - .42],
      [width + .16, -depth - .3], [width + .5, -depth + .28],
      [width + .55, -.5], [width + .42, depth - .18],
      [width + .12, depth + .3], [width * .4, depth + .48],
      [-width * .6, depth + .42], [-width - .12, depth + .3],
      [-width - .46, depth - .2], [-width - .57, .6],
    ];
  }
  const next = random(seed);
  return Array.from({ length: 16 }, (_, i) => {
    const angle = i / 16 * Math.PI * 2, radius = .88 + next() * .17;
    return [Math.cos(angle) * width * radius, Math.sin(angle) * depth * radius];
  });
}
function column(target: GeometryData, center: Point, rim: readonly OutlinePoint[], height: number,
  palette: readonly THREE.Color[], seed: number, safe = false): void {
  const next = random(seed), top = palette[3];
  const levels = LEVELS.filter(depth => depth < height).concat(height);
  const rings = levels.map((depth, band) => rim.map(([x, z], i): Point => {
    const taper = safe ? 1 - Math.min(depth / 70, .35) : 1 + Math.min(depth / 65, .45);
    const shelf = band === 0 ? 1 : 1 + (band % 2 ? .009 : -.018);
    const wobble = band === 0 ? 1 : 1 + Math.sin(i * 1.7 + band * .91 + seed) * .035;
    return [center[0] + x * taper * shelf * wobble + (band ? Math.sin(depth + seed) * .1 : 0),
      center[1] - depth, center[2] + z * taper * shelf * wobble];
  }));
  for (let i = 0; i < rim.length; i++) {
    const j = (i + 1) % rim.length;
    triangle(target, center, rings[0][j], rings[0][i], top.clone().multiplyScalar(.95 + next() * .08));
  }
  for (let band = 0; band < rings.length - 1; band++) {
    const base = band === 0 ? top : palette[0].clone().lerp(
      palette[(Math.floor(band / 3) + seed) % 3], .3 + Math.sin(band * 1.2 + seed) * .13);
    for (let i = 0; i < rim.length; i++) {
      const j = (i + 1) % rim.length;
      const dx = rim[j][0] - rim[i][0], dz = rim[j][1] - rim[i][1];
      const face = .91 + Math.max(0, (-dz * .4 - dx * .6) / Math.hypot(dx, dz)) * .12;
      const tint = base.clone().multiplyScalar(face * (.94 + next() * .09));
      triangle(target, rings[band][i], rings[band][j], rings[band + 1][i], tint);
      triangle(target, rings[band][j], rings[band + 1][j], rings[band + 1][i], tint);
    }
  }
}
function intersectsRayBox(a: Vec, b: Vec, center: Point, half: Point): boolean {
  let near = 0, far = 1;
  for (let axis = 0; axis < 3; axis++) {
    const key = (['x', 'y', 'z'] as const)[axis];
    const delta = b[key] - a[key], low = center[axis] - half[axis] - .08, high = center[axis] + half[axis] + .08;
    if (Math.abs(delta) < 1e-8) { if (a[key] < low || a[key] > high) return false; }
    else {
      const p = (low - a[key]) / delta, q = (high - a[key]) / delta;
      near = Math.max(near, Math.min(p, q)); far = Math.min(far, Math.max(p, q));
      if (near > far) return false;
    }
  }
  return true;
}
function local(point: Vec, origin: Vec): Vec {
  return { x: point.x - origin.x, y: point.y - origin.y, z: point.z - origin.z };
}
function clearOfRays(center: Point, half: Point, hooks: readonly Vec[]): boolean {
  return hooks.every(hook => !intersectsRayBox({ x: 0, y: 1.05, z: 0 }, hook, center, half));
}
function shrub(target: GeometryData, position: Point, size: number, next: () => number,
  region: number): void {
  const foliage = new THREE.IcosahedronGeometry(1, 0);
  const dark = new THREE.Color(region === 3 ? '#34566a' : region === 1 ? '#416d46' : '#66734b');
  const light = new THREE.Color(region === 3 ? '#7799a0' : region === 1 ? '#91ae59' : '#a49c58');
  for (let i = 0; i < 9; i++) {
    const angle = i * 2.4;
    const radius = size * (.1 + next() * .26);
    primitive(target, foliage, [position[0] + Math.cos(angle) * radius,
      position[1] + size * (.23 + next() * .36), position[2] + Math.sin(angle) * radius],
    [size * (.19 + next() * .18), size * (.18 + next() * .24), size * .26],
    dark.clone().lerp(light, next() * .8));
  }
  foliage.dispose();
}
function plant(target: GeometryData, position: Point, size: number, next: () => number,
  region: number): void {
  if (region === 1 && size > 1.1) {
    const top: Point = [position[0] + size * .12, position[1] + size * 1.8, position[2]];
    beam(target, position, top, size * .075, new THREE.Color('#88734d'));
    const leaf = new THREE.ConeGeometry(1, 1, 5);
    for (let i = 0; i < 7; i++) {
      const angle = i / 7 * Math.PI * 2;
      const end = new THREE.Vector3(Math.cos(angle) * size * .8, -size * .12, Math.sin(angle) * size * .8);
      primitive(target, leaf, [top[0] + end.x * .55, top[1] + end.y * .55, top[2] + end.z * .55],
        [size * .2, size * 1.2, size * .15], new THREE.Color(i % 2 ? '#73a45c' : '#416f43'),
        new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.normalize()));
    }
    leaf.dispose();
  } else if (region === 3 && size > 1.1) {
    beam(target, position, [position[0], position[1] + size * 2.2, position[2]], size * .07, new THREE.Color('#465267'));
    const cone = new THREE.ConeGeometry(1, 1, 7);
    for (let i = 0; i < 4; i++) primitive(target, cone,
      [position[0], position[1] + size * (.6 + i * .43), position[2]],
      [size * (.68 - i * .12), size, size * (.68 - i * .12)],
      new THREE.Color(i === 3 ? '#b6ccda' : i % 2 ? '#497082' : '#37556e'));
    cone.dispose();
  } else shrub(target, position, size, next, region);
}
function ribbon(target: GeometryData, width: number, y: number, zOffset: number, color: THREE.Color): void {
  for (let i = 0; i < 35; i++) {
    const x = -105 + i * 7;
    const z = zOffset + Math.sin(x * .045) * 7;
    const x2 = x + 7, z2 = zOffset + Math.sin(x2 * .045) * 7;
    triangle(target, [x, y, z - width], [x2, y, z2 + width], [x2, y, z2 - width], color);
    triangle(target, [x, y, z - width], [x, y, z + width], [x2, y, z2 + width], color);
  }
}
function disposeStage(group: THREE.Group): void {
  group.traverse(object => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Points) object.geometry.dispose();
  });
  group.clear();
}

/** Local authored terrain, reused materials and a single cached original Tripo asset. */
export function createFlowCanyon(scene: THREE.Scene, stages: readonly CanyonStage[] = FALLBACK_STAGES): FlowCanyon {
  const world = new THREE.Group(); world.name = 'campaign-canyon'; scene.add(world);
  const active = new THREE.Group(); active.name = 'active-crossing-terrain'; world.add(active);
  const grain = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  grain.colorSpace = THREE.SRGBColorSpace; grain.needsUpdate = true;
  const stone = new THREE.MeshStandardMaterial({ vertexColors: true, map: grain, roughness: .98 });
  const flora = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 });
  const farStone = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const detailMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, map: grain, roughness: 1 });
  const stoneLoaded = new THREE.TextureLoader().loadAsync(new URL('art/sandstone.webp', document.baseURI).href)
    .then(map => {
      map.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.anisotropy = 4;
      for (const material of [stone, detailMaterial, farStone]) {
        material.map = map; material.bumpMap = map;
        material.bumpScale = .04; material.roughness = 1; material.needsUpdate = true;
      }
      grain.dispose();
    });
  const waterMaterial = new THREE.MeshStandardMaterial({ color: '#3eafba', roughness: .3, metalness: .18,
    transparent: true, opacity: .88, emissive: '#245e68', emissiveIntensity: .16 });
  const cascadeMaterial = new THREE.MeshBasicMaterial({ color: '#b8f7ef', transparent: true, opacity: .64,
    side: THREE.DoubleSide, depthWrite: false });
  const sprayMaterial = new THREE.MeshBasicMaterial({ color: '#e4ffed', transparent: true, opacity: .6,
    side: THREE.DoubleSide, depthWrite: false });

  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } },
    vertexShader: `varying vec3 skyDirection; void main(){ skyDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform vec3 horizon; varying vec3 skyDirection;
      void main(){ float h=normalize(skyDirection).y; vec3 color=mix(bottom,horizon,smoothstep(-.22,.04,h));
      color=mix(color,top,smoothstep(.015,.7,h)); gl_FragColor=vec4(color,1.0);
      #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, toneMapped: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(280, 24, 16), skyMaterial);
  sky.name = 'region-gradient-sky'; sky.renderOrder = -20; sky.frustumCulled = false; world.add(sky);
  // The UI may dolly far back on a phone. A stage-centred dome would then cross
  // the camera's far plane and expose black triangular gaps in the background.
  sky.onBeforeRender = (_renderer, _scene, renderCamera) => {
    sky.position.setFromMatrixPosition(renderCamera.matrixWorld);
    sky.updateMatrixWorld();
  };

  const cloudMaterial = new THREE.MeshBasicMaterial({ color: '#fff9e9', transparent: true, opacity: .86, depthWrite: false });
  const clouds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), cloudMaterial, 52);
  clouds.name = 'grouped-cumulus-clouds'; clouds.frustumCulled = false; world.add(clouds);
  const cloudMatrix = new THREE.Object3D();
  const cloudRandom = random(11929);
  const cloudPositions = Array.from({ length: 52 }, (_, i) => {
    const cluster = Math.floor(i / 4), member = i % 4;
    return { x: -90 + cluster * 18 + member * 3.4, y: 26 + Math.sin(cluster * 2.2) * 10 + cloudRandom() * 3,
      z: -85 - cloudRandom() * 55, size: 3.2 + cloudRandom() * 3.4 };
  });
  const starsData = new Float32Array(210 * 3), starRandom = random(92133);
  for (let i = 0; i < 210; i++) {
    const angle = starRandom() * Math.PI * 2, elevation = .12 + starRandom() * 1.25;
    starsData[i * 3] = Math.cos(angle) * Math.cos(elevation) * 260;
    starsData[i * 3 + 1] = Math.sin(elevation) * 260;
    starsData[i * 3 + 2] = Math.sin(angle) * Math.cos(elevation) * 260;
  }
  const starGeometry = new THREE.BufferGeometry(); starGeometry.setAttribute('position', new THREE.BufferAttribute(starsData, 3));
  const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: '#ecf6ff', size: .5, sizeAttenuation: true, transparent: true, opacity: .9, fog: false, toneMapped: false }));
  world.add(stars);
  const celestialMaterial = new THREE.MeshBasicMaterial({ color: '#ffe0a3', fog: false, toneMapped: false });
  const celestial = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), celestialMaterial);
  world.add(celestial);

  const archMount = new THREE.Group(); archMount.name = 'original-tripo-natural-arch'; world.add(archMount);
  let stageIndex = -1, currentRegion = 0;
  let currentStage = stages[0] ?? FALLBACK_STAGES[0];
  let waterfall: THREE.Mesh | undefined;
  let spray: THREE.Mesh | undefined;
  const dustGeometry = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(36 * 3);
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMaterial = new THREE.PointsMaterial({ color: '#ffe6b5', size: .055, transparent: true, opacity: 0, depthWrite: false });
  const dust = new THREE.Points(dustGeometry, dustMaterial); dust.frustumCulled = false; world.add(dust);
  const dustNext = random(1309), dustSeeds = Array.from({ length: 36 }, () => [dustNext(), dustNext(), dustNext()]);

  function addMesh(target: GeometryData, material: THREE.Material, name: string, receiveShadow = false): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry(target), material); mesh.name = name;
    mesh.receiveShadow = receiveShadow; mesh.castShadow = false; active.add(mesh); return mesh;
  }
  function setStage(index: number): void {
    const bounded = THREE.MathUtils.clamp(Math.floor(Number.isFinite(index) ? index : 0), 0, Math.max(stages.length - 1, 0));
    if (bounded === stageIndex) return;
    stageIndex = bounded; currentStage = stages[bounded] ?? FALLBACK_STAGES[0];
    currentRegion = regionIndex(currentStage.region ?? Math.floor(bounded / 9));
    disposeStage(active); waterfall = spray = undefined;
    active.position.set(currentStage.origin.x, currentStage.origin.y, currentStage.origin.z);
    const palette = ROCK_PALETTES[currentRegion], air = ATMOSPHERES[currentRegion];
    const next = random(2809 + (currentStage.level ?? Math.floor(bounded / 3)) * 401 + (currentStage.hop ?? bounded % 3) * 71);
    const seed = (currentStage.level ?? bounded) * 21 + bounded + 131;
    const destination = local(currentStage.landing, currentStage.origin);
    const hooks = currentStage.hooks.map(hook => local(hook.position, currentStage.origin));
    const footprint = currentStage.platformHalfSize ?? { x: 3.4, z: 3.6 };
    const near = data(), details = data(), vegetation = data(), distant = data(), fractures = data();
    const coarseRock = new THREE.IcosahedronGeometry(1, 1);
    const pebble = new THREE.IcosahedronGeometry(1, 0);
    const variant = (currentStage.level ?? 0) % 3;
    const terrain = currentStage.terrain ?? 'rim';

    for (const [padIndex, center] of ([[0, [0, 0, 0]], [1, [destination.x, destination.y, destination.z]]] as const)) {
      const rim = outline(footprint.x, footprint.z, seed + padIndex, true);
      const cliffHeight = terrain === 'islets' ? 13 : terrain === 'summit' ? 44 : currentRegion === 1 ? 24 : 36;
      column(near, center, rim, cliffHeight, palette, seed + padIndex, true);
      // Larger discontinuous ribs and rim chips give the cliff face real relief.
      for (let i = 0; i < 17; i++) {
        const angle = i / 17 * Math.PI * 2;
        const radiusX = footprint.x + .24, radiusZ = footprint.z + .23;
        const depth = i % 3 === 0 ? .35 : 1.5 + next() * 8;
        primitive(details, coarseRock, [center[0] + Math.cos(angle) * radiusX,
          center[1] - depth, center[2] + Math.sin(angle) * radiusZ],
        [.26 + next() * .4, .18 + next() * .6, .24 + next() * .32], palette[i % 3],
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle));
      }
      for (let i = 0; i < 15; i++) {
        const side = i % 2 ? -1 : 1;
        const x = center[0] + (next() - .5) * footprint.x * 1.8;
        const z = center[2] + side * (footprint.z + .15);
        const size = .06 + next() * .17;
        primitive(details, pebble, [x, center[1] + size * .3, z], [size * 1.6, size * .6, size], palette[i % 3]);
        if (i % 3 === 0) {
          const plantSize = currentRegion === 1 && i === 0 ? 1.65 : currentRegion === 3 && i === 0 ? 1.3 : .42 + next() * .42;
          // Tall foliage belongs on back corners, never between camera and P.
          const plantX = center[0] + (i % 2 ? -1 : 1) * (footprint.x - .35) + (next() - .5) * .35;
          const plantZ = center[2] - footprint.z - .65 - next() * .3;
          const position: Point = [plantX, center[1], plantZ];
          if (clearOfRays([plantX, center[1] + plantSize, plantZ], [plantSize, plantSize, plantSize], hooks))
            plant(vegetation, position, plantSize, next, currentRegion);
        }
      }
      // Dark discontinuous horizontal fractures are geometry, not painted lines.
      for (let i = 0; i < 12; i++) {
        const x = center[0] - footprint.x * .8 + next() * footprint.x * 1.6;
        const y = center[1] - .7 - next() * 8;
        const z = center[2] + footprint.z * (.92 - Math.abs(y - center[1]) * .012);
        const width = .25 + next() * .65;
        triangle(fractures, [x - width, y, z + .035], [x + width, y - .018, z + .035],
          [x + width * .65, y - .045, z + .045], palette[2].clone().multiplyScalar(.7));
      }
    }

    // Side cliffs connect the ledges to a landscape, rather than floating pads.
    const flankPositions: Point[] = [
      [-footprint.x - 3.3, variant === 1 ? 8 : 5, -footprint.z - 3.5],
      [destination.x + footprint.x + 2.5, destination.y + (variant === 2 ? 7 : 3), destination.z - footprint.z - 3.5],
    ];
    for (let i = 0; i < flankPositions.length; i++) {
      const center = flankPositions[i], widths: Point = [4.3, 24, 3.8];
      if (clearOfRays([center[0], center[1] - 17, center[2]], widths, hooks)) {
        column(near, center, outline(4, 3.4, seed + i * 7), 39, palette, seed + i * 2);
        plant(vegetation, [center[0], center[1], center[2]], currentRegion === 1 ? 2.3 : 1.2, next, currentRegion);
      }
    }

    const corridorBack = Math.min(-1, ...hooks.map(hook => hook.z)) - 7;
    if (terrain === 'slot') {
      // Close, irregular walls make a distinct slot passage. They stay behind
      // every target, so the open foreground still carries the measurements.
      for (const [i, center] of ([[0, [2, 12, corridorBack - 1]],
        [1, [destination.x - 1, 17, corridorBack - 4]]] as const)) {
        if (clearOfRays([center[0], center[1] - 19, center[2]], [5.5, 20, 3.5], hooks))
          column(near, center, outline(5, 3, seed + 721 + i), 42, palette, seed + 721 + i);
      }
    } else if (terrain === 'switchback') {
      // Overlapping ascending rims give the next route an actual winding ridge.
      for (let i = 0; i < 3; i++) {
        const center: Point = [destination.x + 1 + i * 4, destination.y + i * 2.8,
          corridorBack - 3 - i * 3.5];
        column(near, center, outline(5.5, 3.2, seed + 321 + i), 34, palette, seed + 321 + i);
        plant(vegetation, [center[0] + 1, center[1], center[2]], currentRegion === 3 ? 1.8 : 1.4, next, currentRegion);
      }
    } else if (terrain === 'islets') {
      // Lower rock shoals surround the active pair without becoming safe floors.
      for (let i = 0; i < 5; i++) {
        const center: Point = [-9 + i * 8, -3 - next() * 2, corridorBack - 3 - (i % 2) * 5];
        column(near, center, outline(2 + next(), 2.2, seed + 431 + i), 10, palette, seed + 431 + i);
        shrub(vegetation, center, .9 + next() * .5, next, currentRegion);
      }
    } else if (terrain === 'summit') {
      const center: Point = [destination.x + 7, destination.y + 11, corridorBack - 6];
      column(near, center, outline(4.2, 4, seed + 119), 48, palette, seed + 119);
      plant(vegetation, [center[0], center[1], center[2]], 2, next, 3);
    }

    // A carved outcrop carries the neutral hook fixtures. Its vertical mass is
    // beyond every hook; the cantilevers are above every measured reach ray.
    if (hooks.length) {
      const farX = Math.max(...hooks.map(hook => hook.x));
      const high = Math.max(...hooks.map(hook => hook.y));
      // The full support volume sits behind the landing and flight corridor.
      // A clear grapple ray alone would not guarantee a clear physical landing.
      const backZ = Math.min(0, destination.z, ...hooks.map(hook => hook.z)) - footprint.z - 6;
      const support: Point = [farX + 4.8, high + 2.8, backZ];
      column(near, support, outline(3.2, 2.8, seed + 91), high + 27, palette, seed + 91);
      for (const [i, hook] of hooks.entries()) {
        const a = new THREE.Vector3(...support), b = new THREE.Vector3(hook.x, high + 1.65, hook.z);
        const middle = a.clone().lerp(b, .58);
        primitive(details, coarseRock, middle.toArray() as [number, number, number],
          [.82, a.distanceTo(b) * .62, .72], palette[(i + 1) % 3],
          new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
        const hangerZ = hook.z - .8;
        const hangerCenter: Point = [hook.x, (hook.y + .62 + high + 1.1) / 2, hangerZ];
        const hangerHalf: Point = [.04, (high + 1.1 - hook.y - .62) / 2, .04];
        if (hangerHalf[1] > 0 && clearOfRays(hangerCenter, hangerHalf, hooks)) {
          beam(details, [hook.x, hook.y + .62, hangerZ], [hook.x, high + 1.1, hangerZ], .032,
            new THREE.Color(currentRegion === 3 ? '#bfd6df' : '#57544a'));
        }
      }
    }

    // Region silhouettes differ in structure: mesas, green water terraces,
    // slender sunset fins, then sharp moonlit summits. All are real geometry.
    for (let layer = 0; layer < 3; layer++) {
      const haze = new THREE.Color(air.fog);
      const distantPalette = palette.map(color => color.clone().lerp(haze, .23 + layer * .2));
      for (let i = 0; i < 10; i++) {
        const x = -72 + i * 20 + (next() - .5) * 8;
        const z = (currentRegion === 3 ? -70 - layer * 45 : -34 - layer * 35) - next() * 9;
        const top = currentRegion === 3 ? 6 + layer * 12 + next() * 16 : currentRegion === 2 ? 4 + next() * 25 : -3 + layer * 6 + next() * 13;
        const width = currentRegion === 3 ? 7 + layer * 3 + next() * 4 : currentRegion === 2 ? 1.5 + next() * 2.5 : 3.5 + layer * 1.5 + next() * 3.5;
        const depth = currentRegion === 2 ? 3 : 5 + next() * 4;
        if (currentRegion === 3) {
          const base = outline(width * 1.3, depth * 1.3, seed + i + layer * 37);
          const peak: Point = [x + width * .2, top, z];
          const snow = new THREE.Color('#b5ccde').lerp(haze, layer * .2);
          for (let j = 0; j < base.length; j++) {
            const k = (j + 1) % base.length;
            const a: Point = [x + base[j][0], -23, z + base[j][1]];
            const b: Point = [x + base[k][0], -23, z + base[k][1]];
            const fraction = (3 + next() * 1.4) / (top + 23);
            const shoulderA = peak.map((v, axis) => v + (a[axis] - v) * fraction) as [number, number, number];
            const shoulderB = peak.map((v, axis) => v + (b[axis] - v) * fraction) as [number, number, number];
            const face = distantPalette[1].clone().multiplyScalar(.84 + next() * .16);
            triangle(distant, peak, shoulderB, shoulderA, snow.clone().multiplyScalar(.85 + next() * .12));
            triangle(distant, shoulderA, b, a, face);
            triangle(distant, shoulderA, shoulderB, b, face);
          }
        } else column(distant, [x, top, z], outline(width, depth, seed + i + layer * 97), 60 + next() * 15,
          distantPalette, seed + i + layer * 73);
        if (currentRegion === 1 && layer === 0 && i % 2 === 0) plant(vegetation, [x, top, z], 2.3, next, 1);
      }
    }
    // Low near spires frame the abyss without masking hooks or landing surfaces.
    for (let i = 0; i < 7; i++) {
      const x = -24 + i * 13, z = -16 - next() * 8, top = -8 + next() * 6;
      column(distant, [x, top, z], outline(1.7, 2.1, seed + i), 36, palette.map(color => color.clone().lerp(new THREE.Color(air.fog), .18)), seed + i);
    }

    addMesh(near, stone, 'sculpted-sandstone-surfaces', true);
    addMesh(details, detailMaterial, 'rock-ribs-chips-and-natural-fixtures');
    addMesh(vegetation, flora, 'clustered-region-vegetation');
    addMesh(distant, farStone, 'layered-atmospheric-terrain');
    addMesh(fractures, detailMaterial, 'discontinuous-cliff-fractures');
    coarseRock.dispose(); pebble.dispose();

    const river = data();
    const riverY = currentRegion === 1 ? terrain === 'islets' ? -5 : -11 : -28;
    ribbon(river, currentRegion === 1 ? terrain === 'islets' ? 10 : 5.4 : 3.5,
      riverY, currentRegion === 1 ? terrain === 'islets' ? -4 : -9 : -24, new THREE.Color('#ffffff'));
    waterMaterial.color.set(currentRegion === 3 ? '#506f9a' : currentRegion === 2 ? '#9c9291' : currentRegion === 1 ? '#35bdb9' : '#4f9bad');
    addMesh(river, waterMaterial, 'river-below-the-route');
    if (currentRegion === 1) {
      const falls = data(), whiteWater = data();
      const fallX = destination.x + 8, fallZ = -19, fallTop = destination.y + 6;
      triangle(falls, [fallX - 2.4, fallTop, fallZ], [fallX + 2.4, -11, fallZ + .7], [fallX + 2.4, fallTop, fallZ], new THREE.Color('#ffffff'));
      triangle(falls, [fallX - 2.4, fallTop, fallZ], [fallX - 2.4, -11, fallZ + .7], [fallX + 2.4, -11, fallZ + .7], new THREE.Color('#ffffff'));
      for (let i = 0; i < 11; i++) {
        const x = fallX - 2.2 + i * .42;
        triangle(whiteWater, [x, fallTop, fallZ + .04], [x + .12, -11, fallZ + .8], [x + .25, fallTop, fallZ + .04], new THREE.Color('#ffffff'));
      }
      waterfall = addMesh(falls, cascadeMaterial, 'oasis-waterfall');
      spray = addMesh(whiteWater, sprayMaterial, 'waterfall-white-streams');
      const bank = data(); column(bank, [fallX, fallTop, fallZ - 3], outline(5, 3.1, seed + 891), 31, palette, seed + 891);
      addMesh(bank, stone, 'waterfall-rock-terrace');
    }

    const centerX = currentStage.origin.x + destination.x * .45;
    const centerY = currentStage.origin.y;
    const centerZ = currentStage.origin.z;
    sky.position.set(centerX, centerY, centerZ);
    stars.position.copy(sky.position); stars.visible = currentRegion === 3;
    skyMaterial.uniforms.top.value.set(air.skyTop);
    skyMaterial.uniforms.bottom.value.set(air.skyBottom);
    skyMaterial.uniforms.horizon.value.set(air.horizon);
    cloudMaterial.color.set(currentRegion === 3 ? '#8497b8' : currentRegion === 2 ? '#ffbf9f' : '#fff9e9');
    cloudMaterial.opacity = currentRegion === 3 ? .37 : .86;
    for (let i = 0; i < cloudPositions.length; i++) {
      const cloud = cloudPositions[i];
      cloudMatrix.position.set(currentStage.origin.x + cloud.x, centerY + cloud.y, centerZ + cloud.z);
      cloudMatrix.scale.set(cloud.size * 1.6, cloud.size * .72, cloud.size);
      cloudMatrix.updateMatrix(); clouds.setMatrixAt(i, cloudMatrix.matrix);
    }
    clouds.instanceMatrix.needsUpdate = true;
    celestial.visible = currentRegion >= 2;
    celestial.position.set(centerX + 55, centerY + (currentRegion === 3 ? 42 : 12), centerZ - 125);
    celestial.scale.setScalar(currentRegion === 3 ? 7 : 9);
    celestialMaterial.color.set(currentRegion === 3 ? '#e4edff' : '#ffdc91');
    const archScale = terrain === 'arch' ? 22 : currentRegion === 3 ? 18 : currentRegion === 2 ? 24 : 22;
    archMount.scale.setScalar(archScale);
    archMount.position.set(
      terrain === 'arch' ? currentStage.origin.x + destination.x + 7 : centerX + (currentRegion === 2 ? -21 : 43),
      centerY + (terrain === 'arch' ? -5 : currentRegion === 3 ? 4 : -3),
      centerZ - (terrain === 'arch' ? 42 : 82));
    archMount.rotation.y = currentRegion === 1 ? -.3 : .15;
    dust.position.copy(active.position);
    dustMaterial.color.set(currentRegion === 3 ? '#c8e0e9' : '#ffe6b5');
  }

  const update = (time: number, landingPulse: number): void => {
    const pulse = THREE.MathUtils.clamp(Number.isFinite(landingPulse) ? landingPulse : 0, 0, 1);
    for (let i = 0; i < dustSeeds.length; i++) {
      const [a, b, c] = dustSeeds[i];
      dustPositions[i * 3] = (a - .5) * (4 + pulse * 2);
      dustPositions[i * 3 + 1] = .1 + ((b + time * .1) % 1) * (1.1 + pulse);
      dustPositions[i * 3 + 2] = (c - .5) * 5;
    }
    dustGeometry.getAttribute('position').needsUpdate = true;
    dustMaterial.opacity = .04 + pulse * .4;
    waterMaterial.emissiveIntensity = .14 + Math.sin(time * .7) * .025;
    cascadeMaterial.opacity = .61 + Math.sin(time * 2) * .04;
    if (waterfall) waterfall.position.z = Math.sin(time * 1.3) * .04;
    if (spray) spray.position.y = Math.sin(time * 3.3) * .12;
  };

  scene.userData.tripoArtLoaded = false;
  const archLoaded = new GLTFLoader().loadAsync(new URL('models/sandstone-arch.glb', document.baseURI).href).then(gltf => {
    const arch = gltf.scene;
    arch.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(arch), size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    arch.position.set(-center.x, -bounds.min.y, -center.z);
    const normalized = new THREE.Group(); normalized.add(arch);
    normalized.scale.setScalar(1 / Math.max(size.x, .001)); archMount.add(normalized);
    arch.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = object.receiveShadow = false;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (material instanceof THREE.MeshStandardMaterial) { material.roughness = 1; material.envMapIntensity = .4; }
      }
    });
  });
  const loaded = Promise.all([archLoaded, stoneLoaded]).then(() => {
    scene.userData.tripoArtLoaded = true;
    scene.userData.stoneTextureLoaded = true;
  });
  setStage(0);
  update(0, 0);
  return { setStage, update, loaded };
}
