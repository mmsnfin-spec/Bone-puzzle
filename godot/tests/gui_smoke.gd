extends SceneTree
## Real GUI integration test. Run with a display, not --headless, to capture evidence.
## Uses an isolated save file and never rewrites the player's normal save.

var app: Variant
var failures: Array[String] = []
var checks := 0
var report: Dictionary = {}
var evidence_dir := "res://build/evidence"
var pointer_assembled := 0

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(evidence_dir))
	var started := Time.get_ticks_msec()
	var scene: PackedScene = load("res://scenes/main/main.tscn")
	if scene == null:
		_check(false, "Main scene loads")
		_finish(started)
		return
	app = scene.instantiate()
	root.add_child(app)
	await process_frame
	app.session.save_path = "user://integration/gui_smoke.json"
	for suffix in ["", ".bak", ".tmp"]:
		DirAccess.remove_absolute(ProjectSettings.globalize_path(app.session.save_path + suffix))
	app.session.set_guide(true, 0.18)
	app.session.set_motion(false)
	_check(app.screen == "title", "App begins at title")
	var title_labels: Array[String] = []
	_collect_labels(app.ui, title_labels)
	_check(title_labels.size() == 2 and title_labels.has("BONE PUZZLE") and title_labels.has("아무 key나 눌러 시작하시오"), "Title contains only required two labels")
	_check(app.world == null, "Title has no 3D world")
	await _capture("01-title.png")
	_key(KEY_A, true, false)
	await process_frame
	_check(app.screen == "menu", "Ordinary key opens stage menu")
	_key(KEY_A, true, true)
	_key(KEY_A, false, false)
	await process_frame
	_check(app.screen == "menu", "Held-key echo does not launch another screen")
	app.screen = "title"
	app.ui.show_title()
	var title_click := InputEventMouseButton.new()
	title_click.button_index = MOUSE_BUTTON_LEFT
	title_click.pressed = true
	title_click.position = Vector2(400, 300)
	Input.parse_input_event(title_click)
	await process_frame
	_check(app.screen == "menu", "Mouse click also leaves title")
	title_click.pressed = false
	Input.parse_input_event(title_click)
	await _capture("02-stage-select.png")
	_press_button("설정")
	_check(app.screen == "settings", "Stage menu opens Settings control")
	var checkboxes: Array[CheckBox] = []
	_collect_checkboxes(app.ui, checkboxes)
	_check(checkboxes.size() == 2, "Settings provides motion and guide controls")
	if checkboxes.size() == 2:
		checkboxes[1].button_pressed = false
		_check(not app.session.guide_enabled, "Settings guide control changes persistent preference")
		checkboxes[1].button_pressed = true
	_press_button("← 돌아가기 · Esc")
	_check(app.screen == "menu", "Settings returns to stage menu")
	_press_button("About / Credits")
	_check(app.screen == "credits", "Stage menu opens Credits control")
	var credit_labels: Array[String] = []
	_collect_labels(app.ui, credit_labels)
	_check(" ".join(credit_labels).contains("BodyParts3D") and " ".join(credit_labels).contains("CC BY-SA 2.1 Japan"), "Credits includes anatomical source and license")
	await _capture("07-credits.png")
	_press_button("← 돌아가기 · Esc")
	_press_button("HAND     /     오른손 27 BONES     →")
	await _wait_screen("intro", 600)
	_check(app.world != null and app.session.bones.size() == 27, "HAND loads 27 definitions")
	_check(_node_count(app.world, "MeshInstance3D") >= 27, "HAND meshes instantiate")
	_check(app.world.active_dynamic_count() == 0, "Intro begins assembled with frozen bodies")
	await create_timer(1.95).timeout
	_check(app.world.active_dynamic_count() == 27, "Only falling intro enables 27 dynamic bodies")
	await _capture("03-intro-fall.png")
	app._begin_play()
	await process_frame
	_check(app.screen == "game" and app.session.phase == "playing", "Skip enters puzzle gameplay")
	_check(app.world.active_dynamic_count() == 0, "Gameplay has zero dynamic bodies")
	await _capture("04-game-guide-on.png")
	for size in [Vector2i(1280, 720), Vector2i(1920, 1080)]:
		root.size = size
		await process_frame
		await process_frame
		_check(_top_level_controls_fit(), "Essential gameplay controls fit %dx%d" % [size.x, size.y])
		await _capture("game-%dx%d.png" % [size.x, size.y])
	var guide: Variant = _find_guide(app.world)
	_check(guide != null and guide.visible, "Guide branch is visible when enabled")
	_key(KEY_G, true, false)
	_key(KEY_G, false, false)
	await process_frame
	_check(not app.session.guide_enabled and guide != null and not guide.visible, "G disables actual guide rendering")
	_check(not app.ui._opacity.editable, "GUIDE OFF disables opacity slider")
	await _capture("05-game-guide-off.png")
	for bone: Dictionary in app.session.bones:
		var id := str(bone.id)
		var transform_before: Dictionary = app.session.bone_states[id].transform.duplicate(true)
		app.ui._pieces[id].pressed.emit()
		app.world.rotate_selected("x", 5.0)
		app.world.rotate_selected("y", 5.0)
		app.world.rotate_selected("z", 5.0)
		app.world.nudge_selected(Vector3(0.05, 0.0, 0.0))
		_check(app.session.selected_id == id and app.session.bone_states[id].transform != transform_before, "Piece Index selects and manipulates " + id)
	var first: Dictionary = app.session.bones[0]
	var first_id := str(first.id)
	await _exercise_camera_and_drag(first_id)
	app.session.select_bone(first_id)
	var initial_q: Array = app.session.bone_states[first_id].transform.rotation.duplicate()
	app.world.rotate_selected("x", 15.0)
	var rotated_q: Array = app.session.bone_states[first_id].transform.rotation
	_check(initial_q != rotated_q, "Selected bone rotates about requested axis")
	var initial_p: Array = app.session.bone_states[first_id].transform.position.duplicate()
	app.world.nudge_selected(Vector3(0.05, 0.0, 0.0))
	_check(initial_p != app.session.bone_states[first_id].transform.position, "Keyboard precision movement changes selected transform")
	_check(app.session.selected_id == first_id, "Piece Index/API selects a small bone")
	await _exercise_name_controls(first_id, str(first.englishName))
	_press_button("Pause · Esc")
	_check(app.screen == "pause" and app.session.phase == "paused", "Pause freezes session timer")
	var paused_time: float = app.session.elapsed
	await create_timer(0.15).timeout
	_check(is_equal_approx(paused_time, app.session.elapsed), "Elapsed time remains frozen while paused")
	_press_button("설정")
	_check(app.screen == "settings" and app.session.phase == "paused", "Pause settings preserve paused simulation")
	_press_button("← 돌아가기 · Esc")
	_check(app.screen == "pause", "Pause settings return to pause menu")
	_press_button("재개 · Esc")
	_check(app.screen == "game" and app.session.phase == "playing", "Resume returns to game")
	_check(app.session.check_name(first_id, "  " + str(first.englishName).to_upper() + "  "), "Name verification works in integrated session")
	_check(app.session.reveal_hint(first_id), "Hint can be opened")
	_check(app.session.save_game(), "Integrated session save succeeds")
	app._show_menu()
	await process_frame
	_check(app.world == null and app.session.has_save(), "Stage menu releases world and preserves save")
	app._continue_game()
	await _wait_screen("game", 600)
	_check(not app.session.guide_enabled and not _find_guide(app.world).visible, "Continue restores GUIDE OFF")
	_check(app.session.verified_count() == 1 and app.session.hints_used.size() == 1, "Continue restores learning and hint state")
	for bone: Dictionary in app.session.bones:
		var position_data: Array = bone.targetPosition
		var rotation_data: Array = bone.targetRotation
		app.session.set_transform(str(bone.id), Vector3(position_data[0], position_data[1], position_data[2]), Quaternion(rotation_data[0], rotation_data[1], rotation_data[2], rotation_data[3]))
		_check(app.session.try_snap(str(bone.id)), "GUIDE OFF snap " + str(bone.id))
	await create_timer(0.35).timeout
	_check(app.session.placed_count() == 27 and app.screen == "completed", "All 27 assembled triggers completion screen")
	_check(app.world.active_dynamic_count() == 0, "Completion remains physics free")
	await _capture("06-completion.png")
	app._on_action("restart", null)
	await _wait_screen("intro", 600)
	app._begin_play()
	await process_frame
	_check(app.session.placed_count() == 0 and app.session.verified_count() == 0 and app.session.hints_used.is_empty(), "Replay resets assembly, naming, and hints")
	_check(not app.session.guide_enabled, "Replay preserves guide preference")
	_check(app.world.active_dynamic_count() == 0, "Replay has no lingering intro bodies")
	pointer_assembled = await _pointer_playthrough()
	_check(pointer_assembled == 27 and app.screen == "completed", "Actual ray-pick and pointer drag assembles all27 Easy pieces with GUIDE OFF")
	await _capture("08-pointer-playthrough-complete.png")
	app._show_menu()
	await process_frame
	_check(app.world == null, "Repeated stage exit releases world")
	_finish(started)

