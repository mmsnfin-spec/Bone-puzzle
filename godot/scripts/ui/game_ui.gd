class_name GameUI
extends CanvasLayer

signal action(name: String, value: Variant)

const IVORY := Color("eeeadd")
const MUTED := Color("aaa99f")
const GOLD := Color("cbbb8c")
var session: Node
var root: Control
var screen := "title"
var _title_pending := false
var _theme: Theme
var _serif: Font
var _stats: Label
var _selection: Label
var _learning: Label
var _name_input: LineEdit
var _notice: Label
var _guide: CheckButton
var _opacity: HSlider
var _hint: Button
var _pieces: Dictionary = {}
var _last_selected := ""
var _intro_text: Label

func setup(game_session: Node) -> void:
	session = game_session
	_theme = Theme.new()
	_theme.default_font_size = 19
	if ResourceLoader.exists("res://assets/fonts/ui.otf"):
		_theme.default_font = load("res://assets/fonts/ui.otf")
	if ResourceLoader.exists("res://assets/fonts/title.ttf"):
		_serif = load("res://assets/fonts/title.ttf")
	for type_name in ["Label", "Button", "CheckButton", "CheckBox", "OptionButton", "LineEdit"]:
		_theme.set_color("font_color", type_name, IVORY)
		_theme.set_color("font_hover_color", type_name, Color.WHITE)
		_theme.set_color("font_disabled_color", type_name, Color("60615b"))
		_theme.set_color("font_focus_color", type_name, Color.WHITE)
	for state in ["normal", "hover", "pressed", "focus", "disabled"]:
		var box := StyleBoxFlat.new()
		box.bg_color = Color("161715") if state in ["normal", "disabled"] else Color("2c2c27")
		box.border_color = GOLD if state in ["focus", "pressed"] else Color("41423b")
		box.set_border_width_all(1)
		box.content_margin_left = 16
		box.content_margin_right = 16
		box.content_margin_top = 10
		box.content_margin_bottom = 10
		_theme.set_stylebox(state, "Button", box)
		_theme.set_stylebox(state, "OptionButton", box)
	var input_box := StyleBoxFlat.new()
	input_box.bg_color = Color("0c0d0c")
	input_box.border_color = MUTED
	input_box.set_border_width_all(1)
	input_box.set_content_margin_all(12)
	_theme.set_stylebox("normal", "LineEdit", input_box)
	root = Control.new()
	root.name = "UserInterface"
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.theme = _theme
	add_child(root)
	session.changed.connect(refresh)

func _clear(next_screen: String, solid: bool = false) -> void:
	screen = next_screen
	_stats = null
	_selection = null
	_learning = null
	_name_input = null
	_notice = null
	_guide = null
	_opacity = null
	_hint = null
	_pieces.clear()
	_last_selected = ""
	for child in root.get_children():
		root.remove_child(child)
		child.queue_free()
	if solid:
		var background := ColorRect.new()
		background.color = Color.BLACK
		background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		background.mouse_filter = Control.MOUSE_FILTER_IGNORE
		root.add_child(background)

func _label(text: String, size: int = 20, color: Color = IVORY) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return label

func _button(text: String, callback: Callable, minimum := Vector2(0, 48)) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = minimum
	button.pressed.connect(callback)
	return button

func _emit(name: String, value: Variant = null) -> void:
	action.emit(name, value)

func _panel() -> PanelContainer:
	var panel := PanelContainer.new()
	var box := StyleBoxFlat.new()
	box.bg_color = Color(0.035, 0.04, 0.035, 0.97)
	box.border_color = Color("35372f")
	box.set_border_width_all(1)
	box.set_content_margin_all(24)
	panel.add_theme_stylebox_override("panel", box)
	return panel

func _center_box(width: float = 680) -> VBoxContainer:
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(center)
	var box := VBoxContainer.new()
	box.custom_minimum_size.x = width
	box.add_theme_constant_override("separation", 16)
	center.add_child(box)
	return box

func _serif_label(text: String, size: int) -> Label:
	var label := _label(text, size)
	if _serif != null: label.add_theme_font_override("font", _serif)
	return label

