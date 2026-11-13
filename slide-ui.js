/* Legacy SlideController / SlideItemController presentation.
 * Three isolated compatibility repairs use existing source assets: PageDotItem
 * null reference, obsolete Next.OnNext listener, and unused editor label.
 * Original serialized data is never changed. See docs/slide-ui-fidelity.md. */
(function(global){'use strict';
// A resource boundary is not a gameplay completion. Never replay blocked input.
function resourceBoundary(context={}){const blocked=()=>!!context.isResourceBlocked?.();let pausedAt=blocked()?performance.now():null,offset=0,waiting=false;const timers=new Set();
 const clock={blocked,now(value=performance.now()){if(context.resourceNow)return context.resourceNow(value);if(blocked()){pausedAt??=value;watch();return pausedAt-offset;}if(pausedAt!==null){offset+=value-pausedAt;pausedAt=null;}return value-offset;},
 after(isCurrent,action){if(!isCurrent())return false;if(!blocked())return action();if(!context.waitForResourceCommit)throw Error('Resource commit wait is required for a blocked presentation');return context.waitForResourceCommit({isCurrent}).then(committed=>{if(!committed||!isCurrent()||blocked())return false;clock.now();return action();});},
 prepare(details){watch();return context.preparePresentationResources?.(details);},
 timeout(action,ms,isCurrent=()=>true,onCancel){let id=null,done=false;const started=clock.now(),handle={cancel(){if(done)return false;done=true;clearTimeout(id);timers.delete(handle);onCancel?.();return true;}};timers.add(handle);function fire(){if(done)return;if(!isCurrent()){handle.cancel();return;}const now=clock.now();if(blocked()){Promise.resolve(clock.after(isCurrent,fire)).then(result=>{if(result===false)handle.cancel();},error=>{handle.cancel();context.fail?.(error);});return;}const left=ms-(now-started);if(left>0){id=setTimeout(fire,left);return;}done=true;timers.delete(handle);action();}id=setTimeout(fire,ms);return handle;},
 delay(ms,isCurrent){return new Promise(resolve=>clock.timeout(()=>resolve(true),ms,isCurrent,()=>resolve(false)));},cancelTimers(){for(const timer of [...timers])timer.cancel();}};
 function watch(){if(!blocked()||waiting||!context.waitForResourceCommit)return;waiting=true;context.waitForResourceCommit({isCurrent:()=>true}).then(committed=>{waiting=false;if(committed&&!blocked())clock.now();},()=>{waiting=false;});}watch();return clock;
}

const clamp=(x,min=0,max=1)=>Math.max(min,Math.min(max,x));
function smoothDamp(current,target,velocity,smoothTime,deltaTime){
 const omega=2/Math.max(.0001,smoothTime),x=omega*deltaTime,exp=1/(1+x+.48*x*x+.235*x*x*x),change=current-target,temp=(velocity+omega*change)*deltaTime;
 let next=target+(change+temp)*exp,v=(velocity-omega*temp)*exp;
 if((target-current>0)===(next>target)){next=target;v=deltaTime?(next-target)/deltaTime:0;}return{value:next,velocity:v};
}
function step(model,deltaTime,leftPressed=false){
 if(leftPressed||(!model.enableAutoMove&&!model.hasTargetItem)){model.velocity=0;return model;}
 let index=0,target=0;if(model.count>1){const ceiling=model.hasTargetItem?model.targetItem+1:Math.ceil(model.count*model.position);index=ceiling<1?ceiling:ceiling-1;target=index/(model.count-1);model.selected=index;}
 model.preferredPosition=clamp(target);if(Math.abs(model.preferredPosition-model.position)>model.threshold){const result=smoothDamp(model.position,model.preferredPosition,model.velocity,model.smoothTime,deltaTime);model.position=result.value;model.velocity=result.velocity;}else{model.velocity=0;model.hasTargetItem=false;}return model;
}
function install(context){
 const C=context.content||global.SDDYX_CONTENT,R=context.resources||global.SDDYXResources,settings=context.settings||{},ui=()=>context.ui;
 const scene=global.SDDYXSupportScene?.create(context,'slide','/MainUI/Prompt/Slide'),itemPrefab=()=>scene?.prefab('prefab','SlideItem')||'SlideItem';
 const model={count:0,position:0,velocity:0,smoothTime:.03,threshold:.001,enableAutoMove:true,targetItem:0,hasTargetItem:false,preferredPosition:0,selected:0};
 const resources=resourceBoundary(context);let resourceReady=Promise.resolve(),retryPreparation=()=>Promise.resolve();
 let root=null,scope=null,ownerUI=null,pending=null,signature='',items=[],dots=[],offs=[],frame=null,lastTime=0,leftPressed=false,epoch=0,disposed=false,closed=true,keyboardEnabled=true;
 const path=s=>root?.dataset.unityPath+(s?'/'+s:''),find=s=>ui()?.find(path(s)),viewport=()=>find('Scroll View/Viewport');
 function run(fn){try{const r=fn();if(r?.catch)r.catch(error);}catch(e){error(e);}}function error(e){if(context.fail)context.fail(e);else console.error(e);}
 function bind(s,fn){const el=find(s);if(!el)return;el.setAttribute('role','button');offs.push(ui().bind(el,e=>{if(closed||resources.blocked())return;context.audio?.unlock?.();run(()=>fn(e));}));}
 function selectDots(index){for(const [i,dot]of dots.entries()){if(dot.element.dataset.selected===String(i===index))continue;dot.element.dataset.selected=String(i===index);dot.element.setAttribute('aria-checked',String(i===index));dot.show('Image',i===index);}}
 function range(){const v=viewport();return v?Math.max(0,v.scrollWidth-v.clientWidth):0;}
 function writePosition(){const v=viewport();if(v)v.scrollLeft=range()*model.position;if(root){root.dataset.slidePosition=String(model.position);root.dataset.slideTarget=String(model.targetItem);}selectDots(model.selected);}
 function tick(now){now=resources.now(now);if(resources.blocked()){frame=requestAnimationFrame(tick);return;}if(closed||disposed||!root?.isConnected){frame=null;return;}const elapsed=lastTime?Math.max(0,(now-lastTime)/1000):1/60;lastTime=now;const v=viewport(),width=range();if(v&&width)model.position=clamp(v.scrollLeft/width);step(model,elapsed,leftPressed);writePosition();frame=requestAnimationFrame(tick);}
 function navigate(delta){if(closed||resources.blocked())return;model.targetItem=clamp(model.targetItem+delta,0,Math.max(0,model.count-1));model.hasTargetItem=true;}
 function clearChildren(){ui()?.batch(()=>{for(const child of [...items,...dots])child.destroy();items=[];dots=[];});}
 function hide(){closed=true;epoch++;cancelAnimationFrame(frame);frame=null;lastTime=0;if(root?.isConnected)ui()?.hide(root);}
 function close(){if(closed||resources.blocked())return;hide();pending=null;signature='';run(()=>context.continueStory?.(true));}
 function destroyRoot(){hide();for(const off of offs)off();offs=[];clearChildren();if(scope)scope.destroy();scope=null;root=null;ownerUI=null;}
 function reset(){resourceReady=Promise.resolve();retryPreparation=()=>Promise.resolve();destroyRoot();pending=null;signature='';leftPressed=false;}
 function prepareShow(value){if(disposed)return;retryPreparation=()=>prepareShow(value);const slides=value.slides||[],sig=JSON.stringify([slides,settings.language]);if(!closed&&pending===value&&signature===sig&&ownerUI===ui())return root;const token=++epoch,requestedUI=ui(),names=[...(scene?.selected?[]:['Slide']),itemPrefab(),'PageDotItem'];const prepare=()=>{if(disposed||token!==epoch||ui()!==requestedUI)return;
  if(ownerUI!==ui()||!root?.isConnected){destroyRoot();root=ui().find(scene?.sourceRoot||'/MainUI/Prompt/Slide');if(!root){scope=ui().instantiate('Slide',ui().find('/MainUI/Prompt')||ui().find('/MainUI'),{name:'RuntimeSlide',active:false,scale:1});root=scope.element;}ownerUI=ui();root.dataset.sourceSlide='true';root.dataset.compatibilityRepairs='missing-dot-reference,obsolete-next-listener,unused-editor-label';bind('Scroll View/Prev',()=>navigate(-1));bind('Scroll View/Next',()=>navigate(1));bind('Scroll View/Close',close);
   const fields=root.__unityNode.components.find(c=>'smoothTime'in c.fields)?.fields||{};model.smoothTime=fields.smoothTime??.03;model.threshold=fields.threshold??.001;model.enableAutoMove=fields.enableAutoMove!==0;
   const content=find('Scroll View/Viewport/Content');for(const child of content?.__unityNode.children||[])ui().hide(child.element);const holder=find('Scroll View/Scrollbar Dot');for(const child of holder?.__unityNode.children||[])ui().hide(child.element);
   const v=viewport(),preventScroll=e=>e.preventDefault();v?.addEventListener('wheel',preventScroll,{passive:false});offs.push(()=>v?.removeEventListener('wheel',preventScroll));
  }
  clearChildren();pending=value;signature=sig;closed=false;model.count=slides.length;model.position=0;model.selected=0;model.targetItem=0;model.hasTargetItem=false;model.velocity=0;model.preferredPosition=0;
  ui().batch(()=>{ui().show(root);for(const [index,key]of slides.entries()){const item=ui().instantiate(itemPrefab(),find('Scroll View/Viewport/Content'),{name:'SlideItem_'+index,active:true,scale:1,position:{x:0,y:0}}),resource=C.i18n[settings.language]?.variable?.[key]??C.config.variable[key]??'';item.element.dataset.slideIndex=String(index);item.element.dataset.slideVariable=key;item.element.dataset.slideResource=String(resource);if(resource){const sprite=R.loadSprite?R.loadSprite(String(resource)):R.asset(String(resource));if(sprite)item.setSprite(item.element,sprite);}item.hide('Text (TMP)');items.push(item);const dot=ui().instantiate('PageDotItem',find('Scroll View/Scrollbar Dot'),{name:String(index),active:true,scale:1,position:{x:0,y:0}});dot.element.dataset.slideDot=String(index);dot.element.tabIndex=-1;dot.element.style.pointerEvents='none';dots.push(dot);}for(const s of ['Prev','Next','Scrollbar Dot'])ui().show(find('Scroll View/'+s),slides.length>1);ui().show(find('Scroll View/Close'));});
  writePosition();cancelAnimationFrame(frame);lastTime=0;const owner=root,own=epoch,isCurrent=()=>!disposed&&!closed&&root===owner&&own===epoch;let started=false;const start=()=>{if(started||!isCurrent())return;started=true;frame=requestAnimationFrame(tick);};if(resources.blocked()){retryPreparation=async()=>{await resources.prepare({isCurrent,root:owner,kind:'slide'});if(!isCurrent())return;run(()=>resources.after(isCurrent,start));return owner;};return retryPreparation();}start();return root;
  };
  // Only exact live prefab leases may remove the artificial async boundary.
  // Cold data and the existing blocked-renderer preparation still really await.
  return R.withPrefabs?R.withPrefabs(names,prepare):Promise.all(names.map(name=>R.prefab(name))).then(prepare);
 }
 function show(value){resourceReady=prepareShow(value);return resourceReady;}
 const pointerDown=e=>{if(!resources.blocked()&&e.button===0)leftPressed=true;},pointerUp=e=>{if(e.button===0)leftPressed=false;},blur=()=>{leftPressed=false;},keydown=e=>{if(resources.blocked()||!keyboardEnabled||closed||e.repeat||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return;if(['Escape','Enter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();if(e.key==='Escape')close();else navigate(1);}};
 global.addEventListener('pointerdown',pointerDown,true);global.addEventListener('pointerup',pointerUp,true);global.addEventListener('blur',blur);global.addEventListener('keydown',keydown,true);
 return{get resourceReady(){return resourceReady;},retryResourcePreparation(){resourceReady=retryPreparation();return resourceReady;},setKeyboardEnabled(value){keyboardEnabled=!!value;},show,sync(value){if(value?.type!=='slide'){hide();return;}return show(value);},hide,close,reset,inspect:()=>({bindings:offs.length,items:items.length,dots:dots.length,hasRoot:!!root,hasUI:!!ownerUI}),next:()=>navigate(1),previous:()=>navigate(-1),get element(){return root;},get model(){return model;},get isOpen(){return !closed;},dispose(){disposed=true;reset();global.removeEventListener('pointerdown',pointerDown,true);global.removeEventListener('pointerup',pointerUp,true);global.removeEventListener('blur',blur);global.removeEventListener('keydown',keydown,true);}};
}
global.SDDYXSlideUI={install,smoothDamp,step};if(typeof module!=='undefined'&&module.exports)module.exports=global.SDDYXSlideUI;
})(typeof window!=='undefined'?window:globalThis);
