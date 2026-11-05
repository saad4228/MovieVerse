import {DatabaseSync} from "node:sqlite";
import {readFileSync} from "node:fs";
export function discoveryDb(){
 const sqlite=new DatabaseSync(":memory:");sqlite.exec(readFileSync("drizzle/0004_dynamic_catalogue.sql","utf8"));
 function statement(sql:string,args:unknown[]=[]):any{return {
  bind(...values:unknown[]){return statement(sql,values);},
  async first(){return sqlite.prepare(sql).get(...args as any[])??null;},
  async all(){return {results:sqlite.prepare(sql).all(...args as any[]),success:true,meta:{}};},
  async run(){const result=sqlite.prepare(sql).run(...args as any[]);return {success:true,meta:{changes:Number(result.changes)}};},
 };}
 const db={prepare:statement,async batch(statements:any[]){sqlite.exec("BEGIN");try{const result=[];for(const s of statements)result.push(await s.run());sqlite.exec("COMMIT");return result;}catch(e){sqlite.exec("ROLLBACK");throw e;}}} as unknown as D1Database;
 return {db,sqlite};
}
