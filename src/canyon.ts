import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

type Point = readonly [number, number, number];
type OutlinePoint = readonly [number, number];
type GeometryData = { positions: number[]; colors: number[]; uvs: number[] };

export type FlowCanyon = {
  setStage: (index: number) => void;
  update: (time: number, landingPulse: number) => void;
  loaded: Promise<void>;
};

// These are visual surfaces only. Flight state owns the matching safe rectangles.
const PADS: readonly Point[] = [[0, 0, 0], [15, 1, 0], [30, 2, 0], [46, 5, 0]];
const SEDIMENT = ['#bd6b49', '#d58b59', '#a7553d'].map(color => new THREE.Color(color));
const SAND = new THREE.Color('#edc08b');
const HAZE = new THREE.Color('#83a5bd');

// Every corner of the authoritative +/-4 by +/-5 safe rectangle lies inside
// this slightly larger, chamfered perimeter. The entire top stays exactly flat.
const LEDGE_OUTLINE: readonly OutlinePoint[] = [
  [-4.7, -4.8], [-3.8, -5.65], [2.7, -5.6], [4.5, -4.8],
  [4.8, -3], [4.65, 4.4], [3.9, 5.65], [2, 5.8],
  [-3.7, 5.6], [-4.7, 4.7], [-4.9, 1], [-4.85, -2.5],
];

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function geometryData(): GeometryData {
  return { positions: [], colors: [], uvs: [] };
}

function triangle(data: GeometryData, a: Point, b: Point, c: Point, color: THREE.Color): void {
  const top = Math.abs(a[1] - b[1]) < .001 && Math.abs(a[1] - c[1]) < .001;
  const alongX = Math.abs(a[0] - b[0]) + Math.abs(a[0] - c[0]) >
    Math.abs(a[2] - b[2]) + Math.abs(a[2] - c[2]);
  for (const point of [a, b, c]) {
    data.positions.push(...point);
    data.colors.push(color.r, color.g, color.b);
    data.uvs.push((top || alongX ? point[0] : point[2]) * .19, (top ? point[2] : point[1]) * .19);
  }
}

function buildGeometry(data: GeometryData): THREE.BufferGeometry {
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  result.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3));
  result.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
  result.computeVertexNormals();
  result.computeBoundingSphere();
  return result;
}

/** Low-contrast grain, shared by every procedural rock, without external textures. */
function rockTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d')!;
  const pixels = context.createImageData(128, 128);
  const next = random(3721);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const index = (y * 128 + x) * 4;
      const strata = Math.sin(y * .38 + Math.sin(x * .047) * .6) * 2.5;
      const grain = 239 + Math.floor(next() * 13) + strata;
      pixels.data[index] = grain;
      pixels.data[index + 1] = grain;
      pixels.data[index + 2] = grain;
      pixels.data[index + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 2;
  return texture;
}

function rockMaterial(map: THREE.Texture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: '#ffffff', map, vertexColors: true, roughness: 1, metalness: 0,
  });
}

function appendColumn(
  data: GeometryData,
  center: Point,
  outline: readonly OutlinePoint[],
  levels: readonly { depth: number; scale: number }[],
  palette: readonly THREE.Color[],
  topColor: THREE.Color,
  seed: number,
): void {
  const next = random(seed);
  const rings = levels.map((level, levelIndex) => outline.map(([x, z], index): Point => {
    const wobble = levelIndex === 0 ? 1 : 1 + Math.sin(index * 2.73 + levelIndex * 1.91 + seed) * .035;
    const drift = levelIndex === 0 ? 0 : Math.sin(levelIndex * .8 + seed) * .16;
    return [center[0] + x * level.scale * wobble + drift,
      center[1] - level.depth, center[2] + z * level.scale * wobble];
  }));
  const topCenter: Point = [center[0], center[1], center[2]];
  for (let i = 0; i < outline.length; i++) {
    const j = (i + 1) % outline.length;
    const capColor = topColor.clone().multiplyScalar(.96 + next() * .075);
    triangle(data, topCenter, rings[0][j], rings[0][i], capColor);
  }
  for (let band = 0; band < rings.length - 1; band++) {
    const bandColor = band === 0 ? topColor : palette[(Math.floor(band / 2) + seed) % palette.length];
    for (let i = 0; i < outline.length; i++) {
      const j = (i + 1) % outline.length;
      const isThinSeam = band > 0 && band % 2 === 0;
      const facetColor = bandColor.clone().multiplyScalar((isThinSeam ? .83 : .94) + next() * .1);
      triangle(data, rings[band][i], rings[band][j], rings[band + 1][i], facetColor);
      triangle(data, rings[band][j], rings[band + 1][j], rings[band + 1][i], facetColor);
    }
  }
}

