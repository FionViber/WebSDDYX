/* Original Unity D3D11 shaders, mechanically translated to GLSL ES 3.00.
 * One shared WebGL context. All visible graphics receive ordinary 2D surfaces.
 * No fetch, modules, CDN, or browser security changes are required for file://. */
(function(global){'use strict';
const scripts=new Map(),images=new Map(),decodedImages=new Map(),imageRecords=new Map(),surfaces=new Set(),errors=[];
const runtimeTextures=new WeakMap();let runtimeTextureSerial=0;
// Decoded original Images are held only by current/pending consumers.
// This is not a claim that browser-internal image/native caches are purged.
const IMAGE_CACHE_BYTES=0;let cacheClock=0;
function resourceCancelled(message='Original resource request was cancelled.'){const error=Error(message);error.name='AbortError';return error;}
function evictImageRecord(record){if(record.state==='pending'||(record.refs&&record.state!=='error')||imageRecords.get(record.url)!==record)return false;accountAllocation('decodedImages',record.url,0);decodedImages.delete(record.url);images.delete(record.url);imageRecords.delete(record.url);record.image=null;record.promise=null;return true;}
function trimImages(){for(const record of imageRecords.values())evictImageRecord(record);}


// Diagnostic accounting: logical RGBA8 bytes, not actual resident GPU/browser memory.
const allocationLedger=Object.create(null),allocationOwners=new Map(),canvasAllocationIds=new WeakMap();let allocationSerial=0;
function accountAllocation(kind,key,bytes){bytes=Math.max(0,Number(bytes)||0);const id=kind+':'+key,old=allocationOwners.get(id)||0;if(old===bytes)return;const r=allocationLedger[kind]||(allocationLedger[kind]={created:0,released:0,current:0,peak:0,createdCount:0,releasedCount:0,currentCount:0,peakCount:0});if(old){r.released+=old;r.current-=old;r.releasedCount++;r.currentCount--;}if(bytes){r.created+=bytes;r.current+=bytes;r.createdCount++;r.currentCount++;allocationOwners.set(id,bytes);}else allocationOwners.delete(id);r.peak=Math.max(r.peak,r.current);r.peakCount=Math.max(r.peakCount,r.currentCount);}
function accountClear(kind){for(const key of [...allocationOwners.keys()])if(key.startsWith(kind+':'))accountAllocation(kind,key.slice(kind.length+1),0);}
function accountCanvas(canvas,kind='surfaceCanvas',release=false){let id=canvasAllocationIds.get(canvas);if(!id){id=++allocationSerial;canvasAllocationIds.set(canvas,id);}accountAllocation(kind,id,release?0:canvas.width*canvas.height*4);}
function allocationSnapshot(){return JSON.parse(JSON.stringify(allocationLedger));}
const I=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const stats={draws:0,gpuResizes:0,bufferAllocations:0,surfaceResizes:0,maxRequestedWidth:0,maxRequestedHeight:0,maxRequestedPixels:0,textureUploads:0,textureUploadBytes:0};
const backingCapacity=v=>v<=256?2**Math.ceil(Math.log2(Math.max(1,v))):Math.ceil(v/256)*256;
let gpu=null,serial=0,frame=0,start=performance.now();
const vector=x=>Array.isArray(x)?x:typeof x==='object'?[x.r??x.x??0,x.g??x.y??0,x.b??x.z??0,x.a??x.w??0]:[Number(x)||0];
function script(url){if(scripts.has(url))return scripts.get(url);let element;const promise=new Promise((resolve,reject)=>{const el=element=document.createElement('script');el.src=global.SDDYXAssetPolicy?.scriptURL(url)||url;el.onload=()=>resolve();el.onerror=()=>reject(Error('Original shader data unavailable: '+url));document.head.appendChild(el);}).catch(error=>{if(scripts.get(url)===promise)scripts.delete(url);element?.remove();throw error;});scripts.set(url,promise);return promise;}
function nameOf(material){return global.SDDYX_MATERIAL_SHADERS?.[material?.guid]||global.SDDYX_SHADER_GUIDS?.[material?.shaderGuid];}
function supported(material){return !!nameOf(material);}
async function shaderData(material,base){const name=nameOf(material);if(!name)return null;if(!global.SDDYX_SHADER_PROGRAMS?.[name])await script(base+global.SDDYX_SHADER_MANIFEST[name]);return global.SDDYX_SHADER_PROGRAMS[name];}
async function particleMesh(ref,base=''){const key=ref?.guid+':'+ref?.fileID;if(!ref?.fileID)return null;if(!global.SDDYX_PARTICLE_MESHES?.[key]){const entry=global.SDDYX_PARTICLE_MESH_MANIFEST?.[key];if(!entry)throw Error('Original particle mesh is not recovered: '+key);await script(base+entry.script);}return global.SDDYX_PARTICLE_MESHES[key];}
function acquireImage(url,base=''){
 let record=imageRecords.get(url);
 if(!record){
  record={url,refs:0,state:'pending',image:null,promise:null};imageRecords.set(url,record);
  // Begin only after the record and first lease exist, including cache hits
  // with synchronous test/image implementations.
  record.promise=Promise.resolve().then(async()=>{
   const embedded=/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(url)?url:null,item=global.SDDYX_SHADER_TEXTURES?.[url];
   const directHTTP=global.SDDYX_HTTP_TEXTURES===true&&/^https?:$/.test(global.location?.protocol||'')&&!embedded;
   if(!directHTTP&&!embedded&&!global.SDDYX_SHADER_TEXTURE_DATA?.[url]){if(!item)throw Error('Shader texture is not embedded for offline use: '+url);await script(base+item.script);}
   const image=(globalThis.SDDYXAssetPolicy?.createImage()||new Image());record.image=image;image.src=directHTTP?base+url:embedded||global.SDDYX_SHADER_TEXTURE_DATA[url];await image.decode();
   record.state='ready';accountAllocation('decodedImages',url,image.width*image.height*4);decodedImages.set(url,{bytes:image.width*image.height*4,width:image.width,height:image.height,used:++cacheClock});trimImages();return image;
  }).catch(error=>{record.state='error';evictImageRecord(record);throw error;});
  images.set(url,record.promise);
 }
 record.refs++;const cached=decodedImages.get(url);if(cached)cached.used=++cacheClock;let released=false;
 const ready=record.promise.then(image=>{if(released)throw resourceCancelled();return image;});ready.catch(()=>{});
 return{ready,release(){if(released)return;released=true;record.refs--;evictImageRecord(record);}};
}
// Compatibility for one-shot callers: their returned Image remains valid,
// but no hidden global Promise/Image pin survives the completed request.
// Long-lived consumers must use acquireImage and hold/release its lease.
async function imageData(url,base){const lease=acquireImage(url,base);try{return await lease.ready;}finally{lease.release();}}
function releaseImageLeases(leases){if(!leases)return;for(const lease of leases)lease.release();leases.clear();}
function acquireMaterial(material,{assetBase='',keywords,isCurrent=()=>true}={}){
 const leases=new Set(),reserved=new Map();let released=false;
 const release=()=>{if(released)return;released=true;releaseImageLeases(leases);reserved.clear();};
 const check=()=>{if(released||!isCurrent())throw resourceCancelled('Original material request is no longer current.');};
 const ready=(async()=>{check();
  // Reserve only already existing image records before the first await. This
  // prevents replacing a prepared material owner from opening a zero-ref gap,
  // without starting any cold image load before shader validation.
  for(const url of new Set(Object.values(material.textures||{}).map(v=>v.url).filter(Boolean)))if(imageRecords.has(url)){const lease=acquireImage(url,assetBase);reserved.set(url,lease);leases.add(lease);}
  const data=await shaderData(material,assetBase);check();if(!data)throw Error('Shader not recovered.');
  choose(data,material,'vertex',keywords);choose(data,material,'fragment',keywords);
  const urls=new Set(Object.values(material.textures||{}).map(v=>v.url).filter(Boolean));for(const [url,lease]of reserved)if(!urls.has(url)){lease.release();leases.delete(lease);reserved.delete(url);}
  const requested=[...urls].map(url=>{const lease=reserved.get(url)||acquireImage(url,assetBase);leases.add(lease);return lease.ready;});
  await Promise.all(requested);check();if(gpu?.lost)throw Error('Original shader WebGL context is lost.');program(data,material,{keywords});check();return{status:'ready',data};
 })().catch(error=>{release();throw error;});ready.catch(()=>{});return{ready,release};
}

function context(){if(gpu)return gpu;const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2',{alpha:true,antialias:false,premultipliedAlpha:true,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL2 is unavailable for original material shaders.');const state={canvas,gl,programs:new Map(),textures:new Map(),restoreWaiters:new Set(),lost:false,maxTextureSize:null};canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();state.lost=true;for(const surface of surfaces)surface.contextLost=true;});canvas.addEventListener('webglcontextrestored',()=>{state.lost=false;state.maxTextureSize=null;state.programs.clear();state.textures.clear();accountClear('gpuTextures');accountClear('gpuBuffers');for(const s of surfaces)s.dirty=true;for(const wake of [...state.restoreWaiters])wake();});gpu=state;accountCanvas(canvas,'sharedWebGLCanvas');return state;}
async function waitForContextRestore(surface,isCurrent){while(gpu?.lost){if(surface.destroyed||!isCurrent())throw resourceCancelled('Original shader context wait is no longer current.');const state=gpu;await new Promise(resolve=>{const wake=()=>{state.restoreWaiters.delete(wake);surface.contextWaiters.delete(wake);resolve();};state.restoreWaiters.add(wake);surface.contextWaiters.add(wake);});}if(surface.destroyed||!isCurrent())throw resourceCancelled('Original shader context wait is no longer current.');}
function choose(data,material,stage,extra){const list=data.passes[0][stage].map(i=>data.programs[i]),wanted=new Set([...(material.keywords||[]),...(extra||[])]);let best=null,score=-Infinity;for(const item of list){const unexpected=item.keywords.filter(k=>!wanted.has(k));if(unexpected.length)continue;const n=item.keywords.length;if(n>score){score=n;best=item;}}if(!best)throw Error('No recovered '+stage+' variant for '+data.name+' '+[...wanted].join(' '));return best;}
function program(data,material,options){
 const state=context(),gl=state.gl,v=choose(data,material,'vertex',options.keywords),f=choose(data,material,'fragment',options.keywords),key=data.name+':'+v.index+':'+f.index;if(state.programs.has(key))return state.programs.get(key);
 const compile=(kind,code)=>{const shader=gl.createShader(kind);gl.shaderSource(shader,code);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error(message);}return shader;};
 const p=gl.createProgram();let vs=null,fs=null;
 try{
  vs=compile(gl.VERTEX_SHADER,v.glsl);fs=compile(gl.FRAGMENT_SHADER,f.glsl);gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.detachShader(p,vs);gl.detachShader(p,fs);gl.deleteShader(vs);gl.deleteShader(fs);vs=fs=null;
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
  const result={p,v,f,key,uniforms:new Map(),attributes:new Map()};for(const attr of v.inputs){const name='v'+attr.register;if(!result.attributes.has(name))result.attributes.set(name,gl.getAttribLocation(p,name));}for(let i=0;i<gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i++){const u=gl.getActiveUniform(p,i);result.uniforms.set(u.name.replace(/\[0\]$/,''),{name:u.name,size:u.size,type:u.type,location:gl.getUniformLocation(p,u.name)});}prepareBindings(result);state.programs.set(key,result);return result;
 }catch(error){if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);gl.deleteProgram(p);throw error;}
}

// Linked-program reflection is immutable. Keep binding lookup and bounded CPU
// scratch with the program, not with a surface (several surfaces share it).
// Restoring the WebGL context discards the entire program map and these caches.
function prepareBindings(p){
 p.constantBindings=[];p.textureBindings=[];p.attributeBindings=[];p.buffers=new Map();
 for(const [kind,rec]of [['v',p.v],['f',p.f]]){
  for(const cb of rec.reflection.buffers){const name=kind+'_cb'+cb.index,u=p.uniforms.get(name);if(!u)continue;
   if(!u.storage){const values=new Float32Array(u.size*4);u.storage={values,ints:new Int32Array(values.buffer),words:new Uint32Array(values.buffer),sent:new Uint32Array(values.length),valid:false};}
   p.constantBindings.push({name,u,fields:cb.params.map(field=>({name:field.name,offset:field.offset/4,count:field.kind==='matrix'?field.rows*4:field.dim,integer:field.type===1}))});
  }
  for(const [name,u]of p.uniforms){const match=/^([vf])_SPIRV_Cross_Combinedt(\d+)s(\d+)$/.exec(name);if(!match||match[1]!==kind)continue;p.textureBindings.push({name,u,tx:rec.reflection.textures.find(t=>t.index===+match[2]),unit:p.textureBindings.length});}
 }
 for(const attr of p.v.inputs){if(attr.system)continue;const location=p.attributes.get('v'+attr.register);if(location<0)continue;p.attributeBindings.push({attr,location,key:attr.name+'_'+attr.index});}
}
function sameWords(a,b){for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;}
function invalidateTransfers(p){for(const {u}of p.constantBindings)u.storage.valid=false;for(const {u}of p.textureBindings)u.samplerValid=false;for(const buffer of p.buffers.values()){buffer.valid=false;buffer.capacity=0;}}
// context() is a public diagnostic escape hatch. A caller may retain its raw
// GL handle and mutate it later, so exposing it permanently disables transfer
// suppression. Read-only resourceStats() does not surrender renderer ownership.
function exposedContext(){const state=context();state.externalAccess=true;return state;}
function uploadConstants(p,s,time,state){const gl=state.gl;
 for(const {name,u,fields}of p.constantBindings){const storage=u.storage,{values,ints,words,sent}=storage;values.fill(0);
  for(const field of fields){const value=parameter(field.name,s,time),target=field.integer?ints:values;for(let i=0;i<field.count&&field.offset+i<values.length;i++)target[field.offset+i]=value[i]??0;}
  const changed=state.externalAccess||!storage.valid||!sameWords(words,sent);if(changed)gl.uniform4fv(u.location,values);
  const err=global.SDDYX_SHADER_VALIDATE_DRAWS===true||state.externalAccess||s.contextLost||!s.draws?gl.getError():gl.NO_ERROR;if(err){invalidateTransfers(p);throw Error('Uniform '+name+' size '+u.size+': '+err);}
  if(changed){sent.set(words);storage.valid=true;stats.uniformUploads=(stats.uniformUploads||0)+1;stats.uniformUploadBytes=(stats.uniformUploadBytes||0)+values.byteLength;}
 }
}
const defaultWhite=[1,1,1,1],defaultNormal=[0,0,-1,0],defaultTangent=[1,0,0,-1],defaultUV=[0,0,1,1];
function uploadAttribute(p,binding,o,count,state){const gl=state.gl,{attr,location,key}=binding;let source=o.geometry?.attributes?.[key];
 // The runtime supplies dense numeric RGBA arrays. Preserve the older public
 // option coercion (notably typed/sparse/nested arrays) outside that fast path.
 const color=o.color||defaultWhite;if(!source&&attr.name==='COLOR'&&(!Array.isArray(color)||color.length!==4||typeof color[0]!=='number'||typeof color[1]!=='number'||typeof color[2]!=='number'||typeof color[3]!=='number'))source=Array.from({length:count},()=>color).flat();
 const quadPosition=!source&&attr.name==='POSITION',quadUV=!source&&attr.name==='TEXCOORD'&&!o.geometry;
 const repeat=attr.name==='COLOR'?(o.color||defaultWhite):attr.name==='NORMAL'?defaultNormal:attr.name==='TANGENT'?defaultTangent:null,length=source?source.length:quadPosition||quadUV?16:count*(repeat?.length??4);
 let buffer=p.buffers.get(location);if(!buffer){buffer={id:gl.createBuffer(),capacity:0,valid:false,length:-1};p.buffers.set(location,buffer);}gl.bindBuffer(gl.ARRAY_BUFFER,buffer.id);
 if(!buffer.values||buffer.values.length<length){const capacity=2**Math.ceil(Math.log2(Math.max(4,length)));buffer.values=new Float32Array(capacity);buffer.words=new Uint32Array(buffer.values.buffer);buffer.valid=false;buffer.length=-1;}
 let changed=state.externalAccess||!buffer.valid||buffer.length!==length;
 if(buffer.length!==length){buffer.length=length;buffer.view=buffer.values.subarray(0,length);}
 const values=buffer.values,words=buffer.words,uv=o.uv||defaultUV,width=o.width||1,height=o.height||1;
 // Float32Array -> Float32Array copies preserve raw NaN payloads. Other input
 // arrays undergo exactly the same Float32 coercion as the previous constructor.
 if(source&&Object.prototype.toString.call(source)==='[object Float32Array]'){
  const input=new Uint32Array(source.buffer,source.byteOffset,source.length);for(let i=0;i<length;i++){if(words[i]!==input[i])changed=true;words[i]=input[i];}
 }else for(let i=0;i<length;i++){const old=words[i],lane=i%4,vertex=(i/4)|0;
  values[i]=source?source[i]:quadPosition?(lane===0?(vertex%2?width/2:-width/2):lane===1?(vertex<2?-height/2:height/2):lane===3?1:0):quadUV?(lane===0?uv[vertex%2?2:0]:lane===1?uv[vertex<2?1:3]:0):repeat?repeat[i%repeat.length]:0;
  if(words[i]!==old)changed=true;
 }
 if(buffer.capacity<length*4||state.externalAccess){buffer.capacity=2**Math.ceil(Math.log2(Math.max(16,length*4)));gl.bufferData(gl.ARRAY_BUFFER,buffer.capacity,gl.DYNAMIC_DRAW);stats.bufferAllocations++;accountAllocation('gpuBuffers',p.key+':'+location,buffer.capacity);changed=true;}
 if(changed){buffer.valid=false;gl.bufferSubData(gl.ARRAY_BUFFER,0,buffer.view);buffer.valid=true;stats.attributeTransferBytes=(stats.attributeTransferBytes||0)+buffer.view.byteLength;stats.attributeUploads=(stats.attributeUploads||0)+1;}
 gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,4,gl.FLOAT,false,0,0);
}

