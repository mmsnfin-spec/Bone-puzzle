#!/usr/bin/env python3
"""Convert shared-coordinate OBJ or binary STL to centered GLBs + reversible targets.
No deformation/decimation. Standard-library implementation; Blender is optional.
"""
import argparse, hashlib, json, math, struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def read_mesh(path):
    if path.suffix.lower()=='.obj':
        vertices=[]; faces=[]
        for line in path.read_text().splitlines():
            bits=line.split()
            if not bits: continue
            if bits[0]=='v': vertices.append(tuple(map(float,bits[1:4])))
            if bits[0]=='f':
                ids=[int(x.split('/')[0]) for x in bits[1:]]
                ids=[i-1 if i>0 else len(vertices)+i for i in ids]
                for i in range(1,len(ids)-1): faces.append((ids[0],ids[i],ids[i+1]))
        return vertices,faces
    data=path.read_bytes(); count=struct.unpack_from('<I',data,80)[0]
    assert len(data)==84+count*50
    vertices=[]; faces=[]; lookup={}
    for i in range(count):
        v=struct.unpack_from('<12f',data,84+i*50)[3:]; face=[]
        for k in range(3):
            p=tuple(v[k*3:k*3+3])
            if p not in lookup: lookup[p]=len(vertices);vertices.append(p)
            face.append(lookup[p])
        faces.append(tuple(face))
    return vertices,faces

