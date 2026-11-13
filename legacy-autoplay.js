/* Bounded source legacy Animation autoplay. CGTitleHide only; controller-owned
 * Sudan/dice clips remain outside this registration. Native activation evidence:
 * analysis/ui/legacy-animation-native/lifecycle-trace.json (76 checked anchors). */
(function(global){
'use strict';
const DEFAULT_CLIP='fbe2cbe63ca13c744b8fd4e0ee4951b2',managers=new Set();
function defaultReference(component){const f=component?.fields,ref=f?.m_Animation;return component?.type==='Animation'&&f?.m_PlayAutomatically===1&&ref?.fileID&&ref.guid===DEFAULT_CLIP?ref:null;}
function hierarchyActive(element){const node=element?.__unityNode;if(!node||node.removed||element.isConnected===false)return false;for(let n=node;n;n=n.parent)if(n.active===false||n.visible===false||n.removed)return false;return true;}
function install(ui,context={}){
 let disposed=false;const entries=new Map(),offs=[];
 const all=()=>ui.findAll('*'),findEntry=root=>{const element=typeof root==='string'?ui.find(root):root;return [...entries.values()].find(e=>e.element===element);};
 function current(entry,player){return !disposed&&entries.get(entry.component)===entry&&entry.player===player&&hierarchyActive(entry.element)&&entry.fields.m_Enabled!==0;}
 function stop(entry){if(entry.player){entry.player.pause();entry.player.time=0;entry.player._eventsFrom=-Number.EPSILON;}entry.player=null;entry.resume=false;entry.pending=true;entry.owned=false;}
 function claim(root,player,options){const entry=findEntry(root);if(!entry)return false;if(entry.player&&entry.player!==player)entry.player.pause();entry.player=player;entry.owned=options.legacyAutoplayOwner===entry;entry.pending=false;entry.resume=player.playing;
  // Explicit same-root players take the component away from autoplay before
  // their constructor samples. Old owners cannot write after hide/destruction.
  player.options={...options,applySamples:(target,samples)=>{if(current(entry,player))options.applySamples?.(target,samples);},onEvent:(event,p)=>{if(current(entry,player))options.onEvent?.(event,p);},onComplete:p=>{if(current(entry,player))options.onComplete?.(p);}};
  if(!hierarchyActive(entry.element)||entry.fields.m_Enabled===0)player.pause();return true;
 }
 function start(entry){const Animation=context.animation||global.SDDYXAnimation,clip=Animation?.compileClip(entry.ref,context.clips||global.SDDYX_ANIMATIONS);if(!clip){entry.pending=false;entry.unresolved=true;context.onDiagnostic?.({path:entry.element.__unityNode.path,type:'LegacyAnimation',reason:'Original CGTitleHide default clip is unavailable'});return;}
  entry.pending=false;entry.unresolved=false;
  const player=new Animation.AnimationPlayer(entry.element,clip,{legacyAutoplayOwner:entry,applySamples:(root,samples)=>ui.applySamples(root,samples),onEvent:event=>context.onEvent?.(entry.element,event)});
  // The optional constructor bridge is available in the normal runtime. Also
  // claim here for isolated old AnimationPlayer fixtures without the bridge.
  if(entry.player!==player)claim(entry.element,player,player.options);
 }
 function lifecycle(entry){const active=hierarchyActive(entry.element),enabled=entry.fields.m_Enabled!==0;
  if(!active){if(entry.active)stop(entry);entry.active=false;entry.enabled=enabled;return;}
  if(!entry.active){entry.active=true;entry.pending=true;}
  if(!enabled){if(entry.enabled&&entry.player){entry.resume=entry.player.playing;entry.player.pause();}entry.enabled=false;return;}
  if(entry.pending)start(entry);else if(!entry.enabled&&entry.resume)entry.player?.play();entry.enabled=true;
 }
 function register(element){if(disposed||!element?.__unityNode)return;for(const component of element.__unityNode.components){const ref=defaultReference(component);if(!ref)continue;let entry=entries.get(component);if(!entry){entry={element,component,fields:component.fields,ref,active:false,enabled:false,pending:true,player:null,owned:false,resume:false};entries.set(component,entry);}lifecycle(entry);}}
 function remove(element){for(const[component,entry]of entries)if(entry.element===element){stop(entry);entries.delete(component);}}
 const manager={claim};managers.add(manager);const off=ui.onActiveChange?.(({element,reason})=>reason==='destroy'?remove(element):register(element));if(off)offs.push(off);for(const element of all())register(element);
 return{entries,sync(){for(const element of all())register(element);},update(deltaTime){if(disposed)return;const dt=Number.isFinite(deltaTime)?Math.max(0,deltaTime):0;for(const entry of [...entries.values()]){if(entry.element.isConnected===false||entry.element.__unityNode.removed){remove(entry.element);continue;}lifecycle(entry);if(entry.active&&entry.enabled&&entry.owned&&entry.player?.playing)entry.player.update(dt);}},destroy(){if(disposed)return;disposed=true;for(const off of offs)off();for(const entry of entries.values())stop(entry);entries.clear();managers.delete(manager);}};
}
function claimCreatedPlayer(root,player,options={}){for(const manager of managers)if(manager.claim(root,player,options))return true;return false;}
const api={install,defaultReference,hierarchyActive,claimCreatedPlayer,defaultClipGUID:DEFAULT_CLIP};global.SDDYXLegacyAutoplay=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