function runtimeTexture(source,settings){let record=runtimeTextures.get(source);if(!record){record={key:'$runtime:'+(++runtimeTextureSerial),version:0,settings:{},fullDirty:true,regions:new Map()};runtimeTextures.set(source,record);}if(settings)Object.assign(record.settings,settings);return record;}
function invalidateTexture(source,settings){const record=runtimeTexture(source,settings);record.version++;record.fullDirty=true;record.regions.clear();for(const s of surfaces)if(Object.values(s.textureURLs).includes(record.key))s.dirty=true;return record.version;}
function updateTextureRegion(source,tile,x,y){const record=runtimeTexture(source);record.version++;record.regions.set(x+','+y,{source:tile,x,y});for(const s of surfaces)if(Object.values(s.textureURLs).includes(record.key))s.dirty=true;}
function releaseTexture(source){const record=runtimeTextures.get(source),texture=record&&gpu?.textures.get(record.key);if(texture){gpu.gl.deleteTexture(texture.tex);gpu.textures.delete(record.key);accountAllocation('gpuTextures',record.key,0);}if(record){record.version++;record.regions.clear();record.fullDirty=true;}}
function texture(url,image,dimension=2,fallback='white'){
 const state=context(),gl=state.gl,key=url||'$'+dimension+':'+fallback,runtime=image&&runtimeTextures.get(image);let result=state.textures.get(key);
 const upload=initial=>{gl.bindTexture(result.target,result.tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,!!image);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);if(!initial&&result.width===image.width&&result.height===image.height){if(runtime&&!runtime.fullDirty&&runtime.regions.size){for(const r of runtime.regions.values()){gl.texSubImage2D(result.target,0,r.x,image.height-r.y-r.source.height,gl.RGBA,gl.UNSIGNED_BYTE,r.source);stats.textureUploads++;stats.textureUploadBytes+=r.source.width*r.source.height*4;}}else{gl.texSubImage2D(result.target,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,image);stats.textureUploads++;stats.textureUploadBytes+=image.width*image.height*4;}}else{gl.texImage2D(result.target,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);stats.textureUploads++;stats.textureUploadBytes+=image.width*image.height*4;}result.width=image.width;result.height=image.height;accountAllocation('gpuTextures',key,image.width*image.height*4);result.version=runtime?.version;if(runtime){runtime.fullDirty=false;runtime.regions.clear();}};
 if(result){if(runtime&&result.version!==runtime.version)upload(false);return result;}
 const tex=gl.createTexture(),target=dimension===4?gl.TEXTURE_CUBE_MAP:dimension===3?gl.TEXTURE_3D:gl.TEXTURE_2D;result={tex,target,width:image?.width||1,height:image?.height||1,version:runtime?.version};gl.bindTexture(target,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,!!image);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);
 const bytes=fallback==='black'?new Uint8Array([0,0,0,255]):fallback==='bump'?new Uint8Array([128,128,255,255]):fallback==='gray'?new Uint8Array([128,128,128,255]):new Uint8Array([255,255,255,255]);if(dimension===4){for(let i=0;i<6;i++)gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X+i,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,bytes);}else if(dimension===3)gl.texImage3D(target,0,gl.RGBA8,1,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,bytes);else if(image)upload(true);else gl.texImage2D(target,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
 const info=runtime?.settings||global.SDDYX_SHADER_TEXTURES?.[url]||{},wrap=x=>x===0?gl.REPEAT:x===2?gl.MIRRORED_REPEAT:gl.CLAMP_TO_EDGE;gl.texParameteri(target,gl.TEXTURE_WRAP_S,wrap(info.wrapU));gl.texParameteri(target,gl.TEXTURE_WRAP_T,wrap(info.wrapV));gl.texParameteri(target,gl.TEXTURE_MIN_FILTER,info.filterMode===0?gl.NEAREST:gl.LINEAR);gl.texParameteri(target,gl.TEXTURE_MAG_FILTER,info.filterMode===0?gl.NEAREST:gl.LINEAR);state.textures.set(key,result);accountAllocation('gpuTextures',key,result.width*result.height*4*(dimension===4?6:1));return result;
}
function parameter(name,s,time){const o=s.options,m=s.material,props=s.data.properties,tx=m.textures||{},w=o.width||1,h=o.height||1;
 if(o.uniforms&&name in o.uniforms)return vector(o.uniforms[name]);
 if(name==='_Time')return [time/20,time,time*2,time*3];if(name==='_SinTime')return [Math.sin(time/8),Math.sin(time/4),Math.sin(time/2),Math.sin(time)];if(name==='_CosTime')return [Math.cos(time/8),Math.cos(time/4),Math.cos(time/2),Math.cos(time)];
 if(name==='unity_ObjectToWorld'||name==='unity_WorldToObject'||name==='unity_ProbeVolumeWorldToObject')return I;
 if(name==='unity_MatrixVP')return [2/w,0,0,0,0,2/h,0,0,0,0,1,0,0,0,0,1];
 if(name==='_ProjectionParams')return [1,.3,1000,.001];if(name==='_ScreenParams')return [w,h,1+1/w,1+1/h];
 if(name==='unity_OcclusionMaskSelector')return [1,0,0,0];
 if(name==='unity_WorldTransformParams')return [0,0,0,1];if(name==='unity_OrthoParams')return [w,h,0,1];
 if(name==='unity_SpecCube0_HDR'||name==='unity_SpecCube1_HDR')return [1,1,0,0];
 if(name.endsWith('_ST')){const t=tx[name.slice(0,-3)];return [t?.m_Scale?.x??1,t?.m_Scale?.y??1,t?.m_Offset?.x??0,t?.m_Offset?.y??0];}
 if(name.endsWith('_TexelSize')){const key=name.slice(0,-10),url=s.textureURLs[key],image=s.loadedImages[url];const settings=image&&runtimeTextures.get(image)?.settings,tw=settings?.logicalWidth||image?.width,th=settings?.logicalHeight||image?.height;return image?[1/tw,1/th,tw,th]:[1,1,1,1];}
 if(name in (m.floats||{}))return [m.floats[name]];if(name in (m.ints||{}))return [m.ints[name]];if(name in (m.colors||{}))return vector(m.colors[name]);
 if(props[name])return props[name].value;return [0,0,0,0];
}
function blend(s){const state=s.data.passes[0].state.rtBlend0,value=v=>v.name&&v.name!=='<noninit>'?Number(s.material.floats?.[v.name]??s.material.ints?.[v.name]??s.data.properties[v.name]?.value[0]??v.val):v.val;return {src:value(state.srcBlend),dst:value(state.destBlend),op:value(state.blendOp),mask:value(state.colMask)};}
function applyBlend(s){const gl=context().gl,b=blend(s),factors=[gl.ZERO,gl.ONE,gl.DST_COLOR,gl.SRC_COLOR,gl.ONE_MINUS_DST_COLOR,gl.SRC_ALPHA,gl.ONE_MINUS_SRC_COLOR,gl.DST_ALPHA,gl.ONE_MINUS_DST_ALPHA,gl.SRC_ALPHA_SATURATE,gl.ONE_MINUS_SRC_ALPHA],additive=b.dst===1&&(b.src===1||b.src===5);s.canvas.style.mixBlendMode=additive?'plus-lighter':'normal';
 // The offscreen RGB uses the original pass equation. Its alpha stores DOM
 // coverage rather than Unity framebuffer alpha; the latter never controls
 // the recovered UI passes. This preserves premultiplied shader output.
 gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFuncSeparate(factors[b.src]??gl.SRC_ALPHA,factors[b.dst]??gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.colorMask(true,true,true,true);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);return b;}
