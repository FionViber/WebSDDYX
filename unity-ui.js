/* Original Unity scene/prefab rendering, without Unity binaries or network access. */
(function (global) {
'use strict';
// Controlled candidate: these source mesh leaves have no DOM graphic, child,
// hit target or particle. Their actual mesh canvases are separate stage children.
const EMPTY_BREAKER_MESH_PATHS=new Set(["/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/card1/ZY_card_001/card_gold","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/card1/ZY_card_001/card_red","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/card1/ZY_card_001/liehen_001","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/card1/ZY_card_001/liehen_002","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/card1/ZY_card_001/liehen_003","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/card1/ZY_card_002/card_gold","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/card1/ZY_card_002/card_red","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/card1/ZY_card_002/liehen_001","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/card1/ZY_card_002/liehen_002","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/card1/card_hightlight_01","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/card1/glow_001","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/card1/glow_002","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/card1/liehen_01","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/card1/liehen_02","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/zy_bj_blood","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/zy_bj_blood01_1","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/zy_bj_blood01_3","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/zy_bj_blood02_1","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/zy_bj_blood02_3","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/zy_bj_guodu","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/zy_bj_guodu_red","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/zy_bj_jin","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/zy_bj_jinnoise","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/zy_bj_jinnoise2","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/zy_bj_red","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/zy_bj_rednoise","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/zy_bj_rednoise2","/SudanBreaker/SudanBreaker2/Card_SL_fhc_Legacy(Clone)/zy_bj_wenli"]);
function emptyBreakerMeshPlaceholder(source){return EMPTY_BREAKER_MESH_PATHS.has(source.path)&&source.transformType==='RectTransform'&&!(source.children||[]).length&&(source.components||[]).some(c=>c.type==='MeshRenderer')&&(source.components||[]).every(c=>['MeshRenderer','MeshFilter','RectTransform','SortingGroup'].includes(c.type));}

const NS='http://www.w3.org/2000/svg';
const SCRIPT={horizontal:-405508275,vertical:1297475563};
let mountSerial=0;
const number=(v,f=0)=>Number.isFinite(+v)?+v:f;
const vec=(v,x=0,y=x)=>({x:number(v&&v.x,x),y:number(v&&v.y,y)});
const clone=v=>JSON.parse(JSON.stringify(v));
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const rgba=c=>`rgba(${Math.round(number(c&&c.r,1)*255)},${Math.round(number(c&&c.g,1)*255)},${Math.round(number(c&&c.b,1)*255)},${clamp(number(c&&c.a,1))})`;
const fields=(n,p)=>n.components.find(c=>p(c.fields,c))?.fields;
const enabled=c=>c.fields.m_Enabled!==0;
const norm=s=>String(s||'').replace(/\\/g,'/').replace(/^\/+|\/+$/g,'');
const suffix=(p,s)=>p===s||p.endsWith('/'+norm(s));
// Exact AlphaRaycastFilter428FE0 sampling. Data rows use Unity's bottom-left
// Texture2D.GetPixel origin; its extra (1-v) is intentionally preserved.
function alphaRaycastSample(data,u,v,threshold=.1){if(!data?.readable)return true;if(!Number.isFinite(u)||!Number.isFinite(v))return false;const x=Math.max(0,Math.min(data.width-1,Math.floor(data.width*u))),y=Math.max(0,Math.min(data.height-1,Math.floor(data.height*(1-v)))),row=data.rows[y];for(let i=0;i<row.length;i+=2)if(x<row[i])return row[i+1]/255>=threshold;return false;}
function alphaRaycastRects(data,threshold=.1){const rectangles=[],active=new Map();for(let y=0;y<data.height;y++){const row=data.rows[y],segments=[];let start=0,open=null;for(let i=0;i<row.length;i+=2){if(row[i+1]/255>=threshold){if(open===null)open=start;}else if(open!==null){segments.push([open,start]);open=null;}start=row[i];}if(open!==null)segments.push([open,data.width]);const keys=new Set(segments.map(([a,b])=>a+','+b));for(const [key,rect]of active)if(!keys.has(key)){rectangles.push(rect);active.delete(key);}for(const [x1,x2]of segments){const key=x1+','+x2,rect=active.get(key);if(rect)rect.y2=y+1;else active.set(key,{x1,x2,y1:y,y2:y+1});}}return rectangles.concat([...active.values()]);}
// TMP GetPreferredWidth/Height start auto-sized measurement at fontSizeMax.
// Keep the authored fontSize field (including zero) separate from this value.
function preferredFontSize(f){return f.m_enableAutoSizing?number(f.m_fontSizeMax,number(f.m_fontSize,36)):number(f.m_fontSize??f.m_FontData?.m_FontSize,36);}
// Reproduce the exported TMP fallback graph, not the browser's system fonts.
// Metadata-only assets are traversed too; missing source references remain diagnostics.
// Recovered Resources/TMP Settings.asset (52d83d46894cf10459f0ea9162646304).
const DEFAULT_FONT_GUID='ee0bceef65a157f408b87e584d838f3f';
function textFont(fonts,fields){return fonts[fields.m_fontAsset?.guid]||fonts[fields.m_FontData?.m_Font?.guid]||fonts[DEFAULT_FONT_GUID];}
function fontChain(fonts,primary,{includeDefault=true,locale}={}){const result=[],seen=new Set(),families=new Set();function visit(value){const font=typeof value==='string'?fonts[value]:value;if(!font||seen.has(font))return;seen.add(font);if(font.family&&font.url&&!families.has(font.family)){families.add(font.family);result.push(font);}for(const ref of font.fallbacks||[])visit(fonts[ref.guid]);}visit(primary);if(includeDefault)visit(fonts[DEFAULT_FONT_GUID]);
 // Port compatibility only: four Traditional Chinese body glyphs absent from the native chain.
 // CSS consults this shipped Japanese serif solely when all original-order faces lack a glyph.
 if(locale==='zhTW')visit(fonts['866f6ac9314b12249a7a4de58bb445d5']);return result;}
function fontFamilyStack(fonts,primary,locale){const ordered=fontChain(fonts,primary,{locale}),seen=new Set(ordered.map(font=>font.family));for(const font of Object.values(fonts))if(font.compatibilityFallback===true&&font.family&&font.url&&!seen.has(font.family)){ordered.push(font);seen.add(font.family);}return ordered.map(font=>'"'+font.family.replace(/"/g,'\\"')+'"').join(',');}
function descriptorFonts(fonts,descriptor){const families=new Set();return Object.values(fonts).filter(font=>font.family&&font.url&&(descriptor.includes('"'+font.family+'"')||new RegExp('(?:^|[ ,])'+font.family+'(?:,|$)').test(descriptor))&&!families.has(font.family)&&families.add(font.family));}
let fontRetrySerial=0;
function retryFailedFonts(doc=global.document,fonts=global.SDDYX_FONTS||{}){
 if(!doc?.fonts)return 0;const family=value=>String(value||'').trim().replace(/^['"]|['"]$/g,''),known=new Map(Object.values(fonts).filter(f=>f.family&&f.url).map(f=>[f.family,f])),failed=new Set([...doc.fonts].filter(face=>face.status==='error'&&known.has(family(face.family))).map(face=>family(face.family)));if(!failed.size)return 0;
 const urls=new Map();for(const name of failed){const url=new URL(known.get(name).url,doc.baseURI);if(/^https?:$/.test(url.protocol))url.searchParams.set('sddyx-font-retry',Date.now().toString(36)+'-'+(++fontRetrySerial));urls.set(name,url.href);}
 let changed=0;const seen=new Set(),walk=sheet=>{if(!sheet||seen.has(sheet))return;seen.add(sheet);let rules;try{rules=sheet.cssRules;}catch{return;}for(const rule of rules||[]){if(rule.type===3)walk(rule.styleSheet);else if(rule.type===5){const name=family(rule.style.getPropertyValue('font-family'));if(urls.has(name)){rule.style.setProperty('src','url('+JSON.stringify(urls.get(name))+')');changed++;}}else if(rule.cssRules)walk(rule);}};
 for(const sheet of doc.styleSheets)walk(sheet);for(const face of [...doc.fonts])if(face.status==='error'&&failed.has(family(face.family)))doc.fonts.delete(face);return changed;
}
function richText(el,text,context={}) {
 text=String(text??'').replace(/<spriteanim\s*=/gi,'<sprite anim=');
 // A font/layout refresh must not detach an unchanged literal text hit target.
 if(typeof text==='string'&&!text.includes('<')&&el.firstChild?.nodeType===3&&el.childNodes.length===1&&el.firstChild.data===text)return;
 el.replaceChildren();
 // TMP markup is interpreted through an allowlist. No source string becomes HTML.
 const baseSize=number(context.fontSize,36),stack=[{el,tag:'',size:baseSize,family:context.fontFamily,bold:!!context.bold,italic:!!context.italic,mspace:null,cspace:0,indent:0}],parts=String(text??'').split(/(<[^>]+>)/g);
 const unit=(arg,state,percentBase)=>{if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:px|em|%)?$/.test(arg))return null;const value=parseFloat(arg);return arg.endsWith('em')?value*state.size:arg.endsWith('%')?(percentBase===undefined?null:value*percentBase/100):value;};
 let cursor=0;const positioned=/<indent\s*=/i.test(text);
 const advanceText=(part,state)=>{const lines=part.split(/\r\n|\r|\n/);for(let i=0;i<lines.length;i++){if(i)cursor=state.indent||0;const value=lines[i],count=Array.from(value).length,spacing=number(context.characterSpacing)+state.cspace;cursor+=(state.mspace===null?(context.measureGlyph?.(value,state)?.width??count*state.size*.5):count*state.mspace)+count*spacing+(value.match(/[ \u00a0]/g)?.length||0)*number(context.wordSpacing);}};
 const appendText=part=>{const state=stack.at(-1);if(positioned)advanceText(part,state);if(state.mspace===null){state.el.appendChild(document.createTextNode(part));return;}for(const ch of Array.from(part)){if(ch==='\n'||ch==='\r'){state.el.appendChild(document.createTextNode(ch));continue;}const cell=document.createElement('span'),glyph=document.createElement('span'),metrics=context.measureGlyph?.(ch,state),spacing=number(context.characterSpacing)+state.cspace+(ch===' '?number(context.wordSpacing):0);cell.className='sddyx-unity-monospace';cell.style.cssText=`display:inline-block;position:relative;white-space:pre;text-align:center;letter-spacing:0;width:${Math.max(0,state.mspace+spacing)}px`;glyph.style.cssText='display:inline-block;letter-spacing:0';if(metrics)glyph.style.transform=`translateX(${(metrics.width-(metrics.actualBoundingBoxRight||0)+(metrics.actualBoundingBoxLeft||0))/2-spacing/2}px)`;glyph.textContent=ch;cell.appendChild(glyph);state.el.appendChild(cell);}};
 for(const part of parts){
  const state=stack.at(-1);
  if(/^<sprite(?:\s|=|>)/i.test(part)){const sprite=context.renderSprite?.(part,state);if(sprite){state.el.appendChild(sprite);if(positioned)cursor+=parseFloat(sprite.style.width)||0;}continue;}
  const tag=/^<\s*(\/?)([a-z-]+|#[0-9a-f]+)(?:\s*=\s*([^>]+))?\s*>$/i.exec(part);
  if(!tag){appendText(part);continue;}
  const end=tag[1],name=tag[2].toLowerCase(),arg=(tag[3]||'').replace(/^\\?['"]|\\?['"]$/g,'');
  if(name==='br'){state.el.appendChild(document.createElement('br'));cursor=state.indent||0;continue;}
  if(end){for(let i=stack.length-1;i>0;i--)if(stack[i].tag===name){stack.length=i;break;}continue;}
  const span=document.createElement('span'),next={...state,el:span,tag:name};span.dataset.tmpTag=name;let known=true;
  if(name==='b'){span.style.fontWeight='bold';next.bold=true;}
  else if(name==='i'){span.style.fontStyle='italic';next.italic=true;}
  else if(name==='u')span.style.textDecoration='underline';
  else if(name==='s'||name==='strikethrough')span.style.textDecoration='line-through';
  else if(name==='color'||name.startsWith('#')){const color=name.startsWith('#')?name:arg;if(/^(#[a-f0-9]{3,8}|[a-z]+)$/i.test(color))span.style.color=color;}
  else if(name==='size'){const value=unit(arg,{size:baseSize},baseSize);if(value!==null){next.size=/^[+-]/.test(arg)&&!/(em|%)$/.test(arg)?baseSize+value:value;span.style.fontSize=Math.max(0,next.size)+'px';}else known=false;}
  else if(name==='font'){const font=context.resolveFont?.(arg);if(font?.family){span.style.fontFamily=context.resolveFontFamily?.(font)||'"'+font.family+'"';next.family=span.style.fontFamily;}else known=false;}
  else if(name==='alpha'){if(/^#[a-f0-9]{2}$/i.test(arg))span.style.opacity=parseInt(arg.slice(1),16)/255;}
  else if(name==='link')span.dataset.unityLink=arg;
  else if(name==='smallcaps')span.style.fontVariant='small-caps';
  else if(name==='uppercase')span.style.textTransform='uppercase';
  else if(name==='lowercase')span.style.textTransform='lowercase';
  else if(name==='nobr')span.style.whiteSpace='nowrap';
  else if(name==='indent'){const value=unit(arg,state,context.width);if(value!==null){const content=document.createElement('span');content.style.minWidth='0';span.appendChild(content);next.el=content;next.indent=value;span.dataset.tmpIndent=String(value);span.style.display='inline-grid';span.style.gridTemplateColumns='minmax(0,1fr)';span.style.marginLeft=(value-cursor)+'px';span.style.maxWidth=Math.max(0,number(context.width)-value+number(context.characterSpacing))+'px';span.style.verticalAlign='baseline';cursor=value;}else known=false;}
  else if(name==='cspace'){const value=unit(arg,state);if(value!==null){next.cspace=value;span.style.letterSpacing=(number(context.characterSpacing)+value)+'px';}else known=false;}
  else if(name==='mspace'){const value=unit(arg,state);if(value!==null)next.mspace=value;else known=false;}
  else if(name==='voffset'){const value=unit(arg,state);if(value!==null){span.style.position='relative';span.style.top=-value+'px';}else known=false;}
  else if(name==='line-height'){const value=unit(arg,state,state.size*number(context.lineRatio,1));if(value!==null&&value>=0)span.style.lineHeight=value+'px';else known=false;}
  else if(name==='align'&&['left','right','center','justified','flush'].includes(arg)){span.style.display='inline-block';span.style.width='100%';span.style.textAlign=['justified','flush'].includes(arg)?'justify':arg;span.style.verticalAlign='baseline';if(arg==='flush')span.style.textAlignLast='justify';}
  else if(name==='space'){const value=unit(arg,state);if(value!==null){span.style.display='inline-block';span.style.width=Math.max(0,value)+'px';if(value<0)span.style.marginLeft=value+'px';state.el.appendChild(span);if(positioned)cursor+=value;}continue;}
  else known=false;
  if(known){state.el.appendChild(span);stack.push(next);}
 }
}

// An app may explicitly own its original declarations across root remounts.
// This holds one stylesheet, never FontFace objects, readiness or UI callbacks.
function fontDeclarationText(fonts,base){
 const assetURL=p=>{if(!p)return '';return /^(data:|blob:|https?:|file:|\/)/.test(p)?p:base+p;};
 let text='';const usedFamilies=new Set();
 for(const f of Object.values(fonts)){if(f.family&&f.url&&!usedFamilies.has(f.family)){usedFamilies.add(f.family);text+=`@font-face{font-family:"${f.family}";src:url("${assetURL(f.url).replace(/"/g,'%22')}");font-display:swap;}\n`;}}
 return text;
}
function createFontDeclarationOwner(doc){
 if(!doc?.head)throw Error('Font declaration ownership requires a document head.');
 let sourceText=null,sourceBase=null,resident=null,anchors=null,disposed=false;const leases=new Set();
 // The authored CardInteraction rule changes pointer targeting, never fonts.
 // Only this exact source may appear after registration; unknown sheets fail.
 const pointerStyle=style=>style.tagName==='STYLE'&&style.id==='sddyx-native-card-interaction-style'&&style.textContent==='.sddyx-native-card-held,.sddyx-native-card-held *{pointer-events:none!important}'&&!style.type&&!style.media&&!style.disabled;
 const fontSources=()=>{const styles=[...doc.head.querySelectorAll('style,link[rel~="stylesheet"]')];if(styles.filter(pointerStyle).length>1)throw Error('Duplicate authored pointer stylesheet.');return styles.filter(style=>!pointerStyle(style));};
 const sourceSignature=style=>JSON.stringify([style.tagName,style.id,style.href,style.rel,style.type,style.media,!!style.disabled,style.textContent]);
 function validate(text,base){
  if(disposed||base!==doc.baseURI)throw Error('Font declaration owner document/base changed.');
  if(sourceText!==null&&(sourceText!==text||sourceBase!==base))throw Error('Font declaration owner source mismatch.');
  const styles=fontSources();
  if(anchors&&(styles.length!==anchors.length+(resident?1:0)||anchors.some((anchor,i)=>styles[i]!==anchor.style||sourceSignature(styles[i])!==anchor.signature)))throw Error('Font declaration owner source order changed.');
  if(resident&&(resident.parentNode!==doc.head||resident.textContent!==sourceText||resident.disabled||resident.media||styles.at(-1)!==resident))throw Error('Font declaration owner stylesheet/order changed.');
 }
 return Object.freeze({
  acquire(document,text,base){
   if(document!==doc||typeof text!=='string')throw Error('Font declaration owner document/source mismatch.');
   validate(text,base);if(!anchors)anchors=fontSources().map(style=>({style,signature:sourceSignature(style)}));sourceText=text;sourceBase=base;const token={};leases.add(token);let released=false,attached=false;
   return Object.freeze({
    attach(style){
     if(released||attached)throw Error('Font declaration lease is not attachable.');validate(text,base);
     if(style.ownerDocument!==doc||style.parentNode||style.textContent!==text||style.disabled||style.media)throw Error('Font declaration style does not match its lease.');
     if(!resident){doc.head.appendChild(style);resident=style;}attached=true;
    },
    release(){if(released)return;released=true;leases.delete(token);if(!leases.size&&!resident){sourceText=sourceBase=null;anchors=null;}}
   });
  },
  dispose(){if(leases.size)throw Error('Font declaration owner still has root leases.');if(disposed)return;resident?.remove();resident=null;sourceText=sourceBase=null;anchors=null;disposed=true;}
 });
}
// Scene membership/path is authored input; runtime components/transforms are
// cloned by makeScope. Index identities once per mount, never light/camera
// values: enabled, culling, rotation and camera fields remain live reads.
function sourceSceneIndex(scene){
 const nodes=Object.values(scene.nodes),byPath=new Map(),lights=[];
 for(const node of nodes){if(!byPath.has(node.path))byPath.set(node.path,node);if((node.components||[]).some(c=>c.type==='Light'))lights.push(node);}
 return{nodes,byPath,lights};
}
function mount(host,scene,options={}) {
 if(!options.fontDeclarationOwner)return mountScene(host,scene,options);
 if(typeof host==='string')host=document.querySelector(host);
 if(!host)throw Error('SDDYXUnityUI.mount requires a host element.');
 if(typeof scene==='string')scene=global['SDDYX_SCENE_'+scene];
 if(!scene?.nodes)throw Error('Scene data is not loaded. Load its local assets/layouts script first.');
 const assets=options.assets||global.SDDYX_ASSETS||{},fonts=assets.fonts||global.SDDYX_FONTS||{},base=options.assetBase??'';
 const lease=options.fontDeclarationOwner.acquire(document,fontDeclarationText(fonts,base),document.baseURI),state={stage:null,cleanups:[],dispose:null};
 try{return mountScene(host,scene,options,lease,state);}catch(error){
  let disposed=false;if(state.dispose)try{state.dispose();disposed=true;}catch(cleanupError){/* Continue independent cleanup; retain the constructor error. */}
  if(!disposed)for(const cleanup of state.cleanups.slice().reverse())try{cleanup();}catch(cleanupError){/* One failed owner must not skip another. */}
  try{state.stage?.remove();if(![...host.children].some(child=>child.classList.contains('sddyx-unity-stage')))host.classList.remove('sddyx-unity-host');}finally{lease.release();}
  throw error;
 }finally{state.stage=null;state.cleanups.length=0;state.dispose=null;}
}

function mountScene(host,scene,options={},fontDeclarationLease=null,fontMountState=null) {
 if(typeof host==='string')host=document.querySelector(host);
 if(!host)throw Error('SDDYXUnityUI.mount requires a host element.');
 if(typeof scene==='string')scene=global['SDDYX_SCENE_'+scene];
 if(!scene?.nodes)throw Error('Scene data is not loaded. Load its local assets/layouts script first.');
 const assets=options.assets||global.SDDYX_ASSETS||{},base=options.assetBase??'',fonts=assets.fonts||global.SDDYX_FONTS||{},materials=options.materials||global.SDDYX_MATERIALS||{},tmpSprites=options.tmpSprites||global.SDDYX_TMP_SPRITES||{},spriteGeometry=options.spriteGeometry||global.SDDYX_SPRITE_GEOMETRY||{},correctedSprites=new Map();
 const sourceIndex=sourceSceneIndex(scene);
 const measure=document.createElement('canvas').getContext('2d');
 const prefix='unity-'+(++mountSerial),stage=document.createElement('div');stage.className='sddyx-unity-stage';
 if(fontMountState)fontMountState.stage=stage;
 host.classList.add('sddyx-unity-host');host.appendChild(stage);
 const svg=document.createElementNS(NS,'svg'),defs=document.createElementNS(NS,'defs');svg.setAttribute('class','sddyx-unity-defs');svg.appendChild(defs);stage.appendChild(svg);
 const activeSubscribers=new Set(),activeNotifications=[],componentLifecycleSubscribers=new Set(),captureViews=new Set(),captureAtlases=new Set(),canvasTextures=new WeakMap(),all=[],roots=[],scopes=[],filters=new Map(),listeners=[],diagnostics={missingSprites:[],unsupported:[],source:scene.source};
 let fontEpoch=0,textLayoutEpoch=0,destroyed=false,refreshing=false,refreshAgain=false,serial=0,animationDirty=false,animationFrame=0,lastFrame=0,batchDepth=0,batchPending=false,legacyAutoplay=null,resize=null;
 if(fontMountState)fontMountState.cleanups.push(()=>cancelAnimationFrame(animationFrame),()=>resize?.disconnect(),()=>{for(const off of listeners)try{off();}catch(cleanupError){/* Continue independent listener removal. */}});
 const animationPlayers=[],particlePlayers=[],inlineAnimations=[],sfxPlayers=[],cameraStates=new Map(),nodesByPath=new Map(),pendingLayout=new Set(),animatedNodes=new Set();
 Object.defineProperty(diagnostics,'toggleTweenCount',{enumerable:true,get:()=>visualModifiers.canvas.tweenCount});diagnostics.layoutStats={full:0,partial:0,renderedNodes:0,lastMs:0};let inputScheme=options.inputScheme||'Keyboard&Mouse';
 // Lazy CanvasRenderer RGBA; pixel consumers must multiply this channel by
 // source vertex/material color, preserving TMP rich text and inline sprites.
 if(!global.SDDYXVisualModifiers)throw Error('Original visual-modifiers.js is required.');
 const rectMaskShadow=global.SDDYXRectMaskShadow;if(!rectMaskShadow)throw Error('Original rect-mask-shadow.js is required.');let rectMaskPixelScale=1;const blackShadowSprites=rectMaskShadow.createBlackSpriteCache(options.blackShadowTextures||global.SDDYX_BLACK_SHADOW_TEXTURES||{});
 if(fontMountState)fontMountState.cleanups.push(()=>blackShadowSprites.destroy());
 const canvasDirtyNodes=new Set(),nativeActiveNodes=new Set();
 const visualModifiers=global.SDDYXVisualModifiers.create({
  isActive:n=>{if(!sourceAncestorsActive(n))return false;for(let p=n;p;p=p.parent)if(!p.active||p.removed)return false;return true;},
  isSelected:n=>document.activeElement===n.element,
  setActive:nativeSetActive,
  invokeUnityEvent:invokeNativeUnityEvent,
  onCanvasColor:(n,component,color)=>{if(!n.removed)canvasDirtyNodes.add(n);}
 });
 if(fontMountState)fontMountState.cleanups.push(()=>visualModifiers.destroy());
 // Native lifecycle effects update activeSelf immediately and queue all target
 // subtrees (including currently invisible targets) for the renderer's existing
 // post-layout refresh. Do not set app-owned activeOverride here.
 function nativeSetActive(target,value){if(!target)throw Error('Unresolved native SetActive GameObject');value=!!value;if(target.removed||target.active===value)return false;target.active=value;nativeActiveNodes.add(target);return true;}
 function invokeNativeUnityEvent(owner,event,value){for(const call of event?.m_PersistentCalls?.m_Calls||[]){if(call.m_CallState===0)continue;const type=String(call.m_TargetAssemblyTypeName||'').split(',')[0];if(type!=='UnityEngine.GameObject'||call.m_MethodName!=='SetActive'||![0,6].includes(call.m_Mode)||call.m_Target?.guid)throw Error('Unsupported original visual-modifier UnityEvent: '+type+'.'+call.m_MethodName+' mode '+call.m_Mode);const target=(owner.scope.byID.get(String(call.m_Target?.fileID))||owner.scope.referenceScope?.byID.get(String(call.m_Target?.fileID)));if(!target)throw Error('Unresolved scoped original UnityEvent target '+call.m_Target?.fileID);nativeSetActive(target,call.m_Mode===0?value:!!call.m_Arguments?.m_BoolArgument);}}
 function canvasColor(n,c){return visualModifiers.color(n,c.canvasOwnerComponent||c);}
 function graphicCanvasColor(g,n){const color=canvasColor(n,g.canvasOwnerComponent||g.component);g.canvasAlpha=color.a;g.canvasColor=color;return color;}
 function multiplyGraphicRGB(source,canvas){return{r:number(source?.r,1)*canvas.r,g:number(source?.g,1)*canvas.g,b:number(source?.b,1)*canvas.b,a:number(source?.a,1)};}
 function flushCanvasColors(){if(refreshing||batchDepth)return;while(nativeActiveNodes.size||canvasDirtyNodes.size){const changed=[...new Set([...nativeActiveNodes,...[...canvasDirtyNodes].filter(n=>n.visible)])].filter(n=>!n.removed);nativeActiveNodes.clear();canvasDirtyNodes.clear();if(changed.length)refreshNodes(changed);}}
 const native=options.referenceResolution||scene.canvases?.find(c=>c.canvas.m_RenderMode!==2)?.referenceResolution||{x:3840,y:2160};
 let width=number(native.x,3840),height=number(native.y,2160);
 const content=options.content||global.SDDYX_CONTENT,config=content?.config||{};let locale=options.locale||'en',translatedConfig=content?.i18n?.[locale]||{};
 const assetURL=p=>{if(!p)return '';return /^(data:|blob:|https?:|file:|\/)/.test(p)?p:base+p;};
 // A runtime texture remains owned by its source atlas/capture. These are
 // full-resolution DOM fallback copies only, never the source or shader canvas.
 const runtimeCanvasFallbacks=new WeakMap();
 function releaseCanvasFallbacks(element){for(const canvas of element.querySelectorAll('canvas[data-source-runtime-fallback]')){const record=runtimeCanvasFallbacks.get(canvas);if(!record||record.released)continue;record.released=true;canvas.width=1;canvas.height=1;}}
 function resumeCanvasFallbacks(element){for(const canvas of element.querySelectorAll('canvas[data-source-runtime-fallback]')){const record=runtimeCanvasFallbacks.get(canvas);if(!record?.released)continue;canvas.width=record.source.width;canvas.height=record.source.height;canvas.getContext('2d').drawImage(record.source,0,0);record.released=false;}}
 // Chromium may leave decode() pending forever when a shader takes over and
 // its DOM fallback loses src. Explicit ownership cancellation wakes the gate;
 // callers still revalidate demand/readiness before publishing success.
 const imageDecodeWaiters=new Map();
 function decodeImage(image){return new Promise((resolve,reject)=>{
  let done=false;const finish=error=>{if(done)return;done=true;const waiters=imageDecodeWaiters.get(image);waiters?.delete(cancel);if(!waiters?.size)imageDecodeWaiters.delete(image);if(error)reject(error);else resolve();},cancel=()=>finish();
  let waiters=imageDecodeWaiters.get(image);if(!waiters){waiters=new Set();imageDecodeWaiters.set(image,waiters);}waiters.add(cancel);
  Promise.resolve().then(()=>image.decode()).then(()=>finish(),finish);
 });}
 function releaseImageSource(image){image.removeAttribute('src');for(const cancel of [...(imageDecodeWaiters.get(image)||[])])cancel();}
 function cancelImageDecodes(){for(const waiters of [...imageDecodeWaiters.values()])for(const cancel of [...waiters])cancel();}
 const pendingImages=new Set(),imageObserver=global.IntersectionObserver?new IntersectionObserver(entries=>{for(const entry of entries){const img=entry.target;if(!pendingImages.has(img)||!entry.isIntersecting||!img.isConnected||!img.closest('[data-unity-path]')?.__unityNode?.visible)continue;img.src=img.dataset.sourceUrl;pendingImages.delete(img);imageObserver.unobserve(img);}},{root:host}):null;
 if(fontMountState)fontMountState.cleanups.push(()=>imageObserver?.disconnect());
 function discardImages(element){for(const img of element.querySelectorAll('img[data-source-url]')){imageObserver?.unobserve(img);pendingImages.delete(img);if(currentCommonImagePin(img))continue;readyImages.delete(img);releaseImageSource(img);}releaseCanvasFallbacks(element);}
 function resumeImages(element){for(const img of element.querySelectorAll('img[data-source-url]'))if(!img.getAttribute('src')&&!pendingImages.has(img))queueImage(img,img.dataset.sourceUrl);}
 function queueImage(img,url){img.dataset.sourceUrl=url;if(global.SDDYX_RESIDENT?.ready&&global.SDDYX_RESIDENT.imageReady(url)){img.src=url;if(img.complete&&img.naturalWidth>0)readyImages.set(img,url);return;}pendingImages.add(img);if(imageObserver)imageObserver.observe(img);else requestAnimationFrame(()=>{if(pendingImages.has(img)&&img.dataset.sourceUrl===url&&img.isConnected&&img.closest('[data-unity-path]')?.__unityNode?.visible){img.src=url;pendingImages.delete(img);}});}

 // Resource preparation is not a simulation tick. Native emitter construction,
 // prewarm, animation events, and shared RNG remain in their original paths.
 const preparedParticleResources=new Map(),particlePreparationRecords=new Set(),pausedParticleCommands=[];
 // A separate native renderer must explicitly own an exact RawImage component.
 // DOM canvas presence is not readiness, and this registry never owns its GPU.
 const externalRenderers=new Map();
 const readyImages=new WeakMap(),readyShaders=new WeakMap(),readyMasks=new WeakMap(),observedMaskSources=new WeakMap(),readyFonts=new Map(),readyExternal=new WeakMap(),readyEmitters=new WeakSet(),readyParticles=new WeakMap();
 const resourceMaskSource=element=>[element.style.maskImage||'',element.style.webkitMaskImage||''].join('\n');
 const resourceMaskURLs=element=>{const result=[];for(const value of new Set([element.style.maskImage,element.style.webkitMaskImage]))if(value)for(const match of value.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/g))if(match[2])result.push(match[2]);return result;};
 // CSS masks have no DOM Image readiness of their own. Keep the successfully
 // decoded source while an exact CSS-mask owner uses it, including resident
 // hide/show cycles. Source changes and teardown release it; no URL-only proof.
 const resourceMaskImages=new Map(),resourceMaskOwners=new Set();
 function releaseResourceMaskImage(entry){if(--entry.refs>0)return;if(resourceMaskImages.get(entry.url)===entry)resourceMaskImages.delete(entry.url);releaseImageSource(entry.image);}
 function acquireResourceMaskImage(url){let entry=resourceMaskImages.get(url);if(entry&&(entry.status==='failed'||entry.status==='ready'&&(!entry.image.complete||!entry.image.naturalWidth||entry.image.getAttribute('src')!==url))){resourceMaskImages.delete(url);entry=null;}if(!entry){const image=(globalThis.SDDYXAssetPolicy?.createImage()||new Image());entry={url,image,refs:0,status:'pending',ready:null};resourceMaskImages.set(url,entry);image.src=url;entry.ready=Promise.resolve().then(()=>decodeImage(image)).then(()=>{if(!image.complete||!image.naturalWidth||image.getAttribute('src')!==url)throw Error('Required original mask did not decode.');entry.status='ready';return entry;},error=>{entry.status='failed';throw error;});entry.ready.catch(()=>{});}entry.refs++;let released=false;return{entry,ready:entry.ready,release(){if(released)return;released=true;releaseResourceMaskImage(entry);}};}
 function releaseResourceMasks(element){const evidence=readyMasks.get(element);if(evidence)for(const entry of evidence.images?.values()||[])releaseResourceMaskImage(entry);readyMasks.delete(element);resourceMaskOwners.delete(element);}
 function markResourceMask(element,source,url,entry){if(resourceMaskSource(element)!==source||entry.status!=='ready')return;let evidence=readyMasks.get(element);if(evidence?.source!==source){releaseResourceMasks(element);evidence={source,urls:new Set(),images:new Map()};readyMasks.set(element,evidence);resourceMaskOwners.add(element);}if(evidence.images.get(url)!==entry){const previous=evidence.images.get(url);if(previous)releaseResourceMaskImage(previous);entry.refs++;evidence.images.set(url,entry);}evidence.urls.add(url);observedMaskSources.set(element,source);}
 function currentResourceMaskReady(element,url){const evidence=readyMasks.get(element),entry=evidence?.images?.get(url);return !!entry&&evidence.source===resourceMaskSource(element)&&evidence.urls.has(url)&&resourceMaskImages.get(url)===entry&&entry.status==='ready'&&entry.image.complete&&entry.image.naturalWidth>0&&entry.image.getAttribute('src')===url;}
 function observeResourceMasks(node){for(const element of [node.element,...(node.graphics||[]).map(graphic=>graphic.element)]){const source=resourceMaskSource(element);if(observedMaskSources.get(element)!==source||(!node.visible||element.hidden)&&!global.SDDYX_RESIDENT?.ready)releaseResourceMasks(element);observedMaskSources.set(element,source);}}
 function shaderResourceSignature(surface){const material=surface.material||{};return JSON.stringify([material.guid,material.shaderGuid,material.keywords,Object.entries(material.textures||{}).map(([key,value])=>[key,value.guid,value.url,value.m_Texture])]);}
 function markShaderReady(surface){readyShaders.set(surface,{epoch:surface.loadEpoch,signature:shaderResourceSignature(surface),mainTexture:surface.options?.mainTexture,mainTextureSource:surface.options?.mainTextureSource});}
 function currentShaderReady(surface){const proof=surface.residentLoadEvidence;if(global.SDDYX_RESIDENT?.ready&&surface.ready&&!surface.contextLost&&!surface.loading&&!surface.suspended&&!surface.destroyed&&!surface.error&&proof?.epoch===surface.loadEpoch&&proof.signature===shaderResourceSignature(surface)&&proof.mainTexture===surface.options?.mainTexture&&proof.mainTextureSource===surface.options?.mainTextureSource)markShaderReady(surface);const record=readyShaders.get(surface);return !!record&&surface.ready&&!surface.contextLost&&!surface.loading&&!surface.suspended&&!surface.destroyed&&!surface.error&&record.epoch===surface.loadEpoch&&record.signature===shaderResourceSignature(surface)&&record.mainTexture===surface.options?.mainTexture&&record.mainTextureSource===surface.options?.mainTextureSource;}
 function particleResourceSignature(node){const system=node.components.find(c=>c.type==='ParticleSystem')?.fields||{},renderer=node.components.find(c=>c.type==='ParticleSystemRenderer')?.fields||{};return JSON.stringify([renderer.m_Materials,renderer.m_RenderMode,renderer.m_Mesh,system.TrailModule?.enabled,system.ShapeModule?.enabled,system.ShapeModule?.type,system.ShapeModule?.m_Mesh]);}
 function observeParticleResourceReady(node,emitter,surface){const signature=particleResourceSignature(node);Promise.resolve(emitter.ready).then(()=>{if(!destroyed&&!node.removed)readyEmitters.add(emitter);},()=>{});Promise.all([emitter.ready,surface.promise]).then(()=>{if(!destroyed&&!node.removed&&surface.ready&&!surface.error&&!surface.suspended&&!surface.destroyed&&signature===particleResourceSignature(node)){markShaderReady(surface);readyParticles.set(node,{emitter,surface,signature});}},()=>{});}
 function resourceDemandPredicate(opts={}){const additionalRoots=(opts.additionalRoots||[]).map(value=>value?.element?.__unityNode||value?.__unityNode||value).filter(Boolean),underAdditional=node=>additionalRoots.some(root=>{for(let n=node;n;n=n.parent)if(n===root)return true;return false;});return (node,graphic)=>{
  if(!node||node.removed||(!node.visible&&!opts.includeHidden)||graphic&&(graphic.element.hidden||!enabled(graphic.component)))return false;
  if(opts.includeHidden||underAdditional(node))return true;const element=graphic?.element||node.element,rect=element.getBoundingClientRect(),viewport=host.getBoundingClientRect();
  let left=Math.max(rect.left,0,viewport.left),top=Math.max(rect.top,0,viewport.top),right=Math.min(rect.right,global.innerWidth||Infinity,viewport.right),bottom=Math.min(rect.bottom,global.innerHeight||Infinity,viewport.bottom);for(let parent=element.parentElement;parent&&parent!==host;parent=parent.parentElement){const style=getComputedStyle(parent),box=parent.getBoundingClientRect();if(/^(hidden|clip|scroll|auto)$/.test(style.overflowX||style.overflow)){left=Math.max(left,box.left);right=Math.min(right,box.right);}if(/^(hidden|clip|scroll|auto)$/.test(style.overflowY||style.overflow)){top=Math.max(top,box.top);bottom=Math.min(bottom,box.bottom);}}return rect.width>0&&rect.height>0&&right>left&&bottom>top;
 };}

 // A text repaint may move its own already-decoded atlas IMG into the newly
 // laid-out glyph tree. This is a synchronous ownership transfer, not a cache:
 // no source change, no cloning, no cross-Graphic borrowing, and leftovers end
 // before paintText returns. New digits/assets still require their own decode.
 let repaintImages=null;
 function currentImageReady(image){const url=image.dataset.sourceUrl,complete=!!url&&image.getAttribute('src')===url&&image.complete&&image.naturalWidth>0;if(complete&&readyImages.get(image)!==url&&global.SDDYX_RESIDENT?.ready&&global.SDDYX_RESIDENT.imageReady(url))readyImages.set(image,url);return complete&&readyImages.get(image)===url;}
 function repaintWithDecodedImages(element,paint,retained=[]){const previous=repaintImages,pool=new Map();for(const image of new Set([...element.querySelectorAll('img[data-source-url]'),...retained]))if(currentImageReady(image)){const list=pool.get(image.dataset.sourceUrl)||[];list.push(image);pool.set(image.dataset.sourceUrl,list);image.remove();}repaintImages=pool;try{return paint();}finally{repaintImages=previous;for(const images of pool.values())for(const image of images){if(currentCommonImagePin(image))continue;readyImages.delete(image);imageObserver?.unobserve(image);pendingImages.delete(image);releaseImageSource(image);}}}
 function takeRepaintImage(url){const list=repaintImages?.get(url);while(list?.length){const image=list.shift();if(currentImageReady(image))return image;readyImages.delete(image);releaseImageSource(image);}return null;}
 // Only explicitly installed native InputDisplay Image components may be held.
 // Each lease pins the actual IMG for this Graphic and source URL, not a URL
 // cache or a readiness assumption about another browser image. Hidden owners
 // are decoded without initGraphics, layout, activation, Animator or RNG.
 const commonImageOwners=new Map(),commonImagePins=new WeakMap(),commonImageBatches=new Set();
 const commonInputAtlasPaths=new Set(['assets/original/Resources/image/gamepad_new.png','assets/original/Resources/image/gamepad.png']);
 function commonImageDescriptor(descriptor){
  const node=descriptor?.target?.element?.__unityNode||descriptor?.target?.__unityNode||descriptor?.target;
  if(destroyed||!node||node.removed||!all.includes(node)||node.element?.__unityNode!==node)throw resourceAbort();
  const component=node.components.find(component=>String(component.fileID)===String(descriptor.componentId)),f=component?.fields,graphic=node.graphics?.find(graphic=>graphic.component===component);
  if(!f||!('m_Sprite'in f)||!('m_Color'in f)||![0,3].includes(f.m_Type)||f.m_Material?.guid||f.m_Material?.fileID||graphic?.materialOverride||graphic?.shader||graphic?.raw)throw Error('Common input readiness requires an exact material-free Simple/Filled Image: '+node.path);
  const urls=new Set();
  for(const reference of descriptor.spriteReferences||[]){
   if(!reference||typeof reference==='object'&&!reference.guid&&!reference.url&&!reference.texture&&!reference.fileID)continue;
   const sprite=resolveSprite(reference);const logicalURL=String(sprite?.url||'').replace(/^https:\/\/fionviber\.github\.io\/WebSDDYX-assets-[12]\//,'');if(!sprite?.url||sprite.canvas||!commonInputAtlasPaths.has(logicalURL))throw Error('Common input readiness requires a recovered original input atlas: '+node.path);
   urls.add(assetURL(sprite.url));
  }
  if(!urls.size)throw Error('Common input readiness has no original atlas source: '+node.path);
  return {node,component,graphic,key:String(component.fileID),urls};
 }
 function currentCommonImagePin(image){const entry=commonImagePins.get(image);return !!entry&&!entry.released&&entry.refs>0&&!entry.owner.node.removed&&entry.owner.images.get(entry.url)===entry&&image.dataset.sourceUrl===entry.url&&image.getAttribute('src')===entry.url;}
 function releaseCommonImageEntry(entry){if(entry.released||--entry.refs>0)return;entry.released=true;commonImagePins.delete(entry.image);readyImages.delete(entry.image);imageObserver?.unobserve(entry.image);pendingImages.delete(entry.image);releaseImageSource(entry.image);if(entry.owner.images.get(entry.url)===entry)entry.owner.images.delete(entry.url);const map=commonImageOwners.get(entry.owner.node);if(!entry.owner.images.size&&map?.get(entry.owner.key)===entry.owner)map.delete(entry.owner.key);if(map&&!map.size)commonImageOwners.delete(entry.owner.node);}
 function releaseCommonImageBatch(batch,nodes){if(batch.released)return;for(const entry of [...batch.entries])if(!nodes||nodes.has(entry.owner.node)){batch.entries.delete(entry);releaseCommonImageEntry(entry);}if(!batch.entries.size){batch.released=true;commonImageBatches.delete(batch);}}
 function releaseCommonImageOwners(nodes){for(const batch of [...commonImageBatches])releaseCommonImageBatch(batch,nodes);}
 function commonImageOwnersReady(descriptors){try{for(const descriptor of descriptors){const value=commonImageDescriptor(descriptor),owner=commonImageOwners.get(value.node)?.get(value.key);if(!owner||owner.component!==value.component)return false;for(const url of value.urls){const entry=owner.images.get(url);if(!entry||!currentCommonImagePin(entry.image)||!currentImageReady(entry.image)||entry.state!=='ready')return false;}}return !destroyed;}catch(_){return false;}}
 async function prepareCommonImageOwners(descriptors,opts={}){
  const check=()=>{if(destroyed||!(opts.isCurrent?.()??true))throw resourceAbort();},batch={entries:new Set(),released:false},release=()=>releaseCommonImageBatch(batch);commonImageBatches.add(batch);
  try{
   check();const values=descriptors.map(commonImageDescriptor);
   for(const value of values){const map=commonImageOwners.get(value.node)||new Map();commonImageOwners.set(value.node,map);let owner=map.get(value.key);if(!owner){owner={node:value.node,key:value.key,component:value.component,images:new Map()};map.set(value.key,owner);}if(owner.component!==value.component)throw resourceAbort();
    for(const url of value.urls){let entry=owner.images.get(url);if(!entry){const current=[...(value.graphic?.element.querySelectorAll('img[data-source-url]')||[])].filter(image=>image.dataset.sourceUrl===url&&!commonImagePins.has(image));if(current.length>1)throw Error('Common input Image unexpectedly has multiple raster owners: '+value.node.path);const image=current[0]||(globalThis.SDDYXAssetPolicy?.createImage()||document.createElement('img'));image.alt='';image.draggable=false;image.decoding='async';image.dataset.sourceUrl=url;entry={owner,url,image,refs:0,released:false,state:'pending',promise:null};owner.images.set(url,entry);commonImagePins.set(image,entry);}
     if(!batch.entries.has(entry)){entry.refs++;batch.entries.add(entry);}
    }
   }
   // Establish all consumer counts before starting or awaiting any decode.
   for(const entry of batch.entries)if(!entry.promise){const image=entry.image;imageObserver?.unobserve(image);pendingImages.delete(image);if(image.getAttribute('src')!==entry.url)image.src=entry.url;entry.promise=(currentImageReady(image)?Promise.resolve():Promise.resolve().then(()=>decodeImage(image))).then(()=>{if(entry.released)throw resourceAbort();if(image.getAttribute('src')!==entry.url||image.dataset.sourceUrl!==entry.url||!image.complete||!image.naturalWidth)throw Error('Required original common input image did not decode: '+entry.url);readyImages.set(image,entry.url);entry.state='ready';return entry;},error=>{entry.state='error';throw error;});}
   await Promise.all([...batch.entries].map(entry=>entry.promise));check();if(batch.released||!commonImageOwnersReady(descriptors))throw resourceAbort();return {release,get released(){return batch.released;},isReady:()=>!batch.released&&commonImageOwnersReady(descriptors)};
  }catch(error){release();throw error;}
 }
 function repaintCommonImage(g,n,paint){const owner=commonImageOwners.get(n)?.get(String(g.component.fileID)),retained=owner&&owner.component===g.component&&!g.materialOverride&&!g.shader?[...owner.images.values()].filter(entry=>currentCommonImagePin(entry.image)&&currentImageReady(entry.image)).map(entry=>entry.image):[];return repaintWithDecodedImages(g.element,paint,retained);}

 function currentFontReady(descriptor,text){
  const expected=descriptorFonts(fonts,descriptor);
  if(!document.fonts?.check||!document.fonts.check(descriptor,text))return false;
  for(const font of expected){if(global.SDDYX_RESIDENT?.ready){const faces=global.SDDYX_RESIDENT.fontFaces(font.family,font.url);if(faces.length)readyFonts.set(font.family,{url:font.url,faces});}const record=readyFonts.get(font.family);if(!record||record.url!==font.url||!record.faces.length||!document.fonts.has||!record.faces.every(face=>face.status==='loaded'&&document.fonts.has(face)))return false;}return true;
 }
 // Read-only, conservative hot-path proof. Unknown/new ownership is cold.
 // It neither starts a load nor creates/ticks a renderer or native timeline.
 function visibleResourcesReady(getRecords,opts={}){
  const cold=(reason,detail={})=>{opts.onCold?.({reason,...detail});return false;};
  try{
   if(destroyed)return cold('ui-destroyed');if(batchDepth||batchPending||refreshing||pendingLayout.size)return cold('layout-pending',{batchDepth,batchPending,refreshing,pendingLayouts:pendingLayout.size});
   const required=resourceDemandPredicate(opts),engine=global.SDDYXUnityShaders;
   if(engine?.resourceStats?.().sharedContext?.lost)return cold('webgl-context-lost');
   const masksReady=element=>{const urls=resourceMaskURLs(element);if(!urls.length)return true;const evidence=readyMasks.get(element);return !!evidence&&evidence.source===resourceMaskSource(element)&&urls.every(url=>currentResourceMaskReady(element,url));};
   for(const node of getRecords()){
    if(!required(node))continue;if(!node.graphicsInitialized&&node.components.some(component=>enabled(component)&&('m_Sprite'in component.fields||'m_Texture'in component.fields||'m_text'in component.fields||'m_Text'in component.fields)))return cold('graphic-not-materialized',{path:node.path});
    if(!masksReady(node.element))return cold('mask-decode',{path:node.path,urls:resourceMaskURLs(node.element)});
    for(const graphic of node.graphics||[]){
     if(!required(node,graphic))continue;if(!masksReady(graphic.element))return cold('mask-decode',{path:node.path,urls:resourceMaskURLs(graphic.element)});
     if(graphic.shader){if(!currentShaderReady(graphic.shader))return cold('shader-surface',{path:node.path,loading:!!graphic.shader.loading,suspended:!!graphic.shader.suspended,epoch:graphic.shader.loadEpoch,error:graphic.shader.error||null});}
     else{
      if(graphic.kind==='image'){const reference=graphic.component.fields.m_Material?.guid,material=graphic.materialOverride||materials[reference];if(material){if(!recoveredDOMImageMaterial(material)||!recoveredDOMImageSource(graphic))return cold('image-material',{path:node.path,material:reference});}else if(reference&&!reference.startsWith('000000'))return cold('material-data',{path:node.path,material:reference});}
      if(graphic.kind==='raw'){const record=externalRenderer(node,graphic.component);if(!record||record.released||!record.descriptor.isCurrent()||!record.descriptor.isReady()||readyExternal.get(record)!==record.descriptor.getReady())return cold('external-renderer',{path:node.path,kind:record?.descriptor.kind||null});}
      for(const image of graphic.element.querySelectorAll('img[data-source-url]'))if(!image.isConnected||!currentImageReady(image))return cold('image-decode',{path:node.path,url:image.dataset.sourceUrl,complete:!!image.complete,width:image.naturalWidth||0});
      for(const canvas of graphic.element.querySelectorAll('canvas[data-source-runtime-fallback]')){const record=runtimeCanvasFallbacks.get(canvas);if(!record||record.released||canvas.width!==record.source.width||canvas.height!==record.source.height)return cold('runtime-canvas',{path:node.path});}
     }
     if(graphic.kind==='text'){const walker=document.createTreeWalker(graphic.inner||graphic.element,NodeFilter.SHOW_TEXT);let text;while(text=walker.nextNode()){if(!text.data.trim())continue;const style=getComputedStyle(text.parentElement);if(style.display==='none')continue;const descriptor=[style.fontStyle||'normal',style.fontWeight||'normal',style.fontSize||'16px',style.fontFamily||'serif'].join(' ');if(!currentFontReady(descriptor,text.data))return cold('font-face',{path:node.path,descriptor});}}
    }
   }
   for(const owner of particlePlayers){
    if(owner.removed||!owner.visible)continue;const world=particleRootMatrix(owner);if(!Number.isFinite(world.a)||Math.abs(world.a*world.d-world.b*world.c)<=1e-12)continue;
    const refs=owner.uiParticle.m_Particles.length?owner.uiParticle.m_Particles:owner.scope.records.filter(node=>node.path.startsWith(owner.path+'/')).flatMap(node=>node.components.filter(component=>component.type==='ParticleSystem').map(component=>({fileID:component.fileID})));
    for(const ref of refs){const node=owner.scope.records.find(node=>node.components.some(component=>component.type==='ParticleSystem'&&component.fileID===ref.fileID));if(!node||node.removed||!node.visible)continue;const system=node.components.find(component=>component.type==='ParticleSystem').fields,renderer=node.components.find(component=>component.type==='ParticleSystemRenderer')?.fields;if(!system.EmissionModule?.enabled||!renderer||(owner.uiParticle.directRenderer&&renderer.m_Enabled===0))continue;
     const existing=owner.particles?.find(p=>p.node===node),record=readyParticles.get(node),material=materials[renderer.m_Materials?.[renderer.m_RenderMode===5&&system.TrailModule?.enabled?1:0]?.guid];if(!existing||!record||record.emitter!==existing.emitter||record.surface!==existing.surface||record.signature!==particleResourceSignature(node)||!readyEmitters.has(existing.emitter)||!currentShaderReady(existing.surface)||existing.surface.material!==material)return cold('particle-renderer',{path:node.path,emitter:!!existing,proof:!!record,emitterReady:!!existing&&readyEmitters.has(existing.emitter),surfaceReady:!!existing&&currentShaderReady(existing.surface)});
    }
   }return true;
  }catch(error){return cold('readiness-error',{message:error?.message||String(error)});}
 }

 // This exact recovered CardShows icon material already uses the original
 // DOM sprite/crop/tint route. It is not a missing GLSL payload: its native
 // shader reference is built-in 10770, and the Graphic supplies MainTex.
 // Reject any changed signature, unknown material or missing source sprite.
 const recoveredCardFaceUnlitSignature="[\"1b63b21e2f7325547aff14e2f9944965\",\"Resources/materials/CardFaceUnlit.mat\",\"0000000000000000f000000000000000\",{\"fileID\":10770,\"guid\":\"0000000000000000f000000000000000\",\"type\":0},{\"_MainTex\":{\"m_Texture\":{\"fileID\":0},\"m_Scale\":{\"x\":1,\"y\":1},\"m_Offset\":{\"x\":0,\"y\":0},\"guid\":null,\"source\":null,\"url\":null}},{\"_BumpScale\":1,\"_ColorMask\":15,\"_Cutoff\":0.5,\"_DetailNormalMapScale\":1,\"_DstBlend\":0,\"_GlossMapScale\":1,\"_Glossiness\":0.5,\"_GlossyReflections\":1,\"_Metallic\":0,\"_Mode\":0,\"_OcclusionStrength\":1,\"_Parallax\":0.02,\"_SmoothnessTextureChannel\":0,\"_SpecularHighlights\":1,\"_SrcBlend\":1,\"_Stencil\":0,\"_StencilComp\":8,\"_StencilOp\":0,\"_StencilReadMask\":255,\"_StencilWriteMask\":255,\"_UVSec\":0,\"_UseUIAlphaClip\":0,\"_ZWrite\":1},{\"_Color\":{\"r\":1,\"g\":1,\"b\":1,\"a\":1},\"_EmissionColor\":{\"r\":0,\"g\":0,\"b\":0,\"a\":1}},{},[]]";
 // Native CardInfo/gallery/mobile zoom clone UI/Default and SetTexture
 // _BumpMap. Built-in 10770 has no such property, so this exact original setter
 // record is ignored by native and DOM renderers. All other fields stay exact.
 const recoveredSFxCatSignature="[\"9fba54dcc3134834bbd45deff54b1975\",\"Resources/materials/card/sfx/cat.mat\",\"0000000000000000f000000000000000\",{\"fileID\":10753,\"guid\":\"0000000000000000f000000000000000\",\"type\":0},{\"_AlphaTex\":{\"m_Texture\":{\"fileID\":0},\"m_Scale\":{\"x\":1,\"y\":1},\"m_Offset\":{\"x\":0,\"y\":0},\"guid\":null,\"source\":null,\"url\":null},\"_MainTex\":{\"m_Texture\":{\"fileID\":0},\"m_Scale\":{\"x\":1,\"y\":1},\"m_Offset\":{\"x\":0,\"y\":0},\"guid\":null,\"source\":null,\"url\":null}},{\"PixelSnap\":0,\"_BumpScale\":1,\"_Cutoff\":0.5,\"_DetailNormalMapScale\":1,\"_DstBlend\":0,\"_EnableExternalAlpha\":0,\"_GlossMapScale\":1,\"_Glossiness\":0.5,\"_GlossyReflections\":1,\"_Metallic\":0,\"_Mode\":0,\"_OcclusionStrength\":1,\"_Parallax\":0.02,\"_SmoothnessTextureChannel\":0,\"_SpecularHighlights\":1,\"_SrcBlend\":1,\"_UVSec\":0,\"_ZWrite\":1},{\"_Color\":{\"r\":1,\"g\":1,\"b\":1,\"a\":1},\"_EmissionColor\":{\"r\":0,\"g\":0,\"b\":0,\"a\":1},\"_Flip\":{\"r\":1,\"g\":1,\"b\":1,\"a\":1},\"_RendererColor\":{\"r\":1,\"g\":1,\"b\":1,\"a\":1}},{},[]]";
 function recoveredUnusedBumpMap(value){
  if(!value)return false;let texture=null;if(value.guid){texture=Object.values(assets.media||{}).find(texture=>texture.guid===value.guid&&texture.url===value.url);if(!texture)return false;}
  const expected={m_Scale:{x:1,y:1},m_Offset:{x:0,y:0},m_Texture:texture?{guid:texture.guid,fileID:2800000}:{fileID:0},guid:texture?.guid||null,url:texture?.url||null};return JSON.stringify(value)===JSON.stringify(expected);
 }
 function recoveredDOMImageMaterial(material){
  if(!material)return false;let textures=material.textures,signature;
  if(material.guid==='1b63b21e2f7325547aff14e2f9944965'){signature=recoveredCardFaceUnlitSignature;if(Object.prototype.hasOwnProperty.call(textures||{},'_BumpMap')){if(!recoveredUnusedBumpMap(textures._BumpMap))return false;textures={...textures};delete textures._BumpMap;}}
  else if(material.guid==='9fba54dcc3134834bbd45deff54b1975')signature=recoveredSFxCatSignature;else return false;
  return JSON.stringify([material.guid,material.source,material.shaderGuid,material.raw?.m_Shader,textures,material.floats,material.colors,material.ints,material.keywords])===signature;
 }
 function recoveredDOMImageSource(graphic){const sprite=resolveSprite(graphic.component.fields.m_Sprite)||graphic.sprite,rendered=graphic.renderedSprite,url=sprite?.url&&!sprite.canvas?assetURL(sprite.url):'';return url&&rendered&&!rendered.canvas&&assetURL(rendered.url)===url&&[...graphic.element.querySelectorAll('img[data-source-url]')].some(image=>image.dataset.sourceUrl===url)?url:null;}

 function externalRenderer(node,component){return externalRenderers.get(node)?.get(String(component.fileID));}
 function registerExternalRenderer(node,descriptor){
  if(destroyed||node?.removed)throw resourceAbort();
  const components=(node?.components||[]).filter(c=>'m_Texture'in c.fields&&'m_UVRect'in c.fields&&(descriptor?.componentId===undefined||String(c.fileID)===String(descriptor.componentId)));
  if(components.length!==1)throw Error('External renderer requires one exact original RawImage owner.');
  if(!descriptor?.kind||typeof descriptor.getReady!=='function'||typeof descriptor.isCurrent!=='function'||typeof descriptor.isReady!=='function')throw Error('External renderer requires explicit readiness and lifetime validators.');
  const key=String(components[0].fileID),map=externalRenderers.get(node)||new Map(),record={node,key,descriptor,released:false};externalRenderers.set(node,map);map.set(key,record);
  return ()=>{if(record.released)return;record.released=true;if(map.get(key)===record)map.delete(key);if(!map.size&&externalRenderers.get(node)===map)externalRenderers.delete(node);};
 }
 function releaseExternalRenderers(nodes){for(const [node,map]of externalRenderers)if(!nodes||nodes.has(node)){for(const record of map.values())record.released=true;externalRenderers.delete(node);}}
 async function prepareExternalRenderer(node,component,check){
  while(true){check();const record=externalRenderer(node,component);if(!record)throw Error('Required source RenderTexture is unresolved: '+node.path);const descriptor=record.descriptor;if(record.released||!descriptor.isCurrent())throw resourceAbort();const promise=descriptor.getReady();if(!promise||typeof promise.then!=='function')throw Error('Required external renderer has no initialization promise: '+node.path);
   try{await promise;}catch(error){check();if(externalRenderer(node,component)!==record||descriptor.getReady()!==promise)continue;throw error;}
   check();if(externalRenderer(node,component)!==record||descriptor.getReady()!==promise)continue;if(record.released||!descriptor.isCurrent())throw resourceAbort();if(!descriptor.isReady())throw Error('Required external renderer settled without successful initialization: '+node.path);readyExternal.set(record,promise);return {record,promise};
  }
 }
 async function loadRequiredFont(descriptor,text){
  const expected=descriptorFonts(fonts,descriptor);
  if(!document.fonts){if(expected.length)throw Error('Required original font loading API is unavailable.');return [];}
  if(!expected.length)return document.fonts.load(descriptor,text);
  // FontFaceSet.load with a stack can return only the face used by this string.
  // Load/validate every exported original face independently, preserving its identity.
  const prefix=descriptor.slice(0,descriptor.search(/(?:[0-9.]+)(?:px|pt|em|rem|%)\s/));
  const size=descriptor.match(/(?:[0-9.]+)(?:px|pt|em|rem|%)\s/)?.[0]||'16px ';
  const loaded=await Promise.all(expected.map(async font=>{const sample=font.compatibilityFallback===true&&Array.isArray(font.codepoints)?font.codepoints.map(value=>String.fromCodePoint(parseInt(value.slice(2),16))).join(''):text;const faces=[...await document.fonts.load(prefix+size+'"'+font.family+'"',sample)],family=face=>String(face.family||'').trim().replace(/^['"]|['"]$/g,'');const exact=faces.filter(face=>family(face)===font.family&&face.status==='loaded');if(!exact.length)throw Error('Required original font face did not load: '+font.family);readyFonts.set(font.family,{url:font.url,faces:exact});return exact;}));return loaded.flat();
 }

 let resourcePaused=!!options.resourcePaused,resourcePausedAt=resourcePaused?performance.now():0,resourcePausedMs=0;
 function resourceShaderTime(){return (global.SDDYXUnityShaders?.time?.()||0)-(resourcePausedMs+(resourcePaused?performance.now()-resourcePausedAt:0))/1000;}
 function setResourcePaused(value){value=!!value;if(value!==resourcePaused){const now=performance.now();if(value)resourcePausedAt=now;else resourcePausedMs+=now-resourcePausedAt;resourcePaused=value;}lastFrame=0;if(!resourcePaused){const commands=pausedParticleCommands.splice(0);for(const command of commands)if(!destroyed)controlParticles(command.targets.filter(n=>!n.removed),command.command,command.options);}return resourcePaused;}
 function particlePreparationMaterial(node){const system=node.components.find(c=>c.type==='ParticleSystem')?.fields,renderer=node.components.find(c=>c.type==='ParticleSystemRenderer')?.fields;if(!system?.EmissionModule?.enabled||!renderer)return null;return materials[renderer.m_Materials?.[renderer.m_RenderMode===5&&system.TrailModule?.enabled?1:0]?.guid];}
 function particlePreparationSignature(node,material){return JSON.stringify([particleResourceSignature(node),node.components.find(c=>c.type==='ParticleSystem')?.fields.EmissionModule?.enabled,node.components.find(c=>c.type==='ParticleSystemRenderer')?.fields.m_Enabled,material]);}
 function currentParticlePreparation(record){return !!record&&!record.released&&!record.retired&&!record.node.removed&&preparedParticleResources.get(record.node)===record&&particlePreparationMaterial(record.node)===record.material&&particlePreparationSignature(record.node,record.material)===record.signature;}
 function particleSurfaceOwnsImages(record,surface){return Object.values(record.material.textures||{}).every(texture=>!texture.url||(Object.values(surface.textureURLs||{}).includes(texture.url)&&surface.loadedImages?.[texture.url]));}
 function transferredParticlePreparation(record){const surface=record.transferSurface;return !!surface&&currentParticlePreparation(record)&&surface.loadEpoch===record.transferEpoch&&surface.material===record.material&&particleSurfaceOwnsImages(record,surface)&&surface.ready&&!surface.error&&!surface.suspended&&!surface.destroyed;}
 function disposeParticlePreparation(record){if(!record||record.released)return;record.released=true;record.lease?.release();record.transferSurface=null;particlePreparationRecords.delete(record);if(preparedParticleResources.get(record.node)===record)preparedParticleResources.delete(record.node);}
 function settleParticlePreparation(record){if(!record.waiters.size&&(!record.held||record.retired||transferredParticlePreparation(record)))disposeParticlePreparation(record);}
 function retireParticlePreparation(record){if(!record||record.released)return;record.retired=true;record.held=record.hiddenHeld=false;if(preparedParticleResources.get(record.node)===record)preparedParticleResources.delete(record.node);settleParticlePreparation(record);}
 function hiddenParticlePreparation(record){return record.hiddenHeld||[...record.waiters].some(waiter=>waiter.includeHidden&&waiter.isCurrent());}
 function releasePreparedParticles(nodes,{force=false,visibilityOnly=false}={}){for(const record of [...particlePreparationRecords])if(!nodes||nodes.has(record.node)){if(visibilityOnly&&hiddenParticlePreparation(record))continue;if(force)disposeParticlePreparation(record);else{record.held=record.hiddenHeld=false;settleParticlePreparation(record);}}}
 function handoffPreparedParticle(node,surface){for(const record of particlePreparationRecords){if(record.node!==node||!currentParticlePreparation(record)||surface.material!==record.material)continue;const epoch=surface.loadEpoch;surface.promise.then(()=>{if(surface.loadEpoch!==epoch||!currentParticlePreparation(record)||surface.material!==record.material||!particleSurfaceOwnsImages(record,surface)||!surface.ready||surface.error||surface.suspended||surface.destroyed)return;record.transferSurface=surface;record.transferEpoch=epoch;settleParticlePreparation(record);},()=>{});}}
 function resourceAbort(){const error=Error('Resource preparation was cancelled.');error.name='AbortError';return error;}
 async function prepareVisibleResources(getRecords,opts={}){
  const isCurrent=()=>!destroyed&&(opts.isCurrent?.()??true),check=()=>{if(!isCurrent())throw resourceAbort();};
  const report={status:'ready',images:0,fonts:0,masks:0,shaders:0,externalRenderers:0,particleMaterials:0,particleMeshes:0,intentionalFallbacks:[],limitations:['Particle dependencies are prepared without constructing or advancing emitters; particle first-frame raster is not pre-rendered.','Live2D and dice have separate renderer readiness and are not covered by this visible Unity UI gate.']};
  const ownedParticleRecords=new Map();
  const completedImages=new WeakMap(),completedShaders=new WeakMap(),completedExternal=new WeakMap(),completedFonts=new Set(),completedMasks=new Set(),pendingMasks=new Set(),fallbacks=new Set(),completedParticles=new Map(),scratchImages=new Set();
  const required=resourceDemandPredicate(opts);
  const guarded=(promise,stillRequired)=>promise.catch(error=>{check();if(stillRequired&&!stillRequired())return;throw error;}).then(value=>{check();return value;});
  const maskURLs=resourceMaskURLs;
  try{
   while(true){
    check();const jobs=[],fontRequests=new Map(),records=getRecords(),demandedNodes=new Set(records);let fontChanged=false;
    for(const record of [...particlePreparationRecords]){if(record.node.removed)disposeParticlePreparation(record);else if(!currentParticlePreparation(record))retireParticlePreparation(record);else if(!record.node.visible&&!hiddenParticlePreparation(record))retireParticlePreparation(record);}
    for(const node of records){
     if(opts.particlesOnly||!required(node))continue;
     const masks=new Set(maskURLs(node.element)),maskTargets=new Map([[node.element,resourceMaskSource(node.element)]]);
     for(const graphic of node.graphics||[]){
      if(!required(node,graphic))continue;
      for(const url of maskURLs(graphic.element))masks.add(url);maskTargets.set(graphic.element,resourceMaskSource(graphic.element));
      const shader=graphic.shader;
      if(shader){
       if(typeof shader.warm!=='function')throw Error('Original shader warm readiness API is unavailable.');
       if(completedShaders.get(shader)!==shader.loadEpoch||shader.contextLost){
        const stillRequired=()=>required(node,graphic)&&graphic.shader===shader&&!shader.destroyed;
        opts.onWait?.({reason:'shader-surface',path:node.path,epoch:shader.loadEpoch});
        jobs.push(guarded(shader.warm({isCurrent:()=>isCurrent()&&stillRequired(),render:true,time:resourceShaderTime()}),stillRequired).then(()=>{if(stillRequired()){if(!shader.ready||shader.error)throw Error(shader.error||'Required shader did not become ready.');completedShaders.set(shader,shader.loadEpoch);markShaderReady(shader);report.shaders++;}}));
       }
      }else if(graphic.kind==='image'){
       const reference=graphic.component.fields.m_Material?.guid,material=graphic.materialOverride||materials[reference],nativeDOM=recoveredDOMImageMaterial(material);if(material&&!nativeDOM)throw Error((global.SDDYXUnityShaders?.supported(material)?'Required original shader surface is not mounted: ':'Required original image material is not recovered: ')+node.path);if(!material&&reference&&!reference.startsWith('000000'))throw Error('Required original image material data is unavailable: '+node.path);if(nativeDOM&&!recoveredDOMImageSource(graphic))throw Error('Required recovered built-in source sprite is unavailable: '+node.path);
       const key=node.path+':'+(reference||'default');
       if(!fallbacks.has(key)){fallbacks.add(key);report.intentionalFallbacks.push({path:node.path,status:'intentional-fallback',reason:nativeDOM?'Recovered exact built-in material uses the original DOM sprite/crop/tint renderer; its source sprite decode is still required.':'Existing source image/canvas renderer; no translated shader surface is mounted.'});}
      }else if(graphic.kind==='raw'){
       const registration=externalRenderer(node,graphic.component),completed=registration&&completedExternal.get(registration);if(!registration||completed!==registration.descriptor.getReady()||!registration.descriptor.isReady()){opts.onWait?.({reason:'external-renderer',path:node.path,kind:registration?.descriptor.kind||null});jobs.push(guarded(prepareExternalRenderer(node,graphic.component,check),()=>required(node,graphic)).then(value=>{if(value&&required(node,graphic)){completedExternal.set(value.record,value.promise);report.externalRenderers++;}}));}
      }
      if(!shader||!shader.ready)for(const img of graphic.element.querySelectorAll('img[data-source-url]')){
       const url=img.dataset.sourceUrl;if(!url)continue;
       // A cold sibling must not force another decode of this exact, still-ready
       // DOM owner. Revalidate every pass; a completed URL alone is not proof.
       if(currentImageReady(img)){completedImages.set(img,url);continue;}
       const stillRequired=()=>img.isConnected&&required(node,graphic)&&img.dataset.sourceUrl===url&&img.getAttribute('src')===url&&(!graphic.shader||!graphic.shader.ready);
       if(graphic.element.dataset.shaderReady==='true')continue;
       imageObserver?.unobserve(img);pendingImages.delete(img);if(img.getAttribute('src')!==url)img.src=url;
       opts.onWait?.({reason:'image-decode',path:node.path,url});
       jobs.push(guarded(decodeImage(img),stillRequired).then(()=>{if(stillRequired()){if(!img.naturalWidth)throw Error('Required original image did not decode: '+url);completedImages.set(img,url);readyImages.set(img,url);report.images++;}}));
      }
      if(graphic.kind==='text'){
       const walker=document.createTreeWalker(graphic.inner||graphic.element,NodeFilter.SHOW_TEXT);let textNode;
       while(textNode=walker.nextNode()){
        if(!textNode.data.trim())continue;const style=getComputedStyle(textNode.parentElement);if(style.display==='none')continue;
        const descriptor=[style.fontStyle||'normal',style.fontWeight||'normal',style.fontSize||'16px',style.fontFamily||'serif'].join(' '),chars=fontRequests.get(descriptor)||new Set();for(const ch of textNode.data)chars.add(ch);fontRequests.set(descriptor,chars);
       }
      }
     }
     for(const url of masks){
      const targets=[...maskTargets].filter(([target,source])=>resourceMaskSource(target)===source&&maskURLs(target).includes(url));
      if(targets.every(([target])=>currentResourceMaskReady(target,url)))continue;
      if(pendingMasks.has(url))continue;pendingMasks.add(url);const lease=acquireResourceMaskImage(url);opts.onWait?.({reason:'mask-decode',path:node.path,url});
      jobs.push(guarded(lease.ready,()=>required(node)).then(entry=>{if(required(node)){for(const[target,source]of targets)markResourceMask(target,source,url,entry);completedMasks.add(url);report.masks++;}}).finally(()=>{pendingMasks.delete(url);lease.release();}));
     }
    }
    for(const [descriptor,chars]of fontRequests){
     const text=[...chars].sort().join(''),key=descriptor+'\n'+text;if(completedFonts.has(key))continue;
     // Only an exact still-registered original FontFace already validated by a
     // successful load can make this a no-op. New glyph/face/source demand
     // keeps the original await and layout invalidation below.
     if(Object.values(fonts).some(font=>font.family&&font.url&&(descriptor.includes('"'+font.family+'"')||descriptor.endsWith(' '+font.family)))&&currentFontReady(descriptor,text)){completedFonts.add(key);continue;}
     opts.onWait?.({reason:'font-face',descriptor});
     jobs.push(guarded(loadRequiredFont(descriptor,text)).then(()=>{completedFonts.add(key);fontChanged=true;report.fonts++;}));
    }
    // The dependency walk mirrors initParticles selection, but deliberately
    // does not construct an emitter, call reset(), or sample geometry.
    const engine=global.SDDYXUnityShaders;
    for(const owner of particlePlayers){
     if(owner.removed||(!owner.visible&&!opts.includeHidden))continue;const world=particleRootMatrix(owner);if(!opts.includeHidden&&(!Number.isFinite(world.a)||Math.abs(world.a*world.d-world.b*world.c)<=1e-12))continue;
     const refs=owner.uiParticle.m_Particles.length?owner.uiParticle.m_Particles:owner.scope.records.filter(node=>node.path.startsWith(owner.path+'/')).flatMap(node=>node.components.filter(component=>component.type==='ParticleSystem').map(component=>({fileID:component.fileID})));
     for(const ref of refs){
      const node=owner.scope.records.find(node=>node.components.some(component=>component.type==='ParticleSystem'&&component.fileID===ref.fileID));if(!node||(!node.visible&&!opts.includeHidden)||(opts.particlesOnly&&!demandedNodes.has(node)))continue;
      const system=node.components.find(component=>component.type==='ParticleSystem').fields,renderer=node.components.find(component=>component.type==='ParticleSystemRenderer')?.fields;
      if(!system.EmissionModule?.enabled||!renderer||(owner.uiParticle.directRenderer&&renderer.m_Enabled===0))continue;
      const material=materials[renderer.m_Materials?.[renderer.m_RenderMode===5&&system.TrailModule?.enabled?1:0]?.guid];
      if(!engine?.supported(material))throw Error('Required original particle material is not recovered: '+node.path);
      if(typeof engine.acquireMaterial!=='function')throw Error('Original particle material readiness API is unavailable.');
      const signature=particlePreparationSignature(node,material);const completed=completedParticles.get(node);if(completed&&currentParticlePreparation(completed)&&completed.material===material&&completed.signature===signature&&!owner.particles?.find(p=>p.node===node)?.surface.contextLost)continue;
      let record=preparedParticleResources.get(node);if(!currentParticlePreparation(record)||record.material!==material||record.signature!==signature){retireParticlePreparation(record);record={node,material,signature,waiters:new Set(),held:false,hiddenHeld:false,retired:false,released:false,transferSurface:null,lease:null};preparedParticleResources.set(node,record);particlePreparationRecords.add(record);const valid=()=>!destroyed&&!node.removed&&!record.released&&!record.retired;record.lease=engine.acquireMaterial(material,{assetBase:base,keywords:['DIRECTIONAL','LIGHTPROBE_SH'],isCurrent:valid});}
      let waiter=ownedParticleRecords.get(record);if(!waiter){waiter={isCurrent,includeHidden:!!opts.includeHidden,ready:false};record.waiters.add(waiter);ownedParticleRecords.set(record,waiter);}
      const stillRequired=()=>!node.removed&&(node.visible||opts.includeHidden)&&currentParticlePreparation(record);
      const work=[record.lease.ready];
      const requiredMesh=ref=>engine.particleMesh(ref,base).then(mesh=>{if(!mesh?.attributes||!mesh.indices)throw Error('Required original particle mesh is unavailable: '+node.path);return mesh;});
      if(renderer.m_RenderMode===4){work.push(requiredMesh(renderer.m_Mesh));report.particleMeshes++;}
      if(system.ShapeModule?.enabled&&system.ShapeModule.type===6){work.push(requiredMesh(system.ShapeModule.m_Mesh));report.particleMeshes++;}
      const existing=owner.particles?.find(p=>p.node===node),warmExisting=existing&&owner.visible&&node.visible&&existing.surface.material===material;if(warmExisting){if(typeof existing.surface.warm!=='function')throw Error('Existing particle shader warm readiness API is unavailable.');work.push(existing.surface.warm({isCurrent:()=>isCurrent()&&!node.removed&&(node.visible||opts.includeHidden),render:false}));}
      opts.onWait?.({reason:'particle-material',path:node.path,mesh:renderer.m_RenderMode===4||system.ShapeModule?.enabled&&system.ShapeModule.type===6});
      jobs.push(guarded(Promise.all(work),stillRequired).then(()=>{if(stillRequired()){waiter.ready=true;completedParticles.set(node,record);report.particleMaterials++;if(warmExisting){markShaderReady(existing.surface);if(readyEmitters.has(existing.emitter))readyParticles.set(node,{emitter:existing.emitter,surface:existing.surface,signature:particleResourceSignature(node)});handoffPreparedParticle(node,existing.surface);}}}));
     }
    }
    if(!jobs.length)break;
    await Promise.all(jobs);check();if(fontChanged){fontEpoch++;refreshLayout();}
   }
   check();for(const [record,waiter]of ownedParticleRecords)if(waiter.ready&&currentParticlePreparation(record)&&(record.node.visible||waiter.includeHidden)){record.held=true;if(waiter.includeHidden)record.hiddenHeld=true;}return report;
  }finally{for(const [record,waiter]of ownedParticleRecords){record.waiters.delete(waiter);settleParticlePreparation(record);}ownedParticleRecords.clear();for(const image of scratchImages)releaseImageSource(image);scratchImages.clear();}
 }

 // Explicit caller-named imminent stages only. No DOM initialization, native
 // activation, animation sample, renderer draw, or emitter/RNG construction.
 const preparedSubtrees=new Set();
 function resourcePreparationStats(){return {maskSourceImages:resourceMaskImages.size,maskOwners:resourceMaskOwners.size,commonInputBatchOwners:commonImageBatches.size,commonInputGraphicOwners:[...commonImageOwners.values()].reduce((sum,map)=>sum+map.size,0),commonInputImageOwners:[...commonImageOwners.values()].reduce((sum,map)=>sum+[...map.values()].reduce((sum,owner)=>sum+owner.images.size,0),0),pendingCommonInputImages:[...commonImageOwners.values()].reduce((sum,map)=>sum+[...map.values()].reduce((sum,owner)=>sum+[...owner.images.values()].filter(entry=>entry.state==='pending').length,0),0),subtreeOwners:preparedSubtrees.size,pendingSubtreeOwners:[...preparedSubtrees].filter(record=>record.state==='pending').length,preparedSubtreeOwners:[...preparedSubtrees].filter(record=>record.state==='ready').length,subtreeImageHolds:[...preparedSubtrees].reduce((sum,record)=>sum+record.images.size,0),subtreeMaterialLeases:[...preparedSubtrees].reduce((sum,record)=>sum+record.leases.size,0),preparedParticleMaterialOwners:particlePreparationRecords.size,preparedParticleMaterialWaiters:[...particlePreparationRecords].reduce((sum,record)=>sum+record.waiters.size,0),externalRendererHolders:externalRenderers.size,externalRendererRegistrations:[...externalRenderers.values()].reduce((sum,records)=>sum+records.size,0),accountingNote:'Ownership counts only. Image holds may overlap DOM/shader source URLs; no summed decoded or resident byte estimate.'};}
 function releasePreparedSubtrees(nodes){for(const record of [...preparedSubtrees])if(!nodes||[...record.nodes].some(node=>nodes.has(node)))record.release();}
 async function prepareSubtreeResources(nodes,opts={}){
  const selected=new Set(nodes),images=new Map(),leases=new Set(),materialLeases=new Map(),fontRequests=new Map(),jobs=[],disabledGraphics=new Map();
  let released=false;const record={nodes:selected,images,leases,state:'pending',release(){if(released)return;released=true;for(const lease of leases)lease.release();leases.clear();materialLeases.clear();for(const image of images.values())releaseImageSource(image);images.clear();preparedSubtrees.delete(record);}};preparedSubtrees.add(record);
  const isCurrent=()=>!released&&!destroyed&&[...selected].every(node=>!node.removed)&&(opts.isCurrent?.()??true),check=()=>{if(!isCurrent())throw resourceAbort();};
  const report={status:'dependencies-ready',images:0,fonts:0,materials:0,particleMeshes:0,externalRenderers:0,intentionalFallbacks:[],limitations:['Metadata dependencies only: no hidden geometry, initial raster, Animator sample, particle prewarm, or native event has executed.']};
  const track=promise=>{promise.catch(()=>{});jobs.push(promise);};
  const image=url=>{check();url=assetURL(url);if(!url||images.has(url))return;const value=(globalThis.SDDYXAssetPolicy?.createImage()||new Image());images.set(url,value);value.src=url;track(decodeImage(value).then(()=>{check();if(!value.naturalWidth)throw Error('Required impending original image did not decode: '+url);report.images++;}));};
  const engine=global.SDDYXUnityShaders;
  const material=(value,reference,node,particle=false)=>{check();if(!value){if(particle||reference&&!reference.startsWith('000000'))throw Error('Required impending original material data is unavailable: '+node.path);return;}if(!engine?.supported(value))throw Error('Required impending original material is not recovered: '+node.path);if(materialLeases.has(value))return;if(typeof engine.acquireMaterial!=='function')throw Error('Original material readiness API is unavailable.');const lease=engine.acquireMaterial(value,{assetBase:base,keywords:['DIRECTIONAL','LIGHTPROBE_SH'],isCurrent});materialLeases.set(value,lease);leases.add(lease);track(lease.ready.then(()=>{check();report.materials++;}));};
  const addFont=(font,text,size)=>{if(!font?.family||!font.url){report.intentionalFallbacks.push({status:'intentional-fallback',reason:'Existing DOM text has no recovered source font URL.'});return;}const descriptor='normal normal '+Math.max(1,size)+'px '+fontFamilyStack(fonts,font,locale),chars=fontRequests.get(descriptor)||new Set();for(const ch of text)chars.add(ch);fontRequests.set(descriptor,chars);};
  try{
   check();for(const value of opts.includeDisabledGraphics||[]){const element=value?.element||value,node=value?.node||element?.__unityNode||(selected.has(element)?element:null);if(!selected.has(node))throw Error('Impending disabled Graphic override is outside the named subtree.');const matches=node.components.filter(component=>{const f=component.fields;return ('m_Sprite'in f&&'m_Color'in f||'m_text'in f||'m_Text'in f&&'m_FontData'in f||'m_Texture'in f&&'m_UVRect'in f)&&(value?.componentId===undefined||String(component.fileID)===String(value.componentId));});if(matches.length!==1)throw Error('Impending disabled Graphic override must identify one original Graphic.');const ids=disabledGraphics.get(node)||new Set();ids.add(String(matches[0].fileID));disabledGraphics.set(node,ids);}
   for(const ref of opts.spriteReferences||[]){if(!ref?.fileID&&!ref?.guid)continue;const sprite=resolveSprite(ref);if(!sprite)throw Error('Required impending animated sprite is unavailable: '+(ref.guid||ref.fileID));if(sprite.url&&!sprite.canvas)image(sprite.url);}
   for(const node of selected){
    for(const component of node.components||[]){if(!enabled(component)&&!disabledGraphics.get(node)?.has(String(component.fileID)))continue;const fields=component.fields,graphic=node.graphics?.find(g=>!g.shadowSource&&String(g.component.fileID)===String(component.fileID));
     if('m_text'in fields||'m_Text'in fields&&'m_FontData'in fields){
      const text=String(node.textOverride??fields.m_text??fields.m_Text??''),chars=text.replace(/<[^>]*>/g,''),font=textFont(fonts,fields),size=preferredFontSize(fields);if(chars.trim())addFont(font,chars,size);
      for(const tag of text.match(/<[^>]+>/g)||[]){if(/^<sprite(?:\s|=|>)/i.test(tag)){const info=spriteInfo(tag,fields);if(info?.asset?.url)image(info.asset.url);else throw Error('Required impending inline sprite is unavailable: '+node.path);continue;}const match=/^<\s*font\s*=\s*([^>]+)>$/i.exec(tag);if(match){const name=match[1].replace(/^\\?['"]|\\?['"]$/g,''),source=Object.values(fonts).find(f=>f.asset?.replace(/\\/g,'/').endsWith('/'+name+'.asset')||f.originalFamily===name);if(source&&chars.trim())addFont(source,chars,size);}}
     }else if('m_Sprite'in fields&&'m_Color'in fields||'m_Texture'in fields&&'m_UVRect'in fields){
      const raw='m_Texture'in fields&&'m_UVRect'in fields,reference=fields.m_Material?.guid,sourceMaterial=graphic?.materialOverride||materials[reference];let sprite=raw?(textureRecord(fields.m_Texture)||graphic?.sprite):(resolveSprite(fields.m_Sprite)||graphic?.sprite||node.source?.images?.find(value=>value.componentID===component.fileID)?.sprite);
      if(raw&&!sprite){if(externalRenderer(node,component))track(prepareExternalRenderer(node,component,check).then(()=>{check();report.externalRenderers++;}));else if(fields.m_Texture?.fileID||fields.m_Texture?.guid)throw Error('Required impending source RenderTexture is unresolved: '+node.path);else report.intentionalFallbacks.push({path:node.path,status:'intentional-fallback',reason:'Authored empty RawImage has no source texture.'});}
      if(!raw&&!sprite&&fields.m_Sprite?.guid&&!fields.m_Sprite.guid.startsWith('000000'))throw Error('Required impending original sprite is unavailable: '+node.path);
      if(sprite?.url&&!sprite.canvas)image(sprite.url);if(recoveredDOMImageMaterial(sourceMaterial)){if(!sprite?.url||sprite.canvas)throw Error('Required impending recovered built-in source sprite is unavailable: '+node.path);report.intentionalFallbacks.push({path:node.path,status:'intentional-fallback',reason:'Recovered exact built-in material uses original DOM sprite/crop/tint; exact impending source sprite decode is required.'});}else material(sourceMaterial,reference,node);
     }
     if(fields.m_ShowMaskGraphic!==undefined){const source=node.components.find(c=>'m_Sprite'in c.fields)?.fields.m_Sprite,sprite=resolveSprite(source);if(sprite?.url)image((options.maskData||global.SDDYX_MASK_DATA||{})[sprite.guid]||sprite.url);}
    }
   }
   // Match original owner/reference selection; native disabled renderer flags
   // are only authoritative for direct renderer owners, not UIParticle owners.
   for(const owner of particlePlayers){if(owner.removed)continue;const refs=owner.uiParticle.m_Particles.length?owner.uiParticle.m_Particles:owner.scope.records.filter(node=>node.path.startsWith(owner.path+'/')).flatMap(node=>node.components.filter(component=>component.type==='ParticleSystem').map(component=>({fileID:component.fileID})));
    for(const ref of refs){const node=owner.scope.records.find(node=>selected.has(node)&&node.components.some(component=>component.type==='ParticleSystem'&&component.fileID===ref.fileID));if(!node)continue;const system=node.components.find(component=>component.type==='ParticleSystem').fields,renderer=node.components.find(component=>component.type==='ParticleSystemRenderer')?.fields;if(!system.EmissionModule?.enabled||!renderer||owner.uiParticle.directRenderer&&renderer.m_Enabled===0)continue;const reference=renderer.m_Materials?.[renderer.m_RenderMode===5&&system.TrailModule?.enabled?1:0]?.guid;material(materials[reference],reference,node,true);const mesh=ref=>{track(engine.particleMesh(ref,base).then(value=>{check();if(!value?.attributes||!value.indices)throw Error('Required impending original particle mesh is unavailable: '+node.path);report.particleMeshes++;}));};if(renderer.m_RenderMode===4)mesh(renderer.m_Mesh);if(system.ShapeModule?.enabled&&system.ShapeModule.type===6)mesh(system.ShapeModule.m_Mesh);}
   }
   for(const [descriptor,chars]of fontRequests)track(loadRequiredFont(descriptor,[...chars].join('')).then(()=>{check();report.fonts++;}));
   await Promise.all(jobs);check();record.state='ready';return {...report,release:record.release,get released(){return released;}};
  }catch(error){record.release();throw error;}
 }

 // Capture can deliberately target hidden source art. Load only that capture's
 // exact painted text before cloning layout or caching static glyph pixels.
 async function prepareCaptureFonts(nodes,alive){
  const requests=new Map();
  for(const node of nodes)for(const graphic of node.graphics)if(graphic.kind==='text'&&enabled(graphic.component)){
   const walker=document.createTreeWalker(graphic.inner||graphic.element,NodeFilter.SHOW_TEXT);let text;
   while(text=walker.nextNode()){if(!text.data.trim())continue;const style=getComputedStyle(text.parentElement);if(style.display==='none')continue;const descriptor=[style.fontStyle||'normal',style.fontWeight||'normal',style.fontSize||'16px',style.fontFamily||'serif'].join(' '),chars=requests.get(descriptor)||new Set();for(const ch of text.data)chars.add(ch);requests.set(descriptor,chars);}
  }
  if(!requests.size)return;await Promise.all([...requests].map(([descriptor,chars])=>loadRequiredFont(descriptor,[...chars].join(''))));alive();fontEpoch++;refreshNodes(nodes);for(const node of nodes)for(const graphic of node.graphics)if(graphic.kind==='text'&&enabled(graphic.component))paintText(graphic,node);alive();
 }

 const fontStyles=document.createElement('style'),usedFamilies=new Set();
 for(const f of Object.values(fonts)){if(f.family&&f.url&&!usedFamilies.has(f.family)){usedFamilies.add(f.family);fontStyles.textContent+=`@font-face{font-family:"${f.family}";src:url("${assetURL(f.url).replace(/"/g,'%22')}");font-display:swap;}\n`;}}
 if(fontDeclarationLease)fontDeclarationLease.attach(fontStyles);else stage.appendChild(fontStyles);
 function releaseTint(g){const record=filters.get(g);if(record){record.element.remove();filters.delete(g);}g.tintKey=null;}
 function tint(c,g){
  if(!c||[c.r,c.g,c.b].every(v=>v==null||v===1)){releaseTint(g);return '';}
  const key=[c.r,c.g,c.b].join(',');let record=filters.get(g);
  if(!record){const id=prefix+'-tint-'+(++serial),element=document.createElementNS(NS,'filter'),matrix=document.createElementNS(NS,'feColorMatrix');element.id=id;element.setAttribute('color-interpolation-filters','sRGB');matrix.setAttribute('type','matrix');element.appendChild(matrix);defs.appendChild(element);record={id,element,matrix};filters.set(g,record);}
  if(g.tintKey!==key){g.tintKey=key;record.matrix.setAttribute('values',`${number(c.r,1)} 0 0 0 0 0 ${number(c.g,1)} 0 0 0 0 0 ${number(c.b,1)} 0 0 0 0 0 1 0`);}
  return 'url(#'+record.id+')';
 }
 function correctedSprite(sprite){if(!sprite||!spriteGeometry[sprite.guid])return sprite;if(!correctedSprites.has(sprite.guid))correctedSprites.set(sprite.guid,{...sprite,...spriteGeometry[sprite.guid],cssRect:sprite.cssRect||sprite.rect,nativeSpriteGeometry:true});return correctedSprites.get(sprite.guid);}
 function resolveSprite(value){
  if(!value)return null;if(typeof value==='object'){if(value.texture||value.url)return correctedSprite(value);value=value.guid;}
  if(assets.sprites?.[value])return correctedSprite(assets.sprites[value]);
  if(assets.media?.[value])return assets.media[value];
  const key=norm(value).replace(/\.(asset|png|jpg)$/i,'');
  for(const [k,ss]of Object.entries(assets.resources||{}))if(norm(k).replace(/\.(asset|png|jpg)$/i,'').toLowerCase()===key.toLowerCase()){const a=ss.find(v=>v.kind==='sprite')||ss[0];return correctedSprite(assets.sprites?.[a.guid]||a);}
  return correctedSprite(Object.values(assets.sprites||{}).find(s=>s.name===value||s.source===value))||null;
 }
 function imagePixelsPerUnit(n,sprite){let reference=100;for(let p=n;p;p=p.parent)if(p.components.some(c=>c.type==='Canvas')){const scaler=fields(p,f=>'m_ReferencePixelsPerUnit'in f&&f.m_Enabled!==0);reference=number(scaler?.m_ReferencePixelsPerUnit,100);break;}return number(sprite?.pixelsPerUnit,100)/reference;}
 function nativeSpriteSize(n){const image=n.components.find(c=>'m_Sprite'in c.fields);if(!image)return false;const sprite=resolveSprite(image.fields.m_Sprite);if(!sprite?.rect)return false;const unit=imagePixelsPerUnit(n,sprite);n.transform.m_AnchorMax={...n.transform.m_AnchorMin};n.transform.m_SizeDelta={x:sprite.rect.width/unit,y:sprite.rect.height/unit};return true;}
 function crop(el,s,region){
  const r=region||s.cssRect||s.rect||{x:0,y:0,width:s.width,height:s.height},media=assets.media?.[s.texture]||s;
  const tw=s.textureSize?.[0]||media.width||r.width,th=s.textureSize?.[1]||media.height||r.height;
  const img=s.canvas?document.createElement('canvas'):(takeRepaintImage(assetURL(s.url||media.url))||(globalThis.SDDYXAssetPolicy?.createImage()||document.createElement('img')));if(s.canvas){img.width=s.canvas.width;img.height=s.canvas.height;img.getContext('2d').drawImage(s.canvas,0,0);img.dataset.sourceRuntimeFallback='true';runtimeCanvasFallbacks.set(img,{source:s.canvas,released:false});}else{img.alt='';img.draggable=false;img.decoding='async';if(img.getAttribute('src')!==assetURL(s.url||media.url))queueImage(img,assetURL(s.url||media.url));}
  img.style.cssText=`left:${-100*r.x/r.width}%;top:${-100*r.y/r.height}%;width:${100*tw/r.width}%;height:${100*th/r.height}%;`;
  el.appendChild(img);
 }
 function textureRecord(value){if(!value)return null;if(value instanceof HTMLCanvasElement){if(!canvasTextures.has(value))canvasTextures.set(value,{guid:'runtime-canvas-'+(++serial),url:'runtime-canvas:'+serial,width:value.width,height:value.height,canvas:value});return canvasTextures.get(value);}if(typeof value==='object'&&value.url)return value;const guid=typeof value==='object'?value.guid:value,path=assets.guidPaths?.[guid];return assets.media?.[path]||assets.media?.[value]||Object.values(assets.media||{}).find(m=>m.guid===guid||m.url===value)||null;}
 function rawSprite(texture,uv){if(!texture)return null;uv=uv||{x:0,y:0,width:1,height:1};return{...texture,textureSize:[texture.width,texture.height],rect:{x:number(uv.x)*texture.width,y:(1-number(uv.y)-number(uv.height,1))*texture.height,width:number(uv.width,1)*texture.width,height:number(uv.height,1)*texture.height}};}
 function paintImage(g,n){if(presentationDepth++===0)restoreCoffeePresentation();try{
  rectMaskShadow.syncShadowGraphic(g);
  const f=g.component.fields,el=g.element,material=g.materialOverride||materials[f.m_Material?.guid];let s=resolveSprite(f.m_Sprite)||g.sprite;
  let color=f.m_Color||{r:1,g:1,b:1,a:1};const canvasTint=graphicCanvasColor(g,n);
  if(!s&&material?.textures?._MainTex?.url){const texture=material.textures._MainTex,media=assets.media?.[texture.source]||{};s={...media,guid:texture.guid,url:texture.url,texture:texture.source};const tintColor=material.colors?._Color;if(tintColor)color={r:color.r*number(tintColor.r,1),g:color.g*number(tintColor.g,1),b:color.b*number(tintColor.b,1),a:color.a*number(tintColor.a,1)};el.dataset.material=material.source;}

  g.imageVertexColor={...color};color=multiplyGraphicRGB(color,canvasTint);s=blackShadowSprites.resolve(g,s,material,color);g.renderedSprite=s;g.graphicAlpha=number(color.a,1);el.style.opacity=g.graphicAlpha*number(g.canvasAlpha,1);if(g.shader?.ready||s?.nativeBlackShadow){releaseTint(g);el.style.filter='';}else el.style.filter=tint(color,g);el.style.backgroundColor='';
  const key=JSON.stringify([s?.guid||s?.url,s?.rect,f.m_Type,f.m_PreserveAspect,f.m_FillCenter,f.m_PixelsPerUnitMultiplier,n.box.w,n.box.h]);
  if(key!==g.paintKey){repaintCommonImage(g,n,()=>{g.paintKey=key;discardImages(el);el.replaceChildren();el.style.inset='0';el.style.width='';el.style.height='';el.style.left='';el.style.top='';
   if(s){
    const r=s.cssRect||s.rect||{x:0,y:0,width:s.width,height:s.height};
    const b=s.border||{},unit=imagePixelsPerUnit(n,s)*number(f.m_PixelsPerUnitMultiplier,1),w=n.box.w,h=n.box.h;
    if(f.m_Type===1&&(b.x||b.y||b.z||b.w)){
     let l=number(b.x)/unit,rr=number(b.z)/unit,t=number(b.w)/unit,bb=number(b.y)/unit;
     const fx=Math.min(1,w/(l+rr)||1),fy=Math.min(1,h/(t+bb)||1);l*=fx;rr*=fx;t*=fy;bb*=fy;
     const offset=s.nativeSpriteGeometry?s.textureRectOffset||{}:{},pl=number(offset.x),pb=number(offset.y),pr=s.nativeSpriteGeometry?s.rect.width-pl-r.width:0,pt=s.nativeSpriteGeometry?s.rect.height-pb-r.height:0;
     const dx=[pl/unit,l,w-rr,w-pr/unit],dy=[pt/unit,t,h-bb,h-pb/unit],sx=[r.x,r.x+number(b.x)-pl,r.x+r.width-number(b.z)+pr,r.x+r.width],sy=[r.y,r.y+number(b.w)-pt,r.y+r.height-number(b.y)+pb,r.y+r.height];
     for(let y=0;y<3;y++)for(let x=0;x<3;x++){if(x===1&&y===1&&f.m_FillCenter===0)continue;const sw=sx[x+1]-sx[x],sh=sy[y+1]-sy[y];if(sw<=0||sh<=0)continue;const p=document.createElement('span');p.className='sddyx-unity-slice';p.style.cssText=`position:absolute;left:${dx[x]}px;top:${dy[y]}px;width:${Math.max(0,dx[x+1]-dx[x])}px;height:${Math.max(0,dy[y+1]-dy[y])}px;`;crop(p,s,{x:sx[x],y:sy[y],width:sw,height:sh});el.appendChild(p);}
    }else{
     const logical=s.rect||r;let dw=w,dh=h,left=0,top=0;
     if(f.m_PreserveAspect&&logical.width&&logical.height){const scale=Math.min(w/logical.width,h/logical.height),p=vec(n.transform.m_Pivot,.5);dw=logical.width*scale;dh=logical.height*scale;left=(w-dw)*p.x;top=(h-dh)*(1-p.y);}
     if(s.nativeSpriteGeometry&&logical.width&&logical.height){const offset=s.textureRectOffset||{};left+=dw*number(offset.x)/logical.width;top+=dh*(logical.height-number(offset.y)-r.height)/logical.height;dw*=r.width/logical.width;dh*=r.height/logical.height;}
     if(f.m_PreserveAspect||s.nativeSpriteGeometry){el.style.inset='auto';el.style.width=dw+'px';el.style.height=dh+'px';el.style.left=left+'px';el.style.top=top+'px';}
     crop(el,s);
    }
    el.dataset.sprite=s.name||s.guid||'';
   }else if(!f.m_Sprite?.guid||f.m_Sprite.guid.startsWith('000000')){el.style.backgroundColor=rgba({...color,a:1});el.style.filter='';}
   else{if(!diagnostics.missingSprites.includes(f.m_Sprite.guid))diagnostics.missingSprites.push(f.m_Sprite.guid);}
  });}
  if(!s&&(!f.m_Sprite?.guid||f.m_Sprite.guid.startsWith('000000'))){el.style.backgroundColor=rgba({...color,a:1});el.style.filter='';}
  el.style.clipPath='';
  if(f.m_Type===3){const amount=clamp(number(f.m_FillAmount,1)),method=number(f.m_FillMethod),origin=number(f.m_FillOrigin);
   if(method===0)el.style.clipPath=origin===1?`inset(0 0 0 ${(1-amount)*100}%)`:`inset(0 ${(1-amount)*100}% 0 0)`;
   else if(method===1)el.style.clipPath=origin===1?`inset(0 0 ${(1-amount)*100}% 0)`:`inset(${(1-amount)*100}% 0 0 0)`;
   else if(amount<1){const start=([-90,0,90,180][origin]||0)*Math.PI/180,dir=f.m_FillClockwise?1:-1,points=['50% 50%'];for(let i=0;i<=Math.max(1,Math.ceil(amount*64));i++){const a=start+dir*amount*Math.PI*2*i/Math.max(1,Math.ceil(amount*64));points.push((50+Math.cos(a)*71)+'% '+(50+Math.sin(a)*71)+'%');}el.style.clipPath='polygon('+points.join(',')+')';}
  }
  paintShader(g,n,material,s);if(g.shader?.ready)discardImages(el);else{resumeImages(el);if(el.dataset.shaderReady!=='true')resumeCanvasFallbacks(el);}paintRectMask(g,n);
 }finally{if(--presentationDepth===0)syncCoffeePresentation();}}
 function sourceWorldPosition(node){const chain=[];for(let n=node;n;n=scene.nodes[n.parent])chain.push(n);let matrix=new DOMMatrix();for(const n of chain.reverse()){const t=n.transform,p=t.m_LocalPosition||{},q=t.m_LocalRotation||{x:0,y:0,z:0,w:1},s=t.m_LocalScale||{x:1,y:1,z:1},x=q.x,y=q.y,z=q.z,w=q.w;matrix=matrix.multiply(new DOMMatrix([(1-2*(y*y+z*z))*s.x,2*(x*y+w*z)*s.x,2*(x*z-w*y)*s.x,0,2*(x*y-w*z)*s.y,(1-2*(x*x+z*z))*s.y,2*(y*z+w*x)*s.y,0,2*(x*z+w*y)*s.z,2*(y*z-w*x)*s.z,(1-2*(x*x+y*y))*s.z,0,number(p.x),number(p.y),number(p.z),1]));}return{x:matrix.m41,y:matrix.m42,z:matrix.m43};}
 function cameraState(selector){
  const id=typeof selector==='object'?selector?.fileID:selector;let camera=cameraStates.get(id);if(camera)return camera;
  const node=sourceIndex.nodes.find(n=>n.path===id||n.name===id||(n.components||[]).some(c=>c.type==='Camera'&&c.fileID===id)),component=node?.components.find(c=>c.type==='Camera');if(!component)return null;
  camera=cameraStates.get(component.fileID);if(!camera){camera={path:node.path,fileID:component.fileID,position:sourceWorldPosition(node),fields:clone(component.fields)};cameraStates.set(component.fileID,camera);cameraStates.set(node.path,camera);}return camera;
 }
 function projectCanvas(n){
  if(!n.canvasRoot)return;applyAspectRatioFitter(n,n.parent?.box.w??width,n.parent?.box.h??height);if(n.canvas.canvas.m_RenderMode!==2){
   // UnityPlayer Canvas.UpdateCanvasRectTransform (EB6680) drives a root
   // screen-space RectTransform's pivot to (.5,.5), even when the asset stores
   // zero. Apply this only to our mutable runtime transform, never the source.
   let nested=false;for(let p=n.parent;p;p=p.parent)if(p.components?.some(c=>c.type==='Canvas')){nested=true;break;}
   if(!nested)n.transform.m_Pivot={x:.5,y:.5};
   n.box={x:0,y:0,w:width,h:height};return;
  }
  const camera=cameraState(n.canvas.canvas.m_Camera),f=camera?.fields,cw=number(n.transform.m_SizeDelta?.x,640),ch=number(n.transform.m_SizeDelta?.y,480),s=f?.orthographic?height/(2*number(f['orthographic size'],height/2)):1,cp=vec(camera?.position),np=sourceWorldPosition(n.source),pivot=vec(n.transform.m_Pivot,.5);n.projection=s;n.box={x:width/2+(np.x-cp.x-cw*pivot.x)*s,y:height/2-(np.y-cp.y+ch*(1-pivot.y))*s,w:cw,h:ch};
 }
 function updateCamera(selector,values){const camera=cameraState(selector);if(!camera)throw Error('Camera not found: '+selector);if(values.position)Object.assign(camera.position,values.position);if(values.orthographicSize!==undefined){if(!(values.orthographicSize>0))throw Error('Orthographic size must be positive.');camera.fields['orthographic size']=values.orthographicSize;}if(values.fields)Object.assign(camera.fields,values.fields);
  // Camera motion changes only the world canvas root transform, not 4,000 UI
  // RectTransforms. Child hit geometry and projectPoint inherit it immediately.
  for(const n of roots)if(n.canvas?.canvas.m_Camera?.fileID===camera.fileID){projectCanvas(n);n.element.style.left=n.box.x+'px';n.element.style.top=n.box.y+'px';n.element.style.transform=n.projection?`scale(${n.projection})`:'none';}
  return camera;
 }
 function shaderUniforms(n,w,h,left,top){
  let root=n;while(root.parent)root=root.parent;const canvas=root.canvas?.canvas,cameraRuntime=cameraState(canvas?.m_Camera),camera=cameraRuntime?.fields,cp=cameraRuntime?.position||{x:0,y:0,z:-10},unit=2*number(camera?.['orthographic size'],5)/height,m=nodeMatrix(n),center=m.transformPoint({x:left+w/2,y:top+h/2}),z=canvas?.m_RenderMode===2?0:number(cp.z,-10)+number(canvas?.m_PlaneDistance,100),world=new DOMMatrix([m.a*unit,-m.b*unit,-m.c*unit,m.d*unit,(center.x-width/2)*unit+number(cp.x),(height/2-center.y)*unit+number(cp.y)]),inverse=world.inverse();
  const object=[world.a,world.b,0,0,world.c,world.d,0,0,0,0,unit,0,world.e,world.f,z,1],inv=[inverse.a,inverse.b,0,0,inverse.c,inverse.d,0,0,0,0,1/unit,0,inverse.e,inverse.f,-z/unit,1],projection=[2/w,0,0,0,0,2/h,0,0,0,0,0,0,0,0,0,1],vp=Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)vp[c*4+r]+=projection[k*4+r]*inv[c*4+k];
  const lightNode=sourceIndex.lights.find(x=>(x.components||[]).some(c=>c.type==='Light'&&c.fields.m_Enabled!==0&&c.fields.m_Type===1&&(c.fields.m_CullingMask?.m_Bits&(1<<n.source.layer)))),light=lightNode?.components.find(c=>c.type==='Light')?.fields,q=lightNode?.transform?.m_LocalRotation||{x:0,y:0,z:0,w:1},forward=[-2*(q.x*q.z+q.w*q.y),-2*(q.y*q.z-q.w*q.x),-(1-2*(q.x*q.x+q.y*q.y))],settings=scene.nonGameObjectComponents?.find(c=>c.type==='RenderSettings')?.fields,ambient=settings?.m_AmbientMode===3?settings.m_AmbientSkyColor:{r:0,g:0,b:0},linear=x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4);
  return {unity_ObjectToWorld:object,unity_WorldToObject:inv,unity_MatrixVP:vp,_WorldSpaceCameraPos:[number(cp.x),number(cp.y),number(cp.z,-10)],_WorldSpaceLightPos0:[...forward,0],_LightColor0:[number(light?.m_Color?.r)*number(light?.m_Intensity),number(light?.m_Color?.g)*number(light?.m_Intensity),number(light?.m_Color?.b)*number(light?.m_Intensity),1],unity_SHAr:[0,0,0,linear(ambient.r)],unity_SHAg:[0,0,0,linear(ambient.g)],unity_SHAb:[0,0,0,linear(ambient.b)]};
 }
 function paintShader(g,n,material,s){
  const engine=global.SDDYXUnityShaders,el=g.element;if(!engine?.supported(material)){if(g.shader){g.shader.destroy();g.shader=null;g.shaderCanvas?.remove();delete el.dataset.shaderReady;}return;}
  const w=parseFloat(el.style.width)||n.box.w,h=parseFloat(el.style.height)||n.box.h,left=parseFloat(el.style.left)||0,top=parseFloat(el.style.top)||0;if(w<=0||h<=0)return;
  const r=s?.cssRect||s?.rect,media=assets.media?.[s?.texture]||s,tw=s?.textureSize?.[0]||media?.width||w,th=s?.textureSize?.[1]||media?.height||h,uv=r?[r.x/tw,1-(r.y+r.height)/th,(r.x+r.width)/tw,1-r.y/th]:[0,0,1,1],mainTexture=s?.url||media?.url,color=multiplyGraphicRGB(g.component.fields.m_Color,graphicCanvasColor(g,n)),uniforms=shaderUniforms(n,w,h,left,top),key=JSON.stringify([material.guid,mainTexture,w,h,uv]),dynamicKey=JSON.stringify([color,uniforms]);
  if(g.shaderKey!==key||!g.shaderCanvas?.isConnected){g.shader?.destroy();g.shaderCanvas?.remove();delete el.dataset.shaderReady;g.shaderKey=key;const canvas=document.createElement('canvas');canvas.className='sddyx-unity-shader';canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none';canvas.hidden=true;g.shaderCanvas=canvas;el.appendChild(canvas);const ratio=(host.clientWidth||width)/width;g.shader=engine.create(canvas,material,{assetBase:base,paused:()=>resourcePaused,timeProvider:resourceShaderTime,width:w,height:h,pixelWidth:Math.max(1,Math.ceil(w*ratio)),pixelHeight:Math.max(1,Math.ceil(h*ratio)),mainTexture,mainTextureSource:s?.canvas,uv,color:[color.r,color.g,color.b,color.a],keywords:['DIRECTIONAL','LIGHTPROBE_SH'],uniforms,visible:()=>n.visible&&g.component.fields.m_Enabled!==0,onReady:view=>{if(view.destroyed)return;if(presentationDepth++===0)restoreCoffeePresentation();try{canvas.hidden=false;el.dataset.shaderReady='true';discardImages(el);releaseTint(g);el.style.filter='';g.graphicAlpha=1;el.style.opacity=number(g.canvasAlpha,1);el.style.backgroundColor='';}finally{if(--presentationDepth===0)syncCoffeePresentation();}},onError:error=>{diagnostics.unsupported.push({path:n.path,type:'OriginalShader',reason:error.message});}});}
  if(g.shaderDynamicKey!==dynamicKey){g.shaderDynamicKey=dynamicKey;g.shader?.update({color:[color.r,color.g,color.b,color.a],uniforms});}
  if(g.shader?.ready){el.style.filter='';g.graphicAlpha=1;el.style.opacity=number(g.canvasAlpha,1);el.style.backgroundColor='';}
 }
 function spriteInfo(tag,textFields){
  const main=/^<sprite(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\d+)))?/i.exec(tag),nameMatch=/\bname\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag),indexMatch=/\bindex\s*=\s*["']?(\d+)/i.exec(tag),anim=/\banim\s*=\s*["']?\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)/i.exec(tag);
  const assetName=main?.[1]||main?.[2],asset=assetName?Object.values(tmpSprites).find(a=>a.name===assetName):tmpSprites[textFields.m_spriteAsset?.guid];if(!asset)return null;
  const characterName=nameMatch&&(nameMatch[1]||nameMatch[2]||nameMatch[3]),index=number(anim?.[1]??indexMatch?.[1]??main?.[3],0),character=characterName?asset.characters.find(c=>String(c.m_Name)===characterName):asset.characters[index];if(!character)return null;
  const glyphs=asset.glyphs?.length?asset.glyphs:asset.raw?.m_GlyphTable||[],glyph=glyphs.find(g=>g.m_Index===character.m_GlyphIndex);if(!glyph)return null;
  const m=glyph.m_Metrics,face=fonts[textFields.m_fontAsset?.guid]?.faceInfo,ratio=face?number(face.m_AscentLine,90)/number(face.m_PointSize,90):1;
  const fontSize=number(textFields.m_fontSize,36),baseScale=fontSize*ratio/Math.max(1,m.m_Height),scale=baseScale*number(glyph.m_Scale,1)*number(character.m_Scale,1);return{asset,character,glyph,glyphs,metrics:m,index,anim,baseScale,scale};
 }
 function inlineSprite(tag,textFields,node){
  const info=spriteInfo(tag,textFields);if(!info)return null;const {asset,character,glyph,glyphs,metrics:m,index,anim,baseScale,scale}=info,span=document.createElement('span');span.className='sddyx-unity-inline-sprite';span.dataset.spriteAsset=asset.name;
  span.style.cssText=`display:inline-block;position:relative;overflow:visible;width:${m.m_HorizontalAdvance*scale}px;height:${m.m_Height*scale}px;vertical-align:${(m.m_HorizontalBearingY-m.m_Height)*scale}px;`;
  const picture=document.createElement('span');picture.className='sddyx-unity-slice';picture.style.cssText='position:absolute;overflow:hidden';span.appendChild(picture);
  const record={span,picture,asset,glyphs,baseScale,baseTop:m.m_HorizontalBearingY*scale,node,start:index,end:Math.min(number(anim?.[2],index),asset.characters.length-1),rate:number(anim?.[3]),current:index,elapsed:0,firstFrame:true};
  paintInlineFrame(record,index);if(anim&&record.end>=index&&record.rate!==0){inlineAnimations.push(record);span.dataset.spriteAnimation=[record.start,record.end,record.rate].join(',');}return span;
 }
 function paintInlineFrame(record,index){
  const {span,picture,asset,glyphs,baseScale,baseTop}=record,character=asset.characters[index],glyph=glyphs.find(g=>g.m_Index===character?.m_GlyphIndex);if(!glyph)return;const m=glyph.m_Metrics,r=glyph.m_GlyphRect,scale=baseScale*number(glyph.m_Scale,1)*number(character.m_Scale,1);
  span.dataset.glyph=String(character.m_Name);span.dataset.spriteFrame=String(index);picture.style.left=m.m_HorizontalBearingX*scale+'px';picture.style.top=baseTop-m.m_HorizontalBearingY*scale+'px';picture.style.width=m.m_Width*scale+'px';picture.style.height=m.m_Height*scale+'px';discardImages(picture);picture.replaceChildren();crop(picture,{url:asset.url,textureSize:[asset.width,asset.height]},{x:r.m_X,y:asset.height-r.m_Y-r.m_Height,width:r.m_Width,height:r.m_Height});
 }
 function updateInlineSprites(dt){if(resourcePaused)return;
  // TMP_SpriteAnimator updates the quad and UV only; text advance stays fixed.
  // Its coroutine yields once, tests elapsed > interval, then resets elapsed.
  for(let i=inlineAnimations.length-1;i>=0;i--){const r=inlineAnimations[i];if(!r.span.isConnected||r.node.removed){inlineAnimations.splice(i,1);continue;}if(!r.node.visible){r.elapsed=0;r.current=r.start;r.firstFrame=true;continue;}if(r.firstFrame){r.firstFrame=false;continue;}if(r.elapsed>1/Math.abs(r.rate)){r.elapsed=0;paintInlineFrame(r,r.current);r.current=r.rate>0?(r.current<r.end?r.current+1:r.start):(r.current>r.start?r.current-1:r.end);}r.elapsed+=dt;}
 }
 function alignTextGeometry(g,n,font){
  const f=g.component.fields,ha=number(f.m_HorizontalAlignment,1),va=number(f.m_VerticalAlignment,256),special=ha===32||[2048,4096,8192].includes(va),inner=g.inner,el=g.element;
  if(!special){inner.style.transform='';return;}
  const key=JSON.stringify([fontEpoch,g.textKey,n.box.w,n.box.h,ha,va,el.style.fontSize,el.style.lineHeight,f.m_margin]);if(key===g.alignmentKey)return;inner.style.transform='';
  const matrix=nodeMatrix(n);if(Math.abs(matrix.b)>1e-7||Math.abs(matrix.c)>1e-7)return;const box=el.getBoundingClientRect(),sx=box.width/n.box.w,sy=box.height/n.box.h;if(!(sx>0&&sy>0))return;
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,baseline=null,capHeight=0;
  const include=(x1,y1,x2,y2)=>{minX=Math.min(minX,x1);minY=Math.min(minY,y1);maxX=Math.max(maxX,x2);maxY=Math.max(maxY,y2);};
  const walker=document.createTreeWalker(inner,NodeFilter.SHOW_TEXT);let text;
  while(text=walker.nextNode()){
   const style=getComputedStyle(text.parentElement);if(style.display==='none')continue;const size=parseFloat(style.fontSize)||36;measure.font=[style.fontStyle,style.fontWeight,style.fontSize,style.fontFamily].join(' ');const bounds=measure.measureText('Mg国'),ascent=bounds.fontBoundingBoxAscent??bounds.actualBoundingBoxAscent,descent=bounds.fontBoundingBoxDescent??bounds.actualBoundingBoxDescent;
   let index=0;for(const ch of Array.from(text.data)){const range=document.createRange();range.setStart(text,index);index+=ch.length;range.setEnd(text,index);if(/\s/u.test(ch))continue;const r=range.getBoundingClientRect();if(!r.width&&!r.height)continue;const glyph=measure.measureText(ch),x=(r.x-box.x)/sx,y=(r.y-box.y)/sy+(r.height/sy-ascent-descent)/2+ascent;if(baseline===null)baseline=y;const asset=Object.values(fonts).find(a=>a.family&&style.fontFamily.includes(a.family))||font,face=asset?.faceInfo;if(Math.abs(y-baseline)<size*.5)capHeight=Math.max(capHeight,face?number(face.m_CapLine)*size/number(face.m_PointSize,90)*number(face.m_Scale,1):glyph.actualBoundingBoxAscent);include(x-glyph.actualBoundingBoxLeft,y-glyph.actualBoundingBoxAscent,x+glyph.actualBoundingBoxRight,y+glyph.actualBoundingBoxDescent);}
  }
  for(const picture of inner.querySelectorAll('.sddyx-unity-inline-sprite .sddyx-unity-slice')){const r=picture.getBoundingClientRect();include((r.x-box.x)/sx,(r.y-box.y)/sy,(r.right-box.x)/sx,(r.bottom-box.y)/sy);}
  if(!Number.isFinite(minX))return;const margin=f.m_margin||{},dx=ha===32?(n.box.w+number(margin.x)-number(margin.z)-minX-maxX)/2:0;let dy=0;
  // TMP TextMeshProUGUI phase II: Geometry uses mesh extents; Baseline
  // uses the RectTransform midline; Capline uses the first-line font cap.
  if(va===4096)dy=(n.box.h+number(margin.y)-number(margin.w)-minY-maxY)/2;
  else if(va===2048&&baseline!==null)dy=n.box.h/2-baseline;
  else if(va===8192&&baseline!==null)dy=n.box.h/2+(capHeight-number(margin.y)-number(margin.w))/2-baseline;
  g.alignmentKey=key;inner.style.transform=`translate(${dx}px,${dy}px)`;g.inkAlignment={minX,maxX,minY,maxY,baseline,capHeight,dx,dy};
 }
 function paintText(g,n){if(presentationDepth++===0)restoreCoffeePresentation();try{
  const f=g.component.fields,el=g.element,inner=g.inner,local=fields(n,f=>f.m_Script?.fileID===1706830935&&f.m_Script?.guid==='6e29148d828b0575a0cfdd10bf89e0c5'),font=textFont(fonts,f),fontSize=preferredFontSize(f);
  let text=n.textOverride!==undefined?n.textOverride:(f.m_text??f.m_Text??'');
  if(n.textOverride===undefined&&options.translate&&local?.key)text=options.translate(local.key,text,n.source)??text;
  const textKey=JSON.stringify([fontEpoch,text,fontSize,f.m_fontAsset,f.m_characterSpacing,f.m_wordSpacing,n.box.w]);if(textKey!==g.textKey){g.autoSizeKey=undefined;g.text=text;g.textKey=textKey;repaintWithDecodedImages(inner,()=>{discardImages(inner);richText(inner,text,{fontSize,fontFamily:fontFamilyStack(fonts,font,locale),resolveFontFamily:font=>fontFamilyStack(fonts,font,locale),bold:!!(number(f.m_fontStyle)&1),italic:!!(number(f.m_fontStyle)&2),width:Math.max(0,n.box.w-number(f.m_margin?.x)-number(f.m_margin?.z)),lineRatio:number(font?.faceInfo?.m_LineHeight,90)/number(font?.faceInfo?.m_PointSize,90),characterSpacing:fontSize*number(f.m_characterSpacing)/100,wordSpacing:fontSize*number(f.m_wordSpacing)/100,resolveFont:name=>Object.values(fonts).find(a=>a.asset?.replace(/\\/g,'/').endsWith('/'+name+'.asset')||a.originalFamily===name),measureGlyph:(ch,state)=>{measure.font=`${state.italic?'italic ':''}${state.bold?'bold ':''}${state.size}px ${state.family||'serif'}`;return measure.measureText(ch);},renderSprite:(tag,state)=>inlineSprite(tag,{...f,m_fontSize:state.size},n)});});}
  const canvasTint=graphicCanvasColor(g,n);el.style.filter=tint(canvasTint,g);g.graphicAlpha=1;el.style.opacity=canvasTint.a;el.style.fontSize=fontSize+'px';el.style.fontFamily=fontFamilyStack(fonts,font,locale)||'serif';el.style.color=rgba(f.m_fontColor||f.m_Color);el.style.fontWeight=(number(f.m_fontStyle)&1)?'bold':'normal';el.style.fontStyle=(number(f.m_fontStyle)&2)?'italic':'normal';
  const ha=number(f.m_HorizontalAlignment,1),va=number(f.m_VerticalAlignment,256);el.style.textAlign=(ha===32||(ha&2))?'center':(ha&4)?'right':(ha&8)?'justify':'left';el.style.justifyContent=(va&512)||(va&4096)?'center':(va&1024)?'flex-end':'flex-start';
  const characterSpacing=fontSize*number(f.m_characterSpacing)/100;el.style.letterSpacing=characterSpacing+'px';
  // TMP tests the current glyph's advance before its trailing spacing. CSS
  // reserves that final spacing in each line box. Compensate only the text
  // line box; the source RectTransform, preferred width and wrapping stay intact.
  inner.style.width=characterSpacing?`calc(100% ${characterSpacing<0?'-':'+'} ${Math.abs(characterSpacing)}px)`:'100%';g.trailingAdvance=characterSpacing;el.style.wordSpacing=(fontSize*number(f.m_wordSpacing)/100)+'px';el.style.lineHeight=String((font?.faceInfo?number(font.faceInfo.m_LineHeight)/Math.max(1,number(font.faceInfo.m_PointSize)):1)+number(f.m_lineSpacing)/100);el.style.whiteSpace=([0,3].includes(f.m_TextWrappingMode)||f.m_enableWordWrapping===0)?'pre':'pre-wrap';
  const margin=f.m_margin||{};el.style.padding=`${number(margin.y)}px ${number(margin.z)}px ${number(margin.w)}px ${number(margin.x)}px`;el.style.overflow=[1,3,4].includes(f.m_overflowMode)?'hidden':'visible';
  const onlySprites=!/<indent\s*=/i.test(String(text))&&/<sprite/i.test(String(text))&&!String(text).replace(/<[^>]*>/g,'').trim();if(onlySprites)inner.style.width='100%';inner.style.display=onlySprites?'flex':'';inner.style.alignItems=onlySprites?'center':'';inner.style.justifyContent=onlySprites?(el.style.textAlign==='right'?'flex-end':el.style.textAlign==='center'?'center':'flex-start'):'';
  autoSizeText(g,n,fontSize,characterSpacing,textKey,text);
  resumeImages(inner);alignTextGeometry(g,n,font);n.element.setAttribute('aria-label',String(text).replace(/<[^>]*>/g,''));paintRectMask(g,n);
 }finally{if(--presentationDepth===0)syncCoffeePresentation();}}
 // Reuse only the completed browser autosize search, never text painting,
 // clipping, tint, alignment, or sprite animation. Hidden/unmounted text is
 // not measurable; inline sprite quads may change scroll overflow each frame.
 function alignTextIndents(g,n){
  const inner=g.inner,el=g.element;if(!/<indent\s*=/i.test(String(g.text))||el.style.textAlign!=='left')return;
  if(!n.visible||!el.isConnected||!inner.isConnected){g.indentLayoutKey=undefined;return;}
  const key=JSON.stringify([g.textKey,el.style.fontSize,el.style.fontFamily,el.style.letterSpacing,el.style.whiteSpace,n.box.w]);if(g.indentLayoutKey===key)return;
  if(!el.getClientRects().length){g.indentLayoutKey=undefined;return;}
  const spans=inner.querySelectorAll('[data-tmp-indent]'),offset=element=>{let x=0;for(let p=element;p;p=p.offsetParent)x+=p.offsetLeft;return x;},origin=offset(inner);
  for(const span of spans){const delta=Number(span.dataset.tmpIndent)-(offset(span)-origin);if(Math.abs(delta)>.01)span.style.marginLeft=((parseFloat(span.style.marginLeft)||0)+delta)+'px';}
  g.indentLayoutKey=key;
 }
 function autoSizeText(g,n,fontSize,characterSpacing,textKey,text){
  const f=g.component.fields,el=g.element,inner=g.inner;
  if(!f.m_enableAutoSizing||!n.box.w||!n.box.h){g.autoSizeKey=undefined;alignTextIndents(g,n);return;}
  const sizeMax=Math.min(number(f.m_fontSizeMax,fontSize),fontSize),min=number(f.m_fontSizeMin,18),cacheable=n.visible===true&&el.isConnected&&inner.isConnected&&!/<sprite(?:\s|=|>)/i.test(String(text));
  const key=cacheable?JSON.stringify([textLayoutEpoch,fontEpoch,locale,textKey,n.box.w,n.box.h,sizeMax,min,el.style.fontFamily,el.style.fontWeight,el.style.fontStyle,el.style.letterSpacing,el.style.wordSpacing,el.style.lineHeight,el.style.whiteSpace,el.style.padding,el.style.textAlign,el.style.justifyContent,el.style.overflow,el.style.width,el.style.height,inner.style.width,inner.style.display,inner.style.alignItems,inner.style.justifyContent,inner.style.transform]):undefined;
  if(cacheable&&g.autoSizeKey===key){el.style.fontSize=g.autoSizeFontSize;alignTextIndents(g,n);return;}
  let size=sizeMax;el.style.fontSize=size+'px';alignTextIndents(g,n);
  while(size>min&&(inner.scrollWidth>n.box.w+characterSpacing+1||inner.scrollHeight>n.box.h+1)){size=Math.max(min,size-2);el.style.fontSize=size+'px';alignTextIndents(g,n);}
  g.autoSizeKey=key;g.autoSizeFontSize=el.style.fontSize;
 }
 function rectMaskGeometry(g,n){return{width:parseFloat(g.element.style.width)||n.box.w,height:parseFloat(g.element.style.height)||n.box.h,left:parseFloat(g.element.style.left)||0,top:parseFloat(g.element.style.top)||0,offsetX:g.shadowOffset?.x||0,offsetY:g.shadowOffset?.y||0};}
 function paintRectMask(g,n){const material=g.materialOverride||materials[g.component.fields.m_sharedMaterial?.guid],state=rectMaskShadow.clipState(n,g,{nodeMatrix,pixelScale:rectMaskPixelScale,materialSoftness:{x:material?.floats?._MaskSoftnessX,y:material?.floats?._MaskSoftnessY}});rectMaskShadow.applyDOMMask(g,state,rectMaskGeometry(g,n));rectMaskShadow.applyDOMHit(g,n,{nodeMatrix});}
 function syncShadowGraphics(n){const masked=rectMaskShadow.raycastMasks(n).length>0;n.element.dataset.rectMaskHits=String(masked);for(const g of n.graphics){if(g.shadowSource)rectMaskShadow.syncShadowGraphic(g);if(masked&&g.component.fields.m_RaycastTarget===1&&!g.hitElement){const hit=document.createElement('div');hit.className='sddyx-unity-raycast';hit.dataset.componentId=String(g.component.fileID);g.hitElement=hit;g.element.after(hit);}}}
 function initGraphics(n){
  if(n.graphicsInitialized)return;n.graphicsInitialized=true;
  const fragment=document.createDocumentFragment();
  for(const c of n.components){const f=c.fields;let kind=null;
   if('m_Sprite'in f&&'m_Color'in f)kind='image';else if('m_text'in f||('m_Text'in f&&'m_FontData'in f))kind='text';else if('m_Texture'in f&&'m_UVRect'in f)kind='raw';
   if(!kind)continue;const el=document.createElement('div');el.className='sddyx-unity-graphic sddyx-unity-'+(kind==='text'?'text':'image');el.dataset.componentId=String(c.fileID);
   const g={component:c,element:el,kind};el.dataset.raycast=String(f.m_RaycastTarget===1);
   if(kind==='image')g.sprite=resolveSprite(f.m_Sprite)||n.source.images?.find(i=>i.componentID===c.fileID)?.sprite;
   if(kind==='text'){const inner=document.createElement('div');inner.className='sddyx-unity-text-inner';el.appendChild(inner);g.inner=inner;}
   if(kind==='raw'){g.raw=true;const media=textureRecord(f.m_Texture);if(media){g.sprite=rawSprite(media,f.m_UVRect);g.kind='image';c.fields.m_Sprite=g.sprite;}else el.dataset.unsupported='render-texture';}
   // BaseMeshEffect.GetComponent<Graphic> modifies only the first owning
   // Graphic; copied triangle stream draws before its original, never children.
   if(!n.graphics.length&&kind==='image')for(const effect of n.components.filter(rectMaskShadow.isShadow)){const shadow=rectMaskShadow.createShadowGraphic(g,effect,document);n.graphics.push(shadow);fragment.appendChild(shadow.element);}
   n.graphics.push(g);fragment.appendChild(el);
   if(f.m_RaycastPadding&&Object.values(f.m_RaycastPadding).some(v=>v!==0)){const hit=document.createElement('div');hit.className='sddyx-unity-raycast';hit.dataset.componentId=String(c.fileID);g.hitElement=hit;fragment.appendChild(hit);}

  }
  n.element.insertBefore(fragment,n.element.firstChild);
 }
 // Toggle.PlayEffect acts on the referenced Graphic's CanvasRenderer alpha,
 // leaving the GameObject, source color and all child graphics unchanged.
 function playToggle(n,value,opts={}){
  const component=n.components.find(c=>'m_IsOn'in c.fields&&'toggleTransition'in c.fields),toggle=component?.fields;if(!toggle)return false;
  const changed=!!toggle.m_IsOn!==!!value;toggle.m_IsOn=!!value;if(!changed&&!opts.instant)return true;
  const target=n.scope.records.find(other=>other.components.some(c=>c.fileID===toggle.graphic?.fileID)),graphic=target?.components.find(c=>c.fileID===toggle.graphic.fileID);
  if(target&&graphic)visualModifiers.crossFadeAlpha(target,graphic,value?1:0,{duration:opts.instant||toggle.toggleTransition===0?0:.1,ignoreTimeScale:true});
  if(changed&&opts.notify!==false)n.element.dispatchEvent(new CustomEvent('unity:toggle',{bubbles:true,detail:{value:!!value,component,node:n,path:n.path}}));
  flushCanvasColors();return true;
 }
 function updateToggles(unscaledDelta,scaledDelta=unscaledDelta){if(resourcePaused)return;visualModifiers.update(unscaledDelta,scaledDelta);flushCanvasColors();}
 function dispatchLifecycle(subscribers,event){let failed=false,firstError;for(const record of [...subscribers]){if(!subscribers.has(record))continue;if(event.reason!=='destroy'&&(event.node.removed||event.node.destroyNotified||event.reason==='visibility'&&event.node.notifiedActive!==event.active))break;try{record.fn(event);}catch(error){
  // Finish independent observers before propagating an ordinary setup error.
  // Destroy is cleanup-only; its failures remain explicitly reported instead.
  reportLifecycleError(error,event,event.reason==='destroy');if(event.reason!=='destroy'&&!failed){failed=true;firstError=error;}
 }}if(failed)throw firstError;}
 function reportLifecycleError(error,event,report){const errors=diagnostics.lifecycleErrors||(diagnostics.lifecycleErrors=[]),entry={path:event.node.path,reason:event.reason,message:String(error?.message||error)};if(errors.length>=200){errors.shift();diagnostics.lifecycleErrorsDropped=(diagnostics.lifecycleErrorsDropped||0)+1;}errors.push(entry);if(!report)return;try{if(global.reportError)global.reportError(error);else global.console?.error?.(error);}catch(reportingError){entry.reportingError=String(reportingError?.message||reportingError);try{global.console?.error?.(error,reportingError);}catch(consoleError){entry.consoleError=String(consoleError?.message||consoleError);}}}
 function notifyComponentLifecycle(node,component,previous,reason='enabled'){if(node.removed||reason==='destroy'&&node.componentDestroyNotified)return;if(reason==='destroy')node.componentDestroyNotified=true;const event={node,element:node.element,component,previous,enabled:component?component.fields.m_Enabled!==0:false,reason};dispatchLifecycle(componentLifecycleSubscribers,event);}
 function deliverActiveNotification(event){const n=event.node;if(n.removed||n.destroyNotified)return;if(event.reason==='destroy')n.destroyNotified=true;if(event.reason==='visibility'){let effective=sourceAncestorsActive(n);for(let p=n;p&&effective;p=p.parent)effective=!!p.active;if(effective!==event.active)return;}if(event.reason!=='destroy'&&n.notifiedActive===event.active)return;n.notifiedActive=event.active;dispatchLifecycle(activeSubscribers,event);}
 function activeChanged(n,previous,reason='visibility'){if(reason!=='destroy'&&!!previous===!!n.visible)return;if(n.notifiedActive===undefined)n.notifiedActive=!!previous;const event={node:n,element:n.element,active:!!n.visible,activeSelf:!!n.active,previous:!!previous,reason};if(refreshing&&reason==='visibility')activeNotifications.push(event);else deliverActiveNotification(event);}
 // Unity activation sees the complete active hierarchy. Commit the browser's
 // visibility/layout first, then notify synchronously in the same preorder.
 // Reentrant callbacks may deactivate a not-yet-notified descendant/sibling;
 // discard those stale transitions and retain its last delivered active state.
 // Native OnEnable/OnDisable targets must finish their layout and DOM commit
 // before public activation/focus subscribers inspect any source rectangles.
 // Authored activation dependency graph is acyclic; unchanged activeSelf writes
 // are already gated. No changed native transition is discarded to break loops.
 function settleNativeLayout(){while(nativeActiveNodes.size||canvasDirtyNodes.size){const nodes=[...new Set([...nativeActiveNodes,...[...canvasDirtyNodes].filter(n=>n.visible)])].filter(n=>!n.removed);nativeActiveNodes.clear();canvasDirtyNodes.clear();if(!nodes.length)continue;const selected=new Set();for(let n of nodes){for(let p=n.parent;p;p=p.parent)if(p.layout||p.scrollLayout||fields(p,f=>('m_HorizontalFit'in f||'MaxHeight'in f)&&f.m_Enabled!==0))n=p;selected.add(n);}const affected=[...selected].filter(n=>{for(let p=n.parent;p;p=p.parent)if(selected.has(p))return false;return true;});for(let pass=0;pass<2;pass++)for(const n of affected){if(!n.canvasRoot)n.box=rect(n,n.parent?.box.w??width,n.parent?.box.h??height);layoutChildren(n);}const descendants=[];const collect=n=>{descendants.push(n);for(const c of n.children)collect(c);};affected.forEach(collect);syncFitters(descendants);const previousAgain=refreshAgain;refreshAgain=false;for(const n of affected){layoutChildren(n);render(n,n.parent?.visible??true);}if(refreshAgain)for(const n of affected)nativeActiveNodes.add(n);refreshAgain=previousAgain;const alphaAncestors=new Set();for(const n of affected)for(let p=n.parent;p;p=p.parent)if(p.alphaRaycast&&p.visible)alphaAncestors.add(p);for(const n of alphaAncestors)updateAlphaRaycast(n);}}
 function flushActiveNotifications(){let failed=false,firstError,firstEvent;while(activeNotifications.length||nativeActiveNodes.size||canvasDirtyNodes.size){try{settleNativeLayout();}catch(error){if(failed){reportLifecycleError(error,firstEvent,true);throw firstError;}throw error;}const events=activeNotifications.splice(0);for(let index=0;index<events.length;index++){const event=events[index];try{settleNativeLayout();}catch(error){activeNotifications.unshift(...events.slice(index));if(failed){reportLifecycleError(error,event,true);throw firstError;}throw error;}try{deliverActiveNotification(event);}catch(error){if(!failed){failed=true;firstError=error;firstEvent=event;}}}}if(failed)throw firstError;}

 function sourceAncestorsActive(n){
  // Top canvases are DOM roots even when Unity parents them below non-Canvas
  // objects. Those omitted source ancestors still govern activeInHierarchy.
  if(n.parent||n.scope.instance)return true;
  for(let source=n.scope.data.nodes[n.source.parent];source;source=n.scope.data.nodes[source.parent]){
   const runtime=n.scope.byID.get(String(source.id));if(runtime?!runtime.active:source.active===0)return false;
  }
  return true;
 }
 function render(n,visible){if(presentationDepth++===0)restoreCoffeePresentation();try{
  // Consume only when actual rendering starts. Changes made by reentrant
  // lifecycle/animation callbacks below stay pending for their own settlement.
  animatedNodes.delete(n);diagnostics.layoutStats.renderedNodes++;
  const wasVisible=n.visible;visible=visible&&n.active&&sourceAncestorsActive(n);if(n.renderedOnce&&wasVisible===false&&!visible)return;n.renderedOnce=true;n.element.hidden=!visible;if(n.visible&&!visible&&n.animator){const a=n.components.find(c=>c.type==='Animator');if(!a?.fields.m_KeepAnimatorStateOnDisable)n.resetAnimatorOnEnable=true;}if(visible&&n.resetAnimatorOnEnable){n.resetAnimatorOnEnable=false;n.animator?.resetState?.({sample:true});refreshAgain=true;}n.visible=visible;if(wasVisible!==visible)for(const g of n.graphics)g.autoSizeKey=undefined;if(wasVisible&&!visible&&preparedParticleResources.has(n))releasePreparedParticles(new Set([n]),{visibilityOnly:true});visualModifiers.lifecycle(n,visible);if(visible&&!wasVisible){const toggle=fields(n,f=>'m_IsOn'in f&&'toggleTransition'in f&&f.m_Enabled!==0);if(toggle)playToggle(n,toggle.m_IsOn,{instant:true});}activeChanged(n,wasVisible);if(wasVisible&&!visible)for(const g of n.graphics){g.shader?.suspend?.();releaseTint(g);blackShadowSprites.release(g);g.element.style.filter='';if(!global.SDDYX_RESIDENT?.ready)discardImages(g.element);}
  const b=n.box,t=n.transform,p=vec(t.m_Pivot,.5),scale=vec(t.m_LocalScale,1),q=t.m_LocalRotation;let angle=number(t.m_LocalEulerAnglesHint?.z);if(q&&(q.z||q.x||q.y))angle=Math.atan2(2*(q.w*q.z+q.x*q.y),1-2*(q.y*q.y+q.z*q.z))*180/Math.PI;
  n.element.style.left=b.x+'px';n.element.style.top=b.y+'px';n.element.style.width=Math.max(0,b.w)+'px';n.element.style.height=Math.max(0,b.h)+'px';n.element.style.transformOrigin=`${p.x*100}% ${(1-p.y)*100}%`;
  n.element.style.transform=n.canvasRoot||n.worldProjection?(n.projection?`scale(${n.projection})`:'none'):`rotate(${-angle}deg) scale(${scale.x},${scale.y})`;
  if(n.canvasRoot||n.worldProjection)n.element.style.transformOrigin='0 0';
  const pop=visible&&fields(n,f=>f.pivotXRange&&f.m_Enabled!==0);if(pop&&(!wasVisible||n.popValidationPending)){n.popValidationPending=false;const point=nodeMatrix(n).transformPoint({x:b.w*p.x,y:b.h*(1-p.y)}),stageBox=stage.getBoundingClientRect(),hostBox=host.getBoundingClientRect(),screenX=stageBox.x-hostBox.x+point.x*stageBox.width/width,rate=clamp(screenX/Math.max(1,host.clientWidth)),next=number(pop.pivotXRange.x,.2)+(number(pop.pivotXRange.y,.8)-number(pop.pivotXRange.x,.2))*rate;
   if(Math.abs(next-p.x)>1e-9){const min=vec(t.m_AnchorMin,.5),max=vec(t.m_AnchorMax,.5);t.m_Pivot={...p,x:next};t.m_AnchoredPosition={...t.m_AnchoredPosition,x:number(t.m_AnchoredPosition?.x)-(n.parent?.box.w??width)*(max.x-min.x)*(next-p.x)};n.box=rect(n,n.parent?.box.w??width,n.parent?.box.h??height);n.element.style.left=n.box.x+'px';n.element.style.top=n.box.y+'px';n.element.style.transformOrigin=`${next*100}% ${(1-p.y)*100}%`;}
  }
  const group=n.components.find(c=>c.type==='CanvasGroup'&&enabled(c));n.element.style.opacity=n.alphaOverride??group?.fields.m_Alpha??1;n.element.dataset.raycastBlocked=String(group?.fields.m_BlocksRaycasts===0);
  if(visible){initGraphics(n);syncShadowGraphics(n);n.element.dataset.paddedRaycast=String(n.graphics.some(g=>g.hitElement));for(const g of n.graphics){const raycast=g.component.fields.m_RaycastTarget===1;g.element.dataset.raycast=String(raycast&&!g.hitElement);if(g.hitElement){const pad=g.component.fields.m_RaycastPadding||{};g.hitElement.hidden=!raycast||!enabled(g.component);Object.assign(g.hitElement.style,{left:number(pad.x)+'px',bottom:number(pad.y)+'px',right:number(pad.z)+'px',top:number(pad.w)+'px'});}g.element.hidden=!enabled(g.component)||(n.hideMaskGraphic&&g.kind==='image');if(!g.element.hidden){if(g.kind==='text')paintText(g,n);else if(g.kind==='image')paintImage(g,n);}}}
  observeResourceMasks(n);for(const c of n.children)render(c,visible);for(const p of n.particles||[])presentWorldParticle(n,p);if(visible)updateAlphaRaycast(n);
 }catch(error){animatedNodes.add(n);throw error;}finally{if(--presentationDepth===0)syncCoffeePresentation();}}
 function textMetrics(n,tf,widthHint){
  const local=fields(n,f=>f.m_Script?.fileID===1706830935&&f.m_Script?.guid==='6e29148d828b0575a0cfdd10bf89e0c5'),font=textFont(fonts,tf),fontSize=preferredFontSize(tf),margin=tf.m_margin||{};let text=n.textOverride??tf.m_text??'';
  if(n.textOverride===undefined&&options.translate&&local?.key)text=options.translate(local.key,text,n.source)??text;
  const wrap=![0,3].includes(tf.m_TextWrappingMode)&&tf.m_enableWordWrapping!==0,wrapWidth=Math.max(0,(widthHint||n.box.w||number(n.transform.m_SizeDelta?.x)||n.parent?.box.w||0)-number(margin.x)-number(margin.z)),lineRatio=number(font?.faceInfo?.m_LineHeight,90)/number(font?.faceInfo?.m_PointSize,90),base={size:fontSize,bold:!!(number(tf.m_fontStyle)&1),italic:!!(number(tf.m_fontStyle)&2),indent:0,space:null,cspace:0,family:fontFamilyStack(fonts,font,locale)};
  const key=JSON.stringify([fontEpoch,text,tf.m_fontAsset,base,tf.m_characterSpacing,tf.m_wordSpacing,tf.m_lineSpacing,tf.m_paragraphSpacing,wrapWidth,wrap,margin,tf.m_spriteAsset]);if(n.textMeasure?.key===key)return n.textMeasure.value;
  const stack=[{tag:'',style:base}],glyphs=[];let style=base;const unit=(arg,percentBase)=>{if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:px|em|%)?$/.test(arg))return null;const value=parseFloat(arg);return arg.endsWith('em')?value*style.size:arg.endsWith('%')?(percentBase===undefined?null:value*percentBase/100):value;};
  const append=(ch,advance,height,spacing=0)=>glyphs.push({ch,advance,height,spacing,indent:style.indent});
  for(const part of String(text).replace(/<spriteanim\s*=/gi,'<sprite anim=').split(/(<[^>]+>)/g)){
   if(/^<sprite(?:\s|=|>)/i.test(part)){const info=spriteInfo(part,{...tf,m_fontSize:style.size});if(info)append('\ufffc',info.metrics.m_HorizontalAdvance*info.scale,info.metrics.m_Height*info.scale);continue;}
   const tag=/^<\s*(\/?)([a-z-]+|#[0-9a-f]+)(?:\s*=\s*([^>]+))?\s*>$/i.exec(part);
   if(tag){const name=tag[2].toLowerCase(),arg=(tag[3]||'').replace(/^['"]|['"]$/g,'');if(tag[1]){for(let i=stack.length-1;i>0;i--)if(stack[i].tag===name){stack.length=i;break;}style=stack.at(-1).style;if(name==='indent')glyphs.push({indentOnly:style.indent});continue;}if(name==='br'){append('\n',0,style.size*lineRatio);continue;}const next={...style};if(name==='size'&&/^[+-]?[\d.]+(?:px|em|%)?$/.test(arg)){const amount=parseFloat(arg);next.size=arg.endsWith('%')?fontSize*amount/100:arg.endsWith('em')?fontSize*amount:/^[+-]/.test(arg)?fontSize+amount:amount;}else if(name==='b')next.bold=true;else if(name==='i')next.italic=true;else if(name==='font'){const asset=Object.values(fonts).find(a=>a.asset?.replace(/\\/g,'/').endsWith('/'+arg+'.asset')||a.originalFamily===arg);if(asset?.family)next.family=fontFamilyStack(fonts,asset,locale);}else if(name==='indent'){next.indent=unit(arg,wrapWidth)??style.indent;glyphs.push({position:next.indent});}else if(name==='mspace')next.space=unit(arg)??style.space;else if(name==='cspace')next.cspace=unit(arg)??0;else if(name==='space'){const advance=unit(arg);if(advance!==null)append('\u200b',advance,style.size*lineRatio);continue;}stack.push({tag:name,style:next});style=next;continue;}
   measure.font=`${style.italic?'italic ':''}${style.bold?'bold ':''}${style.size}px ${style.family||'serif'}`;
   for(const ch of Array.from(part)){const spacing=fontSize*number(tf.m_characterSpacing)/100+style.cspace+(ch===' '?fontSize*number(tf.m_wordSpacing)/100:0);append(ch,ch==='\n'?0:(style.space??measure.measureText(ch).width)+spacing,style.size*lineRatio,spacing);}
  }
  let natural=0,lineWidth=0,used=0,blockHeight=0,lineHeight=fontSize*lineRatio,lineIndent=0,lastSpacing=0;
  const finish=paragraph=>{natural=Math.max(natural,lineWidth-lastSpacing);lineWidth=0;lastSpacing=0;blockHeight+=lineHeight+fontSize*(number(tf.m_lineSpacing)+(paragraph?number(tf.m_paragraphSpacing):0))/100;used=0;lineHeight=fontSize*lineRatio;lineIndent=0;};
  for(const item of glyphs){if(item.position!==undefined){used=lineWidth=lineIndent=item.position;lastSpacing=0;continue;}if(item.indentOnly!==undefined){lineIndent=item.indentOnly;continue;}if(item.ch==='\n'){finish(true);continue;}if(!used){lineIndent=item.indent;used=lineWidth=lineIndent;}lineWidth+=item.advance;lastSpacing=item.spacing;natural=Math.max(natural,lineWidth-lastSpacing);if(wrap&&wrapWidth&&used>lineIndent&&used+item.advance-item.spacing>wrapWidth+.0001){blockHeight+=lineHeight+fontSize*number(tf.m_lineSpacing)/100;used=item.indent;lineHeight=fontSize*lineRatio;}used+=item.advance;lineHeight=Math.max(lineHeight,item.height);}
  blockHeight+=lineHeight;const value={width:Math.max(natural,lineWidth-lastSpacing)+number(margin.x)+number(margin.z),height:blockHeight+number(margin.y)+number(margin.w)};n.textMeasure={key,value};return value;
 }
 function flowLayout(n,widthHint){
  const kids=n.children.filter(c=>c.active&&!c.ignoreLayout);
  return global.SDDYXFlowLayout.calculate({fields:n.layout.fields,width:widthHint??n.box.w,height:n.box.h,children:kids.map(c=>{const le=fields(c,f=>'m_IgnoreLayout'in f&&f.m_Enabled!==0);return{minWidth:Math.max(0,number(le?.m_MinWidth)),minHeight:Math.max(0,number(le?.m_MinHeight)),preferredWidth:desired(c,0),preferredHeight:desired(c,1)};})});
 }
 function flowChildWidth(n,f,availableWidth,preferredWidth){
  const scale=f.m_ChildScaleWidth?number(n.transform.m_LocalScale?.x,1):1,available=Math.max(0,availableWidth)/(scale||1);
  return f.m_ChildForceExpandWidth||flexible(n,0)>0?available:Math.min(preferredWidth,available);
 }
 function desired(n,axis,widthHint){
  const k=axis?'y':'x',cap=axis?'Height':'Width',le=fields(n,f=>'m_IgnoreLayout'in f&&f.m_Enabled!==0),size=number(n.transform.m_SizeDelta?.[k]);
  const maxPreferred=fields(n,f=>f.m_Script?.fileID===1120764539&&f.m_Enabled!==0),pref=le?.['m_Preferred'+cap];if(pref>=0&&!maxPreferred)return pref;
  const group=n.layout;if(group){const f=group.fields,p=f.m_Padding||{},pad=axis?number(p.m_Top)+number(p.m_Bottom):number(p.m_Left)+number(p.m_Right);const kids=n.children.filter(c=>c.active&&!c.ignoreLayout),isMain=group.axis===axis;
   if(group.flow)return flowLayout(n,widthHint).metrics[axis?'preferredHeight':'preferredWidth'];
   if(group.grid){const cell=number(f.m_CellSize?.[k]),count=axis?Math.ceil(kids.length/Math.max(1,number(f.m_ConstraintCount,1))):Math.min(kids.length,number(f.m_ConstraintCount,kids.length));return pad+count*cell+Math.max(0,count-1)*number(f.m_Spacing?.[k]);}
   const availableWidth=widthHint||n.box.w||number(n.transform.m_SizeDelta?.x)||n.parent?.box.w;const sizes=kids.map(c=>desired(c,axis,c.layout?.flow&&group.axis===1&&axis===1&&f.m_ChildControlWidth?flowChildWidth(c,f,availableWidth-number(p.m_Left)-number(p.m_Right),desired(c,0)):f.m_ChildControlWidth?availableWidth-number(p.m_Left)-number(p.m_Right):(number(c.transform.m_SizeDelta?.x)||availableWidth))*((f['m_ChildScale'+cap])?number(c.transform.m_LocalScale?.[k],1):1));return pad+(isMain?sizes.reduce((a,b)=>a+b,0)+Math.max(0,kids.length-1)*number(f.m_Spacing):Math.max(0,...sizes));
  }
  const tf=fields(n,f=>'m_text'in f);
  if(tf){const metrics=textMetrics(n,tf,widthHint),preferred=metrics[axis?'height':'width'],maximum=number(maxPreferred?.[axis?'maxHeight':'maxWidth']),result=Math.max(number(le?.['m_Min'+cap],0),Math.ceil(preferred*64)/64),limited=maximum>0?Math.min(result,maximum):result;if(maxPreferred&&le){if(le['m_Preferred'+cap]!==limited&&n.parent)n.parent.popValidationPending=true;le['m_Preferred'+cap]=limited;}return limited;}
  const image=fields(n,f=>'m_Sprite'in f);if(image){const sprite=resolveSprite(image.m_Sprite);if(sprite?.rect)return Math.max(number(le?.['m_Min'+cap],0),sprite.rect[axis?'height':'width']/imagePixelsPerUnit(n,sprite));}
  return Math.max(number(le?.['m_Min'+cap],0),size);
 }
 function flexible(n,axis){
  const cap=axis?'Height':'Width',le=fields(n,f=>'m_IgnoreLayout'in f&&f.m_Enabled!==0),explicit=le?.['m_Flexible'+cap];if(explicit>=0)return explicit;
  if(!n.layout||n.layout.grid||n.layout.flow)return 0;const f=n.layout.fields,kids=n.children.filter(c=>c.active&&!c.ignoreLayout),values=kids.map(c=>Math.max(f['m_ChildForceExpand'+cap]?1:0,f['m_ChildControl'+cap]?flexible(c,axis):0));
  return n.layout.axis===axis?values.reduce((a,b)=>a+b,0):Math.max(0,...values);
 }
 function applyAspectRatioFitter(n,pw,ph){
  const helper=global.SDDYXAspectRatioFitter,component=helper&&n.components.find(c=>helper.isAspectRatioFitter(c));if(!component)return;
  let active=true;for(let p=n;p;p=p.parent)if(!p.active||(!p.parent&&!sourceAncestorsActive(p))){active=false;break;}
  const canvas=n.components.find(c=>c.type==='Canvas'),result=helper.update({fields:component.fields,transform:n.transform,parentWidth:pw,parentHeight:ph,hasParent:!!n.parent,parentIsRectTransform:n.parent?.source.transformType==='RectTransform',active,canvas:canvas?{isRootCanvas:!!n.canvasRoot,renderMode:number(canvas.fields.m_RenderMode)}:null});
  if(!n.aspectFitterStarted&&active&&enabled(component)){n.aspectFitterStarted=true;if(result.shouldDisableOnStart){component.fields.m_Enabled=0;return;}}
  if(result.driven.length)n.transform=result.transform;
 }
 function rect(n,pw,ph){
  if(n.canvasRoot){projectCanvas(n);return n.box;}
  if(n.worldProjection){const camera=cameraState(n.worldProjection.camera),scale=height/(2*number(camera.fields['orthographic size'],5)),position=sourceWorldPosition(n.source);n.projection=scale;return{x:width/2+(position.x-camera.position.x)*scale,y:height/2-(position.y-camera.position.y)*scale,w:0,h:0};}
  if(n.source.transformType==='Transform'){const p=vec(n.parent?.transform.m_Pivot,.5),pos=vec(n.transform.m_LocalPosition);return{x:pw*p.x+pos.x,y:ph*(1-p.y)-pos.y,w:0,h:0};}
  applyAspectRatioFitter(n,pw,ph);
  const t=n.transform,min=vec(t.m_AnchorMin,.5),max=vec(t.m_AnchorMax,.5),pivot=vec(t.m_Pivot,.5),delta=vec(t.m_SizeDelta),pos=vec(t.m_AnchoredPosition||t.m_LocalPosition);
  let w=pw*(max.x-min.x)+delta.x,h=ph*(max.y-min.y)+delta.y;
  const fit=fields(n,f=>'m_HorizontalFit'in f&&f.m_Enabled!==0);if(fit?.m_HorizontalFit)w=desired(n,0);if(fit?.m_VerticalFit)h=desired(n,1);
  return{x:pw*(min.x+(max.x-min.x)*pivot.x)+pos.x-w*pivot.x,y:ph*(1-min.y-(max.y-min.y)*pivot.y)-pos.y-h*(1-pivot.y),w:Math.max(0,w),h:Math.max(0,h)};
 }
 function layoutChildren(n){
  for(const c of n.children)c.box=rect(c,n.box.w,n.box.h);
  if(n.layout){const f=n.layout.fields,p=f.m_Padding||{},kids=n.children.filter(c=>c.active&&!c.ignoreLayout);if(f.m_ReverseArrangement)kids.reverse();
   const alignment=number(f.m_ChildAlignment),ax=alignment%3/2,ay=Math.floor(alignment/3)/2;
   const pad=[number(p.m_Left),number(p.m_Top),number(p.m_Right),number(p.m_Bottom)],available=[n.box.w-pad[0]-pad[2],n.box.h-pad[1]-pad[3]];
   if(n.layout.flow){const result=flowLayout(n);kids.forEach((c,i)=>{if(result.rects[i])c.box=result.rects[i];});
   }else if(n.layout.grid){
    const cell=vec(f.m_CellSize,100),space=vec(f.m_Spacing),columnLimit=f.m_Constraint===1?Math.max(1,f.m_ConstraintCount):f.m_Constraint===2?Math.ceil(kids.length/Math.max(1,f.m_ConstraintCount)):Math.max(1,Math.floor((available[0]+space.x+.001)/(cell.x+space.x))),rowLimit=f.m_Constraint===2?Math.max(1,f.m_ConstraintCount):f.m_Constraint===1?Math.ceil(kids.length/columnLimit):Math.max(1,Math.floor((available[1]+space.y+.001)/(cell.y+space.y)));
    // Unity GridLayoutGroup.SetCellsAlongAxis centers only occupied rows/columns.
    const cols=f.m_StartAxis===1?Math.min(columnLimit,Math.ceil(kids.length/Math.max(1,rowLimit))):Math.min(columnLimit,kids.length),rows=f.m_StartAxis===1?Math.min(rowLimit,kids.length):Math.min(rowLimit,Math.ceil(kids.length/Math.max(1,columnLimit))),main=f.m_StartAxis===1?Math.max(1,rowLimit):Math.max(1,columnLimit);
    const startX=pad[0]+(available[0]-(cols*cell.x+Math.max(0,cols-1)*space.x))*ax,startY=pad[1]+(available[1]-(rows*cell.y+Math.max(0,rows-1)*space.y))*ay;
    kids.forEach((c,i)=>{let x=f.m_StartAxis===1?Math.floor(i/main):i%main,y=f.m_StartAxis===1?i%main:Math.floor(i/main);if(f.m_StartCorner%2)x=cols-1-x;if(f.m_StartCorner>=2)y=rows-1-y;c.box={x:startX+x*(cell.x+space.x),y:startY+y*(cell.y+space.y),w:cell.x,h:cell.y};});
   }else{
    const axis=n.layout.axis,spacing=number(f.m_Spacing),sizes=kids.map(c=>[c.box.w,c.box.h]),scales=kids.map(c=>[f.m_ChildScaleWidth?number(c.transform.m_LocalScale?.x,1):1,f.m_ChildScaleHeight?number(c.transform.m_LocalScale?.y,1):1]);
    kids.forEach((c,i)=>{for(let a=0;a<2;a++){const cap=a?'Height':'Width';if(f['m_ChildControl'+cap])sizes[i][a]=desired(c,a,a===1?c.layout?.flow&&axis===1&&f.m_ChildControlWidth?flowChildWidth(c,f,available[0],sizes[i][0]):Math.min(sizes[i][0],Math.max(0,available[0])):undefined);}});
    let total=sizes.reduce((sum,s,i)=>sum+s[axis]*scales[i][axis],0)+Math.max(0,kids.length-1)*spacing;
    if(total>available[axis]&&f['m_ChildControl'+(axis?'Height':'Width')]){const mins=kids.map(c=>Math.max(0,number(fields(c,v=>'m_IgnoreLayout'in v)?.['m_Min'+(axis?'Height':'Width')],0))),shrinkable=sizes.reduce((sum,sz,i)=>sum+Math.max(0,sz[axis]-mins[i])*scales[i][axis],0),fraction=shrinkable?Math.min(1,(total-available[axis])/shrinkable):0;for(let i=0;i<kids.length;i++)sizes[i][axis]-=Math.max(0,sizes[i][axis]-mins[i])*fraction;total=sizes.reduce((sum,sz,i)=>sum+sz[axis]*scales[i][axis],0)+Math.max(0,kids.length-1)*spacing;}
    let cursor;
    const mainCap=axis?'Height':'Width',flex=kids.map(c=>Math.max(f['m_ChildForceExpand'+mainCap]?1:0,f['m_ChildControl'+mainCap]?flexible(c,axis):0)),flexTotal=flex.reduce((a,b)=>a+b,0),expand=flexTotal>0;cursor=pad[axis]+(expand?0:Math.max(0,available[axis]-total)*(axis?ay:ax));
    kids.forEach((c,i)=>{const extra=expand?Math.max(0,available[axis]-total)*flex[i]/flexTotal:0,sz=sizes[i],sc=scales[i],pivot=vec(c.transform.m_Pivot,.5),pos=[0,0],pp=[pivot.x,1-pivot.y];
     for(let a=0;a<2;a++){const cap=a?'Height':'Width';if(a===axis){if(f['m_ChildControl'+cap]&&expand)sz[a]+=extra/(sc[a]||1);pos[a]=cursor+(f['m_ChildControl'+cap]?0:extra*(a?ay:ax));cursor+=sz[a]*sc[a]+spacing+(f['m_ChildControl'+cap]?0:extra);}else{if(f['m_ChildControl'+cap]){const canExpand=flexible(c,a)>0||f['m_ChildForceExpand'+cap];sz[a]=canExpand?available[a]/(sc[a]||1):Math.min(sz[a],available[a]/(sc[a]||1));}pos[a]=pad[a]+(available[a]-sz[a]*sc[a])*(a?ay:ax);}pos[a]+=sz[a]*pp[a]*(sc[a]-1);}
     c.box={x:pos[0],y:pos[1],w:sz[0],h:sz[1]};
    });
   }
  }
  const scroll=n.scrollLayout;
  if(scroll){const f=n.scroll,{vp,content,hbar,vbar}=scroll,hExpand=hbar?.parent===n&&vp.parent===n&&f.m_HorizontalScrollbarVisibility===2,vExpand=vbar?.parent===n&&vp.parent===n&&f.m_VerticalScrollbarVisibility===2;
   if(hExpand||vExpand)vp.box={x:0,y:0,w:n.box.w,h:n.box.h};layoutChildren(vp);
   let needY=!!content&&content.box.h>vp.box.h+.01,needX=!!content&&content.box.w>vp.box.w+.01;
   if(vExpand&&needY){vp.box.w=Math.max(0,n.box.w-vbar.box.w-number(f.m_VerticalScrollbarSpacing));layoutChildren(vp);needX=!!content&&content.box.w>vp.box.w+.01;}
   if(hExpand&&needX){vp.box.h=Math.max(0,n.box.h-hbar.box.h-number(f.m_HorizontalScrollbarSpacing));layoutChildren(vp);needY=!!content&&content.box.h>vp.box.h+.01;if(vExpand&&needY){vp.box.w=Math.max(0,n.box.w-vbar.box.w-number(f.m_VerticalScrollbarSpacing));layoutChildren(vp);}}
   for(const [bar,axis,needed]of [[hbar,0,needX],[vbar,1,needY]]){if(!bar)continue;const suffix=axis?'Vertical':'Horizontal',mode=f['m_'+suffix+'ScrollbarVisibility'];if(bar.activeOverride===undefined)bar.active=mode===0?!!f['m_'+suffix]:needed;const bf=bar.selectable?.fields,handle=bf&&bar.scope.records.find(x=>x.source.transformID===bf.m_HandleRect?.fileID);if(handle&&content){const size=clamp((axis?vp.box.h:vp.box.w)/Math.max(1,axis?content.box.h:content.box.w)),k=axis?'y':'x',direction=number(bf.m_Direction),reverse=direction===1||direction===3,position=axis?(1-(vp.element.scrollTop/Math.max(1,content.box.h-vp.box.h))):(vp.element.scrollLeft/Math.max(1,content.box.w-vp.box.w)),value=reverse?1-position:position;handle.transform.m_AnchorMin={x:0,y:0};handle.transform.m_AnchorMax={x:1,y:1};handle.transform.m_AnchorMin[k]=(reverse?1-value:value)*(1-size);handle.transform.m_AnchorMax[k]=handle.transform.m_AnchorMin[k]+size;handle.transform.m_AnchoredPosition={x:0,y:0};handle.transform.m_SizeDelta={x:0,y:0};bf.m_Size=size;}}
   for(const c of n.children)if(c!==vp)layoutChildren(c);
  }else for(const c of n.children)layoutChildren(c);
 }
 function syncFitters(records){for(const n of records){const fitter=fields(n,f=>'MaxHeight'in f&&f.scrollView&&f.layoutElement),le=fitter&&n.components.find(c=>c.fileID===fitter.layoutElement.fileID);if(le&&n.scroll){const child=n.scope.records.find(c=>c.source.transformID===n.scroll.m_Content.fileID);if(child)le.fields.m_PreferredHeight=Math.min(number(fitter.MaxHeight,1300),desired(child,1,n.box.w));}}}
 function refreshNodes(nodes){
  nodes=nodes.filter(n=>n&&!n.removed);if(!nodes.length)return api;if(batchDepth||refreshing){for(const n of nodes)pendingLayout.add(n);return api;}if(destroyed)return api;
  const begin=performance.now(),selected=new Set();for(let n of nodes){for(let p=n.parent;p;p=p.parent)if(p.layout||p.scrollLayout||fields(p,f=>('m_HorizontalFit'in f||'MaxHeight'in f)&&f.m_Enabled!==0))n=p;selected.add(n);}const affected=[...selected].filter(n=>{for(let p=n.parent;p;p=p.parent)if(selected.has(p))return false;return true;});
  refreshing=true;try{for(let pass=0;pass<2;pass++)for(const n of affected){if(!n.canvasRoot)n.box=rect(n,n.parent?.box.w??width,n.parent?.box.h??height);layoutChildren(n);}const descendants=[];const collect=n=>{descendants.push(n);for(const c of n.children)collect(c);};affected.forEach(collect);syncFitters(descendants);for(const n of affected){layoutChildren(n);render(n,n.parent?.visible??true);}const alphaAncestors=new Set();for(const n of affected)for(let p=n.parent;p;p=p.parent)if(p.alphaRaycast&&p.visible)alphaAncestors.add(p);for(const n of alphaAncestors)updateAlphaRaycast(n);flushActiveNotifications();diagnostics.layoutStats.partial++;diagnostics.layoutStats.lastMs=performance.now()-begin;}catch(error){for(const n of affected)if(!n.removed)pendingLayout.add(n);throw error;}finally{refreshing=false;}
  if(refreshAgain){refreshAgain=false;refreshNodes(affected);}if(pendingLayout.size){const pending=[...pendingLayout];pendingLayout.clear();refreshNodes(pending);}return api;
 }
 function refreshLayout(){
  if(destroyed)return api;if(batchDepth){batchPending=true;return api;}if(refreshing){refreshAgain=true;return api;}refreshing=true;textLayoutEpoch++;pendingLayout.clear();const begin=performance.now();diagnostics.layoutStats.full++;try{
  const hw=host.clientWidth||width,hh=host.clientHeight||height,fit=options.fit||'contain',scale=fit==='cover'?Math.max(hw/width,hh/height):Math.min(hw/width,hh/height);
  rectMaskPixelScale=scale*number(global.devicePixelRatio,1);stage.style.width=width+'px';stage.style.height=height+'px';stage.style.left=((hw-width*scale)/2)+'px';stage.style.top=((hh-height*scale)/2)+'px';stage.style.transform=`scale(${scale})`;
  for(const n of roots)if(n.canvasRoot)projectCanvas(n);for(let pass=0;pass<2;pass++)for(const n of roots){if(!n.canvasRoot)n.box=rect(n,width,height);layoutChildren(n);}syncFitters(all.filter(n=>!n.removed));for(const n of roots){layoutChildren(n);render(n,true);}
  flushActiveNotifications();diagnostics.layoutStats.lastMs=performance.now()-begin;}catch(error){for(const n of roots)if(!n.removed)pendingLayout.add(n);throw error;}finally{refreshing=false;}if(refreshAgain){refreshAgain=false;refreshLayout();}else if(pendingLayout.size){const pending=[...pendingLayout];pendingLayout.clear();refreshNodes(pending);}return api;
 }
 function listen(el,type,fn,opts){
  el.addEventListener(type,fn,opts);const node=el.__unityNode,owners=node?(node.disposers||(node.disposers=[])):listeners;let active=true;
  // An explicit unsubscribe ends ownership now, not only on scene teardown.
  // Teardown iterates snapshots because each disposer removes its own entry.
  const off=()=>{if(!active)return;active=false;el.removeEventListener(type,fn,opts);const index=owners.indexOf(off);if(index>=0)owners.splice(index,1);};owners.push(off);return off;
 }
 function initAlphaRaycast(n){
  const component=n.components.find(c=>'alphaThreshold'in c.fields),image=n.components.find(c=>'m_Sprite'in c.fields&&'m_Color'in c.fields);if(!component||!image)return;
  // Awake caches the original Image.sprite.texture, even when the current
  // sprite changes later. Missing or unreadable cached textures allow hits.
  const sprite=resolveSprite(image.fields.m_Sprite),data=(options.alphaRaycastData||global.SDDYX_ALPHA_RAYCAST_DATA||{})[sprite?.textureGuid];n.alphaRaycast={component,image,data};if(!data?.readable)return;
  const svg=document.createElementNS(NS,'svg'),path=document.createElementNS(NS,'path'),defs=document.createElementNS(NS,'defs'),clip=document.createElementNS(NS,'clipPath'),clipShape=document.createElementNS(NS,'path'),id=n.key+'-alpha-hit';
  svg.setAttribute('class','sddyx-unity-alpha-raycast');svg.setAttribute('viewBox',`0 0 ${data.width} ${data.height}`);svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');clip.id=id;clip.setAttribute('clipPathUnits','userSpaceOnUse');clip.appendChild(clipShape);defs.appendChild(clip);svg.appendChild(defs);path.setAttribute('fill','transparent');path.setAttribute('clip-path',`url(#${id})`);svg.appendChild(path);n.element.appendChild(svg);Object.assign(n.alphaRaycast,{svg,path,clipShape});
 }
 function updateAlphaRaycast(n){
  const filter=n.alphaRaycast;if(!filter?.svg)return;const current=resolveSprite(filter.image.fields.m_Sprite),active=!!current;n.element.dataset.alphaRaycast=String(active);filter.svg.style.display=active?'':'none';if(!active)return;
  const threshold=number(filter.component.fields.alphaThreshold,.1),data=filter.data;if(filter.threshold!==threshold){filter.threshold=threshold;filter.rectangles=alphaRaycastRects(data,threshold);}
  // GraphicRaycaster tests each enabled Graphic rectangle before applying
  // ancestor filters. In the shipped CGItem the root and Highlight are the
  // two raycast graphics. Preserve their padded/rotated rectangles and the
  // filter's out-of-rect pixel clamping, including the oversized Highlight.
  const inverse=nodeMatrix(n).inverse(),polygons=[],bounds={x1:0,y1:0,x2:data.width,y2:data.height};
  const visit=child=>{if(!child.visible||child.element.dataset.raycastBlocked==='true')return;for(const g of child.graphics){const f=g.component.fields;if(!enabled(g.component)||f.m_RaycastTarget!==1)continue;const pad=f.m_RaycastPadding||{},x1=number(pad.x),y1=number(pad.w),x2=child.box.w-number(pad.z),y2=child.box.h-number(pad.y);if(x2<=x1||y2<=y1)continue;const matrix=inverse.multiply(nodeMatrix(child)),points=[[x1,y1],[x2,y1],[x2,y2],[x1,y2]].map(([x,y])=>{const p=matrix.transformPoint({x,y});return{x:p.x*data.width/n.box.w,y:p.y*data.height/n.box.h};});if(points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))continue;polygons.push(points.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join('')+'Z');for(const p of points){bounds.x1=Math.min(bounds.x1,p.x);bounds.y1=Math.min(bounds.y1,p.y);bounds.x2=Math.max(bounds.x2,p.x);bounds.y2=Math.max(bounds.y2,p.y);}}for(const c of child.children)visit(c);};visit(n);
  const clip=polygons.join('');if(filter.clipKey!==clip){filter.clipKey=clip;filter.clipShape.setAttribute('d',clip);}
  const key=[threshold,bounds.x1,bounds.y1,bounds.x2,bounds.y2].join(',');if(filter.pathKey!==key){filter.pathKey=key;filter.path.setAttribute('d',filter.rectangles.map(r=>{const x1=r.x1===0?bounds.x1:r.x1,y1=r.y1===0?bounds.y1:r.y1,x2=r.x2===data.width?bounds.x2:r.x2,y2=r.y2===data.height?bounds.y2:r.y2;return`M${x1} ${y1}H${x2}V${y2}H${x1}Z`;}).join(''));}
 }
 function localizeNode(n,images=false){
  if(images){
  const localizedImage=fields(n,f=>f.m_Script?.fileID===1061194010);
   if(localizedImage){const key=localizedImage.key,resource=translatedConfig.variable?.[key]??config.variable?.[key],style=translatedConfig.imagestyle?.[key]??config.imagestyle?.[key],image=n.components.find(c=>'m_Sprite'in c.fields);if(resource&&image){const sprite=resolveSprite(resource);if(sprite)image.fields.m_Sprite=sprite;}if(style){n.transform.m_AnchoredPosition={x:style.posX,y:style.posY};n.transform.m_SizeDelta={x:style.width,y:style.height};}}
  }
  const localText=fields(n,f=>f.m_Script?.fileID===1706830935),lookup=key=>translatedConfig.textstyle?.[key]??config.textstyle?.[key],textStyle=localText&&(lookup(localText.key)||lookup(localText.style));
  if(textStyle){const text=n.components.find(c=>'m_text'in c.fields)?.fields;if(text){
   // TextTranslate.Start caches these two source values once. Fresh JSON
   // TextStyleNodes have zero numeric/false boolean defaults, without inheritance.
   const original=n.textStyleDefaults||(n.textStyleDefaults={lineSpacing:number(text.m_lineSpacing),paragraphSpacing:number(text.m_paragraphSpacing),font:clone(text.m_fontAsset||null),material:clone(text.m_fontMaterial||null)});
   if(original.font)text.m_fontAsset=clone(original.font);else delete text.m_fontAsset;if(original.material)text.m_fontMaterial=clone(original.material);else delete text.m_fontMaterial;
   text.m_fontSize=textStyle.css_size?.[options.fontSize||'md']??number(textStyle.size);
   text.m_enableAutoSizing=!!textStyle.enableAutoSize;text.m_fontSizeMin=number(textStyle.sizeRange?.x??textStyle.sizeRange?.[0]);text.m_fontSizeMax=number(textStyle.sizeRange?.y??textStyle.sizeRange?.[1]);
   text.m_characterSpacing=number(textStyle.characterSpacing);text.m_wordSpacing=number(textStyle.wordSpacing);
   text.m_lineSpacing=original.lineSpacing+number(textStyle.lineSpacing);text.m_paragraphSpacing=original.paragraphSpacing+number(textStyle.paragraphSpacing);text.m_isRightToLeft=+!!textStyle.isRightToLeftText;
   if(textStyle.font){const entry=Object.entries(fonts).find(([id,f])=>f.asset?.replace(/\\/g,'/').endsWith('/fonts & materials/'+textStyle.font+'.asset'));if(entry)text.m_fontAsset={guid:entry[0],fileID:11400000};}
   if(textStyle.material){const entry=Object.entries(materials).find(([id,m])=>m.source?.replace(/\\/g,'/').endsWith('/fonts & materials/'+textStyle.material+'.mat'));if(entry)text.m_fontMaterial={guid:entry[0],fileID:2100000};}
  }}
  for(const g of n.graphics){if(g.kind==='text')g.textKey=undefined;if(images&&g.kind==='image')g.paintKey=null;}
 }
 function makeScope(data,parent,name,referenceScope=null){
  const scope={data,referenceScope,byID:new Map(),byPath:new Map(),runtimePaths:new Map(),records:[],roots:[],root:null,instance:!!parent};scopes.push(scope);
  const add=(id,par)=>{
   const source=data.nodes[id];if(!source)return null;
   const element=document.createElement('div'),n={source,scope,element,parent:par,children:[],components:clone(source.components||[]),transform:clone(source.transform||{}),path:source.path,active:source.active!==0,graphics:[],box:{x:0,y:0,w:0,h:0},key:prefix+'-'+(++serial)};
   if(parent){const originalRoot=data.nodes[data.roots[0]]?.path||'';n.path=(parent.path||'')+'/'+(name||data.nodes[data.roots[0]]?.name||'Instance')+source.path.slice(originalRoot.length);}
   element.className='sddyx-unity-node';if(emptyBreakerMeshPlaceholder(source)){element.style.display='none';element.dataset.emptyMeshPlaceholder='true';}element.dataset.unityPath=n.path;element.dataset.unityId=String(source.id);element.dataset.unityName=source.name;element.__unityNode=n;
   localizeNode(n,true);
   n.uiParticle=fields(n,f=>Array.isArray(f.m_Particles)&&f.m_Scale3D&&f.m_Enabled!==0);if(n.uiParticle){if(n.uiParticle.m_AutoScalingMode===2)n.transform.m_LocalScale={x:1,y:1,z:1};particlePlayers.push(n);}
   const group=n.components.find(c=>enabled(c)&&(('m_ChildAlignment'in c.fields&&'m_Spacing'in c.fields)||global.SDDYXFlowLayout?.isFlowLayout(c)));if(group){const flow=global.SDDYXFlowLayout?.isFlowLayout(group);n.layout={fields:group.fields,axis:flow?number(group.fields.m_StartAxis):group.fields.m_Script?.fileID===SCRIPT.horizontal?0:1,grid:'m_CellSize'in group.fields,flow};}
   n.ignoreLayout=!!fields(n,f=>f.m_IgnoreLayout&&f.m_Enabled!==0);scope.byID.set(String(id),n);scope.byPath.set(source.path,n);scope.runtimePaths.set(n.path,n);scope.records.push(n);all.push(n);nodesByPath.set(n.path,n);
   if(par){par.children.push(n);par.element.appendChild(element);}else{stage.appendChild(element);scope.roots.push(n);roots.push(n);}
   for(const child of source.children||[])add(child,n);
   // RectMask2D clips each descendant Graphic and does not clip its own
   // Graphic or the whole node. Preserve the separate source-sprite Mask.
   const mask=fields(n,(f,c)=>enabled(c)&&f.m_ShowMaskGraphic!==undefined);if(mask){element.style.overflow='hidden';if(mask.m_ShowMaskGraphic===0)n.hideMaskGraphic=true;if(mask.m_ShowMaskGraphic!==undefined){const image=fields(n,f=>'m_Sprite'in f),sprite=resolveSprite(image?.m_Sprite);if(sprite){const r=sprite.cssRect||sprite.rect,logical=sprite.rect||r,offset=sprite.nativeSpriteGeometry?sprite.textureRectOffset||{}:{},rw=sprite.nativeSpriteGeometry?logical.width:r.width,rh=sprite.nativeSpriteGeometry?logical.height:r.height,rx=r.x-number(offset.x),ry=r.y-(rh-number(offset.y)-r.height),tw=sprite.textureSize?.[0]||r.width,th=sprite.textureSize?.[1]||r.height;element.style.webkitMaskImage=element.style.maskImage=`url("${(options.maskData||global.SDDYX_MASK_DATA||{})[sprite.guid]||assetURL(sprite.url)}")`;element.style.webkitMaskRepeat=element.style.maskRepeat='no-repeat';element.style.webkitMaskSize=element.style.maskSize=`${tw/rw*100}% ${th/rh*100}%`;element.style.webkitMaskPosition=element.style.maskPosition=`${tw===rw?0:rx/(tw-rw)*100}% ${th===rh?0:ry/(th-rh)*100}%`;}}}
   initAlphaRaycast(n);
   const scroll=fields(n,f=>f.m_Content&&'m_ScrollSensitivity'in f);if(scroll){n.scroll=scroll;}
   const selectable=n.components.find(c=>enabled(c)&&c.fields.m_Navigation);if(selectable){n.selectable=selectable;const f=selectable.fields;element.setAttribute('role',f.m_OnClick?'button':'group');element.tabIndex=f.m_Interactable===0?-1:0;element.dataset.interactive='true';element.setAttribute('aria-disabled',String(f.m_Interactable===0));
    const state=(s,type,event)=>{visualModifiers.event(n,type,{button:event?.button,targetNode:event?.target?.closest?.('[data-unity-path]')?.__unityNode});const helper=[...visualModifiers.helpers.values()].find(record=>record.node===n);if(helper)s=global.SDDYXVisualModifiers.STATES[helper.model.state];if(f.m_Interactable===0)s='Disabled';animatorState(n,s);flushCanvasColors();};listen(element,'pointerenter',event=>state('Highlighted','pointerenter',event));listen(element,'pointerleave',event=>state(document.activeElement===element?'Selected':'Normal','pointerleave',event));listen(element,'pointerdown',event=>state('Pressed','pointerdown',event));listen(element,'pointerup',event=>state('Highlighted','pointerup',event));listen(element,'focus',event=>state('Selected','focus',event));listen(element,'blur',event=>state('Normal','blur',event));
    listen(element,'keydown',e=>{const direction={ArrowUp:'m_SelectOnUp',ArrowDown:'m_SelectOnDown',ArrowLeft:'m_SelectOnLeft',ArrowRight:'m_SelectOnRight'}[e.key];if(direction){const id=f.m_Navigation?.[direction]?.fileID,target=scope.records.find(x=>x.components.some(c=>c.fileID===id));if(target&&target.visible){e.preventDefault();target.element.focus();}}if((e.key==='Enter'||e.key===' ')&&f.m_OnClick){e.preventDefault();if(!e.repeat)element.click();}});
    listen(element,'click',e=>{if(f.m_Interactable===0){e.preventDefault();e.stopImmediatePropagation();return;}e.stopPropagation();element.dispatchEvent(new CustomEvent('unity:click',{bubbles:true,detail:{path:n.path,node:source,calls:f.m_OnClick?.m_PersistentCalls?.m_Calls||[]}}));});
   }
   return n;
  };
  if(parent){for(const id of data.roots||[])scope.roots.push(add(id,parent));}
  else if(data.worldRoots){for(const id of data.worldRoots)add(id,null);for(const record of data.canvases||[]){const n=scope.byID.get(String(record.nodeID));if(!n||record.canvas.m_RenderMode===2)continue;n.canvasRoot=true;n.canvas=record;n.independentCanvas=true;stage.appendChild(n.element);const camera=cameraState(record.canvas.m_Camera);n.element.style.zIndex=String(number(camera?.fields.m_Depth)*10000+number(record.canvas.m_SortingOrder));projectCanvas(n);}}
  else{
   const canvasIDs=new Set((data.canvases||[]).map(c=>String(c.nodeID)));
   const top=(data.canvases||[]).filter(c=>{let p=data.nodes[c.nodeID]?.parent;while(p!=null){if(canvasIDs.has(String(p)))return false;p=data.nodes[p]?.parent;}const camera=Object.values(data.nodes).flatMap(n=>n.components||[]).find(x=>x.fileID===c.canvas.m_Camera?.fileID);return !camera?.fields.m_TargetTexture?.fileID;});
   top.sort((a,b)=>{const camera=c=>Object.values(data.nodes).flatMap(n=>n.components||[]).find(x=>x.fileID===c.canvas.m_Camera?.fileID)?.fields;return number(camera(a)?.m_Depth)-number(camera(b)?.m_Depth)||number(a.canvas.m_SortingOrder)-number(b.canvas.m_SortingOrder);});
   for(const canvas of top){const n=add(canvas.nodeID,null);n.canvasRoot=true;n.canvas=canvas;
    projectCanvas(n);
   }
  }
  scope.root=scope.roots[0];
  for(const n of scope.records){if(n.uiParticle||!n.components.some(c=>c.type==='ParticleSystem'))continue;let covered=false;for(let p=n.parent;p;p=p.parent)if(p.uiParticle||p.components.some(c=>c.type==='ParticleSystem')){covered=true;break;}if(!covered){const descendants=[];const collect=p=>{for(const c of p.components)if(c.type==='ParticleSystem')descendants.push({fileID:c.fileID});for(const child of p.children)collect(child);};collect(n);n.uiParticle={m_Particles:descendants,m_Scale3D:{x:1,y:1,z:1},directRenderer:true};particlePlayers.push(n);}}

  for(const n of scope.records)for(const c of n.components){const f=c.fields;if(!enabled(c)||!Array.isArray(f.GameObjects)||!('NormalEnabled'in f))continue;const owner=scope.records.find(x=>x.components.some(c=>c.fileID===f.Source?.fileID));if(owner)(owner.stateHelpers||(owner.stateHelpers=[])).push(f);}
  visualModifiers.register(scope.records);
  for(const n of scope.records){if(n.scroll){const vp=scope.records.find(x=>x.source.transformID===n.scroll.m_Viewport?.fileID),content=scope.records.find(x=>x.source.transformID===n.scroll.m_Content?.fileID),bar=ref=>scope.records.find(x=>x.components.some(c=>c.fileID===ref?.fileID));if(vp){n.scrollLayout={vp,content,hbar:bar(n.scroll.m_HorizontalScrollbar),vbar:bar(n.scroll.m_VerticalScrollbar)};vp.isScrollViewport=true;vp.element.classList.add('sddyx-unity-scroll');vp.element.style.overflowX=n.scroll.m_Horizontal?'auto':'hidden';vp.element.style.overflowY=n.scroll.m_Vertical?'auto':'hidden';}}
   animatorState(n,null,false);
  }
  return scope;
 }
 function eulerQuaternion(v){const x=number(v.x)*Math.PI/360,y=number(v.y)*Math.PI/360,z=number(v.z)*Math.PI/360,sx=Math.sin(x),cx=Math.cos(x),sy=Math.sin(y),cy=Math.cos(y),sz=Math.sin(z),cz=Math.cos(z);return{x:cy*sx*cz+sy*cx*sz,y:sy*cx*cz-cy*sx*sz,z:cy*cx*sz-sy*sx*cz,w:cy*cx*cz+sy*sx*sz};}
 function localPosition(n){if(n.source.transformType!=='RectTransform')return{...n.transform.m_LocalPosition};const t=n.transform,min=vec(t.m_AnchorMin,.5),max=vec(t.m_AnchorMax,.5),pivot=vec(t.m_Pivot,.5),parentPivot=vec(n.parent?.transform.m_Pivot,.5),size={x:n.parent?.box.w??width,y:n.parent?.box.h??height};return{x:number(t.m_AnchoredPosition?.x)+size.x*(min.x+(max.x-min.x)*pivot.x-parentPivot.x),y:number(t.m_AnchoredPosition?.y)+size.y*(min.y+(max.y-min.y)*pivot.y-parentPivot.y),z:number(t.m_LocalPosition?.z)};}
 function anchoredFromLocal(n,key,value){const t=n.transform,min=vec(t.m_AnchorMin,.5),max=vec(t.m_AnchorMax,.5),pivot=vec(t.m_Pivot,.5),parentPivot=vec(n.parent?.transform.m_Pivot,.5),size=key==='x'?(n.parent?.box.w??width):(n.parent?.box.h??height);return value+size*(parentPivot[key]-min[key]-(max[key]-min[key])*pivot[key]);}
 function applyProperty(n,property,value,classID,script){
  if(!n)return;
  const changed=(a,b)=>typeof a==='object'||typeof b==='object'?JSON.stringify(a)!==JSON.stringify(b):a!==b;
  if(property==='m_LocalRotation'||property==='localRotation'){if(changed(n.transform.m_LocalRotation,value)){n.transform.m_LocalRotation=value;animationDirty=true;animatedNodes.add(n);}return;}
  if(property==='m_IsActive'){if(n.activeOverride===undefined&&n.active!==!!value){n.active=!!value;animationDirty=true;animatedNodes.add(n);}return;}
  if(/^(m_LocalPosition|localPosition|m_AnchoredPosition|anchoredPosition|m_SizeDelta|sizeDelta|m_LocalScale|localScale|m_AnchorMin|m_AnchorMax|m_Pivot|localEulerAnglesRaw|m_LocalEulerAnglesHint|m_LocalRotation|localRotation)\./.test(property)){
   let [key,ch]=property.split('.');key=({localPosition:'m_LocalPosition',anchoredPosition:'m_AnchoredPosition',sizeDelta:'m_SizeDelta',localScale:'m_LocalScale',localEulerAnglesRaw:'m_LocalEulerAnglesHint',localRotation:'m_LocalRotation'})[key]||key;
   if(key==='m_LocalPosition'&&n.source.transformType==='RectTransform'&&(ch==='x'||ch==='y')){value=anchoredFromLocal(n,ch,value);key='m_AnchoredPosition';}const vector=n.transform[key]||(n.transform[key]={}),quaternion=key==='m_LocalEulerAnglesHint'?eulerQuaternion({...vector,[ch]:value}):null;if(changed(vector[ch],value)||(quaternion&&changed(n.transform.m_LocalRotation,quaternion))){vector[ch]=value;if(quaternion)n.transform.m_LocalRotation=quaternion;animationDirty=true;animatedNodes.add(n);}return;
  }
  const candidates=n.components.filter(c=>(classID==null||c.classID===classID)&&(!script?.fileID||c.fields.m_Script?.fileID===script.fileID));
  if(property==='m_Enabled'){
   // Animator class 114 tracks identify the animated graphic by their script reference.
   const comps=script?.fileID?candidates:candidates.filter(c=>'m_Color'in c.fields||'m_text'in c.fields);for(const c of comps)if(c.fields.m_Enabled!==+!!value){const previous=c.fields.m_Enabled!==0;c.fields.m_Enabled=+!!value;animationDirty=true;animatedNodes.add(n);notifyComponentLifecycle(n,c,previous);}return;
  }
  const [key,ch]=property.split('.');for(const c of candidates){if(key==='Value'&&!ch&&c.fields.m_Script?.guid==='719f775346a9997261ef722fa6c603de'&&c.fields.m_Script?.fileID===1574425347){c.fields.Value=value;continue;}if(key in c.fields){if(ch){const obj=c.fields[key]||(c.fields[key]={});if(changed(obj[ch],value)){obj[ch]=value;animationDirty=true;animatedNodes.add(n);}}else if(changed(c.fields[key],value)){c.fields[key]=value;animationDirty=true;animatedNodes.add(n);}}}
 }
 function animatorState(n,state,refresh=true,instant=false){
  let helperChanged=false;n.currentSelectableState=state||n.currentSelectableState||'Normal';const helperState=n.selectable?.fields.m_Interactable===0?'Disabled':n.currentSelectableState;for(const f of n.stateHelpers||[]){const active=!!f[(helperState==='Highlighted'?'Highlight':helperState)+'Enabled']&&(!f.AssociateInputDevice||!['Keyboard&Mouse','Touch'].includes(inputScheme));for(const ref of f.GameObjects){const target=n.scope.byID.get(String(ref.fileID));if(target&&target.activeOverride===undefined&&target.active!==active){target.active=active;helperChanged=true;}}}
  if(n.selectable&&(state||!n.nativeCanvasTintInitialized)){const f=n.selectable.fields,targetNode=n.scope.records.find(x=>x.components.some(c=>c.fileID===f.m_TargetGraphic?.fileID)),target=targetNode?.components.find(c=>c.fileID===f.m_TargetGraphic?.fileID),selected=f.m_Interactable===0?'Disabled':n.currentSelectableState;n.nativeCanvasTintInitialized=true;if(target&&f.m_Transition===1){const color=f.m_Colors?.['m_'+(selected==='Highlight'?'Highlighted':selected)+'Color'];if(color){const multiplier=number(f.m_Colors.m_ColorMultiplier,1),tint=Object.fromEntries(['r','g','b','a'].map(key=>[key,Math.fround(number(color[key],1)*multiplier)]));visualModifiers.crossFadeColor(targetNode,target,tint,{duration:instant||!state?0:number(f.m_Colors.m_FadeDuration,.1),ignoreTimeScale:true,useAlpha:true,useRGB:true});}}if(target&&f.m_Transition===2){n.baseGraphicSprite=n.baseGraphicSprite||clone(target.fields.m_Sprite);const sprite=f.m_SpriteState?.['m_'+selected+'Sprite'];target.fields.m_Sprite=sprite?.guid?sprite:n.baseGraphicSprite;}}

  if(n.animator&&state){for(const key of ['Normal','Highlighted','Pressed','Selected','Disabled'])n.animator.resetTrigger(key);n.animator.setTrigger(state);if(refresh)refreshNodes([n]);return;}
  const animator=n.components.find(c=>c.type==='Animator'&&enabled(c));if(!animator){if(refresh&&helperChanged)refreshNodes([n]);return;}
  const controllers=options.controllers||global.SDDYX_CONTROLLERS||{},animations=options.animations||global.SDDYX_ANIMATIONS||{};
  const controller=Object.values(controllers).find(c=>c.guid===animator.fields.m_Controller?.guid);if(!controller)return;
  const objects=controller.objects||[];
  let states;
  if(state)states=objects.filter(o=>o.type==='AnimatorState'&&o.fields.m_Name===state);
  else{const main=objects.find(o=>o.type==='AnimatorController');states=(main?.fields.m_AnimatorLayers||[]).map(l=>objects.find(o=>o.fileID===l.m_StateMachine.fileID)).map(sm=>objects.find(o=>o.fileID===sm?.fields.m_DefaultState?.fileID)).filter(Boolean);}
  for(const st of states){const a=Object.values(animations).find(a=>a.guid===st.fields.m_Motion?.guid);const clip=a?.objects.find(o=>o.type==='AnimationClip')?.fields;if(!clip)continue;
   const resolve=path=>!path?n:n.scope.records.find(x=>x.path===n.path+'/'+path);
   for(const track of clip.m_FloatCurves||[]){const v=track.curve?.m_Curve?.[0]?.value;if(v!==undefined)applyProperty(resolve(track.path),track.attribute,v,track.classID,track.script);}
   for(const track of clip.m_PPtrCurves||[]){const v=track.curve?.[0]?.value;if(v!==undefined)applyProperty(resolve(track.path),track.attribute,v,track.classID,track.script);}
   for(const [kind,prop]of [['m_PositionCurves','m_LocalPosition'],['m_ScaleCurves','m_LocalScale'],['m_EulerCurves','localEulerAnglesRaw']])for(const track of clip[kind]||[]){const v=track.curve?.m_Curve?.[0]?.value;if(v)for(const k of ['x','y','z'])applyProperty(resolve(track.path),prop+'.'+k,v[k],4);}
  }
  if(refresh)refreshNodes([n]);
 }
 function initAnimators(scope){
  if(!global.SDDYXAnimation||options.animate===false)return;
  for(const n of scope.records){if(n.animator)continue;const component=n.components.find(c=>c.type==='Animator'&&enabled(c));if(!component)continue;
   try{n.animator=new global.SDDYXAnimation.Animator(n.path,component.fields.m_Controller,{controllers:options.controllers,clips:options.animations,applySamples:(root,samples)=>{for(const s of samples){const target=!s.path?n:scope.runtimePaths.get(n.path+'/'+s.path);applyProperty(target,s.property,s.value,s.classID,s.script);}},readProperty:(root,track)=>{const target=!track.path?n:scope.runtimePaths.get(n.path+'/'+track.path);if(!target)return undefined;const [key,ch]=track.property.split('.');if(key==='m_LocalPosition')return localPosition(target)[ch];if(key==='m_IsActive')return +target.active;const f=key in target.transform?target.transform:target.components.find(c=>(track.classID==null||c.classID===track.classID)&&key in c.fields)?.fields;return ch?f?.[key]?.[ch]:f?.[key];},onEvent:event=>n.element.dispatchEvent(new CustomEvent('unity:animation-event',{bubbles:true,detail:{path:n.path,event}}))});animationPlayers.push(n);}
   catch(error){diagnostics.unsupported.push({path:n.path,type:'Animator',reason:error.message});}
  }
 }
 function updateAnimations(dt){if(resourcePaused)return;animationDirty=false;legacyAutoplay?.update(dt);for(const n of animationPlayers)if(!n.removed&&n.visible)n.animator.update(dt);if(animationDirty){const changed=[...animatedNodes];animatedNodes.clear();refreshNodes(changed);}}
 function particleMatrix(node,owner){let matrix=new DOMMatrix();for(let n=node;n&&n!==owner;n=n.parent){const t=n.transform,q=t.m_LocalRotation||{x:0,y:0,z:0,w:1},s=t.m_LocalScale||{x:1,y:1,z:1},p=t.m_AnchoredPosition||t.m_LocalPosition||{},x=q.x,y=q.y,z=q.z,w=q.w,rotation=new DOMMatrix([(1-2*(y*y+z*z))*s.x,2*(x*y+w*z)*s.x,2*(x*z-w*y)*s.x,0,2*(x*y-w*z)*s.y,(1-2*(x*x+z*z))*s.y,2*(y*z+w*x)*s.y,0,2*(x*z+w*y)*s.z,2*(y*z-w*x)*s.z,(1-2*(x*x+y*y))*s.z,0,number(p.x),number(p.y),number(p.z),1]);matrix=rotation.multiply(matrix);}const scale=owner.uiParticle.m_Scale3D;return new DOMMatrix().scale(scale.x,scale.y,scale.z).multiply(matrix);}
 function particleRootMatrix(n){const p=vec(n.transform.m_Pivot,.5);return nodeMatrix(n).translate(n.box.w*p.x,n.box.h*(1-p.y)).scale(1,-1);}
 function directParticleWorldBridge(node){
  const W=global.SDDYXParticleWorldSpace;if(!W)return null;
  const chain=[];for(let n=node;n;n=n.parent)chain.unshift({position:localPosition(n),rotation:n.transform.m_LocalRotation,scale:n.transform.m_LocalScale});
  const camera=assignedCamera(node),cameraNode=nodesByPath.get(camera.path)||sourceIndex.byPath.get(camera.path),rotation=cameraNode?.transform?.m_LocalRotation;
  return W.directWorldBridge({chain,scalingMode:node.components.find(c=>c.type==='ParticleSystem').fields.scalingMode??0,camera:{...camera.fields,position:camera.position,rotation},width,height});
 }
 function particleNativeInfo(node){
  const W=global.SDDYXParticleWorldSpace,chain=[],branch=[];for(let n=node;n;n=n.parent){branch.unshift(n);if(n.canvasRoot&&n.canvas.canvas.m_RenderMode!==2)break;}
  for(const n of branch){let position=localPosition(n),rotation=n.transform.m_LocalRotation,scale=n.transform.m_LocalScale;
   if(n.canvasRoot&&n.canvas.canvas.m_RenderMode!==2){const camera=assignedCamera(n),source=sourceIndex.byPath.get(camera.path),q=source?.transform.m_LocalRotation||{x:0,y:0,z:0,w:1},unit=2*camera.fields['orthographic size']/height,offset=W.transform(W.trs(undefined,q),{x:0,y:0,z:number(n.canvas.canvas.m_PlaneDistance,100)},0);position={x:camera.position.x+offset.x,y:camera.position.y+offset.y,z:camera.position.z+offset.z};rotation=q;scale={x:unit,y:unit,z:unit};}
   else if(n.uiParticle&&!n.uiParticle.directRenderer&&n.uiParticle.m_AutoScalingMode===2){const parent=W.worldFromChain(chain).lossyScale;scale=Object.fromEntries(['x','y','z'].map(k=>[k,Math.abs(parent[k])<1e-6?1:1/parent[k]]));}
   chain.push({position,rotation,scale});
  }
  const world=W.worldFromChain(chain),mode=node.components.find(c=>c.type==='ParticleSystem')?.fields.scalingMode??0;return{chain,world,state:W.scalingState(world,mode),localRotation:W.trs(undefined,chain.at(-1)?.rotation)};
 }
 function particleNativePresentation(node){const W=global.SDDYXParticleWorldSpace,info=particleNativeInfo(node),camera=assignedCamera(node),source=sourceIndex.byPath.get(camera.path);return W.directWorldBridge({chain:info.chain,scalingMode:node.components.find(c=>c.type==='ParticleSystem').fields.scalingMode??0,camera:{...camera.fields,position:camera.position,rotation:source?.transform.m_LocalRotation},width,height});}
 function particleStretchContext(node,owner){
  const W=global.SDDYXParticleWorldSpace,info=particleNativeInfo(node),camera=assignedCamera(node),cameraNode=sourceIndex.byPath.get(camera.path),rotation=cameraNode?.transform.m_LocalRotation||{x:0,y:0,z:0,w:1},cameraWorld=new DOMMatrix(W.trs(camera.position,rotation)),view=new DOMMatrix().scale(1,1,-1).multiply(cameraWorld.inverse()),inverseView=view.inverse(),simulation=info.state.matrix.slice(),scale=info.state.renderScale,projection=W.orthographicProjection({...camera.fields,position:camera.position,rotation},width,height),inverse=particleRootMatrix(owner).inverse();let presentation=null;
  if(!owner.uiParticle.directRenderer){const own=particleNativeInfo(owner),parent=W.worldFromChain(own.chain.slice(0,-1)).lossyScale,authored=owner.uiParticle.m_Scale3D,pres={x:authored.x*parent.x,y:authored.y*parent.y,z:authored.z*parent.z};if(owner.uiParticle.m_AutoScalingMode===1){const root=own.chain[0].scale;for(const key of ['x','y','z'])pres[key]/=root[key]||1;}
   simulation[12]=simulation[13]=simulation[14]=0;const pos=info.world.position,offset=owner.uiParticle.m_PositionMode===1?{x:0,y:0,z:0}:Object.fromEntries(['x','y','z'].map(k=>[k,(pres[k]-1)*(pos[k]-own.world.position[k])]));presentation=new DOMMatrix().translate(pos.x+offset.x,pos.y+offset.y,pos.z+offset.z).scale(pres.x,pres.y,pres.z);
  }
  return{view:Array.from(view.toFloat64Array()),inverseView:Array.from(inverseView.toFloat64Array()),simulation,renderScale:[scale.x,scale.y,scale.z],widthAtFar:2*camera.fields['orthographic size']*width/height,farClip:camera.fields['far clip plane'],orthographic:true,projectVertex(vertex){let world={x:vertex[0],y:vertex[1],z:vertex[2]};if(presentation)world=presentation.transformPoint(world);return inverse.transformPoint(W.transform(projection.matrix,world));}};
 }
 function particleTrailContext(node,owner){
  const W=global.SDDYXParticleWorldSpace,info=particleNativeInfo(node),camera=assignedCamera(node),source=sourceIndex.byPath.get(camera.path),rotation=source?.transform.m_LocalRotation||{x:0,y:0,z:0,w:1},world=new DOMMatrix(W.trs(camera.position,rotation)),view=new DOMMatrix().scale(1,1,-1).multiply(world.inverse()),projection=W.orthographicProjection({...camera.fields,position:camera.position,rotation},width,height),inverse=particleRootMatrix(owner).inverse(),scale=info.state.renderScale;
  // Source qiliu02 is a direct renderer. Retained positions are already world XYZ.
  return{view:Array.from(view.toFloat64Array()),inverseView:Array.from(view.inverse().toFloat64Array()),renderScale:[scale.x,scale.y,scale.z],projectVertex:v=>inverse.transformPoint(W.transform(projection.matrix,{x:v[0],y:v[1],z:v[2]}))};
 }
 // Direct ParticleSystemRenderer output shares the camera presentation plane.
 // Keep the logical owner/source matrices untouched; only the canvas DOM parent
 // changes, so an additive surface can see its actual previously rendered backdrop.
 function presentWorldParticle(owner,p){
  if(!owner.uiParticle?.directRenderer)return;
  const c=p.canvas,n=p.node,d=p.presentation;c.dataset.worldParticlePortal='true';
  if(c.parentElement!==stage)stage.appendChild(c);
  c.hidden=!owner.visible||!n.visible||!d?.hasGeometry;
  if(!d)return;
  const m=nodeMatrix(owner).translate(d.left,d.top),camera=assignedCamera(n),renderer=n.components.find(c=>c.type==='ParticleSystemRenderer').fields;
  let order=number(renderer.m_SortingOrder),alpha=1;for(let a=n;a;a=a.parent){const group=a.components.find(c=>c.type==='SortingGroup'&&enabled(c));if(group)order=number(group.fields.m_SortingOrder);const cg=a.components.find(c=>c.type==='CanvasGroup'&&enabled(c));alpha*=a.alphaOverride??cg?.fields.m_Alpha??1;}
  Object.assign(c.style,{left:'0px',top:'0px',transformOrigin:'0 0',transform:`matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f})`,opacity:String(alpha),zIndex:String(number(camera.fields.m_Depth)*10000+order)});
 }
 // CSS-only presentation normalization. The logical/input DOM hierarchy and
 // source RectTransforms stay intact; only branches containing additive draws
 // need to escape transformed intermediate browser stacking groups.
 const presentationStyles=new Map(),presentationHits=new Map(),presentationGraphics=new Set();let presentationDepth=0,presentationSyncing=false;
 function presentationStyle(el,values){let record=presentationStyles.get(el);if(!record){record={base:{},applied:{}};presentationStyles.set(el,record);}for(const [key,value]of Object.entries(values)){if(!(key in record.base))record.base[key]=el.style[key];const next=String(value);if(el.style[key]!==next)el.style[key]=next;record.applied[key]=el.style[key];}}
 function restoreCoffeePresentation(){for(const [el,r]of presentationStyles){for(const [key,value]of Object.entries(r.base))if(el.style[key]===r.applied[key]&&el.style[key]!==value)el.style[key]=value;}presentationStyles.clear();for(const g of presentationGraphics)delete g.presentationBaseOpacity;presentationGraphics.clear();for(const [n,hit]of presentationHits){hit.hidden=true;delete n.element.dataset.particleCompositionSpine;if(n.removed){hit.remove();presentationHits.delete(n);}}}
 function presentationGraphicAlpha(g){return g.presentationBaseOpacity??(g.element.style.opacity===''?1:number(g.element.style.opacity,1));}
 function restorePresentationClone(original,copy){const r=presentationStyles.get(original);if(r)for(const [key,value]of Object.entries(r.base))copy.style[key]=value;for(let i=0;i<original.children.length;i++)if(copy.children[i])restorePresentationClone(original.children[i],copy.children[i]);}
 // Native Canvas batching multiplies Color32 vertex alpha by inherited group
 // alpha and CanvasRenderer tint alpha before draw (EA9CC0 -> EB06E0 -> EB15E0).
 function inheritedParticleAlpha(n){let a=1;for(let p=n;p;p=p.parent){const c=p.components.find(c=>c.type==='CanvasGroup'&&enabled(c));a=Math.fround(a*(p.alphaOverride??c?.fields.m_Alpha??1));if(c?.fields.m_IgnoreParentGroups||p.independentCanvas)break;}return Math.max(0,Math.min(1,a));}
 function particlePresentationTint(owner){const component=owner.components.find(c=>c.fields===owner.uiParticle),tint=component?canvasColor(owner,component):{r:1,g:1,b:1,a:1};return [tint.r,tint.g,tint.b,Math.fround(tint.a*inheritedParticleAlpha(owner))];}
 function particlePresentationGeometry(owner,p,geometry){
  if(owner.uiParticle.directRenderer)return geometry;const tint=particlePresentationTint(owner);p.inheritedAlpha=inheritedParticleAlpha(owner);p.presentationTintKey=tint.join(',');if(tint.every(v=>v===1)||!geometry.attributes?.COLOR_0)return geometry;
  const input=geometry.attributes.COLOR_0;if(!p.presentationColor||p.presentationColor.length!==input.length)p.presentationColor=new Float32Array(input.length);p.presentationColor.set(input);
  const f=Math.fround,pack=v=>Math.trunc(f(f(Math.max(0,Math.min(1,v))*255)+.5));for(let i=0;i<input.length;i++)if(tint[i%4]!==1){const sourceByte=pack(f(input[i]));p.presentationColor[i]=pack(f(f(sourceByte/255)*tint[i%4]))/255;}
  return{...geometry,attributes:{...geometry.attributes,COLOR_0:p.presentationColor}};
 }
 // Native CanvasGroup alpha belongs to each Graphic, rather than a completed
 // browser subtree. Keep normal-only branches in place: source-over remains
 // associative once every enabled group wrapper has opacity one. This also lets
 // an IgnoreParentGroups descendant correctly escape a faded ancestor.
 function syncCanvasGroupPresentation(){
  const affected=new Set(),visit=n=>{if(n.removed||!n.visible||affected.has(n))return;affected.add(n);for(const c of n.children)if(!c.independentCanvas)visit(c);};
  for(const n of all)if(n.visible&&!n.removed){const group=n.components.find(c=>c.type==='CanvasGroup'&&enabled(c));if((n.alphaOverride??group?.fields.m_Alpha??1)!==1)visit(n);}
  for(const n of affected){
   if(n.alphaOverride!==undefined||n.components.some(c=>c.type==='CanvasGroup'&&enabled(c)))presentationStyle(n.element,{opacity:1});
   const alpha=inheritedParticleAlpha(n);
   for(const g of n.graphics||[]){if(g.presentationBaseOpacity===undefined)g.presentationBaseOpacity=g.element.style.opacity===''?1:number(g.element.style.opacity,1);presentationGraphics.add(g);presentationStyle(g.element,{opacity:g.presentationBaseOpacity*alpha});}
   // Coffee colors already contain this factor before shader blending.
   if(!n.uiParticle?.directRenderer)for(const p of n.particles||[])presentationStyle(p.canvas,{opacity:1});
  }
 }
 function syncCoffeePresentation(precomputeMatrices=true){
  if(presentationSyncing||presentationDepth||destroyed)return;presentationSyncing=true;restoreCoffeePresentation();
  // Finished effects can keep their GameObject active. Empty/hidden particle
  // canvases must not flatten the entire MainUI hierarchy every frame.
  const drawable=p=>p.node.visible&&!p.canvas.hidden&&p.presentation?.hasGeometry&&p.sourceGeometry?.count>0;
  const owners=particlePlayers.filter(n=>!n.removed&&n.visible&&!n.uiParticle.directRenderer&&(n.particles||[]).some(drawable)&&((n.particles||[]).some(p=>drawable(p)&&p.canvas.style.mixBlendMode==='plus-lighter')||particlePresentationTint(n).some(v=>v!==1))),spines=new Set();for(const owner of owners)for(let n=owner;n;n=n.parent){spines.add(n);if(n.independentCanvas)break;}
  for(const owner of particlePlayers)if(owner.visible&&!owner.uiParticle.directRenderer)for(const p of owner.particles||[])if(p.sourceGeometry&&p.presentationTintKey!==particlePresentationTint(owner).join(','))p.surface.update({geometry:particlePresentationGeometry(owner,p,p.sourceGeometry)});
  if(!spines.size){syncCanvasGroupPresentation();presentationSyncing=false;return;}
  const boxes=new Map(),matrices=new Map(),localAlpha=n=>{const cg=n.components.find(c=>c.type==='CanvasGroup'&&enabled(c));return n.alphaOverride??cg?.fields.m_Alpha??1;},alpha=n=>{let value=1;for(let a=n;a;a=a.parent){if(spines.has(a))value*=localAlpha(a);if(a.independentCanvas)break;}return value;},matrix=n=>{let m=matrices.get(n);if(!m){m=nodeMatrix(n);matrices.set(n,m);}return m;},css=m=>`matrix(${m.a},${m.b},${m.c},${m.d},${m.e},${m.f})`;
  const layers=[];
  const order=n=>{let sorting=0,root=null,chosen=false;for(let a=n;a;a=a.parent){const c=a.components.find(c=>c.type==='Canvas'&&enabled(c));if(c&&!chosen&&(c.fields.m_OverrideSorting||a.canvasRoot)){sorting=number(c.fields.m_SortingOrder);chosen=true;}if(a.canvasRoot){root=a;break;}}const camera=root&&cameraState(root.canvas.canvas.m_Camera);return number(camera?.fields.m_Depth)*10000+sorting;};
  const paintKeys=new Map(),paintKey=n=>{if(paintKeys.has(n))return paintKeys.get(n);const chain=[];for(let a=n;a;a=a.parent){const c=a.components.find(c=>c.type==='Canvas'&&enabled(c));if(c&&(a.canvasRoot||c.fields.m_OverrideSorting))break;chain.unshift(a);}let base=order(n),first=true;const key=[];for(const a of chain){const z=Number(a.element.style.zIndex)||0,index=Array.from(a.element.parentElement?.children||[]).indexOf(a.element);if(first&&z)base+=z;else key.push(z);first=false;key.push(index);}const result=[base,...key];paintKeys.set(n,result);return result;},layer=(el,n)=>{const key=paintKey(n).slice();if(el!==n.element)key.push(Number(el.style.zIndex)||0,Array.from(n.element.children).indexOf(el));layers.push({el,key});};
  // Project every affected node before writing flattened CSS. nodeMatrix reads
  // scroll offsets, which otherwise force layout repeatedly between writes.
  const pointerEvents=new Map();for(const n of new Set([...roots,...spines,...[...spines].flatMap(n=>n.children)])){if(n.removed||!n.visible)continue;paintKey(n);if(precomputeMatrices)matrix(n);if(spines.has(n))pointerEvents.set(n,getComputedStyle(n.element).pointerEvents);}
  for(const n of spines){const m=matrix(n),points=[[0,0],[n.box.w,0],[0,n.box.h],[n.box.w,n.box.h]].map(([x,y])=>m.transformPoint({x,y})),x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));boxes.set(n,{x,y,w:Math.max(...points.map(p=>p.x))-x,h:Math.max(...points.map(p=>p.y))-y});}
  // Other original canvases retain their camera/order relationship when a
  // flattened sibling's graphic entries gain an explicit global layer.
  for(const el of stage.children){const n=el.__unityNode;if(n&&(spines.has(n)||n.removed||!n.visible))continue;if(n)layer(el,n);else layers.push({el,key:[Number(el.style.zIndex)||0,Array.from(stage.children).indexOf(el)]});}
  const graphic=(n,g,a,b)=>{const el=g.element,baseOpacity=el.style.opacity===''?1:number(el.style.opacity,1);g.presentationBaseOpacity=baseOpacity;presentationGraphics.add(g);const length=(s,total,d=0)=>!s||s==='auto'?d:String(s).endsWith('%')?parseFloat(s)*total/100:parseFloat(s)||0,left=length(el.style.left,n.box.w),top=length(el.style.top,n.box.h),w=length(el.style.width,n.box.w,n.box.w),h=length(el.style.height,n.box.h,n.box.h),old=el.style.transform&&el.style.transform!=='none'?new DOMMatrix(el.style.transform):new DOMMatrix(),m=new DOMMatrix().translate(-b.x-left,-b.y-top).multiply(matrix(n)).translate(left,top).multiply(old);presentationStyle(el,{width:w+'px',height:h+'px',right:'auto',bottom:'auto',transformOrigin:'0 0',transform:css(m),opacity:baseOpacity*a});layer(el,n);if(g.hitElement){const hit=g.hitElement,pad=g.component.fields.m_RaycastPadding||{},x=number(pad.x),y=number(pad.w),hm=new DOMMatrix().translate(-b.x-x,-b.y-y).multiply(matrix(n)).translate(x,y);presentationStyle(hit,{width:Math.max(0,n.box.w-x-number(pad.z))+'px',height:Math.max(0,n.box.h-y-number(pad.y))+'px',right:'auto',bottom:'auto',transformOrigin:'0 0',transform:css(hm)});layer(hit,n);}};
  const fadeRun=(n,a)=>{if(n.removed||!n.visible)return;for(const g of n.graphics||[]){g.presentationBaseOpacity=g.element.style.opacity===''?1:number(g.element.style.opacity,1);presentationGraphics.add(g);presentationStyle(g.element,{opacity:g.presentationBaseOpacity*a});}for(const p of n.particles||[])presentationStyle(p.canvas,{opacity:n.uiParticle?.directRenderer?a:1});for(const c of n.children)if(!c.independentCanvas)fadeRun(c,a);};
  for(const n of spines){const b=boxes.get(n),domParent=n.element.parentElement?.__unityNode,pb=boxes.get(domParent)||{x:0,y:0},a=alpha(n),originalPointer=pointerEvents.get(n);
   presentationStyle(n.element,{left:(b.x-pb.x)+'px',top:(b.y-pb.y)+'px',width:b.w+'px',height:b.h+'px',transform:'none',transformOrigin:'0 0',opacity:1,zIndex:'auto',pointerEvents:'none'});n.element.dataset.particleCompositionSpine='true';
   // Keep the focus/navigation element's projected AABB, and its old exact
   // transformed hit rectangle as a transparent child. Events still bubble.
   if(originalPointer==='auto'){let hit=presentationHits.get(n);if(!hit){hit=document.createElement('div');hit.className='sddyx-unity-presentation-hit';hit.style.cssText='position:absolute;background:transparent';hit.setAttribute('aria-hidden','true');n.element.insertBefore(hit,n.element.firstChild);presentationHits.set(n,hit);}hit.hidden=!n.visible;Object.assign(hit.style,{left:'0px',top:'0px',width:n.box.w+'px',height:n.box.h+'px',transformOrigin:'0 0',transform:css(new DOMMatrix().translate(-b.x,-b.y).multiply(matrix(n))),pointerEvents:'auto'});layer(hit,n);}
   for(const g of n.graphics||[])graphic(n,g,a,b);
   for(const p of n.particles||[]){if(!p.presentation)continue;const m=new DOMMatrix().translate(-b.x,-b.y).multiply(matrix(n)).translate(p.presentation.left,p.presentation.top);presentationStyle(p.canvas,{left:'0px',top:'0px',transformOrigin:'0 0',transform:css(m),opacity:1});layer(p.canvas,n);}
   for(const c of n.children){if(c.removed||!c.visible||spines.has(c)||c.independentCanvas)continue;const m=new DOMMatrix().translate(-b.x,-b.y).multiply(matrix(c));presentationStyle(c.element,{left:'0px',top:'0px',transformOrigin:'0 0',transform:css(m)});layer(c.element,c);if(a!==1)fadeRun(c,a);}
  }
  layers.sort((a,b)=>{for(let i=0;i<Math.max(a.key.length,b.key.length);i++){const delta=(a.key[i]??-1)-(b.key[i]??-1);if(delta)return delta;}return 0;});for(let i=0;i<layers.length;i++)presentationStyle(layers[i].el,{zIndex:i+1});
  syncCanvasGroupPresentation();presentationSyncing=false;
 }

 function initParticles(owner){if(owner.particles||!global.SDDYXUnityShaders?.particleEmitter||!global.SDDYXAnimation?.particleCurve)return;owner.particles=[];const engine=global.SDDYXUnityShaders;
  const refs=owner.uiParticle.m_Particles.length?owner.uiParticle.m_Particles:owner.scope.records.filter(n=>n.path.startsWith(owner.path+'/')).flatMap(n=>n.components.filter(c=>c.type==='ParticleSystem').map(c=>({fileID:c.fileID})));for(const ref of refs){const node=owner.scope.records.find(n=>n.components.some(c=>c.type==='ParticleSystem'&&c.fileID===ref.fileID));if(!node)continue;const f=node.components.find(c=>c.type==='ParticleSystem').fields,renderer=node.components.find(c=>c.type==='ParticleSystemRenderer')?.fields,material=materials[renderer?.m_Materials?.[renderer.m_RenderMode===5&&f.TrailModule?.enabled?1:0]?.guid];if(!f.EmissionModule?.enabled||!renderer||(owner.uiParticle.directRenderer&&renderer.m_Enabled===0))continue;if(!engine.supported(material)){diagnostics.unsupported.push({path:node.path,type:'ParticleMaterial',reason:'Original material shader is not recovered.'});continue;}
   const canvas=document.createElement('canvas');canvas.className='sddyx-unity-particles';canvas.style.cssText='position:absolute;pointer-events:none';canvas.dataset.sourceParticle=node.path;owner.element.appendChild(canvas);const emitter=engine.particleEmitter(f,renderer,{assetBase:base,matrix:()=>particleMatrix(node,owner),rootMatrix:()=>particleRootMatrix(owner),stretchContext:renderer.m_RenderMode===1&&global.SDDYXParticleWorldSpace?()=>particleStretchContext(node,owner):null,trailContext:renderer.m_RenderMode===5&&f.TrailModule?.enabled&&global.SDDYXParticleWorldSpace?()=>particleTrailContext(node,owner):null,shapeScale:(renderer.m_RenderMode===1||f.SubModule?.enabled||f.InheritVelocityModule?.enabled)&&f.scalingMode===2&&global.SDDYXParticleWorldSpace?()=>particleNativeInfo(node).state.shapeScale:null,nativeSpace:(f.SubModule?.enabled||f.InheritVelocityModule?.enabled||f.TrailModule?.enabled)&&global.SDDYXParticleWorldSpace?()=>particleNativeInfo(node):null,nativePresentation:()=>particleNativePresentation(node),worldBridge:owner.uiParticle.directRenderer&&f.moveWithTransform===1&&f.NoiseModule?.enabled&&global.SDDYXParticleWorldSpace?()=>directParticleWorldBridge(node):null}),surface=engine.create(canvas,material,{assetBase:base,paused:()=>resourcePaused,timeProvider:resourceShaderTime,width:1,height:1,pixelWidth:1,pixelHeight:1,manual:true,defer:!node.visible,reuseBackingStore:true,keywords:['DIRECTIONAL','LIGHTPROBE_SH'],geometry:{count:0,attributes:{POSITION_0:[],COLOR_0:[],TEXCOORD_0:[]}},visible:()=>owner.visible&&node.visible&&!canvas.hidden,onError:error=>diagnostics.unsupported.push({path:node.path,type:'ParticleShader',reason:error.message})});owner.particles.push({node,emitter,surface,canvas,wasVisible:true});observeParticleResourceReady(node,emitter,surface);handoffPreparedParticle(node,surface);emitter.ready?.catch(error=>diagnostics.unsupported.push({path:node.path,type:'ParticleMesh',reason:error.message}));for(const reason of emitter.limitations)diagnostics.unsupported.push({path:node.path,type:'ParticleSystem',reason});
  }
  const byID=new Map(owner.particles.map(p=>[p.node.components.find(c=>c.type==='ParticleSystem').fileID,p]));for(const p of owner.particles){const sub=p.node.components.find(c=>c.type==='ParticleSystem').fields.SubModule;if(!sub?.enabled)continue;for(const entry of sub.subEmitters||[]){const child=byID.get(entry.emitter.fileID);if(child)p.emitter.linkSubEmitter(child.emitter,entry);else diagnostics.unsupported.push({path:p.node.path,type:'SubEmitter',reason:'Original referenced child was not mounted in its particle owner.'});}}
 }
 function controlParticles(targets,command,opts={}){if(resourcePaused){pausedParticleCommands.push({targets:targets.slice(),command,options:{...opts}});return;}const selected=new Set(),children=opts.withChildren!==false;for(const root of targets){const visit=n=>{selected.add(n);if(children)for(const child of n.children)visit(child);};visit(root);}for(const owner of particlePlayers){if(owner.removed||!owner.visible)continue;initParticles(owner);for(const p of owner.particles||[])if(selected.has(p.node)&&p.node.visible){if(command==='play')p.emitter.play?.();else{p.emitter.stop?.(opts.clear!==false);if(opts.clear!==false){p.surface.release?.();p.canvas.hidden=true;p.canvas.dataset.particleCount='0';p.presentation=null;}}}}}
 // A settled invisible particle population has no simulation or presentation
 // work. Visibility changes retain their original one-time reset/suspend pass;
 // paint/layout/CanvasGroup changes synchronously resync through render/paint.
 let particleMatrixCache=null;
 function updateParticles(dt){if(resourcePaused)return;if(!particlePlayers.some(owner=>!owner.removed&&(owner.visible||(owner.particles||[]).some(p=>p.wasVisible))))return;if(presentationDepth++===0)restoreCoffeePresentation();particleMatrixCache=new Map();const hostRatio=(host.clientWidth||width)/width;try{for(const owner of particlePlayers){if(owner.removed||!owner.visible&&!(owner.particles||[]).some(p=>p.wasVisible))continue;const world=particleRootMatrix(owner),hasScale=Number.isFinite(world.a)&&Math.abs(world.a*world.d-world.b*world.c)>1e-12;if(owner.visible&&hasScale)initParticles(owner);
  // Rectangular source particles can extend thousands of pixels outside the
  // screen during next-day wipes. Unity clips those triangles at its viewport;
  // allocate only the corresponding inverse-projected viewport here as well.
  let clip;if(owner.visible&&hasScale){const inverse=world.inverse(),points=[[0,0],[width,0],[0,height],[width,height]].map(([x,y])=>inverse.transformPoint({x,y}));clip={minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minY:Math.min(...points.map(p=>p.y)),maxY:Math.max(...points.map(p=>p.y))};}
  for(const p of owner.particles||[])if(owner.visible&&p.node.visible&&hasScale&&!p.wasVisible)p.emitter.reset();
  const emitters=(owner.particles||[]).filter(p=>owner.visible&&p.node.visible&&hasScale).map(p=>p.emitter);if(global.SDDYXUnityShaders?.updateParticleEmitters)global.SDDYXUnityShaders.updateParticleEmitters(emitters,dt);else for(const emitter of emitters)emitter.update(dt);
  for(const p of owner.particles||[]){const visible=owner.visible&&p.node.visible&&hasScale;p.canvas.hidden=!visible;if(!visible){if(p.wasVisible){p.emitter.reset({prewarm:false,refreshSeed:false});p.surface.suspend?.();p.canvas.dataset.particleCount=0;}p.wasVisible=false;continue;}p.wasVisible=true;p.surface.resume?.();handoffPreparedParticle(p.node,p.surface);const sourceGeometry=p.emitter.geometry(clip);p.sourceGeometry=sourceGeometry;const geometry=particlePresentationGeometry(owner,p,sourceGeometry),b=geometry.bounds;p.canvas.dataset.particleCount=p.emitter.count;p.canvas.hidden=!geometry.count;if(!geometry.count){p.presentation=null;p.surface.release?.();continue;}const pivot=vec(owner.transform.m_Pivot,.5),ratioX=hostRatio*Math.hypot(world.m11,world.m12),ratioY=hostRatio*Math.hypot(world.m21,world.m22),left=owner.box.w*pivot.x+b.x,top=owner.box.h*(1-pivot.y)-b.y-b.height;p.canvas.style.left=left+'px';p.canvas.style.top=top+'px';p.canvas.style.width=b.width+'px';p.canvas.style.height=b.height+'px';p.surface.update({geometry,uniforms:shaderUniforms(owner,b.width,b.height,left,top),width:b.width,height:b.height,pixelWidth:Math.max(1,Math.ceil(b.width*ratioX)),pixelHeight:Math.max(1,Math.ceil(b.height*ratioY))});p.presentation={left,top,hasGeometry:true};presentWorldParticle(owner,p);}}
 }finally{particleMatrixCache=null;if(--presentationDepth===0)syncCoffeePresentation(true);}}

 function mountSFx(n,name,opts={}){
  const asset=(options.sfxAssets||global.SDDYX_SFX_ASSETS||{})[name];if(!n)throw Error('SFxHolder not found.');if(!asset)throw Error('Original SFxAssets not loaded: '+name);n.sfx?.destroy();const materialGuid=opts.unequip?(global.SDDYX_CARD_SHOWS?.op_unequip_sfx?.guid||opts.unequipMaterial):asset.material?.guid;let dead=false,cleanup=()=>{},update=()=>{};
  const view={asset,element:n.element,name,componentName:asset.componentName,material:null,node:n,automatic:opts.autoUpdate!==false,update(dt){if(!dead)update(Math.max(0,dt));},validate(){},destroy(){if(dead)return;dead=true;cleanup();const index=sfxPlayers.indexOf(view);if(index>=0)sfxPlayers.splice(index,1);api.batch(()=>{api.setTexture(n.element,null);api.setMaterial(n.element,null);for(const g of n.graphics){g.shader?.destroy();g.shader=null;g.shaderCanvas?.remove();g.shaderCanvas=null;g.materialOverride=null;}api.hide(n.element);});if(n.sfx===view)n.sfx=null;}};n.sfx=view;sfxPlayers.push(view);
  api.batch(()=>{if(asset.texture)api.setTexture(n.element,asset.texture,{nativeSize:true});if(materialGuid)api.setMaterial(n.element,materialGuid);initGraphics(n);for(const g of n.graphics)if(g.raw&&materials[materialGuid])g.materialOverride=clone(materials[materialGuid]);view.material=n.graphics.find(g=>g.raw)?.materialOverride||null;api.show(n.element);});
  const component=asset.componentName;
  if(component==='SFxFoGuang'){
   const parent=n.parent?.parent;if(parent){api.reparent(n.element,parent.element,{worldPositionStays:true});parent.children=parent.children.filter(c=>c!==n);parent.children.unshift(n);parent.element.insertBefore(n.element,parent.children[1]?.element||null);const pivot=vec(parent.transform.m_Pivot,.5),anchor=vec(n.transform.m_AnchorMin,.5),max=vec(n.transform.m_AnchorMax,.5),np=vec(n.transform.m_Pivot,.5);api.setPosition(n.element,{x:parent.box.w*(pivot.x-anchor.x-(max.x-anchor.x)*np.x),y:100+parent.box.h*(pivot.y-anchor.y-(max.y-anchor.y)*np.y),z:0});}
  }else if(component==='SFxCat'){
   const state={frames:null,index:0,frame:0,elapsed:0,wait:0,ithink:!!opts.hasTag?.('ithink')};view.state=state;Object.assign(n.transform,{m_AnchorMin:{x:.5,y:1},m_AnchorMax:{x:.5,y:1},m_Pivot:{x:.5,y:0},m_AnchoredPosition:{x:0,y:0}});
   view.validate=(immediate=false)=>{state.ithink=!!opts.hasTag?.('ithink');const frames=asset.frames[state.ithink?'ithink':'normal'];if(frames!==state.frames){if(immediate||!state.ithink){state.frames=frames;state.index=state.frame=state.elapsed=0;api.batch(()=>{api.setTexture(n.element,frames[0].texture,{nativeSize:true});api.setPosition(n.element,state.ithink?{x:7,y:-79}:{x:0,y:-10});});}else state.wait=5;}};
   view.validate(true);update=dt=>{const hasTag=!!opts.hasTag?.('ithink');if(hasTag!==state.ithink)view.validate();if(!state.frames||state.frames.length<2)return;const previous=state.index;state.elapsed+=dt;let frames=Math.floor(state.elapsed/.05);state.elapsed-=frames*.05;if(state.wait>0){state.wait-=frames;if(state.wait<1){frames=Math.abs(state.wait);state.wait=0;view.validate(true);}}state.frame+=frames;let guard=0;while(state.frame>state.frames[state.index].frame&&guard++<100000){state.frame-=state.frames[state.index].frame;state.index=(state.index+1)%state.frames.length;}if(previous!==state.index)api.setTexture(n.element,state.frames[state.index].texture);};
  }else if(component==='SFxIThink'){
   const raw=n.graphics.find(g=>g.raw),frames=asset.frames||[];if(raw)raw.component.fields.m_Enabled=0;const id=-(++serial),transform={m_LocalPosition:{x:0,y:0,z:0},m_LocalScale:{x:1,y:1,z:1},m_LocalRotation:{x:0,y:0,z:0,w:1},m_AnchorMin:{x:.5,y:1},m_AnchorMax:{x:.5,y:1},m_Pivot:{x:.5,y:0},m_AnchoredPosition:{x:0,y:-20},m_SizeDelta:{x:76,y:104}},image={m_Enabled:0,m_Color:{r:1,g:1,b:1,a:1},m_RaycastTarget:0,m_Maskable:1,m_Sprite:{fileID:0},m_Material:{fileID:0},m_Type:0,m_PreserveAspect:0};const data={source:'native:SFxIThink.Awake@0x51e360',roots:[id],nodes:{[id]:{id,name:'IThinkSFx',path:'/IThinkSFx',active:1,layer:5,transformType:'RectTransform',transformID:id,transform,components:[{fileID:id,classID:114,type:'MonoBehaviour',fields:image}],children:[]}}};const child=api.instantiate(data,n.parent.element),childNode=child.element.__unityNode,state={elapsed:0,index:0,enabled:false,loop:false};view.state=state;cleanup=()=>{child.destroy();if(raw)raw.component.fields.m_Enabled=1;};update=dt=>{state.elapsed+=dt;if(!state.enabled){if(state.elapsed>.2){if(frames.length)child.setSprite(child.element,frames[state.index]);childNode.components[0].fields.m_Enabled=1;state.enabled=true;state.elapsed-=.2;child.refreshLayout(child.element);}return;}const previous=state.index;while(state.elapsed>.1){state.elapsed-=.1;state.index++;}if(state.index>=frames.length){if(!state.loop)return;state.index=0;}if(previous!==state.index)child.setSprite(child.element,frames[state.index]);};refreshNodes([n]);
  }else if(component&&!['SFxCursed','SFxHurt','SFxIncapacitate'].includes(component))diagnostics.unsupported.push({path:n.path,type:'SFxComponent',reason:'Native component '+component+' has not been attached.'});
  return view;
 }
 function updateSFx(dt){if(resourcePaused)return;for(const view of [...sfxPlayers])if(view.node.removed)view.destroy();else if(view.automatic&&view.node.visible)view.update(dt);}
 const frameTasks=[],frameBudget=global.SDDYXFrameBudget?.create();diagnostics.frameBudget=frameBudget?.stats;
 function frame(time){
  if(destroyed)return;if(resourcePaused){lastFrame=0;frameBudget?.reset();animationFrame=requestAnimationFrame(frame);return;}if(frameBudget&&!frameBudget.due(time)){animationFrame=requestAnimationFrame(frame);return;}
  const unscaledDelta=lastFrame?Math.max(0,(time-lastFrame)/1000):0,dt=Math.min(Math.fround(.33333334),unscaledDelta);lastFrame=time;
  // Animation, tint and particles share one presentation transaction. Keep
  // resource preparation outside this transaction; captures consume the final
  // composed frame. The simulation order and delta are unchanged.
  if(presentationDepth++===0)restoreCoffeePresentation();
  try{for(const task of frameTasks.splice(0))task();updateAnimations(dt);updateToggles(unscaledDelta,dt);updateParticles(dt);updateInlineSprites(dt);updateSFx(dt);}
  finally{if(--presentationDepth===0)syncCoffeePresentation(true);}
  for(const atlas of captureAtlases)if(atlas.automatic)atlas.update();animationFrame=requestAnimationFrame(frame);
 }
 if(fontMountState)fontMountState.dispose=()=>apiFor(null).destroy();
 const mainScope=makeScope(scene,null,null);
 listen(stage,'scroll',event=>{const n=event.target?.__unityNode;if(!n)return;const visit=node=>{if(!node.visible)return;for(const g of node.graphics)if(enabled(g.component))paintRectMask(g,node);for(const child of node.children)visit(child);};visit(n);},true);
 function nodeMatrix(n){
  if(particleMatrixCache?.has(n))return particleMatrixCache.get(n);
  // Compose the same 2D affine transforms numerically. Allocate one DOMMatrix
  // at the boundary, rather than five temporary matrices per ancestor.
  let A=1,B=0,C=0,D=1,E=0,F=0;
  for(let p=n;p;p=p.parent){
   const t=p.transform,q=t.m_LocalRotation,pivot=p.canvasRoot?{x:0,y:1}:vec(t.m_Pivot,.5),ox=p.box.w*pivot.x,oy=p.box.h*(1-pivot.y);
   let angle=number(t.m_LocalEulerAnglesHint?.z);if(q&&(q.z||q.x||q.y))angle=Math.atan2(2*(q.w*q.z+q.x*q.y),1-2*(q.y*q.y+q.z*q.z))*180/Math.PI;
   let a,b,c,d;if(p.canvasRoot||p.worldProjection){a=d=p.projection||1;b=c=0;}else{const r=-angle*Math.PI/180,cos=Math.cos(r),sin=Math.sin(r),sx=number(t.m_LocalScale?.x,1),sy=number(t.m_LocalScale?.y,1);a=cos*sx;b=sin*sx;c=-sin*sy;d=cos*sy;}
   const x=p.box.x+ox-(p.parent?.isScrollViewport?p.parent.element.scrollLeft:0)-a*ox-c*oy,y=p.box.y+oy-(p.parent?.isScrollViewport?p.parent.element.scrollTop:0)-b*ox-d*oy;
   const na=a*A+c*B,nb=b*A+d*B,nc=a*C+c*D,nd=b*C+d*D,ne=a*E+c*F+x,nf=b*E+d*F+y;A=na;B=nb;C=nc;D=nd;E=ne;F=nf;if(p.independentCanvas)break;
  }
  const matrix=new DOMMatrix([A,B,C,D,E,F]);if(particleMatrixCache)particleMatrixCache.set(n,matrix);return matrix;
 }

 function assignedCamera(n,selector){let camera=selector!=null?cameraState(selector):null;for(let p=n;!camera&&p;p=p.parent)if(p.worldProjection)camera=cameraState(p.worldProjection.camera);else if(p.canvasRoot&&p.canvas?.canvas?.m_Camera?.fileID)camera=cameraState(p.canvas.canvas.m_Camera);if(!camera||!camera.fields.orthographic)throw Error('World XY conversion requires an assigned original orthographic camera.');return camera;}
 // Flatten the source-sized rendered card layers into an origin-clean texture.
 // The original shader pixels are copied directly. Browser text rasterization
 // is retained; this does not claim to reproduce the native TMP SDF pass.
 async function capture(root,opts={}){
  if(!root)throw Error('Capture root not found.');const alive=()=>{if(destroyed||root.removed)throw Error('Capture source has been destroyed.');};alive();const engine=global.SDDYXUnityShaders;if(!engine?.imageData)throw Error('Original shader texture loader is unavailable.');
  alive();const nodes=[];const collect=n=>{if((n!==root&&!n.active)||n.removed||opts.filter?.(n.source)===false)return;nodes.push(n);initGraphics(n);syncShadowGraphics(n);for(const g of n.graphics)if(enabled(g.component)){if(g.kind==='text')paintText(g,n);else if(g.kind==='image')paintImage(g,n);}for(const c of n.children)collect(c);};collect(root);await prepareCaptureFonts(nodes,alive);
  await Promise.all(nodes.flatMap(n=>n.graphics.filter(g=>g.shader).map(g=>g.shader.warm({isCurrent:()=>!destroyed&&!root.removed,render:true,time:opts.time??resourceShaderTime()}))));alive();
  const ratio=number(opts.pixelRatio,1),outWidth=number(opts.width,root.box.w),outHeight=number(opts.height,root.box.h),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(outWidth*ratio));canvas.height=Math.max(1,Math.ceil(outHeight*ratio));const ctx=canvas.getContext('2d'),offset={x:(outWidth-root.box.w)/2,y:(outHeight-root.box.h)/2},inverse=nodeMatrix(root).inverse();
  const copy=root.element.cloneNode(true);restorePresentationClone(root.element,copy);copy.removeAttribute('hidden');copy.style.cssText+=';position:absolute!important;display:block!important;visibility:hidden!important;left:-100000px!important;top:0!important;transform:none!important;opacity:1!important';stage.appendChild(copy);const copied=new Map([[root.path,copy],...[...copy.querySelectorAll('[data-unity-path]')].map(el=>[el.dataset.unityPath,el])]),copyBox=copy.getBoundingClientRect(),stageScale=stage.getBoundingClientRect().width/width;
  const captureImageLeases=new Map();
  const sources=new Map(Object.values(assets.media||{}).map(m=>[new URL(assetURL(m.url),document.baseURI).href,m.url]));for(const s of Object.values(tmpSprites))if(s.url)sources.set(new URL(assetURL(s.url),document.baseURI).href,s.url);
  const imageFor=async img=>{if(img.tagName==='CANVAS')return img;let url;for(const source of [img.currentSrc,img.src,img.dataset.sourceUrl,img.getAttribute('src')]){if(!source)continue;url=sources.get(source)||sources.get(new URL(source,document.baseURI).href);if(url)break;}if(!url)url=img.dataset.sourceUrl||img.getAttribute('src');if(!engine.acquireImage)throw Error('Original capture image lease API is unavailable.');let lease=captureImageLeases.get(url);if(!lease){lease=engine.acquireImage(url,base);captureImageLeases.set(url,lease);}return lease.ready;};
  const length=(value,parent,defaultValue=0)=>!value||value==='auto'?defaultValue:String(value).endsWith('%')?parseFloat(value)*parent/100:parseFloat(value)||0;
  async function imageTree(element,target,pw,ph){target.save();const style=getComputedStyle(element);if(style.overflow==='hidden'){target.beginPath();target.rect(0,0,pw,ph);target.clip();}for(const child of element.children){if(child.hidden||child.classList.contains('sddyx-unity-shader'))continue;const st=child.style,x=length(st.left,pw),y=length(st.top,ph),w=length(st.width,pw,pw),h=length(st.height,ph,ph);target.save();target.translate(x,y);if(child.tagName==='IMG'||child.tagName==='CANVAS'){const image=await imageFor(child);target.drawImage(image,0,0,w,h);}else await imageTree(child,target,w,h);target.restore();}target.restore();}
  async function drawPlain(g,n,w,h){const temp=document.createElement('canvas');temp.width=Math.max(1,Math.ceil(w*ratio));temp.height=Math.max(1,Math.ceil(h*ratio));const tc=temp.getContext('2d');tc.scale(ratio,ratio);if(g.element.style.backgroundColor){tc.fillStyle=rgba({...g.imageVertexColor,a:1});tc.fillRect(0,0,w,h);}await imageTree(g.element,tc,w,h);const color=g.imageVertexColor||g.component.fields.m_Color;if(!g.element.style.backgroundColor&&color&&[color.r,color.g,color.b].some(v=>v!==1)){const data=tc.getImageData(0,0,temp.width,temp.height);for(let i=0;i<data.data.length;i+=4){data.data[i]*=number(color.r,1);data.data[i+1]*=number(color.g,1);data.data[i+2]*=number(color.b,1);}tc.putImageData(data,0,0);}rectMaskShadow.applyCanvasMask(temp,g.rectMaskState,rectMaskGeometry(g,n));return temp;}
  async function drawText(g,n,m,target=ctx){const cloneNode=copied.get(n.path),graphic=cloneNode&&[...cloneNode.children].find(el=>el.dataset.componentId===String(g.component.fileID));if(!graphic)return;const inv=m.inverse(),localRect=r=>{const point=inv.transformPoint({x:(r.x-copyBox.x)/stageScale,y:(r.y-copyBox.y)/stageScale});return{x:point.x,y:point.y,height:r.height/stageScale/Math.max(1e-9,Math.hypot(m.c,m.d)),width:r.width/stageScale/Math.max(1e-9,Math.hypot(m.a,m.b))};};
   const walker=document.createTreeWalker(graphic,NodeFilter.SHOW_TEXT);let text;while(text=walker.nextNode()){const style=getComputedStyle(text.parentElement);if(style.display==='none')continue;const fontSize=parseFloat(style.fontSize)||36;target.font=[style.fontStyle,style.fontWeight,style.fontSize,style.fontFamily].join(' ');target.fillStyle=style.color;target.textBaseline='alphabetic';const metrics=target.measureText('Mg国'),ascent=metrics.fontBoundingBoxAscent??metrics.actualBoundingBoxAscent??fontSize*.8,descent=metrics.fontBoundingBoxDescent??metrics.actualBoundingBoxDescent??fontSize*.2;let index=0;for(const char of Array.from(text.data)){const range=document.createRange();range.setStart(text,index);index+=char.length;range.setEnd(text,index);const r=localRect(range.getBoundingClientRect());if(opts.debug)(opts.debug.text||(opts.debug.text=[])).push({char,r,font:target.font,color:target.fillStyle,m:[m.a,m.b,m.c,m.d,m.e,m.f],copyBox:copyBox.toJSON(),ascent,descent});if(r.width&&char!=='\n'&&char!=='\r'){const baseline=r.y+(r.height-ascent-descent)/2+ascent;target.fillText(char,r.x,baseline);if(style.textDecorationLine.includes('underline')){target.fillRect(r.x,baseline+fontSize*.08,r.width,Math.max(1,fontSize/16));}}}}
   for(const picture of graphic.querySelectorAll('.sddyx-unity-slice')){const img=picture.querySelector('img');if(!img)continue;const r=localRect(picture.getBoundingClientRect()),source=await imageFor(img),x=length(img.style.left,r.width),y=length(img.style.top,r.height),w=length(img.style.width,r.width,r.width),h=length(img.style.height,r.height,r.height);target.save();target.beginPath();target.rect(r.x,r.y,r.width,r.height);target.clip();target.drawImage(source,r.x+x,r.y+y,w,h);target.restore();}
  }
  const cachedGraphics=new Map(),canvasTintLayers=new Map(),matrices=new Map(nodes.map(n=>[n,inverse.multiply(nodeMatrix(n))]));
  function captureTintLayer(g,n,layer){const c=canvasColor(n,g.canvasOwnerComponent||g.component);if(c.r===1&&c.g===1&&c.b===1)return layer;let cached=canvasTintLayers.get(g);if(!cached||cached.source!==layer){if(cached){cached.canvas.width=1;cached.canvas.height=1;}const output=document.createElement('canvas');output.width=layer.width;output.height=layer.height;const pixels=layer.getContext('2d').getImageData(0,0,layer.width,layer.height),context=output.getContext('2d'),image=context.createImageData(layer.width,layer.height);cached={source:layer,canvas:output,context,pixels,image,key:null};canvasTintLayers.set(g,cached);}const key=[c.r,c.g,c.b].join(',');if(cached.key!==key){cached.key=key;const from=cached.pixels.data,to=cached.image.data;for(let i=0;i<from.length;i+=4){to[i]=from[i]*c.r;to[i+1]=from[i+1]*c.g;to[i+2]=from[i+2]*c.b;to[i+3]=from[i+3];}cached.context.putImageData(cached.image,0,0);}return cached.canvas;}
  function clearCaptureTintLayers(){for(const entry of canvasTintLayers.values()){entry.canvas.width=1;entry.canvas.height=1;}canvasTintLayers.clear();}
  async function drawNode(n,alpha){if(!nodes.includes(n))return;const m=inverse.multiply(nodeMatrix(n)),group=n.components.find(c=>c.type==='CanvasGroup'&&enabled(c));alpha=(n.independentCanvas||group?.fields.m_IgnoreParentGroups?1:alpha)*(n.alphaOverride??group?.fields.m_Alpha??1);ctx.save();ctx.setTransform(ratio*m.a,ratio*m.b,ratio*m.c,ratio*m.d,ratio*(offset.x+m.e),ratio*(offset.y+m.f));if(n.element.style.overflow==='hidden'){ctx.beginPath();ctx.rect(0,0,n.box.w,n.box.h);ctx.clip();}for(const g of n.graphics){if(!enabled(g.component)||(n.hideMaskGraphic&&g.kind==='image'))continue;ctx.save();ctx.globalAlpha=alpha*presentationGraphicAlpha(g);if(g.kind==='text'){if(opts.live||g.rectMaskState||[canvasColor(n,g.canvasOwnerComponent||g.component).r,canvasColor(n,g.canvasOwnerComponent||g.component).g,canvasColor(n,g.canvasOwnerComponent||g.component).b].some(v=>v!==1)){const layer=document.createElement('canvas');layer.width=Math.max(1,Math.ceil(n.box.w*ratio));layer.height=Math.max(1,Math.ceil(n.box.h*ratio));const lc=layer.getContext('2d');lc.scale(ratio,ratio);await drawText(g,n,m,lc);rectMaskShadow.applyCanvasMask(layer,g.rectMaskState,rectMaskGeometry(g,n));if(opts.live)cachedGraphics.set(g,layer);ctx.drawImage(captureTintLayer(g,n,layer),0,0,n.box.w,n.box.h);}else await drawText(g,n,m);}else if(g.kind==='image'){const w=length(g.element.style.width,n.box.w,n.box.w),h=length(g.element.style.height,n.box.h,n.box.h),left=length(g.element.style.left,n.box.w)+number(g.shadowOffset?.x),top=length(g.element.style.top,n.box.h)+number(g.shadowOffset?.y);if(w>0&&h>0){if(g.shader){if(g.shader.error)throw Error(g.shader.error);const previous={pixelWidth:g.shader.options.pixelWidth,pixelHeight:g.shader.options.pixelHeight};try{g.shader.update({pixelWidth:Math.ceil(w*ratio),pixelHeight:Math.ceil(h*ratio)});if(!g.shader.render(opts.time)||g.shader.error||!g.shader.ready)throw Error(g.shader.error||'Required capture shader did not render.');ctx.globalCompositeOperation=g.shader.canvas.style.mixBlendMode==='plus-lighter'?'lighter':'source-over';ctx.drawImage(g.shader.canvas,0,0,g.shader.canvas.width,g.shader.canvas.height,left,top,w,h);}finally{g.shader.update(previous);}}else {const layer=await drawPlain(g,n,w,h);if(opts.live)cachedGraphics.set(g,layer);ctx.drawImage(captureTintLayer(g,n,layer),left,top,w,h);}}}else if(g.kind==='raw')throw Error('Capture contains an unresolved source RenderTexture: '+n.path);ctx.restore();}for(const child of n.children)await drawNode(child,alpha);ctx.restore();}
  function drawLiveNode(n,alpha){if(!matrices.has(n)||(n!==root&&!n.active)||n.removed)return;const m=matrices.get(n),group=n.components.find(c=>c.type==='CanvasGroup'&&enabled(c));alpha=(n.independentCanvas||group?.fields.m_IgnoreParentGroups?1:alpha)*(n.alphaOverride??group?.fields.m_Alpha??1);ctx.save();ctx.setTransform(ratio*m.a,ratio*m.b,ratio*m.c,ratio*m.d,ratio*(offset.x+m.e),ratio*(offset.y+m.f));if(n.element.style.overflow==='hidden'){ctx.beginPath();ctx.rect(0,0,n.box.w,n.box.h);ctx.clip();}for(const g of n.graphics){if(!enabled(g.component)||(n.hideMaskGraphic&&g.kind==='image'))continue;ctx.save();ctx.globalAlpha=alpha*presentationGraphicAlpha(g);if(g.kind==='text'){const layer=cachedGraphics.get(g);if(layer)ctx.drawImage(captureTintLayer(g,n,layer),0,0,n.box.w,n.box.h);}else if(g.kind==='image'){const w=length(g.element.style.width,n.box.w,n.box.w),h=length(g.element.style.height,n.box.h,n.box.h),left=length(g.element.style.left,n.box.w)+number(g.shadowOffset?.x),top=length(g.element.style.top,n.box.h)+number(g.shadowOffset?.y);if(w>0&&h>0){if(g.shader?.ready){const previous={pixelWidth:g.shader.options.pixelWidth,pixelHeight:g.shader.options.pixelHeight};Object.assign(g.shader.options,{pixelWidth:Math.ceil(w*ratio),pixelHeight:Math.ceil(h*ratio)});if(g.shader.animated||g.shader.dirty||g.shader.canvas.width!==Math.ceil(w*ratio)||g.shader.canvas.height!==Math.ceil(h*ratio))g.shader.render(liveTime);ctx.globalCompositeOperation=g.shader.canvas.style.mixBlendMode==='plus-lighter'?'lighter':'source-over';ctx.drawImage(g.shader.canvas,0,0,g.shader.canvas.width,g.shader.canvas.height,left,top,w,h);Object.assign(g.shader.options,previous);}else{const layer=cachedGraphics.get(g);if(layer)ctx.drawImage(captureTintLayer(g,n,layer),left,top,w,h);}}}ctx.restore();}for(const child of n.children)drawLiveNode(child,alpha);ctx.restore();}
  const liveSignature=()=>JSON.stringify(nodes.map(n=>[n.active,n.alphaOverride,n.components.find(c=>c.type==='CanvasGroup'&&enabled(c))?.fields.m_Alpha,n.graphics.map(g=>[enabled(g.component),g.element.style.opacity,canvasColor(n,g.canvasOwnerComponent||g.component)])]));let liveTime,lastLiveSignature;
  try{ctx.save();ctx.beginPath();ctx.rect(0,0,canvas.width,canvas.height);ctx.clip();await drawNode(root,1);ctx.restore();alive();canvas.dataset.sourceCapture=root.path;canvas.dataset.captureGeometry=JSON.stringify({width:outWidth,height:outHeight,contentWidth:root.box.w,contentHeight:root.box.h,pixelRatio:ratio,offset});if(!opts.live){clearCaptureTintLayers();return canvas;}
   const view={canvas,root,changed:true,get backingPixels(){return canvas.width*canvas.height+[...cachedGraphics.values()].reduce((sum,layer)=>sum+layer.width*layer.height,0)+[...canvasTintLayers.values()].reduce((sum,entry)=>sum+entry.canvas.width*entry.canvas.height,0);},get tintBufferBytes(){return[...canvasTintLayers.values()].reduce((sum,entry)=>sum+entry.pixels.data.byteLength+entry.image.data.byteLength,0);},get staticLayers(){return cachedGraphics.size;},render(time){if(view.destroyed)return canvas;const signature=liveSignature();view.changed=signature!==lastLiveSignature||nodes.some(n=>n.graphics.some(g=>g.shader?.animated||g.shader?.dirty));if(!view.changed)return canvas;lastLiveSignature=signature;liveTime=time;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);drawLiveNode(root,1);engine.invalidateTexture?.(canvas);return canvas;},destroy(){if(view.destroyed)return;view.destroyed=true;for(const layer of cachedGraphics.values()){layer.width=1;layer.height=1;}cachedGraphics.clear();clearCaptureTintLayers();matrices.clear();canvas.width=1;canvas.height=1;engine.releaseTexture?.(canvas);captureViews.delete(view);}};captureViews.add(view);return view;
  }finally{for(const lease of captureImageLeases.values())lease.release();captureImageLeases.clear();copy.remove();copy.replaceChildren();copied.clear();sources.clear();}
 }

 function createCaptureAtlas(opts={}){
  const engine=global.SDDYXUnityShaders;if(!engine)throw Error('Original shader renderer is required for card capture.');
  const columns=number(opts.columns,16),rows=number(opts.rows,8),cellSize={x:number(opts.cellSize?.x,256),y:number(opts.cellSize?.y,512)};
  if(!Number.isInteger(columns)||!Number.isInteger(rows)||columns<1||rows<1||!Number.isInteger(cellSize.x)||!Number.isInteger(cellSize.y)||cellSize.x<1||cellSize.y<1)throw Error('Invalid source capture atlas geometry.');
  // Integer backing boundaries keep every native tile at exactly 1/16 × 1/8
  // UV extent at fractional display DPI. Round density upward, never crop or
  // rescale one tile independently of its neighbours.
  const gcd=(a,b)=>b?gcd(b,a%b):a,quantum=gcd(cellSize.x,cellSize.y),density=value=>{if(!(value>0)||!Number.isFinite(value))throw Error('Invalid source capture pixel ratio.');return Math.ceil(value*quantum)/quantum;};
  let requestedPixelRatio=number(opts.pixelRatio,Math.min(1,(host.clientWidth||width)/width*(global.devicePixelRatio||1))),pixelRatio=density(requestedPixelRatio),tileWidth=cellSize.x*pixelRatio,tileHeight=cellSize.y*pixelRatio;
  const canvas=document.createElement('canvas'),entries=new Map();canvas.width=columns*tileWidth;canvas.height=rows*tileHeight;canvas.dataset.sourceCaptureAtlas='RiteOpCards';const ctx=canvas.getContext('2d');let epoch=0;
  engine.invalidateTexture(canvas,{logicalWidth:columns*cellSize.x,logicalHeight:rows*cellSize.y,filterMode:1,wrapU:0,wrapV:0});
  const atlas={canvas,columns,rows,cellSize,pixelRatio,requestedPixelRatio,automatic:opts.autoUpdate!==false,entries,
   async setPixelRatio(value){
    if(atlas.destroyed)throw Error('Capture atlas is destroyed.');const next=density(value);requestedPixelRatio=atlas.requestedPixelRatio=value;if(next===pixelRatio)return atlas;
    epoch++;pixelRatio=atlas.pixelRatio=next;tileWidth=cellSize.x*pixelRatio;tileHeight=cellSize.y*pixelRatio;canvas.width=columns*tileWidth;canvas.height=rows*tileHeight;engine.invalidateTexture(canvas);
    const sources=[...entries].map(([index,entry])=>[index,entry.node]);await Promise.all(sources.map(([index,node])=>atlas.add(node.element,index)));return atlas;
   },
   async add(selector,index=entries.size){
    if(atlas.destroyed)throw Error('Capture atlas is destroyed.');if(!Number.isInteger(index)||index<0||index>=columns*rows)throw Error('Source capture atlas index is out of range: '+index);
    const n=selector?.__unityNode||selector?.element?.__unityNode||nodesByPath.get(selector);if(!n||n.removed)throw Error('Source capture atlas root not found: '+selector);
    const token=epoch,previous=entries.get(index),entry={node:n,view:previous?.view||null,pending:true};entries.set(index,entry);
    try{const view=await capture(n,{width:cellSize.x,height:cellSize.y,pixelRatio,live:true});if(atlas.destroyed||epoch!==token||entries.get(index)!==entry||n.removed){view.destroy();return index;}entry.view?.destroy();entry.view=view;entry.pending=false;entry.new=true;atlas.update();return index;}
    catch(error){if(entries.get(index)===entry){if(previous)entries.set(index,previous);else entries.delete(index);}if(atlas.destroyed||destroyed||n.removed)return index;throw error;}
   },
   async refresh(index){if(index===undefined){await Promise.all([...entries.keys()].map(i=>atlas.refresh(i)));return atlas;}const entry=entries.get(index);if(entry)return atlas.add(entry.node.element,index);},
   remove(index){const entry=entries.get(index);entry?.view?.destroy();entries.delete(index);ctx.clearRect(index%columns*tileWidth,Math.floor(index/columns)*tileHeight,tileWidth,tileHeight);engine.invalidateTexture(canvas);},
   update(time=engine.time()){
    if(atlas.destroyed)return;for(const [index,entry]of entries){if(entry.node.removed||entry.view?.destroyed){atlas.remove(index);continue;}if(!entry.view||entry.pending)continue;entry.view.render(time);if(entry.new||entry.view.changed){const x=index%columns*tileWidth,y=Math.floor(index/columns)*tileHeight;ctx.clearRect(x,y,tileWidth,tileHeight);ctx.drawImage(entry.view.canvas,x,y);engine.updateTextureRegion(canvas,entry.view.canvas,x,y);entry.new=false;}}
   },
   destroy(){if(atlas.destroyed)return;atlas.destroyed=true;epoch++;for(const entry of entries.values())entry.view?.destroy();entries.clear();canvas.width=1;canvas.height=1;engine.releaseTexture(canvas);captureAtlases.delete(atlas);}
  };captureAtlases.add(atlas);return atlas;
 }

 function apiFor(scope){
  const inScope=n=>!scope||scope.roots.some(root=>{let p=n;while(p){if(p===root)return true;p=p.parent;}return false;});
  const records=()=>{if(!scope)return all.filter(n=>!n.removed);const list=[];const add=n=>{if(n.removed)return;list.push(n);for(const child of n.children)add(child);};scope.roots.forEach(add);return list;};
  const match=selector=>{
   if(selector?.__unityNode){const n=selector.__unityNode;return !n.removed&&inScope(n)?[n]:[];}
   if(selector&&selector.element?.__unityNode)return match(selector.element);
   if(selector==null)return scope?.root?[scope.root]:roots;
   if(Array.isArray(selector))return selector.flatMap(match);
   if(typeof selector==='number')return records().filter(n=>n.source.id===selector);
   const sel=String(selector),direct=nodesByPath.get(sel);if(direct&&!direct.removed&&inScope(direct))return[direct];const exact=records().filter(n=>n.path===sel||n.source.path===sel);if(exact.length)return exact;
   if(sel==='*')return records();
   if(sel.includes('*')){const rx=new RegExp('^'+sel.split('*').map(p=>p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$');return records().filter(n=>rx.test(n.path)||rx.test(n.source.path));}
   return records().filter(n=>suffix(n.path,sel)||n.source.name===sel);
  };
  const api={
   element:scope?.root?.element||stage,container:stage,host,scene:scope?.data||scene,diagnostics,
   registerExternalRenderer(selector,descriptor){const nodes=match(selector);if(nodes.length!==1)throw Error('External renderer holder must resolve exactly once.');return registerExternalRenderer(nodes[0],descriptor);},
   prepareCommonImageOwners,commonImageOwnersReady,visibleResourcesReady:opts=>visibleResourcesReady(records,opts),setResourcePaused,prepareVisibleResources:opts=>prepareVisibleResources(records,opts),get resourcePaused(){return resourcePaused;},get resourceTime(){return resourceShaderTime();},
   prepareSubtreeResources(selector,opts={}){if(selector==null||selector==='*')throw Error('Impending preparation requires an explicit named subtree.');const matches=match(selector);if(!matches.length)throw Error('Required impending subtree is unavailable.');const selected=new Set(),visit=n=>{selected.add(n);n.children.forEach(visit);};matches.forEach(visit);return prepareSubtreeResources([...selected],opts);},
   prepareParticleResources(selector,opts={}){const selected=new Set(),visit=n=>{selected.add(n);n.children.forEach(visit);};match(selector).forEach(visit);return prepareVisibleResources(()=>[...selected],{...opts,particlesOnly:true,includeHidden:true});},
   releasePreparedParticleResources(selector){const selected=new Set(),visit=n=>{selected.add(n);n.children.forEach(visit);};match(selector).forEach(visit);releasePreparedParticles(selected);},
   resourceStats(){const nodes=records(),pictures=[...stage.querySelectorAll('img')],canvases=[...stage.querySelectorAll('canvas')],unique=new Map();for(const img of pictures)if(img.currentSrc&&img.naturalWidth)unique.set(img.currentSrc,{width:img.naturalWidth,height:img.naturalHeight});return{resourcePreparation:resourcePreparationStats(),tintFilters:filters.size,blackShadowSprites:blackShadowSprites.size,nodes:nodes.length,scopes:scopes.length,animators:animationPlayers.length,particleSystems:particlePlayers.length,captureAtlases:captureAtlases.size,captureViews:captureViews.size,captureBackingPixels:[...captureAtlases].reduce((sum,a)=>sum+a.canvas.width*a.canvas.height,0)+[...captureViews].reduce((sum,v)=>sum+v.backingPixels,0),captureStaticLayers:[...captureViews].reduce((sum,v)=>sum+v.staticLayers,0),captureTintBufferBytes:[...captureViews].reduce((sum,v)=>sum+(v.tintBufferBytes||0),0),inlineAnimations:inlineAnimations.length,pendingImages:pendingImages.size,imageElements:pictures.length,loadedImageElements:pictures.filter(img=>img.currentSrc&&img.naturalWidth).length,uniqueLoadedImages:unique.size,estimatedDecodedImageBytes:[...unique.values()].reduce((s,r)=>s+r.width*r.height*4,0),canvasElements:canvases.length,canvasBackingPixels:canvases.reduce((s,c)=>s+c.width*c.height,0),nodeEventListeners:nodes.reduce((s,n)=>s+(n.disposers?.length||0),0)};},
   capture:(selector,opts)=>capture(match(selector)[0],opts),
   createCaptureAtlas:opts=>createCaptureAtlas(opts),
   find:selector=>match(selector)[0]?.element||null,findAll:selector=>match(selector).map(n=>n.element),
   onComponentLifecycle(callback){if(typeof callback!=='function')throw Error('Component lifecycle callback must be a function.');const record={scope,fn:event=>{if(inScope(event.node))callback(event);}};componentLifecycleSubscribers.add(record);return()=>componentLifecycleSubscribers.delete(record);},
   onActiveChange(callback){if(typeof callback!=='function')throw Error('Visibility callback must be a function.');const record={scope,fn:event=>{if(inScope(event.node))callback(event);}};activeSubscribers.add(record);return()=>activeSubscribers.delete(record);},
   getBounds(selector,relativeTo,opts={}){const root=match(selector)[0],relative=match(relativeTo)[0];if(!root||!relative)return null;const inverse=nodeMatrix(relative).inverse(),pivot=vec(relative.transform.m_Pivot,.5),points=[];const collect=n=>{if(n.source.transformType==='RectTransform'){const m=inverse.multiply(nodeMatrix(n));for(const [x,y]of [[0,0],[n.box.w,0],[0,n.box.h],[n.box.w,n.box.h]]){const p=m.transformPoint({x,y});points.push({x:p.x-relative.box.w*pivot.x,y:relative.box.h*(1-pivot.y)-p.y,z:0});}}if(opts.recursive!==false)for(const child of n.children)if(child.active||opts.includeInactive)collect(child);};collect(root);if(!points.length)return null;const min={x:Math.min(...points.map(p=>p.x)),y:Math.min(...points.map(p=>p.y)),z:0},max={x:Math.max(...points.map(p=>p.x)),y:Math.max(...points.map(p=>p.y)),z:0};return{min,max,center:{x:(min.x+max.x)/2,y:(min.y+max.y)/2,z:0},extents:{x:(max.x-min.x)/2,y:(max.y-min.y)/2,z:0}};},
   getCamera(selector){const camera=cameraState(selector);return camera?{path:camera.path,fileID:camera.fileID,position:{...camera.position},orthographicSize:camera.fields['orthographic size'],fields:clone(camera.fields)}:null;},
   setCamera(selector,values){updateCamera(selector,values);return api;},
   projectWorld(selector,cameraSelector){if(!match(selector).length){const source=Object.values(scene.nodes).find(n=>n.path===selector);if(!source)throw Error('World source root not found: '+selector);const oldRoots=roots.filter(n=>n.path.startsWith(selector+'/'));for(const old of oldRoots){const remove=n=>{n.removed=true;nodesByPath.delete(n.path);for(const g of n.graphics){g.shader?.destroy();releaseCanvasFallbacks(g.element);releaseTint(g);blackShadowSprites.release(g);}for(const p of n.particles||[]){p.surface.destroy();p.canvas.remove();}n.children.forEach(remove);};remove(old);old.element.remove();roots.splice(roots.indexOf(old),1);}const worldScope=makeScope({...scene,worldRoots:[source.id]},null,null);initAnimators(worldScope);}const camera=cameraState(cameraSelector);if(!camera)throw Error('World projection camera not found: '+cameraSelector);for(const n of match(selector)){if(n.parent)throw Error('World projection requires a top-level source root.');n.worldProjection={camera:camera.path};n.element.style.zIndex=String(number(camera.fields.m_Depth)*10000);}refreshNodes(match(selector));return api;},
   projectPoint(selector,targetSelector=null,point={x:0,y:0}){const n=match(selector)[0];if(!n)return null;const pivot=vec(n.transform.m_Pivot,.5),nativePoint=nodeMatrix(n).transformPoint({x:n.box.w*pivot.x+number(point.x),y:n.box.h*(1-pivot.y)-number(point.y)}),bounds=stage.getBoundingClientRect(),screen={x:bounds.x+nativePoint.x*bounds.width/width,y:bounds.y+nativePoint.y*bounds.height/height};let position=screen;if(targetSelector!=null){const target=match(targetSelector)[0];if(!target)return null;const local=nodeMatrix(target).inverse().transformPoint(nativePoint),tp=vec(target.transform.m_Pivot,.5);position={x:local.x-target.box.w*tp.x,y:target.box.h*(1-tp.y)-local.y};}return{x:position.x,y:position.y,screen,native:{x:nativePoint.x,y:nativePoint.y},visible:n.visible};},
   getWorldPosition(selector,cameraSelector=null,point={x:0,y:0}){const n=match(selector)[0];if(!n)return null;const camera=assignedCamera(n,cameraSelector),p=api.projectPoint(selector,null,point).native,unit=2*camera.fields['orthographic size']/height;return{x:camera.position.x+(p.x-width/2)*unit,y:camera.position.y+(height/2-p.y)*unit};},
   worldToLocal(selector,point,cameraSelector=null){const n=match(selector)[0];if(!n)return null;const camera=assignedCamera(n,cameraSelector),scale=height/(2*camera.fields['orthographic size']),local=nodeMatrix(n).inverse().transformPoint({x:width/2+(point.x-camera.position.x)*scale,y:height/2-(point.y-camera.position.y)*scale}),pivot=vec(n.transform.m_Pivot,.5);return{x:local.x-n.box.w*pivot.x,y:n.box.h*(1-pivot.y)-local.y};},
   isRaycastLocationValid(selector,point){const n=match(selector)[0],filter=n?.alphaRaycast;if(!n)return false;if(!filter?.data?.readable||!resolveSprite(filter.image.fields.m_Sprite))return true;const local=api.screenToLocal(n.element,point),pivot=vec(n.transform.m_Pivot,.5);return !!local&&alphaRaycastSample(filter.data,(local.x+n.box.w*pivot.x)/n.box.w,(local.y+n.box.h*pivot.y)/n.box.h,number(filter.component.fields.alphaThreshold,.1));},
   screenToLocal(selector,point){const n=match(selector)[0];if(!n)return null;const bounds=stage.getBoundingClientRect(),local=nodeMatrix(n).inverse().transformPoint({x:(point.x-bounds.x)*width/bounds.width,y:(point.y-bounds.y)*height/bounds.height}),pivot=vec(n.transform.m_Pivot,.5);return{x:local.x-n.box.w*pivot.x,y:n.box.h*(1-pivot.y)-local.y};},
   show(selector,active=true){const changed=[];for(const n of match(selector)){if(n.active!==!!active)changed.push(n);n.active=n.activeOverride=!!active;}refreshNodes(changed);return api;},
   hide(selector){return api.show(selector,false);},
   setText(selector,text){for(const n of match(selector)){n.textOverride=String(text??'');if(!n.components.some(c=>'m_text'in c.fields||'m_Text'in c.fields))for(const child of n.children)if(child.components.some(c=>'m_text'in c.fields||'m_Text'in c.fields))child.textOverride=String(text??'');}refreshNodes(match(selector));return api;},
   setTextStyle(selector,key){const changed=[];for(const n of match(selector)){const local=fields(n,f=>f.m_Script?.fileID===1706830935),text=fields(n,f=>'m_text'in f);if(!local||!text)continue;if(n.textOverride===undefined)n.textOverride=String(n.graphics.find(g=>g.kind==='text')?.text??text.m_text??'');local.key='';local.style=String(key??'');localizeNode(n);changed.push(n);}refreshNodes(changed);return api;},
   setToggle(selector,on,opts={}){for(const n of match(selector))playToggle(n,on,opts);return api;},
   updateToggles(dt){updateToggles(dt);return api;},
   getCanvasColor(selector,componentId=null){const n=match(selector)[0],component=n?.components.find(c=>componentId==null?('m_Color'in c.fields||'m_fontColor'in c.fields):String(c.fileID)===String(componentId));return component?canvasColor(n,component):null;},
   setAlpha(selector,value){for(const n of match(selector))n.alphaOverride=clamp(number(value,1));refreshNodes(match(selector));return api;},
   batch(fn){batchDepth++;try{return fn(api);}finally{batchDepth--;if(!batchDepth){if(batchPending){batchPending=false;pendingLayout.clear();refreshLayout();}else if(pendingLayout.size){const pending=[...pendingLayout];pendingLayout.clear();refreshNodes(pending);}flushCanvasColors();}}},
   setPosition(selector,position,opts={}){const changed=[];for(const n of match(selector)){const key=n.source.transformType==='Transform'?'m_LocalPosition':'m_AnchoredPosition';if(Object.entries(position).every(([k,v])=>n.transform[key]?.[k]===v))continue;n.transform[key]={...n.transform[key],...position};changed.push(n);if(opts.layout===false){n.box=rect(n,n.parent?.box.w??width,n.parent?.box.h??height);n.element.style.left=n.box.x+'px';n.element.style.top=n.box.y+'px';}}if(opts.layout!==false)refreshNodes(changed);return api;},
   setScale(selector,value,opts={}){for(const n of match(selector)){const scale=typeof value==='number'?{x:value,y:value,z:value}:{...n.transform.m_LocalScale,...value};n.transform.m_LocalScale=scale;if(opts.layout===false)n.element.style.transform=n.element.style.transform.replace(/scale\([^)]*\)/,`scale(${scale.x},${scale.y})`);}if(opts.layout!==false)refreshNodes(match(selector));return api;},
   setSiblingIndex(selector,index){const changed=[];for(const n of match(selector)){const siblings=n.parent?n.parent.children:roots,previous=siblings.indexOf(n);if(previous<0)continue;const next=Math.max(0,Math.min(siblings.length-1,Math.trunc(number(index))));if(previous===next)continue;siblings.splice(previous,1);siblings.splice(next,0,n);const domParent=n.element.parentNode;if(domParent){const following=siblings.slice(next+1).find(s=>s.element.parentNode===domParent);domParent.insertBefore(n.element,following?.element||null);}changed.push(n.parent||n);}refreshNodes(changed);return api;},
   setLocalPosition(selector,position,opts={}){const nodes=match(selector);for(const n of nodes){for(const [key,value]of Object.entries(position))applyProperty(n,'m_LocalPosition.'+key,value,n.source.transformType==='RectTransform'?224:4);if(opts.layout===false){n.box=rect(n,n.parent?.box.w??width,n.parent?.box.h??height);n.element.style.left=n.box.x+'px';n.element.style.top=n.box.y+'px';}}if(opts.layout!==false)refreshNodes(nodes);return api;},
   getLocalPosition(selector){const n=match(selector)[0];return n?localPosition(n):null;},
   setAspectRatio(selector,ratio){const value=Math.fround(Number(ratio)),changed=[];for(const n of match(selector)){const component=n.components.find(c=>global.SDDYXAspectRatioFitter?.isAspectRatioFitter(c));if(!component)continue;const f=component.fields;if(f.m_AspectRatio===value||(Number.isNaN(f.m_AspectRatio)&&Number.isNaN(value)))continue;f.m_AspectRatio=value;changed.push(n);}refreshNodes(changed);return api;},
   setSize(selector,size){const changed=[];for(const n of match(selector)){if(Object.entries(size).every(([k,v])=>n.transform.m_SizeDelta?.[k]===v))continue;n.transform.m_SizeDelta={...n.transform.m_SizeDelta,...size};changed.push(n);}refreshNodes(changed);return api;},
   setNativeSpriteSize(selector){const nodes=match(selector).filter(nativeSpriteSize);refreshNodes(nodes);return api;},
   setSizeWithCurrentAnchors(selector,size){const nodes=match(selector);for(const n of nodes){const parent=n.parent?.source.transformType==='RectTransform'?n.parent.box:null,delta={...n.transform.m_SizeDelta};for(const axis of ['x','y'])if(size[axis]!==undefined)delta[axis]=number(size[axis])-number(parent?.[axis==='x'?'w':'h'])*(number(n.transform.m_AnchorMax?.[axis],.5)-number(n.transform.m_AnchorMin?.[axis],.5));n.transform.m_SizeDelta=delta;}refreshNodes(nodes);return api;},
   reparent(selector,parentSelector,opts={}){const parent=all.find(n=>!n.removed&&(n.element===parentSelector||n.path===parentSelector||n.source.path===parentSelector||n.element===parentSelector?.element));if(!parent)throw Error('Reparent target not found: '+parentSelector);for(const n of match(selector)){if(n===parent)continue;for(let a=parent;a;a=a.parent)if(a===n)throw Error('Cannot reparent a Unity node under its descendant.');const oldMatrix=nodeMatrix(n),oldBox={...n.box},oldPath=n.path;if(n.parent)n.parent.children=n.parent.children.filter(c=>c!==n);else roots.splice(roots.indexOf(n),1);n.parent=parent;parent.children.push(n);parent.element.appendChild(n.element);const rename=(node)=>{node.scope.runtimePaths.delete(node.path);nodesByPath.delete(node.path);node.path=parent.path+'/'+oldPath.split('/').pop()+node.path.slice(oldPath.length);node.element.dataset.unityPath=node.path;node.scope.runtimePaths.set(node.path,node);nodesByPath.set(node.path,node);for(const child of node.children)rename(child);};rename(n);
    if(opts.worldPositionStays!==false){const local=nodeMatrix(parent).inverse().multiply(oldMatrix),pivot=vec(n.transform.m_Pivot,.5),point=local.transformPoint({x:oldBox.w*pivot.x,y:oldBox.h*(1-pivot.y)}),sx=Math.hypot(local.a,local.b),sy=sx?(local.a*local.d-local.b*local.c)/sx:Math.hypot(local.c,local.d),angle=-Math.atan2(local.b,local.a);point.x+=parent.element.scrollLeft;point.y+=parent.element.scrollTop;n.transform.m_LocalScale={x:sx,y:sy,z:number(n.transform.m_LocalScale?.z,1)};n.transform.m_LocalRotation={x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)};n.transform.m_LocalEulerAnglesHint={x:0,y:0,z:angle*180/Math.PI};
     if(n.source.transformType==='Transform'){const p=vec(parent.transform.m_Pivot,.5);n.transform.m_LocalPosition={...n.transform.m_LocalPosition,x:point.x-parent.box.w*p.x,y:parent.box.h*(1-p.y)-point.y};}else{const min=vec(n.transform.m_AnchorMin,.5),max=vec(n.transform.m_AnchorMax,.5);n.transform.m_SizeDelta={x:oldBox.w-parent.box.w*(max.x-min.x),y:oldBox.h-parent.box.h*(max.y-min.y)};n.transform.m_AnchoredPosition={x:point.x-parent.box.w*(min.x+(max.x-min.x)*pivot.x),y:parent.box.h*(1-min.y-(max.y-min.y)*pivot.y)-point.y};}}
   }refreshLayout();return api;},
   setMaterial(selector,value){const material=materials[value]||Object.values(materials).find(m=>m.source===value||m.source.replace(/^Resources\//,'').replace(/\.mat$/,'')===String(value).replace(/\.mat$/,''));for(const n of match(selector)){for(const c of n.components)if('m_Sprite'in c.fields||'m_Material'in c.fields){c.fields.m_Material={guid:material?.guid||value,fileID:2100000};for(const g of n.graphics){g.paintKey=null;g.materialOverride=null;}}}refreshNodes(match(selector));return api;},
   setTexture(selector,value,opts={}){if(value instanceof HTMLCanvasElement&&!value.dataset.sourceCaptureAtlas)global.SDDYXUnityShaders?.invalidateTexture?.(value);const texture=textureRecord(value);if(value&&!texture)throw Error('Original texture not found: '+(value.guid||value));const nodes=match(selector);for(const n of nodes){initGraphics(n);for(const g of n.graphics)if(g.raw||'m_UVRect'in g.component.fields){const f=g.component.fields;f.m_Texture=texture?{guid:texture.guid,fileID:2800000}:{fileID:0};g.raw=true;g.kind='image';g.sprite=rawSprite(texture,f.m_UVRect);f.m_Sprite=g.sprite;g.paintKey=null;delete g.element.dataset.unsupported;if(opts.nativeSize&&texture){n.transform.m_AnchorMax={...n.transform.m_AnchorMin};n.transform.m_SizeDelta={x:Math.round(texture.width*number(f.m_UVRect?.width,1)),y:Math.round(texture.height*number(f.m_UVRect?.height,1))};}}}refreshNodes(nodes);return api;},
   mountSFx(selector,name,opts={}){const n=match(selector)[0];return mountSFx(n,name,opts);},
   setMaterialTexture(selector,name,value){const texture=textureRecord(value);if(value&&!texture)throw Error('Original material texture not found: '+(value.guid||value));const nodes=match(selector);for(const n of nodes){initGraphics(n);for(const g of n.graphics){const source=g.materialOverride||materials[g.component.fields.m_Material?.guid];if(!source)continue;if(!g.materialOverride)g.materialOverride=clone(source);const previous=g.materialOverride.textures[name]||{m_Scale:{x:1,y:1},m_Offset:{x:0,y:0}};g.materialOverride.textures[name]={...previous,m_Texture:texture?{guid:texture.guid,fileID:2800000}:{fileID:0},guid:texture?.guid||null,url:texture?.url||null};g.shaderKey=null;g.paintKey=null;}}refreshNodes(nodes);return api;},
   setMaterialFloat(selector,name,value){for(const n of match(selector)){initGraphics(n);for(const g of n.graphics){const source=g.materialOverride||materials[g.component.fields.m_Material?.guid];if(!source)continue;if(!g.materialOverride)g.materialOverride=clone(source);g.materialOverride.floats[name]=number(value);if(g.shader){g.shader.material=g.materialOverride;g.shader.update({});}}}return api;},
   setSprite(selector,value){const s=resolveSprite(value);for(const n of match(selector)){const graphic=n.components.find(c=>'m_Sprite'in c.fields);if(graphic){graphic.fields.m_Sprite=s||value;for(const g of n.graphics)if(g.component===graphic){g.sprite=s;g.paintKey=null;}}}refreshNodes(match(selector));return api;},
   bind(selector,handler){return api.on(selector,'click',handler);},
   on(selector,type,handler){if(typeof type==='function'){handler=type;type='click';}const offs=match(selector).map(n=>{n.element.dataset.interactive='true';if(n.element.tabIndex<0)n.element.tabIndex=0;return listen(n.element,type,e=>{if(type==='click')e.stopPropagation();if(options.runResourceOperation)options.runResourceOperation(()=>handler(e,n.source,api));else handler(e,n.source,api);});});return()=>offs.forEach(f=>f());},
   setInteractable(selector,value){for(const n of match(selector)){if(n.selectable)n.selectable.fields.m_Interactable=+!!value;n.element.setAttribute('aria-disabled',String(!value));n.element.tabIndex=value?0:-1;animatorState(n,value?'Normal':'Disabled',false);}refreshNodes(match(selector));return api;},
   applyProperty(selector,property,value,classID,script){for(const n of match(selector))applyProperty(n,property,value,classID,script);return api;},
   applySamples(rootSelector,samples){const root=match(rootSelector)[0];if(!root)return api;
    // Only identical consecutive primitive samples may omit a settled refresh.
    // Mutable object/reference samples retain the original refresh behavior.
    const previous=root.sampleRefreshInputs,primitive=Array.isArray(samples)&&samples.every(s=>s.value===null||typeof s.value!=='object'&&typeof s.value!=='function'),same=primitive&&previous&&previous.length===samples.length&&samples.every((s,i)=>{const p=previous[i];return p.path===s.path&&p.property===(s.property||s.attribute)&&p.value===s.value&&p.classID===s.classID&&p.scriptID===s.script?.fileID&&p.scriptGUID===s.script?.guid;});
    if(!same)root.sampleRefreshInputs=primitive?samples.map(s=>({path:s.path,property:s.property||s.attribute,value:s.value,classID:s.classID,scriptID:s.script?.fileID,scriptGUID:s.script?.guid})):null;
    for(const s of samples){const n=!s.path?root:nodesByPath.get(root.path+'/'+s.path);applyProperty(n,s.property||s.attribute,s.value,s.classID,s.script);}
    // Every sample still compares against live fields. Pending direct writes,
    // quaternion/Euler reassertion and reentrant changes still settle normally.
    const changedNodes=[];for(const dirty of animatedNodes)for(let n=dirty;n;n=n.parent)if(n===root){changedNodes.push(dirty);break;}
    // Scalar animation tracks already identify their changed nodes. Relayout
    // their affected branches (including layout ancestors), not the entire
    // Wizard/MainUI hierarchy for a single moving or fading child.
    const refresh=changedNodes.length?changedNodes:!same&&!primitive?[root]:[];
    if(refresh.length){if(presentationDepth++===0)restoreCoffeePresentation();try{refreshNodes(refresh);}catch(error){root.sampleRefreshInputs=null;throw error;}finally{if(--presentationDepth===0)syncCoffeePresentation();}}return api;
   },
   queueFrameUpdate(fn){if(destroyed)return false;frameTasks.push(fn);return true;},
   batchPresentation(fn){if(destroyed)return fn();if(presentationDepth++===0)restoreCoffeePresentation();try{return fn();}finally{if(--presentationDepth===0)syncCoffeePresentation();}},
   setFontSize(size){if(!['xs','sm','md','lg','xl'].includes(size))throw Error('Unknown original font-size setting: '+size);options.fontSize=size;for(const n of all)if(!n.removed)localizeNode(n);refreshLayout();return api;},
   setLocale(language){locale=options.locale=String(language);translatedConfig=content?.i18n?.[locale]||{};for(const n of all)if(!n.removed)localizeNode(n,true);refreshLayout();return api;},
   setInputScheme(scheme){inputScheme=String(scheme);for(const n of all)if(!n.removed&&n.stateHelpers)animatorState(n,n.currentSelectableState,false);refreshLayout();return api;},
   setState(selector,state){for(const n of match(selector))animatorState(n,state,false);refreshNodes(match(selector));return api;},
   refreshLayout(selector){return selector==null?refreshLayout():refreshNodes(match(selector));},updateAnimations,updateParticles,updateInlineSprites,updateSFx,
   playParticles(selector,opts={}){controlParticles(match(selector),'play',opts);return api;},stopParticles(selector,opts={}){controlParticles(match(selector),'stop',opts);return api;},
   instantiate(prefab,parentSelector,opts={}){if(typeof prefab==='string')prefab=global.SDDYX_PREFABS?.[prefab];if(!prefab?.nodes)throw Error('Prefab data is not loaded. Load its local assets/prefabs script first.');const parent=match(parentSelector)[0];if(!parent)throw Error('Prefab parent not found: '+parentSelector);const sc=makeScope(prefab,parent,opts.name,prefab.nodes===scene.nodes?mainScope:null);for(const n of sc.roots){if(opts.position){const key=n.source.transformType==='Transform'?'m_LocalPosition':'m_AnchoredPosition';n.transform[key]={...n.transform[key],...opts.position};}if(opts.size)n.transform.m_SizeDelta={...n.transform.m_SizeDelta,...opts.size};if(opts.scale!==undefined)n.transform.m_LocalScale=typeof opts.scale==='number'?{x:opts.scale,y:opts.scale,z:1}:{...n.transform.m_LocalScale,...opts.scale};if(opts.active!==undefined)n.active=!!opts.active;}refreshLayout();initAnimators(sc);refreshLayout();return apiFor(sc);},
   destroy(){if(scope?.instance){if(destroyed||scope.destroying||scope.destroyed)return;scope.destroying=true;}else{if(destroyed)return;destroyed=true;}restoreCoffeePresentation();if(scope?.instance){const removed=new Set(records());releasePreparedParticles(removed,{force:true});releaseExternalRenderers(removed);releasePreparedSubtrees(removed);releaseCommonImageOwners(removed);for(const n of removed){visualModifiers.destroyNode(n);canvasDirtyNodes.delete(n);nativeActiveNodes.delete(n);animatedNodes.delete(n);}for(const n of removed){notifyComponentLifecycle(n,null,false,'destroy');const previous=n.visible;n.visible=false;activeChanged(n,previous,'destroy');}if(destroyed||scope.destroyed){scope.destroying=false;scope.destroyed=true;return;}for(const record of activeSubscribers)if(record.scope===scope)activeSubscribers.delete(record);for(const record of componentLifecycleSubscribers)if(record.scope===scope)componentLifecycleSubscribers.delete(record);for(const atlas of captureAtlases)for(const [index,entry]of atlas.entries)if(removed.has(entry.node))atlas.remove(index);for(const view of [...captureViews])if(removed.has(view.root))view.destroy();for(const n of scope.roots){n.parent.children=n.parent.children.filter(c=>c!==n);n.element.remove();}for(const n of removed){n.removed=true;for(const element of[n.element,...n.graphics.map(g=>g.element)])releaseResourceMasks(element);n.sfx?.destroy();discardImages(n.element);if(nodesByPath.get(n.path)===n)nodesByPath.delete(n.path);for(const off of [...(n.disposers||[])])off();n.disposers=[];for(const g of n.graphics){g.shader?.destroy();releaseCanvasFallbacks(g.element);releaseTint(g);blackShadowSprites.release(g);}for(const p of n.particles||[]){p.surface.destroy();p.canvas.remove();}}for(const array of [all,animationPlayers,particlePlayers])for(let i=array.length-1;i>=0;i--)if(removed.has(array[i]))array.splice(i,1);for(let i=inlineAnimations.length-1;i>=0;i--)if(removed.has(inlineAnimations[i].node))inlineAnimations.splice(i,1);for(let i=scopes.length-1;i>=0;i--){const sc=scopes[i];for(const n of removed){if(sc.byID.get(String(n.source.id))===n)sc.byID.delete(String(n.source.id));if(sc.byPath.get(n.source.path)===n)sc.byPath.delete(n.source.path);if(sc.runtimePaths.get(n.path)===n)sc.runtimePaths.delete(n.path);}sc.records=sc.records.filter(n=>!removed.has(n));if(sc.roots.every(n=>removed.has(n))){for(const record of activeSubscribers)if(record.scope===sc)activeSubscribers.delete(record);for(const record of componentLifecycleSubscribers)if(record.scope===sc)componentLifecycleSubscribers.delete(record);sc.destroyed=true;sc.roots=[];sc.root=null;sc.referenceScope=null;scopes.splice(i,1);}}for(const n of removed){n.parent=null;n.children=[];n.graphics=[];n.particles=[];n.element.replaceChildren();}scope.destroying=false;scope.destroyed=true;refreshLayout();}else{destroyed=true;for(const element of [...resourceMaskOwners])releaseResourceMasks(element);readyFonts.clear();pausedParticleCommands.length=0;releasePreparedParticles(undefined,{force:true});releaseExternalRenderers();releasePreparedSubtrees();releaseCommonImageOwners();legacyAutoplay?.destroy();legacyAutoplay=null;for(const hit of presentationHits.values())hit.remove();presentationHits.clear();for(const n of all){notifyComponentLifecycle(n,null,false,'destroy');const previous=n.visible;n.visible=false;activeChanged(n,previous,'destroy');}activeSubscribers.clear();componentLifecycleSubscribers.clear();for(const atlas of [...captureAtlases])atlas.destroy();for(const view of [...captureViews])view.destroy();for(const n of all){n.sfx?.destroy();for(const off of [...(n.disposers||[])])off();for(const g of n.graphics){g.shader?.destroy();releaseCanvasFallbacks(g.element);releaseTint(g);blackShadowSprites.release(g);}for(const p of n.particles||[]){p.surface.destroy();p.canvas.remove();}}cancelAnimationFrame(animationFrame);frameTasks.length=0;visualModifiers.destroy();canvasDirtyNodes.clear();nativeActiveNodes.clear();animatedNodes.clear();imageObserver?.disconnect();pendingImages.clear();cancelImageDecodes();resize?.disconnect();for(const off of [...listeners])off();for(const n of all){n.removed=true;n.parent=null;n.children=[];n.graphics=[];n.particles=[];n.disposers=[];n.element.replaceChildren();}for(const sc of scopes){sc.byID.clear();sc.byPath.clear();sc.runtimePaths.clear();sc.records=[];sc.roots=[];sc.root=null;sc.referenceScope=null;}all.length=roots.length=scopes.length=animationPlayers.length=particlePlayers.length=inlineAnimations.length=sfxPlayers.length=listeners.length=0;nodesByPath.clear();pendingLayout.clear();filters.clear();blackShadowSprites.destroy();cameraStates.clear();stage.replaceChildren();stage.remove();if(!fontDeclarationLease||![...host.children].some(child=>child.classList.contains('sddyx-unity-stage')))host.classList.remove('sddyx-unity-host');fontDeclarationLease?.release();}}

  };return api;
 }
 const api=apiFor(null);resize=global.ResizeObserver?new ResizeObserver(()=>refreshLayout()):null;resize?.observe(host);if(!resize)listen(global,'resize',refreshLayout);
 refreshLayout();initAnimators(mainScope);refreshLayout();if(options.animate!==false)legacyAutoplay=global.SDDYXLegacyAutoplay?.install(api,{clips:options.animations,onDiagnostic:detail=>diagnostics.unsupported.push(detail)});if((animationPlayers.length||particlePlayers.length||inlineAnimations.length||visualModifiers)&&options.autoAnimate!==false)animationFrame=requestAnimationFrame(frame);if(document.fonts)listen(document.fonts,'loadingdone',()=>{if(!destroyed){fontEpoch++;refreshLayout();}});document.fonts?.ready.then(()=>{if(!destroyed){fontEpoch++;refreshLayout();}});return api;
}
global.SDDYXUnityUI={mount,retryFailedFonts,createFontDeclarationOwner,fontChain,fontFamilyStack,descriptorFonts,textFont,DEFAULT_FONT_GUID,version:'1.0.0-source-layout'};
})(typeof window!=='undefined'?window:globalThis);