func show_title() -> void:
	_clear("title", true)
	_title_pending = false
	var title := _serif_label("BONE PUZZLE", 124)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	title.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.add_child(title)
	var prompt := _label("아무 key나 눌러 시작하시오", 22)
	prompt.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	prompt.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	prompt.offset_top = -100
	prompt.offset_bottom = -50
	root.add_child(prompt)

func _input(event: InputEvent) -> void:
	if screen != "title" or _title_pending: return
	var general_key: bool = event is InputEventKey and event.pressed and not event.echo and not event.keycode in [KEY_SHIFT, KEY_CTRL, KEY_ALT, KEY_META, KEY_CAPSLOCK]
	var click: bool = event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT
	if general_key or click:
		_title_pending = true
		get_viewport().set_input_as_handled()
		_emit.call_deferred("menu")

func show_menu() -> void:
	_clear("menu", true)
	var box := _center_box(720)
	box.add_child(_label("01   /   STAGE SELECT", 17, MUTED))
	box.add_child(_serif_label("The architecture of touch.", 44))
	box.add_child(_label("실제 해부학 데이터로 완성하는 오른손 골격", 20, MUTED))
	var difficulty_row := HBoxContainer.new()
	difficulty_row.add_theme_constant_override("separation", 24)
	difficulty_row.add_child(_label("DIFFICULTY", 18, MUTED))
	var difficulty := OptionButton.new()
	for text in ["Easy — 위치 중심 · 회전 자동 보정", "Normal — 위치 + 회전", "Hard — 엄격한 위치 + 회전"]:
		difficulty.add_item(text)
	difficulty.selected = ["easy", "normal", "hard"].find(session.difficulty)
	difficulty.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	difficulty_row.add_child(difficulty)
	box.add_child(difficulty_row)
	box.add_child(_button("HAND     /     오른손 27 BONES     →", func(): _emit("new_game", ["easy", "normal", "hard"][difficulty.selected]), Vector2(0, 74)))
	var resume := _button("CONTINUE   /   저장한 HAND 이어하기", func(): _emit("continue"))
	resume.disabled = not session.has_save()
	box.add_child(resume)
	box.add_child(_label("COMING SOON", 16, MUTED))
	var future := GridContainer.new()
	future.columns = 4
	future.add_theme_constant_override("h_separation", 8)
	future.add_theme_constant_override("v_separation", 8)
	for text in ["FOOT", "UPPER LIMB", "LOWER LIMB", "PELVIS", "SPINE", "THORAX", "SKULL"]:
		var button := _button(text, func(): pass, Vector2(174, 44))
		button.disabled = true
		button.add_theme_font_size_override("font_size", 15)
		future.add_child(button)
	box.add_child(future)
	var links := HBoxContainer.new()
	links.add_theme_constant_override("separation", 12)
	for item in [["설정", "settings"], ["About / Credits", "credits"], ["조작 안내", "help"], ["종료", "exit"]]:
		var command: String = item[1]
		links.add_child(_button(item[0], func(): _emit(command)))
	box.add_child(links)
	_notice = _label(session.save_error, 16, MUTED)
	box.add_child(_notice)

func show_loading() -> void:
	_clear("loading", true)
	_center_box().add_child(_serif_label("Loading anatomy…", 44))

func show_intro() -> void:
	_clear("intro")
	var caption := _label("01 / THE HAND     ·     27 bones. One extraordinary structure.", 19, MUTED)
	caption.position = Vector2(52, 46)
	root.add_child(caption)
	_intro_text = _serif_label("", 220)
	_intro_text.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_intro_text.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_intro_text.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.add_child(_intro_text)
	var skip := _button("Skip intro →", func(): _emit("skip_intro"), Vector2(190, 48))
	skip.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	skip.position += Vector2(-240, -100)
	root.add_child(skip)

func intro_typography() -> void:
	if is_instance_valid(_intro_text): _intro_text.text = "HAND"

