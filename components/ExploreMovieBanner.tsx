import Link from "./MovieLink";
import type {Movie} from "@/lib/catalog";

type Props={collections?:Record<string,Movie[]>};

const preferredCollections=["hollywood","regional-hi","international","regional-ta","trending-day","popular"];

function movieBackdrops(collections:Record<string,Movie[]>|undefined){
 const seen=new Set<string>();
 const selected:Movie[]=[];
 for(const collection of preferredCollections){
  for(const movie of collections?.[collection]??[]){
   if(seen.has(movie.id)||!movie.backdrop)continue;
   try{
    const image=new URL(movie.backdrop,"https://image.tmdb.org");
    if(image.hostname!=="image.tmdb.org"||!/^\/t\/p\/(w1280|original)\/[^/]+$/.test(image.pathname))continue;
   }catch{continue;}
   seen.add(movie.id);selected.push(movie);break;
  }
  if(selected.length===4)break;
 }
 return selected;
}

export default function ExploreMovieBanner({collections}:Props){
 const images=movieBackdrops(collections);
 return <section className="section-container explore-promo home-explore-promo" aria-labelledby="home-explore-title">
  <div className="home-explore-copy"><span className="eyebrow">A WORLD BEYOND THE SCREEN</span><h2 id="home-explore-title">Explore the MovieVerse</h2><p>Hollywood favourites, Indian cinema and stories across every genre.</p><Link className="btn btn-gold" href="/explore">Explore Movies <span aria-hidden="true">↗</span></Link></div>
  <div className="home-explore-collage" aria-label="Movie scenes from the MovieVerse catalogue">
   {Array.from({length:4},(_,index)=>{const movie=images[index];return <div className={`home-explore-still still-${index+1}${movie?"":" image-unavailable"}`} key={movie?.id??`still-${index}`}>
    {movie&&<img src={movie.backdrop} alt={`${movie.title} cinematic still`} loading="lazy" decoding="async" width={1280} height={720} onError={event=>{event.currentTarget.parentElement?.classList.add("image-unavailable");event.currentTarget.remove();}}/>}
   </div>;})}
  </div>
 </section>;
}
