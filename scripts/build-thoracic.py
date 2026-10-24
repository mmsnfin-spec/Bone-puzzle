#!/usr/bin/env python3
"""Reproducible FMA9945-only morphology masks. Original exterior surface survives Boolean clipping.
Requires scripts/requirements-anatomy.txt. Source is pinned and SHA-256 verified.
This is a virtual educational segmentation, not seven naturally separate bones.
"""
import hashlib, importlib.util, json, shutil, urllib.request
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('convert',ROOT/'scripts/convert-obj-to-glb.py');convert=importlib.util.module_from_spec(spec);spec.loader.exec_module(convert)
def write_json(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def main():
    config=json.loads((ROOT/'scripts/anatomy/t06-segmentation.json').read_text(encoding='utf-8'));regions=config['regions']
    dest=ROOT/'public/models/thoracic/T06';source=dest/'source';source.mkdir(parents=True,exist_ok=True)
    original=source/'FMA9945.stl';url=f'https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/{config["mirrorCommit"]}/assets/BodyParts3D_data/stl/FMA9945.stl'
    if not original.exists():
        cache=ROOT/'.cache/bodyparts3d/FMA9945.stl'
        original.write_bytes(cache.read_bytes() if cache.exists() else urllib.request.urlopen(url,timeout=60).read())
    assert hashlib.sha256(original.read_bytes()).hexdigest()==config['sha256']
    names=dict(line.split('\t',1) for line in (ROOT/'public/models/hand/source/parts_list_e.txt').read_text(encoding='utf-8').splitlines()[1:]);assert names[config['fmaId']]==config['sourceName']
    shutil.copyfile(ROOT/'public/models/hand/source/LICENSE_content.txt',source/'LICENSE_content.txt')
    import numpy as np
    import manifold3d as manifold
    v,f=convert.read_mesh(original)
    base=manifold.Manifold(manifold.Mesh(np.array(v,dtype=np.float32),np.array(f,dtype=np.uint32),face_id=np.arange(len(f),dtype=np.uint32)))
    assert base.volume()>0 and len(base.decompose())==1
    source_v=np.array(v);source_f=np.array(f)
    original_normals=np.zeros_like(source_v)
    for face in source_f:
        n=np.cross(source_v[face[1]]-source_v[face[0]],source_v[face[2]]-source_v[face[0]])
        for a in face:original_normals[a]+=n
    original_normals/=np.linalg.norm(original_normals,axis=1)[:,None]
    source_id=base.to_mesh().run_original_id[0]
    solids={};remainder=base
    for k in [0,2,3,4,5,6]:
        r=regions[k]
        mask=manifold.Manifold.sphere(1,32).scale(r['radii']).translate(r['center'])
        solids[k]=remainder ^ mask
        remainder=remainder-mask
    solids[1]=remainder
    reassigned=[]
    for k in range(7):
        chunks=sorted(solids[k].decompose(),key=lambda c:-c.volume());solids[k]=chunks[0]
        for fragment in chunks[1:]:
            candidates=[]
            for j in range(7):
                if j==k:continue
                union=solids[j]+fragment
                if len(union.decompose())==1:
                    contact=(solids[j].surface_area()+fragment.surface_area()-union.surface_area())/2
                    candidates.append((contact,j,union))
            assert candidates,'Cannot safely attach disconnected junction fragment'
            _,j,union=max(candidates,key=lambda c:c[0]);solids[j]=union
            reassigned.append({'from':k+1,'to':j+1,'sourceVolume':fragment.volume()})
    assert abs(sum(s.volume() for s in solids.values())-base.volume())<1e-6
    union=manifold.Manifold();pair_intersections=[]
    for k in range(7):
        assert len(solids[k].decompose())==1
        assert (solids[k]-base).volume()<1e-7
        for j in range(k):
            overlap=abs((solids[k]^solids[j]).volume());pair_intersections.append(overlap);assert overlap<1e-7
        union=union+solids[k]
    missing=abs((base-union).volume());outside=abs((union-base).volume());assert missing<1e-7 and outside<1e-7
    lo=[min(p[i] for p in v) for i in range(3)];hi=[max(p[i] for p in v) for i in range(3)];origin=[(lo[i]+hi[i])/2 for i in range(3)];scale=7/max(hi[i]-lo[i] for i in range(3))
    def stage(p):return [(p[0]-origin[0])*scale,(p[2]-origin[2])*scale+1.3,-(p[1]-origin[1])*scale]
    bones=[];audit=[]
    for k,r in enumerate(regions):
        mesh=solids[k].to_mesh();pv=mesh.vert_properties[:,:3].tolist();pf=mesh.tri_verts.tolist()
        external=[]
        for run,original_id in enumerate(mesh.run_original_id):
            if original_id==source_id:external.extend(range(mesh.run_index[run]//3,mesh.run_index[run+1]//3))
        cap_count=len(pf)-len(external)
        counter=Counter(tuple(sorted((a,b))) for face in pf for a,b in zip(face,face[1:]+face[:1]));assert set(counter.values())=={2}
        # Exterior normals interpolate the uncut source. Interior normals use
        # separate coincident vertices so cut faces cannot darken the anatomy.
        new_v=[];new_f=[];normal_sums=[];lookup={};external_set=set(external)
        for ti,face in enumerate(pf):
            exterior=ti in external_set;new_face=[]
            if exterior:
                source_face=source_f[mesh.face_id[ti]];a,z,c0=source_v[source_face];u=z-a;w=c0-a
                uu=np.dot(u,u);uw=np.dot(u,w);ww=np.dot(w,w);den=uu*ww-uw*uw
            else:
                n=np.cross(np.array(pv[face[1]])-pv[face[0]],np.array(pv[face[2]])-pv[face[0]])
            for vi in face:
                key=(vi,exterior)
                if key not in lookup:lookup[key]=len(new_v);new_v.append(pv[vi]);normal_sums.append(np.zeros(3))
                idx=lookup[key];new_face.append(idx)
                if exterior:
                    d=np.array(pv[vi])-a;du=np.dot(d,u);dw=np.dot(d,w)
                    b1=(ww*du-uw*dw)/den;b2=(uu*dw-uw*du)/den
                    n=(1-b1-b2)*original_normals[source_face[0]]+b1*original_normals[source_face[1]]+b2*original_normals[source_face[2]]
                normal_sums[idx]+=n
            new_f.append(new_face)
        pv,pf=new_v,new_f
        normals=[]
        for n in normal_sums:
            n=n/max(np.linalg.norm(n),1e-20);normals.append([float(n[0]),float(n[2]),float(-n[1])])
        center=[(min(p[i] for p in pv)+max(p[i] for p in pv))/2 for i in range(3)];target=stage(center);points=[stage(p) for p in pv];local=[[p[i]-target[i] for i in range(3)] for p in points]
        id='T06_'+r['suffix'];path=dest/(id+'.glb');convert.write_glb(path,local,pf,normals)
        bones.append({'id':id,'fmaId':config['fmaId'],'englishName':r['en'],'koreanName':r['ko'],'label':{'en':r['en'],'ko':r['ko']},'region':'spine','section':'thoracic','bone':'T06','puzzleType':'landmark','anatomicalDirectionRole':r['roles'],'learning':{'category':r['category'],'relatedLandmarks':r['related']},'acceptedAliases':[r['en'],r['ko']],'category':r['category'],'modelPath':'/models/thoracic/T06/'+path.name,'targetPosition':target,'targetRotation':[0,0,0,1],'targetScale':[1,1,1],'originalCenter':center,'initialTransform':{'position':r['tray'],'rotation':[0,0,0,1]},'size':[max(p[i] for p in local)-min(p[i] for p in local) for i in range(3)],'snapDistance':.55,'sourceSha256':config['sha256'],'vertexCount':len(pv),'triangleCount':len(pf)})
        audit.append({'id':id,'exteriorTriangleIndices':external,'sourceFaceIds':[int(mesh.face_id[i]) for i in external],'exteriorTriangles':len(external),'capTriangles':cap_count,'closedEdges':True,'solidComponents':1,'sourceVolume':solids[k].volume()})
    whole=[stage(p) for p in v];convert.write_glb(dest/'T06_original.glb',whole,f)
    landmarks=[{**l,'pieceIds':[bones[i-1]['id'] for i in l['pieces']],'position':None,'annotationStatus':'semantic-only; surface anchor not independently verified'} for l in config['landmarks']]
    data={'stageId':'thoracic-t06','bone':'T06','sourceFmaId':config['fmaId'],'dataset':'BodyParts3D 3.0 / 20110915','puzzleType':'landmark','reviewStatus':'prototype; independent anatomical segmentation review pending','coordinateMapping':{'sourceOrigin':origin,'rotationRows':[[1,0,0],[0,0,1],[0,-1,0]],'uniformScale':scale,'stageOffset':[0,1.3,0]},'sourceAxes':config['sourceAxes'],'landmarks':landmarks,'bones':bones}
    write_json(ROOT/'src/data/anatomy/t06.json',data)
    write_json(source/'segmentation.json',{'method':config['method'],'parameters':'scripts/anatomy/t06-segmentation.json','sourceTriangleCount':len(f),'sourceVolume':base.volume(),'sumPieceVolumes':sum(s.volume() for s in solids.values()),'maxPairIntersectionVolume':max(pair_intersections),'unionSymmetricDifferenceVolume':missing+outside,'junctionFragmentReassignments':reassigned,'pieces':audit})
    write_json(source/'manifest.json',{'dataset':data['dataset'],'mirrorCommit':config['mirrorCommit'],'fmaId':config['fmaId'],'sourceName':names[config['fmaId']],'file':'FMA9945.stl','url':url,'sha256':config['sha256'],'license':'CC BY-SA 2.1 Japan','modifications':'Seven morphology-guided solid Boolean regions. Exterior triangles are clipped/subdivided only at curved seams; original exterior shape is retained. Shared internal curved surfaces are complementary; no connectors. Small disconnected junction fragments attach to the adjacent region with largest shared surface.','originalTriangles':len(f),'derivedTriangles':sum(b['triangleCount'] for b in bones),'reviewStatus':data['reviewStatus']})
    print('T06: 7 closed connected solids; original volume',base.volume(),'; union difference / overlaps < 1e-7; internal triangles',sum(a['capTriangles'] for a in audit))
if __name__=='__main__':main()