func _pointer_playthrough() -> int:
	# Unlike the earlier exact-target state tests, this playthrough never writes
	# a target transform: camera projection, ray selection, pointer movement,
	# drag-plane conversion and release perform every assembly operation.
	var assembled := 0
	for pass_index in 5:
		for candidate: Dictionary in app.session.bones:
			if app.session.bone_states[str(candidate.id)].placed:
				continue
			await physics_frame
			var world: Variant = app.world
			var camera: Camera3D = world.orbit.camera
			var piece: Node3D = world.pieces[str(candidate.id)]
			var source_screen := camera.unproject_position(piece.global_position)
			world._begin_drag(source_screen)
			var picked_id: String = world._drag_id
			if picked_id.is_empty():
				continue
			var actual_bone: Dictionary = app.session.bone_definition(picked_id)
			var goal: Array = actual_bone.targetPosition
			var target_screen := camera.unproject_position(Vector3(goal[0], goal[1], goal[2]))
			var move := InputEventMouseMotion.new()
			move.position = target_screen
			move.relative = target_screen - source_screen
			move.button_mask = MOUSE_BUTTON_MASK_LEFT
			Input.parse_input_event(move)
			await process_frame
			var release := InputEventMouseButton.new()
			release.button_index = MOUSE_BUTTON_LEFT
			release.position = target_screen
			release.pressed = false
			Input.parse_input_event(release)
			await process_frame
			if app.session.bone_states[picked_id].placed:
				assembled += 1
				print("POINTER_ASSEMBLED: ", picked_id, " count=", assembled)
			await create_timer(0.24).timeout
			if assembled == 27:
				return assembled
	return assembled

