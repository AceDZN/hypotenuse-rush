import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** All generated assets are decoration. The game owns measured primitives and colliders. */
const loader = new GLTFLoader();
const assetUrl = (name: string) => new URL(`models/${name}`, document.baseURI).href;
const material = (color: THREE.ColorRepresentation, roughness = .8) => new THREE.MeshStandardMaterial({ color, roughness });
const coral = material('#ef6549');
const cream = material('#fff1d6');
const charcoal = material('#223746');
const skin = material('#b77b56');
const sole = material('#d5d1bb');

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
  const upper = joint(arm ? `arm${side}` : `leg${side}`, side * (arm ? .25 : .115), arm ? .39 : 0, 0, parent);
  const a = arm ? .27 : .39;
  const b = arm ? .26 : .38;
  rounded(upper, arm ? [.13, a, .13] : [.17, a, .17], [0, -a / 2, 0], arm ? coral : charcoal);
  const lower = joint(arm ? `elbow${side}` : `knee${side}`, 0, -a, 0, upper);
  rounded(lower, arm ? [.105, b, .105] : [.135, b, .135], [0, -b / 2, 0], arm ? skin : charcoal);
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
  const hips = joint('hips', 0, .86, 0, root);
  const torso = joint('torso', 0, 0, 0, hips);
  rounded(torso, [.43, .5, .26], [0, .27, 0], coral);
  rounded(torso, [.35, .17, .26], [0, .01, 0], charcoal);
  const harness = mesh(new THREE.BoxGeometry(.42, .065, .285), cream, torso);
  harness.position.set(0, .085, 0);
  for (const side of [-1, 1]) {
    const strap = mesh(new THREE.BoxGeometry(.045, .40, .281), charcoal, torso);
    strap.position.set(side * .12, .27, 0);
    strap.rotation.z = side * -.14;
  }
  const buckle = mesh(new THREE.BoxGeometry(.10, .095, .035), cream, torso);
  buckle.position.set(0, .10, .155);
  const head = joint('head', 0, .66, .008, torso);
  const face = mesh(new THREE.SphereGeometry(.16, 12, 8), skin, head);
  face.scale.set(.87, 1.05, .93);
  const hair = mesh(new THREE.SphereGeometry(.165, 10, 6, 0, Math.PI * 2, 0, Math.PI * .52), charcoal, head);
  hair.position.y = .025;
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
}

/** Place the original Tripo arch on the distant, noncolliding canyon rim. */
export async function addTripoArt(scene: THREE.Scene): Promise<void> {
  const gltf = await loader.loadAsync(assetUrl('sandstone-arch.glb'));
  const template = normalized(gltf.scene, 28);
  const placements: [number, number, number, number, number][] = [
    [22, -10, -34, -.22, 1], [79, -14, -39, .18, 1.35], [15, -14, 23, 2.9, .82],
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
