/* Original desktop CardController input/animation adapter. No game-rule mutations.
 * Evidence: CardController 52CFC0,52D0B0,52E110,52ED80,52F1A0,
 * 52F7F0,52FAA0,52FB80,52FC10,530340,5314C0; CardNew.prefab;
 * HandCardsController.SetChild 563AF0; GameScene EventSystem threshold 10.
 */
(function(global){'use strict';
const defaults=Object.freeze({downAnswerTime:.2,longPressAnswerTime:1.5,intervalTime:.2,dragAlpha:.6,moveUp:100,dragThreshold:10});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Shared HandCardsController.Update568CB0 / HandBagController.Update563CA0.
// Inputs are the actual direct child cards in ascending native bagpos order.
// This is a per-Update calculation: the source edge-scroll has NO deltaTime.
const handFloat=Math.fround;
function smoothHandPosition(index,count){const F=handFloat;if(count<=1)return 0;const x=F(F(2*clamp(Math.trunc(index),0,count-1))/F(count-1)-1),a=F(Math.atan(x));return clamp(F(F(F(a+a)/F(Math.PI))+.5),0,1);}
class HandLayout {
 constructor(fields={},state={}){const bag=state.kind==='bag'||'CardBagIndex'in fields;this.fields={minVisibleWidth:20,reserveWidth:bag?250:500,Space:10,Range:1,SpeedMultiple:bag?200:20,SpeedRange:bag?{x:100,y:400}:{x:20,y:100},StickyRange:{x:240,y:100},...fields};this.kind=bag?'bag':'hand';this.range=handFloat(state.range??this.fields.Range);this.lastDropPos=state.lastDropPos??2147483647;this.checkMove=!!(state.checkMove??fields.CheckMove);this.isSticky=!!(state.isSticky??fields.IsSticky);this.stickyStart={x:0,y:0,...fields.StickyStart,...state.stickyStart};this.firstCard=null;}
 enter(){this.checkMove=true;return this;}
 exit(){this.checkMove=false;this.lastDropPos=0;return this;}
 dropPosition(count){if(this.lastDropPos<0||this.lastDropPos>count)this.lastDropPos=count;return this.lastDropPos;}
 completeDrop(){this.lastDropPos=0;return this;}
 consumeDrop(count){const position=this.dropPosition(count);this.completeDrop();return position;}
 preview(input){const copy=new HandLayout(this.fields,{kind:this.kind,range:this.range,lastDropPos:this.lastDropPos,checkMove:this.checkMove,isSticky:this.isSticky,stickyStart:this.stickyStart});return copy.update({...input,advanceScroll:false});}
 update({width=0,height=0,pivot={x:.5,y:.5},pointer={x:0,y:0},cards=[],drag=null,canEquip=()=>false,selectionRange,showSelection=false,selectedIndex=-1,heldIndex=-1,advanceScroll=true}={}){
  const F=handFloat,add=(a,b)=>F(F(a)+F(b)),sub=(a,b)=>F(F(a)-F(b)),mul=(a,b)=>F(F(a)*F(b));
  const n=cards.length;this.firstCard=n?cards[0]:null;
  if(!n)return{cards:[],siblingOperations:[],range:this.range,lastDropPos:this.lastDropPos,isSticky:this.isSticky,total:0,width:sub(width,this.fields.reserveWidth),firstCard:null};
  if(selectionRange!=null)this.range=F(selectionRange);
  else if(showSelection&&n>(this.kind==='bag'?8:6)&&selectedIndex>=0&&selectedIndex<n)this.range=smoothHandPosition(selectedIndex,n);
  const space=F(this.fields.Space),reserve=F(this.fields.reserveWidth),available=sub(width,reserve),items=[];let total=0;
  for(let i=0;i<n;i++){const card=cards[i],scale=F(card.scale??card.scaleX??1),size=card.size||{x:card.width??194,y:card.height??422},w=mul(size.x,scale);items.push({card,index:i,pos:total,natural:total,width:w,scale,size,pivot:card.pivot||{x:.5,y:.5}});total=add(add(total,w),space);}
  total=sub(total,space);const baseTotal=total;
  const localX=this.checkMove?F(pointer?.x??0):0,localY=this.checkMove?F(pointer?.y??0):0;
  const pointerX=this.checkMove?add(sub(mul(width,pivot.x),mul(reserve,.5)),localX):0,pointerY=this.checkMove?add(mul(height,pivot.y),localY):0;
  if(advanceScroll&&this.checkMove&&available<total){const edge=mul(available,F(.3)),distance=localX<0?add(edge,localX):sub(localX,edge);if((localX<0?distance<0:distance>0)&&distance!==0){const speed=clamp(Math.abs(distance),F(this.fields.SpeedRange.x),F(this.fields.SpeedRange.y)),change=F(mul(mul(mul(speed,distance<0?-1:1),this.fields.SpeedMultiple),F(.001))/total);this.range=clamp(add(this.range,change),0,1);}}
  if(total<=available)this.range=1;
  const initialOffset=mul(sub(available,total),total<=available?.5:this.range);
  const dragged=this.checkMove&&drag&&drag.hasVisual!==false?drag:null;
  const gap=dragged?add(mul(dragged.size?.x??dragged.width??194,dragged.scale??dragged.scaleX??1),space):0;
  let candidate=null,stickyTarget=null,stickyKind=null,gapApplied=false;
  if(gap>0){candidate=0;while(candidate<n&&add(add(mul(add(items[candidate].width,space),.5),initialOffset),items[candidate].pos)<=pointerX)candidate++;
   const target=items[candidate],left=target?add(initialOffset,target.pos):null;
   const stack=target&&dragged.stackable&&target.card.stackable&&target.card.id===dragged.id;
   const equip=target&&dragged.equipment&&!stack&&canEquip(target.card,dragged);
   if(target&&(stack||equip)&&left<=pointerX){this.lastDropPos=-1;this.isSticky=true;this.stickyStart={x:left,y:pointerY};stickyTarget=target.card;stickyKind=stack?'stack':'equip';}
   else if(this.isSticky&&drag){if(Math.abs(sub(pointerX,this.stickyStart.x))>F(this.fields.StickyRange.x)||Math.abs(sub(pointerY,this.stickyStart.y))>F(this.fields.StickyRange.y))this.isSticky=false;}
   else{for(let i=candidate;i<n;i++)items[i].pos=add(items[i].pos,gap);total=add(total,gap);this.lastDropPos=candidate;this.isSticky=false;gapApplied=true;}
  }
  const siblingOperations=[];let leftCount=0,rightStart=n,offset;
  if(total<=available){this.range=1;offset=mul(sub(available,total),.5);}
  else{offset=mul(sub(available,total),this.range);for(let i=0;i<n;i++){const x=add(offset,items[i].pos);if(x<mul(i,this.fields.minVisibleWidth))leftCount=i+1;else if(sub(sub(available,items[n-1].width),mul(n-i-1,this.fields.minVisibleWidth))<x){rightStart=i;break;}}}
  const output=items.map((item,i)=>{let position=add(offset,item.pos),placementScale=item.scale,region='middle';if(i<leftCount){position=mul(i,this.fields.minVisibleWidth);placementScale=1;region='left';siblingOperations.push({index:i,type:'index',value:i});}else if(i>=rightStart){position=sub(sub(available,mul(n-i-1,this.fields.minVisibleWidth)),item.width);placementScale=1;region='right';siblingOperations.push({index:i,type:'first'});}const anchoredPosition={x:add(add(mul(reserve,.5),position),mul(mul(item.pivot.x,item.size.x),placementScale)),y:mul(mul(item.size.y,placementScale),.5)};return{...item,position,placementScale,region,anchorMin:{x:0,y:0},anchorMax:{x:0,y:0},anchoredPosition,localPosition:{x:sub(anchoredPosition.x,mul(width,pivot.x)),y:sub(anchoredPosition.y,mul(height,pivot.y))}};});
  if(heldIndex>=0&&heldIndex<n)siblingOperations.push({index:heldIndex,type:'last'});
  return{cards:output,siblingOperations,range:this.range,lastDropPos:this.lastDropPos,isSticky:this.isSticky,stickyStart:{...this.stickyStart},stickyTarget,stickyKind,candidate,gapApplied,gap:gapApplied?gap:0,total,baseTotal,width:available,offset,initialOffset,pointer:{x:pointerX,y:pointerY},firstCard:this.firstCard};
 }
}
class CardInput {
 constructor(options={}){this.options={...defaults,...options};this.emit=options.onEvent||(()=>{});this.selected=false;this.hovered=false;this.raised=false;this.pressed=null;this.dragging=false;this.holding=false;this.shiftKeyDown=false;this.hold=null;}
 event(type,detail={}){return this.emit({type,...detail,input:this});}
 raise(){if(this.options.inSlot)return;this.raised=true;this.event('raise',{height:this.options.moveUp});this.event('sound',{cue:'CARD_HIGHLIGHT'});}
 reset(force=false,selected=this.selected){if(!force&&selected)return false;this.raised=false;this.event('raise',{height:0});return true;}
 enter(){this.hovered=true;if(!this.options.flashing)this.raise();}
 exit(){this.hovered=false;if(this.raised&&!this.options.infoOpen)this.reset();}
 select(value=true){if(this.selected===value)return;this.selected=value;this.event('selection',{selected:value});if(value)this.raise();else if(this.raised&&!this.options.infoOpen)this.reset();}
 press({time=0,pointerId=1,button=0,badge=false,count=1,stackable=false,x=0,y=0}={}){
  if(this.pressed||this.options.disabled||button===1)return false;
  this.select(true);this.pressed={time,pointerId,button,badge,count,stackable,x,y,satisfied:false};this.dragging=false;this.holding=false;this.hold=null;return true;
 }
 shift(){if(this.pressed?.button===0&&!this.dragging)this.shiftKeyDown=true;}
 update(time){const p=this.pressed;if(!p)return;if(this.options.disabled){this.cancel();return;}
  const elapsed=time-p.time;
  if(!p.satisfied&&!this.dragging&&elapsed>this.options.downAnswerTime){p.satisfied=true;this.event('satisfied');}
  if(p.button!==0||this.options.inSlot||!p.badge||!p.stackable||p.count<=1||this.dragging)return;
  if(!this.holding&&elapsed>this.options.longPressAnswerTime){this.holding=true;this.hold={total:p.count,held:1,remainder:p.count-1};this.event('holdStart',{...this.hold,split:p.count-1,elapsed});}
  if(this.holding&&this.hold.remainder>1){const value=Math.trunc((elapsed-this.options.longPressAnswerTime)/this.options.intervalTime),h=this.hold;
   if(value-h.held<=h.remainder&&value!==h.held){h.remainder=h.total-value;h.held=value;this.event('holdChange',{...h,elapsed});}
  }
 }
 finishHold(reason){if(!this.holding)return;const h=this.hold;this.holding=false;this.event('holdEnd',{...h,held:h.held<1?h.total:h.held,remainder:h.held<1?0:h.remainder,merge:h.held<1,reason});this.hold=null;}
 move({pointerId=1,x=0,y=0}={}){const p=this.pressed;if(!p||p.pointerId!==pointerId||p.button!==0)return false;if(this.options.disabled){this.cancel();return false;}
  if(!this.dragging&&(x-p.x)**2+(y-p.y)**2>=this.options.dragThreshold**2){if(this.options.canDrag?.()===false)return false;this.finishHold('drag');this.dragging=true;this.event('dragStart',{x,y,pointerId});this.event('sound',{cue:'CARD_BEGIN_DRAG'});}
  if(this.dragging)this.event('dragMove',{x,y,pointerId});return this.dragging;
 }
 release({time=0,pointerId=1,badge=this.pressed?.badge,x=0,y=0,cancel=false}={}){const p=this.pressed;if(!p||p.pointerId!==pointerId)return false;
  // PointerUp does not run Update: sampling a hold here would invent a native frame.
  this.pressed=null;
  if(this.dragging){this.dragging=false;this.event('dragEnd',{x,y,pointerId,cancel});}
  else if(this.holding)this.finishHold(cancel?'cancel':'release');
  else if(!cancel){if(p.button===2)this.event('quick');else if(time-p.time<=this.options.downAnswerTime){
   if(!this.options.inSlot&&badge){if(p.stackable&&p.count>1)this.event('split',{count:1,reason:'badge'});}
   else if(!this.options.inSlot&&this.shiftKeyDown&&p.stackable&&p.count>1){this.shiftKeyDown=false;this.event('split',{count:Math.trunc(p.count/2),reason:'shift'});}
   else this.event('click');
  }}return true;
 }
 cancel(){if(this.pressed)this.release({pointerId:this.pressed.pointerId,cancel:true});}
}
// CardFlashController.Update 532F60: flash is the rising flag, not the
// entire visible pulse. Re-triggering keeps current progress; Reset clears it.
class CardFlash {
 constructor(fields={},options={}){this.speed=Number(fields.speed??1);this.progress=Number(fields.currentTime??0);this.flag=!!fields.flash;this.curve=fields.fade;this.write=options.write||(()=>{});this.evaluate=options.evaluateCurve||global.SDDYXAnimation?.evaluateCurve;}
 trigger(value=true){this.flag=!!value;return this;}
 reset(){this.flag=false;this.progress=0;this.value=0;this.write(0);return this;}
 update(dt){if(!this.flag&&this.progress<=0)return false;if(!this.evaluate)throw Error('CardFlash requires the original animation curve evaluator.');const delta=Math.fround(Math.fround(Math.max(0,dt))*Math.fround(this.speed));this.progress=clamp(Math.fround(this.progress+(this.flag?delta:-delta)),0,1);this.value=this.evaluate(this.curve,this.progress);this.write(this.value);if(this.flag&&this.progress>=1)this.flag=false;return true;}
 get active(){return this.flag||this.progress>0;}
}
// CardController and OpCardNewController share the source one-second Pop gate.
// PopJump subscribes to InputAction.canceled, i.e. release, not press.
class CardPop {
 constructor(options={}){this.timeout=options.timeout??1;this.hoverDelay=options.hoverDelay??.5;this.hoverRound=options.hoverRound??0;this.hoverStart=0;this.visible=false;this.jump=0;}
 enter(time,round,hasPops){if(hasPops&&this.hoverRound!==round)this.hoverStart=time;}
 exit(){this.hoverStart=0;}
 show(time,jump=0){this.visible=true;this.started=time;this.jump=jump;return this;}
 hide(){this.visible=false;return this;}
 update(time,{round=0,jump=this.jump}={}){if(this.visible&&(jump!==this.jump||Math.fround(Math.fround(time)-Math.fround(this.started))>this.timeout)){this.visible=false;return{type:'close',reason:jump!==this.jump?'jump':'timeout'};}if(!this.visible&&this.hoverStart>0&&Math.fround(Math.fround(time)-Math.fround(this.hoverStart))>this.hoverDelay){this.hoverStart=0;this.hoverRound=round;return{type:'hover'};}return null;}
}
const popHubs=new WeakMap(),managedPopDocuments=new WeakSet();
function setPopInputManaged(doc,value){if(!doc)return;if(value)managedPopDocuments.add(doc);else managedPopDocuments.delete(doc);}
function isPopBlocking(doc){return !!popHubs.get(doc)?.blocking;}
function dispatchPopJump(doc){const hub=popHubs.get(doc);if(!hub?.blocking)return false;hub.emit();return true;}
function popHub(doc){let hub=popHubs.get(doc);if(hub)return hub;const win=doc.defaultView||global;hub={pops:new Set(),jump:0,pressedPads:new Map(),get blocking(){return[...hub.pops].some(p=>p.isOpen&&!p.noneBlock);},emit(){if(hub.blocking&&![...hub.pops].some(p=>p.isOpen&&p.isResourceBlocked))hub.jump++;},poll(){if(managedPopDocuments.has(doc)||!win.navigator?.getGamepads)return;for(const pad of win.navigator.getGamepads()||[]){if(!pad||pad.mapping!=='standard')continue;const pressed=!!pad.buttons[0]?.pressed,old=hub.pressedPads.get(pad.index);if(old&&!pressed)hub.emit();hub.pressedPads.set(pad.index,pressed);}}};
 const key=e=>e.code==='Space'||e.code==='Enter';hub.down=e=>{if(!managedPopDocuments.has(doc)&&hub.blocking&&key(e)){e.preventDefault();e.stopImmediatePropagation();}};hub.up=e=>{if(!managedPopDocuments.has(doc)&&hub.blocking&&key(e)){hub.emit();e.preventDefault();e.stopImmediatePropagation();}};hub.pointer=e=>{if(!managedPopDocuments.has(doc)&&e.button===0)hub.emit();};win.addEventListener('keydown',hub.down,true);win.addEventListener('keyup',hub.up,true);win.addEventListener('pointerup',hub.pointer,true);hub.remove=()=>{if(hub.pops.size)return;win.removeEventListener('keydown',hub.down,true);win.removeEventListener('keyup',hub.up,true);win.removeEventListener('pointerup',hub.pointer,true);popHubs.delete(doc);};popHubs.set(doc,hub);return hub;
}
// Resource pause changes wall-clock accounting, not native frame/event ordering.
function createResourceClock(options,initial){let wall=initial,offset=0,paused=!!options.isResourceBlocked?.();return{sample(value){value=Number(value);if(offset||paused)value=Math.max(value,wall);if(paused)offset+=Math.max(0,value-wall);wall=value;paused=!!options.isResourceBlocked?.();return value-offset;},sync(){return this.sample(options.now?.()??performance.now()/1000);}};}
function mountPop(ui,selector,options={}){
 const root=typeof selector==='string'?ui.find(selector):selector?.element||selector;if(!root)throw Error('Original Pop root is missing.');const doc=root.ownerDocument,win=doc.defaultView||global,hub=popHub(doc);let frameTime=performance.now()/1000,sourceFrameTime=frameTime;const rawClock=options.now||(()=>frameTime),resourceBlocked=()=>!!options.isResourceBlocked?.(),resourceClock=options.resourceClockShared?null:createResourceClock(options,frameTime),clock=()=>resourceClock?(options.now?resourceClock.sample(rawClock()):sourceFrameTime):rawClock(),model=new CardPop(options),rootPath=root.__unityNode.path,text=ui.find(options.textPath||rootPath+'/Pop/Text (TMP)'),inputDisplay=ui.find(rootPath+'/Pop/InputDisplay');
 let pending=null,disposed=false,frame=0,restoreSelection=null,noneBlock=false;const deferred=new Set();
 const read=k=>typeof options[k]==='function'?options[k]():options[k];
 function resolve(p,defer){if(!p)return;const done=()=>{deferred.delete(done);p.resolve();};if(defer){deferred.add(done);requestAnimationFrame(done);}else done();}
 function close(reason='close',{defer=false}={}){if(!pending)return false;const p=pending;pending=null;model.hide();ui.hide(root);if(!noneBlock)options.onBlock?.(false);if(restoreSelection?.isConnected)restoreSelection.focus?.({preventScroll:true});restoreSelection=null;options.onClose?.({reason,content:p.content});resolve(p,defer);return true;}
 function show(content,settings={}){if(disposed)return Promise.resolve();close('replace');noneBlock=!!settings.noneBlock;const message=String(content??'');let resolvePromise;const promise=new Promise(resolve=>resolvePromise=resolve);pending={content:message,promise,resolve:resolvePromise};model.show(clock(),hub.jump);ui.batch(()=>{ui.setText(text,message);ui.show(root);if(inputDisplay)ui.show(inputDisplay,!noneBlock);});
  if(!noneBlock){restoreSelection=doc.activeElement;restoreSelection?.blur?.();options.onBlock?.(true);}if(options.mode!=='rite'&&(!read('inSlot')||options.mode==='opCard'||options.mode==='think'))options.audio?.trigger?.(message.includes('<size=100>')?'SHOW_POP_BIG':'SHOW_POP');options.onEnsureVisible?.();options.onShow?.({content:message,noneBlock});return promise;
 }
 function update(time=rawClock()){if(disposed)return;frameTime=time;if(resourceClock)time=sourceFrameTime=resourceClock.sample(time);hub.poll();if(resourceBlocked())return;const result=model.update(time,{round:read('round')??0,jump:hub.jump});if(result?.type==='close')close(result.reason,{defer:true});else if(result?.type==='hover'){
  const choices=read('getPops')||[];if(choices.length){const content=choices.length===1?choices[0]:options.pickPop?options.pickPop(choices):options.randomRange?choices[options.randomRange(0,choices.length)]:choices[Math.min(choices.length-1,Math.floor((options.random||Math.random)()*choices.length))];show(options.formatText?options.formatText(content):content);}
 }}
 const api={model,show,close,update,syncResourceClock(){return resourceClock?.sync();},get isResourceBlocked(){return resourceBlocked();},enter(time=clock()){if(resourceBlocked())return;model.enter(time,read('round')??0,(read('getPops')||[]).length>0);},exit(){model.exit();},jump(){if(!resourceBlocked())hub.emit();},get isOpen(){return!!pending;},get noneBlock(){return noneBlock;},get promise(){return pending?.promise;},destroy(){if(disposed)return;close('destroy');disposed=true;cancelAnimationFrame(frame);for(const done of [...deferred])done();hub.pops.delete(api);hub.remove();}};hub.pops.add(api);if(options.autoUpdate!==false){const tick=time=>{if(disposed)return;update(options.now?rawClock():time/1000);frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);}return api;
}

const selectionGroups=new WeakMap(),hoverPopRounds=new WeakMap();
function relativeRectBounds(ui,element){
 const root=element?.__unityNode;if(!root||!ui.projectPoint)return null;let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 function visit(n){if(n!==root&&!n.active)return;if(n.source.transformType==='RectTransform'&&n.box){const p=n.transform.m_Pivot||{x:.5,y:.5};for(const x of [-p.x*n.box.w,(1-p.x)*n.box.w])for(const y of [-p.y*n.box.h,(1-p.y)*n.box.h]){const q=ui.projectPoint(n.element,element,{x,y});if(q){minX=Math.min(minX,q.x);maxX=Math.max(maxX,q.x);minY=Math.min(minY,q.y);maxY=Math.max(maxY,q.y);}}}for(const c of n.children||[])visit(c);}
 visit(root);return Number.isFinite(minX)?{minX,maxX,minY,maxY}:null;
}
function cardInputDisplayPlan(state={}){if(state.inSlot)return{visible:false};return{visible:true,think:!!state.canShowIThink&&!state.bagOpen&&!state.cardInfoOpen&&!state.ritePanelOpen,split:!!state.stackable&&Number(state.count)>=2&&!state.cardInfoOpen,promptType:state.hold?2:1};}
function attach(shell,options={}){
 const element=shell?.element||shell;if(!element?.addEventListener)throw Error('Card interaction requires an original CardNew element.');
 const ui=options.ui||shell,node=element.__unityNode,doc=element.ownerDocument,win=doc.defaultView||global;
 const fields=node?.components?.find(c=>'longPressAnswerTime'in c.fields)?.fields||{};
 const native={...defaults};for(const k of Object.keys(defaults))if(Number.isFinite(fields[k]))native[k]=fields[k];
 let frameTime=performance.now()/1000,sourceFrameTime=frameTime;const resourceBlocked=()=>!!options.isResourceBlocked?.(),resourceClock=createResourceClock(options,frameTime),frameHistory=[{wall:frameTime,source:frameTime}];
 const inputClock=e=>{if(options.now)return clock();let t=Number(e?.timeStamp)/1000;if(!Number.isFinite(t))return clock();if(t>1e9)t-=(performance.timeOrigin||0)/1000;for(let i=frameHistory.length-1;i>=0;i--)if(frameHistory[i].wall<=t)return frameHistory[i].source;return frameHistory[0].source;};
 const listeners=[],rawClock=options.now||(()=>frameTime),clock=()=>options.now?resourceClock.sample(rawClock()):sourceFrameTime,oldDraggable=element.draggable,oldTouchAction=element.style.touchAction;
 const originalSize={...node?.transform?.m_SizeDelta},originalParent=node?.parent?.element;
 const art=options.art?.element||options.art||shell.find?.('Artwork')||element;
 let disposed=false,frame=0,drag=null,lastEvent=null,rafTime=clock();
 const flashElement=shell.find?.('Flash'),flashFields=flashElement?.__unityNode.components.find(c=>'fade'in c.fields&&'currentTime'in c.fields&&'flash'in c.fields)?.fields;
 const flasher=flashFields?new CardFlash(flashFields,{evaluateCurve:options.evaluateCurve,write:value=>{ui.setMaterialFloat?.(flashElement,'_InnerOutlineFade',value);options.onFlash?.({value,progress:flasher.progress,rising:flasher.flag});}}):null;
 let pop=null;
 const getCard=()=>typeof options.card==='function'?options.card():options.card||{};
 const read=key=>typeof options[key]==='function'?options[key](getCard()):options[key];
 const callback=(name,detail={})=>options[name]?.({...detail,card:getCard(),shell,element,adapter,event:lastEvent});
 const listen=(target,type,fn,opts)=>{const handler=options.runResourceOperation?function(...args){return options.runResourceOperation(()=>fn.apply(this,args));}:fn;target.addEventListener(type,handler,opts);listeners.push(()=>target.removeEventListener(type,handler,opts));};
 function activeOutline(on){const outline=options.outline||shell.find?.('Outline');if(outline){if(on)ui.show?.(outline);else ui.hide?.(outline);}}
 function displayRef(key){const ref=fields[key];if(!ref?.fileID)return null;const id=String(ref.fileID),match=n=>String(n.source?.id)===id||n.components?.some(c=>String(c.fileID)===id),n=node?.scope?.records?.find(match)||(ui.findAll?.('*')||[]).map(e=>e.__unityNode).find(match);return n?{element:n.element,component:n.components?.find(c=>String(c.fileID)===id)}:null;}
 function refreshInputDisplay(state={}){const card=getCard(),plan=cardInputDisplayPlan({inSlot:read('inSlot'),canShowIThink:read('canShowIThink'),bagOpen:read('bagOpen'),cardInfoOpen:read('cardInfoOpen'),ritePanelOpen:read('ritePanelOpen'),stackable:read('stackable')??!!(card.tags?.stackable||card.tag?.stackable),count:card.count??1,hold:read('submitHeld'),...state});const prompt=displayRef('GamepadInputPrompt');if(!prompt)return plan;ui.batch(()=>{ui.show(prompt.element,plan.visible);if(!plan.visible)return;const think=displayRef('ID_IThink'),split=displayRef('ID_SplitCard'),select=displayRef('ID_SelectCard');if(think)ui.show(think.element,plan.think);if(split){ui.show(split.element,plan.split);if(state.resetFill!==false){const helper=global.SDDYXHeldCardInput,ref=helper?.resolveReference(ui,split.element,split.component?.fields.inputDisplay);for(const key of ['FirstHoldFill','SecondHoldFill']){const image=helper?.resolveReference(ui,ref?.element,ref?.component?.fields[key]);if(image)ui.applyProperty(image.element,'m_FillAmount',0,114,image.component?.fields.m_Script);}}}if(select){const helper=global.SDDYXHeldCardInput,image=helper?.resolveReference(ui,select.element,select.component?.fields.image);select.component.fields.promptType=plan.promptType;if(image)ui.setSprite(image.element,{fileID:21300000,guid:helper.promptSprites[plan.promptType],type:2});}});return plan;}
 function sourceHeight(height){if(node&&originalSize.y!=null){ui.setSize?.(element,{x:originalSize.x,y:originalSize.y+height});callback('onLayout',{reason:'raise'});}}
 function synchronize(){input.options.inSlot=!!read('inSlot');input.options.infoOpen=!!read('infoOpen');input.options.flashing=flasher?flasher.flag:!!read('flashing');input.options.disabled=!!read('disabled');}
 function setRaycasts(value){ui.applyProperty?.(element,'m_BlocksRaycasts',+value,225);element.classList.toggle('sddyx-native-card-held',!value);ui.refreshLayout?.(element);}
 if(!doc.getElementById('sddyx-native-card-interaction-style')){const style=doc.createElement('style');style.id='sddyx-native-card-interaction-style';style.textContent='.sddyx-native-card-held,.sddyx-native-card-held *{pointer-events:none!important}';doc.head.appendChild(style);}
 function pointerLocal(e,parent){if(options.screenToLocal)return options.screenToLocal(e,parent);if(ui.screenToLocal)return ui.screenToLocal(parent,{x:e.clientX,y:e.clientY});
  const r=parent.getBoundingClientRect(),n=parent.__unityNode,pivot=n?.transform.m_Pivot||{x:.5,y:.5};return{x:(e.clientX-r.x)/r.width*n.box.w-pivot.x*n.box.w,y:(1-pivot.y)*n.box.h-(e.clientY-r.y)/r.height*n.box.h};
 }
 function detach(kind){if(drag)return;const parent=node?.parent?.element||originalParent,layer=typeof options.dragLayer==='string'?ui.find(options.dragLayer):options.dragLayer||ui.find?.('/MainUI/Drag');
  const sourceTransform=node?JSON.parse(JSON.stringify(node.transform)):null;
  const target=callback('onReparent',{kind,parent,layer});
  if(target===false)return;
  if(layer&&ui.reparent)ui.reparent(element,layer,{worldPositionStays:true});
  const actualParent=node?.parent?.element||parent;
  if(!actualParent)return;
  const p=pointerLocal(lastEvent,actualParent),center=ui.projectPoint?.(element,actualParent)||node.transform.m_AnchoredPosition||{x:0,y:0};
  // Source CalculateRelativeRectTransformBounds includes all active descendant
  // RectTransforms, even transparent graphics; inactive descendants are excluded.
  const size=node?.box||{w:194,h:422},pivot=node?.transform.m_Pivot||{x:.5,y:.5},bounds=read('dragBounds')||relativeRectBounds(ui,element)||{minX:-size.w*pivot.x,maxX:size.w*(1-pivot.x),minY:-size.h*pivot.y,maxY:size.h*(1-pivot.y)};
  drag={parent,layer:actualParent,sourceTransform,offset:{x:clamp(p.x-center.x,bounds.minX,bounds.maxX),y:clamp(p.y-center.y,bounds.minY,bounds.maxY)}};
  ui.applyProperty?.(element,'m_LocalRotation',{x:0,y:0,z:0,w:1},224);ui.applyProperty?.(element,'m_LocalEulerAnglesHint.z',0,224);setRaycasts(false);
 }
 function restore(reason,accepted=false){if(!drag)return;const d=drag;drag=null;
  ui.setAlpha?.(art,1);setRaycasts(true);
  if(!accepted&&d.parent?.isConnected&&ui.reparent){ui.reparent(element,d.parent,{worldPositionStays:false});if(d.sourceTransform&&node){for(const key of ['m_AnchorMin','m_AnchorMax','m_Pivot','m_AnchoredPosition','m_LocalScale','m_LocalRotation','m_LocalEulerAnglesHint'])if(d.sourceTransform[key])node.transform[key]={...d.sourceTransform[key]};ui.refreshLayout?.(element);}}
  callback('onReturn',{reason,accepted,parent:d.parent});callback('onLayout',{reason:'return'});
 }
 const input=new CardInput({...native,...options,onEvent:e=>{
  switch(e.type){
   case'raise':sourceHeight(e.height);break;
   case'selection':activeOutline(e.selected);if(e.selected)refreshInputDisplay();callback('onSelect',{selected:e.selected});break;
   case'sound':if(options.audio?.trigger)options.audio.trigger(e.cue);callback('onSound',{cue:e.cue});break;
   case'satisfied':{const press=input.pressed;setTimeout(()=>{if(!disposed&&!resourceBlocked()&&input.pressed===press)callback('onSatisfied');},0);break;}
   case'click':callback('onClick');break;
   case'quick':callback('onQuick');break;
   case'split':callback('onSplit',{count:e.count,reason:e.reason});break;
   case'holdStart':detach('hold');callback('onHoldStart',e);break;
   case'holdChange':callback('onHoldChange',e);break;
   case'holdEnd':callback('onHoldEnd',e);if(e.reason!=='drag')restore('hold');break;
   case'dragStart':{const pop=shell.find?.('Pop');if(pop)ui.hide?.(pop);callback('onHidePop',e);callback('onHideInfo',e);callback('onGrab',e);detach('drag');ui.setAlpha?.(art,input.options.dragAlpha);callback('onDragStart',e);break;}
   case'dragMove':if(drag){const p=pointerLocal(lastEvent,drag.layer),position={x:p.x-drag.offset.x,y:p.y-drag.offset.y};ui.setPosition?.(element,position);callback('onMove',{...e,position});}break;
   case'dragEnd':{
    // Raycasts remain disabled for hit testing, as in source CardReleased.
    const target=doc.elementFromPoint(e.x,e.y),accepted=!e.cancel&&callback('onDrop',{...e,target})===true;
    restore(e.cancel?'cancel':'drop',accepted);activeOutline(input.selected);callback('onDragEnd',{...e,target,accepted});break;
   }
  }
  options.onEvent?.(e);
 }});
 // Keep each synchronous native model entry atomic through its callback tail.
 // The app boundary is lexical only; Promise results never retain its depth.
 if(options.runResourceOperation)for(const name of ['press','move','release','update','select']){const source=input[name];input[name]=function(...args){return options.runResourceOperation(()=>source.apply(this,args));};}
 const adapter={element,shell,input,flasher,refreshInputDisplay,get pop(){return pop;},showPop(content,settings){return pop?.show(content,settings)||Promise.resolve();},closePop(){return pop?.close();},get isFlashing(){return!!flasher?.flag;},get flashActive(){return!!flasher?.active;},flash(value=true){if(flasher){ui.show?.(flashElement);flasher.trigger(value);}return adapter;},resetFlash(){flasher?.reset();return adapter;},get dragging(){return input.dragging||input.holding;},get lifted(){return!!drag;},
  select(value=true){synchronize();if(value){const prior=selectionGroups.get(doc);if(prior&&prior!==adapter)prior.select(false);selectionGroups.set(doc,adapter);}else if(selectionGroups.get(doc)===adapter)selectionGroups.delete(doc);input.select(value);return adapter;},
  moveUp(){if(!disposed){synchronize();input.raise();}return adapter;},
  resetMove(force=false){if(disposed)return false;synchronize();const selected=typeof options.getSelection==='function'?options.getSelection():doc.activeElement;return input.reset(force,(selected?.element||selected)===element);},
  syncResourceClock(){return resourceClock.sync();},update(time=rawClock()){if(disposed)return;const wall=time;frameTime=time;time=sourceFrameTime=resourceClock.sample(time);if(resourceBlocked()){pop?.update(time);return;}if(frameHistory.at(-1).wall!==wall){frameHistory.push({wall,source:time});if(frameHistory.length>600)frameHistory.shift();}const dt=Math.max(0,time-rafTime);rafTime=time;if(node?.visible!==false){flasher?.update(dt);pop?.update(time);if(pop&&typeof getCard()==='object')hoverPopRounds.set(getCard(),pop.model.hoverRound);}synchronize();input.update(time);if(input.raised&&!input.hovered&&!input.selected&&!input.options.infoOpen)input.reset();},
  onInputDeviceChanged(){const ended=!!input.dragging;if(ended){input.cancel();restore('scheme');}activeOutline(doc.activeElement===element);return ended;},
  cancel(){const pointer=input.pressed?.pointerId;input.cancel();restore('cancel');if(resourceBlocked()&&pointer!=null&&element.hasPointerCapture?.(pointer))element.releasePointerCapture(pointer);},
  destroy(){if(disposed)return;adapter.cancel();pop?.destroy();disposed=true;cancelAnimationFrame(frame);for(const off of listeners)off();if(selectionGroups.get(doc)===adapter)selectionGroups.delete(doc);input.select(false);element.draggable=oldDraggable;element.style.touchAction=oldTouchAction;delete element.__sddyxCardInteraction;},
  gaps:['Physical gamepad behavior still requires device testing.']};
 if(options.runResourceOperation)for(const name of ['select','update','onInputDeviceChanged','cancel']){const source=adapter[name];adapter[name]=function(...args){return options.runResourceOperation(()=>source.apply(this,args));};}
 const popElement=shell.find?.('Pop');if(popElement)pop=mountPop(ui,popElement,{now:clock,resourceClockShared:true,isResourceBlocked:resourceBlocked,autoUpdate:false,audio:options.audio,hoverRound:hoverPopRounds.get(getCard())??fields.HoverPopShowRound??0,getPops:()=>read('getPops')||[],round:()=>read('round')??0,inSlot:()=>read('inSlot'),pickPop:options.pickPop,random:options.presentationRandom,randomRange:options.randomRange,formatText:options.formatPopText,onBlock:value=>callback('onPopBlock',{blocked:value}),onEnsureVisible:()=>callback('onEnsureVisible'),onShow:detail=>callback('onPopShow',detail),onClose:detail=>callback('onPopClose',detail)});
 element.__sddyxCardInteraction=adapter;element.draggable=false;element.style.touchAction='none';
 const badgeTarget=target=>{const b=options.badge?.element||options.badge;if(b)return b===target||b.contains(target);for(let p=target;p&&p!==element;p=p.parentElement)if(p.__unityNode?.name==='Stackable'||p.__unityNode?.source?.name==='Stackable')return true;return false;};
 listen(element,'pointerenter',e=>{if(resourceBlocked())return;lastEvent=e;synchronize();input.enter();pop?.enter(clock());});
 listen(element,'pointerleave',e=>{if(resourceBlocked()){input.hovered=false;pop?.exit();return;}lastEvent=e;synchronize();input.exit();pop?.exit();});
 listen(element,'pointerdown',e=>{if(resourceBlocked())return;lastEvent=e;synchronize();if(input.options.disabled||e.button===1)return;adapter.select(true);const card=getCard(),stackable=read('stackable')??!!(card.tags?.stackable||card.tag?.stackable);if(input.press({time:inputClock(e),pointerId:e.pointerId,button:e.button,badge:badgeTarget(e.target),count:card.count??1,stackable,x:e.clientX,y:e.clientY})){element.setPointerCapture?.(e.pointerId);e.preventDefault();}});
 listen(win,'pointermove',e=>{if(resourceBlocked()){adapter.cancel();return;}if(!input.pressed)return;lastEvent=e;input.move({pointerId:e.pointerId,x:e.clientX,y:e.clientY});});
 // Native OnPointerUp reads pointerPressRaycast (+0xA0), not currentRaycast.
 // Selection may move/cover the badge after down, so retain the down-time target.
 listen(win,'pointerup',e=>{if(resourceBlocked()){adapter.cancel();if(element.hasPointerCapture?.(e.pointerId))element.releasePointerCapture(e.pointerId);return;}if(!input.pressed)return;lastEvent=e;input.release({time:inputClock(e),pointerId:e.pointerId,x:e.clientX,y:e.clientY});if(element.hasPointerCapture?.(e.pointerId))element.releasePointerCapture(e.pointerId);});
 listen(win,'pointercancel',e=>{lastEvent=e;if(e.pointerId===input.pressed?.pointerId)adapter.cancel();});
 listen(win,'blur',()=>adapter.cancel());
 listen(win,'keydown',e=>{if(resourceBlocked())return;if(!e.repeat&&(e.key==='Shift'||e.code==='ShiftLeft'||e.code==='ShiftRight'))input.shift();});
 listen(element,'click',e=>{e.preventDefault();e.stopImmediatePropagation();},true);
 listen(element,'contextmenu',e=>{e.preventDefault();e.stopImmediatePropagation();},true);
 listen(element,'dragstart',e=>e.preventDefault(),true);
 if(options.autoUpdate!==false){const tick=time=>{if(disposed)return;adapter.update(options.now?rawClock():time/1000);frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);}
 return adapter;
}
const api={setPopInputManaged,dispatchPopJump,isPopBlocking,defaults,HandLayout,smoothHandPosition,CardInput,CardFlash,CardPop,mountPop,relativeRectBounds,cardInputDisplayPlan,attach};global.SDDYXCardInteraction=api;global.SDDYX=global.SDDYX||{};global.SDDYX.CardInteraction=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
