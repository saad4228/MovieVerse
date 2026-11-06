import {chromium} from '@playwright/test';
import {readFile, writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../..');
const bytes=await readFile(resolve(here,'MovieVerse-Complete-Project-Guide.pdf'));
const browser=await chromium.launch();
try{
  const page=await browser.newPage();
  await page.goto('about:blank');
  const report=await page.evaluate(async base64=>{
    const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs';
    const data=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
    window.guidePdf=await pdfjs.getDocument({data}).promise;
    const pages=[];
    for(let i=1;i<=window.guidePdf.numPages;i++){
      const sheet=await window.guidePdf.getPage(i);
      const items=await sheet.getTextContent();
      const text=items.items.map(item=>item.str).join(' ');
      const links=(await sheet.getAnnotations()).filter(item=>item.subtype==='Link').length;
      pages.push({page:i,characters:text.length,links,hasFooter:text.includes(`${i} / 51`),hasCurrency:text.includes('₹'),preview:text.slice(0,155)});
    }
    return {count:window.guidePdf.numPages,pages,outline:!!(await window.guidePdf.getOutline())};
  },bytes.toString('base64'));
  if(report.count!==51||report.pages.some(p=>p.characters<500||!p.hasFooter))throw new Error('PDF page/text/footer validation failed.');
  if(report.pages.filter(p=>p.hasCurrency).length<1)throw new Error('Currency glyph missing.');
  for(const number of [1,22,28,31,50]){
    const png=await page.evaluate(async number=>{
      const sheet=await window.guidePdf.getPage(number),viewport=sheet.getViewport({scale:1.2});
      const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;
      await sheet.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
      return canvas.toDataURL('image/png').split(',')[1];
    },number);
    await writeFile(resolve(root,`outputs/guide-actual-pdf-${number}.png`),Buffer.from(png,'base64'));
  }
  await writeFile(resolve(root,'outputs/guide-pdf-verification.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({pages:report.count,searchablePages:report.pages.filter(p=>p.characters>500).length,totalLinks:report.pages.reduce((n,p)=>n+p.links,0),outline:report.outline,sizeBytes:bytes.length}));
}finally{await browser.close();}
