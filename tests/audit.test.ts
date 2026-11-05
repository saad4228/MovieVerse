import { afterEach, describe, it, expect, vi } from 'vitest';
import { movies,venues } from '../lib/catalog';
import { discoverySections,discoveryStatus,movieMatches } from '../lib/movie-discovery';
import { normalizeInformation,personPhoto } from '../lib/movie-information';
import { metadataProvider } from '../lib/metadata-provider';
import { containedArtworkRect } from '../lib/ticket-image';
import { fitScreen } from '../lib/video/sources';
afterEach(() => vi.unstubAllGlobals());
describe('catalogue audit regressions',()=>{
  it('keeps released films discoverable when partner evidence expires',()=>{
    const now=new Date('2026-11-02T10:00:00+05:30');
    const film=movies.find(m=>m.id==='udta-teer')!;
    expect(discoverySections(movies,'chennai',[],now).released).toContain(film);
    expect(discoveryStatus(film,'chennai',[],now)).toBe('released');
    expect(movieMatches(film,'Ayushmann')).toBe(true);
  });
  it('keeps configured screenings visible even when release metadata is incomplete',()=>{
    const film={...movies[0],metadata:{...movies[0].metadata!,releaseDates:[]}};
    const venue={...venues[0],movieIds:[film.id],screenings:undefined};
    expect(discoveryStatus(film,venue.cityId,[venue])).toBe('now-showing');
  });
  it('deduplicates people without borrowing character roles from another film',()=>{
    const seed=movies.find(m=>m.id==='leo')!.metadata!;
    const person=seed.cast.find(p=>p.profilePath)!;
    const result=normalizeInformation({...seed,cast:[{name:person.name},{name:person.name,character:'A sourced role'}]});
    expect(result.cast).toHaveLength(1);
    expect(result.cast[0].character).toBe('A sourced role');
    expect(personPhoto(result.cast[0])).toBeTruthy();
    expect(normalizeInformation({...seed,cast:[{name:person.name}]}).cast[0].character).toBeUndefined();
  });
  it('fills missing cast details from the exact TMDB movie while preserving the catalogue source', async()=>{
    const movie=movies.find(m=>m.id==='udta-teer')!;
    const fetchMock=vi.fn().mockResolvedValue(Response.json({
      id:1375156,
      credits:{cast:[
        {id:71001,name:'Ayushmann Khurrana',character:'Bilal Ahmed',profile_path:'/ayushmann-tmdb.jpg'},
        {id:71002,name:'TMDB-only supporting actor',character:'A sourced role',profile_path:null},
      ],crew:[]},
      release_dates:{results:[]},
    }));
    vi.stubGlobal('fetch',fetchMock);
    const result=await metadataProvider('fixture-token').get(movie);
    const actor=result?.cast.find(person=>person.name==='Ayushmann Khurrana');
    expect(fetchMock.mock.calls[0][0]).toContain('/movie/1375156?');
    expect(actor).toMatchObject({character:'Bilal Ahmed',backupProfilePath:'/ayushmann-tmdb.jpg'});
    expect(actor?.profilePath).toContain('cdn.district.in');
    expect(result?.cast.some(person=>person.name==='TMDB-only supporting actor')).toBe(true);
  });
  it.each([1,4/3,16/9,2.39])('fits a %s:1 trailer aspect without stretching or cropping',aspect=>{
    const fitted=fitScreen(20,11.25,aspect);
    expect(fitted.width).toBeLessThanOrEqual(20);
    expect(fitted.height).toBeLessThanOrEqual(11.25);
    expect(fitted.width/fitted.height).toBeCloseTo(aspect,5);
  });
  it('contains portrait and landscape ticket artwork within their hero bounds',()=>{
    for(const [sourceWidth,sourceHeight] of [[1000,1500],[1700,1120]]) {
      const fit=containedArtworkRect(sourceWidth,sourceHeight,40,160,820,350);
      expect(fit.x).toBeGreaterThanOrEqual(40);
      expect(fit.y).toBeGreaterThanOrEqual(160);
      expect(fit.x+fit.width).toBeLessThanOrEqual(860);
      expect(fit.y+fit.height).toBeLessThanOrEqual(510);
      expect(fit.width/fit.height).toBeCloseTo(sourceWidth/sourceHeight,5);
    }
  });
});
