/* OptionController 57C2E0 / OptionItemController 57CB90,57CC20.
 * Exact serialized Toggle rows select a choice; only Confirm resolves it. */
(function(global){'use strict';
class Selection {
 constructor(items){this.items=items;this.index=-1;this.current=null;}
 changed(index,on){if(!on)return false;if(!Number.isInteger(index)||!this.items[index])return false;this.index=index;this.current=this.items[index];return true;}
 get canConfirm(){return this.current!==null;}
 result(){return this.canConfirm?{index:this.index,item:this.current}:null;}
}
// Native MakeChildrenNavigation preserves nonparticipating entries and links
// eligible Selectables in hierarchy order. Non-interactable is not filtered.
function buildNavigation(entries,idle){const map=new Map(),eligible=entries.filter(e=>e.active!==false&&e.mode!==0),nodes=eligible.map(e=>e.element);for(let i=0;i<nodes.length;i++){const links={down:nodes[i+1]||null,right:nodes[i+1]||null};if(i){links.up=nodes[i-1];links.left=nodes[i-1];}map.set(nodes[i],links);}if(entries[0]&&map.has(entries[0].element)){map.get(entries[0].element).up=null;map.get(entries[0].element).left=null;}map.set(idle,{up:nodes.at(-1)||null,left:nodes.at(-1)||null,down:nodes[0]||null,right:nodes[0]||null});return map;}
function install(context){let rows=[],active=null,navigation=new Map(),confirmOff=null;
 const ui=()=>context.ui,bindings=()=>context.getBindings?.()||context.bindings;
 const resolve=(scope,ref)=>!ref?.fileID?null:scope.element.__unityNode.scope.records.find(n=>String(n.source.id)===String(ref.fileID)||n.components.some(c=>String(c.fileID)===String(ref.fileID)))?.element||null;
 function clear(){confirmOff?.();confirmOff=null;for(const element of navigation.keys())global.SDDYXInputDevice?.clearNavigation?.(element);navigation.clear();for(const row of rows){row.stop?.();row.scope.destroy();}rows=[];active=null;}
 function show(items){clear();const b=bindings(),fields=b?.containers.option,prefab=b?.prefabs.option.OptionPrefab?.prefabName;if(!fields||!prefab)throw Error('Selected original OptionController references are required');const view=ui(),confirm=view.find(fields.Confirm.path),holder=view.find(fields.Options.path),idle=view.find(fields.IdleObject.path);if(!confirm||!holder||!idle)throw Error('Original option controls are unavailable');const selection=new Selection(items);active={selection,confirm,idle,root:view.find(b.roots.option.path)};
  function changed(index,on){if(!selection.changed(index,on))return;for(let i=0;i<rows.length;i++)if(i!==index)view.setToggle(rows[i].scope.element,false);view.setToggle(idle,false);view.setInteractable(confirm,true);}
  items.forEach((item,index)=>{const scope=view.instantiate(prefab,holder,{name:'Option_'+index,active:true}),component=scope.element.__unityNode.components.find(c=>c.fields.Text&&'Icon'in c.fields),text=resolve(scope,component?.fields.Text),icon=resolve(scope,component?.fields.Icon),row={scope,index,item,stop:null};rows.push(row);if(text)view.setText(text,item.text??item.name??item.label??'');if(icon)context.loadSprite?.(view,icon,item.icon,false,true);view.setInteractable(scope.element,item.enabled!==false);view.setToggle(scope.element,false,{notify:false,instant:true});scope.element.dataset.sourceOptionIndex=String(index);scope.element.dataset.sourceOptionRow='true';
   scope.element.addEventListener('unity:toggle',event=>{if(event.target===scope.element)changed(index,!!event.detail?.value);});
   scope.element.addEventListener('focus',()=>{if(item.enabled===false)return;view.setToggle(scope.element,true);row.stop?.();row.stop=context.playAnimation?.(scope.element)||null;});scope.element.addEventListener('blur',()=>{row.stop?.();row.stop=null;});
   scope.bind(scope.element,()=>{if(item.enabled===false)return;view.setToggle(scope.element,true);changed(index,true);});
  });
  navigation=buildNavigation(rows.map(row=>({element:row.scope.element,active:row.scope.element.__unityNode.active,mode:row.scope.element.__unityNode.selectable?.fields.m_Navigation?.m_Mode})),idle);for(const [element,links]of navigation)global.SDDYXInputDevice?.setNavigation?.(element,links);view.show(confirm);view.setInteractable(confirm,false);view.setToggle(idle,true,{notify:false,instant:true});confirmOff=view.bind(confirm,()=>thisConfirm());context.setSelectedElement?.(idle);context.getAudio?.()?.trigger('SHOW_PROMPT');return rows.map(row=>row.scope);
 }
 function thisConfirm(){if(!active?.selection.canConfirm||active.confirm.getAttribute('aria-disabled')==='true')return false;const result=active.selection.result();context.continueStory(result.item.sourceIndex??result.item.index??result.index);return true;}
 function submitElement(element){const row=rows.find(row=>row.scope.element===element);if(!row)return undefined;if(row.item.enabled===false)return false;ui().setToggle(element,true);active.selection.changed(row.index,true);ui().setInteractable(active.confirm,true);context.setSelectedElement?.(active.confirm);return true;}
 function selectOption(){if(!active)return false;const target=rows[active.selection.index>=0?active.selection.index:0];if(target)context.setSelectedElement?.(target.scope.element);return true;}
 function handleSourceInput(method,detail){if(!active||detail.target!==active.root)return false;if(method==='SelectOption')return selectOption();if(method==='OnConfirm'){thisConfirm();return true;}return false;}
 return{show,clear,confirm:thisConfirm,submitElement,handleSourceInput,get current(){return active;},get rows(){return rows;}};
}
const api={Selection,buildNavigation,install};global.SDDYXOptionUI=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