function draw(s,time){if(time===undefined)time=s.options.timeProvider?.()??(performance.now()-start)/1000;if(!s.ready||s.destroyed)return false;const state=context(),gl=state.gl;if(state.lost)return false;const validate=global.SDDYX_SHADER_VALIDATE_DRAWS===true||state.externalAccess||s.contextLost||!s.draws;const o=s.options,w=Math.max(1,Math.ceil(o.pixelWidth||o.width||1)),h=Math.max(1,Math.ceil(o.pixelHeight||o.height||1));const maxTextureSize=state.maxTextureSize??(state.maxTextureSize=gl.getParameter(gl.MAX_TEXTURE_SIZE));if(w>maxTextureSize||h>maxTextureSize)throw Error('Original shader surface exceeds GPU texture limit.');stats.maxRequestedWidth=Math.max(stats.maxRequestedWidth,w);stats.maxRequestedHeight=Math.max(stats.maxRequestedHeight,h);stats.maxRequestedPixels=Math.max(stats.maxRequestedPixels,w*h);const p=program(s.data,s.material,o);if(state.canvas.width<w){state.canvas.width=backingCapacity(w);accountCanvas(state.canvas,'sharedWebGLCanvas');stats.gpuResizes++;}if(state.canvas.height<h){state.canvas.height=backingCapacity(h);accountCanvas(state.canvas,'sharedWebGLCanvas');stats.gpuResizes++;}gl.viewport(0,0,w,h);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.enable(gl.SCISSOR_TEST);gl.scissor(0,0,w,h);gl.colorMask(true,true,true,true);applyBlend(s);gl.useProgram(p.p);
 uploadConstants(p,s,time,state);
 for(const {name,u,tx,unit}of p.textureBindings){if(!tx)throw Error('Missing original texture binding '+name);gl.activeTexture(gl.TEXTURE0+unit);const url=s.textureURLs[tx.name],fallback=s.data.properties[tx.name]?.texture||(tx.name.startsWith('unity_')?'black':'white'),t=texture(url,s.loadedImages[url],tx.dim,fallback);gl.bindTexture(t.target,t.tex);if(state.externalAccess||!u.samplerValid)gl.uniform1i(u.location,unit);const err=(validate?gl.getError():gl.NO_ERROR);if(err){invalidateTransfers(p);throw Error('Texture '+name+': '+err);}u.samplerValid=true;}
 const count=o.geometry?.count??4;for(const binding of p.attributeBindings)uploadAttribute(p,binding,o,count,state);
 const before=(validate?gl.getError():gl.NO_ERROR);if(before){invalidateTransfers(p);throw Error("Attributes "+before);}gl.drawArrays(o.geometry?gl.TRIANGLES:gl.TRIANGLE_STRIP,0,count);for(const attr of p.v.inputs){const location=p.attributes.get('v'+attr.register);if(location>=0)gl.disableVertexAttribArray(location);}const error=(validate?gl.getError():gl.NO_ERROR);if(error){invalidateTransfers(p);throw Error('WebGL original shader draw error '+error);}if(o.reuseBackingStore){if(s.canvas.width<w){s.canvas.width=backingCapacity(w);accountCanvas(s.canvas);stats.surfaceResizes++;}if(s.canvas.height<h){s.canvas.height=backingCapacity(h);accountCanvas(s.canvas);stats.surfaceResizes++;}s.canvas.style.width=s.canvas.width/w*(o.width||w)+'px';s.canvas.style.height=s.canvas.height/h*(o.height||h)+'px';}else{if(s.canvas.width!==w){s.canvas.width=w;accountCanvas(s.canvas);stats.surfaceResizes++;}if(s.canvas.height!==h){s.canvas.height=h;accountCanvas(s.canvas);stats.surfaceResizes++;}}s.ctx.clearRect(0,0,s.canvas.width,s.canvas.height);stats.surfaceCopyBytes=(stats.surfaceCopyBytes||0)+w*h*4;stats.surfaceCopyCalls=(stats.surfaceCopyCalls||0)+1;s.ctx.drawImage(state.canvas,0,state.canvas.height-h,w,h,0,0,w,h);/* Readback is diagnostic-only: repeated reads permanently force software Canvas2D on Chromium. drawImage already snapshots the source. */if(global.SDDYX_SHADER_FLUSH_AFTER_COPY===true)s.ctx.getImageData(0,0,1,1);stats.draws++;s.draws=(s.draws||0)+1;s.dirty=false;s.canvas.dataset.shaderReady='true';s.canvas.dataset.shaderProgram=p.key;s.contextLost=false;return true;
}
const frameBudget=global.SDDYXFrameBudget?.create();
function tick(time){frame=0;if(frameBudget&&!frameBudget.due(time)){if(surfaces.size)frame=requestAnimationFrame(tick);return;}for(const s of surfaces){if(s.destroyed||s.options.paused?.())continue;if(s.suspended&&s.visible())s.resume();if((s.dirty||s.animated)&&s.ready&&s.visible()){try{draw(s);}catch(error){s.fail(error);}}}if(surfaces.size)frame=requestAnimationFrame(tick);}
function releaseSurfaceTextures(s){if(gpu)for(const key of Object.values(s.textureURLs))if(key&&![...surfaces].some(other=>other!==s&&!other.suspended&&!other.destroyed&&Object.values(other.textureURLs).includes(key))){const texture=gpu.textures.get(key);if(texture){gpu.gl.deleteTexture(texture.tex);gpu.textures.delete(key);accountAllocation('gpuTextures',key,0);}}s.loadedImages={};releaseImageLeases(s.imageLeases);for(const leases of s.pendingImageLeases||[])releaseImageLeases(leases);s.pendingImageLeases?.clear();trimImages();}
function create(canvas,material,options={}){
 const s={id:++serial,canvas,ctx:canvas.getContext('2d'),material,options,loadedImages:{},textureURLs:{},imageLeases:new Set(),pendingImageLeases:new Set(),contextWaiters:new Set(),contextLost:!!gpu?.lost,ready:false,destroyed:false,suspended:!!options.defer,loading:false,loadEpoch:0,dirty:true,animated:false};
 s.visible=options.visible||(()=>canvas.isConnected&&!canvas.closest('[hidden]'));
 s.fail=error=>{s.error=error.message;s.ready=false;releaseSurfaceTextures(s);canvas.dataset.shaderError=error.message;errors.push({material:material.source,error:error.message});options.onError?.(error);};
 s.load=async()=>{stats.surfaceLoads=(stats.surfaceLoads||0)+1;const epoch=++s.loadEpoch,leases=new Set();let adopted=false;s.pendingImageLeases.add(leases);s.loading=true;try{
  const resident=global.SDDYX_RESIDENT?.ready,cachedData=resident?global.SDDYX_SHADER_PROGRAMS?.[nameOf(material)]:null;
  const data=cachedData||await shaderData(material,options.assetBase||'');if(!data)throw Error('Shader not recovered.');
  if(s.destroyed||s.suspended||epoch!==s.loadEpoch)return s;
  const urls=Object.fromEntries(Object.entries(material.textures||{}).map(([k,v])=>[k,v.url])),loaded={},sources={...options.textureSources};if(options.mainTexture)urls._MainTex=options.mainTexture;if(options.mainTextureSource)sources._MainTex=options.mainTextureSource;
  for(const [name,source]of Object.entries(sources)){const key=runtimeTexture(source).key;urls[name]=key;loaded[key]=source;}
  // Reserve every image before awaiting any decode; shared and in-flight
  // consumers cannot be evicted by another surface disappearing.
  const requested=[...new Set(Object.values(urls).filter(url=>url&&!loaded[url]))].map(url=>{const lease=acquireImage(url,options.assetBase||'');leases.add(lease);return{url,lease};});
  const cold=[];for(const {url,lease}of requested){const cached=resident&&imageRecords.get(url);if(cached?.state==='ready'&&cached.image?.complete&&cached.image.naturalWidth)loaded[url]=cached.image;else cold.push(lease.ready.then(image=>{loaded[url]=image;}));}
  if(cold.length)await Promise.all(cold);
  if(s.destroyed||s.suspended||epoch!==s.loadEpoch)return s;
  s.data=data;s.textureURLs=urls;s.loadedImages=loaded;s.imageLeases=leases;s.pendingImageLeases.delete(leases);adopted=true;s.animated=['vertex','fragment'].map(stage=>choose(data,material,stage,options.keywords)).some(p=>p.reflection.buffers.some(cb=>cb.params.some(p=>p.name==='_Time')))&&!options.static&&!options.manual;s.ready=true;s.residentLoadEvidence={epoch:s.loadEpoch,signature:JSON.stringify([material.guid,material.shaderGuid,material.keywords,Object.entries(material.textures||{}).map(([key,value])=>[key,value.guid,value.url,value.m_Texture])]),mainTexture:options.mainTexture,mainTextureSource:options.mainTextureSource};if(s.visible()&&!options.paused?.())draw(s,options.time);options.onReady?.(s);
 }catch(error){if(!s.destroyed&&!s.suspended&&epoch===s.loadEpoch)s.fail(error);}finally{s.pendingImageLeases.delete(leases);if(!adopted)releaseImageLeases(leases);if(epoch===s.loadEpoch)s.loading=false;}return s;};

 s.update=updates=>{Object.assign(options,updates);s.dirty=true;};s.render=time=>draw(s,time);
 s.release=()=>{if(s.canvas.width!==1)s.canvas.width=1;accountCanvas(s.canvas);if(s.canvas.height!==1)s.canvas.height=1;accountCanvas(s.canvas);s.dirty=true;};
 s.suspend=()=>{if(s.suspended||s.destroyed)return;if(global.SDDYX_RESIDENT?.ready&&s.ready&&!s.error)return;stats.surfaceSuspends=(stats.surfaceSuspends||0)+1;s.suspended=true;s.ready=false;s.loading=false;s.loadEpoch++;s.release();releaseSurfaceTextures(s);};
 s.resume=()=>{if(s.destroyed)return Promise.resolve(s);if(s.suspended||(s.error&&!s.loading)){stats.surfaceResumes=(stats.surfaceResumes||0)+1;s.suspended=false;s.error=null;delete canvas.dataset.shaderError;s.promise=s.load();}return s.promise;};
 s.warm=async({isCurrent=()=>true,render=true,time}={})=>{
  const check=()=>{if(s.destroyed||!isCurrent())throw resourceCancelled('Original shader warm request is no longer current.');};check();
  const pending=s.resume(),epoch=s.loadEpoch;await pending;check();await waitForContextRestore(s,isCurrent);check();
  if(epoch!==s.loadEpoch||s.suspended)throw resourceCancelled('Original shader surface changed while warming.');
  if(s.error)throw Error(s.error);if(!s.ready)throw Error('Original shader surface did not become ready.');
  if(render){check();try{if(!draw(s,time))throw Error('Original shader surface could not render.');}catch(error){s.fail(error);throw error;}}else if(s.contextLost){check();try{program(s.data,s.material,options);s.contextLost=false;}catch(error){s.fail(error);throw error;}}
  check();return{status:'ready',surface:s};
 };
 s.destroy=()=>{if(s.destroyed)return;s.destroyed=true;s.ready=false;s.loading=false;s.loadEpoch++;for(const wake of [...s.contextWaiters])wake();s.release();surfaces.delete(s);accountCanvas(s.canvas,'surfaceCanvas',true);releaseSurfaceTextures(s);if(options.geometry)options.geometry={count:0,attributes:{}};if(!surfaces.size&&frame){cancelAnimationFrame(frame);frame=0;}};
 if(s.suspended)s.release();accountCanvas(s.canvas);surfaces.add(s);s.promise=s.suspended?Promise.resolve(s):s.load();if(!frame)frame=requestAnimationFrame(tick);return s;
}
// Recovered UnityPlayer 2022.3.62f2 kernel 116B6A0. This is finite ZXY
// rotation followed by radial displacement, not omega-cross-position Euler.
// Float32 polynomial coefficients and round-to-even come from its SSE code.
// Native RSQRTPS/RCPPS estimates are hardware-dependent; sqrt/division below
// retain the recovered formula but are not claimed bit-identical to x86.
const pf=Math.fround,pa=(a,b)=>pf(a+b),ps=(a,b)=>pf(a-b),pm=(a,b)=>pf(a*b);
function particleSinCos(radians){
 const nearestEven=x=>{const a=Math.floor(x),d=x-a;return d===.5?(a%2===0?a:a+1):Math.round(x);};
 const turns=pm(radians,0.15915493667125702),poly=phase=>{const x=ps(.25,Math.abs(ps(phase,nearestEven(phase)))),x2=pm(x,x),x4=pm(x2,x2);return pm(pa(pa(pm(pa(pm(-76.56861877441406,x2),81.60182189941406),x4),pa(pm(-41.34165954589844,x2),6.283185005187988)),pm(pm(x4,x4),39.65703201293945)),x);};
 return{sin:poly(pa(turns,-.25)),cos:poly(turns)};
}
function particleOrbitalDelta(position,angular,offset,radial,dt,speed=1){
 const step=pm(dt,speed);if(!(dt>0)||Math.abs(speed)<=9.999999717180685e-10)return{x:0,y:0,z:0};
 const X=particleSinCos(pm(angular.x||0,step)),Y=particleSinCos(pm(angular.y||0,step)),Z=particleSinCos(pm(angular.z||0,step)),q={x:ps(position.x,offset.x||0),y:ps(position.y,offset.y||0),z:ps(position.z||0,offset.z||0)};
 const r00=pa(pm(pm(Y.sin,X.sin),Z.sin),pm(Y.cos,Z.cos)),r01=ps(pm(pm(Z.cos,X.sin),Y.sin),pm(Z.sin,Y.cos)),r02=pm(Y.sin,X.cos);
 const r10=pm(Z.sin,X.cos),r11=pm(X.cos,Z.cos),r12=-X.sin;
 const r20=pa(pm(-Y.sin,Z.cos),pm(pm(Y.cos,X.sin),Z.sin)),r21=pa(pm(pm(Y.cos,Z.cos),X.sin),pm(Z.sin,Y.sin)),r22=pm(X.cos,Y.cos);
 const rotated={x:pa(pa(pm(q.y,r01),pm(q.z,r02)),pm(q.x,r00)),y:pa(pa(pm(q.y,r11),pm(q.z,r12)),pm(q.x,r10)),z:pa(pa(pm(q.y,r21),pm(q.z,r22)),pm(q.x,r20))};
 const length2=pa(pa(pm(rotated.y,rotated.y),pm(rotated.z,rotated.z)),pm(rotated.x,rotated.x)),inverse=length2>1.0000000031710769e-30?pf(1/Math.sqrt(length2)):0,distance=pm(radial,step);
 return{x:ps(pa(rotated.x,pm(pm(rotated.x,inverse),distance)),q.x),y:ps(pa(rotated.y,pm(pm(rotated.y,inverse),distance)),q.y),z:ps(pa(rotated.z,pm(pm(rotated.z,inverse),distance)),q.z)};
}
// UnityPlayer D201D0 / D28D80 / D29DB0, scalar LimitVelocity branch.
// The native normalization uses a hardware RSQRT estimate followed by a Newton
// step. JavaScript supplies sqrt/div instead; that precision boundary is exposed.
function particleClampVelocity(base,module,limit,dampen,drag,diameter,bySize,bySpeed,dt){
 let v={x:pa(base.x,module.x||0),y:pa(base.y,module.y||0),z:pa(base.z||0,module.z||0)};
 const length2=()=>pa(pa(pm(v.y,v.y),pm(v.z,v.z)),pm(v.x,v.x));
 if(dampen>0){const sq=length2(),length=pf(Math.sqrt(sq)),weight=ps(1,pf(Math.pow(ps(1,dampen),pm(Math.abs(dt),30)))),target=limit<length?pa(length,pm(ps(limit,length),weight)):length,inv=sq>1.0000000031710769e-30?pf(1/Math.sqrt(sq)):0;v={x:pm(pm(v.x,inv),target),y:pm(pm(v.y,inv),target),z:pm(pm(v.z,inv),target)};}
 if(drag!==0){const sq=length2(),length=pf(Math.sqrt(sq)),radius=pm(diameter,.5),area=bySize?pm(pm(radius,3.1415927410125732),radius):1,loss=pm(pm(pm(area,drag),bySpeed?sq:1),dt),target=Math.max(0,ps(length,loss)),inv=length>1.0000000036274937e-15?pf(1/length):0;v={x:pm(pm(v.x,inv),target),y:pm(pm(v.y,inv),target),z:pm(pm(v.z,inv),target)};}
 return{x:ps(v.x,module.x||0),y:ps(v.y,module.y||0),z:ps(v.z,module.z||0)};
}
// BEGIN ORIGINAL UNITY PARTICLE NOISE
// Exact tables and scalar transcription: analysis/native/particle-noise.
const particleNoise=(()=>{
// Reviewed scalar source transcription of the authored High/combined-axis path.
// This does not load or execute UnityPlayer. See README.md for precision bounds.
const P=[151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180,151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180], flatG=[1.0,1.0,0.0,-1.0,1.0,0.0,1.0,-1.0,0.0,-1.0,-1.0,0.0,1.0,0.0,1.0,-1.0,0.0,1.0,1.0,0.0,-1.0,-1.0,0.0,-1.0,0.0,1.0,1.0,0.0,-1.0,1.0,0.0,1.0,-1.0,0.0,-1.0,-1.0,1.0,1.0,0.0,-1.0,1.0,0.0,0.0,-1.0,1.0,0.0,-1.0,-1.0];
const G=Array.from({length:16},(_,i)=>flatG.slice(i*3,i*3+3));
const F=Math.fround, add=(a,b)=>F(F(a)+F(b)), sub=(a,b)=>F(F(a)-F(b)), mul=(a,b)=>F(F(a)*F(b)), div=(a,b)=>F(F(a)/F(b));
const fade=t=>mul(mul(mul(t,t),t),add(mul(t,add(mul(t,6),-15)),10));
const fadeDerivative=t=>mul(mul(mul(t,30),t),add(mul(t,sub(t,2)),1));
function coefficients(a){
  // Corner order 000,100,010,110,001,101,011,111.
  const [a0,b,c,d,e,f,g,h]=a;
  return [a0,sub(b,a0),sub(c,a0),sub(e,a0),
    add(sub(sub(d,c),b),a0),add(sub(sub(f,e),b),a0),
    add(sub(sub(g,e),c),a0),sub(add(add(sub(add(sub(sub(h,g),f),e),d),c),b),a0)];
}
function interpolate(k,u,v,w){
  // Expanded trilinear polynomial used for each interpolated gradient channel.
  const a=add(mul(u,k[1]),k[0]);
  const b=add(mul(u,k[4]),k[2]);
  const c=add(mul(u,k[5]),k[3]);
  const d=add(mul(u,k[7]),k[6]);
  return add(mul(add(mul(v,d),c),w),add(mul(v,b),a));
}
function derivativeHigh(position,frequency=1){
  // 11129B0: only dx/dy are needed by the three curl permutations.
  const q=position.map(x=>mul(x,frequency)), cell=q.map(Math.floor), t=q.map((x,i)=>sub(x,cell[i]));
  const grads=[],dots=[];
  for(let z=0;z<2;z++)for(let y=0;y<2;y++)for(let x=0;x<2;x++){
    const actual=G[P[P[P[(cell[0]&255)+x]+(cell[1]&255)+y]+(cell[2]&255)+z]&15];
    grads.push(actual);
    dots.push(add(add(mul(sub(t[1],y),actual[1]),mul(sub(t[2],z),actual[2])),mul(sub(t[0],x),actual[0])));
  }
  const k=coefficients(dots),u=fade(t[0]),v=fade(t[1]),w=fade(t[2]);
  const gx=interpolate(coefficients(grads.map(g=>g[0])),u,v,w);
  const gy=interpolate(coefficients(grads.map(g=>g[1])),u,v,w);
  const nx=add(mul(add(mul(v,k[7]),k[5]),w),add(mul(v,k[4]),k[1]));
  const ny=add(mul(add(mul(u,k[7]),k[6]),w),add(mul(u,k[4]),k[2]));
  return [mul(add(gx,mul(nx,fadeDerivative(t[0]))),frequency),mul(add(gy,mul(ny,fadeDerivative(t[1]))),frequency)];
}
function derivativeOctaves(position,frequency,count=1,multiplier=.5,scale=2){
  let f=F(frequency),weight=F(1),weightSum=F(1),result=derivativeHigh(position,f);
  for(let i=1;i<count;i++){
    f=mul(f,scale);weight=mul(weight,multiplier);weightSum=add(weightSum,weight);
    const d=derivativeHigh(position,f);result=result.map((x,j)=>add(x,mul(d[j],weight)));
  }
  return result.map(x=>div(x,weightSum));
}
function systemOffset(seed){
  let x=seed>>>0,y=(Math.imul(x,0x6c078965)+1)>>>0,z=(Math.imul(y,0x6c078965)+1)>>>0,w=(Math.imul(z,0x6c078965)+1)>>>0;
  const result=[];
  for(let i=0;i<3;i++){
    const t=(x^(x<<11))>>>0;x=y;y=z;z=w;w=(w^(w>>>19)^t^(t>>>8))>>>0;
    result.push(mul(mul(w&0x7fffff,F(1/8388607)),100));
  }
  return result;
}
function curlHigh(position,{frequency=.5,octaves=1,octaveMultiplier=.5,octaveScale=2,seed=0,scroll=0,offset=systemOffset(seed)}={}){
  const f=F(Math.max(F(frequency),F(1e-6))),[x,y,z]=position.map((v,i)=>add(v,offset[i]));
  const d=p=>derivativeOctaves(p,f,octaves,octaveMultiplier,octaveScale);
  const a=d([z,y,add(x,scroll)]),xx=add(x,100);
  const b=d([xx,z,add(y,scroll)]),c=d([y,xx,add(z,scroll)]);
  return [sub(c[0],b[1]),sub(a[0],c[1]),sub(b[0],a[1])];
}
function velocity(position,options={}){
  const f=F(Math.max(F(options.frequency??.5),F(1e-6)));
  // Actual native uses RCPPS and two refinements. reciprocalOverride allows a
  // caller to supply that hardware result; exact division is our stated bound.
  const reciprocal=options.reciprocalOverride??div(1,f);
  const strength=mul(options.strength??1,options.damping===false?1:reciprocal);
  return curlHigh(position,options).map(x=>mul(mul(x,strength),options.positionAmount??1));
}
return {F,add,sub,mul,div,fade,fadeDerivative,derivativeHigh,derivativeOctaves,systemOffset,curlHigh,velocity,permutation:P,gradients:G};
})();
// END ORIGINAL UNITY PARTICLE NOISE
// BEGIN ORIGINAL UNITY PARTICLE STRETCH
// Release nonfreeform kernels and camera/scale caller; see native evidence.
const particleStretch=(()=>{
// Scalar transcription of release UnityPlayer 11DB6A0. Matrices are the exact
// caller arguments, column-major. Caller construction/pivot remain separate.
const f=Math.fround,add=(a,b)=>f(f(a)+f(b)),sub=(a,b)=>f(f(a)-f(b)),mul=(a,b)=>f(f(a)*f(b));
const MIN_LENGTH=f(1.0000000031710769e-30),RSQRT_BIAS=f(.9999998211860657),NEWTON_THREE=f(3.000000238418579),MAX_FLOAT=f(3.4028234663852886e38);
const identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
// Assembly uses x + (y + (z + translation)), not a left-associated JS dot.
function point(matrix,p){return [0,1,2].map(i=>add(mul(matrix[i],p[0]),add(mul(matrix[4+i],p[1]),add(mul(matrix[8+i],p[2]),matrix[12+i]))));}
function vector(matrix,p){return [0,1,2].map(i=>add(mul(matrix[i],p[0]),add(mul(matrix[4+i],p[1]),mul(matrix[8+i],p[2]))));}
function leaf({position,velocity,velocityMatrix=identity(),cameraVelocity=[0,0,0],positionMatrix=identity(),sizeY,lengthScale,velocityScale,halfWidth,inversePositionMatrix=identity(),widthBasis=identity(),pivot=[0,0,0],rich=false,rsqrt=x=>f(1/Math.sqrt(x)),rsqrtCorrection}){
 // 1F4A0 initializes the correction to 1 / RSQRTPS(1). The callback exposes
 // the hardware estimate boundary; the default is an arithmetic reference.
 if(rsqrtCorrection===undefined)rsqrtCorrection=f(1/rsqrt(1));
 const P=position.map(f),V=vector(velocityMatrix,velocity).map((v,i)=>sub(v,cameraVelocity[i]));
 const speed2=add(add(mul(V[1],V[1]),mul(V[2],V[2])),mul(V[0],V[0]));
 const inverseSpeed=speed2<=MIN_LENGTH?0:mul(rsqrt(speed2),rsqrtCorrection);
 let cameraPosition=point(positionMatrix,P);if(rich){const shift=mul(sizeY,mul(pivot[1],inverseSpeed));cameraPosition=cameraPosition.map((p,i)=>add(p,mul(V[i],shift)));}
 const factor=add(mul(mul(lengthScale,sizeY),inverseSpeed),velocityScale);let tail=cameraPosition.map((p,i)=>sub(p,mul(V[i],factor)));
 const xy=[sub(mul(cameraPosition[2],tail[1]),mul(cameraPosition[1],tail[2])),sub(mul(tail[2],cameraPosition[0]),mul(tail[0],cameraPosition[2]))];
 const cross2=add(mul(xy[1],xy[1]),mul(xy[0],xy[0]));
 let reciprocal=Math.min(mul(RSQRT_BIAS,rsqrt(cross2)),MAX_FLOAT);
 reciprocal=mul(sub(NEWTON_THREE,mul(mul(reciprocal,cross2),reciprocal)),mul(.5,reciprocal));
 const widthView=cross2>MIN_LENGTH?[mul(halfWidth,mul(reciprocal,xy[0])),mul(halfWidth,mul(reciprocal,xy[1])),0]:[0,0,0];
 let start=P;if(rich){const shift=widthView.map(v=>mul(v,pivot[0]));cameraPosition=cameraPosition.map((p,i)=>add(p,shift[i]));tail=tail.map((p,i)=>add(p,shift[i]));start=point(inversePositionMatrix,cameraPosition);}
 const width=vector(widthBasis,widthView),end=point(inversePositionMatrix,tail),length=end.map((v,i)=>sub(v,start[i]));
 const plus=(a,b)=>a.map((v,i)=>add(v,b[i])),minus=(a,b)=>a.map((v,i)=>sub(v,b[i]));
 return {vertices:[plus(start,width),plus(end,width),minus(end,width),minus(start,width)],width,length,cameraPosition,tail,velocity:V,inverseSpeed,factor};
}
const richLeaf=options=>leaf({...options,rich:true});
return {leaf,richLeaf,point,vector,identity,MIN_LENGTH,RSQRT_BIAS,NEWTON_THREE};
})();
const particleStretchCaller=(()=>{
// Algebraic reference for 11C5030/11C2360 and D53E30, not a runtime adapter.
const f=Math.fround,add=(a,b)=>f(f(a)+f(b)),mul=(a,b)=>f(f(a)*f(b)),div=(a,b)=>f(f(a)/f(b));
const EPS_SCALE=f(1e-5),EPS_SIZE=f(1e-6),identity=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function matrixProduct(a,b){const o=Array(16).fill(0);for(let col=0;col<4;col++)for(let row=0;row<4;row++)o[col*4+row]=add(mul(a[row],b[col*4]),add(mul(a[4+row],b[col*4+1]),add(mul(a[8+row],b[col*4+2]),mul(a[12+row],b[col*4+3]))));return o;}
function point(m,p){return [0,1,2].map(i=>add(mul(m[i],p[0]),add(mul(m[4+i],p[1]),add(mul(m[8+i],p[2]),m[12+i]))));}
function richSelector({pivot=[0,0,0],separateSize=false,spriteSheet=false}){const v=pivot.map(f);return add(add(mul(v[0],v[0]),mul(v[1],v[1])),mul(v[2],v[2]))>EPS_SCALE||!!separateSize||!!spriteSheet;}
function bounds({scaleX=1,minSize=0,maxSize=1,widthAtFar=2,farClip=1000,orthographic=true}){
 const sx=Math.max(f(scaleX),EPS_SCALE),lo=div(minSize,sx),hi=div(maxSize,sx);
 let a=orthographic?mul(widthAtFar,lo):div(mul(f(-widthAtFar),lo),farClip),b=orthographic?mul(widthAtFar,hi):div(mul(f(-widthAtFar),hi),farClip);
 if(!Number.isFinite(a))a=0;if(!Number.isFinite(b))b=-1;
 return orthographic?{minSlope:0,maxSlope:0,minConstant:a,maxConstant:b}:{minSlope:a,maxSlope:b,minConstant:0,maxConstant:0};
}
function halfSizes({sizeX,sizeY,agePercent=0,viewZ=0,coefficients}){const c=coefficients,lower=add(mul(c.minSlope,viewZ),c.minConstant),upper=add(mul(c.maxSlope,viewZ),c.maxConstant),major=Math.max(f(sizeX),f(sizeY),EPS_SIZE);let half=lower>=0?mul(.5,Math.max(major,lower)):0;if(upper>=0)half=Math.min(half,mul(.5,upper));const ratio=div(half,major);return {halfWidth:agePercent<100?mul(ratio,sizeX):0,halfHeight:agePercent<100?mul(ratio,sizeY):0,lower,upper,major,ratio};}
function build({view,inverseView,simulation=identity(),renderScale=[1,1,1],position,velocity,sizeX,sizeY,agePercent=0,pivot=[0,0,0],lengthScale,velocityScale=0,cameraVelocity=[0,0,0],cameraVelocityScale=0,recomputedView=view,coefficients}){
 const S=renderScale.map(f),vm=matrixProduct(view,simulation),P=point(simulation,position),viewZ=point(vm,position)[2],widthBasis=identity();
 for(let col=0;col<3;col++)for(let row=0;row<3;row++)widthBasis[col*4+row]=mul(S[row],inverseView[col*4+row]);
 const half=halfSizes({sizeX,sizeY,agePercent,viewZ,coefficients});
 return {position:P,velocity:velocity.map(f),velocityMatrix:vm,cameraVelocity:cameraVelocity.map(x=>mul(x,mul(cameraVelocityScale,S[0]))),positionMatrix:recomputedView,pivot:pivot.map((x,i)=>mul(mul(x,2),S[i])),sizeY:f(sizeY),lengthScale:mul(lengthScale,S[0]),velocityScale:f(velocityScale),halfWidth:half.halfWidth,inversePositionMatrix:inverseView,widthBasis,viewZ,half};
}
return {identity,matrixProduct,point,richSelector,bounds,halfSizes,build,EPS_SCALE,EPS_SIZE};
})();
// END ORIGINAL UNITY PARTICLE STRETCH
// BEGIN ORIGINAL UNITY PARTICLE EMISSION
const particleEmission=(()=>{
// Scalar reference of release UnityPlayer D6BF60, D09800, D09950,
// D09AD0 and D09EE0. No game binary is executed. Curve evaluation is injected:
// D08BB0's independent Hermite/SIMD precision boundary is not hidden here.
const f=Math.fround,add=(a,b)=>f(f(a)+f(b)),sub=(a,b)=>f(f(a)-f(b)),mul=(a,b)=>f(f(a)*f(b)),div=(a,b)=>f(f(a)/f(b));
const FLOAT_FACTOR=f(1.1920930376163597e-7),SMALL_AMOUNT=f(9.999999747378752e-5);
function seedWords(seed){const out=[seed>>>0];for(let i=1;i<4;i++)out.push((Math.imul(out[i-1],0x6c078965)+1)>>>0);return out;}
function create(seed){return{spacing:0,carry:0,burstAge:0,words:seedWords(seed),draws:0};}
function nextUint(state){const s=state.words,t=(s[0]^(s[0]<<11))>>>0,w=(s[3]^(s[3]>>>19)^t^(t>>>8))>>>0;s[0]=s[1];s[1]=s[2];s[2]=s[3];s[3]=w;state.draws++;return w;}
function nextFloat(state){return mul(nextUint(state)&0x7fffff,FLOAT_FACTOR);}
function count(state,burst,phase,evaluate){const probability=f(burst.probability??1);if(probability===0)return 0;if(probability<1&&!(nextFloat(state)<probability))return 0;const c=burst.countCurve||{scalar:burst.count??0,minMaxState:0},mode=c.minMaxState??0;if(mode===0)return Math.trunc(f(c.scalar));if(mode===3){const lo=Math.trunc(Math.min(f(c.minScalar),f(c.scalar))),hi=Math.trunc(Math.max(f(c.minScalar),f(c.scalar)))+1;return lo+(nextUint(state)>>>0)%((hi-lo)>>>0);}return Math.trunc(f(evaluate(c,phase,nextFloat(state))));}
function bursts(state,list,duration,previous,current,allowRepeats,evaluate){let total=0;const phase=div(current,duration);for(const burst of list||[]){const at=f(burst.time??0),cycles=burst.cycleCount??1,repeat=f(burst.repeatInterval??0);let hit=previous<=at&&current>at;if(!hit&&allowRepeats&&cycles!==1&&previous>at){const old=div(sub(previous,at),repeat);if(cycles===0||f(cycles-1)>old){const now=div(sub(current,at),repeat);hit=Math.trunc(now)>Math.trunc(old);}}if(hit){total+=count(state,burst,phase,evaluate);const fraction=div(sub(at,previous),sub(current,previous));state.burstAge=sub(1,Math.max(0,Math.min(1,fraction)));}}return total;}
function accumulate(state,amount,burstCount=0){amount=f(amount);const total=add(amount,state.carry),rateCount=Math.trunc(total);state.carry=sub(total,f(rateCount));state.spacing=amount<SMALL_AMOUNT?1:div(1,amount);return{count:rateCount+burstCount,rateCount,burstCount,spacing:state.spacing,carry:state.carry,burstAge:state.burstAge,amount};}
function interval(state,module,previous,current,duration,evaluate){previous=Math.max(0,f(previous));current=Math.max(0,f(current));duration=f(duration);const random=nextFloat(state),rate=at=>Math.max(0,f(evaluate(module.rateOverTime,div(at,duration),random)));let amount=0,burstCount=0;if(previous>current){amount=add(mul(current,rate(current)),mul(sub(duration,previous),rate(duration)));burstCount=bursts(state,module.m_Bursts,duration,0,current,true,evaluate);burstCount+=bursts(state,module.m_Bursts,duration,previous,add(duration,SMALL_AMOUNT),false,evaluate);}else{amount=mul(sub(current,previous),rate(current));burstCount=bursts(state,module.m_Bursts,duration,previous,current,true,evaluate);}return accumulate(state,amount,burstCount);}
return {seedWords,create,nextUint,nextFloat,count,bursts,accumulate,interval,FLOAT_FACTOR,SMALL_AMOUNT};
})();
const particleSubEmitter=(()=>{
// Selected native Birth (type0) / properties0 path, D3B2E0 and D57220.
// This is a numerical reference, not the runtime orchestration or shape PRNG.
const E=particleEmission,f=Math.fround,add=(a,b)=>f(f(a)+f(b)),sub=(a,b)=>f(f(a)-f(b)),mul=(a,b)=>f(f(a)*f(b)),div=(a,b)=>f(f(a)/f(b));
const DELAY_SEED_OFFSET=0x34bfa39a,PROBABILITY_SEED_OFFSET=0x5aa47f98;
function sample(seed,offset){return E.nextFloat(E.create((seed+offset)>>>0));}
function phase({agePercent,inverseLifetime,delta,startDelay=0,duration,looping=false}){
 const delayFraction=mul(startDelay,inverseLifetime),currentPhase=sub(mul(agePercent,.01),delayFraction),current=div(currentPhase,inverseLifetime),previousPhase=sub(mul(sub(agePercent,mul(mul(delta,100),inverseLifetime)),.01),delayFraction),previous=div(previousPhase,inverseLifetime);
 return {active:currentPhase>=0&&currentPhase<1&&(looping||current<f(duration)),previous,current,previousPhase,currentPhase,duration:looping?f(3.4028234663852886e38):f(duration)};
}
function birthInterval({parentSeed,parentEmissionSeed,carry=0,child,parent,probability=1,evaluate}){
 const delay=f(evaluate(child.startDelay,0,sample(parentSeed,DELAY_SEED_OFFSET))),times=phase({...parent,startDelay:delay,duration:child.lengthInSec,looping:!!child.looping});
 if(!times.active||probability===0||f(probability)<sample(parentSeed,PROBABILITY_SEED_OFFSET))return{...times,count:0,rateCount:0,burstCount:0,carry:f(carry)};
 // D3B2E0 reinitializes the local stream each parent/slot/interval; only carry
 // survives in the first two particle arrays. It does not persist this RNG.
 const state=E.create((parentSeed+parentEmissionSeed)>>>0);state.carry=f(carry);
 // All nine authored children have constant zero rateOverDistance; D09D30
 // returns before drawing or changing carry in this exact branch.
 const distance=child.EmissionModule.rateOverDistance;if(distance&&(distance.minMaxState!==0||distance.scalar!==0))throw Error('Reference scope requires authored constant-zero distance emission.');
 const counts=E.interval(state,child.EmissionModule,times.previous,times.current,times.duration,evaluate);
 return{...times,...counts,draws:state.draws,stream:state.words.slice()};
}
function newbornFractions({count,rateCount,carry,spacing,burstAge}){return Array.from({length:count},(_,i)=>i<rateCount?Math.max(0,Math.min(1,mul(add(i,carry),spacing))):f(burstAge));}
function initialInheritedVelocity(base,incoming,coefficient){return base.map((v,i)=>add(v,mul(incoming[i],coefficient)));}
function createParticleSeedLanes(seed){return Array.from({length:4},(_,lane)=>E.create((seed+lane*367)>>>0));}
function particleSeeds(lanes,count){const out=[];for(let i=0;i<count;i+=4){const four=lanes.map(E.nextUint);out.push(...four.slice(0,Math.min(4,count-i)));}return out;}
const exports={sample,phase,birthInterval,newbornFractions,initialInheritedVelocity,createParticleSeedLanes,particleSeeds,DELAY_SEED_OFFSET,PROBABILITY_SEED_OFFSET};
// D68FD0 birth matrix, selected nonzero incoming-velocity branch. The exact
// constant used to blend its secondary axis is (0,1,1), not Vector3.up.
const IDENTITY=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function transform(matrix,p,w=1){return[0,1,2].map(i=>add(add(add(mul(matrix[i],p[0]),mul(matrix[4+i],p[1])),mul(matrix[8+i],p[2])),mul(matrix[12+i],w)));}
function product(a,b){const out=Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)out[c*4+r]=add(add(add(mul(a[r],b[c*4]),mul(a[4+r],b[c*4+1])),mul(a[8+r],b[c*4+2])),mul(a[12+r],b[c*4+3]));return out;}
const length=v=>f(Math.sqrt(add(add(mul(v[0],v[0]),mul(v[1],v[1])),mul(v[2],v[2])))),cross=(a,b)=>[sub(mul(a[1],b[2]),mul(a[2],b[1])),sub(mul(a[2],b[0]),mul(a[0],b[2])),sub(mul(a[0],b[1]),mul(a[1],b[0]))];
function lookRotation(direction,secondary){const len=length(direction);if(len<f(1e-5))return IDENTITY();const z=direction.map(v=>div(v,len)),raw=cross(secondary,z),rx=length(raw);if(rx<f(1e-5))return IDENTITY();const x=raw.map(v=>div(v,rx)),y=cross(z,x),norm=add(add(mul(y[0],y[0]),mul(y[1],y[1])),mul(y[2],y[2]));if(Math.abs(sub(norm,1))>f(1e-6))return IDENTITY();return[x[0],x[1],x[2],0,y[0],y[1],y[2],0,z[0],z[1],z[2],0,0,0,0,1];}
function birthBasis({position,velocity,childMatrix=IDENTITY(),childInverse=IDENTITY(),childLocalRotation=IDENTITY(),renderScale=[1,1,1],worldSpace=false}){
 const speed=length(velocity);if(!(speed>f(1e-5)))throw Error('Selected authored SubEmitter basis requires nonzero parent velocity; native fallback-vector initialization remains separate.');
 const direction=velocity.map(v=>div(v,speed)),forward=transform(childMatrix,[0,0,1],0),secondary=transform(childMatrix,[0,1,1],0),weight=Math.abs(add(add(mul(direction[0],forward[0]),mul(direction[1],forward[1])),mul(direction[2],forward[2]))),blend=forward.map((v,i)=>add(mul(v,sub(1,weight)),mul(secondary[i],weight)));
 let matrix=product(lookRotation(direction,blend),childLocalRotation);for(let i=0;i<3;i++)matrix[12+i]=f(position[i]);let incoming=velocity.map(f);
 if(!worldSpace){matrix=product(childInverse,matrix);incoming=transform(childInverse,incoming,0);}
 for(let col=0;col<3;col++)for(let row=0;row<4;row++)matrix[col*4+row]=mul(matrix[col*4+row],renderScale[col]);
 return{matrix,incoming,direction,secondary:blend};
}
Object.assign(exports,{IDENTITY,transform,product,lookRotation,birthBasis});

return exports;
})();
// END ORIGINAL UNITY PARTICLE EMISSION
// BEGIN ORIGINAL UNITY PARTICLE MESH SELECTION
const particleMeshSelection=(()=>{
// Static scalar reference for the shipped triangle mesh selection paths.
// Source: UnityPlayer 11279B0,11379D0,113B730/113DB90,113BDD0/113E230.
// Deliberately excludes common shape jitter, transforms, and RNG initialization.
const f=Math.fround, add=(a,b)=>f(f(a)+f(b)), sub=(a,b)=>f(f(a)-f(b)), mul=(a,b)=>f(f(a)*f(b)), div=(a,b)=>f(f(a)/f(b));
const clamp=x=>Math.max(0,Math.min(1,x));
function roundEven(x){const a=Math.floor(x),r=x-a;return r<.5?a:r>.5?a+1:a+(a%2);}
function nextUint(state){
 const t=(state[0]^(state[0]<<11))>>>0,w=state[3]>>>0;
 const value=(w^(w>>>19)^t^(t>>>8))>>>0;
 state[0]=state[1]>>>0;state[1]=state[2]>>>0;state[2]=w;state[3]=value;return value;
}
function uintToUniform(value){return mul(value&0x7fffff,f(1/0x7fffff));}
function nextInt(state,min,max){if(max===min)return min;const value=nextUint(state);return max>min?min+value%(max-min):min-value%(min-max);}
function area(a,b,c){
 const u=b.map((v,i)=>sub(v,a[i])),v=c.map((n,i)=>sub(n,a[i]));
 const cross=[sub(mul(u[1],v[2]),mul(u[2],v[1])),sub(mul(u[2],v[0]),mul(u[0],v[2])),sub(mul(u[0],v[1]),mul(u[1],v[0]))];
 return mul(f(Math.sqrt(add(add(mul(cross[0],cross[0]),mul(cross[1],cross[1])),mul(cross[2],cross[2])))),.5);
}
function attribute(mesh,name,index,fallback){const a=mesh.attributes[name];return a?a.values.slice(index*a.dimension,(index+1)*a.dimension).map(f):fallback.slice();}
function build(mesh,materialIndex=null){
 const groups=mesh.subMeshes||[{topology:0,indices:mesh.indices,baseVertex:0}];
 const records=[];let total=0;
 groups.forEach((group,groupIndex)=>{
  if(materialIndex!==null&&groupIndex!==materialIndex)return;
  if(group.topology!==0||group.baseVertex)throw Error('Reference is limited to the authored triangle/baseVertex0 meshes');
  let groupTotal=0;
  for(let i=0;i<group.indices.length;i+=3){
   const indices=group.indices.slice(i,i+3),p=indices.map(j=>attribute(mesh,'POSITION',j,[0,0,0]));
   const weight=area(...p);records.push({weight,indices,materialIndex:groupIndex});groupTotal=add(groupTotal,weight);
  }
  total=add(total,groupTotal);
 });
 const count=Math.min(records.length,50),step=div(total,count),lookup=[];let index=0,cumulative=0;
 for(let j=0;j<count;j++){
  const target=mul(j,step);
  while(index<records.length){const end=add(cumulative,records[index].weight);if(end>target)break;cumulative=end;index++;}
  lookup.push({index,cumulative});
 }
 return {mesh,records,total,lookup};
}
function selectWeighted(cache,u){
 u=f(u);const target=mul(cache.total,u),n=cache.lookup.length;
 const entry=n?cache.lookup[Math.min(roundEven(mul(n,u)),n-1)]:{index:0,cumulative:0};
 let index=entry.index,cumulative=entry.cumulative;
 if(target>=cumulative){
  for(;index<cache.records.length;index++){
   const w=cache.records[index].weight;cumulative=add(cumulative,w);
   if(cumulative>=target)return {index,t:div(sub(target,sub(cumulative,w)),w)};
  }
 }else{
  for(index--;index>=0;index--){
   const w=cache.records[index].weight;cumulative=sub(cumulative,w);
   if(target>cumulative)return {index,t:add(div(sub(target,add(cumulative,w)),w),1)};
  }
 }
 return {index:0,t:0}; // Native output vectors were zero-initialized.
}
function edgeWeights(t){
 const s=mul(t,3),a=clamp(sub(s,1)),b=clamp(sub(s,2)),c=clamp(s);
 return [add(b,clamp(sub(1,s))),sub(c,a),sub(a,b)];
}
function byteColor(mesh,index){return attribute(mesh,'COLOR',index,[1,1,1,1]).map(v=>Math.trunc(add(mul(clamp(v),255),.5)));}
function multiplyByte(a,b){const t=a*b+128;return (t+(t>>>8))>>>8;}
function blend(cache,index,weights,normalOffset=0){
 const record=cache.records[index];if(!record)throw Error('Empty native mesh record set');
 const blendAttribute=(name,fallback)=>{
  const a=record.indices.map(i=>attribute(cache.mesh,name,i,fallback));
  // Native adds B*wb + A*wa, then C*wc (not generic lerp).
  return fallback.map((_,j)=>add(add(mul(a[1][j],weights[1]),mul(a[0][j],weights[0])),mul(a[2][j],weights[2])));
 };
 const normal=blendAttribute('NORMAL',[0,0,1]),position=blendAttribute('POSITION',[0,0,0]).map((v,j)=>add(v,mul(normal[j],normalOffset)));
 let color=[255,255,255,255];
 if(cache.mesh.attributes.COLOR){
  const colors=record.indices.map(i=>byteColor(cache.mesh,i)),w=weights.map(x=>Math.trunc(mul(x,255)));
  color=color.map((_,j)=>Math.min(255,multiplyByte(colors[2][j],w[2])+Math.min(255,multiplyByte(colors[1][j],w[1])+multiplyByte(colors[0][j],w[0]))));
 }
 return {record:index,indices:record.indices.slice(),weights,position,normal,color};
}
function edge(cache,u,normalOffset=0){const s=selectWeighted(cache,u);return {...blend(cache,s.index,edgeWeights(s.t),normalOffset),t:s.t,uniform:f(u)};}
function vertex(cache,triangleUint,cornerUint,normalOffset=0){
 const index=(triangleUint>>>0)%cache.records.length,corner=(cornerUint>>>0)%3,weights=[0,0,0];weights[corner]=1;
 return {...blend(cache,index,weights,normalOffset),corner};
}
function sample4(cache,mode,laneStates,normalOffset=0){
 if(laneStates.length!==4)throw Error('Native sampling is SIMD blocks of four independent lanes');
 if(mode===1)return laneStates.map(s=>edge(cache,uintToUniform(nextUint(s)),normalOffset));
 if(mode===0){const triangles=laneStates.map(s=>nextUint(s));return laneStates.map((s,i)=>vertex(cache,triangles[i],nextUint(s),normalOffset));}
 throw Error('Only authored Random vertices/edges are recovered here');
}
return {f,roundEven,nextUint,nextInt,uintToUniform,area,build,selectWeighted,edgeWeights,edge,vertex,sample4,multiplyByte};
})();
// END ORIGINAL UNITY PARTICLE MESH SELECTION
/* Source ParticleSystem modules. Curves/gradients are evaluated by animation.js.
 * Native Unity random-stream ordering and unimplemented modules are reported
 * explicitly by each emitter's limitations array; no substitute effect art. */
