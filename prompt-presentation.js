/* PromptControllerBase 58EE20/58F280 and PromptIconController 58FC00.
 * Presentation-only: original CardNode definitions, no player card allocation. */
(function(global){'use strict';
const GAME='5120d76301e969c0f8aa1b32aa0c43bb',CONTROLLERS={prompt:1709513287,option:1394653406,confirm:70796668};
const FAN=Object.freeze([{y:280,rotation:18},{y:430,rotation:10},{y:580,rotation:2}].map(Object.freeze));
const isFull=value=>typeof value==='string'&&value.length>0&&value.startsWith('full');
function int32(value){if(value===null||value===undefined)return null;const text=String(value).trim();if(!/^[+-]?\d+$/.test(text))return null;const n=Number(text);return Number.isInteger(n)&&n>=-2147483648&&n<=2147483647?n:null;}
// These are imperative source calls, not a desired final-state layout. In
// particular fullCount compaction intentionally leaves native trailing slots.
function iconCommands(value,count=3){const out=[];const icon=(index,value)=>out.push({type:'icon',index,value});const full=value=>out.push({type:'full',value});
 if(value==null){for(let i=0;i<count;i++)icon(i,null);}
 else if(typeof value==='string'){if(isFull(value)){full(value);for(let i=0;i<count;i++)icon(i,null);}else{icon(0,null);icon(1,value);icon(2,null);}}
 else if(Array.isArray(value)){let fullCount=0;for(let i=0;i<value.length&&i<count;i++){if(isFull(value[i])){full(value[i]);fullCount++;}else icon(i-fullCount,value[i]);}for(let j=value.length;j<count;j++)icon(j-fullCount,null);}
 else out.push({type:'unsupported',value});return out;
}
function fanPositions(count){return count===1?[FAN[1]]:count===2?[FAN[1],FAN[2]]:count>0?FAN.slice():[];}
function hasEquipment(definition,context){if(context.hasDefinitionTag)return !!context.hasDefinitionTag(definition,'equipment');const tags=definition?.tag||{},config=context.content?.config||context.engine?.config||global.SDDYX_CONTENT?.config,tag=config?.tag?.equipment;return Number(tags[tag?.name||'equipment']??tags.equipment??0)>0;}
function runtimeImage(){const id=-1,transform={m_LocalPosition:{x:0,y:0,z:0},m_LocalScale:{x:1,y:1,z:1},m_LocalRotation:{x:0,y:0,z:0,w:1},m_AnchorMin:{x:.5,y:.5},m_AnchorMax:{x:.5,y:.5},m_Pivot:{x:.5,y:.5},m_AnchoredPosition:{x:0,y:0},m_SizeDelta:{x:100,y:100}};
 const fields={m_Enabled:1,m_GameObject:{fileID:id},m_Script:{guid:'d3e719b59ab71ba3f6b398058c866280',fileID:-765806418,type:3},m_Color:{r:1,g:1,b:1,a:1},m_Material:{fileID:0},m_RaycastTarget:1,m_RaycastPadding:{x:0,y:0,z:0,w:0},m_Maskable:1,m_Sprite:{fileID:0},m_Type:0,m_PreserveAspect:0,m_FillCenter:1,m_FillMethod:4,m_FillAmount:1,m_FillClockwise:1,m_FillOrigin:0,m_UseSpriteMesh:0,m_PixelsPerUnitMultiplier:1};
 return{source:'native:PromptControllerBase.Awake@58EE20',roots:[id],nodes:{[id]:{id,name:'ItemBG',path:'/ItemBG',active:1,layer:0,tag:'Untagged',transformID:-2,transformType:'RectTransform',transform,children:[],components:[{fileID:-2,classID:224,type:'RectTransform',fields:transform},{fileID:-3,classID:222,type:'CanvasRenderer',fields:{m_GameObject:{fileID:id},m_CullTransparentMesh:1}},{fileID:-4,classID:114,type:'MonoBehaviour',fields}]}}};
}
function install(context={}){
 let currentUI=null,off=null,disposed=false;const records=new Map(),diagnostics=[];
 const uiNow=()=>context.ui,bindings=()=>context.getBindings?.()||context.bindings;
 const report=(code,detail)=>{const entry={code,...detail};diagnostics.push(entry);context.onDiagnostic?.(entry);};
 const definition=id=>context.getCardDefinition?.(id)??context.content?.config?.cards?.[id]??context.engine?.content?.config?.cards?.[id]??null;
 function loadSprite(ui,element,path){const sprite=(context.resources||global.SDDYXResources)?.loadSprite(path);if(sprite){ui.setSprite(element,sprite);ui.setNativeSpriteSize(element);}ui[sprite?'show':'hide'](element);return sprite;}
 function normalize(ui,element){ui.setLocalPosition(element,{x:0,y:0,z:0});ui.setScale(element,{x:1,y:1,z:1});for(const[k,v]of Object.entries({x:0,y:0,z:0,w:1}))ui.applyProperty(element,'m_LocalRotation.'+k,v,element.__unityNode?.source.transformType==='Transform'?4:224);}
 function resolve(root,ref){if(!ref?.fileID)return null;const id=String(ref.fileID);return root.__unityNode.scope.records.find(n=>!n.removed&&(String(n.source.id)===id||String(n.source.transformID)===id||n.components.some(c=>String(c.fileID)===id)))?.element||null;}
 function component(root,role){return root.__unityNode.components.find(c=>c.fields.m_Script?.guid===GAME&&Number(c.fields.m_Script.fileID)===CONTROLLERS[role]);}
 function clearFan(slot){for(const card of slot.cards)card.destroy();slot.cards=[];}
 function release(record,parentDestroyed=false){if(record.dead)return;record.dead=true;records.delete(record.root);for(const slot of record.slots){if(!parentDestroyed)clearFan(slot);else slot.cards=[];}if(!parentDestroyed)record.background.destroy();}
 function onEnable(record){const ref=bindings()?.controller('main')?.references.GlobalMask;if(ref?.path&&currentUI.find(ref.path)?.__unityNode.active)currentUI.hide(ref.path);context.onEnable?.(record);}
 function sceneReset(){off?.();off=null;for(const record of [...records.values()])release(record,!!record.root.__unityNode?.removed);records.clear();currentUI=null;}
 function sync(){if(disposed)return null;const ui=uiNow();if(ui!==currentUI){sceneReset();currentUI=ui;off=ui?.onActiveChange?.(event=>{const record=records.get(event.element);if(record){if(event.reason==='destroy')release(record,true);else if(event.active)onEnable(record);}})||null;}return ui;}
 function mount(role,target){const ui=sync();if(!ui)throw Error('Prompt presentation requires a mounted original UI');if(!(role in CONTROLLERS))throw Error('Unsupported prompt role: '+role);
  const descriptor=bindings()?.controller(role),root=target?.element||target||(descriptor?.path&&ui.find(descriptor.path));if(!root)throw Error('Selected original '+role+' controller is unavailable');if(records.has(root))return records.get(root);
  const source=component(root,role);if(!source)throw Error('Target has no original '+role+' component');const fields=source.fields,full=resolve(root,fields.Full),content=resolve(root,fields.Content),parent=full?.__unityNode?.parent?.element;
  if(!full||!content||!parent)throw Error('Original prompt Content/Full references are unavailable');
  const slots=(fields.Icons||[]).map(ref=>{const element=resolve(root,ref),controller=element?.__unityNode.components.find(c=>String(c.fileID)===String(ref.fileID));const holder=resolve(root,controller?.fields.Holder),image=resolve(root,controller?.fields.Icon);if(!element||!holder||!image)throw Error('Original PromptIconController references are unavailable');return{element,holder,image,cards:[],value:undefined};});
  let background;ui.batch(()=>{background=ui.instantiate(runtimeImage(),parent);ui.setSiblingIndex(background.element,0);loadSprite(ui,background.element,'full/item_bg');for(const[k,v]of Object.entries({'m_AnchorMin.x':0,'m_AnchorMin.y':0,'m_AnchorMax.x':1,'m_AnchorMax.y':1,'m_AnchoredPosition.x':0,'m_AnchoredPosition.y':0}))ui.applyProperty(background.element,k,v,224);ui.show(parent);});
  const record={role,root,content,full,fullParent:parent,slots,background,dead:false,showCount:0};records.set(root,record);if(root.__unityNode.visible)onEnable(record);return record;
 }
 function pic(value){if(!value.startsWith('pic/'))return value;const id=int32(value.slice(4));if(id===null)return value;const card=context.findPlayerCardByDefinition?.(id),node=card||definition(id);return node?(context.getCardPic?.(node)??value):value;}
 function setIcon(record,index,value){const slot=record.slots[index];if(!slot)throw Error('Native prompt icon index out of bounds: '+index);const ui=currentUI;clearFan(slot);normalize(ui,slot.image);ui.setSiblingIndex(slot.image,0);slot.value=value;
  if(value==null){ui.hide(slot.element);return;}ui.show(slot.element);
  if(typeof value==='string'){loadSprite(ui,slot.image,pic(value));return;}ui.hide(slot.image);if(!Array.isArray(value)||!value.length)return;
  const positions=fanPositions(value.length);if(value.length>3)report('too-many-cards',{count:value.length,role:record.role,index});
  for(let i=0;i<value.length&&i<positions.length;i++){
   if(value[i]==null)throw TypeError('Native PromptIconController cannot convert a null card-list entry');
   const id=int32(value[i]);if(id===null){report('invalid-card-id',{value:value[i],index:i});continue;}if(id===0)continue;const node=definition(id);if(!node){report('missing-card-definition',{id,index:i});continue;}
   if(!context.createCardShow)throw Error('Original CardShow definition renderer is required for prompt card fans');
   const prefabType=hasEquipment(node,context)?'char':node.type,card=context.createCardShow(node,slot.holder,{prefabType,initShow:true,count:1,rare:node.rare,showLife:false});
   if(!card?.element||typeof card.destroy!=='function'||card.then)throw Error('createCardShow must synchronously return an original CardShow scope');slot.cards.push(card);ui.setSiblingIndex(card.element,0);ui.setLocalPosition(card.element,{x:0,y:positions[i].y,z:0});ui.setScale(card.element,{x:Math.fround(1.8),y:Math.fround(1.8),z:Math.fround(1.8)});
   const radians=positions[i].rotation*Math.PI/180;for(const[k,v]of Object.entries({x:0,y:0,z:Math.sin(radians/2),w:Math.cos(radians/2)}))ui.applyProperty(card.element,'m_LocalRotation.'+k,v,card.element.__unityNode?.source.transformType==='Transform'?4:224);
  }
 }
 function show(role,payload={},target){if(disposed)return null;const record=mount(role,target||payload.target),ui=currentUI;ui.batch(()=>{
  const raw=payload.content??payload.text??'',text=payload.formatted?String(raw):context.sourceText?.(raw,payload.textKey)??context.engine?.formatText?.(String(raw))??String(raw);ui.setText(record.content,text);ui.hide(record.full);
  const value=Object.prototype.hasOwnProperty.call(payload,'icon')?payload.icon:payload.icons;
  for(const command of iconCommands(value,record.slots.length)){if(command.type==='full'){loadSprite(ui,record.full,command.value);ui.show(record.full);}else if(command.type==='icon')setIcon(record,command.index,command.value);else report('unsupported-icon-argument',{role,value:command.value});}
  record.showCount++;
 });if(role==='prompt'&&!record.dead&&!disposed){ui.show(record.root);if(!record.dead&&!disposed)context.onCue?.('SHOW_PROMPT',record);}return record;}
 return{show,mount,sync,sceneReset,get records(){return[...records.values()];},diagnostics,destroy(){if(disposed)return;sceneReset();disposed=true;}};
}
const api={install,iconCommands,fanPositions,int32,isFull,runtimeImage,FAN};global.SDDYXPromptPresentation=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