func _exercise_name_controls(bone_id: String, official_name: String) -> void:
	var input: LineEdit = app.ui._name_input
	input.text = "learning note"
	_press_button("Save note")
	_check(app.session.bone_states[bone_id].userLabel == "learning note" and not app.session.bone_states[bone_id].nameVerified, "Save note stores text without granting name credit")
	input.grab_focus()
	var guide_before: bool = app.session.guide_enabled
	var transform_before: Dictionary = app.session.bone_states[bone_id].transform.duplicate(true)
	for keycode in [KEY_G, KEY_Q, KEY_E, KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN]:
		_key(keycode, true, false)
		_key(keycode, false, false)
	await process_frame
	_check(app.session.guide_enabled == guide_before, "Typing G in name field does not toggle guide")
	_check(app.session.bone_states[bone_id].transform == transform_before, "Text-field Q/E/arrows do not manipulate the bone")
	_check(input.text.contains("g"), "Name field accepts ordinary typed letters")
	input.text = ""
	input.grab_focus()
	for keycode in [KEY_N, KEY_O, KEY_T, KEY_E]:
		_key(keycode, true, false)
		_key(keycode, false, false)
	await process_frame
	_check(app.session.bone_states[bone_id].userLabel == "note", "Typed note enters session state before explicit Save")
	_press_button("Pause · Esc")
	_press_button("재개 · Esc")
	input = app.ui._name_input
	_check(input.text == "note", "Unsaved typed note survives pause and resume")
	app.ui._pieces[str(app.session.bones[1].id)].pressed.emit()
	app.ui._pieces[bone_id].pressed.emit()
	_check(app.ui._name_input.text == "note", "Typed note survives selection change without explicit Save")
	input = app.ui._name_input
	input.grab_focus()
	input.text = official_name
	_key(KEY_ENTER, true, false)
	_key(KEY_ENTER, false, false)
	await process_frame
	_check(app.session.bone_states[bone_id].nameVerified, "Enter in name field verifies the official name")
	input.release_focus()
	input.text = official_name.to_upper()
	_press_button("Check")
	_check(app.session.bone_states[bone_id].nameVerified, "Check button verifies case-insensitive official name")

