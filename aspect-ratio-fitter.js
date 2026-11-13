/* Original UnityEngine.UI.AspectRatioFitter; static release-native evidence in
 * analysis/native/ASPECT_RATIO_FITTER_NATIVE.md. No CSS object-fit substitute. */
(function(global){'use strict';
const SCRIPT_GUID='d3e719b59ab71ba3f6b398058c866280',SCRIPT_FILE_ID=-1254083943;
const f=Math.fround,add=(a,b)=>f(a+b),sub=(a,b)=>f(a-b),mul=(a,b)=>f(a*b),div=(a,b)=>f(a/b);
const number=(value,fallback=0)=>value===undefined||value===null?fallback:f(Number(value));
const vector=(value={},fallback=0)=>({x:number(value.x,fallback),y:number(value.y,fallback)});
function isAspectRatioFitter(component){const fields=component?.fields||component,script=fields?.m_Script;return script?.guid===SCRIPT_GUID&&script.fileID===SCRIPT_FILE_ID;}
function rectOf(transform={},parentWidth=0,parentHeight=0){
 const min=vector(transform.m_AnchorMin,.5),max=vector(transform.m_AnchorMax,.5),pivot=vector(transform.m_Pivot,.5),delta=vector(transform.m_SizeDelta),position=vector(transform.m_AnchoredPosition||transform.m_LocalPosition),pw=number(parentWidth),ph=number(parentHeight),spanX=sub(max.x,min.x),spanY=sub(max.y,min.y),w=add(mul(pw,spanX),delta.x),h=add(mul(ph,spanY),delta.y);
 return{x:sub(add(mul(pw,add(min.x,mul(spanX,pivot.x))),position.x),mul(w,pivot.x)),y:sub(sub(mul(ph,sub(sub(1,min.y),mul(spanY,pivot.y))),position.y),mul(h,sub(1,pivot.y))),w,h};
}
function update({fields={},transform={},parentWidth=0,parentHeight=0,hasParent=true,parentIsRectTransform=true,active=true,canvas=null}={}){
 const mode=number(fields.m_AspectMode),ratio=number(fields.m_AspectRatio,1),componentValid=!canvas||!canvas.isRootCanvas||canvas.renderMode===2,modeValid=hasParent||(mode!==3&&mode!==4),enabled=fields.m_Enabled!==0&&fields.m_Enabled!==false;
 const pw=hasParent&&parentIsRectTransform?number(parentWidth):0,ph=hasParent&&parentIsRectTransform?number(parentHeight):0;
 const result={transform:{...transform},driven:[],componentValid,modeValid,shouldDisableOnStart:!componentValid||!modeValid,status:'none'};
 function finish(status){result.status=status;result.rect=rectOf(result.transform,pw,ph);return result;}
 if(!enabled)return finish('disabled');if(!active)return finish('inactive');if(!componentValid)return finish('invalidCanvas');
 const before=rectOf(transform,pw,ph),delta={...vector(transform.m_SizeDelta)};
 if(mode===1){
  const min=vector(transform.m_AnchorMin,.5),max=vector(transform.m_AnchorMax,.5);
  delta.y=sub(div(before.w,ratio),mul(ph,sub(max.y,min.y)));result.transform.m_SizeDelta={...transform.m_SizeDelta,...delta};result.driven=['m_SizeDelta.y'];
 }else if(mode===2){
  const min=vector(transform.m_AnchorMin,.5),max=vector(transform.m_AnchorMax,.5);
  delta.x=sub(mul(before.h,ratio),mul(pw,sub(max.x,min.x)));result.transform.m_SizeDelta={...transform.m_SizeDelta,...delta};result.driven=['m_SizeDelta.x'];
 }else if(mode===3||mode===4){
  if(!hasParent)return finish('missingParent');
  result.transform.m_AnchorMin={x:0,y:0};result.transform.m_AnchorMax={x:1,y:1};result.transform.m_AnchoredPosition={x:0,y:0};
  const sizeDelta={x:0,y:0};
  // Exact native XOR: choose the width-constrained height when the parent's
  // aspect comparison differs from FitInParent. No runtime ratio clamp exists.
  if((mul(ph,ratio)<pw)!==(mode===3))sizeDelta.y=sub(div(pw,ratio),ph);
  else sizeDelta.x=sub(mul(ph,ratio),pw);
  result.transform.m_SizeDelta=sizeDelta;result.driven=['m_AnchorMin.x','m_AnchorMin.y','m_AnchorMax.x','m_AnchorMax.y','m_AnchoredPosition.x','m_AnchoredPosition.y','m_SizeDelta.x','m_SizeDelta.y'];
 }else return finish('none');
 return finish('driven');
}
const api={SCRIPT_GUID,SCRIPT_FILE_ID,isAspectRatioFitter,rectOf,update};global.SDDYXAspectRatioFitter=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
