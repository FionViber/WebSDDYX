/* Persistent global progression reconstructed from the native IL2CPP methods.
 * Evidence and browser-storage adaptation: docs/support-ui-fidelity.md. */
(function(global){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},String(k));
function create(content,store,options={}){
 const config=content.config||content,bagDefaults=()=>Array.from({length:4},(_,i)=>copy(config.variable?.auto_classify_bag_tags?.[i]||[]));
 const defaults=()=>({version:1,inGame:false,totalPoint:0,usedPoint:0,totalRound:0,upgrades:{},quests:{},globalCounters:{},overIds:[],unlockedCG:[],showedGalleryCards:[],hasEnterSudanBox:false,hasEnterQuest:false,showedPrompts:[],choosedOptions:[],doneEvents:[],doneRites:[],overRecords:[],achievements:{},offlineAchievementRequests:[],statistics:{},backToPrevRound:9999,autoClassify:!!config.variable?.auto_classify,autoClassifyBagTags:bagDefaults()});
 const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value),invalidProfile=()=>Error(global.SDDYXLocalization?.text('全局进度格式不兼容')??'Global progress format is incompatible.');
 // Validate before replacing the live profile. Missing optional fields belong to
 // older browser saves and receive the same defaults as a fresh profile; wrong
 // container types are corruption, not empty history or permission to reset it.
 function validateProfile(value,{legacy=false}={}){
  if(!object(value)||(!legacy||own(value,'version'))&&value.version!==1)throw invalidProfile();
  if(!legacy&&(!own(value,'totalPoint')||!own(value,'upgrades')||!own(value,'globalCounters')))throw invalidProfile();
  for(const key of ['totalPoint','usedPoint','totalRound','backToPrevRound'])if(own(value,key)&&(!Number.isFinite(value[key])||value[key]<0))throw invalidProfile();
  for(const key of ['inGame','hasEnterSudanBox','hasEnterQuest','autoClassify','finishTutorial'])if(own(value,key)&&typeof value[key]!=='boolean')throw invalidProfile();
  if(own(value,'lastInGameBoundary')&&typeof value.lastInGameBoundary!=='string')throw invalidProfile();
  for(const key of ['upgrades','quests','globalCounters','achievements','statistics','completedEndings','completedTutorials'])if(own(value,key)&&!object(value[key]))throw invalidProfile();
  for(const key of ['upgrades','quests','globalCounters','achievements'])if(own(value,key)&&Object.values(value[key]).some(number=>!Number.isFinite(number)))throw invalidProfile();
  for(const key of ['completedEndings','completedTutorials'])if(own(value,key)&&Object.values(value[key]).some(flag=>typeof flag!=='boolean'&&flag!==0&&flag!==1))throw invalidProfile();
  for(const key of ['overIds','unlockedCG','showedGalleryCards','showedPrompts','choosedOptions','doneEvents','doneRites','offlineAchievementRequests'])if(own(value,key)&&(!Array.isArray(value[key])||Array.from(value[key]).some(id=>typeof id!=='string'&&!Number.isFinite(id))))throw invalidProfile();
  for(const key of ['overRecords','deletedOverRecords','compatibilityMigrations'])if(own(value,key)&&(!Array.isArray(value[key])||Array.from(value[key]).some(item=>!object(item))))throw invalidProfile();
  for(const field of ['overRecords','deletedOverRecords'])for(const record of value[field]||[]){
   for(const key of ['key','savedAt','playerName'])if(own(record,key)&&typeof record[key]!=='string')throw invalidProfile();
   for(const key of ['id','overId','day','initId','points'])if(own(record,key)&&!Number.isFinite(record[key]))throw invalidProfile();
   if(own(record,'prepared')){
    if(!object(record.prepared))throw invalidProfile();
    for(const key of ['textExtras','afterStories','npcCards'])if(own(record.prepared,key)&&(!Array.isArray(record.prepared[key])||Array.from(record.prepared[key]).some(item=>!object(item))))throw invalidProfile();
    for(const key of ['textExtras','afterStories'])for(const entry of record.prepared[key]||[])if(own(entry,'data')&&entry.data!=null&&!object(entry.data))throw invalidProfile();
    // Historical portraits consult the active Engine.tag snapshot, not current
    // content defaults. Missing tags cannot be guessed without changing art.
    for(const card of record.prepared.npcCards||[]){if(!Number.isFinite(card.id)||!object(card.tag)||Object.values(card.tag).some(tag=>!Number.isFinite(tag)))throw invalidProfile();for(const key of ['equips','equipSlots'])if(own(card,key)&&(!Array.isArray(card[key])||Array.from(card[key]).some(id=>typeof id!=='string'&&!Number.isFinite(id))))throw invalidProfile();if(own(card,'count')&&!Number.isFinite(card.count))throw invalidProfile();}
   }
  }
  if(own(value,'statistics'))for(const item of Object.values(value.statistics)){if(!object(item))throw invalidProfile();for(const key of ['round','overTimes'])if(own(item,key)&&(!Number.isFinite(item[key])||item[key]<0))throw invalidProfile();}
  if(own(value,'autoClassifyBagTags')&&(!Array.isArray(value.autoClassifyBagTags)||value.autoClassifyBagTags.length>4||Array.from(value.autoClassifyBagTags).some(tags=>!Array.isArray(tags)||Array.from(tags).some(tag=>typeof tag!=='string'))))throw invalidProfile();
  let cloned;try{cloned=copy(value);}catch(_){throw invalidProfile();}
  if(cloned.statistics)for(const [key,item]of Object.entries(cloned.statistics))cloned.statistics[key]={round:0,overTimes:0,...item};
  if(cloned.autoClassifyBagTags){const tags=bagDefaults();for(let i=0;i<cloned.autoClassifyBagTags.length;i++)tags[i]=cloned.autoClassifyBagTags[i];cloned.autoClassifyBagTags=tags;}
  // Spread defines an own __proto__ property rather than invoking its legacy
  // setter; extra legacy metadata is retained without changing the prototype.
  return {...defaults(),...cloned};
 }
 let savedProfile={},profile,attached=null,recovery=null,persistenceBlocked=false;
 try{savedProfile=store?.readPersistent?store.readPersistent('meta',{}):store?.read('meta',{});if(savedProfile===undefined)savedProfile={};profile=validateProfile(savedProfile,{legacy:true});}
 catch(error){
  // Do not replace a damaged/unknown-version global profile until its exact raw
  // storage bytes have a durable, user-exportable copy. Quota/security failure
  // leaves the original untouched and keeps fallback progression memory-only.
  let backup;try{backup=store?.preserveRaw?.('meta');}catch(_){}
  persistenceBlocked=!backup?.ok;profile=defaults();recovery={key:'meta',message:String(error.message||error),backup:backup?.name||null,blocked:persistenceBlocked};store?.reportFailure?.('meta','validate',error);
 }
 let needsInGameMigration=!recovery&&!own(savedProfile,'inGame');

 // Early browser versions stored gallery plot consent outside the profile.
 const legacyGallery=store?.read('gallery-viewed',[]);for(const id of Array.isArray(legacyGallery)?legacyGallery:[]){const number=typeof id==='number'?id:typeof id==='string'&&id.trim()?Number(id):NaN;if(Number.isFinite(number)&&!profile.showedGalleryCards.includes(number))profile.showedGalleryCards.push(number);}
 function counter(id){return Number(id)===7220003?Object.keys(profile.upgrades).length:Number(id)===7220004?profile.totalPoint+profile.usedPoint:Number(profile.globalCounters[id]||0);}
 const save=()=>{if(!persistenceBlocked)store?.write('meta',profile);return profile;};
 // Global.inGame is written only at native lifecycle commit points. It is not
 // Player.started and is not inferred on ordinary attach or synchronization.
 function setInGame(value,reason,{persist=true}={}){profile.inGame=!!value;needsInGameMigration=false;if(attached?.state)attached.state.inGame=!!value;if(reason)profile.lastInGameBoundary=String(reason);if(persist)save();return profile.inGame;}
 function migrateInGame(player){if(!needsInGameMigration)return profile.inGame;const accepted=!!(player?.endingRecordKey||player?.endingPresentation||player?.gameEndTriggered),ambiguous=!!(player?.over||player?.pending?.type==='ending');profile.inGame=!!(player?.started&&player.day>=1&&player.inGame===true&&!accepted&&!ambiguous);profile.compatibilityMigrations||=[];profile.compatibilityMigrations.push({id:'global-in-game-v1',result:profile.inGame,evidence:accepted?'accepted-ending':ambiguous?'ambiguous-legacy-ending':profile.inGame?'validated-active-player-after-first-round':'no-validated-active-player'});needsInGameMigration=false;save();return profile.inGame;}

 function condition(c){if(!c||!Object.keys(c).length)return true;return Object.entries(c).every(([raw,wanted])=>{let key=raw,inverse=false;if(key.startsWith('!')){inverse=true;key=key.slice(1);}let value=false,m;if(key==='all')value=condition(wanted);else if(key==='any')value=Object.entries(wanted).some(([k,v])=>condition({[k]:v}));else if(key==='unlock_upgrade')value=(Array.isArray(wanted)?wanted:[wanted]).some(id=>own(profile.upgrades,id));else if((m=key.match(/^global_counter\.(\d+)(>=|<=|!=|>|<|=)?$/))){const actual=counter(m[1]),n=Number(wanted);value=m[2]==='>='?actual>=n:m[2]==='<='?actual<=n:m[2]==='>'?actual>n:m[2]==='<'?actual<n:m[2]==='!='?actual!==n:actual===n;}else return false;return inverse?!value:value;});}
 function refreshQuests(){for(const q of Object.values(config.quest||{})){const complete=(q.target||[]).every(target=>condition(target.condition));if(complete){if(!own(profile.quests,q.id))profile.quests[q.id]=1;}else delete profile.quests[q.id];}return profile.quests;}
 function questState(id){const q=config.quest[id];if(!q)return {complete:false,received:false,canClaim:false,targets:[]};refreshQuests();const targets=(q.target||[]).map(target=>{const key=target.show_counter||Object.keys(target.condition||{}).find(x=>x.startsWith('global_counter.'))||'',counter=/global_counter\.(\d+)/.exec(key)?.[1];return{complete:condition(target.condition),value:api.counter(counter)};});return{complete:targets.every(x=>x.complete),received:profile.quests[id]===2,canClaim:profile.quests[id]===1,targets};}
 function claimQuest(id){const status=questState(id),q=config.quest[id];if(!q||!status.canClaim)return false;profile.quests[id]=2;profile.totalPoint+=Number(q.upgrade_point)||0;save();return true;}
 function claimAllQuests(){refreshQuests();let count=0;for(const q of Object.values(config.quest||{}))if(claimQuest(q.id))count++;return count;}
 function upgradeState(id){const q=config.upgrade[id],owned=own(profile.upgrades,id);return{owned,active:owned&&profile.upgrades[id]!==0,visible:!!q&&condition(q.condition),canBuy:!!q&&!owned&&condition(q.condition)&&profile.totalPoint>=Number(q.cost),canToggle:owned};}
 function turnOn(id){const upgrade=config.upgrade[id];profile.upgrades[id]=1;if(upgrade?.incompatible&&own(profile.upgrades,upgrade.incompatible))profile.upgrades[upgrade.incompatible]=0;save();return true;}
 function buyUpgrade(id){const state=upgradeState(id),upgrade=config.upgrade[id];if(!state.canBuy)return false;profile.totalPoint-=Number(upgrade.cost);profile.usedPoint+=Number(upgrade.cost);return turnOn(id);}
 function activateUpgrade(id){const state=upgradeState(id);if(!state.canToggle||state.active)return false;return turnOn(id);}
 function deactivateUpgrade(id){const state=upgradeState(id);if(!state.canToggle||!state.active)return false;profile.upgrades[id]=0;save();return true;}
 // Attached history arrays already share the profile array. Self-membership
 // scans cannot add entries; retain the merge when loading a distinct array.
 function syncAchievementRequests(s){profile.offlineAchievementRequests||=[];if(s.achievements!==profile.offlineAchievementRequests)for(const name of Array.isArray(s.achievements)?s.achievements:[])if(!profile.offlineAchievementRequests.includes(name))profile.offlineAchievementRequests.push(name);s.achievements=profile.offlineAchievementRequests;}
 function attachEngine(engine,{newGame=false}={}){attached=engine;if(!engine)return;const s=engine.state;syncAchievementRequests(s);
  // Global progression is a separate store in the original. Loading an older run
  // must not roll back fate purchases or re-award already claimed quests.
  if(!Object.keys(profile.globalCounters).length&&s.globalCounters)Object.assign(profile.globalCounters,s.globalCounters);
  if(!Object.keys(profile.upgrades).length&&s.upgrades)Object.assign(profile.upgrades,s.upgrades);
  if(s.overIds!==profile.overIds)for(const id of s.overIds||[])if(!profile.overIds.includes(id))profile.overIds.push(id);
  for(const field of ['showedPrompts','choosedOptions','doneEvents','doneRites']){profile[field]||=[];if(s[field]!==profile[field])for(const id of s[field]||[])if(!profile[field].includes(id))profile[field].push(id);s[field]=profile[field];}
  s.globalBackCount=profile.backToPrevRound;s.globalCounters=profile.globalCounters;s.upgrades=profile.upgrades;s.overIds=profile.overIds;s.autoClassify=profile.autoClassify;s.autoClassifyBagTags=profile.autoClassifyBagTags;
  if(newGame){profile.totalRound++;const stats=profile.statistics[s.initId]||(profile.statistics[s.initId]={round:0});stats.round++;}
  s.gameStatistics=profile.statistics[s.initId]||(profile.statistics[s.initId]={round:0,overTimes:0});engine.meta=api;save();return engine;
 }
 function syncEngine(engine=options.getEngine?.()||attached){if(!engine)return save();attached=engine;const s=engine.state;syncAchievementRequests(s);for(const field of ['showedPrompts','choosedOptions','doneEvents','doneRites']){profile[field]||=[];if(s[field]!==profile[field])for(const id of s[field]||[])if(!profile[field].includes(id))profile[field].push(id);s[field]=profile[field];}s.gameStatistics=profile.statistics[s.initId]||(profile.statistics[s.initId]={round:0,overTimes:0});if(Number.isFinite(s.globalBackCount))profile.backToPrevRound=s.globalBackCount;if(typeof s.autoClassify==='boolean')profile.autoClassify=s.autoClassify;if(Array.isArray(s.autoClassifyBagTags))profile.autoClassifyBagTags=s.autoClassifyBagTags;if(s.globalCounters!==profile.globalCounters){profile.globalCounters=s.globalCounters||{};s.globalCounters=profile.globalCounters;}if(s.overIds!==profile.overIds)for(const id of s.overIds||[])if(!profile.overIds.includes(id))profile.overIds.push(id);s.overIds=profile.overIds;refreshQuests();return save();}
 function completeEnding(engine,record={}){const s=engine?.state;if(!s||!s.over||['decision','closing_prompt'].includes(s.gameOverFlow?.phase))return null;if(Number(s.over.id)===999){profile.completedTutorials||={};const key=s.tutorialStatisticsKey||(s.tutorialStatisticsKey='tutorial-'+Date.now()+'-'+Math.random().toString(36).slice(2));if(!profile.completedTutorials[key]){s.gameStatistics=profile.statistics[s.initId]||(profile.statistics[s.initId]={round:0,overTimes:0});s.gameStatistics.overTimes=Number(s.gameStatistics.overTimes||0)+1;for(const[id,count]of Object.entries(s.globalCounterCache||{}))profile.globalCounters[id]=Number(profile.globalCounters[id]||0)+Number(count||0);s.globalCounters=profile.globalCounters;s.inGame=false;profile.inGame=false;profile.finishTutorial=true;profile.completedTutorials[key]=true;refreshQuests();save();}return null;}
  if(s.endingRecordKey){const existing=profile.overRecords.find(x=>x.key===s.endingRecordKey);if(existing)return existing;}
  const key=s.endingRecordKey||(s.endingRecordKey='over-'+Date.now()+'-'+Math.random().toString(36).slice(2));
  profile.completedEndings||={};if(profile.completedEndings[key])return profile.overRecords.find(x=>x.key===key)||null;
  const awarded=s.initId===0?0:Number(s.sudanRemoveCount||0);profile.totalPoint+=awarded;
  for(const [id,count]of Object.entries(s.globalCounterCache||{}))profile.globalCounters[id]=Number(profile.globalCounters[id]||0)+Number(count||0);
  if(!profile.overIds.includes(Number(s.over.id)))profile.overIds.push(Number(s.over.id));
  const item={key,id:Number(s.over.id),savedAt:new Date().toISOString(),day:s.day,initId:s.initId,points:awarded,...copy(record)};
  s.gameStatistics=profile.statistics[s.initId]||(profile.statistics[s.initId]={round:0,overTimes:0});s.gameStatistics.overTimes=Number(s.gameStatistics.overTimes||0)+1;profile.overRecords.unshift(item);profile.inGame=false;s.inGame=false;profile.completedEndings[key]=true;refreshQuests();save();return item;
 }
 function updateEndingRecord(key,data){const item=profile.overRecords.find(x=>x.key===key);if(item){Object.assign(item,copy(data));save();}return item;}
 function deleteEndingRecord(key){const i=key&&typeof key==='object'?profile.overRecords.indexOf(key):profile.overRecords.findIndex(x=>x.key===key);if(i<0)return false;profile.deletedOverRecords||=[];profile.deletedOverRecords.push(profile.overRecords.splice(i,1)[0]);save();return true;}
 function detachEngine(){attached=null;save();}
 function isCGUnlocked(id){const cg=config.gallery_cg[id];return !!cg?.over_id.some(id=>profile.overIds.includes(id));}
 function hasAvailableUpgrade(){return Object.values(config.upgrade||{}).some(upgrade=>!own(profile.upgrades,upgrade.id)&&profile.totalPoint>=Number(upgrade.cost));}
 function hasCGUnlock(){return Object.values(config.gallery_cg||{}).some(cg=>isCGUnlocked(cg.id)&&!profile.unlockedCG.includes(Number(cg.id)));}
 function achievementState(id){return config.achievement?.[id]?Number(profile.achievements?.[id]||0):0;}
 function hasAchievementUnlock(){return Object.values(profile.achievements||{}).some(state=>Number(state)===1);}
 function markAchievementViewed(id){id=Number(id);if(!config.achievement?.[id]||achievementState(id)!==1)return false;profile.achievements[id]=2;save();return true;}
 function markCGViewed(id){id=Number(id);if(!isCGUnlocked(id))return false;if(!profile.unlockedCG.includes(id))profile.unlockedCG.push(id);save();return true;}
 function markGalleryCardViewed(id){id=Number(id);if(!config.gallery_cards[id])return false;if(!profile.showedGalleryCards.includes(id))profile.showedGalleryCards.push(id);save();return true;}
 function markSudanBoxEntered(){profile.hasEnterSudanBox=true;save();}
 function markQuestEntered(){profile.hasEnterQuest=true;save();}
 function hasQuestReward(){refreshQuests();return Object.values(profile.quests).some(state=>state===1);}
 function exportProfile(){return copy(profile);}
 function importProfile(value){const next=validateProfile(value);if(persistenceBlocked){const backup=store?.preserveRaw?.('meta');if(!backup?.ok)throw Error(backup?.error||recovery?.message||'Global progress recovery backup is unavailable.');}needsInGameMigration=!own(value,'inGame');persistenceBlocked=false;recovery=null;profile=next;attached=null;refreshQuests();save();return api;}
 const api={get state(){return profile;},get needsInGameMigration(){return needsInGameMigration;},get recovery(){return recovery?{...recovery}:null;},setInGame,migrateInGame,getProfile:()=>profile,getPoints:()=>profile.totalPoint,counter,condition,refreshQuests,questState,claimQuest,claimAllQuests,upgradeState,buyUpgrade,activateUpgrade,deactivateUpgrade,attachEngine,syncEngine,completeEnding,updateEndingRecord,deleteEndingRecord,detachEngine,isCGUnlocked,hasAvailableUpgrade,hasCGUnlock,achievementState,hasAchievementUnlock,markAchievementViewed,markCGViewed,markGalleryCardViewed,markSudanBoxEntered,markQuestEntered,hasQuestReward,getEndings:()=>profile.overRecords.length?profile.overRecords.slice(0,200):profile.overIds,exportProfile,validateProfile,importProfile,save};return api;
}
global.SDDYXMeta={create,version:'1.0.0-native-global'};if(typeof module!=='undefined'&&module.exports)module.exports=global.SDDYXMeta;
})(typeof window!=='undefined'?window:globalThis);
