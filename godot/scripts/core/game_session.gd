class_name GameSession
extends Node

const Snap = preload("res://scripts/puzzle/snap_system.gd")
const Names = preload("res://scripts/learning/name_validation.gd")
const Saves = preload("res://scripts/save/save_system.gd")
const MAX_HINTS := 5

signal changed
signal bone_changed(id: String)
signal completed

var catalog: Dictionary = {}
var bones: Array = []
var difficulty := "easy"
var bone_states: Dictionary = {}
var selected_id := ""
var elapsed := 0.0
var guide_enabled := true
var guide_opacity := 0.18
var reduced_motion := false
var phase := "menu"
var hints_used: Array = []
var stage_id := "hand"
var has_session := false
var stage_records: Dictionary = {}
var save_path := "user://save_v1.json"
var save_error := ""
var _definitions: Dictionary = {}
var _dirty := false
var _save_clock := 0.0
var _display_clock := 0.0
var _saved_has_session := false

func initialize(catalog_path: String = "res://data/hand.json") -> void:
	var file := FileAccess.open(catalog_path, FileAccess.READ)
	if file == null:
		push_error("Missing anatomical catalog: res://data/hand.json")
		return
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not parsed is Dictionary or not parsed.get("bones") is Array:
		push_error("Invalid anatomical catalog")
		return
	catalog = parsed
	bones = catalog.bones
	stage_id = str(catalog.get("stageId", "hand"))
	_definitions.clear()
	for bone in bones:
		_definitions[str(bone.id)] = bone
	_reset_pieces()
	var saved := _read_document()
	_restore_settings(saved.get("settings", {}))
	stage_records = saved.get("stages", {}).duplicate(true)
	_saved_has_session = saved.get("has_session", false) == true
	set_process(false)

func start_new(mode: String) -> void:
	difficulty = mode if mode in ["easy", "normal", "hard"] else "easy"
	_reset_pieces()
	selected_id = ""
	elapsed = 0.0
	hints_used.clear()
	has_session = true
	phase = "intro"
	set_process(false)
	save_game()
	changed.emit()

func start_play() -> void:
	if not has_session:
		return
	phase = "completed" if placed_count() == bones.size() else "playing"
	set_process(phase == "playing")
	save_game()
	changed.emit()

func restart() -> void:
	start_new(difficulty)

func select_bone(id: String) -> void:
	if id.is_empty() or _definitions.has(id):
		selected_id = id
		changed.emit()

func bone_definition(id: String) -> Dictionary:
	return _definitions.get(id, {})

func set_transform(id: String, position: Vector3, rotation: Quaternion) -> void:
	if not bone_states.has(id) or bone_states[id].placed or not position.is_finite() or not rotation.is_finite() or rotation.length_squared() < 0.0001:
		return
	var normalized := rotation.normalized()
	bone_states[id].transform = {"position": [position.x, position.y, position.z], "rotation": [normalized.x, normalized.y, normalized.z, normalized.w]}
	_dirty = true
	bone_changed.emit(id)

func try_snap(id: String) -> bool:
	if not bone_states.has(id) or bone_states[id].placed:
		return false
	var transform_data: Dictionary = bone_states[id].transform
	var p: Array = transform_data.position
	var q: Array = transform_data.rotation
	var valid := Snap.can_snap(_definitions[id], Vector3(p[0], p[1], p[2]), Quaternion(q[0], q[1], q[2], q[3]), difficulty)
	if valid:
		bone_states[id].placed = true
		bone_states[id].transform = {"position": _definitions[id].targetPosition.duplicate(), "rotation": _definitions[id].targetRotation.duplicate()}
		bone_changed.emit(id)
		if placed_count() == bones.size():
			phase = "completed"
			set_process(false)
	save_game()
	changed.emit()
	if valid and phase == "completed":
		completed.emit()
	return valid

func save_label(id: String, value: String) -> void:
	if not bone_states.has(id):
		return
	bone_states[id].userLabel = value.left(120)
	bone_states[id].nameVerified = bone_states[id].nameVerified and Names.validate_name(value, _definitions[id])
	_dirty = true
	changed.emit()

func check_name(id: String, value: String) -> bool:
	if not bone_states.has(id):
		return false
	var valid := Names.validate_name(value, _definitions[id])
	bone_states[id].userLabel = value.left(120)
	bone_states[id].nameVerified = valid
	save_game()
	changed.emit()
	return valid

func reveal_hint(id: String) -> bool:
	if not bone_states.has(id):
		return false
	if bone_states[id].hintShown:
		return true
	if hints_used.size() >= MAX_HINTS:
		return false
	bone_states[id].hintShown = true
	hints_used.append(id)
	save_game()
	changed.emit()
	return true

func hints_remaining() -> int:
	return MAX_HINTS - hints_used.size()

func placed_count() -> int:
	var count := 0
	for state in bone_states.values():
		if state.placed:
			count += 1
	return count

func verified_count() -> int:
	var count := 0
	for state in bone_states.values():
		if state.nameVerified:
			count += 1
	return count

func set_guide(enabled: bool, opacity: float = -1.0) -> void:
	guide_enabled = enabled
	if opacity >= 0.0:
		guide_opacity = clampf(opacity, 0.05, 0.25)
	save_game()
	changed.emit()

