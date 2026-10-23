extends SceneTree

const Session = preload("res://scripts/core/game_session.gd")
const Snap = preload("res://scripts/puzzle/snap_system.gd")
const Names = preload("res://scripts/learning/name_validation.gd")
const Saves = preload("res://scripts/save/save_system.gd")

var assertions := 0
var failures: Array[String] = []
var session: Node
var save_path := "user://test_save_core.json"

func _initialize() -> void:
	call_deferred("_run")

func check(condition: bool, message: String) -> void:
	assertions += 1
	if not condition:
		failures.append(message)
		printerr("FAIL: ", message)

func _run() -> void:
	_remove_test_saves()
	session = Session.new()
	root.add_child(session)
	session.save_path = save_path
	session.initialize()
	check(session.bones.size() == 27, "27 real bones loaded")
	var categories := {"carpals": 0, "metacarpals": 0, "phalanges": 0}
	var ids: Dictionary = {}
	for bone in session.bones:
		categories[bone.category] += 1
		ids[bone.id] = true
		check(ResourceLoader.exists(bone.modelPath), "Model import exists: " + bone.id)
		check(bone.id == bone.fmaId, "FMA identity preserved: " + bone.id)
	check(ids.size() == 27 and categories == {"carpals": 8, "metacarpals": 5, "phalanges": 14}, "Unique bone/category invariants")
	_test_snap()
	_test_names()
	_test_session()
	_test_save()
	_test_completion()
	session.queue_free()
	_remove_test_saves()
	print("CORE_TESTS: ", assertions, " assertions; ", failures.size(), " failures")
	quit(0 if failures.is_empty() else 1)

func _test_snap() -> void:
	var bone := {"targetPosition": [0.0, 0.0, 0.0], "targetRotation": [0.0, 0.0, 0.0, 1.0], "snapDistance": 1.0}
	check(Snap.can_snap(bone, Vector3(1, 0, 0), Quaternion(Vector3.UP, 2.0), "easy"), "Easy distance boundary and auto rotation")
	check(not Snap.can_snap(bone, Vector3(1.001, 0, 0), Quaternion.IDENTITY, "easy"), "Easy rejects outside distance")
	check(Snap.can_snap(bone, Vector3(0.75, 0, 0), Quaternion(Vector3.UP, 0.349), "normal"), "Normal accepts distance and angular tolerance")
	check(not Snap.can_snap(bone, Vector3(0.751, 0, 0), Quaternion.IDENTITY, "normal"), "Normal rejects distance")
	check(not Snap.can_snap(bone, Vector3.ZERO, Quaternion(Vector3.UP, 0.351), "normal"), "Normal rejects rotation")
	check(Snap.can_snap(bone, Vector3(0.5, 0, 0), Quaternion(Vector3.RIGHT, 0.159), "hard"), "Hard accepts tight thresholds")
	check(not Snap.can_snap(bone, Vector3(0.501, 0, 0), Quaternion.IDENTITY, "hard"), "Hard rejects distance")
	check(not Snap.can_snap(bone, Vector3.ZERO, Quaternion(Vector3.RIGHT, 0.161), "hard"), "Hard rejects rotation")
	check(is_equal_approx(Snap.quaternion_angle(Quaternion.IDENTITY, -Quaternion.IDENTITY), 0.0), "q and -q have zero rotational error")
	check(is_equal_approx(Snap.quaternion_angle(Quaternion(0, 0, 0, 2), Quaternion.IDENTITY), 0.0), "Quaternion magnitudes normalized")
	check(is_inf(Snap.quaternion_angle(Quaternion(0, 0, 0, 0), Quaternion.IDENTITY)), "Zero quaternion rejected by angle")
	check(not Snap.can_snap(bone, Vector3(INF, 0, 0), Quaternion.IDENTITY, "easy"), "Non-finite position rejected")
	check(not Snap.can_snap(bone, Vector3.ZERO, Quaternion(NAN, 0, 0, 1), "easy"), "Non-finite rotation rejected")

func _test_names() -> void:
	var bone: Dictionary = session.bones[0]
	check(Names.validate_name("  TRAPEZOID  ", bone), "Name trims/case folds")
	check(Names.validate_name("right   trapezoid bone", bone), "Registered alias collapses whitespace")
	check(not Names.validate_name("trapezoid-ish", bone), "Unregistered near match rejected")
	check(not Names.validate_name("", bone), "Empty name rejected")
	check(not Names.validate_name(bone.koreanName, bone), "Only official English and registered aliases accepted")
	for definition in session.bones:
		check(Names.validate_name(definition.englishName, definition), "Official name accepted: " + definition.id)
		for alias in definition.acceptedAliases:
			check(Names.validate_name(alias, definition), "Registered alias accepted: " + definition.id + " / " + alias)

