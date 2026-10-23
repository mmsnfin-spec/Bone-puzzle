# BONE PUZZLE Godot asset notices

**BodyParts3D, © The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan.**

The 27 right-hand GLBs and anatomy JSON are derivatives of BodyParts3D 3.0 / 20110915. They remain under **CC BY-SA 2.1 Japan**: https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en . The included `bodyparts3d/original-README.html` contains the original notice and license, and `bodyparts3d/manifest.json` records the pinned mirror and original SHA-256 values. The original source files in the repository are preserved.

Mitsuhashi N, Fujieda K, Tamura T, Kawamoto S, Takagi T, Okubo K. BodyParts3D: 3D structure database for anatomical concepts. Nucleic Acids Res. 2009;37:D782–5. https://doi.org/10.1093/nar/gkn613

Data DOI: https://doi.org/10.18908/lsdba.nbdc00837-000

Migration changes: the GLBs are copied byte for byte, and their JSON resource paths are changed to Godot `res://` paths. There is no new decimation, deformation, axis flip, or scaling. `data/asset_manifest.json` contains the GLB and source JSON hashes. The Godot transforms retain the original reversible coordinate mapping.

## Fonts included in this Godot edition

- `assets/fonts/title.ttf`: unchanged DejaVu Serif from the system `fonts-dejavu-core` package, under the Bitstream Vera license with public-domain DejaVu changes. See `FONT-DejaVu.txt`; upstream: https://dejavu-fonts.github.io/ .
- `assets/fonts/ui.otf`: Noto Sans CJK KR Regular, selected without glyph edits from the installed `NotoSansCJK-Regular.ttc` collection using fontTools. It is distributed under the SIL Open Font License 1.1. See `FONT-Noto-CJK.txt`; upstream: https://github.com/notofonts/noto-cjk . This provides Korean glyphs offline without relying on Windows system fonts.

`ORIGINAL-LICENSES.md` is preserved from the React project. Its description of the original web fonts does not describe the additional bundled fonts listed above.