const LEDGE_LEVELS = [
  { depth: 0, scale: 1 }, { depth: .23, scale: 1.02 },
  { depth: 1.2, scale: .96 }, { depth: 1.4, scale: 1 },
  { depth: 3.3, scale: .91 }, { depth: 3.5, scale: .95 },
  { depth: 6.1, scale: .84 }, { depth: 6.35, scale: .88 },
  { depth: 9.8, scale: .81 }, { depth: 10.1, scale: .85 },
  { depth: 15, scale: .74 }, { depth: 15.3, scale: .78 },
  { depth: 23, scale: .7 }, { depth: 37, scale: .65 },
];

function appendPrimitive(data: GeometryData, source: THREE.BufferGeometry,
  position: Point, scale: Point, color: THREE.Color, angle = 0): void {
  const primitive = source.index ? source.toNonIndexed() : source;
  const positions = primitive.getAttribute('position');
  const transform = new THREE.Matrix4().compose(
    new THREE.Vector3(...position),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle),
    new THREE.Vector3(...scale),
  );
  const point = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i).applyMatrix4(transform);
    data.positions.push(point.x, point.y, point.z);
    data.colors.push(color.r, color.g, color.b);
    data.uvs.push(point.x * .19, point.z * .19);
  }
  if (primitive !== source) primitive.dispose();
}

function appendBrush(data: GeometryData, x: number, y: number, z: number,
  size: number, next: () => number): void {
  const leaf = new THREE.IcosahedronGeometry(1, 0);
  const stem = new THREE.CylinderGeometry(.025, .045, .55, 4);
  const green = new THREE.Color('#79804d');
  const golden = new THREE.Color('#b19b5f');
  appendPrimitive(data, stem, [x, y + size * .23, z], [size, size, size], new THREE.Color('#77664b'));
  for (let i = 0; i < 5; i++) {
    const angle = i / 5 * Math.PI * 2 + next();
    appendPrimitive(data, leaf,
      [x + Math.cos(angle) * size * .24, y + size * (.28 + next() * .23), z + Math.sin(angle) * size * .24],
      [size * .32, size * (.2 + next() * .16), size * .3],
      green.clone().lerp(golden, next() * .4), angle);
  }
  leaf.dispose();
  stem.dispose();
}

function padDecoration(center: Point, seed: number): THREE.BufferGeometry {
  const data = geometryData();
  const next = random(seed);
  const stone = new THREE.IcosahedronGeometry(1, 0);
  // Decoration lives beyond the physical safe rectangle, never on a landing.
  for (const [x, z, size] of [[-2.8, 5.32, .65], [2.1, -5.24, .46], [-4.42, -2.5, .45]]) {
    appendBrush(data, center[0] + x, center[1], center[2] + z, size, next);
  }
  for (let i = 0; i < 8; i++) {
    const x = -3.3 + next() * 6.6;
    const z = (i % 2 ? -1 : 1) * (5.13 + next() * .2);
    const size = .07 + next() * .15;
    appendPrimitive(data, stone, [center[0] + x, center[1] + size * .28, center[2] + z],
      [size * 1.6, size * .72, size], SEDIMENT[i % 3].clone().lerp(SAND, .15), next() * Math.PI);
  }
  stone.dispose();
  return buildGeometry(data);
}

function mesaOutline(width: number, depth: number, seed: number): OutlinePoint[] {
  const next = random(seed);
  return Array.from({ length: 10 }, (_, i) => {
    const angle = i / 10 * Math.PI * 2;
    const radius = .88 + next() * .18;
    return [Math.cos(angle) * width * radius, Math.sin(angle) * depth * radius];
  });
}

