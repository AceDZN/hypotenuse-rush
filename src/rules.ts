export type V = {x:number;y:number;z:number};
export type Box = {id:string;min:V;max:V};
export type Anchor = {id:string;label:string;p:V;section:number};
export const FIXED=1/120, REACH_EPS=1e-7, SKIN=.002, RADIUS=.32, HEIGHT=1.8;
export const vec=(x=0,y=0,z=0):V=>({x,y,z});
export const add=(a:V,b:V):V=>vec(a.x+b.x,a.y+b.y,a.z+b.z);
export const sub=(a:V,b:V):V=>vec(a.x-b.x,a.y-b.y,a.z-b.z);
export const mul=(a:V,n:number):V=>vec(a.x*n,a.y*n,a.z*n);
export const length=(a:V)=>Math.hypot(a.x,a.y,a.z);
export const unit=(a:V)=>mul(a,1/(length(a)||1));
const platform=(id:string,x1:number,x2:number,y:number,z1:number,z2:number):Box=>({id,min:vec(x1,-28,z1),max:vec(x2,y,z2)});
export const COURSE={
 boxes:[platform('start',-19,3,0,-7,7),platform('ridge',8,29,1,-8,8),platform('safe',36,70,2,-9,1),platform('shortcut',34,60,3,4.8,8.5),platform('merge',66,91,2,-9,9),platform('bend',99,126,3,-4,10),platform('approach',134,166,2,-9,3),platform('high',171,205,5,-7,7),platform('upper',213,244,6,-5,10),platform('spatial',243,271,9,-2,11),platform('flow',279,310,9,-5,11),platform('finish',318,355,9,-7,11),{id:'obstruction',min:vec(31,-8,1.5),max:vec(33.2,9,4.5)}],
 anchors:[{id:'A',label:'A',p:vec(8,7.05,0),section:0},{id:'B',label:'B',p:vec(6,10.05,0),section:0},{id:'C',label:'C',p:vec(36,8.05,-3),section:1},{id:'D',label:'D',p:vec(34,6.05,3),section:1},{id:'S',label:'S',p:vec(35,8.05,6.5),section:1},{id:'H',label:'H',p:vec(99,9.05,4),section:1},{id:'I',label:'I',p:vec(134,10.05,-3),section:1},{id:'E',label:'E',p:vec(171,15.05,-2),section:2},{id:'F',label:'F',p:vec(169,16.05,-2),section:2},{id:'J',label:'J',p:vec(213,14.05,3),section:2},{id:'G',label:'G',p:vec(243,19.05,2),section:3},{id:'K',label:'K',p:vec(279,18.05,5),section:3},{id:'L',label:'L',p:vec(318,16.05,-1),section:3}] as Anchor[],
 checkpoints:[{p:vec(20,1,0),label:'רכס ראשון'},{p:vec(153,2,-2),label:'המדף הגבוה'},{p:vec(238,6,-2),label:'קפיצה למרחב'}],finish:vec(350,9,4),
 stances:[vec(0,0,0),vec(28,1,-3),vec(166,2,-2),vec(240,6,-2),vec(91,2,4),vec(126,3,-3),vec(205,5,3),vec(271,9,5),vec(310,9,-1)]
};
// Authored stance feet sit at collision skin above each exact top plane.
COURSE.anchors.forEach(a=>a.p.y+=SKIN);
export function segmentBox(p:V,q:V,b:Box):boolean{
 let lo=0,hi=1;const d=sub(q,p);
 for(const k of ['x','y','z'] as const){if(Math.abs(d[k])<1e-10){if(p[k]<b.min[k]||p[k]>b.max[k])return false;}else{let a=(b.min[k]-p[k])/d[k],c=(b.max[k]-p[k])/d[k];if(a>c)[a,c]=[c,a];lo=Math.max(lo,a);hi=Math.min(hi,c);if(lo>hi)return false;}}
 return hi>.00001&&lo<.99999;
}
export function inspectReach(p:V,a:V,reach:number,boxes:Box[]=[],acquired=true){const d=sub(a,p),distance=length(d),squared=d.x*d.x+d.y*d.y+d.z*d.z;const reason=!acquired?'not-aimed':distance>reach+REACH_EPS?'overreach':boxes.some(b=>segmentBox(p,a,b))?'obstructed':'ready';return{distance,squared,dx:d.x,dy:d.y,dz:d.z,face:Math.hypot(d.x,d.z),reachable:reason==='ready',reason};}
function capsuleGap(p:V,b:Box){const cx=Math.max(b.min.x,Math.min(p.x,b.max.x)),cz=Math.max(b.min.z,Math.min(p.z,b.max.z));const low=p.y+RADIUS,high=p.y+HEIGHT-RADIUS;let cy=Math.max(b.min.y,Math.min((low+high)/2,b.max.y));let py=Math.max(low,Math.min(cy,high));cy=Math.max(b.min.y,Math.min(py,b.max.y));const d=vec(p.x-cx,py-cy,p.z-cz);return{gap:length(d)-RADIUS,normal:unit(d)};}
// Conservative advancement of a vertical capsule against exact authored AABBs.
// Capsule-to-box separation is Lipschitz bounded by displacement length, so steps
// cannot cross a surface; final impact is within the independent 2mm collision skin.
export function sweepCapsule(start:V,delta:V,boxes:Box[]){let p={...start},remaining={...delta},grounded=false,hit=false;for(let slide=0;slide<5&&length(remaining)>1e-8;slide++){let earliest=1,normal=vec();for(const b of boxes){const floor=b.max.y+SKIN;if(remaining.y<0&&p.y>=floor-1e-7&&p.y+remaining.y<=floor){const t=Math.max(0,(floor-p.y)/remaining.y),at=add(p,mul(remaining,t));if(t<=earliest&&at.x>=b.min.x&&at.x<=b.max.x&&at.z>=b.min.z&&at.z<=b.max.z){earliest=t;normal=vec(0,1,0);}}let t=0;const speed=length(remaining);for(let n=0;n<40&&t<=earliest;n++){const at=add(p,mul(remaining,t)),g=capsuleGap(at,b);if(g.gap<=SKIN+1e-7){if(g.normal.x*remaining.x+g.normal.y*remaining.y+g.normal.z*remaining.z< -1e-8){earliest=t;normal=g.normal;}break;}t+=(g.gap-SKIN)/speed;}}
 p=add(p,mul(remaining,earliest));if(earliest>=1)break;hit=true;if(normal.y>.6)grounded=true;remaining=mul(remaining,1-earliest);const into=remaining.x*normal.x+remaining.y*normal.y+remaining.z*normal.z;remaining=sub(remaining,mul(normal,Math.min(0,into)));p=add(p,mul(normal,1e-6));}return{position:p,grounded,hit};}
