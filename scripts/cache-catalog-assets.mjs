import {readFile,writeFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
const details=JSON.parse(await readFile('data/movie-details.json','utf8'));
const films=JSON.parse(await readFile('data/coming-soon-movies.json','utf8'));
const entries=new Map();
for(const record of Object.values(details)) for(const person of record.cast) if(person.id && person.profilePath) {
  const url=`https://image.tmdb.org/t/p/w342${person.profilePath}`;
  entries.set(url,{name:`person-${person.id}-${person.profilePath.split('/').pop().split('.')[0]}`,source:`https://image.tmdb.org/t/p/w500${person.profilePath}`,max:500,kind:'profile'});
}
for(const film of films) for(const kind of ['poster','backdrop']) if(film[kind].startsWith('https://'))entries.set(film[kind],{name:`${film.id}-${kind}`,source:film[kind],max:kind==='poster'?1200:3840,kind});
await mkdir('public/assets/catalog',{recursive:true});
const manifest={};const queue=[...entries];
async function worker(){while(queue.length){const [key,item]=queue.shift();try{
  const r=await fetch(item.source,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const bytes=Buffer.from(await r.arrayBuffer());const original=await sharp(bytes).metadata();
  const file=`/assets/catalog/${item.name}.webp`;
  const output=await sharp(bytes).resize({width:item.max,withoutEnlargement:true}).webp({quality:item.kind==='profile'?90:95,effort:4}).toFile(`public${file}`);
  manifest[key]={url:file,width:output.width,height:output.height,source:item.source,sourceWidth:original.width,sourceHeight:original.height,checked:'2026-11-01',rights:'TMDB imagery; respective rights holders'};
}catch(e){console.log('Failed',item.name,e.message);}}}
await Promise.all([worker(),worker(),worker()]);
await writeFile('data/catalog-asset-cache.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Cached ${Object.keys(manifest).length}/${entries.size} image assets without enlargement.`);
