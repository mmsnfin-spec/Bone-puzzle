#!/usr/bin/env python3
"""Fetch only the 27 right-hand models from a pinned, attributed BP3D 3.0 mirror."""
import concurrent.futures, hashlib, json, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
COMMIT = 'f0eeb6e843380cfe6b83797cf8c3e1af74de5e61'
BASE = f'https://raw.githubusercontent.com/Kevin-Mattheus-Moerman/BodyParts3D/{COMMIT}/'
IDS = [23725,24435,24437,24439,24441,24443,24446,24448,*range(24450,24465),24466,24468,24470,24472]

def main():
    dest = ROOT / '.cache/bodyparts3d'; dest.mkdir(parents=True, exist_ok=True)
    provenance = ROOT / 'public/models/hand/source'; provenance.mkdir(parents=True, exist_ok=True)
    for name, remote in [('parts_list_e.txt','assets/BodyParts3D_data/parts_list_e.txt'),('LICENSE_content.txt','LICENSE_content'),('mirror-README.md','README.md'),('original-README.html','assets/BodyParts3D_data/README_e.html'),('release_3.0.html','assets/BodyParts3D_data/release_3.0_e.html')]:
        data = urllib.request.urlopen(BASE+remote, timeout=45).read()
        (provenance/name).write_bytes(data)
    names = dict(line.split('\t',1) for line in (provenance/'parts_list_e.txt').read_text().splitlines()[1:])
    def fetch(fma):
        name = f'FMA{fma}.stl'; remote = 'assets/BodyParts3D_data/stl/'+name
        path=dest/name
        if not path.exists(): path.write_bytes(urllib.request.urlopen(BASE+remote, timeout=60).read())
        data=path.read_bytes()
        # Binary STL: exactly 84 + 50 * triangle_count bytes. Reject HTML/LFS errors.
        import struct
        assert len(data) == 84+50*struct.unpack_from('<I',data,80)[0], name
        return {'fmaId':f'FMA{fma}','englishName':names[f'FMA{fma}'], 'file':name,'url':BASE+remote,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: records=list(pool.map(fetch,IDS))
    manifest={'dataset':'BodyParts3D 3.0 / 20110915','mirrorCommit':COMMIT,'license':'CC BY-SA 2.1 Japan','models':records}
    (provenance/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(f'Fetched {len(records)} right-hand meshes; {sum(x["bytes"] for x in records):,} bytes')
if __name__=='__main__': main()
