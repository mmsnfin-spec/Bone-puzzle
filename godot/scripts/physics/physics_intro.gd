class_name PhysicsIntro
extends Node3D
## Dynamic bodies exist only during the timed intro. Simple boxes replace
## expensive concave mesh colliders, and the whole branch is freed afterward.

var bodies: Array[RigidBody3D] = []
var running: bool = false
var _generation: int = 0
var _tweens: Array[Tween] = []

func start(bones: Array, scene_cache: Dictionary, material: Material) -> void:
	stop()
	running = true
	_generation += 1
	var generation := _generation
	var ground := StaticBody3D.new()
	ground.name = "IntroGround"
	ground.position = Vector3(0, -4.25, 0)
	ground.collision_layer = 2
	ground.collision_mask = 2
	var ground_shape := CollisionShape3D.new()
	var ground_box := BoxShape3D.new()
	ground_box.size = Vector3(32, 0.3, 24)
	ground_shape.shape = ground_box
	ground.add_child(ground_shape)
	add_child(ground)
	for data: Dictionary in bones:
		var body := RigidBody3D.new()
		body.name = "Intro_" + str(data.id)
		body.freeze = true
		body.collision_layer = 2
		body.collision_mask = 2
		body.gravity_scale = 1.5
		body.linear_damp = 0.6
		body.angular_damp = 0.8
		body.can_sleep = true
		body.continuous_cd = true
		var physical := PhysicsMaterial.new()
		physical.bounce = 0.22
		physical.friction = 0.9
		body.physics_material_override = physical
		var p: Array = data.targetPosition
		var q: Array = data.targetRotation
		body.position = Vector3(float(p[0]), float(p[1]), float(p[2]))
		body.quaternion = Quaternion(float(q[0]), float(q[1]), float(q[2]), float(q[3])).normalized()
		var model := (scene_cache[str(data.modelPath)] as PackedScene).instantiate() as Node3D
		_apply_material(model, material)
		body.add_child(model)
		var shape := CollisionShape3D.new()
		var box := BoxShape3D.new()
		var dimensions: Array = data["size"]
		box.size = Vector3(maxf(float(dimensions[0]), 0.08), maxf(float(dimensions[1]), 0.08), maxf(float(dimensions[2]), 0.08))
		shape.shape = box
		body.add_child(shape)
		add_child(body)
		bodies.append(body)
	await get_tree().create_timer(1.7, false).timeout
	if not running or generation != _generation:
		return
	for index in bodies.size():
		var body := bodies[index]
		body.freeze = false
		body.linear_velocity = Vector3(sin(index * 2.4) * 0.65, 0, cos(index * 1.7) * 0.7)
		body.angular_velocity = Vector3(sin(index + 1.0) * 1.7, cos(index) * 1.1, sin(index * 3.0) * 1.3)
	await get_tree().create_timer(2.6, false).timeout
	if not running or generation != _generation:
		return
	for index in bodies.size():
		var body := bodies[index]
		body.freeze = true
		body.collision_layer = 0
		body.collision_mask = 0
		var data: Dictionary = bones[index]
		var p: Array = data.initialTransform.position
		var q: Array = data.initialTransform.rotation
		var target_q := Quaternion(float(q[0]), float(q[1]), float(q[2]), float(q[3])).normalized()
		var target_p := Vector3(float(p[0]), float(p[1]), float(p[2]))
		target_p.y = maxf(target_p.y, _floor_height(data, target_q))
		var tween := create_tween().set_parallel(true)
		tween.tween_property(body, "position", target_p, 0.9).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		tween.tween_property(body, "quaternion", target_q, 0.9).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		_tweens.append(tween)

func stop() -> void:
	running = false
	_generation += 1
	for tween in _tweens:
		if tween.is_valid():
			tween.kill()
	_tweens.clear()
	for child in get_children():
		remove_child(child)
		child.queue_free()
	bodies.clear()

func dynamic_count() -> int:
	var count := 0
	for body in bodies:
		if is_instance_valid(body) and not body.freeze:
			count += 1
	return count

func _floor_height(data: Dictionary, q: Quaternion) -> float:
	var dimensions: Array = data["size"]
	var half := Vector3(float(dimensions[0]), float(dimensions[1]), float(dimensions[2])) * 0.5
	var bottom := 0.0
	for x in [-1, 1]:
		for y in [-1, 1]:
			for z in [-1, 1]:
				bottom = minf(bottom, (q * (half * Vector3(x, y, z))).y)
	return -4.08 - bottom

func _apply_material(node: Node, material: Material) -> void:
	if node is MeshInstance3D:
		node.material_override = material
	for child in node.get_children():
		_apply_material(child, material)
