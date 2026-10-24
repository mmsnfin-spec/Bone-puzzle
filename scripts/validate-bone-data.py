#!/usr/bin/env python3
"""Validate counts, FMA mapping, GLB accessors and source-coordinate round trip."""
import hashlib, importlib.util, json, math, struct
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('convert',ROOT/'scripts/convert-obj-to-glb.py');convert=importlib.util.module_from_spec(spec);spec.loader.exec_module(convert)
data=json.loads((ROOT/'src/data/hand.json').read_text(encoding='utf-8'));bones=data['bones'];mapping=data['coordinateMapping']
assert len(bones)==27 and len({b['id'] for b in bones})==27
assert Counter(b['category'] for b in bones)=={'carpals':8,'metacarpals':5,'phalanges':14}
assert sum('thumb' in b['englishName'].lower() for b in bones)==2,'Thumb has two phalanges'
manifest=json.loads((ROOT/'public/models/hand/source/manifest.json').read_text(encoding='utf-8'))
names=dict(line.split('\t',1) for line in (ROOT/'public/models/hand/source/parts_list_e.txt').read_text(encoding='utf-8').splitlines()[1:])
max_error=0.;triangles=0;source_checks=0
for b in bones:
    rec=next(x for x in manifest['models'] if x['fmaId']==b['id']);assert names[b['id']]==rec['englishName']
    assert names[b['id']] in b['acceptedAliases'] and 'right' in names[b['id']]
    assert b['sourceSha256']==rec['sha256']
    raw=(ROOT/'public'/b['modelPath'].lstrip('/')).read_bytes()
    magic,version,length=struct.unpack_from('<III',raw);assert magic==0x46546c67 and version==2 and length==len(raw)
    jl,kind=struct.unpack_from('<II',raw,12);assert kind==0x4e4f534a
    gltf=json.loads(raw[20:20+jl]);binary=raw[28+jl:];acc=gltf['accessors'][0];view=gltf['bufferViews'][0]
    verts=[struct.unpack_from('<3f',binary,view.get('byteOffset',0)+i*12) for i in range(acc['count'])]
    assert all(math.isfinite(x) for v in verts for x in v)
    assert gltf['accessors'][2]['count']//3==b['triangleCount'];triangles+=b['triangleCount']
    assert abs(math.hypot(*b['initialTransform']['rotation'])-1)<1e-8
    assert all(b['size'][i]>0 for i in range(3)) and 0<b['snapDistance']<1
    source=ROOT/'.cache/bodyparts3d'/rec['file']
    if source.exists():
        assert hashlib.sha256(source.read_bytes()).hexdigest()==rec['sha256']
        original,faces=convert.read_mesh(source);assert len(original)==len(verts);assert len(faces)==b['triangleCount'];source_checks+=1
        for v,o in zip(verts,original):
            # Restore source from local GLB + target, inverse rotation (symmetric), scale, origin.
            world=[(v[i]+b['targetPosition'][i]-mapping['stageOffset'][i])/mapping['uniformScale'] for i in range(3)]
            restored=[-world[0]+mapping['sourceOrigin'][0],-world[2]+mapping['sourceOrigin'][1],-world[1]+mapping['sourceOrigin'][2]]
            max_error=max(max_error,max(abs(restored[i]-o[i]) for i in range(3)))
assert max_error<.00001,max_error
print(f'PASS: 27 unique right-hand bones; categories 8/5/14; {triangles:,} triangles; all GLB buffers load.')
if source_checks==27:print(f'PASS: 27 source checksums and vertex round trips; max source-coordinate error {max_error:.9f}.')
else:print(f'UNRUN: {27-source_checks} source round trips (run npm run data:fetch to populate the optional source cache).')
