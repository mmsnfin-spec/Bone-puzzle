class_name GuideSystem
extends Node3D
## Shared imported meshes, a single transparent material, and no colliders.
## Disabling the guide removes this whole branch from rendering.

var guides: Dictionary = {}
var material: StandardMaterial3D

func build(bones: Array, scene_cache: Dictionary) -> void:
	material = StandardMaterial3D.new()
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.albedo_color = Color(0.63, 0.69, 0.77, 0.18)
	material.roughness = 0.85
	material.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	material.render_priority = -1
	for data: Dictionary in bones:
		var instance := (scene_cache[str(data.modelPath)] as PackedScene).instantiate() as Node3D
		instance.name = "Guide_" + str(data.id)
		var p: Array = data.targetPosition
		var q: Array = data.targetRotation
		var s: Array = data.get("targetScale", [1, 1, 1])
		instance.position = Vector3(float(p[0]), float(p[1]), float(p[2]))
		instance.quaternion = Quaternion(float(q[0]), float(q[1]), float(q[2]), float(q[3])).normalized()
		instance.scale = Vector3(float(s[0]), float(s[1]), float(s[2]))
		_apply(instance)
		add_child(instance)
		guides[str(data.id)] = instance

func sync(session: Node, is_playing: bool) -> void:
	visible = session.guide_enabled and is_playing
	var opacity: float = session.guide_opacity
	if not is_equal_approx(material.albedo_color.a, opacity):
		material.albedo_color.a = opacity
	for bone_id: String in guides:
		guides[bone_id].visible = not session.bone_states.get(bone_id, {}).get("placed", false)

func _apply(node: Node) -> void:
	if node is MeshInstance3D:
		node.material_override = material
		node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	for child in node.get_children():
		_apply(child)
