// Node 22/24 local tooling only: resolve the extensionless TS imports used by Vite.
import {existsSync} from "node:fs";
import {fileURLToPath,pathToFileURL} from "node:url";
import {resolve as pathResolve} from "node:path";
export async function resolve(specifier,context,nextResolve){
 if(specifier.startsWith("@/"))specifier=pathToFileURL(pathResolve(specifier.slice(2))).href;
 if((specifier.startsWith(".")||specifier.startsWith("file:"))&&context.parentURL){
  const target=new URL(specifier,context.parentURL);
  for(const suffix of [".ts",".tsx","/index.ts"])if(existsSync(fileURLToPath(target)+suffix))return nextResolve(target.href+suffix,context);
 }
 return nextResolve(specifier,context);
}
