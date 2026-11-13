/* Native Core ColorTintProcessor42BF10 / ImageAlphaSync42EE20.
 * CanvasRenderer color is a separate, scope+component keyed channel. No source
 * Graphic.color, TMP text, rich-text tag, sprite or material is rewritten here.
 * See analysis/native/visual-modifiers and VISUAL_MODIFIER_NATIVE_SEMANTICS.md. */
(function(global){'use strict';
const F=Math.fround,CORE='6c8e168389b232d7cc78427b51f93153';
const IDS=Object.freeze({helper:1605256492,tint:1176753200,alpha:1694301125,viewer:-2103646510,stateSync:-1511629927});
const STATES=Object.freeze(['Normal','Highlighted','Pressed','Selected','Disabled']);
const KEYS=Object.freeze(['r','g','b','a']),WHITE=Object.freeze({r:1,g:1,b:1,a:1});
const copy=c=>Object.fromEntries(KEYS.map(k=>[k,F(c?.[k]??1)]));
const equal=(a,b)=>KEYS.every(k=>a[k]===b[k]);
const script=(c,id)=>c?.fields?.m_Script?.guid===CORE&&Number(c.fields.m_Script.fileID)===id;
const activeDefault=n=>{for(let p=n;p;p=p.parent)if(p.removed||p.active===false)return false;return true;};
const graphic=c=>!!c&&('m_Color'in c.fields||'m_fontColor'in c.fields)&&!('m_EffectColor'in c.fields);
const selectable=c=>!!c&&'m_Navigation'in c.fields;
// Scene records are built once per scope. Index references once instead of
// scanning every component for every ImageAlphaSync target on every frame.
// Weak keys release the index together with the scene; length also covers
// references resolved while a scope is still being constructed.
const referenceIndexes=new WeakMap();
function referenceIndex(records){let cached=referenceIndexes.get(records);if(cached?.length===records.length)return cached.entries;const entries=new Map(),put=(id,value)=>{if(id!=null&&!entries.has(String(id)))entries.set(String(id),value);};for(const node of records){for(const component of node.components||[])put(component.fileID,{node,component});const value={node,component:null};put(node.source?.id??node.id,value);put(node.source?.transformID,value);}referenceIndexes.set(records,{length:records.length,entries});return entries;}
function resolveLocal(owner,ref){if(!ref?.fileID)return null;const id=String(ref.fileID),records=owner.scope?.records;if(!records){const component=owner.components?.find(c=>String(c.fileID)===id);return component?{node:owner,component}:String(owner.source?.id??owner.id)===id||String(owner.source?.transformID)===id?{node:owner,component:null}:null;}return referenceIndex(records).get(id)|| (owner.scope?.referenceScope?.records?referenceIndex(owner.scope.referenceScope.records).get(id):null)||null;}
function interactableDefault(node,component){if(!component||component.fields.m_Interactable===0)return false;for(let p=node;p;p=p.parent){const group=p.components?.find(c=>c.type==='CanvasGroup'&&c.fields.m_Enabled!==0)?.fields;if(group?.m_Interactable===0)return false;if(group?.m_IgnoreParentGroups)break;}return true;}

// Unity Graphic has one ColorTweenRunner shared by CrossFadeColor and Alpha.
// Its current RGBA must exist even when the Graphic's DOM has never initialized.
class CanvasTweenStore{
 constructor(adapter={}){this.adapter=adapter;this.scopes=new WeakMap();this.nodeEntries=new WeakMap();this.records=new Set();this.destroyed=false;}
 entry(node,component){if(this.destroyed)throw Error('CanvasTweenStore is destroyed');if(!node||!component)throw Error('Canvas color requires an exact node and Graphic component');const scope=node.scope||node;let map=this.scopes.get(scope);if(!map){map=new WeakMap();this.scopes.set(scope,map);}let entry=map.get(component);if(!entry){entry={node,component,color:copy(WHITE),tween:null};map.set(component,entry);this.records.add(entry);let entries=this.nodeEntries.get(node);if(!entries){entries=new Set();this.nodeEntries.set(node,entries);}entries.add(entry);}return entry;}
 color(node,component){return copy(this.entry(node,component).color);}
 write(entry,color){if(equal(entry.color,color))return false;entry.color=copy(color);this.adapter.onCanvasColor?.(entry.node,entry.component,copy(entry.color));return true;}
 crossFadeColor(node,component,target,options={}){const entry=this.entry(node,component),to=copy(target),useAlpha=options.useAlpha!==false,useRGB=options.useRGB!==false;if(!useAlpha&&!useRGB)return false;if(equal(entry.color,to)){entry.tween=null;return false;}const duration=F(options.duration??0),from=copy(entry.color);entry.tween=null;const tween={from,to,duration,elapsed:0,useAlpha,useRGB,ignoreTimeScale:options.ignoreTimeScale!==false};if(!(duration>0)||(this.adapter.isActive||activeDefault)(node)===false){return this.write(entry,this.sample(tween,1));}entry.tween=tween;return true;}
 crossFadeAlpha(node,component,alpha,options={}){return this.crossFadeColor(node,component,{r:0,g:0,b:0,a:F(alpha)},{...options,useAlpha:true,useRGB:false});}
 sample(tween,ratio){const t=Math.max(0,Math.min(1,ratio)),out=copy(tween.from);for(const key of KEYS)if(key==='a'?tween.useAlpha:tween.useRGB)out[key]=F(tween.from[key]+F(F(tween.to[key]-tween.from[key])*F(t)));return out;}
 update(unscaledDelta,scaledDelta=unscaledDelta){if(this.destroyed)return;for(const entry of this.records){const tween=entry.tween;if(!tween)continue;if((this.adapter.isActive||activeDefault)(entry.node)===false){entry.tween=null;continue;}const dt=Math.max(0,F(tween.ignoreTimeScale?unscaledDelta:scaledDelta));tween.elapsed=F(tween.elapsed+dt);this.write(entry,this.sample(tween,F(tween.elapsed/tween.duration)));if(tween.elapsed>=tween.duration)entry.tween=null;}}
 stopNode(node){for(const entry of this.nodeEntries.get(node)||[])entry.tween=null;}
 destroyNode(node){for(const entry of this.nodeEntries.get(node)||[]){this.scopes.get(node.scope||node)?.delete(entry.component);this.records.delete(entry);}this.nodeEntries.delete(node);}
 get tweenCount(){let count=0;for(const entry of this.records)if(entry.tween)count++;return count;}
 destroy(){if(this.destroyed)return;this.destroyed=true;for(const entry of this.records)entry.tween=null;this.records.clear();this.scopes=new WeakMap();this.nodeEntries=new WeakMap();}
}

// Exact SD_SelectableHelper priority and lifecycle, not "last DOM event wins".
class SelectableHelper{
 constructor(context={}){this.context=context;this.inside=false;this.down=false;this.selected=false;this.enableCalled=false;this.lastInteractable=false;this.listeners=new Set();this.destroyed=false;}
 get state(){if(this.context.hasSelectable?.()===false)return 0;if(this.context.interactable?.()===false)return 4;return this.down?2:this.selected?3:this.inside?1:0;}
 subscribe(fn){if(this.destroyed)return()=>{};this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 emit(instant=false){const state=this.state;for(const fn of [...this.listeners])fn(state,instant);return state;}
 enable(){if(this.destroyed||this.enableCalled)return;if(this.context.selected?.())this.selected=true;this.down=false;this.lastInteractable=this.context.interactable?.()!==false;this.enableCalled=true;this.emit(true);}
 disable(){if(!this.enableCalled)return;this.inside=this.down=this.selected=this.lastInteractable=false;this.enableCalled=false;}
 event(type,detail={}){if(this.destroyed||!this.enableCalled)return false;if(type==='pointerdown'||type==='pointerup'){if((detail.button??0)!==0)return false;this.down=type==='pointerdown';}else if(type==='pointerenter'){if(detail.ownsPointer===false)return false;this.inside=true;}else if(type==='pointerleave'||type==='pointerexit')this.inside=false;else if(type==='focus'||type==='select')this.selected=true;else if(type==='blur'||type==='deselect')this.selected=false;else return false;this.emit(false);return true;}
 lateUpdate(){if(this.destroyed||!this.enableCalled)return;const current=this.context.interactable?.()!==false;if(current!==this.lastInteractable){this.lastInteractable=current;this.emit(false);}}
 destroy(){this.destroyed=true;this.listeners.clear();this.disable();}
}
class ColorTintProcessor{
 constructor(fields,context){this.fields=fields;this.context=context;this.destroyed=false;this.unsubscribe=context.helper.subscribe((state,instant)=>this.transition(state,instant));this.transition(context.helper.state,true);}
 transition(state,instant=false){if(this.destroyed||this.context.active?.()===false)return false;const index=typeof state==='string'?STATES.indexOf(state):state,key=STATES[index];if(!key)return false;const block=this.fields.Colors||{},color=block['m_'+key+'Color'];if(!color)return false;const multiplier=F(block.m_ColorMultiplier??1),target=Object.fromEntries(KEYS.map(k=>[k,F(F(color[k]??1)*multiplier)])),duration=instant?0:F(block.m_FadeDuration??.1);for(const ref of this.fields.Graphics||[]){const entry=this.context.resolve(ref);if(!entry)continue;this.context.canvas.crossFadeColor(entry.node,entry.component,target,{duration,ignoreTimeScale:true,useAlpha:true,useRGB:true});}return true;}
 // No OnDisable unsubscribe exists in native code. Disabled components retain
 // their event subscription; activeInHierarchy is checked by transition itself.
 destroy(){if(this.destroyed)return;this.destroyed=true;this.unsubscribe?.();this.unsubscribe=null;}
}
class ImageAlphaSync{
 constructor(fields,context){this.fields=fields;this.context=context;this.source=context.resolve(fields.source)||context.ownGraphic?.();if(!this.source)throw Error('ImageAlphaSync source Graphic is unresolved');this.destroyed=false;}
 sync(){if(this.destroyed)return false;const alpha=this.context.canvas.color(this.source.node,this.source.component).a;for(const ref of this.fields.targets||[]){const target=this.context.resolve(ref);if(!target)throw Error('ImageAlphaSync target Graphic is unresolved: '+ref?.fileID);this.context.canvas.crossFadeAlpha(target.node,target.component,alpha,{duration:0,ignoreTimeScale:true});}return true;}
 destroy(){this.destroyed=true;}
}
// SD_SelectableInteractiveChangeViewer4365E0 / 436560. OnEnable always
// publishes the current effective Selectable.IsInteractable; LateUpdate only
// publishes changes. No OnDisable clearing or unrelated callback is invented.
class SelectableInteractiveChangeViewer{
 constructor(fields,context){this.fields=fields;this.context=context;this.enabled=false;this.lastInteractable=false;this.destroyed=false;}
 enable(){if(this.destroyed||this.enabled)return;this.enabled=true;if(this.context.hasSelectable?.()===false)return;this.lastInteractable=this.context.interactable()!==false;this.context.invoke(this.fields.OnInteractiveChanged,this.lastInteractable);}
 disable(){this.enabled=false;}
 lateUpdate(){if(this.destroyed||!this.enabled)return;const value=this.context.interactable()!==false;if(value!==this.lastInteractable){this.lastInteractable=value;this.context.invoke(this.fields.OnInteractiveChanged,value);}}
 destroy(){this.destroyed=true;this.enabled=false;}
}
class StateSync{
 constructor(fields,context){this.fields=fields;this.context=context;this.enabled=false;this.destroyed=false;}
 apply(value){for(const ref of this.fields.targets||[]){const target=this.context.resolve(ref);if(!target)throw Error('StateSync target GameObject is unresolved: '+ref?.fileID);if(!!target.node.active===value)continue;this.context.setActive(target.node,value);}}
 enable(){if(this.destroyed||this.enabled)return;this.enabled=true;this.apply(!this.fields.invert);}
 disable(){if(this.destroyed||!this.enabled)return;this.enabled=false;this.apply(!!this.fields.invert);}
 destroy(){if(this.destroyed)return;this.disable();this.destroyed=true;}
}

function create(adapter={}){
 const canvas=new CanvasTweenStore(adapter),nodes=new Set(),helpers=new Map(),tints=new Map(),alphas=new Map(),viewers=new Map(),stateSyncs=new Map(),byNode=new Map();let destroyed=false;
 const resolve=(owner,ref)=>(adapter.resolve||resolveLocal)(owner,ref);
 const active=owner=>(adapter.isActive||activeDefault)(owner)!==false;
 const own=(owner,predicate)=>{const component=owner.components?.find(predicate);return component?{node:owner,component}:null;};
 const resolveGraphic=(owner,ref)=>{const result=resolve(owner,ref);return result&&graphic(result.component)?result:null;};
 function owner(node){let record=byNode.get(node);if(!record){record={helpers:[],alphas:[],viewers:[],stateSyncs:[]};byNode.set(node,record);}return record;}
 function helperRecord(node,component){let record=helpers.get(component);if(record)return record;const selection=resolve(node,component.fields.selectable)||own(node,selectable);record={node,component,selection,model:null};record.model=new SelectableHelper({hasSelectable:()=>!!record.selection?.component,interactable:()=>!!record.selection&&(adapter.isInteractable||interactableDefault)(record.selection.node,record.selection.component)!==false,selected:()=>adapter.isSelected?.(node)??false});helpers.set(component,record);owner(node).helpers.push(record);return record;}
 function awake(node){if(!active(node))return;for(const component of node.components||[]){const fields=component.fields;if(script(component,IDS.tint)&&!tints.has(component)){const source=resolve(node,fields.Source)||own(node,c=>script(c,IDS.helper));if(!source||!script(source.component,IDS.helper))throw Error('ColorTintProcessor Source SD_SelectableHelper is unresolved: '+component.fileID);const helper=helperRecord(source.node,source.component);tints.set(component,{node,component,model:new ColorTintProcessor(fields,{helper:helper.model,canvas,active:()=>active(node),resolve:ref=>resolveGraphic(node,ref)})});}if(script(component,IDS.alpha)&&!alphas.has(component)){const record={node,component,wasEnabled:false,model:new ImageAlphaSync(fields,{canvas,resolve:ref=>resolveGraphic(node,ref),ownGraphic:()=>own(node,graphic)})};alphas.set(component,record);owner(node).alphas.push(record);}if(script(component,IDS.viewer)&&!viewers.has(component)){const target=resolve(node,fields.selectable)||own(node,selectable),record={node,component,model:new SelectableInteractiveChangeViewer(fields,{hasSelectable:()=>!!target?.component,interactable:()=>!!target&&(adapter.isInteractable||interactableDefault)(target.node,target.component)!==false,invoke:(event,value)=>{if(!event?.m_PersistentCalls?.m_Calls?.some(call=>call.m_CallState!==0))return;if(!adapter.invokeUnityEvent)throw Error('Native visual modifier UnityEvent bridge is required');adapter.invokeUnityEvent(node,event,value);}})};viewers.set(component,record);owner(node).viewers.push(record);}if(script(component,IDS.stateSync)&&!stateSyncs.has(component)){const record={node,component,model:new StateSync(fields,{resolve:ref=>resolve(node,ref),setActive:(target,value)=>{if(!adapter.setActive)throw Error('Native visual modifier SetActive bridge is required');adapter.setActive(target,value,component);}})};stateSyncs.set(component,record);owner(node).stateSyncs.push(record);}}}
 function lifecycle(node,isActive=active(node)){if(destroyed)return;if(nodes.has(node))awake(node);const records=byNode.get(node);for(const record of records?.stateSyncs||[]){if(isActive&&active(node)&&record.component.fields.m_Enabled!==0)record.model.enable();else record.model.disable();}for(const record of records?.helpers||[]){if(isActive&&active(node)&&record.component.fields.m_Enabled!==0)record.model.enable();else record.model.disable();}for(const record of records?.alphas||[]){const enabled=isActive&&active(node)&&record.component.fields.m_Enabled!==0;if(enabled&&!record.wasEnabled)record.model.sync();record.wasEnabled=enabled;}for(const record of records?.viewers||[]){if(isActive&&active(node)&&record.component.fields.m_Enabled!==0)record.model.enable();else record.model.disable();}if(!isActive||!active(node))canvas.stopNode(node);}
 function register(records){if(destroyed)return;records=Array.from(records);for(const node of records){if(node.components?.some(c=>Object.values(IDS).some(id=>script(c,id))))nodes.add(node);for(const c of node.components||[])if(script(c,IDS.helper))helperRecord(node,c);}for(const node of records)if(nodes.has(node))awake(node);for(const node of records)lifecycle(node);}
 function event(node,type,detail={}){if(destroyed)return false;let ownsPointer=true;if(type==='pointerenter'&&detail.targetNode){let target=detail.targetNode;while(target&&!target.components?.some(c=>script(c,IDS.helper)))target=target.parent;ownsPointer=target===node;}let handled=false;for(const record of helpers.values())if(record.node===node&&active(node)&&record.component.fields.m_Enabled!==0)handled=record.model.event(type,{...detail,ownsPointer})||handled;return handled;}
 function update(unscaledDelta,scaledDelta=unscaledDelta){if(destroyed)return;for(const node of nodes)lifecycle(node);canvas.update(unscaledDelta,scaledDelta);for(const record of helpers.values())if(active(record.node)&&record.component.fields.m_Enabled!==0)record.model.lateUpdate();for(const record of alphas.values())if(active(record.node)&&record.component.fields.m_Enabled!==0)record.model.sync();for(const record of viewers.values())if(active(record.node)&&record.component.fields.m_Enabled!==0)record.model.lateUpdate();}
 function destroyNode(node){for(const map of[stateSyncs,tints,alphas,viewers,helpers])for(const [component,record]of map)if(record.node===node){record.model.destroy();map.delete(component);}nodes.delete(node);byNode.delete(node);canvas.destroyNode(node);}
 function destroy(){if(destroyed)return;for(const node of [...nodes])destroyNode(node);destroyed=true;canvas.destroy();}
 return{canvas,register,event,lifecycle,update,destroyNode,destroy,color:(node,component)=>canvas.color(node,component),crossFadeColor:(...args)=>canvas.crossFadeColor(...args),crossFadeAlpha:(...args)=>canvas.crossFadeAlpha(...args),helpers,tints,alphas,viewers,stateSyncs,get destroyed(){return destroyed;}};
}
const api={CORE,IDS,STATES,WHITE,CanvasTweenStore,SelectableHelper,ColorTintProcessor,ImageAlphaSync,SelectableInteractiveChangeViewer,StateSync,resolveLocal,create};global.SDDYXVisualModifiers=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
