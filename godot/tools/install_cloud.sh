#!/usr/bin/env bash
# Install the pinned Linux editor and Windows x86-64 export templates without root.
# Official release archive SHA-512 values were read from 4.7.2-stable/SHA512-SUMS.txt.
# Extracted file digests additionally verify the installed fast path on every run.
set -euo pipefail
[[ "$(uname -s)" == Linux && "$(uname -m)" == x86_64 ]] || {
  echo 'This installer targets Linux x86-64 Codex Cloud environments.' >&2
  exit 1
}
for command_name in curl unzip sha512sum; do
  command -v "$command_name" >/dev/null || { echo "Missing required command: $command_name" >&2; exit 1; }
done

tool_root="${BONE_PUZZLE_TOOL_ROOT:-/workspace/tooling}"
cache_dir="${BONE_PUZZLE_DOWNLOAD_CACHE:-/workspace/.cache/godot-4.7.2}"
export XDG_DATA_HOME="${XDG_DATA_HOME:-/workspace/.local/share}"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-/workspace/.cache/godot-runtime}"
export XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-/workspace/.config/godot}"
editor_dir="$tool_root/godot/4.7.2"
editor="$editor_dir/Godot_v4.7.2-stable_linux.x86_64"
templates_dir="$XDG_DATA_HOME/godot/export_templates/4.7.2.stable"
base_url='https://github.com/godotengine/godot-builds/releases/download/4.7.2-stable'
mkdir -p "$editor_dir" "$templates_dir" "$cache_dir" "$XDG_CACHE_HOME" "$XDG_CONFIG_HOME"

verify_sha512() {
  local expected="$1" target_file="$2"
  [[ -s "$target_file" ]] && printf '%s  %s\n' "$expected" "$target_file" | sha512sum --check --status
}

download_verified() {
  local asset_name="$1" expected="$2" archive="$cache_dir/$1"
  if ! verify_sha512 "$expected" "$archive"; then
    curl -fL --retry 3 --output "$archive" "$base_url/$asset_name"
  fi
  verify_sha512 "$expected" "$archive" || { echo "SHA-512 verification failed: $archive" >&2; exit 1; }
}

editor_digest='ac9f3af3d8b62237694bc03e7422b8f7b1a39095cf4eeaa8361b7465f13bc9dbaad47f60ac0ac217c9f0b2b3712be207039cd83953f4c72087214bd0357cabbc'
if ! verify_sha512 "$editor_digest" "$editor"; then
  editor_archive='Godot_v4.7.2-stable_linux.x86_64.zip'
  download_verified "$editor_archive" '9aa00f7a605200940bce3027a567b782f49bd8e940dd06ae9e987bd65aee1b1467edd56ed84fcdcbdd44354bf613bdbb4e5d2913e925850368e150c59ed54c65'
  unzip -o "$cache_dir/$editor_archive" -d "$editor_dir"
  verify_sha512 "$editor_digest" "$editor"
  rm "$cache_dir/$editor_archive"
fi
chmod +x "$editor"

template_names=(windows_debug_x86_64.exe windows_debug_x86_64_console.exe windows_release_x86_64.exe windows_release_x86_64_console.exe)
template_digests=(
  'e7bfce194c399df76e9681ce2168250e0db78d7f63040a65c7f9fa28dd0caeb8214253bd6da5b7d88aaa49a5b8de8df380bd93e2f3bb89f683e4f847a58d30ea'
  '324c7f71f8d10d2d3f1407792cb9ea6758646288875d125f74e82e9288497d973172983cfc2f5a2e4089af1b6a1513b2ae94a89ada2a01f655f3aaeaff75d56b'
  '5b3d39315848983e45400a64662dad4a782636015cf6f659956194e3f196d72e7117a5ad9c94528361f6e1f229ed20c09a1dc740506eb1bcba2fba6bbb727981'
  '13b9364f97fae58c91a6f434da27cfc61146ac9e2eff961a9142ae67dacd8390346daa80a3d14b6cf0ecac75035472e04512fd5399414cea313c47cb4ac62ed6'
)
templates_valid=true
for index in "${!template_names[@]}"; do
  verify_sha512 "${template_digests[$index]}" "$templates_dir/${template_names[$index]}" || templates_valid=false
done
[[ -f "$templates_dir/version.txt" && "$(cat "$templates_dir/version.txt")" == 4.7.2.stable ]] || templates_valid=false
if [[ "$templates_valid" != true ]]; then
  template_archive='Godot_v4.7.2-stable_export_templates.tpz'
  download_verified "$template_archive" 'ca4d71c4d7b81dfc15d1a98baa07534aa95b03fdda78a0075b06672e1648d2e5f40980c9adc28d23e1b92e732ee7bf3461997aa804af74ec2fcd7a93ccb84079'
  unzip -j -o "$cache_dir/$template_archive" 'templates/windows_*x86_64*.exe' templates/version.txt -d "$templates_dir"
  for index in "${!template_names[@]}"; do
    verify_sha512 "${template_digests[$index]}" "$templates_dir/${template_names[$index]}"
  done
  [[ "$(cat "$templates_dir/version.txt")" == 4.7.2.stable ]]
  rm "$cache_dir/$template_archive"
fi

engine_version="$("$editor" --version)"
[[ "$engine_version" == 4.7.2.stable.* ]] || { echo "Unexpected Godot version: $engine_version" >&2; exit 1; }
printf 'Verified %s\nGODOT_BIN=%s\nXDG_DATA_HOME=%s\nXDG_CACHE_HOME=%s\nXDG_CONFIG_HOME=%s\nWINDOWS_TEMPLATES=%s\n' \
  "$engine_version" "$editor" "$XDG_DATA_HOME" "$XDG_CACHE_HOME" "$XDG_CONFIG_HOME" "$templates_dir"
