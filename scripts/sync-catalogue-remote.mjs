// Authorized manual refresh, split by collection to avoid a single long HTTP request.
// Set MOVIEVERSE_URL and ADMIN_TOKEN in this process; never put a token in the URL.
const origin=process.env.MOVIEVERSE_URL,token=process.env.ADMIN_TOKEN;
if(!origin||!token)throw new Error('MOVIEVERSE_URL and ADMIN_TOKEN must be configured in the process environment.');
const target=new URL('/api/catalogue-sync',origin);
if(target.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(target.hostname))throw new Error('HTTPS required.');
const kind=process.argv.includes('--trending')?'trending':'full';
async function call(body){const response=await fetch(target,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({kind,...body}),signal:AbortSignal.timeout(180000)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Manual synchronisation failed');return result;}
const plan=await call({operation:'plan'}),runs=[];
for(const collection of plan.collections){console.log(`Refreshing ${collection}`);const result=await call({collection});if(result.failures)throw new Error(`Collection ${collection} did not complete; the previous published collection was retained.`);runs.push(result.id);}
console.log(JSON.stringify(await call({operation:'complete',runs})));
