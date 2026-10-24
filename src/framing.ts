import * as THREE from 'three';
import type { FlightStage } from './campaign';

export interface CrossingFrame {
  position: THREE.Vector3;
  focus: THREE.Vector3;
  fov: number;
  offset: { x: number; y: number };
}

/** A finite composition search anchored to a readable foreground athlete.
 * Decoys and landing corners can never force an unbounded camera retreat.
 * Close framing may crop an exceptional ring; the UI supplies an edge cue.
 */
export function frameCrossing(stage: FlightStage, width: number, height: number): CrossingFrame {
  const origin = new THREE.Vector3(stage.origin.x, stage.origin.y, stage.origin.z);
  const narrow = width < 650;
  const foot = { x: width * (narrow ? .23 : .25), y: Math.min(height * .81, height - (narrow ? 146 : 118)) };
  const camera = new THREE.PerspectiveCamera(58, width / height, .1, 350);
  const head = origin.clone().add(new THREE.Vector3(0, 1.8, 0));
  const points = stage.hooks.flatMap(h => [
    { p: new THREE.Vector3(h.position.x, h.position.y, h.position.z), weight: 4 },
    { p: new THREE.Vector3(h.position.x, origin.y + 1.05, h.position.z), weight: 1 },
  ]);
  points.push({ p: new THREE.Vector3(stage.landing.x, stage.landing.y, stage.landing.z), weight: 3 });
  const project = (p: THREE.Vector3) => {
    const q = p.clone().project(camera);
    return { x: (q.x + 1) * width / 2, y: (1 - q.y) * height / 2, z: q.z };
  };
  let best: CrossingFrame | undefined, bestScore = Infinity;
  for (const back of [5, 7, 9, 11, 13]) for (const side of [1, 3, 5, 8, 11]) {
    for (const up of [6, 7.5, 9]) for (const focusY of [2, 4, 6, 8, 10]) for (const fov of [50, 58, 66, 74, 78]) {
      camera.clearViewOffset(); camera.fov = fov; camera.updateProjectionMatrix();
      camera.position.copy(origin).add(new THREE.Vector3(-back, up, side));
      const focus = origin.clone().add(new THREE.Vector3(4, focusY, 0));
      camera.lookAt(focus); camera.updateMatrixWorld();
      const raw = project(origin), offset = { x: raw.x - foot.x, y: raw.y - foot.y };
      camera.setViewOffset(width, height, offset.x, offset.y, width, height);
      const projectedHead = project(head), size = foot.y - projectedHead.y;
      if (size < height * .132 || size > height * .25 || projectedHead.z > 1) continue;
      let score = Math.abs(size - height * .18) * .12 + (fov - 50) * .08 + side * .12;
      for (const { p, weight } of points) {
        const q = project(p), top = narrow ? 140 : 112, bottom = height - (narrow ? 130 : 110);
        score += Math.max(0, 34 - q.x, q.x - width + 34, top - q.y, q.y - bottom) * weight;
        if (q.z > 1 || q.z < -1) score += 10000;
      }
      const landing = project(points[points.length - 1].p);
      if (landing.x < 42 || landing.x > width - 42 || landing.y < 120 || landing.y > height - (narrow ? 160 : 130)) score += 20000;
      score += Math.max(0, width * (narrow ? .43 : .62) - landing.x) * .8;
      score += Math.abs(landing.x - width * (narrow ? .68 : .76)) * .035;
      const incidence = Math.atan2(camera.position.y - stage.landing.y, Math.hypot(camera.position.x - stage.landing.x, camera.position.z - stage.landing.z));
      score += Math.max(0, .21 - incidence) * 400;
      // Favour a side-quarter view when equally readable, rather than a tunnel.
      score += Math.max(0, back - side * 1.8) * .25;
      if (score < bestScore) {
        bestScore = score;
        best = { position: camera.position.clone(), focus, fov, offset };
      }
    }
  }
  // The fixed candidate set always has a readable athlete; this is only a
  // defensive fallback for an invalid/zero-size embedding viewport.
  return best ?? { position: origin.clone().add(new THREE.Vector3(-7, 3.5, 8)), focus: origin.clone().add(new THREE.Vector3(4, 5, 0)), fov: 58, offset: { x: 0, y: 0 } };
}
