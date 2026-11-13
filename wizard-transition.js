/* WizardController.Show 5D5710 / completion5D5A90 / OnDisable5D3230.
 * Owns only entrance/disable lifecycle. Model and original Animation clips are
 * driven separately after activation; no immediate Wizard root activation. */
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

function mount(ui,context={}){
 const bindings=context.getBindings?.()||context.bindings,role=context.wizardRole||'wizard',controller=bindings?.controller(role),main=bindings?.controller('main');
 if(!controller||!main)throw Error('Wizard transition requires selected original scene bindings');
 const get=ref=>ref?.path&&ui.find(ref.path),root=get(controller),effect=get(controller.references.ShowEffect),mask=get(main.references.OperationMask),options=get(controller.references.OptionsContainer);
 if(!root||!effect||!mask||!options)throw Error('Original Wizard transition references are unavailable');
 const duration=Number(controller.fields.ShowEffectDuration);if(!Number.isFinite(duration))throw Error('Original Wizard ShowEffectDuration is missing');
 const resources=resourceBoundary(context);let preparation=null,resourceReady=Promise.resolve(),preparationGeneration=0,preparationHeld=false,subtreeLease=null;
 const pending=[];let disposed=false,capturedMask=false,time=0,serial=0,raf=0,last=null,disabling=false;
 const active=e=>!!e.__unityNode.active,alive=e=>!e.__unityNode.removed;
 const state={phase:active(root)?'open':'closed',time:0,duration,showCount:0,capturedMask:false};
 const audio=()=>context.getAudio?.()||context.audio;
 function playEffect(){ui.show(effect);if(context.playParticles)context.playParticles(effect,{withChildren:true});else if(ui.playParticles)ui.playParticles(effect,{withChildren:true});else throw Error('Original ParticleSystem.Play adapter is unavailable');}
 function releasePreparation(){preparationGeneration++;subtreeLease?.release();subtreeLease=null;if(preparationHeld){preparationHeld=false;ui.releasePreparedParticleResources?.(effect);}preparation=null;}
 function schedule(task){if(task.done||task.started||task.scheduled||!task.start)return;task.scheduled=true;Promise.resolve(resources.after(()=>!disposed&&!task.done,task.start)).then(result=>{if(result===false&&!task.started)finish(task,{cancelled:true,reason:'resource-cancelled'});},error=>{task.scheduled=false;context.fail?.(error);});}
 function prepare({isCurrent=()=>!disposed}={}){if(disposed||!isCurrent())return Promise.resolve(false);if(preparation)return preparation;const generation=preparationGeneration;const current=()=>!disposed&&generation===preparationGeneration&&isCurrent();preparationHeld=true;resourceReady=preparation=(async()=>{if(ui.prepareSubtreeResources&&!subtreeLease){const lease=await ui.prepareSubtreeResources(root,{isCurrent:current});if(!current()){lease?.release();return false;}subtreeLease=lease;}await ui.prepareParticleResources?.(effect,{isCurrent:current});await resources.prepare({isCurrent:current,root:effect,kind:'wizard-effect'});if(current())for(const task of pending)schedule(task);return current();})();preparation.catch(()=>{if(generation===preparationGeneration)releasePreparation();});return resourceReady;}
 function stopEffect(){releasePreparation();if(!alive(effect))return;if(context.stopParticles)context.stopParticles(effect,{withChildren:true,clear:true});else if(ui.stopParticles)ui.stopParticles(effect,{withChildren:true,clear:true});else throw Error('Original ParticleSystem.Stop adapter is unavailable');ui.hide(effect);}
 function finish(task,result){if(task.done)return;task.done=true;const i=pending.indexOf(task);if(i>=0)pending.splice(i,1);task.resolve(result);}
 function cancel(reason='cancelled'){if(disposed)return false;const had=pending.length>0;for(const task of [...pending])finish(task,{cancelled:true,reason});if(!active(root)){stopEffect();state.phase='closed';}return had;}
 function onDisable(){if(disposed||disabling)return;disabling=true;try{ui[ capturedMask?'show':'hide' ](mask);capturedMask=false;state.capturedMask=false;stopEffect();if(active(options))ui.hide(options);state.phase=pending.length?'opening':'closed';context.onDisable?.();}finally{disabling=false;}}
 function show(){if(disposed)return Promise.resolve({cancelled:true,reason:'destroyed'});if(active(root))return Promise.resolve({cancelled:false,alreadyOpen:true});
  let resolve;const promise=new Promise(r=>resolve=r),task={id:++serial,deadline:time+duration,resolve,done:false,started:false};pending.push(task);promise.cancel=()=>{if(task.done)return false;finish(task,{cancelled:true,reason:'cancelled'});if(!pending.length&&!active(root)){stopEffect();state.phase='closed';}return true;};state.phase='opening';state.showCount++;
  const start=()=>{if(task.done||disposed||task.started)return;task.started=true;task.deadline=time+duration;audio()?.trigger('WIZARD_OPEN');audio()?.trigger('DrawSudanCard');try{playEffect();}catch(error){finish(task,{cancelled:true,error});throw error;}context.onEffect?.({id:task.id,duration});};task.start=start;if(resources.blocked()){prepare().then(ok=>{if(ok)schedule(task);else finish(task,{cancelled:true,reason:'resource-cancelled'});}).catch(error=>{context.fail?.(error);});}else start();return promise;
 }
 function update(dt){if(disposed||resources.blocked())return;const delta=Number(dt);if(!Number.isFinite(delta)||delta<0)throw Error('Wizard transition delta must be finite and nonnegative');time+=delta;state.time=time;
  for(const task of [...pending]){if(disposed||resources.blocked())break;if(task.done||!task.started||time<task.deadline)continue;if(!alive(root)){finish(task,{cancelled:true,reason:'removed'});continue;}
   // Native captures this value in the delayed callback, not at Show().
   if(task.activating)continue;task.activating=true;const nativeMask=active(mask),isCurrent=()=>!disposed&&!task.done&&alive(root),activate=()=>{capturedMask=nativeMask;state.capturedMask=capturedMask;ui.hide(mask);ui.show(root);state.phase='open';},afterReady=()=>{if(!isCurrent())return;context.onActivate?.({id:task.id,root,effect,capturedMask});if(!task.done)finish(task,{cancelled:false,alreadyOpen:false,id:task.id});};
   if(context.prepareLocalPresentation){const ticket=context.prepareLocalPresentation('wizard-active',activate,afterReady,{isCurrent,retryPreparation:()=>resources.prepare({isCurrent,root,kind:'wizard-active'})});task.activationReady=ticket.ready;ticket.ready.then(ok=>{if(ok===false)finish(task,{cancelled:true,reason:'resource-cancelled'});},error=>{finish(task,{cancelled:true,error});context.fail?.(error);});}else{activate();afterReady();}
  }
 }
 function close(){if(disposed)return;const cancelled=cancel('closed');if(active(root))ui.hide(root);else{if(!cancelled)stopEffect();state.phase='closed';}}
 function destroy({sceneDestroyed=false}={}){if(disposed)return;for(const task of [...pending])finish(task,{cancelled:true,reason:'destroyed'});if(!sceneDestroyed&&alive(root)){if(active(root))ui.hide(root);else stopEffect();}disposed=true;releasePreparation();cancelAnimationFrameSafe();off?.();state.phase='destroyed';}
 function cancelAnimationFrameSafe(){if(raf){global.cancelAnimationFrame?.(raf);raf=0;}}
 const off=ui.onActiveChange?.(event=>{if(event.element!==root)return;if(event.reason==='destroy')destroy({sceneDestroyed:true});else if(!event.active)onDisable();});
 function frame(now){if(disposed)return;now=resources.now(now);if(resources.blocked()){raf=global.requestAnimationFrame(frame);return;}if(last!==null)update(Math.max(0,(now-last)/1000));last=now;if(!disposed)raf=global.requestAnimationFrame(frame);}if(context.autoUpdate===true)raf=global.requestAnimationFrame(frame);
 return{root,effect,mask,options,state,prepare,get resourceReady(){return resourceReady;},retryResourcePreparation(){return prepare();},show,update,close,cancel,destroy,get isOpen(){return active(root);},get isOpening(){return pending.length>0;},get pendingCount(){return pending.length;}};
}
const api={mount,resourceBoundary};global.SDDYXWizardTransition=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
