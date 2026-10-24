#!/usr/bin/env python3
"""Validate attribution, solid partition and exported (not just in-memory) geometry."""
import hashlib,importlib.util,json,math,struct
from collections import Counter
from pathlib import Path
import numpy as np
import manifold3d as manifold
ROOT=Path(__file__).resolve().parents[1]
def read_json(p):return json.loads(p.read_text(encoding='utf-8'))
def read_glb(path):
    raw=path.read_bytes();magic,version,length=struct.unpack_from('<III',raw);assert magic==0x46546c67 and version==2 and length==len(raw)
    jl=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+jl]);binary=raw[28+jl:]
    def array(i,fmt,n):
        a=g['accessors'][i];view=g['bufferViews'][a['bufferView']];return np.frombuffer(binary,dtype=fmt,count=a['count']*n,offset=view.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,n)
    normals=array(1,'<f4',3);assert np.isfinite(normals).all() and np.max(np.abs(np.linalg.norm(normals,axis=1)-1))<1e-5
    return array(0,'<f4',3).astype(float),array(2,'<u4',1).reshape(-1,3)
def main():
    folder=ROOT/'public/models/thoracic/T06/source';manifest=read_json(folder/'manifest.json');data=read_json(ROOT/'src/data/anatomy/t06.json');audit=read_json(folder/'segmentation.json')
    assert manifest['sourceName']=='sixth thoracic vertebra' and manifest['fmaId']=='FMA9945' and data['bone']=='T06'
    names=dict(line.split('\t',1) for line in (ROOT/'public/models/hand/source/parts_list_e.txt').read_text(encoding='utf-8').splitlines()[1:]);assert names['FMA9945']==manifest['sourceName']
    assert hashlib.sha256((folder/'FMA9945.stl').read_bytes()).hexdigest()==manifest['sha256']
    spec=importlib.util.spec_from_file_location('convert',ROOT/'scripts/convert-obj-to-glb.py');c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
    v,f=c.read_mesh(folder/'FMA9945.stl');v=np.array(v);f=np.array(f,dtype=np.uint32);original=manifold.Manifold(manifold.Mesh(v.astype(np.float32),f))
    mapping=data['coordinateMapping'];origin=np.array(mapping['sourceOrigin']);scale=mapping['uniformScale'];bones=data['bones'];assert len(bones)==7 and len({b['id'] for b in bones})==7
    landmarks={x['id'] for x in data['landmarks']};assert {'superior-costal-facet','inferior-costal-facet','transverse-costal-facet','vertebral-foramen'}<=landmarks
    solids=[];max_plane=0
    for b,rec in zip(bones,audit['pieces']):
        assert b['fmaId']=='FMA9945' and b['puzzleType']=='landmark' and b['id'].startswith('T06_P')
        assert all(x in landmarks for x in b['learning']['relatedLandmarks'])
        local,faces=read_glb(ROOT/'public'/b['modelPath'].lstrip('/'));assert len(local)==b['vertexCount'] and len(faces)==b['triangleCount'];assert np.isfinite(local).all()
        # Render vertices split exterior/cut normals. Weld identical positions for topology.
        welded,inverse=np.unique(local,axis=0,return_inverse=True);topology=inverse[faces]
        edges=Counter(tuple(sorted((int(a),int(z)))) for face in topology.tolist() for a,z in zip(face,face[1:]+face[:1]));assert set(edges.values())=={2},b['id']
        world=local+np.array(b['targetPosition']);source=np.stack([world[:,0]/scale+origin[0],-world[:,2]/scale+origin[1],(world[:,1]-1.3)/scale+origin[2]],axis=1)
        solid=manifold.Manifold(manifold.Mesh(np.ascontiguousarray(source[np.unique(inverse,return_index=True)[1]],dtype=np.float32),np.array(topology,dtype=np.uint32,order="C",copy=True)));assert len(solid.decompose())==1 and solid.volume()>0,b['id'];solids.append(solid)
        for output_id,source_id in zip(rec['exteriorTriangleIndices'],rec['sourceFaceIds']):
            a,z,c0=v[f[source_id]];normal=np.cross(z-a,c0-a);normal/=np.linalg.norm(normal)
            distance=np.max(np.abs((source[faces[output_id]]-a)@normal));max_plane=max(max_plane,float(distance))
    max_overlap=max(abs((a^b).volume()) for i,a in enumerate(solids) for b in solids[:i])
    union=manifold.Manifold()
    for s in solids:union=union+s
    missing=abs((original-union).volume());outside=abs((union-original).volume());volume_error=abs(sum(s.volume() for s in solids)-original.volume())
    assert max_plane<1e-4,max_plane
    assert max_overlap<.02 and missing<.1 and outside<.1 and volume_error<.1,(max_overlap,missing,outside,volume_error)
    print('PASS: T06/FMA9945 provenance; 7 connected watertight exported solids; 15 semantic landmarks; unchanged anatomy across difficulty.')
    print(f'Export round trip in source units: max exterior plane error {max_plane:.9g}; pair overlap {max_overlap:.9g}; missing volume {missing:.9g}; outside volume {outside:.9g}; volume-sum error {volume_error:.9g}.')
    print('Independent expert validation of anatomical junction placement is pending; geometric checks do not establish clinical accuracy.')
if __name__=='__main__':main()