func set_motion(enabled: bool) -> void:
	reduced_motion = enabled
	save_game()
	changed.emit()

func set_paused(paused: bool) -> void:
	if paused and phase == "playing":
		phase = "paused"
	elif not paused and phase == "paused":
		phase = "playing"
	set_process(phase == "playing")
	save_game()
	changed.emit()

func save_game() -> bool:
	if has_session:
		stage_records[stage_id] = {"difficulty": difficulty, "bone_states": bone_states.duplicate(true), "elapsed": elapsed, "completed": placed_count() == bones.size()}
	var document := {"version": Saves.VERSION, "stage_id": stage_id, "has_session": has_session or _saved_has_session, "stages": stage_records, "settings": {"guide_enabled": guide_enabled, "guide_opacity": guide_opacity, "reduced_motion": reduced_motion}}
	var success := Saves.save_data(save_path, document)
	save_error = "" if success else "Progress could not be written to disk. This session remains playable."
	if success:
		_dirty = false
		_save_clock = 0.0
	return success

func has_save() -> bool:
	var document := _read_document()
	return document.get("has_session", false) == true

func load_game() -> bool:
	var document := _read_document()
	if not bool(document.get("has_session", false)) or not document.get("stages") is Dictionary:
		return false
	var record: Dictionary = document.stages.get(stage_id, {})
	if not _validate_record(record):
		return false
	_restore_settings(document.get("settings", {}))
	stage_records = document.stages.duplicate(true)
	bone_states = record.bone_states.duplicate(true)
	difficulty = record.difficulty if record.get("difficulty") in ["easy", "normal", "hard"] else "easy"
	elapsed = maxf(0.0, float(record.get("elapsed", 0.0)))
	hints_used.clear()
	for bone in bones:
		var id := str(bone.id)
		var state: Dictionary = bone_states[id]
		if state.placed:
			state.transform = {"position": bone.targetPosition.duplicate(), "rotation": bone.targetRotation.duplicate()}
		state.nameVerified = state.nameVerified and Names.validate_name(state.userLabel, bone)
		if state.hintShown:
			hints_used.append(id)
	selected_id = ""
	has_session = true
	phase = "completed" if placed_count() == bones.size() else "playing"
	set_process(phase == "playing")
	changed.emit()
	return true

func _read_document() -> Dictionary:
	var document := Saves.load_data(save_path)
	if not document.get("has_session", false) is bool:
		return {}
	if document.get("has_session", false) == true:
		if not document.get("stages") is Dictionary or not _validate_record(document.stages.get(stage_id, {})):
			document = Saves.load_data(save_path + ".bak")
			if not document.get("stages") is Dictionary or not _validate_record(document.stages.get(stage_id, {})):
				return {}
	if not document.get("stages", {}) is Dictionary:
		return {}
	return document

func _process(delta: float) -> void:
	if phase != "playing":
		return
	elapsed += delta
	_save_clock += delta
	_display_clock += delta
	if _save_clock >= (0.75 if _dirty else 5.0):
		save_game()
	if _display_clock >= 1.0:
		_display_clock = 0.0
		changed.emit()

func _reset_pieces() -> void:
	bone_states.clear()
	for bone in bones:
		bone_states[str(bone.id)] = {"transform": bone.initialTransform.duplicate(true), "placed": false, "userLabel": "", "nameVerified": false, "hintShown": false}

func _restore_settings(value: Variant) -> void:
	if not value is Dictionary:
		return
	guide_enabled = value.get("guide_enabled", true) == true
	var opacity: Variant = value.get("guide_opacity", 0.18)
	guide_opacity = clampf(float(opacity), 0.05, 0.25) if _number(opacity) else 0.18
	reduced_motion = value.get("reduced_motion", false) == true

func _validate_record(value: Variant) -> bool:
	if not value is Dictionary or not value.get("bone_states") is Dictionary:
		return false
	var states: Dictionary = value.bone_states
	if states.size() != bones.size() or bones.is_empty() or not _number(value.get("elapsed", 0)):
		return false
	var hint_count := 0
	for bone in bones:
		var state: Variant = states.get(str(bone.id))
		if not state is Dictionary or not state.get("transform") is Dictionary:
			return false
		var transform_data: Dictionary = state.transform
		if not _numeric_array(transform_data.get("position"), 3) or not _numeric_array(transform_data.get("rotation"), 4):
			return false
		var q: Array = transform_data.rotation
		if absf(Quaternion(q[0], q[1], q[2], q[3]).length() - 1.0) > 0.01:
			return false
		if not state.get("userLabel") is String or state.userLabel.length() > 120:
			return false
		for flag in ["placed", "nameVerified", "hintShown"]:
			if not state.get(flag) is bool:
				return false
		if state.hintShown:
			hint_count += 1
	return hint_count <= MAX_HINTS

func _numeric_array(value: Variant, size: int) -> bool:
	if not value is Array or value.size() != size:
		return false
	for number in value:
		if not _number(number) or absf(float(number)) >= 100.0:
			return false
	return true

func _number(value: Variant) -> bool:
	return (value is float or value is int) and is_finite(float(value))
