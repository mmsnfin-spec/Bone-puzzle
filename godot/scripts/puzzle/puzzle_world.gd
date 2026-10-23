class_name PuzzleWorld
extends Node3D
## Stage-independent scene controller. Model poses are event driven; dragging
## projects onto a camera-facing target plane and preserves the grab offset.

const PieceScript = preload("res://scripts/puzzle/bone_piece.gd")
const GuideScript = preload("res://scripts/puzzle/guide_system.gd")
const CameraScript = preload("res://scripts/camera/orbit_camera.gd")
const IntroScript = preload("res://scripts/physics/physics_intro.gd")

signal piece_selected(id: String)
signal feedback(message: String)

var session: Node
var pieces: Dictionary = {}
var scene_cache: Dictionary = {}
var guide: Node3D
var orbit: Node3D
var intro: Node3D
var observing: bool = false
var _normal_material: StandardMaterial3D
var _selected_material: StandardMaterial3D
var _placed_material: StandardMaterial3D
var _drag_id: String = ""
var _drag_plane: Plane
var _drag_offset := Vector3.ZERO
var _drag_start := Vector2.ZERO
var _drag_moved: bool = false
var _intro_active: bool = false
var _snapping: Dictionary = {}
var _known_placed: Dictionary = {}
var _built: bool = false

func setup(game_session: Node) -> void:
	if _built:
		return
	_built = true
	session = game_session
	_create_lighting()
	_create_materials()
	orbit = CameraScript.new()
	orbit.name = "OrbitCamera"
	add_child(orbit)
	intro = IntroScript.new()
	intro.name = "PhysicsIntro"
	add_child(intro)
	for data: Dictionary in session.bones:
		var model_path := str(data.modelPath)
		if not scene_cache.has(model_path):
			var resource := load(model_path) as PackedScene
			if resource == null:
				feedback.emit("Unable to load anatomical model: " + model_path)
				continue
			scene_cache[model_path] = resource
		var piece := PieceScript.new()
		piece.build(data, scene_cache[model_path], _normal_material, _selected_material, _placed_material)
		add_child(piece)
		var s: Array = data.get("targetScale", [1, 1, 1])
		piece.scale = Vector3(float(s[0]), float(s[1]), float(s[2]))
		pieces[str(data.id)] = piece
		_known_placed[str(data.id)] = false
	guide = GuideScript.new()
	guide.name = "AssemblyGuide"
	add_child(guide)
	guide.build(session.bones, scene_cache)
	session.bone_changed.connect(_on_bone_changed)
	session.changed.connect(_sync_session)
	for bone_id: String in pieces:
		_apply_state(bone_id, false)
	_sync_session()
	get_window().focus_exited.connect(_cancel_drag)

func start_intro() -> void:
	_cancel_drag()
	_intro_active = true
	observing = false
	reset_camera()
	orbit.set_mode("anatomy")
	orbit.set_sidebar_layout(false)
	for piece: Node3D in pieces.values():
		piece.visible = false
		piece.set_pickable(false)
	guide.visible = false
	intro.start(session.bones, scene_cache, _normal_material)

func finish_intro() -> void:
	_intro_active = false
	intro.stop()
	orbit.set_mode("puzzle")
	orbit.set_sidebar_layout(true)
	for bone_id: String in pieces:
		pieces[bone_id].visible = true
		pieces[bone_id].set_pickable(true)
		_apply_state(bone_id, false)
	_sync_session()

func reset_camera() -> void:
	if orbit != null:
		orbit.reset_view()

func set_observing(enabled: bool) -> void:
	observing = enabled
	orbit.set_mode("anatomy" if enabled else "puzzle")
	_cancel_drag()
	_sync_session()

func rotate_selected(axis: String, degrees: float) -> void:
	var bone_id: String = session.selected_id
	if not _can_manipulate(bone_id):
		return
	var piece: Node3D = pieces[bone_id]
	var axis_vector := Vector3.RIGHT if axis.to_upper() == "X" else (Vector3.UP if axis.to_upper() == "Y" else Vector3.BACK)
	var rotation := (Quaternion(axis_vector, deg_to_rad(degrees)) * piece.quaternion).normalized()
	session.set_transform(bone_id, piece.position, rotation)

func nudge_selected(delta: Vector3) -> void:
	var bone_id: String = session.selected_id
	if not _can_manipulate(bone_id):
		return
	var piece: Node3D = pieces[bone_id]
	session.set_transform(bone_id, _clamp_position(piece.position + delta), piece.quaternion)

