extends SceneTree
## Run after editor import: godot --headless --path godot --script res://tools/validate_import.gd
## Compares every imported model vertex to its preserved GLB coordinate, not only AABBs.

const Catalog = preload("res://scripts/stages/stage_catalog.gd")
var failures: int = 0

func _initialize() -> void:
	var stage: Dictionary = Catalog.load_hand()
	check(stage.get("bones", []).size() == 27, "HAND must contain 27 bones")
	var checked_vertices: int = 0
	for bone: Dictionary in stage.get("bones", []):
		var packed: PackedScene = load(bone["modelPath"])
		if packed == null:
			check(false, "Model not imported: " + str(bone["id"]))
			continue
		var instance: Node = packed.instantiate()
		var vertices: Array[Vector3] = []
		collect_vertices(instance, Transform3D.IDENTITY, vertices)
		var expected: Dictionary = read_glb_vertices(bone["modelPath"])
		check(not vertices.is_empty(), "Imported mesh has vertices: " + str(bone["id"]))
		var minimum := Vector3(INF, INF, INF)
		var maximum := Vector3(-INF, -INF, -INF)
		var unmatched: int = 0
		for point: Vector3 in vertices:
			var found: bool = expected.has(point)
			if not found:
				for original: Vector3 in expected:
					if original.distance_to(point) < 0.00001:
						found = true
						break
			if not found:
				unmatched += 1
			minimum = minimum.min(point)
			maximum = maximum.max(point)
		checked_vertices += vertices.size()
		check(unmatched == 0, "All imported vertices preserve GLB position: " + str(bone["id"]) + " (" + str(unmatched) + " unmatched)")
		check((maximum - minimum).distance_to(Catalog.vec3(bone["size"])) < 0.00001,
			"Godot model scale equals original: " + str(bone["id"]))
		check((maximum + minimum).length() < 0.00001, "Godot origin remains centered: " + str(bone["id"]))
		instance.free()
	var serif: Font = load("res://assets/fonts/title.ttf")
	var ui: Font = load("res://assets/fonts/ui.otf")
	check(serif != null and serif.has_char(ord("B")), "Title font loads")
	check(ui != null and ui.has_char(ord("뼈")), "Bundled UI font contains Korean glyphs")
	if failures == 0:
		print("PASS: all 27 Godot-imported models preserve GLB axes, centers, scales and ", checked_vertices, " vertices; title and Korean fonts load.")
	quit(0 if failures == 0 else 1)

func check(condition: bool, message: String) -> void:
	if not condition:
		failures += 1
		push_error(message)

func collect_vertices(node: Node, parent_transform: Transform3D, output: Array[Vector3]) -> void:
	var cumulative: Transform3D = parent_transform
	if node is Node3D:
		cumulative = parent_transform * node.transform
	if node is MeshInstance3D and node.mesh != null:
		for surface: int in range(node.mesh.get_surface_count()):
			var arrays: Array = node.mesh.surface_get_arrays(surface)
			var positions: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
			for point: Vector3 in positions:
				output.append(cumulative * point)
	for child: Node in node.get_children():
		collect_vertices(child, cumulative, output)

func read_glb_vertices(resource_path: String) -> Dictionary:
	var file := FileAccess.open(resource_path, FileAccess.READ)
	var bytes: PackedByteArray = file.get_buffer(file.get_length())
	file.close()
	var json_length: int = bytes.decode_u32(12)
	var gltf: Dictionary = JSON.parse_string(bytes.slice(20, 20 + json_length).get_string_from_utf8())
	var accessor: Dictionary = gltf["accessors"][0]
	var view: Dictionary = gltf["bufferViews"][int(accessor["bufferView"])]
	var offset: int = 28 + json_length + int(view.get("byteOffset", 0)) + int(accessor.get("byteOffset", 0))
	var stride: int = int(view.get("byteStride", 12))
	var result: Dictionary = {}
	for index: int in range(int(accessor["count"])):
		var start: int = offset + index * stride
		result[Vector3(bytes.decode_float(start), bytes.decode_float(start + 4), bytes.decode_float(start + 8))] = true
	return result
