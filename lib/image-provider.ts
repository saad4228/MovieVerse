import type { Movie } from "./catalog";
import { backdropSet } from "./movie-media";
export type BackdropCandidate = { url:string; width:number; height:number; voteAverage?:number; textFree?:boolean };
export function rankBackdrops(images: BackdropCandidate[]) {
  return images.filter(i => i.width >= 1280 && i.width > i.height && i.height > 0).sort((a,b) => {
    const score = (i:BackdropCandidate) => Math.min(i.width,3840)/1000 - Math.abs(i.width/i.height-16/9)*2 + (i.textFree ? .5 : 0) + (i.voteAverage || 0)*.03;
    return score(b)-score(a);
  });
}
export interface MovieImageProvider { resolve(movie:Movie): { poster:string; backdrop:string; srcSet?:string; alternatives:string[]; position:string; width?:number; height?:number } }
export function originalArtwork(src:string){
  return /^https:\/\/image\.tmdb\.org\/t\/p\/w\d+\//.test(src)?src.replace(/\/t\/p\/w\d+\//,"/t/p/original/"):src;
}
export const movieImageProvider:MovieImageProvider = { resolve: m => ({
  poster:originalArtwork(m.poster),backdrop:originalArtwork(m.backdrop),srcSet:originalArtwork(m.backdrop)!==m.backdrop?undefined:backdropSet(m),alternatives:(m.alternativeBackdrops || []).map(originalArtwork),position:m.backdropPosition || "50% 50%",width:m.backdropWidth,height:m.backdropHeight,
}) };
