#!/usr/bin/env python3
"""Copy the verified web anatomy into Godot without changing source assets.

No mesh conversion, decimation, axis flip, or anatomical deformation is applied.
Run from any directory: python godot/tools/migrate_assets.py
"""
from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GODOT = ROOT / "godot"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    original_path = ROOT / "src/data/hand.json"
    if not original_path.is_file() or not (ROOT / "public/models/hand/source").is_dir():
        raise SystemExit(
            "Asset regeneration requires the complete Bone-puzzle repository with src/data/hand.json "
            "and public/models/hand/. In the standalone Godot project ZIP, run "
            "python tools/validate_assets.py to validate the bundled anatomy instead."
        )
    data = json.loads(original_path.read_text())
    manifest = {
        "sourceMetadata": "src/data/hand.json",
        "sourceMetadataSnapshot": "data/source-hand-original.json",
        "sourceMetadataSha256": sha256(original_path),
        "coordinateBasis": "Identity: glTF, Three.js, and Godot use right-handed Y-up coordinates.",
        "meshChanges": "None; original GLB bytes are copied exactly.",
        "license": "CC BY-SA 2.1 Japan",
        "models": [],
    }
    for bone in data["bones"]:
        original_model = "public" + bone["modelPath"]
        destination = "assets" + bone["modelPath"]
        out = GODOT / destination
        out.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / original_model, out)
        manifest["models"].append({
            "id": bone["id"],
            "sourcePath": original_model,
            "godotPath": "res://" + destination,
            "glbSha256": sha256(out),
            "originalSourceSha256": bone["sourceSha256"],
        })
        bone["modelPath"] = "res://" + destination
    (GODOT / "data").mkdir(parents=True, exist_ok=True)
    shutil.copyfile(original_path, GODOT / "data/source-hand-original.json")
    (GODOT / "data/hand.json").write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    (GODOT / "data/asset_manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    licenses = GODOT / "licenses"
    licenses.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / "LICENSES.md", licenses / "ORIGINAL-LICENSES.md")
    shutil.copytree(ROOT / "public/models/hand/source", licenses / "bodyparts3d", dirs_exist_ok=True)
    print(f"Copied {len(data['bones'])} byte-identical GLBs and preserved all anatomical metadata.")


if __name__ == "__main__":
    main()