func show_game() -> void:
	_clear("game")
	var top := HBoxContainer.new()
	top.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	top.offset_left = 40
	top.offset_top = 24
	top.offset_right = -40
	top.offset_bottom = 76
	root.add_child(top)
	top.add_child(_serif_label("HAND", 38))
	_stats = _label("", 19, MUTED)
	_stats.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_stats.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	top.add_child(_stats)
	top.add_child(_button("Pause · Esc", func(): _emit("pause")))
	var panel := _panel()
	panel.set_anchors_and_offsets_preset(Control.PRESET_RIGHT_WIDE)
	panel.offset_left = -416
	panel.offset_right = -32
	panel.offset_top = 106
	panel.offset_bottom = -168
	root.add_child(panel)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	panel.add_child(scroll)
	var side := VBoxContainer.new()
	side.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	side.add_theme_constant_override("separation", 12)
	scroll.add_child(side)
	side.add_child(_label("BONE STUDY", 16, MUTED))
	_selection = _label("조각을 선택하세요.", 21)
	side.add_child(_selection)
	_name_input = LineEdit.new()
	_name_input.placeholder_text = "English anatomical name"
	_name_input.max_length = 120
	_name_input.text_changed.connect(func(value): _emit("edit_label", value))
	_name_input.text_submitted.connect(func(value): _emit("check_name", value))
	side.add_child(_name_input)
	var name_buttons := HBoxContainer.new()
	name_buttons.add_theme_constant_override("separation", 8)
	name_buttons.add_child(_button("Save note", func(): _emit("save_label", _name_input.text)))
	name_buttons.add_child(_button("Check", func(): _emit("check_name", _name_input.text)))
	side.add_child(name_buttons)
	_learning = _label("", 17, MUTED)
	_learning.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	side.add_child(_learning)
	_hint = _button("Name hint", func(): _emit("hint"))
	side.add_child(_hint)
	side.add_child(HSeparator.new())
	side.add_child(_label("ROTATION  /  15°", 16, MUTED))
	for axis in ["x", "y", "z"]:
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 8)
		row.add_child(_label(axis.to_upper(), 20))
		var a: String = axis
		row.add_child(_button("−15°", func(): _emit("rotate", [a, -15.0]), Vector2(100, 42)))
		row.add_child(_button("+15°", func(): _emit("rotate", [a, 15.0]), Vector2(100, 42)))
		side.add_child(row)
	side.add_child(_button("Check placement · Enter", func(): _emit("drop")))
	side.add_child(HSeparator.new())
	side.add_child(_label("PIECE INDEX     ✓ 배치 · • 이름", 16, MUTED))
	for category in ["carpals", "metacarpals", "phalanges"]:
		side.add_child(_label(category.to_upper(), 14, MUTED))
		var grid := GridContainer.new()
		grid.columns = 6
		grid.add_theme_constant_override("h_separation", 4)
		grid.add_theme_constant_override("v_separation", 4)
		for i in session.bones.size():
			var bone: Dictionary = session.bones[i]
			if bone.category != category: continue
			var id: String = bone.id
			var button := _button("%02d" % (i + 1), func(): _emit("select", id), Vector2(46, 40))
			button.add_theme_font_size_override("font_size", 15)
			button.tooltip_text = "Piece %02d · %s" % [i + 1, id]
			grid.add_child(button)
			_pieces[id] = button
		side.add_child(grid)
	var bottom := VBoxContainer.new()
	bottom.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	bottom.offset_left = 42
	bottom.offset_right = -42
	bottom.offset_top = -142
	bottom.offset_bottom = -24
	bottom.add_theme_constant_override("separation", 8)
	root.add_child(bottom)
	var controls := HBoxContainer.new()
	controls.add_theme_constant_override("separation", 20)
	controls.add_child(_button("시점 초기화", func(): _emit("reset_camera")))
	_guide = CheckButton.new()
	_guide.text = "GUIDE ON / OFF · G"
	_guide.toggled.connect(func(value): _emit("guide", value))
	controls.add_child(_guide)
	controls.add_child(_label("투명도", 17, MUTED))
	_opacity = HSlider.new()
	_opacity.min_value = 0.05
	_opacity.max_value = 0.25
	_opacity.step = 0.01
	_opacity.custom_minimum_size.x = 170
	_opacity.value_changed.connect(func(value): _emit("opacity", value))
	controls.add_child(_opacity)
	bottom.add_child(controls)
	_notice = _label("조각을 선택한 뒤 드래그하세요. Shift + 방향키로 정밀 조작할 수 있습니다.", 18)
	bottom.add_child(_notice)
	bottom.add_child(_label("LEFT DRAG 이동  ·  RIGHT DRAG 시점 회전  ·  MIDDLE DRAG Pan  ·  WHEEL 확대  ·  X/Y/Z 회전  ·  Q/E Z축  ·  PgUp/PgDn 깊이", 15, MUTED))
	refresh()

