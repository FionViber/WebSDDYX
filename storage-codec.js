/* Browser persistence adaptation: lossless, checksummed UTF-16 chunks.
 * Source history is never pruned. Checkpoint compression is reused only after
 * comparing its current serialized text, so later mutations remain safe.
 * LZ-String 1.5.0 (MIT) is bundled locally; no network or IndexedDB is required. */
(function(global){
'use strict';
const MAGIC='sddyx-storage',VERSION=1,cache=new WeakMap();
let metrics={compressedChunks:0,reusedChunks:0};
const table=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[i]=c>>>0;}
function checksum(text){let c=0xffffffff;for(let i=0;i<text.length;i++){const n=text.charCodeAt(i);c=table[(c^n)&255]^(c>>>8);c=table[(c^(n>>>8))&255]^(c>>>8);}return((c^0xffffffff)>>>0).toString(16).padStart(8,'0');}
function pack(value,raw=JSON.stringify(value)){if(raw===undefined)throw Error('Cannot persist an undefined value');const old=value&&typeof value==='object'?cache.get(value):null;if(old?.raw===raw){metrics.reusedChunks++;return old.chunk;}const chunk={length:raw.length,crc32:checksum(raw),data:global.LZString.compressToUTF16(raw)};metrics.compressedChunks++;if(value&&typeof value==='object')cache.set(value,{raw,chunk});return chunk;}
function unpack(chunk){if(!chunk||typeof chunk.data!=='string'||!Number.isSafeInteger(chunk.length)||chunk.length<0||typeof chunk.crc32!=='string')throw Error('Invalid compressed save chunk');const raw=global.LZString.decompressFromUTF16(chunk.data);if(typeof raw!=='string'||raw.length!==chunk.length||checksum(raw)!==chunk.crc32)throw Error('Save checksum mismatch');const value=JSON.parse(raw);if(value&&typeof value==='object')cache.set(value,{raw,chunk});return value;}
function encode(value){if(!global.LZString)throw Error('Offline save codec is not loaded');let record;
 if(value?.format==='sddyx-offline-save'&&value.state?.checkpoints&&typeof value.state.checkpoints==='object'&&!Array.isArray(value.state.checkpoints)){
  const checkpoints=value.state.checkpoints,main={...value,state:{...value.state,checkpoints:{}}};
  record={format:MAGIC,version:VERSION,codec:'lz-utf16-crc32',kind:'save',main:pack(main),checkpoints:Object.entries(checkpoints).map(([key,snapshot])=>[key,pack(snapshot)])};
 }else{const raw=JSON.stringify(value);if(raw===undefined)throw Error('Cannot persist an undefined value');if(raw.length<2048)return raw;record={format:MAGIC,version:VERSION,codec:'lz-utf16-crc32',kind:'value',main:pack(value,raw)};}
 return JSON.stringify(record);
}
function decode(raw){const record=JSON.parse(raw);if(record?.format!==MAGIC)return record;if(record.version!==VERSION||record.codec!=='lz-utf16-crc32')throw Error('Unsupported browser save version');if(!global.LZString)throw Error('Offline save codec is not loaded');const value=unpack(record.main);if(record.kind==='save'){
 if(!value?.state||!Array.isArray(record.checkpoints))throw Error('Invalid browser save structure');const checkpoints=value.state.checkpoints={};for(const pair of record.checkpoints){if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||Object.hasOwn(checkpoints,pair[0]))throw Error('Invalid checkpoint index');Object.defineProperty(checkpoints,pair[0],{value:unpack(pair[1]),enumerable:true,writable:true,configurable:true});}
 }else if(record.kind!=='value')throw Error('Invalid browser save kind');return value;}
const api={encode,decode,checksum,get metrics(){return{...metrics};},resetMetrics(){metrics={compressedChunks:0,reusedChunks:0};},version:VERSION};global.SDDYXStorageCodec=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
