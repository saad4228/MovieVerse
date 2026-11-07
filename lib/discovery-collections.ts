// Collection definitions are queries, never fixed movie lists.
export const officialGenres = [
 [28,"action","Action"],[12,"adventure","Adventure"],[16,"animation","Animation"],
 [35,"comedy","Comedy"],[80,"crime","Crime"],[99,"documentary","Documentary"],
 [18,"drama","Drama"],[10751,"family","Family"],[14,"fantasy","Fantasy"],
 [36,"history","History"],[27,"horror","Horror"],[10402,"music","Music"],
 [9648,"mystery","Mystery"],[10749,"romance","Romance"],[878,"science-fiction","Science Fiction"],
 [10770,"tv-movie","TV Movie"],[53,"thriller","Thriller"],[10752,"war","War"],[37,"western","Western"],
] as const;
export type CollectionSpec={id:string;path:string;params:Record<string,string>;pages:number};
export const CATALOGUE_PAGE_LIMITS: Readonly<Record<string, number>> = {
 "now-playing-IN": 2,
 "upcoming-endpoint-IN": 2,
 "upcoming-IN": 2,
 "upcoming-US": 2,
 "upcoming-global": 2,
 popular: 2,
 "top-rated": 2,
 hollywood: 2,
 "hollywood-recent": 1,
 "hollywood-classics": 2,
 "hollywood-rated": 2,
 indian: 2,
 "regional-hi": 2,
 "regional-ta": 2,
 "regional-te": 2,
 "regional-ml": 2,
 "regional-kn": 2,
 "regional-mr": 1,
 "regional-bn": 1,
 international: 1,
 "recent-international": 1,
};
export const DEFAULT_DISCOVERY_PAGE_LIMIT = 1;
const boundedPages = (id: string, planned: number) =>
 Math.min(planned, CATALOGUE_PAGE_LIMITS[id] ?? DEFAULT_DISCOVERY_PAGE_LIMIT);
export const indiaToday=(now=new Date())=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
export function collectionPlan(kind:"full"|"trending",now=new Date()):CollectionSpec[]{
 const today=indiaToday(now),future=new Date(now);future.setUTCMonth(future.getUTCMonth()+18);
 const until=indiaToday(future),past=new Date(now);past.setUTCDate(past.getUTCDate()-60);
 const discover=(id:string,params:Record<string,string>,pages=3):CollectionSpec=>({id,path:"discover/movie",params:{include_adult:"false",include_video:"false",sort_by:"popularity.desc",...params},pages});
 const trending:CollectionSpec[]=["day","week"].map(window=>({id:`trending-${window}`,path:`trending/movie/${window}`,params:{},pages:2}));
 if(kind==="trending")return trending;
 return [...trending,
 {id:"now-playing-IN",path:"movie/now_playing",params:{region:"IN"},pages:5},
 {id:"upcoming-endpoint-IN",path:"movie/upcoming",params:{region:"IN"},pages:3},
 {id:"popular",path:"movie/popular",params:{},pages:5},
 {id:"top-rated",path:"movie/top_rated",params:{},pages:5},
 discover("upcoming-IN",{region:"IN",with_release_type:"2|3","release_date.gte":today,"release_date.lte":until},5),
 discover("upcoming-US",{region:"US",with_release_type:"2|3",with_origin_country:"US","release_date.gte":today,"release_date.lte":until},5),
 discover("upcoming-global",{"primary_release_date.gte":today,"primary_release_date.lte":until},4),
 discover("hollywood",{with_origin_country:"US"},5),
 discover("hollywood-recent",{with_origin_country:"US",region:"US",with_release_type:"2|3","release_date.gte":indiaToday(past),"release_date.lte":today}),
 discover("hollywood-classics",{with_origin_country:"US","primary_release_date.lte":"1999-12-31",sort_by:"vote_average.desc","vote_count.gte":"500"},4),
 discover("hollywood-rated",{with_origin_country:"US",sort_by:"vote_average.desc","vote_count.gte":"500"},4),
 discover("indian",{with_origin_country:"IN"},5),
 ...["hi","ta","te","ml","kn","mr","bn"].map(language=>discover(`regional-${language}`,{with_origin_country:"IN",with_original_language:language})),
 ...["GB","KR","JP","FR","ES","DE","IT","CN"].map(country=>discover(`international-${country}`,{with_origin_country:country},2)),
 ...officialGenres.flatMap(([id,slug])=>[
 discover(`genre-${slug}`,{with_genres:String(id),"vote_count.gte":"50"},2),
 discover(`hollywood-genre-${slug}`,{with_genres:String(id),with_origin_country:"US","vote_count.gte":"50"},2),
 ]),
 ].map(spec => ({ ...spec, pages: boundedPages(spec.id, spec.pages) }));
}
