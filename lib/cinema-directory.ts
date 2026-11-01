import records from "../data/cinema-venues.json" with {type:"json"};
export type DirectoryVenue = {
  id:string;cityId:string;name:string;brand:string;branch:string;address:string;locality:string;
  aliases:string[];formats:string[];amenities:string[];verification:"listed"|"uncertain"|"closed";
  operationalStatus:"unconfirmed"|"operating"|"closed";checked:string;source:string;bookingUrl?:string;notes:string;
  coordinates?:{lat:number;lng:number};
};
export interface CinemaDirectoryProvider { list(cityId:string):DirectoryVenue[]; find(id:string):DirectoryVenue|undefined }
export const cinemaDirectoryProvider:CinemaDirectoryProvider = {
  list: city => (records as DirectoryVenue[]).filter(v=>v.cityId===city),
  find: id => (records as DirectoryVenue[]).find(v=>v.id===id),
};
export function searchDirectory(city:string, query="",format="All formats",amenity="All amenities",status="All statuses",sort="A–Z") {
  return cinemaDirectoryProvider.list(city).filter(v =>
    (` ${[v.name,v.brand,v.branch,v.address,v.locality,...v.aliases].join(" ").toLowerCase()}`).includes(` ${query.trim().toLowerCase()}`) &&
    (format==="All formats" || v.formats.includes(format)) &&
    (amenity==="All amenities" || v.amenities.includes(amenity)) &&
    (status==="All statuses" || (status==="Needs confirmation" ? v.verification!=="listed" : v.verification==="listed"))
  ).sort((a,b)=> sort === "Locality" ? a.locality.localeCompare(b.locality) : a.name.localeCompare(b.name));
}
