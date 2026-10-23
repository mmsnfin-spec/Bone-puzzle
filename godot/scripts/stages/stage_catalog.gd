class_name StageCatalog
extends RefCounted
## Data-only stage access. Game systems do not depend on the HAND anatomy.

static func load_hand() -> Dictionary:
	return load_stage("res://data/hand.json")

static func load_stage(resource_path: String) -> Dictionary:
	if not FileAccess.file_exists(resource_path):
		push_error("Missing stage data: " + resource_path)
		return {}
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(resource_path))
	if not parsed is Dictionary or not parsed.has("bones"):
		push_error("Invalid stage data: " + resource_path)
		return {}
	return parsed

static func vec3(value: Variant) -> Vector3:
	if value is Vector3:
		return value
	if value is Array and value.size() == 3:
		return Vector3(float(value[0]), float(value[1]), float(value[2]))
	return Vector3.ZERO

static func quat(value: Variant) -> Quaternion:
	if value is Quaternion:
		return value
	if value is Array and value.size() == 4:
		return Quaternion(float(value[0]), float(value[1]), float(value[2]), float(value[3]))
	return Quaternion.IDENTITY

static func stages() -> Array[Dictionary]:
	return [
		{"id": "hand", "name": "HAND", "available": true, "count": 27},
		{"id": "foot", "name": "FOOT", "available": false},
		{"id": "upper_limb", "name": "UPPER LIMB", "available": false},
		{"id": "lower_limb", "name": "LOWER LIMB", "available": false},
		{"id": "pelvis", "name": "PELVIS", "available": false},
		{"id": "spine", "name": "SPINE", "available": false},
		{"id": "thorax", "name": "THORAX", "available": false},
		{"id": "skull", "name": "SKULL", "available": false},
	]