func _top_level_controls_fit() -> bool:
	var viewport_rect := root.get_visible_rect().grow(2.0)
	for child in app.ui.root.get_children():
		if child is Control and child.is_visible_in_tree():
			if not viewport_rect.encloses(child.get_global_rect()):
				return false
	return true

func _press_button(text: String) -> void:
	var button := _find_button(app.ui, text)
	_check(button != null and not button.disabled, "UI control available: " + text)
	if button != null and not button.disabled:
		button.pressed.emit()

func _find_button(node: Node, text: String) -> Button:
	if node is Button and node.text == text:
		return node
	for child in node.get_children():
		var result := _find_button(child, text)
		if result != null:
			return result
	return null

func _collect_checkboxes(node: Node, result: Array[CheckBox]) -> void:
	if node is CheckBox:
		result.append(node)
	for child in node.get_children():
		_collect_checkboxes(child, result)

func _exercise_camera_and_drag(bone_id: String) -> void:
	var world: Variant = app.world
	var orbit: Variant = world.orbit
	var camera: Camera3D = orbit.camera
	var yaw_before: float = orbit.yaw
	var right := InputEventMouseButton.new()
	right.button_index = MOUSE_BUTTON_RIGHT
	right.pressed = true
	orbit.handle_event(right)
	var orbit_motion := InputEventMouseMotion.new()
	orbit_motion.relative = Vector2(35, -10)
	orbit.handle_event(orbit_motion)
	right.pressed = false
	orbit.handle_event(right)
	_check(not is_equal_approx(yaw_before, orbit.yaw), "Camera orbits from mouse motion")
	var zoom_before: float = orbit.zoom_size
	var wheel := InputEventMouseButton.new()
	wheel.button_index = MOUSE_BUTTON_WHEEL_UP
	wheel.pressed = true
	orbit.handle_event(wheel)
	_check(orbit.zoom_size < zoom_before, "Mouse wheel zoom changes view size")
	var target_before: Vector3 = orbit.target
	var middle := InputEventMouseButton.new()
	middle.button_index = MOUSE_BUTTON_MIDDLE
	middle.pressed = true
	orbit.handle_event(middle)
	var pan_motion := InputEventMouseMotion.new()
	pan_motion.relative = Vector2(15, 5)
	orbit.handle_event(pan_motion)
	middle.pressed = false
	orbit.handle_event(middle)
	_check(not orbit.target.is_equal_approx(target_before), "Middle mouse pans camera")
	# Put the source model in clear space, then ray-pick at its projected center.
	# The camera has deliberately been orbited/panned first to catch stale planes.
	app.session.set_transform(bone_id, Vector3(-3.0, 1.0, 0.0), Quaternion.IDENTITY)
	await physics_frame
	await process_frame
	var piece: Node3D = world.pieces[bone_id]
	var screen_position := camera.unproject_position(piece.global_position)
	world._begin_drag(screen_position)
	_check(world._drag_id == bone_id and orbit.locked, "Ray selection starts drag and locks camera after orbit")
	if world._drag_id != bone_id:
		world._cancel_drag()
		return
	var locked_yaw: float = orbit.yaw
	var locked_pitch: float = orbit.pitch
	var drag_motion := InputEventMouseMotion.new()
	drag_motion.position = screen_position + Vector2(20, 0)
	drag_motion.relative = Vector2(20, 0)
	world._input(drag_motion)
	var projected_after := camera.unproject_position(piece.global_position)
	_check(projected_after.distance_to(drag_motion.position) < 2.0, "Drag preserves screen grab offset with a rotated camera")
	_check(is_equal_approx(locked_yaw, orbit.yaw) and is_equal_approx(locked_pitch, orbit.pitch), "Camera orientation remains locked during bone drag")
	world._finish_drag()
	_check(not orbit.locked and world._drag_id.is_empty(), "Release ends drag and unlocks camera")
	world.reset_camera()

