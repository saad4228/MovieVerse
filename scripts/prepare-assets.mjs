import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
// Optional legacy asset preparation; never run as part of normal app startup.
const sourceArgument=process.argv[2] || process.env.MOVIEVERSE_ASSET_SOURCE;
if (!sourceArgument) {
  console.error('Usage: node scripts/prepare-assets.mjs <reference-image-directory>');
  console.error('Alternatively, set MOVIEVERSE_ASSET_SOURCE to that directory.');
  process.exit(1);
}
const input=path.resolve(sourceArgument);
if (!(await fs.stat(input)).isDirectory()) throw new Error('The reference-image source must be a directory.');
const destination=path.resolve('public/assets');await fs.mkdir(destination,{recursive:true});
const crops=[
 ['home.png','vikram',0,352,237,301],['home.png','leo',266,367,190,262],
 ['mobile.png','coolie',0,721,230,381],['mobile.png','varanasi',255,718,261,389],['mobile.png','toxic',550,725,230,382],
 ['home.png','jailer-2',981,373,184,244],['home.png','ramayana',1196,355,244,283],['now-showing.png','war-2',236,285,222,225],
 ['movie.png','movie-backdrop',0,77,1440,620],['seats-3d.png','auditorium',0,75,1060,825],
 ];
for(const [source,name,left,top,width,height] of crops){await sharp(path.join(input,source)).extract({left,top,width,height}).webp({quality:88}).toFile(path.join(destination,name+'.webp'));}
const remote=[
 ['sintel','https://media.w3.org/2010/05/sintel/poster.png'],
 ['cinema-0','https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1100&q=85'],
 ['cinema-1','https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1100&q=85'],
 ['cinema-2','https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1100&q=85'],
 ['popcorn','https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=600&q=85'],
 ['nachos','https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&q=85'],
 ['cola','https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&q=85'],
 ['brownie','https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=85'],
 ];
await Promise.all(remote.map(async([name,url])=>{try{const response=await fetch(url);if(!response.ok)throw new Error(String(response.status));await sharp(Buffer.from(await response.arrayBuffer())).resize({width:1100,withoutEnlargement:true}).webp({quality:82}).toFile(path.join(destination,name+'.webp'));console.log('Downloaded '+name);}catch(e){console.log('Asset fallback for '+name+': '+e.message);await fs.copyFile(path.join(destination,name.startsWith('cinema')?'auditorium.webp':'varanasi.webp'),path.join(destination,name+'.webp'));}}));
await fs.copyFile(path.join(destination,'popcorn.webp'),path.join(destination,'combo.webp'));
await fs.copyFile(path.join(destination,'sintel.webp'),path.join(destination,'sintel-backdrop.webp'));
const folders=['01-home','02-city-selection','03-movie-discovery','04-cinema-discovery','05-movie-details','06-theatre-details','07-showtime-selection','08-3d-auditorium','09-seat-selection','10-snacks','11-checkout','12-my-tickets','13-mobile'];
for(const folder of folders){await fs.mkdir(path.join('mockups',folder),{recursive:true});await fs.writeFile(path.join('mockups',folder,'.gitkeep'),'');}
for(const [source,folder] of [['home.png','01-home'],['now-showing.png','03-movie-discovery'],['movie.png','05-movie-details'],['seats-3d.png','08-3d-auditorium'],['mobile.png','13-mobile']])await fs.copyFile(path.join(input,source),path.join('mockups',folder,source));
