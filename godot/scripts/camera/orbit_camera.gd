class_name OrbitCamera
extends Node3D
## Input-driven orthographic orbit, pan and zoom. There is no idle frame loop.

var camera: Camera3D
var target := Vector3(0.0, -0.5, 0.8)
var yaw: float = 0.0
var pitch: float = 0.78
var distance: float = 25.6
var zoom_size: float = 15.5
var orbiting: bool = false
var panning: bool = false
var locked: bool = false
var sidebar_layout: bool = true
var view_mode: String = "puzzle"

func _ready() -> void:
	if camera == null:
		camera = Camera3D.new()
		camera.name = "PuzzleCamera"
		camera.projection = Camera3D.PROJECTION_ORTHOGONAL
		camera.near = 0.05
		camera.far = 120.0
		add_child(camera)
		camera.current = true
	get_viewport().size_changed.connect(_update_camera)
	_update_camera()

func set_sidebar_layout(enabled: bool) -> void:
	sidebar_layout = enabled
	_update_camera()

func set_mode(mode: String) -> void:
	view_mode = mode
	reset_view()

func reset_view() -> void:
	target = Vector3(0.0, 1.3, 0.0) if view_mode == "anatomy" else Vector3(0.0, -0.5, 0.8)
	yaw = 0.0
	pitch = 0.355 if view_mode == "anatomy" else 0.78
	zoom_size = 10.5 if view_mode == "anatomy" else 15.5
	orbiting = false
	panning = false
	_update_camera()

func set_locked(value: bool) -> void:
	locked = value
	if value:
		orbiting = false
		panning = false

func handle_event(event: InputEvent) -> bool:
	if locked:
		return false
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_RIGHT:
			orbiting = event.pressed
			return true
		if event.button_index == MOUSE_BUTTON_MIDDLE:
			panning = event.pressed
			return true
		if event.pressed and event.button_index == MOUSE_BUTTON_WHEEL_UP:
			zoom_size = clampf(zoom_size * 0.9, 3.5, 22.0)
			_update_camera()
			return true
		if event.pressed and event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			zoom_size = clampf(zoom_size / 0.9, 3.5, 22.0)
			_update_camera()
			return true
	if event is InputEventMouseMotion:
		if orbiting:
			yaw -= event.relative.x * 0.007
			pitch = clampf(pitch + event.relative.y * 0.007, -1.35, 1.35)
			_update_camera()
			return true
		if panning:
			var viewport_size := get_viewport().get_visible_rect().size
			var units_per_pixel := zoom_size / maxf(viewport_size.y, 1.0)
			target -= camera.global_basis.x * event.relative.x * units_per_pixel
			target += camera.global_basis.y * event.relative.y * units_per_pixel
			_update_camera()
			return true
	return false

func _update_camera() -> void:
	if camera == null:
		return
	camera.size = zoom_size
	# Place the anatomy in the uncovered viewport area, compensating for the
	# right learning panel and bottom controls in the 1920x1080 reference UI.
	var viewport_size := get_viewport().get_visible_rect().size
	var units_per_pixel := zoom_size / maxf(viewport_size.y, 1.0)
	camera.h_offset = 204.0 * units_per_pixel if sidebar_layout else 0.0
	camera.v_offset = -29.0 * units_per_pixel if sidebar_layout else 0.0
	camera.position = target + Vector3(sin(yaw) * cos(pitch), sin(pitch), cos(yaw) * cos(pitch)) * distance
	camera.look_at(target, Vector3.UP)
