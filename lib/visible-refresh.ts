// One refresh clock and browser subscription for all mounted catalogue queries.
// No background requests while the document is hidden; last subscriber cleans up.
const subscribers=new Set<()=>void>();
let timer:ReturnType<typeof setInterval>|undefined;
function refresh(){if(!document.hidden)subscribers.forEach(callback=>callback());}
export function subscribeVisibleRefresh(callback:()=>void){
 if(!subscribers.size){
  timer=setInterval(refresh,300000);
  window.addEventListener("focus",refresh);
  document.addEventListener("visibilitychange",refresh);
 }
 subscribers.add(callback);
 return()=>{
  subscribers.delete(callback);
  if(!subscribers.size){clearInterval(timer);timer=undefined;window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);}
 };
}
