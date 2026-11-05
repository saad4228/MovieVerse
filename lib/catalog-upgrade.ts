import additions from '../data/coming-soon-movies.json' with {type:'json'};
import discoveryAdditions from '../data/discovery-movies.json' with {type:'json'};
import type {Movie,Venue} from './catalog';
export const CATALOG_REVISION=4;
/** Add only newly introduced IDs to old snapshots; preserve edits and deliberate
 * removals once the operator publishes the current revision. Never mutate storage. */
export function upgradeCatalog<T extends {movies:Movie[];venues?:Venue[];catalogRevision?:number}>(catalog:T,bundled:Movie[],bundledVenues:Venue[]=[]):T {
 if((catalog.catalogRevision || 1)>=CATALOG_REVISION)return catalog;
 const introduced=new Set([...additions,...discoveryAdditions].map(m=>m.id));
 return {...catalog,...(catalog.venues ? {venues:[...catalog.venues,...bundledVenues.filter(v=>v.id.endsWith("-demo")&&!catalog.venues!.some(saved=>saved.id===v.id))]} : {}),catalogRevision:CATALOG_REVISION,movies:(catalog.catalogRevision??1)>=3 ? catalog.movies : [...catalog.movies,...bundled.filter(m=>introduced.has(m.id)&&!catalog.movies.some(saved=>saved.id===m.id))]};
}
