/* Original Core.MobilePlatformSetting lifecycle (432630/4326D0/4327F0/432920).
 * Runtime transforms only; the exported scene/prefab data is never changed. */
(function(global){'use strict';
const SCRIPT_ID=458199891,SCRIPT_GUID='6c8e168389b232d7cc78427b51f93153',ONE={x:1,y:1,z:1},EPSILON_SQUARED=Math.fround(9.999999439624929e-11);
const vector=(value,defaults=ONE)=>Object.fromEntries(Object.keys(defaults).map(k=>[k,Math.fround(Number(value?.[k]??defaults[k]))]));
function approximatelyOne(scale){const s=vector(scale),x=Math.fround(s.x-1),y=Math.fround(s.y-1),z=Math.fround(s.z-1);return Math.fround(Math.fround(Math.fround(x*x)+Math.fround(y*y))+Math.fround(z*z))<EPSILON_SQUARED;}
function fieldsFor(node){return(node?.components||[]).filter(c=>Number(c.fields?.m_Script?.fileID)===SCRIPT_ID&&c.fields?.m_Script?.guid===SCRIPT_GUID).map(c=>({component:c,fields:c.fields}));}
function mount(ui,options={}){
 if(!ui?.findAll||!ui?.show||!ui?.setScale||!ui?.setPosition)throw Error('MobilePlatformSetting requires the original scene UI adapter.');
 const records=new Map(),observers=new Set(),diagnostics={unhandled:[],instances:0};let destroyed=false;
 const mobile=()=>!!(typeof options.mobileUI==='function'?options.mobileUI():options.mobileUI);
 const enabled=r=>r.fields.m_Enabled!==0&&r.fields.m_Enabled!==false;
 const active=node=>{for(let n=node;n;n=n.parent)if(n.removed||n.active===false||n.active===0)return false;return true;};
 const batch=fn=>ui.batch?ui.batch(fn):fn();
 function childrenChanged(r){if(destroyed||!r.awake||!r.fields.changeChildScale)return;const children=(r.node.children||[]).filter(n=>!n.removed);batch(()=>{for(const child of children)if(approximatelyOne(child.transform?.m_LocalScale))ui.setScale(child.element,vector(r.fields.MobileChildScale));});r.children=children.slice();}
 function enable(r){if(r.on)return;r.on=true;batch(()=>{if(mobile()){
   if(r.fields.changeScale)ui.setScale(r.node.element,vector(r.fields.MobileScale));
   if(r.fields.changePos){if(r.node.source?.transformType!=='RectTransform'){diagnostics.unhandled.push({path:r.node.path,field:'changePos',reason:'Native requires RectTransform.'});}else{r.oldPosition=vector(r.node.transform?.m_AnchoredPosition,{x:0,y:0});ui.setPosition(r.node.element,vector(r.fields.MobilePos,{x:0,y:0}));}}
  }childrenChanged(r);});}
 function disable(r){if(!r.on)return;r.on=false;if(mobile())batch(()=>{if(r.fields.changeScale)ui.setScale(r.node.element,ONE);if(r.fields.changePos&&r.node.source?.transformType==='RectTransform')ui.setPosition(r.node.element,r.oldPosition||{x:0,y:0});});}
 function reconcile(r){if(destroyed||r.busy)return;r.busy=true;try{
   if(!r.awake&&active(r.node)){r.awake=true;ui.show(r.node.element,mobile()?!!r.fields.ShowMobile:!!r.fields.ShowPC);}
   if(r.awake&&active(r.node)&&enabled(r))enable(r);else disable(r);
  }finally{r.busy=false;}}
 function releaseRecord(r){r.removed=true;r.observer?.disconnect();if(r.observer)observers.delete(r.observer);r.observer=null;records.delete(r.component);}
 function register(node){if(!node||node.removed||node.destroyNotified)return;for(const {component,fields}of fieldsFor(node)){
   if(records.has(component))continue;const r={node,component,fields,awake:false,on:false,busy:false,oldPosition:null,children:(node.children||[]).slice()};records.set(component,r);diagnostics.instances++;
   const Observer=options.MutationObserver||global.MutationObserver;if(Observer&&node.element){const observer=new Observer(()=>{if(destroyed||r.removed||node.removed)return;const current=node.children||[];if(current.length!==r.children.length||current.some((n,i)=>n!==r.children[i]))childrenChanged(r);});observer.observe(node.element,{childList:true});r.observer=observer;observers.add(observer);}
   reconcile(r);
  }}
 function refresh(){if(destroyed)return;for(const element of ui.findAll('*'))register(element.__unityNode);for(const r of records.values()){if(r.node.removed){releaseRecord(r);continue;}reconcile(r);const current=r.node.children||[];if(current.length!==r.children.length||current.some((n,i)=>n!==r.children[i]))childrenChanged(r);}}
 const off=ui.onActiveChange?.(event=>{if(destroyed)return;if(event.reason!=='destroy')register(event.node);for(const r of records.values())if(r.node===event.node){if(event.reason==='destroy'){releaseRecord(r);disable(r);}else reconcile(r);}});
 refresh();
 return{diagnostics,refresh,childrenChanged(selector){const node=selector?.__unityNode||selector?.node||selector;for(const r of records.values())if(r.node===node)childrenChanged(r);},destroy(){if(destroyed)return;destroyed=true;off?.();for(const r of [...records.values()])releaseRecord(r);observers.clear();}};
}
const api={mount,approximatelyOne,SCRIPT_ID,SCRIPT_GUID,EPSILON_SQUARED};global.SDDYXMobilePlatform=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
