/* Native Game.TipsHolder + SlotTipsController. Original prefab/reference based.
 * Proof and production handoff: analysis/integration/desktop-tips-holder.md. */
(function(global){'use strict';
const SCRIPT_GUID='5120d76301e969c0f8aa1b32aa0c43bb',SCRIPT_ID=1022493241,SLOT_ID=-42766371;
const DEFAULT_PREFAB={fileID:1709254077376921,guid:'42298e7f219f2d9439335437e62d7e73',type:2};
const MANUAL_RITE_IDS=Object.freeze([13164,14520,14458]);
const REACHED_IDS=Object.freeze([13739,16604,11829,12048,11707,11887,11896,11925,12045,12533,15296,12723,13922,13925,13921,13924,13923,13920]);
const F=Math.fround,clamp=(v,a,b)=>v<a?a:v>b?b:v;
const OFFSETS=Object.freeze({normal:Object.freeze({x:F(.18518517911434174),y:F(-.18518517911434174)}),rightBottom:Object.freeze({x:F(-.2777777910232544),y:F(.46296295523643494)}),rightTop:Object.freeze({x:F(-.09259258955717087),y:F(-.18518517911434174)})});
const isScript=(c,id)=>c?.fields?.m_Script?.guid===SCRIPT_GUID&&Number(c.fields.m_Script.fileID)===id;
const holder=el=>el?.__unityNode?.components?.find(c=>isScript(c,SCRIPT_ID));
// Existing rite and equipment adapters own these desktop tips. Exclude by original
// component identity (including clones), never by display text or a guessed name.
function defaultExclude(element,component){return MANUAL_RITE_IDS.includes(Number(component.fileID))||element.__unityNode.components.some(c=>isScript(c,1552950188));}
function tipText(fields,translate){if(typeof fields.UpdateTips==='function')return fields.UpdateTips();if(fields.TipsId!=null&&String(fields.TipsId).length)return translate(fields.TipsId);return fields.Tips;}
// SetPositionInternal5B2300 takes bottom-left-origin screen pixels. Its clamp uses
// the Right RectTransform even when Left is shown, and chooses the side BEFORE
// clamping. The constants below are read from the supplied player's data section.
function positionPlan(screen,size,tipSize){
 const width=F(size.width),height=F(size.height),sx=F(width/3840),sy=F(height/2160),x=F(screen.x),y=F(screen.y),nx=F(x/width),ny=F(y/height),rightSide=nx>F(.8),top=ny>F(.8),bottom=ny<F(.2);
 const minX=F(50*sx),maxX=F(width-F(F((rightSide?0:F(tipSize.width))+50)*sx)),minY=F(F(F(F(tipSize.height)*F(.5))+(rightSide&&bottom?0:150))*sy),maxY=F(height-F(F(F(F(tipSize.height)*F(.5))*sy)*F(.5)));
 return{screen:{x:clamp(x,minX,maxX),y:clamp(y,minY,maxY)},offset:OFFSETS[rightSide&&top?'rightTop':rightSide&&bottom?'rightBottom':'normal'],right:!rightSide,left:rightSide,bounds:{minX,maxX,minY,maxY}};
}
function screenToWorld(screen,size,camera){const unit=2*camera.orthographicSize/size.height;return{x:camera.position.x+(screen.x-size.width/2)*unit,y:camera.position.y+(screen.y-size.height/2)*unit,z:0};}
function worldToScreen(world,size,camera){const scale=size.height/(2*camera.orthographicSize);return{x:size.width/2+(world.x-camera.position.x)*scale,y:size.height/2+(world.y-camera.position.y)*scale};}
function mount(ui,context={}){
 const bindings=context.bindings||context.getBindings?.();if(!bindings)throw Error('TipsHolder requires selected SceneBindings');
 for(const key of ['t','formatText','showSelectionView','isDragging'])if(typeof context[key]!=='function')throw Error('TipsHolder requires '+key+' callback');
 const resources=context.resources||global.SDDYXResources;if(!resources?.prefab)throw Error('TipsHolder requires local prefab resources');
 const records=new Map(),prefabs=new Map(),loading=new Map(),cleanups=[],pendingElements=new Set();let disposed=false,frame=null,observer=null,queued=false,serial=0,pointer=null;
 const raf=context.requestFrame||global.requestAnimationFrame?.bind(global),caf=context.cancelFrame||global.cancelAnimationFrame?.bind(global),now=()=>F(context.now?.()??global.performance.now()/1000),mobile=()=>context.isMobile?.()??!!bindings.isMobile;
 const resolveElement=value=>value?(value.__unityNode?value:ui.find(typeof value==='string'?value:value.path)):null;
 const dead=el=>!el?.__unityNode||el.__unityNode.removed||el.isConnected===false;
 const active=el=>{if(dead(el))return false;for(let n=el.__unityNode;n;n=n.parent)if(n.active===false||n.visible===false)return false;return true;};
 const enabled=record=>!context.isResourceBlocked?.()&&record.fields.m_Enabled!==0&&record.fields.m_Enabled!==false&&active(record.element);
 const native=ui.scene?.canvases?.find(c=>c.canvas.m_RenderMode!==2)?.referenceResolution||{x:3840,y:2160};
 const screenSize=()=>context.screenSize?.()||{width:native.x,height:native.y};
 const cameraRef=bindings.containers.main.desktopCamera;
 const camera=()=>{const value=context.getCamera?.()||ui.getCamera(cameraRef?.fileID||cameraRef?.path);if(!value?.orthographicSize)throw Error('Original Tips desktop camera is unresolved');return value;};
 const fail=error=>{if(context.fail)context.fail(error);else throw error;};
 const run=fn=>{try{const result=fn();if(result?.catch)result.catch(fail);return result;}catch(error){fail(error);}};
 function listen(el,event,fn,offs=cleanups){el?.addEventListener?.(event,fn);offs.push(()=>el?.removeEventListener?.(event,fn));}
 function localRef(owner,ref){if(!ref?.fileID)return null;const list=owner?.__unityNode?.scope?.records||[];const node=list.find(n=>String(n.source?.id)===String(ref.fileID)||String(n.source?.transformID)===String(ref.fileID)||n.components?.some(c=>String(c.fileID)===String(ref.fileID)));return node?.element||resolveElement(bindings.resolveRef(ref));}
 function scopeRef(scope,ref){return scope.findAll('*').find(el=>{const n=el.__unityNode;return String(n.source?.id)===String(ref?.fileID)||String(n.source?.transformID)===String(ref?.fileID)||n.components?.some(c=>String(c.fileID)===String(ref?.fileID));});}
 function prefabName(ref){const descriptor=bindings.resolveRef(ref?.fileID?ref:DEFAULT_PREFAB);if(!descriptor?.prefabName)throw Error('Original desktop Tips prefab is unresolved');return descriptor.prefabName;}
 function loadPrefab(name){if(prefabs.has(name))return prefabs.get(name);const cached=global.SDDYX_PREFABS?.[name];if(cached){prefabs.set(name,cached);return cached;}if(!loading.has(name))loading.set(name,Promise.resolve(resources.prefab(name)).then(data=>{if(!data)throw Error('Original Tips prefab absent: '+name);prefabs.set(name,data);loading.delete(name);return data;}));return loading.get(name);}
 function destroyTip(record){record.epoch++;record.pending=null;const tip=record.tip;record.tip=null;tip?.scope.destroy();}
 function disable(record){record.epoch++;record.pending=null;if(record.tip)ui.show(record.tip.element,false);}
 function drop(record){destroyTip(record);for(const off of record.offs)off();records.delete(record.element);}
 function setWorld(tip,world){const position=ui.worldToLocal(tip.parent,world,cameraRef?.fileID||cameraRef?.path);if(!position)throw Error('Original Tips world placement failed');const current=ui.getLocalPosition?.(tip.element);if(current&&Math.abs(current.x-position.x)<1e-7&&Math.abs(current.y-position.y)<1e-7&&Math.abs(current.z||0)<1e-7)return;ui.setLocalPosition(tip.element,{...position,z:0});}
 function setText(tip,value){for(const key of ['text','textLeft'])ui.setText(tip[key],value??'');}
 function place(tip,screen){const n=tip.Right.__unityNode,span=n.transform.m_AnchorMax||{},min=n.transform.m_AnchorMin||{},parent=n.parent?.box||{};
  // UnityUI keeps fitted dimensions in box rather than mutating serialized sizeDelta.
  const size={width:n.box?.w!=null?n.box.w-(parent.w||0)*((span.x||0)-(min.x||0)):n.transform.m_SizeDelta.x,height:n.box?.h!=null?n.box.h-(parent.h||0)*((span.y||0)-(min.y||0)):n.transform.m_SizeDelta.y},plan=positionPlan(screen,screenSize(),size),world=screenToWorld(plan.screen,screenSize(),camera());
  if(tip.Right.__unityNode.active!==plan.right)ui.show(tip.Right,plan.right);if(tip.Left.__unityNode.active!==plan.left)ui.show(tip.Left,plan.left);setWorld(tip,{x:world.x+plan.offset.x,y:world.y+plan.offset.y,z:0});tip.placement=plan;
 }
 function pointerScreen(event){if(!Number.isFinite(event?.clientX)||!Number.isFinite(event?.clientY))return;const rect=(ui.container||ui.element).getBoundingClientRect(),size=screenSize();pointer={x:(event.clientX-(rect.x??rect.left))*size.width/rect.width,y:(1-(event.clientY-(rect.y??rect.top))/rect.height)*size.height};}
 function createTip(record,pending,data){if(disposed||record.pending!==pending||record.epoch!==pending.epoch)return null;if(!enabled(record)){record.pending=null;return null;}
  const fields=record.fields,parent=fields.TipsContainer?.fileID?localRef(record.element,fields.TipsContainer):resolveElement(bindings.containers.main.ui)?.__unityNode.parent?.element;
  if(!parent)throw Error('Original desktop Tips parent is unresolved');const scope=ui.instantiate(data,parent,{name:'SourceTips_'+(++serial),active:true,scale:1}),component=scope.element.__unityNode.components.find(c=>isScript(c,SLOT_ID));
  if(!component){scope.destroy();throw Error('Original SlotTipsController absent');}
  const tip={scope,element:scope.element,parent,deadline:null};for(const key of ['text','textLeft','Right','Left']){tip[key]=scopeRef(scope,component.fields[key]);if(!tip[key]){scope.destroy();throw Error('Original SlotTipsController.'+key+' is unresolved');}}
  record.tip=tip;record.pending=null;
  if(Number(fields.NeedWidth)>0)for(const key of ['Right','Left'])ui.setSize(tip[key],{x:F(F(screenSize().width*F(fields.NeedWidth))/3840)});
  setText(tip,pending.text);ui.refreshLayout?.(tip.element);
  if(pending.mode==='pointer')setWorld(tip,{x:-100000,y:-100000,z:0});
  else{const owner=ui.getWorldPosition(record.element,cameraRef?.fileID||cameraRef?.path),offset=fields.SelectionTipsOffset||{};if(!owner)throw Error('Original Tips owner world position is unresolved');place(tip,worldToScreen({x:F(owner.x+F(offset.x||0)),y:F(owner.y+F(offset.y||0))},screenSize(),camera()));if(Number(fields.SelectionTipsElapseTime)>0)tip.deadline=F(pending.time+F(fields.SelectionTipsElapseTime));}
  return tip;
 }
 function present(record,mode){if(disposed||!enabled(record))return false;if(record.tip&&dead(record.tip.element))record.tip=null;
  const raw=tipText(record.fields,context.t),existing=record.tip||record.pending;
  if(!existing&&(raw==null||String(raw).length===0))return false;
  // Re-entering an existing tip is the sole native path WITHOUT ProcessPlaceholders.
  const value=mode==='pointer'&&existing?raw:context.formatText(raw??'');
  if(record.tip){setText(record.tip,value);ui.show(record.tip.element,true);return true;}
  if(record.pending){record.pending.text=value;return true;}
  const pending={mode,text:value,time:now(),epoch:++record.epoch};record.pending=pending;
  const data=loadPrefab(prefabName(record.fields.TipsPrefab));if(data?.then)return data.then(value=>{createTip(record,pending,value);return true;});createTip(record,pending,data);return true;
 }
 function discover(element){if(dead(element))return;let record=records.get(element);if(record)return record;const component=holder(element);if(!component||(context.exclude||defaultExclude)(element,component)||context.include?.(element,component)===false)return;
  record={element,component,fields:component.fields,tip:null,pending:null,epoch:0,offs:[]};records.set(element,record);
  listen(element,'pointerenter',event=>{if(!enabled(record))return;record.fields.IsHover=1;pointerScreen(event);if(!event.dragging&&!context.isDragging())run(()=>present(record,'pointer'));},record.offs);
  listen(element,'pointerleave',()=>{record.fields.IsHover=0;destroyTip(record);},record.offs);
  listen(element,'focus',()=>{if(enabled(record)&&(context.showSelectionView()||record.fields.IsHover))run(()=>present(record,'selection'));},record.offs);
  listen(element,'blur',()=>destroyTip(record),record.offs);return record;
 }
 function queueDiscover(element){if(disposed)return;const collect=el=>{if(el?.__unityNode){pendingElements.add(el);for(const child of el.__unityNode.children||[])collect(child.element);}else for(const child of el?.querySelectorAll?.('[data-unity-path]')||[])pendingElements.add(child);};collect(element);if(queued)return;queued=true;(context.queueTask||global.queueMicrotask||((fn)=>Promise.resolve().then(fn)))(()=>{queued=false;if(disposed)return;for(const record of records.values())if(dead(record.element))drop(record);for(const element of pendingElements)discover(element);pendingElements.clear();});}
 function sync(){if(disposed)return;for(const record of records.values())if(dead(record.element))drop(record);for(const element of ui.findAll('*'))discover(element);}
 // Locale refresh updates the retained presentation, not its lifetime or focus state.
 function refreshLocale(){if(disposed)return;for(const record of records.values()){if(dead(record.element)||!record.tip&&!record.pending)continue;const value=context.formatText(tipText(record.fields,context.t)??'');if(record.tip)setText(record.tip,value);if(record.pending)record.pending.text=value;}}
 function update(time=now()){if(disposed||context.isResourceBlocked?.())return;for(const record of records.values()){if(dead(record.element)){drop(record);continue;}if(!record.tip&&!record.pending)continue;if(!enabled(record)){if(record.pending||record.tip&&active(record.tip.element))disable(record);continue;}const tip=record.tip;if(!tip)continue;if(dead(tip.element)){record.tip=null;continue;}if(!active(tip.element))continue;
   // DelayDestroy.Update is suppressed while the retained tip is disabled, but its
   // absolute Time.time deadline is retained and checked on the first active frame.
   if(tip.deadline!==null&&F(time)>=tip.deadline){destroyTip(record);continue;}
   if(!mobile()&&!context.showSelectionView()){if(context.isDragging()){destroyTip(record);continue;}const current=context.getPointerScreen?.()||pointer;if(current)place(tip,current);}
  }}
 function tick(){run(()=>update());if(!disposed)frame=raf(tick);}
 sync();listen(ui.container||ui.element,'pointermove',pointerScreen);
 const offActive=ui.onActiveChange?.(event=>{const record=records.get(event.element);if(event.reason==='destroy'){if(record)drop(record);return;}if(record&&!event.active)disable(record);if(!record)discover(event.element);queueDiscover(event.element);});if(offActive)cleanups.push(offActive);
 const Observer=context.MutationObserver||global.MutationObserver;if(Observer&&ui.element){observer=new Observer(events=>{for(const event of events){for(const added of event.addedNodes||[])queueDiscover(added);if(event.removedNodes?.length)queueDiscover(null);}});observer.observe(ui.element,{childList:true,subtree:true});}
 const ready=Promise.resolve(loadPrefab(prefabName(DEFAULT_PREFAB)));if(raf)frame=raf(tick);
 const targetRecord=target=>{const element=resolveElement(target);return records.get(element)||discover(element);};
 return{ready,sync,update,refreshLocale,cancelForResourceGate(){for(const record of records.values())disable(record);},show(target){const record=targetRecord(target);return record?run(()=>present(record,'selection')):false;},select(target){const record=targetRecord(target);return record&&enabled(record)&&(context.showSelectionView()||record.fields.IsHover)?run(()=>present(record,'selection')):false;},deselect(target){const record=targetRecord(target);if(record)destroyTip(record);},disable(target){const record=targetRecord(target);if(record)disable(record);},inspect(){return[...records.values()].map(r=>({element:r.element,componentId:r.component.fileID,fields:r.fields,tip:r.tip,pending:!!r.pending}));},dispose(){if(disposed)return;disposed=true;observer?.disconnect();if(frame!==null)caf?.(frame);for(const record of [...records.values()])drop(record);for(const off of cleanups)off();pendingElements.clear();}};
}
const api={SCRIPT_GUID,SCRIPT_ID,DEFAULT_PREFAB,MANUAL_RITE_IDS,REACHED_IDS,OFFSETS,defaultExclude,tipText,positionPlan,screenToWorld,worldToScreen,mount};global.SDDYXTipsHolder=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
