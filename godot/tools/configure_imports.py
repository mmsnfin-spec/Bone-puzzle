#!/usr/bin/env python3
"""Disable Godot's lossy vertex compression and unvalidated automatic mesh LODs.

Run after the initial editor import, then import again. Existing .glb.import
sidecars are tracked so future checkouts use these settings on first import.
"""
from pathlib import Path


def configure(root: Path) -> int:
    changed = 0
    for sidecar in sorted(root.glob("assets/models/hand/**/*.glb.import")):
        text = sidecar.read_text()
        updated = text.replace("meshes/force_disable_compression=false", "meshes/force_disable_compression=true")
        updated = updated.replace("meshes/generate_lods=true", "meshes/generate_lods=false")
        if updated != text:
            sidecar.write_text(updated)
            changed += 1
    return changed


if __name__ == "__main__":
    print(f"Configured {configure(Path(__file__).resolve().parents[1])} model imports without geometry compression or generated LODs.")
