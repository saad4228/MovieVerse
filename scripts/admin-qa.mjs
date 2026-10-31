import {spawn} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {once} from 'node:events';
const token=randomBytes(32).toString('hex');
const child=spawn(process.execPath,['scripts/run-framework.mjs','dev','--port','5173','--hostname','127.0.0.1'],{env:{...process.env,ADMIN_TOKEN:token},stdio:['ignore','pipe','pipe'],windowsHide:true});
let output='';child.stdout.on('data',b=>{output+=b;});child.stderr.on('data',b=>{output+=b;});
const origin='http://127.0.0.1:5173';
async function ready(){for(let i=0;i<100;i++){try{const response=await fetch(origin+'/api/catalog');if(response.ok)return;}catch{}await new Promise(r=>setTimeout(r,300));}throw new Error('QA server did not start. '+output.slice(-2000));}
const adminHeaders={'Content-Type':'application/json',Authorization:`Bearer ${token}`};
async function post(action,body){const response=await fetch(origin+'/api/'+action,{method:'POST',headers:adminHeaders,body:JSON.stringify(body)});return {status:response.status,body:await response.json()};}
try{
 await ready();const original=await (await fetch(origin+'/api/catalog')).json();
 const draft=structuredClone(original);draft.snacks[0].description='Administrator integration verification';
 let result=await post('catalog',draft);if(result.status!==200)throw new Error('Catalog save failed: '+JSON.stringify(result));
 const check=await (await fetch(origin+'/api/catalog')).json();if(check.snacks[0].description!==draft.snacks[0].description)throw new Error('Catalog was not persisted.');
 result=await post('catalog',original);if(result.status!==200)throw new Error('Catalog restoration failed.');
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+6*86400000));const showId=`jaipur-1~sintel~${date}~1415`;
 const inventory=await (await fetch(origin+'/api/inventory?show='+encodeURIComponent(showId))).json();const seat=inventory.seats.find(s=>inventory.inventory[s.id].status==='available'&&!s.blocked);
 result=await post('manage-inventory',{showId,seats:[seat.id],status:'blocked'});if(result.status!==200)throw new Error('Inventory management failed: '+JSON.stringify(result));
 const blocked=await (await fetch(origin+'/api/inventory?show='+encodeURIComponent(showId))).json();if(blocked.inventory[seat.id].status!=='blocked')throw new Error('Inventory did not persist.');await post('manage-inventory',{showId,seats:[seat.id],status:'available'});
 const blueprint={...original.blueprints.find(b=>b.id==='luxury'),name:'QA Lounge'};result=await post('blueprint',blueprint);if(result.status!==200)throw new Error('Blueprint save failed: '+JSON.stringify(result));await post('blueprint',original.blueprints.find(b=>b.id==='luxury'));
 console.log('Administrator integration: catalog persistence/restoration, inventory block/release, blueprint publish/restoration passed.');
}catch(error){console.error(error.message);process.exitCode=1;}finally{child.kill('SIGINT');await Promise.race([once(child,'exit'),new Promise(r=>setTimeout(r,2000))]);child.kill();}