function backdropGeometry(): { cliffs: THREE.BufferGeometry; vegetation: THREE.BufferGeometry } {
  const cliffs = geometryData();
  const vegetation = geometryData();
  const next = random(7219);
  // Two receding shelves create depth without surrounding the player with walls.
  for (let layer = 0; layer < 2; layer++) {
    for (let i = 0; i < 12; i++) {
      const x = -47 + i * 13 + (next() - .5) * 4;
      const z = -35 - layer * 32 - next() * 7;
      // An orthographic quarter view projects remote terrain upwards. Lowering
      // the shelves with distance leaves a blue skyline above the action.
      const top = (layer === 0 ? -22 : -42) + next() * (layer === 0 ? 13 : 19);
      const width = 1.8 + next() * 2;
      const depth = 3.5 + next() * 3.5;
      const fogMix = layer === 0 ? .6 : .8;
      const palette = SEDIMENT.map(color => color.clone().lerp(HAZE, fogMix));
      appendColumn(cliffs, [x, top, z], mesaOutline(width, depth, i * 41 + layer * 401), [
        { depth: 0, scale: .8 }, { depth: 1, scale: .88 },
        { depth: 5, scale: .85 }, { depth: 5.4, scale: .94 },
        { depth: 12, scale: .92 }, { depth: 12.5, scale: 1 },
        { depth: 23, scale: .94 }, { depth: 23.6, scale: 1.09 },
        { depth: 47, scale: 1.13 }, { depth: 63, scale: 1.28 },
      ], palette, SAND.clone().lerp(HAZE, fogMix + .05), 83 + i + layer * 9);
      if (layer === 0 && i % 2 === 0) {
        appendBrush(vegetation, x - 1, top, z + 1, .8 + next() * .6, next);
      }
    }
  }
  // Slender eroded spires break up the broad silhouettes on the lower canyon floor.
  for (let i = 0; i < 7; i++) {
    const x = -30 + i * 17;
    const z = -17 - next() * 6;
    const top = -12 + next() * 8;
    const palette = SEDIMENT.map(color => color.clone().lerp(HAZE, .43));
    appendColumn(cliffs, [x, top, z], mesaOutline(1.3 + next() * 1.2, 2.4, i + 490), [
      { depth: 0, scale: .67 }, { depth: .6, scale: .78 },
      { depth: 3, scale: .74 }, { depth: 3.25, scale: .84 },
      { depth: 9, scale: .92 }, { depth: 9.4, scale: 1.02 },
      { depth: 24, scale: 1.35 }, { depth: 32, scale: 1.5 },
    ], palette, SAND.clone().lerp(HAZE, .46), i + 16);
  }
  return { cliffs: buildGeometry(cliffs), vegetation: buildGeometry(vegetation) };
}

function riverGeometry(width: number, y: number): THREE.BufferGeometry {
  const data = geometryData();
  const color = new THREE.Color('#ffffff');
  const sections = 40;
  const points = Array.from({ length: sections + 1 }, (_, i) => {
    const x = -100 + i * 7;
    return { x, z: -3 + Math.sin(x * .035) * 5 + Math.sin(x * .08) * 1.1 };
  });
  for (let i = 0; i < sections; i++) {
    const a = points[i];
    const b = points[i + 1];
    triangle(data, [a.x, y, a.z - width], [b.x, y, b.z + width], [b.x, y, b.z - width], color);
    triangle(data, [a.x, y, a.z - width], [a.x, y, a.z + width], [b.x, y, b.z + width], color);
  }
  return buildGeometry(data);
}

/**
 * Graphic sandstone environment for the three-flight pilot. All positions are
 * decorative, except that visible pad tops agree exactly with the authored feet
 * heights. This module never adds colliders, fixtures, landing marks or cameras.
 */
