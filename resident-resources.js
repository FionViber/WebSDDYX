/* Document-lifetime, explicitly awaited original-resource residency.
 * This prepares immutable resources, never activates a hidden GameObject,
 * advances animation/particles, or substitutes for renderer readiness. */
(function(global){'use strict';
function create(options={}){
 const assets=options.assets||global.SDDYX_ASSETS,resources=options.resources||global.SDDYXResources,shaders=options.shaders||global.SDDYXUnityShaders;
 const catalog=options.catalog||global.SDDYX_PRELOAD_CATALOG;
 if(!assets||!resources||!catalog)throw Error('Complete original preload catalog is unavailable.');
 for(const key of ['scripts','scenes','images'])if((key!=='images'||catalog[key]!==undefined)&&(!Array.isArray(catalog[key])||Array.from(catalog[key]).some(value=>typeof value!=='string'||!value)))throw Error('Invalid original preload catalog collection: '+key);
 if(options.diagnosticImageURLs&&options.prepareMaterialPrograms!==false)throw Error('Diagnostic image selection cannot be used for game readiness.');
 const controller=new AbortController(),images=new Map(),audio=new Map(),fonts=new Map(),imageLeases=new Set(),materialLeases=new Set(),plainImages=new Set(),dataScope=resources.createScope('document-resident-original-assets');
 const state={status:'idle',scope:options.diagnosticImageURLs?'diagnostic-image-selection':'complete-catalog',phase:'idle',completed:0,total:0,startedAt:null,finishedAt:null,decodedPixelBytes:0,audioPayloadBytes:0,errors:[],counts:{scenes:0,prefabs:0,images:0,fonts:0,audio:0,materials:0,scripts:0},limitations:['Decoded pixel bytes are logical RGBA allocations, not measured browser or OS resident memory.','Audio payloads are complete and local; browser playback decoding/autoplay permission remain separate.','GPU surfaces, external Live2D/dice renderers and dynamic capture atlases still pass the existing scene readiness gate.']};
 let promise=null,released=false;
 const aborted=()=>{const e=Error('Original preload owner cancelled');e.name='AbortError';return e;};
 const errorText=error=>{try{return String(error?.message||error);}catch(_){return 'Unprintable resource failure';}};
 const isAbort=error=>{try{return error?.name==='AbortError';}catch(_){return false;}};
 const check=()=>{if(released||controller.signal.aborted)throw aborted();};
 // Cancelling a script cannot prove that its execution stopped. Race only this
 // owner's wait, consume late rejection, and keep all post-await publication
 // guarded; the shared script is still allowed to settle for another owner.
 function waitActive(pending){return new Promise((resolve,reject)=>{const signal=controller.signal,cleanup=()=>signal.removeEventListener('abort',cancel),cancel=()=>{cleanup();reject(aborted());};Promise.resolve(pending).then(value=>{cleanup();try{check();resolve(value);}catch(error){reject(error);}},error=>{cleanup();reject(error);});if(signal.aborted||released)cancel();else signal.addEventListener('abort',cancel,{once:true});});}
 const snapshot=()=>({...state,elapsedMs:state.startedAt===null?0:(state.finishedAt??performance.now())-state.startedAt,counts:{...state.counts},errors:[...state.errors],jsHeap:global.performance?.memory?{used:performance.memory.usedJSHeapSize,total:performance.memory.totalJSHeapSize,limit:performance.memory.jsHeapSizeLimit}:null});
 const notify=()=>{try{options.onProgress?.(snapshot());}catch(_){/* An observer never changes resource ownership. */}};
 async function runBatch(label,items,work,concurrency=options.concurrency??3){
  if(!Number.isInteger(concurrency)||concurrency<1)throw Error('Invalid original preload concurrency.');
  state.phase=label;state.completed=0;state.total=items.length;notify();let next=0,failure,failed=false;
  const worker=async()=>{while(!failed&&next<items.length){try{check();const item=items[next++];await waitActive(work(item));check();state.completed++;notify();}catch(error){if(!failed){failed=true;failure=error;controller.abort();}}}};
  await Promise.all(Array.from({length:Math.min(concurrency,items.length)},worker));if(failed)throw failure;check();
 }
 function dispose(){
  if(released)return;released=true;controller.abort();
  const clean=action=>{try{action();}catch(error){state.errors.push('Resource cleanup failed: '+errorText(error));}};
  clean(()=>dataScope.release());
  for(const lease of imageLeases)clean(()=>lease.release());imageLeases.clear();for(const lease of materialLeases)clean(()=>lease.release());materialLeases.clear();
  for(const image of plainImages)clean(()=>image.removeAttribute('src'));plainImages.clear();images.clear();
  for(const item of audio.values())clean(()=>URL.revokeObjectURL(item.url));audio.clear();
  for(const item of fonts.values())clean(()=>document.fonts?.delete(item.face));fonts.clear();
 }
 async function run(){
  state.status='loading';state.startedAt=performance.now();notify();
  try{
   const auxiliary=[...new Set(catalog.scripts||[])];
   await runBatch('data-scripts',auxiliary,async path=>{await resources.loadScript(path);check();state.counts.scripts++;});
   await runBatch('scenes',catalog.scenes||[],async name=>{await dataScope.scene(name);check();state.counts.scenes++;});
   await runBatch('prefabs',Object.keys(assets.prefabPaths||{}),async name=>{await dataScope.prefab(name);check();state.counts.prefabs++;});
   const media=[...new Map(Object.values(assets.media||{}).filter(x=>x?.url).map(x=>[x.url,x])).values()];
   const imageMedia=media.filter(x=>/^(png|jpg|jpeg|webp)$/i.test(x.format||''));
   const extraImages=[...(catalog.images||[]),...Object.values(global.SDDYX_DICE_DATA?.textures||{}),global.SDDYX_DICE_TABLE_DATA?.texture?.url].filter(Boolean);
   for(const url of extraImages)if(!imageMedia.some(x=>x.url===url))imageMedia.push({url,format:'png'});
   // Include exact texture-registry URLs not represented by the media index.
   for(const url of Object.keys(global.SDDYX_SHADER_TEXTURES||{}))if(!imageMedia.some(x=>x.url===url))imageMedia.push({url,format:'png'});
   let selectedImageMedia=imageMedia;
   if(options.diagnosticImageURLs){const selected=new Set(options.diagnosticImageURLs);for(const url of selected)if(!imageMedia.some(x=>x.url===url))throw Error('Unknown diagnostic original image: '+url);selectedImageMedia=imageMedia.filter(x=>selected.has(x.url));}
   state.imageCoverage={catalogCount:imageMedia.length,selectedCount:selectedImageMedia.length,completeCatalog:selectedImageMedia.length===imageMedia.length};
   await runBatch('images',selectedImageMedia,async item=>{
    let image;
    if(global.SDDYX_SHADER_TEXTURES?.[item.url]){const lease=shaders.acquireImage(item.url);imageLeases.add(lease);image=await lease.ready;}
    else{image=(globalThis.SDDYXAssetPolicy?.createImage()||new Image());plainImages.add(image);image.src=item.url;await image.decode();}
    check();if(!image.complete||!image.naturalWidth)throw Error('Original image did not decode: '+item.url);
    if(item.width&&image.naturalWidth!==item.width||item.height&&image.naturalHeight!==item.height)throw Error('Original image dimensions changed: '+item.url);
    images.set(item.url,image);state.counts.images++;state.decodedPixelBytes+=image.naturalWidth*image.naturalHeight*4;
    if(Number.isFinite(options.maxDecodedPixelBytes)&&state.decodedPixelBytes>options.maxDecodedPixelBytes)throw Error('Configured decoded-pixel safety cap reached; full preload is NOT accepted.');
   },options.imageConcurrency??2);
   const fontEntries=[...new Map(Object.values(assets.fonts||global.SDDYX_FONTS||{}).filter(x=>x.family&&x.url).map(x=>[x.family,x])).values()];
   await runBatch('fonts',fontEntries,async item=>{
    const face=new FontFace(item.family,'url('+JSON.stringify(item.url)+')');await face.load();check();document.fonts.add(face);fonts.set(item.family,{face,url:item.url});state.counts.fonts++;
   });
   await runBatch('audio',media.filter(x=>/^(ogg|wav|mp3|m4a)$/i.test(x.format||'')),async item=>{
    const response=await fetch(item.url,{signal:controller.signal});if(!response.ok)throw Error('Original audio unavailable: '+item.url+' ('+response.status+')');const blob=await response.blob();check();
    if(item.bytes&&blob.size!==item.bytes)throw Error('Original audio byte length changed: '+item.url);
    const url=URL.createObjectURL(blob);audio.set(item.url,{url,bytes:blob.size});state.audioPayloadBytes+=blob.size;state.counts.audio++;
   },2);
   // Programs and material source images only; no draw or emitter construction.
   const materials=options.prepareMaterialPrograms===false?[]:Object.values(global.SDDYX_MATERIALS||{}).filter(item=>shaders.supported(item));
   await runBatch('material-programs',materials,async item=>{const lease=shaders.acquireMaterial(item,{keywords:['DIRECTIONAL','LIGHTPROBE_SH'],isCurrent:()=>!released});materialLeases.add(lease);await lease.ready;check();state.counts.materials++;},1);
   check();state.status=options.diagnosticImageURLs?'diagnostic-assets-ready':options.prepareMaterialPrograms===false?'assets-ready':'ready';state.phase='complete';state.finishedAt=performance.now();notify();check();return snapshot();
  }catch(error){state.status=isAbort(error)?'cancelled':'failed';state.errors.push(errorText(error));state.finishedAt=performance.now();dispose();notify();throw error;}
 }
 return Object.freeze({start(){if(released)return Promise.reject(aborted());if(!promise){let resolve,reject;promise=new Promise((yes,no)=>{resolve=yes;reject=no;});run().then(resolve,reject);}return promise;},cancel(){if(released||state.status==='ready')return false;dispose();state.status='cancelled';state.finishedAt=performance.now();notify();return true;},dispose,
  get ready(){return state.status==='ready'&&!released;},stats:snapshot,imageURLs:()=>[...images.keys()],
  imageReady(url){return !released&&images.has(url)&&images.get(url).complete&&images.get(url).naturalWidth>0;},
  fontFaces(family,url){const item=fonts.get(family);return !released&&item?.url===url&&item.face.status==='loaded'&&document.fonts.has(item.face)?[item.face]:[];},
  audioURL(url){return !released?audio.get(url)?.url||url:url;}
 });
}
global.SDDYXResidentResources={create};
})(typeof window!=='undefined'?window:globalThis);
