/* Original BeginGuideController/BeginGuideItemController presenter.
 * Native evidence: 4F1670,52A260,52A980,52AE50,52BA00,52BBB0,52C080,
 * 52C350,52AF70,52AC70. Sprite names and geometry remain original data. */
(function(global){'use strict';
const ROOT='/MainUI/Prompt/BeginGuide',INTERVAL=Math.fround(.3);
const KEY_BINDINGS={'UI/Submit':['Space','Enter'],'UI/Cancel':['Escape'],'UI/RestoreRite':['KeyR'],'UI/Help':['Slash'],'UI/IThink':['KeyZ']};
const GAMEPAD_BINDINGS={'UI/Submit':0,'UI/Cancel':1,'UI/StartRite':7,'UI/StopRite':4,'UI/NextDay':5,'UI/PrevDay':4,'UI/RestoreRite':5,'UI/Help':9,'UI/IThink':1};
const XINPUT_LABELS={'UI/Submit':'A','UI/Cancel':'B','UI/StartRite':'RT','UI/StopRite':'LB','UI/NextDay':'Hold RB','UI/PrevDay':'LB','UI/RestoreRite':'RB','UI/Help':'Hold Start','UI/IThink':'B'};
const TEXT_SPRITES={A:'<sprite="gamepad" anim="2,3,2">',B:'<sprite="gamepad" anim="5,6,2">',RT:'<sprite="gamepad" anim="39,40,2">',LB:'<sprite="gamepad" anim="20,21,2">',RB:'<sprite="gamepad" anim="36,37,2">','Hold RB':'<sprite="gamepad" index=35>','Hold Start':'<sprite="gamepad" index=52>'};
const xy=(a,f=[0,0])=>({x:Number(a?.[0]??a?.x??f[0]),y:Number(a?.[1]??a?.y??f[1])});
class SpriteCycle {
 constructor(frames=[]){this.frames=frames;this.index=0;this.elapsed=0;}
 set(frames){this.frames=frames||[];if(this.index>=this.frames.length)this.index=0;return this.current;}
 get current(){return this.frames[this.index]??null;}
 update(dt){if(!this.frames.length)return false;this.elapsed=Math.fround(this.elapsed+Math.fround(Math.max(0,dt)));if(this.elapsed>=INTERVAL){this.index=(this.index+1)%this.frames.length;this.elapsed=0;return true;}return false;}
}
function frameNames(content,type,device='Keyboard&Mouse'){const all=content?.config?.variable?.begin_guide_sprites||{};return Object.prototype.hasOwnProperty.call(all,type+'_'+device)?all[type+'_'+device]:all[type]||[];}
function payload(pending){return pending?.guide||pending?.payload||pending;}
function isMobileContext(context){const bindings=context.getBindings?.()||context.bindings,settings=typeof context.settings==='function'?context.settings():context.settings;return bindings?!!bindings.isMobile:context.mobile===true||settings?.mobileUI===true;}
function install(context){
 const completeGuide=typeof context.completeGuide==='function'?detail=>context.completeGuide(detail):context.allowLegacyContinueStory===true&&typeof context.continueStory==='function'?()=>context.continueStory():null;
 if(!completeGuide)throw new TypeError('BeginGuide requires completeGuide({pending,skipped,reason})');
 const completed=new WeakSet();
 function complete(pending,skipped,reason){if(completed.has(pending))return false;completed.add(pending);completeGuide({pending,skipped,reason});return true;}
 let active=null,ui=null,root=null,item=null,image=null,text=null,ring=null,close=null,listeners=[],raf=0,lastTime=0,resourceClockPrimed=false,waitTick=0,resize=null,disposed=false,inputManaged=false,device='Keyboard&Mouse',lastLocale='',gamepadState=new Map();
 const resourceBlocked=()=>!!context.isResourceBlocked?.();
 const cycle=new SpriteCycle(),diagnostics=[];
 const getBindings=()=>context.getBindings?.()||context.bindings,getUI=()=>context.ui,getEngine=()=>context.engine,getContent=()=>context.content||global.SDDYX_CONTENT;
 const setting=key=>typeof context.settings==='function'?context.settings()?.[key]:context.settings?.[key];
 const resolve=resource=>context.resources?.asset?.(resource)||global.SDDYXResources?.asset(resource);
 function listen(target,type,fn,opts){target.addEventListener(type,fn,opts);listeners.push(()=>target.removeEventListener(type,fn,opts));}
 function fail(reason,detail={}){if(diagnostics.some(d=>d.reason===reason&&d.type===active?.guide.type))return;const d={reason,type:active?.guide.type,...detail};diagnostics.push(d);context.onUnresolved?.(d);}
 function releaseBindings(){for(const off of listeners)off();listeners=[];resize?.disconnect();resize=null;ui=root=item=image=text=ring=close=null;}
 function reset(){hide();releaseBindings();}
 function ensure(){const next=getUI();if(ui===next&&root?.isConnected)return true;releaseBindings();ui=next;const bindings=getBindings(),selected=bindings?.controller('guide');root=ui?.find(context.rootPath||(bindings?selected?.references.Container?.path:ROOT));if(!root)return false;item=root.__unityNode.children[0]?.element;if(!item)return false;image=ui.find(item.__unityNode.path+'/Image');text=ui.find(item.__unityNode.path+'/Text');ring=ui.find(item.__unityNode.path+'/Ring');close=ui.find(item.__unityNode.path+'/Close');
  // Unity's Ring IPointerClickHandler consumes the pointer even though its two
  // delegates are unassigned in the supplied release. It must not close/forward.
  listeners.push(ui.on(root,'pointerdown',()=>{}));
  listen(root,'click',e=>{e.preventDefault();e.stopImmediatePropagation();if(ring?.contains(e.target))return;finish('close');},true);
  listen(root,'contextmenu',e=>{e.preventDefault();e.stopImmediatePropagation();},true);
  listen(global,'keydown',e=>{if(resourceBlocked()||inputManaged||!active||e.repeat)return;const action=Object.keys(KEY_BINDINGS).find(k=>KEY_BINDINGS[k].includes(e.code)&&k===active.guide.bind);if(action){e.preventDefault();e.stopImmediatePropagation();setDevice('Keyboard&Mouse');activate(action);}else if(KEY_BINDINGS['UI/Cancel'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation();finish('cancel');}},true);
  listen(root,'pointerdown',e=>{if(!resourceBlocked())setDevice(e.pointerType==='touch'?'Touch':'Keyboard&Mouse');},true);
  listen(global,'resize',()=>{waitTick=3;});if(global.ResizeObserver){resize=new ResizeObserver(()=>{waitTick=3;});resize.observe(ui.host||ui.element);}
  root.dataset.originalBeginGuide='true';return true;
 }
 function target(){if(!active)return null;const engine=getEngine(),type=active.guide.type,riteUid=context.selectedRite;
  if(type==='RIGHT_CLICK_SLOT')return{type,riteUid,slotKey:'s3'};
  if(type==='RIGHT_CLICK_CARD'){const card=(engine?.state.cards||[]).filter(c=>['hand','table'].includes(c.zone)&&(engine.tag?.(c,'sudan')??c.tag?.sudan??0)>0).at(-1);return card?{type,riteUid,cardUid:card.uid}:null;}
  return null;
 }
 function setDevice(value){value=String(value||'Keyboard&Mouse');if(value===device)return;device=value;if(active)paintDevice();}
 function localText(key,fallback){if(context.t)return context.t(key,fallback);const c=getContent(),lang=setting('language')||'en',v=c?.i18n?.[lang]?.ui?.[key]??c?.config?.ui?.[key];return typeof v==='string'?v:v?.[lang]??v?.zhCN??fallback;}
 function paintDevice(){if(!active||!ui)return;const g=active.guide,key=active.pending.textKey||'BEGIN_GUIDE_'+g.type+'_PROMPT',base=localText(key,key),translated=localText(key+'_'+device,base),binding=context.bindingDisplay?.(g.bind,device)??(device==='Gamepad'?XINPUT_LABELS[g.bind]:(KEY_BINDINGS[g.bind]?.[0]?.replace(/^Key/,'')||'')),arg=context.bindingSprite?.(binding,device)??TEXT_SPRITES[binding]??binding;
  let message=String(translated).replace(/\{0\}/g,arg||'');if(context.engine?.formatText)message=context.engine.formatText(message);ui.setText(text,message);const names=frameNames(getContent(),g.anim_type,device),sprites=names.map(name=>resolve('image/'+name+'.png')).filter(Boolean);if(sprites.length!==names.length)fail('Original guide sprite missing',{names});cycle.set(sprites);ui.show(image,!!sprites.length);if(cycle.current)ui.setSprite(image,cycle.current);active.frameNames=names;active.text=message;active.device=device;lastLocale=setting('language')||'en';
 }
 function wizardGuideTarget(){const bindings=getBindings(),wizard=bindings?.controller(context.wizardRole||'wizard'),holder=bindings?ui?.find(wizard?.references.OptionsContainer?.path):ui?.find((context.wizardRoot||'/MainUI/Wizard')+'/Background/Options');return holder?.__unityNode.children.filter(n=>!n.removed)[1]||null;}
 function position(){if(!active||!ui)return;const g=active.guide,a=g.anchors||[[.5,.5],[.5,.5],[.5,.5]];let p=xy(g.pos);
  if(g.type==='CHANGE_SUDAN_CARD'){
   const button=wizardGuideTarget();active.targetElement=button?.element||null;
   if(button){const b=button.box,pivot=button.transform.m_Pivot||{x:.5,y:.5},center=ui.projectPoint(button.element,root,{x:b.w*(.5-pivot.x),y:b.h*(.5-pivot.y)});if(center){p.x+=center.x;p.y+=center.y;active.targetCenter={x:center.x,y:center.y};}}
   else fail('Original CHANGE_SUDAN_CARD option child1 is unavailable');
  }
  ui.batch(()=>{for(const[key,value]of [['m_AnchorMin',xy(a[0],[.5,.5])],['m_AnchorMax',xy(a[1],[.5,.5])],['m_Pivot',xy(a[2],[.5,.5])]])for(const axis of ['x','y'])ui.applyProperty(item,key+'.'+axis,value[axis],224);ui.setPosition(item,p);ui.setPosition(image,xy(g.ring_pos));});active.position=p;
 }
 function hide(){if(ui&&root?.isConnected)ui.batch(()=>{for(const child of root.__unityNode.children)ui.hide(child.element);ui.hide(root);});active=null;waitTick=0;}
 function finishOwned(current,reason){if(disposed||active!==current||!current||current.closing)return false;current.closing=true;hide();context.onClose?.({pending:current.pending,type:current.guide.type,reason});complete(current.pending,false,reason);return true;}
 function finish(reason='close'){if(resourceBlocked()||active?.continuationPending||active?.activating&&!active.activationOwner?.())return false;return finishOwned(active,reason);}
 function activate(action){if(resourceBlocked())return false;const current=active;if(!current||current.closing||current.activating||current.continuationPending||action!==current.guide.bind)return false;const ownerUI=ui,ownerEngine=getEngine(),ownerGeneration=context.getResourceGeneration?.(),owns=()=>!disposed&&active===current&&ui===ownerUI&&getUI()===ownerUI&&getEngine()===ownerEngine&&(!ownerEngine||ownerEngine.state?.pending===current.pending)&&context.getResourceGeneration?.()===ownerGeneration;const selected=target();current.activating=true;current.activationOwner=owns;try{if(selected){
   if(context.onGuideAction)context.onGuideAction(selected);
   else if(selected.cardUid&&context.cardClick)context.cardClick(selected.cardUid,true);
   else if(selected.slotKey)fail('Original guide slot action requires onGuideAction',selected);
  }}finally{current.activating=false;current.activationOwner=null;}
  // Native invokes the target first, then CloseInternal. Avoid closing a different
  // guide if a target callback synchronously replaced the current presentation.
  if(owns()){if(resourceBlocked()){current.continuationPending=true;if(typeof context.queuePreparedContinuation!=='function'){fail('Admitted guide continuation requires resource preparation owner');return true;}context.queuePreparedContinuation(()=>{if(!owns()||!current.continuationPending)return false;current.continuationPending=false;return finishOwned(current,'binding');},{isCurrent:owns});}else finish('binding');}return true;
 }
 function show(pending=getEngine()?.state.pending){if(disposed||pending?.type!=='guide'||completed.has(pending))return false;
  const raw=payload(pending),mobile=isMobileContext(context);
  // BeginGuide.Do returns a resolved promise before accessing the controller in
  // this branch. It neither hides its owning panel nor emits close_begin_guide.
  if(mobile&&(!raw.is_on_in_mobile||!raw.mobile_properties)){const reason='Original mobile guide disabled';context.onSkip?.({pending,reason});complete(pending,true,reason);return false;}
  if(!ensure())return false;if(active?.pending===pending){sync();return true;}hide();
  const guide=mobile?{...raw,...raw.mobile_properties}:raw;active={pending,guide,closing:false,frameNames:[],device};device=context.inputScheme||setting('inputScheme')||device;
  ui.batch(()=>{ui.show(root.__unityNode.parent.element);ui.show(root);ui.show(item);ui.setInteractable(root,true);paintDevice();position();});waitTick=3;
  const selected=target();if(selected?.cardUid){const el=ui.element.querySelector('[data-card-uid="'+selected.cardUid+'"]');el?.__sddyxCardInteraction?.select(true);el?.focus?.({preventScroll:true});}
  else if(String(pending.textKey||'BEGIN_GUIDE_'+guide.type+'_PROMPT').startsWith('BEGIN_GUIDE_REDRAW_SUDAN_CARD_PROMPT'))close?.focus?.({preventScroll:true});
  context.onShow?.({pending,guide,target:selected});return true;
 }
 function sync(){if(disposed)return false;const p=getEngine()?.state.pending;if(p?.type!=='guide'){if(active)hide();return false;}if(!active||active.pending!==p||ui!==getUI())return show(p);const nextDevice=context.inputScheme||setting('inputScheme')||device;if(nextDevice!==device)setDevice(nextDevice);if(lastLocale!==(setting('language')||'en'))paintDevice();return true;}
 function pollGamepads(){if(inputManaged||context.gamepads===false||!global.navigator?.getGamepads)return;for(const pad of global.navigator.getGamepads()||[]){if(!pad||pad.mapping!=='standard')continue;const prior=gamepadState.get(pad.index)||[],now=pad.buttons.map(b=>b.pressed);if(active&&!resourceBlocked()){const bound=GAMEPAD_BINDINGS[active.guide.bind];if(bound!=null&&now[bound]&&!prior[bound]){setDevice('Gamepad');activate(active.guide.bind);}else if(now[1]&&!prior[1]){setDevice('Gamepad');finish('cancel');}}gamepadState.set(pad.index,now);}}
 function update(dt){if(!active||disposed)return;if(resourceBlocked()){pollGamepads();return;}if(!root?.isConnected||ui!==getUI()){sync();return;}if(active.guide.type==='CHANGE_SUDAN_CARD'&&(wizardGuideTarget()?.element||null)!==active.targetElement)position();else if(waitTick>0&&!--waitTick)position();if(cycle.update(dt)&&cycle.current)ui.setSprite(image,cycle.current);pollGamepads();if(lastLocale!==(setting('language')||'en'))paintDevice();}
 function frame(t){if(disposed)return;if(resourceClockPrimed)t=Math.max(t,lastTime);const dt=lastTime||resourceClockPrimed?Math.max(0,(t-lastTime)/1000):0;lastTime=t;update(dt);raf=requestAnimationFrame(frame);}
 const api={show,sync,hide,reset,activate,syncResourceClock(time=global.performance?.now?.()??0){lastTime=time;resourceClockPrimed=true;},setInputManaged(value){inputManaged=!!value;},close:finish,setDevice,update,cycle,diagnostics,get active(){return active;},get root(){return root;},get isOpen(){return!!active;},destroy(){if(disposed)return;reset();disposed=true;cancelAnimationFrame(raf);}};
 if(context.autoUpdate!==false)raf=requestAnimationFrame(frame);return api;
}
const api={install,isMobileContext,SpriteCycle,frameNames,KEY_BINDINGS,GAMEPAD_BINDINGS};global.SDDYXGuideUI=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
