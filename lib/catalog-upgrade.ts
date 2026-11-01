import additions from '../data/coming-soon-movies.json' with {type:'json'};
import type {Movie} from './catalog';
export const CATALOG_REVISION=2;
/** Add only newly introduced IDs to old snapshots; preserve edits and deliberate
 * removals once the operator publishes the current revision. Never mutate storage. */
export function upgradeCatalog<T extends {movies:Movie[];catalogRevision?:number}>(catalog:T,bundled:Movie[]):T {
 if((catalog.catalogRevision || 1)>=CATALOG_REVISION)return catalog;
 const introduced=new Set(additions.map(m=>m.id));
 return {...catalog,catalogRevision:CATALOG_REVISION,movies:[...catalog.movies,...bundled.filter(m=>introduced.has(m.id)&&!catalog.movies.some(saved=>saved.id===m.id))]};
}