def write_glb(path,vertices,faces,normals=None):
    if normals is None:
        normals=[[0.,0.,0.] for _ in vertices]
        for a,b,c in faces:
            u=[vertices[b][i]-vertices[a][i] for i in range(3)];v=[vertices[c][i]-vertices[a][i] for i in range(3)]
            n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]]
            for j in (a,b,c):
                for k in range(3):normals[j][k]+=n[k]
        normals=[[x/(math.hypot(*n) or 1) for x in n] for n in normals]
    pos=struct.pack('<%sf'%(len(vertices)*3),*(x for v in vertices for x in v))
    norm=struct.pack('<%sf'%(len(vertices)*3),*(x for v in normals for x in v))
    indices=struct.pack('<%sI'%(len(faces)*3),*(i for f in faces for i in f))
    binary=pos+norm+indices
    doc={'asset':{'version':'2.0','generator':'Bone Puzzle coordinate-preserving converter'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'name':path.stem}],'meshes':[{'primitives':[{'attributes':{'POSITION':0,'NORMAL':1},'indices':2,'material':0}]}],'materials':[{'name':'Ivory','pbrMetallicRoughness':{'baseColorFactor':[0.91,0.89,0.83,1],'metallicFactor':0,'roughnessFactor':0.7}}], 'buffers':[{'byteLength':len(binary)}], 'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':len(pos),'target':34962},{'buffer':0,'byteOffset':len(pos),'byteLength':len(norm),'target':34962},{'buffer':0,'byteOffset':len(pos)+len(norm),'byteLength':len(indices),'target':34963}], 'accessors':[{'bufferView':0,'componentType':5126,'count':len(vertices),'type':'VEC3','min':[min(v[i] for v in vertices) for i in range(3)],'max':[max(v[i] for v in vertices) for i in range(3)]},{'bufferView':1,'componentType':5126,'count':len(vertices),'type':'VEC3'},{'bufferView':2,'componentType':5125,'count':len(faces)*3,'type':'SCALAR'}]}
    js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
    path.write_bytes(struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--input-dir',type=Path,default=ROOT/'.cache/bodyparts3d');args=parser.parse_args()
    manifest=json.loads((ROOT/'public/models/hand/source/manifest.json').read_text())
    meshes={}
    for rec in manifest['models']:
        file=args.input_dir/(rec['fmaId']+'.obj')
        if not file.exists():file=args.input_dir/rec['file']
        if file.suffix=='.stl':assert hashlib.sha256(file.read_bytes()).hexdigest()==rec['sha256']
        meshes[rec['fmaId']]=read_mesh(file)
    allv=[v for verts,_ in meshes.values() for v in verts]
    lo=[min(v[i] for v in allv) for i in range(3)];hi=[max(v[i] for v in allv) for i in range(3)]
    origin=[(lo[i]+hi[i])/2 for i in range(3)];scale=7/(hi[2]-lo[2])
    def rotate(v):return [-v[0],-v[2],-v[1]] # determinant +1; preserves handedness
    def stage(v):return [x*scale+(1.5 if i==1 else 0) for i,x in enumerate(rotate([v[j]-origin[j] for j in range(3)]))]
    carpals={'scaphoid':'주상골','lunate':'월상골','triquetral':'삼각골','pisiform':'두상골','trapezium':'대능형골','trapezoid':'소능형골','capitate':'유두골','hamate':'유구골'}
    bones=[]
    for index,rec in enumerate(manifest['models']):
        verts,faces=meshes[rec['fmaId']];center=[(min(v[i] for v in verts)+max(v[i] for v in verts))/2 for i in range(3)]
        local=[[x*scale for x in rotate([v[j]-center[j] for j in range(3)])] for v in verts]
        size=[max(v[i] for v in local)-min(v[i] for v in local) for i in range(3)]
        full=rec['englishName'];short=full.replace('right ','');name=short.capitalize()
        category='metacarpals' if 'metacarpal' in full else 'phalanges' if 'phalanx' in full else 'carpals'
        korean=carpals.get(short,'')
        if category=='metacarpals':korean=f'제{["first","second","third","fourth","fifth"].index(short.split()[0])+1}중수골'
        if category=='phalanges':
            digit=next((ko for en,ko in [('thumb','엄지'),('index','검지'),('middle finger','중지'),('ring','약지'),('little','소지')] if en in short),'')
            korean=digit+' '+{'proximal':'근위지골','middle':'중위지골','distal':'원위지골'}[short.split()[0]]
        out=ROOT/'public/models/hand'/category;out.mkdir(exist_ok=True)
        write_glb(out/(rec['fmaId']+'.glb'),local,faces)
        # A widely spaced tray on the floor, each mesh lying flat. Same final objects play the puzzle.
        theta=((index*13)%9-4)*0.045; c=math.cos(theta/2);s=math.sin(theta/2);r=math.sqrt(.5)
        rotation=[r*c,s*r,-s*r,r*c]
        position=[(index%9-4)*1.25,-4.1+size[2]/2+0.04,(index//9-1)*2.45+1.5]
        aliases=[full]
        if category=='carpals':aliases+=[short+' bone','right '+short+' bone']
        bones.append({'id':rec['fmaId'],'fmaId':rec['fmaId'],'englishName':name,'koreanName':korean,'acceptedAliases':aliases,'category':category,'modelPath':f'/models/hand/{category}/{rec["fmaId"]}.glb','targetPosition':stage(center),'targetRotation':[0,0,0,1],'targetScale':[1,1,1],'originalCenter':center,'initialTransform':{'position':position,'rotation':rotation},'size':size,'snapDistance':max(.22,min(.42,max(size)*.3)),'sourceSha256':rec['sha256'],'vertexCount':len(verts),'triangleCount':len(faces)})
    output={'stageId':'hand','side':'right','dataset':manifest['dataset'],'source':'BodyParts3D mirror; real anatomical meshes','coordinateMapping':{'sourceOrigin':origin,'rotationRows':[[-1,0,0],[0,0,-1],[0,-1,0]],'uniformScale':scale,'stageOffset':[0,1.5,0],'sourceBounds':[lo,hi],'sourceUnits':'source coordinate units; not asserted to be clinical millimeters'},'bones':bones}
    (ROOT/'src/data/hand.json').write_text(json.dumps(output,indent=2,ensure_ascii=False)+'\n')
    print(f'Converted {len(bones)} bones, {sum(x["triangleCount"] for x in bones):,} triangles. Source bounds: {lo}, {hi}')
if __name__=='__main__':main()
