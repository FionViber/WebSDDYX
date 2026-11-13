/* Source RitePanelShowController / RitePanelTitleController auxiliary controls.
 * Card/slot geometry is app-owned; all mutations and timing rules are engine-owned. */
(function(global){'use strict';
function install(context){
 const C=context.content||global.SDDYX_CONTENT,R=context.resources||global.SDDYXResources,settings=context.settings||{};
 const scene=global.SDDYXSupportScene?.create(context,'rite','/MainUI/UI/RitePanelShow');
 const ROOT='/MainUI/UI/RitePanelShow',POSITION=ROOT+'/Position',BASE=POSITION+'/RitePanelTitle/CommonContent',TAGS=BASE+'/Tag Tips Scroll View/Viewport/Content/Tag Tips';
 const path=p=>typeof p==='string'&&p.startsWith(ROOT)&&scene?.selected?scene.path(p.slice(ROOT.length)):p;
 const ui=()=>context.ui,engine=()=>context.engine,current=()=>engine()?.rite(context.selectedRite),node=p=>ui()?.find(path(p)),show=(p,on=true)=>ui()?.show(path(p),on),text=(p,v)=>ui()?.setText(path(p),String(v??''));
 let boundUI=null,unbind=[],tagItems=[],tagSignature='',tagSerial=0,tagEpoch=0,mutationSerial=0,helpOpen=false,disposed=false,resuming=false,keyboardEnabled=true;
 const loc=(key,fallback)=>C.i18n[settings.language]?.config?.[key]??fallback??'';
 const translate=(key,fallback)=>context.t?.(key,fallback)??C.config.ui[key]?.[settings.language]??fallback??key;
 const source=(value,key)=>context.sourceText?context.sourceText(value,key):engine()?.formatText?.(String(key?loc(key,value):value??''))??String(value??'');
 const format=(key,value)=>String(C.config.variable[key]??'{0}').replace('{0}',value??'');
 const number=value=>String(Math.max(0,Math.trunc(Number(value)||0))).split('').map(n=>'<sprite='+n+'>').join('');
 function fail(error){if(context.fail)context.fail(error);else console.error(error);}
 function run(fn){try{const value=fn();if(value?.catch)value.catch(fail);return value;}catch(error){fail(error);}}
 function bind(path,fn){const target=node(path);if(!target)return;target.setAttribute('role','button');unbind.push(ui().bind(target,e=>{if(target.getAttribute('aria-disabled')==='true')return;run(()=>fn(e));}));}
 function help(value){helpOpen=!!value;ui()?.batch(()=>{show(POSITION+'/HelpMask',helpOpen);show(BASE+'/Help',helpOpen);});}
 function bindTips(path,key){const target=node(path);if(!target||!context.bindSourceTip)return;const off=context.bindSourceTip(target,{toString:()=>translate(key)});if(typeof off==='function')unbind.push(off);}
 function destroyTagItems(){for(const item of tagItems){item.tipOff?.();item.scope.destroy();}tagItems=[];}
 function ensureBindings(){if(disposed||boundUI===ui()||!node(ROOT))return;for(const off of unbind)off();unbind=[];boundUI=ui();tagSignature='';tagEpoch++;destroyTagItems();helpOpen=false;
  bind(BASE+'/Last State',restore);
  bind(BASE+'/Stop',stop);
  bind(BASE+'/Toggle',toggleAuto);
  bind(BASE+'/HelpButton',()=>help(true));bind(POSITION+'/HelpMask',()=>help(false));
  for(const[path,key]of [['Last State','RITE_AUTO_FILL_TIPS'],['Stop','RITE_STOP_TIPS'],['Toggle','RITE_AUTO_SETTLEMENT_TIPS']])bindTips(BASE+'/'+path,key);
 }
 function restore(){return mutate('restore',r=>{engine().restoreRiteLastState(r.uid);context.sourceAudio?.trigger('RITE_SLOT_AVAILABLE');});}
 function stop(){return mutate('stop',r=>engine().cancelRite(r.uid));}
 function toggleAuto(){return mutate('auto',r=>engine().setRiteAutoResult(r.uid,!engine().getRiteAutoResult(r.uid)));}
 function mutate(kind,fn){const r=current();if(!r||engine().state.pending)return;if(kind==='restore'&&!engine().canRestoreRite(r.uid)||kind==='stop'&&!engine().canCancelRite(r.uid))return;if(kind==='stop')engine().state.ui.ritePanelReopen={uid:r.uid,token:'stop-reopen-'+Date.now()+'-'+(++mutationSerial)};fn(r);if(kind==='stop'&&resumeReopen()){context.render?.();return;}context.refreshRite?.();refresh();if(kind==='restore')checkStart(r.uid,'restore-'+(++mutationSerial));context.render?.();}
 function prose(r,def,check){let value=source(def.text,'rite_'+def.id+'_text');const authored=(Array.isArray(def.tips_text)?def.tips_text:[]).map((line,index)=>source(line,'rite_'+def.id+'_tips_text_'+index));const warnings=check.issues.filter(issue=>issue.type==='open_condition').map(issue=>{const index=(def.open_conditions||[]).findIndex(x=>x.tips===issue.text);return source(issue.text,index<0?undefined:'rite_'+def.id+'_open_conditions_tips_'+index);});
  if(authored.length){value+=String(C.config.variable.RITE_PANEL_TIPS_TEXT_HEADER||'');if(warnings.length)value+=format('RITE_PANEL_OPEN_TIPS_CONTENT',warnings.join('\n'));value+=String(C.config.variable.RITE_PANEL_TIPS_TEXT_ICON||'')+authored.map(line=>format('RITE_PANEL_TIPS_TEXT_CONTENT',line)).join('')+String(C.config.variable.RITE_PANEL_TIPS_TEXT_FOOT||'');}
  else if(warnings.length)value+=String(C.config.variable.RITE_PANEL_TIPS_TEXT_HEADER||'')+format('RITE_PANEL_OPEN_TIPS_CONTENT',warnings.join('\n'));
  return value;
 }
 function tagValue(r,def,name){return Object.entries(r.slots||{}).reduce((sum,[slot,uid])=>{const card=engine().card(uid);return sum+(!def.cards_slot?.[slot]?.is_enemy&&card?engine().tag(card,name):0);},0);}
 function drawTags(r,def){const names=def.tag_tips_up?.tips||[],signature=JSON.stringify([r.uid,names]),epoch=++tagEpoch,ownerUI=ui(),isCurrent=()=>!disposed&&epoch===tagEpoch&&r.uid===context.selectedRite&&ui()===ownerUI;
  const update=()=>{if(!isCurrent())return;ui().batch(()=>{for(const item of tagItems){const value=tagValue(r,def,item.name);item.scope.setText('Value',value);item.scope.show('lower',item.value!==null&&value<item.value);item.scope.show('upper',item.value!==null&&value>item.value);item.scope.element.dataset.riteTagValue=String(value);item.value=value;}});};
  if(signature===tagSignature)return update();
  const prepare=()=>{if(!isCurrent())return;ui().batch(()=>{destroyTagItems();for(const name of names){const data=Object.values(C.config.tag).find(x=>x.name===name||x.code===name);if(!data)continue;const scope=ui().instantiate('Tag',path(TAGS),{name:'RiteTag_'+(++tagSerial),active:true,scale:1});scope.setSprite(scope.element,global.SDDYXSupportUI.sourceTagSprite(global.SDDYX_ASSETS,data.resource));scope.hide('lower');scope.hide('upper');scope.hide('Outline');scope.element.dataset.riteTag=name;const tip={toString:()=>source(loc('tag_'+data.code+'_tips',data.tips)||loc('tag_'+data.code+'_text',data.text))};const tipOff=context.bindSourceTip?.(scope.element,tip);tagItems.push({scope,name,value:null,tipOff:typeof tipOff==='function'?tipOff:null});}tagSignature=signature;});return update();};
  // Resident tag rows now materialize inside their caller's synchronous gate;
  // unresolved data keeps its normal asynchronous error/owner checks.
  return R.withPrefabs?R.withPrefabs(['Tag'],prepare):Promise.resolve(R.prefab('Tag')).then(prepare);
 }
 function resumeReopen(){const e=engine(),task=e?.state.ui.ritePanelReopen;if(!task||e.state.pending)return false;const r=e.rite(task.uid);if(!r||['removed','settled'].includes(r.status)){delete e.state.ui.ritePanelReopen;return false;}if(r.status!=='ready'||!context.openRite)return false;delete e.state.ui.ritePanelReopen;context.openRite(task.uid,task.token);return true;}
 function refresh(options={}){ensureBindings();if(resumeReopen())return;const r=current();if(!r||!node(ROOT))return;const def=C.config.rite[r.id],check=engine().evaluateRite(r.id,r.slots,{riteUid:r.uid}),started=r.status==='running',pending=!!engine().state.pending;
  ui().batch(()=>{text(BASE+'/Header/RoundBG/Round',number(def.round_number));show(BASE+'/Header/FightEvent',def.tag_tips_up?.type==='fight_result');text(BASE+'/Main Content/Scroll View/Viewport/Text',prose(r,def,check));text(BASE+'/Main Content/OpenTips','');show(BASE+'/Main Content/OpenTips',false);show(BASE+'/Last State',!started);ui().setInteractable(path(BASE+'/Last State'),!pending&&engine().canRestoreRite(r.uid));show(BASE+'/Started',started);show(BASE+'/Stop',started&&r.startRound===engine().state.day);ui().setInteractable(path(BASE+'/Stop'),!pending&&engine().canCancelRite(r.uid));show(BASE+'/Toggle',true);ui().setInteractable(path(BASE+'/Toggle'),!pending);const toggle=node(BASE+'/Toggle'),ref=toggle?.__unityNode.components.find(c=>c.fields.states)?.fields.states?.[engine().getRiteAutoResult(r.uid)?1:0];if(ref)ui().setSprite(toggle,R.asset(ref.guid));if(toggle)toggle.dataset.riteAutoResult=String(engine().getRiteAutoResult(r.uid));show(BASE+'/Confirm',!started);ui().setInteractable(path(BASE+'/Confirm'),!pending&&check.ok);show(POSITION+'/HelpMask',helpOpen);show(BASE+'/Help',helpOpen);});
  run(()=>{const prepared=drawTags(r,def);if(prepared?.then&&context.trackEntryPreparation){context.trackEntryPreparation(prepared);return;}return prepared;});resumeTitleEvents();const mutationToken=typeof options==='string'?options:options.mutationToken;if(mutationToken)checkStart(r.uid,mutationToken);return check;
 }
 // The native Show calls can_start immediately after registering open_rite's
 // continuation. This hook deliberately accepts UID even before selection exists.
 function checkStart(uid,token){const e=engine(),r=e?.rite(uid);if(!r||r.status!=='ready'||!token)return false;const key='rite-panel-start:'+token;if(e.state.ui.eventTokens?.['rite_can_start:'+key])return false;const check=e.evaluateRite(r.id,r.slots,{riteUid:uid});if(!check.ok)return false;e.uiEvent('rite_can_start',{riteUid:uid,token:key});if(e.state.pending)context.render?.();return true;}
 // Title.TriggerEvent awaits can_fill, then fires can_stop without awaiting it.
 // Keep the continuation JSON-safe while an original guide/prompt is displayed.
 function afterOpen(uid,token){const e=engine(),r=e?.rite(uid);if(!r||!token)return;const key='rite-panel-title:'+token;e.state.ui.ritePanelTitleTokens||={};if(e.state.ui.ritePanelTitleTokens[key])return;e.state.ui.ritePanelTitleTokens[key]=true;e.state.ui.ritePanelTitleContinuation={uid,token:key,stage:'fill'};resumeTitleEvents();}
 function resumeTitleEvents(){const e=engine();if(resuming||!e||e.state.pending)return;const task=e.state.ui.ritePanelTitleContinuation;if(!task)return;const r=e.rite(task.uid);if(!r){delete e.state.ui.ritePanelTitleContinuation;return;}resuming=true;try{if(task.stage==='fill'){task.stage='stop';if(r.status!=='running'&&Object.prototype.hasOwnProperty.call(e.state.lastCardData||{},r.id)){e.uiEvent('rite_can_fill',{riteUid:r.uid,token:task.token});if(e.state.pending){context.render?.();return;}}}delete e.state.ui.ritePanelTitleContinuation;if(r.status==='running'&&r.startRound===e.state.day){e.uiEvent('rite_can_stop',{riteUid:r.uid,token:task.token});if(e.state.pending)context.render?.();}}finally{resuming=false;}}
 const keydown=e=>{if(keyboardEnabled&&helpOpen&&e.key==='Escape'&&!e.repeat){e.preventDefault();e.stopImmediatePropagation();help(false);}};global.addEventListener('keydown',keydown,true);
 function close(){help(false);tagEpoch++;}
 function reset(){close();for(const off of unbind)off();unbind=[];destroyTagItems();tagSignature='';boundUI=null;}
 // CardSubmit captures the currently chosen slot BEFORE CancelEquip clears
 // it. GameController.DragCard(false) is a visual reference, not BeginDrag.
 function ownsCardHandler(){const panel=node(ROOT);if(disposed||!panel||!current())return false;if(context.isCardHandlerActive)return!!context.isCardHandlerActive(panel);if(panel.isConnected===false)return false;for(let el=panel;el;el=el.parentElement)if(el.hidden||el.style?.display==='none'||el.__unityNode?.active===false)return false;return !engine().state.pending;}
 function handleCardSubmit(cardUid){if(!ownsCardHandler()||!engine().card(cardUid))return false;run(()=>{const slot=context.getCurrentEquipSlot?.()??null;context.cancelEquip?.();const r=current();if(!r||r.status==='running'||r.start===true)return;context.setCardSubmitDrag?.(cardUid);try{context.dropCardOnRite?.(cardUid,r.uid,slot);}finally{context.setCardSubmitDrag?.(null);}});return true;}
 function handleSourceInput(method,detail={}){const target=detail.target||detail.panel,title=node(POSITION+'/RitePanelTitle');if(['OnCancel','OnClose'].includes(method)&&target===node(POSITION+'/HelpMask')){context.sourceAudio?.trigger('BUTTON_CANCEL');help(false);return true;}if(['OnCancel','OnClose'].includes(method)&&target===node(BASE+'/Tag Tips Mover')){context.sourceAudio?.trigger('BUTTON_CANCEL');ui().hide(target);return true;}if(target===title&&method==='SelectFirstTag'){const first=tagItems[0]?.scope.element;if(first){const f=title.__unityNode.components.find(c=>c.fields.TagTipsMover)?.fields,ref=f?.TagTipsMover,mover=ui().findAll('*').find(el=>el.__unityNode.components.some(c=>String(c.fileID)===String(ref?.fileID))||String(el.__unityNode.source?.id)===String(ref?.fileID));if(mover)ui().show(mover);first.tabIndex=0;first.focus();}return true;}if(target!==node(ROOT))return false;if(method==='OnLastState'){run(restore);return true;}if(method==='OnStop'){run(stop);return true;}if(method==='OnCancel'&&helpOpen){help(false);return true;}return false;}
 return{refresh,checkStart,afterOpen,close,reset,onInputDeviceChanged(){const mover=node(BASE+'/Tag Tips Mover');if(mover)ui().hide(mover);},inspect:()=>({bindings:unbind.length,tags:tagItems.length,hasUI:!!boundUI}),restore,handleSourceInput,handleCardSubmit,stop,toggleAuto,showHelp:()=>help(true),hideHelp:()=>help(false),setKeyboardEnabled(value){keyboardEnabled=!!value;},get helpOpen(){return helpOpen;},get element(){return node(ROOT);},dispose(){disposed=true;reset();global.removeEventListener('keydown',keydown,true);}};
}
global.SDDYXRitePanelUI={install};if(typeof module!=='undefined'&&module.exports)module.exports=global.SDDYXRitePanelUI;
})(typeof window!=='undefined'?window:globalThis);
