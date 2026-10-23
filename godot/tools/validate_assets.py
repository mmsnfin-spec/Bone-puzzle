#!/usr/bin/env python3
"""Verify metadata preservation, all meshes, target coordinates, and source round trips."""
from __future__ import annotations

from collections import Counter
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import struct

GODOT = Path(__file__).resolve().parents[1]
ROOT = GODOT.parent


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def positions(path: Path):
    raw = path.read_bytes()
    magic, version, length = struct.unpack_from("<III", raw)
    assert (magic, version, length) == (0x46546C67, 2, len(raw)), path
    size, kind = struct.unpack_from("<II", raw, 12)
    assert kind == 0x4E4F534A
    gltf = json.loads(raw[20:20 + size])
    accessor = gltf["accessors"][0]
    view = gltf["bufferViews"][accessor["bufferView"]]
    offset = 28 + size + view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    stride = view.get("byteStride", 12)
    assert accessor["componentType"] == 5126 and accessor["type"] == "VEC3"
    return [struct.unpack_from("<3f", raw, offset + index * stride) for index in range(accessor["count"])]


def main():
    migrated = json.loads((GODOT / "data/hand.json").read_text())
    manifest = json.loads((GODOT / "data/asset_manifest.json").read_text())
    original_snapshot = GODOT / manifest["sourceMetadataSnapshot"]
    assert manifest["sourceMetadataSha256"] == digest(original_snapshot)
    original = json.loads(original_snapshot.read_text())
    repository_original = ROOT / manifest["sourceMetadata"]
    if repository_original.is_file():
        assert digest(repository_original) == manifest["sourceMetadataSha256"]
    restored = json.loads(json.dumps(migrated))
    for bone in restored["bones"]:
        bone["modelPath"] = bone["modelPath"].replace("res://assets/", "/", 1)
    assert restored == original, "Only resource paths may differ from original JSON"
    bones = migrated["bones"]
    assert len(bones) == len({bone["id"] for bone in bones}) == 27
    assert Counter(bone["category"] for bone in bones) == {"carpals": 8, "metacarpals": 5, "phalanges": 14}
    mapping = migrated["coordinateMapping"]
    converter_path = ROOT / "scripts/convert-obj-to-glb.py"
    converter = None
    if converter_path.is_file():
        source_spec = importlib.util.spec_from_file_location("original_converter", converter_path)
        converter = importlib.util.module_from_spec(source_spec)
        source_spec.loader.exec_module(converter)
    manifest_by_id = {item["id"]: item for item in manifest["models"]}
    source_manifest = json.loads((GODOT / "licenses/bodyparts3d/manifest.json").read_text())
    source_by_id = {item["fmaId"]: item for item in source_manifest["models"]}
    all_world = []
    max_roundtrip_error = 0.0
    verified_originals = 0
    verified_repository_glbs = 0
    for bone in bones:
        record = manifest_by_id[bone["id"]]
        path = GODOT / bone["modelPath"].removeprefix("res://")
        assert digest(path) == record["glbSha256"]
        repository_glb = ROOT / record["sourcePath"]
        if repository_glb.is_file():
            assert digest(repository_glb) == record["glbSha256"]
            verified_repository_glbs += 1
        assert bone["sourceSha256"] == record["originalSourceSha256"] == source_by_id[bone["id"]]["sha256"]
        vertices = positions(path)
        assert len(vertices) == bone["vertexCount"]
        assert all(math.isfinite(x) for vertex in vertices for x in vertex)
        low = [min(vertex[axis] for vertex in vertices) for axis in range(3)]
        high = [max(vertex[axis] for vertex in vertices) for axis in range(3)]
        assert max(abs(high[a] - low[a] - bone["size"][a]) for a in range(3)) < 1e-6
        assert max(abs(high[a] + low[a]) for a in range(3)) < 1e-6, "GLB must remain centered"
        assert bone["targetRotation"] == [0, 0, 0, 1] and bone["targetScale"] == [1, 1, 1]
        assert abs(math.hypot(*bone["initialTransform"]["rotation"]) - 1) < 1e-8
        world = [[vertex[a] + bone["targetPosition"][a] for a in range(3)] for vertex in vertices]
        all_world.extend(world)
        source_path = ROOT / ".cache/bodyparts3d" / source_by_id[bone["id"]]["file"]
        if source_path.is_file() and converter is not None:
            assert digest(source_path) == bone["sourceSha256"]
            source_vertices, _ = converter.read_mesh(source_path)
            assert len(source_vertices) == len(vertices)
            for positioned, source in zip(world, source_vertices):
                unscaled = [(positioned[a] - mapping["stageOffset"][a]) / mapping["uniformScale"] for a in range(3)]
                inverse = [-unscaled[0], -unscaled[2], -unscaled[1]]
                recovered = [inverse[a] + mapping["sourceOrigin"][a] for a in range(3)]
                max_roundtrip_error = max(max_roundtrip_error, max(abs(recovered[a] - source[a]) for a in range(3)))
            verified_originals += 1
    assert max_roundtrip_error < 1e-5
    # The assembled world-space envelope is the same 7-unit hand as the React reference.
    lower = [min(point[a] for point in all_world) for a in range(3)]
    upper = [max(point[a] for point in all_world) for a in range(3)]
    assert abs(upper[1] - lower[1] - 7.0) < 1e-6
    print("PASS: 27 unique GLBs, 8/5/14 categories, preserved GLB SHA-256 values, complete original metadata preservation.")
    print(f"PASS: centered geometry and assembled right-hand bounds {lower} .. {upper}.")
    if verified_repository_glbs:
        print(f"PASS: {verified_repository_glbs}/27 byte-identical GLB comparisons with the original web repository.")
    if verified_repository_glbs != 27:
        print(f"UNRUN: {27 - verified_repository_glbs} original web GLB file comparisons (not bundled); all copied GLB hashes still verified.")
    if verified_originals:
        print(f"PASS: {verified_originals}/27 original source vertex round trips; maximum error {max_roundtrip_error:.9f}.")
    if verified_originals != 27:
        print(f"UNRUN: {27 - verified_originals} original STL vertex round trips (source cache/converter not bundled); copied GLB hashes and geometry still verified.")


if __name__ == "__main__":
    main()
