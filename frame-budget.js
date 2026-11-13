/* Keep render work at 60 Hz on high-refresh displays without changing clocks.
 * Consumers accumulate their real elapsed delta between accepted frames.
 * Late frames never trigger a burst of catch-up renders. */
(function(global){'use strict';
 function create(fps=60){
  if(!Number.isFinite(fps)||fps<=0)throw new RangeError('Render frequency must be positive');
  const interval=1000/fps,stats={rendered:0,skipped:0};let next=null,last=null;
  return {stats,due(time){if(!Number.isFinite(time))return true;if(last!==null&&time<last)next=null;last=time;if(next!==null&&time<next-.75){stats.skipped++;return false;}next=next===null?time+interval:next+interval;if(next<=time)next=time+interval;stats.rendered++;return true;},reset(){next=last=null;}};
 }
 global.SDDYXFrameBudget={create};if(typeof module!=='undefined'&&module.exports)module.exports=global.SDDYXFrameBudget;
})(globalThis);