func _wait_screen(expected: String, max_frames: int) -> void:
	for index in max_frames:
		if app.screen == expected:
			return
		await process_frame
	_check(false, "Timed out waiting for " + expected)

func _key(code: int, pressed: bool, echo: bool) -> void:
	var event := InputEventKey.new()
	event.keycode = code
	event.physical_keycode = code
	if code >= KEY_A and code <= KEY_Z:
		event.unicode = code + 32
	event.pressed = pressed
	event.echo = echo
	Input.parse_input_event(event)

func _collect_labels(node: Node, result: Array[String]) -> void:
	if node is Label and node.is_visible_in_tree():
		result.append(node.text)
	for child in node.get_children():
		_collect_labels(child, result)

func _node_count(node: Node, type_name: String) -> int:
	var count := 1 if node.is_class(type_name) else 0
	for child in node.get_children():
		count += _node_count(child, type_name)
	return count

func _find_guide(node: Node) -> Node3D:
	if node.get_script() != null and node.get_script().resource_path.ends_with("guide_system.gd"):
		return node as Node3D
	for child in node.get_children():
		var result := _find_guide(child)
		if result != null:
			return result
	return null

func _capture(filename: String) -> void:
	if DisplayServer.get_name() == "headless":
		return
	await process_frame
	# The minimal title intentionally uses low-processor mode and can sleep
	# without another frame_post_draw signal. Force just the evidence frame.
	RenderingServer.force_draw(false)
	var image := root.get_texture().get_image()
	_check(image.save_png(evidence_dir.path_join(filename)) == OK, "Capture " + filename)

func _check(condition: bool, description: String) -> void:
	checks += 1
	if not condition:
		failures.append(description)
		push_error("FAIL: " + description)
	else:
		print("PASS: " + description)

func _finish(started: int) -> void:
	report = {"engine": Engine.get_version_info().string, "display": DisplayServer.get_name(), "checks": checks, "failures": failures, "pointer_assembled": pointer_assembled, "duration_ms": Time.get_ticks_msec() - started, "windows_runtime_tested": false, "notes": "Linux GUI integration under software rendering; no Windows runtime certification. Separate all27 Easy ray-pick/pointer playthrough does not set target transforms directly."}
	var file := FileAccess.open(evidence_dir.path_join("gui-smoke.json"), FileAccess.WRITE)
	if file != null:
		file.store_string(JSON.stringify(report, "\t"))
	print("GUI_SMOKE_RESULT: ", JSON.stringify(report))
	if is_instance_valid(app):
		app.queue_free()
	await process_frame
	quit(0 if failures.is_empty() else 1)
