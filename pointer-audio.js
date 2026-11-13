/* Original SFxPointerClick and SFxButton/SFxToggle lifecycle adapters.
 * Sources: Core 409510,407CC0,407C20,407C10; Unity ExecuteEvents 67A1D0.
 * Physical pointer clicks and Button/Toggle UnityEvents are distinct channels. */
(function(global){'use strict';
const CORE='6c8e168389b232d7cc78427b51f93153',GAME='5120d76301e969c0f8aa1b32aa0c43bb',UI='d3e719b59ab71ba3f6b398058c866280',TMP='67dfb1fdfb2b407222eda8e23ac8b724';
const IDS={pointerClick:-1015044909,button:413011564,toggle:-1700586604,pointerEnter:-488193239};
const DELEGATER=1066206880,BUTTON_KEY=UI+':1392445389';
const NAMES='BUTTON_BACK BUTTON_CONFIRM BUTTON_NEXT_DAY CARD_BEGIN_DRAG CARD_END_DRAG RITE_OPEN RITE_SLOT_AVAILABLE ROLL_DICE SUDAN_BOX_OPEN SUDAN_BROKEN_STEP1 SUDAN_BROKEN_STEP2 SUDAN_BROKEN_STEP_FINAL PRESTIGE_SWING_1 PRESTIGE_SWING_2 PRESTIGE_SWING_3 PRESTIGE_SWING_4 OPTION_TOGGLE_HIGHLIGHT OPTION_TOGGLE_CLICK DRAW_SUDAN_CARD_KILL DRAW_SUDAN_CARD_WASTEFULNESS DRAW_SUDAN_CARD_WAR DRAW_SUDAN_CARD_DESIRE SHOW_RITE_NAME SHOW_CARD_INFO SHOW_PROMPT DROP_CARD_GOLD DROP_CARD_SILVER DROP_CARD_COPPER ADD_CARD SHOW_POP SHOW_POP_BIG SUDAN_BROKEN_STEP0 SUDAN_BROKEN_STEP0_WAITING NOTE_LIST_SCROLL ADD_NOTE RITE_UNKNOWN CHANGE_BAG CARD_HIGHLIGHT NOTE_FOLD FLASH_CARD DICE_SHOW DICE_SUCCESS DICE_FAILED SETTLE_CARD_NEW_GREAT SETTLE_CARD_NEW_NOMAL SETTLE_CARD_NEW_BAD ADD_CARD_TO_TESULT ITHINK_IDLE_1 ITHINK_IDLE_2 ITHINK_IDLE_3 ITHINK_OPEN ITHINK_CLOSE ITHINK_THINK_OVER NEXT_DAY_NIGHT WIZARD_OPEN QUEST_ENTER'.split(' ');
const CLICK_KEYS=new Set(["5120d76301e969c0f8aa1b32aa0c43bb:-1296701300","5120d76301e969c0f8aa1b32aa0c43bb:-1853293637","5120d76301e969c0f8aa1b32aa0c43bb:-1967331287","5120d76301e969c0f8aa1b32aa0c43bb:-258351679","5120d76301e969c0f8aa1b32aa0c43bb:-524541001","5120d76301e969c0f8aa1b32aa0c43bb:-871619204","5120d76301e969c0f8aa1b32aa0c43bb:1464968446","5120d76301e969c0f8aa1b32aa0c43bb:154055726","5120d76301e969c0f8aa1b32aa0c43bb:1709513287","5120d76301e969c0f8aa1b32aa0c43bb:1972242944","5120d76301e969c0f8aa1b32aa0c43bb:2046719147","5120d76301e969c0f8aa1b32aa0c43bb:2086391812","5120d76301e969c0f8aa1b32aa0c43bb:2133241980","5120d76301e969c0f8aa1b32aa0c43bb:2146695104","5120d76301e969c0f8aa1b32aa0c43bb:288140785","6c8e168389b232d7cc78427b51f93153:-1015044909","6c8e168389b232d7cc78427b51f93153:-1304593328","6c8e168389b232d7cc78427b51f93153:1066206880","6c8e168389b232d7cc78427b51f93153:1871174530"]);
// Inherited Button implementations do not redeclare OnPointerClick in metadata.
for(const id of[209294394,609626807,-1868413992,-38088880,-1510932105,2080899617,271932690])CLICK_KEYS.add(GAME+':'+id);
CLICK_KEYS.add(CORE+':2069697623');
for(const id of[1392445389,2109663825,853051423,575553740,-1862395651])CLICK_KEYS.add(UI+':'+id);
CLICK_KEYS.add(TMP+':-1620774994');CLICK_KEYS.add(TMP+':1148083418');
const DOWN_KEYS=new Set([CORE+':1605256492',GAME+':-1778612117',UI+':-1862395651']);
const key=c=>c?.fields?.m_Script?.guid+':'+c?.fields?.m_Script?.fileID;
const enabled=c=>c?.fields?.m_Enabled!==0;
const is=(c,id)=>key(c)===CORE+':'+id;
const active=n=>!!n&&n.visible!==false&&n.active!==false&&!n.removed&&n.element?.isConnected!==false;
const clickHandler=n=>!!n?.components?.some(c=>enabled(c)&&CLICK_KEYS.has(key(c)));
const downHandler=n=>!!n?.components?.some(c=>enabled(c)&&(c.fields.m_Navigation||DOWN_KEYS.has(key(c))));
const nodeOf=target=>target?.__unityNode||target?.closest?.('[data-unity-path]')?.__unityNode;
function nearest(target,predicate=clickHandler){for(let n=nodeOf(target);n;n=n.parent)if(active(n)&&predicate(n))return n;return null;}
function hasComponent(target){return !!nodeOf(target)?.components?.some(c=>is(c,IDS.pointerClick));}
function enumName(value){const i=Number(value);return NAMES[i]??String(i);}
// PointerClickDelegater 434560: ordered GameObject targets, Unity-null skip,
// SendMessage("OnPointerClick", eventData). References are GameObjects, not
// component IDs, and belong to the owner's scene/prefab instance scope.
function forwardPointerClick(node,component,event,sendMessage){
 for(const ref of component.fields.targets){
  if(!ref?.fileID)continue;
  const target=node.scope?.byID?.get(String(ref.fileID));
  if(target&&!target.removed&&target.element?.isConnected!==false)sendMessage(target,event);
 }
}
function buttonCanPress(node,component,event){
 if(event.button!==0||!enabled(component)||component.fields.m_Interactable===0)return false;
 for(let p=node;p;p=p.parent)if(!active(p))return false;
 // Selectable.ParentGroupAllowsInteraction 1BE3A90: inspect groups in order;
 // enabled noninteractable group rejects; ignoreParentGroups returns true even
 // on a disabled group. Raycast blocking/alpha are not Button.Press guards.
 for(let p=node;p;p=p.parent)for(const c of p.components||[]){
  if(c.type!=='CanvasGroup')continue;
  if(enabled(c)&&c.fields.m_Interactable===0)return false;
  if(c.fields.m_IgnoreParentGroups)return true;
 }
 return true;
}
class PointerClick {
 constructor({threshold=10,onClick=()=>{}}={}){this.threshold=threshold;this.onClick=onClick;this.presses=new Map();}
 token(e){return(e.pointerId??1)+':'+(e.button??0);}
 down(e,{press,click,drag}={}){if(!press&&!click)return false;this.presses.set(this.token(e),{pointerId:e.pointerId??1,button:e.button??0,x:e.clientX,y:e.clientY,press:press||click,click,drag,eligible:true,dragging:false});return true;}
 move(e){for(const p of this.presses.values())if(p.pointerId===(e.pointerId??1)&&!p.dragging&&p.drag&&(e.clientX-p.x)**2+(e.clientY-p.y)**2>=this.threshold**2){p.dragging=true;if(p.press!==p.drag)p.eligible=false;}}
 up(e,click){const token=this.token(e),p=this.presses.get(token);this.presses.delete(token);if(!p||!p.eligible||p.press!==click||!active(click))return false;this.onClick(click,e);return true;}
 cancel(pointerId){if(pointerId==null)this.presses.clear();else for(const[token,p]of this.presses)if(p.pointerId===pointerId)this.presses.delete(token);}
}
function install(ui,context={}){
 const root=ui.element,doc=root?.ownerDocument||global.document,win=doc?.defaultView||global,entries=new Map(),retired=new WeakSet(),queued=new Set(),offs=[];let disposed=false;
 const all=()=>ui.findAll?.('*')||[];
 const eventSystem=all().flatMap(el=>el.__unityNode.components).find(c=>'m_DragThreshold'in c.fields),threshold=eventSystem?.fields.m_DragThreshold??10;
 const emit=(value,detail)=>{if(disposed)return;const name=enumName(value);(context.getAudio?.()||context.audio)?.trigger(name);context.onCue?.(name,detail);};
 function resolve(owner,ref,predicate){const n=owner.__unityNode;if(ref?.fileID){const id=String(ref.fileID);return(n.scope?.records||all().map(el=>el.__unityNode)).find(x=>x.components.some(c=>String(c.fileID)===id))?.element||null;}return n.components.some(predicate)?owner:null;}
 function queue(value,detail){const fn=()=>{if(!queued.delete(fn))return;emit(value,detail);};queued.add(fn);if(context.defer)context.defer(fn);else if(win.queueMicrotask)win.queueMicrotask(fn);else Promise.resolve().then(fn);}
 function register(el){
  const n=el?.__unityNode;if(disposed||!n)return;
  for(const component of n.components){
   if(retired.has(component))continue;const type=is(component,DELEGATER)?'delegater':Object.keys(IDS).find(type=>is(component,IDS[type]));if(!type)continue;
   let entry=entries.get(component);if(!entry){entry={component,element:el,type,started:false,offs:[]};entries.set(component,entry);}
   if((type==='button'||type==='toggle')&&!entry.started&&active(n)&&enabled(component)){
    const target=resolve(el,component.fields[type],c=>type==='button'?!!c.fields.m_OnClick:('m_IsOn'in c.fields));if(!target)continue;
    entry.started=true;entry.target=target;const eventName=type==='button'?'unity:click':'unity:toggle';
    const handler=e=>{if(e.target!==target||disposed)return;const f=component.fields,value=type==='button'?(f.sfxType??1):(e.detail?.value?(f.onType??1):(f.offType??0));queue(value,{type,element:el,target,component,event:e});};
    target.addEventListener(eventName,handler);entry.offs.push(()=>target.removeEventListener(eventName,handler));
   }
   if((type==='pointerClick'||type==='pointerEnter'||type==='delegater')&&!entry.raycast){
    entry.raycast=true;entry.oldInteractive=el.dataset.interactive;entry.oldPointerEvents=el.style?.pointerEvents;
    // Preserve original Graphic raycast geometry, not a fabricated root rectangle.
    if(el.dataset.interactive!=='true'){el.dataset.interactive='true';if(el.style)el.style.pointerEvents='none';entry.changedInteractive=true;}
   }
  }
 }
 function remove(el){for(const[c,entry]of[...entries])if(entry.element===el){retired.add(c);for(const off of entry.offs)off();if(entry.changedInteractive){if(entry.oldInteractive===undefined)delete el.dataset.interactive;else el.dataset.interactive=entry.oldInteractive;if(el.style)el.style.pointerEvents=entry.oldPointerEvents;}entries.delete(c);}}
 function sendPointerClick(node,event){
  if(!active(node))return;
  // Authored forwarding targets in both GameScenes have ordinary UI.Button.
  // Use the existing Button notification/controller bridge exactly once; do
  // not manufacture pointerdown/up or emit SFxButton directly (Start owns it).
  for(const component of node.components){
   if(key(component)===BUTTON_KEY){if(buttonCanPress(node,component,event))node.element.click();}
   else if(is(component,IDS.pointerClick))emit(component.fields.sfxType??0,{type:'pointerClick',element:node.element,component,event});
   else if(is(component,DELEGATER))forwardPointerClick(node,component,event,sendPointerClick);
  }
 }
 const model=new PointerClick({threshold,onClick(node,event){
  // GetEventList snapshots enabled interface components on the chosen object.
  const list=node.components.filter(c=>enabled(c)&&(is(c,IDS.pointerClick)||is(c,DELEGATER)));
  for(const component of list){
   if(is(component,DELEGATER))forwardPointerClick(node,component,event,sendPointerClick);
   else emit(component.fields.sfxType??0,{type:'pointerClick',element:node.element,component,event});
  }
 }});
 function inScene(n){if(!n)return false;if(root?.contains)return root.contains(n.element);for(let p=n;p;p=p.parent)if(p.element===root)return true;return all().includes(n.element);}
 function hit(e){return doc.elementFromPoint?.(e.clientX,e.clientY)||e.target;}
 const down=e=>{const target=hit(e),click=nearest(target),press=nearest(target,downHandler)||click;if(!inScene(press))return;model.down(e,{press,click,drag:global.SDDYXPointerDrag?.nearestDragNode?.(target)||null});};
 const move=e=>model.move(e),up=e=>model.up(e,nearest(hit(e))),cancel=e=>model.cancel(e.pointerId),blur=()=>model.cancel();
 for(const[name,fn]of[['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel]]){doc.addEventListener(name,fn,true);offs.push(()=>doc.removeEventListener(name,fn,true));}
 win.addEventListener('blur',blur);offs.push(()=>win.removeEventListener('blur',blur));
 // Enter is an independent original interface. DOM pointerover gives the new
 // ancestor chain; invoke each entered GameObject once, without Selectable guards.
 const enter=e=>{const previous=new Set();for(let p=nodeOf(e.relatedTarget);p;p=p.parent)previous.add(p);for(let n=nodeOf(e.target);n&&!previous.has(n);n=n.parent){if(!inScene(n)||!active(n))continue;for(const component of n.components.filter(c=>enabled(c)&&is(c,IDS.pointerEnter)))emit(component.fields.sfxType??0,{type:'pointerEnter',element:n.element,component,event:e});}};
 if(context.pointerEnter!==false){doc.addEventListener('pointerover',enter,true);offs.push(()=>doc.removeEventListener('pointerover',enter,true));}
 const activeOff=ui.onActiveChange?.(({element,reason})=>reason==='destroy'?remove(element):register(element));if(activeOff)offs.push(activeOff);
 for(const el of all())register(el);
 return{entries,model,threshold,hasComponent,hasSourceCue:el=>nodeOf(el)?.components?.some(c=>Object.values(IDS).some(id=>is(c,id)))||false,
  sync(){for(const el of all())register(el);},update(){for(const entry of entries.values())if(!entry.started&&(entry.type==='button'||entry.type==='toggle'))register(entry.element);},destroy(){if(disposed)return;for(const fn of [...queued])fn();disposed=true;model.cancel();for(const off of offs)off();for(const el of new Set([...entries.values()].map(x=>x.element)))remove(el);}
 };
}
const api={install,PointerClick,forwardPointerClick,buttonCanPress,nearestClickNode:nearest,sourceClickHandler:clickHandler,sourcePointerDownHandler:downHandler,hasComponent,enumName,sfxNames:NAMES,scriptIds:IDS};
global.SDDYXPointerAudio=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
