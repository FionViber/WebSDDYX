/* Native direct-ParticleSystem world units, separate from canvas projection.
 * UnityPlayer D66E30 / D53E30 / 1123070. No DOM or source-data mutation.
 * See analysis/native/particle-world-space/README.md for the supported scope. */
(function(global){'use strict';
const F=Math.fround,ZERO={x:0,y:0,z:0},ONE={x:1,y:1,z:1},Q={x:0,y:0,z:0,w:1};
const vec=(v,d=ZERO)=>({x:F(v?.x??d.x),y:F(v?.y??d.y),z:F(v?.z??d.z)});
const quat=q=>({x:F(q?.x??0),y:F(q?.y??0),z:F(q?.z??0),w:F(q?.w??1)});
const add=(a,b)=>F(F(a)+F(b)),sub=(a,b)=>F(F(a)-F(b)),mul=(a,b)=>F(F(a)*F(b));
function identity(){return[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
function multiply(a,b){const m=Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let n=mul(a[r],b[c*4]);for(let k=1;k<4;k++)n=add(n,mul(a[k*4+r],b[c*4+k]));m[c*4+r]=n;}return m;}
function transform(m,v,w=1){const p=vec(v),out={};for(const [r,key]of ['x','y','z'].entries())out[key]=add(add(add(mul(m[r],p.x),mul(m[r+4],p.y)),mul(m[r+8],p.z)),mul(m[r+12],w));return out;}
function quaternionMultiply(a,b){a=quat(a);b=quat(b);return{
 x:sub(add(add(mul(a.w,b.x),mul(a.x,b.w)),mul(a.y,b.z)),mul(a.z,b.y)),
 y:add(sub(add(mul(a.w,b.y),mul(a.y,b.w)),mul(a.x,b.z)),mul(a.z,b.x)),
 z:add(sub(add(mul(a.w,b.z),mul(a.x,b.y)),mul(a.y,b.x)),mul(a.z,b.w)),
 w:sub(sub(sub(mul(a.w,b.w),mul(a.x,b.x)),mul(a.y,b.y)),mul(a.z,b.z))};}
function trs(position=ZERO,rotation=Q,scale=ONE){const p=vec(position),q=quat(rotation),s=vec(scale,ONE),x=mul(q.x,2),y=mul(q.y,2),z=mul(q.z,2),xx=mul(q.x,x),yy=mul(q.y,y),zz=mul(q.z,z),xy=mul(q.x,y),xz=mul(q.x,z),yz=mul(q.y,z),wx=mul(q.w,x),wy=mul(q.w,y),wz=mul(q.w,z);return[
 mul(sub(1,add(yy,zz)),s.x),mul(add(xy,wz),s.x),mul(sub(xz,wy),s.x),0,
 mul(sub(xy,wz),s.y),mul(sub(1,add(xx,zz)),s.y),mul(add(yz,wx),s.y),0,
 mul(add(xz,wy),s.z),mul(sub(yz,wx),s.z),mul(sub(1,add(xx,yy)),s.z),0,p.x,p.y,p.z,1];}
function worldFromChain(chain){let matrix=identity(),rotation=quat(),localScale=vec(ONE);for(const t of chain){localScale=vec(t.scale??t.m_LocalScale,ONE);const q=quat(t.rotation??t.m_LocalRotation);matrix=multiply(matrix,trs(t.position??t.m_LocalPosition,q,localScale));rotation=quaternionMultiply(rotation,q);}const position={x:matrix[12],y:matrix[13],z:matrix[14]},r=trs(ZERO,rotation),lossyScale={};
 // Native 672340/4482B0 takes diag(inverse(worldRotation)*localToWorld).
 // This retains signed scale and shear behavior; column lengths are different.
 for(const [c,key]of ['x','y','z'].entries())lossyScale[key]=add(add(mul(r[c*4],matrix[c*4]),mul(r[c*4+1],matrix[c*4+1])),mul(r[c*4+2],matrix[c*4+2]));
 return{matrix,rotation,position,localScale,lossyScale};}
function scalingState(world,mode){if(![0,1,2].includes(mode))throw Error('Unsupported native particle scaling mode.');return{
 matrix:mode===0?world.matrix.slice():trs(world.position,world.rotation,mode===1?world.localScale:ONE),
 shapeScale:vec(mode===2?world.lossyScale:ONE,ONE),renderScale:vec(mode===0?world.lossyScale:mode===1?world.localScale:ONE,ONE)};}
function orthographicProjection(camera,width,height){const size=Number(camera.size??camera['orthographic size']);if(!(size>0&&width>0&&height>0))throw Error('Original orthographic camera and positive viewport required.');const q=quat(camera.rotation),p=vec(camera.position),inverseRotation=trs(ZERO,{x:-q.x,y:-q.y,z:-q.z,w:q.w}),view=multiply(inverseRotation,trs({x:-p.x,y:-p.y,z:-p.z})),v=camera.viewport??camera.m_NormalizedViewPortRect??{x:0,y:0,width:1,height:1},pixelsPerUnit=F(height*v.height/(2*size)),projection=trs({x:width*(v.x+v.width/2),y:height*(1-v.y-v.height/2),z:0},Q,{x:pixelsPerUnit,y:-pixelsPerUnit,z:1});return{matrix:multiply(projection,view),pixelsPerUnit,near:Number(camera.near??camera['near clip plane']??0),far:Number(camera.far??camera['far clip plane']??Infinity)};}
function directWorldBridge({chain,scalingMode,camera,width,height}){const world=worldFromChain(chain),state=scalingState(world,scalingMode),projection=orthographicProjection(camera,width,height);return{
 world,state,projection,emitterMatrix:state.matrix,
 spawnPosition:sample=>transform(state.matrix,sample),
 // Shape1123070 normalizes BEFORE this matrix. Never normalize this output.
 spawnVelocity:(normalizedShapeDirection,speed)=>transform(state.matrix,{x:mul(normalizedShapeDirection.x,speed),y:mul(normalizedShapeDirection.y,speed),z:mul(normalizedShapeDirection.z,speed)},0),
 project:position=>transform(projection.matrix,position),
 projectVector:velocity=>transform(projection.matrix,velocity,0),
 billboardSize:(x,y=x)=>({x:mul(mul(x,Math.abs(state.renderScale.x)),projection.pixelsPerUnit),y:mul(mul(y,Math.abs(state.renderScale.y)),projection.pixelsPerUnit)})};}
// Resolve the original RectTransform local position before TRS composition.
// m_AnchoredPosition is XY only: m_LocalPosition.z must be preserved.
function resolveTransform(t,parentRect=null){const rect=!!t.m_AnchorMin,position=vec(t.m_LocalPosition);let size=null,pivot=null;if(rect){const min=t.m_AnchorMin,max=t.m_AnchorMax??min,delta=t.m_SizeDelta??{x:0,y:0};pivot=t.m_Pivot??{x:.5,y:.5};size={x:add(delta.x,mul(parentRect?.size.x??0,sub(max.x,min.x))),y:add(delta.y,mul(parentRect?.size.y??0,sub(max.y,min.y)))};if(parentRect){const a=t.m_AnchoredPosition??{x:0,y:0};for(const key of ['x','y'])position[key]=add(a[key],mul(parentRect.size[key],sub(add(min[key],mul(sub(max[key],min[key]),pivot[key])),parentRect.pivot[key])));}}return{position,rotation:quat(t.m_LocalRotation),scale:vec(t.m_LocalScale,ONE),rect:rect?{size,pivot}:null};}
function sceneChain(scene,nodeId,{transformFor}={}){const nodes=scene.nodes,chain=[];for(let n=nodes[String(nodeId)];n;n=nodes[String(n.parent)])chain.unshift(n);let parentRect=null;return chain.map(n=>{const t=resolveTransform(transformFor?.(n)??n.transform??{},parentRect);parentRect=t.rect;return{...t,nodeId:n.id,path:n.path};});}
const api={identity,multiply,transform,quaternionMultiply,trs,worldFromChain,scalingState,orthographicProjection,directWorldBridge,resolveTransform,sceneChain};global.SDDYXParticleWorldSpace=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