export type Input={x:number;z:number;jump:boolean;sprint:boolean;grapple:boolean;anchor:string|null};
export type S={p:V;v:V;mode:'title'|'playing'|'paused'|'finished';cp:number;time:number;reach:number;attached:string|null;hold:number;cooldown:number;survey:boolean;hints:number;falls:number;overreaches:number;obstructions:number;reason:string;reasonTime:number;grounded:boolean;events:Record<string,unknown>[];assisted:boolean;grabs:number;releases:number;best:number|null;accumulator:number;jumpWas:boolean;grappleWas:boolean;respawnTime:number;finishedTime:number};
export const harness=(s:S)=>add(s.p,vec(0,1.05,0));
export function createState():S{return{p:vec(0,SKIN,0),v:vec(),mode:'title',cp:0,time:0,reach:10,attached:null,hold:0,cooldown:0,survey:false,hints:0,falls:0,overreaches:0,obstructions:0,reason:'',reasonTime:0,grounded:true,events:[],assisted:false,grabs:0,releases:0,best:null,accumulator:0,jumpWas:false,grappleWas:false,respawnTime:0,finishedTime:0};}
const event=(s:S,type:string,data:Record<string,unknown>={})=>{s.events.push({type,time:+s.time.toFixed(3),...data});if(s.events.length>300)s.events.shift();};
export function start(s:S){s.mode='playing';event(s,'start');}
export function retry(s:S){const cp=s.cp?COURSE.checkpoints[s.cp-1].p:vec();s.p=add(cp,vec(0,SKIN,0));s.v=vec();s.attached=null;s.cooldown=.25;s.grounded=true;s.respawnTime=0;s.reason='retry';s.reasonTime=1.4;event(s,'retry',{cp:s.cp});}
export function restart(s:S){const best=s.best;Object.assign(s,createState());s.best=best;start(s);}
export function togglePause(s:S){if(s.mode==='playing'){s.mode='paused';s.survey=false;}else if(s.mode==='paused')s.mode='playing';}
export function setSurvey(s:S,on:boolean){s.survey=on;if(on){s.assisted=true;event(s,'survey');}}
export function hint(s:S){s.hints++;s.assisted=true;event(s,'hint');}
export function tryAttach(s:S,id:string|null){if(s.mode!=='playing'||s.attached||s.cooldown>0)return false;const a=COURSE.anchors.find(a=>a.id===id);if(!a){s.reason='not-aimed';s.reasonTime=1;return false;}const witness=inspectReach(harness(s),a.p,s.reach,COURSE.boxes);event(s,'grab',{anchor:id,reach:s.reach,origin:{...harness(s)},...witness,hinted:s.hints>0,survey:s.survey});if(!witness.reachable){s.reason=witness.reason;s.reasonTime=2;if(witness.reason==='overreach')s.overreaches++;if(witness.reason==='obstructed')s.obstructions++;return false;}s.attached=id;s.hold=0;s.grabs++;s.grounded=false;s.reason='attached';s.reasonTime=.8;return true;}
export function release(s:S){if(s.attached){s.attached=null;s.cooldown=.25;s.releases++;event(s,'release',{velocity:{...s.v}});}}
export function step(s:S,input:Input,dt=FIXED){if(s.mode!=='playing')return;const scaled=dt*(s.survey?.2:1);s.time+=scaled;s.cooldown=Math.max(0,s.cooldown-scaled);s.reasonTime=Math.max(0,s.reasonTime-scaled);
 if(s.respawnTime>0){s.respawnTime-=scaled;if(s.respawnTime<=0)retry(s);return;}
 if(input.jump&&!s.jumpWas&&s.grounded){s.v.y=8;s.grounded=false;event(s,'jump');}s.jumpWas=input.jump;
 if(input.grapple&&!s.grappleWas)tryAttach(s,input.anchor);if(!input.grapple&&s.grappleWas)release(s);s.grappleWas=input.grapple;
 let direction=vec(input.x,0,input.z);if(length(direction)>1)direction=unit(direction);
 if(s.attached){const a=COURSE.anchors.find(a=>a.id===s.attached)!;const d=sub(a.p,harness(s));if(COURSE.boxes.some(b=>segmentBox(harness(s),a.p,b))){release(s);s.reason='cable-blocked';s.reasonTime=1.6;s.obstructions++;}else{const pull=mul(unit(d),28);s.v=add(s.v,mul(add(pull,vec(direction.x*6,-6,direction.z*6)),scaled));s.hold+=scaled;if(length(s.v)>18)s.v=mul(unit(s.v),18);if(s.hold>=1.25||length(d)<1.2)release(s);}}
 else{const speed=input.sprint?9:6,accel=s.grounded?32:9;const approach=(v:number,t:number)=>v+Math.max(-accel*scaled,Math.min(accel*scaled,t-v));if(s.grounded||length(direction)>0){s.v.x=approach(s.v.x,direction.x*speed);s.v.z=approach(s.v.z,direction.z*speed);}s.v.y-=22*scaled;}
 const old={...s.p},move=mul(s.v,scaled),result=sweepCapsule(s.p,move,COURSE.boxes);s.p=result.position;s.grounded=result.grounded;if(result.grounded&&s.v.y<0)s.v.y=0;for(const k of ['x','z'] as const)if(Math.abs(s.p[k]-old[k]-move[k])>.01)s.v[k]=0;
 if(s.p.y< -14){s.falls++;s.respawnTime=.45;s.reason='fall';s.reasonTime=2;release(s);event(s,'fall',{cp:s.cp});}
 const next=COURSE.checkpoints[s.cp];if(next&&s.grounded&&Math.abs(s.p.x-next.p.x)<2.5&&Math.abs(s.p.y-next.p.y)<.2&&Math.abs(s.p.z-next.p.z)<8){s.cp++;s.reach=s.cp>=2?13:10;s.reason=s.cp===2?'upgrade':'checkpoint';s.reasonTime=2.4;event(s,'checkpoint',{cp:s.cp});}
 if(s.cp===3&&s.grounded&&s.p.x>=COURSE.finish.x-2&&s.p.z>=-7&&s.p.z<=11){s.mode='finished';s.finishedTime=s.time;s.best=s.best===null?s.time:Math.min(s.best,s.time);event(s,'finish',{assisted:s.assisted});}
}
export function advance(s:S,input:Input,ms:number){s.accumulator+=Math.max(0,Math.min(ms,10000))/1000;while(s.accumulator+1e-10>=FIXED){step(s,input,FIXED);s.accumulator=Math.max(0,s.accumulator-FIXED);}}
