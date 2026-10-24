/** Publish an actual current source ZIP, independent of GitHub push credentials. */
import { execFileSync } from 'node:child_process';
import { readFile, readdir, mkdir, writeFile, rename } from 'node:fs/promises';
import { zipSync, strToU8 } from 'fflate';
import path from 'node:path';

const root=process.cwd();
const rootFiles=new Set(['package.json','package-lock.json','tsconfig.json','vite.config.ts','playwright.config.ts','vercel.json','index.html','README.md','LICENSES.md','.gitignore']);
const excluded=name=>{
  const top=name.split('/')[0];
  return (!['src','public','scripts','tests','docs','.github'].includes(top)&&!rootFiles.has(name)) ||
    /^public\/downloads(\/|$)/.test(name) || /(^|\/)\.env(?:\.|$)/.test(name) || /\.(log|tsbuildinfo|pem|key|p12|pfx)$/.test(name);
};
async function walk(directory=''){
  const result=[];
  for(const entry of await readdir(path.join(root,directory),{withFileTypes:true})){
    const name=path.posix.join(directory,entry.name);
    if(excluded(name))continue;
    if(entry.isDirectory())result.push(...await walk(name));else if(entry.isFile())result.push(name);
  }
  return result;
}
let names;
try{names=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).split('\0').filter(Boolean);}catch{names=await walk();}
const files={};
for(const name of names.filter(name=>!excluded(name))){
  try{files[`Bone-puzzle-web/${name}`]=new Uint8Array(await readFile(path.join(root,name)));}catch(error){if(error.code!=='ENOENT')throw error;}
}
let commit=null;
try{commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{/* Uploaded Vercel sources may omit Git metadata. */}
files['Bone-puzzle-web/SOURCE-INFO.json']=strToU8(JSON.stringify({sourceCommit:commit,contents:'Current build input files, including working-tree changes when present',generatedUtc:new Date().toISOString()},null,2));
for(const required of ['package.json','src/data/hand.json','src/scene/BoneScene.tsx'])if(!files[`Bone-puzzle-web/${required}`])throw new Error(`Source ZIP missing ${required}`);
for (const catalog of ['src/data/hand.json','src/data/anatomy/t06.json']) {
  const definition=JSON.parse(new TextDecoder().decode(files[`Bone-puzzle-web/${catalog}`]));
  for (const bone of definition.bones)
    if (!files[`Bone-puzzle-web/public${bone.modelPath}`]) throw new Error(`Source ZIP missing ${bone.id}`);
}

await mkdir('dist/downloads',{recursive:true});
const target='dist/downloads/Bone-puzzle-source.zip';
await writeFile(`${target}.tmp`,zipSync(files,{level:6}));
await rename(`${target}.tmp`,target);
console.log(`Source ZIP: ${Object.keys(files).length} files, HAND + T06 GLBs → ${target}`);
