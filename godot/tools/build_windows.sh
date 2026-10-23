#!/usr/bin/env bash
# Run from any directory. Godot 4.7.2 and its matching Windows x64 templates are required.
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -z "${GODOT_BIN:-}" ]]; then
  if [[ -x /workspace/tooling/godot/4.7.2/Godot_v4.7.2-stable_linux.x86_64 ]]; then
    GODOT_BIN=/workspace/tooling/godot/4.7.2/Godot_v4.7.2-stable_linux.x86_64
  else
    GODOT_BIN=godot
  fi
fi
if [[ -d /workspace/.local/share/godot/export_templates/4.7.2.stable ]]; then
  export XDG_DATA_HOME="${XDG_DATA_HOME:-/workspace/.local/share}"
  export XDG_CACHE_HOME="${XDG_CACHE_HOME:-/workspace/.cache/godot-runtime}"
  export XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-/workspace/.config/godot}"
fi
engine_version="$("$GODOT_BIN" --version)"
[[ "$engine_version" == 4.7.2.stable.* ]] || {
  echo "Godot 4.7.2 Stable required; received $engine_version" >&2
  exit 1
}
mkdir -p "$project_dir/build/windows" "$project_dir/build/windows-debug"
"$GODOT_BIN" --headless --path "$project_dir" --editor --import --quit
"$GODOT_BIN" --headless --path "$project_dir" --script res://tests/run_tests.gd
"$GODOT_BIN" --headless --path "$project_dir" --script res://tools/validate_import.gd
"$GODOT_BIN" --headless --path "$project_dir" --export-release "Windows Release" \
  "$project_dir/build/windows/Bone-Puzzle-0.2.0-Windows-x64.exe"
"$GODOT_BIN" --headless --path "$project_dir" --export-debug "Windows Debug" \
  "$project_dir/build/windows-debug/Bone-Puzzle-0.2.0-Windows-x64-Debug.exe"
python3 "$project_dir/tools/package_build.py"
