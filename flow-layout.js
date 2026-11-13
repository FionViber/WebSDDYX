/* Original UnityUIExtensions.FlowLayoutGroup, statically recovered from the
 * supplied GameAssembly.dll. Evidence: analysis/native/FLOW_LAYOUT_NATIVE.md.
 * This is the release's two-axis implementation, without newer upstream flags. */
(function(global){'use strict';
const SCRIPT_GUID='1a4572babd712793c6930cdc2adc3b01',SCRIPT_FILE_ID=341177514;
const f=Math.fround,add=(a,b)=>f(a+b),sub=(a,b)=>f(a-b),mul=(a,b)=>f(a*b),div=(a,b)=>f(a/b);
const number=(value,fallback=0)=>Number.isFinite(Number(value))?f(Number(value)):fallback;
function isFlowLayout(component){const fields=component?.fields||component,script=fields?.m_Script;return script?.guid===SCRIPT_GUID&&script.fileID===SCRIPT_FILE_ID;}
function calculate({fields={},width=0,height=0,children=[]}={}){
 width=number(width);height=number(height);
 const padding=fields.m_Padding||{},left=number(padding.m_Left),right=number(padding.m_Right),top=number(padding.m_Top),bottom=number(padding.m_Bottom);
 const startAxis=number(fields.m_StartAxis),horizontal=startAxis===0,vertical=startAxis===1,alignment=number(fields.m_ChildAlignment),center=[1,4,7].includes(alignment),rightAlign=[2,5,8].includes(alignment),middle=[3,4,5].includes(alignment),lower=[6,7,8].includes(alignment);
 const forceWidth=!!fields.ChildForceExpandWidth,forceHeight=!!fields.ChildForceExpandHeight,expandSpacing=!!fields.ExpandHorizontalSpacing;
 const spacingX=number(fields.SpacingX),spacingY=number(fields.SpacingY),elementSpacing=horizontal?spacingX:vertical?spacingY:0,barSpacing=horizontal?spacingY:vertical?spacingX:0;
 const working=horizontal?sub(sub(width,left),right):vertical?sub(sub(height,top),bottom):0,groupCross=horizontal?height:vertical?width:0;
 let offset=horizontal?(lower?bottom:top):vertical?(rightAlign?right:left):0;
 const trailing=horizontal?(lower?top:bottom):vertical?(rightAlign?left:right):0;
 const items=[];let greatestMinWidth=0,greatestMinHeight=0;
 children.forEach((child,index)=>{
  if(!child||child.active===false||child.active===0||child.ignoreLayout)return;
  const minWidth=Math.max(0,number(child.minWidth)),minHeight=Math.max(0,number(child.minHeight));
  const preferredWidth=Math.max(minWidth,number(child.preferredWidth)),preferredHeight=Math.max(minHeight,number(child.preferredHeight));
  greatestMinWidth=Math.max(greatestMinWidth,minWidth);greatestMinHeight=Math.max(greatestMinHeight,minHeight);
  items.push({index,minWidth,minHeight,preferredWidth,preferredHeight});
 });
 // invertOrder reverses traversal only for lower rows / right columns. The
 // corresponding per-bar reversal below happens independently of this flag.
 if(fields.invertOrder&&((horizontal&&lower)||(vertical&&rightAlign)))items.reverse();
 const bars=[];let members=[],mainSize=0,crossSize=0;
 function closeBar(){bars.push({indices:members.map(item=>item.index),members,mainSize:sub(mainSize,elementSpacing),crossSize,offset});}
 for(const item of items){
  const childMain=horizontal?Math.min(item.preferredWidth,working):vertical?Math.min(item.preferredHeight,working):0,childCross=horizontal?item.preferredHeight:vertical?item.preferredWidth:0;
  // Strict greater-than comparison, including the trailing gap accumulated by
  // the previous element. Child main size is clamped before testing the wrap.
  if(add(mainSize,childMain)>working){closeBar();offset=add(add(offset,crossSize),barSpacing);members=[];mainSize=0;crossSize=0;}
  mainSize=add(add(mainSize,childMain),elementSpacing);crossSize=Math.max(crossSize,childCross);members.push(item);
 }
 closeBar();
 const measured=add(add(crossSize,offset),trailing),rawMinimum=horizontal?[add(add(right,left),greatestMinWidth),measured]:[measured,add(add(top,bottom),greatestMinHeight)],rawPreferred=horizontal?[-1,measured]:[measured,-1];
 const metrics={minWidth:rawMinimum[0],minHeight:rawMinimum[1],preferredWidth:Math.max(rawMinimum[0],rawPreferred[0]),preferredHeight:Math.max(rawMinimum[1],rawPreferred[1]),flexibleWidth:0,flexibleHeight:0};
 const rects=children.map(()=>null);
 for(const bar of bars){
  const count=bar.members.length,barMembers=((horizontal&&lower)||(vertical&&rightAlign))?bar.members.slice().reverse():bar.members;
  const forceMain=horizontal?forceWidth:forceHeight,alignMainCenter=horizontal?center:middle,alignMainEnd=horizontal?rightAlign:lower;
  let mainOffset=horizontal?left:top,extraSize=0,extraSpacing=0;
  if(!forceMain&&alignMainCenter)mainOffset=add(mainOffset,mul(sub(working,bar.mainSize),.5));
  else if(!forceMain&&alignMainEnd)mainOffset=add(mainOffset,sub(working,bar.mainSize));
  if(forceMain)extraSize=div(sub(working,bar.mainSize),count);
  else if(expandSpacing){
   extraSpacing=div(sub(working,bar.mainSize),count-1);
   if(count>1){if(alignMainCenter)mainOffset=sub(mainOffset,mul(mul(count-1,extraSpacing),.5));else if(alignMainEnd)mainOffset=sub(mainOffset,mul(count-1,extraSpacing));}
  }
  let crossOffset=bar.offset;
  if((horizontal&&lower)||(vertical&&rightAlign))crossOffset=sub(sub(groupCross,bar.offset),bar.crossSize);
  else if((horizontal&&middle)||(vertical&&center))crossOffset=add(sub(mul(groupCross,.5),mul(measured,.5)),bar.offset);
  barMembers.forEach((item,j)=>{
   let childWidth=item.preferredWidth,childHeight=item.preferredHeight;
   if(horizontal){childWidth=Math.min(add(childWidth,extraSize),working);if(forceHeight)childHeight=bar.crossSize;}
   else if(vertical){childHeight=Math.min(add(childHeight,extraSize),working);if(forceWidth)childWidth=bar.crossSize;}
   let crossPosition=crossOffset;
   if(horizontal&&middle)crossPosition=add(crossPosition,mul(sub(bar.crossSize,childHeight),.5));
   else if(horizontal&&lower)crossPosition=add(crossPosition,sub(bar.crossSize,childHeight));
   else if(vertical&&center)crossPosition=add(crossPosition,mul(sub(bar.crossSize,childWidth),.5));
   else if(vertical&&rightAlign)crossPosition=add(crossPosition,sub(bar.crossSize,childWidth));
   if(expandSpacing&&j>0)mainOffset=add(mainOffset,extraSpacing);
   rects[item.index]=horizontal?{x:mainOffset,y:crossPosition,w:childWidth,h:childHeight}:{x:crossPosition,y:mainOffset,w:childWidth,h:childHeight};
   if(j<count-1)mainOffset=add(add(mainOffset,horizontal?childWidth:childHeight),elementSpacing);
  });
 }
 return{rects,metrics,layoutInput:{minimum:rawMinimum,preferred:rawPreferred,flexible:[-1,-1]},contentSize:{width:horizontal?width:measured,height:horizontal?measured:height},bars:bars.map(({indices,mainSize,crossSize,offset})=>({indices,mainSize,crossSize,offset}))};
}
const api={SCRIPT_GUID,SCRIPT_FILE_ID,isFlowLayout,calculate};global.SDDYXFlowLayout=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
