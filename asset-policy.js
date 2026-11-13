/* Static-host asset rules shared by DOM, canvas and WebGL consumers. */
(function(global){'use strict';
 function createImage(){const image=new Image();if(/^https?:$/.test(global.location?.protocol||''))image.crossOrigin='anonymous';image.addEventListener('error',()=>console.error('Original image failed to load:',image.currentSrc||image.src));return image;}
 function scriptURL(value){const version=global.SDDYX_DEPLOYMENT?.version;if(!version||/^(data:|blob:)/i.test(value))return value;const url=new URL(value,global.document.baseURI);url.searchParams.set('v',version);return url.href;}
 const api={createImage,scriptURL};global.SDDYXAssetPolicy=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
