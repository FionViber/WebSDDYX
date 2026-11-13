/* Static native transcription for the original Sultan-breaker qiliu02 systems.
 * SizeBySpeed D0CAF0/D18A10; Trail D3C290/D3C810; caller 11B8350;
 * open-strip 47CB90/47C920/11BC950. No DOM, random stream, or asset mutation.
 * RCPPS/RSQRTPS estimates and C pow remain explicit precision boundaries.
 * Width/gradient evaluators are supplied by the caller, not approximated here.
 */
(function (global) {
'use strict';
const F=Math.fround;
const add=(a,b)=>F(F(a)+F(b)),sub=(a,b)=>F(F(a)-F(b));
const mul=(a,b)=>F(F(a)*F(b)),div=(a,b)=>F(F(a)/F(b));
// SSE min/max select their second operand on equality or unordered comparison.
const min=(a,b)=>a<b?a:b,max=(a,b)=>a>b?a:b;
const ID=Object.freeze([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const TINY=F(1e-30),MAX=F(3.4028234663852886e38),RANGE_EPSILON=F(1e-9);
const RANDOM_OFFSETS=Object.freeze({ratio:-0x75400ca0,lifetime:0x34bbab1b,width:-0x123cba5,lifetimeColor:0x591bc05c,color:0x6cf2ac20});
const xyz=v=>Array.isArray(v)||ArrayBuffer.isView(v)?[F(v[0]),F(v[1]),F(v[2])]:[F(v.x),F(v.y),F(v.z)];
const sum2=v=>add(mul(v[0],v[0]),mul(v[1],v[1]));
const sum3=v=>add(add(mul(v[0],v[0]),mul(v[1],v[1])),mul(v[2],v[2]));
const sum4=v=>add(add(mul(v[0],v[0]),mul(v[1],v[1])),add(mul(v[2],v[2]),mul(v[3],v[3])));
const clamp01=t=>min(1,max(0,t));

function rangeCoefficients(range) {
 const lo=F(range[0]),delta=sub(range[1],lo);
 const reciprocal=Math.abs(delta)>RANGE_EPSILON?div(1,delta):lo;
 return {reciprocal,offset:mul(-lo,reciprocal)};
}
function normalizedSpeed(baseVelocity,moduleVelocity,range=[0,25]) {
 const base=xyz(baseVelocity),mod=xyz(moduleVelocity),velocity=base.map((v,i)=>add(v,mod[i]));
 // The native sum is (Y²+Z²)+X². speedModifier is deliberately not an input.
 const square=add(add(mul(velocity[1],velocity[1]),mul(velocity[2],velocity[2])),mul(velocity[0],velocity[0]));
 const speed=F(Math.sqrt(square)),coefficients=rangeCoefficients(range);
 const raw=add(mul(speed,coefficients.reciprocal),coefficients.offset);
 return {velocity,speed,...coefficients,raw,normalized:clamp01(raw)};
}
// Specialization of the two authored unweighted linear 0→1 curves, scalar1.
// A caller must check supportedSizeBySpeed before using this on source records.
function evaluateSizeBySpeed({initialSize,currentSize,priorSizeProduced=false,size3D=false,baseVelocity,moduleVelocity,range=[0,25]}) {
 const sample=normalizedSpeed(baseVelocity,moduleVelocity,range);
 const source=priorSizeProduced?currentSize:initialSize,count=size3D?3:1;
 if(!source||source.length<count)throw Error('Native source size arrays are required');
 return {...sample,size:Array.from({length:count},(_,i)=>mul(max(0,sample.normalized),source[i]))};
}
function supportedSizeBySpeed(module,initial={}) {
 const curve=module?.curve,keys=curve?.maxCurve?.m_Curve;
 return !!module?.enabled&&!initial.size3D&&!module.separateAxes&&curve?.minMaxState===1&&curve.scalar===1&&
  keys?.length===2&&keys[0].time===0&&keys[0].value===0&&keys[0].outSlope===1&&!keys[0].weightedMode&&
  keys[1].time===1&&keys[1].value===1&&keys[1].inSlope===1&&!keys[1].weightedMode;
}
function trailLifetime(curveValue,selectedSize,inverseLifetime,{sizeAffectsLifetime=true,size3D=false}={}) {
 let value=F(curveValue);
 if(sizeAffectsLifetime) {
  let size=F(selectedSize[0]);
  if(size3D){const yz=selectedSize[2]>selectedSize[1]?selectedSize[2]:selectedSize[1];size=yz>size?yz:size;}
  value=mul(value,size);
 }
 return div(value,inverseLifetime);
}
function trailRandom(seed,offset) {
 const x=(seed+offset)>>>0,t=((x<<11)^x)>>>0,u=(Math.imul(x,0x6ab51b9d)+0x714acb3f)>>>0;
 const v=((((u>>>11)^t)>>>8)^u^t)>>>0;
 return mul(v&0x7fffff,F(1/8388607));
}
function advanceTrailClock(system,deltaTime) {
 // D3C38A: timestep is float32; accumulated module+100 clock is double.
 system.clock+=F(deltaTime);
 return system.clock;
}
function createTrailState({capacity=8}={}) {
 if(!Number.isSafeInteger(capacity)||capacity<1)throw new RangeError('Positive Trail ring capacity required');
 return {capacity,latest:capacity-1,oldest:0,count:0,cumulativeLength:0,points:Array(capacity).fill(null)};
}
function clearParticleTrail(state) {
 state.latest=state.capacity-1;state.oldest=0;state.count=0;state.cumulativeLength=0;
 state.points.fill(null);
 return state;
}
function orderedTrailHistory(state) {
 return Array.from({length:state.count},(_,i)=>state.points[(state.oldest+i)%state.capacity]);
}
function growTrail(state) {
 const history=orderedTrailHistory(state),capacity=state.capacity*2;
 state.points=Array(capacity).fill(null);history.forEach((p,i)=>{state.points[i]=p;});
 state.capacity=capacity;state.oldest=0;state.latest=state.count-1;
}
// Affine input, w=1; native SIMD summation is (Y+X)+(Z+T), no division.
function transform(matrix,position) {
 const p=xyz(position),m=matrix;
 return [0,1,2,3].map(i=>add(add(mul(m[i+4],p[1]),mul(m[i],p[0])),add(mul(m[i+8],p[2]),F(m[i+12]))));
}
function worldTrailPosition(position,worldMatrix) {
 return worldMatrix?transform(worldMatrix,position).slice(0,3):xyz(position);
}
function updateParticleTrail(state,{clock,position,lifetime,agePercent=0,particleSeed=0,ratio=1,minVertexDistance=.001,worldMatrix}={}) {
 let evicted=0;
 if(state.count) {
  // Evict by SECOND-oldest time until a segment crossing the cutoff remains.
  while(state.count>1) {
   const second=state.points[(state.oldest+1)%state.capacity];
   if(!(clock-second.timestamp>F(lifetime)))break;
   state.points[state.oldest]=null;state.oldest=(state.oldest+1)%state.capacity;state.count--;evicted++;
  }
  if(state.count===1&&clock-state.points[state.oldest].timestamp>F(lifetime)) {
   state.points[state.oldest]=null;state.oldest=(state.oldest+1)%state.capacity;state.count=0;evicted++;
   state.cumulativeLength=0;
  }
 }
 // Ratio's stable hash does not consume a shared/emitter random stream.
 const ratioValue=F(ratio);
 if(ratioValue===0||ratioValue<trailRandom(particleSeed,RANDOM_OFFSETS.ratio)||F(agePercent)>=100)
  return {state,evicted,appended:false};
 const point=worldTrailPosition(position,worldMatrix);
 let square=0;
 if(state.count) {
  const previous=state.points[state.latest].position,delta=previous.map((v,i)=>sub(v,point[i]));
  square=sum3(delta);
  // Strictly greater, not >=. Timestamp does not count as spatial distance.
  if(!(square>mul(minVertexDistance,minVertexDistance)))return {state,evicted,appended:false};
 }
 if(state.count===state.capacity)growTrail(state);
 if(state.count)state.cumulativeLength=add(state.cumulativeLength,F(Math.sqrt(square)));
 state.latest=(state.latest+1)%state.capacity;
 state.points[state.latest]={position:point,timestamp:F(clock)};
 state.count++;
 return {state,evicted,appended:true};
}
function trailPoints(state,{clock,position,lifetime,worldMatrix}={}) {
 if(!state.count)return {points:[],tailFactor:0,cumulativeLength:state.cumulativeLength};
 const history=orderedTrailHistory(state),head=worldTrailPosition(position,worldMatrix);
 // 11B8F20: actual strip count is retained ring count PLUS a live head.
 const points=[head,...history.slice().reverse().map(p=>p.position.slice())];
 let tailFactor=0;
 if(history.length>1) {
  const a=history[0],b=history[1];
  // Double elapsed subtraction, then CVTPD2PS before lifetime subtraction.
  const elapsed=F(clock-a.timestamp),interval=sub(b.timestamp,a.timestamp);
  tailFactor=clamp01(div(sub(elapsed,lifetime),interval));
  const tail=points.length-1;
  points[tail]=a.position.map((v,i)=>add(v,mul(sub(b.position[i],v),tailFactor)));
 }
 const headDelta=head.map((v,i)=>sub(v,points[1][i]));
 return {points,tailFactor,cumulativeLength:add(state.cumulativeLength,F(Math.sqrt(sum3(headDelta))))};
}

function reciprocal(x,options={}) {
 x=F(x);const e=F((options.rcp||(v=>1/v))(x));
 let r=mul(sub(F(2.000000476837158),mul(e,x)),e);
 r=mul(r,sub(2,mul(r,x)));
 return Number.isNaN(r)?e:r;
}
function norm2(v,options={}) {
 const sq=sum2(v),estimate=F((options.rsqrt||(x=>1/Math.sqrt(x)))(sq));
 const r=min(mul(estimate,F(.9999998211860657)),MAX);
 const k=mul(sub(F(3.000000238418579),mul(mul(r,sq),r)),mul(.5,r));
 return v.map(x=>mul(x,k));
}
function join(a,b,ratio,options={}) {
 a=a.map(F);b=b.map(F);ratio=F(ratio);
 const difference=a.map((x,i)=>sub(x,b[i])),sum=a.map((x,i)=>add(x,b[i]));
 const blend=min(1,min(max(0,mul(50,sum2(difference))),max(0,mul(50,sum2(sum)))));
 const cap=max(1,mul(3,ratio));
 const sa=min(max(div(a[0],F(-a[1])),-100000),100000),sb=min(max(div(F(-b[0]),b[1]),-100000),100000);
 const ia=sub(a[1],mul(sa,a[0])),ib=sub(b[1],mul(sb,b[0]));
 let out;
 if(Math.abs(sub(sa,sb))<F(1e-5))out=a.slice();
 else{const x=div(sub(ib,ia),sub(sa,sb)),y=add(mul(sa,x),ia);out=[x,y].map((v,i)=>add(a[i],mul(sub(v,a[i]),blend)));}
 if(sum2(out)>mul(cap,cap))out=norm2(out,options).map(x=>mul(x,cap));
 return out;
}
function prepare(points,{inputMatrix=ID,baseWidth=1,...options}={}) {
 if(points.length<2)throw new RangeError('The native open strip requires at least two points');
 const positions=points.map(p=>transform(inputMatrix,p)),lengths=[],ratios=[],sides=[],joins=[];
 const diameter=add(baseWidth,baseWidth),inv=reciprocal(diameter,options),epsilon=F(points.length>2?1e-5:1e-30);
 let total=0,last=null;
 for(let i=0;i<positions.length;i++) {
  const j=Math.max(i,1);
  let d=positions[j-1].map((x,k)=>sub(x,positions[j][k]));
  const len=F(Math.sqrt(sum4(d)));
  lengths[i]=i?len:0;if(i)total=add(total,len);ratios[i]=mul(len,inv);
  if(sum4(d)<epsilon) {
   if(j<positions.length-1)d=positions[j].map((x,k)=>sub(x,positions[j+1][k]));
   if(sum4(d)<epsilon)d=last?last.slice():[1,0,0,0];else last=d.slice();
  }else last=d.slice();
  const p=positions[i].map(x=>mul(x<0||Object.is(x,-0)?-1:1,max(Math.abs(x),F(.01))));
  sides[i]=norm2([sub(mul(d[2],p[1]),mul(d[1],p[2])),sub(mul(d[0],p[2]),mul(d[2],p[0]))],options);
  if(i&&len<diameter) {
   const a=sides[i-1],b=sides[i],average=a.map((x,k)=>mul(add(x,b[k]),.5)),t=mul(max(sub(ratios[i],.5),0),2);
   const smooth=v=>{const w=v.map((x,k)=>add(average[k],mul(sub(x,average[k]),t)));return sum2(w)>TINY?norm2(w,options):v.slice();};
   sides[i-1]=smooth(a);sides[i]=smooth(b);
  }
 }
 for(let k=0;k<positions.length-2;k++)joins.push(join(sides[k+1].map(x=>F(-x)),sides[k+2].map(x=>F(-x)),clamp01(ratios[k]),options));
 return {positions,lengths,ratios,sides,joins,totalLength:max(total,F(1e-6))};
}
function strip(points,options={}) {
 const {outputMatrix=ID,baseWidth=1,textureScale=[1,1],width=1,depthBias=0,indexBase=0}=options;
 const s=prepare(points,options),inv=reciprocal(s.totalLength,options),vertices=[],uvs=[],indices=[],parameters=[],widths=[];
 let cumulative=0;
 for(let i=0;i<points.length;i++) {
  cumulative=add(cumulative,s.lengths[i]);
  const raw=mul(cumulative,inv),t=clamp01(raw),sample=typeof width==='function'?width(t,i):Array.isArray(width)?width[i]:width,w=mul(sample,baseWidth);
  parameters.push(t);widths.push(w);
  const center=s.positions[i].slice();center[2]=add(center[2],mul(w,depthBias));
  const tangent=s.sides[Math.min(i+1,points.length-1)];
  const v=(i&&i<points.length-1?s.joins[i-1]:tangent.map(x=>F(-x))).map(x=>mul(x,mul(w,.5)));
  for(const sign of [-1,1]) {
   const p=center.slice();p[0]=add(p[0],mul(sign,v[0]));p[1]=add(p[1],mul(sign,v[1]));
   vertices.push(transform(outputMatrix,p).slice(0,3));
   uvs.push([mul(raw,textureScale[0]),add(.5,mul(sign===-1?.5:-.5,textureScale[1]))]);
  }
  if(i){const n=indexBase+2*(i+1);indices.push(n-4,n-2,n-3,n-3,n-2,n-1);}
 }
 return {...s,parameters,widths,vertices,uvs,indices};
}
function drawWidth(currentSize,renderScale=[1,1,1],options={}) {
 const s=xyz(renderScale),volume=Math.abs(mul(mul(s[0],s[1]),s[2]));
 // Native C powf may differ at the last bit; do not replace exponent with 1/3.
 const scale=F((options.pow||Math.pow)(volume,F(1/3)));
 return mul(currentSize,scale);
}
function modulatePackedColor(a,b) {
 return a.map((v,i)=>(v*(b[i]+1))>>>8);
}
function buildParticleTrailGeometry(state,options={}) {
 const {currentSize=1,renderScale=[1,1,1],particleSeed=0,width=1,color=[255,255,255,255],baseColor=[255,255,255,255]}=options;
 const path=trailPoints(state,options);
 if(!path.points.length)return {vertices:[],uvs:[],colors:[],indices:[],points:[],tailFactor:0};
 const widthRandom=trailRandom(particleSeed,RANDOM_OFFSETS.width),colorRandom=trailRandom(particleSeed,RANDOM_OFFSETS.color);
 const baseWidth=drawWidth(currentSize,renderScale,options);
 const widthAt=typeof width==='function'?(t,i)=>width(t,i,widthRandom):width;
 // Ordinary source draw uses depthBias0. Shadow extrusion is a separate branch.
 const geometry=strip(path.points,{...options,baseWidth,width:widthAt,depthBias:0});
 const colors=geometry.parameters.flatMap((t,i)=>{
  const sample=typeof color==='function'?color(t,i,colorRandom):color;
  const packed=modulatePackedColor(baseColor,sample);
  return [packed.slice(),packed.slice()];
 });
 return {...geometry,...path,colors,baseWidth,widthRandom,colorRandom};
}
function unsupportedTrailForms({trail,initial={},renderer={},simulationSpace=0}={}) {
 if(!trail?.enabled)return ['TrailModule is disabled'];
 const reasons=[];
 for(const [ok,description]of [
  [trail.mode===0,'Only per-particle Trail mode0 is recovered'],
  [trail.textureMode===0,'Only Trail Stretch textureMode0 is recovered'],
  [!!trail.worldSpace&&simulationSpace===0,'Only world-space Trail with Local particle simulation is recovered'],
  [!!trail.dieWithParticles,'Trails that outlive their particles are not recovered'],
  [!initial.size3D,'Only scalar Trail size is recovered'],
  [!trail.generateLightingData,'Lit Trail vertex streams are not recovered'],
  [!renderer.m_UseCustomTrailVertexStreams,'Custom Trail vertex streams are not recovered'],
  [!renderer.m_ApplyActiveColorSpace,'Trail active-color-space conversion is not recovered'],
  [!renderer.m_CastShadows,'Trail shadow draws are not recovered']
 ])if(!ok)reasons.push(description);
 return reasons;
}
const api={F,ID,RANGE_EPSILON,RANDOM_OFFSETS,rangeCoefficients,normalizedSpeed,evaluateSizeBySpeed,applyLinear:evaluateSizeBySpeed,supportedSizeBySpeed,trailLifetime,trailRandom,advanceTrailClock,createTrailState,clearParticleTrail,orderedTrailHistory,updateParticleTrail,trailPoints,reciprocal,norm2,transform,join,prepare,strip,drawWidth,modulatePackedColor,buildParticleTrailGeometry,unsupportedTrailForms};
global.SDDYXParticleTrails=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
