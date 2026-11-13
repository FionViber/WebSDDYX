/* Resolve support controls through the selected original controller references.
 * Structural descendants are relative to those references. No same-name sibling
 * or inactive desktop fallback is selected in a mobile scene. */
(function(global){'use strict';
const ABSENT='/__SOURCE_NULL_REFERENCE__';
const ANCHORS={
 "result": {
  "TitleBG/Title": [
   "result",
   "title"
  ],
  "DicePrompt": [
   "result",
   "textDicePrompt"
  ],
  "Result": [
   "result",
   "textResult"
  ],
  "Op BG/Next": [
   "result",
   "btnNext"
  ],
  "Op BG/Next/Eft_Sudan_003_3": [
   "result",
   "goNextNotify"
  ],
  "Container": [
   "result",
   "container"
  ],
  "Op Cards": [
   "result",
   "opCards"
  ],
  "Op Results": [
   "result",
   "opCardResults"
  ],
  "Op Hand Results": [
   "result",
   "opHandCardResults"
  ],
  "DicePromptNew": [
   "dicePrompt",
   "Animation"
  ],
  "DiceCountPromptNew": [
   "diceCount",
   "Animation"
  ],
  "Op BG/AutoPlay": [
   "result",
   "autoPlayButton"
  ],
  "Blocker": [
   "diceCount",
   "Blocker"
  ],
  "DicePromptNew/Count/Type": [
   "dicePrompt",
   "DiceType"
  ],
  "DicePromptNew/Normal/DiceNeedTags": [
   "dicePrompt",
   "NormalNeedTags"
  ],
  "DicePromptNew/Count": [
   "dicePrompt",
   "DiceTotalCount"
  ],
  "DicePromptNew/Normal/Extra/NormalExtraText": [
   "dicePrompt",
   "NormalExtraText"
  ],
  "DicePromptNew/Fight/PositiveDiceNeedTags": [
   "dicePrompt",
   "FightPositiveNeedTags"
  ],
  "DicePromptNew/Fight/NegativeDiceNeedTags": [
   "dicePrompt",
   "FightNegativeNeedTags"
  ],
  "DicePromptNew/Fight/PositiveExtra/PositiveExtraText": [
   "dicePrompt",
   "FightPositiveExtraText"
  ],
  "DicePromptNew/Fight/NegativeExtra/NegativeExtraText": [
   "dicePrompt",
   "FightNegativeExtraText"
  ],
  "DicePromptNew/RightMask/Right/RIght": [
   "dicePrompt",
   "DemoDices"
  ],
  "DicePromptNew/RightMask/Right/RightTips": [
   "dicePrompt",
   "DempDiceTips"
  ],
  "DiceCountPromptNew/CountContainer/Count": [
   "diceCount",
   "Count"
  ],
  "DiceCountPromptNew/Tips": [
   "diceCount",
   "Tips"
  ],
  "DiceCountPromptNew/GoldDice": [
   "diceCount",
   "GoldButton"
  ],
  "DiceCountPromptNew/Redraw": [
   "diceCount",
   "RedrawButton"
  ],
  "DiceCountPromptNew/GoldDice/Count": [
   "diceCount",
   "GoldCount"
  ],
  "DiceCountPromptNew/Redraw/Count": [
   "diceCount",
   "RedrawCount"
  ],
  "DiceCountPromptNew/Gold Cancel": [
   "diceCount",
   "GoldCancelButton"
  ],
  "DiceCountPromptNew/Gold Confirm": [
   "diceCount",
   "GoldConfirmButton"
  ],
  "DiceCountPromptNew/Redraw Cancel": [
   "diceCount",
   "RedrawCancelButton"
  ],
  "DiceCountPromptNew/Redraw Confirm": [
   "diceCount",
   "RedrawConfirmButton"
  ],
  "DiceCountPromptNew/CountContainer/PlusCount": [
   "diceCount",
   "GoldPlusCount"
  ],
  "DicePromptNew/Normal/NeedTags": [
   "dicePrompt",
   "NormalNeedTags"
  ],
  "DiceCountPromptNew/CountContainer/Plus": [
   "diceCount",
   "GoldPlusCount"
  ]
 },
 "card": {
  "IdelSelection": [
   "card",
   "firstFocusGameObject"
  ],
  "CardInfoNew/Name": [
   "card",
   "Name"
  ],
  "CardInfoNew/Name/TypeIcon/Title": [
   "card",
   "Title"
  ],
  "CardInfoNew/Content": [
   "card",
   "Content"
  ],
  "CardInfoNew/RareBG/RareText": [
   "card",
   "RareText"
  ],
  "CardInfoNew/Name/TypeIcon": [
   "card",
   "TypeIcon"
  ],
  "CardInfoNew/RareBG": [
   "card",
   "RareIcon"
  ],
  "CardInfoNew/MainIconMask/MainIcon": [
   "card",
   "MainImage"
  ],
  "CardInfoNew/TagInfo/StateBar/States": [
   "card",
   "StateTagContainer"
  ],
  "CardInfoNew/TagInfo/TagInfo": [
   "card",
   "TagContainer"
  ],
  "CardInfoNew/TagInfo/Attributes/Attribute Contents": [
   "card",
   "AttributeContainer"
  ],
  "CardInfoNew/Equips": [
   "card",
   "EquipContainer"
  ],
  "CardInfoNew/EquipState": [
   "card",
   "EquipSlotContainer"
  ],
  "CardInfoNew": [
   "card",
   "dropDelegater"
  ]
 },
 "rite": {
  "Position/RitePanelTitle/CommonContent/Toggle": [
   "rite",
   "AutoResult"
  ],
  "Position/SlotsContainer": [
   "rite",
   "SlotsContainer"
  ],
  "Position/StartNotice": [
   "rite",
   "StartNotice"
  ],
  "Position/RitePanelTitle": [
   "rite",
   "RiteTitle"
  ],
  "Position/bg": [
   "rite",
   "bg"
  ],
  "Position/fg": [
   "rite",
   "fg"
  ],
  "Position": [
   "rite",
   "position"
  ],
  "Position/RitePanelTitle/CommonContent": [
   "riteTitle",
   "bg"
  ],
  "Position/RitePanelTitle/CommonContent/TitleBg/Title": [
   "riteTitle",
   "title"
  ],
  "Position/RitePanelTitle/CommonContent/Header/RoundBG/Round": [
   "riteTitle",
   "round"
  ],
  "Position/RitePanelTitle/CommonContent/Main Content/Scroll View": [
   "riteTitle",
   "text"
  ],
  "Position/RitePanelTitle/CommonContent/Tag Tips Scroll View/Viewport/Content/Tag Tips": [
   "riteTitle",
   "tagTipList"
  ],
  "Position/RitePanelTitle/CommonContent/Confirm": [
   "riteTitle",
   "Confirm"
  ],
  "Position/RitePanelTitle/CommonContent/Last State": [
   "riteTitle",
   "LastState"
  ],
  "Position/RitePanelTitle/CommonContent/Started": [
   "riteTitle",
   "Started"
  ],
  "Position/RitePanelTitle/CommonContent/Stop": [
   "riteTitle",
   "Stop"
  ],
  "Position/RitePanelTitle/CommonContent/HelpButton": [
   "riteTitle",
   "HelpBtn"
  ],
  "Position/RitePanelTitle/CommonContent/Main Content/OpenTips": [
   "riteTitle",
   "openTips"
  ],
  "Position/RitePanelTitle/CommonContent/Header/FightEvent": [
   "riteTitle",
   "FightEvent"
  ],
  "Position/RitePanelTitle/CommonContent/Tag Tips Mover": [
   "riteTitle",
   "TagTipsMover"
  ]
 },
 "settings": {
  "Mask": [
   "settings",
   "mask"
  ]
 },
 "ending": {
  "Step1": [
   "ending",
   "overNewStep1Controller"
  ],
  "Step2": [
   "ending",
   "overNewStep2Controller"
  ],
  "Step2-Story": [
   "ending",
   "overNewStep2StoryController"
  ],
  "Step3": [
   "ending",
   "overNewStep3Controller"
  ],
  "Step3/Back": [
   "ending",
   "MainMenuButton"
  ]
 }
};
Object.assign(ANCHORS,{
 "story": {
  "Icon": [
   "story",
   "Icon"
  ],
  "Group1/Foot/OnlyFinish": [
   "story",
   "OnlyFinish"
  ],
  "Group1/Foot/OnlyUnFinish": [
   "story",
   "OnlyUnFinish"
  ],
  "Group1/Foot/Sort": [
   "story",
   "SortToggle"
  ],
  "Group1/QuestList New": [
   "story",
   "LoopScrollRect"
  ],
  "Group1/Foot/All": [
   "story",
   "AllReward"
  ],
  "Group1/Head/Point Count": [
   "story",
   "PointCountNotice"
  ],
  "Group2": [
   "story",
   "CurrentPanel"
  ],
  "Group2/Head/QuestTitle": [
   "story",
   "QuestTitle"
  ],
  "Group2/Head/QuestDesc": [
   "story",
   "QuestDesc"
  ],
  "Group2/Head/RewardBG/Text (TMP)": [
   "story",
   "QuestPoint"
  ],
  "Group2/Head/RewardBG/IconPointBG": [
   "story",
   "IconPointBG"
  ],
  "Group2/Head/RewardBG/IconRewarded": [
   "story",
   "QuestIconRewarded"
  ],
  "Group2/Head/RewardBG/Icon": [
   "story",
   "QuestIcon"
  ],
  "Group2/Head/RewardBG/Reward": [
   "story",
   "QuestReward"
  ],
  "Group2/Head/RewardBG": [
   "story",
   "rewardAnimation"
  ],
  "Group2/Head/RewardBG/Mask": [
   "story",
   "QuestRewardMask"
  ],
  "Group2/Head/RewardBG/Reward/Text (TMP)": [
   "story",
   "QuestRewardText"
  ],
  "Group2/Targets/Viewport/Content": [
   "story",
   "QuestTargetItemContainer"
  ]
 },
 "notes": {
  "Scroll View": [
   "notes",
   "scrollRect"
  ],
  "Scroll View/Viewport/Content": [
   "notes",
   "NoteContainer"
  ],
  "Day": [
   "notes",
   "DayText"
  ],
  "Scroll View/Close": [
   "notes",
   "CloseBtn"
  ],
  "Scroll View/Show/Text (TMP)": [
   "notes",
   "NoteCount"
  ]
 },
 "slide": {
  "Scroll View": [
   "slide",
   "scrollRect"
  ],
  "Scroll View/Scrollbar Dot": [
   "slide",
   "ScrollbarDot"
  ]
 },
 "archive": {
  "Left/Header/Title": [
   "archive",
   "Title"
  ],
  "Left/Desc": [
   "archive",
   "Desc"
  ],
  "Left/Header/Icon": [
   "archive",
   "Icon"
  ],
  "Scroll View": [
   "archive",
   "ArchiveItemHolder"
  ],
  "UserArchiveNameInput": [
   "archive",
   "NameInputController"
  ]
 },
 "galleryInfo": {
  "GameObject/Plots/Prev": [
   "galleryInfo",
   "PrevBtn"
  ],
  "GameObject/CardInfo/Next": [
   "galleryInfo",
   "NextBtn"
  ],
  "GameObject/CardInfo/Left/Content": [
   "galleryInfo",
   "Content"
  ],
  "GameObject/CardInfo/MainIconMask/MainIcon": [
   "galleryInfo",
   "MainImage"
  ],
  "GameObject/CardInfo/Rare": [
   "galleryInfo",
   "RareImage"
  ],
  "GameObject/CardInfo/ItemBg": [
   "galleryInfo",
   "ItemBG"
  ],
  "GameObject/CardInfo/Left/TagInfo": [
   "galleryInfo",
   "TagContainer"
  ],
  "GameObject/CardInfo/Left/Attribute Contents/Real Attribute Contents": [
   "galleryInfo",
   "AttributeContainer"
  ],
  "GameObject/Plots/Name": [
   "galleryInfo",
   "Name"
  ],
  "GameObject/Plots/Name/Title": [
   "galleryInfo",
   "Title"
  ],
  "GameObject/Plots/HeadGroup": [
   "galleryInfo",
   "HeadToggleGroup"
  ],
  "GameObject/Plots/PlotsGroup": [
   "galleryInfo",
   "PlotsGroup"
  ],
  "GameObject/Plots/PlotsGroup/Viewport/Content": [
   "galleryInfo",
   "PlotsContainer"
  ],
  "GameObject/Plots/PlotsGroup/Mask": [
   "galleryInfo",
   "PlotMask"
  ],
  "GameObject/CardInfo/plotContent/Scroll View/Viewport/Content/PlotContainer": [
   "galleryInfo",
   "PlotContentContainer"
  ],
  "GameObject/CardInfo/plotContent/Scroll View": [
   "galleryInfo",
   "PlotScrollRect"
  ],
  "GameObject/CardInfo/Left": [
   "galleryInfo",
   "CardInfo"
  ],
  "GameObject/CardInfo/plotContent": [
   "galleryInfo",
   "PlotInfo"
  ],
  "GameObject/CardInfo/plotContent/Scroll View/Viewport/Content/PlotBack": [
   "galleryInfo",
   "PlotBackBtn"
  ]
 }
});
function bindings(context){return typeof context.getBindings==='function'?context.getBindings():typeof context.bindings==='function'?context.bindings():context.bindings;}
const controllerCache=new WeakMap();
function controller(context,role){const b=bindings(context);if(!b)return null;let cached=controllerCache.get(b);if(!cached)controllerCache.set(b,cached=new Map());if(cached.has(role))return cached.get(role);const result=resolveController(context,role,b);cached.set(role,result);return result;}
function resolveController(context,role,b){if(b.controller(role))return b.controller(role);if(role==='ending'&&b.controller('galleryEnding'))return b.controller('galleryEnding');if(role.includes('.')){const [owner,field]=role.split('.'),parent=controller(context,owner);return parent?.fields[field]?b.resolveController(parent.fields[field]):null;}if(role==='settings'){const esc=b.controller('esc');return esc?.fields.settingsController?b.resolveController(esc.fields.settingsController):null;}return b.controller(role);}
function create(context,role,legacyRoot){let tableOwner=null,table=null;
 function selected(){return controller(context,role);}
 function map(value='',runtimeRoot){const c=selected(),s=String(value||'').replace(/^\//,'');if(!c)return(runtimeRoot?.dataset?.unityPath||legacyRoot)+(s?'/'+s:'');if(tableOwner!==c){tableOwner=c;table=new Map();
  for(const[logical,[owner,field]]of Object.entries(ANCHORS[role]||{})){const target=controller(context,owner)?.references[field];table.set(logical,target?.path||ABSENT);if(!target?.path)continue;let left=logical.split('/'),right=target.path.split('/');while(left.length>1&&left.at(-1)===right.at(-1)){left.pop();right.pop();const a=left.join('/'),b=right.join('/');if(!table.has(a))table.set(a,b);}}
  if(role==='result'){const b=bindings(context);for(const [logical,field]of [['Result/Viewport/Text (TMP)','textResult'],['DicePrompt/Viewport/Text (TMP)','textDicePrompt']]){const text= c.fields[field]?b.resolveController(c.fields[field]):null;if(text?.references.content)table.set(logical,text.references.content.path);}}
  }
  // CardInfo Close is a selected controller UnityEvent, and moves outside the
  // content panel on mobile. Match its exact target, excluding the backdrop.
  if(role==='card'&&s==='CardInfoNew/Close'||role==='galleryInfo'&&s==='GameObject/CardInfo/Close'){const scene=context.ui?.scene,choices=Object.values(scene?.nodes||{}).filter(n=>n.path!==c.path&&n.path.startsWith(c.path+'/')&&(n.components||[]).some(x=>(x.fields.m_OnClick?.m_PersistentCalls?.m_Calls||[]).some(call=>String(call.m_Target?.fileID)===String(c.componentId)&&call.m_MethodName==='OnClose')));if(choices.length===1)table.set(s,choices[0].path);}
  let result=c.path+(s?'/'+s:'');for(const key of [...table.keys()].sort((a,b)=>b.length-a.length))if(s===key||s.startsWith(key+'/')){const target=table.get(key);result=target===ABSENT?ABSENT:target+s.slice(key.length);break;}
  if(runtimeRoot&&result!==ABSENT&&result.startsWith(c.path))result=runtimeRoot.dataset.unityPath+result.slice(c.path.length);return result;
 }
 function prefab(field,fallback){const c=selected();if(!c||!Object.prototype.hasOwnProperty.call(c.fields,field))return fallback;return c.references[field]?.prefabName||null;}
 function instantiate(ui,parent,options={},fallback){const c=selected();if(!c)return ui.instantiate(fallback,parent,options);const scene=ui.scene;if(!scene.nodes[c.nodeId])throw Error('Selected support controller is outside the mounted scene: '+role);const original=scene.nodes[c.nodeId],sourceParent=scene.nodes[original.parent]?.path;return ui.instantiate({source:scene.source,nodes:scene.nodes,roots:[c.nodeId]},parent||sourceParent||'/MainUI',options);}
 return{path:map,controller:selected,prefab,instantiate,get sourceRoot(){return selected()?.path||legacyRoot;},get selected(){return!!selected();}};
}
// Prefab controller references are resolved against that original prefab, not
// the active scene (large serialized prefab fileIDs can legitimately repeat).
function fromPrefab(context,data,role,legacyRoot,scriptId){
 const manifest=context.assets||global.SDDYX_ASSETS||{},refs=new Map();for(const node of Object.values(data.nodes)){refs.set(String(node.id),{node});refs.set(String(node.transformID),{node});for(const component of node.components||[])refs.set(String(component.fileID),{node,component});}
 const resolveRef=ref=>{if(!ref?.fileID)return null;if(ref.guid){const assetPath=manifest.guidPaths?.[ref.guid],prefabName=assetPath?.endsWith('.prefab')?assetPath.split('/').pop().slice(0,-7):null;return{...ref,kind:'asset',assetPath,prefabName};}const item=refs.get(String(ref.fileID));if(!item)throw Error('Unresolved original prefab reference '+ref.fileID);return{kind:'scene',nodeId:item.node.id,componentId:item.component?.fileID,path:item.node.path};};
 const resolveValue=value=>value&&typeof value==='object'?(Object.prototype.hasOwnProperty.call(value,'fileID')?resolveRef(value):Array.isArray(value)?value.map(resolveValue):Object.fromEntries(Object.entries(value).map(([k,v])=>[k,resolveValue(v)]))):value;
 const describe=(node,component)=>({nodeId:node.id,componentId:component.fileID,path:node.path,fields:component.fields,references:Object.fromEntries(Object.entries(component.fields).filter(([k])=>!k.startsWith('m_')).map(([k,v])=>[k,resolveValue(v)]))});
 const choices=Object.values(data.nodes).flatMap(node=>(node.components||[]).filter(c=>Number(c.fields.m_Script?.fileID)===Number(scriptId)).map(component=>({node,component})));if(choices.length!==1)throw Error('Expected one source prefab controller '+scriptId);const c=describe(choices[0].node,choices[0].component),b={controller:r=>r===role?c:null,resolveRef,resolveController:ref=>{const v=refs.get(String(ref.fileID));return v?.component?describe(v.node,v.component):null;}},local={ui:{scene:data},bindings:b};
 return create(local,role,legacyRoot);
}
const api={create,fromPrefab,bindings,controller,ANCHORS,ABSENT};global.SDDYXSupportScene=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
