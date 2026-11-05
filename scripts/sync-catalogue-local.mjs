// Local D1 import uses Node's network stack and the same sync engine as production.
// Never run this against a downloaded production database or expose credentials.
import {register} from "node:module";
register('./local-ts-loader.mjs',import.meta.url);
const {readFileSync,readdirSync}=await import('node:fs');
const {resolve}=await import('node:path');
const {DatabaseSync}=await import('node:sqlite');
const {syncCatalogue}=await import('../lib/catalogue-sync.ts');
const {catalogueStatus}=await import('../lib/catalogue-read.ts');
const root=resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const candidates=readdirSync(root).filter(name=>name.endsWith('.sqlite')&&!name.startsWith('metadata'));
let sqlite;
for(const name of candidates){const candidate=new DatabaseSync(resolve(root,name));if(candidate.prepare("SELECT name FROM sqlite_master WHERE name='catalog_config'").get()){sqlite=candidate;break;}candidate.close();}
if(!sqlite)throw new Error('No local MovieVerse D1 database found. Start the app and apply existing migrations first.');
sqlite.exec('PRAGMA busy_timeout=10000');
sqlite.exec(readFileSync('drizzle/0004_dynamic_catalogue.sql','utf8'));
function statement(sql,args=[]){return {
 bind(...values){return statement(sql,values);},
 async first(){return sqlite.prepare(sql).get(...args)??null;},
 async all(){return {results:sqlite.prepare(sql).all(...args),success:true,meta:{}};},
 async run(){const result=sqlite.prepare(sql).run(...args);return {success:true,meta:{changes:Number(result.changes)}};},
 _sql:sql,_args:args,
};}
const db={prepare:statement,async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
if(process.argv.includes('--status')){console.log(JSON.stringify(await catalogueStatus(db),null,2));sqlite.close();process.exit(0);}
const settings={};
for(const line of readFileSync('.dev.vars','utf8').split(/\r?\n/)){const match=line.match(/^\s*(TMDB_READ_TOKEN|TMDB_API_KEY)\s*=\s*(.*?)\s*$/);if(match)settings[match[1]]=match[2].replace(/^(['"])(.*)\1$/,'$2');}
if(!settings.TMDB_READ_TOKEN&&!settings.TMDB_API_KEY)throw new Error('TMDB credentials are MISSING.');
try{
 const result=await syncCatalogue(db,settings,process.argv.includes('--trending')?'trending':'full',{progress:text=>console.log(text)});
 console.log(JSON.stringify({id:result.id,kind:result.kind,imported:result.imported,updated:result.updated,failures:result.failures}));
 console.log(JSON.stringify(await catalogueStatus(db),null,2));
 if(result.failures)process.exitCode=1;
}catch(error){console.error('Catalogue sync failed. The last successful collections were retained. Code:',error.code??'SYNC_FAILED');process.exitCode=1;}
finally{sqlite.close();}
