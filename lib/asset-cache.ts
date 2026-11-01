import assets from "../data/catalog-asset-cache.json" with { type:"json" };
export type CachedAsset={url:string;width:number;height:number;source:string;checked:string};
export const cachedAsset=(url:string)=> (assets as Record<string,CachedAsset>)[url];