func try_selected_snap() -> bool:
	var bone_id: String = session.selected_id
	if not _can_manipulate(bone_id):
		return false
	var snapped: bool = session.try_snap(bone_id)
	feedback.emit("Bone assembled." if snapped else "Position or rotation does not match. Move closer to the guide and try again.")
	return snapped

func active_dynamic_count() -> int:
	return intro.dynamic_count() if intro != null else 0

func _input(event: InputEvent) -> void:
	# Continue an already captured drag even when the cursor crosses a GUI panel.
	# Selection still starts in _unhandled_input, so UI clicks cannot grab bones.
	if _drag_id != "":
		if event is InputEventMouseMotion:
			_drag_to(event.position)
			get_viewport().set_input_as_handled()
		elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and not event.pressed:
			_finish_drag()
			get_viewport().set_input_as_handled()
	if orbit != null and event is InputEventMouseButton and not event.pressed:
		if event.button_index == MOUSE_BUTTON_RIGHT:
			orbit.orbiting = false
		elif event.button_index == MOUSE_BUTTON_MIDDLE:
			orbit.panning = false

func _unhandled_input(event: InputEvent) -> void:
	if not _built or _intro_active:
		return
	var interactive: bool = session.phase == "playing" and not observing
	if not interactive and not observing and session.phase != "completed":
		return
	if _drag_id != "":
		return
	if orbit.handle_event(event):
		get_viewport().set_input_as_handled()
		return
	if not interactive:
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		_begin_drag(event.position)
		if _drag_id != "":
			get_viewport().set_input_as_handled()
	if event is InputEventKey and event.pressed and not event.echo:
		var step := 0.025 if event.shift_pressed else 0.1
		var angle := -5.0 if event.shift_pressed else 5.0
		match event.keycode:
			KEY_X:
				rotate_selected("X", angle)
			KEY_Y:
				rotate_selected("Y", angle)
			KEY_Z:
				rotate_selected("Z", angle)
			KEY_Q:
				rotate_selected("Z", -5.0 if event.shift_pressed else -15.0)
			KEY_E:
				rotate_selected("Z", 5.0 if event.shift_pressed else 15.0)
			KEY_LEFT:
				nudge_selected(Vector3(-step, 0, 0))
			KEY_RIGHT:
				nudge_selected(Vector3(step, 0, 0))
			KEY_UP:
				nudge_selected(Vector3(0, step, 0))
			KEY_DOWN:
				nudge_selected(Vector3(0, -step, 0))
			KEY_PAGEUP:
				nudge_selected(Vector3(0, 0, -step))
			KEY_PAGEDOWN:
				nudge_selected(Vector3(0, 0, step))
			KEY_SPACE, KEY_ENTER, KEY_KP_ENTER:
				try_selected_snap()
			_:
				return
		get_viewport().set_input_as_handled()

func _begin_drag(screen_position: Vector2) -> void:
	var camera: Camera3D = orbit.camera
	var ray_origin := camera.project_ray_origin(screen_position)
	var ray_direction := camera.project_ray_normal(screen_position)
	var query := PhysicsRayQueryParameters3D.create(ray_origin, ray_origin + ray_direction * 150.0, 1)
	query.collide_with_areas = true
	query.collide_with_bodies = false
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	if hit.is_empty():
		return
	var collider: Object = hit.collider
	if not collider.has_meta("bone_id"):
		return
	var bone_id := str(collider.get_meta("bone_id"))
	get_viewport().gui_release_focus()
	session.select_bone(bone_id)
	piece_selected.emit(bone_id)
	if not _can_manipulate(bone_id):
		return
	var piece: Node3D = pieces[bone_id]
	var data: Dictionary = piece.definition
	var p: Array = data.targetPosition
	var target := Vector3(float(p[0]), float(p[1]), float(p[2]))
	_drag_plane = Plane(ray_direction.normalized(), target)
	var plane_hit: Variant = _drag_plane.intersects_ray(ray_origin, ray_direction)
	if plane_hit == null:
		return
	# Keep depth untouched until the first real movement; then use the same
	# target-plane projection as the original, with no lateral grab jump.
	var projected := _drag_plane.project(piece.position)
	_drag_offset = projected - Vector3(plane_hit)
	_drag_id = bone_id
	_drag_start = screen_position
	_drag_moved = false
	orbit.set_locked(true)

func _drag_to(screen_position: Vector2) -> void:
	if screen_position.distance_to(_drag_start) > 4.0:
		_drag_moved = true
	if not _drag_moved:
		return
	var camera: Camera3D = orbit.camera
	var origin := camera.project_ray_origin(screen_position)
	var direction := camera.project_ray_normal(screen_position)
	var hit: Variant = _drag_plane.intersects_ray(origin, direction)
	if hit == null:
		return
	var piece: Node3D = pieces[_drag_id]
	var destination := _clamp_position(Vector3(hit) + _drag_offset)
	# Direct transforms avoid a per-frame rigid-body/kinematic simulation.
	session.set_transform(_drag_id, destination, piece.quaternion)

