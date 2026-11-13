/* Original RitePinRender.Init and GameController.AddRitePin.
 * Native proof: analysis/native/decompiled-typed/Game/{RitePinRender,GameController,MapController}.c.
 * Pins do not join RitePosition.Rites or change its occupancy. Duplicate visuals
 * survive Map.AddPin's duplicate-key rejection; the first registered pin wins. */
(function(global){'use strict';
const typeNumber=value=>typeof value==='number'?value:({NORMAL:0,END:1,ENEMY:2,TREASURE:3}[String(value||'NORMAL').toUpperCase()]??0);
function mount(ui,options={}){
 const resources=options.resources||global.SDDYXResources,shows=options.shows||global.SDDYX_RITE_SHOWS,geometry=options.geometry||global.SDDYX_SPRITE_GEOMETRY||{},registered=new Map(),instances=[];
 if(!resources?.prefab||!resources?.riteSprite)throw Error('RitePin requires original prefab and sprite resources.');
 if(typeof options.getLocation!=='function')throw Error('RitePin requires the native GetLocation resolver.');
 let destroyed=false,queue=Promise.resolve();const ready=Promise.resolve().then(()=>resources.prefab('RitePin'));
 const enqueue=fn=>{const result=queue.then(fn);queue=result.catch(()=>{});return result;};
 const definition=value=>{const id=Number(typeof value==='object'?value.id:value),def=options.getRite?.(id)||options.rites?.[id]||(value&&typeof value==='object'&&'location'in value?value:null);if(!def)throw Error('RitePin config '+id+' is missing.');return{id,def};};
 function initialize(scope,def){
  const root=scope.element.__unityNode,fields=root.components.find(c=>c.fields.Icon&&!c.fields.TitleBGImage)?.fields,ref=fields?.Icon?.fileID,icon=root.scope.records.find(n=>String(n.source.id)===String(ref)||String(n.source.transformID)===String(ref)||n.components.some(c=>String(c.fileID)===String(ref)))?.element;
  if(!icon)throw Error('Original RitePin.Icon reference is missing.');
  const sprite=resources.riteSprite(def.icon),type=typeNumber(def.type);ui.setSprite(icon,sprite);
  if(type===1||type===2||type===3){const rect=geometry[sprite?.guid]?.rect||sprite?.rect;if(rect){const anchors=icon.__unityNode.transform.m_AnchorMin;ui.applyProperty(icon,'m_AnchorMax.x',anchors.x,224);ui.applyProperty(icon,'m_AnchorMax.y',anchors.y,224);ui.setSize(icon,{x:rect.width*100/(sprite.pixelsPerUnit||100),y:rect.height*100/(sprite.pixelsPerUnit||100)});}
   if(sprite&&(type===1||type===3)){const position=options.mods?.riteIcons?.[sprite.name]||shows?.treasurePositions?.[sprite.name];if(position)ui.setLocalPosition(icon,{x:position.x,y:position.y,z:0});}
  }
  return{icon,sprite,type};
 }
 async function create(value,settings={}){
  const prefab=await ready;if(destroyed)return null;const {id,def}=definition(value),creation=typeof value==='object'?value:{id},parent=options.getLocation(def,creation);if(!parent)throw Error('RitePin location '+def.location+' is missing.');let instance;
  ui.batch(()=>{instance=ui.instantiate(prefab,parent,{name:'pin_'+id});try{initialize(instance,def);ui.setLocalPosition(instance.element,{x:0,y:0,z:0});ui.setScale(instance.element,{x:1,y:1,z:1});ui.applyProperty(instance.element,'m_LocalRotation',{x:0,y:0,z:0,w:1},224);ui.setSiblingIndex(instance.element,0);}catch(error){instance.destroy();throw error;}});
  const element=instance.element;element.__unityNode.name='pin_'+id;element.dataset.unityName='pin_'+id;element.dataset.ritePinId=String(id);if(creation.riteUid!=null)element.dataset.ritePinSourceUid=String(creation.riteUid);
  const duplicate=registered.has(id),entry={id,definition:def,instance,element,parent,duplicate,registered:!duplicate};instances.push(entry);if(!duplicate)registered.set(id,entry);else options.onDuplicate?.(entry);
  options.onAdd?.(entry);if(settings.refreshLines!==false)options.refreshLines?.(registered);return entry;
 }
 function add(value,settings={}){return enqueue(()=>create(value,settings));}
 function restore(ids){return enqueue(async()=>{const restored=[],seen=new Set();for(const value of ids||[]){const id=Number(typeof value==='object'?value.id:value);if(seen.has(id))continue;seen.add(id);const entry=await create(value,{refreshLines:false});if(entry)restored.push(entry);}return restored;});}
 function clear(){ui.batch(()=>{for(const entry of instances.splice(0))entry.instance.destroy();registered.clear();});}
 function remove(id){const entry=registered.get(Number(id));if(!entry)return null;registered.delete(Number(id));const i=instances.indexOf(entry);if(i>=0)instances.splice(i,1);entry.instance.destroy();options.cleanLines?.(registered);return entry;}
 return{ready,add,restore,remove,clear,registered,instances,refreshLines:()=>options.refreshLines?.(registered),destroy(){if(destroyed)return;destroyed=true;clear();},get destroyed(){return destroyed;}};
}
const api={mount,typeNumber};global.SDDYXRitePinUI=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
