/* Offline browser services. Original content remains in content.js and assets/. */
(function (global) {
  'use strict';
  const L=source=>global.SDDYXLocalization?.text(source)??source;
  const STORE = 'sddyx.browser.v1.';
  const memory = Object.create(null), rawRecovery = new Map(), rawBackups = new Map(), unreadable = new Set(), writeGenerations = new Map(), failures = new Map();
  const nextWrite=key=>{const generation=(writeGenerations.get(key)||0)+1;writeGenerations.set(key,generation);return generation;};
  const backupName=key=>'recovery.'+encodeURIComponent(String(key))+'.json.'+Date.now();
  const isRawBackup=name=>String(name).startsWith('auto_save.json.')||/^recovery\.[A-Za-z0-9_%.-]+\.json\./.test(String(name));
  function storageStatus(key, operation, error) {
    if(error)failures.set(key,{key,operation,name:error.name||'Error',message:String(error.message||error)});else failures.delete(key);
    const detail={key,operation,ok:!error,error:error?failures.get(key):null};
    // A diagnostic observer must not turn a completed atomic storage write into
    // a reported failure or prevent the original storage error being returned.
    try{if(global.dispatchEvent&&typeof global.CustomEvent==='function')global.dispatchEvent(new global.CustomEvent('sddyx-storage-status',{detail}));}catch(_){}
  }
  const store = {
    readPersistent(key, fallback = null) {
      try { const raw=localStorage.getItem(STORE+key);return raw==null?fallback:(global.SDDYXStorageCodec?global.SDDYXStorageCodec.decode(raw):JSON.parse(raw)); }
      catch(error) {unreadable.add(key);storageStatus(key,'read',error);throw error;}
    },
    backupRaw(key,name,options={}) {
      // Browser equivalent of SafeFile.MoveFile: commit the exact original string
      // under a recoverable backup key before removing the damaged ordinary save.
      let raw,backupKey=name,copied=false;
      try {raw=localStorage.getItem(STORE+key);if(raw==null){unreadable.delete(key);return {ok:true,name:null};}const previous=options.reuse&&rawRecovery.get(key),previousRaw=previous?.raw===raw?localStorage.getItem(STORE+previous.name):undefined,reuse=previous?.raw===raw&&(previousRaw===raw||previousRaw===null&&rawBackups.get(previous.name)===raw);if(reuse)backupKey=previous.name;else{let index=1;while(rawBackups.has(backupKey)||localStorage.getItem(STORE+backupKey)!=null)backupKey=name+'.'+index++;}rawRecovery.set(key,{name:backupKey,raw});rawBackups.set(backupKey,raw);if(!reuse||previousRaw!==raw)localStorage.setItem(STORE+backupKey,raw);copied=true;let moved=false;if(options.remove!==false&&localStorage.getItem(STORE+key)===raw){localStorage.removeItem(STORE+key);delete memory[key];nextWrite(String(key));moved=true;}unreadable.delete(key);storageStatus(key,'backup',null);return {ok:true,name:backupKey,moved};}
      catch(error) {storageStatus(key,'backup',error);return {ok:false,name:copied?backupKey:null,error:String(error.message||error)};}
    },
    preserveRaw(key,name) {
      // Automatic recovery retries protect one unchanged original, not a growing
      // set of duplicate copies. Explicitly named backup requests stay distinct.
      return this.backupRaw(key,name===undefined?backupName(key):name,{remove:false,reuse:name===undefined});
    },
    reportFailure(key,operation,error) {storageStatus(key,operation,error);},
    recoverRaw(key) {const value=rawRecovery.get(key);return value?{...value}:null;},
    listRawBackups() {
      const names=new Set(rawBackups.keys());
      try {for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith(STORE)&&isRawBackup(key.slice(STORE.length)))names.add(key.slice(STORE.length));}}catch(_){}return [...names].sort();
    },
    readRawBackup(name) {if(!isRawBackup(name))throw Error('Unknown raw save backup');if(rawBackups.has(name))return rawBackups.get(name);return localStorage.getItem(STORE+name);},
    read(key, fallback = null) {
      try { const raw = localStorage.getItem(STORE + key); const value=raw==null?fallback:(global.SDDYXStorageCodec?global.SDDYXStorageCodec.decode(raw):JSON.parse(raw));return value; }
      catch(error) { unreadable.add(key);storageStatus(key,'read',error);return key in memory ? memory[key] : fallback; }
    },
    readArray(key, fallback = []) {
      const value=this.read(key,fallback);if(Array.isArray(value))return value;
      // A syntactically valid but wrong-shaped archive is still original data.
      // Keep its raw value protected by the same backup-before-write path used
      // for malformed JSON; never replace it just to make the panel render.
      unreadable.add(key);storageStatus(key,'read',Error('Stored collection is not an array: '+key));
      return Array.isArray(memory[key])?memory[key]:fallback;
    },
    write(key, value) {
      key=String(key);const generation=nextWrite(key),current=()=>writeGenerations.get(key)===generation;
      memory[key] = value; // Recoverable current state even if the atomic commit fails.
      try { const raw=global.SDDYXStorageCodec?global.SDDYXStorageCodec.encode(value):JSON.stringify(value);if(typeof raw!=='string')throw Error('Cannot persist an undefined value');if(!current())return false;if(unreadable.has(key)){const backup=this.preserveRaw(key);if(!backup.ok||!current())return false;}localStorage.setItem(STORE + key,raw);if(current())storageStatus(key,'write',null);return true; }
      catch(error) { if(current())storageStatus(key,'write',error);return false; }
    },
    remove(key) { key=String(key);const generation=nextWrite(key);try { localStorage.removeItem(STORE + key);delete memory[key];storageStatus(key,'remove',null);return true; } catch(error) {if(writeGenerations.get(key)===generation)storageStatus(key,'remove',error);return false;} },
    recover(key) { return memory[key] ?? null; },
    get failures() { return Array.from(failures.values(),x=>({...x})); }
  };
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sourceVolumeToDecibel = value => -80+80*Math.pow(Math.max(0,Math.min(1,(Number(value)+80)/100)),.25);
  const sourceVolumeToGain = value => Math.pow(10,sourceVolumeToDecibel(value)/20);
  function richText(value) {
    // Restrict Unity TMP markup to display-only elements. No supplied HTML executes.
    const source = String(value == null ? '' : value).replace(/\\n/g, '\n');
    let html = '', offset = 0;
    const tag = /<\/?(?:b|i|u|s|color|size|indent|align|line-height|voffset|space|sprite|link|br|nobr)(?:[=\s][^<>]*)?>/gi;
    for (const m of source.matchAll(tag)) {
      html += esc(source.slice(offset, m.index)); offset = m.index + m[0].length;
      const raw = m[0], closing = raw[1] === '/', name = /^<\/?([\w-]+)/.exec(raw)[1].toLowerCase();
      if (['b','i','u','s'].includes(name)) html += closing ? `</${name}>` : `<${name}>`;
      else if (name === 'br') html += '<br>';
      else if (['color','size','indent','align','line-height','voffset','nobr'].includes(name)) {
        if (closing) { html += '</span>'; continue; }
        let style = '';
        const argument = raw.replace(/^<[\w-]+[=\s]?/, '').replace(/>$/, '').replace(/["']/g, '').trim();
        if (name === 'color' && /^(#[a-f\d]{3,8}|[a-z]+)$/i.test(argument)) style = 'color:' + argument;
        if (name === 'size' && /^\d+(\.\d+)?%$/.test(argument)) style = 'font-size:' + argument;
        else if (name === 'size' && /^\d+(\.\d+)?$/.test(argument)) style = 'font-size:' + Math.min(72, Number(argument)) + 'px';
        if (name === 'nobr') style = 'white-space:nowrap';
        html += '<span' + (style ? ' style="' + style + '"' : '') + '>';
      } else if (name === 'sprite' && !closing) {
        const idx = /(?:index\s*=\s*|^<sprite\s*=\s*)["']?(\d+)/i.exec(raw);
        html += '<span class="tmp-sprite" aria-hidden="true"' + (idx ? ' data-sprite="'+idx[1]+'"' : '') + '>◆</span>';
      }
      // Link markers are stripped; their literal text is kept. Offline game has no external navigation.
    }
    return (html + esc(source.slice(offset))).replace(/\n/g, '<br>');
  }
  class AudioManager {
    constructor(resolve) { this.resolve = resolve; this.music = null; this.effects = new Set(); this.channels = new Map(); this.channelGains = new Map(); this.channelFades = new Map(); this.audioListeners = new WeakMap(); this.unlocked = false; this.pending = null;
      const stored=store.read('audio',{}),saved=stored&&typeof stored==='object'&&!Array.isArray(stored)?stored:{};
      this.settings={music:sourceVolumeToGain(-38),sfx:1,musicControl:-38,sfxControl:20,musicEnabled:true,sfxEnabled:true,muted:false};
      for(const kind of ['music','sfx']){if(Number.isFinite(saved[kind])&&saved[kind]>=0&&saved[kind]<=1)this.settings[kind]=saved[kind];if(Number.isFinite(saved[kind+'Control']))this.settings[kind+'Control']=Math.max(-80,Math.min(20,saved[kind+'Control']));}
      for(const key of ['musicEnabled','sfxEnabled','muted'])if(typeof saved[key]==='boolean')this.settings[key]=saved[key];
      // Preserve existing browser preferences while migrating their amplitude to
      // the native control scale. Fresh installs use recovered GameApplication defaults.
      for(const kind of ['music','sfx'])if(Number.isFinite(saved[kind])&&saved[kind]>=0&&saved[kind]<=1&&!Number.isFinite(saved[kind+'Control']))this.settings[kind+'Control']=Math.pow(Math.max(0,Math.min(1,(20*Math.log10(Math.max(.0001,saved[kind]))+80)/80)),4)*100-80;
    }
    listenAudio(audio,type,listener,options) {audio.addEventListener(type,listener,options);let listeners=this.audioListeners.get(audio);if(!listeners)this.audioListeners.set(audio,listeners=[]);listeners.push([type,listener]);}
    releaseAudio(audio) {
      for(const [type,listener]of this.audioListeners.get(audio)||[])audio.removeEventListener?.(type,listener);this.audioListeners.delete(audio);
      try{audio.pause();}catch(_){}
      // Removing src avoids resolving an empty URL to the current page. load()
      // aborts the old resource selection and pending play promises, even when
      // a stalled/error path will never deliver an ended event.
      try{if(audio.removeAttribute)audio.removeAttribute('src');else audio.src='';}catch(_){}
      try{audio.load?.();}catch(_){}
    }
    userGain(kind) { return this.settings.muted?0:this.settings[kind+'Enabled']===false?sourceVolumeToGain(-80):this.settings[kind]; }
    setSourceVolume(kind,value) {if(!['music','sfx'].includes(kind))throw Error('Unknown source audio group');value=Math.max(-80,Math.min(20,Number(value)));this.configure({[kind+'Control']:value,[kind]:sourceVolumeToGain(value),[kind+'Enabled']:true});return value;}
    setSourceEnabled(kind,enabled) {if(!['music','sfx'].includes(kind))throw Error('Unknown source audio group');this.configure({[kind+'Enabled']:!!enabled});}
    unlock() { this.unlocked = true; if (this.pending) { const p = this.pending; this.pending = null; this.playMusic(...p); } if(this.pendingChannels){const queued=this.pendingChannels;this.pendingChannels=null;for(const [channel,args]of queued)this.playChannel(channel,...args);} if(this.pendingOneShots){const queued=this.pendingOneShots;this.pendingOneShots=null;for(const args of queued)this.playOneShotChannel(...args);} }
    path(resource) { return this.resolve ? this.resolve(resource) : resource; }
    playMusic(resource, loop = true) {
      if (!resource) return;
      if (!this.unlocked) { this.pending = [resource, loop]; return; }
      const path = this.path(resource); if (!path) return;
      if (this.music && this.music.dataset.resource === resource) return;
      if (this.music) {const old=this.music;this.music=null;this.releaseAudio(old);}
      const audio = new Audio(path); audio.dataset.resource = resource; audio.loop = loop; audio.volume = this.userGain('music'); this.music = audio;
      const clean=()=>{if(this.music!==audio)return false;this.music=null;this.releaseAudio(audio);return true;};
      this.listenAudio(audio,'ended',()=>{if(!loop)clean();},{once:true});
      this.listenAudio(audio,'error',clean,{once:true});
      audio.play().catch(error => { if(!clean())return;if(error?.name==='NotAllowedError'){this.pending = [resource,loop]; this.unlocked = false;} });
    }
    play(resource, volume = 1) {
      if (!this.unlocked || this.settings.muted) return;
      const path = this.path(resource); if (!path) return;
      const audio = new Audio(path); audio.volume = Math.max(0,Math.min(1,this.userGain('sfx')*volume));audio.__sourceVolume=volume;this.effects.add(audio);
      const clean = () => { if(this.effects.delete(audio))this.releaseAudio(audio); };
      this.listenAudio(audio,'ended',clean,{once:true}); this.listenAudio(audio,'error',clean,{once:true}); audio.play().catch(clean);
    }
    playOneShotChannel(channel,resource,options={}) {
      if(!resource)return null;
      if(!this.unlocked){
        // A pointer can cross many authored highlight targets before the first
        // browser gesture. Keep its newest highlight per channel rather than
        // replaying that entire silent hover history together at unlock.
        // Narration and all other authored one-shots retain their full queue.
        if(channel==='OPTION_TOGGLE_HIGHLIGHT'||channel==='CARD_HIGHLIGHT')this.pendingOneShots=this.pendingOneShots?.filter(args=>args[0]!==channel);
        (this.pendingOneShots ||= []).push([channel,resource,{...options}]);return null;
      }
      const path=this.path(resource);if(!path)return null;
      const audio=new Audio(path);audio.dataset.resource=resource;audio.preload='auto';audio.loop=false;audio.playbackRate=options.pitch||1;
      if('preservesPitch' in audio)audio.preservesPitch=false;
      audio.__sourceChannel=channel;audio.__sourceVolume=options.volume??1;audio.__sourceMusic=!!options.music;
      this.effects.add(audio);this.applyEffectVolume(audio);
      const clean=()=>{if(this.effects.delete(audio))this.releaseAudio(audio);};
      this.listenAudio(audio,'ended',clean,{once:true});this.listenAudio(audio,'error',clean,{once:true});audio.play().catch(clean);return audio;
    }
    applyEffectVolume(audio) {audio.volume=Math.max(0,Math.min(1,this.userGain(audio.__sourceMusic?'music':'sfx')*(audio.__sourceVolume??1)*(audio.__sourceChannel==null?1:this.getChannelGain(audio.__sourceChannel))));}
    playChannel(channel, resource, options = {}) {
      if (!resource) return null;
      if (!this.unlocked) { this.pendingChannels ||= new Map(); this.pendingChannels.set(channel,[resource,options]); return null; }
      const path=this.path(resource); if(!path)return null;
      this.stopChannel(channel);
      const element=new Audio(path), record={element,resource,options,raf:null,ended:false};
      this.channels.set(channel,record);
      element.dataset.resource=resource; element.preload='auto'; element.playbackRate=options.pitch||1;
      if('preservesPitch' in element)element.preservesPitch=false;
      this.applyChannelVolume(channel);
      const current=()=>!record.ended&&this.channels.get(channel)===record;
      const failed=error=>{if(!current())return;this.stopChannel(channel);if(options.music&&error?.name==='NotAllowedError'){this.pendingChannels ||= new Map();this.pendingChannels.set(channel,[resource,options]);this.unlocked=false;}if(typeof global.CustomEvent==='function')global.dispatchEvent?.(new global.CustomEvent('sddyx-audio-error',{detail:{channel,resource,error:String(error)}}));};
      const seek=()=>{if(current()&&options.start>0)try{element.currentTime=options.start;}catch(_){};};
      this.listenAudio(element,'loadedmetadata',seek,{once:true});
      this.listenAudio(element,'error',()=>failed(element.error||Error('Audio playback failed')),{once:true});
      const section=options.loop&&(options.sectionLoop||options.loopEnd>options.loopStart);
      element.loop=!!options.loop && !section;
      if(section){
        // Native LoopSectionController.Update resets exactly to loop_start, including
        // frame overshoot. A source loop_end of -1 means the decoded clip duration.
        const tick=()=>{if(!current())return;const end=options.loopEnd===-1?element.duration:options.loopEnd;if(end>options.loopStart&&element.currentTime>=end){try{element.currentTime=options.loopStart;}catch(_){}}record.raf=requestAnimationFrame(tick);};
        record.raf=requestAnimationFrame(tick);
        this.listenAudio(element,'ended',()=>{if(current()){try{element.currentTime=options.loopStart;}catch(_){}element.play().catch(failed);}});
      }else this.listenAudio(element,'ended',()=>{record.ended=true;if(this.channels.get(channel)===record)this.channels.delete(channel);this.releaseAudio(element);});
      element.play().catch(failed);return element;
    }
    stopChannel(channel) {
      if(this.pendingChannels)this.pendingChannels.delete(channel);
      if(this.pendingOneShots)this.pendingOneShots=this.pendingOneShots.filter(args=>args[0]!==channel);
      for(const audio of this.effects)if(audio.__sourceChannel===channel){this.effects.delete(audio);this.releaseAudio(audio);}
      const record=this.channels.get(channel);if(!record)return;
      record.ended=true;if(record.raf)cancelAnimationFrame(record.raf);this.channels.delete(channel);this.releaseAudio(record.element);
    }
    applyChannelVolume(channel) {
      const record=this.channels.get(channel);if(!record)return;
      const {element,options}=record;
      element.volume=Math.max(0,Math.min(1,this.userGain(options.music?'music':'sfx')*(options.volume??1)*this.getChannelGain(channel)));
    }
    setChannelVolume(channel,volume) {
      volume=Math.max(0,Math.min(1,Number(volume)||0));const record=this.channels.get(channel);if(record){record.options.volume=volume;this.applyChannelVolume(channel);}
      for(const audio of this.effects)if(audio.__sourceChannel===channel){audio.__sourceVolume=volume;this.applyEffectVolume(audio);}
      const queued=this.pendingChannels?.get(channel);if(queued)queued[1]={...queued[1],volume};for(const args of this.pendingOneShots||[])if(args[0]===channel)args[2]={...args[2],volume};return volume;
    }
    getChannelGain(channel) { return this.channelGains.get(channel) ?? 1; }
    setChannelGain(channel,gain) {
      gain=Number(gain);this.channelGains.set(channel,Number.isFinite(gain)?Math.max(0,gain):0);this.applyChannelVolume(channel);for(const audio of this.effects)if(audio.__sourceChannel===channel)this.applyEffectVolume(audio);return this.getChannelGain(channel);
    }
    cancelChannelFade(channel) {const fade=this.channelFades.get(channel);if(fade){cancelAnimationFrame(fade.raf);this.channelFades.delete(channel);fade.resolve({cancelled:true});}}
    fadeChannelGain(channel,target,duration,options={}) {
      this.cancelChannelFade(channel);const start=this.getChannelGain(channel),t0=performance.now(),seconds=Math.max(0,Number(duration)||0);
      return new Promise(resolve=>{const fade={resolve,raf:null};this.channelFades.set(channel,fade);const tick=now=>{if(this.channelFades.get(channel)!==fade)return;const t=seconds?Math.min(1,(now-t0)/1000/seconds):1,w=options.easing?options.easing(t):t;this.setChannelGain(channel,start+(target-start)*w);if(t>=1){this.channelFades.delete(channel);if(options.stop)this.stopChannel(channel);resolve({cancelled:false});}else fade.raf=requestAnimationFrame(tick);};tick(t0);});
    }
    configure(changes) {
      Object.assign(this.settings, changes); store.write('audio',this.settings);
      if (this.music) this.music.volume = Math.max(0,Math.min(1,this.userGain('music')));
      for(const element of this.effects)this.applyEffectVolume(element);
      for(const channel of this.channels.keys())this.applyChannelVolume(channel);
    }
    stop() { if (this.music) {const old=this.music;this.music=null;this.releaseAudio(old);} for (const a of this.effects)this.releaseAudio(a); this.effects.clear(); for(const key of Array.from(this.channelFades.keys()))this.cancelChannelFade(key);this.pendingChannels?.clear();this.pendingOneShots=null;this.pending=null;for(const key of Array.from(this.channels.keys()))this.stopChannel(key); }
  }
  function downloadBlob(name, blob) {
    const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  function downloadText(name, text) {return downloadBlob(name,new Blob([text],{type:'application/json;charset=utf-8'}));}
  function downloadRawBackup(name, raw) {
    // A damaged localStorage value can contain isolated UTF-16 surrogates.
    // Blob(string) replaces these with U+FFFD, so use BOM-marked UTF-16LE in
    // that exceptional case to retain every original code unit for recovery.
    raw=String(raw);let malformed=false;
    for(let i=0;i<raw.length;i++){const c=raw.charCodeAt(i);if(c>=0xD800&&c<=0xDBFF){const next=raw.charCodeAt(i+1);if(next>=0xDC00&&next<=0xDFFF)i++;else{malformed=true;break;}}else if(c>=0xDC00&&c<=0xDFFF){malformed=true;break;}}
    if(!malformed)return downloadBlob(name,new Blob([raw],{type:'application/octet-stream'}));
    const bytes=new Uint8Array((raw.length+1)*2);bytes[0]=0xFF;bytes[1]=0xFE;
    for(let i=0;i<raw.length;i++){const c=raw.charCodeAt(i);bytes[2+i*2]=c&255;bytes[3+i*2]=c>>>8;}
    return downloadBlob(name+'.utf16le',new Blob([bytes],{type:'application/octet-stream'}));
  }
  function downloadJSON(name,value) {return downloadText(name,JSON.stringify(value,null,2));}
  function importJSON() {
    return new Promise((resolve,reject)=>{
      const input=document.createElement('input'); input.type='file'; input.accept='.json,application/json';
      input.addEventListener('change',async()=>{ try { const file=input.files[0]; if(!file)return resolve(null); if(file.size>50*1024*1024)throw Error(L("存档文件过大")); const value=JSON.parse(await file.text()); resolve(value); } catch(e){reject(e);} });
      input.addEventListener('cancel',()=>resolve(null)); input.click();
    });
  }
  function saveEnvelope(state, extras = {}) { return {format:'sddyx-offline-save',version:1,savedAt:new Date().toISOString(),state,...extras}; }
  function validateSave(value) {
    if(!value || typeof value!=='object' || Array.isArray(value) || value.format!=='sddyx-offline-save' || value.version!==1 || !value.state || typeof value.state!=='object' || Array.isArray(value.state)) throw Error(L("这不是兼容的离线存档"));
    return value;
  }
  const api={store,esc,richText,sourceVolumeToDecibel,sourceVolumeToGain,AudioManager,downloadJSON,downloadText,downloadRawBackup,importJSON,saveEnvelope,validateSave};
  global.SDDYXPlatform=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