func refresh() -> void:
	if screen != "game" or not is_instance_valid(_stats): return
	_stats.text = "%s   /   %s     조립 %d/27    명칭 %d/27     HINT %d/5    " % [session.difficulty.to_upper(), format_time(session.elapsed), session.placed_count(), session.verified_count(), session.hints_remaining()]
	_guide.set_pressed_no_signal(session.guide_enabled)
	_opacity.set_value_no_signal(session.guide_opacity)
	_opacity.editable = session.guide_enabled
	_opacity.modulate.a = 1.0 if session.guide_enabled else 0.3
	var id: String = session.selected_id
	var selected: bool = session.bone_states.has(id)
	_name_input.editable = selected
	_hint.disabled = not selected
	if selected:
		var bone: Dictionary = session.bone_definition(id)
		var piece: Dictionary = session.bone_states[id]
		_selection.text = "%s   ·   %s" % [id, "PLACED ✓" if piece.placed else "SELECTED"]
		if id != _last_selected:
			_name_input.set_block_signals(true)
			_name_input.text = piece.userLabel
			_name_input.set_block_signals(false)
			_last_selected = id
		_learning.text = "명칭 확인 완료 ✓\n%s · %s" % [bone.englishName, bone.koreanName] if piece.nameVerified else "조립과 명칭 학습은 별도로 기록됩니다."
		if piece.hintShown:
			_learning.text += "\nHINT  ·  %s\n%s" % [bone.englishName, bone.koreanName]
		_hint.text = "다시 보기 · %s" % bone.englishName if piece.hintShown else "Name hint   /   남은 %d" % session.hints_remaining()
	else:
		_selection.text = "조각을 선택하세요."
		_learning.text = "작은 뼈는 Piece Index에서 선택하세요."
	for bone_id in _pieces:
		var index: int = session.bones.find(session.bone_definition(bone_id)) + 1
		var state: Dictionary = session.bone_states[bone_id]
		_pieces[bone_id].text = "%02d%s%s" % [index, "✓" if state.placed else "", "•" if state.nameVerified else ""]
		_pieces[bone_id].modulate = GOLD if bone_id == id else IVORY

func notice(message: String) -> void:
	if is_instance_valid(_notice): _notice.text = message

func show_pause() -> void:
	_clear("pause")
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.8)
	dim.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.add_child(dim)
	var box := _center_box(460)
	box.add_child(_serif_label("Paused.", 70))
	for item in [["재개 · Esc", "resume"], ["설정", "settings"], ["조작 안내", "help"], ["다시 시작", "restart"], ["스테이지 선택", "menu"], ["종료", "exit"]]:
		var command: String = item[1]
		box.add_child(_button(item[0], func(): _emit(command)))

func show_completion() -> void:
	_clear("completed")
	var panel := _panel()
	panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER_RIGHT)
	panel.offset_left = -530
	panel.offset_right = -50
	panel.offset_top = -320
	panel.offset_bottom = 320
	root.add_child(panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 20)
	panel.add_child(box)
	box.add_child(_label("ALL 27 PIECES, IN PLACE.", 17, MUTED))
	box.add_child(_serif_label("Complete.", 72))
	box.add_child(_label("오른손의 구조를 완성했습니다.", 20))
	box.add_child(_label("ASSEMBLED       %d / 27\nTIME                   %s\nHINTS USED        %d / 5\nNAMES VERIFIED  %d / 27" % [session.placed_count(), format_time(session.elapsed), session.hints_used.size(), session.verified_count()], 23))
	box.add_child(_button("Replay →", func(): _emit("restart")))
	box.add_child(_button("Stage Select →", func(): _emit("menu")))
	box.add_child(_label("오른쪽 드래그 · 휠로 완성된 손을 관찰하세요.", 16, MUTED))

