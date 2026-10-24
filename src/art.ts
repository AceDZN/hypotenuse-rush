import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** All generated assets are decoration. The game owns measured primitives and colliders. */
const loader = new GLTFLoader();
const assetUrl = (name: string) => new URL(`models/${name}`, document.baseURI).href;
const material = (color: THREE.ColorRepresentation, roughness = .8) => new THREE.MeshStandardMaterial({ color, roughness });
const coral = material('#ef6549');
const cream = material('#fff1d6');
const charcoal = material('#223746');
const skin = material('#b77b56');
const sole = material('#d5d1bb');
const shirt = material('#263d51');
const trousers = material('#8e8069');
const lens = material('#9fcbd0', .35);
const athleteMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .82 });

function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, name?: string): THREE.Mesh {
  const object = new THREE.Mesh(geometry, mat);
  object.name = name ?? '';
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}
function rounded(parent: THREE.Object3D, size: [number, number, number], position: [number, number, number], mat: THREE.Material) {
  const object = mesh(new THREE.CapsuleGeometry(.5, .5, 3, 6), mat, parent);
  object.scale.set(size[0], size[1] / 1.5, size[2]);
  object.position.set(...position);
  return object;
}
function joint(name: string, x: number, y: number, z: number, parent: THREE.Object3D) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}
function limb(parent: THREE.Object3D, side: number, arm: boolean) {
  const upper = joint(arm ? `arm${side}` : `leg${side}`, side * (arm ? .28 : .13), arm ? .46 : 0, 0, parent);
  const a = arm ? .29 : .39;
  const b = arm ? .26 : .38;
  rounded(upper, arm ? [.13, a, .13] : [.17, a, .17], [0, -a / 2, 0], arm ? shirt : trousers);
  const lower = joint(arm ? `elbow${side}` : `knee${side}`, 0, -a, 0, upper);
  rounded(lower, arm ? [.105, b, .105] : [.135, b, .135], [0, -b / 2, 0], arm ? skin : trousers);
  if (arm) {
    rounded(lower, [.11, .12, .105], [0, -b, 0], charcoal);
    // Light wrist reel is visibly equipment, never the measurement origin.
    const reel = mesh(new THREE.CylinderGeometry(.065, .065, .04, 8), cream, lower);
    reel.rotation.z = Math.PI / 2;
    reel.position.set(side * .06, -.21, .025);
  } else {
    rounded(lower, [.17, .13, .29], [0, -b + .035, .065], cream);
    const tread = mesh(new THREE.BoxGeometry(.18, .04, .3), sole, lower);
    tread.position.set(0, -b - .02, .065);
    const stripe = mesh(new THREE.BoxGeometry(.183, .028, .15), coral, lower);
    stripe.position.set(0, -b + .04, .10);
  }
  return upper;
}

let helmetTemplate: Promise<THREE.Object3D> | undefined;

/** Merge rigid parts within a joint while retaining every animated transform. */
function batchAthleteJoints(root: THREE.Group): void {
  const joints: THREE.Group[] = [];
  root.traverse(object => { if (object instanceof THREE.Group) joints.push(object); });
  for (const parent of joints) {
    const pieces = parent.children.filter((object): object is THREE.Mesh =>
      object instanceof THREE.Mesh && object.name !== 'temporaryHelmet' && !object.name.startsWith('authoritative'));
    if (pieces.length < 2) continue;
    const geometries = pieces.map(piece => {
      piece.updateMatrix();
      const source = piece.geometry.index ? piece.geometry.toNonIndexed() : piece.geometry.clone();
      source.applyMatrix4(piece.matrix);
      const count = source.getAttribute('position').count;
      const color = (piece.material as THREE.MeshStandardMaterial).color;
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) { colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b; }
      source.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      if (!source.getAttribute('uv')) source.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
      return source;
    });
    const merged = mergeGeometries(geometries, false);
    if (merged) {
      for (const piece of pieces) { parent.remove(piece); piece.geometry.dispose(); }
      mesh(merged, athleteMaterial, parent, `${parent.name || 'root'}-rigid-parts`);
    }
    for (const source of geometries) source.dispose();
  }
}
function normalized(object: THREE.Object3D, width: number): THREE.Group {
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const wrapper = new THREE.Group();
  object.position.sub(center);
  wrapper.add(object);
  wrapper.scale.setScalar(width / Math.max(size.x, size.z, .001));
  wrapper.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
  return wrapper;
}