export function createFlowCanyon(scene: THREE.Scene): FlowCanyon {
  const root = new THREE.Group();
  root.name = 'flow-canyon';
  scene.add(root);
  const grain = rockTexture();
  const stoneMaterial = rockMaterial(grain);
  const foliageMaterial = rockMaterial(grain);
  const pads = PADS.map((center, index) => {
    const group = new THREE.Group();
    group.name = `flow-ledge-${index}`;
    const data = geometryData();
    appendColumn(data, center, LEDGE_OUTLINE, LEDGE_LEVELS, SEDIMENT, SAND, index + 12);
    const ledge = new THREE.Mesh(buildGeometry(data), stoneMaterial);
    ledge.name = `safe-top-y-${center[1]}`;
    ledge.receiveShadow = true;
    // The sun lights baked facets; long columns do not need shadow-map passes.
    ledge.castShadow = false;
    group.add(ledge, new THREE.Mesh(padDecoration(center, 390 + index), foliageMaterial));
    root.add(group);
    return group;
  });

  const backdrop = backdropGeometry();
  const backdropMaterial = new THREE.MeshBasicMaterial({
    map: grain, vertexColors: true, toneMapped: false,
  });
  const farCliffs = new THREE.Mesh(backdrop.cliffs, backdropMaterial);
  farCliffs.name = 'hazy-sandstone-mesas';
  root.add(farCliffs, new THREE.Mesh(backdrop.vegetation, foliageMaterial));

  const riverBank = new THREE.Mesh(riverGeometry(4.5, -37.2),
    new THREE.MeshStandardMaterial({ color: '#bda483', roughness: 1 }));
  const riverMaterial = new THREE.MeshStandardMaterial({
    color: '#4e95aa', roughness: .45, metalness: .08,
    emissive: '#284d5b', emissiveIntensity: .2,
  });
  const river = new THREE.Mesh(riverGeometry(3.15, -37.16), riverMaterial);
  river.name = 'distant-canyon-river';
  root.add(riverBank, river);

  const dustNext = random(935);
  const dustPositions = new Float32Array(30 * 3);
  const dustSeeds = Array.from({ length: 30 }, () => [dustNext(), dustNext(), dustNext()]);
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMaterial = new THREE.PointsMaterial({
    color: '#ffe7be', size: .045, transparent: true, opacity: .08, depthWrite: false,
    sizeAttenuation: true,
  });
  const dust = new THREE.Points(dustGeometry, dustMaterial);
  dust.name = 'landing-dust';
  dust.frustumCulled = false;
  root.add(dust);

  let stage = 0;
  const setStage = (index: number): void => {
    stage = THREE.MathUtils.clamp(Math.floor(Number.isFinite(index) ? index : 0), 0, PADS.length - 1);
    pads.forEach((pad, padIndex) => { pad.visible = padIndex === stage || padIndex === stage + 1; });
  };
  const update = (time: number, landingPulse: number): void => {
    const pulse = THREE.MathUtils.clamp(landingPulse, 0, 1);
    const center = PADS[stage];
    for (let i = 0; i < dustSeeds.length; i++) {
      const [a, b, c] = dustSeeds[i];
      dustPositions[i * 3] = center[0] + (a - .5) * (5 + pulse);
      dustPositions[i * 3 + 1] = center[1] + .08 + ((b + time * .08) % 1) * (.5 + pulse);
      dustPositions[i * 3 + 2] = center[2] + (c - .5) * 6;
    }
    dustGeometry.getAttribute('position').needsUpdate = true;
    dustMaterial.opacity = .055 + pulse * .32;
    riverMaterial.emissiveIntensity = .19 + Math.sin(time * .55) * .025;
  };
  setStage(0);
  update(0, 0);

  scene.userData.tripoArtLoaded = false;
  const loaded = new GLTFLoader().loadAsync(new URL('models/sandstone-arch.glb', document.baseURI).href)
    .then(gltf => {
      const arch = gltf.scene;
      arch.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(arch);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      arch.position.set(-center.x, -bounds.min.y, -center.z);
      const mount = new THREE.Group();
      mount.name = 'original-tripo-distant-arch';
      mount.add(arch);
      mount.scale.setScalar(8 / Math.max(size.x, .001));
      mount.position.set(24, -22, -57);
      mount.rotation.y = .12;
      arch.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = false;
        object.receiveShadow = false;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const original of materials) {
          const material = original as THREE.MeshStandardMaterial;
          if (material.color) material.color.lerp(HAZE, .27);
          material.roughness = 1;
          material.envMapIntensity = .35;
          material.transparent = true;
          material.opacity = .64;
          material.depthWrite = false;
        }
      });
      root.add(mount);
      scene.userData.tripoArtLoaded = true;
    });

  return { setStage, update, loaded };
}