func show_information(kind: String) -> void:
	_clear(kind, true)
	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 120)
	margin.add_theme_constant_override("margin_right", 120)
	margin.add_theme_constant_override("margin_top", 80)
	margin.add_theme_constant_override("margin_bottom", 70)
	root.add_child(margin)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 24)
	margin.add_child(box)
	box.add_child(_serif_label({"settings": "Settings.", "credits": "About / Credits.", "help": "One piece at a time."}[kind], 64))
	if kind == "settings":
		var motion := CheckBox.new()
		motion.text = "모션 감소 — 물리 낙하와 긴 연출 건너뛰기"
		motion.button_pressed = session.reduced_motion
		motion.toggled.connect(func(value): _emit("motion", value))
		box.add_child(motion)
		var guide := CheckBox.new()
		guide.text = "조립 가이드 표시 (난이도와 독립적으로 저장)"
		guide.button_pressed = session.guide_enabled
		guide.toggled.connect(func(value): _emit("guide", value))
		box.add_child(guide)
		box.add_child(_label("진행과 설정은 이 PC의 Godot user:// 경로에 저장됩니다.\n브라우저 LocalStorage 저장과는 별개의 기록입니다.", 22, MUTED))
	else:
		var scroll := ScrollContainer.new()
		scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
		box.add_child(scroll)
		var text := _label("", 23)
		text.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		scroll.add_child(text)
		if kind == "credits":
			text.text = "BONE PUZZLE · Godot 4.7.2\n\n실제 오른손 해부학 메시 27개를 조립하고 영어 명칭을 학습하는 게임입니다.\n\nBodyParts3D, © The Database Center for Life Science\nCC Attribution-Share Alike 2.1 Japan\nhttps://creativecommons.org/licenses/by-sa/2.1/jp/\n\nBodyParts3D 3.0 (20110915), 95% polygon-reduced distribution.\nKevin-Mattheus-Moerman/BodyParts3D 미러의 STL에서 GLB로 변환했습니다.\n공통 좌표의 회전과 균일 축소만 적용했으며 메시를 추가 단순화하지 않았습니다.\nGodot 이식에서는 기존 GLB 원본 바이트와 상대적 크기를 보존했습니다.\n파생 해부학 모델에는 동일한 CC BY-SA 2.1 Japan 라이선스가 적용됩니다.\n\nGodot Engine — MIT License.\nDejaVu Serif / Noto Sans CJK — 번들 licenses/의 라이선스 참조.\n\n전체 원본 고지·체크섬·폰트 라이선스는 배포물의 licenses/에 포함됩니다."
		else:
			text.text = "1. 작은 뼈는 Piece Index에서 선택하세요. 선택된 뼈는 강조 표시됩니다.\n2. 왼쪽 드래그로 이동합니다. 드래그 중에는 카메라가 고정됩니다.\n3. 오른쪽 드래그는 시점 회전, 가운데 드래그는 Pan, 휠은 확대/축소입니다.\n4. X / Y / Z 또는 회전 버튼으로 축 회전, Q / E로 Z축 회전합니다. Shift는 역방향 또는 미세 조작입니다.\n5. 방향키로 평면 이동, Page Up / Down으로 깊이를 조절하고 Enter로 배치를 확인합니다.\n6. Easy는 위치만 맞으면 회전을 보정합니다. Normal은 0.35 rad, Hard는 0.16 rad 이내여야 합니다.\n7. G로 가이드를 켜거나 끕니다. GUIDE OFF에서도 정답 판정은 동일합니다.\n8. 영어 명칭을 입력하고 Save note로 오답 메모를 저장하거나 Check로 정답을 확인합니다.\n9. 서로 다른 뼈 최대 5개에 이름 힌트를 사용할 수 있습니다. 같은 뼈는 다시 열어도 차감되지 않습니다.\n10. Esc는 일시정지, Restart는 현재 플레이를 초기화합니다. 가이드·모션 설정은 유지됩니다.\n\n조립 27개를 완료하면 결과 화면으로 이동하며 명칭 학습 진행률은 별도로 기록됩니다."
	box.add_child(_button("← 돌아가기 · Esc", func(): _emit("back"), Vector2(240, 52)))

static func format_time(seconds: float) -> String:
	return "%02d:%02d" % [int(seconds) / 60, int(seconds) % 60]
