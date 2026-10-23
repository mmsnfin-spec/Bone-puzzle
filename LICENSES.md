# Data and asset licensing

## BodyParts3D geometry and metadata

**BodyParts3D, © The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan.**

- License: https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en
- Official terms: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- Distribution: BodyParts3D 3.0 / 20110915, OBJ 95% polygon-reduced archive, subsequently converted to STL by Kevin-Mattheus-Moerman.
- Mirror: https://github.com/Kevin-Mattheus-Moerman/BodyParts3D/tree/f0eeb6e843380cfe6b83797cf8c3e1af74de5e61
- The preserved official README's section 3 contains the license and attribution text: `public/models/hand/source/original-README.html`.
- All derived GLB models, geometry-derived transforms and source metadata in this project are distributed under **CC BY-SA 2.1 Japan**. This includes `public/models/hand/`, `src/data/hand.json`, and the anatomical renderings in `docs/evidence/`.

Our modifications: extracted the 27 right-hand meshes, deduplicated coincident vertices, generated smooth normals, applied one shared rigid rotation and uniform scale, centered each mesh while recording the reversible target translation, exported GLB. No further decimation or anatomical deformation. The processing code is newly written; mirror application code is not copied.

Mitsuhashi N, Fujieda K, Tamura T, Kawamoto S, Takagi T, Okubo K. BodyParts3D: 3D structure database for anatomical concepts. Nucleic Acids Res. 2009;37:D782–5. https://doi.org/10.1093/nar/gkn613
Data DOI: https://doi.org/10.18908/lsdba.nbdc00837-000

The official server was unreachable (proxy 403) during implementation; provenance and license were inspected from pinned mirror copies of the original distribution documents.

## User references

Three references were provided in the conversation. Binary originals are not present in the workspace and are not redistributed here. No replacement brand-symbol artwork or commercial font binaries have been generated or included. Times New Roman/Times are referenced as system fonts only.

## Dependencies

Vite, React, TypeScript, Three.js, React Three Fiber, Drei, Rapier, Zustand, Vitest, Testing Library, and Playwright retain their respective upstream licenses in their npm packages. See package-lock.json for exact versions. No paid API or backend service is required.
