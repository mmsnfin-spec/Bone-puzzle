extends Node

const Session = preload("res://scripts/core/game_session.gd")
const UserInterface = preload("res://scripts/ui/game_ui.gd")
const World = preload("res://scripts/puzzle/puzzle_world.gd")

var session: Node
var ui: CanvasLayer
var world: Node3D
var screen := "title"
var _intro_token := 0
var _return_to := "menu"
var _transitioning := false

func _ready() -> void:
	Engine.max_fps = 60
	session = Session.new()
	add_child(session)
	session.initialize()
	session.completed.connect(_show_completion)
	ui = UserInterface.new()
	add_child(ui)
	ui.setup(session)
	ui.action.connect(_on_action)
	ui.show_title()
	OS.low_processor_usage_mode = true
	get_tree().auto_accept_quit = false

func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		if session != null:
			session.save_game()
		get_tree().quit()
	elif what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		if screen == "game":
			_show_pause()

func _unhandled_key_input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed or event.echo:
		return
	if event.keycode == KEY_ESCAPE:
		if screen == "game":
			_show_pause()
		elif screen == "pause":
			_resume()
		elif screen in ["settings", "credits", "help"]:
			_back()
		elif screen == "intro":
			_begin_play()
		get_viewport().set_input_as_handled()
		return
	if screen != "game":
		return
	if get_viewport().gui_get_focus_owner() is LineEdit:
		return
	if event.keycode == KEY_G:
		session.set_guide(not session.guide_enabled)
		get_viewport().set_input_as_handled()

func _on_action(name: String, value: Variant = null) -> void:
	match name:
		"menu": _show_menu()
		"new_game": _new_game(str(value))
		"continue": _continue_game()
		"skip_intro": _begin_play()
		"pause": _show_pause()
		"resume": _resume()
		"restart": _new_game(session.difficulty)
		"exit":
			session.save_game()
			get_tree().quit()
		"guide": session.set_guide(bool(value))
		"opacity": session.set_guide(session.guide_enabled, float(value))
		"motion": session.set_motion(bool(value))
		"select":
			get_viewport().gui_release_focus()
			session.select_bone(str(value))
		"save_label":
			session.save_label(session.selected_id, str(value))
			session.save_game()
			ui.notice("메모를 저장했습니다. 정답 확인은 Check를 눌러 주세요.")
		"edit_label": session.save_label(session.selected_id, str(value))
		"check_name":
			var correct: bool = session.check_name(session.selected_id, str(value))
			ui.notice("정확한 해부학 명칭입니다." if correct else "공식 영어 명칭 또는 등록된 별칭을 확인해 주세요.")
		"hint":
			ui.notice("힌트를 열었습니다. 이름 정답 처리는 별도로 확인하세요." if session.reveal_hint(session.selected_id) else "서로 다른 뼈의 힌트는 최대 5개입니다.")
		"rotate":
			if is_instance_valid(world): world.rotate_selected(str(value[0]), float(value[1]))
		"nudge":
			if is_instance_valid(world): world.nudge_selected(value)
		"drop":
			if is_instance_valid(world): world.try_selected_snap()
		"reset_camera":
			if is_instance_valid(world): world.reset_camera()
		"settings", "credits", "help":
			_return_to = "pause" if screen == "pause" else "menu"
			screen = name
			ui.show_information(name)
		"back": _back()

func _clear_world() -> void:
	_intro_token += 1
	if is_instance_valid(world):
		world.queue_free()
	world = null

func _show_menu() -> void:
	if session.has_session:
		session.save_game()
	session.phase = "menu"
	session.set_process(false)
	_clear_world()
	screen = "menu"
	OS.low_processor_usage_mode = true
	ui.show_menu()

func _new_game(mode: String) -> void:
	if _transitioning:
		return
	_transitioning = true
	_clear_world()
	OS.low_processor_usage_mode = false
	screen = "loading"
	ui.show_loading()
	await get_tree().process_frame
	session.start_new(mode)
	world = World.new()
	add_child(world)
	world.setup(session)
	world.feedback.connect(ui.notice)
	world.start_intro()
	screen = "intro"
	ui.show_intro()
	_transitioning = false
	if session.reduced_motion:
		_begin_play()
		return
	var token := _intro_token
	await get_tree().create_timer(5.2).timeout
	if token != _intro_token or screen != "intro": return
	ui.intro_typography()
	await get_tree().create_timer(1.5).timeout
	if token == _intro_token and screen == "intro": _begin_play()

func _begin_play() -> void:
	if screen != "intro": return
	_intro_token += 1
	world.finish_intro()
	session.start_play()
	screen = "game"
	OS.low_processor_usage_mode = true
	ui.show_game()

func _continue_game() -> void:
	if _transitioning: return
	if not session.load_game():
		ui.notice("저장 기록을 읽을 수 없습니다. 새 게임을 시작해 주세요.")
		return
	_clear_world()
	OS.low_processor_usage_mode = false
	world = World.new()
	add_child(world)
	world.setup(session)
	world.finish_intro()
	world.feedback.connect(ui.notice)
	if session.placed_count() == session.bones.size():
		_show_completion()
	else:
		session.start_play()
		screen = "game"
		OS.low_processor_usage_mode = true
		ui.show_game()

func _show_pause() -> void:
	if screen != "game": return
	session.set_paused(true)
	screen = "pause"
	ui.show_pause()

func _resume() -> void:
	session.set_paused(false)
	screen = "game"
	ui.show_game()

func _back() -> void:
	if _return_to == "pause":
		screen = "pause"
		ui.show_pause()
	else:
		_show_menu()

func _show_completion() -> void:
	screen = "completed"
	OS.low_processor_usage_mode = true
	if is_instance_valid(world): world.set_observing(true)
	ui.show_completion()
