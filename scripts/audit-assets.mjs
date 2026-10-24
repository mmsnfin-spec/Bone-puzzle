#!/usr/bin/env node
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import path from 'node:path';

const root=process.cwd();
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
const catalog=JSON.parse(await readFile('src/data/hand.json','utf8'));
const models=[];
for(const bone of catalog.bones){
  const file=path.join(root,'public',bone.modelPath);
  const bytes=await readFile(file);
  const chunkLength=bytes.readUInt32LE(12);
  const gltf=JSON.parse(bytes.subarray(20,20+chunkLength).toString());
  const primitives=gltf.meshes.flatMap(mesh=>mesh.primitives);
  models.push({id:bone.id,path:bone.modelPath,bytes:bytes.length,sha256:hash(bytes),
    gzipBytes:gzipSync(bytes).length,brotliQuality4Bytes:brotliCompressSync(bytes,{params:{[constants.BROTLI_PARAM_QUALITY]:4}}).length,
    vertices:primitives.reduce((n,p)=>n+gltf.accessors[p.attributes.POSITION].count,0),
    triangles:primitives.reduce((n,p)=>n+gltf.accessors[p.indices].count/3,0),
    materials:gltf.materials?.length??0,textures:gltf.textures?.length??0,
    geometryBufferBytes:gltf.buffers.reduce((n,b)=>n+b.byteLength,0),originalSourceSha256:bone.sourceSha256});
}
async function files(directory){const output=[];for(const item of await readdir(directory,{withFileTypes:true})){const file=path.join(directory,item.name);if(item.isDirectory())output.push(...await files(file));else output.push(file);}return output;}
const publicFiles=await files('public');
const images=[];
for(const file of publicFiles.filter(name=>/\.(png|jpe?g|webp|avif|gif|svg)$/i.test(name))){const bytes=await readFile(file);images.push({file,bytes:bytes.length,sha256:hash(bytes)});}
async function buildInventory(directory){
  try{
    const html=await readFile(path.join(directory,'index.html'),'utf8');
    const references=[...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)].map(m=>m[1]);
    const assets=[];
    for(const name of new Set(references)){const bytes=await readFile(path.join(directory,name));assets.push({name,bytes:bytes.length,gzipBytes:gzipSync(bytes).length});}
    return {directory,htmlDeclaredAssets:assets,rawDeclaredBytes:assets.reduce((n,a)=>n+a.bytes,0),gzipEstimateBytes:assets.reduce((n,a)=>n+a.gzipBytes,0),note:'HTML-declared assets only; actual lazy network transfer is recorded separately in Lighthouse/CDP. Gzip values are estimates, not measured transfer.'};
  }catch{return null;}
}
const output={models,totalGlbBytes:models.reduce((n,m)=>n+m.bytes,0),totalVertices:models.reduce((n,m)=>n+m.vertices,0),totalTriangles:models.reduce((n,m)=>n+m.triangles,0),images,
  imageNote:'No raster/vector brand originals are mounted. No replacement logo or lossy anatomy conversion was fabricated.',
  compressionDecision:'Retain source GLBs exactly. Existing Vercel model responses already use Brotli. Additional Draco/Meshopt decoding was not adopted without demonstrated end-to-end CPU benefit; no quantization or decimation is applied.',
  before:await buildInventory('/workspace/web-baseline-dist'),after:await buildInventory('dist')};
await mkdir('docs/web-performance/evidence',{recursive:true});
await writeFile('docs/web-performance/evidence/assets.json',JSON.stringify(output,null,2));
console.log(JSON.stringify({models:models.length,vertices:output.totalVertices,triangles:output.totalTriangles,glbBytes:output.totalGlbBytes,images:images.length,beforeDeclaredBytes:output.before?.rawDeclaredBytes,afterDeclaredBytes:output.after?.rawDeclaredBytes}));
