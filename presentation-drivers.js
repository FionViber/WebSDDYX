/* Source presentation scripts recovered from the supplied native player.
 * No draws on inspection/mount except an actually enabled OnEnable/Start.
 * ParticleSystem seeds are deliberately outside this shared Random API. */
(function(global){'use strict';
const F=Math.fround,TAU=F(6.2831854820251465),clamp=(v,a,b)=>v<a?a:v>b?b:v;
const vec=v=>({x:F(v?.x||0),y:F(v?.y||0),z:F(v?.z||0)});
function rng(context,name,...args){const fn=context[name];if(typeof fn!=='function')throw new Error('Source presentation requires '+name+' callback');return fn(...args);}
const PERLIN_P=[151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180,151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
const f=Math.fround,add=(a,b)=>f(a+b),sub=(a,b)=>f(a-b),mul=(a,b)=>f(a*b);
function cvtt(x){return Number.isFinite(x)&&x>=-2147483648&&x<2147483648?Math.trunc(x):-2147483648;}
function fade(x){x=Math.min(1,x);return mul(add(mul(sub(mul(x,6),15),x),10),mul(mul(x,x),x));}
function grad(hash,x,y){const h=hash&15,u=h<8?x:y,v=h<4?y:(h===12||h===14?x:0);return add(h&1?-u:u,h&2?-v:v);}
function lerp(a,b,t){return add(a,mul(sub(b,a),t));}
function perlinNoise(x,y){
 x=Math.abs(f(x));y=Math.abs(f(y));
 const ix=cvtt(x),iy=cvtt(y),X=ix&255,Y=iy&255;
 x=sub(x,f(ix));y=sub(y,f(iy));
 const A=PERLIN_P[X]+Y,B=PERLIN_P[X+1]+Y,AA=PERLIN_P[A],AB=PERLIN_P[A+1],BA=PERLIN_P[B],BB=PERLIN_P[B+1];
 const u=fade(x),v=fade(y),xm=sub(x,1),ym=sub(y,1);
 const upper=lerp(grad(PERLIN_P[AB],x,ym),grad(PERLIN_P[BB],xm,ym),u);
 const lower=lerp(grad(PERLIN_P[AA],x,y),grad(PERLIN_P[BA],xm,y),u);
 return f(add(lerp(lower,upper,v),f(0.69))/f(1.483));
}
function smoothDamp(current,target,velocity,smoothTime,maxSpeed,deltaTime){
 current=F(current);target=F(target);velocity=F(velocity);deltaTime=F(deltaTime);smoothTime=Math.max(F(.0001),F(smoothTime));
 const omega=F(2/smoothTime),x=F(omega*deltaTime),exp=F(1/F(F(F(1+x)+F(F(F(.48)*x)*x))+F(F(F(F(.235)*x)*x)*x))),original=target;
 let change=F(current-target);const maxChange=F(maxSpeed*smoothTime);change=clamp(change,-maxChange,maxChange);target=F(current-change);
 const temp=F(F(velocity+F(omega*change))*deltaTime);velocity=F(F(velocity-F(omega*temp))*exp);let value=F(target+F(F(change+temp)*exp));
 if((original-current>0)===(value>original)){value=original;velocity=deltaTime?F(F(value-original)/deltaTime):0;}return{value,velocity};
}
class AutoSwing{
 constructor(fields={}){this.fields=fields;this.CurrentPower=F(fields.CurrentPower||0);this.CurrentVelocity=F(fields.CurrentVelocity||0);}
 get MaxPower(){return F(this.fields.MaxPower??1);}
 update(time,dt){const f=this.fields,min=F(f.MinPower||0);if(min<=0&&this.CurrentPower<=0)return null;
  if(min<this.CurrentPower){const result=smoothDamp(this.CurrentPower,0,this.CurrentVelocity,f.SmoothTime??1,f.MaxSpeed??1,dt);this.CurrentPower=result.value;this.CurrentVelocity=result.velocity;}else this.CurrentPower=min;
  const power=F(this.CurrentPower/this.MaxPower),phase=F(F(F(time)*F(f.Frequency??1))%TAU),sine=F(Math.sin(phase)),out=vec(f.RotationOrigin),intensity=vec(f.RotationMaxIntension);
  for(const key of ['x','y','z'])out[key]=F(out[key]+F(F(sine*intensity[key])*power));return out;
 }
}
class PointerSwing{
 constructor(fields,swing,context={}){this.fields=fields;this.swing=swing;this.context=context;this.last=F(fields.last_add_time||0);}
 add(time){const f=this.fields;if(!this.swing)throw new Error('PointerAddSwingPower has no original AutoSwing reference');this.swing.CurrentPower=clamp(F(this.swing.CurrentPower+F(f.add_power??5)),F(f.min_power??5),Math.min(F(f.max_power??15),this.swing.MaxPower));}
 enter(time){const n=rng(this.context,'randomRange',1,5);this.context.trigger?.('PRESTIGE_SWING_'+n);if(this.fields.add_on_enter&&F(F(time)-this.last)>=F(this.fields.add_interval??1)){this.add(time);this.last=F(time);}return n;}
 exit(time){if(this.fields.add_on_exit&&F(F(time)-this.last)>=F(this.fields.add_interval??1)){this.add(time);this.last=0;return true;}return false;}
}
class PrestigeChanges{
 constructor(context={}){this.context=context;this.cacheChange=context.cacheChange??true;this.items=[];}
 add(fields,swing,context={}){const item={fields,swing,context,queue:[],alive:true};this.items.push(item);return item;}
 remove(item){item.alive=false;item.queue.length=0;this.items=this.items.filter(x=>x!==item);}
 process(item,value,old){const delta=(value-old)|0;if(!delta)return;const f=item.fields;
  if(item.swing){item.swing.CurrentPower=clamp(F(item.swing.CurrentPower+F(Math.abs(delta)*F(f.ChangeRate??1))),F(f.MinSwingPower??10),item.swing.MaxPower);const n=rng(this.context,'randomRange',1,5);this.context.trigger?.('PRESTIGE_SWING_'+n);}
  item.context.notice?.(delta>0?'PRESTIGE_CHANGE_POSITIVE':'PRESTIGE_CHANGE_NEGATIVE',Math.abs(delta),{value,old,counterId:f.counter_id});
 }
 counterChanged(id,value,old){for(const item of this.items){if(!item.alive||Number(item.fields.counter_id)!==Number(id))continue;item.context.count?.(value,old);if(this.cacheChange)item.queue.push([value,old]);else this.process(item,value,old);}}
 setCacheChange(value){value=!!value;if(this.cacheChange===value)return;this.cacheChange=value;if(!value)for(const item of [...this.items])while(item.alive&&item.queue.length)this.process(item,...item.queue.shift());}
 destroy(){for(const item of this.items)item.queue.length=0;this.items.length=0;}
}
class PrestigeSwitch{
 constructor(items,context={}){this.items=items;this.context=context;this.currentIndex=-1;this.lastSelection=null;}
 selectNext(){if(this.context.isActiveSelf?.()===false)return false;if(!this.items.length)return false;if(this.currentIndex<0){this.lastSelection=this.context.getSelection?.()||null;this.currentIndex=0;}else this.currentIndex=(this.currentIndex+1)%this.items.length;const item=this.items[this.currentIndex];if(this.context.isMobile?.()){this.context.setSelection?.(item);this.context.setSelection?.(null);this.context.showMobileTips?.(item);}this.context.setSelection?.(item);return true;}
 cancel(){if(this.currentIndex===-1)return false;if(this.lastSelection){this.context.setSelection?.(this.lastSelection);this.lastSelection=null;}this.currentIndex=-1;return true;}
}
class FlashNoticeQueue{
 constructor(fields={},context={}){this.fields=fields;this.context=context;this.queue=[];this.nextTime=F(fields.nextTime||0);}
 process(content,time){this.context.create?.(content,this.fields);this.nextTime=F(F(time)+F(this.fields.interval??.5));}
 send(content,time){if(this.nextTime<=F(time)&&this.queue.length===0)this.process(content,time);else this.queue.push(content);}
 update(time){if(this.queue.length&&this.nextTime<=F(time))this.process(this.queue.shift(),time);}
}
class Shaker{
 constructor(fields={},context={}){this.fields=fields;this.context=context;this.currentFreq=F(fields.currentFreq||0);this.currentVelocity=F(fields.currentVelocity||0);this.seed=F(fields.seed||0);this.originPosition=vec(fields.originPosition);this.originRotation=vec(fields.originRotation);this.done=true;}
 reset(position,rotation){this.originPosition=vec(position);this.originRotation=vec(rotation);this.seed=F(F(rng(this.context,'random')*10)-5);this.currentFreq=F(this.fields.maxSpeed??1);this.currentVelocity=0;this.done=false;return this.seed;}
 update(time,dt){if(this.currentFreq<=0)return null;const f=this.fields;
  // Source passes deltaTime as smoothTime, and its field `time` as maxSpeed.
  const damp=smoothDamp(this.currentFreq,0,this.currentVelocity,dt,f.time??.3,dt);this.currentFreq=damp.value;this.currentVelocity=damp.velocity;
  const phase=F(F(F(time)%TAU)*F(f.frequence??1)),noise=f.usePerlineNoise!==0&&f.usePerlineNoise!==false,noiseFn=this.context.perlinNoise||perlinNoise;
  const position=vec(this.originPosition),rotation=vec(this.originRotation),p=vec(f.positionIntension),r=vec(f.rotationIntension);
  for(let i=0;i<6;i++){const sample=F(noise?noiseFn(F(this.seed+i+1),phase):Math.sin(phase)),factor=F(F(sample+sample)-1),key=['x','y','z'][i%3],intensity=i<3?p:r,target=i<3?position:rotation;target[key]=F(target[key]+F(F(factor*intensity[key])*this.currentFreq));}
  if(this.currentFreq<=0&&!this.done){this.done=true;this.context.onDone?.();}return{position,rotation};
 }
}
function roundEven(value){const lo=Math.floor(value),fraction=value-lo;return fraction===.5?(lo%2===0?lo:lo+1):Math.round(value);}
class RiftPlan{
 constructor(fields={},context={}){this.fields=fields;this.context=context;this.progress=F(fields.progress||0);this.currentProgress=F(fields.currentProgress||0);this.lastPos=F(fields.lastPos??fields.posStart??370);this.patchs=[];this.seed={x:0,y:0};}
 reset(){const f=this.fields,c=this.context;this.seed={x:F(rng(c,'randomRange',-1000,1000)),y:F(rng(c,'randomRange',-10000,10000))};this.progress=0;this.currentProgress=0;this.lastPos=F(f.posStart??370);this.patchs=[];
  for(const p of f.patchInfos||[]){const start=rng(c,'randomRange',p.range.x,p.range.y),end=start+rng(c,'randomRange',p.length.x,p.length.y),multi=F(rng(c,'randomFloatRange',p.multi.x,p.multi.y)),seed={x:F(rng(c,'randomRange',-1000,1000)),y:F(rng(c,'randomRange',-10000,10000))},smooth=F(rng(c,'randomFloatRange',p.smooth.x,p.smooth.y)),slope_enter=F(rng(c,'randomFloatRange',p.slope.x,p.slope.y)),slope_leave=F(rng(c,'randomFloatRange',p.slope.x,p.slope.y));this.patchs.push({start,end,multi,seed,smooth,slope_enter,slope_leave});}
  return this;
 }
 update(dt){if(this.progress<=this.currentProgress)return[];const f=this.fields,width=f.size.x;this.progress=clamp(this.progress,0,1);const next=clamp(F(this.currentProgress+F(F(dt)*F(f.speed??1))),0,1),end=roundEven(F(width*next));let x=roundEven(F(width*this.currentProgress));const segments=[];
  while(x<end){const distance=rng(this.context,'randomRange',f.stepDistRange.x,f.stepDistRange.y),to=clamp(x+distance,0,width),position=rng(this.context,'randomRange',f.posRange.x,f.posRange.y);if(to<=x)throw new Error('Original RiftGenerator step range does not advance');segments.push({from:x,to,startPos:this.lastPos,endPos:position});this.lastPos=F(position);x=to;}
  this.currentProgress=F(x/width);return segments;
 }
}
class RiftRaster extends RiftPlan{
 reset(){super.reset();this.width=this.fields.size.x;this.height=this.fields.size.y;this.pixels=new Uint8ClampedArray(this.width*this.height*4);this.info=new Float32Array(this.width);return this;}
 render(segments){const f=this.fields,noise=this.context.perlinNoise||perlinNoise;const byte=v=>clamp(roundEven(F(v*255)),0,255),black=['r','g','b','a'].map(k=>byte(f.black[k])),white=['r','g','b','a'].map(k=>byte(f.white[k]));
  for(const segment of segments){const patch=this.patchs.find(p=>p.start<=segment.from&&segment.from<p.end);for(let x=segment.from;x<segment.to;x++){
   const ratio=F(x/this.width),y=F(F(ratio*F(f.posSmooth))+this.seed.y),h=clamp(F(F(noise(this.seed.x,y)*F(f.heightRange.y-f.heightRange.x))+f.heightRange.x),f.heightRange.x,f.heightRange.y),center=F(F(F(F(segment.endPos-segment.startPos)*F(x-segment.from))/F(segment.to-segment.from))+segment.startPos);
   let start,end,cut;if(!patch){start=roundEven(F(center-F(h*F(.5))));end=roundEven(F(center+F(h*F(.5))));const n=noise(F(this.seed.x+1),y);cut=roundEven(F(F(F(F(n*F(f.whiteRange.y-f.whiteRange.x))+f.whiteRange.x)*h)+start));}
   else{end=roundEven(F(center+F(h*F(.5))));let t=F(F(x-patch.start)/F(patch.end-patch.start));if(t<patch.slope_enter)t=F(t*F(F(.5)/patch.slope_enter));else if(t>F(1-patch.slope_leave))t=F(F(F(F(F(t-1)+patch.slope_leave)*F(.5))/patch.slope_leave)+F(.5));else t=F(.5);
    const py=F(F(ratio*patch.smooth)+patch.seed.y),factor=F(noise(patch.seed.x,py)*F(F(Math.sin(F(t*F(Math.PI))))*patch.multi)),total=F(F(factor+1)*h);start=roundEven(F(end-total));const n=noise(F(patch.seed.x+1),py);cut=roundEven(F(F(F(F(F(n*F(f.whiteRange.y-f.whiteRange.x))+f.whiteRange.x)*total)/F(factor+1))+start));}
   for(let y=start;y<end;y++){if(y<0||y>=this.height)continue;const color=y<cut?white:black,offset=((this.height-y-1)*this.width+x)*4;this.pixels.set(color,offset);}this.info[x]=F(center/this.height);
  }}return segments.length>0;
 }
 update(dt){const segments=super.update(dt);this.render(segments);return segments;}
}
class FlashNoticeItem{
 constructor(fields={},position={x:0,y:0,z:0}){this.current=F(fields.current||0);this.fadingTime=F(fields.fadingTime??1);this.speed=vec(fields.speed);this.position=vec(position);this.alpha=1;this.done=false;}
 update(dt){dt=F(dt);if(this.current>=this.fadingTime)return false;this.current=clamp(F(this.current+dt),0,this.fadingTime);this.alpha=F(1-clamp(F(this.current/this.fadingTime),0,1));for(const key of ['x','y','z'])this.position[key]=F(this.position[key]+F(this.speed[key]*dt));this.done=this.current>=this.fadingTime;return true;}
}
function windStart(fields,context={},position={x:0,y:0,z:0},wiggleFrequency=1){const result={position:vec(position),wiggleFrequency:F(wiggleFrequency),draws:0};if(fields.hyperPerformanceMode&&fields.randomOffsetZ){result.position.z=F(result.position.z+F(rng(context,'random')*F(.1)));result.draws++;}if(fields.randomizeWiggle&&fields.hasMaterial!==false){result.wiggleFrequency=F(F(F(rng(context,'random')*F(.2))+F(.9))*result.wiggleFrequency);result.draws++;}return result;}
function quaternion(v){const x=v.x*Math.PI/360,y=v.y*Math.PI/360,z=v.z*Math.PI/360,sx=Math.sin(x),cx=Math.cos(x),sy=Math.sin(y),cy=Math.cos(y),sz=Math.sin(z),cz=Math.cos(z);return{x:cy*sx*cz+sy*cx*sz,y:sy*cx*cz-cy*sx*sz,z:cy*cx*sz-sy*sx*cz,w:cy*cx*cz+sy*sx*sz};}
function multiply(a,b){return{x:a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,y:a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,z:a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,w:a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z};}
function worldQuaternion(node){const q=node?.transform?.m_LocalRotation||{x:0,y:0,z:0,w:1};return node?.parent?multiply(worldQuaternion(node.parent),q):q;}
function applyWorldRotation(ui,element,rotation){const p=worldQuaternion(element.__unityNode?.parent),q=multiply({x:-p.x,y:-p.y,z:-p.z,w:p.w},quaternion(rotation));for(const key of ['x','y','z','w'])ui.applyProperty(element,'m_LocalRotation.'+key,q[key],4);}
function mount(ui,context={}){
 const initialWall=context.now?.()??performance.now()/1000;let resourceWall=initialWall,resourceOffset=0,resourcePaused=!!context.isResourceBlocked?.();const resourceChanges=[];
 const resourceBlocked=()=>!!context.isResourceBlocked?.();
 function syncResourceClock(now=context.now?.()??performance.now()/1000){now=Number(now);if(resourceOffset||resourcePaused)now=Math.max(now,resourceWall);if(resourcePaused)resourceOffset+=Math.max(0,now-resourceWall);resourceWall=now;resourcePaused=resourceBlocked();return now-resourceOffset;}
 let disposed=false,raf=0,time=F(initialWall),last=time;const swings=new Map(),pointers=new Map(),prestiges=new Map(),switches=new Map(),shakers=new Map(),rifts=new Map(),notices=new Map(),noticeItems=new Set(),offs=[];
 const resources=context.resources||global.SDDYXResources;let noticesReady=!!global.SDDYX_PREFABS?.FlashNoticeItem;const ready=noticesReady?Promise.resolve():resources?.prefab?resources.prefab('FlashNoticeItem').then(()=>{noticesReady=true;}):Promise.resolve();
 const changes=new PrestigeChanges({cacheChange:context.cacheChange,randomRange:(a,b)=>rng(context,'randomRange',a,b),trigger:name=>context.trigger?context.trigger(name):context.sourceAudio?.trigger?.(name)});
 const resourceChangesAllowed=()=>!resourceBlocked()||!!context.isResourcePreparing?.();
 function flushResourceChanges(){while(!disposed&&resourceChangesAllowed()&&resourceChanges.length){const [method,args]=resourceChanges.shift();changes[method](...args);}}
 function deliverResourceChange(method,args){if(disposed)return;if(!resourceChangesAllowed()){resourceChanges.push([method,args]);return;}flushResourceChanges();if(!resourceChangesAllowed()){resourceChanges.push([method,args]);return;}return changes[method](...args);}
 const selection=()=>context.getSelection?.()||ui.element?.ownerDocument?.activeElement||global.document?.activeElement;
 const setSelection=el=>{if(context.setSelection)context.setSelection(el);else if(el)el.focus?.({preventScroll:true});else selection()?.blur?.();};
 function resolve(owner,ref){if(!ref?.fileID)return null;const id=String(ref.fileID),nodes=owner.__unityNode?.scope?.records||[],match=n=>String(n.source?.id)===id||String(n.source?.transformID)===id||n.components?.some(c=>String(c.fileID)===id);return(nodes.find(match)||(ui.findAll('*').map(e=>e.__unityNode).find(match)))?.element||null;}
 const enabled=(el,c)=>!resourceBlocked()&&el.isConnected!==false&&el.__unityNode?.active!==false&&el.__unityNode?.visible!==false&&c.fields.m_Enabled!==0;
 function setWorldPosition(el,position){const parent=el.__unityNode?.parent?.element,local=parent&&ui.worldToLocal?.(parent,position);if(local)ui.setLocalPosition(el,local);else context.setWorldPosition?.(el,position);}
 function rotationEuler(el){const q=worldQuaternion(el.__unityNode),m13=2*(q.x*q.z+q.w*q.y),m23=2*(q.y*q.z-q.w*q.x),m33=1-2*(q.x*q.x+q.y*q.y),m21=2*(q.x*q.y+q.w*q.z),m22=1-2*(q.x*q.x+q.z*q.z);return{x:Math.asin(clamp(-m23,-1,1))*180/Math.PI,y:Math.atan2(m13,m33)*180/Math.PI,z:Math.atan2(m21,m22)*180/Math.PI};}
 function createNotice(entry,content,f){if(disposed)return;if(!noticesReady){ready.then(()=>{if(!disposed&&entry.element.isConnected!==false)createNotice(entry,content,f);});return;}const parent=resolve(entry.element,f.Container)||entry.element.__unityNode.parent?.element;if(!parent)return;const scope=ui.instantiate('FlashNoticeItem',parent),origin=ui.getWorldPosition?.(entry.element)||{x:0,y:0,z:0},position={x:F(origin.x+f.offset.x),y:F(origin.y+f.offset.y),z:F((origin.z||0)+f.offset.z)},model=new FlashNoticeItem({fadingTime:f.fadingTime,speed:f.speed},position);scope.setText(scope.element,content);setWorldPosition(scope.element,position);noticeItems.add({scope,model});}
 function sendNotice(el,key,value,detail){const entry=[...notices.values()].find(n=>n.element===el);if(entry){const text=context.formatNotice?context.formatNotice(key,value,detail):String(context.translate?.(key)||key).replace(/\{0\}/g,String(value));entry.model.send(text,time);}context.onNotice?.(el,key,value,detail);}
 function resetShaker(entry){entry.model.reset(ui.getWorldPosition?.(entry.element)||entry.component.fields.originPosition,rotationEuler(entry.element));}
 // Native RiftGenerator.OnEnable resets and binds its generated texture in
 // the activation call, before any resource barrier or later Update can run.
 function riftActive(entry){const el=entry.element;if(disposed||el.isConnected===false||entry.component.fields.m_Enabled===0)return false;for(let n=el.__unityNode;n;n=n.parent){if(n.removed||n.active===false)return false;if(!n.parent&&!n.scope?.instance){for(let source=n.scope?.data?.nodes?.[n.source?.parent];source;source=n.scope.data.nodes[source.parent]){const runtime=n.scope.byID?.get(String(source.id));if(runtime?runtime.active===false:source.active===0)return false;}}}return !!el.__unityNode;}
 function syncRift(entry){const active=riftActive(entry);if(active===entry.wasEnabled)return;if(!active){entry.wasEnabled=false;return;}const isCurrent=()=>!disposed&&rifts.get(entry.component)===entry&&riftActive(entry),activate=()=>{if(!isCurrent()||entry.wasEnabled)return;entry.wasEnabled=true;resetRift(entry);};if(context.runResourcePreparation)context.runResourcePreparation(activate,{isCurrent});else activate();}
 function releaseRift(component,entry){rifts.delete(component);entry.wasEnabled=false;if(entry.canvas)entry.canvas.width=entry.canvas.height=1;entry.model.pixels=new Uint8ClampedArray(0);entry.model.info=new Float32Array(0);}
 function resetRift(entry){entry.model.reset();entry.component.fields.progress=0;entry.component.fields.currentProgress=0;if(entry.canvas){entry.canvas.width=entry.model.width;entry.canvas.height=entry.model.height;ui.setTexture(entry.element,entry.canvas);}}
 function register(el){const components=el.__unityNode?.components||[];for(const c of components){const f=c.fields;if('ItemPrefab'in f&&'fadingTime'in f&&'interval'in f&&!notices.has(c)){const entry={element:el,component:c};entry.model=new FlashNoticeQueue(f,{create:(text,fields)=>createNotice(entry,text,fields)});notices.set(c,entry);}if('positionIntension'in f&&'usePerlineNoise'in f&&!shakers.has(c)){shakers.set(c,{element:el,component:c,model:new Shaker(f,context),wasEnabled:false});}if('stepDistRange'in f&&'patchInfos'in f&&!rifts.has(c)){const canvas=el.ownerDocument?.createElement('canvas'),model=new RiftRaster(f,context);rifts.set(c,{element:el,component:c,model,canvas,wasEnabled:false});}if('RotationMaxIntension'in f&&'MaxPower'in f&&!swings.has(c))swings.set(c,{element:el,component:c,model:new AutoSwing(f)});}
  for(const entry of rifts.values())if(entry.element===el)syncRift(entry);
  const swing=[...swings.values()].find(s=>s.element===el)?.model;
  for(const c of components){const f=c.fields;if('items'in f&&'currentIndex'in f&&'lastSelection'in f&&!switches.has(c)){const model=new PrestigeSwitch(f.items.map(ref=>resolve(el,ref)).filter(Boolean),{getSelection:selection,setSelection,isActiveSelf:()=>el.__unityNode?.active!==false,isMobile:context.isMobile,showMobileTips:context.showMobileTips});switches.set(c,{element:el,component:c,model});}if('add_on_enter'in f&&'add_interval'in f&&!pointers.has(c)){const model=new PointerSwing(f,swing,{randomRange:(a,b)=>rng(context,'randomRange',a,b),trigger:name=>changes.context.trigger(name)});pointers.set(c,{element:el,component:c,model});const enter=()=>{if(enabled(el,c))model.enter(time);},exit=()=>{if(enabled(el,c))model.exit(time);};for(const [event,fn]of [['pointerenter',enter],['focus',enter],['pointerleave',exit],['blur',exit]]){el.addEventListener(event,fn);offs.push(()=>el.removeEventListener(event,fn));}}
   if('counter_id'in f&&'MinSwingPower'in f&&!prestiges.has(c)){const tip=components.find(c=>c.fields.m_Script?.guid==='5120d76301e969c0f8aa1b32aa0c43bb'&&c.fields.m_Script.fileID===(context.isMobile?.()?-1778612117:1022493241));if(tip)tip.fields.TipsId='PRESTIGE_TIPS_'+f.counter_id;const iconRef=(context.riteShows||global.SDDYX_RITE_SHOWS)?.prestigeIcons?.[f.counter_id],icon=resolve(el,f.Icon);if(iconRef&&icon){ui.setSprite(icon,resources.asset(iconRef.guid));ui.setNativeSpriteSize(icon);}const model=changes.add(f,swing,{count:(value,old)=>{const target=resolve(el,f.Count);if(target)ui.setText(target,context.sourceNumber?context.sourceNumber(value):String(value));context.onCounterText?.(el,value,old);},notice:(key,value,detail)=>sendNotice(el,key,value,detail)});prestiges.set(c,{element:el,component:c,model});if(context.getCounter)model.context.count(context.getCounter(f.counter_id));}}
 }
 for(const el of ui.findAll('*'))register(el);
 const offActive=ui.onActiveChange?.(event=>{if(event.reason==='destroy'){for(const [c,v]of prestiges)if(v.element===event.element){changes.remove(v.model);prestiges.delete(c);}for(const map of [swings,pointers,switches,shakers,notices])for(const [c,v]of map)if(v.element===event.element)map.delete(c);for(const [c,v]of rifts)if(v.element===event.element)releaseRift(c,v);}else register(event.element);});
 const offComponentLifecycle=ui.onComponentLifecycle?.(event=>{if(disposed)return;if(event.reason==='destroy'){for(const [c,v]of rifts)if(v.element===event.element)releaseRift(c,v);return;}const entry=rifts.get(event.component);if(entry)syncRift(entry);else if(event.component&&'stepDistRange'in event.component.fields&&'patchInfos'in event.component.fields)register(event.element);});
 function update(now){if(disposed)return;const sourceNow=syncResourceClock(now);if(resourcePaused)return;flushResourceChanges();if(resourceBlocked())return;time=F(sourceNow);const dt=Math.max(0,F(time-last));last=time;ui.batch(()=>{for(const entry of swings.values())if(enabled(entry.element,entry.component)){const rotation=entry.model.update(time,dt);if(rotation)applyWorldRotation(ui,entry.element,rotation);}for(const entry of notices.values())if(enabled(entry.element,entry.component))entry.model.update(time);for(const item of [...noticeItems]){if(item.model.update(dt)){setWorldPosition(item.scope.element,item.model.position);ui.applyProperty(item.scope.element,'m_Alpha',item.model.alpha,225);}if(item.model.done){item.scope.destroy();noticeItems.delete(item);}}for(const entry of shakers.values()){const active=enabled(entry.element,entry.component);if(active&&!entry.wasEnabled)resetShaker(entry);entry.wasEnabled=active;if(active){const pose=entry.model.update(time,dt);if(pose){setWorldPosition(entry.element,pose.position);applyWorldRotation(ui,entry.element,pose.rotation);}}}for(const entry of rifts.values()){syncRift(entry);if(entry.wasEnabled){entry.model.progress=entry.component.fields.progress;const changed=entry.model.update(dt).length;entry.component.fields.currentProgress=entry.model.currentProgress;if(changed&&entry.canvas){const ctx=entry.canvas.getContext('2d'),data=ctx.createImageData(entry.model.width,entry.model.height);data.data.set(entry.model.pixels);ctx.putImageData(data,0,0);ui.setTexture(entry.element,entry.canvas);}}}});}
 if(context.autoUpdate!==false){const tick=t=>{update(context.now?.()??t/1000);if(!disposed)raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);}
 function handleSourceInput(method,detail={}){if(resourceBlocked())return false;if(method!=='SelectNextItems'&&method!=='CancelSelected')return false;let entry=[...switches.values()].find(x=>x.element===detail.target||x.component===detail.component);if(!entry&&!detail.target&&switches.size===1)entry=[...switches.values()][0];if(!entry)return false;return method==='SelectNextItems'?entry.model.selectNext():entry.model.cancel();}
 function itemEvent(selected,field){const entry=[...prestiges.values()].find(x=>x.element===selected);if(!entry)return false;let handled=false;for(const call of entry.component.fields[field]?.m_PersistentCalls?.m_Calls||[]){if(call.m_CallState===0)continue;const target=resolve(entry.element,call.m_Target);handled=handleSourceInput(call.m_MethodName,{target})||handled;}return handled;}
 function navigate(){if(resourceBlocked())return false;const selected=selection();if(![...prestiges.values()].some(x=>x.element===selected))return false;itemEvent(selected,'OnMoved');return true;}
 function cancelSelected(selected=selection()){if(resourceBlocked())return false;return itemEvent(selected,'OnCanceled')?{handled:true,used:false}:false;}
 return{ready,syncResourceClock(now){const value=syncResourceClock(now);if(!resourcePaused)flushResourceChanges();return value;},changes,swings,pointers,prestiges,switches,shakers,rifts,notices,noticeItems,sendNotice(selector,text){if(disposed||resourceBlocked())return false;const el=typeof selector==='string'?ui.find(selector):selector,entry=[...notices.values()].find(e=>e.element===el);if(!entry||el?.isConnected===false)return false;entry.model.send(String(text),time);return true;},shake(selector){if(disposed||resourceBlocked())return false;const el=typeof selector==='string'?ui.find(selector):selector,entry=[...shakers.values()].find(e=>e.element===el);if(!entry)return false;entry.component.fields.m_Enabled=1;resetShaker(entry);entry.wasEnabled=true;return true;},resetRift(selector){if(disposed||resourceBlocked())return false;const el=typeof selector==='string'?ui.find(selector):selector,entry=[...rifts.values()].find(e=>e.element===el);if(!entry)return false;resetRift(entry);return true;},handleSourceInput,navigate,cancelSelected,update,counterChanged:(...args)=>deliverResourceChange('counterChanged',args),setCacheChange:value=>deliverResourceChange('setCacheChange',[value]),destroy(){if(disposed)return;disposed=true;resourceChanges.length=0;cancelAnimationFrame(raf);offActive?.();offComponentLifecycle?.();for(const off of offs)off();changes.destroy();swings.clear();pointers.clear();prestiges.clear();switches.clear();shakers.clear();for(const [component,entry]of rifts)releaseRift(component,entry);notices.clear();for(const item of noticeItems)item.scope.destroy();noticeItems.clear();}};
}
const api={perlinNoise,smoothDamp,AutoSwing,PointerSwing,PrestigeChanges,PrestigeSwitch,FlashNoticeQueue,FlashNoticeItem,Shaker,RiftPlan,RiftRaster,windStart,mount,roundEven};global.SDDYXPresentationDrivers=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
