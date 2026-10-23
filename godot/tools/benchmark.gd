extends SceneTree
## Repeatable local monitor benchmark. It never claims Windows GPU performance.
## Run with --rendering-method gl_compatibility and an actual display for rendering metrics.

var app: Variant
var results: Dictionary = {}
var _sample_frames := 120
var _cpu_ticks_per_second := 0.0

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var scene: PackedScene = load("res://scenes/main/main.tscn")
	app = scene.instantiate()
	root.add_child(app)
	root.size = Vector2i(1920, 1080)
	await process_frame
	await process_frame
	app.session.save_path = "user://benchmark/session.json"
	app.session.set_motion(false)
	app.session.set_guide(true, 0.18)
	if OS.get_name() == "Linux":
		var output: Array = []
		if OS.execute("getconf", PackedStringArray(["CLK_TCK"]), output) == 0 and not output.is_empty():
			_cpu_ticks_per_second = float(str(output[0]).strip_edges())
	results["environment"] = {
		"engine": Engine.get_version_info().string,
		"os": OS.get_name(),
		"processor": OS.get_processor_name(),
		"processor_count": OS.get_processor_count(),
		"display": DisplayServer.get_name(),
		"renderer": RenderingServer.get_video_adapter_name(),
		"viewport": [root.size.x, root.size.y],
		"frame_limit": Engine.max_fps,
		"build": "editor/debug" if OS.has_feature("editor") else ("debug-export" if OS.is_debug_build() else "release-export"),
		"windows_runtime_tested": false,
		"gpu_frame_time_ms": null,
		"gpu_frame_time_note": "Not exposed by this portable monitor harness. Capture GPU Profiler on target Windows hardware.",
		"cpu_monitor_note": "TIME_PROCESS and TIME_PHYSICS_PROCESS are reported monitor samples. Idle on-demand rendering can retain the last rendered-frame timing: these sample means are NOT idle CPU utilization. Linux process_cpu_seconds/core_equivalents are separate /proc process CPU deltas, including software-renderer threads.",
		"process_cpu_source": "/proc/self/stat, user+system ticks divided by getconf CLK_TCK" if _cpu_ticks_per_second > 0 else "unavailable",
		"process_cpu_ticks_per_second": _cpu_ticks_per_second,
		"comparison_note": "These values are Linux software-renderer measurements, not a React/Godot same-PC hardware comparison or a 60 FPS Windows guarantee."
	}
	await create_timer(1.1).timeout
	results["title"] = await _sample("title", false)
	app._show_menu()
	var load_start := Time.get_ticks_usec()
	app._new_game("easy")
	for index in 1200:
		if app.screen == "intro":
			break
		await process_frame
	results["stage_load_ms"] = (Time.get_ticks_usec() - load_start) / 1000.0
	app._begin_play()
	app.session.set_guide(true)
	await create_timer(1.1).timeout
	results["game_guide_on"] = await _sample("game_guide_on", false)
	app.session.set_guide(false)
	await create_timer(1.1).timeout
	results["game_guide_off"] = await _sample("game_guide_off", false)
	app.session.set_guide(true)
	await process_frame
	results["game_manipulation_guide_on"] = await _sample("game_manipulation_guide_on", true)
	app.session.set_guide(false)
	app.session.select_bone(str(app.session.bones[0].id))
	results["game_manipulation"] = await _sample("game_manipulation", true)
	var repeat_memory: Array = []
	for repetition in 5:
		app._show_menu()
		await process_frame
		app._new_game("easy")
		for index in 1200:
			if app.screen == "intro":
				break
			await process_frame
		app._begin_play()
		await create_timer(0.15).timeout
		repeat_memory.append({"iteration": repetition + 1, "static_bytes": Performance.get_monitor(Performance.MEMORY_STATIC), "nodes": Performance.get_monitor(Performance.OBJECT_NODE_COUNT), "resources": Performance.get_monitor(Performance.OBJECT_RESOURCE_COUNT), "dynamic_bodies": app.world.active_dynamic_count()})
	results["five_restarts"] = repeat_memory
	# App intro transitions are cancellation-token coroutines with finite6.7s
	# timers. Let all canceled timers finish before interpreting retained bytes.
	await create_timer(7.0).timeout
	results["five_restarts_after_timers_settle"] = {"static_bytes": Performance.get_monitor(Performance.MEMORY_STATIC), "nodes": Performance.get_monitor(Performance.OBJECT_NODE_COUNT), "resources": Performance.get_monitor(Performance.OBJECT_RESOURCE_COUNT), "dynamic_bodies": app.world.active_dynamic_count()}
	results["long_play_memory_note"] = "Five repeated stage reloads detect gross accumulation only; an extended Windows soak test remains required."
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://build/evidence"))
	var file := FileAccess.open("res://build/evidence/performance.json", FileAccess.WRITE)
	file.store_string(JSON.stringify(results, "\t"))
	print("BENCHMARK_RESULT: ", JSON.stringify(results))
	app.queue_free()
	await process_frame
	quit(0)

