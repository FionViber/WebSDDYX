/* Static-host asset rules shared by DOM, canvas and WebGL consumers. */
(function(global){'use strict';
 function resolveURL(value){if(!value||/^(data:|blob:)/i.test(value))return value;const url=new URL(value,global.document.baseURI);const path=decodeURIComponent(url.pathname);const index=path.indexOf('/assets/original/');const key=index>=0?path.slice(index+1):path.replace(/^\//,'');return global.SDDYXAssetLocations?.[key]||value;}
 function createImage(){const image=new Image();if(/^https?:$/.test(global.location?.protocol||''))image.crossOrigin='anonymous';const descriptor=Object.getOwnPropertyDescriptor(global.HTMLImageElement.prototype,'src');Object.defineProperty(image,'src',{configurable:true,get(){return descriptor.get.call(this)},set(value){descriptor.set.call(this,resolveURL(value))}});image.addEventListener('error',()=>console.error('Original image failed to load:',image.currentSrc||image.src));return image;}
 function scriptURL(value){const version=global.SDDYX_DEPLOYMENT?.version;if(!version||/^(data:|blob:)/i.test(value))return value;const url=new URL(value,global.document.baseURI);url.searchParams.set('v',version);return url.href;}
 const api={createImage,scriptURL,resolveURL};global.SDDYXAssetPolicy=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