// Authored mesh common path: exact native polynomial/mixing; RSQRT estimate remains explicit.
const particleMeshCommon=(()=>{
const f=Math.fround,add=(a,b)=>f(f(a)+f(b)),sub=(a,b)=>f(f(a)-f(b)),mul=(a,b)=>f(f(a)*f(b));
const C=Object.freeze({tau:6.2831854820251465,invTau:.15915493667125702,
 quarter:.25,a:-41.34165954589844,b:6.283185005187988,c:-76.56861877441406,
 d:81.60182189941406,e:39.65703201293945,threshold:1.0000000031710769e-30,
 correction:.9999998211860657,newtonThree:3.000000238418579,maxFloat:3.4028234663852886e38,axisThreshold:.009999999776482582,
 invMask:1.1920930376163597e-7});
const IDENTITY=Object.freeze([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function roundEven(x){const n=Math.floor(x),r=x-n;return r<.5?n:r>.5?n+1:n+(n%2);}
function nextUint(state){const t=(state[0]^(state[0]<<11))>>>0,w=state[3]>>>0,n=(w^(w>>>19)^t^(t>>>8))>>>0;state[0]=state[1]>>>0;state[1]=state[2]>>>0;state[2]=w;state[3]=n;return n;}
function uniform(raw){return mul(raw&0x7fffff,C.invMask);}
function polynomial(t){
 const t2=mul(t,t),t4=mul(t2,t2),t8=mul(t4,t4);
 return mul(add(add(mul(add(mul(C.c,t2),C.d),t4),add(mul(C.a,t2),C.b)),mul(t8,C.e)),t);
}
function sphereFromUniforms(u,v){
 // Both conversions remain: their separate float32 roundings do not cancel.
 const angle=mul(u,C.tau),x=mul(angle,C.invTau),z=sub(mul(v,2),1);
 const radius=f(Math.sqrt(sub(1,mul(z,z))));
 const tx=sub(C.quarter,Math.abs(sub(x,roundEven(x))));
 const yphase=add(-.25,x),ty=sub(C.quarter,Math.abs(sub(yphase,roundEven(yphase))));
 return [mul(polynomial(tx),radius),mul(polynomial(ty),radius),z];
}
function sphereFromWords(a,b){return sphereFromUniforms(uniform(a),uniform(b));}
function sphere(state){return sphereFromWords(nextUint(state),nextUint(state));}
function sphere4(states){if(states.length!==4)throw Error('Four native RNG lanes required');const a=states.map(nextUint),b=states.map(nextUint);return a.map((v,i)=>sphereFromWords(v,b[i]));}
function lengthSquared(v){return add(mul(v[0],v[0]),add(mul(v[1],v[1]),mul(v[2],v[2])));}
function normalize(v,rsqrt=x=>f(1/Math.sqrt(x))){
 v=v.map(f);const sq=lengthSquared(v);
 if(!(sq>C.threshold))return [0,0,1];
 const r=Math.min(mul(rsqrt(sq),C.correction),C.maxFloat);
 const factor=mul(sub(C.newtonThree,mul(mul(r,sq),r)),mul(.5,r));
 return v.map(x=>mul(x,factor));
}
function linear(m,v){return [0,1,2].map(i=>add(mul(m[i],v[0]),add(mul(m[i+4],v[1]),mul(m[i+8],v[2]))));}
function affine(m,v){return [0,1,2].map(i=>add(mul(m[i],v[0]),add(mul(m[i+4],v[1]),add(mul(m[i+8],v[2]),m[i+12]))));}
function scaleMatrix(v){const m=IDENTITY.slice();m[0]=f(v.x??v[0]);m[5]=f(v.y??v[1]);m[10]=f(v.z??v[2]);return m;}
function rotationAxis(shapedNormal,positionOffset,rsqrt=x=>f(1/Math.sqrt(x))){
 const crossZ=v=>[sub(mul(0,v[2]),mul(1,v[1])),sub(mul(1,v[0]),mul(0,v[2])),sub(mul(0,v[1]),mul(v[0],0))];
 let v=crossZ(shapedNormal),sq=add(add(mul(v[2],v[2]),mul(v[1],v[1])),mul(v[0],v[0]));
 if(sq<=C.axisThreshold)v=crossZ(positionOffset);
 sq=add(add(mul(v[1],v[1]),mul(v[2],v[2])),mul(v[0],v[0]));
 if(sq<=C.axisThreshold)return [0,1,0];
 const r=Math.min(mul(rsqrt(sq),C.correction),C.maxFloat),k=mul(sub(C.newtonThree,mul(mul(sq,r),r)),mul(r,.5));
 return v.map(x=>mul(x,k));
}
function processSample(sample,options={},randomDirection=null,randomPosition=null){
 const {rsqrt}=options,shape=options.shapeMatrix||IDENTITY,emitter=options.emitterMatrix||IDENTITY;
 const a=f(options.randomDirectionAmount||0),b=f(options.sphericalDirectionAmount||0),c=f(options.randomPositionAmount||0);
 const originalPosition=sample.position.map(f);let normal=normalize(sample.normal,rsqrt),position=originalPosition.slice();
 if(a>0)normal=normal.map((n,i)=>add(mul(sub(randomDirection[i],n),a),n));
 const afterRandomDirection=normal.slice();
 if(b>0){const radial=normalize(originalPosition,rsqrt);normal=normal.map((n,i)=>add(mul(sub(radial[i],n),b),n));}
 const afterSphericalDirection=normal.slice();
 if(c>0)position=position.map((n,i)=>add(n,mul(randomPosition[i],c)));
 const jitteredPosition=position.slice();let shapedNormal=linear(shape,normal);
 // Native has this independent fallback before the later normalization.
 if(!(lengthSquared(shapedNormal)>C.threshold))shapedNormal=[0,0,1];
 const shapedPosition=affine(shape,position),positionOffset=linear(emitter,shapedPosition);
 const normalizedShapeDirection=normalize(shapedNormal,rsqrt),direction=linear(emitter,normalizedShapeDirection);
 const base=(options.basePosition||[0,0,0]).map(f);
 return {afterRandomDirection,afterSphericalDirection,jitteredPosition,shapedPosition,normalizedShapeDirection,
  positionOffset,position:positionOffset.map((v,i)=>add(base[i],v)),direction,
  axisOfRotation:options.axisOfRotationAllocated&&options.initializeAxis?rotationAxis(shapedNormal,positionOffset,rsqrt):null};
}
function common(sample,state,options={}){
 const a=f(options.randomDirectionAmount||0),c=f(options.randomPositionAmount||0);
 const dr=a>0?sphere(state):null,pr=c>0?sphere(state):null;
 return {...processSample(sample,options,dr,pr),randomDirection:dr,randomPosition:pr};
}
function common4(samples,states,options={}){
 if(samples.length!==4||states.length!==4)throw Error('Four native particle/RNG lanes required');
 const a=f(options.randomDirectionAmount||0),c=f(options.randomPositionAmount||0);
 const dr=a>0?sphere4(states):null,pr=c>0?sphere4(states):null;
 return samples.map((s,i)=>({...processSample(s,options,dr?.[i],pr?.[i]),randomDirection:dr?.[i]||null,randomPosition:pr?.[i]||null}));
}
// 1127370 initializes persistent four-lane ShapeModule streams. Fixed zero is
// a valid seed; automatic manager seed selection is a separate caller boundary.
function createShapeLanes(seed){return Array.from({length:4},(_,lane)=>{const words=[((seed>>>0)+367*lane)>>>0];for(let i=1;i<4;i++)words.push((Math.imul(words[i-1],0x6c078965)+1)>>>0);return words;});}
function sampleMeshBatches(cache,mode,states,count,options={}){
 const samples=[];for(let i=0;i<count;i+=4){const selected=particleMeshSelection.sample4(cache,mode,states,options.normalOffset||0),processed=common4(selected,states,options);for(let lane=0;lane<4;lane++)samples.push({...processed[lane],color:selected[lane].color});}return samples;
}

return {f,C,IDENTITY,roundEven,nextUint,uniform,polynomial,sphereFromUniforms,sphereFromWords,sphere,sphere4,normalize,lengthSquared,linear,affine,scaleMatrix,rotationAxis,processSample,common,common4,createShapeLanes,sampleMeshBatches};

})();
function createNonmeshShape(common) {
 const f=Math.fround,add=(a,b)=>f(f(a)+f(b)),sub=(a,b)=>f(f(a)-f(b)),mul=(a,b)=>f(f(a)*f(b));
 const DEG=f(0.01745329238474369),INNER_MIN=f(.001);
 function circleFromAngle(angle){
  const x=mul(angle,common.C.invTau),y=add(x,-.25);
  return [common.polynomial(sub(.25,Math.abs(sub(x,common.roundEven(x))))),
   common.polynomial(sub(.25,Math.abs(sub(y,common.roundEven(y)))))];
 }
 function sphereFromAngle(angle,zUniform){
  const c=circleFromAngle(angle),z=sub(mul(zUniform,2),1),r=f(Math.sqrt(sub(1,mul(z,z))));
  return [mul(c[0],r),mul(c[1],r),z];
 }
 function sphere(next){return common.sphereFromUniforms(next(),next());}
 function supported(shape){return !!shape?.enabled&&[0,4,5,8,10].includes(shape.type)&&!shape.alignToDirection&&
  (shape.type===5||((shape.arc?.mode??0)===0&&!(shape.arc?.spread||0)))&&!(shape.m_Texture?.fileID||0);}
 function primitive(shape,next,options={}){
  if(!supported(shape))throw Error('Outside the authored nonmesh Random0, no-texture, align-off scope');
  const type=shape.type,radius=f(shape.radius?.value??1),thickness=f(shape.radiusThickness??1),arc=mul(shape.arc?.value??360,DEG);
  let position,normal,coneDisk=null,commonRandomDirection=f(shape.randomDirectionAmount||0),draws=0;
  const u=()=>{draws++;return f(next());};
  if(type===5){position=[sub(u(),.5),sub(u(),.5),sub(u(),.5)];normal=[0,0,1];}
  else if(type===0){
   normal=sphereFromAngle(mul(u(),arc),u());
   const inner=f(Math.pow(sub(1,thickness),3)),w=u(),volume=add(mul(w,inner),sub(1,w));
   // Native uses its inlined log2/exp2 polynomial at112B204..112B2D3.
   // Math.cbrt has the same distribution; only that polynomial precision differs.
   const scale=mul(radius,f(Math.cbrt(volume)));position=normal.map(v=>mul(v,scale));
  }else if(type===10){
   const c=circleFromAngle(mul(u(),arc)),inner=mul(sub(1,thickness),sub(1,thickness)),w=u();
   const radial=f(Math.sqrt(add(mul(w,sub(1,inner)),inner))),scale=mul(radial,radius);
   position=[mul(c[0],scale),mul(c[1],scale),0];normal=[...c,0];
  }else{
   // Cone uses area thickness directly, unlike Circle's squared inner radius.
   const c=circleFromAngle(mul(u(),arc)),w=u(),inner=Math.max(INNER_MIN,sub(1,thickness));
   const radial=f(Math.sqrt(add(mul(w,inner),sub(1,w)))),q=c.map(v=>mul(v,radial));
   let directionDisk=q;
   if(type===4&&commonRandomDirection>0){
    //112E09F..112E1A4: 2-D disk mixing BEFORE the opening-angle mapping.
    const rc=circleFromAngle(mul(u(),common.C.tau)),rw=u(),rr=f(Math.sqrt(add(mul(rw,INNER_MIN),sub(1,rw))));
    directionDisk=q.map((v,i)=>add(mul(sub(mul(rc[i],rr),v),commonRandomDirection),v));
   }
   const [cosAngle,sinAngle]=circleFromAngle(mul(shape.angle||0,DEG));
   normal=[mul(directionDisk[0],sinAngle),mul(directionDisk[1],sinAngle),cosAngle];
   position=[mul(q[0],radius),mul(q[1],radius),0];coneDisk=q;
   if(type===4)commonRandomDirection=0;
   else{
    //11305BE..11306BA: uniform distance along normalized direction, not
    // a volume-weighted frustum, and length is not the axial z distance.
    const distance=mul(u(),shape.length||0),n=common.normalize(normal,options.rsqrt);
    position=position.map((v,i)=>add(v,mul(n[i],distance)));
   }
  }
  return {position,normal,commonRandomDirection,primitiveDraws:draws,coneDisk};
 }
 function sample(shape,next,options={}){
  const p=primitive(shape,next,options),opts={...options,randomDirectionAmount:p.commonRandomDirection,
   sphericalDirectionAmount:shape.sphericalDirectionAmount||0,randomPositionAmount:shape.randomPositionAmount||0};
  const dr=opts.randomDirectionAmount>0?sphere(next):null,pr=opts.randomPositionAmount>0?sphere(next):null;
  return {...common.processSample(p,opts,dr,pr),primitive:p,randomDirection:dr,randomPosition:pr,
   draws:p.primitiveDraws+(dr?2:0)+(pr?2:0)};
 }
 function sample4(shape,lanes,options={}){
  if(lanes.length!==4)throw Error('Four independent Shape lanes required');
  // Independent lane states make this scalar organization equivalent to the
  // native word-major block: finish all four lanes before the next block.
  return lanes.map(state=>sample(shape,()=>common.uniform(common.nextUint(state)),options));
 }
 return {DEG,INNER_MIN,circleFromAngle,sphereFromAngle,supported,primitive,sample,sample4};
}
const particleNonmeshShape=createNonmeshShape(particleMeshCommon);
const particleShapeStream=(()=>{
// Static reference for UnityPlayer 1127370, D68210, D73EE0 and D69B00.
// These helpers do not execute the supplied binary or choose automatic entropy.
const A=0x6c078965, LANE_STRIDE=367;
function initialize(seed){
  return Array.from({length:4},(_,lane)=>{
    const s=[((seed>>>0)+lane*LANE_STRIDE)>>>0];
    for(let word=1;word<4;word++)s.push((Math.imul(s[word-1],A)+1)>>>0);
    return s;
  });
}
function nextUint(s){
  const t=(s[0]^(s[0]<<11))>>>0,w=s[3]>>>0;
  const n=(w^(w>>>19)^t^(t>>>8))>>>0;
  s[0]=s[1]>>>0;s[1]=s[2]>>>0;s[2]=w;s[3]=n;return n;
}
function packWordMajor(lanes){return Array.from({length:16},(_,i)=>lanes[i%4][Math.floor(i/4)]>>>0);}
function ceil4(n){return Math.ceil(n/4)*4;}
function plan(oldCount,requested,maxParticles){
  for(const n of [oldCount,requested,maxParticles])if(!Number.isSafeInteger(n)||n<0)throw Error('Nonnegative integer counts required');
  // All thirteen selected records have ringBufferMode0. Deliberately do not
  // generalize the distinct native ring-buffer overflow paths here.
  const count=Math.min(requested,Math.max(0,maxParticles-oldCount));
  const start=ceil4(oldCount),paddedCount=count?ceil4(count):0;
  return {oldCount,requested,maxParticles,count,start,paddedCount,end:start+paddedCount,batches:paddedCount/4};
}
function runBatches(lanes,birthPlan,selectAndProcess4){
  const outputs=[];
  for(let batch=0;batch<birthPlan.batches;batch++){
    // Native call order is selector -> common direction sphere -> common
    // position sphere -> color, then the next four-lane block.
    const four=selectAndProcess4(lanes,batch);
    if(!Array.isArray(four)||four.length!==4)throw Error('Exactly four lane outputs required');
    outputs.push(...four);
  }
  return outputs;
}
function finish(birthPlan,paddedOutputs,isDead=p=>p.normalizedAge>100){
  if(paddedOutputs.length!==birthPlan.paddedCount)throw Error('Retain every initialized padding lane until cull');
  const outputs=paddedOutputs.slice(),swaps=[],deaths=[];
  let end=outputs.length,count=birthPlan.count,index=0;
  // D74570 scans padded range after newborn partial simulation. D571D0
  // copies every particle property from last to index and decrements end.
  while(index<end){
    if(isDead(outputs[index])){
      deaths.push({output:outputs[index],notify:count>0});
      swaps.push({to:index,from:end-1});outputs[index]=outputs[end-1];end--;
      if(count>0)count--;
    }else index++;
  }
  const moved=Math.min(birthPlan.start-birthPlan.oldCount,count);
  const kept=outputs.slice(0,count);
  // D69B00 fills the old alignment hole with the LAST moved live births.
  const appended=kept.slice(count-moved).concat(kept.slice(0,count-moved));
  return {count,end:birthPlan.start+end,finalCount:birthPlan.oldCount+count,
    appended,survivors:outputs.slice(0,end),moved,swaps,deaths};
}
return {A,LANE_STRIDE,initialize,nextUint,packWordMajor,ceil4,plan,runBatches,finish};

})();
const particleInitial=(()=>{
// Static UnityPlayer D3ADF0/D371C0/D745E0/D394D0 reference. No binary execution.
const f=Math.fround,A=0x6c078965,UNIT=f(1/8388607),EPS=f(0.00001);
const SPEED_OFFSET=2527743459,ROTATION_SIGN_OFFSET=4281053604,GRAVITY_OFFSET=3803694019;
function seedState(seed){const s=[seed>>>0];for(let i=1;i<4;i++)s.push((Math.imul(s[i-1],A)+1)>>>0);return s;}
function initialize(seed){return Array.from({length:4},(_,l)=>seedState(((seed>>>0)+367*l)>>>0));}
function nextUint(s){const t=(s[0]^(s[0]<<11))>>>0,w=s[3]>>>0,n=(w^(w>>>19)^t^(t>>>8))>>>0;s[0]=s[1];s[1]=s[2];s[2]=w;s[3]=n;return n;}
function unit(word){return f((word&0x7fffff)*UNIT);}
function derivedUnit(seed,offset){return unit(nextUint(seedState(((seed>>>0)+(offset>>>0))>>>0)));}
function curve(c,u){const mode=Number(c.minMaxState),hi=f(c.scalar);if(mode===0)return hi;if(mode!==3)throw Error('Only source-used Constant0/TwoConstants3 are covered');const lo=f(c.minScalar);return f(f(f(hi-lo)*f(u))+lo);}
function packByte(value){return Math.trunc(f(f(Math.min(1,Math.max(0,f(value)))*255)+f(.5)));}
function colorBytes(c,u){const mode=Number(c.minMaxState);if(mode!==0&&mode!==2)throw Error('Only source-used Color0/TwoColors2 are covered');return ['r','g','b','a'].map(k=>{const hi=f(c.maxColor[k]);return packByte(mode===0?hi:f(f(f(hi-f(c.minColor[k]))*f(u))+f(c.minColor[k])));});}
function multiplyByte(a,b){const q=a*b+128;return(q+(q>>>8))>>>8;}
function reciprocalLifetime(life,rcp){
  // D379BF hardware RCPPS followed by TWO Newton refinements. Caller may supply
  // the actual hardware estimate; default IEEE division is an explicit boundary.
  const x=f(Math.max(EPS,f(life))),r=f(rcp?rcp(x):1/x);
  let n=f(f(2-f(x*r))*r);n=f(n*f(2-f(x*n)));return Number.isNaN(n)?r:n;
}
function sample4(lanes,im,options={}){
  if(!Array.isArray(lanes)||lanes.length!==4)throw Error('Four persistent Initial lanes required');
  const draw=()=>lanes.map(nextUint),floats=()=>draw().map(unit),seed=draw();
  const life=floats(),sx=floats(),sy=im.size3D?floats():sx,sz=im.size3D?floats():sx;
  const rz=floats(),rx=im.rotation3D?floats():null,ry=im.rotation3D?floats():null,col=floats();
  const sm=options.sizeMultiplier||[1,1,1],ro=options.rotationOffset||[0,0,0],cm=options.colorMultiplier||[255,255,255,255],lm=f(options.lifetimeMultiplier??1);
  return seed.map((particleSeed,lane)=>{
    const sign=f(im.randomizeRotationDirection??0)<derivedUnit(particleSeed,ROTATION_SIGN_OFFSET)?1:-1;
    const rawLifetime=f(curve(im.startLifetime,life[lane])*lm),lifetime=f(Math.max(EPS,rawLifetime));
    const x=curve(im.startSize,sx[lane]),size=[x,im.size3D?curve(im.startSizeY,sy[lane]):x,im.size3D?curve(im.startSizeZ,sz[lane]):x].map((v,i)=>f(Math.max(0,v)*f(sm[i])));
    const rotation=[im.rotation3D?f(f(curve(im.startRotationX,rx[lane])+f(ro[0]))*sign):0,im.rotation3D?f(f(curve(im.startRotationY,ry[lane])+f(ro[1]))*sign):0,f(f(curve(im.startRotation,rz[lane])+f(ro[2]))*sign)];
    return {particleSeed,rawLifetime,lifetime,inverseLifetime:reciprocalLifetime(rawLifetime,options.rcp),size,rotation,color:colorBytes(im.startColor,col[lane]).map((v,i)=>multiplyByte(v,cm[i])),rotationSign:sign};
  });
}
function startSpeed(c,particleSeed){return curve(c,derivedUnit(particleSeed,SPEED_OFFSET));}
function gravityModifier(c,particleSeed){return curve(c,Number(c.minMaxState)>=2?derivedUnit(particleSeed,GRAVITY_OFFSET):0);}
return {initialize,nextUint,unit,derivedUnit,curve,packByte,colorBytes,multiplyByte,reciprocalLifetime,sample4,startSpeed,gravityModifier,UNIT,EPS,SPEED_OFFSET,ROTATION_SIGN_OFFSET,GRAVITY_OFFSET};

})();
function particleEmitter(system,renderer,options={}){
 const A=global.SDDYXAnimation;if(!A?.particleCurve)throw Error('Original particle curve evaluator is not loaded.');
 const curve=(c,t=0,r=.5)=>c?A.particleCurve(c,t,r):0,gradient=(g,t=0,r=.5)=>Object.fromEntries(['r','g','b','a'].map((key,i)=>[key,g?A.particleMinMaxGradient(g,t,r)[i]:1]));
 const f=system,initial=f.InitialModule,emission=f.EmissionModule,shape=f.ShapeModule,particles=[];let mesh=options.mesh||null,shapeMesh=options.shapeMesh||null,pendingTime=0;const needed=[];if(renderer.m_RenderMode===4&&!mesh)needed.push(particleMesh(renderer.m_Mesh,options.assetBase||'').then(value=>mesh=value));if(shape?.enabled&&shape.type===6&&!shapeMesh)needed.push(particleMesh(shape.m_Mesh,options.assetBase||'').then(value=>shapeMesh=value));const ready=Promise.all(needed);
 const nativeInitial=['startLifetime','startSize','startRotation','startSpeed'].every(k=>[0,3].includes(initial[k]?.minMaxState??0))&&(!initial.size3D||['startSizeY','startSizeZ'].every(k=>[0,3].includes(initial[k]?.minMaxState??0)))&&(!initial.rotation3D||['startRotationX','startRotationY'].every(k=>[0,3].includes(initial[k]?.minMaxState??0)))&&[0,2].includes(initial.startColor?.minMaxState??0);
 const initialFields={...initial};for(const k of ['startLifetime','startSize','startSizeY','startSizeZ','startRotation','startRotationX','startRotationY','startSpeed','gravityModifier'])initialFields[k]||={minMaxState:0,scalar:0};initialFields.startColor||={minMaxState:0,maxColor:{r:1,g:1,b:1,a:1}};
 const nativeNonmeshShape=particleNonmeshShape.supported(shape);
 const nativeMeshCommon=!!shape?.enabled&&shape.type===6&&(f.moveWithTransform??0)===0&&!shape.alignToDirection&&[0,1].includes(shape.placementMode??0)&&!(f.ringBufferMode||0);
 const nativeFamily=!!options.nativeSpace,subEmitters=[];let systemSeed=f.randomSeed>>>0,subParent=null,emissionState=particleEmission.create(systemSeed),seedLanes=particleSubEmitter.createParticleSeedLanes(systemSeed),shapeLanes=particleShapeStream.initialize(systemSeed),initialLanes=particleInitial.initialize(systemSeed);
 let time=0,emissionTime=0,remainingDelay=Math.fround(curve(f.startDelay)),serial=0,seed=(f.randomSeed>>>0)||0x6d2b79f5,emitting=f.playOnAwake!==0,playing=emitting,restartOnPlay=!emitting;
 const randomUint=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0;},random=()=>randomUint()/4294967296;
 const norm=v=>{const length=Math.hypot(v.x,v.y,v.z)||1;return{x:v.x/length,y:v.y/length,z:v.z/length};};
 const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z}),mul=(a,s)=>({x:a.x*s,y:a.y*s,z:a.z*s});
 const unit=()=>{const z=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-z*z);return{x:r*Math.cos(a),y:r*Math.sin(a),z};};
 const point=(m,v,w=1)=>({x:m.m11*(v.x||0)+m.m21*(v.y||0)+m.m31*(v.z||0)+m.m41*w,y:m.m12*(v.x||0)+m.m22*(v.y||0)+m.m32*(v.z||0)+m.m42*w,z:m.m13*(v.x||0)+m.m23*(v.y||0)+m.m33*(v.z||0)+m.m43*w});
 function trs(pos,rot,scale){return new DOMMatrix().translate(pos?.x||0,pos?.y||0,pos?.z||0).rotate(0,rot?.y||0,0).rotate(rot?.x||0,0,0).rotate(0,0,rot?.z||0).scale(scale?.x??1,scale?.y??1,scale?.z??1);}
 const shapeMatrix=trs(shape?.m_Position,shape?.m_Rotation,shape?.m_Scale),limit=initial.maxNumParticles||1000;
 const limitations=['Authored Initial/Shape distribution and stream order are recovered; later-module random/hash correlations and hardware float precision remain explicit boundaries. Automatic entropy uses browser randomness at proven native reset points.'];if(!nativeInitial)limitations.push('InitialModule mode is outside all582 recovered authored Constant/TwoConstants and Color/TwoColors forms.');
 const noise=f.NoiseModule,constant=(c,value)=>!c||(c.minMaxState===0&&c.scalar===value),noiseAuthored=!!noise?.enabled&&noise.quality===2&&!noise.separateAxes&&!noise.remapEnabled&&constant(noise.scrollSpeed,0)&&constant(noise.rotationAmount,0)&&constant(noise.sizeAmount,0)&&[0,1].includes(noise.strength?.minMaxState??0)&&[0,1].includes(noise.positionAmount?.minMaxState??0),noiseLocal=noiseAuthored&&(f.moveWithTransform??0)===0,nativeWorld=f.moveWithTransform===1&&!!options.worldBridge,noiseWorld=noiseAuthored&&nativeWorld,noiseOptions=noiseAuthored?{frequency:noise.frequency,octaves:noise.octaves,octaveMultiplier:noise.octaveMultiplier,octaveScale:noise.octaveScale,damping:!!noise.damping,offset:particleNoise.systemOffset(systemSeed)}:null;
 if(noise?.enabled){if(!noiseAuthored)limitations.push('Noise configuration is outside the recovered authored High/combined/zero-scroll path.');else if(!noiseLocal&&!noiseWorld)limitations.push('World/custom-space Noise awaits the native simulation-to-canvas scale bridge.');else limitations.push('Authored High/combined Noise formulas and tables are recovered; native reciprocal precision, automatic seed assignment and curve timing remain explicit boundaries.');}
 if(f.moveWithTransform===2)limitations.push('Custom simulation-space transform is not yet applied.');
 for(const name of ['InheritVelocityModule','SubModule'])if(f[name]?.enabled&&!nativeFamily)limitations.push(name+' requires its original native-space reference graph.');
 const trails=global.SDDYXParticleTrails,trail=f.TrailModule,trailClock={clock:0},speedModule=f.SizeBySpeedModule;
 const sourceQiliu=!!trails&&nativeFamily&&renderer.m_RenderMode===5&&trails.supportedSizeBySpeed(speedModule,initial)&&
  trails.unsupportedTrailForms({trail,initial,renderer,simulationSpace:f.moveWithTransform??0}).length===0&&
  constant(f.VelocityModule?.speedModifier,1)&&constant(trail.lifetime,1)&&!!trail.sizeAffectsWidth&&!!trail.sizeAffectsLifetime&&!trail.inheritParticleColor;
 if(trail?.enabled&&!sourceQiliu)limitations.push('Trail authored form/caller bridge is outside the recovered qiliu02 path.');
 if(speedModule?.enabled&&!sourceQiliu)limitations.push('SizeBySpeed authored form/caller bridge is outside the recovered qiliu02 path.');
 if(sourceQiliu)limitations.push('Trail/SizeBySpeed native formulas are recovered; existing curve/gradient callbacks, seed initialization, lifetime reciprocal and RCP/RSQRT/pow library precision remain explicit boundaries.');
 const arr=v=>[v.x,v.y,v.z],packed=g=>['r','g','b','a'].map(k=>Math.round(Math.max(0,Math.min(1,g[k]))*255));
 function trailSeconds(p,size){return trails.trailLifetime(curve(trail.lifetime,Math.fround(Math.fround(p.age/p.lifetime*100)*Math.fround(.01)),trails.trailRandom(p.particleSeed,trails.RANDOM_OFFSETS.lifetime)),size,p.inverseLifetime);}
 function updateTrail(p){trails.updateParticleTrail(p.trail,{clock:trailClock.clock,position:arr(p.position),worldMatrix:options.nativeSpace().state.matrix,lifetime:trailSeconds(p,p.currentSizeAxes),agePercent:Math.fround(p.age/p.lifetime*100),particleSeed:p.particleSeed,ratio:trail.ratio,minVertexDistance:trail.minVertexDistance});}
 function refreshNativeSize(p){if(!sourceQiliu)return;const t=p.age/p.lifetime,size=f.SizeModule,current=[Math.fround(Math.fround(p.size)*Math.fround(size?.enabled?curve(size.curve,t,p.r[3]):1))];p.currentSizeAxes=trails.evaluateSizeBySpeed({initialSize:[p.size],currentSize:current,priorSizeProduced:!!size?.enabled,baseVelocity:arr(p.velocity),moduleVelocity:arr(p.sizeModuleVelocity||{x:0,y:0,z:0}),range:[speedModule.range.x,speedModule.range.y]}).size;}
 function releaseParticle(p){if(p.trail){trails.clearParticleTrail(p.trail);delete p.trail;}}
 function releaseParticles(){for(const p of particles)releaseParticle(p);}
 if(f.ClampVelocityModule?.enabled){if(f.ClampVelocityModule.separateAxis)limitations.push('Separate-axis ClampVelocity is not implemented.');else if((f.moveWithTransform??0)!==0&&!nativeWorld)limitations.push('World/custom-space ClampVelocity awaits the native simulation-to-canvas scale bridge.');else limitations.push('Scalar ClampVelocity formulas are recovered; native powf/RSQRT precision and per-module random streams are not bit-identical.');}
 if(renderer.m_RenderMode!==4&&renderer.m_RenderAlignment!==undefined&&![0,2].includes(renderer.m_RenderAlignment))limitations.push('Non-view particle alignment '+renderer.m_RenderAlignment+' is not implemented.');
 if(f.VelocityModule?.enabled&&['orbitalX','orbitalY','orbitalZ','radial'].some(k=>[0,.5,1].some(t=>curve(f.VelocityModule[k],t)!==0)))limitations.push('Orbital/radial formulas are recovered; native hardware reciprocal estimates and per-module random streams are not bit-identical.');
 if(renderer.m_RenderMode===0&&renderer.m_RenderAlignment!==2&&((initial.rotation3D&&['startRotationX','startRotationY'].some(k=>[0,.5,1].some(t=>curve(initial[k],t)!==0)))||(f.RotationModule?.enabled&&f.RotationModule.separateAxes&&['x','y'].some(k=>[0,.5,1].some(t=>curve(f.RotationModule[k],t)!==0)))))limitations.push('View-billboard three-axis rotation is not implemented.');
 if(renderer.m_UseCustomVertexStreams)limitations.push('Custom particle vertex streams are not yet decoded.');
 if(renderer.m_RenderMode===1&&!options.stretchContext)limitations.push('Stretched-billboard native camera/simulation context is not assigned.');
 if(![0,1,4,5].includes(renderer.m_RenderMode))limitations.push('Particle render mode '+renderer.m_RenderMode+' is not implemented.');
 if(shape?.enabled&&![0,1,2,3,4,5,6,7,8,9,10,11,12,18].includes(shape.type))limitations.push('Emission shape '+shape.type+' is not implemented.');
 if(shape?.enabled&&shape.type===6)limitations.push(nativeMeshCommon?'Fixed-seed four-lane mesh selection/common streams, lane padding and newborn compaction are recovered; hardware RSQRT precision remains separate; InitialModule sampler is recovered for all authored forms.':'Mesh shape caller is outside the recovered Local0 Random vertex/edge, align-off, ringBuffer0 scope.');
 if(curve(emission?.rateOverDistance))limitations.push('Distance-based emission is not implemented.');
 let shapeCache=null;
 function sampleMesh(){if(!shapeCache)shapeCache=particleMeshSelection.build(shapeMesh,shape.m_UseMeshMaterialIndex?shape.m_MeshMaterialIndex:null);const sample=shape.placementMode===1?particleMeshSelection.edge(shapeCache,particleMeshSelection.uintToUniform(randomUint()),shape.m_MeshNormalOffset||0):particleMeshSelection.vertex(shapeCache,randomUint(),randomUint(),shape.m_MeshNormalOffset||0);return{p:{x:sample.position[0],y:sample.position[1],z:sample.position[2]},d:{x:sample.normal[0],y:sample.normal[1],z:sample.normal[2]},color:shape.m_UseMeshColors?sample.color.map(v=>v/255):null};}
 function nativeShapeMatrix(){const scale=options.shapeScale?.();return scale?new DOMMatrix().scale(scale.x,scale.y,scale.z).multiply(shapeMatrix):shapeMatrix;}
 function sampleShape(){if(nativeNonmeshShape){const sampled=particleNonmeshShape.sample(shape,random,{shapeMatrix:Array.from(nativeShapeMatrix().toFloat64Array()),emitterMatrix:particleMeshCommon.IDENTITY});return{p:{x:sampled.position[0],y:sampled.position[1],z:sampled.position[2]},d:{x:sampled.direction[0],y:sampled.direction[1],z:sampled.direction[2]}};}let p={x:0,y:0,z:0},d={x:0,y:0,z:1},color=null;if(!shape?.enabled)return{p,d};const type=shape.type,r=shape.radius?.value??1,thickness=shape.radiusThickness??1,theta=type===6?0:random()*(shape.arc?.value??360)*Math.PI/180,radial=type===6?0:Math.sqrt((1-thickness)**2+random()*(1-(1-thickness)**2));
  if([0,1,2,3].includes(type)){d=unit();if(type===2||type===3)d.z=Math.abs(d.z);p=mul(d,r*Math.cbrt((1-thickness)**3+random()*(1-(1-thickness)**3)));}
  else if(type===6){const sample=sampleMesh();p=sample.p;d=sample.d;color=sample.color;}
  else if(type===5||type===18){p={x:random()-.5,y:random()-.5,z:type===18?0:random()-.5};}
  else if([4,7,8,9].includes(type)){const angle=(shape.angle||0)*Math.PI/180,tan=Math.tan(angle),length=shape.length||0,z=type>=8?(Math.abs(tan)>1e-9?(Math.cbrt(r**3+random()*((r+length*tan)**3-r**3))-r)/tan:random()*length):0,rr=(r+z*tan)*radial;p={x:Math.cos(theta)*rr,y:Math.sin(theta)*rr,z};d=norm({x:Math.cos(theta)*radial*tan,y:Math.sin(theta)*radial*tan,z:1});}
  else if(type===10||type===11){p={x:Math.cos(theta)*r*radial,y:Math.sin(theta)*r*radial,z:0};d=norm(p);}
  else if(type===12)p={x:(random()*2-1)*r,y:0,z:0};
  if(shape.randomPositionAmount)p=add(p,mul(unit(),Math.cbrt(random())*shape.randomPositionAmount));
  if(shape.sphericalDirectionAmount){const a=shape.sphericalDirectionAmount;d=norm(add(mul(d,1-a),mul(norm(p),a)));}
  if(shape.randomDirectionAmount){const a=shape.randomDirectionAmount;d=norm(add(mul(d,1-a),mul(unit(),a)));}
  p=point(shapeMatrix,p);d=point(shapeMatrix,d,0);const nativeScale=options.shapeScale?.();if(nativeScale){for(const k of ['x','y','z']){p[k]*=nativeScale[k];d[k]*=nativeScale[k];}}return{p,d:norm(d),color};
 }
 function spawn(birth={}){if(!birth.temporary&&particles.length>=limit)return;const props=birth.initial;const phase=birth.phase??(time%(f.lengthInSec||1))/(f.lengthInSec||1),r=Array.from({length:16},random),sample=birth.sample||sampleShape(),matrix=options.matrix?.()||new DOMMatrix(),root=options.rootMatrix?.()||new DOMMatrix(),local=(f.moveWithTransform??0)===0,bridge=nativeWorld?options.worldBridge():null,native=options.nativeSpace?.(),world=native?new DOMMatrix(native.state.matrix):bridge?new DOMMatrix(bridge.emitterMatrix):root.multiply(matrix),lifetime=props?.lifetime??Math.max(.00001,curve(initial.startLifetime,phase,r[0])),speed=props?particleInitial.startSpeed(initialFields.startSpeed,props.particleSeed):curve(initial.startSpeed,phase,r[1]);
  const p={id:serial++,particleSeed:props?.particleSeed??birth.seed??0,subCarry:[],age:0,lifetime,r,local,nativeLocal:!!native&&local,nativeWorld:!!bridge,position:local?sample.p:bridge?bridge.spawnPosition(sample.p):point(world,sample.p),velocity:local?mul(sample.d,speed):bridge?bridge.spawnVelocity(sample.d,speed):point(world,mul(sample.d,speed),0),matrix,world,root,color:props?Object.fromEntries(['r','g','b','a'].map((k,i)=>[k,props.color[i]/255])):gradient(initial.startColor,phase,r[2]),size:props?.size[0]??curve(initial.startSize,phase,r[3]),sizeY:initial.size3D?(props?.size[1]??curve(initial.startSizeY,phase,r[4])):null,sizeZ:initial.size3D?(props?.size[2]??curve(initial.startSizeZ,phase,r[4])):null,rotationX:props?.rotation[0]??(initial.rotation3D?curve(initial.startRotationX,phase,r[5]):0),rotationY:props?.rotation[1]??(initial.rotation3D?curve(initial.startRotationY,phase,r[5]):0),rotation:props?.rotation[2]??curve(initial.startRotation,phase,r[5]),flipX:r[6]<(renderer.m_Flip?.x||0),flipY:r[7]<(renderer.m_Flip?.y||0),startFrame:curve(f.UVModule?.startFrame,phase,r[8])};if(!props&&r[9]<(initial.randomizeRotationDirection||0))p.rotation=-p.rotation;if(sample.axisOfRotation)p.axisOfRotation=sample.axisOfRotation.slice();if(sample.color){for(const [i,key]of ['r','g','b','a'].entries())p.color[key]=sample.packedColor?particleMeshSelection.multiplyByte(props?props.color[i]:particleInitial.packByte(p.color[key]),sample.color[i])/255:p.color[key]*sample.color[i];if(p.color.a===0)p.age=p.lifetime*1.01;}if(birth.matrix){p.position=point(birth.matrix,sample.p);p.velocity=point(birth.matrix,mul(sample.d,speed),0);if(f.InheritVelocityModule?.enabled&&f.InheritVelocityModule.m_Mode===0){const incoming=birth.incoming||[0,0,0],coefficient=curve(f.InheritVelocityModule.m_Curve,phase,r[10]),values=particleSubEmitter.initialInheritedVelocity([p.velocity.x,p.velocity.y,p.velocity.z],incoming,coefficient);p.velocity={x:values[0],y:values[1],z:values[2]};}}if(sourceQiliu){p.inverseLifetime=props?.inverseLifetime??Math.fround(1/p.lifetime);p.currentSizeAxes=[Math.fround(p.size)];}
  if(!birth.temporary)particles.push(p);
  // D74261 records the newborn before partial-age position integration. Clock delta0.
  if(sourceQiliu){p.trail=trails.createTrailState();updateTrail(p);}
  if(birth.ageDelta>0){const alive=advanceParticle(p,birth.ageDelta,true,!birth.padding);if(sourceQiliu&&!alive&&!birth.temporary)particles.splice(particles.indexOf(p),1);}else refreshNativeSize(p);
  return p;
 }
 // Local0 D739C0 supplies identity emitter basis; shape TRS is applied once.
 // Selection/common operate per four lanes, including unused padding. D74570
 // culls the padded temporary range only AFTER partial newborn simulation.
 function spawnBirthBatch(count,makeBirth){
  const plan=particleShapeStream.plan(particles.length,count,limit);if(!plan.count)return;
  const initialValues=[];if(nativeInitial)for(let i=0;i<plan.paddedCount;i+=4)initialValues.push(...particleInitial.sample4(initialLanes,initialFields));
  let outputs=null;if(nativeMeshCommon){if(!shapeCache)shapeCache=particleMeshSelection.build(shapeMesh,shape.m_UseMeshMaterialIndex?shape.m_MeshMaterialIndex:null);outputs=particleMeshCommon.sampleMeshBatches(shapeCache,shape.placementMode??0,shapeLanes,plan.count,{shapeMatrix:Array.from(shapeMatrix.toFloat64Array()),emitterMatrix:particleMeshCommon.IDENTITY,normalOffset:shape.m_MeshNormalOffset||0,randomDirectionAmount:shape.randomDirectionAmount,sphericalDirectionAmount:shape.sphericalDirectionAmount,randomPositionAmount:shape.randomPositionAmount,axisOfRotationAllocated:renderer.m_RenderMode===4,initializeAxis:true});}else if(nativeNonmeshShape){outputs=[];const opts={shapeMatrix:Array.from(nativeShapeMatrix().toFloat64Array()),emitterMatrix:particleMeshCommon.IDENTITY,axisOfRotationAllocated:renderer.m_RenderMode===4,initializeAxis:true};for(let i=0;i<plan.paddedCount;i+=4)outputs.push(...particleNonmeshShape.sample4(shape,shapeLanes,opts));}
  const temporary=Array.from({length:plan.paddedCount},(_,i)=>{const sample=outputs?.[i];return spawn({...makeBirth(i),initial:initialValues[i],temporary:true,padding:i>=plan.count,sample:sample?{p:{x:sample.position[0],y:sample.position[1],z:sample.position[2]},d:{x:sample.direction[0],y:sample.direction[1],z:sample.direction[2]},color:shape.m_UseMeshColors?sample.color:null,packedColor:true,axisOfRotation:sample.axisOfRotation}:undefined});});
  const result=particleShapeStream.finish(plan,temporary,p=>p.age/p.lifetime*100>100),kept=new Set(result.appended);for(const p of temporary)if(!kept.has(p))releaseParticle(p);particles.push(...result.appended);
 }
 function advanceParticle(p,dt,newborn=false,allowSub=true){const oldAge=p.age;if(!newborn){p.age+=dt;if(nativeMeshCommon?p.age>p.lifetime:p.age>=p.lifetime){releaseParticle(p);return false;}}const t=(newborn?oldAge:p.age)/p.lifetime,velocity=f.VelocityModule,force=f.ForceModule;let v={x:0,y:0,z:0},orbitalVelocity={x:0,y:0,z:0};
   if(velocity?.enabled){v={x:curve(velocity.x,t,p.r[10]),y:curve(velocity.y,t,p.r[11]),z:curve(velocity.z,t,p.r[12])};if(!p.local&&!velocity.inWorldSpace)v=point(p.world,v,0);if(p.local&&velocity.inWorldSpace)v=point(p.world.inverse(),v,0);}
   if(force?.enabled){let a={x:curve(force.x,t,p.r[10]),y:curve(force.y,t,p.r[11]),z:curve(force.z,t,p.r[12])};if(!p.local&&!force.inWorldSpace)a=point(p.world,a,0);p.velocity=add(p.velocity,mul(a,dt));}
   const gravity=nativeInitial&&[0,3].includes(initialFields.gravityModifier.minMaxState)?particleInitial.gravityModifier(initialFields.gravityModifier,p.particleSeed):curve(initial.gravityModifier,t,p.r[13]);if(gravity){const a={x:0,y:-9.81*gravity,z:0};p.velocity=add(p.velocity,mul(p.local||p.nativeWorld?a:point(p.root,a,0),dt));}
   // The authored orbitalZ4 contribution belongs in +C0/+E0/+100 before Noise
   // and ClampVelocity (116BEC9–116BF95, D75000). speedModifier is proven1 here.
   if(sourceQiliu&&velocity?.enabled){const angular={x:curve(velocity.orbitalX,t,p.r[10]),y:curve(velocity.orbitalY,t,p.r[11]),z:curve(velocity.orbitalZ,t,p.r[12])},offset={x:curve(velocity.orbitalOffsetX,t,p.r[10]),y:curve(velocity.orbitalOffsetY,t,p.r[11]),z:curve(velocity.orbitalOffsetZ,t,p.r[12])},delta=particleOrbitalDelta(p.position,angular,offset,curve(velocity.radial,t,p.r[13]),dt,1),inverseStep=dt>1e-9?trails.reciprocal(dt):0;v={x:pa(v.x,pm(delta.x,inverseStep)),y:pa(v.y,pm(delta.y,inverseStep)),z:pa(v.z,pm(delta.z,inverseStep))};}
   // D75000 evaluates Noise before ClampVelocity; D682F0 integrates the sum
   // once. The source kernel adds velocity, not an extra displacement.
   if(noiseLocal||noiseWorld&&p.nativeWorld){const n=particleNoise.velocity([p.position.x,p.position.y,p.position.z],{...noiseOptions,strength:curve(noise.strength,t,p.r[10]),positionAmount:curve(noise.positionAmount,t,p.r[11])});v={x:pa(v.x,n[0]),y:pa(v.y,n[1]),z:pa(v.z,n[2])};}
   const clamp=f.ClampVelocityModule;if(clamp?.enabled&&!clamp.separateAxis&&(p.local||p.nativeWorld)){const size=f.SizeModule,axes={x:size?.enabled?curve(size.curve,t,p.r[3]):1,y:size?.enabled?curve(size.separateAxes?size.y:size.curve,t,p.r[4]):1,z:size?.enabled?curve(size.separateAxes?size.z:size.curve,t,p.r[4]):1},diameter=initial.size3D?Math.max(p.size*axes.x,p.sizeY*axes.y,p.sizeZ*axes.z):p.size*axes.x;p.velocity=particleClampVelocity(p.velocity,v,curve(clamp.magnitude,t,p.r[13]),clamp.dampen||0,curve(clamp.drag,t,p.r[14]),diameter,clamp.multiplyDragByParticleSize,clamp.multiplyDragByParticleVelocity,dt);}
   const speed=velocity?.enabled?curve(velocity.speedModifier,t,p.r[14]):1;
   if(velocity?.enabled&&!sourceQiliu){const angular={x:curve(velocity.orbitalX,t,p.r[10]),y:curve(velocity.orbitalY,t,p.r[11]),z:curve(velocity.orbitalZ,t,p.r[12])},radial=curve(velocity.radial,t,p.r[13]);if(angular.x||angular.y||angular.z||radial){const offset={x:curve(velocity.orbitalOffsetX,t,p.r[10]),y:curve(velocity.orbitalOffsetY,t,p.r[11]),z:curve(velocity.orbitalOffsetZ,t,p.r[12])},world=p.nativeWorld?new DOMMatrix(options.worldBridge().emitterMatrix):(options.rootMatrix?.()||new DOMMatrix()).multiply(options.matrix?.()||new DOMMatrix()),localPosition=p.local?p.position:point(world.inverse(),p.position),delta=particleOrbitalDelta(localPosition,angular,offset,radial,dt,speed);const orbit=p.local?delta:point(world,delta,0);orbitalVelocity=mul(orbit,1/dt);p.position=add(p.position,orbit);}}
   if(sourceQiliu)p.sizeModuleVelocity={...v};
   if(newborn)p.age=oldAge+dt;
   const linearVelocity=mul(add(p.velocity,v),speed);p.renderVelocity=add(linearVelocity,orbitalVelocity);p.position=add(p.position,mul(linearVelocity,dt));if(f.RotationModule?.enabled){p.rotation+=curve(f.RotationModule.curve,t,p.r[15])*dt;if(f.RotationModule.separateAxes){p.rotationX+=curve(f.RotationModule.x,t,p.r[15])*dt;p.rotationY+=curve(f.RotationModule.y,t,p.r[15])*dt;}}
   // D7576D consumes previous scalar size AFTER position integration; D757E7
   // then recomputes SizeModule → SizeBySpeed for the next update and this draw.
   if(sourceQiliu){if(!newborn)updateTrail(p);refreshNativeSize(p);}
   if(allowSub&&subEmitters.length){const info=options.nativeSpace(),worldPosition=point(new DOMMatrix(info.state.matrix),p.position),worldVelocity=point(new DOMMatrix(info.state.matrix),p.renderVelocity||p.velocity,0);for(const [index,link]of subEmitters.entries())link.emitter.receiveParent(p,dt,{worldPosition,worldVelocity,parentEmissionSeed:emissionState.words[0],index,entry:link.entry});}if(newborn&&p.age>p.lifetime){releaseParticle(p);return false;}return true;
 }
 function step(dt){dt=Math.fround(dt);if(sourceQiliu)trails.advanceTrailClock(trailClock,dt);time=Math.fround(time+dt);const duration=Math.fround(f.lengthInSec||1),previous=emissionTime,activeDelta=Math.max(0,Math.fround(dt-remainingDelay));remainingDelay=Math.max(0,Math.fround(remainingDelay-dt));if(activeDelta>0){emissionTime=Math.fround(emissionTime+activeDelta);if(f.looping){while(emissionTime>=duration)emissionTime=Math.fround(emissionTime-duration);}else emissionTime=Math.min(emissionTime,duration);}const phase=Math.fround(emissionTime/duration);

  for(let i=particles.length-1;i>=0;i--)if(!advanceParticle(particles[i],dt))particles.splice(i,1);
  // D76FBB marks a non-looping system stopped before this step's emission
  // when its clamped source phase reaches duration; the final interval is skipped.
  if(!subParent&&!f.looping&&emissionTime>=duration)emitting=false;
  if(!subParent&&emitting&&emission?.enabled&&activeDelta>0){const counts=particleEmission.interval(emissionState,emission,previous,emissionTime,duration,curve),count=Math.min(counts.count,Math.max(0,limit-particles.length)),lanes=nativeInitial||nativeMeshCommon?Math.ceil(count/4)*4:count,fractions=particleSubEmitter.newbornFractions({...counts,count:lanes}),seeds=nativeInitial?[]:particleSubEmitter.particleSeeds(seedLanes,lanes),birth=i=>({seed:seeds[i],phase,ageDelta:Math.fround(activeDelta*fractions[i])});if(nativeInitial||nativeMeshCommon)spawnBirthBatch(count,birth);else for(let i=0;i<count;i++)spawn(birth(i));}

 }
 function update(dt){if(!playing)return;if((renderer.m_RenderMode===4&&!mesh)||(shape?.enabled&&shape.type===6&&!shapeMesh)){pendingTime+=Math.max(0,dt);return;}dt=(Math.max(0,dt)+pendingTime)*(f.simulationSpeed??1);pendingTime=0;const maximum=options.maximumParticleDeltaTime??.03,count=Math.max(1,Math.ceil(dt/maximum)),part=dt/count;for(let i=0;i<count&&dt>0;i++)step(part);if(!subParent&&!particles.length&&(!emitting||(!f.looping&&time>=curve(f.startDelay)+(f.lengthInSec||1)))){playing=false;restartOnPlay=true;}}
 // D6BF60 refreshes automatic seeds only at native reset boundaries. Browser
 // entropy replaces the unavailable Unity manager entropy; tests inject words.
 function resetStreams(refreshSeed=true){if(refreshSeed&&f.autoRandomSeed){if(options.entropy)systemSeed=options.entropy()>>>0;else if(global.crypto?.getRandomValues){const word=new Uint32Array(1);global.crypto.getRandomValues(word);systemSeed=word[0];}else systemSeed=Math.floor(Math.random()*4294967296)>>>0;}else if(!f.autoRandomSeed)systemSeed=f.randomSeed>>>0;seed=systemSeed||0x6d2b79f5;emissionState=particleEmission.create(systemSeed);seedLanes=particleSubEmitter.createParticleSeedLanes(systemSeed);shapeLanes=particleShapeStream.initialize(systemSeed);initialLanes=particleInitial.initialize(systemSeed);if(noiseOptions)noiseOptions.offset=particleNoise.systemOffset(systemSeed);for(const link of subEmitters)link.emitter.resetLinkedStreams(refreshSeed);}
 function resetLinkedStreams(refreshSeed=true){time=0;emissionTime=0;remainingDelay=Math.fround(curve(f.startDelay));pendingTime=0;resetStreams(refreshSeed);}
 function reset(opts={}){releaseParticles();time=0;emissionTime=0;remainingDelay=Math.fround(curve(f.startDelay));serial=0;pendingTime=0;particles.length=0;resetStreams(opts.refreshSeed!==false);emitting=f.playOnAwake!==0;playing=emitting;restartOnPlay=!emitting;if(opts.prewarm!==false&&emitting&&f.prewarm&&f.looping)update(f.lengthInSec||0);}
 function play(){if(playing&&emitting&&!restartOnPlay)return;if(restartOnPlay){time=0;emissionTime=0;remainingDelay=Math.fround(curve(f.startDelay));pendingTime=0;if(!particles.length&&!subParent){serial=0;resetStreams();}}emitting=playing=true;restartOnPlay=false;if(!particles.length&&f.prewarm&&f.looping)update(f.lengthInSec||0);}
 function stop(clear=true){emitting=false;restartOnPlay=true;pendingTime=0;if(clear){releaseParticles();particles.length=0;playing=false;}else if(!particles.length)playing=false;}
 function linkSubEmitter(emitter,entry){if(entry.type!==0||entry.properties!==0)throw Error('Only the authored Birth/properties0 SubEmitter branch is recovered.');subEmitters.push({emitter,entry});emitter.setSubParent(api);}
 function setSubParent(parent){subParent=parent;playing=true;}
 function receiveParent(parent,dt,{worldPosition,worldVelocity,parentEmissionSeed,index,entry}){if(!nativeFamily)return;const counts=particleSubEmitter.birthInterval({parentSeed:parent.particleSeed,parentEmissionSeed,carry:parent.subCarry[index]||0,child:f,parent:{agePercent:Math.fround(parent.age/parent.lifetime*100),inverseLifetime:Math.fround(1/parent.lifetime),delta:dt},probability:entry.emitProbability,evaluate:curve});parent.subCarry[index]=counts.carry;if(!counts.count)return;counts.count=Math.min(counts.count,Math.max(0,limit-particles.length));if(!counts.count)return;const info=options.nativeSpace(),matrix=new DOMMatrix(info.state.matrix),basis=particleSubEmitter.birthBasis({position:[worldPosition.x,worldPosition.y,worldPosition.z],velocity:[worldVelocity.x,worldVelocity.y,worldVelocity.z],childMatrix:info.state.matrix,childInverse:Array.from(matrix.inverse().toFloat64Array()),childLocalRotation:info.localRotation,renderScale:Object.values(info.state.renderScale),worldSpace:f.moveWithTransform===1}),laneCount=nativeInitial||nativeMeshCommon?Math.ceil(counts.count/4)*4:counts.count,seeds=nativeInitial?[]:particleSubEmitter.particleSeeds(seedLanes,laneCount),fractions=particleSubEmitter.newbornFractions({...counts,count:laneCount}),birth=i=>({seed:seeds[i],phase:counts.current/(f.lengthInSec||1),matrix:new DOMMatrix(basis.matrix),incoming:basis.incoming,ageDelta:dt*fractions[i]});playing=true;if(nativeInitial||nativeMeshCommon)spawnBirthBatch(counts.count,birth);else for(let i=0;i<counts.count;i++)spawn(birth(i));}
 const billboardMesh={indices:[0,1,2,2,1,3],attributes:{POSITION:{dimension:3,values:[-.5,-.5,0,.5,-.5,0,-.5,.5,0,.5,.5,0]},NORMAL:{dimension:3,values:[0,0,-1,0,0,-1,0,0,-1,0,0,-1]},TEXCOORD0:{dimension:2,values:[0,0,1,0,0,1,1,1]}}};
 function geometry(clip){if(sourceQiliu)return trailGeometry(clip);if(renderer.m_RenderMode===1&&options.stretchContext)return stretchGeometry(clip);if(![0,4].includes(renderer.m_RenderMode))return{count:0,attributes:{},bounds:{x:0,y:0,width:1,height:1}};if(renderer.m_RenderMode===4||renderer.m_RenderAlignment===2)return meshGeometry(clip,renderer.m_RenderMode===4?mesh:billboardMesh);const root=options.rootMatrix?.()||new DOMMatrix(),inverse=root.inverse(),matrix=options.matrix?.()||new DOMMatrix(),localMatrix=root.multiply(matrix),vertices=[],colors=[],uvs=[];let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;const coefficients={m11:inverse.m11,m21:inverse.m21,m31:inverse.m31,m41:inverse.m41,m12:inverse.m12,m22:inverse.m22,m32:inverse.m32,m42:inverse.m42,m13:inverse.m13,m23:inverse.m23,m33:inverse.m33,m43:inverse.m43};const sorted=particles.slice();if(renderer.m_SortMode===2)sorted.sort((a,b)=>a.age-b.age);if(renderer.m_SortMode===3)sorted.sort((a,b)=>b.age-a.age);
  for(const p of sorted){const t=p.age/p.lifetime,bridge=p.nativeLocal?options.nativePresentation():p.nativeWorld?options.worldBridge():null,position=p.nativeLocal?bridge.project(point(new DOMMatrix(options.nativeSpace().state.matrix),p.position)):p.local?point(localMatrix,p.position):bridge?bridge.project(p.position):p.position,scale=p.local?localMatrix:p.world,sx=bridge?Math.abs(bridge.state.renderScale.x)*bridge.projection.pixelsPerUnit:Math.hypot(scale.m11,scale.m12,scale.m13),sy=bridge?Math.abs(bridge.state.renderScale.y)*bridge.projection.pixelsPerUnit:Math.hypot(scale.m21,scale.m22,scale.m23),size=f.SizeModule?.enabled?curve(f.SizeModule.curve,t,p.r[3]):1,sizeY=f.SizeModule?.enabled&&f.SizeModule.separateAxes?curve(f.SizeModule.y,t,p.r[4]):size,w=p.size*sx*size,h=(p.sizeY??p.size)*sy*sizeY,g=f.ColorModule?.enabled?gradient(f.ColorModule.gradient,t,p.r[2]):{r:1,g:1,b:1,a:1},color=['r','g','b','a'].map(k=>Math.max(0,Math.min(1,p.color[k]*g[k]))),co=Math.cos(p.rotation),si=Math.sin(p.rotation),pivot=renderer.m_Pivot||{},texture=f.UVModule;let u0=0,v0=0,u1=1,v1=1;
   if(texture?.enabled&&texture.mode===0){const cols=texture.tilesX||1,rows=texture.tilesY||1,total=texture.animationType===1?cols:cols*rows;let phase=texture.timeMode===2?p.age*(texture.fps||30)/total:curve(texture.frameOverTime,t,p.r[8])*(texture.cycles||1);const frame=Math.floor(((phase+p.startFrame/total)%1+1)%1*total),row=texture.animationType===1?(texture.rowMode===1?Math.floor(p.r[9]*rows):texture.rowIndex||0):Math.floor(frame/cols),col=frame%cols;u0=col/cols;u1=(col+1)/cols;v0=1-(row+1)/rows;v1=1-row/rows;}
   if(p.flipX)[u0,u1]=[u1,u0];if(p.flipY)[v0,v1]=[v1,v0];for(const [x,y,u,v]of [[-.5,-.5,u0,v0],[.5,-.5,u1,v0],[-.5,.5,u0,v1],[-.5,.5,u0,v1],[.5,-.5,u1,v0],[.5,.5,u1,v1]]){const xx=(x-(pivot.x||0))*w,yy=(y-(pivot.y||0))*h,projected=point(coefficients,{x:position.x+co*xx-si*yy,y:position.y-si*xx-co*yy,z:position.z}),X=projected.x,Y=projected.y;vertices.push(X,Y,0,1);uvs.push(u,v,0,0);colors.push(...color);minX=Math.min(minX,X);maxX=Math.max(maxX,X);minY=Math.min(minY,Y);maxY=Math.max(maxY,Y);}
  }
  // The framebuffer only contains the visible viewport. Crop the projection
  // rectangle, never the particle mesh/UVs, before allocating its backing store.
  // Recentring vertices below preserves exact object-space and texture samples.
  if(clip){minX=Math.max(minX,clip.minX);minY=Math.max(minY,clip.minY);maxX=Math.min(maxX,clip.maxX);maxY=Math.min(maxY,clip.maxY);}
  if(!vertices.length||minX>=maxX||minY>=maxY)return{count:0,attributes:{POSITION_0:[],COLOR_0:[],TEXCOORD_0:[]},bounds:{x:0,y:0,width:1,height:1}};minX=Math.floor(minX);minY=Math.floor(minY);maxX=Math.ceil(maxX);maxY=Math.ceil(maxY);const width=Math.max(1,maxX-minX),height=Math.max(1,maxY-minY),cx=minX+width/2,cy=minY+height/2;for(let i=0;i<vertices.length;i+=4){vertices[i]-=cx;vertices[i+1]-=cy;}return{count:vertices.length/4,attributes:{POSITION_0:vertices,COLOR_0:colors,TEXCOORD_0:uvs},bounds:{x:minX,y:minY,width,height}};
 }
 function trailGeometry(clip){
  const context=options.trailContext?.(),attributes={POSITION_0:[],COLOR_0:[],TEXCOORD_0:[]};let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  if(!context)return{count:0,attributes,bounds:{x:0,y:0,width:1,height:1}};
  for(const p of particles){if(!p.trail)continue;const t=p.age/p.lifetime,baseColor=packed(gradient(trail.colorOverLifetime,t,trails.trailRandom(p.particleSeed,trails.RANDOM_OFFSETS.lifetimeColor))),mesh=trails.buildParticleTrailGeometry(p.trail,{clock:trailClock.clock,position:arr(p.position),worldMatrix:options.nativeSpace().state.matrix,lifetime:trailSeconds(p,p.currentSizeAxes),currentSize:p.currentSizeAxes[0],renderScale:context.renderScale,particleSeed:p.particleSeed,inputMatrix:context.view,outputMatrix:context.inverseView,textureScale:[trail.textureScale.x,trail.textureScale.y],baseColor,width:(t,i,r)=>curve(trail.widthOverTrail,t,r),color:(t,i,r)=>packed(gradient(trail.colorOverTrail,t,r))});
   for(const index of mesh.indices){const v=context.projectVertex(mesh.vertices[index]);attributes.POSITION_0.push(v.x,v.y,0,1);attributes.COLOR_0.push(...mesh.colors[index].map(v=>v/255));attributes.TEXCOORD_0.push(...mesh.uvs[index],0,0);minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y);}
  }
  if(clip){minX=Math.max(minX,clip.minX);minY=Math.max(minY,clip.minY);maxX=Math.min(maxX,clip.maxX);maxY=Math.min(maxY,clip.maxY);}if(!attributes.POSITION_0.length||minX>=maxX||minY>=maxY)return{count:0,attributes:{},bounds:{x:0,y:0,width:1,height:1}};minX=Math.floor(minX);minY=Math.floor(minY);maxX=Math.ceil(maxX);maxY=Math.ceil(maxY);const width=Math.max(1,maxX-minX),height=Math.max(1,maxY-minY),cx=minX+width/2,cy=minY+height/2;for(let i=0;i<attributes.POSITION_0.length;i+=4){attributes.POSITION_0[i]-=cx;attributes.POSITION_0[i+1]-=cy;}return{count:attributes.POSITION_0.length/4,attributes,bounds:{x:minX,y:minY,width,height}};
 }
 function stretchGeometry(clip){
  const context=options.stretchContext(),attributes={POSITION_0:[],COLOR_0:[],TEXCOORD_0:[]};let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  if(!context)return{count:0,attributes,bounds:{x:0,y:0,width:1,height:1}};
  const sorted=particles.slice();if(renderer.m_SortMode===2)sorted.sort((a,b)=>a.age-b.age);if(renderer.m_SortMode===3)sorted.sort((a,b)=>b.age-a.age);
  const arr=v=>[v.x||0,v.y||0,v.z||0],pivot=arr(renderer.m_Pivot||{}),size=f.SizeModule,rich=particleStretchCaller.richSelector({pivot,separateSize:!!initial.size3D||!!(size?.enabled&&size.separateAxes)||!!(f.SizeBySpeedModule?.enabled&&f.SizeBySpeedModule.separateAxes),spriteSheet:!!(f.UVModule?.enabled&&f.UVModule.mode===1)}),coefficients=particleStretchCaller.bounds({scaleX:context.renderScale[0],minSize:renderer.m_MinParticleSize,maxSize:renderer.m_MaxParticleSize,widthAtFar:context.widthAtFar,farClip:context.farClip,orthographic:context.orthographic});
  for(const p of sorted){const t=p.age/p.lifetime,sx=size?.enabled?curve(size.curve,t,p.r[3]):1,sy=size?.enabled&&size.separateAxes?curve(size.y,t,p.r[4]):sx,args=particleStretchCaller.build({...context,coefficients,position:arr(p.position),velocity:arr(p.renderVelocity||p.velocity),sizeX:p.size*sx,sizeY:(p.sizeY??p.size)*sy,agePercent:t*100,pivot,lengthScale:renderer.m_LengthScale,velocityScale:renderer.m_VelocityScale,cameraVelocityScale:renderer.m_CameraVelocityScale}),quad=particleStretch.leaf({...args,rich}),g=f.ColorModule?.enabled?gradient(f.ColorModule.gradient,t,p.r[2]):{r:1,g:1,b:1,a:1},color=['r','g','b','a'].map(k=>Math.max(0,Math.min(1,p.color[k]*g[k]))),texture=f.UVModule;let u0=0,v0=0,u1=1,v1=1;
   if(texture?.enabled&&texture.mode===0){const cols=texture.tilesX||1,rows=texture.tilesY||1,total=texture.animationType===1?cols:cols*rows,phase=texture.timeMode===2?p.age*(texture.fps||30)/total:curve(texture.frameOverTime,t,p.r[8])*(texture.cycles||1),frame=Math.floor(((phase+p.startFrame/total)%1+1)%1*total),row=texture.animationType===1?(texture.rowMode===1?Math.floor(p.r[9]*rows):texture.rowIndex||0):Math.floor(frame/cols),col=frame%cols;u0=col/cols;u1=(col+1)/cols;v0=1-(row+1)/rows;v1=1-row/rows;}
   if(p.flipX)[u0,u1]=[u1,u0];if(p.flipY)[v0,v1]=[v1,v0];const uv=[[0,1],[1,1],[1,0],[0,0]];
   for(const index of [0,1,2,0,2,3]){const v=context.projectVertex(quad.vertices[index]),u=uv[index];attributes.POSITION_0.push(v.x,v.y,0,1);attributes.COLOR_0.push(...color);attributes.TEXCOORD_0.push(u0+u[0]*(u1-u0),v0+u[1]*(v1-v0),0,0);minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y);}
  }
  if(clip){minX=Math.max(minX,clip.minX);minY=Math.max(minY,clip.minY);maxX=Math.min(maxX,clip.maxX);maxY=Math.min(maxY,clip.maxY);}if(!attributes.POSITION_0.length||minX>=maxX||minY>=maxY)return{count:0,attributes:{},bounds:{x:0,y:0,width:1,height:1}};minX=Math.floor(minX);minY=Math.floor(minY);maxX=Math.ceil(maxX);maxY=Math.ceil(maxY);const width=Math.max(1,maxX-minX),height=Math.max(1,maxY-minY),cx=minX+width/2,cy=minY+height/2;for(let i=0;i<attributes.POSITION_0.length;i+=4){attributes.POSITION_0[i]-=cx;attributes.POSITION_0[i+1]-=cy;}return{count:attributes.POSITION_0.length/4,attributes,bounds:{x:minX,y:minY,width,height}};
 }
 function meshGeometry(clip,source){
  const root=options.rootMatrix?.()||new DOMMatrix(),inverse=root.inverse(),matrix=options.matrix?.()||new DOMMatrix(),attributes={POSITION_0:[],NORMAL_0:[],TANGENT_0:[],COLOR_0:[]};for(let channel=0;channel<8;channel++)attributes['TEXCOORD_'+channel]=[];let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  if(!source)return{count:0,attributes,bounds:{x:0,y:0,width:1,height:1}};
  const read=(name,index,fallback)=>{const a=source.attributes[name];if(!a)return fallback;return a.values.slice(index*a.dimension,(index+1)*a.dimension);},push=(name,values,defaultW=0)=>attributes[name].push(values[0]||0,values[1]||0,values[2]||0,values[3]??defaultW);
  const sorted=particles.slice();if(renderer.m_SortMode===2)sorted.sort((a,b)=>a.age-b.age);if(renderer.m_SortMode===3)sorted.sort((a,b)=>b.age-a.age);
  for(const p of sorted){const t=p.age/p.lifetime,size=f.SizeModule,axes={x:size?.enabled?curve(size.curve,t,p.r[3]):1,y:size?.enabled?curve(size.separateAxes?size.y:size.curve,t,p.r[4]):1,z:size?.enabled?curve(size.separateAxes?size.z:size.curve,t,p.r[4]):1},base=(p.local||renderer.m_RenderAlignment===2)?root.multiply(matrix):p.world,position=p.local?point(base,p.position):p.position,rotation=new DOMMatrix().rotate(0,p.rotationY*180/Math.PI,0).rotate(p.rotationX*180/Math.PI,0,0).rotate(0,0,p.rotation*180/Math.PI),basis=new DOMMatrix([base.m11,base.m12,base.m13,0,base.m21,base.m22,base.m23,0,base.m31,base.m32,base.m33,0,position.x,position.y,position.z,1]),model=inverse.multiply(basis).multiply(rotation).scale(p.size*axes.x*(p.flipX?-1:1),(p.sizeY??p.size)*axes.y*(p.flipY?-1:1),(p.sizeZ??p.size)*axes.z),normalMatrix=model.inverse(),pivot=renderer.m_Pivot||{},g=f.ColorModule?.enabled?gradient(f.ColorModule.gradient,t,p.r[2]):{r:1,g:1,b:1,a:1},color=['r','g','b','a'].map(k=>Math.max(0,Math.min(1,p.color[k]*g[k])));
   const normalVector=v=>norm({x:normalMatrix.m11*v[0]+normalMatrix.m12*v[1]+normalMatrix.m13*v[2],y:normalMatrix.m21*v[0]+normalMatrix.m22*v[1]+normalMatrix.m23*v[2],z:normalMatrix.m31*v[0]+normalMatrix.m32*v[1]+normalMatrix.m33*v[2]});
   const texture=f.UVModule;let u0=0,v0=0,u1=1,v1=1;if(texture?.enabled&&texture.mode===0){const cols=texture.tilesX||1,rows=texture.tilesY||1,total=texture.animationType===1?cols:cols*rows;const phase=texture.timeMode===2?p.age*(texture.fps||30)/total:curve(texture.frameOverTime,t,p.r[8])*(texture.cycles||1),frame=Math.floor(((phase+p.startFrame/total)%1+1)%1*total),row=texture.animationType===1?(texture.rowMode===1?Math.floor(p.r[9]*rows):texture.rowIndex||0):Math.floor(frame/cols),col=frame%cols;u0=col/cols;u1=(col+1)/cols;v0=1-(row+1)/rows;v1=1-row/rows;}
   for(const index of source.indices){const v=read('POSITION',index,[0,0,0]),position=point(model,{x:v[0]-(pivot.x||0),y:v[1]-(pivot.y||0),z:v[2]-(pivot.z||0)}),normal=normalVector(read('NORMAL',index,[0,0,-1])),tangent=read('TANGENT',index,[1,0,0,-1]),tv=norm(point(model,{x:tangent[0],y:tangent[1],z:tangent[2]},0)),c=read('COLOR',index,[1,1,1,1]);push('POSITION_0',[position.x,position.y,position.z,1]);push('NORMAL_0',[normal.x,normal.y,normal.z,0]);push('TANGENT_0',[tv.x,tv.y,tv.z,tangent[3]??1]);push('COLOR_0',color.map((value,i)=>value*(c[i]??1)));for(let channel=0;channel<8;channel++){const uv=read('TEXCOORD'+channel,index,[0,0,0,0]);if(texture?.enabled&&(texture.uvChannelMask??-1)&(1<<channel)){uv[0]=u0+uv[0]*(u1-u0);uv[1]=v0+uv[1]*(v1-v0);}push('TEXCOORD_'+channel,uv);}minX=Math.min(minX,position.x);maxX=Math.max(maxX,position.x);minY=Math.min(minY,position.y);maxY=Math.max(maxY,position.y);}
  }
  if(clip){minX=Math.max(minX,clip.minX);minY=Math.max(minY,clip.minY);maxX=Math.min(maxX,clip.maxX);maxY=Math.min(maxY,clip.maxY);}if(!attributes.POSITION_0.length||minX>=maxX||minY>=maxY)return{count:0,attributes:{},bounds:{x:0,y:0,width:1,height:1}};minX=Math.floor(minX);minY=Math.floor(minY);maxX=Math.ceil(maxX);maxY=Math.ceil(maxY);const width=Math.max(1,maxX-minX),height=Math.max(1,maxY-minY),cx=minX+width/2,cy=minY+height/2;for(let i=0;i<attributes.POSITION_0.length;i+=4){attributes.POSITION_0[i]-=cx;attributes.POSITION_0[i+1]-=cy;}return{count:attributes.POSITION_0.length/4,attributes,bounds:{x:minX,y:minY,width,height}};
 }
 const api={update,reset,play,stop,resetLinkedStreams,get systemSeed(){return systemSeed;},linkSubEmitter,setSubParent,receiveParent,get subParent(){return subParent;},get isPlaying(){return playing;},get isEmitting(){return !!(playing&&emitting&&(f.looping||time<curve(f.startDelay)+(f.lengthInSec||1)));},geometry,limitations,ready,get emissionState(){return{...emissionState,words:emissionState.words.slice()};},get emissionClock(){return{phase:emissionTime,remainingDelay};},get trailClock(){return trailClock.clock;},trailSnapshot:()=>particles.filter(p=>p.trail).map(p=>({id:p.id,currentSize:p.currentSizeAxes.slice(),history:trails.orderedTrailHistory(p.trail),cumulativeLength:p.trail.cumulativeLength})),snapshot:()=>particles.map(p=>({id:p.id,particleSeed:p.particleSeed,age:p.age,lifetime:p.lifetime,position:{...p.position},velocity:{...p.velocity},color:{...p.color},...(p.axisOfRotation?{axisOfRotation:p.axisOfRotation.slice()}:{})})),propertySnapshot:()=>particles.map(p=>({particleSeed:p.particleSeed,lifetime:p.lifetime,size:[p.size,p.sizeY??p.size,p.sizeZ??p.size],rotation:[p.rotationX,p.rotationY,p.rotation],color:{...p.color},velocity:{...p.velocity}})),get initialState(){return initialLanes.map(s=>s.slice());},get shapeState(){return shapeLanes.map(s=>s.slice());},get shapeMesh(){return shapeMesh;},get mesh(){return mesh;},get count(){return particles.length;},get time(){return time;}};reset({refreshSeed:f.playOnAwake!==0});return api;
}

