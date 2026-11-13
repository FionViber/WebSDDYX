(function(global){
'use strict';
const L=source=>global.SDDYXLocalization?.text(source)??source;
const cache=new Map(), scripts=new Map(),riteAtlases=new WeakMap();
let harmonious=false;
function setHarmonious(value){const next=value===true||value===1,changed=harmonious!==next;harmonious=next;return changed;}
// Native SafeReplace41C030: exact unprefixed, case-sensitive, one-step lookup.
// Texture loads remain raw; this applies only to the source sprite entrypoint.
function safeReplace(resource){const map=global.SDDYX_CONTENT?.config?.variable?.harmonious_replacer;if(harmonious&&typeof resource==='string'&&map&&Object.prototype.hasOwnProperty.call(map,resource))return map[resource];return resource;}
function sourceResource(path,kind){if(typeof path!=='string'||!path)return null;const key=path.replace(/\\/g,'/').toLowerCase(),resources=global.SDDYX_ASSETS?.resources||{},entry=resources[key]||Object.entries(resources).find(([name])=>name.toLowerCase()===key)?.[1];return entry?.find(value=>value.kind===kind||(kind==='texture'&&['png','jpg','jpeg','webp'].includes(value.kind)))||null;}
function loadSprite(resource){const value=safeReplace(resource);return typeof value==='string'?sourceResource('Image/'+value,'sprite'):null;}
const normalize=s=>String(s||'').replace(/\\/g,'/').replace(/^ss:\/\//,'').replace(/\.(png|jpg|jpeg|ogg|wav|mp3|ttf|otf|asset)$/i,'').toLowerCase();
function asset(resource,kind){
 if(!resource)return null;
 if(typeof resource==='object'&&resource.url)return resource;
 const db=global.SDDYX_ASSETS;if(!db)return null;
 const key=String(resource),ck=key+'|'+(kind||'');if(cache.has(ck))return cache.get(ck);
 if(db.sprites[key])return db.sprites[key];if(db.media[key])return db.media[key];
 const n=normalize(key), variants=[n,'image/'+n,'audio/'+n,'sfx/'+n];
 let found=null;
 for(const r of Object.keys(db.resources||{}))if(variants.includes(normalize(r))){const list=db.resources[r];found=list.find(x=>x.kind===kind)||list.find(x=>x.kind==='sprite')||list[0];if(found)break;}
 if(!found){const tail=n.split('/').pop();for(const [path,list]of Object.entries(db.resources||{})){if(normalize(path).split('/').pop()!==tail)continue;const candidate=(kind?list.find(v=>v.kind===kind):null)||(!kind||kind==='sprite'?list.find(v=>v.kind==='sprite'):null);if(candidate){found=candidate;break;}}}
 if(!found){const tail=n.split('/').pop();for(const [path,v]of Object.entries(db.media||{})){if(normalize(path)===n || normalize(path).endsWith('/'+n) || normalize(path).split('/').pop()===tail){if(kind==='audio'&&!/\.(ogg|wav|mp3)$/i.test(path))continue;found=v;break;}}}
 cache.set(ck,found);return found;
}
function card(resource,isChar=false){return loadSprite(resource)||sourceResource(isChar?'Image/cards/1_char_0':'Image/cards/2_item_0','sprite');}
// Datapool.LoadRiteSprite418930 uses Resources.LoadAll<Sprite>(Image/rites),
// dictionary key Path.GetFileNameWithoutExtension(sprite.name). GetRiteSprite
// 4148A0 performs exact case-sensitive lookup, then the native rite_0 fallback.
function riteSprite(resource){const assets=global.SDDYX_ASSETS;if(!assets)return null;let atlas=riteAtlases.get(assets);if(!atlas){atlas=new Map(Object.values(assets.sprites||{}).filter(s=>String(s.texture||'').replace(/\\/g,'/').toLowerCase()==='resources/image/rites.png').map(s=>[String(s.name||'').replace(/\.[^.]+$/,''),s]));riteAtlases.set(assets,atlas);}return atlas.get(resource)||atlas.get('rite_0')||null;}
function cardTexture(resource,suffix){return sourceResource('Image/'+String(resource)+'_'+suffix,'texture')||sourceResource('Image/cards/2_item_0_'+suffix,'texture');}
function breakerTexture(resource){const value=safeReplace(resource);return typeof value==='string'?sourceResource('Image/'+value,'texture'):null;}
function riteTemplate(kind,resource,{mobile=false}={}){if(!['bg','fg','slot_bg'].includes(kind))throw Error('Unknown native rite template kind: '+kind);const value=safeReplace(resource),prefix='rite/template/'+kind+'/';return mobile&&kind!=='slot_bg'&&loadSprite(prefix+'mobile/'+value)||loadSprite(prefix+value);}
function url(resource,kind){const value=asset(resource,kind)?.url||null;return kind==='audio'&&global.SDDYX_RESIDENT?.ready?global.SDDYX_RESIDENT.audioURL(value):value;}
function image(resource,className='',alt=''){
 const sprite=loadSprite(resource);const el=document.createElement('span');el.className='original-sprite '+className;el.setAttribute('role','img');el.setAttribute('aria-label',alt);el.dataset.resource=String(resource||'');
 if(!sprite){el.classList.add('asset-missing');el.title=L("原资源缺失: ")+resource;return el;}
 const rect=sprite.cssRect||sprite.rect;
 if(rect){const m=global.SDDYX_ASSETS.media[sprite.texture]||{};const img=(globalThis.SDDYXAssetPolicy?.createImage()||document.createElement('img'));img.src=sprite.url;img.alt='';img.draggable=false;img.style.cssText=`position:absolute;max-width:none;width:${100*(m.width||rect.width)/rect.width}%;height:${100*(m.height||rect.height)/rect.height}%;left:${-100*rect.x/rect.width}%;top:${-100*rect.y/rect.height}%;`;el.appendChild(img);el.style.aspectRatio=rect.width+'/'+rect.height;}
 else{const img=(globalThis.SDDYXAssetPolicy?.createImage()||document.createElement('img'));img.src=sprite.url;img.alt='';img.draggable=false;img.style.cssText='width:100%;height:100%;object-fit:contain';el.appendChild(img);if(sprite.width&&sprite.height)el.style.aspectRatio=sprite.width+'/'+sprite.height;}
 return el;
}
// Local classic scripts, not fetch(), keep the double-click file:// build usable.
// No timeout/DOM-removal cancellation: removing an in-flight script does not prove
// execution stopped. Released owners are ignored, and unowned data evicts on settle.
function forgetScript(path,record=scripts.get(path)){
 if(!record||scripts.get(path)!==record)return false;
 scripts.delete(path);record.node?.remove?.();return true;
}
function loadScript(path,options={}){
 let record=scripts.get(path);
 if(!record){
  const node=document.createElement('script');record={node,status:'loading',promise:null};
  record.promise=new Promise((resolve,reject)=>{
   node.onload=()=>{record.status='ready';node.onload=node.onerror=null;resolve();};
   node.onerror=()=>{record.status='failed';node.onload=node.onerror=null;forgetScript(path,record);reject(Error(L("本地资源无法载入: ")+path));};
  });
  scripts.set(path,record);node.src=global.SDDYXAssetPolicy?.scriptURL(path)||path;
  try{document.head.appendChild(node);}catch(error){record.status='failed';forgetScript(path,record);node.onerror?.();}
 }
 if(!options.validate)return record.promise;
 return record.promise.then(()=>{if(!options.validate()){forgetScript(path,record);throw Error(L("本地资源未正确注册: ")+path);}return options.value?.();});
}
const dataRecords=new Map();let dataGeneration=0,activeSceneScope=null;
function abortResource(){const error=Error('Resource owner was released');error.name='AbortError';return error;}
function validData(value){return !!value&&typeof value==='object'&&!Array.isArray(value)&&!!value.nodes&&typeof value.nodes==='object'&&!Array.isArray(value.nodes)&&Array.isArray(value.roots)&&value.roots.every(id=>Object.prototype.hasOwnProperty.call(value.nodes,id));}
function dataDescriptor(kind,name){
 if(typeof name!=='string'||!name||/[\\/]/.test(name))throw Error('Invalid local '+kind+' name');
 const key=kind+':'+name,path=kind==='scene'?'assets/layouts/'+name+'.js':global.SDDYX_ASSETS?.prefabPaths?.[name]||'assets/prefabs/'+name+'.js';
 const read=()=>kind==='scene'?global['SDDYX_SCENE_'+name]:global.SDDYX_PREFABS?.[name];
 const drop=value=>{if(read()!==value)return;if(kind==='scene')delete global['SDDYX_SCENE_'+name];else if(global.SDDYX_PREFABS)delete global.SDDYX_PREFABS[name];};
 return {key,path,read,drop};
}
function evictData(record){
 if(record.refs||record.status==='loading')return;
 if(dataRecords.get(record.key)===record)dataRecords.delete(record.key);
 if(record.value)record.drop(record.value);
 // One script path belongs to one serialized scene/prefab; no shared caller is
 // released here until that data record has zero owners.
 if(record.scriptRecord)forgetScript(record.path,record.scriptRecord);
 record.value=null;
}
function acquireData(kind,name,owner){
 const descriptor=dataDescriptor(kind,name);let record=dataRecords.get(descriptor.key);
 if(!record){
  record={...descriptor,generation:++dataGeneration,status:'loading',refs:0,value:null,scriptRecord:null};dataRecords.set(record.key,record);
  const run=async()=>{
   let value=record.read();
   if(!validData(value)){
    if(value!==undefined)record.drop(value);
    // A previously resolved generic script cannot stand in for missing data.
    const old=scripts.get(record.path);if(old&&old.status!=='loading')forgetScript(record.path,old);
    const pending=loadScript(record.path);record.scriptRecord=scripts.get(record.path);await pending;value=record.read();
   }else record.scriptRecord=scripts.get(record.path)||null;
   if(!validData(value))throw Error(L("本地资源未正确注册: ")+record.path);
   record.value=value;record.status='ready';evictData(record);return value;
  };
  // The first owner is installed below before run() or any asynchronous work.
  record.start=()=>{record.promise=run().catch(error=>{record.status='failed';if(dataRecords.get(record.key)===record)dataRecords.delete(record.key);if(record.scriptRecord)forgetScript(record.path,record.scriptRecord);throw error;});};
 }
 record.refs++;
 if(record.start){const start=record.start;delete record.start;start();}
 let released=false,rejectReleased;
 const ready=new Promise((resolve,reject)=>{rejectReleased=reject;record.promise.then(value=>{if(!released)resolve(value);},error=>{if(!released)reject(error);});});
 // Scope teardown may abandon a pending read deliberately; callers still receive
 // the original rejection if they await ready.
 ready.catch(()=>{});
 return {key:record.key,generation:record.generation,owner,ready,get released(){return released;},release(){if(released)return false;released=true;record.refs--;rejectReleased(abortResource());evictData(record);return true;}};
}
function acquireScene(name,owner){return acquireData('scene',name,owner);}
function acquirePrefab(name,owner){return acquireData('prefab',name,owner);}
function createScope(owner){
 const leases=new Map();let released=false;
 function get(kind,name){
  if(released)return Promise.reject(abortResource());
  const key=kind+':'+name;let lease=leases.get(key);
  if(!lease){lease=acquireData(kind,name,owner);leases.set(key,lease);lease.ready.catch(()=>{if(leases.get(key)===lease){leases.delete(key);lease.release();}});}
  return lease.ready;
 }
 return {owner,get released(){return released;},scene:name=>get('scene',name),prefab:name=>get('prefab',name),release(){if(released)return false;released=true;for(const lease of leases.values())lease.release();leases.clear();if(activeSceneScope===this)activeSceneScope=null;return true;}};
}
const legacyScope=createScope('legacy-unscoped');
function setSceneScope(scope){if(scope?.released)throw abortResource();activeSceneScope=scope||null;}
function scene(name){return(activeSceneScope||legacyScope).scene(name);}
function prefab(name){return(activeSceneScope||legacyScope).prefab(name);}
// Retain the normal scope lease, but do not turn already registered original
// prefab data into an artificial asynchronous presentation dependency. A plain
// global property is NOT sufficient: only the exact live successful data record
// can enter the synchronous callback. Cold/failed loads keep their real await.
function withPrefabs(names,ready){
 const scope=activeSceneScope||legacyScope,unique=[...new Set(names)],pending=unique.map(name=>scope.prefab(name));
 const values=unique.map(name=>{const record=dataRecords.get('prefab:'+name);return record?.status==='ready'&&record.refs>0&&record.value===record.read()?record.value:null;});
 if(values.every(Boolean))return ready(values);
 return Promise.all(pending).then(values=>{if(scope.released)throw abortResource();for(let i=0;i<unique.length;i++){const record=dataRecords.get('prefab:'+unique[i]);if(record?.status!=='ready'||!record.refs||record.value!==values[i]||record.read()!==values[i])throw Error('Original prefab registration changed: '+unique[i]);}return ready(values);},error=>{error.sddyxResourcePreparation=true;throw error;});
}
function dataStats(){return [...dataRecords.values()].map(({key,generation,status,refs})=>({key,generation,status,refs}));}
global.SDDYXResources={asset,sourceResource,loadSprite,safeReplace,setHarmonious,card,cardTexture,breakerTexture,riteTemplate,riteSprite,url,image,loadScript,scene,prefab,acquireScene,acquirePrefab,createScope,setSceneScope,withPrefabs,dataStats,normalize};
})(typeof window!=='undefined'?window:globalThis);
