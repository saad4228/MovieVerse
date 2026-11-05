import {expect,it} from "vitest";
import {carouselScreenings,availableCarousel} from "../lib/bookable-featured";
import {movies,venues,cities,blueprints,snacks} from "../lib/catalog";
import type {Catalog} from "../lib/catalog-config";
import {movieImageProvider,originalArtwork} from "../lib/image-provider";
function fixture():Catalog{
 const movie={...movies[0],id:"bookable",release:"2020-01-01",status:"showing" as const,metadata:{...movies[0].metadata!,releaseDates:[{region:"IN",date:"2020-01-01",status:"released" as const,source:"https://example.test"}]}};
 return {movies:[movie],venues:[{...venues[0],movieIds:[movie.id],cityId:cities[0].id,screenings:undefined,times:["23:59"]}],cities,blueprints,snacks};
}
it("features only films with future bookable screenings in the selected city",()=>{
 const catalog=fixture(),candidates=carouselScreenings(catalog,cities[0].id);
 expect(candidates).toHaveLength(1);expect(candidates[0].shows.every(s=>Date.parse(`${s.date}T${s.time}+05:30`)>Date.now())).toBe(true);
 expect(carouselScreenings(catalog,"not-a-city")).toHaveLength(0);
 catalog.movies[0].metadata!.releaseDates[0].date="2099-01-01";
 expect(carouselScreenings(catalog,cities[0].id)).toHaveLength(0);
});
it("excludes films when all their screenings are known to be sold out",()=>{
 const candidates=carouselScreenings(fixture(),cities[0].id),availability=new Map(candidates[0].shows.map(s=>[s.id,0]));
 expect(availableCarousel(candidates,availability)).toHaveLength(0);
 availability.set(candidates[0].shows[0].id,1);expect(availableCarousel(candidates,availability)).toHaveLength(1);
});
it("uses original TMDB artwork without altering local assets or requesting invented sizes",()=>{
 expect(originalArtwork("https://image.tmdb.org/t/p/w1280/image.jpg")).toBe("https://image.tmdb.org/t/p/original/image.jpg");
 expect(originalArtwork("/assets/backdrop.webp")).toBe("/assets/backdrop.webp");
 const result=movieImageProvider.resolve({...movies[0],backdrop:"https://image.tmdb.org/t/p/w1280/image.jpg"});
 expect(result.backdrop).toContain("/original/");expect(result.srcSet).toBeUndefined();
});