function updateParticleEmitters(emitters,dt){const depth=e=>{let n=0;for(let p=e.subParent;p;p=p.subParent)n++;return n;},ordered=emitters.slice().sort((a,b)=>depth(b)-depth(a)),steps=Math.max(1,Math.ceil(Math.max(0,dt)/.03));for(let i=0;i<steps;i++)for(const emitter of ordered)emitter.update(dt/steps);}

function resourceStats(){const list=[...surfaces].map(s=>({id:s.id,path:s.canvas.dataset.sourceParticle||s.canvas.closest('[data-unity-path]')?.dataset.unityPath||'',width:s.canvas.width,height:s.canvas.height,pixels:s.canvas.width*s.canvas.height,requestedWidth:s.options.pixelWidth||s.options.width||1,requestedHeight:s.options.pixelHeight||s.options.height||1,visible:s.visible(),ready:s.ready,suspended:s.suspended,draws:s.draws||0,manual:!!s.options.manual,geometryVertices:s.options.geometry?.count||0,geometryAttributeBytes:Object.values(s.options.geometry?.attributes||{}).reduce((sum,a)=>sum+(a.byteLength||a.length*8||0),0),material:s.material.source}));return{sharedContext:gpu?{type:'webgl2',owner:'SDDYXUnityShaders singleton',canvasWidth:gpu.canvas.width,canvasHeight:gpu.canvas.height,drawingBufferWidth:gpu.gl.drawingBufferWidth,drawingBufferHeight:gpu.gl.drawingBufferHeight,lost:gpu.lost,framebuffer:'default shared drawing buffer'}:null,geometryAttributeBytes:list.reduce((sum,s)=>sum+s.geometryAttributeBytes,0),geometryVertices:list.reduce((sum,s)=>sum+s.geometryVertices,0),surfaceLoads:stats.surfaceLoads||0,surfaceSuspends:stats.surfaceSuspends||0,surfaceResumes:stats.surfaceResumes||0,attributeTransferBytes:stats.attributeTransferBytes||0,surfaceCopyBytes:stats.surfaceCopyBytes||0,surfaceCopyCalls:stats.surfaceCopyCalls||0,allocationAccounting:allocationSnapshot(),allocationAccountingNote:'Logical requested bytes; release means reference deletion or GL deletion, not confirmed RSS reclamation. Browser-internal snapshots are not measurable here.',surfaces:list.length,suspendedSurfaces:[...surfaces].filter(s=>s.suspended).length,surfaceImageReferences:[...surfaces].reduce((sum,s)=>sum+Object.keys(s.loadedImages).length,0),encodedTextureBytes:Object.values(global.SDDYX_SHADER_TEXTURE_DATA||{}).reduce((sum,v)=>sum+v.length*2,0),backingPixels:list.reduce((sum,s)=>sum+s.pixels,0),visibleBackingPixels:list.filter(s=>s.visible).reduce((sum,s)=>sum+s.pixels,0),imageCacheEntries:images.size,imageCachePolicy:'active-and-pending-leases-only',imageLeaseCount:[...imageRecords.values()].reduce((sum,r)=>sum+r.refs,0),pendingImageLoads:[...imageRecords.values()].filter(r=>r.state==='pending').length,decodedImageBytes:[...decodedImages.values()].reduce((sum,r)=>sum+r.bytes,0),imageCacheBudgetBytes:IMAGE_CACHE_BYTES,gpuTextureBytes:gpu?[...gpu.textures.values()].reduce((sum,t)=>sum+t.width*t.height*4,0):0,gpuPrograms:gpu?.programs.size||0,gpuTextures:gpu?.textures.size||0,gpuPixels:gpu?gpu.canvas.width*gpu.canvas.height:0,largest:list.sort((a,b)=>b.pixels-a.pixels).slice(0,20)};}
global.SDDYXUnityShaders={particleNonmeshShape,particleInitial,particleShapeStream,particleMeshCommon,particleMeshSelection,particleEmission,particleSubEmitter,particleStretch,particleStretchCaller,particleNoise,particleSinCos,particleOrbitalDelta,particleClampVelocity,time:()=>(performance.now()-start)/1000,updateTextureRegion,invalidateTexture,releaseTexture,resourceStats,updateParticleEmitters,particleEmitter,particleMesh,acquireImage,acquireMaterial,imageData,supported,nameOf,stats,load:shaderData,create,draw,context:exposedContext,errors,get surfaceCount(){return surfaces.size;},get contextCount(){return gpu?1:0;}};
})(globalThis);
