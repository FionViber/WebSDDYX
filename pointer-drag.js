/* Reachable original SimpleDragable/SudanPoolController pointer movement.
 * Native: 5B1480/5B1580 and 5C6A40/5C6BE0/5C6DD0. No RiteController drag. */
(function(global){'use strict';
const F=Math.fround,SIMPLE=-1558990909,POOL=-198473300,CARD=209294394;
const GAME='5120d76301e969c0f8aa1b32aa0c43bb',UI='d3e719b59ab71ba3f6b398058c866280',TMP='67dfb1fdfb2b407222eda8e23ac8b724';
const DRAG_SCRIPTS=new Set([
 ...[SIMPLE,POOL,CARD,-330213183].map(id=>GAME+':'+id),
 ...[1367256648,-113659843,-2061169968,575553740,-1862395651].map(id=>UI+':'+id),
 TMP+':-1620774994'
]);
const scriptKey=c=>c?.fields?.m_Script?.guid+':'+c?.fields?.m_Script?.fileID;
const isScript=(c,id)=>scriptKey(c)===GAME+':'+id;
class WorldDrag {
 constructor(context={}){this.context=context;this.threshold=context.threshold??10;this.pressState=null;this.offset=null;this.dragging=false;this.disposed=false;}
 press(event){if(this.disposed||this.pressState)return false;this.pressState={pointerId:event.pointerId??1,button:event.button??0,x:event.x,y:event.y};return true;}
 move(event){
  const p=this.pressState;if(!p||this.disposed||(event.pointerId??1)!==p.pointerId)return false;
  if(!this.dragging){
   if((event.x-p.x)**2+(event.y-p.y)**2<this.threshold**2)return false;
   // Unity computes the offset in OnBeginDrag at the threshold-crossing point.
   const pointer=this.context.screenToWorld(event),position=this.context.getWorldPosition();
   this.offset={x:F(pointer.x-position.x),y:F(pointer.y-position.y),z:F((pointer.z||0)-(position.z||0))};
   this.dragging=true;this.context.begin?.(event,position);
  }
  const pointer=this.context.screenToWorld(event),position={x:F(pointer.x-this.offset.x),y:F(pointer.y-this.offset.y),z:F((pointer.z||0)-this.offset.z)};
  this.context.setWorldPosition(position);this.context.move?.(event,position);return true;
 }
 release(event={}){
  const p=this.pressState;if(!p||(event.pointerId??p.pointerId)!==p.pointerId||(event.button!==undefined&&event.button!==p.button))return false;
  const moved=this.dragging;this.pressState=null;this.dragging=false;this.offset=null;if(moved)this.context.end?.(event);return moved;
 }
 cancel(reason='cancel'){
  const moved=this.dragging;this.pressState=null;this.dragging=false;this.offset=null;
  // Browser blur/cancel/teardown is not a native completed drop or save request.
  if(moved)this.context.abort?.(reason);return moved;
 }
 destroy(){if(this.disposed)return;this.cancel('destroy');this.disposed=true;}
}
function resolve(ui,owner,ref){
 if(!ref?.fileID)return null;const id=String(ref.fileID),match=n=>String(n.source?.id??n.id)===id||String(n.source?.transformID)===id||n.components.some(c=>String(c.fileID)===id);
 return owner?.__unityNode.scope?.records?.find(match)?.element||(ui.findAll?.('*')||[]).find(el=>match(el.__unityNode))||null;
}
function sourceDragHandler(n){return !!n?.components?.some(c=>c.fields.m_Enabled!==0&&DRAG_SCRIPTS.has(scriptKey(c)));}
function nearestDragNode(target){for(let n=target?.closest?.('[data-unity-path]')?.__unityNode;n;n=n.parent)if(sourceDragHandler(n))return n;return null;}
function poolFromTarget(target){for(let n=target?.closest?.('[data-unity-path]')?.__unityNode;n;n=n.parent)if(n.visible!==false&&n.components.some(c=>isScript(c,POOL)&&c.fields.m_Enabled!==0))return n.element;return null;}
// The authored draggable branches have Z-only rotation. This preserves the full
// local Z chain across table/drag reparenting; XY uses the renderer's camera math.
function planarZ(n){if(!n)return{position:0,scale:1};const p=planarZ(n.parent),t=n.transform||{};return{position:F(p.position+F((t.m_LocalPosition?.z||0)*p.scale)),scale:F(p.scale*(t.m_LocalScale?.z??1))};}
function mountPool(ui,element,context={}){
 const component=element?.__unityNode.components.find(c=>isScript(c,POOL));if(!component)return null;
 let disposed=false,children=[];const ref=component.fields.SudanCardPrefab;
 function prefab(){return context.resolvePrefab?.(ref)||Object.values(global.SDDYX_PREFABS||{}).find(p=>p.guid===ref?.guid);}
 function refresh(pool=context.getPool?.()||[]){
  if(disposed||element.isConnected===false)return false;const data=prefab();if(!data)throw Error('Original SudanCard prefab is not loaded: '+ref?.guid);
  ui.batch(()=>{for(const child of children)child.destroy();children=[];
   for(let i=0;i<pool.length;i++){
    const view=ui.instantiate(data,element,{name:'SudanCard'+i});children.push(view);
    ui.setLocalPosition(view.element,{x:F(20*i),y:0,z:0});ui.setScale(view.element,{x:1,y:1,z:1});
   }
  });return true;
 }
 // Awake is the only proven caller. OnSudanPoolListChanged has no recovered
 // subscription, so changes in the engine do not automatically rebuild this.
 refresh();return{element,refresh,get count(){return children.length;},get children(){return children.slice();},destroy({parentDestroyed=false}={}){if(disposed)return;disposed=true;if(!parentDestroyed)for(const child of children)child.destroy();children=[];}};
}
function install(ui,context={}){
 const entries=new Map(),retired=new WeakSet(),offs=[],win=ui.element?.ownerDocument?.defaultView||global;let disposed=false;
 const all=()=>ui.findAll?.('*')||[];
 const bindings=context.getBindings?.()||context.bindings,selected=bindings?.controller('main'),selectedElement=selected?.path&&ui.find(selected.path);
 const controller=bindings?(selectedElement?{element:selectedElement,component:selectedElement.__unityNode.components.find(c=>String(c.fileID)===String(selected.componentId))}:null):all().flatMap(el=>el.__unityNode.components.map(component=>({element:el,component}))).find(x=>'desktopCamera'in x.component.fields&&'drag'in x.component.fields&&'table'in x.component.fields);
 if(bindings&&(!controller?.component||!('desktopCamera'in controller.component.fields)))throw Error('Selected original GameController drag references are unavailable');
 const fields=controller?.component?.fields||{},camera=context.camera||resolve(ui,controller?.element,fields.desktopCamera)||'/Main Camera';
 const dragParent=resolve(ui,controller?.element,fields.drag),tableParent=resolve(ui,controller?.element,fields.table);
 const eventSystem=all().flatMap(el=>el.__unityNode.components).find(c=>'m_DragThreshold'in c.fields),threshold=eventSystem?.fields.m_DragThreshold??10;
 function screenToWorld(event){
  if(context.screenToWorld)return context.screenToWorld(event,camera);
  const rect=(ui.container||ui.element).getBoundingClientRect(),cam=ui.getCamera(camera);if(!cam)throw Error('Original desktop camera is unavailable');
  const unit=2*cam.orthographicSize/rect.height;
  return{x:F(cam.position.x+(event.x-rect.left-rect.width/2)*unit),y:F(cam.position.y+(rect.top+rect.height/2-event.y)*unit),z:0};
 }
 function world(el){return{...ui.getWorldPosition(el,camera),z:context.getWorldZ?.(el)??planarZ(el.__unityNode).position};}
 function setWorld(el,position){
  const n=el.__unityNode,parent=n.parent?.element,local=parent?ui.worldToLocal(parent,position,camera):position,p=planarZ(n.parent);
  ui.setLocalPosition(el,{x:local.x,y:local.y,z:p.scale?F((position.z-p.position)/p.scale):n.transform.m_LocalPosition.z});context.setWorldZ?.(el,position.z);
 }
 function worldParent(el,parent){if(!parent||el.__unityNode.parent?.element===parent)return;const position=world(el);ui.reparent(el,parent,{worldPositionStays:false});setWorld(el,position);}
 function enabled(entry){return !disposed&&entry.element.isConnected!==false&&entry.element.__unityNode.visible!==false&&entry.element.__unityNode.active!==false&&entry.component.fields.m_Enabled!==0;}
 function targetOwns(entry,target){
  for(let n=target?.closest?.('[data-unity-path]')?.__unityNode;n;n=n.parent){if(n===entry.element.__unityNode)return true;if(sourceDragHandler(n)||context.hasDragHandler?.(n))return false;}return false;
 }
 function releaseCapture(entry){const pointer=entry.capturePointer;entry.capturePointer=null;if(pointer!=null&&entry.element.hasPointerCapture?.(pointer))entry.element.releasePointerCapture(pointer);}
 function register(el){
  if(disposed||!el?.__unityNode)return;
  for(const component of el.__unityNode.components){
   const pool=isScript(component,POOL);if((!pool&&!isScript(component,SIMPLE))||entries.has(component)||retired.has(component))continue;
   const entry={element:el,component,kind:pool?'pool':'simple',offs:[],pendingClick:false,oldInteractive:el.dataset.interactive,oldTabIndex:el.tabIndex,oldPointerEvents:el.style?.pointerEvents};
   entries.set(component,entry); // Recursive clone activation must see this entry.
   entry.model=new WorldDrag({threshold,screenToWorld,getWorldPosition:()=>world(el),setWorldPosition:p=>setWorld(el,p),
    begin(event){entry.pendingClick=true;entry.originalParent=el.__unityNode.parent?.element;if(pool)ui.batch(()=>{worldParent(el,dragParent);ui.setScale(el,{x:1,y:1,z:1});});entry.capturePointer=event.pointerId;el.setPointerCapture?.(event.pointerId);context.onBegin?.(el,entry.kind,event);},
    end(event){if(pool&&el.isConnected!==false)ui.batch(()=>{worldParent(el,tableParent);ui.setScale(el,{x:1,y:1,z:1});const position=ui.getLocalPosition(el);context.onPoolMoved?.({x:position.x,y:position.y},{element:el});});entry.originalParent=null;context.onEnd?.(el,entry.kind,event);},
    abort(reason){if(pool&&!entry.parentDestroyed&&el.isConnected!==false&&!el.__unityNode.removed&&entry.originalParent?.isConnected!==false)ui.batch(()=>worldParent(el,entry.originalParent));entry.originalParent=null;releaseCapture(entry);context.onCancel?.(el,entry.kind,reason);}
   });
   const down=e=>{if(!enabled(entry)||e.button>2||e.button<0||!targetOwns(entry,e.target))return;entry.pendingClick=false;
    entry.model.press({pointerId:e.pointerId,button:e.button,x:e.clientX,y:e.clientY});
   };
   // Only original descendant graphics become raycast receivers. No fabricated
   // root rectangle or keyboard-selectable MonoBehaviour is introduced.
   if(ui.on)entry.offs.push(ui.on(el,'pointerdown',down));else{el.addEventListener('pointerdown',down);entry.offs.push(()=>el.removeEventListener('pointerdown',down));}
   el.tabIndex=entry.oldTabIndex;if(el.style)el.style.pointerEvents='none';
   const click=e=>{if(entry.pendingClick&&e.detail>0){entry.pendingClick=false;e.preventDefault();e.stopImmediatePropagation();}};
   el.addEventListener('click',click,true);entry.offs.push(()=>el.removeEventListener('click',click,true));ui.refreshLayout?.(el);
   if(pool&&context.getPool)entry.poolView=mountPool(ui,el,context);
  }
 }
 function disposeEntry(component,parentDestroyed=false){
  const entry=entries.get(component);if(!entry)return;entry.parentDestroyed=parentDestroyed;retired.add(component);entries.delete(component);entry.model?.destroy();releaseCapture(entry);entry.poolView?.destroy({parentDestroyed});entry.offs.forEach(off=>off());
  if(entry.oldInteractive===undefined)delete entry.element.dataset.interactive;else entry.element.dataset.interactive=entry.oldInteractive;
  entry.element.tabIndex=entry.oldTabIndex;if(entry.element.style)entry.element.style.pointerEvents=entry.oldPointerEvents;
 }
 const listen=(name,handler)=>{win.addEventListener(name,handler);offs.push(()=>win.removeEventListener(name,handler));};
 listen('pointermove',e=>{for(const entry of entries.values())if(entry.model?.pressState){if(!enabled(entry)){entry.model.cancel('inactive');releaseCapture(entry);continue;}entry.model.move({pointerId:e.pointerId,button:e.button,x:e.clientX,y:e.clientY});}});
 listen('pointerup',e=>{for(const entry of entries.values()){const p=entry.model?.pressState;if(!p||p.pointerId!==e.pointerId||p.button!==e.button)continue;entry.model.release({pointerId:e.pointerId,button:e.button});releaseCapture(entry);}});
 listen('pointercancel',e=>{for(const entry of entries.values())if(entry.model?.pressState?.pointerId===e.pointerId){entry.model.cancel('pointercancel');releaseCapture(entry);}});
 listen('blur',()=>{for(const entry of entries.values()){entry.model?.cancel('blur');releaseCapture(entry);}});
 for(const el of all())register(el);
 const offActive=ui.onActiveChange?.(event=>{if(event.reason==='destroy'){for(const[component,entry]of entries)if(entry.element===event.element)disposeEntry(component,true);}else{register(event.element);if(!event.active)for(const entry of entries.values())if(entry.element===event.element){entry.model?.cancel('inactive');releaseCapture(entry);}}});
 return{entries,threshold,camera,register,poolFromTarget,refreshPool(element,pool){const entry=[...entries.values()].find(e=>e.element===element&&e.poolView);return entry?.poolView.refresh(pool)||false;},cancel(){for(const entry of entries.values()){entry.model?.cancel();releaseCapture(entry);}},destroy(){if(disposed)return;disposed=true;offActive?.();offs.forEach(off=>off());for(const component of [...entries.keys()])disposeEntry(component);}};
}
const api={WorldDrag,install,mountPool,sourceDragHandler,nearestDragNode,poolFromTarget,planarZ,scriptIds:{simple:SIMPLE,pool:POOL}};
global.SDDYXPointerDrag=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
