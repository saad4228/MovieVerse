import {z} from "zod";
import {cataloguePage,catalogueHome,catalogueStatus,databaseGenres,databaseGenrePage} from "./catalogue-read";
import {syncCatalogue} from "./catalogue-sync";
import {genreQuery} from "./genre-catalog";
import {collectionPlan} from "./discovery-collections";
export async function catalogueApi(req:Request,action:string,env:Cloudflare.Env):Promise<Response|null>{
 const actions=["catalogue","discovery-home","catalogue-search","catalogue-sync","catalogue-status","catalogue-pins","movie-genres","genre-movies","tmdb-movie","movie-discovery"];
 if(!actions.includes(action))return null;
 const url=new URL(req.url),db=env.DB;
 const protectedRoute=["catalogue-sync","catalogue-status","catalogue-pins"].includes(action);
 if(protectedRoute&&(!env.ADMIN_TOKEN||req.headers.get("authorization")!==`Bearer ${env.ADMIN_TOKEN}`))return Response.json({error:"Administrator authorization required."},{status:403});
 if(!db)return Response.json({error:"Movie catalogue storage is unavailable."},{status:503});
 const respond=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":protectedRoute||status!==200?"no-store":"public, max-age=120, stale-while-revalidate=60"}});
 try{
  if(action==="catalogue-status"&&req.method==="GET")return respond(await catalogueStatus(db));
  if(action==="catalogue-sync"&&req.method==="POST"){
   const body=z.object({kind:z.enum(["full","trending"]),operation:z.enum(["plan","refresh","complete"]).default("refresh"),collection:z.string().max(80).optional(),runs:z.array(z.string().uuid()).max(100).optional()}).parse(await req.json());
   const plan=collectionPlan(body.kind);
   if(body.operation==="plan")return respond({collections:plan.map(p=>p.id)});
   if(body.operation==="complete"){
    const rows:{id:string;kind:string;status:string;started:number;report:string}[]=[];for(const id of [...new Set(body.runs??[])]){const row=await db.prepare("SELECT * FROM discovery_sync_runs WHERE id=?").bind(id).first<{id:string;kind:string;status:string;started:number;report:string}>();if(row)rows.push(row);}
    if(plan.some(spec=>!rows.some(r=>r.kind===`manual:${spec.id}`&&r.status==="success"&&r.started>Date.now()-7200000)))return respond({error:"Not all collection refreshes completed successfully in the last two hours."},409);
    const id=crypto.randomUUID();await db.prepare("INSERT INTO discovery_sync_runs(id,kind,started,finished,status,report) VALUES(?,?,?,?,?,?)").bind(id,body.kind,Math.min(...rows.map(r=>r.started)),Date.now(),"success",JSON.stringify({manual:true,runs:rows.map(r=>r.id)})).run();return respond({id,status:"success"});
   }
   if(!body.collection||!plan.some(spec=>spec.id===body.collection))return respond({error:"Choose a collection from the protected sync plan. Use the remote sync helper for a complete refresh."},400);
   return respond(await syncCatalogue(db,env,body.kind,{collection:body.collection}));
  }
  if(action==="catalogue-pins"&&req.method==="POST"){
   const {ids}=z.object({ids:z.array(z.number().int().positive()).max(6)}).parse(await req.json());
   for(const id of ids)if(!await db.prepare("SELECT id FROM discovery_movies WHERE id=?").bind(id).first())return respond({error:"Pinned movies must already exist in the catalogue."},400);
   await db.prepare("INSERT INTO discovery_settings(id,document) VALUES('featured-pins',?) ON CONFLICT(id) DO UPDATE SET document=excluded.document").bind(JSON.stringify([...new Set(ids)])).run();return respond({saved:true});
  }
  if(req.method!=="GET")return respond({error:"Method not allowed."},405);
  if(action==="movie-genres")return respond({collections:databaseGenres()});
  if(action==="genre-movies")return respond(await databaseGenrePage(db,genreQuery.parse(Object.fromEntries(url.searchParams))));
  if(action==="discovery-home")return respond(await catalogueHome(db));
  if(action==="tmdb-movie"){
   const id=z.coerce.number().int().positive().parse(url.searchParams.get("id"));
   const row=await db.prepare("SELECT document,updated FROM discovery_movies WHERE id=?").bind(id).first<{document:string;updated:number}>();
   return row?respond({movie:JSON.parse(row.document),source:"tmdb-d1",fetchedAt:new Date(row.updated).toISOString()}):respond({error:"This movie has not been imported yet."},404);
  }
  const params=new URLSearchParams(url.searchParams);
  if(action==="movie-discovery"){const section=params.get("section")??"trending";params.set("collection",section==="trending"?`trending-${params.get("window")??"day"}`:section==="now-playing"?"now-playing-IN":section);}
  if(action==="catalogue-search"&&!(params.get("q")??"").trim())return respond({movies:[]});
  return respond(await cataloguePage(db,params));
 }catch(error){
  if(error instanceof z.ZodError)return respond({error:"Choose valid catalogue filters."},400);
  return respond({error:protectedRoute?"Synchronisation could not complete. Check protected sync status; the last successful snapshot is preserved.":"The movie catalogue is temporarily unavailable. Please try again."},503);
 }
}