func _sample(label: String, manipulate: bool) -> Dictionary:
	var frame_times: Array[float] = []
	var cpu_ms := 0.0
	var physics_ms := 0.0
	var draw_calls := 0.0
	var cpu_started := _read_process_cpu_seconds()
	var started := Time.get_ticks_usec()
	var drawn_before := Engine.get_frames_drawn()
	var previous := started
	for index in _sample_frames:
		if manipulate:
			app.session.select_bone(str(app.session.bones[index % app.session.bones.size()].id))
			app.world.rotate_selected("z", 0.5)
			app.world.nudge_selected(Vector3(0.002 if index % 2 == 0 else -0.002, 0.0, 0.0))
		await process_frame
		var now := Time.get_ticks_usec()
		frame_times.append((now - previous) / 1000.0)
		previous = now
		cpu_ms += Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0
		physics_ms += Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS) * 1000.0
		draw_calls += Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME)
	var elapsed_seconds := (Time.get_ticks_usec() - started) / 1000000.0
	var cpu_ended := _read_process_cpu_seconds()
	var cpu_seconds := maxf(0.0, cpu_ended - cpu_started) if cpu_started >= 0.0 and cpu_ended >= 0.0 else -1.0
	var frames_drawn := Engine.get_frames_drawn() - drawn_before
	frame_times.sort()
	return {
		"phase": label,
		"low_processor_usage_mode": OS.low_processor_usage_mode,
		"interaction": "Cycle selection through all27 bones, rotate+nudge one each frame" if manipulate else "Static scene",
		"frames": _sample_frames,
		"average_fps": _sample_frames / maxf(elapsed_seconds, 0.000001),
		"rendered_frames": frames_drawn,
		"average_rendered_fps": frames_drawn / maxf(elapsed_seconds, 0.000001),
		"process_cpu_seconds": cpu_seconds if cpu_seconds >= 0.0 else null,
		"cpu_core_equivalents": cpu_seconds / maxf(elapsed_seconds, 0.000001) if cpu_seconds >= 0.0 else null,
		"frame_timing_note": "process_frame cadence includes the frame cap; low-processor title/menu intentionally render fewer frames when unchanged.",
		"minimum_instantaneous_fps": 1000.0 / maxf(frame_times.back(), 0.000001),
		"mean_frame_ms": elapsed_seconds * 1000.0 / _sample_frames,
		"p95_frame_ms": frame_times[int((_sample_frames - 1) * 0.95)],
		"maximum_frame_ms": frame_times.back(),
		"mean_cpu_process_ms": cpu_ms / _sample_frames,
		"mean_physics_process_ms": physics_ms / _sample_frames,
		"mean_draw_calls": draw_calls / _sample_frames,
		"static_memory_bytes": Performance.get_monitor(Performance.MEMORY_STATIC),
		"video_memory_bytes": Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED),
		"nodes": Performance.get_monitor(Performance.OBJECT_NODE_COUNT),
		"resources": Performance.get_monitor(Performance.OBJECT_RESOURCE_COUNT),
		"dynamic_bodies": app.world.active_dynamic_count() if app.world != null else 0
	}

func _read_process_cpu_seconds() -> float:
	if _cpu_ticks_per_second <= 0.0:
		return -1.0
	var file := FileAccess.open("/proc/%d/stat" % OS.get_process_id(), FileAccess.READ)
	if file == null:
		return -1.0
	var stat := file.get_line()
	# The process-name field is parenthesized and may contain spaces.
	var fields := stat.substr(stat.rfind(")") + 2).split(" ", false)
	if fields.size() < 13:
		return -1.0
	return (float(fields[11]) + float(fields[12])) / _cpu_ticks_per_second
