/** Geometry-only review. Run: node --import tsx tools/verify-canyon-clearance.mjs.
 * Samples real domain flights against decorative triangles; GLB/textures are
 * skipped here and verified separately in production browser asset checks.
 */
import * as THREE from 'three';
import {createFlowCanyon} from '../src/canyon.ts';
import {STAGES} from '../src/campaign.ts';
import {createFlightState,chooseHook,launchSelected,inspectFlightHook,advanceFlight} from '../src/flight.ts';
globalThis.document={baseURI:'http://localhost:5183/'};
globalThis.fetch=async()=>{throw new Error('geometry review skips GLB')};
THREE.TextureLoader.prototype.loadAsync=async()=>new THREE.Texture();
const scene=new THREE.Scene(),canyon=createFlowCanyon(scene,STAGES);void canyon.loaded.catch(()=>{});
const completed=Array.from({length:12},()=>({completed:true,stars:3,bestTime:10}));
function segmentsDistance(p1,q1,p2,q2){
 const d1=q1.clone().sub(p1),d2=q2.clone().sub(p2),r=p1.clone().sub(p2);
 const a=d1.dot(d1),e=d2.dot(d2),f=d2.dot(r);let s=0,t=0;
 if(a<=1e-12&&e<=1e-12)return p1.distanceToSquared(p2);
 if(a<=1e-12)t=THREE.MathUtils.clamp(f/e,0,1);
 else{const c=d1.dot(r);if(e<=1e-12)s=THREE.MathUtils.clamp(-c/a,0,1);else{const b=d1.dot(d2),den=a*e-b*b;s=den!==0?THREE.MathUtils.clamp((b*f-c*e)/den,0,1):0;t=(b*s+f)/e;if(t<0){t=0;s=THREE.MathUtils.clamp(-c/a,0,1)}else if(t>1){t=1;s=THREE.MathUtils.clamp((b-c)/a,0,1)}}}
 return p1.clone().addScaledVector(d1,s).distanceToSquared(p2.clone().addScaledVector(d2,t));
}
const closest=new THREE.Vector3(),hit=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
function capsuleDistance(a,b,tri){
 const ray=new THREE.Ray(a,up),cross=ray.intersectTriangle(tri.a,tri.b,tri.c,false,hit);
 if(cross&&hit.y<=b.y)return 0;
 let min=tri.closestPointToPoint(a,closest).distanceToSquared(a);
 min=Math.min(min,tri.closestPointToPoint(b,closest).distanceToSquared(b));
 for(const [p,q]of [[tri.a,tri.b],[tri.b,tri.c],[tri.c,tri.a]])min=Math.min(min,segmentsDistance(a,b,p,q));return min;
}
let samples=0,rays=0;const collisions=[],blocked=[];
for(let index=0;index<STAGES.length;index++){
 const stage=STAGES[index];canyon.setStage(index);scene.updateMatrixWorld(true);
 const state=createFlightState({progress:{version:3,currentLevel:stage.level,resumeStage:index,records:completed}});
 const valid=stage.hooks.find(h=>inspectFlightHook(state,h).reachable);chooseHook(state,valid.id);launchSelected(state);
 const path=[{...state.p}];for(let i=0;i<220&&state.mode==='flying';i++){advanceFlight(state,1000/120);path.push({...state.p});}
 const flightBox=new THREE.Box3();for(const p of path){flightBox.expandByPoint(new THREE.Vector3(p.x-.33,p.y,p.z-.33));flightBox.expandByPoint(new THREE.Vector3(p.x+.33,p.y+1.83,p.z+.33));}
 const meshes=[];scene.traverse(o=>{if(o instanceof THREE.Mesh)meshes.push(o)});const triangles=[];
 for(const mesh of meshes){
  if(mesh.isInstancedMesh||!mesh.name||mesh.name==='region-gradient-sky')continue;
  const g=mesh.geometry,p=g.getAttribute('position'),ix=g.index;
  for(let n=0;n<(ix?ix.count:p.count);n+=3){
   const pts=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,ix?ix.getX(n+k):n+k).applyMatrix4(mesh.matrixWorld));
   const ys=pts.map(v=>v.y),flat=Math.max(...ys)-Math.min(...ys)<1e-5;
   if(flat&&(Math.abs(ys[0]-stage.origin.y)<1e-5||Math.abs(ys[0]-stage.landing.y)<1e-5))continue;
   const box=new THREE.Box3().setFromPoints(pts);if(box.intersectsBox(flightBox))triangles.push({tri:new THREE.Triangle(...pts),box,name:mesh.name});
  }
 }
 let recorded=false;
 for(const p of path){samples++;const a=new THREE.Vector3(p.x,p.y+.3,p.z),b=new THREE.Vector3(p.x,p.y+1.52,p.z);const box=new THREE.Box3().setFromPoints([a,b]).expandByScalar(.3);
  for(const item of triangles){if(box.intersectsBox(item.box)&&capsuleDistance(a,b,item.tri)<.3*.3-1e-7){if(!recorded){collisions.push({stage:index,object:item.name,feet:p});recorded=true;}break;}}
 }
 const origin=new THREE.Vector3(stage.origin.x,stage.origin.y+1.05,stage.origin.z);
 for(const hook of stage.hooks){const d=new THREE.Vector3(hook.position.x,hook.position.y,hook.position.z).sub(origin),length=d.length();const hits=new THREE.Raycaster(origin,d.normalize(),.09,length-.09).intersectObjects(meshes,false);rays++;if(hits.length)blocked.push({stage:index,hook:hook.label,name:hits[0].object.name});}
}
console.log(JSON.stringify({stages:STAGES.length,flightSamples:samples,bodyRadius:.3,bodyAxisAboveFeet:[.3,1.52],floorContactExcluded:true,decorativeBodyCollisions:collisions,reachSegments:rays,blockedReachSegments:blocked},null,2));

if (collisions.length || blocked.length) throw new Error('Decorative geometry intersects flight or reach corridor');