func _test_session() -> void:
	session.set_guide(false, 0.12)
	session.set_motion(true)
	session.start_new("normal")
	check(session.phase == "intro" and session.difficulty == "normal", "New session enters intro")
	check(not session.guide_enabled and is_equal_approx(session.guide_opacity, 0.12), "New session retains guide preference")
	session.start_play()
	check(session.phase == "playing", "Intro enters playing")
	session.set_paused(true)
	check(session.phase == "paused", "Pause transition")
	var before: float = session.elapsed
	session._process(2.0)
	check(session.elapsed == before, "Paused timer stopped")
	session.set_paused(false)
	session._process(1.25)
	check(is_equal_approx(session.elapsed, before + 1.25), "Playing timer advances")
	for i in range(5):
		check(session.reveal_hint(session.bones[i].id), "Distinct hint allowed " + str(i))
	check(session.hints_remaining() == 0, "Maximum five unique hints")
	check(session.reveal_hint(session.bones[0].id), "Reopening hint remains allowed")
	check(not session.reveal_hint(session.bones[5].id), "Sixth unique hint rejected")
	check(session.verified_count() == 0 and session.placed_count() == 0, "Hints do not verify or assemble")
	var id: String = session.bones[0].id
	check(not session.check_name(id, "wrong answer"), "Wrong answer reported")
	check(session.bone_states[id].userLabel == "wrong answer", "Incorrect learning memo persisted")
	check(session.check_name(id, "trapezoid"), "Correct name verifies")
	session.save_label(id, "wrong edit")
	check(not session.bone_states[id].nameVerified, "Editing verified label invalidates correctness")
	session.restart()
	check(session.phase == "intro" and session.hints_remaining() == 5 and session.elapsed == 0.0, "Restart resets stage play and hints")
	check(not session.guide_enabled and session.reduced_motion, "Restart retains general settings")

func _test_save() -> void:
	session.start_play()
	var bone: Dictionary = session.bones[0]
	var id: String = bone.id
	session.set_transform(id, Vector3(1, 2, 3), Quaternion(Vector3.UP, 0.2))
	session.check_name(id, "trapezoid")
	session.reveal_hint(id)
	session.elapsed = 123.5
	check(session.save_game(), "Save write succeeds")
	var restored := Session.new()
	root.add_child(restored)
	restored.save_path = save_path
	restored.initialize()
	check(restored.has_save(), "Continue detects valid save")
	restored.set_guide(true, 0.2)
	check(restored.has_save(), "Menu settings do not erase saved progress")
	check(restored.load_game(), "Saved game restores")
	check(restored.bone_states[id].transform.position == [1.0, 2.0, 3.0], "Bone position round trip")
	check(restored.bone_states[id].nameVerified and restored.hints_remaining() == 4, "Names and hints round trip")
	check(is_equal_approx(restored.elapsed, 123.5) and restored.guide_enabled, "Time and guide round trip")
	var file := FileAccess.open(save_path, FileAccess.WRITE)
	file.store_string("{corrupted")
	file.close()
	check(restored.load_game(), "Malformed primary restores backup")
	var malformed := Saves.load_data(save_path)
	malformed.stages.hand.bone_states[id].transform.rotation = [0.0, 0.0, 0.0, 0.0]
	Saves.save_data(save_path, malformed)
	DirAccess.remove_absolute(ProjectSettings.globalize_path(save_path + ".bak"))
	check(not restored.load_game(), "Non-unit quaternion save rejected safely")
	malformed.version = 999
	Saves.save_data(save_path, malformed)
	DirAccess.remove_absolute(ProjectSettings.globalize_path(save_path + ".bak"))
	check(not restored.has_save(), "Unsupported future version rejected")
	for invalid_version in [[], {}, "1", null, 1.5]:
		var invalid_document := {"version": invalid_version, "has_session": false}
		var invalid_file := FileAccess.open(save_path, FileAccess.WRITE)
		invalid_file.store_string(JSON.stringify(invalid_document))
		invalid_file.close()
		check(Saves.load_data(save_path).is_empty(), "Malformed version rejected without a script error: " + str(invalid_version))
	restored.queue_free()

func _test_completion() -> void:
	session.start_new("hard")
	session.start_play()
	session.set_guide(false)
	for bone in session.bones:
		var p: Array = bone.targetPosition
		var q: Array = bone.targetRotation
		session.set_transform(bone.id, Vector3(p[0], p[1], p[2]), Quaternion(q[0], q[1], q[2], q[3]))
		check(session.try_snap(bone.id), "Exact pose snaps with guide hidden: " + bone.id)
	check(session.placed_count() == 27 and session.phase == "completed", "All 27 complete stage")
	check(session.verified_count() == 0, "Assembly and naming progress independent")
	var id: String = session.bones[0].id
	var canonical: Dictionary = session.bone_states[id].transform.duplicate(true)
	session.set_transform(id, Vector3.ZERO, Quaternion.IDENTITY)
	check(session.bone_states[id].transform == canonical, "Placed bones remain locked")
	check(not session.try_snap(id), "Placed bone cannot snap twice")
	check(session.save_game() and session.load_game() and session.phase == "completed", "Completion survives restart")

func _remove_test_saves() -> void:
	for suffix in ["", ".tmp", ".bak"]:
		var path := ProjectSettings.globalize_path(save_path + suffix)
		if FileAccess.file_exists(path):
			DirAccess.remove_absolute(path)
