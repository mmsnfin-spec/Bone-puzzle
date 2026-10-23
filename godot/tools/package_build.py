#!/usr/bin/env python3
"""Package the editable Godot project and a self-contained Windows release using stdlib only."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil
import struct
import subprocess
from zipfile import ZIP_DEFLATED, ZipFile

PROJECT = Path(__file__).resolve().parents[1]
BUILD = PROJECT / "build"
VERSION = "0.2.0"
PRODUCT = f"Bone-Puzzle-{VERSION}-Windows-x64"
SOURCE_NAME = "Bone-Puzzle-Godot-Source"
IGNORED_PARTS = {".godot", "build", ".git", "__pycache__"}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def verify_windows_executable(path: Path) -> None:
    with path.open("rb") as stream:
        if stream.read(2) != b"MZ":
            raise ValueError(f"Not a Windows executable: {path}")
        stream.seek(0x3C)
        pe_offset = struct.unpack("<I", stream.read(4))[0]
        stream.seek(pe_offset)
        if stream.read(4) != b"PE\0\0" or struct.unpack("<H", stream.read(2))[0] != 0x8664:
            raise ValueError(f"Not a Windows x86-64 PE: {path}")
        stream.seek(-4, 2)
        if stream.read(4) != b"GDPC":
            raise ValueError("The executable does not have an embedded Godot pack")


def commit_info() -> dict:
    try:
        root = PROJECT.parent
        commit = subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()
        dirty = bool(subprocess.check_output(["git", "-C", str(root), "status", "--porcelain"], text=True))
        return {"source_commit": commit, "source_tree_has_uncommitted_changes": dirty}
    except (OSError, subprocess.CalledProcessError):
        return {"source_commit": None, "source_tree_has_uncommitted_changes": None}


def write_zip(destination: Path, root: Path, prefix: str, exclude=None) -> None:
    with ZipFile(destination, "w", ZIP_DEFLATED, compresslevel=6) as archive:
        for source in sorted(root.rglob("*")):
            if not source.is_file():
                continue
            relative = source.relative_to(root)
            if exclude and exclude(relative):
                continue
            archive.write(source, str(Path(prefix) / relative))
    with ZipFile(destination) as archive:
        broken = archive.testzip()
        if broken:
            raise ValueError(f"ZIP CRC verification failed: {broken}")


def source_excluded(relative: Path) -> bool:
    return (
        any(part in IGNORED_PARTS for part in relative.parts)
        or relative.name == "export_credentials.cfg"
        or relative.suffix in {".tmp", ".log", ".pyc"}
    )


def package_source() -> Path:
    destination = BUILD / f"{SOURCE_NAME}.zip"
    write_zip(destination, PROJECT, SOURCE_NAME, source_excluded)
    with ZipFile(destination) as archive:
        files = set(archive.namelist())
        required = {f"{SOURCE_NAME}/project.godot", f"{SOURCE_NAME}/export_presets.cfg", f"{SOURCE_NAME}/data/hand.json"}
        if not required <= files:
            raise ValueError("Source ZIP is missing project files")
        models = [name for name in files if name.endswith(".glb")]
        if len(models) != 27:
            raise ValueError(f"Expected 27 source models, received {len(models)}")
        if any("/.godot/" in name or "/build/" in name for name in files):
            raise ValueError("Source ZIP unexpectedly contains generated cache/build files")
    return destination


def package_release(windows_smoke_run: str = "") -> tuple[Path, Path]:
    output = BUILD / "windows"
    executable = output / f"{PRODUCT}.exe"
    verify_windows_executable(executable)
    readme = PROJECT / "README.md"
    if not readme.is_file():
        raise FileNotFoundError("godot/README.md is required before distribution")
    markdown = list((PROJECT / "docs").glob("*.md"))
    if not any("TEST" in file.name.upper() for file in markdown):
        raise FileNotFoundError("A test report in godot/docs is required before distribution")
    if not any("PERFORMANCE" in file.name.upper() for file in markdown):
        raise FileNotFoundError("A performance report in godot/docs is required before distribution")
    for required in ("NOTICE.md", "GODOT-LICENSE.txt", "GODOT-COPYRIGHT.txt", "bodyparts3d/LICENSE_content.txt"):
        if not (PROJECT / "licenses" / required).is_file():
            raise FileNotFoundError(f"Missing license notice: {required}")
    shutil.copy2(readme, output / "README.md")
    if (output / "licenses").exists():
        shutil.rmtree(output / "licenses")
    shutil.copytree(PROJECT / "licenses", output / "licenses")
    if (output / "docs").exists():
        shutil.rmtree(output / "docs")
    shutil.copytree(PROJECT / "docs", output / "docs")
    info = {
        "product": "BONE PUZZLE", "version": VERSION,
        "engine": "Godot 4.7.2 Stable", "target": "Windows 10/11 x86-64",
        "embedded_resources": True, "code_signed": False,
        "windows_headless_launch_verified": bool(windows_smoke_run),
        "windows_headless_ci_run": windows_smoke_run or None,
        "windows_interactive_verified": False,
        "verification_scope": "PE x86-64 and embedded pack verified; headless launch is recorded separately from Windows interactive graphics and hardware performance",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "exe_sha256": sha256(executable), **commit_info(),
    }
    (output / "BUILD-INFO.json").write_text(json.dumps(info, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    destination = BUILD / f"{PRODUCT}.zip"
    write_zip(destination, output, PRODUCT)
    return destination, executable


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-only", action="store_true", help="Create only the editable source ZIP")
    parser.add_argument("--windows-headless-smoke-run", default="", help="Observed successful Windows headless CI run URL; does not certify interactive Windows gameplay")
    arguments = parser.parse_args()
    BUILD.mkdir(exist_ok=True)
    artifacts = [package_source()]
    if not arguments.source_only:
        release, executable = package_release(arguments.windows_headless_smoke_run)
        artifacts += [release, executable]
    # Distribution checksums can be checked directly beside the two ZIPs.
    # The uncompressed EXE hash is recorded inside Windows BUILD-INFO.json.
    checksums = [f"{sha256(path)}  {path.relative_to(BUILD).as_posix()}" for path in artifacts if path.suffix == ".zip"]
    (BUILD / "SHA256SUMS.txt").write_text("\n".join(checksums) + "\n", encoding="utf-8")
    for path in artifacts:
        print(f"PACKAGED {path} ({path.stat().st_size:,} bytes)")
    print("ZIP CRC verification passed; checksums: " + str(BUILD / "SHA256SUMS.txt"))


if __name__ == "__main__":
    main()
