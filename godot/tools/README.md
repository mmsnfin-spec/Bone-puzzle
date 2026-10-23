# Anatomy migration and validation

These tools never change `src/`, `public/`, or the original web data pipeline.

1. `python godot/tools/migrate_assets.py` copies all 27 source GLBs unchanged, preserves every JSON field, rewrites only Godot resource paths, and records source/GLB hashes. It also copies original data attribution documents and a byte-identical `data/source-hand-original.json` snapshot. Regeneration requires the complete repository; the standalone Godot project ZIP already contains the migrated assets.
2. `python godot/tools/validate_assets.py` checks counts and categories, unique IDs, every metadata field against the bundled original JSON snapshot, GLB hashes/buffers/centers/scales, and the assembled hand envelope. In the standalone project ZIP, run `python tools/validate_assets.py`; web GLB file comparisons and original STL round trips are optional and explicitly reported as unrun when the parent web repository/cache is absent. They run automatically when the complete repository and original `.cache/bodyparts3d/` cache are available.
3. `godot --headless --editor --path godot --import --quit` imports resources. The committed `.glb.import` settings disable lossy vertex compression and automatically generated LODs. This is intentional: Godot defaults change positions and perform unvalidated simplification; the source meshes contain only 36,216 triangles total.
4. For newly added models without sidecars, perform an initial import, run `python godot/tools/configure_imports.py`, then import again. The script is repeatable and leaves unrelated importer settings untouched.
5. `godot --headless --path godot --script res://tools/validate_import.gd` compares every actual imported mesh vertex with the original GLB coordinates, then checks centers, dimensions, and bundled font support. Godot 4.7.2 validates all 18,164 vertices without an extra axis transformation.

In Codex Cloud, set `XDG_DATA_HOME=/workspace/.local/share`, `XDG_CACHE_HOME=/workspace/.cache/godot-runtime`, and `XDG_CONFIG_HOME=/workspace/.config/godot` before running Godot. These paths make caches/settings writable without modifying the system home directory.

The existing source pipeline already centers each mesh, records a reversible target translation, and applies a shared rigid source-to-stage mapping. glTF/Three.js and Godot are right-handed with Y up, so another handedness flip would incorrectly mirror the right hand. The imported vertex test directly verifies that no additional rotation, origin displacement, or scale has been introduced.

## Optional original-web reference benchmark

`benchmark_web.mjs` uses the original repository's existing Playwright/Chromium dependency to measure the React production build without editing web source. Start an isolated preview from the repository root with `npm run preview -- --port 4175 --strictPort`, then run `node godot/tools/benchmark_web.mjs http://127.0.0.1:4175`. Stop only the preview process you started after collecting `godot/build/evidence/react-baseline.json`.

It samples 120 browser animation frames at 1920×1080 for title and game, captures Chromium CDP main-thread task/script time and JS heap, and records the SwiftShader renderer. This development-only tool does not add a web runtime dependency to the Godot game. SwiftShader and Godot llvmpipe are different software graphics stacks, the title scenes intentionally differ, and CPU/memory metric definitions differ; do not report these numbers as a Windows hardware speedup percentage.