/** Articulated human silhouette; feet local y=0, faces +Z, height 1.78 m. */
export function createAthlete(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'athlete';
  // The measurement marker is fixed to the authoritative root P=(0,1.05,0),
  // independently of torso lean and running hip bob. The ring surrounds P.
  const harnessMarker = mesh(new THREE.TorusGeometry(.185, .018, 5, 12), cream, root, 'authoritativeHarnessMarker');
  harnessMarker.rotation.x = Math.PI / 2;
  harnessMarker.position.set(0, 1.05, 0);
  const clip = mesh(new THREE.SphereGeometry(.042, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff1d6', depthTest: false, depthWrite: false }), root, 'authoritativeHarnessClip');
  clip.position.set(0, 1.05, 0);
  clip.renderOrder = 5;
  const hips = joint('hips', 0, .86, 0, root);
  const torso = joint('torso', 0, 0, 0, hips);
  rounded(torso, [.5, .55, .30], [0, .29, 0], shirt);
  rounded(torso, [.35, .17, .26], [0, .01, 0], charcoal);
  const harness = mesh(new THREE.BoxGeometry(.42, .065, .285), cream, torso);
  harness.position.set(0, .085, 0);
  for (const side of [-1, 1]) {
    const strap = mesh(new THREE.BoxGeometry(.045, .40, .281), charcoal, torso);
    strap.position.set(side * .12, .27, 0);
    const shoulderTab = mesh(new THREE.BoxGeometry(.09, .055, .27), coral, torso);
    shoulderTab.position.set(side * .17, .47, 0);
    strap.rotation.z = side * -.14;
  }
  const buckle = mesh(new THREE.BoxGeometry(.10, .095, .035), cream, torso);
  buckle.position.set(0, .10, .155);
  const hipClip = mesh(new THREE.TorusGeometry(.08, .018, 5, 10), coral, torso);
  hipClip.position.set(.22, .015, .09);
  const reelHousing = mesh(new THREE.CylinderGeometry(.065, .065, .055, 10), charcoal, torso);
  reelHousing.rotation.x = Math.PI / 2;
  reelHousing.position.set(-.21, .10, .1);
  const head = joint('head', 0, .66, .008, torso);
  rounded(head, [.17, .19, .17], [0, -.14, 0], skin);
  const face = mesh(new THREE.SphereGeometry(.16, 12, 8), skin, head);
  face.scale.set(.87, 1.05, .93);
  const hair = mesh(new THREE.SphereGeometry(.165, 10, 6, 0, Math.PI * 2, 0, Math.PI * .52), charcoal, head);
  hair.position.y = .025;
  const goggles = mesh(new THREE.BoxGeometry(.29, .082, .045), charcoal, head);
  goggles.position.set(0, .014, .145);
  for (const side of [-1, 1]) {
    const glass = mesh(new THREE.BoxGeometry(.105, .047, .012), lens, head);
    glass.position.set(side * .069, .016, .173);
    const ear = mesh(new THREE.SphereGeometry(.044, 7, 5), skin, head);
    ear.position.set(side * .147, -.012, 0);
  }
  const scarf = mesh(new THREE.TorusGeometry(.16, .043, 5, 12), coral, head);
  scarf.rotation.x = Math.PI / 2; scarf.position.y = -.14;
  const scarfTail = joint('scarfTail', 0, .49, -.14, torso);
  const cloth = new THREE.BufferGeometry();
  cloth.setAttribute('position', new THREE.Float32BufferAttribute([
    -.1, 0, 0, .1, 0, 0, .065, -.2, -.28,
    -.1, 0, 0, .065, -.2, -.28, -.045, -.17, -.33,
    .065, -.2, -.28, .1, 0, -.018, -.1, 0, -.018,
    -.045, -.17, -.33, .065, -.2, -.28, -.1, 0, -.018,
  ], 3));
  cloth.computeVertexNormals(); mesh(cloth, coral, scarfTail);
  const temporaryHelmet = mesh(new THREE.SphereGeometry(.18, 12, 7, 0, Math.PI * 2, 0, Math.PI * .51), coral, head, 'temporaryHelmet');
  temporaryHelmet.position.y = .035;
  const helmetMount = joint('helmetMount', 0, .10, 0, head);
  helmetTemplate ??= loader.loadAsync(assetUrl('runner-helmet.glb')).then(g => normalized(g.scene, .39));
  helmetTemplate.then(template => {
    helmetMount.add(template.clone(true));
    temporaryHelmet.visible = false;
    root.userData.tripoHelmetLoaded = true;
  }).catch(() => { root.userData.tripoHelmetLoaded = false; });
  limb(torso, -1, true); limb(torso, 1, true);
  limb(hips, -1, false); limb(hips, 1, false);
  batchAthleteJoints(root);
  root.userData.tripoHelmetLoaded = false;
  return root;
}

export type AthleteMotion = {
  time: number;
  speed: number;
  grounded: boolean;
  grappling: boolean;
  verticalVelocity: number;
  lean?: number;
  reducedMotion?: boolean;
};

/** Joint poses express footfalls, aerial tuck, reach and release without claiming a generated rig. */
export function animateAthlete(group: THREE.Group, info: AthleteMotion): void {
  const get = (name: string) => group.getObjectByName(name)!;
  const power = Math.min(info.speed / 9, 1);
  const phase = info.time * (10 + power * 4);
  const stride = Math.sin(phase) * power;
  const hips = get('hips');
  hips.position.y = .86 + (info.grounded && !info.reducedMotion ? Math.abs(Math.sin(phase)) * .025 * power : 0);
  get('torso').rotation.set(info.grappling ? -.12 : info.grounded ? .10 * power : -.09, 0, -(info.lean ?? 0) * .14);
  for (const side of [-1, 1]) {
    const leg = get(`leg${side}`);
    const knee = get(`knee${side}`);
    const arm = get(`arm${side}`);
    const elbow = get(`elbow${side}`);
    if (info.grounded) {
      leg.rotation.x = side * stride * .78;
      knee.rotation.x = Math.max(0, -side * stride) * .95;
      arm.rotation.set(-side * stride * .7 - .15, 0, -side * .09);
      elbow.rotation.x = -.55 - Math.max(0, side * stride) * .35;
    } else {
      leg.rotation.x = -.34 + side * .18;
      knee.rotation.x = .65 + (info.verticalVelocity < 0 ? .18 : 0);
      arm.rotation.set(info.grappling ? -2.65 : -1.1 - side * .12, 0, -side * (info.grappling ? .15 : .65));
      elbow.rotation.x = info.grappling ? -.10 : -.45;
    }
  }
  get('head').rotation.x = info.grappling ? -.18 : 0;
  get('scarfTail').rotation.x = info.reducedMotion ? 0 : .1 + Math.sin(info.time * (info.grounded ? 6 : 11)) * (info.grounded ? .05 : .14);
}

/** Place the original Tripo arch on the distant, noncolliding canyon rim. */
export async function addTripoArt(scene: THREE.Scene): Promise<void> {
  const gltf = await loader.loadAsync(assetUrl('sandstone-arch.glb'));
  const template = normalized(gltf.scene, 28);
  // Distant decorative arches never need a dynamic shadow-map pass.
  template.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = false; o.receiveShadow = false; } });
  const placements: [number, number, number, number, number][] = [
    [22, 7, -34, -.22, 1], [79, 9, -39, .18, 1.35], [15, 5, 23, 2.9, .82],
    [160, 9, -29, .05, 1.18], [240, 9, 31, 3.08, 1.1], [310, 11, -34, -.2, 1.25],
  ];
  const group = new THREE.Group();
  group.name = 'tripo-canyon-art';
  for (const [x, y, z, angle, scale] of placements) {
    const arch = template.clone(true);
    arch.position.set(x, y, z);
    arch.rotation.y = angle;
    arch.scale.multiplyScalar(scale);
    group.add(arch);
  }
  scene.add(group);
  scene.userData.tripoArtLoaded = true;
}

/** Local, seeded rock grain; texture is decoration and never changes the authored surface. */
export function createSandstoneMaterial(color: THREE.ColorRepresentation = '#b96740'): THREE.MeshStandardMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d')!;
  const pixels = context.createImageData(512, 512);
  let seed = 61243;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let y = 0; y < 512; y++) {
    const strata = Math.sin(y * .19) * 8 + Math.sin(y * .049) * 12;
    for (let x = 0; x < 512; x++) {
      const p = (y * 512 + x) * 4;
      const grain = random();
      const v = 218 + strata + (grain - .5) * 34 - (grain < .015 ? 70 : 0);
      pixels.data[p] = v;
      pixels.data[p + 1] = v * .95;
      pixels.data[p + 2] = v * .88;
      pixels.data[p + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  context.strokeStyle = 'rgba(83,49,32,.25)';
  context.lineWidth = 1;
  for (let i = 0; i < 24; i++) {
    const x = random() * 512, y = random() * 512;
    context.beginPath(); context.moveTo(x, y);
    context.lineTo(x + 18 + random() * 100, y + random() * 4 - 2); context.stroke();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(3, 2);
  map.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ color, map, roughness: .96, metalness: 0, bumpMap: map, bumpScale: .045 });
}
