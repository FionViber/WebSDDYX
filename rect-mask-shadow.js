/* Original uGUI RectMask2D / Shadow. Native evidence: analysis/native/MASK_SHADOW_NATIVE.md. */
(function(global){
'use strict';
const UI='d3e719b59ab71ba3f6b398058c866280',RECT=-146154839,SHADOW=1573420865;
const num=(v,d=0)=>Number.isFinite(+v)?+v:d,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const enabled=c=>c?.fields?.m_Enabled!==0;
const is=(c,id)=>c?.fields?.m_Script?.guid===UI&&c.fields.m_Script.fileID===id;
const isRectMask=c=>is(c,RECT),isShadow=c=>is(c,SHADOW);
const identity=()=>({a:1,b:0,c:0,d:1,e:0,f:0});
function matrix(m){return{a:num(m?.a,1),b:num(m?.b),c:num(m?.c),d:num(m?.d,1),e:num(m?.e),f:num(m?.f)};}
function multiply(a,b){return{a:a.a*b.a+a.c*b.b,b:a.b*b.a+a.d*b.b,c:a.a*b.c+a.c*b.d,d:a.b*b.c+a.d*b.d,e:a.a*b.e+a.c*b.f+a.e,f:a.b*b.e+a.d*b.f+a.f};}
function inverse(m){const det=m.a*m.d-m.b*m.c;if(!Number.isFinite(det)||Math.abs(det)<1e-14)return null;return{a:m.d/det,b:-m.b/det,c:-m.c/det,d:m.a/det,e:(m.c*m.f-m.d*m.e)/det,f:(m.b*m.e-m.a*m.f)/det};}
function point(m,x,y){return{x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f};}
function active(n){for(let p=n;p;p=p.parent)if(p.removed||p.active===false||p.active===0)return false;return true;}
function canvas(n){let found=null;for(let p=n;p;p=p.parent)if(p.components?.some(c=>c.type==='Canvas'&&enabled(c)))found=p;return found;}
function overrideCanvas(n){return n.components?.some(c=>c.type==='Canvas'&&enabled(c)&&c.fields.m_OverrideSorting);}
// MaskUtilities excludes the Graphic's own GameObject. An override-sorting
// canvas cuts off mask ancestors, but masks on that canvas still participate.
function ancestorMasks(n){const out=[];if(overrideCanvas(n))return out;for(let p=n.parent;p;p=p.parent){if(active(p))for(const c of p.components||[])if(isRectMask(c)&&enabled(c))out.push({node:p,component:c});if(overrideCanvas(p))break;}return out;}
// RectangularVertexClipper uses transformed corner 0 and corner 2, NOT an AABB.
// This takes browser top-left coordinates; Unity padding is left,bottom,right,top.
function paddedRect(width,height,m,p={}){const lo=point(m,0,height),hi=point(m,width,0);return{xMin:lo.x+num(p.x),yMin:hi.y+num(p.w),xMax:hi.x-num(p.z),yMax:lo.y-num(p.y)};}
function intersect(rects){if(!rects.length)return{valid:false,xMin:0,yMin:0,xMax:0,yMax:0};const r={xMin:Math.max(...rects.map(r=>r.xMin)),yMin:Math.max(...rects.map(r=>r.yMin)),xMax:Math.min(...rects.map(r=>r.xMax)),yMax:Math.min(...rects.map(r=>r.yMax))};r.valid=r.xMin<r.xMax&&r.yMin<r.yMax;return r;}
function contains(r,x,y){return r.valid!==false&&x>=r.xMin&&x<=r.xMax&&y>=r.yMin&&y<=r.yMax;}
// Graphic.Raycast visits filters on the Graphic itself as well as ancestors.
// Padding affects hits, softness does not (native IsRaycastLocationValid).
function raycastValid(n,stagePoint,{nodeMatrix}={}){for(let p=n;p;p=p.parent){if(active(p))for(const c of p.components||[])if(isRectMask(c)&&enabled(c)){const inv=inverse(matrix(nodeMatrix(p)));if(!inv)return false;const q=point(inv,stagePoint.x,stagePoint.y),r=paddedRect(p.box.w,p.box.h,identity(),c.fields.m_Padding);if(!contains(r,q.x,q.y))return false;}if(overrideCanvas(p))break;}return true;}
function raycastMasks(n){const out=[];for(let p=n;p;p=p.parent){if(active(p))for(const component of p.components||[])if(isRectMask(component)&&enabled(component))out.push({node:p,component});if(overrideCanvas(p))break;}return out;}
function clipPolygon(subject,boundary){if(!subject.length||boundary.length<3)return[];const area=boundary.reduce((a,p,i)=>{const q=boundary[(i+1)%boundary.length];return a+p.x*q.y-q.x*p.y;},0),sign=area>=0?1:-1;if(Math.abs(area)<1e-12)return[];let output=subject;for(let i=0;i<boundary.length;i++){const a=boundary[i],b=boundary[(i+1)%boundary.length],side=p=>sign*((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x)),input=output;output=[];if(!input.length)break;let p=input.at(-1),pd=side(p);for(const q of input){const qd=side(q);if((pd>=0)!==(qd>=0)){const t=pd/(pd-qd);output.push({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t});}if(qd>=0)output.push(q);p=q;pd=qd;}}return output;}
function hitPolygon(n,g,{nodeMatrix}={}){const masks=raycastMasks(n);if(!masks.length)return null;const inv=inverse(matrix(nodeMatrix(n))),padding=g.component.fields.m_RaycastPadding||{},left=num(padding.x),top=num(padding.w),right=n.box.w-num(padding.z),bottom=n.box.h-num(padding.y);if(!inv||left>=right||top>=bottom)return[];let polygon=[{x:left,y:top},{x:right,y:top},{x:right,y:bottom},{x:left,y:bottom}];for(const {node,component}of masks){const r=paddedRect(node.box.w,node.box.h,identity(),component.fields.m_Padding);if(r.xMin>=r.xMax||r.yMin>=r.yMax)return[];const m=multiply(inv,matrix(nodeMatrix(node))),bound=[[r.xMin,r.yMin],[r.xMax,r.yMin],[r.xMax,r.yMax],[r.xMin,r.yMax]].map(([x,y])=>point(m,x,y));polygon=clipPolygon(polygon,bound);}return polygon.map(p=>({x:p.x-left,y:p.y-top}));}
function applyDOMHit(g,n,options){if(!g.hitElement)return;const polygon=hitPolygon(n,g,options);g.hitElement.style.clipPath=polygon===null?'':polygon.length?'polygon('+polygon.map(p=>`${p.x}px ${p.y}px`).join(',')+')':'polygon(0px 0px,0px 0px,0px 0px)';}
function clipState(n,g,{nodeMatrix,pixelScale=1,materialSoftness={}}={}){
 if(g.component.fields.m_Maskable===0||!enabled(g.component))return null;
 const masks=ancestorMasks(n);if(!masks.length)return null;
 const root=canvas(masks[0].node);if(!root)return null;
 const rootMatrix=matrix(nodeMatrix(root)),inv=inverse(rootMatrix);if(!inv)return{valid:false};
 const rect=intersect(masks.map(({node,component})=>paddedRect(node.box.w,node.box.h,multiply(inv,matrix(nodeMatrix(node))),component.fields.m_Padding)));
 const softness=masks[0].component.fields.m_Softness||{},rootScale={x:Math.hypot(rootMatrix.a,rootMatrix.b),y:Math.hypot(rootMatrix.c,rootMatrix.d)};
 const scale=typeof pixelScale==='number'?{x:pixelScale,y:pixelScale}:pixelScale;
 return{...rect,softness:{x:Math.max(0,num(softness.x),num(materialSoftness.x)),y:Math.max(0,num(softness.y),num(materialSoftness.y))},pixelSize:{x:1/(2*Math.max(1e-9,num(scale.x,1)*rootScale.x)),y:1/(2*Math.max(1e-9,num(scale.y,1)*rootScale.y))},nodeToCanvas:multiply(inv,matrix(nodeMatrix(n))),owner:masks[0].component.fileID};
}
// UI/Default native vertex: scale=.25/(.25*softness+abs(pixelSize)).
// Pixel: saturate((rectSize-abs(2*position-min-max))*scale), multiplied X*Y.
function rampWidth(softness,pixelSize){return Math.max(0,num(softness))/2+2*Math.abs(num(pixelSize));}
function axisAlpha(value,min,max,width){if(max<=min||value<min||value>max)return 0;if(width<=0)return 1;return clamp(Math.min(value-min,max-value)/width);}
function clipAlpha(state,x,y){if(!state)return 1;if(!state.valid)return 0;return axisAlpha(x,state.xMin,state.xMax,rampWidth(state.softness.x,state.pixelSize.x))*axisAlpha(y,state.yMin,state.yMax,rampWidth(state.softness.y,state.pixelSize.y));}
function gradientStops(length,width){if(width<=0)return[[0,1],[1,1]];const mid=length/2;if(width>=mid)return[[0,0],[.5,clamp(mid/width)],[1,0]];return[[0,0],[width/length,1],[1-width/length,1],[1,0]];}
function graphicMatrix(state,geometry={}){return multiply(state.nodeToCanvas,{a:1,b:0,c:0,d:1,e:num(geometry.left)+num(geometry.offsetX),f:num(geometry.top)+num(geometry.offsetY)});}
function svgMask(state,geometry={}){
 if(!state?.valid)return{svg:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',left:0,top:0,width:1,height:1};
 const inv=inverse(graphicMatrix(state,geometry));if(!inv)return svgMask(null);
 const r=state,w=r.xMax-r.xMin,h=r.yMax-r.yMin,origin=point(inv,r.xMin,r.yMin),linear={...inv,e:0,f:0},corners=[[0,0],[w,0],[w,h],[0,h]].map(([x,y])=>point(linear,x,y));
 const minX=Math.min(...corners.map(p=>p.x)),minY=Math.min(...corners.map(p=>p.y)),left=origin.x+minX,top=origin.y+minY,width=Math.max(...corners.map(p=>p.x))-minX,height=Math.max(...corners.map(p=>p.y))-minY;
 const stops=arr=>arr.map(([o,a])=>`<stop offset="${o}" stop-color="white" stop-opacity="${a}"/>`).join('');
 const xs=stops(gradientStops(w,rampWidth(r.softness.x,r.pixelSize.x))),ys=stops(gradientStops(h,rampWidth(r.softness.y,r.pixelSize.y))),rect=`x="0" y="0" width="${w}" height="${h}"`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="x">${xs}</linearGradient><linearGradient id="y" x1="0" y1="0" x2="0" y2="1">${ys}</linearGradient><mask id="y-mask" maskUnits="userSpaceOnUse" ${rect} style="mask-type:alpha"><rect ${rect} fill="url(#y)"/></mask></defs><g transform="matrix(${inv.a} ${inv.b} ${inv.c} ${inv.d} ${-minX} ${-minY})"><rect ${rect} fill="url(#x)" mask="url(#y-mask)"/></g></svg>`;
 return{svg,left,top,width,height};
}
// Avoid an intermediate SVG mask raster for source axis-aligned UI. The
// product is identical to native UI/Default, including sub-opaque narrow peaks.
function directGradientMask(state,geometry={}){
 if(!state?.valid)return null;const m=graphicMatrix(state,geometry);
 if(m.b!==0||m.c!==0||m.a<=0||m.d<=0)return null;
 const width=(state.xMax-state.xMin)/m.a,height=(state.yMax-state.yMin)/m.d;
 const gradient=(direction,length,ramp)=>`linear-gradient(to ${direction},`+gradientStops(length,ramp).map(([t,a])=>`rgba(255,255,255,${a}) ${t*length}px`).join(',')+')';
 return{image:gradient('right',width,rampWidth(state.softness.x,state.pixelSize.x)/m.a)+','+gradient('bottom',height,rampWidth(state.softness.y,state.pixelSize.y)/m.d),size:`${width}px ${height}px,${width}px ${height}px`,position:`${(state.xMin-m.e)/m.a}px ${(state.yMin-m.f)/m.d}px,${(state.xMin-m.e)/m.a}px ${(state.yMin-m.f)/m.d}px`};
}
function applyDOMMask(g,state,geometry={}){
 const el=g.element;if(!state){if(g.rectMaskKey!==undefined){for(const name of ['maskImage','webkitMaskImage','maskSize','webkitMaskSize','maskPosition','webkitMaskPosition','maskRepeat','webkitMaskRepeat','maskClip','webkitMaskClip','maskComposite','webkitMaskComposite'])el.style[name]='';delete g.rectMaskKey;delete g.rectMaskSVG;delete g.rectMaskImage;delete el.dataset.rectMask;}g.rectMaskState=null;return;}
 const key=JSON.stringify([state,geometry]);g.rectMaskState=state;g.rectMaskGeometry=geometry;if(key===g.rectMaskKey)return;g.rectMaskKey=key;
 const direct=directGradientMask(state,geometry);
 if(direct){if(direct.image!==g.rectMaskImage){g.rectMaskImage=direct.image;el.style.maskImage=el.style.webkitMaskImage=direct.image;}delete g.rectMaskSVG;el.style.maskSize=el.style.webkitMaskSize=direct.size;el.style.maskPosition=el.style.webkitMaskPosition=direct.position;el.style.maskRepeat=el.style.webkitMaskRepeat='no-repeat,no-repeat';el.style.maskClip=el.style.webkitMaskClip='no-clip,no-clip';el.style.maskComposite='intersect';el.style.webkitMaskComposite='source-in';el.dataset.rectMask=String(state.owner);return;}
 delete g.rectMaskImage;el.style.maskComposite=el.style.webkitMaskComposite='';const mask=svgMask(state,geometry);
 // Translation changes only mask-position. Keep the same decoded SVG identity
 // during scrolling/position animation; size/rotation/softness change its pixels.
 if(mask.svg!==g.rectMaskSVG){g.rectMaskSVG=mask.svg;el.style.maskImage=el.style.webkitMaskImage='url("data:image/svg+xml,'+encodeURIComponent(mask.svg)+'")';}el.style.maskSize=el.style.webkitMaskSize=`${mask.width}px ${mask.height}px`;el.style.maskPosition=el.style.webkitMaskPosition=`${mask.left}px ${mask.top}px`;el.style.maskRepeat=el.style.webkitMaskRepeat='no-repeat';el.style.maskClip=el.style.webkitMaskClip='no-clip';el.dataset.rectMask=String(state.owner);
}
// Apply exactly the same separable alpha product to capture layers. Never tint
// their RGB or apply the clipping alpha twice. The input canvas is caller-owned.
function applyCanvasMask(target,state,geometry={},createCanvas){
 if(!state)return target;const ctx=target.getContext('2d');if(!state.valid){ctx.clearRect(0,0,target.width,target.height);return target;}
 const inv=inverse(graphicMatrix(state,geometry));if(!inv){ctx.clearRect(0,0,target.width,target.height);return target;}
 const mask=createCanvas?createCanvas():target.ownerDocument.createElement('canvas');mask.width=target.width;mask.height=target.height;const c=mask.getContext('2d'),sx=target.width/Math.max(1e-9,geometry.width),sy=target.height/Math.max(1e-9,geometry.height),r=state,w=r.xMax-r.xMin,h=r.yMax-r.yMin;
 c.setTransform(sx*inv.a,sy*inv.b,sx*inv.c,sy*inv.d,sx*inv.e,sy*inv.f);
 const x=c.createLinearGradient(r.xMin,0,r.xMax,0),y=c.createLinearGradient(0,r.yMin,0,r.yMax);for(const [o,a]of gradientStops(w,rampWidth(r.softness.x,r.pixelSize.x)))x.addColorStop(o,`rgba(255,255,255,${a})`);for(const [o,a]of gradientStops(h,rampWidth(r.softness.y,r.pixelSize.y)))y.addColorStop(o,`rgba(255,255,255,${a})`);
 c.fillStyle=x;c.fillRect(r.xMin,r.yMin,w,h);c.globalCompositeOperation='destination-in';c.fillStyle=y;c.fillRect(r.xMin,r.yMin,w,h);
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0);ctx.restore();mask.width=1;mask.height=1;return target;
}
// Color32.op_Implicit uses clamp, single-precision *255 and round-to-even.
function roundEven(v){const lo=Math.floor(v),d=v-lo;return d<.5?lo:d>.5?lo+1:lo%2?lo+1:lo;}
function color32(c={}){return Object.fromEntries(['r','g','b','a'].map(k=>[k,roundEven(Math.fround(Math.fround(clamp(num(c[k],1)))*255))]));}
function shadowColor(effectColor,sourceColor,useGraphicAlpha=true){const e=color32(effectColor),s=color32(sourceColor);if(useGraphicAlpha)e.a=Math.floor(e.a*s.a/255);return Object.fromEntries(Object.entries(e).map(([k,v])=>[k,v/255]));}
function applyShadowVertices(vertices,fields){const shadow=vertices.map(v=>{const c=color32(fields.m_EffectColor),alpha=fields.m_UseGraphicAlpha===0?c.a:Math.floor(c.a*v.color.a/255);return{...v,position:{...v.position,x:v.position.x+num(fields.m_EffectDistance?.x),y:v.position.y+num(fields.m_EffectDistance?.y)},color:{...c,a:alpha}};});return shadow.concat(vertices.map(v=>({...v,position:{...v.position},color:{...v.color}})));}
function createBlackSpriteCache(registry={}){
 const records=new Map();let dead=false;
 return{get size(){return records.size;},release(g){records.delete(g);},destroy(){dead=true;records.clear();},resolve(g,s,material,color){
  const entry=s?.url&&registry[s.url];
  if(dead||!g.shadowSource||material||s?.canvas||!entry||!color||!['r','g','b'].every(k=>color[k]===0)){records.delete(g);return s;}
  // Sprite identity/geometry changes must invalidate the draw key. Alpha,
  // CanvasRenderer alpha and distance do not change immutable texture bytes.
  const signature=JSON.stringify([s,entry.sha256]);let record=records.get(g);
  if(!record||record.signature!==signature){record={signature,sprite:{...s,guid:(s.guid||s.url)+':native-black:'+entry.sha256,url:entry.url,nativeBlackShadow:true}};records.set(g,record);}
  return record.sprite;
 }};
}
function createShadowGraphic(original,component,document){const el=document.createElement('div');el.className='sddyx-unity-graphic sddyx-unity-image sddyx-unity-shadow';el.dataset.componentId='shadow:'+component.fileID;el.dataset.raycast='false';el.setAttribute('aria-hidden','true');const g={kind:'image',element:el,component:{...original.component,fileID:'shadow:'+component.fileID,canvasOwnerComponent:original.component,fields:{}},shadowSource:original,shadowEffect:component,canvasOwnerComponent:original.component};syncShadowGraphic(g);return g;}
function syncShadowGraphic(g){if(!g.shadowSource)return;const original=g.shadowSource,f=original.component.fields,e=g.shadowEffect.fields;g.component.fields={...f,m_Enabled:enabled(original.component)&&enabled(g.shadowEffect)?1:0,m_Color:shadowColor(e.m_EffectColor,f.m_Color,e.m_UseGraphicAlpha!==0),m_RaycastTarget:0};g.sprite=original.sprite;g.raw=original.raw;g.materialOverride=original.materialOverride;g.canvasAlpha=original.canvasAlpha;g.shadowOffset={x:num(e.m_EffectDistance?.x),y:-num(e.m_EffectDistance?.y)};g.element.style.transform=`translate(${g.shadowOffset.x}px,${g.shadowOffset.y}px)`;}
const api={UI,RECT,SHADOW,isRectMask,isShadow,enabled,identity,matrix,multiply,inverse,point,ancestorMasks,paddedRect,intersect,contains,raycastValid,raycastMasks,clipPolygon,hitPolygon,applyDOMHit,clipState,rampWidth,axisAlpha,clipAlpha,gradientStops,graphicMatrix,svgMask,directGradientMask,applyDOMMask,applyCanvasMask,roundEven,color32,shadowColor,applyShadowVertices,createBlackSpriteCache,createShadowGraphic,syncShadowGraphic};
global.SDDYXRectMaskShadow=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
