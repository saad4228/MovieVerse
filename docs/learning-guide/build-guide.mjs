// Documentation-only renderer. Does not change application code or dependencies.
import {readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'../..');
const base='MovieVerse-Complete-Project-Guide';
const markdown=await readFile(resolve(here,base+'.md'),'utf8');
const chunks=markdown.split(/<!-- page -->/).map(text=>text.trim());
const browser=await chromium.launch();
try {
  const page=await browser.newPage({viewport:{width:1100,height:1200}});
  await page.goto('about:blank');
  await page.addScriptTag({url:'https://cdn.jsdelivr.net/npm/marked@15.0.12/marked.min.js'});
  const sections=await page.evaluate(parts=>parts.map(text=>marked.parse(text)),chunks);
  const data=async(path,mime)=>`data:${mime};base64,${(await readFile(path)).toString('base64')}`;
  for(let i=0;i<sections.length;i++) {
    for(const match of [...sections[i].matchAll(/src="(\.\.\/screenshots\/[^"\s]+)"/g)]) {
      sections[i]=sections[i].replace(match[1],await data(resolve(here,match[1]),'image/jpeg'));
    }
  }
  const regular=await data(resolve(root,'node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2'),'font/woff2');
  const bold=await data(resolve(root,'node_modules/@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff2'),'font/woff2');
  const esc=value=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const entries=chunks.slice(1).map((text,i)=>({title:text.match(/^# (.+)/m)[1],id:`section-${i+1}`,page:i+4}));
  const toc=[0,24].map((start,index)=>({title:'Contents',toc:true,body:`<h1>Find your way</h1><p class="toc-intro">${index===0?'Start with the basics, then follow the feature flows.':'Continue into 3D, operations, practice and interview preparation.'}</p><div class="toc">${entries.slice(start,start+24).map(entry=>`<a href="#${entry.id}"><span>${esc(entry.title)}</span><strong>${entry.page}</strong></a>`).join('')}</div>`}));
  const pages=[{title:'MovieVerse',cover:true,body:sections[0]},...toc,...sections.slice(1).map((body,i)=>({title:entries[i].title,id:entries[i].id,body}))];
  const css=`
@font-face{font-family:Guide;src:url('${regular}');font-weight:400}
@font-face{font-family:Guide;src:url('${bold}');font-weight:700}
@page{size:A4;margin:0}
*{box-sizing:border-box}html{margin:0;background:#d9dce1}body{margin:0;color:#202838;font:10.5pt/1.52 Guide,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sheet{width:210mm;height:297mm;position:relative;padding:18mm 18mm 19mm;margin:7mm auto;background:#fff;break-after:page;page-break-after:always;box-shadow:0 2mm 8mm #25324626}
.sheet:last-child{break-after:auto;page-break-after:auto}.running{display:flex;justify-content:space-between;font-size:7.3pt;letter-spacing:1.25px;text-transform:uppercase;color:#66738a;border-bottom:1px solid #dde3eb;padding-bottom:3mm;margin-bottom:6mm}.running b{color:#825b0e}.body{position:relative}
h1{font-size:23pt;line-height:1.18;color:#121b2b;letter-spacing:-.8px;margin:0 0 5mm;font-weight:700}h2{font-size:15pt;line-height:1.3;margin:3mm 0 5mm;color:#5e461c}p{margin:0 0 3mm}strong{font-weight:700}em{color:#59677d}ul,ol{padding-left:5mm;margin:0 0 3.5mm}li{padding-left:1mm;margin:0 0 1.7mm}li p{margin:0}a{color:#315d8a;text-decoration:none;overflow-wrap:anywhere}code{font:8.9pt/1.45 Consolas,'Courier New',monospace;color:#4b365d;overflow-wrap:anywhere}pre{background:#f2f5f9;border:1px solid #dfe5ed;border-left:3px solid #c5902e;padding:3mm 3.4mm;margin:3mm 0 4mm;border-radius:2mm;white-space:pre-wrap;overflow-wrap:anywhere}pre code{font-size:8.5pt;color:#1c3d57}pre:has(.language-diagram){background:#142235;color:#fff;border:none;padding:5mm}pre .language-diagram{font-size:9.4pt;color:#f3d492;line-height:1.8}
blockquote{border-left:3px solid #c39033;background:#fff8e9;margin:4mm 0;padding:3.6mm 4mm;color:#594519;font-size:10pt}blockquote p:last-child{margin:0}table{border-collapse:collapse;width:100%;table-layout:auto;margin:3mm 0 4mm;font-size:8.7pt;line-height:1.4}thead{background:#16263d;color:#fff}th{text-align:left;font-weight:700;padding:2.5mm 2.4mm}td{padding:2mm 2.4mm;vertical-align:top;border-bottom:1px solid #e1e6ef}tbody tr:nth-child(even){background:#f4f6f9}td code{font-size:8pt}img{display:block;width:100%;max-height:64mm;object-fit:contain;object-position:center;border:1px solid #dfe5ec;border-radius:3mm;margin:3mm 0 4mm;background:#0d1420}p:has(>img){margin:0}.footer{position:absolute;bottom:10mm;left:18mm;right:18mm;display:flex;justify-content:space-between;border-top:1px solid #dde3eb;padding-top:2.7mm;font-size:7pt;color:#64718a}.footer b{color:#27364b;font-size:8pt}.dense-table td{padding:1.15mm 2.2mm;line-height:1.34}.toc-intro{color:#64718a;margin-bottom:6mm}.toc a{display:flex;justify-content:space-between;gap:5mm;align-items:baseline;padding:1.25mm 0;border-bottom:1px solid #e1e6ef;font-size:9.7pt;color:#243650}.toc strong{color:#896218}.toc span{max-width:148mm}.cover{background:linear-gradient(145deg,#0d1422,#18253b 65%,#332b25);color:#e6ebf4;padding-top:24mm}.cover .running{border-color:#ffffff25;color:#c7cfdc}.cover .running b{color:#f1c56e}.cover h1{font-size:58pt;color:#f2c66f;margin:6mm 0 1mm;letter-spacing:-3px}.cover h2{font-size:21pt;color:#fff;max-width:152mm;margin-bottom:7mm}.cover p{color:#d4ddeb}.cover img{max-height:82mm;border-color:#ffffff26;margin:7mm 0}.cover blockquote{background:#ffffff0b;border-color:#edbd5b;color:#e7dfce;font-size:9.5pt}.cover blockquote p{color:inherit}.cover .footer{border-color:#ffffff26;color:#c2cbdc}.cover .footer b{color:#f1c56e}.cover a{color:#e7c98c}.cover code{color:#f2cd86}.cover .body>p:last-child{font-size:9pt}
@media print{html{background:#fff}.sheet{margin:0;box-shadow:none}}
`;
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>MovieVerse — Complete Project Guide</title><meta name="author" content="Prepared for Mohammad Saad"><style>${css}</style></head><body>${pages.map((part,i)=>`<section class="sheet ${part.cover?'cover':''} ${/Glossary|Appendix A/.test(part.title)?'dense-table':''}" id="${part.id||'page-'+(i+1)}"><div class="running"><b>MovieVerse</b><span>${part.toc?'Navigation':'Project learning handbook · 2026 edition'}</span></div><main class="body">${part.body}</main><div class="footer"><span>Source f90ff21 · 5 November 2026 · ${part.cover?'Prepared for Mohammad Saad':'Understand · trace · explain'}</span><b>${i+1} / ${pages.length}</b></div></section>`).join('')}</body></html>`;
  await writeFile(resolve(here,base+'.html'),html);
  await page.goto(new URL(base+'.html',import.meta.url).href);
  await page.emulateMedia({media:'print'});
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode()));});
  const report=await page.evaluate(()=>[...document.querySelectorAll('.sheet')].map((sheet,i)=>{
    const body=sheet.querySelector('.body').getBoundingClientRect();
    const footer=sheet.querySelector('.footer').getBoundingClientRect();
    const bounds=sheet.getBoundingClientRect();
    return {page:i+1,title:sheet.querySelector('h1').textContent,bottomGap:Math.round(footer.top-body.bottom),overflowX:sheet.scrollWidth>sheet.clientWidth,contentHeight:Math.round(body.height),pageHeight:Math.round(bounds.height)};
  }));
  await writeFile(resolve(root,'outputs/guide-layout-report.json'),JSON.stringify(report,null,2));
  const overflowing=report.filter(p=>p.bottomGap<8||p.overflowX);
  if(overflowing.length)throw new Error('Pages need layout adjustment: '+JSON.stringify(overflowing));
  await page.pdf({path:resolve(here,base+'.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true,tagged:true,outline:true});
  for(const pageNumber of [1,2,10,22,28,31,36,44,51]) {
    if(pageNumber>pages.length)continue;
    await page.locator('.sheet').nth(pageNumber-1).screenshot({path:resolve(root,`outputs/guide-page-${pageNumber}.png`)});
  }
  const words=markdown.replace(/```[\s\S]*?```/g,'').split(/\s+/).length;
  console.log(JSON.stringify({pages:pages.length,words,minimumFooterGap:Math.min(...report.map(p=>p.bottomGap)),pdf:resolve(here,base+'.pdf')}));
}finally{await browser.close();}