func _finish_drag() -> void:
	var bone_id := _drag_id
	var moved := _drag_moved
	_cancel_drag()
	if moved and bone_id != "":
		var snapped: bool = session.try_snap(bone_id)
		feedback.emit("Bone assembled." if snapped else "Not aligned yet. Rotate with X / Y / Z; Shift reverses rotation.")

func _cancel_drag() -> void:
	_drag_id = ""
	_drag_moved = false
	if orbit != null:
		orbit.set_locked(false)

func _can_manipulate(bone_id: String) -> bool:
	return bone_id != "" and pieces.has(bone_id) and session.phase == "playing" and not observing and not _intro_active and not session.bone_states[bone_id].placed

func _on_bone_changed(bone_id: String) -> void:
	if not pieces.has(bone_id) or _intro_active:
		return
	_apply_state(bone_id, true)
	_sync_session()

func _apply_state(bone_id: String, animate_snap: bool) -> void:
	var state: Dictionary = session.bone_states.get(bone_id, {})
	if state.is_empty():
		return
	var piece: Node3D = pieces[bone_id]
	var p: Array = state.transform.position
	var q: Array = state.transform.rotation
	var destination := Vector3(float(p[0]), float(p[1]), float(p[2]))
	var rotation := Quaternion(float(q[0]), float(q[1]), float(q[2]), float(q[3])).normalized()
	var newly_placed: bool = state.placed and not _known_placed.get(bone_id, false)
	_known_placed[bone_id] = state.placed
	if _snapping.has(bone_id):
		var previous: Tween = _snapping[bone_id]
		if previous.is_valid():
			previous.kill()
		_snapping.erase(bone_id)
	if animate_snap and newly_placed and not session.reduced_motion:
		var tween := create_tween().set_parallel(true)
		tween.tween_property(piece, "position", destination, 0.22).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		tween.tween_property(piece, "quaternion", rotation, 0.22).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		_snapping[bone_id] = tween
	else:
		if not piece.position.is_equal_approx(destination):
			piece.position = destination
		if not piece.quaternion.is_equal_approx(rotation):
			piece.quaternion = rotation
	piece.set_status(session.selected_id == bone_id, state.placed)

func _sync_session() -> void:
	if not _built:
		return
	if session.phase == "paused":
		_cancel_drag()
	for bone_id: String in pieces:
		var state: Dictionary = session.bone_states.get(bone_id, {})
		pieces[bone_id].set_status(session.selected_id == bone_id, state.get("placed", false))
	guide.sync(session, session.phase == "playing" and not observing and not _intro_active)

func _clamp_position(value: Vector3) -> Vector3:
	return Vector3(clampf(value.x, -7.0, 7.0), clampf(value.y, -3.7, 6.0), clampf(value.z, -5.0, 5.0))

func _create_materials() -> void:
	_normal_material = StandardMaterial3D.new()
	_normal_material.albedo_color = Color("d5d0c2")
	_normal_material.roughness = 0.82
	_normal_material.metallic_specular = 0.16
	_selected_material = _normal_material.duplicate()
	_selected_material.albedo_color = Color("fff0d4")
	_selected_material.emission_enabled = true
	_selected_material.emission = Color("65523b")
	_selected_material.emission_energy_multiplier = 0.12
	_placed_material = _normal_material.duplicate()
	_placed_material.albedo_color = Color("ddd7c8")

func _create_lighting() -> void:
	var environment_node := WorldEnvironment.new()
	var environment := Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color("050505")
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color("d9dce6")
	environment.ambient_light_energy = 0.1
	environment.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	environment_node.environment = environment
	add_child(environment_node)
	var key := DirectionalLight3D.new()
	key.name = "AnatomyKeyLight"
	key.rotation_degrees = Vector3(-38, -50, 0)
	key.light_energy = 0.5
	key.shadow_enabled = true
	key.directional_shadow_mode = DirectionalLight3D.SHADOW_ORTHOGONAL
	add_child(key)
	var fill := DirectionalLight3D.new()
	fill.name = "AnatomyFillLight"
	fill.rotation_degrees = Vector3(-20, 145, 0)
	fill.light_color = Color("b5bfd3")
	fill.light_energy = 0.12
	fill.shadow_enabled = false
	add_child(fill)
